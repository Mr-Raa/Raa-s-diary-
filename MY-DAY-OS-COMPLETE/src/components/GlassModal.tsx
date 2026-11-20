import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { IOS_SPRING_MODAL, IOS_TAP_SCALE } from '../utils/motionPresets';

interface GlassModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidth?: string;
  children: React.ReactNode;
}

export const GlassModal: React.FC<GlassModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  maxWidth = 'max-w-xl',
  children,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[10050] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/55 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="glass-modal-title"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={IOS_SPRING_MODAL}
        className={`glass-modal w-full ${maxWidth} max-h-[90dvh] flex flex-col overflow-hidden p-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6 text-[var(--text-primary)] rounded-t-[28px] sm:rounded-[26px]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-10 h-1 rounded-full bg-slate-400/35 mx-auto mb-2.5 sm:hidden shrink-0"
          aria-hidden="true"
        />
        <div className="shrink-0 flex items-start justify-between gap-4 pb-3 sm:pb-4 border-b border-[var(--glass-border-subtle)]">
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, ...IOS_SPRING_MODAL }}
          >
            <h2 id="glass-modal-title" className="text-base sm:text-lg font-semibold tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] mt-0.5">{subtitle}</p>
            )}
          </motion.div>
          <motion.button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            whileTap={IOS_TAP_SCALE}
            whileHover={{ scale: 1.05 }}
            className="glass-button p-2 min-w-[40px] min-h-[40px] flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>
        <div className="pt-3 sm:pt-4 overflow-y-auto no-scrollbar min-h-0">{children}</div>
      </motion.div>
    </motion.div>,
    document.body
  );
};
