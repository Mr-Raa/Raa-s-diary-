import type { WaterLogEntry } from '../types';

export const WATER_QUICK_PRESETS_ML = [100, 150, 200, 250, 500] as const;
export const DEFAULT_WATER_GOAL_ML = 2500;
export const GLASS_SIZE_ML = 250;

export interface WaterMetrics {
  totalMl: number;
  goalMl: number;
  remainingMl: number;
  percent: number;
  glassesEquivalent: number;
  goalReached: boolean;
}

/**
 * Computes hydrated ml totals, remaining ml, percentage (0..100 for ring),
 * and backward-compatible glass equivalents.
 */
export function computeWaterMetrics(totalMl: number, goalMl: number = DEFAULT_WATER_GOAL_ML): WaterMetrics {
  const safeGoal = Math.max(250, Math.round(goalMl));
  const safeTotal = Math.max(0, Math.round(totalMl));
  const remainingMl = Math.max(0, safeGoal - safeTotal);
  const percent = Math.min(100, Math.round((safeTotal / safeGoal) * 100));
  const glassesEquivalent = Math.round((safeTotal / GLASS_SIZE_ML) * 10) / 10;

  return {
    totalMl: safeTotal,
    goalMl: safeGoal,
    remainingMl,
    percent,
    glassesEquivalent,
    goalReached: safeTotal >= safeGoal,
  };
}

/**
 * Formats milliliters nicely (e.g., 1250 -> "1,250 ml", or liters when requested).
 */
export function formatWaterAmount(ml: number): string {
  const safe = Math.max(0, Math.round(ml));
  return `${safe.toLocaleString('en-US')} ml`;
}

/**
 * Groups timestamped water entries by date descending for hydration history.
 */
export function summarizeWaterByDate(
  entries: WaterLogEntry[],
  goalMl: number = DEFAULT_WATER_GOAL_ML
): Array<{ date: string; totalMl: number; count: number; percent: number }> {
  const byDate = new Map<string, { totalMl: number; count: number }>();
  for (const e of entries) {
    const prev = byDate.get(e.date) ?? { totalMl: 0, count: 0 };
    byDate.set(e.date, {
      totalMl: prev.totalMl + Math.max(0, e.amountMl),
      count: prev.count + 1,
    });
  }
  const safeGoal = Math.max(250, goalMl);
  return Array.from(byDate.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, stats]) => ({
      date,
      totalMl: stats.totalMl,
      count: stats.count,
      percent: Math.min(100, Math.round((stats.totalMl / safeGoal) * 100)),
    }));
}

export function isValidWaterAmountMl(amount: number): boolean {
  return Number.isFinite(amount) && amount >= 10 && amount <= 5000;
}
