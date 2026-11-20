import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export interface GlassSelectOption {
  value: string;
  label: string;
}

interface GlassSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: GlassSelectOption[];
  id?: string;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  menuClassName?: string;
  disabled?: boolean;
}

export const GlassSelect: React.FC<GlassSelectProps> = ({
  value,
  onChange,
  options,
  id,
  ariaLabel,
  placeholder = 'Select...',
  className = '',
  menuClassName = '',
  disabled = false,
}) => {
  const autoId = useId();
  const buttonId = id || `glass-select-${autoId}`;
  const listboxId = `${buttonId}-listbox`;

  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
    openUp: boolean;
  }>({ top: 0, left: 0, width: 180, maxHeight: 260, openUp: false });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === String(value)),
    [options, value]
  );

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const menuWidth = Math.min(Math.max(rect.width, 168), vw - 24);
    const spaceBelow = vh - rect.bottom - 14;
    const spaceAbove = rect.top - 14;
    const desiredHeight = Math.min(272, options.length * 40 + 16);
    const openUp = spaceBelow < Math.min(desiredHeight, 175) && spaceAbove > spaceBelow;
    const maxHeight = Math.max(130, Math.min(272, openUp ? spaceAbove : spaceBelow));

    let left = rect.left;
    if (left + menuWidth > vw - 12) {
      left = Math.max(12, vw - 12 - menuWidth);
    }
    if (left < 12) left = 12;

    setCoords({
      top: openUp ? rect.top - 6 : rect.bottom + 6,
      left,
      width: menuWidth,
      maxHeight,
      openUp,
    });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();

    const handleOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleScrollOrResize = () => updatePosition();

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside, { passive: true });
    window.addEventListener('keydown', handleKey);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [open, options.length]);

  const menuPortal =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            role="listbox"
            aria-labelledby={buttonId}
            style={{
              position: 'fixed',
              top: coords.openUp ? undefined : coords.top,
              bottom: coords.openUp ? window.innerHeight - coords.top : undefined,
              left: coords.left,
              width: coords.width,
              maxHeight: coords.maxHeight,
            }}
            className={`glass-select-menu z-[10010] overflow-y-auto no-scrollbar p-1.5 ios-sheet-up ${menuClassName}`}
          >
            {options.map((opt) => {
              const isSelected = opt.value === String(value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs sm:text-[13px] transition-colors ${
                    isSelected
                      ? 'bg-[rgba(var(--accent-rgb),0.20)] text-[var(--text-primary)] font-semibold'
                      : 'text-[var(--text-secondary)] hover:bg-white/[0.08] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />}
                </button>
              );
            })}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        id={buttonId}
        type="button"
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        onClick={() => {
          if (!disabled) setOpen((v) => !v);
        }}
        className={`glass-input inline-flex items-center justify-between gap-2 text-left cursor-pointer disabled:opacity-50 ${className}`}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0 transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {menuPortal}
    </>
  );
};
