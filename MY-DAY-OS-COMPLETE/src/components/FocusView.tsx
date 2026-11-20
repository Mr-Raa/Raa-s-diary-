import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Flame,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Save,
  SkipForward,
  Sparkles,
  Target,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { BootstrapData } from '../api/client';
import { api } from '../api/client';
import { formatDateReadable } from '../utils/dateLogic';
import { playToneOnce } from '../utils/alarmAudio';
import {
  calculateMinutesToLog,
  calculateProgressRing,
  computeFocusStats,
  formatCountdown,
  getModeDurationMinutes,
  getNextPomodoroPhase,
  type FocusModeType,
} from '../utils/focusLogic';
import { GlassSelect } from './GlassSelect';

interface FocusViewProps {
  data: BootstrapData;
  onRefresh: () => Promise<void>;
}

type AmbientKind = 'off' | 'brown_noise' | 'soft_pad' | 'alpha_wave';

const DEFAULT_DOCUMENT_TITLE = "Raa's Diary — Personal Life OS";

export const FocusView: React.FC<FocusViewProps> = ({ data, onRefresh }) => {
  const [mode, setMode] = useState<FocusModeType>('pomodoro');
  const [customMins, setCustomMins] = useState(50);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [zenMode, setZenMode] = useState(false);
  const [cycleCount, setCycleCount] = useState(0); // 0..3 completed Pomodoros toward Long Break
  const [autoStartNext, setAutoStartNext] = useState(false);
  const [soundCue, setSoundCue] = useState(true);
  const [intention, setIntention] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusNotice, setStatusNotice] = useState('');

  const [linkedChoice, setLinkedChoice] = useState<string>('none::');
  const [ambient, setAmbient] = useState<AmbientKind>('off');
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioNodesRef = useRef<AudioNode[]>([]);
  const completingRef = useRef(false);

  const plannedMinutes = getModeDurationMinutes(mode, customMins);
  const totalSeconds = plannedMinutes * 60;
  const ring = calculateProgressRing(secondsLeft, totalSeconds);

  const stats = useMemo(
    () => computeFocusStats(data.focusSessions, data.today),
    [data.focusSessions, data.today]
  );

  const goalPct = Math.min(
    100,
    Math.round((stats.todayMinutes / Math.max(1, data.settings.dailyFocusGoalMinutes)) * 100)
  );

  // Sync browser tab title when timer is actively running
  useEffect(() => {
    if (running) {
      const label =
        mode === 'short_break' ? 'Break' : mode === 'long_break' ? 'Long Break' : 'Focus';
      document.title = `${formatCountdown(secondsLeft)} · ${label} | Raa's Diary`;
    } else {
      document.title = DEFAULT_DOCUMENT_TITLE;
    }
    return () => {
      document.title = DEFAULT_DOCUMENT_TITLE;
    };
  }, [running, secondsLeft, mode]);

  // Escape key exits Zen Mode
  useEffect(() => {
    if (!zenMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZenMode(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zenMode]);

  // Core 1-second tick interval
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const persistSession = useCallback(
    async (minsToSave: number, activeMode: FocusModeType) => {
      const [linkedType, linkedId, linkedTitleRaw] = linkedChoice.split('::');
      const trimmedIntention = intention.trim();
      const combinedTitle =
        linkedTitleRaw && trimmedIntention
          ? `${linkedTitleRaw} — ${trimmedIntention}`
          : linkedTitleRaw || trimmedIntention;

      await api.post('/api/focus/sessions', {
        date: data.today,
        mode: activeMode,
        plannedMinutes,
        actualMinutes: minsToSave,
        linkedType: linkedType || 'none',
        linkedId: linkedId || '',
        linkedTitle: combinedTitle || '',
        startedAt: startedAt || new Date().toISOString(),
        endedAt: new Date().toISOString(),
      });
      await onRefresh();
    },
    [data.today, intention, linkedChoice, onRefresh, plannedMinutes, startedAt]
  );

  const transitionToPhase = useCallback(
    (nextMode: FocusModeType, shouldAutoStart: boolean, nextCustomMins?: number) => {
      const mins = getModeDurationMinutes(nextMode, nextCustomMins ?? customMins);
      setMode(nextMode);
      setSecondsLeft(mins * 60);
      setRunning(shouldAutoStart);
      setHasStarted(shouldAutoStart);
      setStartedAt(shouldAutoStart ? new Date().toISOString() : null);
    },
    [customMins]
  );

  // Trigger completion once when timer reaches 00:00 while running
  useEffect(() => {
    if (!running || secondsLeft > 0 || completingRef.current) return;
    completingRef.current = true;
    setRunning(false);

    (async () => {
      try {
        if (soundCue) {
          playToneOnce(mode === 'pomodoro' || mode === 'custom' ? 'crystal' : 'sunrise');
        }
        setSaving(true);
        await persistSession(plannedMinutes, mode);
        const { nextMode, nextCycleCount } = getNextPomodoroPhase(mode, cycleCount, 4);
        setCycleCount(nextCycleCount);
        setStatusNotice(
          mode === 'pomodoro' || mode === 'custom'
            ? `Saved ${plannedMinutes}m focus session. Ready for ${nextMode === 'long_break' ? 'Long Break (15m)' : 'Short Break (5m)'}.`
            : 'Break finished. Ready for the next Pomodoro round.'
        );
        transitionToPhase(nextMode, autoStartNext);
      } finally {
        setSaving(false);
        completingRef.current = false;
      }
    })();
  }, [
    autoStartNext,
    cycleCount,
    mode,
    persistSession,
    plannedMinutes,
    running,
    secondsLeft,
    soundCue,
    transitionToPhase,
  ]);

  // Pure Web Audio API ambient soundscape generator (zero external audio URLs)
  useEffect(() => {
    const stopAudio = () => {
      for (const node of audioNodesRef.current) {
        try {
          if ('stop' in node && typeof (node as AudioBufferSourceNode).stop === 'function') {
            (node as AudioBufferSourceNode).stop();
          }
          node.disconnect();
        } catch {
          // ignore cleanup failures
        }
      }
      audioNodesRef.current = [];
    };

    stopAudio();
    if (ambient === 'off') return;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const gain = ctx.createGain();
      gain.gain.value = 0.045;
      gain.connect(ctx.destination);

      if (ambient === 'brown_noise') {
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const out = buffer.getChannelData(0);
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          out[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = out[i];
          out[i] *= 2.4;
        }
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        src.connect(gain);
        src.start();
        audioNodesRef.current = [src, gain];
      } else if (ambient === 'soft_pad') {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 174;
        osc.connect(gain);
        osc.start();
        audioNodesRef.current = [osc, gain];
      } else if (ambient === 'alpha_wave') {
        const oscL = ctx.createOscillator();
        const oscR = ctx.createOscillator();
        oscL.type = 'sine';
        oscR.type = 'sine';
        oscL.frequency.value = 210;
        oscR.frequency.value = 220; // subtle 10Hz alpha beat
        gain.gain.value = 0.028;
        oscL.connect(gain);
        oscR.connect(gain);
        oscL.start();
        oscR.start();
        audioNodesRef.current = [oscL, oscR, gain];
      }
    } catch {
      // ignore if audio blocked by autoplay policy
    }

    return () => stopAudio();
  }, [ambient]);

  const selectMode = (m: FocusModeType, mins?: number) => {
    setRunning(false);
    setHasStarted(false);
    setStatusNotice('');
    setMode(m);
    const nextMins = getModeDurationMinutes(m, mins ?? customMins);
    if (typeof mins === 'number') setCustomMins(nextMins);
    setSecondsLeft(nextMins * 60);
    setStartedAt(null);
  };

  const handleStartPause = () => {
    setStatusNotice('');
    if (!running) {
      if (!startedAt) setStartedAt(new Date().toISOString());
      setHasStarted(true);
      setRunning(true);
    } else {
      setRunning(false);
    }
  };

  const handleReset = () => {
    setRunning(false);
    setHasStarted(false);
    setStartedAt(null);
    setSecondsLeft(plannedMinutes * 60);
    setStatusNotice('');
  };

  const handleLogAndFinish = async () => {
    if (saving) return;
    setRunning(false);
    setSaving(true);
    try {
      const minsToSave = calculateMinutesToLog(plannedMinutes, secondsLeft);
      await persistSession(minsToSave, mode);
      const { nextCycleCount } = getNextPomodoroPhase(mode, cycleCount, 4);
      if (mode === 'pomodoro' || mode === 'custom') {
        setCycleCount(nextCycleCount);
      }
      setStatusNotice(`Logged ${minsToSave}m focus session to your history.`);
      setHasStarted(false);
      setStartedAt(null);
      setSecondsLeft(plannedMinutes * 60);
    } finally {
      setSaving(false);
    }
  };

  const handleSkipPhase = () => {
    const { nextMode, nextCycleCount } = getNextPomodoroPhase(mode, cycleCount, 4);
    setCycleCount(nextCycleCount);
    setStatusNotice('');
    transitionToPhase(nextMode, false);
  };

  const timeFormatted = formatCountdown(secondsLeft);
  const isBreak = mode === 'short_break' || mode === 'long_break';
  const phaseLabel =
    mode === 'short_break'
      ? 'SHORT BREAK'
      : mode === 'long_break'
        ? 'LONG BREAK'
        : mode === 'custom'
          ? 'CUSTOM SPRINT'
          : 'DEEP FOCUS';

  const ringRadius = 112;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const dashOffset = ringCircumference * (1 - ring.progressFraction);

  const primaryActionLabel = running ? 'Pause' : hasStarted && secondsLeft < totalSeconds ? 'Resume' : 'Start Focus';

  return (
    <div
      className={
        zenMode
          ? 'fixed inset-0 z-[10000] bg-[var(--background)] p-4 sm:p-8 flex flex-col justify-center items-center overflow-y-auto no-scrollbar'
          : 'space-y-4 sm:space-y-5'
      }
    >
      {!zenMode && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <span>Pomodoro Focus Studio</span>
            </h1>
            <p className="hidden sm:block text-xs text-[var(--text-secondary)] mt-0.5">
              Precision Pomodoro cycles, ambient soundscapes, and session logging linked to your tasks &amp; study blocks.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="glass-subtle px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-mono-num">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)]" />
              <span>
                {stats.todayPomodoros} {stats.todayPomodoros === 1 ? 'round' : 'rounds'}
              </span>
            </div>
            <div className="glass-subtle px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-mono-num">
              <Flame className="w-3.5 h-3.5 text-[var(--warning)]" />
              <span>{stats.streakDays}d streak</span>
            </div>
            <div className="glass-subtle px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-mono-num">
              <Target className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>
                <strong className="text-[var(--accent)]">{stats.todayMinutes}m</strong> /{' '}
                {data.settings.dailyFocusGoalMinutes}m
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Pomodoro Studio Card */}
      <div
        className={`glass p-4 sm:p-7 w-full ${
          zenMode ? 'max-w-xl shadow-2xl' : ''
        } flex flex-col items-center text-center space-y-5`}
      >
        {/* Top Mode Tabs + Zen Mode */}
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0">
            {(
              [
                ['pomodoro', 'Pomodoro 25m'],
                ['short_break', 'Break 5m'],
                ['long_break', 'Long 15m'],
                ['custom', 'Custom'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => selectMode(k)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  mode === k
                    ? 'glass-button-primary text-white'
                    : 'glass-button text-[var(--text-secondary)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setZenMode((z) => !z)}
            aria-label={zenMode ? 'Exit distraction-free mode' : 'Enter distraction-free mode'}
            title={zenMode ? 'Exit Zen Mode (Esc)' : 'Zen Mode'}
            className="glass-button p-2.5 shrink-0"
          >
            {zenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Custom Presets when Custom mode selected */}
        {mode === 'custom' && !running && (
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            {[15, 45, 50, 90].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => selectMode('custom', preset)}
                className={`px-2.5 py-1 rounded-lg font-mono-num ${
                  customMins === preset ? 'glass-button-primary text-white' : 'glass-button'
                }`}
              >
                {preset}m
              </button>
            ))}
            <div className="flex items-center gap-1.5 pl-1">
              <label htmlFor="custom-focus-mins" className="text-[var(--text-secondary)]">
                Custom:
              </label>
              <input
                id="custom-focus-mins"
                type="number"
                min={1}
                max={180}
                value={customMins}
                onChange={(e) => {
                  const v = Math.min(180, Math.max(1, Number(e.target.value) || 1));
                  setCustomMins(v);
                  setSecondsLeft(v * 60);
                }}
                className="glass-input w-16 px-2 py-1 text-center font-mono-num text-xs"
              />
              <span className="text-[var(--text-muted)]">m</span>
            </div>
          </div>
        )}

        {/* Precision SVG Chronometer Ring */}
        <div className="relative flex items-center justify-center my-1">
          <svg
            className="w-[236px] h-[236px] sm:w-[272px] sm:h-[272px] -rotate-90 drop-shadow-sm"
            viewBox="0 0 260 260"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="focusRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={isBreak ? '#34d399' : 'var(--accent)'} />
                <stop offset="100%" stopColor={isBreak ? '#22d3ee' : 'var(--accent-secondary)'} />
              </linearGradient>
            </defs>
            {/* Outer subtle halo track */}
            <circle
              cx="130"
              cy="130"
              r={ringRadius}
              fill="none"
              stroke="rgba(148, 163, 184, 0.14)"
              strokeWidth="10"
            />
            {/* Active countdown progress arc */}
            <circle
              cx="130"
              cy="130"
              r={ringRadius}
              fill="none"
              stroke="url(#focusRingGrad)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.55s cubic-bezier(0.22, 1, 0.36, 1)' }}
            />
          </svg>

          {/* Center Readout Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
            <div
              className={`text-[10.5px] font-bold tracking-[0.2em] uppercase mb-1.5 ${
                isBreak ? 'text-[var(--success)]' : 'text-[var(--accent)]'
              }`}
            >
              {phaseLabel}
            </div>

            <div
              data-testid="focus-timer-display"
              aria-live="off"
              className="font-mono-num text-5xl sm:text-6xl font-bold tracking-tight leading-none"
            >
              {timeFormatted}
            </div>

            {/* 4-Round Pomodoro Cycle Dots */}
            <div className="mt-3 flex items-center gap-2" aria-label={`Pomodoro round ${cycleCount + 1} of 4`}>
              {[0, 1, 2, 3].map((idx) => {
                const completed = idx < cycleCount;
                const activeNow = idx === cycleCount && !isBreak;
                return (
                  <span
                    key={idx}
                    className={`h-2 rounded-full transition-all ${
                      completed
                        ? 'w-2 bg-[var(--success)]'
                        : activeNow
                          ? 'w-5 bg-[var(--accent)]'
                          : 'w-2 bg-white/20'
                    }`}
                  />
                );
              })}
              <span className="text-[10px] font-mono-num text-[var(--text-muted)] ml-1">
                {cycleCount}/4
              </span>
            </div>
          </div>
        </div>

        {/* Status Toast Notice */}
        {statusNotice && (
          <div className="px-3.5 py-2 rounded-xl bg-[var(--success)]/12 border border-[var(--success)]/30 text-xs text-[var(--success)] font-medium">
            {statusNotice}
          </div>
        )}

        {/* Primary Action Controls: Start / Pause / Reset / Skip / Save */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 w-full">
          <button
            type="button"
            onClick={handleStartPause}
            className="glass-button-primary px-6 py-3 text-sm font-semibold flex items-center gap-2 min-h-[44px] active:scale-[0.98] transition-transform"
          >
            {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{primaryActionLabel}</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            aria-label="Reset timer"
            title="Reset Timer"
            className="glass-button px-3.5 py-3 text-xs font-medium flex items-center gap-1.5 min-h-[44px]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={handleSkipPhase}
            aria-label="Skip to next phase"
            title="Skip to next Pomodoro / Break"
            className="glass-button px-3.5 py-3 text-xs font-medium flex items-center gap-1.5 min-h-[44px]"
          >
            <SkipForward className="w-4 h-4" />
            <span className="hidden sm:inline">Next Phase</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleLogAndFinish}
            className="glass-button px-4 py-3 text-xs font-semibold flex items-center gap-1.5 min-h-[44px] disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-[var(--accent)]" />
            <span>{saving ? 'Saving...' : 'Log & Finish'}</span>
          </button>
        </div>

        {/* Session Intention & Task / Study / Project Link */}
        <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <div className="relative">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              placeholder="Focus goal (e.g. Finish React notes)"
              aria-label="Focus session intention"
              className="glass-input w-full pl-9 pr-3 py-2.5 text-xs"
            />
          </div>

          <GlassSelect
            value={linkedChoice}
            onChange={(val) => setLinkedChoice(val)}
            ariaLabel="Link focus session to item"
            className="w-full px-3.5 py-2.5 text-xs"
            options={[
              { value: 'none::', label: 'General Focus (Unlinked)' },
              ...data.tasks
                .filter((t) => t.status !== 'Completed')
                .map((t) => ({
                  value: `task::${t.id}::${t.title}`,
                  label: `Task: ${t.title}`,
                })),
              ...data.studySubjects.map((s) => ({
                value: `study::${s.id}::${s.name}`,
                label: `Study: ${s.name}`,
              })),
              ...data.workProjects.map((w) => ({
                value: `work::${w.id}::${w.title}`,
                label: `Work: ${w.title}`,
              })),
            ]}
          />
        </div>

        {/* Soundscape & Smart Pomodoro Automation Row */}
        <div className="w-full max-w-xl flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[var(--glass-border-subtle)] text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[var(--text-secondary)] flex items-center gap-1 mr-1">
              {ambient === 'off' ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-[var(--accent)]" />
              )}
              <span>Sound:</span>
            </span>
            {(
              [
                ['off', 'Off'],
                ['brown_noise', 'Warm Rain'],
                ['soft_pad', 'Calm Tone'],
                ['alpha_wave', 'Alpha 10Hz'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setAmbient(k)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium ${
                  ambient === k ? 'glass-button-primary text-white' : 'glass-button'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundCue((v) => !v)}
              aria-pressed={soundCue}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 ${
                soundCue ? 'glass-button text-[var(--accent)] border-[var(--accent)]/40' : 'glass-button text-[var(--text-muted)]'
              }`}
            >
              <Bell className="w-3 h-3" />
              <span>Chime {soundCue ? 'On' : 'Off'}</span>
            </button>

            <button
              type="button"
              onClick={() => setAutoStartNext((v) => !v)}
              aria-pressed={autoStartNext}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium ${
                autoStartNext
                  ? 'glass-button text-[var(--success)] border-[var(--success)]/40'
                  : 'glass-button text-[var(--text-muted)]'
              }`}
            >
              Auto-Next {autoStartNext ? 'On' : 'Off'}
            </button>
          </div>
        </div>
      </div>

      {/* Today Progress Bar + Recent Sessions History */}
      {!zenMode && (
        <>
          <div className="glass p-3.5 sm:p-5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">Daily Focus Goal Progress</span>
              <span className="font-mono-num text-[var(--text-secondary)]">
                {stats.todayMinutes} / {data.settings.dailyFocusGoalMinutes} mins ({goalPct}%)
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-white/[0.08] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${goalPct}%`,
                  background: 'linear-gradient(90deg, var(--accent), var(--accent-secondary))',
                }}
              />
            </div>
          </div>

          <section className="glass p-3.5 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Focus Session History</h2>
              <span className="text-xs font-mono-num text-[var(--text-muted)]">
                {data.focusSessions.length} sessions · {Math.round((stats.totalMinutes / 60) * 10) / 10}h total
              </span>
            </div>
            {data.focusSessions.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">
                No focus sessions saved yet. Start your first 25-minute Pomodoro above!
              </p>
            ) : (
              <div className="divide-y divide-[var(--glass-border-subtle)]">
                {data.focusSessions.slice(0, 10).map((f) => (
                  <div key={f.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                    <div className="min-w-0">
                      <span className="font-semibold capitalize">{f.mode.replace('_', ' ')}</span>
                      {f.linkedTitle && (
                        <span className="text-[var(--text-secondary)]"> · {f.linkedTitle}</span>
                      )}
                    </div>
                    <div className="font-mono-num text-[var(--text-secondary)] shrink-0">
                      {formatDateReadable(f.date, data.settings.dateFormat)} · {f.actualMinutes}m
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};
