import type { BootstrapData } from '../api/client';
import type { DiaryLogEntry, NoteItem, Task, WaterLogEntry } from '../types';

const CACHE_KEY = 'raa_cached_bootstrap_data';
const CACHE_TIME_KEY = 'raa_cached_bootstrap_time';
const QUEUE_KEY = 'raa_offline_mutation_queue';

export interface QueuedMutation {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  timestamp: number;
}

/**
 * Cache complete bootstrap snapshot to localStorage so the app works
 * seamlessly even if the laptop is shut down or network is offline.
 */
export function saveCachedBootstrap(data: BootstrapData): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    window.localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
  } catch (err) {
    console.warn('Unable to persist bootstrap to localStorage:', err);
  }
}

/**
 * Retrieve cached bootstrap snapshot if available.
 */
export function getCachedBootstrap(): { data: BootstrapData; timestamp: number } | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    const timeRaw = window.localStorage.getItem(CACHE_TIME_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as BootstrapData;
    const timestamp = timeRaw ? parseInt(timeRaw, 10) : Date.now();
    return { data, timestamp };
  } catch {
    return null;
  }
}

/**
 * Enqueue an offline mutation to be replayed when connection is restored.
 */
export function queueOfflineMutation(
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body?: unknown
): QueuedMutation {
  const item: QueuedMutation = {
    id: `off_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    endpoint,
    method,
    body,
    timestamp: Date.now(),
  };

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const existing = getOfflineMutationQueue();
      existing.push(item);
      window.localStorage.setItem(QUEUE_KEY, JSON.stringify(existing));
    } catch (err) {
      console.warn('Unable to enqueue offline mutation:', err);
    }
  }

  return item;
}

/**
 * Retrieve pending offline mutation queue.
 */
export function getOfflineMutationQueue(): QueuedMutation[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedMutation[];
  } catch {
    return [];
  }
}

/**
 * Clear queued mutations after sync.
 */
export function clearOfflineMutationQueue(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(QUEUE_KEY);
  } catch {}
}

/**
 * Optimistically apply an offline action to the cached bootstrap state
 * so the user sees their changes immediately even when laptop is turned off!
 */
export function applyOfflineOptimisticUpdate(
  current: BootstrapData,
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body?: any
): BootstrapData {
  const next: BootstrapData = JSON.parse(JSON.stringify(current));

  try {
    // 1. Water Intake
    if (endpoint.startsWith('/api/water') && method === 'POST') {
      const amount = Number(body?.amountMl || 250);
      next.waterIntake.totalMl = (next.waterIntake.totalMl || 0) + amount;
      next.waterIntake.glasses = Math.floor(next.waterIntake.totalMl / 250);
      const newEntry: WaterLogEntry = {
        id: `local_water_${Date.now()}`,
        userId: current.user.id,
        date: current.today,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        amountMl: amount,
        note: body?.note || '',
        createdAt: new Date().toISOString(),
      };
      next.waterEntries.unshift(newEntry);
      if (Array.isArray(next.waterIntake.entries)) {
        next.waterIntake.entries.unshift(newEntry);
      }
    }

    // 2. Tasks
    else if (endpoint === '/api/tasks' && method === 'POST') {
      const newTask: Task = {
        id: `local_task_${Date.now()}`,
        userId: current.user.id,
        title: body?.title || 'New Task',
        description: body?.description || '',
        dueDate: body?.dueDate || body?.date || current.today,
        dueTime: body?.dueTime || body?.time || '',
        priority: body?.priority || 'Medium',
        category: body?.category || 'Work',
        status: 'Not Started',
        recurrence: 'none',
        reminderMinutes: 0,
        notes: body?.notes || '',
        subtasks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      next.tasks.unshift(newTask);
    } else if (endpoint.startsWith('/api/tasks/') && method === 'PUT') {
      const taskId = endpoint.replace('/api/tasks/', '');
      const idx = next.tasks.findIndex((t) => t.id === taskId);
      if (idx !== -1) {
        next.tasks[idx] = { ...next.tasks[idx], ...body, updatedAt: new Date().toISOString() };
      }
    } else if (endpoint.startsWith('/api/tasks/') && method === 'DELETE') {
      const taskId = endpoint.replace('/api/tasks/', '');
      next.tasks = next.tasks.filter((t) => t.id !== taskId);
    }

    // 3. Notes
    else if (endpoint === '/api/notes' && method === 'POST') {
      const newNote: NoteItem = {
        id: `local_note_${Date.now()}`,
        userId: current.user.id,
        title: body?.title || 'Untitled Note',
        content: body?.content || '',
        category: body?.category || 'Personal',
        tags: body?.tags || [],
        pinned: body?.pinned || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      next.notes.unshift(newNote);
    } else if (endpoint.startsWith('/api/notes/') && method === 'PUT') {
      const noteId = endpoint.replace('/api/notes/', '');
      const idx = next.notes.findIndex((n) => n.id === noteId);
      if (idx !== -1) {
        next.notes[idx] = { ...next.notes[idx], ...body, updatedAt: new Date().toISOString() };
      }
    } else if (endpoint.startsWith('/api/notes/') && method === 'DELETE') {
      const noteId = endpoint.replace('/api/notes/', '');
      next.notes = next.notes.filter((n) => n.id !== noteId);
    }

    // 4. Diary Logs
    else if (endpoint === '/api/diary' && method === 'POST') {
      const newEntry: DiaryLogEntry = {
        id: `local_diary_${Date.now()}`,
        userId: current.user.id,
        date: body?.date || current.today,
        entryTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        title: body?.title || 'Daily Reflection',
        activity: body?.activity || body?.content || '',
        category: body?.category || 'Personal',
        mood: body?.mood || 'peaceful',
        energy: Number(body?.energy || 5),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      next.diaryLogs.unshift(newEntry);
    }

    // 5. Alarms Toggle
    else if (endpoint.startsWith('/api/alarms/') && method === 'PUT') {
      const alarmId = endpoint.replace('/api/alarms/', '');
      const idx = next.alarms.findIndex((a) => a.id === alarmId);
      if (idx !== -1) {
        next.alarms[idx] = { ...next.alarms[idx], ...body };
      }
    }
  } catch (err) {
    console.warn('Error applying optimistic update:', err);
  }

  saveCachedBootstrap(next);
  return next;
}
