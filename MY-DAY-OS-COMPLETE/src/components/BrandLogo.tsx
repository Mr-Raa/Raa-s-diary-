import React, { useId } from 'react';
import { MyDayMark } from './brand/MyDayMark';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  subtitle?: string;
  labelOverride?: string;
  animated?: boolean;
}

/**
 * MY DAY OS — Official Dawn Orbit Liquid Glass Emblem:
 * An open circular orbit, rising sun cyan accent (#69D4FF), and daily horizon line
 * on a deep obsidian squircle with specular rim.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = false,
  subtitle,
  labelOverride,
  animated = false,
}) => {
  const uid = useId().replace(/:/g, '');
  const bgId = `myday-bg-${uid}`;
  const glowId = `myday-glow-${uid}`;
  const rimId = `myday-rim-${uid}`;

  const dim =
    size === 'xl'
      ? 'w-16 h-16 rounded-[24%]'
      : size === 'lg'
        ? 'w-12 h-12 rounded-[24%]'
        : size === 'sm'
          ? 'w-8 h-8 rounded-[24%]'
          : 'w-9 h-9 rounded-[24%]';

  const markSize =
    size === 'xl'
      ? 46
      : size === 'lg'
        ? 34
        : size === 'sm'
          ? 22
          : 26;

  return (
    <div className="flex items-center gap-2.5 min-w-0 shrink-0">
      <div
        className={`${dim} relative shrink-0 overflow-hidden shadow-[0_4px_16px_rgba(2,6,23,0.5),0_1px_3px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.25)] border border-white/10 ${
          animated ? 'transition-transform duration-300 hover:scale-105' : ''
        }`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 64 64" className="w-full h-full block">
          <defs>
            {/* Deep Obsidian Gradient */}
            <linearGradient id={bgId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#090d16" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Subtle Liquid Glass Ambient Radial Glow */}
            <radialGradient id={glowId} cx="45%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
              <stop offset="60%" stopColor="#6366f1" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0" />
            </radialGradient>

            {/* Specular Edge Stroke */}
            <linearGradient id={rimId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.06" />
            </linearGradient>
          </defs>

          {/* Background Squircle */}
          <rect width="64" height="64" rx="15" fill={`url(#${bgId})`} />
          <rect width="64" height="64" rx="15" fill={`url(#${glowId})`} />

          {/* Specular Rim */}
          <rect
            x="0.75"
            y="0.75"
            width="62.5"
            height="62.5"
            rx="14.5"
            fill="none"
            stroke={`url(#${rimId})`}
            strokeWidth="1.2"
          />
        </svg>

        {/* Center Dawn Orbit Vector Mark */}
        <div className="absolute inset-0 flex items-center justify-center text-white pointer-events-none">
          <MyDayMark size={markSize} />
        </div>
      </div>

      {showText && (
        <div className="min-w-0">
          <div
            className={`font-display font-bold tracking-tight whitespace-nowrap truncate leading-tight ${
              size === 'xl'
                ? 'text-xl'
                : size === 'lg'
                  ? 'text-lg'
                  : size === 'sm'
                    ? 'text-[15px]'
                    : 'text-[15.5px]'
            }`}
          >
            {labelOverride || 'MY DAY OS'}
          </div>
          {subtitle && (
            <div className="text-[11px] text-[var(--text-muted)] whitespace-nowrap truncate">
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
