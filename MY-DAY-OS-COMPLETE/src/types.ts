export type NavModule =
  | 'dashboard'
  | 'routine'
  | 'tasks'
  | 'alarms'
  | 'calendar'
  | 'trackers'
  | 'goals'
  | 'study'
  | 'work'
  | 'focus'
  | 'notes'
  | 'analytics'
  | 'history'
  | 'ai'
  | 'settings';

export type Category =
  | 'Personal'
  | 'Study'
  | 'Work'
  | 'Health'
  | 'Exercise'
  | 'Learning'
  | 'Family'
  | 'Skills'
  | 'Projects'
  | 'Other';

export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type RoutineStatus = 'pending' | 'completed' | 'skipped' | 'rescheduled';
export type TaskStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Skipped' | 'Cancelled';
export type GoalStatus = 'Not Started' | 'Active' | 'On Hold' | 'Completed' | 'Cancelled';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'selected_days';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface Routine {
  id: string;
  userId: string;
  title: string;
  description: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  date: string;      // YYYY-MM-DD (origin/start date)
  endDate?: string | null;
  category: Category;
  priority: Priority;
  recurrence: RecurrenceType;
  selectedDays: number[]; // 0=Sun..6=Sat
  reminderMinutes: number;
  notes: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  // Hydrated occurrence status for a specific date:
  occurrenceStatus?: RoutineStatus;
  occurrenceDate?: string;
  completedAt?: string | null;
  skippedReason?: string | null;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:mm or ''
  category: Category;
  priority: Priority;
  status: TaskStatus;
  recurrence: RecurrenceType;
  reminderMinutes: number;
  notes: string;
  subtasks: Subtask[];
  completedAt?: string | null;
  skippedReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description: string;
  date: string;      // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  category: Category;
  color: string;
  location: string;
  recurrence: RecurrenceType;
  notes: string;
  source: 'local' | 'google';
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  completed: boolean;
  targetDate?: string | null;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: Category;
  startDate: string;
  targetDate: string;
  progress: number; // 0..100
  status: GoalStatus;
  priority: Priority;
  notes: string;
  reminderDate?: string | null;
  completionDate?: string | null;
  milestones: Milestone[];
  createdAt: string;
  updatedAt: string;
}

export interface Habit {
  id: string;
  userId: string;
  title: string;
  category: Category;
  weeklyTarget: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  entries: HabitEntry[];
}

export interface HabitEntry {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
  notes: string;
}

