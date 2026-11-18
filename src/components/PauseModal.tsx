import React from 'react';
import { Eye, Home, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface PauseModalProps {
  level: number;
  muted: boolean;
  colorblindMode: boolean;
  onResume: () => void;
  onRestart: () => void;
  onToggleMute: () => void;
  onToggleColorblind: () => void;
  onReturnTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  level,
  muted,
  colorblindMode,
  onResume,
  onRestart,
  onToggleMute,
  onToggleColorblind,
  onReturnTitle,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Game Paused"
    >
      <div className="w-full max-w-sm rounded-2xl bg-[#0e1a2b] border border-white/15 shadow-2xl p-6 space-y-5">
        <div className="text-center">
          <p className="text-xs text-cyan-300 font-medium">Level {level}</p>
          <h2 className="font-display text-2xl font-bold text-white mt-1">Game Paused</h2>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Resume</span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.11] border border-white/10 text-slate-100 font-medium text-sm transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart Level</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 text-sm transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              {muted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-cyan-300" />}
              <span>Sound Effects</span>
            </span>
            <span className="text-xs font-mono-tabular text-slate-400">{muted ? 'Off' : 'On'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleColorblind}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 text-sm transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-cyan-300" />
              <span>Color Symbols</span>
            </span>
            <span className="text-xs font-mono-tabular text-slate-400">{colorblindMode ? 'On' : 'Off'}</span>
          </button>

          <button
            type="button"
            onClick={onReturnTitle}
            className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-transparent hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 text-sm transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Title Screen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
