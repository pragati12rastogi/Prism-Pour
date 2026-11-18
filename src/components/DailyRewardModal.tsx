import React, { useEffect, useState } from 'react';
import { CalendarCheck, Coins, Sparkles } from 'lucide-react';
import {
  DAILY_REWARD_COINS,
  formatCountdown,
  getRemainingDailyRewardMs,
} from '../game/cloudSync';

interface DailyRewardModalProps {
  isOpen: boolean;
  dailyRewardCount: number;
  lastDailyRewardAt: number | null;
  totalCoins: number;
  isSignedIn: boolean;
  onClose: () => void;
  onOpenAccount: () => void;
}

export const DailyRewardModal: React.FC<DailyRewardModalProps> = ({
  isOpen,
  dailyRewardCount,
  lastDailyRewardAt,
  totalCoins,
  isSignedIn,
  onClose,
  onOpenAccount,
}) => {
  const [remainingMs, setRemainingMs] = useState<number>(() =>
    getRemainingDailyRewardMs(lastDailyRewardAt)
  );

  useEffect(() => {
    if (!isOpen) return;
    setRemainingMs(getRemainingDailyRewardMs(lastDailyRewardAt));
    const interval = window.setInterval(() => {
      setRemainingMs(getRemainingDailyRewardMs(lastDailyRewardAt));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isOpen, lastDailyRewardAt]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Daily Coin Reward"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-[#0e1a2b] border border-amber-400/30 shadow-[0_24px_80px_rgba(0,0,0,0.65)] p-7 text-center space-y-5">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-400/15 border border-amber-400/35 flex items-center justify-center text-amber-300 shadow-[0_0_32px_rgba(251,191,36,0.22)]">
          <Coins className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-amber-300 flex items-center justify-center gap-1.5">
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>24-Hour Daily Bonus · Claim #{Math.max(1, dailyRewardCount)}</span>
          </p>
          <h2 className="font-display text-3xl font-extrabold text-white">
            +{DAILY_REWARD_COINS} Coins
          </h2>
          <p className="text-sm text-slate-300">
            Welcome back! Your daily coin reward has been added to your balance.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 py-4 border-y border-white/10">
          <div>
            <div className="text-xs text-slate-400">Coin Balance</div>
            <div className="font-mono-tabular text-xl font-bold text-amber-300 mt-0.5">
              {totalCoins}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Next Reward In</div>
            <div className="font-mono-tabular text-base font-semibold text-slate-100 mt-1">
              {formatCountdown(remainingMs)}
            </div>
          </div>
        </div>

        {!isSignedIn && (
          <p className="text-xs text-slate-400">
            Playing as Guest.{' '}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAccount();
              }}
              className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2 cursor-pointer"
            >
              Sign in with Google
            </button>{' '}
            to save your coins and level progress across devices.
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm shadow-[0_8px_24px_rgba(251,191,36,0.28)] transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Collect & Continue</span>
        </button>
      </div>
    </div>
  );
};
