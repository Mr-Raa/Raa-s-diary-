import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import {
  createSqliteBackupSnapshot,
  db,
  getAiConversations,
  getAiMessages,
  getAlarms,
  getAllRoutineOccurrences,
  getCalendarEvents,
  getCustomTrackers,
  getDayContext,
  getDiaryLogs,
  getFocusSessions,
  getGoals,
  getHabits,
  getJournalEntries,
  getNotes,
  getNotifications,
  getRoutines,
  getSettings,
  getStorageStats,
  getStudySessions,
  getStudySubjects,
  getTasks,
  getTrackerEntries,
  getUserBySessionToken,
  getWaterEntries,
  getWaterIntake,
  getWorkProjects,
  getWorkSessions,
  hashPassword,
  initDatabase,
  logActivity,
  saveSettings,
  uid,
  verifyPassword,
  DEFAULT_SETTINGS,
} from './server/db';
import { getTodayInTimezone } from './src/utils/dateLogic';
import { buildDateRangeAnalytics } from './src/utils/analyticsLogic';
import {
  normalizeExternalQuotePayload,
  pickRandomAffirmation,
  type AffirmationCategory,
} from './src/utils/affirmationLogic';

let aiModulePromise: Promise<typeof import('./server/ai')> | null = null;
function loadAi() {
  if (!aiModulePromise) {
    aiModulePromise = import('./server/ai');
  }
  return aiModulePromise;
}

initDatabase();

const app = express();
app.use(express.json({ limit: '15mb' }));

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const result: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    result[key] = val;
  }
  return result;
}

function getCurrentUser(req: Request) {
  const cookies = parseCookies(req);
  return getUserBySessionToken(cookies.myday_session);
}

function setSessionCookie(res: Response, token: string) {
  res.setHeader(
    'Set-Cookie',
    `myday_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
  );
}

// Health
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timezone: 'Asia/Kolkata' });
});

// Web App Manifest (ensures Windows/Mac Desktop, iOS, Android & Play/App Store packaging support in dev & prod)
app.get('/manifest.webmanifest', (_req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json({
    id: '/',
    name: "Raa's Diary — Personal Life OS",
    short_name: "Raa's Diary",
    description:
      "Raa's Diary: Smart Alarms, Time-Stamped Daily Diary, Master Brain, Pomodoro Focus, Routines, Tasks & AURAA AI.",
    theme_color: '#0b0e16',
    background_color: '#0b0e16',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    orientation: 'any',
    categories: ['productivity', 'lifestyle', 'utilities'],
    start_url: '/',
    scope: '/',
    shortcuts: [
      {
        name: 'Quick Add Task',
        short_name: 'Tasks',
        description: "Open today's tasks in Raa's Diary",
        url: '/?module=tasks',
        icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Water Tracker',
        short_name: 'Water',
        description: 'Log water intake quickly',
        url: '/?module=trackers',
        icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'AURAA AI & Master Brain',
        short_name: 'AURAA AI',
        description: 'Ask AURAA AI in Gujarati, Hindi or English',
        url: '/?module=ai',
        icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
    icons: [
      {
        src: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  });
});

// Random Daily Affirmation (fetches external positive quote API with instant curated fallback)
app.get('/api/affirmations/random', async (req, res) => {
  const rawCategory = typeof req.query.category === 'string' ? req.query.category.toLowerCase() : 'all';
  const validCategories: AffirmationCategory[] = ['all', 'focus', 'calm', 'energy', 'gujarati'];
  const category: AffirmationCategory = validCategories.includes(rawCategory as AffirmationCategory)
    ? (rawCategory as AffirmationCategory)
    : 'all';
  const excludeId = typeof req.query.exclude === 'string' ? req.query.exclude : undefined;

  if (category === 'all' || category === 'focus' || category === 'calm' || category === 'energy') {
    try {
      const response = await fetch('https://dummyjson.com/quotes/random', {
        signal: AbortSignal.timeout(2500),
        headers: { Accept: 'application/json' },
      });
      if (response.ok) {
        const json = await response.json();
        const normalized = normalizeExternalQuotePayload(json);
        if (normalized && normalized.id !== excludeId) {
          return res.json(normalized);
        }
      }
    } catch {
      // Fallback cleanly to curated static collection below
    }
  }

  return res.json(pickRandomAffirmation(category, excludeId));
});

// Auth routes
app.get('/api/auth/session', (req, res) => {
  const user = getCurrentUser(req);
  res.json({ user });
});

app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password } = req.body as { name?: string; email?: string; password?: string };
    if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
      return res.status(400).json({ error: 'Name, valid email, and password (min 6 chars) are required.' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    const userId = uid('usr');
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, name.trim(), normalizedEmail, hashPassword(password), 'owner', now);

    db.prepare('INSERT INTO settings (user_id, json_data, updated_at) VALUES (?, ?, ?)').run(
      userId,
      JSON.stringify(DEFAULT_SETTINGS),
      now
    );

    const token = crypto.randomBytes(24).toString('hex');
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
      token,
      userId,
      now,
      expires
    );
    setSessionCookie(res, token);
    res.json({ user: { id: userId, name: name.trim(), email: normalizedEmail, role: 'owner', createdAt: now } });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to register' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const row = db
      .prepare('SELECT id, name, email, password_hash, role, created_at FROM users WHERE email = ?')
      .get(email.trim().toLowerCase()) as
      | { id: string; name: string; email: string; password_hash: string; role: string; created_at: string }
      | undefined;

    if (!row || !verifyPassword(password, row.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = crypto.randomBytes(24).toString('hex');
    const now = new Date().toISOString();
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
      token,
      row.id,
      now,
      expires
    );
    setSessionCookie(res, token);
    res.json({
      user: { id: row.id, name: row.name, email: row.email, role: row.role, createdAt: row.created_at },
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Login failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const cookies = parseCookies(req);
  if (cookies.myday_session) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(cookies.myday_session);
  }
  res.setHeader('Set-Cookie', 'myday_session=; HttpOnly; Path=/; Max-Age=0');
  res.json({ ok: true });
});

// Bootstrap entire workspace state
app.get('/api/bootstrap', (req, res) => {
  const user = getCurrentUser(req);
  const settings = getSettings(user.id);
  const today = getTodayInTimezone(settings.timezone || 'Asia/Kolkata');
  const requestedDate = typeof req.query.date === 'string' && req.query.date ? req.query.date : today;

  res.json({
    user,
    today,
    settings,
    dayContext: getDayContext(user.id, requestedDate, today),
    routines: getRoutines(user.id, requestedDate),
    routineOccurrences: getAllRoutineOccurrences(user.id),
    tasks: getTasks(user.id),
    alarms: getAlarms(user.id),
    diaryLogs: getDiaryLogs(user.id),
    waterIntake: getWaterIntake(user.id, requestedDate),
    waterEntries: getWaterEntries(user.id),
    trackerEntries: getTrackerEntries(user.id),
    customTrackers: getCustomTrackers(user.id),
    events: getCalendarEvents(user.id),
    goals: getGoals(user.id),
    habits: getHabits(user.id),
    studySubjects: getStudySubjects(user.id),
    studySessions: getStudySessions(user.id),
    workProjects: getWorkProjects(user.id),
    workSessions: getWorkSessions(user.id),
    focusSessions: getFocusSessions(user.id),
    notes: getNotes(user.id),
    journals: getJournalEntries(user.id),
    notifications: getNotifications(user.id),
    aiConversations: getAiConversations(user.id),
    storageStats: getStorageStats(user.id),
  });
});

// Specific day context (never overwrites past records)
app.get('/api/day-context', (req, res) => {
  const user = getCurrentUser(req);
  const settings = getSettings(user.id);
  const today = getTodayInTimezone(settings.timezone || 'Asia/Kolkata');
  const date = typeof req.query.date === 'string' && req.query.date ? req.query.date : today;
  res.json(getDayContext(user.id, date, today));
});

// Routines CRUD + Per-date occurrences
app.post('/api/routines', (req, res) => {
  const user = getCurrentUser(req);
  const b = req.body;
  if (!b.title?.trim() || !b.startTime || !b.endTime || !b.date) {
    return res.status(400).json({ error: 'Title, date, start time, and end time are required.' });
  }
  const id = uid('rtn');
  const now = new Date().toISOString();
  const maxOrder = (
    db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM routines WHERE user_id = ?').get(user.id) as { m: number }
  ).m;

  db.prepare(`
    INSERT INTO routines (id, user_id, title, description, start_time, end_time, date, end_date, category, priority, recurrence, selected_days, reminder_minutes, notes, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    user.id,
    b.title.trim(),
    b.description || '',
    b.startTime,
    b.endTime,
    b.date,
    b.endDate || null,
    b.category || 'Personal',
    b.priority || 'Medium',
    b.recurrence || 'daily',
    JSON.stringify(b.selectedDays || []),
    Number(b.reminderMinutes ?? 10),
    b.notes || '',
    maxOrder + 1,
    now,
    now
  );
  logActivity(user.id, 'create', 'routine', id, b.title.trim());
  res.json({ id });
});

