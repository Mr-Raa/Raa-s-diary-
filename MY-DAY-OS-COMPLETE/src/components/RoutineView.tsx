import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  Plus,
  RotateCcw,
  SkipForward,
  Trash2,
} from 'lucide-react';
import type { BootstrapData } from '../api/client';
import { api } from '../api/client';
import type { Category, Priority, RecurrenceType, Routine } from '../types';
import {
  doesRoutineOccurOnDate,
  formatDateReadable,
  formatTimeDisplay,
  getTimePeriod,
  getWeekDates,
} from '../utils/dateLogic';
import { findCurrentAndNextRoutine, getRoutineTimeDeltaLabel } from '../utils/trackerLogic';
import { GlassModal } from './GlassModal';
import { GlassSelect } from './GlassSelect';

interface RoutineViewProps {
  data: BootstrapData;
  onRefresh: () => Promise<void>;
  externalAddOpen?: boolean;
  onCloseExternalAdd?: () => void;
}

const CATEGORIES: Category[] = [
  'Personal',
  'Study',
  'Work',
  'Health',
  'Exercise',
  'Learning',
  'Family',
  'Other',
];
const PRIORITIES: Priority[] = ['Low', 'Medium', 'High', 'Urgent'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const RoutineView: React.FC<RoutineViewProps> = ({
  data,
  onRefresh,
  externalAddOpen,
  onCloseExternalAdd,
}) => {
  const [selectedDate, setSelectedDate] = useState(data.today);
  const [periodFilter, setPeriodFilter] = useState<'All' | 'Morning' | 'Afternoon' | 'Evening' | 'Night'>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Routine | null>(null);
  const [skipModalRoutine, setSkipModalRoutine] = useState<Routine | null>(null);
  const [skipReason, setSkipReason] = useState('');
  const [rescheduleRoutine, setRescheduleRoutine] = useState<Routine | null>(null);
  const [reschedDate, setReschedDate] = useState(data.today);
  const [reschedStart, setReschedStart] = useState('09:00');
  const [reschedEnd, setReschedEnd] = useState('10:00');
  const [quickTaskOpen, setQuickTaskOpen] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskTime, setQuickTaskTime] = useState('18:00');
  const [formError, setFormError] = useState('');

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('08:00');
  const [date, setDate] = useState(data.today);
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState<Category>('Personal');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [reminderMinutes, setReminderMinutes] = useState(10);
  const [notes, setNotes] = useState('');

  const isOpen = modalOpen || Boolean(externalAddOpen);

  const openCreate = () => {
    setEditing(null);
    setTitle('');
    setDescription('');
    setStartTime('07:00');
    setEndTime('08:00');
    setDate(selectedDate);
    setEndDate('');
    setCategory('Personal');
    setPriority('Medium');
    setRecurrence('daily');
    setSelectedDays([1, 2, 3, 4, 5]);
    setReminderMinutes(10);
    setNotes('');
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (r: Routine) => {
    setEditing(r);
    setTitle(r.title);
    setDescription(r.description);
    setStartTime(r.startTime);
    setEndTime(r.endTime);
    setDate(r.date);
    setEndDate(r.endDate || '');
    setCategory(r.category);
    setPriority(r.priority);
    setRecurrence(r.recurrence);
    setSelectedDays(r.selectedDays || []);
    setReminderMinutes(r.reminderMinutes);
    setNotes(r.notes);
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    onCloseExternalAdd?.();
  };

  const occMap = useMemo(() => {
    const map = new Map<string, { status: string; skippedReason: string | null }>();
    for (const o of data.routineOccurrences) {
      if (o.date === selectedDate) {
        map.set(o.routineId, { status: o.status, skippedReason: o.skippedReason });
      }
    }
    return map;
  }, [data.routineOccurrences, selectedDate]);

  const allRoutinesForDate = useMemo(() => {
    return data.routines
      .filter((r) => doesRoutineOccurOnDate(r, selectedDate))
      .map((r) => {
        const occ = occMap.get(r.id);
        return {
          ...r,
          occurrenceStatus: (occ?.status as Routine['occurrenceStatus']) ?? 'pending',
          skippedReason: occ?.skippedReason ?? null,
        };
      });
  }, [data.routines, selectedDate, occMap]);

  const routinesForDate = useMemo(() => {
    return allRoutinesForDate.filter((r) =>
      periodFilter === 'All' ? true : getTimePeriod(r.startTime) === periodFilter
    );
  }, [allRoutinesForDate, periodFilter]);

  const nowHHmm = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: data.settings.timezone || 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date());
    } catch {
      return '09:00';
    }
  }, [data.settings.timezone]);

  const { current: currentRoutine, next: nextRoutine } = useMemo(
    () => findCurrentAndNextRoutine(allRoutinesForDate, nowHHmm),
    [allRoutinesForDate, nowHHmm]
  );

  const dayStats = useMemo(() => {
    const completedR = allRoutinesForDate.filter((r) => r.occurrenceStatus === 'completed').length;
    const pendingR = allRoutinesForDate.filter((r) => r.occurrenceStatus === 'pending').length;
    const tasksOnDate = data.tasks.filter((t) => t.dueDate === selectedDate);
    const completedT = tasksOnDate.filter((t) => t.status === 'Completed').length;
    const pendingT = tasksOnDate.filter(
      (t) => t.status !== 'Completed' && t.status !== 'Cancelled' && t.status !== 'Skipped'
    ).length;
    const total = allRoutinesForDate.length + tasksOnDate.length;
    const done = completedR + completedT;
    const progress = total === 0 ? 0 : Math.round((done / total) * 100);
    return {
      completedTotal: done,
      pendingTotal: pendingR + pendingT,
      progress,
    };
  }, [allRoutinesForDate, data.tasks, selectedDate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Routine title is required.');
      return;
    }
    const payload = {
      title: title.trim(),
      description,
      startTime,
      endTime,
      date,
      endDate: endDate || null,
      category,
      priority,
      recurrence,
      selectedDays,
      reminderMinutes,
      notes,
    };
    if (editing) {
      await api.put(`/api/routines/${editing.id}`, { ...editing, ...payload });
    } else {
      await api.post('/api/routines', payload);
    }
    closeModal();
    await onRefresh();
  };

  const handleStatus = async (r: Routine, status: 'completed' | 'pending' | 'skipped', reason = '') => {
    await api.post(`/api/routines/${r.id}/occurrence`, {
      date: selectedDate,
      status,
      skippedReason: reason,
    });
    await onRefresh();
  };

  const handleDuplicate = async (r: Routine) => {
    await api.post('/api/routines', {
      title: `${r.title} (Copy)`,
      description: r.description,
      startTime: r.startTime,
      endTime: r.endTime,
      date: selectedDate,
      endDate: r.endDate,
      category: r.category,
      priority: r.priority,
      recurrence: r.recurrence,
      selectedDays: r.selectedDays,
      reminderMinutes: r.reminderMinutes,
      notes: r.notes,
    });
    await onRefresh();
  };

  const handleDelete = async (id: string) => {
    await api.del(`/api/routines/${id}`);
    await onRefresh();
  };

  const handleMove = async (idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= routinesForDate.length) return;
    const ids = routinesForDate.map((r) => r.id);
    [ids[idx], ids[targetIdx]] = [ids[targetIdx], ids[idx]];
    await api.post('/api/routines/reorder', { orderedIds: ids });
    await onRefresh();
  };

  const openReschedule = (r: Routine) => {
    setRescheduleRoutine(r);
    setReschedDate(selectedDate);
    setReschedStart(r.startTime);
    setReschedEnd(r.endTime);
  };

  const handleSaveReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleRoutine) return;
    await api.put(`/api/routines/${rescheduleRoutine.id}`, {
      ...rescheduleRoutine,
      date: reschedDate,
      startTime: reschedStart,
      endTime: reschedEnd,
    });
    setRescheduleRoutine(null);
    setSelectedDate(reschedDate);
    await onRefresh();
  };

  const handleSaveQuickTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;
    await api.post('/api/tasks', {
      title: quickTaskTitle.trim(),
      dueDate: selectedDate,
      dueTime: quickTaskTime,
      category: 'Personal',
      priority: 'Medium',
      status: 'Not Started',
    });
    setQuickTaskTitle('');
    setQuickTaskOpen(false);
    await onRefresh();
  };

  return (
    <div className="max-md:flex-1 max-md:min-h-0 max-md:flex max-md:flex-col max-md:gap-2 space-y-3 sm:space-y-5 max-md:space-y-0">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight">My Routine</h1>
            <p className="hidden sm:block text-xs text-[var(--text-secondary)] mt-0.5">
              Date-isolated routine execution for {formatDateReadable(selectedDate, data.settings.dateFormat)}
            </p>
          </div>
          <div className="sm:hidden flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setQuickTaskOpen(true)}
              className="glass-button px-2.5 py-1.5 text-[11px] font-semibold flex items-center gap-1 min-h-[38px]"
            >
              <Plus className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
              <span>Task</span>
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="glass-button-primary px-2.5 py-1.5 text-[11px] font-semibold flex items-center gap-1 min-h-[38px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Routine</span>
            </button>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2.5">
          <label className="sr-only" htmlFor="routine-date-picker">
            Routine Date
          </label>
          <input
            id="routine-date-picker"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="glass-input px-3 py-2 text-xs font-mono-num min-h-[42px]"
          />
          <button
            type="button"
            onClick={() => setQuickTaskOpen(true)}
            className="glass-button px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 min-h-[42px]"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
            <span>Add Task</span>
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="glass-button-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5 min-h-[42px]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Routine</span>
          </button>
        </div>
      </div>

      {/* Seamless Live Status Bento Strip: Current Time, Progress, Active & Upcoming Countdown */}
      <div className="glass-bento p-2.5 sm:p-4 grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 shrink-0">
        <div className="min-w-0">
          <div className="text-[10.5px] sm:text-xs text-[var(--text-secondary)] flex items-center gap-1">
            <Clock className="w-3 h-3 text-[var(--accent)] shrink-0" />
            <span>Current Time</span>
          </div>
          <div className="font-mono-num text-sm sm:text-base font-bold mt-0.5 truncate">
            {formatTimeDisplay(nowHHmm, data.settings.timeFormat)}
          </div>
        </div>

        <div className="min-w-0">
          <div className="text-[10.5px] sm:text-xs text-[var(--text-secondary)]">Progress</div>
          <div className="font-mono-num text-xs sm:text-sm font-bold mt-0.5">
            {dayStats.completedTotal} done · {dayStats.pendingTotal} left ({dayStats.progress}%)
          </div>
          <div className="h-1 rounded-full bg-white/[0.08] overflow-hidden mt-1">
            <div
              className="h-full rounded-full bg-[var(--success)]"
              style={{ width: `${dayStats.progress}%` }}
            />
          </div>
        </div>

        <div className="min-w-0">
          <div className="text-[10.5px] sm:text-xs text-[var(--accent-cyan)] font-medium flex items-center gap-1.5">
            <span>Now Active</span>
            {currentRoutine && (
              <span className="font-mono-num text-[10px] text-[var(--text-secondary)]">
                · {getRoutineTimeDeltaLabel(currentRoutine.startTime, currentRoutine.endTime, nowHHmm, true)}
              </span>
            )}
          </div>
          <div className="text-xs sm:text-sm font-semibold truncate mt-0.5">
            {currentRoutine ? currentRoutine.title : 'Open slot'}
          </div>
        </div>

        <div className="min-w-0">
          <div className="text-[10.5px] sm:text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
            <span>Up Next</span>
            {nextRoutine && (
              <span className="font-mono-num text-[10px] text-[var(--accent)]">
                · {getRoutineTimeDeltaLabel(nextRoutine.startTime, nextRoutine.endTime, nowHHmm, false)}
              </span>
            )}
          </div>
          <div className="text-xs sm:text-sm font-semibold truncate mt-0.5">
            {nextRoutine
              ? `${formatTimeDisplay(nextRoutine.startTime, data.settings.timeFormat)} ${nextRoutine.title}`
              : 'All done'}
          </div>
        </div>
      </div>

      {/* Mobile 1-tap 7-Day Horizontal Date Strip (Borderless Tonal Pills) */}
      <div className="grid grid-cols-7 gap-1 md:hidden shrink-0" role="group" aria-label="Week days">
        {getWeekDates(selectedDate, data.settings.weekStartsOn).map((d) => {
          const dt = new Date(`${d}T00:00:00Z`);
          const dayShort = WEEKDAYS[dt.getUTCDay()].slice(0, 1);
          const dayNum = d.slice(8, 10).replace(/^0/, '');
          const isSelected = d === selectedDate;
          const isToday = d === data.today;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDate(d)}
              className={`py-1 rounded-xl flex flex-col items-center justify-center min-h-[42px] transition-all active:scale-95 ${
                isSelected
                  ? 'glass-button-primary text-white'
                  : isToday
                    ? 'bg-[var(--accent)]/14 text-[var(--accent)]'
                    : 'bg-white/[0.035] text-[var(--text-secondary)]'
              }`}
            >
              <span className="text-[9.5px] font-medium opacity-85">{dayShort}</span>
              <span className="font-mono-num text-xs font-bold leading-tight">{dayNum}</span>
            </button>
          );
        })}
      </div>

      {/* Period Filter Tabs + Compact Date Picker on Mobile */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="grid grid-cols-5 sm:flex items-center gap-0.5 sm:gap-1 glass p-1 flex-1 sm:flex-none sm:w-fit max-w-full">
          {(['All', 'Morning', 'Afternoon', 'Evening', 'Night'] as const).map((tab) => {
            const shortLabel =
              tab === 'All'
                ? 'All'
                : tab === 'Morning'
                  ? 'AM'
                  : tab === 'Afternoon'
                    ? 'PM'
                    : tab === 'Evening'
                      ? 'Eve'
                      : 'Night';
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setPeriodFilter(tab)}
                className={`px-1 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-medium whitespace-nowrap transition-colors min-h-[34px] sm:min-h-[38px] text-center ${
                  periodFilter === tab
                    ? 'glass-button-primary text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="sm:hidden">{shortLabel}</span>
                <span className="hidden sm:inline">{tab === 'All' ? 'All Day' : tab}</span>
              </button>
            );
          })}
        </div>
        <input
          type="date"
          aria-label="Choose routine date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="sm:hidden glass-input px-2 py-1 text-xs font-mono-num min-h-[42px] w-[150px] shrink-0"
        />
      </div>

      {/* Routine Timeline (Inner Scroll Container on Mobile) */}
      <div className="max-md:flex-1 max-md:min-h-0 max-md:overflow-y-auto max-md:no-scrollbar max-md:pb-1">
        {routinesForDate.length === 0 ? (
          <div className="glass p-8 sm:p-10 text-center space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">
              No routines scheduled for {periodFilter === 'All' ? 'this date' : periodFilter}.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="glass-button-primary px-4 py-2 text-xs font-semibold"
            >
              Create Routine
            </button>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {routinesForDate.map((r, idx) => {
              const isDone = r.occurrenceStatus === 'completed';
              const isSkipped = r.occurrenceStatus === 'skipped';
              const isCurrent = currentRoutine?.id === r.id;
              return (
                <div
                  key={r.id}
                  className={`glass-bento p-3 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 transition-colors ${
                    isCurrent ? 'bg-[var(--accent)]/10' : 'hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleStatus(r, isDone ? 'pending' : 'completed')}
                      aria-label={isDone ? `Mark ${r.title} pending` : `Complete ${r.title}`}
                      className={`mt-0.5 min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                        isDone
                          ? 'bg-[var(--success)]/18 text-[var(--success)]'
                          : isSkipped
                            ? 'bg-[var(--warning)]/18 text-[var(--warning)]'
                            : 'bg-white/[0.05] text-[var(--text-secondary)] hover:bg-[var(--accent)]/15 hover:text-[var(--accent)]'
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3
                          className={`text-sm sm:text-base font-semibold ${
                            isDone ? 'line-through text-[var(--text-muted)]' : ''
                          }`}
                        >
                          {r.title}
                        </h3>
                        {isCurrent && (
                          <span className="text-[10.5px] font-semibold text-[var(--accent-cyan)]">
                            · Live Now
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] sm:text-xs text-[var(--text-secondary)] mt-0.5">
                        <span className="font-mono-num">
                          {formatTimeDisplay(r.startTime, data.settings.timeFormat)} –{' '}
                          {formatTimeDisplay(r.endTime, data.settings.timeFormat)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{r.category}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            isDone
                              ? 'text-[var(--success)] font-medium'
                              : isSkipped
                                ? 'text-[var(--warning)] font-medium'
                                : ''
                          }
                        >
                          {isDone ? 'Completed' : isSkipped ? 'Skipped' : 'Pending'}
                        </span>
                      </div>
                      {r.description && (
                        <p className="hidden sm:block text-xs text-[var(--text-secondary)] mt-1">
                          {r.description}
                        </p>
                      )}
                      {r.skippedReason && (
                        <p className="text-xs text-[var(--warning)] mt-1">
                          Skipped reason: {r.skippedReason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-1.5 w-full sm:w-auto shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => openReschedule(r)}
                      aria-label={`Reschedule ${r.title}`}
                      className="glass-button px-2.5 py-1.5 min-h-[38px] text-[11px] font-medium flex items-center gap-1"
                    >
                      <CalendarClock className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span>Reschedule</span>
                    </button>
                    {!isSkipped && !isDone && (
                      <button
                        type="button"
                        onClick={() => {
                          setSkipModalRoutine(r);
                          setSkipReason('');
                        }}
                        aria-label={`Skip ${r.title}`}
                        title="Skip with reason"
                        className="glass-button p-2 min-w-[38px] min-h-[38px] flex items-center justify-center"
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>
                    )}
                    {(isDone || isSkipped) && (
                      <button
                        type="button"
                        onClick={() => handleStatus(r, 'pending')}
                        aria-label={`Reset ${r.title}`}
                        title="Reset status"
                        className="glass-button p-2 min-w-[38px] min-h-[38px] flex items-center justify-center"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleMove(idx, -1)}
                      disabled={idx === 0}
                      aria-label={`Move ${r.title} up`}
                      className="hidden sm:flex glass-button p-2 min-w-[38px] min-h-[38px] items-center justify-center disabled:opacity-35"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 1)}
                      disabled={idx === routinesForDate.length - 1}
                      aria-label={`Move ${r.title} down`}
                      className="hidden sm:flex glass-button p-2 min-w-[38px] min-h-[38px] items-center justify-center disabled:opacity-35"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(r)}
                      aria-label={`Duplicate ${r.title}`}
                      className="hidden sm:flex glass-button p-2 min-w-[38px] min-h-[38px] items-center justify-center"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      aria-label={`Edit ${r.title}`}
                      className="glass-button p-2 min-w-[38px] min-h-[38px] flex items-center justify-center"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      aria-label={`Delete ${r.title}`}
                      className="glass-button p-2 min-w-[38px] min-h-[38px] flex items-center justify-center text-[var(--danger)]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Routine Modal */}
      <GlassModal
        open={isOpen}
        onClose={closeModal}
        title={editing ? 'Edit Routine' : 'Create New Routine'}
        subtitle="Configure timings, recurrence, and reminders"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && <p className="text-xs text-[var(--danger)]">{formError}</p>}
          <div>
            <label htmlFor="rtn-title" className="block text-xs font-medium mb-1.5">
              Title *
            </label>
            <input
              id="rtn-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Morning Deep Study"
              className="glass-input w-full px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="rtn-desc" className="block text-xs font-medium mb-1.5">
              Description
            </label>
            <input
              id="rtn-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional activity details"
              className="glass-input w-full px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="rtn-start" className="block text-xs font-medium mb-1.5">
                Start Time
              </label>
              <input
                id="rtn-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="glass-input w-full px-3 py-2.5 text-sm font-mono-num"
              />
            </div>
            <div>
              <label htmlFor="rtn-end" className="block text-xs font-medium mb-1.5">
                End Time
              </label>
              <input
                id="rtn-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="glass-input w-full px-3 py-2.5 text-sm font-mono-num"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="rtn-date" className="block text-xs font-medium mb-1.5">
                Start Date
              </label>
              <input
                id="rtn-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="glass-input w-full px-3 py-2.5 text-sm font-mono-num"
              />
            </div>
            <div>
              <label htmlFor="rtn-end-date" className="block text-xs font-medium mb-1.5">
                End Date (Optional)
              </label>
              <input
                id="rtn-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="glass-input w-full px-3 py-2.5 text-sm font-mono-num"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="rtn-cat" className="block text-xs font-medium mb-1.5">
                Category
              </label>
              <GlassSelect
                id="rtn-cat"
                value={category}
                onChange={(val) => setCategory(val as Category)}
                ariaLabel="Routine category"
                className="w-full px-3 py-2.5 text-sm"
                options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
            </div>
            <div>
              <label htmlFor="rtn-pri" className="block text-xs font-medium mb-1.5">
                Priority
              </label>
              <GlassSelect
                id="rtn-pri"
                value={priority}
                onChange={(val) => setPriority(val as Priority)}
                ariaLabel="Routine priority"
                className="w-full px-3 py-2.5 text-sm"
                options={PRIORITIES.map((p) => ({ value: p, label: p }))}
              />
            </div>
            <div>
              <label htmlFor="rtn-rec" className="block text-xs font-medium mb-1.5">
                Recurrence
              </label>
              <GlassSelect
                id="rtn-rec"
                value={recurrence}
                onChange={(val) => setRecurrence(val as RecurrenceType)}
                ariaLabel="Routine recurrence"
                className="w-full px-3 py-2.5 text-sm"
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'selected_days', label: 'Selected Days' },
                  { value: 'none', label: 'One Day Only' },
                ]}
              />
            </div>
          </div>

          {recurrence === 'selected_days' && (
            <div>
              <span className="block text-xs font-medium mb-1.5">Repeat on Days</span>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((day, idx) => {
                  const active = selectedDays.includes(idx);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() =>
                        setSelectedDays((prev) =>
                          prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]
                        )
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium ${
                        active ? 'glass-button-primary' : 'glass-button'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="rtn-rem" className="block text-xs font-medium mb-1.5">
                Reminder (mins before)
              </label>
              <input
                id="rtn-rem"
                type="number"
                min={0}
                max={120}
                value={reminderMinutes}
                onChange={(e) => setReminderMinutes(Number(e.target.value))}
                className="glass-input w-full px-3 py-2.5 text-sm font-mono-num"
              />
            </div>
            <div>
              <label htmlFor="rtn-notes" className="block text-xs font-medium mb-1.5">
                Notes
              </label>
              <input
                id="rtn-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Preparation or cues"
                className="glass-input w-full px-3 py-2.5 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={closeModal} className="glass-button px-4 py-2.5 text-xs font-medium">
              Cancel
            </button>
            <button type="submit" className="glass-button-primary px-5 py-2.5 text-xs font-semibold">
              {editing ? 'Update Routine' : 'Save Routine'}
            </button>
          </div>
        </form>
      </GlassModal>

      {/* Skip Reason Modal */}
      <GlassModal
        open={Boolean(skipModalRoutine)}
        onClose={() => setSkipModalRoutine(null)}
        title="Skip Routine Block"
        subtitle={`Record why "${skipModalRoutine?.title}" was skipped on ${selectedDate}`}
      >
        <div className="space-y-4">
          <input
            value={skipReason}
            onChange={(e) => setSkipReason(e.target.value)}
            placeholder="e.g., Unexpected errand or needed rest"
            className="glass-input w-full px-3.5 py-2.5 text-sm"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setSkipModalRoutine(null)} className="glass-button px-4 py-2 text-xs">
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                if (skipModalRoutine) {
                  await handleStatus(skipModalRoutine, 'skipped', skipReason || 'Skipped by user');
                  setSkipModalRoutine(null);
                }
              }}
              className="glass-button-primary px-4 py-2 text-xs font-semibold"
            >
              Confirm Skip
            </button>
          </div>
        </div>
      </GlassModal>

      {/* Quick Reschedule Routine Modal */}
      <GlassModal
        open={Boolean(rescheduleRoutine)}
        onClose={() => setRescheduleRoutine(null)}
        title="Reschedule Routine"
        subtitle={`Adjust date or time window for "${rescheduleRoutine?.title}"`}
      >
        <form onSubmit={handleSaveReschedule} className="space-y-4">
          <div>
            <label htmlFor="resched-date" className="block text-xs font-medium mb-1.5">
              Date
            </label>
            <input
              id="resched-date"
              type="date"
              value={reschedDate}
              onChange={(e) => setReschedDate(e.target.value)}
              className="glass-input w-full px-3 py-2.5 text-sm font-mono-num"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="resched-start" className="block text-xs font-medium mb-1.5">
                Start Time
              </label>
              <input
                id="resched-start"
                type="time"
                value={reschedStart}
                onChange={(e) => setReschedStart(e.target.value)}
                className="glass-input w-full px-3 py-2.5 text-sm font-mono-num"
              />
            </div>
            <div>
              <label htmlFor="resched-end" className="block text-xs font-medium mb-1.5">
                End Time
              </label>
              <input
                id="resched-end"
                type="time"
                value={reschedEnd}
                onChange={(e) => setReschedEnd(e.target.value)}
                className="glass-input w-full px-3 py-2.5 text-sm font-mono-num"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setRescheduleRoutine(null)}
              className="glass-button px-4 py-2 text-xs"
            >
              Cancel
            </button>
            <button type="submit" className="glass-button-primary px-4 py-2 text-xs font-semibold">
              Save Time
            </button>
          </div>
        </form>
      </GlassModal>

      {/* Quick Add Task Modal (for Selected Date) */}
      <GlassModal
        open={quickTaskOpen}
        onClose={() => setQuickTaskOpen(false)}
        title="Quick Add Task"
        subtitle={`Add a task to ${formatDateReadable(selectedDate, data.settings.dateFormat)}`}
      >
        <form onSubmit={handleSaveQuickTask} className="space-y-4">
          <div>
            <label htmlFor="rtn-quick-task-title" className="block text-xs font-medium mb-1.5">
              Task Title *
            </label>
            <input
              id="rtn-quick-task-title"
              value={quickTaskTitle}
              onChange={(e) => setQuickTaskTitle(e.target.value)}
              placeholder="e.g., Revise biology chapter"
              className="glass-input w-full px-3.5 py-2.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="rtn-quick-task-time" className="block text-xs font-medium mb-1.5">
              Time
            </label>
            <input
              id="rtn-quick-task-time"
              type="time"
              value={quickTaskTime}
              onChange={(e) => setQuickTaskTime(e.target.value)}
              className="glass-input w-full px-3 py-2.5 text-sm font-mono-num"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setQuickTaskOpen(false)}
              className="glass-button px-4 py-2 text-xs"
            >
              Cancel
            </button>
            <button type="submit" className="glass-button-primary px-4 py-2 text-xs font-semibold">
              Add Task
            </button>
          </div>
        </form>
      </GlassModal>
    </div>
  );
};
