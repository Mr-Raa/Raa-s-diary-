import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  ArrowLeft,
  BatteryCharging,
  Bell,
  Clock,
  Droplets,
  Dumbbell,
  Edit3,
  Flame,
  Footprints,
  History,
  Moon,
  Plus,
  Settings2,
  Smile,
  Sparkles,
  Trash2,
  Utensils,
} from 'lucide-react';
import type { BootstrapData } from '../api/client';
import { api } from '../api/client';
import type { WaterLogEntry } from '../types';
import { formatDateReadable, formatTimeDisplay } from '../utils/dateLogic';
import {
  BUILTIN_TRACKER_DEFS,
  MOOD_LABELS,
  buildDailyTrackerSummaries,
  type TrackerSummaryCard,
} from '../utils/trackerLogic';
import {
  WATER_QUICK_PRESETS_ML,
  computeWaterMetrics,
  formatWaterAmount,
  isValidWaterAmountMl,
  summarizeWaterByDate,
} from '../utils/waterLogic';
import { GlassModal } from './GlassModal';
import { LiquidGlassSwitch } from './LiquidGlass';

interface TrackersViewProps {
  data: BootstrapData;
  onRefresh: () => Promise<void>;
  initialTrackerKey?: string | null;
  onClearInitialTracker?: () => void;
}

const TRACKER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  water: Droplets,
  sleep: Moon,
  exercise: Dumbbell,
  steps: Footprints,
  food: Utensils,
  mood: Smile,
  energy: BatteryCharging,
  custom: Sparkles,
};

const COLOR_SWATCHES = ['#5487FF', '#9B70FF', '#43DDF5', '#43D49A', '#F3BD65', '#EA83D9'];

