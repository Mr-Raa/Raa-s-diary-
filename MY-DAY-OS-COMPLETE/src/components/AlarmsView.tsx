import React, { useEffect, useMemo, useState } from 'react';
import {
  AlarmClock,
  BellRing,
  CheckSquare,
  Clock,
  Droplets,
  Edit3,
  Minus,
  Plus,
  Sun,
  Trash2,
  Volume2,
} from 'lucide-react';
import type { BootstrapData } from '../api/client';
import { api } from '../api/client';
import type { Alarm, AlarmRepeatMode, AlarmTone, AlarmType } from '../types';
import { formatTimeDisplay } from '../utils/dateLogic';
import {
  formatMinutesCountdown,
  getIntervalScheduleTimes,
  getNextUpcomingAlarm,
} from '../utils/alarmLogic';
import { playToneOnce } from '../utils/alarmAudio';
import { GlassModal } from './GlassModal';
import { GlassSelect } from './GlassSelect';
import { LiquidGlassSwitch } from './LiquidGlass';

interface AlarmsViewProps {
  data: BootstrapData;
  onRefresh: () => Promise<void>;
  onTestTriggerAlarm: (alarm: Alarm) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getCurrentHHmmAndDay(timezone: string): { hhmm: string; day: number } {
  const now = new Date();
  const timeStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone || 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
  const weekdayShort = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'Asia/Kolkata',
    weekday: 'short',
  }).format(now);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { hhmm: timeStr, day: map[weekdayShort] ?? now.getDay() };
}

