import React from 'react';
import { LIQUID_COLORS } from '../game/colors';
import { BOTTLE_CAPACITY, isBottleSolved } from '../game/engine';
import { Bottle as BottleType } from '../game/types';

interface BottleProps {
  index: number;
  bottle: BottleType;
  isSelected: boolean;
  isValidTarget: boolean;
  isShaking: boolean;
  isHintSource: boolean;
  isHintTarget: boolean;
  pourRole: 'source' | 'target' | null;
  pourDirection?: 'left' | 'right';
  colorblindMode: boolean;
  compact?: boolean;
  onSelect: (index: number) => void;
  registerRef: (index: number, el: HTMLButtonElement | null) => void;
}

export const Bottle: React.FC<BottleProps> = ({
  index,
  bottle,
  isSelected,
  isValidTarget,
  isShaking,
  isHintSource,
  isHintTarget,
  pourRole,
  pourDirection = 'right',
  colorblindMode,
  compact = false,
  onSelect,
  registerRef,
}) => {
  const solved = isBottleSolved(bottle);
  const isEmpty = bottle.length === 0;
  const topColor = bottle.length > 0 ? LIQUID_COLORS[bottle[bottle.length - 1]] : null;

  // Tilt angle when acting as active pouring source
  let transformStyle = 'translateY(0px) scale(1) rotate(0deg)';
  if (pourRole === 'source') {
    const tilt = pourDirection === 'right' ? 32 : -32;
    const shiftX = pourDirection === 'right' ? 10 : -10;
    transformStyle = `translate(${shiftX}px, -24px) scale(1.04) rotate(${tilt}deg)`;
  } else if (isSelected) {
    transformStyle = 'translateY(-18px) scale(1.04)';
  }

  const sizeClasses = compact
    ? 'w-[58px] h-[164px] sm:w-[68px] sm:h-[190px] md:w-[76px] md:h-[212px]'
    : 'w-[66px] h-[184px] sm:w-[78px] sm:h-[214px] md:w-[86px] md:h-[234px]';

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* Hint indicator above bottle */}
      {(isHintSource || isHintTarget) && (
        <div
          className={`absolute -top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide whitespace-nowrap animate-hint-pulse shadow-lg ${
            isHintSource
              ? 'bg-cyan-400 text-slate-950'
              : 'bg-amber-400 text-slate-950'
          }`}
        >
          {isHintSource ? 'Pick' : 'Pour'}
        </div>
      )}

      <button
        ref={(el) => registerRef(index, el)}
        type="button"
        onClick={() => onSelect(index)}
        aria-label={`Bottle ${index + 1}, ${
          isEmpty
            ? 'empty'
            : `${bottle.length} of 4 layers, top color ${topColor?.name ?? ''}${solved ? ', completed' : ''}`
        }`}
        style={{
          transform: transformStyle,
          transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), filter 200ms ease',
        }}
        className={`group relative flex flex-col items-center justify-end focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 rounded-b-[32px] cursor-pointer ${sizeClasses} ${
          isShaking ? 'animate-bottle-shake' : ''
        }`}
      >
        {/* Subtle ground shadow */}
        <div
          className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-[78%] h-3 rounded-full blur-md transition-all duration-200 pointer-events-none ${
            isSelected || pourRole === 'source'
              ? 'bg-cyan-400/35 scale-90'
              : solved && topColor
              ? 'opacity-70'
              : 'bg-black/55'
          }`}
          style={solved && topColor ? { backgroundColor: topColor.glow } : undefined}
        />

        {/* Completed glass stopper / cork */}
        <div
          className={`absolute -top-2.5 left-1/2 -translate-x-1/2 z-20 transition-all duration-300 pointer-events-none ${
            solved ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-3 scale-75'
          }`}
        >
          <div className="w-7 sm:w-8 h-4 rounded-t-md rounded-b-sm bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 border border-amber-100/60 shadow-md flex items-center justify-center">
            <div className="w-3.5 h-1 rounded-full bg-white/50" />
          </div>
        </div>

        {/* Flared Glass Neck & Rim */}
        <div
          className={`relative z-10 w-[68%] h-[14px] rounded-full border-2 transition-colors duration-200 ${
            isSelected
              ? 'border-cyan-300/90 bg-cyan-200/15 shadow-[0_0_16px_rgba(34,211,238,0.45)]'
              : isHintSource
              ? 'border-cyan-300 bg-cyan-300/20 shadow-[0_0_16px_rgba(34,211,238,0.5)]'
              : isHintTarget
              ? 'border-amber-300 bg-amber-300/20 shadow-[0_0_16px_rgba(251,191,36,0.5)]'
              : isValidTarget
              ? 'border-cyan-300/75 bg-white/15 group-hover:border-cyan-200'
              : 'border-white/35 bg-white/10 group-hover:border-white/55'
          }`}
        >
          <div className="absolute inset-x-2 top-[2px] h-[2px] rounded-full bg-white/40" />
        </div>

        {/* Main Glass Tube Body */}
        <div
          className={`relative -mt-[4px] w-[82%] flex-1 rounded-t-[6px] rounded-b-[28px] border-2 overflow-hidden backdrop-blur-[2px] transition-all duration-200 ${
            isSelected
              ? 'border-cyan-300/85 bg-white/[0.08] shadow-[0_0_24px_rgba(34,211,238,0.28)]'
              : isHintSource
              ? 'border-cyan-400/90 bg-cyan-400/[0.08] shadow-[0_0_24px_rgba(34,211,238,0.35)]'
              : isHintTarget
              ? 'border-amber-400/90 bg-amber-400/[0.08] shadow-[0_0_24px_rgba(251,191,36,0.35)]'
              : isValidTarget
              ? 'border-cyan-300/55 bg-white/[0.07] group-hover:border-cyan-200/85 group-hover:-translate-y-0.5'
              : solved
              ? 'border-white/50 bg-white/[0.09]'
              : 'border-white/25 bg-white/[0.05] group-hover:border-white/45'
          }`}
        >
          {/* Liquid Stack Container (bottom-aligned, 4 slots) */}
          <div className="absolute inset-x-[2px] bottom-[2px] top-[12px] flex flex-col-reverse justify-start overflow-hidden rounded-b-[24px]">
            {Array.from({ length: BOTTLE_CAPACITY }).map((_, slotIdx) => {
              const colorId = bottle[slotIdx];
              const isFilled = Boolean(colorId);
              const isTopLiquid = isFilled && slotIdx === bottle.length - 1;
              const theme = colorId ? LIQUID_COLORS[colorId] : null;
              const sameAbove = isFilled && bottle[slotIdx + 1] === colorId;
              const sameBelow = isFilled && bottle[slotIdx - 1] === colorId;

              return (
                <div
                  key={slotIdx}
                  className="relative w-full h-1/4 transition-all duration-300 ease-out"
                  style={{
                    opacity: isFilled ? 1 : 0,
                    transform: isFilled ? 'scaleY(1)' : 'scaleY(0.2)',
                    transformOrigin: 'bottom center',
                  }}
                >
                  {theme && (
                    <div
                      className="w-full h-full relative flex items-center justify-center"
                      style={{
                        background: `linear-gradient(180deg, ${
                          sameAbove ? theme.mid : theme.top
                        } 0%, ${theme.mid} 55%, ${sameBelow ? theme.mid : theme.bottom} 100%)`,
                        boxShadow: isTopLiquid ? `0 -4px 12px ${theme.glow}` : undefined,
                      }}
                    >
                      {/* Top Meniscus Surface Ripple */}
                      {isTopLiquid && (
                        <div
                          className="absolute -top-[3px] inset-x-0 h-[6px] rounded-full opacity-85 animate-meniscus pointer-events-none"
                          style={{
                            backgroundColor: theme.meniscus,
                            boxShadow: `0 0 8px ${theme.meniscus}`,
                          }}
                        />
                      )}

                      {/* Pouring Impact Ripple when receiving liquid */}
                      {isTopLiquid && pourRole === 'target' && (
                        <div
                          className="absolute -top-1 left-1/2 -translate-x-1/2 w-[75%] h-[6px] rounded-full border border-white/80 pointer-events-none"
                          style={{ animation: 'ripple-pop 0.35s ease-out infinite' }}
                        />
                      )}

                      {/* Subtle layer divider when adjacent colors differ */}
                      {!sameBelow && slotIdx > 0 && (
                        <div className="absolute bottom-0 inset-x-0 h-[1px] bg-black/20" />
                      )}

                      {/* Optional Colorblind Accessibility Symbol */}
                      {colorblindMode && (
                        <span
                          className="relative z-10 text-xs sm:text-sm font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] select-none"
                          aria-hidden="true"
                        >
                          {theme.symbol}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Left Glass Specular Highlight Streak */}
          <div className="pointer-events-none absolute top-2 bottom-4 left-[5px] w-[4px] rounded-full bg-gradient-to-b from-white/35 via-white/15 to-white/5" />
          {/* Right Subtle Rim Reflection */}
          <div className="pointer-events-none absolute top-3 bottom-5 right-[4px] w-[2px] rounded-full bg-white/15" />

          {/* Completed Crystal Sheen */}
          {solved && topColor && (
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                background: `radial-gradient(circle at 50% 30%, ${topColor.meniscus}, transparent 70%)`,
              }}
            />
          )}
        </div>
      </button>
    </div>
  );
};
