import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Bell, Check, Info } from 'lucide-react';

/**
 * Generates an optical bevel displacement map (Red = dX, Green = dY)
 * for rounded-rectangle glass refraction via SVG <feDisplacementMap>.
 */
function buildBevelDisplacementMapUrl(
  width: number,
  height: number,
  radius: number,
  bevelDepth: number
): string {
  if (typeof document === 'undefined') return '';
  const w = Math.max(40, Math.round(width));
  const h = Math.max(40, Math.round(height));
  const r = Math.min(radius, Math.min(w, h) / 2);
  const bevel = Math.max(4, Math.min(bevelDepth, Math.min(w, h) / 2));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const img = ctx.createImageData(w, h);
  const data = img.data;
  const hw = w / 2;
  const hh = h / 2;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - hw;
      const py = y + 0.5 - hh;

      const qx = Math.abs(px) - (hw - r);
      const qy = Math.abs(py) - (hh - r);
      const outX = Math.max(qx, 0);
      const outY = Math.max(qy, 0);
      const sd = Math.hypot(outX, outY) + Math.min(Math.max(qx, qy), 0) - r;

      let nx = 0;
      let ny = 0;

      if (sd <= 0 && sd > -bevel) {
        // Distance inward from edge: 0 at rim, bevel at inner plateau
        const dIn = -sd;
        // Curved meniscus normal profile
        const t = 1 - dIn / bevel;
        const mag = Math.sin(t * (Math.PI / 2)) * t;

        if (outX > 0 || outY > 0) {
          const len = Math.hypot(outX, outY) || 1;
          nx = ((px >= 0 ? 1 : -1) * outX) / len;
          ny = ((py >= 0 ? 1 : -1) * outY) / len;
        } else if (qx > qy) {
          nx = px >= 0 ? 1 : -1;
        } else {
          ny = py >= 0 ? 1 : -1;
        }
        nx *= mag;
        ny *= mag;
      }

      const idx = (y * w + x) * 4;
      data[idx] = Math.round(128 + nx * 127);
      data[idx + 1] = Math.round(128 + ny * 127);
      data[idx + 2] = 128;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}

export interface LiquidGlassProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  radius?: number;
  scale?: number;
  aberration?: number;
  bevelDepth?: number;
  frost?: number;
  tint?: number;
}

/**
 * True optical Liquid Glass surface inspired by liquidglass.dev:
 * uses procedural bevel displacement + optional chromatic aberration + specular rim highlights.
 */
export const LiquidGlass: React.FC<LiquidGlassProps> = ({
  children,
  className = '',
  style,
  radius = 24,
  scale = 36,
  aberration = 10,
  bevelDepth = 28,
  frost = 0.4,
  tint = 0.1,
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const rawId = useId().replace(/:/g, '');
  const filterId = `lg-filter-${rawId}`;
  const [size, setSize] = useState({ w: 220, h: 140 });

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 16 && rect.height > 16) {
        setSize((prev) =>
          Math.abs(prev.w - rect.width) > 4 || Math.abs(prev.h - rect.height) > 4
            ? { w: Math.round(rect.width), h: Math.round(rect.height) }
            : prev
        );
      }
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isMobile =
    typeof window !== 'undefined' &&
    (window.innerWidth <= 768 || 'ontouchstart' in window);

  const mapUrl = useMemo(
    () => (isMobile ? '' : buildBevelDisplacementMapUrl(size.w, size.h, radius, bevelDepth)),
    [isMobile, size.w, size.h, radius, bevelDepth]
  );

  const blurPx = isMobile ? 8 : Math.max(0, Math.round(frost * 18));

  return (
    <div
      ref={hostRef}
      className={`lg-panel relative overflow-hidden isolate ${className}`}
      style={{
        borderRadius: `${radius}px`,
        backdropFilter: mapUrl
          ? `url(#${filterId}) blur(${blurPx}px) saturate(175%)`
          : `blur(${Math.max(10, blurPx)}px) saturate(175%)`,
        WebkitBackdropFilter: `blur(${Math.max(10, blurPx)}px) saturate(175%)`,
        backgroundColor: `rgba(255, 255, 255, ${tint})`,
        boxShadow:
          '0 14px 42px rgba(0, 0, 0, 0.24), inset 0 1.5px 0 rgba(255, 255, 255, 0.56), inset 0 -1px 0 rgba(255, 255, 255, 0.16)',
        border: '1px solid rgba(255, 255, 255, 0.34)',
        ...style,
      }}
    >
      {mapUrl && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute w-0 h-0 overflow-hidden"
        >
          <defs>
            <filter
              id={filterId}
              x="0%"
              y="0%"
              width="100%"
              height="100%"
              colorInterpolationFilters="sRGB"
            >
              <feImage
                href={mapUrl}
                x="0"
                y="0"
                width={size.w}
                height={size.h}
                result="dispMap"
                preserveAspectRatio="none"
              />
              {aberration > 0 ? (
                <>
                  <feDisplacementMap
                    in="SourceGraphic"
                    in2="dispMap"
                    scale={scale + aberration}
                    xChannelSelector="R"
                    yChannelSelector="G"
                    result="dispR"
                  />
                  <feColorMatrix
                    in="dispR"
                    type="matrix"
                    values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
                    result="redCh"
                  />
                  <feDisplacementMap
                    in="SourceGraphic"
                    in2="dispMap"
                    scale={scale}
                    xChannelSelector="R"
                    yChannelSelector="G"
                    result="dispG"
                  />
                  <feColorMatrix
                    in="dispG"
                    type="matrix"
                    values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
                    result="greenCh"
                  />
                  <feDisplacementMap
                    in="SourceGraphic"
                    in2="dispMap"
                    scale={Math.max(0, scale - aberration)}
                    xChannelSelector="R"
                    yChannelSelector="G"
                    result="dispB"
                  />
                  <feColorMatrix
                    in="dispB"
                    type="matrix"
                    values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
                    result="blueCh"
                  />
                  <feBlend in="redCh" in2="greenCh" mode="screen" result="rg" />
                  <feBlend in="rg" in2="blueCh" mode="screen" />
                </>
              ) : (
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="dispMap"
                  scale={scale}
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              )}
            </filter>
          </defs>
        </svg>
      )}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          background:
            'linear-gradient(145deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.04) 36%, transparent 65%, rgba(255,255,255,0.14) 100%)',
        }}
      />
      <div className="relative z-10 h-full w-full flex items-center justify-center">{children}</div>
    </div>
  );
};

