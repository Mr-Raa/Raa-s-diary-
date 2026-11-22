import type { SVGProps } from 'react';

type MyDayMarkProps = SVGProps<SVGSVGElement> & {
  size?: number;
  title?: string;
  className?: string;
};

/**
 * Dawn Orbit — The Official MY DAY OS Vector Mark:
 * Combines an open daily orbit, a rising sun accent (#69D4FF),
 * and a grounded horizon line, symbolizing clarity and daily progress.
 */
export function MyDayMark({
  size = 44,
  title = 'MY DAY OS',
  className = '',
  ...props
}: MyDayMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      className={className}
      {...props}
    >
      <title>{title}</title>

      {/* Orbit Circle (Main Cycle) */}
      <path
        d="M89.8 21.8A49 49 0 1 0 112 64"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* Rising Sun (Fresh Start Cyan Accent) */}
      <path
        d="M46 74a18 18 0 0 1 36 0"
        stroke="#69D4FF"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* Horizon Baseline (Daily Grounding) */}
      <path
        d="M30 77h68"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default MyDayMark;
