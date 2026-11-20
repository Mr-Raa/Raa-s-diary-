import test from 'node:test';
import assert from 'node:assert/strict';
import type { FocusSession } from '../types';
import {
  calculateMinutesToLog,
  calculateProgressRing,
  computeFocusStats,
  formatCountdown,
  getModeDurationMinutes,
  getNextPomodoroPhase,
} from './focusLogic';

test('formatCountdown formats minutes and seconds cleanly', () => {
  assert.equal(formatCountdown(1500), '25:00');
  assert.equal(formatCountdown(65), '01:05');
  assert.equal(formatCountdown(0), '00:00');
  assert.equal(formatCountdown(-10), '00:00');
});

test('getModeDurationMinutes resolves presets and clamps custom durations', () => {
  assert.equal(getModeDurationMinutes('pomodoro', 40), 25);
  assert.equal(getModeDurationMinutes('short_break', 40), 5);
  assert.equal(getModeDurationMinutes('long_break', 40), 15);
  assert.equal(getModeDurationMinutes('custom', 50), 50);
  assert.equal(getModeDurationMinutes('custom', 0), 25);
  assert.equal(getModeDurationMinutes('custom', 300), 180);
});

test('calculateProgressRing computes smooth ring progress and percent complete', () => {
  const start = calculateProgressRing(1500, 1500);
  assert.equal(start.progressFraction, 1);
  assert.equal(start.percentComplete, 0);

  const half = calculateProgressRing(750, 1500);
  assert.equal(half.progressFraction, 0.5);
  assert.equal(half.percentComplete, 50);

  const done = calculateProgressRing(0, 1500);
  assert.equal(done.progressFraction, 0);
  assert.equal(done.percentComplete, 100);
});

test('calculateMinutesToLog logs actual elapsed minutes or full planned duration when finished', () => {
  assert.equal(calculateMinutesToLog(25, 0, 25), 25);
  assert.equal(calculateMinutesToLog(25, 15 * 60), 10);
  // If user clicks Log & Finish right at the start (<30s elapsed), uses planned duration
  assert.equal(calculateMinutesToLog(25, 25 * 60), 25);
});

test('getNextPomodoroPhase cycles 4 pomodoros into long_break cleanly', () => {
  const p1 = getNextPomodoroPhase('pomodoro', 0, 4);
  assert.deepEqual(p1, { nextMode: 'short_break', nextCycleCount: 1 });

  const b1 = getNextPomodoroPhase('short_break', 1, 4);
  assert.deepEqual(b1, { nextMode: 'pomodoro', nextCycleCount: 1 });

  const p4 = getNextPomodoroPhase('pomodoro', 3, 4);
  assert.deepEqual(p4, { nextMode: 'long_break', nextCycleCount: 0 });

  const lb = getNextPomodoroPhase('long_break', 0, 4);
  assert.deepEqual(lb, { nextMode: 'pomodoro', nextCycleCount: 0 });
});

test('computeFocusStats computes today focus minutes, pomodoros, and consecutive streak', () => {
  const sessions: FocusSession[] = [
    {
      id: '1',
      userId: 'u1',
      date: '2026-11-16',
      mode: 'pomodoro',
      plannedMinutes: 25,
      actualMinutes: 25,
      linkedType: 'none',
      linkedId: '',
      linkedTitle: '',
      startedAt: '2026-11-16T09:00:00Z',
      endedAt: '2026-11-16T09:25:00Z',
    },
    {
      id: '2',
      userId: 'u1',
      date: '2026-11-16',
      mode: 'short_break',
      plannedMinutes: 5,
      actualMinutes: 5,
      linkedType: 'none',
      linkedId: '',
      linkedTitle: '',
      startedAt: '2026-11-16T09:25:00Z',
      endedAt: '2026-11-16T09:30:00Z',
    },
    {
      id: '3',
      userId: 'u1',
      date: '2026-11-15',
      mode: 'custom',
      plannedMinutes: 50,
      actualMinutes: 50,
      linkedType: 'study',
      linkedId: 's1',
      linkedTitle: 'Algorithms',
      startedAt: '2026-11-15T14:00:00Z',
      endedAt: '2026-11-15T14:50:00Z',
    },
  ];

  const stats = computeFocusStats(sessions, '2026-11-16');
  assert.equal(stats.todayMinutes, 30);
  assert.equal(stats.todayPomodoros, 1);
  assert.equal(stats.totalMinutes, 80);
  assert.equal(stats.streakDays, 2);
});
