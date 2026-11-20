import type { NavModule } from '../types';
import type { BootstrapData } from '../api/client';

export type CommandKind = 'action' | 'module' | 'task' | 'routine' | 'note' | 'event';

export interface CommandItem {
  id: string;
  kind: CommandKind;
  title: string;
  subtitle: string;
  keywords: string;
  moduleTarget?: NavModule;
  actionId?:
    | 'quick_water_250'
    | 'quick_focus_25'
    | 'quick_add_task'
    | 'quick_add_routine'
    | 'toggle_theme'
    | 'open_download';
}

const MODULE_COMMANDS: Array<{ id: NavModule; title: string; subtitle: string; keywords: string }> = [
  { id: 'dashboard', title: 'Home Dashboard', subtitle: 'Overview, daily progress & quick actions', keywords: 'home summary overview stats' },
  { id: 'routine', title: 'My Routine', subtitle: 'Daily time blocks & live timeline', keywords: 'schedule timetable morning blocks' },
  { id: 'tasks', title: 'Tasks', subtitle: 'Manage pending & completed to-dos', keywords: 'todo checklist tasks' },
  { id: 'calendar', title: 'Calendar', subtitle: 'Month, week, day & events', keywords: 'calendar dates events schedule' },
  { id: 'trackers', title: 'Life Trackers & Water', subtitle: 'Water ml ring, sleep, steps, mood & energy', keywords: 'water hydration sleep exercise food mood energy' },
  { id: 'ai', title: 'AURAA AI Assistant', subtitle: 'Ask AI to plan, optimize, or log entries', keywords: 'auraa ai gemini assistant chat' },
  { id: 'focus', title: 'Focus Mode (Pomodoro)', subtitle: 'Deep work timer & streaks', keywords: 'pomodoro timer focus deep work' },
  { id: 'alarms', title: 'Smart Alarms & Reminders', subtitle: 'Hydration intervals & wake-up alarms', keywords: 'alarm reminder hydration bell' },
  { id: 'goals', title: 'Goals & Habits', subtitle: 'Milestones & habit streaks', keywords: 'goals habits streak recovery' },
  { id: 'study', title: 'Study Tracker', subtitle: 'Subjects & chapter progress', keywords: 'study chapters revision' },
  { id: 'work', title: 'Work Projects', subtitle: 'Projects & work sprints', keywords: 'work projects client sprint' },
  { id: 'notes', title: 'Notes & Diary', subtitle: 'Daily journal & timestamped logs', keywords: 'notes diary journal reflection' },
  { id: 'analytics', title: 'Analytics', subtitle: 'Productivity trends & category breakdown', keywords: 'analytics charts metrics' },
  { id: 'history', title: 'History', subtitle: 'Past daily records & archives', keywords: 'history archive past days' },
  { id: 'settings', title: 'Settings', subtitle: 'Theme, goals, AI model & preferences', keywords: 'settings theme preferences goals' },
];

export function buildCommandPaletteItems(data: BootstrapData, query: string): CommandItem[] {
  const q = query.trim().toLowerCase();

  const quickActions: CommandItem[] = [
    {
      id: 'act-water-250',
      kind: 'action',
      title: 'Log +250 ml Water',
      subtitle: 'Quick hydration intake for today',
      keywords: 'drink water hydration 250ml log',
      actionId: 'quick_water_250',
    },
    {
      id: 'act-focus-25',
      kind: 'action',
      title: 'Open Focus Timer',
      subtitle: 'Start a deep Pomodoro session',
      keywords: 'focus pomodoro timer start 25m',
      actionId: 'quick_focus_25',
    },
    {
      id: 'act-add-task',
      kind: 'action',
      title: 'Create New Task',
      subtitle: 'Add a task to today or upcoming date',
      keywords: 'new task add todo',
      actionId: 'quick_add_task',
    },
    {
      id: 'act-add-routine',
      kind: 'action',
      title: 'Create Routine Block',
      subtitle: 'Schedule a recurring or daily time block',
      keywords: 'new routine block schedule',
      actionId: 'quick_add_routine',
    },
    {
      id: 'act-theme',
      kind: 'action',
      title: data.settings.theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode',
      subtitle: 'Toggle adaptive obsidian / daylight appearance',
      keywords: 'theme dark light appearance mode',
      actionId: 'toggle_theme',
    },
    {
      id: 'act-download',
      kind: 'action',
      title: 'Download & Install App',
      subtitle: 'iOS Home Screen, Android APK/PWA & Windows app guide',
      keywords: 'install pwa app download ios windows',
      actionId: 'open_download',
    },
  ];

  const moduleItems: CommandItem[] = MODULE_COMMANDS.map((m) => ({
    id: `mod-${m.id}`,
    kind: 'module',
    title: m.title,
    subtitle: m.subtitle,
    keywords: `${m.title} ${m.subtitle} ${m.keywords}`.toLowerCase(),
    moduleTarget: m.id,
  }));

  const taskItems: CommandItem[] = data.tasks.slice(0, 25).map((t) => ({
    id: `task-${t.id}`,
    kind: 'task',
    title: t.title,
    subtitle: `${t.status} · ${t.dueDate}${t.dueTime ? ` · ${t.dueTime}` : ''}`,
    keywords: `${t.title} ${t.category} ${t.description}`.toLowerCase(),
    moduleTarget: 'tasks',
  }));

  const routineItems: CommandItem[] = data.routines.slice(0, 20).map((r) => ({
    id: `routine-${r.id}`,
    kind: 'routine',
    title: r.title,
    subtitle: `${r.startTime} – ${r.endTime} · ${r.category}`,
    keywords: `${r.title} ${r.category} ${r.description}`.toLowerCase(),
    moduleTarget: 'routine',
  }));

  const eventItems: CommandItem[] = data.events.slice(0, 15).map((e) => ({
    id: `event-${e.id}`,
    kind: 'event',
    title: e.title,
    subtitle: `${e.date} · ${e.startTime} · ${e.category}`,
    keywords: `${e.title} ${e.location} ${e.category}`.toLowerCase(),
    moduleTarget: 'calendar',
  }));

  const noteItems: CommandItem[] = data.notes.slice(0, 15).map((n) => ({
    id: `note-${n.id}`,
    kind: 'note',
    title: n.title,
    subtitle: `Note · ${n.category}`,
    keywords: `${n.title} ${n.content} ${n.tags.join(' ')}`.toLowerCase(),
    moduleTarget: 'notes',
  }));

  const all = [...quickActions, ...moduleItems, ...taskItems, ...routineItems, ...eventItems, ...noteItems];

  if (!q) {
    return [...quickActions.slice(0, 4), ...moduleItems.slice(0, 6)];
  }

  return all
    .map((item) => {
      const titleLower = item.title.toLowerCase();
      const score = titleLower.startsWith(q)
        ? 3
        : titleLower.includes(q)
          ? 2
          : item.keywords.includes(q)
            ? 1
            : 0;
      return { item, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item)
    .slice(0, 16);
}
