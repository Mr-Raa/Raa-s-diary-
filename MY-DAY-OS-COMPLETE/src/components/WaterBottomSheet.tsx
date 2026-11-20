import React, { useState } from 'react';
import { ArrowRight, Droplets, Plus } from 'lucide-react';
import type { WaterIntake } from '../types';
import {
  WATER_QUICK_PRESETS_ML,
  computeWaterMetrics,
  formatWaterAmount,
  isValidWaterAmountMl,
} from '../utils/waterLogic';
import { GlassModal } from './GlassModal';

interface WaterBottomSheetProps {
  open: boolean;
  onClose: () => void;
  waterIntake: WaterIntake;
  today: string;
  onLogged: () => Promise<void>;
  onOpenFullTracker: () => void;
}

export const WaterBottomSheet: React.FC<WaterBottomSheetProps> = ({
  open,
  onClose,
  waterIntake,
  today,
  onLogged,
  onOpenFullTracker,
}) => {
  const [customMl, setCustomMl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const metrics = computeWaterMetrics(waterIntake.totalMl, waterIntake.goalMl);

  const handleLog = async (amountMl: number) => {
    if (!isValidWaterAmountMl(amountMl)) {
      setError('Enter an amount between 10 ml and 5,000 ml.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/water', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today, amountMl }),
      });
      if (!res.ok) throw new Error('Failed to save water entry');
      setCustomMl('');
      await onLogged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save water intake.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title="Quick Add Water"
      subtitle={`Today: ${formatWaterAmount(metrics.totalMl)} of ${formatWaterAmount(metrics.goalMl)} (${metrics.percent}%)`}
    >
      <div className="space-y-4">
        {/* Progress bar summary */}
        <div className="p-3 rounded-2xl bg-white/[0.04] border border-[var(--glass-border-subtle)] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-[var(--accent-cyan)]">
              <Droplets className="w-4 h-4" />
              <span>{metrics.percent}% of Daily Goal</span>
            </span>
            <span className="font-mono-num text-[var(--text-secondary)]">
              {metrics.goalReached
                ? 'Goal Reached'
                : `${formatWaterAmount(metrics.remainingMl)} left`}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#38bdf8] to-[#5487ff] transition-all duration-300"
              style={{ width: `${metrics.percent}%` }}
            />
          </div>
        </div>

        {/* Preset ML Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {WATER_QUICK_PRESETS_ML.map((ml) => (
            <button
              key={ml}
              type="button"
              disabled={saving}
              onClick={() => handleLog(ml)}
              className="glass-button min-h-[48px] px-2 py-2.5 flex flex-col items-center justify-center gap-0.5 text-xs font-semibold active:scale-95 transition-transform disabled:opacity-50"
            >
              <span className="font-mono-num text-[var(--accent-cyan)]">+{ml} ml</span>
              <span className="text-[10px] text-[var(--text-muted)]">
                {ml <= 150 ? 'Sip' : ml <= 250 ? 'Glass' : 'Bottle'}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenFullTracker();
            }}
            className="glass-button-primary min-h-[48px] px-2 py-2.5 flex flex-col items-center justify-center gap-0.5 text-xs font-semibold active:scale-95 transition-transform"
          >
            <span className="flex items-center gap-1">
              <span>Full View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
            <span className="text-[10px] opacity-85">History &amp; Goal</span>
          </button>
        </div>

        {/* Custom ml form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLog(Number(customMl));
          }}
          className="space-y-1.5"
        >
          <label htmlFor="quick-custom-water-ml" className="block text-xs font-medium text-[var(--text-secondary)]">
            Custom Amount (ml)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="quick-custom-water-ml"
              type="number"
              inputMode="numeric"
              min={10}
              max={5000}
              value={customMl}
              onChange={(e) => setCustomMl(e.target.value)}
              placeholder="e.g., 350"
              className="glass-input flex-1 px-3 py-2.5 text-sm font-mono-num min-h-[44px]"
            />
            <button
              type="submit"
              disabled={saving || !customMl}
              className="glass-button-primary px-4 min-h-[44px] text-xs font-semibold flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>
          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
        </form>
      </div>
    </GlassModal>
  );
};