app.put('/api/routines/:id', (req, res) => {
  const user = getCurrentUser(req);
  const b = req.body;
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE routines SET title = ?, description = ?, start_time = ?, end_time = ?, date = ?, end_date = ?, category = ?, priority = ?, recurrence = ?, selected_days = ?, reminder_minutes = ?, notes = ?, sort_order = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
    b.title?.trim(),
    b.description || '',
    b.startTime,
    b.endTime,
    b.date,
    b.endDate || null,
    b.category || 'Personal',
    b.priority || 'Medium',
    b.recurrence || 'daily',
    JSON.stringify(b.selectedDays || []),
    Number(b.reminderMinutes ?? 10),
    b.notes || '',
    Number(b.sortOrder ?? 0),
    now,
    req.params.id,
    user.id
  );
  res.json({ ok: true });
});

app.post('/api/routines/reorder', (req, res) => {
  const user = getCurrentUser(req);
  const { orderedIds } = req.body as { orderedIds: string[] };
  if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds array required' });
  const stmt = db.prepare('UPDATE routines SET sort_order = ? WHERE id = ? AND user_id = ?');
  orderedIds.forEach((id, idx) => stmt.run(idx + 1, id, user.id));
  res.json({ ok: true });
});

app.post('/api/routines/:id/occurrence', (req, res) => {
  const user = getCurrentUser(req);
  const { date, status, skippedReason, notes } = req.body as {
    date: string;
    status: string;
    skippedReason?: string;
    notes?: string;
  };
  if (!date || !status) return res.status(400).json({ error: 'date and status required' });
  const now = new Date().toISOString();
  const completedAt = status === 'completed' ? now : null;
  db.prepare(`
    INSERT INTO routine_occurrences (id, user_id, routine_id, date, status, completed_at, skipped_reason, notes, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, routine_id, date) DO UPDATE SET
      status = excluded.status,
      completed_at = excluded.completed_at,
      skipped_reason = excluded.skipped_reason,
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `).run(uid('occ'), user.id, req.params.id, date, status, completedAt, skippedReason || null, notes || '', now);
  logActivity(user.id, `occurrence_${status}`, 'routine', req.params.id, date);
  res.json({ ok: true });
});

app.delete('/api/routines/:id', (req, res) => {
  const user = getCurrentUser(req);
  db.prepare('DELETE FROM routines WHERE id = ? AND user_id = ?').run(req.params.id, user.id);
  res.json({ ok: true });
});

// Tasks & Subtasks CRUD
app.post('/api/tasks', (req, res) => {
  const user = getCurrentUser(req);
  const b = req.body;
  if (!b.title?.trim() || !b.dueDate) {
    return res.status(400).json({ error: 'Task title and due date are required.' });
  }
  const id = uid('tsk');
  const now = new Date().toISOString();
  const completedAt = b.status === 'Completed' ? now : null;
  db.prepare(`
    INSERT INTO tasks (id, user_id, title, description, due_date, due_time, category, priority, status, recurrence, reminder_minutes, notes, completed_at, skipped_reason, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    user.id,
    b.title.trim(),
    b.description || '',
    b.dueDate,
    b.dueTime || '',
    b.category || 'Personal',
    b.priority || 'Medium',
    b.status || 'Not Started',
    b.recurrence || 'none',
    Number(b.reminderMinutes ?? 15),
    b.notes || '',
    completedAt,
    b.skippedReason || null,
    now,
    now
  );
  if (Array.isArray(b.subtasks)) {
    const subStmt = db.prepare('INSERT INTO subtasks (id, task_id, title, completed) VALUES (?, ?, ?, ?)');
    for (const st of b.subtasks) {
      if (st.title?.trim()) subStmt.run(uid('sub'), id, st.title.trim(), st.completed ? 1 : 0);
    }
  }
  logActivity(user.id, 'create', 'task', id, b.title.trim());
  res.json({ id });
});

app.put('/api/tasks/:id', (req, res) => {
  const user = getCurrentUser(req);
  const b = req.body;
  const existing = db.prepare('SELECT status, completed_at FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, user.id) as
    | { status: string; completed_at: string | null }
    | undefined;
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  const now = new Date().toISOString();
  const nextStatus = b.status ?? existing.status;
  const completedAt =
    nextStatus === 'Completed' ? existing.completed_at || now : null;

  db.prepare(`
    UPDATE tasks SET title = ?, description = ?, due_date = ?, due_time = ?, category = ?, priority = ?, status = ?, recurrence = ?, reminder_minutes = ?, notes = ?, completed_at = ?, skipped_reason = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
    b.title?.trim(),
    b.description || '',
    b.dueDate,
    b.dueTime || '',
    b.category || 'Personal',
    b.priority || 'Medium',
    nextStatus,
    b.recurrence || 'none',
    Number(b.reminderMinutes ?? 15),
    b.notes || '',
    completedAt,
    b.skippedReason || null,
    now,
    req.params.id,
    user.id
  );

  if (Array.isArray(b.subtasks)) {
    db.prepare('DELETE FROM subtasks WHERE task_id = ?').run(req.params.id);
    const subStmt = db.prepare('INSERT INTO subtasks (id, task_id, title, completed) VALUES (?, ?, ?, ?)');
    for (const st of b.subtasks) {
      if (st.title?.trim()) subStmt.run(st.id || uid('sub'), req.params.id, st.title.trim(), st.completed ? 1 : 0);
    }
  }
  res.json({ ok: true, completedAt });
});