export const AlarmsView: React.FC<AlarmsViewProps> = ({ data, onRefresh, onTestTriggerAlarm }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Alarm | null>(null);
  const [nowInfo, setNowInfo] = useState(() => getCurrentHHmmAndDay(data.settings.timezone));

  // Form fields
  const [title, setTitle] = useState('');
  const [reminderNote, setReminderNote] = useState('');
  const [alarmType, setAlarmType] = useState<AlarmType>('custom');
  const [time, setTime] = useState('07:00');
  const [repeatMode, setRepeatMode] = useState<AlarmRepeatMode>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [intervalMinutes, setIntervalMinutes] = useState(90);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('21:00');
  const [tone, setTone] = useState<AlarmTone>('crystal');
  const [snoozeMinutes, setSnoozeMinutes] = useState(5);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowInfo(getCurrentHHmmAndDay(data.settings.timezone));
    }, 15000);
    return () => window.clearInterval(id);
  }, [data.settings.timezone]);

  const nextAlarm = useMemo(
    () => getNextUpcomingAlarm(data.alarms, nowInfo.hhmm, nowInfo.day),
    [data.alarms, nowInfo]
  );

  const openPreset = (preset: 'wakeup' | 'water' | 'custom') => {
    setEditing(null);
    setErrorMsg('');
    if (preset === 'wakeup') {
      setAlarmType('wakeup');
      setTitle('Morning Wake-Up Alarm');
      setReminderNote('Wake up fresh, stretch 5 mins & drink warm water');
      setTime('06:00');
      setRepeatMode('daily');
      setTone('sunrise');
      setSnoozeMinutes(5);
    } else if (preset === 'water') {
      setAlarmType('water');
      setTitle('Drink Water Reminder');
      setReminderNote('Drink 1 glass (250ml) of water right now');
      setTime('08:00');
      setRepeatMode('interval');
      setIntervalMinutes(90);
      setStartTime('08:00');
      setEndTime('21:00');
      setTone('waterdrop');
      setSnoozeMinutes(10);
    } else {
      setAlarmType('task');
      setTitle('');
      setReminderNote('');
      setTime('10:00');
      setRepeatMode('daily');
      setTone('crystal');
      setSnoozeMinutes(5);
    }
    setModalOpen(true);
  };

  const openEdit = (a: Alarm) => {
    setEditing(a);
    setErrorMsg('');
    setTitle(a.title);
    setReminderNote(a.reminderNote);
    setAlarmType(a.alarmType);
    setTime(a.time);
    setRepeatMode(a.repeatMode);
    setSelectedDays(a.selectedDays.length ? a.selectedDays : [1, 2, 3, 4, 5]);
    setIntervalMinutes(a.intervalMinutes || 60);
    setStartTime(a.startTime || '08:00');
    setEndTime(a.endTime || '21:00');
    setTone(a.tone);
    setSnoozeMinutes(a.snoozeMinutes || 5);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter an alarm title.');
      return;
    }
    const payload = {
      title: title.trim(),
      reminderNote: reminderNote.trim(),
      alarmType,
      time: repeatMode === 'interval' ? startTime : time,
      repeatMode,
      selectedDays: repeatMode === 'selected_days' ? selectedDays : [],
      intervalMinutes,
      startTime,
      endTime,
      tone,
      enabled: editing ? editing.enabled : true,
      snoozeMinutes,
    };
    if (editing) {
      await api.put(`/api/alarms/${editing.id}`, payload);
    } else {
      await api.post('/api/alarms', payload);
    }
    setModalOpen(false);
    await onRefresh();
  };

  const updateWater = async (delta: number) => {
    await api.post('/api/water', { date: data.today, delta });
    await onRefresh();
  };

  const getTypeIcon = (type: AlarmType) => {
    if (type === 'wakeup') return <Sun className="w-5 h-5 text-[var(--warning)]" />;
    if (type === 'water') return <Droplets className="w-5 h-5 text-[var(--accent-cyan)]" />;
    if (type === 'task') return <CheckSquare className="w-5 h-5 text-[var(--accent)]" />;
    if (type === 'routine') return <Clock className="w-5 h-5 text-[var(--accent-secondary)]" />;
    return <AlarmClock className="w-5 h-5 text-[var(--accent)]" />;
  };

  const waterPct = Math.min(
    100,
    Math.round((data.waterIntake.glasses / Math.max(1, data.waterIntake.targetGlasses)) * 100)
  );

  return (
    <div className="space-y-3 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Alarms &amp; Water</h1>
          <p className="hidden sm:block text-xs text-[var(--text-secondary)] mt-0.5">
            Wake-up alarms, hydration alerts, and exact time-based action reminders so you never miss what to do.
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 max-md:flex-nowrap max-md:overflow-x-auto max-md:no-scrollbar max-md:-mx-3 max-md:px-3 md:flex-wrap">
          <button
            type="button"
            onClick={() => openPreset('wakeup')}
            className="glass-button px-3 sm:px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 min-h-[38px] sm:min-h-[40px] shrink-0 whitespace-nowrap"
          >
            <Sun className="w-3.5 h-3.5 text-[var(--warning)]" />
            <span>+ Wake-Up</span>
          </button>
          <button
            type="button"
            onClick={() => openPreset('water')}
            className="glass-button px-3 sm:px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 min-h-[38px] sm:min-h-[40px] shrink-0 whitespace-nowrap"
          >
            <Droplets className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
            <span>+ Water Alarm</span>
          </button>
          <button
            type="button"
            onClick={() => openPreset('custom')}
            className="glass-button-primary px-3.5 sm:px-4 py-2 text-xs font-semibold flex items-center gap-1.5 min-h-[38px] sm:min-h-[40px] shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>New Alarm</span>
          </button>
        </div>
      </div>

      {/* Top Hero Row: Next Alarm Countdown + Daily Water Hydration Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-5">
        <div className="lg:col-span-7 glass p-3.5 sm:p-5 flex flex-col justify-between gap-3 sm:gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                Next Scheduled Alarm
              </div>
              {nextAlarm ? (
                <>
                  <div className="text-3xl sm:text-4xl font-bold font-mono-num tracking-tight">
                    {formatTimeDisplay(nextAlarm.time, data.settings.timeFormat)}
                  </div>
                  <div className="text-sm font-semibold mt-1">{nextAlarm.alarm.title}</div>
                  {nextAlarm.alarm.reminderNote && (
                    <p className="text-xs text-[var(--text-secondary)]">
                      Reminder: {nextAlarm.alarm.reminderNote}
                    </p>
                  )}
                </>
              ) : (
                <div className="text-sm text-[var(--text-muted)] py-2">
                  No active alarms enabled. Turn on or create an alarm below.
                </div>
              )}
            </div>
            {nextAlarm && (
              <div className="text-right shrink-0 space-y-2">
                <div className="text-xs font-mono-num px-3 py-1.5 rounded-xl bg-[var(--accent)]/15 border border-[var(--accent)]/35 text-[var(--text-primary)] font-semibold">
                  {formatMinutesCountdown(nextAlarm.minutesUntil)}
                </div>
                <button
                  type="button"
                  onClick={() => onTestTriggerAlarm(nextAlarm.alarm)}
                  className="glass-button px-3 py-1.5 text-[11px] font-medium flex items-center gap-1.5 ml-auto"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>Test Ring</span>
                </button>
              </div>
            )}
          </div>
          <p className="text-[11px] text-[var(--text-muted)] border-t border-[var(--glass-border-subtle)] pt-3">
            Alarms chime with harmonic audio and show a crystal reminder banner while the app is open (plus browser notifications if allowed).
          </p>
        </div>

        <div className="lg:col-span-5 glass p-3.5 sm:p-5 flex flex-col justify-between gap-3 sm:gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[var(--accent-cyan)]/15 flex items-center justify-center">
                <Droplets className="w-5 h-5 text-[var(--accent-cyan)]" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Today&apos;s Water Tracker</h2>
                <p className="text-[11px] text-[var(--text-secondary)]">Paired with Hydration Alarm</p>
              </div>
            </div>
            <div className="text-xl font-bold font-mono-num">
              {data.waterIntake.glasses} / {data.waterIntake.targetGlasses}
            </div>
          </div>

          <div className="space-y-2">
            <div className="w-full h-2.5 rounded-full bg-white/[0.08] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${waterPct}%`,
                  background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent))',
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
              <span>{data.waterIntake.glasses * 250} ml drunk today</span>
              <span>{waterPct}% of daily target</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateWater(-1)}
              aria-label="Remove 1 glass of water"
              className="glass-button px-3 py-2 text-xs flex items-center gap-1"
            >
              <Minus className="w-3.5 h-3.5" />
              <span>1 Glass</span>
            </button>
            <button
              type="button"
              onClick={() => updateWater(1)}
              className="glass-button-primary flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Drink +1 Glass (250ml)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alarms List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {data.alarms.map((a) => {
          const slots =
            a.repeatMode === 'interval'
              ? getIntervalScheduleTimes(a.startTime, a.endTime, a.intervalMinutes)
              : [];
          return (
            <div
              key={a.id}
              className={`glass p-3.5 sm:p-5 flex flex-col justify-between gap-3 sm:gap-4 transition-opacity ${
                a.enabled ? '' : 'opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-[var(--glass-border-subtle)] flex items-center justify-center shrink-0">
                    {getTypeIcon(a.alarmType)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-2xl font-bold font-mono-num leading-tight">
                      {a.repeatMode === 'interval'
                        ? `Every ${a.intervalMinutes}m`
                        : formatTimeDisplay(a.time, data.settings.timeFormat)}
                    </div>
                    <div className="text-sm font-semibold mt-0.5 truncate">{a.title}</div>
                    {a.reminderNote && (
                      <p className="text-xs text-[var(--text-secondary)] mt-1">{a.reminderNote}</p>
                    )}
                  </div>
                </div>

                <LiquidGlassSwitch
                  checked={a.enabled}
                  ariaLabel={`Toggle ${a.title}`}
                  onChange={async (next) => {
                    await api.post(`/api/alarms/${a.id}/toggle`, { enabled: next });
                    await onRefresh();
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[var(--glass-border-subtle)] text-[11px] text-[var(--text-muted)]">
                <div>
                  {a.repeatMode === 'interval' ? (
                    <span>
                      Window {formatTimeDisplay(a.startTime, data.settings.timeFormat)} –{' '}
                      {formatTimeDisplay(a.endTime, data.settings.timeFormat)} · {slots.length} reminders/day
                    </span>
                  ) : a.repeatMode === 'selected_days' ? (
                    <span>{a.selectedDays.map((d) => WEEKDAYS[d]).join(', ')}</span>
                  ) : (
                    <span className="capitalize">{a.repeatMode} · Tone: {a.tone}</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onTestTriggerAlarm(a)}
                    aria-label={`Test ring ${a.title}`}
                    className="glass-button px-2.5 py-1.5 text-[11px] flex items-center gap-1"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>Test</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(a)}
                    aria-label={`Edit ${a.title}`}
                    className="glass-button p-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await api.del(`/api/alarms/${a.id}`);
                      await onRefresh();
                    }}
                    aria-label={`Delete ${a.title}`}
                    className="glass-button p-1.5 text-[var(--danger)]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Alarm Modal */}
      <GlassModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Alarm & Reminder' : 'Create Smart Alarm'}
        subtitle="Set exact time, reminder message of what to do, and alarm sound."
      >
        <form onSubmit={handleSave} className="space-y-4">
          {errorMsg && <p className="text-xs text-[var(--danger)]">{errorMsg}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Alarm Category</label>
              <GlassSelect
                value={alarmType}
                onChange={(val) => {
                  const next = val as AlarmType;
                  setAlarmType(next);
                  if (next === 'water') setRepeatMode('interval');
                }}
                ariaLabel="Alarm Category"
                className="w-full px-3 py-2 text-sm"
                options={[
                  { value: 'wakeup', label: 'Wake-Up Alarm (જગવાનું)' },
                  { value: 'water', label: 'Water Reminder (પાણી પીવાનું)' },
                  { value: 'task', label: 'Task Reminder' },
                  { value: 'routine', label: 'Routine Block' },
                  { value: 'custom', label: 'Custom Reminder' },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Repeat Schedule</label>
              <GlassSelect
                value={repeatMode}
                onChange={(val) => setRepeatMode(val as AlarmRepeatMode)}
                ariaLabel="Repeat Schedule"
                className="w-full px-3 py-2 text-sm"
                options={[
                  { value: 'daily', label: 'Every Day' },
                  { value: 'weekdays', label: 'Weekdays (Mon–Fri)' },
                  { value: 'weekends', label: 'Weekends (Sat–Sun)' },
                  { value: 'selected_days', label: 'Custom Days' },
                  { value: 'interval', label: 'Recurring Interval (Water)' },
                  { value: 'once', label: 'Once' },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Alarm Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Wake up & Morning Walk / Drink Water"
              className="glass-input w-full px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">What to do at this time? (Reminder Note)</label>
            <input
              value={reminderNote}
              onChange={(e) => setReminderNote(e.target.value)}
              placeholder="e.g., Drink 1 glass water and start Revision Chapter 3"
              className="glass-input w-full px-3.5 py-2.5 text-sm"
            />
          </div>

          {repeatMode === 'interval' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">From</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="glass-input w-full px-3 py-2 text-sm font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Until</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="glass-input w-full px-3 py-2 text-sm font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Every (mins)</label>
                <GlassSelect
                  value={String(intervalMinutes)}
                  onChange={(val) => setIntervalMinutes(Number(val))}
                  ariaLabel="Interval minutes"
                  className="w-full px-3 py-2 text-sm font-mono-num"
                  options={[
                    { value: '30', label: '30m' },
                    { value: '45', label: '45m' },
                    { value: '60', label: '60m' },
                    { value: '90', label: '90m' },
                    { value: '120', label: '120m' },
                  ]}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Alarm Time</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="glass-input w-full px-3 py-2 text-sm font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Snooze (minutes)</label>
                <GlassSelect
                  value={String(snoozeMinutes)}
                  onChange={(val) => setSnoozeMinutes(Number(val))}
                  ariaLabel="Snooze minutes"
                  className="w-full px-3 py-2 text-sm font-mono-num"
                  options={[
                    { value: '5', label: '5 min' },
                    { value: '10', label: '10 min' },
                    { value: '15', label: '15 min' },
                  ]}
                />
              </div>
            </div>
          )}

          {repeatMode === 'selected_days' && (
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((d, idx) => {
                const active = selectedDays.includes(idx);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() =>
                      setSelectedDays((prev) =>
                        prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx]
                      )
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium ${
                      active ? 'glass-button-primary text-white' : 'glass-button'
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1">Chime Sound</label>
              <GlassSelect
                value={tone}
                onChange={(val) => setTone(val as AlarmTone)}
                ariaLabel="Chime Sound"
                className="w-full px-3 py-2 text-sm"
                options={[
                  { value: 'crystal', label: '💎 Crystal Glass Bell' },
                  { value: 'sunrise', label: '🌅 Morning Sunrise' },
                  { value: 'waterdrop', label: '💧 Liquid Water Drop' },
                  { value: 'pulse', label: '🔵 Focus Pulse' },
                  { value: 'zen', label: '🧘 Zen' },
                  { value: 'harp', label: '🎵 Harp' },
                  { value: 'chime', label: '🔔 Chime' },
                  { value: 'ocean', label: '🌊 Ocean' },
                  { value: 'birdsong', label: '🐦 Birdsong' },
                  { value: 'piano', label: '🎹 Piano' },
                  { value: 'bell', label: '🔔 Bell' },
                  { value: 'marimba', label: '🎶 Marimba' },
                  { value: 'flute', label: '🎵 Flute' },
                  { value: 'rainfall', label: '🌧️ Rainfall' },
                  { value: 'cosmic', label: '🌌 Cosmic' },
                  { value: 'breeze', label: '🍃 Breeze' },
                  { value: 'sparkle', label: '✨ Sparkle' },
                  { value: 'aurora', label: '🌈 Aurora' },
                  { value: 'cricket', label: '🦗 Cricket' },
                  { value: 'windchime', label: '🎐 Wind Chime' },
                  { value: 'tibetan', label: '🔔 Tibetan Bowl' },
                  { value: 'bamboo', label: '🎋 Bamboo' },
                  { value: 'dreambell', label: '💫 Dream Bell' },
                  { value: 'horizon', label: '🌅 Horizon' },
                  { value: 'twilight', label: '🌆 Twilight' },
                ]}
              />
            </div>
            <button
              type="button"
              onClick={() => playToneOnce(tone)}
              className="glass-button px-3.5 py-2 text-xs font-medium flex items-center gap-1.5 min-h-[38px]"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="glass-button px-4 py-2 text-xs">
              Cancel
            </button>
            <button type="submit" className="glass-button-primary px-5 py-2 text-xs font-semibold">
              {editing ? 'Save Alarm' : 'Create Alarm'}
            </button>
          </div>
        </form>
      </GlassModal>
    </div>
  );
};
