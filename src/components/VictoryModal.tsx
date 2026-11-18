import React from 'react';
import { ArrowRight, RotateCcw, Trophy } from 'lucide-react';

interface VictoryModalProps {
  level: number;
  moves: number;
  parMoves: number;
  coinsEarned: number;
  totalCoins: number;
  onNextLevel: () => void;
  onReplay: () => void;
}

const CONFETTI_PIECES = [
  { left: '8%', color: '#22d3ee', delay: '0s', duration: '1.8s' },
  { left: '16%', color: '#fb7185', delay: '0.15s', duration: '2.1s' },
  { left: '24%', color: '#fcd34d', delay: '0.08s', duration: '1.7s' },
  { left: '34%', color: '#34d399', delay: '0.25s', duration: '2.2s' },
  { left: '44%', color: '#a78bfa', delay: '0.05s', duration: '1.9s' },
  { left: '56%', color: '#fb923c', delay: '0.2s', duration: '2.0s' },
  { left: '66%', color: '#60a5fa', delay: '0.12s', duration: '1.85s' },
  { left: '76%', color: '#f472b6', delay: '0.28s', duration: '2.15s' },
  { left: '86%', color: '#a3e635', delay: '0.06s', duration: '1.75s' },
  { left: '92%', color: '#fcd34d', delay: '0.18s', duration: '2.05s' },
];

export const VictoryModal: React.FC<VictoryModalProps> = ({
  level,
  moves,
  parMoves,
  coinsEarned,
  totalCoins,
  onNextLevel,
  onReplay,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`Level ${level} Completed`}
    >
      {/* Celebratory Confetti Rain */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {CONFETTI_PIECES.map((piece, idx) => (
          <span
            key={idx}
            className="absolute top-0 w-2.5 h-4 rounded-sm"
            style={{
              left: piece.left,
              backgroundColor: piece.color,
              animation: `confetti-fall ${piece.duration} ease-in ${piece.delay} forwards`,
            }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-md rounded-2xl bg-[#0e1a2b] border border-cyan-400/25 shadow-[0_24px_80px_rgba(0,0,0,0.65)] p-7 text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.2)]">
          <Trophy className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wider text-cyan-300">
            Level {level} Complete
          </p>
          <h2 className="font-display text-3xl font-extrabold text-white">
            Congratulations!
          </h2>
          <p className="text-sm text-slate-300">
            Every vessel is cleanly sorted.
          </p>
        </div>

        {/* Clean Metrics Row */}
        <div className="grid grid-cols-3 gap-3 py-4 border-y border-white/10">
          <div>
            <div className="text-xs text-slate-400">Moves</div>
            <div className="font-mono-tabular text-xl font-bold text-white mt-0.5">{moves}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Par Target</div>
            <div className="font-mono-tabular text-xl font-bold text-slate-300 mt-0.5">{parMoves}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Reward</div>
            <div className="font-mono-tabular text-xl font-bold text-amber-300 mt-0.5">+{coinsEarned}</div>
          </div>
        </div>

        <p className="text-xs text-slate-400 font-mono-tabular">
          Total Balance: <span className="text-amber-300 font-semibold">{totalCoins} Coins</span>
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onReplay}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/10 text-slate-200 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Replay</span>
          </button>

          <button
            type="button"
            onClick={onNextLevel}
            className="flex-[1.6] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-sm shadow-[0_6px_24px_rgba(34,211,238,0.3)] transition-all cursor-pointer whitespace-nowrap"
          >
            <span>Next Level</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
