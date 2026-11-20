import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlarmClock,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookHeart,
  Brain,
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Clock,
  Droplets,
  Edit3,
  Flame,
  NotebookPen,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Target,
  Timer,
  Zap,
} from 'lucide-react';
import type { BootstrapData } from '../api/client';
import { api } from '../api/client';
import type { AiDailyPlan, AiScheduleBlock, NavModule, Task } from '../types';
import {
  buildTimelineForDay,
  detectScheduleConflicts,
  formatDateReadable,
  formatTimeDisplay,
} from '../utils/dateLogic';
import { formatMinutesCountdown, getNextUpcomingAlarm } from '../utils/alarmLogic';
import { computeWaterMetrics, formatWaterAmount } from '../utils/waterLogic';
import { computeMasterBrainReport } from '../utils/masterBrainLogic';
import { IOS_SPRING_SNAPPY, IOS_TAP_SCALE } from '../utils/motionPresets';
import { GlassModal } from './GlassModal';
import { LiquidGlassSwitch } from './LiquidGlass';
import { DailyAffirmationCard } from './DailyAffirmationCard';
import { MasterBrainModal } from './MasterBrainModal';
import { DailyReportModal } from './DailyReportModal';
import { WeeklyReviewModal } from './WeeklyReviewModal';
import { SmartScheduleModal } from './SmartScheduleModal';