export interface StudySubject {
  id: string;
  userId: string;
  name: string;
  chaptersTotal: number;
  chaptersCompleted: number;
  nextRevisionDate: string;
  targetHours: number;
  notes: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudySession {
  id: string;
  userId: string;
  subjectId: string;
  subjectName?: string;
  date: string;
  durationMinutes: number;
  topic: string;
  notes: string;
  createdAt: string;
}

export interface WorkProject {
  id: string;
  userId: string;
  title: string;
  clientOrTeam: string;
  deadline: string;
  priority: Priority;
  status: 'Active' | 'On Hold' | 'Completed';
  progress: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkSession {
  id: string;
  userId: string;
  projectId: string;
  projectTitle?: string;
  date: string;
  durationMinutes: number;
  summary: string;
  createdAt: string;
}

export interface FocusSession {
  id: string;
  userId: string;
  date: string;
  mode: 'pomodoro' | 'custom' | 'short_break' | 'long_break';
  plannedMinutes: number;
  actualMinutes: number;
  linkedType: 'task' | 'study' | 'work' | 'none';
  linkedId: string;
  linkedTitle: string;
  startedAt: string;
  endedAt: string;
}

export interface NoteItem {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: Category;
  tags: string[];
  pinned: boolean;
  linkedDate?: string | null;
  linkedTaskId?: string | null;
  linkedGoalId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  date: string;
  mood: string;
  reflection: string;
  achievements: string;
  gratitude: string;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'routine' | 'task' | 'goal' | 'study' | 'calendar' | 'focus' | 'alarm' | 'system';
  date: string;
  read: boolean;
  snoozedUntil?: string | null;
  createdAt: string;
}

export type AlarmType = 'wakeup' | 'water' | 'task' | 'routine' | 'custom';
export type AlarmRepeatMode = 'daily' | 'weekdays' | 'weekends' | 'selected_days' | 'once' | 'interval';
export type AlarmTone = 'crystal' | 'sunrise' | 'waterdrop' | 'pulse' | 'zen' | 'harp' | 'chime' | 'ocean' | 'birdsong' | 'piano' | 'bell' | 'marimba' | 'flute' | 'rainfall' | 'cosmic' | 'breeze' | 'sparkle' | 'aurora' | 'cricket' | 'windchime' | 'tibetan' | 'bamboo' | 'dreambell' | 'horizon' | 'twilight';

export interface Alarm {
  id: string;
  userId: string;
  title: string;
  reminderNote: string;
  alarmType: AlarmType;
  time: string; // HH:mm
  repeatMode: AlarmRepeatMode;
  selectedDays: number[]; // 0=Sun..6=Sat
  intervalMinutes: number; // for water/interval alarms (e.g. 60, 90)
  startTime: string; // HH:mm window start for interval alarms
  endTime: string; // HH:mm window end for interval alarms
  tone: AlarmTone;
  enabled: boolean;
  snoozeMinutes: number;
  lastTriggeredAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DiaryLogEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  entryTime: string; // HH:mm
  title: string;
  activity: string;
  category: Category;
  mood: string;
  energy: number; // 1..5
  createdAt: string;
  updatedAt: string;
}

export interface WaterLogEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  amountMl: number;
  note: string;
  createdAt: string;
}

export interface WaterIntake {
  date: string;
  glasses: number;
  targetGlasses: number;
  totalMl: number;
  goalMl: number;
  entries: WaterLogEntry[];
}

export type BuiltinTrackerKey = 'sleep' | 'exercise' | 'steps' | 'food' | 'mood' | 'energy';

export interface TrackerEntry {
  id: string;
  userId: string;
  trackerKey: string;
  date: string;
  time: string;
  valueNumber: number;
  unit: string;
  label: string;
  notes: string;
  createdAt: string;
}

export interface CustomTracker {
  id: string;
  userId: string;
  name: string;
  unit: string;
  dailyTarget: number;
  icon: string;
  color: string;
  createdAt: string;
}

export interface AiProposedAction {
  type:
    | 'create_task'
    | 'create_routine'
    | 'reschedule_task'
    | 'complete_task'
    | 'create_alarm'
    | 'log_diary'
    | 'log_water'
    | 'create_event'
    | 'create_note'
    | 'update_goal'
    | 'navigate_module';
  label: string;
  payload: Record<string, unknown>;
  applied?: boolean;
}

export interface DailyAffirmation {
  quote: string;
  author: string;
  theme: string;
  date: string;
  modelUsed: string;
}

export interface AiScheduleBlock {
  time: string;
  endTime: string;
  title: string;
  category: Category;
  priority: Priority;
  reason: string;
  actionType: 'create_task' | 'create_routine';
}

export interface AiDailyPlan {
  summary: string;
  focusGoal: string;
  blocks: AiScheduleBlock[];
  modelUsed: string;
}

export interface AiMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  thinkingUsed?: boolean;
  imageAttached?: boolean;
  proposedActions?: AiProposedAction[];
  createdAt: string;
}

export interface AiConversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  accentColor: string;
  glassOpacity: number;
  glassBlur: number;
  glassRadius: number;
  fontSize: number;
  fontStyle?: 'vision' | 'editorial' | 'classic';
  uiDensity: 'comfortable' | 'compact';
  reducedMotion: boolean;
  language: 'en' | 'gu-en' | 'gu';
  dateFormat: 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'MMM D, YYYY';
  timeFormat: '12h' | '24h';
  timezone: string;
  weekStartsOn: 0 | 1; // 0=Sunday, 1=Monday
  startupModule: NavModule;
  aiModel: 'gemini-4-hydrogen' | 'gemini-4-carbon' | 'gemini-3.1-flash-lite';
  aiResponseStyle: 'practical' | 'detailed' | 'concise';
  aiConfirmActions: boolean;
  notificationsEnabled: boolean;
  notificationSound: boolean;
  dailyFocusGoalMinutes: number;
  dailyWaterGoalMl?: number;
  waterRemindersEnabled?: boolean;
  waterReminderIntervalMinutes?: number;
  dashboardWidgets: {
    progressRing: boolean;
    timeline: boolean;
    routines: boolean;
    tasks: boolean;
    goals: boolean;
    upcomingEvents: boolean;
    studyWork: boolean;
    aiInsights: boolean;
  };
}

export interface DayContext {
  date: string;
  routines: Routine[];
  tasks: Task[];
  overdueTasks: Task[];
  events: CalendarEvent[];
  studySessions: StudySession[];
  workSessions: WorkSession[];
  focusSessions: FocusSession[];
  journal: JournalEntry | null;
  diaryLogs: DiaryLogEntry[];
  waterIntake: WaterIntake;
  trackerEntries: TrackerEntry[];
  habits: Habit[];
  notes: NoteItem[];
  productivityScore: number;
}