app.delete('/api/tasks/:id', (req, res) => {
  const user = getCurrentUser(req);
  db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(req.params.id, user.id);
  res.json({ ok: true });
});

// Calendar Events CRUD + ICS Export
app.post('/api/events', (req, res) => {
  const user = getCurrentUser(req);
  const b = req.body;
  if (!b.title?.trim() || !b.date || !b.startTime || !b.endTime) {
    return res.status(400).json({ error: 'Title, date, start time, and end time are required.' });
  }
  const id = uid('evt');
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO calendar_events (id, user_id, title, description, date, start_time, end_time, category, color, location, recurrence, notes, source, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    user.id,
    b.title.trim(),
    b.description || '',
    b.date,
    b.startTime,
    b.endTime,
    b.category || 'Personal',
    b.color || '#6b9cff',
    b.location || '',
    b.recurrence || 'none',
    b.notes || '',
    b.source || 'local',
    now,
    now
  );
  res.json({ id });
});

app.put('/api/events/:id', (req, res) => {
  const user = getCurrentUser(req);
  const b = req.body;
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE calendar_events SET title = ?, description = ?, date = ?, start_time = ?, end_time = ?, category = ?, color = ?, location = ?, recurrence = ?, notes = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
    b.title?.trim(),
    b.description || '',
    b.date,
    b.startTime,
    b.endTime,
    b.category || 'Personal',
    b.color || '#6b9cff',
    b.location || '',
    b.recurrence || 'none',
    b.notes || '',
    now,
    req.params.id,
    user.id
  );
  res.json({ ok: true });
});

app.delete('/api/events/:id', (req, res) => {
  const user = getCurrentUser(req);
  db.prepare('DELETE FROM calendar_events WHERE id = ? AND user_id = ?').run(req.params.id, user.id);
  res.json({ ok: true });
});

app.get('/api/calendar/export.ics', (req, res) => {
  const user = getCurrentUser(req);
  const events = getCalendarEvents(user.id);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MY DAY OS//Personal Life OS//EN',
  ];
  for (const e of events) {
    const dt = e.date.replace(/-/g, '');
    const st = e.startTime.replace(':', '') + '00';
    const et = e.endTime.replace(':', '') + '00';
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${e.id}@mydayos`);
    lines.push(`DTSTART;TZID=Asia/Kolkata:${dt}T${st}`);
    lines.push(`DTEND;TZID=Asia/Kolkata:${dt}T${et}`);
    lines.push(`SUMMARY:${e.title.replace(/\n/g, ' ')}`);
    if (e.description) lines.push(`DESCRIPTION:${e.description.replace(/\n/g, ' ')}`);
    if (e.location) lines.push(`LOCATION:${e.location.replace(/\n/g, ' ')}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="mydayos-calendar.ics"');
  res.send(lines.join('\r\n'));
});

// Goals & Milestones
app.post('/api/goals', (req, res) => {
  const user = getCurrentUser(req);
  const b = req.body;
  if (!b.title?.trim() || !b.targetDate) {
    return res.status(400).json({ error: 'Goal title and target date are required.' });
  }
  const id = uid('gol');
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO goals (id, user_id, title, description, category, start_date, target_date, progress, status, priority, notes, reminder_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    user.id,
    b.title.trim(),
    b.description || '',
    b.category || 'Personal',
    b.startDate || getTodayInTimezone('Asia/Kolkata'),
    b.targetDate,
    Number(b.progress ?? 0),
    b.status || 'Active',
    b.priority || 'Medium',
    b.notes || '',
    b.reminderDate || null,
    now,
    now
  );
  if (Array.isArray(b.milestones)) {
    const stmt = db.prepare('INSERT INTO milestones (id, goal_id, title, completed, target_date) VALUES (?, ?, ?, ?, ?)');
    for (const m of b.milestones) {
      if (m.title?.trim()) stmt.run(uid('mls'), id, m.title.trim(), m.completed ? 1 : 0, m.targetDate || null);
    }
  }
  res.json({ id });
});

app.put('/api/goals/:id', (req, res) => {
  const user = getCurrentUser(req);
  const b = req.body;
  const now = new Date().toISOString();
  const completionDate = b.status === 'Completed' ? b.completionDate || getTodayInTimezone('Asia/Kolkata') : null;
  db.prepare(`
    UPDATE goals SET title = ?, description = ?, category = ?, start_date = ?, target_date = ?, progress = ?, status = ?, priority = ?, notes = ?, reminder_date = ?, completion_date = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
    b.title?.trim(),
    b.description || '',
    b.category || 'Personal',
    b.startDate,
    b.targetDate,
    Number(b.progress ?? 0),
    b.status || 'Active',
    b.priority || 'Medium',
    b.notes || '',
    b.reminderDate || null,
    completionDate,
    now,
    req.params.id,
    user.id
  );
  if (Array.isArray(b.milestones)) {
    db.prepare('DELETE FROM milestones WHERE goal_id = ?').run(req.params.id);
    const stmt = db.prepare('INSERT INTO milestones (id, goal_id, title, completed, target_date) VALUES (?, ?, ?, ?, ?)');
    for (const m of b.milestones) {
      if (m.title?.trim()) stmt.run(m.id || uid('mls'), req.params.id, m.title.trim(), m.completed ? 1 : 0, m.targetDate || null);
    }
  }
  res.json({ ok: true });
});

app.delete('/api/goals/:id', (req, res) => {
  const user = getCurrentUser(req);
  db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').run(req.params.id, user.id);
  res.json({ ok: true });
});

// Habits
app.post('/api/habits', (req, res) => {
  const user = getCurrentUser(req);
  const b = req.body;
  if (!b.title?.trim()) return res.status(400).json({ error: 'Habit title is required.' });
  const id = uid('hab');
  const now = new Date().toISOString();
  db.prepare('INSERT INTO habits (id, user_id, title, category, weekly_target, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    id,
    user.id,
    b.title.trim(),
    b.category || 'Health',
    Number(b.weeklyTarget ?? 7),
    b.notes || '',
    now,
    now
  );
  res.json({ id });
});

app.post('/api/habits/:id/toggle', (req, res) => {
  const user = getCurrentUser(req);
  const { date, completed, notes } = req.body as { date: string; completed: boolean; notes?: string };
  if (!date) return res.status(400).json({ error: 'Date required' });
  db.prepare(`
    INSERT INTO habit_entries (id, user_id, habit_id, date, completed, notes)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(habit_id, date) DO UPDATE SET completed = excluded.completed, notes = excluded.notes
  `).run(uid('hbe'), user.id, req.params.id, date, completed ? 1 : 0, notes || '');
  res.json({ ok: true });
});

app.delete('/api/habits/:id', (req, res) => {
  const user = getCurrentUser(req);
  db.prepare('DELETE FROM habits WHERE id = ? AND user_id = ?').run(req.params.id, user.id);
  res.json({ ok: true });
});

// Study Subjects & Sessions
app.post('/api/study/subjects', (req, res) => {
  const user = getCurrentUser(req);
  const b = req.body;
  if (!b.name?.trim()) return res.status(400).json({ error: 'Subject name is required.' });
  const id = uid('sub');
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO study_subjects (id, user_id, name, chapters_total, chapters_completed, next_revision_date, target_hours, notes, color, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    user.id,
    b.name.trim(),
    Number(b.chaptersTotal ?? 10),
    Number(b.chaptersCompleted ?? 0),
    b.nextRevisionDate || '',
    Number(b.targetHours ?? 20),
    b.notes || '',
    b.color || '#6b9cff',
    now,
    now
  );
  res.json({ id });
});

app.put('/api/study/subjects/:id', (req, res) => {
  const user = getCurrentUser(req);
  const b = req.body;
  db.prepare(`
    UPDATE study_subjects SET name = ?, chapters_total = ?, chapters_completed = ?, next_revision_date = ?, target_hours = ?, notes = ?, color = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
    b.name?.trim(),
    Number(b.chaptersTotal ?? 10),
    Number(b.chaptersCompleted ?? 0),
    b.nextRevisionDate || '',
    Number(b.targetHours ?? 20),
    b.notes || '',
    b.color || '#6b9cff',
    new Date().toISOString(),
    req.params.id,
    user.id
  );
  res.json({ ok: true });
});