export interface LiquidGlassSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  description?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

/**
 * liquidglass.dev-inspired refractive droplet toggle switch (`lg-switch`)
 * with optical specular lens thumb, spring stretch on press, and accessible semantics.
 */
export const LiquidGlassSwitch: React.FC<LiquidGlassSwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  ariaLabel,
  disabled = false,
}) => {
  const [pressed, setPressed] = useState(false);
  const reduceMotion = useReducedMotion();

  const toggle = () => {
    if (disabled) return;
    onChange(!checked);
  };

  return (
    <div className="flex items-center justify-between gap-3">
      {(label || description) && (
        <div className="min-w-0">
          {label && (
            <div className="text-sm font-medium text-[var(--text-primary)]">{label}</div>
          )}
          {description && (
            <div className="text-xs text-[var(--text-secondary)] mt-0.5">{description}</div>
          )}
        </div>
      )}

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || label || 'Toggle switch'}
        disabled={disabled}
        onClick={toggle}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        className={`lg-switch ${checked ? 'is-checked' : ''} ${pressed ? 'is-pressed' : ''} ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <span className="lg-switch-track" aria-hidden="true">
          <span className="lg-switch-caustic" />
        </span>
        <motion.span
          aria-hidden="true"
          className="lg-switch-thumb"
          animate={
            reduceMotion
              ? { x: checked ? 22 : 0 }
              : {
                  x: checked ? 22 : 0,
                  scaleX: pressed ? 1.22 : 1,
                  scaleY: pressed ? 1.06 : 1,
                }
          }
          transition={
            reduceMotion
              ? { duration: 0.05 }
              : { type: 'spring', stiffness: 520, damping: 32, mass: 0.7 }
          }
        >
          <span className="lg-switch-thumb-glint" />
        </motion.span>
      </button>
    </div>
  );
};

export interface LiquidGlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: 'neutral' | 'tinted' | 'light';
}

export const LiquidGlassButton: React.FC<LiquidGlassButtonProps> = ({
  tone = 'neutral',
  className = '',
  children,
  type = 'button',
  ...rest
}) => {
  const toneClass =
    tone === 'tinted'
      ? 'glass-button-primary'
      : tone === 'light'
        ? 'lg-button-light'
        : 'lg-button';

  return (
    <button
      type={type}
      className={`${toneClass} inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap shrink-0 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
};

export interface LiquidToastItem {
  id: string;
  message: string;
  icon?: 'check' | 'bell' | 'info';
}

export const LiquidGlassToastStack: React.FC<{ toasts: LiquidToastItem[] }> = ({
  toasts,
}) => {
  if (toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="lg-toast pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold shadow-2xl"
        >
          {t.icon === 'bell' ? (
            <Bell className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
          ) : t.icon === 'info' ? (
            <Info className="w-3.5 h-3.5 text-[var(--accent-cyan)] shrink-0" />
          ) : (
            <Check className="w-3.5 h-3.5 text-[var(--success)] shrink-0" />
          )}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
};
