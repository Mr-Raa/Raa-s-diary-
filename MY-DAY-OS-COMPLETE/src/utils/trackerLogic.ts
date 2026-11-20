import type { BuiltinTrackerKey, CustomTracker, Routine, TrackerEntry } from '../types';

export interface TrackerSummaryCard {
  key: string;
  name: string;
  unit: string;
  target: number;
  currentValue: number;
  latestLabel: string;
  percent: number;
  entriesCount: number;
  isCustom: boolean;
  color: string;
}

export const BUILTIN_TRACKER_DEFS: Array<{
  key: BuiltinTrackerKey;
  name: string;
  unit: string;
  defaultTarget: number;
  color: string;
  quickValues: number[];
}> = [
  { key: 'sleep', name: 'Sleep', unit: 'hrs', defaultTarget: 8, color: '#a78bfa', quickValues: [6, 7, 7.5, 8] },
  { key: 'exercise', name: 'Exercise', unit: 'min', defaultTarget: 45, color: '#43D49A', quickValues: [15, 30, 45, 60] },
  { key: 'steps', name: 'Steps', unit: 'steps', defaultTarget: 8000, color: '#43DDF5', quickValues: [1000, 2500, 5000, 8000] },
  { key: 'food', name: 'Food & Nutrition', unit: 'kcal', defaultTarget: 2000, color: '#F3BD65', quickValues: [300, 500, 700, 900] },
  { key: 'mood', name: 'Mood', unit: '/5', defaultTarget: 5, color: '#EA83D9', quickValues: [2, 3, 4, 5] },
  { key: 'energy', name: 'Energy', unit: '/5', defaultTarget: 5, color: '#5487FF', quickValues: [2, 3, 4, 5] },
];

export const MOOD_LABELS: Record<number, string> = {
  1: 'Drained',
  2: 'Low',
  3: 'Steady',
  4: 'Good',
  5: 'Energized',
};

/**
 * Computes today's aggregated summary for all built-in + custom trackers
 * without mutating previous days' records.
 */
export function buildDailyTrackerSummaries(
  entries: TrackerEntry[],
  customTrackers: CustomTracker[],
  date: string
): TrackerSummaryCard[] {
  const dayEntries = entries.filter((e) => e.date === date);

  const builtinCards: TrackerSummaryCard[] = BUILTIN_TRACKER_DEFS.map((def) => {
    const matched = dayEntries.filter((e) => e.trackerKey === def.key);
    const isScoreType = def.key === 'mood' || def.key === 'energy';
    const currentValue =
      matched.length === 0
        ? 0
        : isScoreType
          ? matched[matched.length - 1].valueNumber
          : Math.round(matched.reduce((s, e) => s + e.valueNumber, 0) * 10) / 10;
    const latestLabel = matched.length > 0 ? matched[matched.length - 1].label : '';
    const percent = Math.min(100, Math.round((currentValue / Math.max(1, def.defaultTarget)) * 100));

    return {
      key: def.key,
      name: def.name,
      unit: def.unit,
      target: def.defaultTarget,
      currentValue,
      latestLabel,
      percent,
      entriesCount: matched.length,
      isCustom: false,
      color: def.color,
    };
  });

  const customCards: TrackerSummaryCard[] = customTrackers.map((ct) => {
    const matched = dayEntries.filter((e) => e.trackerKey === ct.id);
    const currentValue =
      matched.length === 0 ? 0 : Math.round(matched.reduce((s, e) => s + e.valueNumber, 0) * 10) / 10;
    const percent = Math.min(100, Math.round((currentValue / Math.max(1, ct.dailyTarget)) * 100));
    return {
      key: ct.id,
      name: ct.name,
      unit: ct.unit,
      target: ct.dailyTarget,
      currentValue,
      latestLabel: matched.length > 0 ? matched[matched.length - 1].label : '',
      percent,
      entriesCount: matched.length,
      isCustom: true,
      color: ct.color || '#5487FF',
    };
  });

  return [...builtinCards, ...customCards];
}

/**
 * Determines current active routine block and next upcoming routine block
 * for the selected date and current HH:mm local time.
 */
export function findCurrentAndNextRoutine(
  routines: Routine[],
  nowHHmm: string
): { current: Routine | null; next: Routine | null } {
  const sorted = [...routines].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const current =
    sorted.find((r) => r.startTime <= nowHHmm && r.endTime >= nowHHmm) ?? null;

  const next =
    sorted.find(
      (r) =>
        r.id !== current?.id &&
        r.startTime > nowHHmm &&
        r.occurrenceStatus !== 'completed' &&
        r.occurrenceStatus !== 'skipped'
    ) ??
    sorted.find((r) => r.id !== current?.id && r.occurrenceStatus === 'pending') ??
    null;

  return { current, next };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

/**
 * Formats a concise countdown label for a current or upcoming routine block.
 */
export function getRoutineTimeDeltaLabel(
  startTime: string,
  endTime: string,
  nowHHmm: string,
  isCurrent: boolean
): string {
  const nowMin = toMinutes(nowHHmm);
  const targetMin = isCurrent ? toMinutes(endTime) : toMinutes(startTime);
  const diff = targetMin - nowMin;
  if (diff <= 0) return isCurrent ? 'Ending now' : 'Starting now';
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  const durationText = hrs > 0 ? (mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`) : `${mins}m`;
  return isCurrent ? `${durationText} left` : `in ${durationText}`;
}

