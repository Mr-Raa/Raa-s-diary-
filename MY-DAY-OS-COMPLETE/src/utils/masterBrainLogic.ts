import type {
  Alarm,
  DayContext,
  Goal,
  NavModule,
  WaterIntake,
} from '../types';

export interface BrainPillar {
  key: 'execution' | 'hydration' | 'focus' | 'consistency';
  label: string;
  score: number; // 0..100
  detail: string;
}

export type MasterBrainActionKind =
  | 'log_water_250'
  | 'reschedule_overdue_today'
  | 'start_focus'
  | 'open_ai_planner'
  | 'open_routine'
  | 'open_diary';

export interface MasterBrainAction {
  id: string;
  kind: MasterBrainActionKind;
  title: string;
  subtitle: string;
  impactLabel: string;
  targetModule?: NavModule;
}

export interface MasterBrainReport {
  readinessScore: number; // 0..100
  statusLabel: 'Peak Flow' | 'Steady Momentum' | 'Needs Alignment' | 'Fresh Start';
  headline: string;
  gujaratiSummary: string;
  pillars: BrainPillar[];
  topPriorityTitle: string;
  topPriorityDetail: string;
  actions: MasterBrainAction[];
}

export interface MasterBrainInput {
  today: string;
  currentHHmm: string;
  dayContext: DayContext;
  waterIntake: WaterIntake;
  dailyFocusGoalMinutes: number;
  goals: Goal[];
  alarms: Alarm[];
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * Deterministic Master Brain Intelligence Core:
 * Synthesizes real live records across Tasks, Routines, Hydration, Focus, Habits, Goals,
 * and Alarms into a 4-pillar Life Readiness Score + concrete executable autopilot actions.
 */
export function computeMasterBrainReport(input: MasterBrainInput): MasterBrainReport {
  const { today, dayContext, waterIntake, dailyFocusGoalMinutes, currentHHmm } = input;

  // 1. Execution Pillar (Tasks + Routines)
  const totalTasks = dayContext.tasks.length;
  const doneTasks = dayContext.tasks.filter((t) => t.status === 'Completed').length;
  const pendingTasks = totalTasks - doneTasks;
  const totalRoutines = dayContext.routines.length;
  const doneRoutines = dayContext.routines.filter((r) => r.occurrenceStatus === 'completed').length;
  const totalWorkUnits = totalTasks + totalRoutines;
  const doneWorkUnits = doneTasks + doneRoutines;
  const executionScore =
    totalWorkUnits > 0 ? clamp((doneWorkUnits / totalWorkUnits) * 100) : 70;

  // 2. Hydration Pillar
  const waterGoal = Math.max(250, waterIntake.goalMl || 2500);
  const waterConsumed = Math.max(0, waterIntake.totalMl || 0);
  const waterRemaining = Math.max(0, waterGoal - waterConsumed);
  const hydrationScore = clamp((waterConsumed / waterGoal) * 100);

  // 3. Deep Focus Pillar (Focus + Study + Work sessions today)
  const focusMins = dayContext.focusSessions.reduce((s, f) => s + f.actualMinutes, 0);
  const studyMins = dayContext.studySessions.reduce((s, x) => s + x.durationMinutes, 0);
  const workMins = dayContext.workSessions.reduce((s, x) => s + x.durationMinutes, 0);
  const totalDeepMins = focusMins + studyMins + workMins;
  const focusGoal = Math.max(25, dailyFocusGoalMinutes || 120);
  const focusScore = clamp((totalDeepMins / focusGoal) * 100);

  // 4. Consistency Pillar (Habits + Diary + Active Goals)
  const totalHabits = dayContext.habits.length;
  const doneHabits = dayContext.habits.filter((h) =>
    h.entries?.some((e) => e.date === today && e.completed)
  ).length;
  const habitRatio = totalHabits > 0 ? doneHabits / totalHabits : 0.7;
  const diaryBonus = dayContext.diaryLogs.length > 0 || Boolean(dayContext.journal?.reflection) ? 15 : 0;
  const consistencyScore = clamp(habitRatio * 85 + diaryBonus);

  const readinessScore = clamp(
    executionScore * 0.36 +
      hydrationScore * 0.22 +
      focusScore * 0.22 +
      consistencyScore * 0.2
  );

  let statusLabel: MasterBrainReport['statusLabel'] = 'Steady Momentum';
  if (readinessScore >= 78) statusLabel = 'Peak Flow';
  else if (readinessScore >= 45) statusLabel = 'Steady Momentum';
  else if (doneWorkUnits === 0 && totalDeepMins === 0 && waterConsumed === 0) statusLabel = 'Fresh Start';
  else statusLabel = 'Needs Alignment';

  const pillars: BrainPillar[] = [
    {
      key: 'execution',
      label: 'Execution',
      score: executionScore,
      detail: `${doneTasks}/${totalTasks} tasks · ${doneRoutines}/${totalRoutines} routines`,
    },
    {
      key: 'hydration',
      label: 'Hydration',
      score: hydrationScore,
      detail: `${waterConsumed} / ${waterGoal} ml`,
    },
    {
      key: 'focus',
      label: 'Deep Focus',
      score: focusScore,
      detail: `${totalDeepMins}m / ${focusGoal}m goal`,
    },
    {
      key: 'consistency',
      label: 'Consistency',
      score: consistencyScore,
      detail: `${doneHabits}/${totalHabits} habits · ${dayContext.diaryLogs.length} diary logs`,
    },
  ];

  // Determine the single sharpest next priority
  const overdueCount = dayContext.overdueTasks.length;
  const nextPendingRoutine = dayContext.routines
    .filter((r) => r.occurrenceStatus !== 'completed' && r.endTime >= currentHHmm)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
  const urgentTask = dayContext.tasks.find(
    (t) => t.status !== 'Completed' && (t.priority === 'Urgent' || t.priority === 'High')
  );

  let topPriorityTitle = 'Protect Your Next Focused Block';
  let topPriorityDetail = 'Start a clean 25-minute Pomodoro sprint to lock in momentum.';
  if (overdueCount > 0) {
    topPriorityTitle = `Recover ${overdueCount} Overdue Task${overdueCount > 1 ? 's' : ''}`;
    topPriorityDetail = `Pull "${dayContext.overdueTasks[0].title}" into today so nothing slips through.`;
  } else if (urgentTask) {
    topPriorityTitle = `Finish Priority Task: ${urgentTask.title}`;
    topPriorityDetail = `${urgentTask.priority} priority · ${urgentTask.category}. Knock this out first.`;
  } else if (nextPendingRoutine) {
    topPriorityTitle = `Next Routine: ${nextPendingRoutine.title}`;
    topPriorityDetail = `Scheduled ${nextPendingRoutine.startTime}–${nextPendingRoutine.endTime} (${nextPendingRoutine.category}).`;
  } else if (waterRemaining >= 500) {
    topPriorityTitle = `Hydration Boost Needed (${waterRemaining} ml left)`;
    topPriorityDetail = 'Drink 1 glass (+250 ml) now to sustain focus and mental clarity.';
  }

  // Build executable 1-click Master Autopilot Actions
  const actions: MasterBrainAction[] = [];

  if (waterRemaining > 0) {
    actions.push({
      id: 'mb-water-250',
      kind: 'log_water_250',
      title: 'Instant Hydrate +250 ml',
      subtitle: `${waterRemaining} ml left to reach your ${waterGoal} ml goal`,
      impactLabel: '+Hydration',
    });
  }

  if (overdueCount > 0) {
    actions.push({
      id: 'mb-reschedule-overdue',
      kind: 'reschedule_overdue_today',
      title: `Move ${overdueCount} Overdue to Today`,
      subtitle: 'Gently bring unfinished past tasks into today’s plan',
      impactLabel: 'Auto-Fix',
    });
  }

  actions.push({
    id: 'mb-focus-sprint',
    kind: 'start_focus',
    title: 'Launch 25m Deep Focus',
    subtitle: `${totalDeepMins}m logged today · Target ${focusGoal}m`,
    impactLabel: '+Focus',
    targetModule: 'focus',
  });

  actions.push({
    id: 'mb-ai-plan',
    kind: 'open_ai_planner',
    title: 'Generate AI Hour-by-Hour Plan',
    subtitle: 'Let AURAA Master Brain balance remaining tasks & routines',
    impactLabel: 'AI Plan',
  });

  if (dayContext.diaryLogs.length === 0) {
    actions.push({
      id: 'mb-diary-log',
      kind: 'open_diary',
      title: 'Log a Quick Time-Stamped Entry',
      subtitle: 'Record what you completed right now in Raa’s Diary',
      impactLabel: '+Diary',
      targetModule: 'notes',
    });
  }

  const headline =
    overdueCount > 0
      ? `${overdueCount} overdue & ${pendingTasks} pending today · ${waterRemaining > 0 ? `${waterRemaining} ml water left` : 'Hydration complete'}.`
      : pendingTasks > 0
        ? `${pendingTasks} task${pendingTasks > 1 ? 's' : ''} left · ${doneRoutines}/${totalRoutines} routines done · ${readinessScore}% readiness.`
        : `All scheduled tasks complete! ${waterRemaining > 0 ? `${waterRemaining} ml water remaining.` : 'Peak daily balance achieved.'}`;

  const gujaratiSummary =
    overdueCount > 0
      ? `આજે ${overdueCount} બાકી જૂના કામ અને ${pendingTasks} આજના કામ બાકી છે. Master Brain થી ૧ ક્લિકમાં આજે શિફ્ટ કરો.`
      : `તમારો આજનો લાઇફ બેલેન્સ સ્કોર ${readinessScore}% છે — ${pendingTasks} કામ અને ${waterRemaining} ml પાણી બાકી છે.`;

  return {
    readinessScore,
    statusLabel,
    headline,
    gujaratiSummary,
    pillars,
    topPriorityTitle,
    topPriorityDetail,
    actions: actions.slice(0, 4),
  };
}
