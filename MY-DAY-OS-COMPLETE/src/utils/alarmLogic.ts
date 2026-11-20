import type { Alarm } from '../types';

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getIntervalScheduleTimes(
  startTime: string,
  endTime: string,
  intervalMinutes: number
): string[] {
  const step = Math.max(15, intervalMinutes || 60);
  const start = timeToMinutes(startTime || '08:00');
  const end = timeToMinutes(endTime || '21:00');
  if (end < start) return [minutesToTime(start)];
  const times: string[] = [];
  for (let t = start; t <= end; t += step) {
    times.push(minutesToTime(t));
  }
  return times;
}

export function doesAlarmMatchDay(alarm: Alarm, dayOfWeek: number): boolean {
  if (!alarm.enabled) return false;
  switch (alarm.repeatMode) {
    case 'daily':
    case 'once':
    case 'interval':
      return true;
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case 'weekends':
      return dayOfWeek === 0 || dayOfWeek === 6;
    case 'selected_days':
      return alarm.selectedDays.includes(dayOfWeek);
    default:
      return true;
  }
}

export function shouldAlarmTriggerAt(
  alarm: Alarm,
  currentHHmm: string,
  dayOfWeek: number
): boolean {
  if (!doesAlarmMatchDay(alarm, dayOfWeek)) return false;
  if (alarm.repeatMode === 'interval') {
    const slots = getIntervalScheduleTimes(
      alarm.startTime,
      alarm.endTime,
      alarm.intervalMinutes
    );
    return slots.includes(currentHHmm);
  }
  return alarm.time === currentHHmm;
}

export interface NextAlarmOccurrence {
  alarm: Alarm;
  time: string;
  minutesUntil: number;
}

export function getNextUpcomingAlarm(
  alarms: Alarm[],
  nowHHmm: string,
  dayOfWeek: number
): NextAlarmOccurrence | null {
  const nowMin = timeToMinutes(nowHHmm);
  let best: NextAlarmOccurrence | null = null;

  for (const alarm of alarms) {
    if (!alarm.enabled) continue;
    const candidateTimes =
      alarm.repeatMode === 'interval'
        ? getIntervalScheduleTimes(alarm.startTime, alarm.endTime, alarm.intervalMinutes)
        : [alarm.time];

    for (const time of candidateTimes) {
      const targetMin = timeToMinutes(time);
      // Check today (if future or exact now) or tomorrow
      if (doesAlarmMatchDay(alarm, dayOfWeek) && targetMin >= nowMin) {
        const diff = targetMin - nowMin;
        if (!best || diff < best.minutesUntil) {
          best = { alarm, time, minutesUntil: diff };
        }
      } else {
        const tomorrowDay = (dayOfWeek + 1) % 7;
        if (doesAlarmMatchDay(alarm, tomorrowDay)) {
          const diff = 1440 - nowMin + targetMin;
          if (!best || diff < best.minutesUntil) {
            best = { alarm, time, minutesUntil: diff };
          }
        }
      }
    }
  }

  return best;
}

export function formatMinutesCountdown(minutesUntil: number): string {
  if (minutesUntil <= 0) return 'Now';
  const h = Math.floor(minutesUntil / 60);
  const m = minutesUntil % 60;
  if (h === 0) return `in ${m}m`;
  if (m === 0) return `in ${h}h`;
  return `in ${h}h ${m}m`;
}
