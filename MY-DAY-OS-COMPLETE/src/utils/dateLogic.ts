import type { CalendarEvent, Priority, Routine, Task } from '../types';

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export function getTodayInTimezone(tz: string = DEFAULT_TIMEZONE, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

export function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function getCalendarMonthGrid(
  year: number,
  monthIndex: number, // 0..11
  weekStartsOn: 0 | 1 = 1
): Array<{ date: string; inCurrentMonth: boolean; dayNumber: number }> {
  const firstDay = new Date(Date.UTC(year, monthIndex, 1));
  const firstDow = firstDay.getUTCDay();
  const leading = (firstDow - weekStartsOn + 7) % 7;

  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const totalCells = leading + daysInMonth > 35 ? 42 : 35;

  const cells: Array<{ date: string; inCurrentMonth: boolean; dayNumber: number }> = [];
  const startDate = new Date(Date.UTC(year, monthIndex, 1 - leading));

  for (let i = 0; i < totalCells; i++) {
    const cellDate = new Date(startDate);
    cellDate.setUTCDate(startDate.getUTCDate() + i);
    const yy = cellDate.getUTCFullYear();
    const mm = cellDate.getUTCMonth();
    const dd = cellDate.getUTCDate();
    const iso = `${yy}-${String(mm + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    cells.push({
      date: iso,
      inCurrentMonth: yy === year && mm === monthIndex,
      dayNumber: dd,
    });
  }

  return cells;
}

export function getWeekDates(anchorDateStr: string, weekStartsOn: 0 | 1 = 1): string[] {
  const dow = getDayOfWeek(anchorDateStr);
  const offset = (dow - weekStartsOn + 7) % 7;
  const start = addDays(anchorDateStr, -offset);
  return Array.from({ length: 7 }, (_, idx) => addDays(start, idx));
}

export function doesRoutineOccurOnDate(
  routine: Pick<Routine, 'date' | 'endDate' | 'recurrence' | 'selectedDays'>,
  targetDate: string
): boolean {
  if (targetDate < routine.date) return false;
  if (routine.endDate && targetDate > routine.endDate) return false;

  if (routine.recurrence === 'none') {
    return routine.date === targetDate;
  }
  if (routine.recurrence === 'daily') {
    return true;
  }
  if (routine.recurrence === 'weekly') {
    return getDayOfWeek(routine.date) === getDayOfWeek(targetDate);
  }
  if (routine.recurrence === 'selected_days') {
    const dow = getDayOfWeek(targetDate);
    return Array.isArray(routine.selectedDays) && routine.selectedDays.includes(dow);
  }
  return false;
}

export type DayPeriod = 'Morning' | 'Afternoon' | 'Evening' | 'Night';

export function getTimePeriod(timeStr: string): DayPeriod {
  const [hStr] = (timeStr || '08:00').split(':');
  const h = Number(hStr);
  if (Number.isNaN(h)) return 'Morning';
  if (h >= 5 && h < 12) return 'Morning';
  if (h >= 12 && h < 17) return 'Afternoon';
  if (h >= 17 && h < 21) return 'Evening';
  return 'Night';
}

export function formatTimeDisplay(timeStr: string, format: '12h' | '24h' = '12h'): string {
  if (!timeStr) return 'Anytime';
  const [hStr, mStr] = timeStr.split(':');
  const h = Number(hStr);
  const m = Number(mStr ?? 0);
  if (Number.isNaN(h) || Number.isNaN(m)) return timeStr;
  if (format === '24h') {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatDateReadable(
  dateStr: string,
  fmt: 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'MMM D, YYYY' = 'MMM D, YYYY'
): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  if (fmt === 'YYYY-MM-DD') return dateStr;
  if (fmt === 'DD/MM/YYYY') {
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  }
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[m - 1]} ${d}, ${y}`;
}

export function toMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export interface TimeConflict {
  firstTitle: string;
  secondTitle: string;
  overlapWindow: string;
}

export function detectScheduleConflicts(
  items: Array<{ title: string; startTime: string; endTime: string }>
): TimeConflict[] {
  const valid = items
    .filter((i) => i.startTime && i.endTime && toMinutes(i.endTime) > toMinutes(i.startTime))
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

  const conflicts: TimeConflict[] = [];
  for (let i = 0; i < valid.length - 1; i++) {
    const a = valid[i];
    const b = valid[i + 1];
    if (toMinutes(a.endTime) > toMinutes(b.startTime)) {
      conflicts.push({
        firstTitle: a.title,
        secondTitle: b.title,
        overlapWindow: `${b.startTime} – ${
          toMinutes(a.endTime) < toMinutes(b.endTime) ? a.endTime : b.endTime
        }`,
      });
    }
  }
  return conflicts;
}

export function priorityWeight(priority: Priority): number {
  switch (priority) {
    case 'Urgent':
      return 4;
    case 'High':
      return 3;
    case 'Medium':
      return 2;
    case 'Low':
      return 1;
  }
}

export function buildTimelineForDay(
  routines: Routine[],
  tasks: Task[],
  events: CalendarEvent[]
): Array<{
  id: string;
  kind: 'routine' | 'task' | 'event';
  title: string;
  time: string;
  endTime: string;
  category: string;
  priority: Priority;
  status: string;
  notes: string;
}> {
  const items = [
    ...routines.map((r) => ({
      id: r.id,
      kind: 'routine' as const,
      title: r.title,
      time: r.startTime,
      endTime: r.endTime,
      category: r.category,
      priority: r.priority,
      status: r.occurrenceStatus ?? 'pending',
      notes: r.notes || r.description,
    })),
    ...events.map((e) => ({
      id: e.id,
      kind: 'event' as const,
      title: e.title,
      time: e.startTime || '09:00',
      endTime: e.endTime || '10:00',
      category: e.category,
      priority: 'Medium' as Priority,
      status: 'scheduled',
      notes: e.location ? `${e.location}${e.description ? ' · ' + e.description : ''}` : e.description,
    })),
    ...tasks.map((t) => ({
      id: t.id,
      kind: 'task' as const,
      title: t.title,
      time: t.dueTime || '23:59',
      endTime: '',
      category: t.category,
      priority: t.priority,
      status: t.status,
      notes: t.notes || t.description,
    })),
  ];

  return items.sort((a, b) => a.time.localeCompare(b.time));
}
