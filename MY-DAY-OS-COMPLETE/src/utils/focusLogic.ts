import type { FocusSession } from '../types';
import { addDays } from './dateLogic';

export type FocusModeType = 'pomodoro' | 'custom' | 'short_break' | 'long_break';

export const FOCUS_PRESET_MINUTES: Record<Exclude<FocusModeType, 'custom'>, number> = {
  pomodoro: 25,
  short_break: 5,
  long_break: 15,
};

export function formatCountdown(secondsLeft: number): string {
  const safe = Math.max(0, Math.floor(secondsLeft));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function getModeDurationMinutes(mode: FocusModeType, customMinutes: number): number {
  if (mode === 'custom') {
    return Math.min(180, Math.max(1, Math.round(customMinutes || 25)));
  }
  return FOCUS_PRESET_MINUTES[mode];
}

export function calculateProgressRing(secondsLeft: number, totalSeconds: number): {
  progressFraction: number;
  elapsedFraction: number;
  percentComplete: number;
} {
  if (totalSeconds <= 0) {
    return { progressFraction: 0, elapsedFraction: 1, percentComplete: 100 };
  }
  const clampedLeft = Math.min(totalSeconds, Math.max(0, secondsLeft));
  const progressFraction = clampedLeft / totalSeconds;
  const elapsedFraction = 1 - progressFraction;
  const percentComplete = Math.round(elapsedFraction * 100);
  return { progressFraction, elapsedFraction, percentComplete };
}

export function calculateMinutesToLog(
  plannedMinutes: number,
  secondsLeft: number,
  overrideMins?: number
): number {
  if (typeof overrideMins === 'number' && Number.isFinite(overrideMins)) {
    return Math.max(1, Math.round(overrideMins));
  }
  const totalSeconds = Math.max(60, plannedMinutes * 60);
  const elapsedSeconds = Math.max(0, totalSeconds - Math.max(0, secondsLeft));
  if (elapsedSeconds < 30) {
    return Math.max(1, plannedMinutes);
  }
  return Math.max(1, Math.round(elapsedSeconds / 60));
}

export function getNextPomodoroPhase(
  currentMode: FocusModeType,
  completedPomodorosInCycle: number,
  cyclesBeforeLongBreak = 4
): {
  nextMode: FocusModeType;
  nextCycleCount: number;
} {
  if (currentMode === 'pomodoro' || currentMode === 'custom') {
    const nextCount = completedPomodorosInCycle + 1;
    if (nextCount >= cyclesBeforeLongBreak) {
      return { nextMode: 'long_break', nextCycleCount: 0 };
    }
    return { nextMode: 'short_break', nextCycleCount: nextCount };
  }
  return { nextMode: 'pomodoro', nextCycleCount: completedPomodorosInCycle };
}

export function computeFocusStats(sessions: FocusSession[], today: string): {
  todayMinutes: number;
  todayPomodoros: number;
  totalMinutes: number;
  streakDays: number;
} {
  let todayMinutes = 0;
  let todayPomodoros = 0;
  let totalMinutes = 0;
  const activeDates = new Set<string>();

  for (const s of sessions) {
    const mins = Number(s.actualMinutes || 0);
    totalMinutes += mins;
    if (s.mode === 'pomodoro' || s.mode === 'custom') {
      if (mins > 0) activeDates.add(s.date);
    }
    if (s.date === today) {
      todayMinutes += mins;
      if (s.mode === 'pomodoro' || s.mode === 'custom') {
        todayPomodoros += 1;
      }
    }
  }

  let streakDays = 0;
  let cursor = activeDates.has(today) ? today : addDays(today, -1);
  while (activeDates.has(cursor)) {
    streakDays += 1;
    cursor = addDays(cursor, -1);
  }

  return {
    todayMinutes,
    todayPomodoros,
    totalMinutes,
    streakDays,
  };
}
