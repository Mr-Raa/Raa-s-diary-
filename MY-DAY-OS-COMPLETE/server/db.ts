import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  AiConversation,
  AiMessage,
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
} from '../src/types';
import { addDays, doesRoutineOccurOnDate, getTodayInTimezone } from '../src/utils/dateLogic';
import { computeDailyProductivityScore } from '../src/utils/analyticsLogic';

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'mydayos.sqlite');

fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  accentColor: '#6b9cff',
  glassOpacity: 0.075,
  glassBlur: 24,
  glassRadius: 22,
  fontSize: 15,
  fontStyle: 'vision',
  uiDensity: 'comfortable',
  reducedMotion: false,
  language: 'gu-en',
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
  dailyWaterGoalMl: 2500,
  waterRemindersEnabled: true,
  waterReminderIntervalMinutes: 90,
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
};

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'owner',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      user_id TEXT PRIMARY KEY,
      json_data TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS routines (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      date TEXT NOT NULL,
      end_date TEXT,
      category TEXT NOT NULL,
      priority TEXT NOT NULL,
      recurrence TEXT NOT NULL DEFAULT 'daily',
      selected_days TEXT NOT NULL DEFAULT '[]',
      reminder_minutes INTEGER NOT NULL DEFAULT 10,
      notes TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS routine_occurrences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      routine_id TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      completed_at TEXT,
      skipped_reason TEXT,
      notes TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, routine_id, date),
      FOREIGN KEY(routine_id) REFERENCES routines(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      due_date TEXT NOT NULL,
      due_time TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL,
      priority TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Not Started',
      recurrence TEXT NOT NULL DEFAULT 'none',
      reminder_minutes INTEGER NOT NULL DEFAULT 15,
      notes TEXT NOT NULL DEFAULT '',
      completed_at TEXT,
      skipped_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      category TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6b9cff',
      location TEXT NOT NULL DEFAULT '',
      recurrence TEXT NOT NULL DEFAULT 'none',
      notes TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'local',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL,
      start_date TEXT NOT NULL,
      target_date TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Active',
      priority TEXT NOT NULL DEFAULT 'Medium',
      notes TEXT NOT NULL DEFAULT '',
      reminder_date TEXT,
      completion_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      target_date TEXT,
      FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      weekly_target INTEGER NOT NULL DEFAULT 7,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS habit_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      habit_id TEXT NOT NULL,
      date TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 1,
      notes TEXT NOT NULL DEFAULT '',
      UNIQUE(habit_id, date),
      FOREIGN KEY(habit_id) REFERENCES habits(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS study_subjects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      chapters_total INTEGER NOT NULL DEFAULT 10,
      chapters_completed INTEGER NOT NULL DEFAULT 0,
      next_revision_date TEXT NOT NULL DEFAULT '',
      target_hours INTEGER NOT NULL DEFAULT 20,
      notes TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '#6b9cff',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS study_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      date TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      topic TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY(subject_id) REFERENCES study_subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS work_projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      client_or_team TEXT NOT NULL DEFAULT '',
      deadline TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'Medium',
      status TEXT NOT NULL DEFAULT 'Active',
      progress INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS work_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      date TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES work_projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS focus_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      mode TEXT NOT NULL,
      planned_minutes INTEGER NOT NULL,
      actual_minutes INTEGER NOT NULL,
      linked_type TEXT NOT NULL DEFAULT 'none',
      linked_id TEXT NOT NULL DEFAULT '',
      linked_title TEXT NOT NULL DEFAULT '',
      started_at TEXT NOT NULL,
      ended_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'Personal',
      tags TEXT NOT NULL DEFAULT '[]',
      pinned INTEGER NOT NULL DEFAULT 0,
      linked_date TEXT,
      linked_task_id TEXT,
      linked_goal_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      mood TEXT NOT NULL DEFAULT 'Focused',
      reflection TEXT NOT NULL DEFAULT '',
      achievements TEXT NOT NULL DEFAULT '',
      gratitude TEXT NOT NULL DEFAULT '',
      locked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, date)
    );

    CREATE TABLE IF NOT EXISTS daily_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      productivity_score INTEGER NOT NULL DEFAULT 0,
      summary_note TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, date)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      snoozed_until TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      model TEXT,
      thinking_used INTEGER NOT NULL DEFAULT 0,
      image_attached INTEGER NOT NULL DEFAULT 0,
      proposed_actions TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alarms (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      reminder_note TEXT NOT NULL DEFAULT '',
      alarm_type TEXT NOT NULL DEFAULT 'custom',
      time TEXT NOT NULL,
      repeat_mode TEXT NOT NULL DEFAULT 'daily',
      selected_days TEXT NOT NULL DEFAULT '[]',
      interval_minutes INTEGER NOT NULL DEFAULT 60,
      start_time TEXT NOT NULL DEFAULT '08:00',
      end_time TEXT NOT NULL DEFAULT '21:00',
      tone TEXT NOT NULL DEFAULT 'crystal',
      enabled INTEGER NOT NULL DEFAULT 1,
      snooze_minutes INTEGER NOT NULL DEFAULT 5,
      last_triggered_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS diary_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      entry_time TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      activity TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Personal',
      mood TEXT NOT NULL DEFAULT 'Calm',
      energy INTEGER NOT NULL DEFAULT 4,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS water_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      glasses INTEGER NOT NULL DEFAULT 0,
      target_glasses INTEGER NOT NULL DEFAULT 8,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, date),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS water_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      amount_ml INTEGER NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tracker_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tracker_key TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      value_number REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT '',
      label TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS custom_trackers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      daily_target REAL NOT NULL DEFAULT 1,
      icon TEXT NOT NULL DEFAULT 'sparkles',
      color TEXT NOT NULL DEFAULT '#5487FF',
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  ensureDefaultUserAndSeed();
  ensureStarterAlarmsAndDiary();
  ensureStarterTrackers();
  try {
    db.prepare("UPDATE users SET name = 'Raa' WHERE id = 'u_default' OR email = 'vadhel.madhu@gmail.com'").run();
  } catch {}
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const hashBuf = Buffer.from(hash, 'hex');
  if (derived.length !== hashBuf.length) return false;
  return crypto.timingSafeEqual(derived, hashBuf);
}

