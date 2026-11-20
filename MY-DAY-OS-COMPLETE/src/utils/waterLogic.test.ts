import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeWaterMetrics,
  formatWaterAmount,
  isValidWaterAmountMl,
  summarizeWaterByDate,
} from './waterLogic';

test('computeWaterMetrics calculates consumed, remaining, percent, and goal state', () => {
  const m1 = computeWaterMetrics(1250, 2500);
  assert.equal(m1.totalMl, 1250);
  assert.equal(m1.goalMl, 2500);
  assert.equal(m1.remainingMl, 1250);
  assert.equal(m1.percent, 50);
  assert.equal(m1.glassesEquivalent, 5);
  assert.equal(m1.goalReached, false);

  const m2 = computeWaterMetrics(2800, 2500);
  assert.equal(m2.remainingMl, 0);
  assert.equal(m2.percent, 100);
  assert.equal(m2.goalReached, true);
});

test('summarizeWaterByDate isolates entries per date descending', () => {
  const summary = summarizeWaterByDate(
    [
      { id: '1', userId: 'u', date: '2026-11-15', time: '09:00', amountMl: 500, note: '', createdAt: '' },
      { id: '2', userId: 'u', date: '2026-11-16', time: '08:00', amountMl: 250, note: '', createdAt: '' },
      { id: '3', userId: 'u', date: '2026-11-16', time: '11:00', amountMl: 500, note: '', createdAt: '' },
    ],
    2500
  );
  assert.equal(summary.length, 2);
  assert.equal(summary[0].date, '2026-11-16');
  assert.equal(summary[0].totalMl, 750);
  assert.equal(summary[0].count, 2);
  assert.equal(summary[0].percent, 30);
  assert.equal(summary[1].date, '2026-11-15');
  assert.equal(summary[1].totalMl, 500);
});

test('isValidWaterAmountMl validates realistic intake bounds', () => {
  assert.equal(isValidWaterAmountMl(250), true);
  assert.equal(isValidWaterAmountMl(0), false);
  assert.equal(isValidWaterAmountMl(-100), false);
  assert.equal(isValidWaterAmountMl(10000), false);
  assert.equal(formatWaterAmount(1500), '1,500 ml');
});
