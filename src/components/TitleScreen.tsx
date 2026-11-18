import React, { useEffect } from 'react';
import { Grid, Play, Volume2, VolumeX } from 'lucide-react';

interface TitleScreenProps {
  currentLevel: number;
  unlockedLevel: number;
  coins: number;
  muted: boolean;
  onStartGame: () => void;
  onOpenLevelSelect: () => void;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  currentLevel,
  unlockedLevel,
  coins,
  muted,
  onStartGame,
  onOpenLevelSelect,
  onToggleMute,
}) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onStartGame]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col justify-between bg-[#08101c]">
      {/* Atmospheric generated studio backdrop with fallback gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#081221] via-[#0d1c30] to-[#07101c]">
        <img
          src="/src/assets/images/prism_pour_backdrop_1794999907443.jpg"
          alt="Moody apothecary slate studio with water caustics and glass vessels"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-75"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#060d18]/95 via-[#08111f]/75 to-[#060d18]/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060d18] via-transparent to-[#060d18]/60" />
      </div>

      {/* Top minimal audio control */}
      <div className="relative z-10 flex items-center justify-between px-6 sm:px-10 pt-6">
        <div className="flex items-center gap-3 text-sm text-slate-300 font-mono-tabular">
          <span>Level {currentLevel}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>{unlockedLevel} Unlocked</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-amber-300">{coins} Coins</span>
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          className="w-11 h-11 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-slate-200 transition-colors cursor-pointer"
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Main Hero Lockup over calm negative space */}
      <main className="relative z-10 flex-1 flex items-center px-6 sm:px-12 lg:px-20 py-8">
        <div className="max-w-xl w-full space-y-8">
          {/* Bespoke SVG Title Lockup */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-4">
              <svg
                width="56"
                height="64"
                viewBox="0 0 56 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0 animate-float-gentle drop-shadow-[0_10px_24px_rgba(34,211,238,0.28)]"
                aria-hidden="true"
              >
                <rect x="17" y="4" width="22" height="6" rx="3" stroke="#BAE6FD" strokeWidth="2.5" fill="rgba(255,255,255,0.08)" />
                <path
                  d="M19 10H37V44C37 51.1797 31.1797 57 24 57H32C24.8203 57 19 51.1797 19 44V10Z"
                  fill="rgba(255,255,255,0.06)"
                />
                <clipPath id="title-flask-clip">
                  <rect x="18" y="12" width="20" height="44" rx="10" />
                </clipPath>
                <g clipPath="url(#title-flask-clip)">
                  <rect x="18" y="44" width="20" height="13" fill="#2563EB" />
                  <rect x="18" y="33" width="20" height="11" fill="#059669" />
                  <rect x="18" y="22" width="20" height="11" fill="#F59E0B" />
                  <ellipse cx="28" cy="22" rx="10" ry="2.5" fill="#FDE68A" />
                </g>
                <rect x="16" y="10" width="24" height="48" rx="12" stroke="rgba(255,255,255,0.65)" strokeWidth="2.5" />
                <line x1="21" y1="16" x2="21" y2="48" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
              </svg>

              <div>
                <h1 className="font-display text-5xl sm:text-6xl font-extrabold tracking-tight text-white leading-none">
                  Prism Pour
                </h1>
                <p className="mt-2 text-base sm:text-lg text-slate-300 font-normal">
                  Liquid Color Sorting Puzzle
                </p>
              </div>
            </div>
          </div>

          {/* Crisp 3-line rules overview */}
          <div className="space-y-2.5 text-sm sm:text-base text-slate-300 border-t border-white/10 pt-5 max-w-md">
            <p className="leading-relaxed">
              Sort mixed liquids so every glass bottle holds 4 matching units of a single color.
            </p>
            <p className="text-slate-400 text-sm">
              Pour only into empty bottles or onto matching top colors with open space.
            </p>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onStartGame}
              className="inline-flex items-center gap-3 px-7 py-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 active:scale-[0.98] text-slate-950 font-semibold text-base shadow-[0_8px_30px_rgba(34,211,238,0.32)] transition-all cursor-pointer whitespace-nowrap"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>{currentLevel > 1 ? `Continue Level ${currentLevel}` : 'Start Game'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenLevelSelect}
              className="inline-flex items-center gap-2.5 px-5 py-3.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.13] border border-white/15 text-slate-100 font-medium text-base transition-all cursor-pointer whitespace-nowrap"
            >
              <Grid className="w-4 h-4 text-cyan-300" />
              <span>Select Level</span>
            </button>
          </div>
        </div>
      </main>

      {/* Single flat control-hint line */}
      <footer className="relative z-10 px-6 sm:px-12 lg:px-20 pb-6">
        <p className="text-xs sm:text-sm text-slate-400 tracking-wide">
          Click or Tap bottles to pour · Z Undo · R Restart · H Hint · Enter to Start
        </p>
      </footer>
    </div>
  );
};
