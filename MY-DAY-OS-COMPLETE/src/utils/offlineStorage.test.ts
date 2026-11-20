import test from 'node:test';
import assert from 'node:assert/strict';
import { applyOfflineOptimisticUpdate } from './offlineStorage';
import type { BootstrapData } from '../api/client';

function getMockBootstrap(): BootstrapData {
  const mockWater = {
    date: '2026-11-20',
    glasses: 2,
    targetGlasses: 10,
    totalMl: 500,
    goalMl: 2500,
    entries: [],
  };

  return {
    user: { id: 'u1', name: 'Raa', email: 'raa@example.com', role: 'user', createdAt: '' },
    today: '2026-11-20',
    settings: {
      theme: 'dark',
      accentColor: '#6b9cff',
      glassOpacity: 0.1,
      glassBlur: 20,
      glassRadius: 20,
      fontSize: 15,
      fontStyle: 'vision',
      uiDensity: 'comfortable',
      reducedMotion: false,
      language: 'en',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      timezone: 'Asia/Kolkata',
      weekStartsOn: 1,
      startupModule: 'dashboard',
      aiModel: 'gemini-3.1-flash-lite',
      aiResponseStyle: 'practical',
      aiConfirmActions: true,
      notificationsEnabled: true,
      notificationSound: true,
      dailyFocusGoalMinutes: 120,
      dashboardWidgets: {
        progressRing: true,
        timeline: true,
        routines: true,
        tasks: true,
        goals: true,
        upcomingEvents: true,
        studyWork: true,
        aiInsights: true,
      },
    },
    dayContext: {
      date: '2026-11-20',
      routines: [],
      tasks: [],
      overdueTasks: [],
      events: [],
      studySessions: [],
      workSessions: [],
      focusSessions: [],
      journal: null,
      diaryLogs: [],
      waterIntake: mockWater,
      trackerEntries: [],
      habits: [],
      notes: [],
      productivityScore: 85,
    },
    routines: [],
    routineOccurrences: [],
    tasks: [
      {
        id: 't1',
        userId: 'u1',
        title: 'Existing Task',
        description: '',
        dueDate: '2026-11-20',
        dueTime: '10:00',
        priority: 'High',
        category: 'Work',
        status: 'Not Started',
        recurrence: 'none',
        reminderMinutes: 0,
        notes: '',
        subtasks: [],
        createdAt: '',
        updatedAt: '',
      },
    ],
    alarms: [],
    diaryLogs: [],
    waterIntake: mockWater,
    waterEntries: [],
    trackerEntries: [],
    customTrackers: [],
    events: [],
    goals: [],
    habits: [],
    studySubjects: [],
    studySessions: [],
    workProjects: [],
    workSessions: [],
    focusSessions: [],
    notes: [],
    journals: [],
    notifications: [],
    aiConversations: [],
    storageStats: { dbPath: '', sizeBytes: 100, counts: {} },
  };
}

test('applyOfflineOptimisticUpdate adds water intake correctly', () => {
  const initial = getMockBootstrap();
  const updated = applyOfflineOptimisticUpdate(initial, '/api/water', 'POST', { amountMl: 500 });
  assert.equal(updated.waterIntake.totalMl, 1000);
  assert.equal(updated.waterEntries.length, 1);
  assert.equal(updated.waterEntries[0].amountMl, 500);
});

test('applyOfflineOptimisticUpdate adds and completes tasks offline', () => {
  const initial = getMockBootstrap();
  const updated = applyOfflineOptimisticUpdate(initial, '/api/tasks', 'POST', {
    title: 'Offline Task',
    priority: 'High',
  });
  assert.equal(updated.tasks.length, 2);
  assert.equal(updated.tasks[0].title, 'Offline Task');

  const completed = applyOfflineOptimisticUpdate(
    updated,
    `/api/tasks/${updated.tasks[0].id}`,
    'PUT',
    { status: 'Completed' }
  );
  assert.equal(completed.tasks[0].status, 'Completed');
});

test('applyOfflineOptimisticUpdate handles offline notes and diary entries', () => {
  const initial = getMockBootstrap();
  const updated = applyOfflineOptimisticUpdate(initial, '/api/notes', 'POST', {
    title: 'My Secret Diary Note',
    content: 'Writing while laptop is closed.',
  });
  assert.equal(updated.notes.length, 1);
  assert.equal(updated.notes[0].title, 'My Secret Diary Note');

  const withDiary = applyOfflineOptimisticUpdate(updated, '/api/diary', 'POST', {
    content: 'Logged in evening offline',
    activity: 'Evening contemplation',
    mood: 'serene',
  });
  assert.equal(withDiary.diaryLogs.length, 1);
  assert.equal(withDiary.diaryLogs[0].activity, 'Evening contemplation');
});
