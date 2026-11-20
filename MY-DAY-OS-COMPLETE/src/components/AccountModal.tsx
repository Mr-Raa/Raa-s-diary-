import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlarmClock,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  History,
  LogOut,
  Settings,
  Shield,
  Timer,
  UserCheck,
} from 'lucide-react';
import type { BootstrapData } from '../api/client';
import { api } from '../api/client';
import type { NavModule } from '../types';
import { formatDateReadable, formatTimeDisplay } from '../utils/dateLogic';
import { GlassModal } from './GlassModal';

interface AccountModalProps {
  open: boolean;
  onClose: () => void;
  data: BootstrapData;
  onRefresh: () => Promise<void>;
  onNavigate: (module: NavModule) => void;
}

type HistoryFilter = 'All' | 'Diary' | 'Tasks' | 'Focus' | 'Study/Work';

interface TimelineFeedItem {
  id: string;
  kind: Exclude<HistoryFilter, 'All'>;
  title: string;
  detail: string;
  date: string;
  timeLabel: string;
  sortKey: string;
  statusLabel: string;
  statusTone: 'success' | 'accent' | 'warning' | 'muted';
  targetModule: NavModule;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  open,
  onClose,
  data,
  onRefresh,
  onNavigate,
}) => {
  const [modalTab, setModalTab] = useState<'history' | 'account'>('history');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('All');

  // Auth states
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  const stats = useMemo(() => {
    const completedTasks = data.tasks.filter((t) => t.status === 'Completed').length;
    const totalFocusMins = data.focusSessions.reduce((s, f) => s + f.actualMinutes, 0);
    const totalStudyWorkMins =
      data.studySessions.reduce((s, x) => s + x.durationMinutes, 0) +
      data.workSessions.reduce((s, x) => s + x.durationMinutes, 0);
    const routinesDone = data.routineOccurrences.filter((o) => o.status === 'completed').length;

    return {
      diaryLogs: data.diaryLogs.length,
      completedTasks,
      totalTasks: data.tasks.length,
      focusHours: Math.round((totalFocusMins / 60) * 10) / 10,
      studyWorkHours: Math.round((totalStudyWorkMins / 60) * 10) / 10,
      journalDays: data.journals.length,
      routinesDone,
      activeAlarms: data.alarms.filter((a) => a.enabled).length,
    };
  }, [data]);

  const activityFeed = useMemo<TimelineFeedItem[]>(() => {
    const items: TimelineFeedItem[] = [];

    for (const log of data.diaryLogs) {
      items.push({
        id: `log-${log.id}`,
        kind: 'Diary',
        title: log.title || 'Diary Moment',
        detail: log.activity,
        date: log.date,
        timeLabel: formatTimeDisplay(log.entryTime, data.settings.timeFormat),
        sortKey: `${log.date}T${log.entryTime || '00:00'}`,
        statusLabel: log.mood || log.category,
        statusTone: 'accent',
        targetModule: 'notes',
      });
    }

    for (const j of data.journals) {
      items.push({
        id: `journal-${j.id}`,
        kind: 'Diary',
        title: `Full-Day Reflection (${j.mood})`,
        detail: j.reflection || j.achievements || j.gratitude || 'Daily story saved',
        date: j.date,
        timeLabel: 'Full Day',
        sortKey: `${j.date}T23:55`,
        statusLabel: 'Saved',
        statusTone: 'success',
        targetModule: 'notes',
      });
    }

    for (const t of data.tasks) {
      const done = t.status === 'Completed';
      items.push({
        id: `task-${t.id}`,
        kind: 'Tasks',
        title: t.title,
        detail: `${t.category} · ${t.priority} priority`,
        date: t.dueDate,
        timeLabel: t.dueTime ? formatTimeDisplay(t.dueTime, data.settings.timeFormat) : 'Task',
        sortKey: t.completedAt || `${t.dueDate}T${t.dueTime || '12:00'}`,
        statusLabel: t.status,
        statusTone: done ? 'success' : t.dueDate < data.today ? 'warning' : 'muted',
        targetModule: 'tasks',
      });
    }

    for (const f of data.focusSessions) {
      items.push({
        id: `focus-${f.id}`,
        kind: 'Focus',
        title: f.linkedTitle ? `Focus: ${f.linkedTitle}` : `Focus (${f.mode.replace('_', ' ')})`,
        detail: `${f.actualMinutes} mins deep focus completed`,
        date: f.date,
        timeLabel: `${f.actualMinutes}m`,
        sortKey: f.endedAt || `${f.date}T15:00`,
        statusLabel: 'Logged',
        statusTone: 'accent',
        targetModule: 'focus',
      });
    }

    for (const s of data.studySessions) {
      items.push({
        id: `study-${s.id}`,
        kind: 'Study/Work',
        title: `Study: ${s.subjectName || 'Subject'}`,
        detail: s.topic || `${s.durationMinutes}m recorded`,
        date: s.date,
        timeLabel: `${s.durationMinutes}m`,
        sortKey: `${s.date}T16:00`,
        statusLabel: 'Study',
        statusTone: 'accent',
        targetModule: 'study',
      });
    }

    for (const w of data.workSessions) {
      items.push({
        id: `work-${w.id}`,
        kind: 'Study/Work',
        title: `Work: ${w.projectTitle || 'Project'}`,
        detail: w.summary || `${w.durationMinutes}m recorded`,
        date: w.date,
        timeLabel: `${w.durationMinutes}m`,
        sortKey: `${w.date}T17:00`,
        statusLabel: 'Work',
        statusTone: 'success',
        targetModule: 'work',
      });
    }

    return items
      .filter((it) => (historyFilter === 'All' ? true : it.kind === historyFilter))
      .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
      .slice(0, 35);
  }, [data, historyFilter]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthBusy(true);
    try {
      if (authMode === 'register') {
        await api.post('/api/auth/register', {
          name: authName,
          email: authEmail,
          password: authPassword,
        });
      } else {
        await api.post('/api/auth/login', {
          email: authEmail,
          password: authPassword,
        });
      }
      setAuthPassword('');
      setModalTab('history');
      await onRefresh();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setAuthBusy(false);
    }
  };

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title="Account & History"
      subtitle={`${data.user.name} · ${data.user.email}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Profile Hero Card */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/[0.045] border border-[var(--glass-border-subtle)]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-secondary)] text-white font-bold text-base flex items-center justify-center shrink-0 shadow-md">
              {data.user.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                <span>{data.user.name}</span>
                <UserCheck className="w-3.5 h-3.5 text-[var(--success)] shrink-0" />
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] truncate font-mono-num">
                {data.user.email} · {stats.activeAlarms} active alarms
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigate('history');
              }}
              className="glass-button px-3 py-1.5 text-xs font-medium flex items-center gap-1.5"
            >
              <History className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Full Archive</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigate('settings');
              }}
              aria-label="Open Settings"
              className="glass-button p-2"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Segmented Control */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-[var(--glass-border-subtle)]">
          <button
            type="button"
            onClick={() => setModalTab('history')}
            className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${
              modalTab === 'history'
                ? 'glass-button-primary text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>My History &amp; Stats</span>
          </button>
          <button
            type="button"
            onClick={() => setModalTab('account')}
            className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${
              modalTab === 'account'
                ? 'glass-button-primary text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Sign In / Switch</span>
          </button>
        </div>

        {modalTab === 'history' ? (
          <div className="space-y-4">
            {/* Compact Lifetime Account Summary Bento */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-[var(--glass-border-subtle)] text-center">
                <div className="font-mono-num text-base font-bold text-[var(--accent)]">{stats.diaryLogs}</div>
                <div className="text-[10px] text-[var(--text-secondary)]">Diary Logs</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-[var(--glass-border-subtle)] text-center">
                <div className="font-mono-num text-base font-bold text-[var(--success)]">
                  {stats.completedTasks}/{stats.totalTasks}
                </div>
                <div className="text-[10px] text-[var(--text-secondary)]">Tasks Done</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-[var(--glass-border-subtle)] text-center">
                <div className="font-mono-num text-base font-bold text-[var(--accent-secondary)]">
                  {stats.focusHours}h
                </div>
                <div className="text-[10px] text-[var(--text-secondary)]">Focus Time</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-[var(--glass-border-subtle)] text-center">
                <div className="font-mono-num text-base font-bold">{stats.routinesDone}</div>
                <div className="text-[10px] text-[var(--text-secondary)]">Routines</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-[var(--glass-border-subtle)] text-center">
                <div className="font-mono-num text-base font-bold">{stats.journalDays}</div>
                <div className="text-[10px] text-[var(--text-secondary)]">Journal Days</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-[var(--glass-border-subtle)] text-center">
                <div className="font-mono-num text-base font-bold">{stats.studyWorkHours}h</div>
                <div className="text-[10px] text-[var(--text-secondary)]">Study &amp; Work</div>
              </div>
            </div>

            {/* Category Filter Strip */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full">
                {(['All', 'Diary', 'Tasks', 'Focus', 'Study/Work'] as HistoryFilter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setHistoryFilter(f)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap ${
                      historyFilter === f
                        ? 'glass-button-primary text-white'
                        : 'glass-button text-[var(--text-secondary)]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <a
                href="/api/backup/export"
                className="text-[11px] font-medium text-[var(--accent)] hover:underline inline-flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                <span>Export Data</span>
              </a>
            </div>

            {/* Chronological Activity History Timeline */}
            <div className="space-y-2 max-h-[280px] overflow-y-auto no-scrollbar pr-0.5">
              {activityFeed.length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--text-muted)] rounded-2xl bg-white/[0.03] border border-[var(--glass-border-subtle)]">
                  No history items found for this filter yet.
                </div>
              ) : (
                activityFeed.map((item) => {
                  const Icon =
                    item.kind === 'Diary'
                      ? FileText
                      : item.kind === 'Tasks'
                        ? CheckCircle2
                        : item.kind === 'Focus'
                          ? Timer
                          : item.statusLabel === 'Study'
                            ? BookOpen
                            : Briefcase;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigate(item.targetModule);
                      }}
                      className="w-full p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-[var(--glass-border-subtle)] flex items-start justify-between gap-3 text-left transition-colors"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/12 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className="w-3.5 h-3.5 text-[var(--accent)]" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{item.title}</div>
                          <div className="text-[11px] text-[var(--text-secondary)] line-clamp-1 mt-0.5">
                            {item.detail}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] font-mono-num mt-1 flex items-center gap-1.5">
                            <Clock className="w-2.5 h-2.5" />
                            <span>
                              {formatDateReadable(item.date, data.settings.dateFormat)} · {item.timeLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-semibold shrink-0 pt-0.5 ${
                          item.statusTone === 'success'
                            ? 'text-[var(--success)]'
                            : item.statusTone === 'warning'
                              ? 'text-[var(--warning)]'
                              : item.statusTone === 'accent'
                                ? 'text-[var(--accent)]'
                                : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {item.statusLabel}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--glass-border-subtle)]">
              <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                <AlarmClock className="w-3 h-3" /> All records stored persistently in SQLite
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigate('history');
                }}
                className="glass-button-primary px-4 py-2 text-xs font-semibold"
              >
                Open Date Archive
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold ${
                  authMode === 'login' ? 'glass-button-primary text-white' : 'glass-button'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold ${
                  authMode === 'register' ? 'glass-button-primary text-white' : 'glass-button'
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {authError && <p className="text-xs text-[var(--danger)]">{authError}</p>}
              {authMode === 'register' && (
                <div>
                  <label htmlFor="auth-name" className="block text-xs font-medium mb-1">
                    Full Name
                  </label>
                  <input
                    id="auth-name"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="glass-input w-full px-3.5 py-2.5 text-sm"
                    placeholder="Your name"
                  />
                </div>
              )}
              <div>
                <label htmlFor="auth-email" className="block text-xs font-medium mb-1">
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="glass-input w-full px-3.5 py-2.5 text-sm"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="auth-pass" className="block text-xs font-medium mb-1">
                  Password
                </label>
                <input
                  id="auth-pass"
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="glass-input w-full px-3.5 py-2.5 text-sm"
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div className="flex flex-wrap justify-between items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    await api.post('/api/auth/logout');
                    setModalTab('history');
                    onClose();
                    await onRefresh();
                  }}
                  className="text-xs text-[var(--text-secondary)] hover:underline inline-flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Reset to Default Workspace</span>
                </button>
                <button
                  type="submit"
                  disabled={authBusy}
                  className="glass-button-primary px-5 py-2.5 text-xs font-semibold disabled:opacity-60"
                >
                  {authBusy
                    ? 'Please wait...'
                    : authMode === 'register'
                      ? 'Create & Sign In'
                      : 'Sign In'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </GlassModal>
  );
};
