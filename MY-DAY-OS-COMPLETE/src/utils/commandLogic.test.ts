import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCommandPaletteItems } from './commandLogic';
import type { BootstrapData } from '../api/client';

const mockBootstrap = {
  user: { id: 'u1', name: 'Madhu', email: 'm@example.com', role: 'user', createdAt: '' },
  today: '2026-11-17',
  settings: {
    theme: 'dark',
    accentColor: '#6b9cff',
    glassOpacity: 0.08,
    glassBlur: 24,
    glassRadius: 22,
    fontSize: 15,
    uiDensity: 'comfortable',
    reducedMotion: false,
    language: 'en',
    dateFormat: 'MMM D, YYYY',
    timeFormat: '12h',
    timezone: 'Asia/Kolkata',
    weekStartsOn: 1,
    startupModule: 'dashboard',
    aiModel: 'gemini-4-hydrogen',
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
  tasks: [
    {
      id: 't1',
      userId: 'u1',
      title: 'Finalize Study Roadmap',
      description: 'Weak topics first',
      dueDate: '2026-11-17',
      dueTime: '10:30',
      category: 'Study',
      priority: 'High',
      status: 'Not Started',
      recurrence: 'none',
      reminderMinutes: 10,
      notes: '',
      subtasks: [],
      createdAt: '',
      updatedAt: '',
    },
  ],
  routines: [],
  events: [],
  notes: [],
} as unknown as BootstrapData;

test('buildCommandPaletteItems returns quick actions and modules when query is empty', () => {
  const items = buildCommandPaletteItems(mockBootstrap, '');
  assert.ok(items.some((i) => i.actionId === 'quick_water_250'));
  assert.ok(items.some((i) => i.moduleTarget === 'routine'));
});

test('buildCommandPaletteItems ranks matching tasks and actions cleanly', () => {
  const waterMatches = buildCommandPaletteItems(mockBootstrap, 'water');
  assert.ok(waterMatches.some((i) => i.actionId === 'quick_water_250'));

  const taskMatches = buildCommandPaletteItems(mockBootstrap, 'roadmap');
  assert.equal(taskMatches[0]?.title, 'Finalize Study Roadmap');
  assert.equal(taskMatches[0]?.moduleTarget, 'tasks');
});
