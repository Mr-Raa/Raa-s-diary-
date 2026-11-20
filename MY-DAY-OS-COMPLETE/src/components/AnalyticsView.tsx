import React, { useMemo, useState } from 'react';
import { Calendar, Flame, Smile, Sparkles } from 'lucide-react';
import type { BootstrapData } from '../api/client';
import { buildCategoryDistribution, buildDateRangeAnalytics } from '../utils/analyticsLogic';

interface AnalyticsViewProps {
  data: BootstrapData;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ data }) => {
  const [days, setDays] = useState<7 | 14 | 30 | 90>(14);
  const [selectedHeatmapDate, setSelectedHeatmapDate] = useState<string | null>(null);

  const series = useMemo(
    () =>
      buildDateRangeAnalytics({
        endDate: data.today,
        daysCount: days,
        routines: data.routines,
        routineOccurrences: data.routineOccurrences,
        tasks: data.tasks,
        studySessions: data.studySessions,
        workSessions: data.workSessions,
        focusSessions: data.focusSessions,
        habits: data.habits,
      }),
    [days, data]
  );

  // 10-week (70 days) extended series for the GitHub-style Heatmap
  const heatmapSeries = useMemo(
    () =>
      buildDateRangeAnalytics({
        endDate: data.today,
        daysCount: 70,
        routines: data.routines,
        routineOccurrences: data.routineOccurrences,
        tasks: data.tasks,
        studySessions: data.studySessions,
        workSessions: data.workSessions,
        focusSessions: data.focusSessions,
        habits: data.habits,
      }),
    [data]
  );

  const moodByDate = useMemo(() => {
    const map = new Map<string, string>();
    (data.journals || []).forEach((j) => {
      if (j.date && j.mood) map.set(j.date, j.mood);
    });
    return map;
  }, [data.journals]);

  const categoryDist = useMemo(
    () => buildCategoryDistribution(data.tasks, data.routines),
    [data.tasks, data.routines]
  );

  const avgScore =
    series.length > 0
      ? Math.round(series.reduce((s, p) => s + p.score, 0) / series.length)
      : 0;
  const totalTasksDone = series.reduce((s, p) => s + p.tasksCompleted, 0);
  const totalTasksPlanned = series.reduce((s, p) => s + p.tasksTotal, 0);
  const totalStudyHrs = Math.round((series.reduce((s, p) => s + p.studyMinutes, 0) / 60) * 10) / 10;
  const totalWorkHrs = Math.round((series.reduce((s, p) => s + p.workMinutes, 0) / 60) * 10) / 10;
  const totalFocusHrs = Math.round((series.reduce((s, p) => s + p.focusMinutes, 0) / 60) * 10) / 10;

  const recentBars = series.slice(-14);
  const linePoints = series.slice(-20);

  return (
    <div className="space-y-3 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Analytics &amp; Productivity</h1>
          <p className="hidden sm:block text-xs text-[var(--text-secondary)] mt-0.5">
            Computed directly from your stored routines, tasks, study, work, focus, and habit records.
          </p>
        </div>

        <div className="flex gap-1.5 glass p-1 sm:p-1.5 w-fit">
          {([7, 14, 30, 90] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium font-mono-num ${
                days === d ? 'glass-button-primary text-white' : 'text-[var(--text-secondary)]'
              }`}
            >
              {d}D
            </button>
          ))}
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
        <div className="glass p-3 sm:p-4">
          <div className="text-xs text-[var(--text-secondary)]">Avg Productivity</div>
          <div className="font-mono-num text-xl sm:text-2xl font-bold mt-1 text-[var(--accent)]">{avgScore}%</div>
        </div>
        <div className="glass p-3 sm:p-4">
          <div className="text-xs text-[var(--text-secondary)]">Task Completion</div>
          <div className="font-mono-num text-xl sm:text-2xl font-bold mt-1 text-[var(--success)]">
            {totalTasksDone}
            <span className="text-sm font-normal text-[var(--text-muted)]"> / {totalTasksPlanned}</span>
          </div>
        </div>
        <div className="glass p-3 sm:p-4">
          <div className="text-xs text-[var(--text-secondary)]">Study Hours</div>
          <div className="font-mono-num text-xl sm:text-2xl font-bold mt-1">{totalStudyHrs}h</div>
        </div>
        <div className="glass p-3 sm:p-4">
          <div className="text-xs text-[var(--text-secondary)]">Work Hours</div>
          <div className="font-mono-num text-xl sm:text-2xl font-bold mt-1 text-[var(--accent-secondary)]">{totalWorkHrs}h</div>
        </div>
        <div className="glass p-3 sm:p-4 col-span-2 lg:col-span-1">
          <div className="text-xs text-[var(--text-secondary)]">Focus Hours</div>
          <div className="font-mono-num text-xl sm:text-2xl font-bold mt-1 text-[var(--accent-cyan)]">{totalFocusHrs}h</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
        {/* Daily Score Bar Chart */}
        <section className="glass p-3.5 sm:p-5 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Daily Productivity Score</h2>
            <span className="text-xs text-[var(--text-muted)]">Last {recentBars.length} days</span>
          </div>
          <div className="h-48 flex items-end gap-1.5 sm:gap-2 pt-4">
            {recentBars.map((p) => (
              <div key={p.date} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="w-full flex-1 flex items-end">
                  <div
                    title={`${p.date}: ${p.score}%`}
                    className="w-full rounded-t-lg bg-gradient-to-t from-[var(--accent)] to-[var(--accent-secondary)] transition-all"
                    style={{ height: `${Math.max(6, p.score)}%`, opacity: p.score === 0 ? 0.2 : 0.9 }}
                  />
                </div>
                <span className="text-[10px] font-mono-num text-[var(--text-muted)] truncate max-w-full">
                  {p.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Trend Line Chart */}
        <section className="glass p-3.5 sm:p-5 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Productivity Trend Line</h2>
            <span className="text-xs text-[var(--text-muted)]">0 – 100%</span>
          </div>
          <svg viewBox="0 0 400 160" className="w-full h-44 overflow-visible">
            {[0, 50, 100].map((v) => {
              const y = 140 - (v / 100) * 120;
              return (
                <g key={v}>
                  <line x1="0" y1={y} x2="400" y2={y} stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" />
                  <text x="0" y={y - 4} fill="currentColor" className="text-[9px] opacity-50 font-mono-num">
                    {v}%
                  </text>
                </g>
              );
            })}
            {linePoints.length > 1 && (
              <polyline
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={linePoints
                  .map((p, idx) => {
                    const x = (idx / (linePoints.length - 1)) * 380 + 10;
                    const y = 140 - (p.score / 100) * 120;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />
            )}
            {linePoints.map((p, idx) => {
              const x = (idx / Math.max(1, linePoints.length - 1)) * 380 + 10;
              const y = 140 - (p.score / 100) * 120;
              return <circle key={p.date} cx={x} cy={y} r="3.5" fill="var(--accent-secondary)" />;
            })}
          </svg>
        </section>
      </div>

      {/* Category Distribution & Activity Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
        <section className="glass p-3.5 sm:p-5 space-y-3">
          <h2 className="text-base font-semibold">Category Distribution</h2>
          {categoryDist.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">Add tasks or routines to inspect categories.</p>
          ) : (
            <div className="space-y-2.5">
              {categoryDist.map((c) => (
                <div key={c.category} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{c.category}</span>
                    <span className="font-mono-num text-[var(--text-secondary)]">
                      {c.count} items · {c.percent}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${c.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* GitHub-Style Mood & Consistency Heatmap */}
        <section className="glass p-3.5 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smile className="w-4 h-4 text-[var(--accent)]" />
              <h2 className="text-base font-semibold">Mood &amp; Activity Heatmap</h2>
            </div>
            <span className="text-xs text-[var(--text-muted)] font-mono-num">Last 10 Weeks</span>
          </div>

          <div className="overflow-x-auto no-scrollbar pb-1">
            <div className="min-w-[320px] space-y-1.5">
              {/* Day of Week Row Labels (7 rows for Mon-Sun style grid) */}
              <div className="grid grid-cols-10 gap-1.5">
                {heatmapSeries.map((p) => {
                  const mood = moodByDate.get(p.date);
                  const isSelected = selectedHeatmapDate === p.date;
                  // Color scale based on score
                  const bg =
                    p.score >= 80
                      ? 'bg-emerald-500/80 border-emerald-400/50 text-white'
                      : p.score >= 50
                      ? 'bg-[var(--accent)]/70 border-[var(--accent)]/50 text-white'
                      : p.score >= 25
                      ? 'bg-[var(--accent-cyan)]/40 border-[var(--accent-cyan)]/30 text-white/90'
                      : p.score > 0
                      ? 'bg-white/10 border-white/10 text-white/70'
                      : 'bg-white/[0.03] border-white/[0.06] text-white/30';

                  const moodEmoji =
                    mood === 'happy' || mood === 'great'
                      ? '😊'
                      : mood === 'productive' || mood === 'energetic'
                      ? '⚡'
                      : mood === 'calm' || mood === 'peaceful'
                      ? '🧘'
                      : mood === 'tired' || mood === 'stressed'
                      ? '😴'
                      : mood
                      ? '✨'
                      : null;

                  return (
                    <button
                      key={p.date}
                      type="button"
                      onClick={() => setSelectedHeatmapDate(p.date === selectedHeatmapDate ? null : p.date)}
                      title={`${p.date}: ${p.score}% score${mood ? ` · Mood: ${mood}` : ''}`}
                      className={`h-8 sm:h-9 rounded-lg border flex flex-col items-center justify-center text-[10px] font-mono-num transition-all cursor-pointer ${bg} ${
                        isSelected ? 'ring-2 ring-white scale-105 shadow-lg z-10' : 'hover:scale-105'
                      }`}
                    >
                      {moodEmoji ? (
                        <span className="text-[11px] leading-none">{moodEmoji}</span>
                      ) : (
                        <span>{p.date.slice(-2)}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Heatmap Legend */}
              <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-2 border-t border-[var(--glass-border-subtle)]">
                <span>Less</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-white/[0.04] border border-white/[0.06]" />
                  <span className="w-3 h-3 rounded-sm bg-white/15" />
                  <span className="w-3 h-3 rounded-sm bg-[var(--accent-cyan)]/40" />
                  <span className="w-3 h-3 rounded-sm bg-[var(--accent)]/70" />
                  <span className="w-3 h-3 rounded-sm bg-emerald-500/80" />
                </div>
                <span>More Active</span>
              </div>
            </div>
          </div>

          {/* Selected Day Inspector Detail Card */}
          {selectedHeatmapDate && (() => {
            const p = heatmapSeries.find((x) => x.date === selectedHeatmapDate);
            if (!p) return null;
            const mood = moodByDate.get(p.date);
            return (
              <div className="p-3 rounded-xl bg-white/[0.05] border border-[var(--glass-border)] text-xs space-y-1.5 animate-fadeIn">
                <div className="flex items-center justify-between font-semibold">
                  <span>{p.date}</span>
                  <span className="font-mono-num text-[var(--accent)]">{p.score}% Productivity</span>
                </div>
                <div className="text-[var(--text-secondary)] grid grid-cols-2 gap-2 text-[11px]">
                  <div>Tasks: <span className="text-[var(--text-primary)] font-mono-num">{p.tasksCompleted}/{p.tasksTotal}</span></div>
                  <div>Focus: <span className="text-[var(--text-primary)] font-mono-num">{Math.round((p.focusMinutes + p.studyMinutes + p.workMinutes) / 60 * 10) / 10}h</span></div>
                  {mood && <div className="col-span-2">Mood: <span className="text-[var(--success)] font-medium capitalize">{mood}</span></div>}
                </div>
              </div>
            );
          })()}
        </section>
      </div>
    </div>
  );
};
