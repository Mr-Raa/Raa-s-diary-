import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, Download, Lock, Search, Unlock } from 'lucide-react';
import type { BootstrapData } from '../api/client';
import { api } from '../api/client';
import type { DayContext } from '../types';
import { addDays, formatDateReadable, formatTimeDisplay } from '../utils/dateLogic';
import { buildDateRangeAnalytics } from '../utils/analyticsLogic';
import { GlassSelect } from './GlassSelect';

interface HistoryViewProps {
  data: BootstrapData;
  onRefresh: () => Promise<void>;
}

type HistoryMode = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | 'Compare';

export const HistoryView: React.FC<HistoryViewProps> = ({ data, onRefresh }) => {
  const [mode, setMode] = useState<HistoryMode>('Daily');
  const [selectedDate, setSelectedDate] = useState(addDays(data.today, -1));
  const [compareDateB, setCompareDateB] = useState(data.today);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const [ctxA, setCtxA] = useState<DayContext | null>(null);
  const [ctxB, setCtxB] = useState<DayContext | null>(null);
  const [unlockedEdit, setUnlockedEdit] = useState(false);
  const [editReflection, setEditReflection] = useState('');
  const [saveFeedback, setSaveFeedback] = useState('');

  useEffect(() => {
    setUnlockedEdit(false);
    setSaveFeedback('');
    api
      .get<DayContext>(`/api/day-context?date=${encodeURIComponent(selectedDate)}`)
      .then((res) => {
        setCtxA(res);
        setEditReflection(res.journal?.reflection || '');
      });
  }, [selectedDate, data.tasks, data.routines, data.routineOccurrences, data.journals]);

  useEffect(() => {
    if (mode !== 'Compare') return;
    api
      .get<DayContext>(`/api/day-context?date=${encodeURIComponent(compareDateB)}`)
      .then(setCtxB);
  }, [mode, compareDateB]);

  const historySeries = useMemo(() => {
    const daysCount = mode === 'Weekly' ? 7 : mode === 'Monthly' ? 30 : 90;
    return buildDateRangeAnalytics({
      endDate: data.today,
      daysCount,
      routines: data.routines,
      routineOccurrences: data.routineOccurrences,
      tasks: data.tasks,
      studySessions: data.studySessions,
      workSessions: data.workSessions,
      focusSessions: data.focusSessions,
      habits: data.habits,
    });
  }, [mode, data]);

  const handleSaveHistoricalJournal = async () => {
    if (!ctxA) return;
    await api.post('/api/journals', {
      date: selectedDate,
      mood: ctxA.journal?.mood || 'Reflective',
      reflection: editReflection,
      achievements: ctxA.journal?.achievements || '',
      gratitude: ctxA.journal?.gratitude || '',
      explicitHistoricalEdit: true,
    });
    setUnlockedEdit(false);
    setSaveFeedback('Historical record updated with explicit confirmation.');
    await onRefresh();
  };

  const handleExportReport = () => {
    if (!ctxA) return;
    const blob = new Blob([JSON.stringify(ctxA, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `raas-diary-history-${selectedDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredTasks = useMemo(() => {
    if (!ctxA) return [];
    return ctxA.tasks
      .filter((t) => (categoryFilter === 'All' ? true : t.category === categoryFilter))
      .filter((t) =>
        searchQuery.trim() ? t.title.toLowerCase().includes(searchQuery.toLowerCase()) : true
      );
  }, [ctxA, categoryFilter, searchQuery]);

  return (
    <div className="space-y-3 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">History &amp; Daily Archive</h1>
          <p className="hidden sm:block text-xs text-[var(--text-secondary)] mt-0.5">
            Permanent date-specific history. Past days are preserved and never overwritten when a new day starts.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportReport}
          className="glass-button px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold flex items-center gap-1.5 min-h-[38px] sm:min-h-[40px] w-fit"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Report</span>
        </button>
      </div>

      {/* Mode Switcher */}
      <div className="flex items-center gap-1.5 glass p-1 sm:p-1.5 w-full sm:w-fit overflow-x-auto no-scrollbar flex-nowrap">
        {(['Daily', 'Weekly', 'Monthly', 'Yearly', 'Compare'] as HistoryMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 ${
              mode === m
                ? 'glass-button-primary text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {m === 'Compare' ? 'Compare Two Dates' : `${m} History`}
          </button>
        ))}
      </div>

      {mode === 'Daily' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-3">
              <label htmlFor="hist-date" className="sr-only">Select Historical Date</label>
              <input
                id="hist-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="glass-input w-full px-3 py-2.5 text-sm font-mono-num"
              />
            </div>
            <div className="sm:col-span-6 relative">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search historical tasks..."
                className="glass-input w-full pl-10 pr-3.5 py-2.5 text-sm"
              />
            </div>
            <div className="sm:col-span-3">
              <GlassSelect
                value={categoryFilter}
                onChange={(val) => setCategoryFilter(val)}
                ariaLabel="Filter history by category"
                className="w-full px-3 py-2.5 text-sm"
                options={[
                  { value: 'All', label: 'All Categories' },
                  ...['Personal', 'Study', 'Work', 'Health', 'Exercise', 'Learning', 'Family'].map(
                    (c) => ({ value: c, label: c })
                  ),
                ]}
              />
            </div>
          </div>

          {!ctxA ? (
            <div className="glass p-8 text-center text-xs text-[var(--text-secondary)]">
              Loading historical records for {formatDateReadable(selectedDate, data.settings.dateFormat)}...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                <div className="glass p-3 sm:p-4">
                  <div className="text-xs text-[var(--text-secondary)]">Productivity Score</div>
                  <div className="font-mono-num text-xl sm:text-2xl font-bold mt-1 text-[var(--accent)]">
                    {ctxA.productivityScore}%
                  </div>
                </div>
                <div className="glass p-3 sm:p-4">
                  <div className="text-xs text-[var(--text-secondary)]">Routines Completed</div>
                  <div className="font-mono-num text-xl sm:text-2xl font-bold mt-1 text-[var(--success)]">
                    {ctxA.routines.filter((r) => r.occurrenceStatus === 'completed').length} / {ctxA.routines.length}
                  </div>
                </div>
                <div className="glass p-3 sm:p-4">
                  <div className="text-xs text-[var(--text-secondary)]">Study &amp; Work</div>
                  <div className="font-mono-num text-xl sm:text-2xl font-bold mt-1">
                    {ctxA.studySessions.reduce((s, x) => s + x.durationMinutes, 0) +
                      ctxA.workSessions.reduce((s, x) => s + x.durationMinutes, 0)}m
                  </div>
                </div>
                <div className="glass p-3 sm:p-4">
                  <div className="text-xs text-[var(--text-secondary)]">Focus Time</div>
                  <div className="font-mono-num text-xl sm:text-2xl font-bold mt-1 text-[var(--accent-secondary)]">
                    {ctxA.focusSessions.reduce((s, x) => s + x.actualMinutes, 0)}m
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
                <section className="glass p-3.5 sm:p-5 space-y-3">
                  <h2 className="text-base font-semibold">
                    Activities on {formatDateReadable(selectedDate, data.settings.dateFormat)}
                  </h2>
                  <div className="space-y-2">
                    {ctxA.routines.map((r) => (
                      <div key={r.id} className="p-3 rounded-xl bg-white/[0.04] flex items-center justify-between text-xs gap-2">
                        <div>
                          <div className="font-medium">{r.title}</div>
                          {r.skippedReason && (
                            <div className="text-[var(--warning)] mt-0.5">Skipped: {r.skippedReason}</div>
                          )}
                        </div>
                        <span
                          className={`capitalize font-medium ${
                            r.occurrenceStatus === 'completed'
                              ? 'text-[var(--success)]'
                              : r.occurrenceStatus === 'skipped'
                                ? 'text-[var(--warning)]'
                                : 'text-[var(--text-muted)]'
                          }`}
                        >
                          {r.occurrenceStatus === 'pending' && selectedDate < data.today
                            ? 'Missed'
                            : r.occurrenceStatus}
                        </span>
                      </div>
                    ))}
                    {filteredTasks.map((t) => (
                      <div key={t.id} className="p-3 rounded-xl bg-white/[0.04] flex items-center justify-between text-xs gap-2">
                        <span className="font-medium">{t.title}</span>
                        <span className={t.status === 'Completed' ? 'text-[var(--success)]' : 'text-[var(--warning)]'}>
                          {t.status}
                        </span>
                      </div>
                    ))}
                    {ctxA.routines.length === 0 && filteredTasks.length === 0 && (
                      <p className="text-xs text-[var(--text-muted)] py-4">No activities recorded for this date.</p>
                    )}
                  </div>
                </section>

                <section className="glass p-3.5 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold">Daily Journal &amp; Reflection</h2>
                    {selectedDate < data.today && !unlockedEdit ? (
                      <button
                        type="button"
                        onClick={() => setUnlockedEdit(true)}
                        className="glass-button px-3 py-1.5 text-xs flex items-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Unlock Historical Edit</span>
                      </button>
                    ) : selectedDate < data.today && unlockedEdit ? (
                      <span className="text-xs text-[var(--warning)] flex items-center gap-1">
                        <Unlock className="w-3.5 h-3.5" /> Explicit edit mode
                      </span>
                    ) : null}
                  </div>

                  {ctxA.journal?.achievements && (
                    <div className="p-3 rounded-xl bg-white/[0.04] text-xs">
                      <span className="font-semibold">Achievements: </span>
                      {ctxA.journal.achievements}
                    </div>
                  )}

                  <textarea
                    rows={4}
                    value={editReflection}
                    disabled={selectedDate < data.today && !unlockedEdit}
                    onChange={(e) => setEditReflection(e.target.value)}
                    placeholder="No reflection logged for this date yet."
                    className="glass-input w-full p-3 text-sm disabled:opacity-70"
                  />

                  {(selectedDate >= data.today || unlockedEdit) && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--success)]">{saveFeedback}</span>
                      <button
                        type="button"
                        onClick={handleSaveHistoricalJournal}
                        className="glass-button-primary px-4 py-2 text-xs font-semibold"
                      >
                        Save Journal Record
                      </button>
                    </div>
                  )}

                  {ctxA.diaryLogs && ctxA.diaryLogs.length > 0 && (
                    <div className="pt-3 border-t border-[var(--glass-border-subtle)] space-y-2">
                      <div className="text-xs font-semibold text-[var(--text-secondary)]">
                        Hourly Diary Timeline ({ctxA.diaryLogs.length})
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {ctxA.diaryLogs.map((log) => (
                          <div key={log.id} className="p-2.5 rounded-xl bg-white/[0.04] text-xs space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono-num text-[var(--accent)] font-semibold">
                                {formatTimeDisplay(log.entryTime, data.settings.timeFormat)}
                              </span>
                              {log.title && <span className="font-semibold">{log.title}</span>}
                            </div>
                            <p className="text-[var(--text-secondary)] font-diary text-sm">{log.activity}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
        </div>
      )}

      {(mode === 'Weekly' || mode === 'Monthly' || mode === 'Yearly') && (
        <div className="glass p-3.5 sm:p-5 space-y-3">
          <h2 className="text-base font-semibold">{mode} Recorded Days</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--glass-border-subtle)] text-[var(--text-secondary)]">
                  <th className="py-2.5 pr-4">Date</th>
                  <th className="py-2.5 px-3 text-right">Score</th>
                  <th className="py-2.5 px-3 text-right">Routines</th>
                  <th className="py-2.5 px-3 text-right">Tasks</th>
                  <th className="py-2.5 px-3 text-right">Study</th>
                  <th className="py-2.5 px-3 text-right">Work</th>
                  <th className="py-2.5 pl-3 text-right">Focus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--glass-border-subtle)]">
                {[...historySeries].reverse().slice(0, 31).map((row) => (
                  <tr
                    key={row.date}
                    onClick={() => {
                      setSelectedDate(row.date);
                      setMode('Daily');
                    }}
                    className="hover:bg-white/[0.04] cursor-pointer"
                  >
                    <td className="py-2.5 pr-4 font-mono-num font-medium">
                      {formatDateReadable(row.date, data.settings.dateFormat)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-num text-[var(--accent)]">{row.score}%</td>
                    <td className="py-2.5 px-3 text-right font-mono-num">
                      {row.routinesCompleted}/{row.routinesTotal}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-num">
                      {row.tasksCompleted}/{row.tasksTotal}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-num">{row.studyMinutes}m</td>
                    <td className="py-2.5 px-3 text-right font-mono-num">{row.workMinutes}m</td>
                    <td className="py-2.5 pl-3 text-right font-mono-num">{row.focusMinutes}m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mode === 'Compare' && (
        <div className="space-y-4">
          <div className="glass p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="glass-input w-full sm:w-auto px-3 py-2 text-xs font-mono-num"
            />
            <ArrowLeftRight className="w-4 h-4 text-[var(--text-secondary)] self-center shrink-0" />
            <input
              type="date"
              value={compareDateB}
              onChange={(e) => setCompareDateB(e.target.value)}
              className="glass-input w-full sm:w-auto px-3 py-2 text-xs font-mono-num"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {[ctxA, ctxB].map((ctx, idx) =>
              ctx ? (
                <div key={idx} className="glass p-3.5 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold font-mono-num">
                      {formatDateReadable(ctx.date, data.settings.dateFormat)}
                    </h3>
                    <span className="font-mono-num text-lg font-bold text-[var(--accent)]">
                      {ctx.productivityScore}%
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] space-y-1.5">
                    <div>
                      Routines: {ctx.routines.filter((r) => r.occurrenceStatus === 'completed').length} / {ctx.routines.length}
                    </div>
                    <div>
                      Tasks: {ctx.tasks.filter((t) => t.status === 'Completed').length} / {ctx.tasks.length}
                    </div>
                    <div>
                      Focus: {ctx.focusSessions.reduce((s, x) => s + x.actualMinutes, 0)}m · Study:{' '}
                      {ctx.studySessions.reduce((s, x) => s + x.durationMinutes, 0)}m
                    </div>
                    {ctx.journal?.reflection && (
                      <p className="pt-2 border-t border-[var(--glass-border-subtle)] italic">
                        &ldquo;{ctx.journal.reflection}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}
    </div>
  );
};
