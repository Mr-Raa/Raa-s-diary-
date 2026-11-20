import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMasterBrainReport } from './masterBrainLogic';
import type { DayContext, WaterIntake } from '../types';

function makeContext(overrides: Partial<DayContext> = {}): DayContext {
  return {
    date: '2026-11-18',
    routines: [
      {
        id: 'r1',
        userId: 'u1',
        title: 'Morning Walk',
        description: '',
        startTime: '07:00',
        endTime: '07:30',
        date: '2026-11-18',
        category: 'Health',
        priority: 'High',
        recurrence: 'daily',
        selectedDays: [],
        reminderMinutes: 10,
        notes: '',
        sortOrder: 1,
        createdAt: '',
        updatedAt: '',
        occurrenceStatus: 'completed',
      },
      {
        id: 'r2',
        userId: 'u1',
        title: 'Deep Study',
        description: '',
        startTime: '14:00',
        endTime: '15:30',
        date: '2026-11-18',
        category: 'Study',
        priority: 'High',
        recurrence: 'daily',
        selectedDays: [],
        reminderMinutes: 10,
        notes: '',
        sortOrder: 2,
        createdAt: '',
        updatedAt: '',
        occurrenceStatus: 'pending',
      },
    ],
    tasks: [
      {
        id: 't1',
        userId: 'u1',
        title: 'Prepare Slides',
        description: '',
        dueDate: '2026-11-18',
        dueTime: '11:00',
        category: 'Work',
        priority: 'Urgent',
        status: 'Not Started',
        recurrence: 'none',
        reminderMinutes: 15,
        notes: '',
        subtasks: [],
        createdAt: '',
        updatedAt: '',
      },
    ],
    overdueTasks: [],
    events: [],
    studySessions: [],
    workSessions: [],
    focusSessions: [
      {
        id: 'f1',
        userId: 'u1',
        date: '2026-11-18',
        mode: 'pomodoro',
        plannedMinutes: 25,
        actualMinutes: 25,
        linkedType: 'none',
        linkedId: '',
        linkedTitle: '',
        startedAt: '',
        endedAt: '',
      },
    ],
    journal: null,
    diaryLogs: [],
    trackerEntries: [],
    notes: [],
    waterIntake: {
      date: '2026-11-18',
      totalMl: 1000,
      goalMl: 2500,
      glasses: 4,
      targetGlasses: 10,
      entries: [],
    },
    habits: [
      {
        id: 'h1',
        userId: 'u1',
        title: 'Read 10 pages',
        category: 'Learning',
        weeklyTarget: 7,
        notes: '',
        entries: [{ id: 'he1', habitId: 'h1', date: '2026-11-18', completed: true, notes: '' }],
        createdAt: '',
        updatedAt: '',
      },
    ],
    productivityScore: 42,
    ...overrides,
  };
}

test('computeMasterBrainReport calculates 4 pillars and prioritizes overdue recovery when present', () => {
  const ctx = makeContext({
    overdueTasks: [
      {
        id: 'old1',
        userId: 'u1',
        title: 'Submit Tax Form',
        description: '',
        dueDate: '2026-11-16',
        dueTime: '10:00',
        category: 'Personal',
        priority: 'High',
        status: 'Not Started',
        recurrence: 'none',
        reminderMinutes: 15,
        notes: '',
        subtasks: [],
        createdAt: '',
        updatedAt: '',
      },
    ],
  });

  const water: WaterIntake = {
    date: '2026-11-18',
    totalMl: 1000,
    goalMl: 2500,
    glasses: 4,
    targetGlasses: 10,
    entries: [],
  };

  const report = computeMasterBrainReport({
    today: '2026-11-18',
    currentHHmm: '10:00',
    dayContext: ctx,
    waterIntake: water,
    dailyFocusGoalMinutes: 100,
    goals: [],
    alarms: [],
  });

  assert.equal(report.pillars.length, 4);
  assert.ok(report.readinessScore >= 0 && report.readinessScore <= 100);
  assert.ok(report.topPriorityTitle.includes('Overdue'));
  assert.ok(report.actions.some((a) => a.kind === 'reschedule_overdue_today'));
  assert.ok(report.actions.some((a) => a.kind === 'log_water_250'));
});

test('computeMasterBrainReport awards Peak Flow when daily goals are achieved', () => {
  const ctx = makeContext({
    routines: [
      {
        ...makeContext().routines[0],
        occurrenceStatus: 'completed',
      },
    ],
    tasks: [
      {
        ...makeContext().tasks[0],
        status: 'Completed',
      },
    ],
    focusSessions: [
      {
        id: 'f2',
        userId: 'u1',
        date: '2026-11-18',
        mode: 'pomodoro',
        plannedMinutes: 120,
        actualMinutes: 120,
        linkedType: 'none',
        linkedId: '',
        linkedTitle: '',
        startedAt: '',
        endedAt: '',
      },
    ],
    diaryLogs: [
      {
        id: 'd1',
        userId: 'u1',
        date: '2026-11-18',
        entryTime: '18:00',
        title: 'Great day',
        activity: 'Finished everything',
        category: 'Personal',
        mood: 'Happy',
        energy: 5,
        createdAt: '',
        updatedAt: '',
      },
    ],
  });

  const report = computeMasterBrainReport({
    today: '2026-11-18',
    currentHHmm: '19:00',
    dayContext: ctx,
    waterIntake: {
      date: '2026-11-18',
      totalMl: 2500,
      goalMl: 2500,
      glasses: 10,
      targetGlasses: 10,
      entries: [],
    },
    dailyFocusGoalMinutes: 120,
    goals: [],
    alarms: [],
  });

  assert.equal(report.readinessScore, 100);
  assert.equal(report.statusLabel, 'Peak Flow');
  assert.ok(!report.actions.some((a) => a.kind === 'log_water_250'));
});
