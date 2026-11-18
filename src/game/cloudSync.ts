import { User } from 'firebase/auth';
import {
  Timestamp,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { OperationType, db, handleFirestoreError } from '../firebase';
import { ActiveSession, Bottle, ColorId, MoveRecord, SaveData } from './types';

export const DAILY_REWARD_COINS = 50;
export const DAILY_REWARD_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function isDailyRewardEligible(
  lastDailyRewardAt: number | null,
  nowMs: number = Date.now()
): boolean {
  if (lastDailyRewardAt === null) return true;
  return nowMs - lastDailyRewardAt >= DAILY_REWARD_INTERVAL_MS;
}

export function getRemainingDailyRewardMs(
  lastDailyRewardAt: number | null,
  nowMs: number = Date.now()
): number {
  if (lastDailyRewardAt === null) return 0;
  const elapsed = nowMs - lastDailyRewardAt;
  return Math.max(0, DAILY_REWARD_INTERVAL_MS - elapsed);
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Available now';
  const totalSec = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

function sanitizeDisplayName(name: string | null | undefined): string {
  const cleaned = (name ?? '').trim();
  if (!cleaned) return 'Player';
  return cleaned.slice(0, 80);
}

function clampInt(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.min(max, Math.max(min, Math.trunc(val)));
}

function sanitizeBestMoves(raw: Record<number, number> | Record<string, unknown>): Record<string, number> {
  const result: Record<string, number> = {};
  const entries = Object.entries(raw || {}).slice(0, 500);
  for (const [k, v] of entries) {
    const levelNum = Number(k);
    const movesNum = Number(v);
    if (
      Number.isInteger(levelNum) &&
      levelNum >= 1 &&
      levelNum <= 10000 &&
      Number.isInteger(movesNum) &&
      movesNum >= 1 &&
      movesNum <= 5000
    ) {
      result[String(levelNum)] = movesNum;
    }
  }
  return result;
}

function parseBestMoves(raw: unknown): Record<number, number> {
  const result: Record<number, number> = {};
  if (!raw || typeof raw !== 'object') return result;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const lvl = Number(k);
    const moves = Number(v);
    if (Number.isInteger(lvl) && lvl >= 1 && Number.isInteger(moves) && moves >= 1) {
      result[lvl] = moves;
    }
  }
  return result;
}

function encodeBottles(bottles: Bottle[]): Array<{ layers: ColorId[] }> {
  return bottles.slice(0, 16).map((b) => ({ layers: b.slice(0, 4) }));
}

function decodeBottles(raw: unknown): Bottle[] | null {
  if (!Array.isArray(raw) || raw.length < 3 || raw.length > 16) return null;
  const bottles: Bottle[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object' || !Array.isArray((item as { layers?: unknown }).layers)) {
      return null;
    }
    const layers = ((item as { layers: unknown[] }).layers).slice(0, 4) as ColorId[];
    bottles.push(layers);
  }
  return bottles;
}

function mergeBestMoves(
  cloud: Record<number, number>,
  local: Record<number, number>
): Record<number, number> {
  const merged: Record<number, number> = { ...cloud };
  for (const [lvlStr, moves] of Object.entries(local)) {
    const lvl = Number(lvlStr);
    if (!merged[lvl] || moves < merged[lvl]) {
      merged[lvl] = moves;
    }
  }
  return merged;
}

