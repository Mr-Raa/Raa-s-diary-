import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCategoryDistribution,
  buildDateRangeAnalytics,
  calculateHabitStreak,
  computeDailyProductivityScore,
} from './analyticsLogic';
import type { Habit, Routine, Task } from '../types';

test('computeDailyProductivityScore computes weighted score from real records', () => {
  assert.equal(
    computeDailyProductivityScore({
      routinesTotal: 4,
      routinesCompleted: 4,
      tasksTotal: 2,
      tasksCompleted: 2,
      focusMinutes: 90,
      habitsDone: 2,
      habitsTotal: 2,
    }),
    100
  );

  assert.equal(
    computeDailyProductivityScore({
      routinesTotal: 0,
      routinesCompleted: 0,
      tasksTotal: 0,
      tasksCompleted: 0,
      focusMinutes: 0,
      habitsDone: 0,
      habitsTotal: 0,
    }),
    0
  );
});

test('calculateHabitStreak counts consecutive completed days up to today or yesterday', () => {
  const habit: Habit = {
    id: 'h1',
    userId: 'u1',
    title: 'Hydration',
    category: 'Health',
    weeklyTarget: 7,
    notes: '',
    createdAt: '',
    updatedAt: '',
    entries: [
      { id: 'e1', habitId: 'h1', date: '2026-11-13', completed: true, notes: '' },
      { id: 'e2', habitId: 'h1', date: '2026-11-14', completed: true, notes: '' },
      { id: 'e3', habitId: 'h1', date: '2026-11-15', completed: true, notes: '' },
    ],
  };
  assert.equal(calculateHabitStreak(habit, '2026-11-15'), 3);
  assert.equal(calculateHabitStreak(habit, '2026-11-16'), 3);
  assert.equal(calculateHabitStreak(habit, '2026-11-17'), 0);
});

test('buildDateRangeAnalytics keeps date-specific history isolated per date', () => {
  const routines: Routine[] = [
    {
      id: 'r1',
      userId: 'u1',
      title: 'Morning Walk',
      description: '',
      startTime: '06:30',
      endTime: '07:00',
      date: '2026-11-10',
      category: 'Health',
      priority: 'Medium',
      recurrence: 'daily',
      selectedDays: [],
      reminderMinutes: 10,
      notes: '',
      sortOrder: 0,
      createdAt: '',
      updatedAt: '',
    },
  ];
  const tasks: Task[] = [
    {
      id: 't1',
      userId: 'u1',
      title: 'Yesterday Task',
      description: '',
      dueDate: '2026-11-14',
      dueTime: '10:00',
      category: 'Work',
      priority: 'High',
      status: 'Completed',
      recurrence: 'none',
      reminderMinutes: 15,
      notes: '',
      subtasks: [],
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 't2',
      userId: 'u1',
      title: 'Today Task',
      description: '',
      dueDate: '2026-11-15',
      dueTime: '11:00',
      category: 'Study',
      priority: 'Medium',
      status: 'Not Started',
      recurrence: 'none',
      reminderMinutes: 15,
      notes: '',
      subtasks: [],
      createdAt: '',
      updatedAt: '',
    },
  ];

  const series = buildDateRangeAnalytics({
    endDate: '2026-11-15',
    daysCount: 2,
    routines,
    routineOccurrences: [{ routineId: 'r1', date: '2026-11-14', status: 'completed' }],
    tasks,
    studySessions: [{ id: 's1', userId: 'u1', subjectId: 'sub1', date: '2026-11-15', durationMinutes: 45, topic: 'Ch 1', notes: '', createdAt: '' }],
    workSessions: [],
    focusSessions: [],
    habits: [],
  });

  assert.equal(series.length, 2);
  assert.equal(series[0].date, '2026-11-14');
  assert.equal(series[0].routinesCompleted, 1);
  assert.equal(series[0].tasksCompleted, 1);
  assert.equal(series[1].date, '2026-11-15');
  assert.equal(series[1].routinesCompleted, 0);
  assert.equal(series[1].tasksCompleted, 0);
  assert.equal(series[1].studyMinutes, 45);
});

test('buildCategoryDistribution summarizes categories accurately', () => {
  const dist = buildCategoryDistribution(
    [
      {
        id: 't1',
        userId: 'u1',
        title: 'A',
        description: '',
        dueDate: '2026-11-15',
        dueTime: '',
        category: 'Study',
        priority: 'Medium',
        status: 'Not Started',
        recurrence: 'none',
        reminderMinutes: 0,
        notes: '',
        subtasks: [],
        createdAt: '',
        updatedAt: '',
      },
    ],
    [
      {
        id: 'r1',
        userId: 'u1',
        title: 'B',
        description: '',
        startTime: '07:00',
        endTime: '07:30',
        date: '2026-11-15',
        category: 'Health',
        priority: 'Low',
        recurrence: 'daily',
        selectedDays: [],
        reminderMinutes: 0,
        notes: '',
        sortOrder: 0,
        createdAt: '',
        updatedAt: '',
      },
    ]
  );
  assert.equal(dist.length, 2);
  assert.equal(dist[0].percent, 50);
});
