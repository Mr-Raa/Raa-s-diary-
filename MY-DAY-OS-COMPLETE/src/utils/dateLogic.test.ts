import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  detectScheduleConflicts,
  doesRoutineOccurOnDate,
  getCalendarMonthGrid,
  getTimePeriod,
  getWeekDates,
} from './dateLogic';

test('getCalendarMonthGrid generates dynamic month grids without hardcoded months', () => {
  const feb2024 = getCalendarMonthGrid(2024, 1, 1); // Feb 2024 leap year
  assert.ok(feb2024.some((c) => c.date === '2024-02-29' && c.inCurrentMonth));
  assert.equal(feb2024.length % 7, 0);

  const nov2026 = getCalendarMonthGrid(2026, 10, 0); // Nov 2026 Sunday start
  assert.equal(nov2026[0].date, '2026-11-01');
  assert.ok(nov2026.some((c) => c.date === '2026-11-30' && c.inCurrentMonth));
});

test('getWeekDates returns 7 consecutive dates starting on configured weekday', () => {
  const weekMon = getWeekDates('2026-11-15', 1); // Sunday -> Mon Nov 9 .. Sun Nov 15
  assert.equal(weekMon.length, 7);
  assert.equal(weekMon[0], '2026-11-09');
  assert.equal(weekMon[6], '2026-11-15');
});

test('doesRoutineOccurOnDate respects start date, end date, daily, weekly, and selected days', () => {
  const daily = { date: '2026-11-10', endDate: '2026-11-16', recurrence: 'daily' as const, selectedDays: [] };
  assert.equal(doesRoutineOccurOnDate(daily, '2026-11-09'), false);
  assert.equal(doesRoutineOccurOnDate(daily, '2026-11-15'), true);
  assert.equal(doesRoutineOccurOnDate(daily, '2026-11-17'), false);

  const selected = { date: '2026-11-01', recurrence: 'selected_days' as const, selectedDays: [1, 3, 5] }; // Mon, Wed, Fri
  assert.equal(doesRoutineOccurOnDate(selected, '2026-11-16'), true); // Monday
  assert.equal(doesRoutineOccurOnDate(selected, '2026-11-15'), false); // Sunday
});

test('getTimePeriod categorizes Morning, Afternoon, Evening, Night accurately', () => {
  assert.equal(getTimePeriod('06:30'), 'Morning');
  assert.equal(getTimePeriod('13:15'), 'Afternoon');
  assert.equal(getTimePeriod('18:45'), 'Evening');
  assert.equal(getTimePeriod('22:00'), 'Night');
});

test('detectScheduleConflicts identifies overlapping time blocks', () => {
  const conflicts = detectScheduleConflicts([
    { title: 'Deep Work', startTime: '09:00', endTime: '11:00' },
    { title: 'Team Sync', startTime: '10:30', endTime: '11:30' },
    { title: 'Lunch', startTime: '12:00', endTime: '13:00' },
  ]);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].firstTitle, 'Deep Work');
  assert.equal(conflicts[0].secondTitle, 'Team Sync');
  assert.equal(conflicts[0].overlapWindow, '10:30 – 11:00');
});

test('addDays handles month and year boundaries', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});
