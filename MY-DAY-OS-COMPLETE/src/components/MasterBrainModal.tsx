import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  ArrowRight,
  Brain,
  CheckCircle2,
  Droplets,
  FileText,
  Flame,
  Loader2,
  Sparkles,
  Target,
  Timer,
  Zap,
} from 'lucide-react';
import type { BootstrapData } from '../api/client';
import { api } from '../api/client';
import type { NavModule } from '../types';
import { GlassModal } from './GlassModal';
import {
  computeMasterBrainReport,
  type MasterBrainAction,
} from '../utils/masterBrainLogic';
import { IOS_SPRING_SMOOTH, IOS_SPRING_SNAPPY, IOS_TAP_SCALE } from '../utils/motionPresets';

interface MasterBrainModalProps {
  open: boolean;
  onClose: () => void;
  data: BootstrapData;
  onRefresh: () => Promise<void>;
  onNavigate: (m: NavModule) => void;
  onTriggerAiDailyPlanner: () => void;
}

export const MasterBrainModal: React.FC<MasterBrainModalProps> = ({
  open,
  onClose,
  data,
  onRefresh,
  onNavigate,
  onTriggerAiDailyPlanner,
}) => {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>('');

  const nowHHmm = new Intl.DateTimeFormat('en-GB', {
    timeZone: data.settings.timezone || 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());

  const report = computeMasterBrainReport({
    today: data.today,
    currentHHmm: nowHHmm,
    dayContext: data.dayContext,
    waterIntake: data.waterIntake,
    dailyFocusGoalMinutes: data.settings.dailyFocusGoalMinutes,
    goals: data.goals,
    alarms: data.alarms,
  });

  const handleRunAction = async (action: MasterBrainAction) => {
    setRunningId(action.id);
    setFeedback('');
    try {
      if (action.kind === 'log_water_250') {
        await api.post('/api/water', { date: data.today, amountMl: 250, note: 'Master Brain quick hydrate' });
        await onRefresh();
        setFeedback('+250 ml water logged! Hydration pillar updated.');
      } else if (action.kind === 'reschedule_overdue_today') {
        for (const task of data.dayContext.overdueTasks) {
          await api.put(`/api/tasks/${task.id}`, {
            ...task,
            dueDate: data.today,
          });
        }
        await onRefresh();
        setFeedback(`Moved ${data.dayContext.overdueTasks.length} overdue task(s) into today cleanly.`);
      } else if (action.kind === 'start_focus') {
        onClose();
        onNavigate('focus');
      } else if (action.kind === 'open_diary') {
        onClose();
        onNavigate('notes');
      } else if (action.kind === 'open_routine') {
        onClose();
        onNavigate('routine');
      } else if (action.kind === 'open_ai_planner') {
        onClose();
        onTriggerAiDailyPlanner();
      }
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Action could not complete.');
    } finally {
      setRunningId(null);
    }
  };

  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (report.readinessScore / 100) * circ;

  const pillarIcons: Record<string, React.ReactNode> = {
    execution: <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)]" />,
    hydration: <Droplets className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />,
    focus: <Timer className="w-3.5 h-3.5 text-[var(--accent)]" />,
    consistency: <Flame className="w-3.5 h-3.5 text-[var(--warning)]" />,
  };

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title="AURAA Master Brain"
      subtitle="Live 4-pillar OS intelligence & 1-click daily autopilot"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Readiness Hero Card */}
        <div className="glass-bento p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative w-24 h-24 shrink-0 mx-auto sm:mx-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96" aria-hidden="true">
              <circle
                cx="48"
                cy="48"
                r={radius}
                fill="none"
                stroke="rgba(148,163,184,0.18)"
                strokeWidth="7"
              />
              <motion.circle
                cx="48"
                cy="48"
                r={radius}
                fill="none"
                stroke="url(#mb-ring-grad)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circ}
                initial={{ strokeDashoffset: circ }}
                animate={{ strokeDashoffset: offset }}
                transition={IOS_SPRING_SMOOTH}
              />
              <defs>
                <linearGradient id="mb-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--accent)" />
                  <stop offset="100%" stopColor="var(--accent-secondary)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono-num text-xl font-bold leading-none">
                {report.readinessScore}%
              </span>
              <span className="text-[10px] text-[var(--text-muted)] mt-0.5">Readiness</span>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-1.5 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--accent)]/16 text-[var(--accent)] text-[11px] font-semibold">
              <Brain className="w-3.5 h-3.5" />
              <span>{report.statusLabel}</span>
            </div>
            <h3 className="text-sm sm:text-base font-bold tracking-tight">
              {report.topPriorityTitle}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {report.topPriorityDetail}
            </p>
            <p className="text-[11px] text-[var(--accent-cyan)] leading-snug">
              {report.gujaratiSummary}
            </p>
          </div>
        </div>

        {/* 4 Life Pillars */}
        <div className="grid grid-cols-2 gap-2.5">
          {report.pillars.map((pillar, idx) => (
            <motion.div
              key={pillar.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...IOS_SPRING_SMOOTH, delay: idx * 0.04 }}
              className="p-3 rounded-2xl bg-slate-900/[0.045] dark:bg-white/[0.04] border border-[var(--glass-border-subtle)] space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5 font-semibold">
                  {pillarIcons[pillar.key] || <Activity className="w-3.5 h-3.5" />}
                  <span>{pillar.label}</span>
                </span>
                <span className="font-mono-num font-bold text-[var(--accent)]">
                  {pillar.score}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-900/[0.08] dark:bg-white/[0.08] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pillar.score}%` }}
                  transition={IOS_SPRING_SMOOTH}
                  className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)]"
                />
              </div>
              <div className="text-[10.5px] text-[var(--text-muted)] truncate">{pillar.detail}</div>
            </motion.div>
          ))}
        </div>

        {feedback && (
          <div className="p-2.5 rounded-xl bg-[var(--success)]/14 border border-[var(--success)]/30 text-xs font-medium text-[var(--success)] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* 1-Click Master Autopilot Actions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[var(--warning)]" />
              <span>One-Click Master Autopilot</span>
            </span>
            <span className="text-[10.5px] text-[var(--text-muted)]">Instant OS execution</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {report.actions.map((act) => {
              const busy = runningId === act.id;
              return (
                <motion.button
                  key={act.id}
                  type="button"
                  whileTap={IOS_TAP_SCALE}
                  transition={IOS_SPRING_SNAPPY}
                  disabled={busy}
                  onClick={() => handleRunAction(act)}
                  className="glass-button p-3 text-left flex items-center justify-between gap-2.5 min-h-[54px] disabled:opacity-60"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{act.title}</div>
                    <div className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                      {act.subtitle}
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-[var(--accent)]/16 text-[var(--accent)] text-[10px] font-semibold shrink-0 flex items-center gap-1">
                    {busy ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <span>{act.impactLabel}</span>
                        <ArrowRight className="w-3 h-3" />
                      </>
                    )}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Footer Links: AURAA AI Chat + Gujarati Notepad Guide */}
        <div className="pt-2 border-t border-[var(--glass-border-subtle)] flex flex-wrap items-center justify-between gap-2">
          <a
            href="/RAA_DIARY_USE_KARVANI_RIT_GUJARATI.txt"
            download="RAA_DIARY_USE_KARVANI_RIT_GUJARATI.txt"
            className="glass-button px-3 py-2 text-xs font-medium inline-flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
            <span>ગુજરાતી ગાઇડ (.txt)</span>
          </a>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigate('goals');
              }}
              className="glass-button px-3 py-2 text-xs font-medium inline-flex items-center gap-1.5"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Goals</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigate('ai');
              }}
              className="glass-button-primary px-3.5 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Open AURAA AI</span>
            </button>
          </div>
        </div>
      </div>
    </GlassModal>
  );
};
