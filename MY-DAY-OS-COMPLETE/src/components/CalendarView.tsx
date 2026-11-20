import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  MapPin,
  Plus,
  Trash2,
} from 'lucide-react';
import type { BootstrapData } from '../api/client';
import { api } from '../api/client';
import type { CalendarEvent, Category, DayContext, RecurrenceType } from '../types';
import {
  doesRoutineOccurOnDate,
  formatDateReadable,
  formatTimeDisplay,
  getCalendarMonthGrid,
  getWeekDates,
} from '../utils/dateLogic';
import { GlassModal } from './GlassModal';
import { GlassSelect } from './GlassSelect';

interface CalendarViewProps {
  data: BootstrapData;
  onRefresh: () => Promise<void>;
}

type CalViewMode = 'Month' | 'Week' | 'Day' | 'Agenda' | 'Year';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CATEGORIES: Category[] = [
  'Personal', 'Study', 'Work', 'Health', 'Exercise', 'Learning', 'Family', 'Projects', 'Other',
];

const EVENT_COLORS = ['#6b9cff', '#a78bfa', '#38bdf8', '#55d6a5', '#f5bb68', '#f87171'];

export const CalendarView: React.FC<CalendarViewProps> = ({ data, onRefresh }) => {
  const [viewMode, setViewMode] = useState<CalViewMode>('Month');
  const [selectedDate, setSelectedDate] = useState(data.today);

  const [initY, initM] = data.today.split('-').map(Number);
  const [cursorYear, setCursorYear] = useState(initY);
  const [cursorMonth, setCursorMonth] = useState(initM - 1); // 0..11

  const [dayDetails, setDayDetails] = useState<DayContext | null>(null);
  const [loadingDay, setLoadingDay] = useState(false);

  // Event modal
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [evTitle, setEvTitle] = useState('');
  const [evDesc, setEvDesc] = useState('');
  const [evDate, setEvDate] = useState(data.today);
  const [evStart, setEvStart] = useState('10:00');
  const [evEnd, setEvEnd] = useState('11:00');
  const [evCat, setEvCat] = useState<Category>('Personal');
  const [evColor, setEvColor] = useState('#6b9cff');
  const [evLoc, setEvLoc] = useState('');
  const [evRec, setEvRec] = useState<RecurrenceType>('none');
  const [formError, setFormError] = useState('');

  // Dragging state
  const [dragPayload, setDragPayload] = useState<{ kind: 'event' | 'task'; id: string } | null>(null);

  useEffect(() => {
    let active = true;
    setLoadingDay(true);
    api
      .get<DayContext>(`/api/day-context?date=${encodeURIComponent(selectedDate)}`)
      .then((ctx) => {
        if (active) setDayDetails(ctx);
      })
      .finally(() => {
        if (active) setLoadingDay(false);
      });
    return () => {
      active = false;
    };
  }, [selectedDate, data.events, data.tasks, data.routines, data.routineOccurrences]);

  const weekDaysHeader = useMemo(() => {
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (data.settings.weekStartsOn === 1) {
      return [...names.slice(1), names[0]];
    }
    return names;
  }, [data.settings.weekStartsOn]);

  const monthGrid = useMemo(
    () => getCalendarMonthGrid(cursorYear, cursorMonth, data.settings.weekStartsOn),
    [cursorYear, cursorMonth, data.settings.weekStartsOn]
  );

  const weekDates = useMemo(
    () => getWeekDates(selectedDate, data.settings.weekStartsOn),
    [selectedDate, data.settings.weekStartsOn]
  );

  const navigateMonth = (delta: number) => {
    const dt = new Date(Date.UTC(cursorYear, cursorMonth + delta, 1));
    setCursorYear(dt.getUTCFullYear());
    setCursorMonth(dt.getUTCMonth());
  };

  const jumpToToday = () => {
    const [y, m] = data.today.split('-').map(Number);
    setCursorYear(y);
    setCursorMonth(m - 1);
    setSelectedDate(data.today);
  };

  const openCreateEvent = (dateForEvent = selectedDate) => {
    setEditingEvent(null);
    setEvTitle('');
    setEvDesc('');
    setEvDate(dateForEvent);
    setEvStart('10:00');
    setEvEnd('11:00');
    setEvCat('Personal');
    setEvColor('#6b9cff');
    setEvLoc('');
    setEvRec('none');
    setFormError('');
    setEventModalOpen(true);
  };

  const openEditEvent = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    setEvTitle(ev.title);
    setEvDesc(ev.description);
    setEvDate(ev.date);
    setEvStart(ev.startTime);
    setEvEnd(ev.endTime);
    setEvCat(ev.category);
    setEvColor(ev.color);
    setEvLoc(ev.location);
    setEvRec(ev.recurrence);
    setFormError('');
    setEventModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evTitle.trim() || !evDate) {
      setFormError('Event title and date are required.');
      return;
    }
    const payload = {
      title: evTitle.trim(),
      description: evDesc,
      date: evDate,
      startTime: evStart,
      endTime: evEnd,
      category: evCat,
      color: evColor,
      location: evLoc,
      recurrence: evRec,
    };
    if (editingEvent) {
      await api.put(`/api/events/${editingEvent.id}`, payload);
    } else {
      await api.post('/api/events', payload);
    }
    setEventModalOpen(false);
    setSelectedDate(evDate);
    await onRefresh();
  };

  const handleDeleteEvent = async (id: string) => {
    await api.del(`/api/events/${id}`);
    await onRefresh();
  };

  const handleDropOnDate = async (targetDate: string) => {
    if (!dragPayload) return;
    if (dragPayload.kind === 'event') {
      const ev = data.events.find((x) => x.id === dragPayload.id);
      if (ev && ev.date !== targetDate) {
        await api.put(`/api/events/${ev.id}`, { ...ev, date: targetDate });
        await onRefresh();
      }
    } else if (dragPayload.kind === 'task') {
      const t = data.tasks.find((x) => x.id === dragPayload.id);
      if (t && t.dueDate !== targetDate) {
        await api.put(`/api/tasks/${t.id}`, { ...t, dueDate: targetDate });
        await onRefresh();
      }
    }
    setDragPayload(null);
    setSelectedDate(targetDate);
  };

  const getItemsForCell = (dateStr: string) => {
    const evs = data.events.filter((e) => e.date === dateStr);
    const tsks = data.tasks.filter((t) => t.dueDate === dateStr);
    const rtns = data.routines.filter((r) => doesRoutineOccurOnDate(r, dateStr));
    return { evs, tsks, rtns };
  };

  const yearsOptions = Array.from({ length: 11 }, (_, i) => initY - 5 + i);

  return (
    <div className="max-md:flex-1 max-md:min-h-0 max-md:flex max-md:flex-col max-md:gap-1.5 space-y-3 sm:space-y-5 max-md:space-y-0">
      {/* Header & Controls */}
      <div className="flex flex-row items-center justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="hidden sm:block text-xs text-[var(--text-secondary)] mt-0.5">
            Dynamic date-linked schedule in {data.settings.timezone}. Drag events or tasks onto any date.
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <a
            href="/api/calendar/export.ics"
            aria-label="Export .ICS calendar"
            className="glass-button px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-medium flex items-center gap-1.5 min-h-[36px] sm:min-h-[40px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export .ICS</span>
          </a>
          <button
            type="button"
            onClick={() => openCreateEvent(selectedDate)}
            className="glass-button-primary px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold flex items-center gap-1.5 min-h-[36px] sm:min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* View Switcher & Date Navigation */}
      <div className="glass p-1.5 sm:p-3 flex flex-col md:flex-row md:items-center justify-between gap-1.5 sm:gap-3 shrink-0">
        <div className="flex items-center justify-between sm:justify-start gap-1 sm:gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigateMonth(-1)}
              aria-label="Previous month"
              className="glass-button w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={jumpToToday}
              className="glass-button px-2.5 sm:px-3 h-8 sm:h-9 text-[11px] sm:text-xs font-semibold shrink-0"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => navigateMonth(1)}
              aria-label="Next month"
              className="glass-button w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <GlassSelect
              value={String(cursorMonth)}
              onChange={(val) => setCursorMonth(Number(val))}
              ariaLabel="Select month"
              className="px-2 sm:px-3 h-8 sm:h-9 text-[11px] sm:text-xs font-semibold"
              options={MONTHS.map((m, idx) => ({ value: String(idx), label: m.slice(0, 3) }))}
            />

            <GlassSelect
              value={String(cursorYear)}
              onChange={(val) => setCursorYear(Number(val))}
              ariaLabel="Select year"
              className="px-2 sm:px-3 h-8 sm:h-9 text-[11px] sm:text-xs font-semibold font-mono-num"
              options={yearsOptions.map((y) => ({ value: String(y), label: String(y) }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 sm:flex items-center gap-1 overflow-x-auto no-scrollbar">
          {(['Month', 'Week', 'Day', 'Agenda', 'Year'] as CalViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-medium whitespace-nowrap shrink-0 ${
                mode === 'Agenda' || mode === 'Year' ? 'hidden sm:inline-flex' : ''
              } ${
                viewMode === mode
                  ? 'glass-button-primary text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split: Calendar Canvas + Selected Date Inspector */}
      <div className="max-md:flex-1 max-md:min-h-0 max-md:flex max-md:flex-col max-md:gap-2 md:grid md:grid-cols-1 xl:grid-cols-12 md:gap-5 items-start">
        <div className="w-full xl:col-span-8 glass p-2 sm:p-5 max-md:shrink-0">
          {viewMode === 'Month' && (
            <div className="space-y-1 sm:space-y-2">
              <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] sm:text-[11px] font-semibold text-[var(--text-secondary)] pb-0.5">
                {weekDaysHeader.map((d) => (
                  <div key={d}>
                    <span className="sm:hidden">{d.slice(0, 2)}</span>
                    <span className="hidden sm:inline">{d}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {monthGrid.map((cell) => {
                  const { evs, tsks, rtns } = getItemsForCell(cell.date);
                  const isToday = cell.date === data.today;
                  const isSelected = cell.date === selectedDate;
                  return (
                    <button
                      key={cell.date}
                      type="button"
                      onClick={() => setSelectedDate(cell.date)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDropOnDate(cell.date)}
                      aria-label={`Select date ${cell.date}`}
                      className={`glass-calendar-cell max-md:h-[34px] max-md:min-h-[34px] sm:min-h-[96px] p-1 sm:p-2 text-left flex flex-col justify-between overflow-hidden max-md:rounded-lg ${
                        !cell.inCurrentMonth ? 'opacity-40' : ''
                      } ${isSelected ? 'ring-2 ring-[var(--accent)] bg-white/[0.10]' : ''} ${
                        isToday ? 'border-[var(--accent)]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`font-mono-num text-[11px] sm:text-xs font-semibold leading-none ${
                            isToday ? 'text-[var(--accent)]' : ''
                          }`}
                        >
                          {cell.dayNumber}
                        </span>
                        {rtns.length > 0 && (
                          <span className="text-[10px] font-mono-num text-[var(--text-muted)] hidden sm:inline">
                            {rtns.length}r
                          </span>
                        )}
                      </div>

                      {/* Compact mobile dot indicators */}
                      <div className="sm:hidden flex flex-wrap items-center justify-center gap-0.5 w-full">
                        {evs.slice(0, 2).map((ev) => (
                          <span
                            key={ev.id}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: ev.color }}
                          />
                        ))}
                        {tsks.length > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)]" />
                        )}
                        {rtns.length > 0 && evs.length === 0 && tsks.length === 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]/60" />
                        )}
                      </div>

                      {/* Desktop / tablet event & task cards */}
                      <div className="hidden sm:block space-y-1 w-full mt-1">
                        {evs.slice(0, 2).map((ev) => (
                          <div
                            key={ev.id}
                            draggable
                            onDragStart={() => setDragPayload({ kind: 'event', id: ev.id })}
                            className="text-[10px] truncate px-1.5 py-0.5 rounded-md font-medium"
                            style={{
                              backgroundColor: `${ev.color}26`,
                              borderLeft: `2px solid ${ev.color}`,
                            }}
                          >
                            {ev.title}
                          </div>
                        ))}
                        {tsks.slice(0, 1).map((t) => (
                          <div
                            key={t.id}
                            draggable
                            onDragStart={() => setDragPayload({ kind: 'task', id: t.id })}
                            className="text-[10px] truncate px-1.5 py-0.5 rounded-md bg-white/[0.06] text-[var(--text-secondary)]"
                          >
                            {t.title}
                          </div>
                        ))}
                        {evs.length + tsks.length > 3 && (
                          <div className="text-[10px] text-[var(--text-muted)] font-mono-num">
                            +{evs.length + tsks.length - 3} more
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'Week' && (
            <div className="max-md:max-h-[210px] max-md:overflow-y-auto grid grid-cols-2 sm:grid-cols-7 gap-2">
              {weekDates.map((d) => {
                const { evs, tsks } = getItemsForCell(d);
                const isSelected = d === selectedDate;
                return (
                  <div
                    key={d}
                    onClick={() => setSelectedDate(d)}
                    className={`glass-calendar-cell p-2.5 sm:p-3 cursor-pointer space-y-1.5 ${
                      isSelected ? 'ring-2 ring-[var(--accent)]' : ''
                    }`}
                  >
                    <div className="font-mono-num text-xs font-semibold">
                      {formatDateReadable(d, 'MMM D, YYYY').replace(/, \d{4}$/, '')}
                    </div>
                    <div className="space-y-1">
                      {evs.slice(0, 2).map((e) => (
                        <div key={e.id} className="text-[11px] p-1 rounded-lg bg-white/[0.06] truncate">
                          {formatTimeDisplay(e.startTime, data.settings.timeFormat)} {e.title}
                        </div>
                      ))}
                      {tsks.slice(0, 2).map((t) => (
                        <div key={t.id} className="text-[11px] p-1 rounded-lg bg-white/[0.04] truncate text-[var(--text-secondary)]">
                          {t.title}
                        </div>
                      ))}
                      {evs.length === 0 && tsks.length === 0 && (
                        <div className="text-[11px] text-[var(--text-muted)]">Open day</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === 'Day' && (
            <div className="max-md:max-h-[220px] max-md:overflow-y-auto space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm sm:text-base font-semibold">
                  {formatDateReadable(selectedDate, data.settings.dateFormat)}
                </h2>
                <button
                  type="button"
                  onClick={() => openCreateEvent(selectedDate)}
                  className="glass-button px-3 py-1.5 text-xs"
                >
                  + Add Event
                </button>
              </div>
              {dayDetails && (
                <div className="divide-y divide-[var(--glass-border-subtle)]">
                  {dayDetails.events.map((ev) => (
                    <div key={ev.id} className="py-2.5 flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{ev.title}</div>
                        <div className="text-xs text-[var(--text-secondary)] font-mono-num">
                          {formatTimeDisplay(ev.startTime, data.settings.timeFormat)} –{' '}
                          {formatTimeDisplay(ev.endTime, data.settings.timeFormat)} · {ev.category}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openEditEvent(ev)}
                        className="glass-button p-2 shrink-0"
                        aria-label={`Edit ${ev.title}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {dayDetails.routines.map((r) => (
                    <div key={r.id} className="py-2.5 flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{r.title}</div>
                        <div className="text-xs text-[var(--text-secondary)] font-mono-num">
                          {formatTimeDisplay(r.startTime, data.settings.timeFormat)} –{' '}
                          {formatTimeDisplay(r.endTime, data.settings.timeFormat)} · Routine ({r.occurrenceStatus})
                        </div>
                      </div>
                    </div>
                  ))}
                  {dayDetails.events.length === 0 && dayDetails.routines.length === 0 && (
                    <p className="text-xs text-[var(--text-muted)] py-4 text-center">No events or routines on this day.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {viewMode === 'Agenda' && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold">Upcoming Agenda</h2>
              {data.events.filter((e) => e.date >= selectedDate).length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-6 text-center">
                  No events from {selectedDate} onward.
                </p>
              ) : (
                data.events
                  .filter((e) => e.date >= selectedDate)
                  .map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3.5 rounded-2xl border border-[var(--glass-border-subtle)] flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-sm font-semibold">{ev.title}</div>
                        <div className="text-xs text-[var(--text-secondary)] font-mono-num mt-0.5">
                          {formatDateReadable(ev.date, data.settings.dateFormat)} ·{' '}
                          {formatTimeDisplay(ev.startTime, data.settings.timeFormat)} –{' '}
                          {formatTimeDisplay(ev.endTime, data.settings.timeFormat)} · {ev.category}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditEvent(ev)}
                          aria-label={`Edit ${ev.title}`}
                          className="glass-button p-2"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(ev.id)}
                          aria-label={`Delete ${ev.title}`}
                          className="glass-button p-2 text-[var(--danger)]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}

          {viewMode === 'Year' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {MONTHS.map((mName, mIdx) => {
                const prefix = `${cursorYear}-${String(mIdx + 1).padStart(2, '0')}`;
                const evCount = data.events.filter((e) => e.date.startsWith(prefix)).length;
                const taskCount = data.tasks.filter((t) => t.dueDate.startsWith(prefix)).length;
                return (
                  <button
                    key={mName}
                    type="button"
                    onClick={() => {
                      setCursorMonth(mIdx);
                      setViewMode('Month');
                    }}
                    className={`glass-calendar-cell p-3.5 text-left space-y-1.5 ${
                      cursorMonth === mIdx ? 'ring-1 ring-[var(--accent)]' : ''
                    }`}
                  >
                    <div className="text-sm font-semibold">{mName}</div>
                    <div className="text-xs text-[var(--text-secondary)] font-mono-num">
                      {evCount} events · {taskCount} tasks
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Date Real Records Summary Panel (Scrolls smoothly inside available height on Mobile) */}
        <aside className="w-full xl:col-span-4 glass p-3 sm:p-5 max-md:flex-1 max-md:min-h-0 max-md:flex max-md:flex-col gap-2.5 sm:space-y-4">
          <div className="flex items-center justify-between gap-2 shrink-0">
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs text-[var(--text-secondary)]">Selected Date Summary</div>
              <h2 className="text-sm sm:text-lg font-bold font-mono-num truncate">
                {formatDateReadable(selectedDate, data.settings.dateFormat)}
              </h2>
            </div>
            {dayDetails && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-[var(--text-muted)] font-mono-num md:hidden">
                  {dayDetails.events.length}E · {dayDetails.tasks.length}T · {dayDetails.routines.length}R
                </span>
                <div className="text-right">
                  <div className="font-mono-num text-sm sm:text-lg font-bold text-[var(--accent)] leading-none">
                    {dayDetails.productivityScore}%
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-[var(--text-muted)]">Score</div>
                </div>
              </div>
            )}
          </div>

          {loadingDay || !dayDetails ? (
            <p className="text-xs text-[var(--text-muted)] py-3">Loading date records...</p>
          ) : (
            <div className="max-md:flex-1 max-md:min-h-0 max-md:overflow-y-auto max-md:no-scrollbar space-y-3 sm:space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">
                    Events ({dayDetails.events.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => openCreateEvent(selectedDate)}
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    + Event
                  </button>
                </div>
                {dayDetails.events.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">No events on this date.</p>
                ) : (
                  <div className="space-y-2">
                    {dayDetails.events.map((ev) => (
                      <div key={ev.id} className="p-2.5 rounded-xl bg-white/[0.04] flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{ev.title}</div>
                          <div className="text-[11px] text-[var(--text-secondary)] font-mono-num">
                            {formatTimeDisplay(ev.startTime, data.settings.timeFormat)} –{' '}
                            {formatTimeDisplay(ev.endTime, data.settings.timeFormat)}
                          </div>
                          {ev.location && (
                            <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" /> {ev.location}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditEvent(ev)}
                            aria-label={`Edit ${ev.title}`}
                            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(ev.id)}
                            aria-label={`Delete ${ev.title}`}
                            className="p-1.5 text-[var(--danger)]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold text-[var(--text-secondary)] mb-2">
                  Tasks Due ({dayDetails.tasks.length})
                </div>
                {dayDetails.tasks.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">No tasks assigned to {selectedDate}.</p>
                ) : (
                  <div className="space-y-1.5">
                    {dayDetails.tasks.map((t) => (
                      <div key={t.id} className="p-2 rounded-xl bg-white/[0.04] flex items-center justify-between text-xs gap-2">
                        <span className={t.status === 'Completed' ? 'line-through text-[var(--text-muted)] truncate' : 'truncate'}>
                          {t.title}
                        </span>
                        <span className="text-[11px] text-[var(--text-secondary)] shrink-0">
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold text-[var(--text-secondary)] mb-2">
                  Routines ({dayDetails.routines.length})
                </div>
                <div className="space-y-1.5">
                  {dayDetails.routines.map((r) => (
                    <div key={r.id} className="p-2 rounded-xl bg-white/[0.04] flex items-center justify-between text-xs gap-2">
                      <span className="truncate">{r.title}</span>
                      <span
                        className={`text-[11px] capitalize shrink-0 ${
                          r.occurrenceStatus === 'completed'
                            ? 'text-[var(--success)]'
                            : r.occurrenceStatus === 'skipped'
                              ? 'text-[var(--warning)]'
                              : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {r.occurrenceStatus}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {(dayDetails.studySessions.length > 0 || dayDetails.workSessions.length > 0) && (
                <div className="pt-2 border-t border-[var(--glass-border-subtle)] text-xs text-[var(--text-secondary)]">
                  Study:{' '}
                  <span className="font-mono-num">
                    {dayDetails.studySessions.reduce((s, x) => s + x.durationMinutes, 0)}m
                  </span>{' '}
                  · Work:{' '}
                  <span className="font-mono-num">
                    {dayDetails.workSessions.reduce((s, x) => s + x.durationMinutes, 0)}m
                  </span>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* Add / Edit Event Modal */}
      <GlassModal
        open={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        title={editingEvent ? 'Edit Event' : 'Add Calendar Event'}
        subtitle="Events are saved persistently and included in .ICS calendar exports"
      >
        <form onSubmit={handleSaveEvent} className="space-y-4">
          {formError && <p className="text-xs text-[var(--danger)]">{formError}</p>}
          <div>
            <label htmlFor="ev-title" className="block text-xs font-medium mb-1.5">
              Event Title *
            </label>
            <input
              id="ev-title"
              value={evTitle}
              onChange={(e) => setEvTitle(e.target.value)}
              placeholder="e.g., Study Group Session"
              className="glass-input w-full px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="ev-date" className="block text-xs font-medium mb-1.5">
                Date *
              </label>
              <input
                id="ev-date"
                type="date"
                value={evDate}
                onChange={(e) => setEvDate(e.target.value)}
                className="glass-input w-full px-3 py-2.5 text-sm font-mono-num"
              />
            </div>
            <div>
              <label htmlFor="ev-start" className="block text-xs font-medium mb-1.5">
                Start
              </label>
              <input
                id="ev-start"
                type="time"
                value={evStart}
                onChange={(e) => setEvStart(e.target.value)}
                className="glass-input w-full px-3 py-2.5 text-sm font-mono-num"
              />
            </div>
            <div>
              <label htmlFor="ev-end" className="block text-xs font-medium mb-1.5">
                End
              </label>
              <input
                id="ev-end"
                type="time"
                value={evEnd}
                onChange={(e) => setEvEnd(e.target.value)}
                className="glass-input w-full px-3 py-2.5 text-sm font-mono-num"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="ev-cat" className="block text-xs font-medium mb-1.5">
                Category
              </label>
              <GlassSelect
                id="ev-cat"
                value={evCat}
                onChange={(val) => setEvCat(val as Category)}
                ariaLabel="Event category"
                className="w-full px-3 py-2.5 text-sm"
                options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
            </div>
            <div>
              <label htmlFor="ev-loc" className="block text-xs font-medium mb-1.5">
                Location
              </label>
              <input
                id="ev-loc"
                value={evLoc}
                onChange={(e) => setEvLoc(e.target.value)}
                placeholder="Home / Office / Online"
                className="glass-input w-full px-3 py-2.5 text-sm"
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium mb-1.5">Event Accent Color</span>
            <div className="flex gap-2">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEvColor(c)}
                  aria-label={`Select color ${c}`}
                  className={`w-8 h-8 rounded-full border-2 ${
                    evColor === c ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="ev-desc" className="block text-xs font-medium mb-1.5">
              Description
            </label>
            <textarea
              id="ev-desc"
              rows={2}
              value={evDesc}
              onChange={(e) => setEvDesc(e.target.value)}
              className="glass-input w-full px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEventModalOpen(false)} className="glass-button px-4 py-2 text-xs">
              Cancel
            </button>
            <button type="submit" className="glass-button-primary px-5 py-2 text-xs font-semibold">
              {editingEvent ? 'Update Event' : 'Save Event'}
            </button>
          </div>
        </form>
      </GlassModal>
    </div>
  );
};