export const TrackersView: React.FC<TrackersViewProps> = ({
  data,
  onRefresh,
  initialTrackerKey,
  onClearInitialTracker,
}) => {
  const [selectedTracker, setSelectedTracker] = useState<string | null>(initialTrackerKey ?? null);
  const [selectedDate, setSelectedDate] = useState(data.today);

  // Sync external deep-link (e.g. clicking Water card on Home -> opens Water detail)
  React.useEffect(() => {
    if (initialTrackerKey) {
      setSelectedTracker(initialTrackerKey);
      onClearInitialTracker?.();
    }
  }, [initialTrackerKey, onClearInitialTracker]);

  // Water specific states
  const [waterSubTab, setWaterSubTab] = useState<'today' | 'history'>('today');
  const [customWaterOpen, setCustomWaterOpen] = useState(false);
  const [customWaterMl, setCustomWaterMl] = useState('300');
  const [customWaterNote, setCustomWaterNote] = useState('');
  const [waterSettingsOpen, setWaterSettingsOpen] = useState(false);
  const [goalMlInput, setGoalMlInput] = useState(String(data.settings.dailyWaterGoalMl || 2500));
  const [waterRemEnabled, setWaterRemEnabled] = useState(data.settings.waterRemindersEnabled ?? true);
  const [waterRemInterval, setWaterRemInterval] = useState(
    String(data.settings.waterReminderIntervalMinutes ?? 90)
  );
  const [editingWaterEntry, setEditingWaterEntry] = useState<WaterLogEntry | null>(null);
  const [editWaterAmount, setEditWaterAmount] = useState('');
  const [editWaterTime, setEditWaterTime] = useState('');

  // Generic tracker logging states
  const [logVal, setLogVal] = useState('');
  const [logLabel, setLogLabel] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [trackerTab, setTrackerTab] = useState<'log' | 'history'>('log');
  const [formError, setFormError] = useState('');

  // Create custom tracker modal
  const [createCustomOpen, setCreateCustomOpen] = useState(false);
  const [newTrackerName, setNewTrackerName] = useState('');
  const [newTrackerUnit, setNewTrackerUnit] = useState('mins');
  const [newTrackerTarget, setNewTrackerTarget] = useState('30');
  const [newTrackerColor, setNewTrackerColor] = useState('#5487FF');

  const dateWaterEntries = useMemo(
    () => data.waterEntries.filter((e) => e.date === selectedDate),
    [data.waterEntries, selectedDate]
  );

  const waterTotalForDate = useMemo(() => {
    if (dateWaterEntries.length > 0) {
      return dateWaterEntries.reduce((s, e) => s + e.amountMl, 0);
    }
    return selectedDate === data.today ? data.waterIntake.totalMl : 0;
  }, [dateWaterEntries, selectedDate, data.today, data.waterIntake.totalMl]);

  const waterMetrics = useMemo(
    () => computeWaterMetrics(waterTotalForDate, data.settings.dailyWaterGoalMl || 2500),
    [waterTotalForDate, data.settings.dailyWaterGoalMl]
  );

  const waterHistoryByDate = useMemo(
    () => summarizeWaterByDate(data.waterEntries, data.settings.dailyWaterGoalMl || 2500),
    [data.waterEntries, data.settings.dailyWaterGoalMl]
  );

  const trackerSummaries = useMemo(
    () => buildDailyTrackerSummaries(data.trackerEntries, data.customTrackers, selectedDate),
    [data.trackerEntries, data.customTrackers, selectedDate]
  );

  const handleLogWater = async (amountMl: number, note = '') => {
    if (!isValidWaterAmountMl(amountMl)) {
      setFormError('Water amount must be between 10 ml and 5,000 ml.');
      return;
    }
    setFormError('');
    await api.post('/api/water', { date: selectedDate, amountMl, note });
    setCustomWaterOpen(false);
    setCustomWaterNote('');
    await onRefresh();
  };

  const handleSaveWaterSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const goal = Math.max(500, Math.min(8000, Number(goalMlInput) || 2500));
    const interval = Math.max(15, Math.min(240, Number(waterRemInterval) || 90));
    await api.put('/api/settings', {
      dailyWaterGoalMl: goal,
      waterRemindersEnabled: waterRemEnabled,
      waterReminderIntervalMinutes: interval,
    });
    setWaterSettingsOpen(false);
    await onRefresh();
  };

  const handleSaveEditedWater = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWaterEntry) return;
    const amt = Number(editWaterAmount);
    if (!isValidWaterAmountMl(amt)) return;
    await api.put(`/api/water/entries/${editingWaterEntry.id}`, {
      amountMl: amt,
      time: editWaterTime,
      note: editingWaterEntry.note,
    });
    setEditingWaterEntry(null);
    await onRefresh();
  };

  const handleDeleteWaterEntry = async (id: string) => {
    await api.del(`/api/water/entries/${id}`);
    await onRefresh();
  };

  const handleQuickTrackerLog = async (
    trackerKey: string,
    valueNumber: number,
    unit: string,
    label = '',
    notes = ''
  ) => {
    if (!Number.isFinite(valueNumber) || valueNumber <= 0) {
      setFormError('Please enter a valid positive number.');
      return;
    }
    setFormError('');
    await api.post('/api/trackers/entries', {
      trackerKey,
      date: selectedDate,
      valueNumber,
      unit,
      label,
      notes,
    });
    setLogVal('');
    setLogLabel('');
    setLogNotes('');
    await onRefresh();
  };

  const handleCreateCustomTracker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrackerName.trim() || !newTrackerUnit.trim()) {
      setFormError('Tracker name and unit are required.');
      return;
    }
    setFormError('');
    const created = await api.post<{ id: string }>('/api/custom-trackers', {
      name: newTrackerName.trim(),
      unit: newTrackerUnit.trim(),
      dailyTarget: Math.max(1, Number(newTrackerTarget) || 1),
      color: newTrackerColor,
    });
    setCreateCustomOpen(false);
    setNewTrackerName('');
    await onRefresh();
    if (created.id) {
      setSelectedTracker(created.id);
    }
  };

  // =========================================================
  // DEDICATED WATER TRACKER SCREEN
  // =========================================================
  if (selectedTracker === 'water') {
    const ringRadius = 62;
    const ringCircumference = 2 * Math.PI * ringRadius;
    const ringOffset = ringCircumference - (waterMetrics.percent / 100) * ringCircumference;

    return (
      <div className="flex flex-col h-full min-h-0 space-y-2.5 sm:space-y-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setSelectedTracker(null)}
              aria-label="Back to Trackers"
              className="glass-button w-10 h-10 flex items-center justify-center shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold tracking-tight truncate">
                Water Intake
              </h1>
              <p className="text-[11px] text-[var(--text-secondary)] truncate">
                {formatDateReadable(selectedDate, data.settings.dateFormat)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setWaterSubTab((t) => (t === 'today' ? 'history' : 'today'))}
              className={`px-2.5 h-10 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                waterSubTab === 'history' ? 'glass-button-primary text-white' : 'glass-button'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>{waterSubTab === 'history' ? 'Today' : 'History'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setGoalMlInput(String(data.settings.dailyWaterGoalMl || 2500));
                setWaterRemEnabled(data.settings.waterRemindersEnabled ?? true);
                setWaterRemInterval(String(data.settings.waterReminderIntervalMinutes ?? 90));
                setWaterSettingsOpen(true);
              }}
              aria-label="Water goal and reminder settings"
              className="glass-button w-10 h-10 flex items-center justify-center"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {waterSubTab === 'history' ? (
          <div className="flex-1 min-h-0 glass p-3.5 sm:p-5 flex flex-col gap-3 overflow-hidden">
            <div className="flex items-center justify-between gap-2 shrink-0">
              <h2 className="text-sm font-semibold">Hydration History (All Dates)</h2>
              <input
                type="date"
                aria-label="Filter water history date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="glass-input px-2.5 py-1.5 text-xs font-mono-num"
              />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5">
              {waterHistoryByDate.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] text-center py-8">
                  No hydration history recorded yet.
                </p>
              ) : (
                waterHistoryByDate.map((day) => (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => {
                      setSelectedDate(day.date);
                      setWaterSubTab('today');
                    }}
                    className="w-full p-3 rounded-2xl bg-white/[0.04] text-left flex items-center justify-between gap-3 hover:bg-white/[0.07] transition-colors"
                  >
                    <div>
                      <div className="text-xs font-semibold">
                        {formatDateReadable(day.date, data.settings.dateFormat)}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {day.count} entries logged
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono-num text-sm font-bold text-[var(--accent-cyan)]">
                        {formatWaterAmount(day.totalMl)}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        {day.percent}% of goal
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-4 overflow-y-auto lg:overflow-hidden no-scrollbar">
            {/* Center Hydration Ring & Quick Add Grid */}
            <section className="lg:col-span-7 glass p-3.5 sm:p-5 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-around gap-3">
                <div className="relative w-32 h-32 sm:w-40 sm:h-40 shrink-0 flex items-center justify-center">
                  <svg className="w-32 h-32 sm:w-40 sm:h-40 -rotate-90" viewBox="0 0 150 150">
                    <circle
                      cx="75"
                      cy="75"
                      r={ringRadius}
                      fill="none"
                      stroke="rgba(148,163,184,0.16)"
                      strokeWidth="11"
                    />
                    <circle
                      cx="75"
                      cy="75"
                      r={ringRadius}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="11"
                      strokeLinecap="round"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={ringOffset}
                      style={{ transition: 'stroke-dashoffset 450ms ease' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <Droplets className="w-4 h-4 text-[var(--accent-cyan)] mb-0.5" />
                    <span className="font-mono-num text-base sm:text-xl font-bold leading-none">
                      {formatWaterAmount(waterMetrics.totalMl)}
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      {waterMetrics.percent}%
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs min-w-0">
                  <div>
                    <div className="text-[11px] text-[var(--text-muted)]">Daily Goal</div>
                    <div className="font-mono-num text-sm sm:text-base font-bold">
                      {formatWaterAmount(waterMetrics.goalMl)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--text-muted)]">Remaining</div>
                    <div className="font-mono-num text-sm sm:text-base font-semibold text-[var(--accent-cyan)]">
                      {waterMetrics.goalReached
                        ? '0 ml (Reached)'
                        : formatWaterAmount(waterMetrics.remainingMl)}
                    </div>
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
                    <Bell className="w-3 h-3 text-[var(--accent)] shrink-0" />
                    <span>
                      {(data.settings.waterRemindersEnabled ?? true)
                        ? `Every ${data.settings.waterReminderIntervalMinutes ?? 90}m`
                        : 'Reminders Off'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 6-Button Quick Add Grid */}
              <div className="grid grid-cols-3 gap-2">
                {WATER_QUICK_PRESETS_ML.map((ml) => (
                  <button
                    key={ml}
                    type="button"
                    onClick={() => handleLogWater(ml)}
                    className="glass-button min-h-[46px] px-2 py-2 flex items-center justify-center gap-1 text-xs font-semibold active:scale-95 transition-transform"
                  >
                    <Plus className="w-3.5 h-3.5 text-[var(--accent-cyan)] shrink-0" />
                    <span className="font-mono-num">+{ml} ml</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCustomWaterOpen((v) => !v)}
                  className="glass-button-primary min-h-[46px] px-2 py-2 flex items-center justify-center gap-1 text-xs font-semibold active:scale-95 transition-transform"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>Custom</span>
                </button>
              </div>

              {customWaterOpen && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleLogWater(Number(customWaterMl), customWaterNote);
                  }}
                  className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-1"
                >
                  <input
                    type="number"
                    min={10}
                    max={5000}
                    aria-label="Custom water milliliters"
                    value={customWaterMl}
                    onChange={(e) => setCustomWaterMl(e.target.value)}
                    placeholder="ml"
                    className="glass-input w-24 px-3 py-2 text-xs font-mono-num min-h-[40px]"
                  />
                  <input
                    value={customWaterNote}
                    onChange={(e) => setCustomWaterNote(e.target.value)}
                    placeholder="Note (optional)"
                    className="glass-input flex-1 min-w-[120px] px-3 py-2 text-xs min-h-[40px]"
                  />
                  <button type="submit" className="glass-button-primary px-4 py-2 text-xs font-semibold min-h-[40px]">
                    Save
                  </button>
                </form>
              )}
              {formError && <p className="text-xs text-[var(--danger)]">{formError}</p>}
            </section>

            {/* Recent Water Entries */}
            <section className="lg:col-span-5 glass p-3.5 sm:p-5 flex flex-col min-h-[170px] overflow-hidden">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <h2 className="text-xs sm:text-sm font-semibold">
                  Recent Entries ({dateWaterEntries.length})
                </h2>
                <span className="text-[11px] font-mono-num text-[var(--text-muted)]">
                  ~{waterMetrics.glassesEquivalent} glasses
                </span>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-0.5">
                {dateWaterEntries.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] py-6 text-center">
                    No water entries logged on {selectedDate}.
                  </p>
                ) : (
                  dateWaterEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="px-3 py-2 rounded-xl bg-white/[0.04] border border-[var(--glass-border-subtle)] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold font-mono-num text-[var(--accent-cyan)]">
                          +{formatWaterAmount(entry.amountMl)}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] truncate">
                          {formatTimeDisplay(entry.time, data.settings.timeFormat)}
                          {entry.note ? ` · ${entry.note}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingWaterEntry(entry);
                            setEditWaterAmount(String(entry.amountMl));
                            setEditWaterTime(entry.time);
                          }}
                          aria-label={`Edit water entry ${entry.amountMl}ml`}
                          className="glass-button w-8 h-8 flex items-center justify-center"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteWaterEntry(entry.id)}
                          aria-label={`Delete water entry ${entry.amountMl}ml`}
                          className="glass-button w-8 h-8 flex items-center justify-center text-[var(--danger)]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {/* Water Goal & Reminder Modal */}
        <GlassModal
          open={waterSettingsOpen}
          onClose={() => setWaterSettingsOpen(false)}
          title="Water Goal & Reminders"
          subtitle="Adjust your daily hydration target in milliliters"
        >
          <form onSubmit={handleSaveWaterSettings} className="space-y-4">
            <div>
              <label htmlFor="water-goal-ml" className="block text-xs font-medium mb-1.5">
                Daily Water Goal (ml)
              </label>
              <input
                id="water-goal-ml"
                type="number"
                min={500}
                max={8000}
                step={100}
                value={goalMlInput}
                onChange={(e) => setGoalMlInput(e.target.value)}
                className="glass-input w-full px-3.5 py-2.5 text-sm font-mono-num"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold">Hydration Reminders</div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Show reminder status inside hydration tracker
                </div>
              </div>
              <LiquidGlassSwitch
                checked={waterRemEnabled}
                onChange={setWaterRemEnabled}
                ariaLabel="Toggle hydration reminders"
              />
            </div>
            <div>
              <label htmlFor="water-rem-interval" className="block text-xs font-medium mb-1.5">
                Reminder Interval (minutes)
              </label>
              <input
                id="water-rem-interval"
                type="number"
                min={15}
                max={240}
                value={waterRemInterval}
                onChange={(e) => setWaterRemInterval(e.target.value)}
                className="glass-input w-full px-3.5 py-2.5 text-sm font-mono-num"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setWaterSettingsOpen(false)}
                className="glass-button px-4 py-2 text-xs"
              >
                Cancel
              </button>
              <button type="submit" className="glass-button-primary px-5 py-2 text-xs font-semibold">
                Save Goal
              </button>
            </div>
          </form>
        </GlassModal>

        {/* Edit Entry Modal */}
        <GlassModal
          open={Boolean(editingWaterEntry)}
          onClose={() => setEditingWaterEntry(null)}
          title="Edit Water Entry"
        >
          <form onSubmit={handleSaveEditedWater} className="space-y-3">
            <div>
              <label htmlFor="edit-water-ml" className="block text-xs font-medium mb-1">
                Amount (ml)
              </label>
              <input
                id="edit-water-ml"
                type="number"
                min={10}
                max={5000}
                value={editWaterAmount}
                onChange={(e) => setEditWaterAmount(e.target.value)}
                className="glass-input w-full px-3 py-2 text-sm font-mono-num"
              />
            </div>
            <div>
              <label htmlFor="edit-water-time" className="block text-xs font-medium mb-1">
                Time
              </label>
              <input
                id="edit-water-time"
                type="time"
                value={editWaterTime}
                onChange={(e) => setEditWaterTime(e.target.value)}
                className="glass-input w-full px-3 py-2 text-sm font-mono-num"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setEditingWaterEntry(null)} className="glass-button px-4 py-2 text-xs">
                Cancel
              </button>
              <button type="submit" className="glass-button-primary px-5 py-2 text-xs font-semibold">
                Update
              </button>
            </div>
          </form>
        </GlassModal>
      </div>
    );
  }

  // =========================================================
  // DEDICATED DETAIL SCREEN FOR SLEEP / EXERCISE / STEPS / FOOD / MOOD / ENERGY / CUSTOM
  // =========================================================
  if (selectedTracker) {
    const activeSummary = trackerSummaries.find((s) => s.key === selectedTracker);
    const builtinDef = BUILTIN_TRACKER_DEFS.find((d) => d.key === selectedTracker);
    const customDef = data.customTrackers.find((c) => c.id === selectedTracker);

    if (activeSummary) {
      const IconComp = TRACKER_ICONS[selectedTracker] || Sparkles;
      const entriesForTracker = data.trackerEntries.filter(
        (e) => e.trackerKey === selectedTracker && (trackerTab === 'history' || e.date === selectedDate)
      );
      const quickOptions = builtinDef?.quickValues ?? [
        Math.max(1, Math.round(activeSummary.target * 0.25)),
        Math.max(1, Math.round(activeSummary.target * 0.5)),
        activeSummary.target,
      ];

      return (
        <div className="flex flex-col h-full min-h-0 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setSelectedTracker(null)}
                aria-label="Back to Trackers"
                className="glass-button w-10 h-10 flex items-center justify-center shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold tracking-tight truncate">
                  {activeSummary.name}
                </h1>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Target: {activeSummary.target} {activeSummary.unit}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTrackerTab((t) => (t === 'log' ? 'history' : 'log'))}
                className={`px-3 h-10 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                  trackerTab === 'history' ? 'glass-button-primary text-white' : 'glass-button'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>{trackerTab === 'history' ? 'Today' : 'History'}</span>
              </button>
              {customDef && (
                <button
                  type="button"
                  onClick={async () => {
                    await api.del(`/api/custom-trackers/${customDef.id}`);
                    setSelectedTracker(null);
                    await onRefresh();
                  }}
                  aria-label={`Delete custom tracker ${customDef.name}`}
                  className="glass-button w-10 h-10 flex items-center justify-center text-[var(--danger)]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 overflow-y-auto lg:overflow-hidden no-scrollbar">
            <section className="lg:col-span-6 glass p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${activeSummary.color}22`, color: activeSummary.color }}
                  >
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-mono-num text-xl sm:text-2xl font-bold">
                      {activeSummary.currentValue}{' '}
                      <span className="text-xs font-normal text-[var(--text-secondary)]">
                        {activeSummary.unit}
                      </span>
                    </div>
                    {activeSummary.latestLabel && (
                      <div className="text-xs text-[var(--text-secondary)]">{activeSummary.latestLabel}</div>
                    )}
                  </div>
                </div>
                <span className="font-mono-num text-base font-bold" style={{ color: activeSummary.color }}>
                  {activeSummary.percent}%
                </span>
              </div>

              <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${activeSummary.percent}%`, backgroundColor: activeSummary.color }}
                />
              </div>

              {/* Quick Tap Presets */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-medium text-[var(--text-secondary)]">Quick Log</div>
                <div className="grid grid-cols-4 gap-2">
                  {quickOptions.map((val) => {
                    const isMoodOrEnergy = selectedTracker === 'mood' || selectedTracker === 'energy';
                    const lbl = isMoodOrEnergy ? MOOD_LABELS[val] || '' : '';
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() =>
                          handleQuickTrackerLog(selectedTracker, val, activeSummary.unit, lbl)
                        }
                        className="glass-button min-h-[44px] px-2 py-2 text-xs font-semibold flex flex-col items-center justify-center active:scale-95 transition-transform"
                      >
                        <span className="font-mono-num">
                          {isMoodOrEnergy ? `${val}/5` : `+${val}`}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] truncate max-w-full">
                          {lbl || activeSummary.unit}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Log Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleQuickTrackerLog(
                    selectedTracker,
                    Number(logVal),
                    activeSummary.unit,
                    logLabel.trim(),
                    logNotes.trim()
                  );
                }}
                className="space-y-2.5 pt-2 border-t border-[var(--glass-border-subtle)]"
              >
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="trk-val-input" className="block text-[11px] font-medium mb-1">
                      Value ({activeSummary.unit}) *
                    </label>
                    <input
                      id="trk-val-input"
                      type="number"
                      step="0.1"
                      value={logVal}
                      onChange={(e) => setLogVal(e.target.value)}
                      placeholder={String(activeSummary.target)}
                      className="glass-input w-full px-3 py-2 text-sm font-mono-num min-h-[42px]"
                    />
                  </div>
                  <div>
                    <label htmlFor="trk-label-input" className="block text-[11px] font-medium mb-1">
                      Label / Detail
                    </label>
                    <input
                      id="trk-label-input"
                      value={logLabel}
                      onChange={(e) => setLogLabel(e.target.value)}
                      placeholder="e.g., Morning Run"
                      className="glass-input w-full px-3 py-2 text-sm min-h-[42px]"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    value={logNotes}
                    onChange={(e) => setLogNotes(e.target.value)}
                    placeholder="Optional notes..."
                    className="glass-input flex-1 px-3 py-2 text-sm min-h-[42px]"
                  />
                  <button type="submit" className="glass-button-primary px-4 min-h-[42px] text-xs font-semibold shrink-0">
                    Log Entry
                  </button>
                </div>
                {formError && <p className="text-xs text-[var(--danger)]">{formError}</p>}
              </form>
            </section>

            {/* Logged Entries List */}
            <section className="lg:col-span-6 glass p-4 sm:p-5 flex flex-col min-h-[180px] overflow-hidden">
              <div className="flex items-center justify-between mb-2.5 shrink-0">
                <h2 className="text-xs sm:text-sm font-semibold">
                  {trackerTab === 'history' ? 'Full History' : `Entries on ${selectedDate}`} (
                  {entriesForTracker.length})
                </h2>
                <input
                  type="date"
                  aria-label="Filter tracker date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="glass-input px-2.5 py-1 text-xs font-mono-num"
                />
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5">
                {entriesForTracker.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] text-center py-8">
                    No entries logged yet.
                  </p>
                ) : (
                  entriesForTracker.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-2.5 rounded-xl bg-white/[0.04] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">
                          <span className="font-mono-num" style={{ color: activeSummary.color }}>
                            {entry.valueNumber} {entry.unit}
                          </span>
                          {entry.label ? ` · ${entry.label}` : ''}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] truncate">
                          {entry.date} · {formatTimeDisplay(entry.time, data.settings.timeFormat)}
                          {entry.notes ? ` · ${entry.notes}` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await api.del(`/api/trackers/entries/${entry.id}`);
                          await onRefresh();
                        }}
                        aria-label="Delete tracker entry"
                        className="glass-button w-8 h-8 flex items-center justify-center text-[var(--danger)] shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      );
    }
  }

  // =========================================================
  // TRACKERS HUB OVERVIEW (2-Column Mobile Grid Fitting Cleanly in Viewport)
  // =========================================================
  const allCards: Array<
    TrackerSummaryCard & { iconKey: string; displayValue: string; subtitle: string }
  > = [
    {
      key: 'water',
      name: 'Water',
      unit: 'ml',
      target: waterMetrics.goalMl,
      currentValue: waterMetrics.totalMl,
      latestLabel: '',
      percent: waterMetrics.percent,
      entriesCount: dateWaterEntries.length,
      isCustom: false,
      color: '#38bdf8',
      iconKey: 'water',
      displayValue: formatWaterAmount(waterMetrics.totalMl),
      subtitle: `Goal ${formatWaterAmount(waterMetrics.goalMl)}`,
    },
    ...trackerSummaries.map((s) => ({
      ...s,
      iconKey: s.isCustom ? 'custom' : s.key,
      displayValue:
        s.key === 'mood' || s.key === 'energy'
          ? s.currentValue > 0
            ? `${s.currentValue}/5 ${s.latestLabel || ''}`.trim()
            : 'Not logged'
          : `${s.currentValue.toLocaleString('en-US')} ${s.unit}`,
      subtitle: `Goal ${s.target.toLocaleString('en-US')} ${s.unit}`,
    })),
  ];

  return (
    <div className="flex flex-col h-full min-h-0 space-y-2.5 sm:space-y-4">
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Life Trackers</h1>
          <p className="hidden sm:block text-xs text-[var(--text-secondary)]">
            Hydration, sleep, movement, nutrition, mood, energy &amp; custom daily health trackers.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            type="date"
            aria-label="Trackers date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="hidden sm:block glass-input px-3 py-2 text-xs font-mono-num min-h-[40px]"
          />
          <button
            type="button"
            onClick={() => {
              setFormError('');
              setCreateCustomOpen(true);
            }}
            className="glass-button-primary px-3 py-2 text-xs font-semibold flex items-center gap-1.5 min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>Custom Tracker</span>
          </button>
        </div>
      </div>

      {/* 2-Column Mobile Grid / 4-Column Desktop Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3.5 pb-1">
          {allCards.map((card, idx) => {
            const IconComp = TRACKER_ICONS[card.iconKey] || Activity;
            const miniR = 13;
            const miniCirc = 2 * Math.PI * miniR;
            const miniOffset = miniCirc - (card.percent / 100) * miniCirc;
            return (
              <motion.button
                key={card.key}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03, type: 'spring', stiffness: 360, damping: 28 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setSelectedTracker(card.key)}
                className="glass-bento p-3 sm:p-4 text-left flex flex-col justify-between gap-2 min-h-[106px] sm:min-h-[132px] hover:brightness-110 transition-all"
              >
                <div className="flex items-center justify-between gap-1.5 w-full">
                  <div
                    className="w-8 h-8 rounded-xl glass-icon-capsule flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${card.color}24`, color: card.color }}
                  >
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="relative w-8 h-8 shrink-0 flex items-center justify-center">
                    <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32" aria-hidden="true">
                      <circle
                        cx="16"
                        cy="16"
                        r={miniR}
                        fill="none"
                        stroke="rgba(148,163,184,0.16)"
                        strokeWidth="2.8"
                      />
                      <circle
                        cx="16"
                        cy="16"
                        r={miniR}
                        fill="none"
                        stroke={card.color}
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeDasharray={miniCirc}
                        strokeDashoffset={miniOffset}
                      />
                    </svg>
                    <span className="absolute font-mono-num text-[8.5px] font-bold">
                      {card.percent}
                    </span>
                  </div>
                </div>

                <div className="min-w-0 w-full">
                  <div className="text-xs font-semibold truncate">{card.name}</div>
                  <div className="font-mono-num text-sm sm:text-base font-bold truncate mt-0.5">
                    {card.displayValue}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate">{card.subtitle}</div>
                </div>

                <div className="h-1 w-full rounded-full bg-slate-900/[0.08] dark:bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${card.percent}%`, backgroundColor: card.color }}
                  />
                </div>
              </motion.button>
            );
          })}

          {data.customTrackers.length === 0 && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => setCreateCustomOpen(true)}
              className="glass-bento p-3 sm:p-4 text-left flex flex-col justify-between gap-2 min-h-[106px] sm:min-h-[132px] hover:brightness-110 transition-all"
            >
              <div className="w-8 h-8 rounded-xl glass-icon-capsule bg-[var(--accent)]/18 text-[var(--accent)] flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold">Custom Tracker</div>
                <div className="text-[10.5px] text-[var(--text-secondary)] mt-0.5">
                  + Reading, Caffeine, Screen time
                </div>
              </div>
              <div className="text-[10.5px] font-semibold text-[var(--accent)] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Create metric</span>
              </div>
            </motion.button>
          )}
        </div>
      </div>

      {/* Create Custom Tracker Modal */}
      <GlassModal
        open={createCustomOpen}
        onClose={() => setCreateCustomOpen(false)}
        title="Create Custom Tracker"
        subtitle="Track any personal daily metric with progress history"
      >
        <form onSubmit={handleCreateCustomTracker} className="space-y-3.5">
          {formError && <p className="text-xs text-[var(--danger)]">{formError}</p>}
          <div>
            <label htmlFor="ct-name" className="block text-xs font-medium mb-1">
              Tracker Name *
            </label>
            <input
              id="ct-name"
              value={newTrackerName}
              onChange={(e) => setNewTrackerName(e.target.value)}
              placeholder="e.g., Meditation, Pages Read, Vitamin D"
              className="glass-input w-full px-3.5 py-2.5 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ct-unit" className="block text-xs font-medium mb-1">
                Unit *
              </label>
              <input
                id="ct-unit"
                value={newTrackerUnit}
                onChange={(e) => setNewTrackerUnit(e.target.value)}
                placeholder="mins / pages / cups"
                className="glass-input w-full px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label htmlFor="ct-target" className="block text-xs font-medium mb-1">
                Daily Target *
              </label>
              <input
                id="ct-target"
                type="number"
                min={1}
                value={newTrackerTarget}
                onChange={(e) => setNewTrackerTarget(e.target.value)}
                className="glass-input w-full px-3 py-2.5 text-sm font-mono-num"
              />
            </div>
          </div>
          <div>
            <span className="block text-xs font-medium mb-1.5">Accent Color</span>
            <div className="flex gap-2">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewTrackerColor(c)}
                  aria-label={`Tracker color ${c}`}
                  className={`w-8 h-8 rounded-full border-2 ${
                    newTrackerColor === c ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateCustomOpen(false)} className="glass-button px-4 py-2 text-xs">
              Cancel
            </button>
            <button type="submit" className="glass-button-primary px-5 py-2 text-xs font-semibold">
              Create Tracker
            </button>
          </div>
        </form>
      </GlassModal>
    </div>
  );
};
