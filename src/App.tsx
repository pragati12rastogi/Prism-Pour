import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  Coins,
  Eye,
  Grid,
  Lightbulb,
  LogIn,
  Pause,
  Plus,
  RotateCcw,
  Undo2,
  UserCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AccountModal } from './components/AccountModal';
import { Bottle } from './components/Bottle';
import { DailyRewardModal } from './components/DailyRewardModal';
import { LevelSelectModal } from './components/LevelSelectModal';
import { PauseModal } from './components/PauseModal';
import { PourOverlay } from './components/PourOverlay';
import { TitleScreen } from './components/TitleScreen';
import { VictoryModal } from './components/VictoryModal';
import { auth, googleProvider } from './firebase';
import {
  DAILY_REWARD_COINS,
  claimCloudDailyReward,
  isDailyRewardEligible,
  loadOrCreateCloudProfile,
  saveCloudActiveSession,
  saveCloudProgress,
} from './game/cloudSync';
import {
  BOTTLE_CAPACITY,
  canPour,
  cloneBottles,
  executePour,
  findBestHint,
  generateLevel,
  hasAnyValidMove,
  isBottleSolved,
  isGameWon,
} from './game/engine';
import { soundEngine } from './game/sound';
import { loadSaveData, persistSaveData } from './game/storage';
import {
  ActiveSession,
  Bottle as BottleType,
  GamePhase,
  HintSuggestion,
  MoveRecord,
  PourAnimationState,
  SaveData,
} from './game/types';

const HINT_COST = 10;
const EXTRA_BOTTLE_COST = 25;
const MAX_EXTRA_BOTTLES = 2;

