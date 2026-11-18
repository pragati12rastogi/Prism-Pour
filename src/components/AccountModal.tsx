import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { Cloud, Coins, Gift, LogIn, LogOut, ShieldCheck, X } from 'lucide-react';
import {
  DAILY_REWARD_COINS,
  formatCountdown,
  getRemainingDailyRewardMs,
  isDailyRewardEligible,
} from '../game/cloudSync';

interface AccountModalProps {
  isOpen: boolean;
  user: User | null;
  authBusy: boolean;
  authError: string | null;
  coins: number;
  unlockedLevel: number;
  dailyRewardCount: number;
  lastDailyRewardAt: number | null;
  onSignInGoogle: () => void;
  onSignOut: () => void;
  onClaimDailyReward: () => void;
  onClose: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  user,
  authBusy,
  authError,
  coins,
  unlockedLevel,
  dailyRewardCount,
  lastDailyRewardAt,
  onSignInGoogle,
  onSignOut,
  onClaimDailyReward,
  onClose,
}) => {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!isOpen) return;
    setNowMs(Date.now());
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const eligible = isDailyRewardEligible(lastDailyRewardAt, nowMs);
  const remainingMs = getRemainingDailyRewardMs(lastDailyRewardAt, nowMs);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Account and Daily Rewards"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#0e1a2b] border border-white/15 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="font-display text-xl font-bold text-white">
            Account & Daily Rewards
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account modal"
            className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Cloud Account Section */}
          <div className="space-y-4">
            {user ? (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Player avatar'}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full border border-white/20 object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center text-cyan-200 font-display font-bold text-lg shrink-0">
                      {(user.displayName || user.email || 'P')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-white truncate">
                      {user.displayName || 'Player'}
                    </div>
                    <div className="text-xs text-slate-400 truncate">{user.email}</div>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-1">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>Cloud progress sync active · Level {unlockedLevel}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-400/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">Save Progress Across Devices</h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Sign in with Google to back up your unlocked levels, coin wallet, and 24-hour daily rewards to the cloud.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {authError && (
              <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-lg px-3 py-2">
                {authError}
              </p>
            )}

            {user ? (
              <button
                type="button"
                disabled={authBusy}
                onClick={onSignOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-200 font-medium text-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                <span>{authBusy ? 'Signing out...' : 'Sign Out'}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={authBusy}
                onClick={onSignInGoogle}
                className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-sm shadow-[0_6px_24px_rgba(34,211,238,0.25)] transition-all cursor-pointer disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>{authBusy ? 'Signing in...' : 'Sign in with Google'}</span>
              </button>
            )}
          </div>

          <div className="border-t border-white/10" />

          {/* 24-Hour Daily Reward Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Gift className="w-4 h-4 text-amber-300" />
                <span>24-Hour Daily Reward</span>
              </div>
              <span className="text-xs font-mono-tabular text-amber-300 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5" />
                <span>+{DAILY_REWARD_COINS} Coins</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center py-3 rounded-xl bg-white/[0.03] border border-white/10">
              <div>
                <div className="text-[11px] text-slate-400">Balance</div>
                <div className="font-mono-tabular text-base font-bold text-amber-300 mt-0.5">
                  {coins}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Claims</div>
                <div className="font-mono-tabular text-base font-bold text-white mt-0.5">
                  {dailyRewardCount}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Next Claim</div>
                <div className="font-mono-tabular text-xs font-semibold text-cyan-300 mt-1">
                  {eligible ? 'Ready!' : formatCountdown(remainingMs)}
                </div>
              </div>
            </div>

            {eligible && (
              <button
                type="button"
                onClick={onClaimDailyReward}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
              >
                <Coins className="w-4 h-4" />
                <span>Claim +{DAILY_REWARD_COINS} Daily Coins</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