export function logActivity(userId: string, action: string, entityType: string, entityId: string, detail = '') {
  db.prepare(
    'INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(uid('log'), userId, action, entityType, entityId, detail, new Date().toISOString());
}

function ensureDefaultUserAndSeed() {
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  if (countRow.cnt > 0) return;

  const nowIso = new Date().toISOString();
  const today = getTodayInTimezone('Asia/Kolkata');
  const yesterday = addDays(today, -1);
  const twoDaysAgo = addDays(today, -2);
  const tomorrow = addDays(today, 1);
  const nextWeek = addDays(today, 6);
  const userId = 'u_default';

  db.prepare(
    'INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(userId, 'Madhu', 'vadhel.madhu@gmail.com', hashPassword('mydayos2026'), 'owner', nowIso);

  db.prepare('INSERT INTO settings (user_id, json_data, updated_at) VALUES (?, ?, ?)').run(
    userId,
    JSON.stringify(DEFAULT_SETTINGS),
    nowIso
  );

  // Starter editable routines
  const r1 = uid('rtn');
  const r2 = uid('rtn');
  const r3 = uid('rtn');
  const r4 = uid('rtn');
  const r5 = uid('rtn');
  const insertRoutine = db.prepare(`
    INSERT INTO routines (id, user_id, title, description, start_time, end_time, date, category, priority, recurrence, selected_days, reminder_minutes, notes, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertRoutine.run(r1, userId, 'Morning Sunlight & Hydration', '15 min fresh air walk, 500ml water, light stretching', '06:30', '07:00', twoDaysAgo, 'Health', 'High', 'daily', '[]', 10, 'Start the day energized without checking phone first.', 1, nowIso, nowIso);
  insertRoutine.run(r2, userId, 'Deep Study Block', 'Focused conceptual learning and chapter notes', '08:30', '10:00', twoDaysAgo, 'Study', 'High', 'daily', '[]', 15, 'Keep phone in Focus Mode.', 2, nowIso, nowIso);
  insertRoutine.run(r3, userId, 'Core Work Sprint', 'Execute highest-leverage daily deliverables', '11:00', '13:00', twoDaysAgo, 'Work', 'Urgent', 'daily', '[]', 10, 'Review deliverables before lunch.', 3, nowIso, nowIso);
  insertRoutine.run(r4, userId, 'Evening Mobility & Walk', '30 min outdoor walk to reset energy', '17:45', '18:30', twoDaysAgo, 'Exercise', 'Medium', 'daily', '[]', 10, '', 4, nowIso, nowIso);
  insertRoutine.run(r5, userId, 'Night Review & Tomorrow Plan', 'Reflect on wins and prepare tomorrow schedule', '21:30', '22:00', twoDaysAgo, 'Personal', 'High', 'daily', '[]', 15, 'Write 3 wins in Daily Journal.', 5, nowIso, nowIso);

  // Yesterday's preserved routine occurrences (proves date-specific history!)
  const insertOcc = db.prepare(`
    INSERT INTO routine_occurrences (id, user_id, routine_id, date, status, completed_at, skipped_reason, notes, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertOcc.run(uid('occ'), userId, r1, yesterday, 'completed', `${yesterday}T07:02:00.000Z`, null, 'Felt refreshed', nowIso);
  insertOcc.run(uid('occ'), userId, r2, yesterday, 'completed', `${yesterday}T10:05:00.000Z`, null, 'Finished 2 chapters', nowIso);
  insertOcc.run(uid('occ'), userId, r3, yesterday, 'completed', `${yesterday}T13:00:00.000Z`, null, '', nowIso);
  insertOcc.run(uid('occ'), userId, r4, yesterday, 'skipped', null, 'Heavy evening rain outside', 'Rescheduled stretching indoors', nowIso);
  insertOcc.run(uid('occ'), userId, r5, yesterday, 'completed', `${yesterday}T22:00:00.000Z`, null, '', nowIso);

  // Two days ago occurrences
  insertOcc.run(uid('occ'), userId, r1, twoDaysAgo, 'completed', `${twoDaysAgo}T07:00:00.000Z`, null, '', nowIso);
  insertOcc.run(uid('occ'), userId, r2, twoDaysAgo, 'completed', `${twoDaysAgo}T10:00:00.000Z`, null, '', nowIso);
  insertOcc.run(uid('occ'), userId, r3, twoDaysAgo, 'completed', `${twoDaysAgo}T13:00:00.000Z`, null, '', nowIso);

  // Today's initial routine occurrence (first one completed)
  insertOcc.run(uid('occ'), userId, r1, today, 'completed', `${today}T07:05:00.000Z`, null, '', nowIso);

  // Tasks across yesterday (completed + overdue), today, tomorrow
  const t1 = uid('tsk');
  const t2 = uid('tsk');
  const t3 = uid('tsk');
  const t4 = uid('tsk');
  const t5 = uid('tsk');
  const insertTask = db.prepare(`
    INSERT INTO tasks (id, user_id, title, description, due_date, due_time, category, priority, status, recurrence, reminder_minutes, notes, completed_at, skipped_reason, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertTask.run(t1, userId, 'Finalize Weekly Study Roadmap', 'Break down chapters and revision slots for the next 7 days', today, '10:30', 'Study', 'High', 'In Progress', 'none', 15, 'Prioritize weak topics first', null, null, nowIso, nowIso);
  insertTask.run(t2, userId, 'Prepare Project Architecture Brief', 'Draft clean milestones and timeline', today, '14:30', 'Work', 'Urgent', 'Not Started', 'none', 30, '', null, null, nowIso, nowIso);
  insertTask.run(t3, userId, 'Evening Grocery & Family Check-in', 'Pick up fresh fruits and call parents', today, '19:00', 'Family', 'Medium', 'Not Started', 'none', 15, '', null, null, nowIso, nowIso);
  insertTask.run(t4, userId, 'System Architecture Notes Review', 'Completed yesterday evening review', yesterday, '16:00', 'Learning', 'High', 'Completed', 'none', 15, 'All key diagrams summarized', `${yesterday}T16:40:00.000Z`, null, nowIso, nowIso);
  insertTask.run(t5, userId, 'Organize Digital Workspace Folders', 'Archive old invoices and backup receipts', yesterday, '18:00', 'Personal', 'Medium', 'Not Started', 'none', 0, 'Carried forward to Recovery Center', null, null, nowIso, nowIso);

  db.prepare('INSERT INTO subtasks (id, task_id, title, completed) VALUES (?, ?, ?, ?)').run(uid('sub'), t1, 'Audit pending chapters', 1);
  db.prepare('INSERT INTO subtasks (id, task_id, title, completed) VALUES (?, ?, ?, ?)').run(uid('sub'), t1, 'Assign revision dates', 0);

  // Calendar events
  const insertEvent = db.prepare(`
    INSERT INTO calendar_events (id, user_id, title, description, date, start_time, end_time, category, color, location, recurrence, notes, source, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertEvent.run(uid('evt'), userId, 'Weekly Planning & Alignment', 'Review goals, study hours, and upcoming milestones', today, '16:00', '16:45', 'Personal', '#6b9cff', 'Home Desk', 'weekly', '', 'local', nowIso, nowIso);
  insertEvent.run(uid('evt'), userId, 'Skill Lab Practice Session', 'Hands-on coding & problem solving', tomorrow, '10:00', '11:30', 'Study', '#a78bfa', 'Workspace', 'none', '', 'local', nowIso, nowIso);
  insertEvent.run(uid('evt'), userId, 'Project Milestone Check-in', 'Evaluate sprint deliverables', addDays(today, 3), '15:00', '16:00', 'Work', '#38bdf8', 'Online', 'none', '', 'local', nowIso, nowIso);

  // Goals & Milestones
  const g1 = uid('gol');
  const g2 = uid('gol');
  db.prepare(`
    INSERT INTO goals (id, user_id, title, description, category, start_date, target_date, progress, status, priority, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(g1, userId, 'Complete Full-Stack Mastery Track', 'Consistent 90-minute daily deep study with weekly mini-projects', 'Study', addDays(today, -14), addDays(today, 30), 62, 'Active', 'High', 'Stay consistent 6 days a week.', nowIso, nowIso);
  db.prepare(`
    INSERT INTO goals (id, user_id, title, description, category, start_date, target_date, progress, status, priority, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(g2, userId, '30-Day Morning Energy & Fitness Consistency', 'Morning sunlight, 30m walk, and hydration', 'Health', addDays(today, -10), addDays(today, 20), 45, 'Active', 'Medium', '', nowIso, nowIso);

  db.prepare('INSERT INTO milestones (id, goal_id, title, completed, target_date) VALUES (?, ?, ?, ?, ?)').run(uid('mls'), g1, 'Core Fundamentals & Data Structures', 1, addDays(today, -3));
  db.prepare('INSERT INTO milestones (id, goal_id, title, completed, target_date) VALUES (?, ?, ?, ?, ?)').run(uid('mls'), g1, 'Database & API Architecture', 1, today);
  db.prepare('INSERT INTO milestones (id, goal_id, title, completed, target_date) VALUES (?, ?, ?, ?, ?)').run(uid('mls'), g1, 'Capstone Production Deployment', 0, nextWeek);

  // Habits & Entries
  const h1 = uid('hab');
  const h2 = uid('hab');
  const h3 = uid('hab');
  db.prepare('INSERT INTO habits (id, user_id, title, category, weekly_target, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(h1, userId, '2.5L Hydration', 'Health', 7, 'Track bottle refills', nowIso, nowIso);
  db.prepare('INSERT INTO habits (id, user_id, title, category, weekly_target, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(h2, userId, 'Zero-Distraction Focus (60m+)', 'Work', 6, '', nowIso, nowIso);
  db.prepare('INSERT INTO habits (id, user_id, title, category, weekly_target, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(h3, userId, 'Evening Reading (20 mins)', 'Learning', 5, '', nowIso, nowIso);

  const insertHabEntry = db.prepare('INSERT INTO habit_entries (id, user_id, habit_id, date, completed, notes) VALUES (?, ?, ?, ?, ?, ?)');
  insertHabEntry.run(uid('hbe'), userId, h1, twoDaysAgo, 1, '');
  insertHabEntry.run(uid('hbe'), userId, h1, yesterday, 1, '');
  insertHabEntry.run(uid('hbe'), userId, h1, today, 1, '');
  insertHabEntry.run(uid('hbe'), userId, h2, twoDaysAgo, 1, '');
  insertHabEntry.run(uid('hbe'), userId, h2, yesterday, 1, '');
  insertHabEntry.run(uid('hbe'), userId, h3, yesterday, 1, '');

  // Study Subjects & Sessions
  const s1 = uid('sub');
  const s2 = uid('sub');
  db.prepare('INSERT INTO study_subjects (id, user_id, name, chapters_total, chapters_completed, next_revision_date, target_hours, notes, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(s1, userId, 'System Design & Architecture', 12, 7, tomorrow, 30, 'Focus on distributed caching & storage', '#6b9cff', nowIso, nowIso);
  db.prepare('INSERT INTO study_subjects (id, user_id, name, chapters_total, chapters_completed, next_revision_date, target_hours, notes, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(s2, userId, 'Applied AI & Prompt Engineering', 8, 5, addDays(today, 2), 20, 'Practice tool-use patterns', '#a78bfa', nowIso, nowIso);

  db.prepare('INSERT INTO study_sessions (id, user_id, subject_id, date, duration_minutes, topic, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(uid('sts'), userId, s1, yesterday, 75, 'Database Indexing & WAL', 'Great clarity', nowIso);
  db.prepare('INSERT INTO study_sessions (id, user_id, subject_id, date, duration_minutes, topic, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(uid('sts'), userId, s2, twoDaysAgo, 60, 'Multimodal Reasoning', '', nowIso);

  // Work Projects & Sessions
  const w1 = uid('wrk');
  db.prepare('INSERT INTO work_projects (id, user_id, title, client_or_team, deadline, priority, status, progress, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(w1, userId, 'MY DAY OS Personal Productivity Rollout', 'Personal Ops', nextWeek, 'High', 'Active', 68, 'Keep daily progress synced.', nowIso, nowIso);
  db.prepare('INSERT INTO work_sessions (id, user_id, project_id, date, duration_minutes, summary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(uid('wks'), userId, w1, yesterday, 110, 'Completed core planning workflow', nowIso);

  // Focus Sessions
  db.prepare('INSERT INTO focus_sessions (id, user_id, date, mode, planned_minutes, actual_minutes, linked_type, linked_id, linked_title, started_at, ended_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(uid('fcs'), userId, yesterday, 'pomodoro', 50, 50, 'study', s1, 'System Design & Architecture', `${yesterday}T08:30:00.000Z`, `${yesterday}T09:20:00.000Z`);
  db.prepare('INSERT INTO focus_sessions (id, user_id, date, mode, planned_minutes, actual_minutes, linked_type, linked_id, linked_title, started_at, ended_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(uid('fcs'), userId, today, 'pomodoro', 25, 25, 'task', t1, 'Finalize Weekly Study Roadmap', `${today}T08:40:00.000Z`, `${today}T09:05:00.000Z`);

  // Notes & Daily Journal
  db.prepare('INSERT INTO notes (id, user_id, title, content, category, tags, pinned, linked_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(uid('not'), userId, 'Weekly Clarity Principles', '1. Protect the first 90 minutes for deep study.\n2. Never skip evening review.\n3. Keep tasks date-bound and realistic.', 'Personal', JSON.stringify(['clarity', 'focus']), 1, today, nowIso, nowIso);
  db.prepare('INSERT INTO journal_entries (id, user_id, date, mood, reflection, achievements, gratitude, locked, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(uid('jrn'), userId, yesterday, 'Calm & Productive', 'Maintained morning energy and finished two deep blocks cleanly. Missed outdoor walk due to rain, compensated with light indoor mobility.', 'Completed Database Indexing chapter and Architecture Notes Review.', 'Grateful for peaceful focus time and supportive family.', 1, nowIso, nowIso);

  // Notifications
  db.prepare('INSERT INTO notifications (id, user_id, title, message, type, date, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(uid('ntf'), userId, 'Overdue Task in Recovery Center', '"Organize Digital Workspace Folders" from yesterday is ready to reschedule or skip with a reason.', 'task', today, 0, nowIso);
  db.prepare('INSERT INTO notifications (id, user_id, title, message, type, date, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(uid('ntf'), userId, 'Daily Planning Ready', 'Your schedule and goals for today are loaded in Asia/Kolkata timezone.', 'system', today, 0, nowIso);
}

function ensureStarterAlarmsAndDiary() {
  const firstUser = db.prepare('SELECT id FROM users ORDER BY created_at ASC LIMIT 1').get() as { id: string } | undefined;
  if (!firstUser) return;
  const userId = firstUser.id;
  const nowIso = new Date().toISOString();
  const today = getTodayInTimezone('Asia/Kolkata');
  const yesterday = addDays(today, -1);

  const alarmCnt = (db.prepare('SELECT COUNT(*) as c FROM alarms WHERE user_id = ?').get(userId) as { c: number }).c;
  if (alarmCnt === 0) {
    const insertAlarm = db.prepare(`
      INSERT INTO alarms (id, user_id, title, reminder_note, alarm_type, time, repeat_mode, selected_days, interval_minutes, start_time, end_time, tone, enabled, snooze_minutes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertAlarm.run(uid('alm'), userId, 'Morning Wake-Up Alarm', 'Wake up fresh, stretch for 5 minutes & drink warm water', 'wakeup', '06:15', 'daily', '[]', 60, '06:15', '06:15', 'sunrise', 1, 5, nowIso, nowIso);
    insertAlarm.run(uid('alm'), userId, 'Drink Water (Hydration)', 'Drink 1 glass (250ml) of water to stay energized & focused', 'water', '08:00', 'interval', '[]', 90, '08:00', '21:00', 'waterdrop', 1, 10, nowIso, nowIso);
    insertAlarm.run(uid('alm'), userId, 'Deep Study Kickoff', 'Open System Design notes & start 60m Focus Mode', 'routine', '08:30', 'daily', '[]', 60, '08:30', '08:30', 'crystal', 1, 5, nowIso, nowIso);
    insertAlarm.run(uid('alm'), userId, 'Night Diary & Tomorrow Plan', 'Write what you did today at every hour & plan tomorrow', 'custom', '21:45', 'daily', '[]', 60, '21:45', '21:45', 'crystal', 1, 10, nowIso, nowIso);
  }

  const diaryCnt = (db.prepare('SELECT COUNT(*) as c FROM diary_logs WHERE user_id = ?').get(userId) as { c: number }).c;
  if (diaryCnt === 0) {
    const insertDiary = db.prepare(`
      INSERT INTO diary_logs (id, user_id, date, entry_time, title, activity, category, mood, energy, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertDiary.run(uid('dlg'), userId, yesterday, '06:30', 'Wake Up & Warm Water', 'Woke up on time with Morning Wake-Up alarm, drank 500ml water and got sunlight.', 'Health', 'Energized', 5, nowIso, nowIso);
    insertDiary.run(uid('dlg'), userId, yesterday, '09:00', 'Deep Study Session', 'Studied Database Indexing & WAL internals cleanly for 75 minutes.', 'Study', 'Focused', 4, nowIso, nowIso);
    insertDiary.run(uid('dlg'), userId, yesterday, '21:30', 'Evening Wrap-Up', 'Reviewed completed work and noted indoor stretching instead of outdoor walk due to rain.', 'Personal', 'Calm', 4, nowIso, nowIso);
    insertDiary.run(uid('dlg'), userId, today, '06:35', 'Fresh Morning Start', 'Completed sunlight & hydration routine before checking notifications.', 'Health', 'Energized', 5, nowIso, nowIso);
  }

  const waterRow = db.prepare('SELECT id FROM water_logs WHERE user_id = ? AND date = ?').get(userId, today);
  if (!waterRow) {
    db.prepare('INSERT INTO water_logs (id, user_id, date, glasses, target_glasses, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      uid('wat'),
      userId,
      today,
      3,
      10,
      nowIso
    );
  }
}

function ensureStarterTrackers() {
  const firstUser = db.prepare('SELECT id FROM users ORDER BY created_at ASC LIMIT 1').get() as { id: string } | undefined;
  if (!firstUser) return;
  const userId = firstUser.id;
  const nowIso = new Date().toISOString();
  const today = getTodayInTimezone('Asia/Kolkata');
  const yesterday = addDays(today, -1);

  const waterEntryCnt = (db.prepare('SELECT COUNT(*) as c FROM water_entries WHERE user_id = ?').get(userId) as { c: number }).c;
  if (waterEntryCnt === 0) {
    const insertWaterEntry = db.prepare(
      'INSERT INTO water_entries (id, user_id, date, time, amount_ml, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    insertWaterEntry.run(uid('wen'), userId, today, '06:45', 250, 'Morning warm water', nowIso);
    insertWaterEntry.run(uid('wen'), userId, today, '09:30', 250, 'Study break', nowIso);
    insertWaterEntry.run(uid('wen'), userId, today, '12:15', 250, 'Before lunch', nowIso);
    insertWaterEntry.run(uid('wen'), userId, yesterday, '07:00', 500, 'Morning hydration', nowIso);
    insertWaterEntry.run(uid('wen'), userId, yesterday, '13:00', 500, 'Midday refill', nowIso);
    insertWaterEntry.run(uid('wen'), userId, yesterday, '18:30', 500, 'Evening walk', nowIso);
  }

  const trackerCnt = (db.prepare('SELECT COUNT(*) as c FROM tracker_entries WHERE user_id = ?').get(userId) as { c: number }).c;
  if (trackerCnt === 0) {
    const insertTracker = db.prepare(
      'INSERT INTO tracker_entries (id, user_id, tracker_key, date, time, value_number, unit, label, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    insertTracker.run(uid('trk'), userId, 'sleep', today, '06:20', 7.5, 'hrs', 'Restful Sleep', 'Woke up with morning alarm', nowIso);
    insertTracker.run(uid('trk'), userId, 'steps', today, '11:30', 3400, 'steps', 'Morning + Break Walk', '', nowIso);
    insertTracker.run(uid('trk'), userId, 'exercise', today, '07:10', 25, 'min', 'Mobility & Sunlight Walk', '', nowIso);
    insertTracker.run(uid('trk'), userId, 'mood', today, '08:00', 4, '/5', 'Good', 'Clear focus for study block', nowIso);
    insertTracker.run(uid('trk'), userId, 'energy', today, '08:00', 4, '/5', 'Good', 'Fresh after hydration', nowIso);
    insertTracker.run(uid('trk'), userId, 'sleep', yesterday, '06:30', 7.0, 'hrs', 'Steady rest', '', nowIso);
    insertTracker.run(uid('trk'), userId, 'steps', yesterday, '20:00', 6800, 'steps', 'Full day', '', nowIso);
  }
}

export function getUserBySessionToken(token?: string): UserProfile {
  if (token) {
    const row = db
      .prepare(
        `SELECT u.id, u.name, u.email, u.role, u.created_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?`
      )
      .get(token, new Date().toISOString()) as
      | { id: string; name: string; email: string; role: string; created_at: string }
      | undefined;
    if (row) {
      return { id: row.id, name: row.name, email: row.email, role: row.role, createdAt: row.created_at };
    }
  }
  const fallback = db
    .prepare('SELECT id, name, email, role, created_at FROM users ORDER BY created_at ASC LIMIT 1')
    .get() as { id: string; name: string; email: string; role: string; created_at: string };
  return {
    id: fallback.id,
    name: fallback.name,
    email: fallback.email,
    role: fallback.role,
    createdAt: fallback.created_at,
  };
}

export function getSettings(userId: string): AppSettings {
  const row = db.prepare('SELECT json_data FROM settings WHERE user_id = ?').get(userId) as
    | { json_data: string }
    | undefined;
  if (!row) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(row.json_data) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(userId: string, partial: Partial<AppSettings>): AppSettings {
  const merged = {
    ...getSettings(userId),
    ...partial,
    dashboardWidgets: {
      ...getSettings(userId).dashboardWidgets,
      ...(partial.dashboardWidgets ?? {}),
    },
  };
  db.prepare(
    'INSERT INTO settings (user_id, json_data, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET json_data = excluded.json_data, updated_at = excluded.updated_at'
  ).run(userId, JSON.stringify(merged), new Date().toISOString());
  return merged;
}

export function getRoutines(userId: string, date?: string): Routine[] {
  const rows = db
    .prepare('SELECT * FROM routines WHERE user_id = ? ORDER BY sort_order ASC, start_time ASC')
    .all(userId) as Array<Record<string, unknown>>;

  const occMap = new Map<string, { status: string; completed_at: string | null; skipped_reason: string | null; notes: string }>();
  if (date) {
    const occRows = db
      .prepare('SELECT routine_id, status, completed_at, skipped_reason, notes FROM routine_occurrences WHERE user_id = ? AND date = ?')
      .all(userId, date) as Array<{
      routine_id: string;
      status: string;
      completed_at: string | null;
      skipped_reason: string | null;
      notes: string;
    }>;
    for (const o of occRows) {
      occMap.set(o.routine_id, o);
    }
  }

  return rows.map((r) => {
    const routine: Routine = {
      id: String(r.id),
      userId: String(r.user_id),
      title: String(r.title),
      description: String(r.description ?? ''),
      startTime: String(r.start_time),
      endTime: String(r.end_time),
      date: String(r.date),
      endDate: r.end_date ? String(r.end_date) : null,
      category: String(r.category) as Routine['category'],
      priority: String(r.priority) as Routine['priority'],
      recurrence: String(r.recurrence) as Routine['recurrence'],
      selectedDays: JSON.parse(String(r.selected_days || '[]')),
      reminderMinutes: Number(r.reminder_minutes ?? 10),
      notes: String(r.notes ?? ''),
      sortOrder: Number(r.sort_order ?? 0),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    };
    if (date) {
      const occ = occMap.get(routine.id);
      routine.occurrenceDate = date;
      routine.occurrenceStatus = (occ?.status as Routine['occurrenceStatus']) ?? 'pending';
      routine.completedAt = occ?.completed_at ?? null;
      routine.skippedReason = occ?.skipped_reason ?? null;
    }
    return routine;
  });
}

export function getAllRoutineOccurrences(userId: string) {
  const rows = db
    .prepare('SELECT routine_id, date, status, completed_at, skipped_reason FROM routine_occurrences WHERE user_id = ?')
    .all(userId) as Array<{
    routine_id: string;
    date: string;
    status: string;
    completed_at: string | null;
    skipped_reason: string | null;
  }>;
  return rows.map((r) => ({
    routineId: r.routine_id,
    date: r.date,
    status: r.status,
    completedAt: r.completed_at,
    skippedReason: r.skipped_reason,
  }));
}

export function getTasks(userId: string): Task[] {
  const rows = db
    .prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY due_date ASC, due_time ASC, created_at DESC')
    .all(userId) as Array<Record<string, unknown>>;
  const subtaskRows = db
    .prepare('SELECT s.* FROM subtasks s JOIN tasks t ON t.id = s.task_id WHERE t.user_id = ?')
    .all(userId) as Array<{ id: string; task_id: string; title: string; completed: number }>;

  const subMap = new Map<string, Task['subtasks']>();
  for (const s of subtaskRows) {
    const arr = subMap.get(s.task_id) ?? [];
    arr.push({ id: s.id, taskId: s.task_id, title: s.title, completed: Boolean(s.completed) });
    subMap.set(s.task_id, arr);
  }

  return rows.map((t) => ({
    id: String(t.id),
    userId: String(t.user_id),
    title: String(t.title),
    description: String(t.description ?? ''),
    dueDate: String(t.due_date),
    dueTime: String(t.due_time ?? ''),
    category: String(t.category) as Task['category'],
    priority: String(t.priority) as Task['priority'],
    status: String(t.status) as Task['status'],
    recurrence: String(t.recurrence) as Task['recurrence'],
    reminderMinutes: Number(t.reminder_minutes ?? 15),
    notes: String(t.notes ?? ''),
    subtasks: subMap.get(String(t.id)) ?? [],
    completedAt: t.completed_at ? String(t.completed_at) : null,
    skippedReason: t.skipped_reason ? String(t.skipped_reason) : null,
    createdAt: String(t.created_at),
    updatedAt: String(t.updated_at),
  }));
}

export function getCalendarEvents(userId: string): CalendarEvent[] {
  const rows = db
    .prepare('SELECT * FROM calendar_events WHERE user_id = ? ORDER BY date ASC, start_time ASC')
    .all(userId) as Array<Record<string, unknown>>;
  return rows.map((e) => ({
    id: String(e.id),
    userId: String(e.user_id),
    title: String(e.title),
    description: String(e.description ?? ''),
    date: String(e.date),
    startTime: String(e.start_time),
    endTime: String(e.end_time),
    category: String(e.category) as CalendarEvent['category'],
    color: String(e.color ?? '#6b9cff'),
    location: String(e.location ?? ''),
    recurrence: String(e.recurrence ?? 'none') as CalendarEvent['recurrence'],
    notes: String(e.notes ?? ''),
    source: (String(e.source ?? 'local') as 'local' | 'google'),
    createdAt: String(e.created_at),
    updatedAt: String(e.updated_at),
  }));
}

export function getGoals(userId: string): Goal[] {
  const rows = db
    .prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId) as Array<Record<string, unknown>>;
  const mRows = db
    .prepare('SELECT m.* FROM milestones m JOIN goals g ON g.id = m.goal_id WHERE g.user_id = ?')
    .all(userId) as Array<{ id: string; goal_id: string; title: string; completed: number; target_date: string | null }>;

  const mMap = new Map<string, Goal['milestones']>();
  for (const m of mRows) {
    const arr = mMap.get(m.goal_id) ?? [];
    arr.push({
      id: m.id,
      goalId: m.goal_id,
      title: m.title,
      completed: Boolean(m.completed),
      targetDate: m.target_date,
    });
    mMap.set(m.goal_id, arr);
  }

  return rows.map((g) => ({
    id: String(g.id),
    userId: String(g.user_id),
    title: String(g.title),
    description: String(g.description ?? ''),
    category: String(g.category) as Goal['category'],
    startDate: String(g.start_date),
    targetDate: String(g.target_date),
    progress: Number(g.progress ?? 0),
    status: String(g.status) as Goal['status'],
    priority: String(g.priority) as Goal['priority'],
    notes: String(g.notes ?? ''),
    reminderDate: g.reminder_date ? String(g.reminder_date) : null,
    completionDate: g.completion_date ? String(g.completion_date) : null,
    milestones: mMap.get(String(g.id)) ?? [],
    createdAt: String(g.created_at),
    updatedAt: String(g.updated_at),
  }));
}

export function getHabits(userId: string): Habit[] {
  const rows = db
    .prepare('SELECT * FROM habits WHERE user_id = ? ORDER BY created_at ASC')
    .all(userId) as Array<Record<string, unknown>>;
  const entryRows = db
    .prepare('SELECT * FROM habit_entries WHERE user_id = ? ORDER BY date DESC')
    .all(userId) as Array<{ id: string; habit_id: string; date: string; completed: number; notes: string }>;

  const eMap = new Map<string, Habit['entries']>();
  for (const e of entryRows) {
    const arr = eMap.get(e.habit_id) ?? [];
    arr.push({
      id: e.id,
      habitId: e.habit_id,
      date: e.date,
      completed: Boolean(e.completed),
      notes: e.notes ?? '',
    });
    eMap.set(e.habit_id, arr);
  }

  return rows.map((h) => ({
    id: String(h.id),
    userId: String(h.user_id),
    title: String(h.title),
    category: String(h.category) as Habit['category'],
    weeklyTarget: Number(h.weekly_target ?? 7),
    notes: String(h.notes ?? ''),
    createdAt: String(h.created_at),
    updatedAt: String(h.updated_at),
    entries: eMap.get(String(h.id)) ?? [],
  }));
}

export function getStudySubjects(userId: string): StudySubject[] {
  const rows = db.prepare('SELECT * FROM study_subjects WHERE user_id = ? ORDER BY created_at ASC').all(userId) as Array<Record<string, unknown>>;
  return rows.map((s) => ({
    id: String(s.id),
    userId: String(s.user_id),
    name: String(s.name),
    chaptersTotal: Number(s.chapters_total),
    chaptersCompleted: Number(s.chapters_completed),
    nextRevisionDate: String(s.next_revision_date ?? ''),
    targetHours: Number(s.target_hours ?? 20),
    notes: String(s.notes ?? ''),
    color: String(s.color ?? '#6b9cff'),
    createdAt: String(s.created_at),
    updatedAt: String(s.updated_at),
  }));
}

export function getStudySessions(userId: string): StudySession[] {
  const rows = db
    .prepare(
      `SELECT ss.*, sub.name as subject_name FROM study_sessions ss LEFT JOIN study_subjects sub ON sub.id = ss.subject_id WHERE ss.user_id = ? ORDER BY ss.date DESC, ss.created_at DESC`
    )
    .all(userId) as Array<Record<string, unknown>>;
  return rows.map((s) => ({
    id: String(s.id),
    userId: String(s.user_id),
    subjectId: String(s.subject_id),
    subjectName: s.subject_name ? String(s.subject_name) : undefined,
    date: String(s.date),
    durationMinutes: Number(s.duration_minutes),
    topic: String(s.topic ?? ''),
    notes: String(s.notes ?? ''),
    createdAt: String(s.created_at),
  }));
}

export function getWorkProjects(userId: string): WorkProject[] {
  const rows = db.prepare('SELECT * FROM work_projects WHERE user_id = ? ORDER BY deadline ASC').all(userId) as Array<Record<string, unknown>>;
  return rows.map((w) => ({
    id: String(w.id),
    userId: String(w.user_id),
    title: String(w.title),
    clientOrTeam: String(w.client_or_team ?? ''),
    deadline: String(w.deadline),
    priority: String(w.priority) as WorkProject['priority'],
    status: String(w.status) as WorkProject['status'],
    progress: Number(w.progress ?? 0),
    notes: String(w.notes ?? ''),
    createdAt: String(w.created_at),
    updatedAt: String(w.updated_at),
  }));
}

export function getWorkSessions(userId: string): WorkSession[] {
  const rows = db
    .prepare(
      `SELECT ws.*, wp.title as project_title FROM work_sessions ws LEFT JOIN work_projects wp ON wp.id = ws.project_id WHERE ws.user_id = ? ORDER BY ws.date DESC, ws.created_at DESC`
    )
    .all(userId) as Array<Record<string, unknown>>;
  return rows.map((w) => ({
    id: String(w.id),
    userId: String(w.user_id),
    projectId: String(w.project_id),
    projectTitle: w.project_title ? String(w.project_title) : undefined,
    date: String(w.date),
    durationMinutes: Number(w.duration_minutes),
    summary: String(w.summary ?? ''),
    createdAt: String(w.created_at),
  }));
}

export function getFocusSessions(userId: string): FocusSession[] {
  const rows = db.prepare('SELECT * FROM focus_sessions WHERE user_id = ? ORDER BY started_at DESC').all(userId) as Array<Record<string, unknown>>;
  return rows.map((f) => ({
    id: String(f.id),
    userId: String(f.user_id),
    date: String(f.date),
    mode: String(f.mode) as FocusSession['mode'],
    plannedMinutes: Number(f.planned_minutes),
    actualMinutes: Number(f.actual_minutes),
    linkedType: String(f.linked_type) as FocusSession['linkedType'],
    linkedId: String(f.linked_id ?? ''),
    linkedTitle: String(f.linked_title ?? ''),
    startedAt: String(f.started_at),
    endedAt: String(f.ended_at),
  }));
}

export function getNotes(userId: string): NoteItem[] {
  const rows = db.prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY pinned DESC, updated_at DESC').all(userId) as Array<Record<string, unknown>>;
  return rows.map((n) => ({
    id: String(n.id),
    userId: String(n.user_id),
    title: String(n.title),
    content: String(n.content ?? ''),
    category: String(n.category) as NoteItem['category'],
    tags: JSON.parse(String(n.tags || '[]')),
    pinned: Boolean(n.pinned),
    linkedDate: n.linked_date ? String(n.linked_date) : null,
    linkedTaskId: n.linked_task_id ? String(n.linked_task_id) : null,
    linkedGoalId: n.linked_goal_id ? String(n.linked_goal_id) : null,
    createdAt: String(n.created_at),
    updatedAt: String(n.updated_at),
  }));
}

export function getJournalEntries(userId: string): JournalEntry[] {
  const rows = db.prepare('SELECT * FROM journal_entries WHERE user_id = ? ORDER BY date DESC').all(userId) as Array<Record<string, unknown>>;
  return rows.map((j) => ({
    id: String(j.id),
    userId: String(j.user_id),
    date: String(j.date),
    mood: String(j.mood ?? 'Focused'),
    reflection: String(j.reflection ?? ''),
    achievements: String(j.achievements ?? ''),
    gratitude: String(j.gratitude ?? ''),
    locked: Boolean(j.locked),
    createdAt: String(j.created_at),
    updatedAt: String(j.updated_at),
  }));
}

export function getNotifications(userId: string): AppNotification[] {
  const rows = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 40').all(userId) as Array<Record<string, unknown>>;
  return rows.map((n) => ({
    id: String(n.id),
    userId: String(n.user_id),
    title: String(n.title),
    message: String(n.message),
    type: String(n.type) as AppNotification['type'],
    date: String(n.date),
    read: Boolean(n.read),
    snoozedUntil: n.snoozed_until ? String(n.snoozed_until) : null,
    createdAt: String(n.created_at),
  }));
}

export function getAiConversations(userId: string): AiConversation[] {
  const rows = db.prepare('SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY updated_at DESC').all(userId) as Array<Record<string, unknown>>;
  return rows.map((c) => ({
    id: String(c.id),
    userId: String(c.user_id),
    title: String(c.title),
    createdAt: String(c.created_at),
    updatedAt: String(c.updated_at),
  }));
}

export function getAiMessages(conversationId: string): AiMessage[] {
  const rows = db.prepare('SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC').all(conversationId) as Array<Record<string, unknown>>;
  return rows.map((m) => ({
    id: String(m.id),
    conversationId: String(m.conversation_id),
    role: String(m.role) as 'user' | 'assistant',
    content: String(m.content),
    model: m.model ? String(m.model) : undefined,
    thinkingUsed: Boolean(m.thinking_used),
    imageAttached: Boolean(m.image_attached),
    proposedActions: (() => {
      try {
        return m.proposed_actions ? JSON.parse(String(m.proposed_actions)) : undefined;
      } catch {
        return undefined;
      }
    })(),
    createdAt: String(m.created_at),
  }));
}

export function getAlarms(userId: string): Alarm[] {
  const rows = db
    .prepare('SELECT * FROM alarms WHERE user_id = ? ORDER BY enabled DESC, time ASC')
    .all(userId) as Array<Record<string, unknown>>;
  return rows.map((a) => ({
    id: String(a.id),
    userId: String(a.user_id),
    title: String(a.title),
    reminderNote: String(a.reminder_note ?? ''),
    alarmType: String(a.alarm_type ?? 'custom') as Alarm['alarmType'],
    time: String(a.time),
    repeatMode: String(a.repeat_mode ?? 'daily') as Alarm['repeatMode'],
    selectedDays: JSON.parse(String(a.selected_days || '[]')),
    intervalMinutes: Number(a.interval_minutes ?? 60),
    startTime: String(a.start_time ?? '08:00'),
    endTime: String(a.end_time ?? '21:00'),
    tone: String(a.tone ?? 'crystal') as Alarm['tone'],
    enabled: Boolean(a.enabled),
    snoozeMinutes: Number(a.snooze_minutes ?? 5),
    lastTriggeredAt: a.last_triggered_at ? String(a.last_triggered_at) : null,
    createdAt: String(a.created_at),
    updatedAt: String(a.updated_at),
  }));
}

export function getDiaryLogs(userId: string, date?: string): DiaryLogEntry[] {
  const rows = (
    date
      ? db
          .prepare('SELECT * FROM diary_logs WHERE user_id = ? AND date = ? ORDER BY entry_time ASC, created_at ASC')
          .all(userId, date)
      : db
          .prepare('SELECT * FROM diary_logs WHERE user_id = ? ORDER BY date DESC, entry_time ASC')
          .all(userId)
  ) as Array<Record<string, unknown>>;

  return rows.map((d) => ({
    id: String(d.id),
    userId: String(d.user_id),
    date: String(d.date),
    entryTime: String(d.entry_time),
    title: String(d.title ?? ''),
    activity: String(d.activity),
    category: String(d.category ?? 'Personal') as DiaryLogEntry['category'],
    mood: String(d.mood ?? 'Calm'),
    energy: Number(d.energy ?? 4),
    createdAt: String(d.created_at),
    updatedAt: String(d.updated_at),
  }));
}

export function getWaterEntries(userId: string, date?: string): WaterLogEntry[] {
  const rows = (
    date
      ? db
          .prepare('SELECT * FROM water_entries WHERE user_id = ? AND date = ? ORDER BY time DESC, created_at DESC')
          .all(userId, date)
      : db
          .prepare('SELECT * FROM water_entries WHERE user_id = ? ORDER BY date DESC, time DESC, created_at DESC')
          .all(userId)
  ) as Array<Record<string, unknown>>;

  return rows.map((w) => ({
    id: String(w.id),
    userId: String(w.user_id),
    date: String(w.date),
    time: String(w.time),
    amountMl: Number(w.amount_ml),
    note: String(w.note ?? ''),
    createdAt: String(w.created_at),
  }));
}

export function getWaterIntake(userId: string, date: string): WaterIntake {
  const settings = getSettings(userId);
  const goalMl = Math.max(250, Number(settings.dailyWaterGoalMl ?? 2500));
  const row = db
    .prepare('SELECT glasses, target_glasses FROM water_logs WHERE user_id = ? AND date = ?')
    .get(userId, date) as { glasses: number; target_glasses: number } | undefined;
  const entries = getWaterEntries(userId, date);
  const entriesTotalMl = entries.reduce((sum, e) => sum + Math.max(0, e.amountMl), 0);
  const totalMl = entries.length > 0 ? entriesTotalMl : (row?.glasses ?? 0) * 250;
  const glasses = entries.length > 0 ? Math.round((totalMl / 250) * 10) / 10 : (row?.glasses ?? 0);
  const targetGlasses = Math.max(1, Math.round(goalMl / 250));

  return {
    date,
    glasses,
    targetGlasses,
    totalMl,
    goalMl,
    entries,
  };
}

export function getTrackerEntries(userId: string, date?: string): TrackerEntry[] {
  const rows = (
    date
      ? db
          .prepare('SELECT * FROM tracker_entries WHERE user_id = ? AND date = ? ORDER BY time DESC, created_at DESC')
          .all(userId, date)
      : db
          .prepare('SELECT * FROM tracker_entries WHERE user_id = ? ORDER BY date DESC, time DESC, created_at DESC')
          .all(userId)
  ) as Array<Record<string, unknown>>;

  return rows.map((t) => ({
    id: String(t.id),
    userId: String(t.user_id),
    trackerKey: String(t.tracker_key),
    date: String(t.date),
    time: String(t.time),
    valueNumber: Number(t.value_number),
    unit: String(t.unit ?? ''),
    label: String(t.label ?? ''),
    notes: String(t.notes ?? ''),
    createdAt: String(t.created_at),
  }));
}

export function getCustomTrackers(userId: string): CustomTracker[] {
  const rows = db
    .prepare('SELECT * FROM custom_trackers WHERE user_id = ? ORDER BY created_at ASC')
    .all(userId) as Array<Record<string, unknown>>;

  return rows.map((c) => ({
    id: String(c.id),
    userId: String(c.user_id),
    name: String(c.name),
    unit: String(c.unit),
    dailyTarget: Number(c.daily_target ?? 1),
    icon: String(c.icon ?? 'sparkles'),
    color: String(c.color ?? '#5487FF'),
    createdAt: String(c.created_at),
  }));
}

export function getDayContext(userId: string, date: string, referenceToday: string): DayContext {
  const allRoutines = getRoutines(userId, date);
  const routines = allRoutines.filter((r) => doesRoutineOccurOnDate(r, date));

  const allTasks = getTasks(userId);
  const tasks = allTasks.filter((t) => t.dueDate === date);
  const overdueTasks =
    date === referenceToday
      ? allTasks.filter(
          (t) =>
            t.dueDate < referenceToday &&
            t.status !== 'Completed' &&
            t.status !== 'Skipped' &&
            t.status !== 'Cancelled'
        )
      : [];

  const events = getCalendarEvents(userId).filter((e) => e.date === date);
  const studySessions = getStudySessions(userId).filter((s) => s.date === date);
  const workSessions = getWorkSessions(userId).filter((w) => w.date === date);
  const focusSessions = getFocusSessions(userId).filter((f) => f.date === date);
  const journal = getJournalEntries(userId).find((j) => j.date === date) ?? null;
  const diaryLogs = getDiaryLogs(userId, date);
  const waterIntake = getWaterIntake(userId, date);
  const trackerEntries = getTrackerEntries(userId, date);
  const habits = getHabits(userId);
  const notes = getNotes(userId).filter((n) => n.linkedDate === date);

  const routinesCompleted = routines.filter((r) => r.occurrenceStatus === 'completed').length;
  const tasksCompleted = tasks.filter((t) => t.status === 'Completed').length;
  const focusMinutes = focusSessions.reduce((acc, f) => acc + f.actualMinutes, 0);
  const habitsDone = habits.filter((h) => h.entries.some((e) => e.date === date && e.completed)).length;

  const productivityScore = computeDailyProductivityScore({
    routinesTotal: routines.length,
    routinesCompleted,
    tasksTotal: tasks.length,
    tasksCompleted,
    focusMinutes,
    habitsDone,
    habitsTotal: habits.length,
  });

  // Persist daily snapshot score non-destructively
  db.prepare(
    `INSERT INTO daily_records (id, user_id, date, productivity_score, summary_note, updated_at)
     VALUES (?, ?, ?, ?, '', ?)
     ON CONFLICT(user_id, date) DO UPDATE SET productivity_score = excluded.productivity_score, updated_at = excluded.updated_at`
  ).run(uid('day'), userId, date, productivityScore, new Date().toISOString());

  return {
    date,
    routines,
    tasks,
    overdueTasks,
    events,
    studySessions,
    workSessions,
    focusSessions,
    journal,
    diaryLogs,
    waterIntake,
    trackerEntries,
    habits,
    notes,
    productivityScore,
  };
}

export function createSqliteBackupSnapshot(): string {
  const backupName = `mydayos.backup.${Date.now()}.sqlite`;
  const backupPath = path.join(DATA_DIR, backupName);
  fs.copyFileSync(DB_PATH, backupPath);
  return backupName;
}

export function getStorageStats(userId: string) {
  const sizeBytes = fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH).size : 0;
  const count = (table: string) =>
    (db.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE user_id = ?`).get(userId) as { c: number }).c;
  return {
    dbPath: 'data/mydayos.sqlite',
    sizeBytes,
    counts: {
      routines: count('routines'),
      tasks: count('tasks'),
      alarms: count('alarms'),
      events: count('calendar_events'),
      goals: count('goals'),
      habits: count('habits'),
      notes: count('notes'),
      journals: count('journal_entries'),
      diaryLogs: count('diary_logs'),
      waterEntries: count('water_entries'),
      trackerEntries: count('tracker_entries'),
      focusSessions: count('focus_sessions'),
    },
  };
}
