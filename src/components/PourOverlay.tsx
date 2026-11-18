import React from 'react';
import { LIQUID_COLORS } from '../game/colors';
import { PourAnimationState } from '../game/types';

interface PourOverlayProps {
  pourAnim: PourAnimationState | null;
  containerRect: DOMRect | null;
}

export const PourOverlay: React.FC<PourOverlayProps> = ({ pourAnim, containerRect }) => {
  if (!pourAnim || !containerRect) return null;

  const theme = LIQUID_COLORS[pourAnim.color];

  // Convert viewport coordinates to container-relative coordinates
  const sx =
    pourAnim.fromRect.x -
    containerRect.left +
    (pourAnim.direction === 'right' ? pourAnim.fromRect.width * 0.84 : pourAnim.fromRect.width * 0.16);
  const sy = pourAnim.fromRect.y - containerRect.top + 8;

  const tx = pourAnim.toRect.x - containerRect.left + pourAnim.toRect.width * 0.5;
  const ty = pourAnim.toRect.y - containerRect.top + pourAnim.toRect.height * 0.48;

  // Control point for natural gravity arc
  const cx = (sx + tx) * 0.5;
  const cy = Math.min(sy, ty) - 24;

  const pathData = `M ${sx} ${sy} Q ${cx} ${cy}, ${tx} ${ty}`;

  return (
    <svg
      className="pointer-events-none absolute inset-0 w-full h-full z-30 overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <filter id="pour-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer translucent liquid glow */}
      <path
        d={pathData}
        fill="none"
        stroke={theme.top}
        strokeWidth={11}
        strokeLinecap="round"
        opacity={0.35}
        filter="url(#pour-glow)"
      />

      {/* Core liquid stream */}
      <path
        d={pathData}
        fill="none"
        stroke={theme.mid}
        strokeWidth={6}
        strokeLinecap="round"
      />

      {/* Highlight shimmer dash flowing along stream */}
      <path
        d={pathData}
        fill="none"
        stroke={theme.meniscus}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray="10 14"
        className="animate-stream-flow"
      />

      {/* Impact splash ring inside destination bottle */}
      <circle
        cx={tx}
        cy={ty}
        r={7}
        fill={theme.meniscus}
        opacity={0.7}
      />
    </svg>
  );
};
