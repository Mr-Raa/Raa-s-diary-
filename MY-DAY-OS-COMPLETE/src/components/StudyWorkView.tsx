import React, { useState } from 'react';
import { BookOpen, Briefcase, Plus, Trash2 } from 'lucide-react';
import type { BootstrapData } from '../api/client';
import { api } from '../api/client';
import type { Priority } from '../types';
import { addDays, formatDateReadable } from '../utils/dateLogic';
import { GlassModal } from './GlassModal';
import { GlassSelect } from './GlassSelect';

interface StudyWorkViewProps {
  mode: 'study' | 'work';
  data: BootstrapData;
  onRefresh: () => Promise<void>;
}

export const StudyWorkView: React.FC<StudyWorkViewProps> = ({ mode, data, onRefresh }) => {
  const [subjectModal, setSubjectModal] = useState(false);
  const [sessionModal, setSessionModal] = useState(false);
  const [projectModal, setProjectModal] = useState(false);
  const [workSessionModal, setWorkSessionModal] = useState(false);

  // Study subject form
  const [subName, setSubName] = useState('');
  const [chapTotal, setChapTotal] = useState(10);
  const [chapDone, setChapDone] = useState(0);
  const [revDate, setRevDate] = useState(addDays(data.today, 2));
  const [targetHrs, setTargetHrs] = useState(20);
  const [subNotes, setSubNotes] = useState('');

  // Study session form
  const [ssSubjectId, setSsSubjectId] = useState(data.studySubjects[0]?.id || '');
  const [ssDuration, setSsDuration] = useState(45);
  const [ssTopic, setSsTopic] = useState('');

  // Work project form
  const [wpTitle, setWpTitle] = useState('');
  const [wpTeam, setWpTeam] = useState('');
  const [wpDeadline, setWpDeadline] = useState(addDays(data.today, 7));
  const [wpPri, setWpPri] = useState<Priority>('High');
  const [wpProg, setWpProg] = useState(0);

  // Work session form
  const [wsProjectId, setWsProjectId] = useState(data.workProjects[0]?.id || '');
  const [wsDuration, setWsDuration] = useState(60);
  const [wsSummary, setWsSummary] = useState('');

  if (mode === 'study') {
    const totalStudyMins = data.studySessions.reduce((s, x) => s + x.durationMinutes, 0);
    return (
      <div className="space-y-3 sm:space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Study Workspace</h1>
            <p className="hidden sm:block text-xs text-[var(--text-secondary)] mt-0.5">
              Subjects, chapter progress, revision schedule, and logged study hours ({Math.round((totalStudyMins / 60) * 10) / 10}h total)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSsSubjectId(data.studySubjects[0]?.id || '');
                setSessionModal(true);
              }}
              className="glass-button px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold min-h-[38px] sm:min-h-[40px]"
            >
              + Log Study Session
            </button>
            <button
              type="button"
              onClick={() => setSubjectModal(true)}
              className="glass-button-primary px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold flex items-center gap-1.5 min-h-[38px] sm:min-h-[40px]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Subject</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {data.studySubjects.map((sub) => {
            const pct = sub.chaptersTotal > 0 ? Math.round((sub.chaptersCompleted / sub.chaptersTotal) * 100) : 0;
            const logged = data.studySessions
              .filter((s) => s.subjectId === sub.id)
              .reduce((a, b) => a + b.durationMinutes, 0);
            return (
              <div key={sub.id} className="glass p-3.5 sm:p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-[var(--accent)]" />
                    <div>
                      <h3 className="text-base font-semibold">{sub.name}</h3>
                      <div className="text-xs text-[var(--text-secondary)] font-mono-num">
                        {sub.chaptersCompleted}/{sub.chaptersTotal} chapters · {logged}m logged · Revision{' '}
                        {sub.nextRevisionDate ? formatDateReadable(sub.nextRevisionDate, data.settings.dateFormat) : 'Unset'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await api.del(`/api/study/subjects/${sub.id}`);
                      await onRefresh();
                    }}
                    aria-label={`Delete ${sub.name}`}
                    className="glass-button p-2 text-[var(--danger)]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[var(--text-muted)]">{sub.notes || 'Keep steady daily blocks.'}</span>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={async () => {
                        await api.put(`/api/study/subjects/${sub.id}`, {
                          ...sub,
                          chaptersCompleted: Math.min(sub.chaptersTotal, sub.chaptersCompleted + 1),
                        });
                        await onRefresh();
                      }}
                      className="glass-button px-2.5 py-1 text-xs"
                    >
                      +1 Chapter
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <section className="glass p-5 space-y-3">
          <h2 className="text-base font-semibold">Recent Study Sessions</h2>
          {data.studySessions.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">No study sessions logged yet.</p>
          ) : (
            <div className="divide-y divide-[var(--glass-border-subtle)]">
              {data.studySessions.slice(0, 10).map((s) => (
                <div key={s.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                  <div>
                    <span className="font-semibold">{s.subjectName || 'Study'}</span>
                    {s.topic && <span className="text-[var(--text-secondary)]"> · {s.topic}</span>}
                  </div>
                  <div className="font-mono-num text-[var(--text-secondary)] shrink-0">
                    {formatDateReadable(s.date, data.settings.dateFormat)} · {s.durationMinutes}m
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <GlassModal open={subjectModal} onClose={() => setSubjectModal(false)} title="Add Study Subject">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!subName.trim()) return;
              await api.post('/api/study/subjects', {
                name: subName.trim(),
                chaptersTotal: chapTotal,
                chaptersCompleted: chapDone,
                nextRevisionDate: revDate,
                targetHours: targetHrs,
                notes: subNotes,
              });
              setSubjectModal(false);
              setSubName('');
              await onRefresh();
            }}
            className="space-y-3.5"
          >
            <input value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="Subject name" className="glass-input w-full px-3.5 py-2.5 text-sm" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1">Total Chapters</label>
                <input type="number" min={1} value={chapTotal} onChange={(e) => setChapTotal(Number(e.target.value))} className="glass-input w-full px-3 py-2 text-sm font-mono-num" />
              </div>
              <div>
                <label className="block text-xs mb-1">Completed Chapters</label>
                <input type="number" min={0} value={chapDone} onChange={(e) => setChapDone(Number(e.target.value))} className="glass-input w-full px-3 py-2 text-sm font-mono-num" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1">Next Revision Date</label>
                <input type="date" value={revDate} onChange={(e) => setRevDate(e.target.value)} className="glass-input w-full px-3 py-2 text-sm font-mono-num" />
              </div>
              <div>
                <label className="block text-xs mb-1">Target Hours</label>
                <input type="number" min={1} value={targetHrs} onChange={(e) => setTargetHrs(Number(e.target.value))} className="glass-input w-full px-3 py-2 text-sm font-mono-num" />
              </div>
            </div>
            <input value={subNotes} onChange={(e) => setSubNotes(e.target.value)} placeholder="Notes" className="glass-input w-full px-3.5 py-2.5 text-sm" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setSubjectModal(false)} className="glass-button px-4 py-2 text-xs">Cancel</button>
              <button type="submit" className="glass-button-primary px-5 py-2 text-xs font-semibold">Save Subject</button>
            </div>
          </form>
        </GlassModal>

        <GlassModal open={sessionModal} onClose={() => setSessionModal(false)} title="Log Study Session">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!ssSubjectId) return;
              await api.post('/api/study/sessions', {
                subjectId: ssSubjectId,
                date: data.today,
                durationMinutes: ssDuration,
                topic: ssTopic,
              });
              setSessionModal(false);
              setSsTopic('');
              await onRefresh();
            }}
            className="space-y-3.5"
          >
            <GlassSelect
              value={ssSubjectId}
              onChange={setSsSubjectId}
              ariaLabel="Study subject"
              placeholder="Select a subject..."
              className="w-full px-3 py-2.5 text-sm"
              options={data.studySubjects.map((s) => ({ value: s.id, label: s.name }))}
            />
            <input type="number" min={5} value={ssDuration} onChange={(e) => setSsDuration(Number(e.target.value))} placeholder="Minutes" className="glass-input w-full px-3 py-2.5 text-sm font-mono-num" />
            <input value={ssTopic} onChange={(e) => setSsTopic(e.target.value)} placeholder="Topic covered" className="glass-input w-full px-3.5 py-2.5 text-sm" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setSessionModal(false)} className="glass-button px-4 py-2 text-xs">Cancel</button>
              <button type="submit" className="glass-button-primary px-5 py-2 text-xs font-semibold">Log Session</button>
            </div>
          </form>
        </GlassModal>
      </div>
    );
  }

  // WORK MODE
  const totalWorkMins = data.workSessions.reduce((s, x) => s + x.durationMinutes, 0);
  return (
    <div className="space-y-3 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Work &amp; Projects</h1>
          <p className="hidden sm:block text-xs text-[var(--text-secondary)] mt-0.5">
            Project deadlines, priority tracking, and logged work hours ({Math.round((totalWorkMins / 60) * 10) / 10}h total)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setWsProjectId(data.workProjects[0]?.id || '');
              setWorkSessionModal(true);
            }}
            className="glass-button px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold min-h-[38px] sm:min-h-[40px]"
          >
            + Log Work Session
          </button>
          <button
            type="button"
            onClick={() => setProjectModal(true)}
            className="glass-button-primary px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold flex items-center gap-1.5 min-h-[38px] sm:min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {data.workProjects.map((wp) => (
          <div key={wp.id} className="glass p-3.5 sm:p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Briefcase className="w-4 h-4 text-[var(--accent-secondary)]" />
                <div>
                  <h3 className="text-base font-semibold">{wp.title}</h3>
                  <div className="text-xs text-[var(--text-secondary)] font-mono-num">
                    {wp.clientOrTeam || 'Personal'} · Deadline {formatDateReadable(wp.deadline, data.settings.dateFormat)} · {wp.priority}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await api.del(`/api/work/projects/${wp.id}`);
                  await onRefresh();
                }}
                aria-label={`Delete ${wp.title}`}
                className="glass-button p-2 text-[var(--danger)]"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>{wp.status}</span>
                <span className="font-mono-num">{wp.progress}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={wp.progress}
                onChange={async (e) => {
                  const next = Number(e.target.value);
                  await api.put(`/api/work/projects/${wp.id}`, {
                    ...wp,
                    progress: next,
                    status: next === 100 ? 'Completed' : 'Active',
                  });
                  await onRefresh();
                }}
                className="w-full accent-[var(--accent-secondary)]"
              />
            </div>
          </div>
        ))}
      </div>

      <section className="glass p-5 space-y-3">
        <h2 className="text-base font-semibold">Work History</h2>
        {data.workSessions.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">No work sessions logged yet.</p>
        ) : (
          <div className="divide-y divide-[var(--glass-border-subtle)]">
            {data.workSessions.slice(0, 10).map((w) => (
              <div key={w.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                <div>
                  <span className="font-semibold">{w.projectTitle || 'Work'}</span>
                  {w.summary && <span className="text-[var(--text-secondary)]"> · {w.summary}</span>}
                </div>
                <div className="font-mono-num text-[var(--text-secondary)] shrink-0">
                  {formatDateReadable(w.date, data.settings.dateFormat)} · {w.durationMinutes}m
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <GlassModal open={projectModal} onClose={() => setProjectModal(false)} title="Create Work Project">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!wpTitle.trim()) return;
            await api.post('/api/work/projects', {
              title: wpTitle.trim(),
              clientOrTeam: wpTeam,
              deadline: wpDeadline,
              priority: wpPri,
              progress: wpProg,
            });
            setProjectModal(false);
            setWpTitle('');
            await onRefresh();
          }}
          className="space-y-3.5"
        >
          <input value={wpTitle} onChange={(e) => setWpTitle(e.target.value)} placeholder="Project title" className="glass-input w-full px-3.5 py-2.5 text-sm" />
          <input value={wpTeam} onChange={(e) => setWpTeam(e.target.value)} placeholder="Client or Team" className="glass-input w-full px-3.5 py-2.5 text-sm" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="date" value={wpDeadline} onChange={(e) => setWpDeadline(e.target.value)} className="glass-input w-full px-3 py-2 text-sm font-mono-num" />
            <GlassSelect
              value={wpPri}
              onChange={(val) => setWpPri(val as Priority)}
              ariaLabel="Project priority"
              className="w-full px-3 py-2 text-sm"
              options={(['Low', 'Medium', 'High', 'Urgent'] as Priority[]).map((p) => ({
                value: p,
                label: p,
              }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setProjectModal(false)} className="glass-button px-4 py-2 text-xs">Cancel</button>
            <button type="submit" className="glass-button-primary px-5 py-2 text-xs font-semibold">Save Project</button>
          </div>
        </form>
      </GlassModal>

      <GlassModal open={workSessionModal} onClose={() => setWorkSessionModal(false)} title="Log Work Session">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!wsProjectId) return;
            await api.post('/api/work/sessions', {
              projectId: wsProjectId,
              date: data.today,
              durationMinutes: wsDuration,
              summary: wsSummary,
            });
            setWorkSessionModal(false);
            setWsSummary('');
            await onRefresh();
          }}
          className="space-y-3.5"
        >
          <GlassSelect
            value={wsProjectId}
            onChange={setWsProjectId}
            ariaLabel="Work project"
            placeholder="Select a project..."
            className="w-full px-3 py-2.5 text-sm"
            options={data.workProjects.map((w) => ({ value: w.id, label: w.title }))}
          />
          <input type="number" min={5} value={wsDuration} onChange={(e) => setWsDuration(Number(e.target.value))} className="glass-input w-full px-3 py-2.5 text-sm font-mono-num" />
          <input value={wsSummary} onChange={(e) => setWsSummary(e.target.value)} placeholder="What was accomplished?" className="glass-input w-full px-3.5 py-2.5 text-sm" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setWorkSessionModal(false)} className="glass-button px-4 py-2 text-xs">Cancel</button>
            <button type="submit" className="glass-button-primary px-5 py-2 text-xs font-semibold">Log Work</button>
          </div>
        </form>
      </GlassModal>
    </div>
  );
};