export async function saveCloudActiveSession(
  user: User,
  session: ActiveSession | null
): Promise<void> {
  const path = `users/${user.uid}/sessions/current`;
  const sessionRef = doc(db, 'users', user.uid, 'sessions', 'current');
  if (!session) {
    try {
      await deleteDoc(sessionRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
    return;
  }

  const payload = {
    uid: user.uid,
    level: clampInt(session.level, 1, 10000),
    parMoves: clampInt(session.parMoves, 1, 500),
    extraBottlesAdded: clampInt(session.extraBottlesAdded, 0, 2),
    bottles: encodeBottles(session.bottles),
    initialBottles: encodeBottles(session.initialBottles),
    history: session.history.slice(0, 500).map((m: MoveRecord) => ({
      from: m.from,
      to: m.to,
      color: m.color,
      count: m.count,
    })),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(sessionRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveCloudProgress(user: User, save: SaveData): Promise<void> {
  const path = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const payload = {
    displayName: sanitizeDisplayName(user.displayName),
    unlockedLevel: clampInt(save.unlockedLevel, 1, 10000),
    currentLevel: clampInt(save.currentLevel, 1, 10000),
    coins: clampInt(save.coins, 0, 10000000),
    bestMovesByLevel: sanitizeBestMoves(save.bestMovesByLevel),
    muted: Boolean(save.muted),
    colorblindMode: Boolean(save.colorblindMode),
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(userRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function claimCloudDailyReward(user: User, currentSave: SaveData): Promise<SaveData> {
  const path = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const nextCoins = clampInt(currentSave.coins + DAILY_REWARD_COINS, 0, 10000000);
  const nextCount = clampInt(currentSave.dailyRewardCount + 1, 1, 100000);

  try {
    await updateDoc(userRef, {
      coins: nextCoins,
      dailyRewardCount: nextCount,
      lastDailyRewardAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }

  // Read back authoritative server timestamp
  let claimedMs = Date.now();
  try {
    const snap = await getDoc(userRef);
    const ts = snap.data()?.lastDailyRewardAt;
    if (ts instanceof Timestamp) {
      claimedMs = ts.toMillis();
    }
  } catch {
    // Fallback to Date.now() if read-back fails transiently
  }

  return {
    ...currentSave,
    coins: nextCoins,
    dailyRewardCount: nextCount,
    lastDailyRewardAt: claimedMs,
  };
}

export async function loadOrCreateCloudProfile(
  user: User,
  localSave: SaveData
): Promise<{ save: SaveData; dailyRewardClaimedNow: boolean }> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  let userSnap;

  try {
    userSnap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  if (!userSnap.exists()) {
    const initialCoins = clampInt(localSave.coins, 0, 10000);
    const initialProfile = {
      uid: user.uid,
      displayName: sanitizeDisplayName(user.displayName),
      unlockedLevel: clampInt(localSave.unlockedLevel, 1, 10000),
      currentLevel: clampInt(localSave.currentLevel, 1, 10000),
      coins: initialCoins,
      dailyRewardCount: 0,
      lastDailyRewardAt: null,
      muted: Boolean(localSave.muted),
      colorblindMode: Boolean(localSave.colorblindMode),
      bestMovesByLevel: sanitizeBestMoves(localSave.bestMovesByLevel),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(userRef, initialProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, userPath);
    }

    if (localSave.activeSession) {
      await saveCloudActiveSession(user, localSave.activeSession);
    }

    let createdSave: SaveData = {
      ...localSave,
      coins: initialCoins,
      dailyRewardCount: 0,
      lastDailyRewardAt: null,
    };

    const guestClaimedWithin24h =
      localSave.lastDailyRewardAt !== null && !isDailyRewardEligible(localSave.lastDailyRewardAt);

    if (!guestClaimedWithin24h) {
      createdSave = await claimCloudDailyReward(user, createdSave);
      return { save: createdSave, dailyRewardClaimedNow: true };
    }

    // Preserve local cooldown timer locally so user isn't double-rewarded on the same device within 24h
    return {
      save: {
        ...createdSave,
        lastDailyRewardAt: localSave.lastDailyRewardAt,
      },
      dailyRewardClaimedNow: false,
    };
  }

  // Existing cloud profile
  const data = userSnap.data();
  const cloudUnlocked = typeof data.unlockedLevel === 'number' ? data.unlockedLevel : 1;
  const cloudCurrent = typeof data.currentLevel === 'number' ? data.currentLevel : 1;
  const cloudCoins = typeof data.coins === 'number' ? data.coins : 100;
  const cloudDailyCount = typeof data.dailyRewardCount === 'number' ? data.dailyRewardCount : 0;
  const cloudLastDailyMs =
    data.lastDailyRewardAt instanceof Timestamp ? data.lastDailyRewardAt.toMillis() : null;
  const cloudBestMoves = parseBestMoves(data.bestMovesByLevel);

  // Fetch active session if any
  const sessionPath = `users/${user.uid}/sessions/current`;
  let cloudSession: ActiveSession | null = null;
  try {
    const sessionSnap = await getDoc(doc(db, 'users', user.uid, 'sessions', 'current'));
    if (sessionSnap.exists()) {
      const sd = sessionSnap.data();
      const decodedBottles = decodeBottles(sd.bottles);
      const decodedInitial = decodeBottles(sd.initialBottles);
      if (decodedBottles && decodedInitial && typeof sd.level === 'number') {
        cloudSession = {
          level: sd.level,
          parMoves: typeof sd.parMoves === 'number' ? sd.parMoves : 10,
          extraBottlesAdded: typeof sd.extraBottlesAdded === 'number' ? sd.extraBottlesAdded : 0,
          bottles: decodedBottles,
          initialBottles: decodedInitial,
          history: Array.isArray(sd.history) ? (sd.history as MoveRecord[]) : [],
        };
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, sessionPath);
  }

  const mergedUnlocked = Math.max(cloudUnlocked, localSave.unlockedLevel);
  const mergedBestMoves = mergeBestMoves(cloudBestMoves, localSave.bestMovesByLevel);
  const mergedCurrent = cloudCurrent >= 1 ? cloudCurrent : localSave.currentLevel;

  let mergedSave: SaveData = {
    unlockedLevel: mergedUnlocked,
    currentLevel: mergedCurrent,
    coins: cloudCoins,
    bestMovesByLevel: mergedBestMoves,
    muted: typeof data.muted === 'boolean' ? data.muted : localSave.muted,
    colorblindMode:
      typeof data.colorblindMode === 'boolean' ? data.colorblindMode : localSave.colorblindMode,
    lastDailyRewardAt: cloudLastDailyMs,
    dailyRewardCount: cloudDailyCount,
    activeSession: cloudSession ?? localSave.activeSession ?? null,
  };

  // Sync merged local progress back up if local had higher unlocked level or new best scores
  if (
    mergedUnlocked > cloudUnlocked ||
    Object.keys(mergedBestMoves).length > Object.keys(cloudBestMoves).length
  ) {
    await saveCloudProgress(user, mergedSave);
  }

  // Check if user is eligible for 24-hour daily reward
  if (isDailyRewardEligible(mergedSave.lastDailyRewardAt)) {
    mergedSave = await claimCloudDailyReward(user, mergedSave);
    return { save: mergedSave, dailyRewardClaimedNow: true };
  }

  return { save: mergedSave, dailyRewardClaimedNow: false };
}
