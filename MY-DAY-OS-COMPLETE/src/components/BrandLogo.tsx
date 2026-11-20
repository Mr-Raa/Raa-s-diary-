import React, { useId } from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  subtitle?: string;
  labelOverride?: string;
  animated?: boolean;
}

/**
 * Raa's Diary — Minimalist Modern Liquid Glass Emblem:
 * Clean, architectural 'R' monogram on deep obsidian squircle with
 * subtle specular glass rim, delicate ambient glow, and clarity spark.
 * Inspired by Apple, Linear & modern high-end minimalist design.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = false,
  subtitle,
  labelOverride,
  animated = false,
}) => {
  const uid = useId().replace(/:/g, '');
  const bgId = `raa-bg-${uid}`;
  const glowId = `raa-glow-${uid}`;
  const glyphId = `raa-glyph-${uid}`;
  const rimId = `raa-rim-${uid}`;
  const sparkId = `raa-spark-${uid}`;

  const dim =
    size === 'xl'
      ? 'w-16 h-16 rounded-[22%]'
      : size === 'lg'
        ? 'w-12 h-12 rounded-[22%]'
        : size === 'sm'
          ? 'w-8 h-8 rounded-[24%]'
          : 'w-9 h-9 rounded-[23%]';

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
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.22" />
              <stop offset="60%" stopColor="#6366f1" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0" />
            </radialGradient>

            {/* Clean Monogram Gradient (Pure White to Soft Azure) */}
            <linearGradient id={glyphId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#93c5fd" />
            </linearGradient>

            {/* Specular Edge Stroke */}
            <linearGradient id={rimId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
            </linearGradient>

            {/* Clarity Spark Accent */}
            <linearGradient id={sparkId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>

          {/* Background Squircle */}
          <rect width="64" height="64" rx="14" fill={`url(#${bgId})`} />
          <rect width="64" height="64" rx="14" fill={`url(#${glowId})`} />

          {/* Specular Rim */}
          <rect
            x="0.75"
            y="0.75"
            width="62.5"
            height="62.5"
            rx="13.5"
            fill="none"
            stroke={`url(#${rimId})`}
            strokeWidth="1.2"
          />

          {/* Modern Architectural Monogram R */}
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M21 17C19.34 17 18 18.34 18 20V44C18 45.66 19.34 47 21 47C22.66 47 24 45.66 24 44V35H31.06L39.04 45.63C39.93 46.82 41.33 47.5 42.82 47.5C44.98 47.5 46.45 45.2 45.46 43.28L38.99 30.69C42.09 29.14 44.25 25.95 44.25 22.25C44.25 17 40 17 34.5 17H21ZM24 23H33.5C37 23 38.25 24 38.25 26.25C38.25 28.5 37 29.5 33.5 29.5H24V23Z"
            fill={`url(#${glyphId})`}
          />

          {/* Clarity Spark Emblem (North Star) */}
          <path
            d="M47.5 14C47.8 15.9 48.4 16.4 50.2 16.7C48.4 17 47.8 17.6 47.5 19.5C47.2 17.6 46.6 17 44.8 16.7C46.6 16.4 47.2 15.9 47.5 14Z"
            fill={`url(#${sparkId})`}
          />
        </svg>
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
            {labelOverride || "Raa's Diary"}
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
