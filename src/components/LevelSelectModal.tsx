import React from 'react';
import { Check, Lock, X } from 'lucide-react';
import { getLevelParameters } from '../game/engine';

interface LevelSelectModalProps {
  isOpen: boolean;
  unlockedLevel: number;
  currentLevel: number;
  bestMovesByLevel: Record<number, number>;
  onSelectLevel: (level: number) => void;
  onClose: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  isOpen,
  unlockedLevel,
  currentLevel,
  bestMovesByLevel,
  onSelectLevel,
  onClose,
}) => {
  if (!isOpen) return null;

  const totalDisplayed = Math.max(24, Math.ceil((unlockedLevel + 6) / 6) * 6);
  const levels = Array.from({ length: totalDisplayed }, (_, i) => i + 1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Select Level"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-[#0e1929] border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display text-xl font-bold text-white">Select Level</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {unlockedLevel} levels unlocked · Difficulty scales from 3 to 12 colors
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close level selector"
            className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {levels.map((lvl) => {
            const isUnlocked = lvl <= unlockedLevel;
            const isCurrent = lvl === currentLevel;
            const best = bestMovesByLevel[lvl];
            const { colorCount } = getLevelParameters(lvl);

            return (
              <button
                key={lvl}
                type="button"
                disabled={!isUnlocked}
                onClick={() => onSelectLevel(lvl)}
                className={`relative flex flex-col items-center justify-center p-3 min-h-[76px] rounded-xl border transition-all ${
                  !isUnlocked
                    ? 'bg-white/[0.02] border-white/5 text-slate-600 cursor-not-allowed'
                    : isCurrent
                    ? 'bg-cyan-400/15 border-cyan-400 text-white shadow-[0_0_20px_rgba(34,211,238,0.2)] cursor-pointer'
                    : 'bg-white/[0.05] hover:bg-white/[0.1] border-white/10 text-slate-100 cursor-pointer'
                }`}
              >
                <span className="font-display text-lg font-bold tabular-nums">{lvl}</span>
                {isUnlocked ? (
                  <span className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                    {best ? `${best}m` : `${colorCount}c`}
                  </span>
                ) : (
                  <Lock className="w-3.5 h-3.5 mt-1 text-slate-600" />
                )}

                {best && (
                  <span
                    className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center"
                    aria-label="Completed"
                  >
                    <Check className="w-2.5 h-2.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
