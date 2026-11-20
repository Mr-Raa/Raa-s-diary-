import React, { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Edit3,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { BootstrapData } from '../api/client';
import { api } from '../api/client';
import type { Category, Priority, RecurrenceType, Task, TaskStatus } from '../types';
import { formatDateReadable, formatTimeDisplay, priorityWeight } from '../utils/dateLogic';
import { GlassModal } from './GlassModal';
import { GlassSelect } from './GlassSelect';

interface TasksViewProps {
  data: BootstrapData;
  onRefresh: () => Promise<void>;
  externalTaskToEdit?: Task | null;
  externalAddOpen?: boolean;
  onCloseExternal?: () => void;
}

type TaskFilterTab =
  | 'All'
  | 'Today'
  | 'Upcoming'
  | 'Overdue'
  | 'Completed'
  | 'Pending'
  | 'High Priority';

const CATEGORIES: Category[] = [
  'Personal',
  'Study',
  'Work',
  'Health',
  'Exercise',
  'Learning',
  'Family',
  'Projects',
  'Other',
];
const PRIORITIES: Priority[] = ['Low', 'Medium', 'High', 'Urgent'];
const STATUSES: TaskStatus[] = ['Not Started', 'In Progress', 'Completed', 'Skipped', 'Cancelled'];

export const TasksView: React.FC<TasksViewProps> = ({
  data,
  onRefresh,
  externalTaskToEdit,
  externalAddOpen,
  onCloseExternal,
}) => {
  const [tab, setTab] = useState<TaskFilterTab>('All');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'createdAt'>('dueDate');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [formError, setFormError] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(data.today);
  const [dueTime, setDueTime] = useState('');
  const [category, setCategory] = useState<Category>('Personal');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [status, setStatus] = useState<TaskStatus>('Not Started');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [reminderMinutes, setReminderMinutes] = useState(15);
  const [notes, setNotes] = useState('');
  const [subtasks, setSubtasks] = useState<Array<{ id?: string; title: string; completed: boolean }>>([]);
  const [newSubtask, setNewSubtask] = useState('');

  React.useEffect(() => {
    if (externalTaskToEdit) {
      openEdit(externalTaskToEdit);
    } else if (externalAddOpen) {
      openCreate();
    }
  }, [externalTaskToEdit, externalAddOpen]);

  const openCreate = () => {
    setEditing(null);
    setTitle('');
    setDescription('');
    setDueDate(data.today);
    setDueTime('');
    setCategory('Personal');
    setPriority('Medium');
    setStatus('Not Started');
    setRecurrence('none');
    setReminderMinutes(15);
    setNotes('');
    setSubtasks([]);
    setNewSubtask('');
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (t: Task) => {
    setEditing(t);
    setTitle(t.title);
    setDescription(t.description);
    setDueDate(t.dueDate);
    setDueTime(t.dueTime);
    setCategory(t.category);
    setPriority(t.priority);
    setStatus(t.status);
    setRecurrence(t.recurrence);
    setReminderMinutes(t.reminderMinutes);
    setNotes(t.notes);
    setSubtasks(t.subtasks || []);
    setNewSubtask('');
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    onCloseExternal?.();
  };

  const filteredTasks = useMemo(() => {
    const today = data.today;
    return data.tasks
      .filter((t) => {
        if (tab === 'Today') return t.dueDate === today;
        if (tab === 'Upcoming') return t.dueDate > today && t.status !== 'Completed';
        if (tab === 'Overdue')
          return (
            t.dueDate < today &&
            t.status !== 'Completed' &&
            t.status !== 'Skipped' &&
            t.status !== 'Cancelled'
          );
        if (tab === 'Completed') return t.status === 'Completed';
        if (tab === 'Pending')
          return t.status === 'Not Started' || t.status === 'In Progress';
        if (tab === 'High Priority')
          return (t.priority === 'High' || t.priority === 'Urgent') && t.status !== 'Completed';
        return true;
      })
      .filter((t) => (categoryFilter === 'All' ? true : t.category === categoryFilter))
      .filter((t) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'priority') return priorityWeight(b.priority) - priorityWeight(a.priority);
        if (sortBy === 'createdAt') return b.createdAt.localeCompare(a.createdAt);
        return `${a.dueDate} ${a.dueTime}`.localeCompare(`${b.dueDate} ${b.dueTime}`);
      });
  }, [data.tasks, data.today, tab, categoryFilter, search, sortBy]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) {
      setFormError('Task title and due date are required.');
      return;
    }
    const payload = {
      title: title.trim(),
      description,
      dueDate,
      dueTime,
      category,
      priority,
      status,
      recurrence,
      reminderMinutes,
      notes,
      subtasks,
    };
    if (editing) {
      await api.put(`/api/tasks/${editing.id}`, payload);
    } else {
      await api.post('/api/tasks', payload);
    }
    closeModal();
    await onRefresh();
  };

  const handleToggleComplete = async (t: Task) => {
    const nextStatus: TaskStatus = t.status === 'Completed' ? 'Not Started' : 'Completed';
    await api.put(`/api/tasks/${t.id}`, { ...t, status: nextStatus });
    await onRefresh();
  };

  const handleToggleSubtask = async (t: Task, subId: string) => {
    const nextSubs = t.subtasks.map((s) => (s.id === subId ? { ...s, completed: !s.completed } : s));
    await api.put(`/api/tasks/${t.id}`, { ...t, subtasks: nextSubs });
    await onRefresh();
  };

  const handleDelete = async (id: string) => {
    await api.del(`/api/tasks/${id}`);
    await onRefresh();
  };

  // ── Swipe gesture helpers ─────────────────────────────────────
  const SWIPE_THRESHOLD = 80; // px

  const SwipeableTaskCard: React.FC<{
    task: Task;
    children: React.ReactNode;
  }> = ({ task, children }) => {
    const startX = useRef(0);
    const currentX = useRef(0);
    const cardRef = useRef<HTMLDivElement>(null);
    const [swiping, setSwiping] = useState(false);
    const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null);

    const reset = () => {
      if (cardRef.current) {
        cardRef.current.style.transform = 'translateX(0)';
        cardRef.current.style.transition = 'transform 0.25s ease';
      }
      setSwiping(false);
      setSwipeDir(null);
    };

    const onTouchStart = (e: React.TouchEvent) => {
      startX.current = e.touches[0].clientX;
      currentX.current = 0;
      setSwiping(true);
      if (cardRef.current) cardRef.current.style.transition = 'none';
    };

    const onTouchMove = (e: React.TouchEvent) => {
      if (!swiping) return;
      const diff = e.touches[0].clientX - startX.current;
      currentX.current = diff;
      setSwipeDir(diff > 0 ? 'right' : 'left');
      if (cardRef.current) {
        cardRef.current.style.transform = `translateX(${diff}px)`;
      }
    };

    const onTouchEnd = async () => {
      const diff = currentX.current;
      if (diff > SWIPE_THRESHOLD) {
        // right swipe → complete
        if (cardRef.current) {
          cardRef.current.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
          cardRef.current.style.transform = 'translateX(110%)';
          cardRef.current.style.opacity = '0';
        }
        setTimeout(async () => {
          await handleToggleComplete(task);
        }, 280);
      } else if (diff < -SWIPE_THRESHOLD) {
        // left swipe → delete
        if (cardRef.current) {
          cardRef.current.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
          cardRef.current.style.transform = 'translateX(-110%)';
          cardRef.current.style.opacity = '0';
        }
        setTimeout(async () => {
          await handleDelete(task.id);
        }, 280);
      } else {
        reset();
      }
    };

    return (
      <div className="relative overflow-hidden rounded-2xl">
        {/* Background hint */}
        <div
          className="absolute inset-0 flex items-center justify-between px-6 rounded-2xl pointer-events-none"
          aria-hidden="true"
        >
          <div className={`flex items-center gap-2 text-emerald-400 text-sm font-semibold transition-opacity duration-150 ${swipeDir === 'right' ? 'opacity-100' : 'opacity-0'}`}>
            <CheckCircle2 className="w-5 h-5" />
            <span>Complete</span>
          </div>
          <div className={`flex items-center gap-2 text-red-400 text-sm font-semibold transition-opacity duration-150 ${swipeDir === 'left' ? 'opacity-100' : 'opacity-0'}`}>
            <span>Delete</span>
            <Trash2 className="w-5 h-5" />
          </div>
        </div>
        {/* Card itself */}
        <div
          ref={cardRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ willChange: 'transform' }}
        >
          {children}
        </div>
      </div>
    );
  };
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3 sm:space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Task Manager</h1>
          <p className="hidden sm:block text-xs text-[var(--text-secondary)] mt-0.5">
            Every task is bound to a real calendar date. Overdue tasks are preserved separately.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="glass-button-primary px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-semibold flex items-center gap-1.5 min-h-[38px] sm:min-h-[44px] shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Views Segmented Bar */}
      <div className="flex items-center gap-1 sm:gap-1.5 glass p-1 sm:p-1.5 overflow-x-auto no-scrollbar flex-nowrap sm:flex-wrap">
        {(
          ['All', 'Today', 'Upcoming', 'Overdue', 'Pending', 'High Priority', 'Completed'] as TaskFilterTab[]
        ).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setTab(v)}
            className={`px-3 py-1.5 sm:py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
              tab === v
                ? 'glass-button-primary text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Search, Category Filter & Sort */}
      <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 sm:gap-3">
        <div className="col-span-2 sm:col-span-6 relative">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks by title or notes..."
            aria-label="Search tasks"
            className="glass-input w-full pl-10 pr-3.5 py-2 sm:py-2.5 text-sm"
          />
        </div>
        <div className="col-span-1 sm:col-span-3">
          <GlassSelect
            value={categoryFilter}
            onChange={(val) => setCategoryFilter(val)}
            ariaLabel="Filter by category"
            className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm"
            options={[
              { value: 'All', label: 'All Categories' },
              ...CATEGORIES.map((c) => ({ value: c, label: c })),
            ]}
          />
        </div>
        <div className="col-span-1 sm:col-span-3">
          <GlassSelect
            value={sortBy}
            onChange={(val) => setSortBy(val as 'dueDate' | 'priority' | 'createdAt')}
            ariaLabel="Sort tasks"
            className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm"
            options={[
              { value: 'dueDate', label: 'Sort: Due Date' },
              { value: 'priority', label: 'Sort: Priority' },
              { value: 'createdAt', label: 'Sort: Recently Created' },
            ]}
          />
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="glass p-10 text-center space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">No tasks match the current filter.</p>
          <button
            type="button"
            onClick={openCreate}
            className="glass-button-primary px-4 py-2 text-xs font-semibold"
          >
            Create Task
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((t) => {
            const isOverdue =
              t.dueDate < data.today &&
              t.status !== 'Completed' &&
              t.status !== 'Skipped' &&
              t.status !== 'Cancelled';
            return (
              <SwipeableTaskCard key={t.id} task={t}>
              <div className="glass glass-interactive p-3.5 sm:p-5 space-y-2.5 sm:space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleComplete(t)}
                      aria-label={
                        t.status === 'Completed' ? `Reopen ${t.title}` : `Complete ${t.title}`
                      }
                      className="p-1.5 -m-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center shrink-0 text-[var(--text-secondary)] hover:text-[var(--accent)]"
                    >
                      {t.status === 'Completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <h3
                        className={`text-base font-semibold ${
                          t.status === 'Completed' ? 'line-through text-[var(--text-muted)]' : ''
                        }`}
                      >
                        {t.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--text-secondary)] mt-1">
                        <span className={`font-mono-num ${isOverdue ? 'text-[var(--danger)] font-medium' : ''}`}>
                          {formatDateReadable(t.dueDate, data.settings.dateFormat)}
                          {t.dueTime ? ` · ${formatTimeDisplay(t.dueTime, data.settings.timeFormat)}` : ''}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{t.category}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            t.priority === 'Urgent'
                              ? 'text-[var(--danger)] font-medium'
                              : t.priority === 'High'
                                ? 'text-[var(--warning)] font-medium'
                                : ''
                          }
                        >
                          {t.priority}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{t.status}</span>
                        {isOverdue && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[var(--danger)] font-medium">Overdue</span>
                          </>
                        )}
                      </div>
                      {t.description && (
                        <p className="text-xs text-[var(--text-secondary)] mt-1.5">{t.description}</p>
                      )}
                      {t.completedAt && (
                        <p className="text-[11px] text-[var(--success)] font-mono-num mt-1">
                          Completed at {new Date(t.completedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(t)}
                      aria-label={`Edit ${t.title}`}
                      className="glass-button p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      aria-label={`Delete ${t.title}`}
                      className="glass-button p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center text-[var(--danger)]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {t.subtasks.length > 0 && (
                  <div className="pl-8 pt-2 border-t border-[var(--glass-border-subtle)] space-y-1.5">
                    {t.subtasks.map((st) => (
                      <label key={st.id} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={st.completed}
                          onChange={() => handleToggleSubtask(t, st.id)}
                          className="accent-[var(--accent)]"
                        />
                        <span className={st.completed ? 'line-through text-[var(--text-muted)]' : ''}>
                          {st.title}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              </SwipeableTaskCard>
            );
          })}
        </div>
      )}

      {/* Create / Edit Task Modal */}
      <GlassModal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Task' : 'New Task'}
        subtitle="Tasks remain linked to their real due date and history"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && <p className="text-xs text-[var(--danger)]">{formError}</p>}
          <div>
            <label htmlFor="tsk-title" className="block text-xs font-medium mb-1.5">
              Task Title *
            </label>
            <input
              id="tsk-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Review Algebra Chapter 4"
              className="glass-input w-full px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="tsk-desc" className="block text-xs font-medium mb-1.5">
              Description
            </label>
            <textarea
              id="tsk-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details or success criteria"
              className="glass-input w-full px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="tsk-date" className="block text-xs font-medium mb-1.5">
                Due Date *
              </label>
              <input
                id="tsk-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="glass-input w-full px-3 py-2.5 text-sm font-mono-num"
              />
            </div>
            <div>
              <label htmlFor="tsk-time" className="block text-xs font-medium mb-1.5">
                Due Time (Optional)
              </label>
              <input
                id="tsk-time"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="glass-input w-full px-3 py-2.5 text-sm font-mono-num"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="tsk-cat" className="block text-xs font-medium mb-1.5">
                Category
              </label>
              <GlassSelect
                id="tsk-cat"
                value={category}
                onChange={(val) => setCategory(val as Category)}
                ariaLabel="Task category"
                className="w-full px-3 py-2.5 text-sm"
                options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
            </div>
            <div>
              <label htmlFor="tsk-pri" className="block text-xs font-medium mb-1.5">
                Priority
              </label>
              <GlassSelect
                id="tsk-pri"
                value={priority}
                onChange={(val) => setPriority(val as Priority)}
                ariaLabel="Task priority"
                className="w-full px-3 py-2.5 text-sm"
                options={PRIORITIES.map((p) => ({ value: p, label: p }))}
              />
            </div>
            <div>
              <label htmlFor="tsk-status" className="block text-xs font-medium mb-1.5">
                Status
              </label>
              <GlassSelect
                id="tsk-status"
                value={status}
                onChange={(val) => setStatus(val as TaskStatus)}
                ariaLabel="Task status"
                className="w-full px-3 py-2.5 text-sm"
                options={STATUSES.map((s) => ({ value: s, label: s }))}
              />
            </div>
          </div>

          {/* Subtasks */}
          <div className="space-y-2">
            <span className="block text-xs font-medium">Subtasks</span>
            <div className="flex gap-2">
              <input
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newSubtask.trim()) {
                      setSubtasks((prev) => [...prev, { title: newSubtask.trim(), completed: false }]);
                      setNewSubtask('');
                    }
                  }
                }}
                placeholder="Add subtask and press +"
                className="glass-input flex-1 px-3 py-2 text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (newSubtask.trim()) {
                    setSubtasks((prev) => [...prev, { title: newSubtask.trim(), completed: false }]);
                    setNewSubtask('');
                  }
                }}
                className="glass-button px-3 py-2 text-xs font-semibold"
              >
                +
              </button>
            </div>
            {subtasks.map((st, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs px-3 py-1.5 rounded-xl bg-white/[0.04]">
                <span>{st.title}</span>
                <button
                  type="button"
                  onClick={() => setSubtasks((prev) => prev.filter((_, i) => i !== idx))}
                  aria-label="Remove subtask"
                  className="text-[var(--text-muted)] hover:text-[var(--danger)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div>
            <label htmlFor="tsk-notes" className="block text-xs font-medium mb-1.5">
              Notes
            </label>
            <input
              id="tsk-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              className="glass-input w-full px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={closeModal} className="glass-button px-4 py-2.5 text-xs">
              Cancel
            </button>
            <button type="submit" className="glass-button-primary px-5 py-2.5 text-xs font-semibold">
              {editing ? 'Update Task' : 'Save Task'}
            </button>
          </div>
        </form>
      </GlassModal>
    </div>
  );
};
