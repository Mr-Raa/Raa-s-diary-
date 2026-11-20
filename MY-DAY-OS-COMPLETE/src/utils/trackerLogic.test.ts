import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDailyTrackerSummaries, findCurrentAndNextRoutine } from './trackerLogic';
import type { Routine, TrackerEntry } from '../types';

test('buildDailyTrackerSummaries sums additive trackers and isolates dates', () => {
  const entries: TrackerEntry[] = [
    {
      id: 't1',
      userId: 'u',
      trackerKey: 'sleep',
      date: '2026-11-16',
      time: '07:00',
      valueNumber: 7.5,
      unit: 'hrs',
      label: 'Deep Rest',
      notes: '',
      createdAt: '',
    },
    {
      id: 't2',
      userId: 'u',
      trackerKey: 'sleep',
      date: '2026-11-15',
      time: '07:00',
      valueNumber: 6,
      unit: 'hrs',
      label: 'Yesterday',
      notes: '',
      createdAt: '',
    },
    {
      id: 't3',
      userId: 'u',
      trackerKey: 'steps',
      date: '2026-11-16',
      time: '12:00',
      valueNumber: 4000,
      unit: 'steps',
      label: 'Walk',
      notes: '',
      createdAt: '',
    },
    {
      id: 't4',
      userId: 'u',
      trackerKey: 'mood',
      date: '2026-11-16',
      time: '09:00',
      valueNumber: 3,
      unit: '/5',
      label: 'Steady',
      notes: '',
      createdAt: '',
    },
    {
      id: 't5',
      userId: 'u',
      trackerKey: 'mood',
      date: '2026-11-16',
      time: '14:00',
      valueNumber: 5,
      unit: '/5',
      label: 'Energized',
      notes: '',
      createdAt: '',
    },
  ];

  const cards = buildDailyTrackerSummaries(
    entries,
    [
      {
        id: 'ct_1',
        userId: 'u',
        name: 'Reading',
        unit: 'pages',
        dailyTarget: 20,
        icon: 'book',
        color: '#43DDF5',
        createdAt: '',
      },
    ],
    '2026-11-16'
  );

  const sleepCard = cards.find((c) => c.key === 'sleep')!;
  const stepsCard = cards.find((c) => c.key === 'steps')!;
  const moodCard = cards.find((c) => c.key === 'mood')!;
  const customCard = cards.find((c) => c.key === 'ct_1')!;

  assert.equal(sleepCard.currentValue, 7.5);
  assert.equal(stepsCard.currentValue, 4000);
  assert.equal(stepsCard.percent, 50);
  assert.equal(moodCard.currentValue, 5);
  assert.equal(moodCard.latestLabel, 'Energized');
  assert.equal(customCard.name, 'Reading');
  assert.equal(customCard.currentValue, 0);
});

test('findCurrentAndNextRoutine picks active time block and upcoming next activity', () => {
  const sample: Routine[] = [
    {
      id: 'r1',
      userId: 'u',
      title: 'Morning Walk',
      description: '',
      startTime: '06:30',
      endTime: '07:15',
      date: '2026-11-16',
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
      userId: 'u',
      title: 'Deep Work',
      description: '',
      startTime: '11:00',
      endTime: '13:00',
      date: '2026-11-16',
      category: 'Work',
      priority: 'Urgent',
      recurrence: 'daily',
      selectedDays: [],
      reminderMinutes: 10,
      notes: '',
      sortOrder: 2,
      createdAt: '',
      updatedAt: '',
      occurrenceStatus: 'pending',
    },
    {
      id: 'r3',
      userId: 'u',
      title: 'Evening Mobility',
      description: '',
      startTime: '17:30',
      endTime: '18:15',
      date: '2026-11-16',
      category: 'Exercise',
      priority: 'Medium',
      recurrence: 'daily',
      selectedDays: [],
      reminderMinutes: 10,
      notes: '',
      sortOrder: 3,
      createdAt: '',
      updatedAt: '',
      occurrenceStatus: 'pending',
    },
  ];

  const { current, next } = findCurrentAndNextRoutine(sample, '11:45');
  assert.equal(current?.id, 'r2');
  assert.equal(next?.id, 'r3');
});

import { getRoutineTimeDeltaLabel } from './trackerLogic';

test('getRoutineTimeDeltaLabel formats remaining and upcoming countdowns cleanly', () => {
  assert.equal(getRoutineTimeDeltaLabel('11:00', '13:00', '11:45', true), '1h 15m left');
  assert.equal(getRoutineTimeDeltaLabel('17:30', '18:15', '17:05', false), 'in 25m');
});

