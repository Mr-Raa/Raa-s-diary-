import React, { useMemo } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Sparkles,
  Sun,
  Sunset,
  Zap,
} from 'lucide-react';
import type { BootstrapData } from '../api/client';
import { GlassModal } from './GlassModal';

interface SmartScheduleModalProps {
  open: boolean;
  onClose: () => void;
  data: BootstrapData;
  onOptimizeWithAi?: () => void;
}

export const SmartScheduleModal: React.FC<SmartScheduleModalProps> = ({
  open,
  onClose,
  data,
  onOptimizeWithAi,
}) => {
  const pendingTasks = useMemo(
    () => data.tasks.filter((t) => t.dueDate === data.today && t.status !== 'Completed'),
    [data.tasks, data.today]
  );

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title="Smart Schedule Optimizer"
      subtitle="AI-detected circadian focus windows & optimal task slotting"
    >
      <div className="space-y-4">
        {/* Recommended Windows */}
        <div className="space-y-2.5">
          <div className="text-xs font-semibold text-[var(--text-secondary)]">
            Optimal Focus Windows Today
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
            <Sun className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">Morning Deep Work Window</span>
                <span className="text-[11px] font-mono-num text-amber-300/80">08:30 AM – 11:30 AM</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                Highest cognitive bandwidth. Ideal for hard study, programming, and priority tasks.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-start gap-3">
            <Zap className="w-5 h-5 text-[var(--accent)] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--accent)]">Afternoon Momentum Window</span>
                <span className="text-[11px] font-mono-num text-[var(--accent)]/80">03:30 PM – 05:30 PM</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                Secondary focus peak. Best for administrative duties, review sessions, and subtasks.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-3">
            <Sunset className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300">Evening Review &amp; Wind Down</span>
                <span className="text-[11px] font-mono-num text-indigo-300/80">08:00 PM – 09:30 PM</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                Reflection, journal entry, habit check-in, and preparing tomorrow's agenda.
              </p>
            </div>
          </div>
        </div>

        {/* Pending tasks count */}
        <div className="p-3 rounded-xl bg-white/[0.04] border border-[var(--glass-border-subtle)] flex items-center justify-between text-xs">
          <span className="text-[var(--text-secondary)]">Tasks awaiting schedule:</span>
          <span className="font-mono-num font-bold text-[var(--text-primary)]">
            {pendingTasks.length} pending
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          {onOptimizeWithAi && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOptimizeWithAi();
              }}
              className="glass-button-primary flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Slot with AURAA AI</span>
            </button>
          )}
          <button type="button" onClick={onClose} className="glass-button px-4 py-2.5 text-xs">
            Close
          </button>
        </div>
      </div>
    </GlassModal>
  );
};
