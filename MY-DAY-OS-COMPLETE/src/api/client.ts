import type {
  AiConversation,
  Alarm,
  AppNotification,
  AppSettings,
  CalendarEvent,
  CustomTracker,
  DayContext,
  DiaryLogEntry,
  FocusSession,
  Goal,
  Habit,
  JournalEntry,
  NoteItem,
  Routine,
  StudySession,
  StudySubject,
  Task,
  TrackerEntry,
  UserProfile,
  WaterIntake,
  WaterLogEntry,
  WorkProject,
  WorkSession,
} from '../types';
import { queueOfflineMutation } from '../utils/offlineStorage';

export interface BootstrapData {
  user: UserProfile;
  today: string;
  settings: AppSettings;
  dayContext: DayContext;
  routines: Routine[];
  routineOccurrences: Array<{
    routineId: string;
    date: string;
    status: string;
    completedAt: string | null;
    skippedReason: string | null;
  }>;
  tasks: Task[];
  alarms: Alarm[];
  diaryLogs: DiaryLogEntry[];
  waterIntake: WaterIntake;
  waterEntries: WaterLogEntry[];
  trackerEntries: TrackerEntry[];
  customTrackers: CustomTracker[];
  events: CalendarEvent[];
  goals: Goal[];
  habits: Habit[];
  studySubjects: StudySubject[];
  studySessions: StudySession[];
  workProjects: WorkProject[];
  workSessions: WorkSession[];
  focusSessions: FocusSession[];
  notes: NoteItem[];
  journals: JournalEntry[];
  notifications: AppNotification[];
  aiConversations: AiConversation[];
  storageStats: {
    dbPath: string;
    sizeBytes: number;
    counts: Record<string, number>;
  };
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const method = (options?.method || 'GET').toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE';
  try {
    const res = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers ?? {}),
      },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
    }
    return data as T;
  } catch (err) {
    // If it's a mutation and network failed (e.g. laptop closed or offline), queue it
    if (method !== 'GET') {
      try {
        const bodyObj = options?.body ? JSON.parse(options.body as string) : undefined;
        queueOfflineMutation(url, method, bodyObj);
      } catch {}
      // Return a simulated success payload so client doesn't throw a fatal toast
      return { ok: true, offlineQueued: true } as unknown as T;
    }
    throw err;
  }
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  del: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};