app.delete('/api/study/subjects/:id', (req, res) => {
  const user = getCurrentUser(req);
  db.prepare('DELETE FROM study_subjects WHERE id = ? AND user_id = ?').run(req.params.id, user.id);
  res.json({ ok: true });
});

app.post('/api/study/sessions', (req, res) => {
  const user = getCurrentUser(req);
  const b = req.body;
  if (!b.subjectId || !b.date || !b.durationMinutes) {
    return res.status(400).json({ error: 'Subject, date, and duration are required.' });
  }
  const id = uid('sts');
  db.prepare(
    'INSERT INTO study_sessions (id, user_id, subject_id, date, duration_minutes, topic, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, user.id, b.subjectId, b.date, Number(b.durationMinutes), b.topic || '', b.notes || '', new Date().toISOString());
  res.json({ id });
});

// Work Projects & Sessions
app.post('/api/work/projects', (req, res) => {
  const user = getCurrentUser(req);
  const b = req.body;
  if (!b.title?.trim() || !b.deadline) return res.status(400).json({ error: 'Project title and deadline are required.' });
  const id = uid('wrk');
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO work_projects (id, user_id, title, client_or_team, deadline, priority, status, progress, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, user.id, b.title.trim(), b.clientOrTeam || '', b.deadline, b.priority || 'Medium', b.status || 'Active', Number(b.progress ?? 0), b.notes || '', now, now);
  res.json({ id });
});

app.put('/api/work/projects/:id', (req, res) => {
  const user = getCurrentUser(req);
  const b = req.body;
  db.prepare(`
    UPDATE work_projects SET title = ?, client_or_team = ?, deadline = ?, priority = ?, status = ?, progress = ?, notes = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(b.title?.trim(), b.clientOrTeam || '', b.deadline, b.priority || 'Medium', b.status || 'Active', Number(b.progress ?? 0), b.notes || '', new Date().toISOString(), req.params.id, user.id);
  res.json({ ok: true });
});

app.delete('/api/work/projects/:id', (req, res) => {
  const user = getCurrentUser(req);
  db.prepare('DELETE FROM work_projects WHERE id = ? AND user_id = ?').run(req.params.id, user.id);
  res.json({ ok: true });
});

app.post('/api/work/sessions', (req, res) => {
  const user = getCurrentUser(req);
  const b = req.body;
  if (!b.projectId || !b.date || !b.durationMinutes) {
    return res.status(400).json({ error: 'Project, date, and duration are required.' });
  }
  const id = uid('wks');
  db.prepare(
    'INSERT INTO work_sessions (id, user_id, project_id, date, duration_minutes, summary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, user.id, b.projectId, b.date, Number(b.durationMinutes), b.summary || '', new Date().toISOString());
  res.json({ id });
});

// Focus Sessions
app.post('/api/focus/sessions', (req, res) => {
  const user = getCurrentUser(req);
  const b = req.body;
  const id = uid('fcs');
  db.prepare(`
    INSERT INTO focus_sessions (id, user_id, date, mode, planned_minutes, actual_minutes, linked_type, linked_id, linked_title, started_at, ended_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    user.id,
    b.date || getTodayInTimezone('Asia/Kolkata'),
    b.mode || 'pomodoro',
    Number(b.plannedMinutes ?? 25),
    Number(b.actualMinutes ?? 25),
    b.linkedType || 'none',
    b.linkedId || '',
    b.linkedTitle || '',
    b.startedAt || new Date().toISOString(),
    b.endedAt || new Date().toISOString()
  );
  res.json({ id });
});

// Notes & Daily Journal
app.post('/api/notes', (req, res) => {
  const user = getCurrentUser(req);
  const b = req.body;
  if (!b.title?.trim()) return res.status(400).json({ error: 'Note title is required.' });
  const id = uid('not');
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO notes (id, user_id, title, content, category, tags, pinned, linked_date, linked_task_id, linked_goal_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    user.id,
    b.title.trim(),
    b.content || '',
    b.category || 'Personal',
    JSON.stringify(b.tags || []),
    b.pinned ? 1 : 0,
    b.linkedDate || null,
    b.linkedTaskId || null,
    b.linkedGoalId || null,
    now,
    now
  );
  res.json({ id });
});

app.put('/api/notes/:id', (req, res) => {
  const user = getCurrentUser(req);
  const b = req.body;
  db.prepare(`
    UPDATE notes SET title = ?, content = ?, category = ?, tags = ?, pinned = ?, linked_date = ?, linked_task_id = ?, linked_goal_id = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
    b.title?.trim(),
    b.content || '',
    b.category || 'Personal',
    JSON.stringify(b.tags || []),
    b.pinned ? 1 : 0,
    b.linkedDate || null,
    b.linkedTaskId || null,
    b.linkedGoalId || null,
    new Date().toISOString(),
    req.params.id,
    user.id
  );
  res.json({ ok: true });
});

app.delete('/api/notes/:id', (req, res) => {
  const user = getCurrentUser(req);
  db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(req.params.id, user.id);
  res.json({ ok: true });
});

app.post('/api/journals', (req, res) => {
  const user = getCurrentUser(req);
  const b = req.body;
  if (!b.date) return res.status(400).json({ error: 'Journal date is required.' });
  const today = getTodayInTimezone(getSettings(user.id).timezone || 'Asia/Kolkata');
  const existing = db.prepare('SELECT locked FROM journal_entries WHERE user_id = ? AND date = ?').get(user.id, b.date) as
    | { locked: number }
    | undefined;
  if (existing?.locked && b.date < today && !b.explicitHistoricalEdit) {
    return res.status(403).json({
      error: 'Historical journal record is protected. Confirm explicit edit unlock to modify past days.',
    });
  }
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO journal_entries (id, user_id, date, mood, reflection, achievements, gratitude, locked, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET
      mood = excluded.mood,
      reflection = excluded.reflection,
      achievements = excluded.achievements,
      gratitude = excluded.gratitude,
      locked = excluded.locked,
      updated_at = excluded.updated_at
  `).run(uid('jrn'), user.id, b.date, b.mood || 'Focused', b.reflection || '', b.achievements || '', b.gratitude || '', b.date < today ? 1 : 0, now, now);
  logActivity(user.id, 'save_journal', 'journal', b.date, b.explicitHistoricalEdit ? 'explicit_historical_edit' : 'daily');
  res.json({ ok: true });
});

// Alarms & Reminders CRUD
app.post('/api/alarms', (req, res) => {
  const user = getCurrentUser(req);
  const b = req.body;
  if (!b.title?.trim() || !b.time) {
    return res.status(400).json({ error: 'Alarm title and time are required.' });
  }
  const id = uid('alm');
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO alarms (id, user_id, title, reminder_note, alarm_type, time, repeat_mode, selected_days, interval_minutes, start_time, end_time, tone, enabled, snooze_minutes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    user.id,
    b.title.trim(),
    b.reminderNote || '',
    b.alarmType || 'custom',
    b.time,
    b.repeatMode || 'daily',
    JSON.stringify(b.selectedDays || []),
    Number(b.intervalMinutes ?? 60),
    b.startTime || b.time,
    b.endTime || '21:00',
    b.tone || 'crystal',
    b.enabled === false ? 0 : 1,
    Number(b.snoozeMinutes ?? 5),
    now,
    now
  );
  logActivity(user.id, 'create', 'alarm', id, b.title.trim());
  res.json({ id });
});

app.put('/api/alarms/:id', (req, res) => {
  const user = getCurrentUser(req);
  const b = req.body;
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE alarms SET title = ?, reminder_note = ?, alarm_type = ?, time = ?, repeat_mode = ?, selected_days = ?, interval_minutes = ?, start_time = ?, end_time = ?, tone = ?, enabled = ?, snooze_minutes = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
    b.title?.trim(),
    b.reminderNote || '',
    b.alarmType || 'custom',
    b.time,
    b.repeatMode || 'daily',
    JSON.stringify(b.selectedDays || []),
    Number(b.intervalMinutes ?? 60),
    b.startTime || b.time,
    b.endTime || '21:00',
    b.tone || 'crystal',
    b.enabled === false ? 0 : 1,
    Number(b.snoozeMinutes ?? 5),
    now,
    req.params.id,
    user.id
  );
  res.json({ ok: true });
});

app.post('/api/alarms/:id/toggle', (req, res) => {
  const user = getCurrentUser(req);
  const enabled = req.body.enabled ? 1 : 0;
  db.prepare('UPDATE alarms SET enabled = ?, updated_at = ? WHERE id = ? AND user_id = ?').run(
    enabled,
    new Date().toISOString(),
    req.params.id,
    user.id
  );
  res.json({ ok: true });
});

app.post('/api/alarms/:id/triggered', (req, res) => {
  const user = getCurrentUser(req);
  db.prepare('UPDATE alarms SET last_triggered_at = ? WHERE id = ? AND user_id = ?').run(
    new Date().toISOString(),
    req.params.id,
    user.id
  );
  res.json({ ok: true });
});

app.delete('/api/alarms/:id', (req, res) => {
  const user = getCurrentUser(req);
  db.prepare('DELETE FROM alarms WHERE id = ? AND user_id = ?').run(req.params.id, user.id);
  res.json({ ok: true });
});

// Daily Time-Stamped Diary Logs ("Ketla vage su karyu")
app.post('/api/diary-logs', (req, res) => {
  const user = getCurrentUser(req);
  const b = req.body;
  if (!b.date || !b.entryTime || !b.activity?.trim()) {
    return res.status(400).json({ error: 'Date, time, and activity note are required.' });
  }
  const id = uid('dlg');
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO diary_logs (id, user_id, date, entry_time, title, activity, category, mood, energy, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    user.id,
    b.date,
    b.entryTime,
    b.title?.trim() || '',
    b.activity.trim(),
    b.category || 'Personal',
    b.mood || 'Calm',
    Number(b.energy ?? 4),
    now,
    now
  );
  logActivity(user.id, 'create', 'diary_log', id, `${b.date} ${b.entryTime}`);
  res.json({ id });
});

app.put('/api/diary-logs/:id', (req, res) => {
  const user = getCurrentUser(req);
  const b = req.body;
  db.prepare(`
    UPDATE diary_logs SET date = ?, entry_time = ?, title = ?, activity = ?, category = ?, mood = ?, energy = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
    b.date,
    b.entryTime,
    b.title?.trim() || '',
    b.activity?.trim() || '',
    b.category || 'Personal',
    b.mood || 'Calm',
    Number(b.energy ?? 4),
    new Date().toISOString(),
    req.params.id,
    user.id
  );
  res.json({ ok: true });
});

app.delete('/api/diary-logs/:id', (req, res) => {
  const user = getCurrentUser(req);
  db.prepare('DELETE FROM diary_logs WHERE id = ? AND user_id = ?').run(req.params.id, user.id);
  res.json({ ok: true });
});

// Daily Water Intake Tracker (ml entries + summary + goal sync)
app.post('/api/water', (req, res) => {
  const user = getCurrentUser(req);
  const settings = getSettings(user.id);
  const tz = settings.timezone || 'Asia/Kolkata';
  const today = getTodayInTimezone(tz);
  const date = typeof req.body.date === 'string' && req.body.date ? req.body.date : today;
  const now = new Date().toISOString();
  const timeHHmm =
    typeof req.body.time === 'string' && req.body.time
      ? req.body.time
      : new Intl.DateTimeFormat('en-GB', {
          timeZone: tz,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(new Date());

  // Preserve any legacy water_logs total for this date before adding the first granular entry
  const existingEntries = getWaterEntries(user.id, date);
  if (existingEntries.length === 0) {
    const legacyLog = db
      .prepare('SELECT glasses FROM water_logs WHERE user_id = ? AND date = ?')
      .get(user.id, date) as { glasses: number } | undefined;
    if (legacyLog && legacyLog.glasses > 0) {
      db.prepare(
        'INSERT INTO water_entries (id, user_id, date, time, amount_ml, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(uid('wen'), user.id, date, '08:00', Math.round(legacyLog.glasses * 250), 'Earlier today', now);
    }
  }

  if (typeof req.body.amountMl === 'number' && req.body.amountMl > 0) {
    const id = uid('wen');
    const amountMl = Math.min(5000, Math.round(req.body.amountMl));
    db.prepare(
      'INSERT INTO water_entries (id, user_id, date, time, amount_ml, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, user.id, date, timeHHmm, amountMl, String(req.body.note || ''), now);
    logActivity(user.id, 'log_water', 'water_entry', id, `${amountMl}ml on ${date}`);
  } else if (typeof req.body.delta === 'number' && req.body.delta > 0) {
    const id = uid('wen');
    const amountMl = Math.round(req.body.delta * 250);
    db.prepare(
      'INSERT INTO water_entries (id, user_id, date, time, amount_ml, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, user.id, date, timeHHmm, amountMl, '1 glass (250ml)', now);
  }

  if (typeof req.body.goalMl === 'number' && req.body.goalMl >= 250) {
    saveSettings(user.id, { dailyWaterGoalMl: Math.round(req.body.goalMl) });
  }

  const updated = getWaterIntake(user.id, date);
  db.prepare(`
    INSERT INTO water_logs (id, user_id, date, glasses, target_glasses, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET
      glasses = excluded.glasses,
      target_glasses = excluded.target_glasses,
      updated_at = excluded.updated_at
  `).run(uid('wat'), user.id, date, Math.round(updated.glasses), updated.targetGlasses, now);

  res.json(updated);
});

app.put('/api/water/entries/:id', (req, res) => {
  const user = getCurrentUser(req);
  const amountMl = Math.max(10, Math.min(5000, Number(req.body.amountMl ?? 250)));
  const note = String(req.body.note ?? '');
  const time = typeof req.body.time === 'string' && req.body.time ? req.body.time : undefined;
  if (time) {
    db.prepare('UPDATE water_entries SET amount_ml = ?, note = ?, time = ? WHERE id = ? AND user_id = ?').run(
      amountMl,
      note,
      time,
      req.params.id,
      user.id
    );
  } else {
    db.prepare('UPDATE water_entries SET amount_ml = ?, note = ? WHERE id = ? AND user_id = ?').run(
      amountMl,
      note,
      req.params.id,
      user.id
    );
  }
  res.json({ ok: true });
});

app.delete('/api/water/entries/:id', (req, res) => {
  const user = getCurrentUser(req);
  db.prepare('DELETE FROM water_entries WHERE id = ? AND user_id = ?').run(req.params.id, user.id);
  res.json({ ok: true });
});

// Health & Wellness Trackers + Custom Trackers
app.post('/api/trackers/entries', (req, res) => {
  const user = getCurrentUser(req);
  const settings = getSettings(user.id);
  const tz = settings.timezone || 'Asia/Kolkata';
  const today = getTodayInTimezone(tz);
  const b = req.body;
  if (!b.trackerKey || typeof b.valueNumber !== 'number') {
    return res.status(400).json({ error: 'trackerKey and valueNumber are required.' });
  }
  const date = typeof b.date === 'string' && b.date ? b.date : today;
  const time =
    typeof b.time === 'string' && b.time
      ? b.time
      : new Intl.DateTimeFormat('en-GB', {
          timeZone: tz,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(new Date());
  const id = uid('trk');
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO tracker_entries (id, user_id, tracker_key, date, time, value_number, unit, label, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id,
    user.id,
    String(b.trackerKey),
    date,
    time,
    Number(b.valueNumber),
    String(b.unit || ''),
    String(b.label || ''),
    String(b.notes || ''),
    now
  );
  logActivity(user.id, 'log_tracker', String(b.trackerKey), id, `${b.valueNumber} ${b.unit || ''}`);
  res.json({ id });
});

app.delete('/api/trackers/entries/:id', (req, res) => {
  const user = getCurrentUser(req);
  db.prepare('DELETE FROM tracker_entries WHERE id = ? AND user_id = ?').run(req.params.id, user.id);
  res.json({ ok: true });
});

app.post('/api/custom-trackers', (req, res) => {
  const user = getCurrentUser(req);
  const b = req.body;
  if (!b.name?.trim() || !b.unit?.trim()) {
    return res.status(400).json({ error: 'Tracker name and unit are required.' });
  }
  const id = uid('ctk');
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO custom_trackers (id, user_id, name, unit, daily_target, icon, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id,
    user.id,
    b.name.trim(),
    b.unit.trim(),
    Math.max(1, Number(b.dailyTarget ?? 1)),
    String(b.icon || 'sparkles'),
    String(b.color || '#5487FF'),
    now
  );
  logActivity(user.id, 'create', 'custom_tracker', id, b.name.trim());
  res.json({ id });
});

app.delete('/api/custom-trackers/:id', (req, res) => {
  const user = getCurrentUser(req);
  db.prepare('DELETE FROM custom_trackers WHERE id = ? AND user_id = ?').run(req.params.id, user.id);
  db.prepare('DELETE FROM tracker_entries WHERE tracker_key = ? AND user_id = ?').run(req.params.id, user.id);
  res.json({ ok: true });
});

// Notifications
app.post('/api/notifications/:id/read', (req, res) => {
  const user = getCurrentUser(req);
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, user.id);
  res.json({ ok: true });
});

app.post('/api/notifications/mark-all-read', (req, res) => {
  const user = getCurrentUser(req);
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(user.id);
  res.json({ ok: true });
});

// Analytics computed purely from stored database records
app.get('/api/analytics', (req, res) => {
  const user = getCurrentUser(req);
  const settings = getSettings(user.id);
  const today = getTodayInTimezone(settings.timezone || 'Asia/Kolkata');
  const days = Math.min(90, Math.max(7, Number(req.query.days ?? 14)));

  const points = buildDateRangeAnalytics({
    endDate: today,
    daysCount: days,
    routines: getRoutines(user.id),
    routineOccurrences: getAllRoutineOccurrences(user.id),
    tasks: getTasks(user.id),
    studySessions: getStudySessions(user.id),
    workSessions: getWorkSessions(user.id),
    focusSessions: getFocusSessions(user.id),
    habits: getHabits(user.id),
  });

  res.json({ days, endDate: today, points });
});

// Settings
app.put('/api/settings', (req, res) => {
  const user = getCurrentUser(req);
  const updated = saveSettings(user.id, req.body);
  res.json(updated);
});

// AI Conversations & Chat
app.post('/api/ai/conversations', (req, res) => {
  const user = getCurrentUser(req);
  const id = uid('aic');
  const now = new Date().toISOString();
  db.prepare('INSERT INTO ai_conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
    id,
    user.id,
    req.body.title?.trim() || "New Raa's AI Session",
    now,
    now
  );
  res.json({ id });
});

app.get('/api/ai/conversations/:id/messages', (req, res) => {
  res.json(getAiMessages(req.params.id));
});

app.delete('/api/ai/conversations/:id', (req, res) => {
  const user = getCurrentUser(req);
  db.prepare('DELETE FROM ai_conversations WHERE id = ? AND user_id = ?').run(req.params.id, user.id);
  res.json({ ok: true });
});

app.post('/api/ai/chat', async (req, res) => {
  const user = getCurrentUser(req);
  const { conversationId, message, requestedModel, highThinking, voiceMode, imageBase64, imageMimeType } = req.body as {
    conversationId?: string;
    message?: string;
    requestedModel?: 'gemini-4-hydrogen' | 'gemini-4-carbon' | 'gemini-3.1-flash-lite' | 'gemini-4-argon';
    highThinking?: boolean;
    voiceMode?: boolean;
    imageBase64?: string;
    imageMimeType?: string;
  };

  if (!message?.trim() && !imageBase64) {
    return res.status(400).json({ error: 'Message or image is required.' });
  }

  let convId = conversationId;
  const now = new Date().toISOString();
  if (!convId) {
    convId = uid('aic');
    db.prepare('INSERT INTO ai_conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
      convId,
      user.id,
      (message || 'Image Schedule Analysis').slice(0, 46),
      now,
      now
    );
  }

  const prevMessages = getAiMessages(convId).map((m) => ({ role: m.role, content: m.content }));
  const userMsgId = uid('aim');
  db.prepare(
    'INSERT INTO ai_messages (id, conversation_id, role, content, image_attached, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(userMsgId, convId, 'user', message || '[Attached Image]', imageBase64 ? 1 : 0, now);

  try {
    const { runMyDayAiChat } = await loadAi();
    const result = await runMyDayAiChat({
      userId: user.id,
      history: prevMessages,
      message: message || '',
      requestedModel,
      highThinking,
      voiceMode,
      imageBase64,
      imageMimeType,
    });

    const assistantMsgId = uid('aim');
    const respNow = new Date().toISOString();
    db.prepare(
      'INSERT INTO ai_messages (id, conversation_id, role, content, model, thinking_used, proposed_actions, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      assistantMsgId,
      convId,
      'assistant',
      result.reply,
      result.modelUsed,
      result.thinkingUsed ? 1 : 0,
      result.proposedActions.length ? JSON.stringify(result.proposedActions) : null,
      respNow
    );
    db.prepare('UPDATE ai_conversations SET updated_at = ? WHERE id = ?').run(respNow, convId);

    res.json({
      conversationId: convId,
      assistantMessage: {
        id: assistantMsgId,
        conversationId: convId,
        role: 'assistant',
        content: result.reply,
        model: result.modelUsed,
        thinkingUsed: result.thinkingUsed,
        proposedActions: result.proposedActions,
        createdAt: respNow,
      },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'AI request failed.';
    res.status(500).json({ error: errMsg, conversationId: convId });
  }
});

app.get('/api/ai/quick-insight', async (req, res) => {
  const user = getCurrentUser(req);
  try {
    const { generateQuickDashboardInsight } = await loadAi();
    const data = await generateQuickDashboardInsight(user.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Could not fetch AI insight.' });
  }
});

app.get('/api/ai/affirmation', async (req, res) => {
  const user = getCurrentUser(req);
  const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';
  try {
    const { generateDailyAffirmation } = await loadAi();
    const data = await generateDailyAffirmation(user.id, forceRefresh);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Could not fetch daily affirmation.' });
  }
});

app.post('/api/ai/daily-planner', async (req, res) => {
  const user = getCurrentUser(req);
  try {
    const { generateAiDailySchedule } = await loadAi();
    const data = await generateAiDailySchedule(user.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Could not generate daily plan.' });
  }
});

// Confirmed AI Action Execution (Never silent; verifies DB write)
app.post('/api/ai/apply-action', (req, res) => {
  const user = getCurrentUser(req);
  const { action, messageId, actionIndex } = req.body as {
    action: { type: string; payload: Record<string, unknown> };
    messageId?: string;
    actionIndex?: number;
  };
  if (!action?.type || !action.payload) {
    return res.status(400).json({ error: 'Invalid proposed action payload.' });
  }

  const now = new Date().toISOString();
  const today = getTodayInTimezone(getSettings(user.id).timezone || 'Asia/Kolkata');
  const p = action.payload;

  try {
    if (action.type === 'create_task') {
      const id = uid('tsk');
      db.prepare(`
        INSERT INTO tasks (id, user_id, title, description, due_date, due_time, category, priority, status, recurrence, reminder_minutes, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Not Started', 'none', 15, '', ?, ?)
      `).run(
        id,
        user.id,
        String(p.title || 'New Task'),
        String(p.description || ''),
        String(p.dueDate || today),
        String(p.dueTime || ''),
        String(p.category || 'Personal'),
        String(p.priority || 'Medium'),
        now,
        now
      );
    } else if (action.type === 'create_routine') {
      const id = uid('rtn');
      db.prepare(`
        INSERT INTO routines (id, user_id, title, description, start_time, end_time, date, category, priority, recurrence, selected_days, reminder_minutes, notes, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', 10, '', 99, ?, ?)
      `).run(
        id,
        user.id,
        String(p.title || 'New Routine'),
        String(p.description || ''),
        String(p.startTime || '08:00'),
        String(p.endTime || '08:30'),
        String(p.date || today),
        String(p.category || 'Personal'),
        String(p.priority || 'Medium'),
        String(p.recurrence || 'daily'),
        now,
        now
      );
    } else if (action.type === 'reschedule_task') {
      const result = db
        .prepare('UPDATE tasks SET due_date = ?, due_time = COALESCE(?, due_time), updated_at = ? WHERE id = ? AND user_id = ?')
        .run(String(p.dueDate || today), p.dueTime ? String(p.dueTime) : null, now, String(p.taskId || ''), user.id);
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Target task was not found in database.' });
      }
    } else if (action.type === 'create_event') {
      const id = uid('evt');
      db.prepare(`
        INSERT INTO calendar_events (id, user_id, title, description, date, start_time, end_time, category, color, location, recurrence, notes, source, created_at, updated_at)
        VALUES (?, ?, ?, '', ?, ?, ?, ?, '#6b9cff', ?, 'none', '', 'local', ?, ?)
      `).run(
        id,
        user.id,
        String(p.title || 'New Event'),
        String(p.date || today),
        String(p.startTime || '10:00'),
        String(p.endTime || '11:00'),
        String(p.category || 'Personal'),
        String(p.location || ''),
        now,
        now
      );
    } else if (action.type === 'create_note') {
      const id = uid('not');
      db.prepare(`
        INSERT INTO notes (id, user_id, title, content, category, tags, pinned, linked_date, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, '[]', 0, ?, ?, ?)
      `).run(id, user.id, String(p.title || 'AI Note'), String(p.content || ''), String(p.category || 'Personal'), p.linkedDate ? String(p.linkedDate) : today, now, now);
    } else if (action.type === 'update_goal') {
      db.prepare('UPDATE goals SET progress = ?, updated_at = ? WHERE id = ? AND user_id = ?').run(
        Number(p.progress ?? 0),
        now,
        String(p.goalId || ''),
        user.id
      );
    } else if (action.type === 'complete_task') {
      const result = db
        .prepare("UPDATE tasks SET status = 'Completed', completed_at = ?, updated_at = ? WHERE id = ? AND user_id = ?")
        .run(now, now, String(p.taskId || ''), user.id);
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Target task was not found in database.' });
      }
    } else if (action.type === 'create_alarm') {
      const id = uid('alm');
      db.prepare(`
        INSERT INTO alarms (id, user_id, title, reminder_note, alarm_type, time, repeat_mode, selected_days, interval_minutes, start_time, end_time, tone, enabled, snooze_minutes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, 1, 5, ?, ?)
      `).run(
        id,
        user.id,
        String(p.title || "Raa's Reminder"),
        String(p.reminderNote || ''),
        String(p.alarmType || 'custom'),
        String(p.time || '08:00'),
        String(p.repeatMode || 'daily'),
        Number(p.intervalMinutes ?? 60),
        String(p.startTime || p.time || '08:00'),
        String(p.endTime || '21:00'),
        String(p.tone || 'crystal'),
        now,
        now
      );
    } else if (action.type === 'log_diary') {
      const id = uid('dlg');
      db.prepare(`
        INSERT INTO diary_logs (id, user_id, date, entry_time, title, activity, category, mood, energy, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        user.id,
        String(p.date || today),
        String(p.entryTime || '12:00'),
        String(p.title || ''),
        String(p.activity || p.title || 'Logged activity'),
        String(p.category || 'Personal'),
        String(p.mood || 'Calm'),
        Number(p.energy ?? 4),
        now,
        now
      );
    } else if (action.type === 'log_water') {
      const targetDate = String(p.date || today);
      const settings = getSettings(user.id);
      const tz = settings.timezone || 'Asia/Kolkata';
      const timeHHmm = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date());
      const amountMl =
        typeof p.amountMl === 'number' && p.amountMl > 0
          ? Math.round(p.amountMl)
          : Math.max(1, Number(p.delta ?? 1)) * 250;
      db.prepare(
        'INSERT INTO water_entries (id, user_id, date, time, amount_ml, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(uid('wen'), user.id, targetDate, timeHHmm, amountMl, 'Logged via AI', now);
    } else if (action.type === 'navigate_module') {
      const targetMod = String(p.module || 'dashboard');
      logActivity(user.id, 'ai_confirmed_action', action.type, messageId || 'direct', targetMod);
      return res.json({ ok: true, navigateTo: targetMod });
    }

    if (messageId && typeof actionIndex === 'number') {
      const row = db.prepare('SELECT proposed_actions FROM ai_messages WHERE id = ?').get(messageId) as
        | { proposed_actions: string | null }
        | undefined;
      if (row?.proposed_actions) {
        const arr = JSON.parse(row.proposed_actions);
        if (arr[actionIndex]) {
          arr[actionIndex].applied = true;
          db.prepare('UPDATE ai_messages SET proposed_actions = ? WHERE id = ?').run(JSON.stringify(arr), messageId);
        }
      }
    }
    logActivity(user.id, 'ai_confirmed_action', action.type, messageId || 'direct', JSON.stringify(p));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Database update failed.' });
  }
});

// Backup & Export
app.get('/api/backup/export', (req, res) => {
  const user = getCurrentUser(req);
  const payload = {
    exportedAt: new Date().toISOString(),
    app: "Raa's Diary",
    version: '1.0',
    user: { id: user.id, name: user.name, email: user.email },
    settings: getSettings(user.id),
    routines: getRoutines(user.id),
    routineOccurrences: getAllRoutineOccurrences(user.id),
    tasks: getTasks(user.id),
    events: getCalendarEvents(user.id),
    goals: getGoals(user.id),
    habits: getHabits(user.id),
    studySubjects: getStudySubjects(user.id),
    studySessions: getStudySessions(user.id),
    workProjects: getWorkProjects(user.id),
    workSessions: getWorkSessions(user.id),
    focusSessions: getFocusSessions(user.id),
    notes: getNotes(user.id),
    journals: getJournalEntries(user.id),
    alarms: getAlarms(user.id),
    diaryLogs: getDiaryLogs(user.id),
  };
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="raas-diary-backup-${getTodayInTimezone('Asia/Kolkata')}.json"`);
  res.send(JSON.stringify(payload, null, 2));
});

app.post('/api/backup/snapshot', (req, res) => {
  const user = getCurrentUser(req);
  const filename = createSqliteBackupSnapshot();
  logActivity(user.id, 'snapshot_backup', 'database', filename, '');
  res.json({ ok: true, filename });
});

function startServer() {
  const PORT = Number(process.env.PORT) || 3000;
  let viteInstance: Awaited<ReturnType<(typeof import('vite'))['createServer']>> | null = null;

  if (process.env.NODE_ENV !== 'production') {
    const vitePromise = import('vite')
      .then(({ createServer: createViteServer }) =>
        createViteServer({
          server: { middlewareMode: true, hmr: false, ws: false, watch: null },
          appType: 'spa',
          plugins: [
            {
              name: 'disable-hmr-websocket-client',
              enforce: 'post',
              transform(code, id) {
                const normalizedId = id.replace(/\\/g, '/');
                if (
                  normalizedId.endsWith('/vite/dist/client/client.mjs') ||
                  normalizedId.endsWith('/vite/dist/client/bundledDevClient.mjs')
                ) {
                  const startMarker = 'const transport = normalizeModuleRunnerTransport(';
                  const endMarker = 'let willUnload = false;';
                  const startIdx = code.indexOf(startMarker);
                  const endIdx = code.indexOf(endMarker);
                  if (startIdx !== -1 && endIdx > startIdx) {
                    return (
                      code.slice(0, startIdx) +
                      `const transport = normalizeModuleRunnerTransport({ async connect() {}, async disconnect() {}, send() {} });\n` +
                      code.slice(endIdx)
                    );
                  }
                }
              },
            },
          ],
        })
      )
      .then((vite) => {
        viteInstance = vite;
        return vite;
      })
      .catch((err) => {
        console.error('Failed to initialize Vite dev middleware:', err);
        throw err;
      });

    app.use(async (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return next();
      }
      try {
        const vite = viteInstance ?? (await vitePromise);
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(
        express.static(distPath, {
          setHeaders: (res, filePath) => {
            const base = path.basename(filePath);
            if (
              base === 'index.html' ||
              base === 'sw.js' ||
              base === 'registerSW.js' ||
              base === 'manifest.webmanifest'
            ) {
              res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            }
          },
        })
      );
      app.get('*', (req, res) => {
        if (
          req.path.startsWith('/assets/') ||
          req.path.startsWith('/api/') ||
          /\.[a-z0-9]+$/i.test(req.path)
        ) {
          return res.status(404).end();
        }
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  const httpServer = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Raa's Diary server running on http://0.0.0.0:${PORT}`);
  });
  httpServer.on('error', (err) => {
    console.error('HTTP server failed to bind port:', err);
    process.exit(1);
  });

  const shutdown = async () => {
    try {
      if (viteInstance) await viteInstance.close();
    } catch {
      // ignore close error
    }
    try {
      db.close();
    } catch {
      // ignore db close error
    }
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1500).unref();
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

startServer();
