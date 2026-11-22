import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarClock,
  CheckCircle,
  CheckCircle2,
  CircleDot,
  Clock,
  Edit3,
  Flame,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import type { BootstrapData } from '../api/client';
import { api } from '../api/client';
import type { Category, Goal, GoalStatus, Priority } from '../types';
import { addDays, formatDateReadable } from '../utils/dateLogic';
import { calculateHabitStreak } from '../utils/analyticsLogic';
import { GlassModal } from './GlassModal';
import { GlassSelect } from './GlassSelect';

interface GoalsHabitsViewProps {
  data: BootstrapData;
  onRefresh: () => Promise<void>;
  externalAddGoalOpen?: boolean;
  onCloseExternalAddGoal?: () => void;
}

const GOAL_CATEGORIES: Category[] = ['Personal', 'Study', 'Work', 'Health', 'Skills', 'Projects', 'Other'];
const GOAL_STATUSES: GoalStatus[] = ['Not Started', 'Active', 'On Hold', 'Completed', 'Cancelled'];
const PRIORITIES: Priority[] = ['Low', 'Medium', 'High', 'Urgent'];

export const GoalsHabitsView: React.FC<GoalsHabitsViewProps> = ({
  data,
  onRefresh,
  externalAddGoalOpen,
  onCloseExternalAddGoal,
}) => {
  const [subTab, setSubTab] = useState<'Goals' | 'Habits' | 'Recovery'>('Goals');

  // Goal Modal
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [gTitle, setGTitle] = useState('');
  const [gDesc, setGDesc] = useState('');
  const [gCat, setGCat] = useState<Category>('Study');
  const [gStart, setGStart] = useState(data.today);
  const [gTarget, setGTarget] = useState(addDays(data.today, 30));
  const [gProgress, setGProgress] = useState(0);
  const [gStatus, setGStatus] = useState<GoalStatus>('Active');
  const [gPriority, setGPriority] = useState<Priority>('High');
  const [gNotes, setGNotes] = useState('');
  const [gMilestones, setGMilestones] = useState<Array<{ id?: string; title: string; completed: boolean }>>([]);
  const [newMilestone, setNewMilestone] = useState('');

  // Habit Modal
  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [hTitle, setHTitle] = useState('');
  const [hCat, setHCat] = useState<Category>('Health');
  const [hTarget, setHTarget] = useState(7);

  // ── Streak Celebration ──────────────────────────────────────
  const [celebrationHabit, setCelebrationHabit] = useState<string | null>(null);
  const [celebrationStreak, setCelebrationStreak] = useState(0);
  const prevStreaksRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const MILESTONES = [7, 14, 21, 30, 60, 90];
    data.habits.forEach((h) => {
      const streak = calculateHabitStreak(h, data.today);
      const prev = prevStreaksRef.current[h.id] ?? 0;
      if (streak !== prev && MILESTONES.includes(streak)) {
        setCelebrationHabit(h.title);
        setCelebrationStreak(streak);
        setTimeout(() => setCelebrationHabit(null), 3500);
      }
      prevStreaksRef.current[h.id] = streak;
    });
  }, [data.habits, data.today]);
  // ───────────────────────────────────────────────────────────

  const isGoalModalOpen = goalModalOpen || Boolean(externalAddGoalOpen);

  const openCreateGoal = () => {
    setEditingGoal(null);
    setGTitle('');
    setGDesc('');
    setGCat('Study');
    setGStart(data.today);
    setGTarget(addDays(data.today, 30));
    setGProgress(0);
    setGStatus('Active');
    setGPriority('High');
    setGNotes('');
    setGMilestones([]);
    setGoalModalOpen(true);
  };

  const openEditGoal = (g: Goal) => {
    setEditingGoal(g);
    setGTitle(g.title);
    setGDesc(g.description);
    setGCat(g.category);
    setGStart(g.startDate);
    setGTarget(g.targetDate);
    setGProgress(g.progress);
    setGStatus(g.status);
    setGPriority(g.priority);
    setGNotes(g.notes);
    setGMilestones(g.milestones);
    setGoalModalOpen(true);
  };

  const closeGoalModal = () => {
    setGoalModalOpen(false);
    onCloseExternalAddGoal?.();
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gTitle.trim()) return;
    const payload = {
      title: gTitle.trim(),
      description: gDesc,
      category: gCat,
      startDate: gStart,
      targetDate: gTarget,
      progress: gProgress,
      status: gStatus,
      priority: gPriority,
      notes: gNotes,
      milestones: gMilestones,
    };
    if (editingGoal) {
      await api.put(`/api/goals/${editingGoal.id}`, payload);
    } else {
      await api.post('/api/goals', payload);
    }
    closeGoalModal();
    await onRefresh();
  };

  const handleToggleMilestone = async (goal: Goal, mId: string) => {
    const nextMilestones = goal.milestones.map((m) =>
      m.id === mId ? { ...m, completed: !m.completed } : m
    );
    const doneCount = nextMilestones.filter((m) => m.completed).length;
    const autoProgress =
      nextMilestones.length > 0 ? Math.round((doneCount / nextMilestones.length) * 100) : goal.progress;
    await api.put(`/api/goals/${goal.id}`, {
      ...goal,
      milestones: nextMilestones,
      progress: autoProgress,
    });
    await onRefresh();
  };

  const handleToggleHabitToday = async (habitId: string, currentlyDone: boolean) => {
    await api.post(`/api/habits/${habitId}/toggle`, {
      date: data.today,
      completed: !currentlyDone,
    });
    await onRefresh();
  };

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hTitle.trim()) return;
    await api.post('/api/habits', { title: hTitle.trim(), category: hCat, weeklyTarget: hTarget });
    setHabitModalOpen(false);
    setHTitle('');
    await onRefresh();
  };

  // Missed routines & overdue tasks for Recovery Center
  const overdueTasks = useMemo(
    () =>
      data.tasks.filter(
        (t) =>
          t.dueDate < data.today &&
          t.status !== 'Completed' &&
          t.status !== 'Skipped' &&
          t.status !== 'Cancelled'
      ),
    [data.tasks, data.today]
  );

  const skippedRoutines = useMemo(
    () =>
      data.routineOccurrences
        .filter((o) => o.status === 'skipped' && o.date >= addDays(data.today, -7))
        .map((o) => ({
          ...o,
          routine: data.routines.find((r) => r.id === o.routineId),
        }))
        .filter((x) => Boolean(x.routine)),
    [data.routineOccurrences, data.routines, data.today]
  );

  return (
    <div className="space-y-3 sm:space-y-5">

      {/* ── Streak Celebration Overlay ── */}
      {celebrationHabit && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
          <div className="streak-celebration glass text-center px-8 py-6 rounded-3xl shadow-2xl max-w-xs mx-4">
            <div className="text-5xl mb-2 animate-bounce">🔥</div>
            <div className="text-2xl font-bold text-[var(--accent)] mb-1">{celebrationStreak}-Day Streak!</div>
            <div className="text-sm text-[var(--text-secondary)]">{celebrationHabit}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">Keep it up! 🎉</div>
            {/* Particle dots */}
            <div className="streak-particles" aria-hidden="true">
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i} className="streak-particle" style={{ '--i': i } as React.CSSProperties} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Goals, Habits &amp; Recovery</h1>
          <p className="hidden sm:block text-xs text-[var(--text-secondary)] mt-0.5">
            Long-term milestones, daily habit streaks, and guilt-free schedule recovery.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setHabitModalOpen(true)}
            className="glass-button px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold flex items-center gap-1.5 min-h-[38px] sm:min-h-[40px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Habit</span>
          </button>
          <button
            type="button"
            onClick={openCreateGoal}
            className="glass-button-primary px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold flex items-center gap-1.5 min-h-[38px] sm:min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>New Goal</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="flex gap-1.5 glass p-1 sm:p-1.5 w-full sm:w-fit overflow-x-auto no-scrollbar flex-nowrap">
        {(['Goals', 'Habits', 'Recovery'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSubTab(t)}
            className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 ${
              subTab === t
                ? 'glass-button-primary text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t === 'Recovery'
              ? `Catch Up / બાકી વિગત (${overdueTasks.length + skippedRoutines.length})`
              : t}
          </button>
        ))}
      </div>

      {subTab === 'Goals' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {data.goals.map((g) => (
            <div key={g.id} className="glass p-3.5 sm:p-5 space-y-3 sm:space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold">{g.title}</h3>
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {g.category} · {g.priority} · {g.status} · Target{' '}
                    <span className="font-mono-num">
                      {formatDateReadable(g.targetDate, data.settings.dateFormat)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => openEditGoal(g)}
                    aria-label={`Edit ${g.title}`}
                    className="glass-button p-2"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await api.del(`/api/goals/${g.id}`);
                      await onRefresh();
                    }}
                    aria-label={`Delete ${g.title}`}
                    className="glass-button p-2 text-[var(--danger)]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {g.description && <p className="text-xs text-[var(--text-secondary)]">{g.description}</p>}

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span>Progress</span>
                  <span className="font-mono-num font-semibold">{g.progress}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--success)]"
                    style={{ width: `${g.progress}%` }}
                  />
                </div>
              </div>

              {/* Milestone Timeline Roadmap */}
              {g.milestones.length > 0 && (
                <div className="pt-3 border-t border-[var(--glass-border-subtle)] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-[var(--accent)]" />
                      Milestone Roadmap ({g.milestones.filter((m) => m.completed).length}/{g.milestones.length})
                    </span>
                    {(() => {
                      const diffDays = Math.ceil(
                        (new Date(g.targetDate).getTime() - new Date(data.today).getTime()) /
                          (1000 * 60 * 60 * 24)
                      );
                      return (
                        <span className="text-[11px] font-mono-num px-2 py-0.5 rounded-full bg-white/[0.06] text-[var(--text-muted)] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[var(--accent-cyan)]" />
                          {diffDays > 0 ? `${diffDays}d left` : diffDays === 0 ? 'Due Today' : `${Math.abs(diffDays)}d overdue`}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Horizontal / Staggered visual node chain */}
                  <div className="space-y-2">
                    {g.milestones.map((m, mIdx) => {
                      const isLast = mIdx === g.milestones.length - 1;
                      return (
                        <div key={m.id || mIdx} className="relative flex items-start gap-3">
                          {/* Node & Connecting Line */}
                          <div className="flex flex-col items-center">
                            <button
                              type="button"
                              onClick={() => m.id && handleToggleMilestone(g, m.id)}
                              aria-label={m.completed ? `Unmark milestone ${m.title}` : `Complete milestone ${m.title}`}
                              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                                m.completed
                                  ? 'bg-[var(--success)] text-black shadow-[0_0_10px_rgba(85,214,165,0.4)]'
                                  : 'bg-white/[0.08] border border-[var(--glass-border)] text-transparent hover:border-[var(--accent)]'
                              }`}
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                            {!isLast && (
                              <div
                                className={`w-0.5 h-5 my-0.5 transition-colors ${
                                  m.completed ? 'bg-[var(--success)]/60' : 'bg-white/[0.12]'
                                }`}
                              />
                            )}
                          </div>

                          {/* Milestone title */}
                          <button
                            type="button"
                            onClick={() => m.id && handleToggleMilestone(g, m.id)}
                            className="flex-1 text-left pt-0.5 min-w-0"
                          >
                            <span
                              className={`text-xs block truncate ${
                                m.completed
                                  ? 'line-through text-[var(--text-muted)]'
                                  : 'text-[var(--text-primary)] font-medium'
                              }`}
                            >
                              {m.title}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {subTab === 'Habits' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {data.habits.map((h) => {
            const doneToday = h.entries.some((e) => e.date === data.today && e.completed);
            const streak = calculateHabitStreak(h, data.today);
            const last14 = Array.from({ length: 14 }, (_, idx) => addDays(data.today, -(13 - idx)));
            return (
              <div key={h.id} className="glass p-3.5 sm:p-5 space-y-3 sm:space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold">{h.title}</h3>
                    <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {h.category} · Target {h.weeklyTarget}/wk
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-mono-num text-[var(--warning)]">
                    <Flame className="w-4 h-4" />
                    <span>{streak}d</span>
                  </div>
                </div>

                {/* 14-day heatmap */}
                <div className="grid grid-cols-7 gap-1.5">
                  {last14.map((d) => {
                    const hit = h.entries.some((e) => e.date === d && e.completed);
                    return (
                      <div
                        key={d}
                        title={d}
                        className={`h-6 rounded-md border border-[var(--glass-border-subtle)] flex items-center justify-center text-[10px] font-mono-num ${
                          hit ? 'bg-[var(--success)]/30 border-[var(--success)] text-[var(--success)]' : 'bg-white/[0.03] text-[var(--text-muted)]'
                        }`}
                      >
                        {d.slice(-2)}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleHabitToday(h.id, doneToday)}
                    className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 ${
                      doneToday ? 'glass-button text-[var(--success)]' : 'glass-button-primary'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{doneToday ? 'Checked In Today' : 'Check In Today'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await api.del(`/api/habits/${h.id}`);
                      await onRefresh();
                    }}
                    aria-label={`Delete ${h.title}`}
                    className="glass-button p-2.5 text-[var(--danger)]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {subTab === 'Recovery' && (
        <div className="space-y-4">
          <div className="glass p-5 space-y-2">
            <h2 className="text-base font-semibold">Gentle Recovery Plan</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Missing a block happens to everyone. Pick what matters and move it to Today or Tomorrow—your original history stays intact.
            </p>
          </div>

          {overdueTasks.length === 0 && skippedRoutines.length === 0 ? (
            <div className="glass p-8 text-center text-sm text-[var(--text-secondary)]">
              Everything is caught up. Zero pending recovery items.
            </div>
          ) : (
            <div className="space-y-3">
              {overdueTasks.map((t) => (
                <div key={t.id} className="glass p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{t.title}</div>
                    <div className="text-xs text-[var(--text-secondary)] font-mono-num">
                      Originally due {formatDateReadable(t.dueDate, data.settings.dateFormat)} · {t.category}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await api.put(`/api/tasks/${t.id}`, { ...t, dueDate: data.today });
                        await onRefresh();
                      }}
                      className="glass-button-primary px-3 py-1.5 text-xs font-semibold flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Move to Today
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await api.put(`/api/tasks/${t.id}`, { ...t, dueDate: addDays(data.today, 1) });
                        await onRefresh();
                      }}
                      className="glass-button px-3 py-1.5 text-xs flex items-center gap-1"
                    >
                      <CalendarClock className="w-3.5 h-3.5" /> Tomorrow
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await api.put(`/api/tasks/${t.id}`, { ...t, status: 'Skipped', skippedReason: 'Archived via Recovery Center' });
                        await onRefresh();
                      }}
                      className="glass-button px-3 py-1.5 text-xs text-[var(--text-secondary)]"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              ))}

              {skippedRoutines.map((sr) => (
                <div key={`${sr.routineId}-${sr.date}`} className="glass p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{sr.routine?.title}</div>
                    <div className="text-xs text-[var(--warning)]">
                      Skipped on {sr.date}{sr.skippedReason ? ` · "${sr.skippedReason}"` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await api.post('/api/tasks', {
                        title: `Make-up: ${sr.routine?.title}`,
                        dueDate: data.today,
                        category: sr.routine?.category || 'Personal',
                        priority: 'Medium',
                        description: `Recovered from skipped routine on ${sr.date}`,
                      });
                      await onRefresh();
                    }}
                    className="glass-button px-3.5 py-2 text-xs font-semibold"
                  >
                    Schedule Make-up Today
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Goal Modal */}
      <GlassModal
        open={isGoalModalOpen}
        onClose={closeGoalModal}
        title={editingGoal ? 'Edit Goal' : 'Create Goal'}
        subtitle="Track milestones, target dates, and progress"
      >
        <form onSubmit={handleSaveGoal} className="space-y-4">
          <div>
            <label htmlFor="gol-title" className="block text-xs font-medium mb-1.5">Goal Title *</label>
            <input
              id="gol-title"
              value={gTitle}
              onChange={(e) => setGTitle(e.target.value)}
              className="glass-input w-full px-3.5 py-2.5 text-sm"
              placeholder="e.g., Master Data Structures"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="gol-start" className="block text-xs font-medium mb-1.5">Start Date</label>
              <input id="gol-start" type="date" value={gStart} onChange={(e) => setGStart(e.target.value)} className="glass-input w-full px-3 py-2 text-sm font-mono-num" />
            </div>
            <div>
              <label htmlFor="gol-target" className="block text-xs font-medium mb-1.5">Target Date</label>
              <input id="gol-target" type="date" value={gTarget} onChange={(e) => setGTarget(e.target.value)} className="glass-input w-full px-3 py-2 text-sm font-mono-num" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <GlassSelect
              value={gCat}
              onChange={(val) => setGCat(val as Category)}
              ariaLabel="Goal category"
              className="w-full px-3 py-2 text-xs"
              options={GOAL_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
            <GlassSelect
              value={gPriority}
              onChange={(val) => setGPriority(val as Priority)}
              ariaLabel="Goal priority"
              className="w-full px-3 py-2 text-xs"
              options={PRIORITIES.map((p) => ({ value: p, label: p }))}
            />
            <GlassSelect
              value={gStatus}
              onChange={(val) => setGStatus(val as GoalStatus)}
              ariaLabel="Goal status"
              className="w-full px-3 py-2 text-xs"
              options={GOAL_STATUSES.map((s) => ({ value: s, label: s }))}
            />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Progress</span>
              <span className="font-mono-num">{gProgress}%</span>
            </div>
            <input type="range" min={0} max={100} value={gProgress} onChange={(e) => setGProgress(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
          </div>
          <div className="space-y-2">
            <span className="block text-xs font-medium">Milestones</span>
            <div className="flex gap-2">
              <input
                value={newMilestone}
                onChange={(e) => setNewMilestone(e.target.value)}
                placeholder="Add milestone"
                className="glass-input flex-1 px-3 py-2 text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (newMilestone.trim()) {
                    setGMilestones((prev) => [...prev, { title: newMilestone.trim(), completed: false }]);
                    setNewMilestone('');
                  }
                }}
                className="glass-button px-3 py-2 text-xs"
              >
                +
              </button>
            </div>
            {gMilestones.map((m, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs px-3 py-1.5 rounded-xl bg-white/[0.04]">
                <span>{m.title}</span>
                <button type="button" onClick={() => setGMilestones((prev) => prev.filter((_, i) => i !== idx))} className="text-[var(--danger)]">Remove</button>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeGoalModal} className="glass-button px-4 py-2 text-xs">Cancel</button>
            <button type="submit" className="glass-button-primary px-5 py-2 text-xs font-semibold">Save Goal</button>
          </div>
        </form>
      </GlassModal>

      {/* Habit Modal */}
      <GlassModal open={habitModalOpen} onClose={() => setHabitModalOpen(false)} title="Create Daily Habit">
        <form onSubmit={handleCreateHabit} className="space-y-4">
          <input value={hTitle} onChange={(e) => setHTitle(e.target.value)} placeholder="Habit title (e.g., 20m Meditation)" className="glass-input w-full px-3.5 py-2.5 text-sm" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <GlassSelect
              value={hCat}
              onChange={(val) => setHCat(val as Category)}
              ariaLabel="Habit category"
              className="w-full px-3 py-2 text-sm"
              options={GOAL_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
            <input type="number" min={1} max={7} value={hTarget} onChange={(e) => setHTarget(Number(e.target.value))} className="glass-input px-3 py-2 text-sm font-mono-num" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setHabitModalOpen(false)} className="glass-button px-4 py-2 text-xs">Cancel</button>
            <button type="submit" className="glass-button-primary px-5 py-2 text-xs font-semibold">Save Habit</button>
          </div>
        </form>
      </GlassModal>
    </div>
  );
};
