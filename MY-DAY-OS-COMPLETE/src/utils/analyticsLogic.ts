import type {
  FocusSession,
  Habit,
  Routine,
  StudySession,
  Task,
  WorkSession,
} from '../types';
import { addDays, doesRoutineOccurOnDate } from './dateLogic';

export function computeDailyProductivityScore(params: {
  routinesTotal: number;
  routinesCompleted: number;
  tasksTotal: number;
  tasksCompleted: number;
  focusMinutes: number;
  habitsDone: number;
  habitsTotal: number;
}): number {
  const {
    routinesTotal,
    routinesCompleted,
    tasksTotal,
    tasksCompleted,
    focusMinutes,
    habitsDone,
    habitsTotal,
  } = params;

  const hasAnyPlanned = routinesTotal > 0 || tasksTotal > 0 || habitsTotal > 0 || focusMinutes > 0;
  if (!hasAnyPlanned) return 0;

  let weightSum = 0;
  let scoreSum = 0;

  if (routinesTotal > 0) {
    weightSum += 0.35;
    scoreSum += 0.35 * (routinesCompleted / routinesTotal);
  }
  if (tasksTotal > 0) {
    weightSum += 0.35;
    scoreSum += 0.35 * (tasksCompleted / tasksTotal);
  }
  if (habitsTotal > 0) {
    weightSum += 0.15;
    scoreSum += 0.15 * (habitsDone / habitsTotal);
  }
  if (focusMinutes > 0 || weightSum > 0) {
    weightSum += 0.15;
    scoreSum += 0.15 * Math.min(1, focusMinutes / 90);
  }

  return Math.round((scoreSum / weightSum) * 100);
}

export function calculateHabitStreak(habit: Habit, todayDate: string): number {
  const completedSet = new Set(
    (habit.entries || []).filter((e) => e.completed).map((e) => e.date)
  );
  let streak = 0;
  let cursor = completedSet.has(todayDate) ? todayDate : addDays(todayDate, -1);

  while (completedSet.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export interface DailyAnalyticsPoint {
  date: string;
  label: string;
  score: number;
  tasksCompleted: number;
  tasksTotal: number;
  routinesCompleted: number;
  routinesTotal: number;
  studyMinutes: number;
  workMinutes: number;
  focusMinutes: number;
}

export function buildDateRangeAnalytics(params: {
  endDate: string;
  daysCount: number;
  routines: Routine[];
  routineOccurrences: Array<{ routineId: string; date: string; status: string }>;
  tasks: Task[];
  studySessions: StudySession[];
  workSessions: WorkSession[];
  focusSessions: FocusSession[];
  habits: Habit[];
}): DailyAnalyticsPoint[] {
  const {
    endDate,
    daysCount,
    routines,
    routineOccurrences,
    tasks,
    studySessions,
    workSessions,
    focusSessions,
    habits,
  } = params;

  const occMap = new Map<string, string>();
  for (const occ of routineOccurrences) {
    occMap.set(`${occ.routineId}::${occ.date}`, occ.status);
  }

  const points: DailyAnalyticsPoint[] = [];
  for (let offset = daysCount - 1; offset >= 0; offset--) {
    const date = addDays(endDate, -offset);
    const dayRoutines = routines.filter((r) => doesRoutineOccurOnDate(r, date));
    const routinesCompleted = dayRoutines.filter(
      (r) => occMap.get(`${r.id}::${date}`) === 'completed'
    ).length;

    const dayTasks = tasks.filter((t) => t.dueDate === date);
    const tasksCompleted = dayTasks.filter((t) => t.status === 'Completed').length;

    const studyMinutes = studySessions
      .filter((s) => s.date === date)
      .reduce((sum, s) => sum + s.durationMinutes, 0);
    const workMinutes = workSessions
      .filter((w) => w.date === date)
      .reduce((sum, w) => sum + w.durationMinutes, 0);
    const focusMinutes = focusSessions
      .filter((f) => f.date === date)
      .reduce((sum, f) => sum + f.actualMinutes, 0);

    const habitsDone = habits.filter((h) =>
      h.entries.some((e) => e.date === date && e.completed)
    ).length;

    const score = computeDailyProductivityScore({
      routinesTotal: dayRoutines.length,
      routinesCompleted,
      tasksTotal: dayTasks.length,
      tasksCompleted,
      focusMinutes,
      habitsDone,
      habitsTotal: habits.length,
    });

    const [, m, d] = date.split('-');
    points.push({
      date,
      label: `${d}/${m}`,
      score,
      tasksCompleted,
      tasksTotal: dayTasks.length,
      routinesCompleted,
      routinesTotal: dayRoutines.length,
      studyMinutes,
      workMinutes,
      focusMinutes,
    });
  }

  return points;
}

export function buildCategoryDistribution(tasks: Task[], routines: Routine[]): Array<{
  category: string;
  count: number;
  percent: number;
}> {
  const counts = new Map<string, number>();
  for (const t of tasks) {
    counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
  }
  for (const r of routines) {
    counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
  }
  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  if (total === 0) return [];
  return Array.from(counts.entries())
    .map(([category, count]) => ({
      category,
      count,
      percent: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}