export default function App() {
  const [save, setSave] = useState<SaveData>(() => {
    const loaded = loadSaveData();
    soundEngine.setMuted(loaded.muted);
    return loaded;
  });

  // Firebase Auth & Sync state
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [dailyRewardOpen, setDailyRewardOpen] = useState(false);
  const [asyncError, setAsyncError] = useState<Error | null>(null);

  const [phase, setPhase] = useState<GamePhase>('TITLE_MENU');
  const [levelSelectOpen, setLevelSelectOpen] = useState(false);

  // Active level state
  const [levelNum, setLevelNum] = useState<number>(save.currentLevel);
  const [bottles, setBottles] = useState<BottleType[]>([]);
  const [initialBottles, setInitialBottles] = useState<BottleType[]>([]);
  const [history, setHistory] = useState<MoveRecord[]>([]);
  const [parMoves, setParMoves] = useState<number>(10);
  const [extraBottlesAdded, setExtraBottlesAdded] = useState<number>(0);

  // Interaction state
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [shakingIdx, setShakingIdx] = useState<number | null>(null);
  const [activeHint, setActiveHint] = useState<HintSuggestion | null>(null);
  const [pourAnim, setPourAnim] = useState<PourAnimationState | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [lastCoinsEarned, setLastCoinsEarned] = useState<number>(25);

  const playfieldRef = useRef<HTMLDivElement | null>(null);
  const bottleRefs = useRef<Map<number, HTMLButtonElement | null>>(new Map());
  const feedbackTimerRef = useRef<number | null>(null);
  const pourTimerRef = useRef<number | null>(null);
  const victoryTimerRef = useRef<number | null>(null);
  const sessionSyncTimerRef = useRef<number | null>(null);
  const cloudReadyRef = useRef<boolean>(false);
  const claimingDailyRef = useRef<boolean>(false);
  const saveRef = useRef<SaveData>(save);
  const userRef = useRef<User | null>(user);

  // Surface async Firestore errors to React ErrorBoundary
  if (asyncError) {
    throw asyncError;
  }

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const showFeedback = useCallback((msg: string) => {
    setFeedbackMsg(msg);
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedbackMsg(null);
    }, 2200);
  }, []);

  const registerBottleRef = useCallback((index: number, el: HTMLButtonElement | null) => {
    if (el) {
      bottleRefs.current.set(index, el);
    } else {
      bottleRefs.current.delete(index);
    }
  }, []);

  // Grant 24-hour daily reward (cloud if signed in, local if guest)
  const triggerDailyRewardIfEligible = useCallback(
    async (activeUser: User | null, currentSave: SaveData) => {
      if (claimingDailyRef.current) return;
      if (!isDailyRewardEligible(currentSave.lastDailyRewardAt)) return;

      claimingDailyRef.current = true;
      try {
        if (activeUser && cloudReadyRef.current) {
          const updated = await claimCloudDailyReward(activeUser, currentSave);
          setSave(updated);
          persistSaveData(updated);
        } else {
          const updated: SaveData = {
            ...currentSave,
            coins: currentSave.coins + DAILY_REWARD_COINS,
            dailyRewardCount: currentSave.dailyRewardCount + 1,
            lastDailyRewardAt: Date.now(),
          };
          setSave(updated);
          persistSaveData(updated);
        }
        soundEngine.playCoinReward();
        setDailyRewardOpen(true);
      } catch (err) {
        if (err instanceof Error) setAsyncError(err);
      } finally {
        claimingDailyRef.current = false;
      }
    },
    []
  );

  // Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      userRef.current = nextUser;

      if (nextUser) {
        cloudReadyRef.current = false;
        try {
          const localSnapshot = loadSaveData();
          const { save: syncedSave, dailyRewardClaimedNow } = await loadOrCreateCloudProfile(
            nextUser,
            localSnapshot
          );
          cloudReadyRef.current = true;
          soundEngine.setMuted(syncedSave.muted);
          setSave(syncedSave);
          persistSaveData(syncedSave);
          setLevelNum(syncedSave.currentLevel);

          if (dailyRewardClaimedNow) {
            soundEngine.playCoinReward();
            setDailyRewardOpen(true);
          }
        } catch (err) {
          if (err instanceof Error) setAsyncError(err);
        } finally {
          setAuthReady(true);
        }
      } else {
        cloudReadyRef.current = false;
        setAuthReady(true);
        const currentLocal = loadSaveData();
        if (isDailyRewardEligible(currentLocal.lastDailyRewardAt)) {
          void triggerDailyRewardIfEligible(null, currentLocal);
        }
      }
    });

    return () => unsubscribe();
  }, [triggerDailyRewardIfEligible]);

  // Re-check 24-hour daily reward eligibility on window focus or every 60s
  useEffect(() => {
    if (!authReady) return;

    const checkEligibility = () => {
      if (isDailyRewardEligible(saveRef.current.lastDailyRewardAt)) {
        void triggerDailyRewardIfEligible(userRef.current, saveRef.current);
      }
    };

    const onFocus = () => checkEligibility();
    window.addEventListener('focus', onFocus);
    const interval = window.setInterval(checkEligibility, 60000);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(interval);
    };
  }, [authReady, triggerDailyRewardIfEligible]);

  // Sync top-level progress changes to Firestore
  const syncProgressToCloud = useCallback((nextSave: SaveData) => {
    const activeUser = userRef.current;
    if (!activeUser || !cloudReadyRef.current) return;
    void saveCloudProgress(activeUser, nextSave).catch((err) => {
      if (err instanceof Error) setAsyncError(err);
    });
  }, []);

  // Debounced sync for active mid-level board session
  const syncSessionToCloud = useCallback((session: ActiveSession | null, immediate = false) => {
    const activeUser = userRef.current;
    if (!activeUser || !cloudReadyRef.current) return;

    if (sessionSyncTimerRef.current) {
      window.clearTimeout(sessionSyncTimerRef.current);
      sessionSyncTimerRef.current = null;
    }

    if (immediate) {
      void saveCloudActiveSession(activeUser, session).catch((err) => {
        if (err instanceof Error) setAsyncError(err);
      });
      return;
    }

    sessionSyncTimerRef.current = window.setTimeout(() => {
      void saveCloudActiveSession(activeUser, session).catch((err) => {
        if (err instanceof Error) setAsyncError(err);
      });
    }, 650);
  }, []);

  const handleSignInGoogle = useCallback(async () => {
    setAuthError(null);
    setAuthBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
      setAccountOpen(false);
      soundEngine.playSelect();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setAuthError(null);
      } else {
        setAuthError(err instanceof Error ? err.message : 'Google Sign-In failed.');
      }
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setAuthError(null);
    setAuthBusy(true);
    try {
      cloudReadyRef.current = false;
      await signOut(auth);
      setAccountOpen(false);
      soundEngine.playDeselect();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-out failed.');
    } finally {
      setAuthBusy(false);
    }
  }, []);

  // Load or initialize a level
  const loadLevel = useCallback(
    (targetLevel: number, resumeSession = false) => {
      if (pourTimerRef.current) window.clearTimeout(pourTimerRef.current);
      if (victoryTimerRef.current) window.clearTimeout(victoryTimerRef.current);

      setPourAnim(null);
      setSelectedIdx(null);
      setShakingIdx(null);
      setActiveHint(null);
      setFeedbackMsg(null);

      const currentSave = saveRef.current;

      if (
        resumeSession &&
        currentSave.activeSession &&
        currentSave.activeSession.level === targetLevel &&
        currentSave.activeSession.bottles.length > 0 &&
        !isGameWon(currentSave.activeSession.bottles)
      ) {
        const s = currentSave.activeSession;
        setLevelNum(s.level);
        setBottles(cloneBottles(s.bottles));
        setInitialBottles(cloneBottles(s.initialBottles));
        setHistory([...s.history]);
        setExtraBottlesAdded(s.extraBottlesAdded);
        setParMoves(s.parMoves);
        return;
      }

      const generated = generateLevel(targetLevel);
      setLevelNum(generated.level);
      setBottles(cloneBottles(generated.bottles));
      setInitialBottles(cloneBottles(generated.bottles));
      setHistory([]);
      setExtraBottlesAdded(0);
      setParMoves(generated.parMoves);

      const newSession: ActiveSession = {
        level: generated.level,
        bottles: cloneBottles(generated.bottles),
        initialBottles: cloneBottles(generated.bottles),
        history: [],
        extraBottlesAdded: 0,
        parMoves: generated.parMoves,
      };

      setSave((prev) => {
        const next: SaveData = {
          ...prev,
          currentLevel: targetLevel,
          activeSession: newSession,
        };
        persistSaveData(next);
        syncProgressToCloud(next);
        syncSessionToCloud(newSession, true);
        return next;
      });
    },
    [syncProgressToCloud, syncSessionToCloud]
  );

  // Persist mid-level session whenever bottles/history change during PLAYING
  useEffect(() => {
    if (phase !== 'PLAYING' || bottles.length === 0) return;
    const won = isGameWon(bottles);
    const nextSession: ActiveSession | null = won
      ? null
      : {
          level: levelNum,
          bottles: cloneBottles(bottles),
          initialBottles: cloneBottles(initialBottles),
          history: [...history],
          extraBottlesAdded,
          parMoves,
        };

    setSave((prev) => {
      const next: SaveData = {
        ...prev,
        currentLevel: levelNum,
        activeSession: nextSession,
      };
      persistSaveData(next);
      return next;
    });

    if (!won) {
      syncSessionToCloud(nextSession, false);
    }
  }, [bottles, history, extraBottlesAdded, levelNum, initialBottles, parMoves, phase, syncSessionToCloud]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
      if (pourTimerRef.current) window.clearTimeout(pourTimerRef.current);
      if (victoryTimerRef.current) window.clearTimeout(victoryTimerRef.current);
      if (sessionSyncTimerRef.current) window.clearTimeout(sessionSyncTimerRef.current);
    };
  }, []);

  const handleStartFromTitle = useCallback(() => {
    loadLevel(save.currentLevel, true);
    setPhase('PLAYING');
    soundEngine.playSelect();
  }, [loadLevel, save.currentLevel]);

  const handleSelectLevelFromModal = useCallback(
    (lvl: number) => {
      setLevelSelectOpen(false);
      loadLevel(lvl, false);
      setPhase('PLAYING');
      soundEngine.playSelect();
    },
    [loadLevel]
  );

  const handleToggleMute = useCallback(() => {
    setSave((prev) => {
      const muted = !prev.muted;
      soundEngine.setMuted(muted);
      const next = { ...prev, muted };
      persistSaveData(next);
      syncProgressToCloud(next);
      return next;
    });
  }, [syncProgressToCloud]);

  const handleToggleColorblind = useCallback(() => {
    setSave((prev) => {
      const next = { ...prev, colorblindMode: !prev.colorblindMode };
      persistSaveData(next);
      syncProgressToCloud(next);
      return next;
    });
  }, [syncProgressToCloud]);

  const handleRestart = useCallback(() => {
    if (pourAnim) return;
    setBottles(cloneBottles(initialBottles));
    setHistory([]);
    setExtraBottlesAdded(0);
    setSelectedIdx(null);
    setActiveHint(null);
    setFeedbackMsg(null);
    soundEngine.playUndo();
    if (phase === 'PAUSED' || phase === 'VICTORY') {
      setPhase('PLAYING');
    }
  }, [initialBottles, phase, pourAnim]);

  const handleUndo = useCallback(() => {
    if (pourAnim || history.length === 0 || phase !== 'PLAYING') return;
    const lastMove = history[history.length - 1];
    const nextBottles = cloneBottles(bottles);
    for (let i = 0; i < lastMove.count; i++) {
      const popped = nextBottles[lastMove.to]?.pop();
      if (popped) nextBottles[lastMove.from]?.push(popped);
    }
    setBottles(nextBottles);
    setHistory((prev) => prev.slice(0, -1));
    setSelectedIdx(null);
    setActiveHint(null);
    soundEngine.playUndo();
  }, [bottles, history, phase, pourAnim]);

  const handleHint = useCallback(() => {
    if (pourAnim || phase !== 'PLAYING') return;
    if (activeHint) return;

    const suggestion = findBestHint(bottles);
    if (!suggestion) {
      soundEngine.playInvalid();
      if (!hasAnyValidMove(bottles)) {
        showFeedback('No valid moves left — try Undo or Add Bottle.');
      } else {
        showFeedback('No winning path from here — try Undo or Add Bottle.');
      }
      return;
    }

    const canAfford = save.coins >= HINT_COST;
    const costToDeduct = canAfford ? HINT_COST : 0;

    if (costToDeduct > 0) {
      setSave((prev) => {
        const next = { ...prev, coins: Math.max(0, prev.coins - costToDeduct) };
        persistSaveData(next);
        syncProgressToCloud(next);
        return next;
      });
    }

    setSelectedIdx(null);
    setActiveHint(suggestion);
    soundEngine.playSelect();
  }, [activeHint, bottles, phase, pourAnim, save.coins, showFeedback, syncProgressToCloud]);

  const handleAddBottle = useCallback(() => {
    if (pourAnim || phase !== 'PLAYING') return;
    if (extraBottlesAdded >= MAX_EXTRA_BOTTLES) {
      soundEngine.playInvalid();
      showFeedback(`Maximum ${MAX_EXTRA_BOTTLES} extra bottles per level.`);
      return;
    }

    const canAfford = save.coins >= EXTRA_BOTTLE_COST;
    if (!canAfford && extraBottlesAdded > 0) {
      soundEngine.playInvalid();
      showFeedback(`Need ${EXTRA_BOTTLE_COST} coins for another bottle.`);
      return;
    }

    const cost = canAfford ? EXTRA_BOTTLE_COST : 0;
    if (cost > 0) {
      setSave((prev) => {
        const next = { ...prev, coins: Math.max(0, prev.coins - cost) };
        persistSaveData(next);
        syncProgressToCloud(next);
        return next;
      });
    }

    setBottles((prev) => [...prev, []]);
    setExtraBottlesAdded((prev) => prev + 1);
    setActiveHint(null);
    setSelectedIdx(null);
    soundEngine.playSelect();
    showFeedback(cost === 0 ? 'Added free emergency bottle!' : 'Extra empty bottle added.');
  }, [extraBottlesAdded, phase, pourAnim, save.coins, showFeedback, syncProgressToCloud]);

  const handleSelectBottle = useCallback(
    (idx: number) => {
      if (phase !== 'PLAYING' || pourAnim) return;

      const clicked = bottles[idx];
      if (!clicked) return;

      if (selectedIdx === null) {
        if (clicked.length === 0) {
          setShakingIdx(idx);
          window.setTimeout(() => setShakingIdx(null), 340);
          soundEngine.playInvalid();
          return;
        }
        if (isBottleSolved(clicked)) {
          setShakingIdx(idx);
          window.setTimeout(() => setShakingIdx(null), 340);
          soundEngine.playDeselect();
          showFeedback('That bottle is already complete!');
          return;
        }
        setSelectedIdx(idx);
        soundEngine.playSelect();
        return;
      }

      if (selectedIdx === idx) {
        setSelectedIdx(null);
        soundEngine.playDeselect();
        return;
      }

      if (!canPour(bottles, selectedIdx, idx)) {
        setShakingIdx(idx);
        window.setTimeout(() => setShakingIdx(null), 340);
        soundEngine.playInvalid();
        if (clicked.length >= BOTTLE_CAPACITY) {
          showFeedback('Destination bottle is full.');
        } else {
          showFeedback('Top colors must match or pour into an empty bottle.');
        }
        setSelectedIdx(null);
        return;
      }

      const result = executePour(bottles, selectedIdx, idx);
      if (!result) return;

      const fromEl = bottleRefs.current.get(selectedIdx);
      const toEl = bottleRefs.current.get(idx);

      if (fromEl && toEl) {
        const fRect = fromEl.getBoundingClientRect();
        const tRect = toEl.getBoundingClientRect();
        setPourAnim({
          from: selectedIdx,
          to: idx,
          color: result.move.color,
          count: result.move.count,
          fromRect: { x: fRect.left, y: fRect.top, width: fRect.width, height: fRect.height },
          toRect: { x: tRect.left, y: tRect.top, width: tRect.width, height: tRect.height },
          direction: tRect.left >= fRect.left ? 'right' : 'left',
        });
      }

      const nextMovesCount = history.length + 1;
      setSelectedIdx(null);
      setActiveHint(null);
      setBottles(result.nextBottles);
      setHistory((prev) => [...prev, result.move]);

      soundEngine.playPour(result.move.count, result.nextBottles[idx].length);

      if (isBottleSolved(result.nextBottles[idx])) {
        window.setTimeout(() => soundEngine.playBottleComplete(), 210);
      }

      pourTimerRef.current = window.setTimeout(() => {
        setPourAnim(null);
      }, 340);

      if (isGameWon(result.nextBottles)) {
        const isFirstCompletion = !save.bestMovesByLevel[levelNum];
        const efficiencyBonus = nextMovesCount <= parMoves ? 10 : 5;
        const earned = isFirstCompletion ? 25 + efficiencyBonus : 10;
        setLastCoinsEarned(earned);

        setSave((prev) => {
          const prevBest = prev.bestMovesByLevel[levelNum];
          const bestMoves = prevBest ? Math.min(prevBest, nextMovesCount) : nextMovesCount;
          const nextSave: SaveData = {
            ...prev,
            unlockedLevel: Math.max(prev.unlockedLevel, levelNum + 1),
            currentLevel: Math.max(prev.currentLevel, levelNum + 1),
            coins: prev.coins + earned,
            bestMovesByLevel: {
              ...prev.bestMovesByLevel,
              [levelNum]: bestMoves,
            },
            activeSession: null,
          };
          persistSaveData(nextSave);
          syncProgressToCloud(nextSave);
          syncSessionToCloud(null, true);
          return nextSave;
        });

        victoryTimerRef.current = window.setTimeout(() => {
          soundEngine.playVictory();
          setPhase('VICTORY');
        }, 440);
      }
    },
    [
      bottles,
      history.length,
      levelNum,
      parMoves,
      phase,
      pourAnim,
      save.bestMovesByLevel,
      selectedIdx,
      showFeedback,
      syncProgressToCloud,
      syncSessionToCloud,
    ]
  );

  const handleNextLevel = useCallback(() => {
    const nextLvl = levelNum + 1;
    loadLevel(nextLvl, false);
    setPhase('PLAYING');
    soundEngine.playSelect();
  }, [levelNum, loadLevel]);

  // Keyboard shortcuts during PLAYING / PAUSED
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (accountOpen) {
        if (e.key === 'Escape') setAccountOpen(false);
        return;
      }
      if (dailyRewardOpen) {
        if (e.key === 'Escape' || e.key === 'Enter') setDailyRewardOpen(false);
        return;
      }
      if (levelSelectOpen) {
        if (e.key === 'Escape') setLevelSelectOpen(false);
        return;
      }
      if (phase === 'PLAYING') {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          handleRestart();
        } else if (e.key === 'h' || e.key === 'H') {
          e.preventDefault();
          handleHint();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setPhase('PAUSED');
        }
      } else if (phase === 'PAUSED' && e.key === 'Escape') {
        e.preventDefault();
        setPhase('PLAYING');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    accountOpen,
    dailyRewardOpen,
    handleHint,
    handleRestart,
    handleUndo,
    levelSelectOpen,
    phase,
  ]);

  const bottleRows = useMemo(() => {
    if (bottles.length <= 5) {
      return [bottles.map((b, i) => ({ bottle: b, index: i }))];
    }
    const topCount = Math.ceil(bottles.length / 2);
    const row1 = bottles.slice(0, topCount).map((b, i) => ({ bottle: b, index: i }));
    const row2 = bottles.slice(topCount).map((b, i) => ({ bottle: b, index: i + topCount }));
    return [row1, row2];
  }, [bottles]);

  const solvedCount = useMemo(() => bottles.filter((b) => isBottleSolved(b)).length, [bottles]);
  const totalColors = useMemo(
    () =>
      Math.max(
        1,
        bottles.filter((b) => b.length > 0).length > 0
          ? Math.round(bottles.reduce((s, b) => s + b.length, 0) / 4)
          : 1
      ),
    [bottles]
  );

  const playfieldRect = playfieldRef.current ? playfieldRef.current.getBoundingClientRect() : null;
  const compactMode = bottles.length >= 11;
  const anyModalOpen = levelSelectOpen || accountOpen || dailyRewardOpen;

  return (
    <div className="min-h-screen w-full bg-[#08101c] text-slate-100 flex flex-col relative overflow-hidden">
      {/* Subtle Atmospheric Ambient Backdrop during gameplay */}
      <div
        className="pointer-events-none fixed inset-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 80% 55% at 50% 0%, rgba(14, 116, 144, 0.22), transparent 70%), radial-gradient(ellipse 70% 50% at 85% 95%, rgba(30, 64, 175, 0.16), transparent 65%), linear-gradient(180deg, #091322 0%, #0d1a2d 50%, #070e18 100%)',
        }}
      />

      {phase === 'TITLE_MENU' ? (
        <TitleScreen
          currentLevel={save.currentLevel}
          unlockedLevel={save.unlockedLevel}
          coins={save.coins}
          muted={save.muted}
          user={user}
          lastDailyRewardAt={save.lastDailyRewardAt}
          modalOpen={anyModalOpen}
          onStartGame={handleStartFromTitle}
          onOpenLevelSelect={() => setLevelSelectOpen(true)}
          onOpenAccount={() => setAccountOpen(true)}
          onToggleMute={handleToggleMute}
        />
      ) : (
        <div className="relative z-10 flex-1 flex flex-col min-h-screen">
          {/* Top Navigation HUD */}
          <header className="w-full max-w-5xl mx-auto px-4 sm:px-8 pt-4 pb-2 flex items-center justify-between gap-3">
            {/* Left: Pause & Level Selector */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPhase('PAUSED')}
                aria-label="Pause game"
                className="w-11 h-11 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-slate-200 transition-colors cursor-pointer shrink-0"
              >
                <Pause className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setLevelSelectOpen(true)}
                className="h-11 px-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center gap-2.5 text-left transition-colors cursor-pointer whitespace-nowrap"
              >
                <Grid className="w-4 h-4 text-cyan-300 shrink-0" />
                <span className="font-display font-bold text-base text-white tabular-nums">
                  Level {levelNum}
                </span>
                <span className="hidden sm:inline text-xs text-slate-400 font-mono-tabular">
                  {solvedCount}/{totalColors}
                </span>
              </button>
            </div>

            {/* Center: Moves & Level Progress */}
            <div className="flex flex-col items-center">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-slate-400">Moves</span>
                <span className="font-mono-tabular text-lg font-bold text-white">
                  {history.length}
                </span>
              </div>
              <div
                className="w-20 sm:w-32 h-1 rounded-full bg-white/10 overflow-hidden mt-1"
                aria-label={`Progress: ${solvedCount} of ${totalColors} bottles sorted`}
              >
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-300"
                  style={{ width: `${Math.round((solvedCount / totalColors) * 100)}%` }}
                />
              </div>
            </div>

            {/* Right: Coins (opens Daily Bonus), Account Sign-In, Accessibility & Audio */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAccountOpen(true)}
                className="h-11 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 flex items-center gap-2 text-amber-300 font-mono-tabular text-sm font-bold transition-colors cursor-pointer whitespace-nowrap"
                aria-label={`${save.coins} coins — view daily reward`}
              >
                <Coins className="w-4 h-4 shrink-0" />
                <span>{save.coins}</span>
              </button>

              <button
                type="button"
                onClick={() => setAccountOpen(true)}
                aria-label={user ? 'Account settings' : 'Sign in to save progress'}
                className="w-11 h-11 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-slate-200 transition-colors cursor-pointer shrink-0 overflow-hidden"
              >
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Player'}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : user ? (
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                ) : (
                  <LogIn className="w-4 h-4 text-cyan-300" />
                )}
              </button>

              <button
                type="button"
                onClick={handleToggleColorblind}
                aria-label={save.colorblindMode ? 'Hide color symbols' : 'Show color symbols'}
                title="Toggle colorblind symbols"
                className={`hidden md:flex w-11 h-11 rounded-xl border items-center justify-center transition-colors cursor-pointer shrink-0 ${
                  save.colorblindMode
                    ? 'bg-cyan-400/20 border-cyan-400/50 text-cyan-200'
                    : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/10 text-slate-300'
                }`}
              >
                <Eye className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleToggleMute}
                aria-label={save.muted ? 'Unmute audio' : 'Mute audio'}
                className="w-11 h-11 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-slate-200 transition-colors cursor-pointer shrink-0"
              >
                {save.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </header>

          {/* Main Unobstructed Bottle Playfield */}
          <main
            ref={playfieldRef}
            className="relative flex-1 flex flex-col items-center justify-center px-3 sm:px-6 py-4 sm:py-6"
          >
            <PourOverlay pourAnim={pourAnim} containerRect={playfieldRect} />

            <div className="h-7 mb-2 flex items-center justify-center pointer-events-none">
              {feedbackMsg && (
                <p className="text-xs sm:text-sm font-medium text-cyan-200 bg-slate-900/80 border border-white/10 px-3.5 py-1 rounded-lg shadow-lg">
                  {feedbackMsg}
                </p>
              )}
            </div>

            <div className="w-full max-w-5xl flex flex-col items-center justify-center gap-10 sm:gap-12">
              {bottleRows.map((row, rowIdx) => (
                <div
                  key={rowIdx}
                  className={`flex flex-wrap items-end justify-center ${
                    compactMode
                      ? 'gap-x-3 sm:gap-x-5 md:gap-x-7 gap-y-8'
                      : 'gap-x-4 sm:gap-x-7 md:gap-x-10 gap-y-8'
                  }`}
                >
                  {row.map(({ bottle, index }) => {
                    const isSelected = selectedIdx === index;
                    const isValidTarget =
                      selectedIdx !== null &&
                      selectedIdx !== index &&
                      canPour(bottles, selectedIdx, index);
                    const pourRole =
                      pourAnim?.from === index
                        ? 'source'
                        : pourAnim?.to === index
                        ? 'target'
                        : null;

                    return (
                      <Bottle
                        key={index}
                        index={index}
                        bottle={bottle}
                        isSelected={isSelected}
                        isValidTarget={isValidTarget}
                        isShaking={shakingIdx === index}
                        isHintSource={activeHint?.from === index}
                        isHintTarget={activeHint?.to === index}
                        pourRole={pourRole}
                        pourDirection={pourAnim?.direction}
                        colorblindMode={save.colorblindMode}
                        compact={compactMode}
                        onSelect={handleSelectBottle}
                        registerRef={registerBottleRef}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </main>

          {/* Bottom Control Dock */}
          <footer className="w-full max-w-xl mx-auto px-4 pb-5 pt-2">
            <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={handleUndo}
                disabled={history.length === 0 || Boolean(pourAnim)}
                className="min-h-[54px] px-2 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-40 disabled:hover:bg-white/[0.06] border border-white/10 flex flex-col items-center justify-center gap-1 text-slate-100 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <Undo2 className="w-4 h-4 sm:w-5 sm:h-5 text-slate-200" />
                <span className="text-[11px] sm:text-xs font-medium whitespace-nowrap">
                  Undo{history.length > 0 ? ` (${history.length})` : ''}
                </span>
              </button>

              <button
                type="button"
                onClick={handleRestart}
                disabled={Boolean(pourAnim)}
                className="min-h-[54px] px-2 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-40 border border-white/10 flex flex-col items-center justify-center gap-1 text-slate-100 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-slate-200" />
                <span className="text-[11px] sm:text-xs font-medium whitespace-nowrap">
                  Restart
                </span>
              </button>

              <button
                type="button"
                onClick={handleHint}
                disabled={Boolean(pourAnim)}
                className="min-h-[54px] px-2 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-40 border border-white/10 flex flex-col items-center justify-center gap-1 text-slate-100 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
                <span className="text-[11px] sm:text-xs font-medium whitespace-nowrap">
                  Hint {save.coins >= HINT_COST ? `· ${HINT_COST}` : '· Free'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleAddBottle}
                disabled={Boolean(pourAnim) || extraBottlesAdded >= MAX_EXTRA_BOTTLES}
                className="min-h-[54px] px-2 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-40 disabled:hover:bg-white/[0.06] border border-white/10 flex flex-col items-center justify-center gap-1 text-slate-100 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-300" />
                <span className="text-[11px] sm:text-xs font-medium whitespace-nowrap">
                  +Bottle{' '}
                  {extraBottlesAdded >= MAX_EXTRA_BOTTLES
                    ? '(Max)'
                    : save.coins >= EXTRA_BOTTLE_COST
                    ? `· ${EXTRA_BOTTLE_COST}`
                    : '· Free'}
                </span>
              </button>
            </div>
          </footer>
        </div>
      )}

      {/* Modals */}
      <LevelSelectModal
        isOpen={levelSelectOpen}
        unlockedLevel={save.unlockedLevel}
        currentLevel={levelNum}
        bestMovesByLevel={save.bestMovesByLevel}
        onSelectLevel={handleSelectLevelFromModal}
        onClose={() => setLevelSelectOpen(false)}
      />

      <AccountModal
        isOpen={accountOpen}
        user={user}
        authBusy={authBusy}
        authError={authError}
        coins={save.coins}
        unlockedLevel={save.unlockedLevel}
        dailyRewardCount={save.dailyRewardCount}
        lastDailyRewardAt={save.lastDailyRewardAt}
        onSignInGoogle={handleSignInGoogle}
        onSignOut={handleSignOut}
        onClaimDailyReward={() => {
          setAccountOpen(false);
          void triggerDailyRewardIfEligible(user, save);
        }}
        onClose={() => setAccountOpen(false)}
      />

      <DailyRewardModal
        isOpen={dailyRewardOpen}
        dailyRewardCount={save.dailyRewardCount}
        lastDailyRewardAt={save.lastDailyRewardAt}
        totalCoins={save.coins}
        isSignedIn={Boolean(user)}
        onClose={() => setDailyRewardOpen(false)}
        onOpenAccount={() => setAccountOpen(true)}
      />

      {phase === 'PAUSED' && (
        <PauseModal
          level={levelNum}
          muted={save.muted}
          colorblindMode={save.colorblindMode}
          user={user}
          onResume={() => setPhase('PLAYING')}
          onRestart={handleRestart}
          onToggleMute={handleToggleMute}
          onToggleColorblind={handleToggleColorblind}
          onOpenAccount={() => {
            setPhase('PLAYING');
            setAccountOpen(true);
          }}
          onReturnTitle={() => setPhase('TITLE_MENU')}
        />
      )}

      {phase === 'VICTORY' && (
        <VictoryModal
          level={levelNum}
          moves={history.length}
          parMoves={parMoves}
          coinsEarned={lastCoinsEarned}
          totalCoins={save.coins}
          onNextLevel={handleNextLevel}
          onReplay={handleRestart}
        />
      )}
    </div>
  );
}