interface DashboardViewProps {
  data: BootstrapData;
  onRefresh: () => Promise<void>;
  onNavigate: (m: NavModule) => void;
  onOpenWaterSheet: () => void;
  onOpenWaterTracker: () => void;
  onOpenModulesMenu?: () => void;
  onQuickAddTask: () => void;
  onQuickAddRoutine: () => void;
  onQuickAddGoal: () => void;
  onEditTask: (t: Task) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  onRefresh,
  onNavigate,
  onOpenWaterSheet,
  onOpenWaterTracker,
  onQuickAddTask,
  onQuickAddRoutine,
  onQuickAddGoal,
  onEditTask,
}) => {
  const { dayContext, settings, user, goals, studySessions, workSessions, today } = data;
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [masterBrainOpen, setMasterBrainOpen] = useState(false);
  const [affirmationModalOpen, setAffirmationModalOpen] = useState(false);
  const [dailyReportOpen, setDailyReportOpen] = useState(false);
  const [weeklyReviewOpen, setWeeklyReviewOpen] = useState(false);
  const [smartScheduleOpen, setSmartScheduleOpen] = useState(false);
  const [quickHydrating, setQuickHydrating] = useState(false);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // AI Daily Planner Modal state
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerError, setPlannerError] = useState('');
  const [dailyPlan, setDailyPlan] = useState<AiDailyPlan | null>(null);
  const [savedBlocks, setSavedBlocks] = useState<Record<number, boolean>>({});
  const [savingBlockIdx, setSavingBlockIdx] = useState<number | null>(null);

  const completedTasks = dayContext.tasks.filter((t) => t.status === 'Completed').length;
  const pendingTasks = dayContext.tasks.filter(
    (t) => t.status !== 'Completed' && t.status !== 'Cancelled' && t.status !== 'Skipped'
  ).length;
  const completedRoutines = dayContext.routines.filter(
    (r) => r.occurrenceStatus === 'completed'
  ).length;
  const habitsDone = dayContext.habits.filter((h) =>
    h.entries?.some((e) => e.date === today && e.completed)
  ).length;
  const focusMinutesToday = dayContext.focusSessions.reduce((s, f) => s + f.actualMinutes, 0);
  const studyMinutesToday = studySessions
    .filter((s) => s.date === today)
    .reduce((s, x) => s + x.durationMinutes, 0);
  const workMinutesToday = workSessions
    .filter((w) => w.date === today)
    .reduce((s, x) => s + x.durationMinutes, 0);

  const waterMetrics = useMemo(
    () =>
      computeWaterMetrics(
        data.waterIntake.totalMl ?? data.waterIntake.glasses * 250,
        data.waterIntake.goalMl ?? data.waterIntake.targetGlasses * 250
      ),
    [data.waterIntake]
  );

  const timeline = useMemo(
    () => buildTimelineForDay(dayContext.routines, dayContext.tasks, dayContext.events),
    [dayContext.routines, dayContext.tasks, dayContext.events]
  );

  const mobileSchedulePreview = useMemo(() => {
    const upcoming = timeline.filter(
      (item) => item.status !== 'completed' && item.status !== 'Completed'
    );
    return (upcoming.length > 0 ? upcoming : timeline).slice(0, 3);
  }, [timeline]);

  const conflicts = useMemo(
    () =>
      detectScheduleConflicts([
        ...dayContext.routines.map((r) => ({
          title: r.title,
          startTime: r.startTime,
          endTime: r.endTime,
        })),
        ...dayContext.events.map((e) => ({
          title: e.title,
          startTime: e.startTime,
          endTime: e.endTime,
        })),
      ]),
    [dayContext.routines, dayContext.events]
  );

  const activeGoals = useMemo(() => goals.filter((g) => g.status === 'Active').slice(0, 3), [goals]);
  const upcomingEvents = useMemo(
    () => data.events.filter((e) => e.date >= today).slice(0, 4),
    [data.events, today]
  );

  const nowHHmm = useMemo(
    () =>
      new Intl.DateTimeFormat('en-GB', {
        timeZone: settings.timezone || 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date()),
    [settings.timezone]
  );

  const nextAlarm = useMemo(() => {
    return getNextUpcomingAlarm(data.alarms, nowHHmm, new Date().getDay());
  }, [data.alarms, nowHHmm]);

  const masterBrainReport = useMemo(
    () =>
      computeMasterBrainReport({
        today,
        currentHHmm: nowHHmm,
        dayContext,
        waterIntake: data.waterIntake,
        dailyFocusGoalMinutes: settings.dailyFocusGoalMinutes,
        goals,
        alarms: data.alarms,
      }),
    [today, nowHHmm, dayContext, data.waterIntake, settings.dailyFocusGoalMinutes, goals, data.alarms]
  );

  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: settings.timezone || 'Asia/Kolkata',
      hour: '2-digit',
      hour12: false,
    }).format(new Date())
  );
  const greeting =
    hour < 12
      ? settings.language === 'gu'
        ? `સુપ્રભાત, ${user.name}`
        : `Good Morning, ${user.name}`
      : hour < 17
        ? settings.language === 'gu'
          ? `શુભ બપોર, ${user.name}`
          : `Good Afternoon, ${user.name}`
        : settings.language === 'gu'
          ? `શુભ સાંજ, ${user.name}`
          : `Good Evening, ${user.name}`;

  const handleToggleTimelineItem = async (item: ReturnType<typeof buildTimelineForDay>[number]) => {
    if (item.kind === 'routine') {
      const next = item.status === 'completed' ? 'pending' : 'completed';
      await api.post(`/api/routines/${item.id}/occurrence`, { date: today, status: next });
      await onRefresh();
    } else if (item.kind === 'task') {
      const task = dayContext.tasks.find((t) => t.id === item.id);
      if (!task) return;
      const nextStatus = task.status === 'Completed' ? 'Not Started' : 'Completed';
      await api.put(`/api/tasks/${task.id}`, { ...task, status: nextStatus });
      await onRefresh();
    }
  };

  const handleOpenAiDailyPlanner = async () => {
    setPlannerOpen(true);
    setPlannerLoading(true);
    setPlannerError('');
    setSavedBlocks({});
    try {
      const res = await api.post<AiDailyPlan>('/api/ai/daily-planner');
      setDailyPlan(res);
    } catch (err) {
      setPlannerError(err instanceof Error ? err.message : 'Unable to generate AI daily plan.');
    } finally {
      setPlannerLoading(false);
    }
  };

  const handleSavePlannerBlock = async (block: AiScheduleBlock, idx: number) => {
    setSavingBlockIdx(idx);
    try {
      const action =
        block.actionType === 'create_routine'
          ? {
              type: 'create_routine',
              payload: {
                title: block.title,
                startTime: block.time,
                endTime: block.endTime,
                date: today,
                category: block.category,
                priority: block.priority,
                recurrence: 'none',
                description: block.reason,
              },
            }
          : {
              type: 'create_task',
              payload: {
                title: block.title,
                dueDate: today,
                dueTime: block.time,
                category: block.category,
                priority: block.priority,
                description: block.reason,
              },
            };
      await api.post('/api/ai/apply-action', { action });
      setSavedBlocks((prev) => ({ ...prev, [idx]: true }));
      await onRefresh();
    } catch (err) {
      setPlannerError(err instanceof Error ? err.message : 'Could not save scheduled block.');
    } finally {
      setSavingBlockIdx(null);
    }
  };

  const handleFetchAiInsight = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const res = await api.get<{ insight: string }>('/api/ai/quick-insight');
      setAiInsight(res.insight);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unable to generate insight');
    } finally {
      setAiLoading(false);
    }
  };

  const toggleWidget = async (key: keyof typeof settings.dashboardWidgets) => {
    await api.put('/api/settings', {
      dashboardWidgets: {
        ...settings.dashboardWidgets,
        [key]: !settings.dashboardWidgets[key],
      },
    });
    await onRefresh();
  };

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (Math.min(100, dayContext.productivityScore) / 100) * circumference;

  const mobileRingR = 23;
  const mobileRingCirc = 2 * Math.PI * mobileRingR;
  const mobileRingOffset =
    mobileRingCirc - (Math.min(100, dayContext.productivityScore) / 100) * mobileRingCirc;

  const handleQuickHydrate250 = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (quickHydrating) return;
    setQuickHydrating(true);
    try {
      await api.post('/api/water', { date: today, amountMl: 250 });
      await onRefresh();
    } finally {
      setQuickHydrating(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* ================================================================
          MOBILE SINGLE-SCREEN DASHBOARD (< 768px) — Seamless Borderless OS Canvas
         ================================================================ */}
      <div className="md:hidden flex flex-col gap-2.5 pb-2">
        {/* 1. Open Borderless Hero Greeting + Interactive Momentum Ring */}
        <section className="px-1 pt-0.5 pb-1 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
              <span className="truncate">{formatDateReadable(today, settings.dateFormat)}</span>
              {dayContext.overdueTasks.length > 0 && (
                <button
                  type="button"
                  onClick={() => onNavigate('goals')}
                  className="text-[10.5px] font-semibold text-[var(--warning)] inline-flex items-center gap-1 shrink-0"
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>{dayContext.overdueTasks.length} overdue</span>
                </button>
              )}
            </div>
            <h1 className="text-[18px] min-[360px]:text-[20px] font-bold tracking-tight truncate mt-0.5">
              {greeting}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-[var(--text-secondary)] font-mono-num truncate">
                {completedTasks}/{dayContext.tasks.length} tasks · {completedRoutines}/{dayContext.routines.length} blocks
              </span>
              <motion.button
                type="button"
                whileTap={IOS_TAP_SCALE}
                transition={IOS_SPRING_SNAPPY}
                onClick={() => setMasterBrainOpen(true)}
                aria-label={`Open Master Brain (${masterBrainReport.readinessScore}% readiness)`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[10.5px] font-semibold text-[var(--accent)] shrink-0"
              >
                <Brain className="w-3 h-3" />
                <span className="font-mono-num">Brain {masterBrainReport.readinessScore}%</span>
              </motion.button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setBreakdownOpen(true)}
            aria-label="Open Daily Momentum Breakdown"
            className="relative w-12 h-12 min-[360px]:w-14 min-[360px]:h-14 shrink-0 flex items-center justify-center rounded-full active:scale-95 transition-transform"
          >
            <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56" aria-hidden="true">
              <circle
                cx="28"
                cy="28"
                r={mobileRingR}
                fill="none"
                stroke="rgba(148,163,184,0.16)"
                strokeWidth="4.5"
              />
              <circle
                cx="28"
                cy="28"
                r={mobileRingR}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeDasharray={mobileRingCirc}
                strokeDashoffset={mobileRingOffset}
                style={{ transition: 'stroke-dashoffset 500ms ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono-num text-[11px] min-[360px]:text-xs font-bold leading-none">
                {dayContext.productivityScore}%
              </span>
            </div>
          </button>
        </section>

        {/* 2. Unified Seamless 2x2 Bento Metric Canvas (No separate boxed borders) */}
        <section
          className="glass-bento grid grid-cols-2 shrink-0"
          aria-label="Quick statistics"
        >
          <button
            type="button"
            onClick={() => onNavigate('tasks')}
            className="p-2.5 min-[360px]:p-3 text-left flex items-center justify-between gap-2 min-h-[54px] min-[360px]:min-h-[60px] border-r border-b border-[var(--glass-border-subtle)] hover:bg-slate-900/[0.03] dark:hover:bg-white/[0.03] active:bg-slate-900/[0.05] dark:active:bg-white/[0.06] transition-colors"
          >
            <div className="min-w-0">
              <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)] shrink-0" />
                <span>Tasks</span>
              </div>
              <div className="font-mono-num text-[16px] min-[360px]:text-[17px] font-bold leading-tight mt-0.5">
                {completedTasks}
                <span className="text-xs font-normal text-[var(--text-muted)]">
                  /{dayContext.tasks.length}
                </span>
              </div>
              <div className="text-[10.5px] text-[var(--text-muted)] truncate">
                {pendingTasks} pending
              </div>
            </div>
          </button>

          <div
            onClick={onOpenWaterTracker}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenWaterTracker();
              }
            }}
            aria-label={`Water ${waterMetrics.percent}% ${formatWaterAmount(waterMetrics.totalMl)}`}
            className="p-2.5 min-[360px]:p-3 text-left flex flex-col justify-between min-h-[54px] min-[360px]:min-h-[60px] border-b border-[var(--glass-border-subtle)] hover:bg-slate-900/[0.03] dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-[var(--accent-cyan)] shrink-0" />
                <span>Water</span>
              </span>
              <button
                type="button"
                onClick={handleQuickHydrate250}
                aria-label="Quick add 250 ml water"
                className="font-mono-num text-[10px] font-semibold text-[var(--accent-cyan)] px-1.5 py-0.5 rounded-md bg-[var(--accent-cyan)]/14 hover:bg-[var(--accent-cyan)]/24 shrink-0"
              >
                +250
              </button>
            </div>
            <div className="flex items-baseline justify-between gap-1 mt-0.5">
              <span className="font-mono-num text-[15px] min-[360px]:text-[16px] font-bold leading-tight truncate">
                {formatWaterAmount(waterMetrics.totalMl)}
              </span>
              <span className="font-mono-num text-[10px] text-[var(--accent-cyan)] shrink-0">
                {waterMetrics.percent}%
              </span>
            </div>
            <div className="h-1 rounded-full bg-slate-900/[0.08] dark:bg-white/[0.08] overflow-hidden mt-1">
              <div
                className="h-full rounded-full bg-[var(--accent-cyan)] transition-all duration-300"
                style={{ width: `${waterMetrics.percent}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('focus')}
            className="p-2.5 min-[360px]:p-3 text-left flex items-center justify-between gap-2 min-h-[54px] min-[360px]:min-h-[60px] border-r border-[var(--glass-border-subtle)] hover:bg-slate-900/[0.03] dark:hover:bg-white/[0.03] active:bg-slate-900/[0.05] dark:active:bg-white/[0.06] transition-colors"
          >
            <div className="min-w-0">
              <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                <span>Focus</span>
              </div>
              <div className="font-mono-num text-[16px] min-[360px]:text-[17px] font-bold leading-tight mt-0.5">
                {focusMinutesToday}m
              </div>
              <div className="text-[10.5px] text-[var(--text-muted)] truncate">
                Goal {settings.dailyFocusGoalMinutes}m
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('goals')}
            className="p-2.5 min-[360px]:p-3 text-left flex items-center justify-between gap-2 min-h-[54px] min-[360px]:min-h-[60px] hover:bg-slate-900/[0.03] dark:hover:bg-white/[0.03] active:bg-slate-900/[0.05] dark:active:bg-white/[0.06] transition-colors"
          >
            <div className="min-w-0">
              <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[var(--warning)] shrink-0" />
                <span>Habits</span>
              </div>
              <div className="font-mono-num text-[16px] min-[360px]:text-[17px] font-bold leading-tight mt-0.5">
                {habitsDone}
                <span className="text-xs font-normal text-[var(--text-muted)]">
                  /{dayContext.habits.length}
                </span>
              </div>
              <div className="text-[10.5px] text-[var(--text-muted)] truncate">
                {dayContext.habits.length - habitsDone} left today
              </div>
            </div>
          </button>
        </section>

        {/* 3. Seamless Today's Schedule + Next Alarm */}
        <section className="glass-bento p-3 flex-1 min-h-[78px] flex flex-col gap-1 overflow-hidden">
          <div className="flex items-center justify-between gap-2 shrink-0">
            <h2 className="text-xs font-semibold tracking-tight flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Today&apos;s Schedule</span>
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('routine')}
              className="text-[11px] font-medium text-[var(--accent)] inline-flex items-center gap-0.5"
            >
              <span>Routine</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {mobileSchedulePreview.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-2">
              <p className="text-xs text-[var(--text-muted)]">No activities scheduled today.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--glass-border-subtle)] flex-1 min-h-0 overflow-y-auto no-scrollbar">
              {mobileSchedulePreview.map((item) => {
                const isDone = item.status === 'completed' || item.status === 'Completed';
                return (
                  <div
                    key={`mob-${item.kind}-${item.id}`}
                    className="py-1.5 flex items-center justify-between gap-2 min-h-[36px] shrink-0"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggleTimelineItem(item)}
                        disabled={item.kind === 'event'}
                        aria-label={`Toggle ${item.title}`}
                        className="w-7 h-7 flex items-center justify-center shrink-0 text-[var(--text-secondary)] disabled:opacity-40"
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>
                      <span
                        className={`text-xs font-medium truncate ${
                          isDone ? 'line-through text-[var(--text-muted)]' : ''
                        }`}
                      >
                        {item.title}
                      </span>
                    </div>
                    <span className="font-mono-num text-[11px] text-[var(--text-secondary)] shrink-0">
                      {formatTimeDisplay(item.time, settings.timeFormat)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {nextAlarm && (
            <button
              type="button"
              onClick={() => onNavigate('alarms')}
              className="pt-1.5 border-t border-[var(--glass-border-subtle)] flex items-center justify-between gap-2 text-[11px] text-[var(--text-secondary)] shrink-0"
            >
              <span className="flex items-center gap-1.5 min-w-0 truncate">
                <AlarmClock className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                <span className="truncate">Next: {nextAlarm.alarm.title}</span>
              </span>
              <span className="font-mono-num font-semibold text-[var(--accent)] shrink-0">
                {formatTimeDisplay(nextAlarm.time, settings.timeFormat)}
              </span>
            </button>
          )}
        </section>

        {/* 4. Liquid Glass Quick Actions Row */}
        <section className="grid grid-cols-4 gap-1.5 shrink-0" aria-label="Quick actions">
          <motion.button
            type="button"
            whileTap={{ scale: 0.93 }}
            onClick={onQuickAddTask}
            className="glass rounded-2xl py-1.5 px-1 flex flex-col items-center justify-center gap-1 min-h-[50px]"
          >
            <div className="w-7 h-7 rounded-xl glass-icon-capsule bg-[var(--accent)]/20 flex items-center justify-center">
              <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
            </div>
            <span className="text-[10px] font-medium whitespace-nowrap">Add Task</span>
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.93 }}
            onClick={onOpenWaterSheet}
            className="glass rounded-2xl py-1.5 px-1 flex flex-col items-center justify-center gap-1 min-h-[50px]"
          >
            <div className="w-7 h-7 rounded-xl glass-icon-capsule bg-[var(--accent-cyan)]/20 flex items-center justify-center">
              <Droplets className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
            </div>
            <span className="text-[10px] font-medium whitespace-nowrap">Add Water</span>
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.93 }}
            onClick={() => onNavigate('focus')}
            className="glass rounded-2xl py-1.5 px-1 flex flex-col items-center justify-center gap-1 min-h-[50px]"
          >
            <div className="w-7 h-7 rounded-xl glass-icon-capsule bg-[var(--success)]/20 flex items-center justify-center">
              <Timer className="w-3.5 h-3.5 text-[var(--success)]" />
            </div>
            <span className="text-[10px] font-medium whitespace-nowrap">Start Focus</span>
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.93 }}
            onClick={() => onNavigate('notes')}
            className="glass rounded-2xl py-1.5 px-1 flex flex-col items-center justify-center gap-1 min-h-[50px]"
          >
            <div className="w-7 h-7 rounded-xl glass-icon-capsule bg-[var(--accent-secondary)]/20 flex items-center justify-center">
              <NotebookPen className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
            </div>
            <span className="text-[10px] font-medium whitespace-nowrap">Add Note</span>
          </motion.button>
        </section>

        {/* Smart AI Tools & Insights Quick Ribbon (Mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => setDailyReportOpen(true)}
            className="glass px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-[var(--text-secondary)] hover:text-white flex items-center gap-1.5 shrink-0 active:scale-95 transition-transform"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Daily Report</span>
          </button>
          <button
            type="button"
            onClick={() => setSmartScheduleOpen(true)}
            className="glass px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-[var(--text-secondary)] hover:text-white flex items-center gap-1.5 shrink-0 active:scale-95 transition-transform"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Focus Optimizer</span>
          </button>
          <button
            type="button"
            onClick={() => setWeeklyReviewOpen(true)}
            className="glass px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-[var(--text-secondary)] hover:text-white flex items-center gap-1.5 shrink-0 active:scale-95 transition-transform"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
            <span>Weekly Review</span>
          </button>
        </div>

        {/* 5. Glass-Morphic Daily Affirmation Card (compact single-screen dock; tap to expand) */}
        <DailyAffirmationCard
          today={today}
          language={settings.language}
          compact
          onOpenExpanded={() => setAffirmationModalOpen(true)}
          onSavedToDiary={onRefresh}
        />
      </div>

      {/* ================================================================
          DESKTOP / TABLET WORKSPACE (>= 768px) — Rich Multi-Column Dashboard
         ================================================================ */}
      <div className="hidden md:block space-y-6">
        {/* Greeting + Primary Actions Row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs text-[var(--text-secondary)]">
              {formatDateReadable(today, settings.dateFormat)} · {settings.timezone}
            </p>
            <h1 className="text-3xl font-bold tracking-tight mt-1 text-balance">{greeting}</h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <motion.button
              type="button"
              whileTap={IOS_TAP_SCALE}
              transition={IOS_SPRING_SNAPPY}
              onClick={() => setMasterBrainOpen(true)}
              className="glass-button-primary px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 min-h-[44px] shrink-0 whitespace-nowrap"
            >
              <Brain className="w-4 h-4" />
              <span>Master Brain</span>
              <span className="font-mono-num px-1.5 py-0.5 rounded-md bg-white/20 text-[10.5px]">
                {masterBrainReport.readinessScore}%
              </span>
            </motion.button>
            <motion.button
              type="button"
              whileTap={IOS_TAP_SCALE}
              transition={IOS_SPRING_SNAPPY}
              onClick={handleOpenAiDailyPlanner}
              className="glass-button px-3.5 py-2.5 text-xs font-semibold flex items-center gap-1.5 min-h-[44px] shrink-0 whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-[var(--accent)]" />
              <span>AI Daily Planner</span>
            </motion.button>
            <button
              type="button"
              onClick={() => setDailyReportOpen(true)}
              className="glass-button px-3.5 py-2.5 text-xs font-semibold flex items-center gap-1.5 min-h-[44px] shrink-0 whitespace-nowrap active:scale-95 transition-transform"
            >
              <BarChart3 className="w-4 h-4 text-[var(--accent)]" />
              <span>Report Card</span>
            </button>
            <button
              type="button"
              onClick={() => setSmartScheduleOpen(true)}
              className="glass-button px-3.5 py-2.5 text-xs font-semibold flex items-center gap-1.5 min-h-[44px] shrink-0 whitespace-nowrap active:scale-95 transition-transform"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Smart Schedule</span>
            </button>
            <button
              type="button"
              onClick={() => setWeeklyReviewOpen(true)}
              className="glass-button px-3.5 py-2.5 text-xs font-semibold flex items-center gap-1.5 min-h-[44px] shrink-0 whitespace-nowrap active:scale-95 transition-transform"
            >
              <CalendarIcon className="w-4 h-4 text-[var(--accent-secondary)]" />
              <span>Weekly Review</span>
            </button>
            <button
              type="button"
              onClick={onQuickAddTask}
              className="glass-button px-3.5 py-2.5 text-xs font-semibold flex items-center gap-1.5 min-h-[44px] shrink-0 whitespace-nowrap active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
            <button
              type="button"
              onClick={onQuickAddRoutine}
              className="glass-button px-3.5 py-2.5 text-xs font-medium flex items-center gap-1.5 min-h-[44px] shrink-0 whitespace-nowrap active:scale-95 transition-transform"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Routine</span>
            </button>
            <button
              type="button"
              onClick={onOpenWaterTracker}
              className="glass-button px-3.5 py-2.5 text-xs font-medium flex items-center gap-1.5 min-h-[44px] shrink-0 whitespace-nowrap active:scale-95 transition-transform"
            >
              <Droplets className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
              <span>Water Tracker</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('alarms')}
              className="glass-button px-3.5 py-2.5 text-xs font-medium flex items-center gap-1.5 min-h-[44px] shrink-0 whitespace-nowrap active:scale-95 transition-transform"
            >
              <AlarmClock className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Alarms</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('notes')}
              className="glass-button px-3.5 py-2.5 text-xs font-medium flex items-center gap-1.5 min-h-[44px] shrink-0 whitespace-nowrap active:scale-95 transition-transform"
            >
              <BookHeart className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
              <span>Diary</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('focus')}
              className="glass-button px-3.5 py-2.5 text-xs font-medium flex items-center gap-1.5 min-h-[44px] shrink-0 whitespace-nowrap active:scale-95 transition-transform"
            >
              <Timer className="w-3.5 h-3.5" />
              <span>Focus</span>
            </button>
            <button
              type="button"
              onClick={onQuickAddGoal}
              className="glass-button px-3.5 py-2.5 text-xs font-medium flex items-center gap-1.5 min-h-[44px] shrink-0 whitespace-nowrap active:scale-95 transition-transform"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Add Goal</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('calendar')}
              className="glass-button px-3.5 py-2.5 text-xs font-medium flex items-center gap-1.5 min-h-[44px] shrink-0 whitespace-nowrap active:scale-95 transition-transform"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
            <button
              type="button"
              onClick={() => setCustomizeOpen(true)}
              aria-label="Customize dashboard widgets"
              className="glass-button px-3 py-2.5 text-xs font-medium flex items-center gap-1.5 min-h-[44px] shrink-0 whitespace-nowrap active:scale-95 transition-transform"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Widgets</span>
            </button>
          </div>
        </div>

        {/* Overdue Notice */}
        {dayContext.overdueTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={{ y: -2 }}
            transition={IOS_SPRING_SNAPPY}
            className="glass overdue-banner-animated p-4 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-3 min-w-0">
              <AlertTriangle className="w-5 h-5 text-[var(--warning)] shrink-0 overdue-icon-animated" />
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">
                  {dayContext.overdueTasks.length} overdue{' '}
                  {dayContext.overdueTasks.length === 1 ? 'task' : 'tasks'} in Recovery Center
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  Past records are never auto-deleted. Reschedule or resolve them gently.
                </div>
              </div>
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.06, y: -1 }}
              whileTap={IOS_TAP_SCALE}
              transition={IOS_SPRING_SNAPPY}
              onClick={() => onNavigate('goals')}
              className="glass-button recover-btn-animated px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0"
            >
              <span className="relative z-10">Recover</span>
            </motion.button>
          </motion.div>
        )}

        {/* Unified Seamless KPI Bento Strip + Interactive Progress Ring */}
        {settings.dashboardWidgets.progressRing && (
          <div className="glass-bento grid grid-cols-2 lg:grid-cols-6 divide-y lg:divide-y-0 lg:divide-x divide-[var(--glass-border-subtle)]">
            <button
              type="button"
              onClick={() => setBreakdownOpen(true)}
              className="p-5 flex items-center justify-between gap-4 col-span-2 lg:col-span-2 text-left hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="none"
                      stroke="rgba(148,163,184,0.16)"
                      strokeWidth="9"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      style={{ transition: 'stroke-dashoffset 500ms ease' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-mono-num text-xl font-bold">
                      {dayContext.productivityScore}%
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)]">Today</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">Daily Progress</div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">
                    Routines, tasks, habits &amp; focus.
                  </div>
                  <div className="text-[11px] text-[var(--accent)] mt-1.5 font-medium">
                    View breakdown →
                  </div>
                </div>
              </div>
            </button>

            <div className="p-5 flex flex-col justify-between">
              <div className="text-xs text-[var(--text-secondary)]">Completed Tasks</div>
              <div className="font-mono-num text-2xl font-bold mt-2 text-[var(--success)]">
                {completedTasks}
                <span className="text-sm font-normal text-[var(--text-muted)]">
                  {' '}
                  / {dayContext.tasks.length}
                </span>
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-2">{pendingTasks} pending today</div>
            </div>

            <div className="p-5 flex flex-col justify-between">
              <div className="text-xs text-[var(--text-secondary)]">Today&apos;s Routine</div>
              <div className="font-mono-num text-2xl font-bold mt-2">
                {completedRoutines}
                <span className="text-sm font-normal text-[var(--text-muted)]">
                  {' '}
                  / {dayContext.routines.length}
                </span>
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-2">Blocks completed</div>
            </div>

            <div className="p-5 flex flex-col justify-between">
              <div className="text-xs text-[var(--text-secondary)]">Focus Time</div>
              <div className="font-mono-num text-2xl font-bold mt-2 text-[var(--accent)]">
                {focusMinutesToday}m
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-2">
                Goal {settings.dailyFocusGoalMinutes}m
              </div>
            </div>

            <div className="p-5 flex flex-col justify-between">
              <div className="text-xs text-[var(--text-secondary)]">Study &amp; Work</div>
              <div className="font-mono-num text-2xl font-bold mt-2 text-[var(--accent-secondary)]">
                {studyMinutesToday + workMinutesToday}m
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-2">
                {studyMinutesToday}m study · {workMinutesToday}m work
              </div>
            </div>
          </div>
        )}

        {/* Main 2-Column Workspace */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Today Overview Timeline */}
          {settings.dashboardWidgets.timeline && (
            <section className="glass p-6 xl:col-span-8 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Today Overview</h2>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Unified timeline of routines, scheduled events, and tasks for{' '}
                    {formatDateReadable(today, settings.dateFormat)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('routine')}
                  className="text-xs font-medium text-[var(--accent)] hover:underline whitespace-nowrap"
                >
                  Manage Routine
                </button>
              </div>

              {conflicts.length > 0 && (
                <div className="p-3 rounded-xl border border-[var(--warning)]/35 bg-[var(--warning)]/10 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[var(--warning)] shrink-0" />
                  <span>
                    Time overlap detected: {conflicts[0].firstTitle} &amp; {conflicts[0].secondTitle} (
                    {conflicts[0].overlapWindow})
                  </span>
                </div>
              )}

              {timeline.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <p className="text-sm text-[var(--text-secondary)]">
                    No activities scheduled for today yet.
                  </p>
                  <button
                    type="button"
                    onClick={onQuickAddTask}
                    className="glass-button-primary px-4 py-2 text-xs font-semibold"
                  >
                    Plan First Activity
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[var(--glass-border-subtle)]">
                  {timeline.map((item) => {
                    const isDone = item.status === 'completed' || item.status === 'Completed';
                    const matchingTask =
                      item.kind === 'task'
                        ? dayContext.tasks.find((t) => t.id === item.id)
                        : undefined;
                    return (
                      <div
                        key={`${item.kind}-${item.id}`}
                        className="py-3.5 flex items-start justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleTimelineItem(item)}
                            disabled={item.kind === 'event'}
                            aria-label={
                              item.kind === 'event'
                                ? `Calendar event ${item.title}`
                                : `Toggle ${item.title}`
                            }
                            className="p-1.5 -m-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center shrink-0 text-[var(--text-secondary)] hover:text-[var(--accent)] disabled:opacity-40"
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />
                            ) : (
                              <Circle className="w-5 h-5" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <div
                              className={`text-sm font-medium ${
                                isDone ? 'line-through text-[var(--text-muted)]' : ''
                              }`}
                            >
                              {item.title}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--text-secondary)] mt-0.5">
                              <span className="font-mono-num">
                                {formatTimeDisplay(item.time, settings.timeFormat)}
                                {item.endTime
                                  ? ` – ${formatTimeDisplay(item.endTime, settings.timeFormat)}`
                                  : ''}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="capitalize">{item.kind}</span>
                              <span aria-hidden="true">·</span>
                              <span>{item.category}</span>
                              <span aria-hidden="true">·</span>
                              <span
                                className={
                                  item.priority === 'Urgent'
                                    ? 'text-[var(--danger)]'
                                    : item.priority === 'High'
                                      ? 'text-[var(--warning)]'
                                      : ''
                                }
                              >
                                {item.priority}
                              </span>
                            </div>
                            {item.notes && (
                              <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-1">
                                {item.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        {matchingTask && (
                          <button
                            type="button"
                            onClick={() => onEditTask(matchingTask)}
                            aria-label={`Edit ${matchingTask.title}`}
                            className="glass-button p-2 shrink-0 opacity-80 hover:opacity-100"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Right Insights & Summary Column */}
          <div className="xl:col-span-4 space-y-5">
            {/* Daily Affirmation Glass-Morphic Card */}
            <DailyAffirmationCard
              today={today}
              language={settings.language}
              onSavedToDiary={onRefresh}
            />

            {/* Master Brain Live OS Pulse */}
            <section className="glass p-5 space-y-3" aria-label="Master Brain Summary">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full auraa-orb flex items-center justify-center shrink-0">
                    <Brain className="w-3.5 h-3.5 text-white drop-shadow" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold leading-tight truncate">Master Brain Core</h2>
                    <p className="text-[11px] text-[var(--text-muted)] leading-tight">
                      {masterBrainReport.statusLabel}
                    </p>
                  </div>
                </div>
                <span className="font-mono-num text-sm font-bold text-[var(--accent)] shrink-0">
                  {masterBrainReport.readinessScore}%
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  {masterBrainReport.topPriorityTitle}
                </div>
                <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
                  {masterBrainReport.gujaratiSummary}
                </p>
              </div>
              <motion.button
                type="button"
                whileTap={IOS_TAP_SCALE}
                transition={IOS_SPRING_SNAPPY}
                onClick={() => setMasterBrainOpen(true)}
                className="glass-button-primary w-full py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Brain className="w-3.5 h-3.5" />
                <span>Open Master Brain Autopilot</span>
              </motion.button>
            </section>

            <section className="glass p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlarmClock className="w-4 h-4 text-[var(--accent)]" />
                  <h2 className="text-sm font-semibold">Alarms &amp; Water</h2>
                </div>
                <button
                  type="button"
                  onClick={onOpenWaterTracker}
                  className="text-xs text-[var(--accent)] hover:underline"
                >
                  Water Hub
                </button>
              </div>
              {nextAlarm ? (
                <div className="p-3 rounded-xl bg-white/[0.04] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{nextAlarm.alarm.title}</div>
                    <div className="text-[11px] text-[var(--text-secondary)] truncate">
                      {formatTimeDisplay(nextAlarm.time, settings.timeFormat)} ·{' '}
                      {formatMinutesCountdown(nextAlarm.minutesUntil)}
                    </div>
                  </div>
                  <span className="font-mono-num text-xs font-bold text-[var(--accent)] shrink-0">
                    {formatTimeDisplay(nextAlarm.time, settings.timeFormat)}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">No active alarms scheduled.</p>
              )}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2 text-xs min-w-0">
                  <Droplets className="w-4 h-4 text-[var(--accent-cyan)] shrink-0" />
                  <span className="truncate">
                    <strong className="font-mono-num">
                      {formatWaterAmount(waterMetrics.totalMl)}
                    </strong>{' '}
                    / {formatWaterAmount(waterMetrics.goalMl)} ({waterMetrics.percent}%)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await api.post('/api/water', { date: today, amountMl: 250 });
                    await onRefresh();
                  }}
                  className="glass-button px-2.5 py-1.5 text-[11px] font-semibold shrink-0"
                >
                  +250 ml
                </button>
              </div>
            </section>

            {settings.dashboardWidgets.aiInsights && (
              <section className="glass p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                    <h2 className="text-sm font-semibold">AURAA AI Recommendations</h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleFetchAiInsight}
                    disabled={aiLoading}
                    className="text-xs text-[var(--accent)] hover:underline disabled:opacity-50"
                  >
                    {aiLoading ? 'Analyzing...' : 'Refresh'}
                  </button>
                </div>
                {aiError ? (
                  <p className="text-xs text-[var(--warning)]">{aiError}</p>
                ) : aiInsight ? (
                  <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{aiInsight}</p>
                ) : (
                  <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                    You have {pendingTasks} pending tasks and{' '}
                    {dayContext.routines.length - completedRoutines} routine blocks left today. Click
                    Refresh for personalized AI suggestions or open AURAA for full day planning.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => onNavigate('ai')}
                  className="glass-button w-full py-2 text-xs font-semibold"
                >
                  Open AURAA AI Planner
                </button>
              </section>
            )}

            {settings.dashboardWidgets.goals && (
              <section className="glass p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Daily Goal Progress</h2>
                  <button
                    type="button"
                    onClick={() => onNavigate('goals')}
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    View all
                  </button>
                </div>
                {activeGoals.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">No active goals yet.</p>
                ) : (
                  <div className="space-y-3">
                    {activeGoals.map((g) => (
                      <div key={g.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs gap-2">
                          <span className="font-medium truncate">{g.title}</span>
                          <span className="font-mono-num text-[var(--text-secondary)] shrink-0">
                            {g.progress}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)]"
                            style={{ width: `${g.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {settings.dashboardWidgets.upcomingEvents && (
              <section className="glass p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Upcoming Events</h2>
                  <button
                    type="button"
                    onClick={() => onNavigate('calendar')}
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    Open Calendar
                  </button>
                </div>
                {upcomingEvents.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">No upcoming events scheduled.</p>
                ) : (
                  <div className="space-y-2.5">
                    {upcomingEvents.map((e) => (
                      <div
                        key={e.id}
                        className="flex items-start justify-between gap-2 pb-2.5 border-b border-[var(--glass-border-subtle)] last:border-none last:pb-0"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate">{e.title}</div>
                          <div className="text-[11px] text-[var(--text-secondary)] font-mono-num mt-0.5">
                            {formatDateReadable(e.date, settings.dateFormat)} ·{' '}
                            {formatTimeDisplay(e.startTime, settings.timeFormat)}
                          </div>
                        </div>
                        <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                          {e.category}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>

      {/* AI Daily Planner Modal */}
      <GlassModal
        open={plannerOpen}
        onClose={() => setPlannerOpen(false)}
        title="AI Daily Planner"
        subtitle="Gemini analyzes your current tasks, routines & goals to craft your prioritized hourly schedule"
      >
        <div className="space-y-4">
          {plannerLoading ? (
            <div className="py-8 text-center space-y-2">
              <Sparkles className="w-6 h-6 text-[var(--accent)] mx-auto animate-pulse" />
              <div className="text-sm font-semibold">Building your optimal hourly schedule...</div>
              <p className="text-xs text-[var(--text-secondary)]">
                Reviewing pending tasks, active goals, and open hours today.
              </p>
            </div>
          ) : plannerError ? (
            <div className="p-3 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 text-xs text-[var(--danger)]">
              {plannerError}
            </div>
          ) : dailyPlan ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/30 space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                  Top Focus: {dailyPlan.focusGoal}
                </div>
                <p className="text-xs leading-relaxed text-[var(--text-primary)]">
                  {dailyPlan.summary}
                </p>
              </div>

              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {dailyPlan.blocks.map((block, idx) => {
                  const isSaved = Boolean(savedBlocks[idx]);
                  const isSaving = savingBlockIdx === idx;
                  return (
                    <div
                      key={`${block.time}-${idx}`}
                      className="p-3 rounded-2xl border border-[var(--glass-border-subtle)] bg-white/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono-num font-bold text-[var(--accent)]">
                            {formatTimeDisplay(block.time, settings.timeFormat)} –{' '}
                            {formatTimeDisplay(block.endTime, settings.timeFormat)}
                          </span>
                          <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                            · {block.category}
                          </span>
                          <span
                            className={`text-[10px] font-semibold ${
                              block.priority === 'Urgent'
                                ? 'text-[var(--danger)]'
                                : block.priority === 'High'
                                  ? 'text-[var(--warning)]'
                                  : 'text-[var(--text-secondary)]'
                            }`}
                          >
                            · {block.priority}
                          </span>
                        </div>
                        <div className="text-sm font-semibold">{block.title}</div>
                        <p className="text-xs text-[var(--text-secondary)]">{block.reason}</p>
                      </div>

                      <button
                        type="button"
                        disabled={isSaved || isSaving}
                        onClick={() => handleSavePlannerBlock(block, idx)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 ${
                          isSaved ? 'glass-button text-[var(--success)]' : 'glass-button-primary'
                        }`}
                      >
                        {isSaved
                          ? 'Saved'
                          : isSaving
                            ? 'Saving...'
                            : block.actionType === 'create_routine'
                              ? '+ Routine'
                              : '+ Task'}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[var(--glass-border-subtle)]">
                <span className="text-[11px] text-[var(--text-muted)]">
                  Powered by {dailyPlan.modelUsed}
                </span>
                <button
                  type="button"
                  onClick={handleOpenAiDailyPlanner}
                  className="glass-button px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Regenerate</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </GlassModal>

      {/* Customize Widgets Modal */}
      <GlassModal
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        title="Customize Dashboard Widgets"
        subtitle="Choose which sections appear on your Home workspace"
      >
        <div className="space-y-2.5">
          {(
            [
              ['progressRing', 'Daily Progress & Metrics Strip'],
              ['timeline', 'Today Overview Unified Timeline'],
              ['aiInsights', 'AURAA AI Recommendations'],
              ['goals', 'Active Goals Progress'],
              ['upcomingEvents', 'Upcoming Calendar Events'],
            ] as const
          ).map(([key, label]) => (
            <div
              key={key}
              className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06]"
            >
              <LiquidGlassSwitch
                checked={settings.dashboardWidgets[key]}
                label={label}
                onChange={() => toggleWidget(key)}
              />
            </div>
          ))}
        </div>
      </GlassModal>

      {/* Daily Momentum Breakdown Modal */}
      <GlassModal
        open={breakdownOpen}
        onClose={() => setBreakdownOpen(false)}
        title="Daily Momentum Breakdown"
        subtitle={`${dayContext.productivityScore}% overall completion on ${formatDateReadable(today, settings.dateFormat)}`}
      >
        <div className="space-y-3">
          {[
            {
              label: 'Tasks Completed',
              value: `${completedTasks}/${dayContext.tasks.length}`,
              pct:
                dayContext.tasks.length > 0
                  ? Math.round((completedTasks / dayContext.tasks.length) * 100)
                  : 100,
              color: 'var(--success)',
            },
            {
              label: 'Routine Blocks',
              value: `${completedRoutines}/${dayContext.routines.length}`,
              pct:
                dayContext.routines.length > 0
                  ? Math.round((completedRoutines / dayContext.routines.length) * 100)
                  : 100,
              color: 'var(--accent)',
            },
            {
              label: 'Hydration Goal',
              value: `${formatWaterAmount(waterMetrics.totalMl)} / ${formatWaterAmount(waterMetrics.goalMl)}`,
              pct: waterMetrics.percent,
              color: 'var(--accent-cyan)',
            },
            {
              label: 'Focus Time',
              value: `${focusMinutesToday}m / ${settings.dailyFocusGoalMinutes}m`,
              pct: Math.min(
                100,
                Math.round((focusMinutesToday / Math.max(1, settings.dailyFocusGoalMinutes)) * 100)
              ),
              color: 'var(--accent-secondary)',
            },
            {
              label: 'Daily Habits',
              value: `${habitsDone}/${dayContext.habits.length}`,
              pct:
                dayContext.habits.length > 0
                  ? Math.round((habitsDone / dayContext.habits.length) * 100)
                  : 100,
              color: 'var(--warning)',
            },
          ].map((row) => (
            <div key={row.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{row.label}</span>
                <span className="font-mono-num text-[var(--text-secondary)]">
                  {row.value} · {row.pct}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.07] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${row.pct}%`, backgroundColor: row.color }}
                />
              </div>
            </div>
          ))}

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setBreakdownOpen(false);
                void handleOpenAiDailyPlanner();
              }}
              className="glass-button-primary flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Optimize Rest of Day with AURAA</span>
            </button>
          </div>
        </div>
      </GlassModal>

      {/* AURAA Master Brain Modal */}
      <MasterBrainModal
        open={masterBrainOpen}
        onClose={() => setMasterBrainOpen(false)}
        data={data}
        onRefresh={onRefresh}
        onNavigate={onNavigate}
        onTriggerAiDailyPlanner={handleOpenAiDailyPlanner}
      />

      {/* Mobile Expanded Daily Affirmation Modal */}
      <GlassModal
        open={affirmationModalOpen}
        onClose={() => setAffirmationModalOpen(false)}
        title="Daily Affirmation"
        subtitle="Positive quotes · Focus, Calm, Energy & ગુજરાતી"
      >
        <DailyAffirmationCard
          today={today}
          language={settings.language}
          onSavedToDiary={onRefresh}
        />
      </GlassModal>

      {/* Daily Report Card Modal */}
      <DailyReportModal
        open={dailyReportOpen}
        onClose={() => setDailyReportOpen(false)}
        data={data}
      />

      {/* AI Weekly Review Modal */}
      <WeeklyReviewModal
        open={weeklyReviewOpen}
        onClose={() => setWeeklyReviewOpen(false)}
        data={data}
      />

      {/* Smart Schedule Optimizer Modal */}
      <SmartScheduleModal
        open={smartScheduleOpen}
        onClose={() => setSmartScheduleOpen(false)}
        data={data}
        onOptimizeWithAi={handleOpenAiDailyPlanner}
      />
    </div>
  );
};
