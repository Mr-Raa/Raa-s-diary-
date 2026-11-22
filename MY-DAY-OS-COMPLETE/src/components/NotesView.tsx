import React, { useMemo, useState } from 'react';
import {
  BookHeart,
  BookOpen,
  Clock,
  Edit3,
  Lock,
  Mic,
  MicOff,
  Pin,
  Plus,
  Printer,
  Search,
  Sparkles,
  Trash2,
  Unlock,
} from 'lucide-react';
import type { BootstrapData } from '../api/client';
import { api } from '../api/client';
import type { Category, DiaryLogEntry, NoteItem } from '../types';
import { formatDateReadable, formatTimeDisplay } from '../utils/dateLogic';
import { GlassModal } from './GlassModal';
import { GlassSelect } from './GlassSelect';
import { KeepsakeBookModal } from './KeepsakeBookModal';
import { PrivacyLockModal } from './PrivacyLockModal';

interface NotesViewProps {
  data: BootstrapData;
  onRefresh: () => Promise<void>;
}

const CATEGORIES: Category[] = ['Personal', 'Study', 'Work', 'Health', 'Exercise', 'Learning', 'Family', 'Other'];
const MOODS = ['Energized', 'Focused', 'Calm', 'Happy', 'Tired', 'Stressed'];

function getCurrentHHmm(timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone || 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());
  } catch {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}

export const NotesView: React.FC<NotesViewProps> = ({ data, onRefresh }) => {
  const [tab, setTab] = useState<'Diary' | 'Notes'>('Diary');
  const [diarySubTab, setDiarySubTab] = useState<'Story' | 'TimeLog'>('Story');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NoteItem | null>(null);

  // Note form
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Category>('Personal');
  const [tagsRaw, setTagsRaw] = useState('');
  const [linkedDate, setLinkedDate] = useState(data.today);

  // Diary & Time-Log state
  const [jDate, setJDate] = useState(data.today);
  const existingJournal = data.journals.find((j) => j.date === jDate);
  const [jMood, setJMood] = useState(existingJournal?.mood || 'Focused');
  const [jReflection, setJReflection] = useState(existingJournal?.reflection || '');
  const [jAchievements, setJAchievements] = useState(existingJournal?.achievements || '');
  const [jGratitude, setJGratitude] = useState(existingJournal?.gratitude || '');
  const [jMsg, setJMsg] = useState('');
  const [isSavingJournal, setIsSavingJournal] = useState(false);

  // Local draft auto-recovery
  React.useEffect(() => {
    const draftKey = `myday_diary_draft_${jDate}`;
    const found = data.journals.find((j) => j.date === jDate);
    if (found) {
      setJMood(found.mood || 'Focused');
      setJReflection(found.reflection || '');
      setJAchievements(found.achievements || '');
      setJGratitude(found.gratitude || '');
    } else {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        setJReflection(savedDraft);
      } else {
        setJReflection('');
      }
      setJMood('Focused');
      setJAchievements('');
      setJGratitude('');
    }
    setJMsg('');
  }, [jDate, data.journals]);

  // Auto-save draft on type
  const handleReflectionChange = (val: string) => {
    setJReflection(val);
    try {
      localStorage.setItem(`myday_diary_draft_${jDate}`, val);
    } catch {}
  };

  // Time-stamped diary entry form ("Ketla vage su karyu")
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<DiaryLogEntry | null>(null);
  const [logTime, setLogTime] = useState(() => getCurrentHHmm(data.settings.timezone));
  const [logTitle, setLogTitle] = useState('');
  const [logActivity, setLogActivity] = useState('');
  const [logCategory, setLogCategory] = useState<Category>('Personal');
  const [logMood, setLogMood] = useState('Calm');
  const [logEnergy, setLogEnergy] = useState(4);
  const [quickTime, setQuickTime] = useState(() => getCurrentHHmm(data.settings.timezone));
  const [quickTitle, setQuickTitle] = useState('');
  const [quickActivity, setQuickActivity] = useState('');
  const [quickCategory, setQuickCategory] = useState<Category>('Personal');

  // Keepsake & Privacy Lock State
  const [keepsakeOpen, setKeepsakeOpen] = useState(false);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(() => localStorage.getItem('raas_diary_locked') === 'true');
  const [savedPin, setSavedPin] = useState(() => localStorage.getItem('raas_diary_pin') || '1234');
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');

  const toggleVoiceRecording = () => {
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;

    if (!SpeechRec) {
      setVoiceStatus('Voice input not supported in this browser.');
      return;
    }

    if (voiceRecording) {
      setVoiceRecording(false);
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rec = new (SpeechRec as any)();
      rec.lang = data.settings.language === 'gu' ? 'gu-IN' : 'en-IN';
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      setVoiceRecording(true);
      setVoiceStatus('Listening in Gujarati / English...');

      rec.onresult = (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
        const spoken = (e.results[0]?.[0]?.transcript || '').trim();
        setVoiceRecording(false);
        setVoiceStatus('');
        if (spoken) {
          setJReflection((prev) => (prev ? `${prev}\n${spoken}` : spoken));
        }
      };
      rec.onerror = () => {
        setVoiceRecording(false);
        setVoiceStatus('Microphone access ended.');
      };
      rec.onend = () => {
        setVoiceRecording(false);
      };
      rec.start();
    } catch {
      setVoiceRecording(false);
      setVoiceStatus('Microphone error.');
    }
  };

  const handleToggleLock = () => {
    if (isLocked) {
      setLockModalOpen(true);
    } else {
      localStorage.setItem('raas_diary_locked', 'true');
      setIsLocked(true);
    }
  };

  const handleUnlockSuccess = () => {
    localStorage.removeItem('raas_diary_locked');
    setIsLocked(false);
    setLockModalOpen(false);
  };

  const logsForDate = useMemo(
    () =>
      data.diaryLogs
        .filter((l) => l.date === jDate)
        .sort((a, b) => a.entryTime.localeCompare(b.entryTime)),
    [data.diaryLogs, jDate]
  );

  const filteredNotes = useMemo(() => {
    const q = search.toLowerCase().trim();
    return data.notes.filter(
      (n) =>
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [data.notes, search]);

  const openCreate = () => {
    setEditing(null);
    setTitle('');
    setContent('');
    setCategory('Personal');
    setTagsRaw('');
    setLinkedDate(data.today);
    setModalOpen(true);
  };

  const openEdit = (n: NoteItem) => {
    setEditing(n);
    setTitle(n.title);
    setContent(n.content);
    setCategory(n.category);
    setTagsRaw(n.tags.join(', '));
    setLinkedDate(n.linkedDate || '');
    setModalOpen(true);
  };

  const openEditLog = (entry: DiaryLogEntry) => {
    setEditingLog(entry);
    setLogTime(entry.entryTime);
    setLogTitle(entry.title);
    setLogActivity(entry.activity);
    setLogCategory(entry.category);
    setLogMood(entry.mood);
    setLogEnergy(entry.energy);
    setLogModalOpen(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      content,
      category,
      tags: tagsRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      pinned: editing?.pinned ?? false,
      linkedDate: linkedDate || null,
    };
    if (editing) {
      await api.put(`/api/notes/${editing.id}`, payload);
    } else {
      await api.post('/api/notes', payload);
    }
    setModalOpen(false);
    await onRefresh();
  };

  const handleQuickAddDiaryLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickActivity.trim()) return;
    await api.post('/api/diary-logs', {
      date: jDate,
      entryTime: quickTime || getCurrentHHmm(data.settings.timezone),
      title: quickTitle.trim(),
      activity: quickActivity.trim(),
      category: quickCategory,
      mood: jMood || 'Calm',
      energy: 4,
    });
    setQuickTitle('');
    setQuickActivity('');
    setQuickTime(getCurrentHHmm(data.settings.timezone));
    await onRefresh();
  };

  const handleSaveEditLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog || !logActivity.trim()) return;
    await api.put(`/api/diary-logs/${editingLog.id}`, {
      date: editingLog.date,
      entryTime: logTime,
      title: logTitle.trim(),
      activity: logActivity.trim(),
      category: logCategory,
      mood: logMood,
      energy: logEnergy,
    });
    setLogModalOpen(false);
    await onRefresh();
  };

  const handleSaveJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    setJMsg('');
    try {
      await api.post('/api/journals', {
        date: jDate,
        mood: jMood,
        reflection: jReflection,
        achievements: jAchievements,
        gratitude: jGratitude,
        explicitHistoricalEdit: jDate < data.today,
      });
      setJMsg('Daily diary saved.');
      await onRefresh();
    } catch (err) {
      setJMsg(err instanceof Error ? err.message : 'Failed to save diary.');
    }
  };

  return (
    <div className="space-y-3 sm:space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Diary &amp; Notes</h1>
          <p className="hidden sm:block text-xs text-[var(--text-secondary)] mt-0.5">
            Log what you did at every hour of the day, write your full-day diary story, and pin important notes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setKeepsakeOpen(true)}
            className="liquid-glass-pill px-3 sm:px-4 py-2 text-xs font-semibold flex items-center gap-1.5 text-emerald-300 min-h-[38px] sm:min-h-[40px] shrink-0 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keepsake Book / PDF</span>
            <span className="sm:hidden">Book</span>
          </button>

          <button
            type="button"
            onClick={handleToggleLock}
            className="liquid-glass-pill px-3 py-2 text-xs font-semibold flex items-center gap-1.5 min-h-[38px] sm:min-h-[40px] shrink-0 cursor-pointer text-amber-300"
            title={isLocked ? 'Diary is Locked' : 'Lock Diary'}
          >
            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isLocked ? 'Locked' : 'Lock'}</span>
          </button>

          {tab === 'Notes' && (
            <button
              type="button"
              onClick={openCreate}
              className="glass-button-primary px-3.5 sm:px-4 py-2 text-xs font-semibold flex items-center gap-1.5 min-h-[38px] sm:min-h-[40px] shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>New Note</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex gap-1 glass p-1 sm:p-1.5 w-full sm:w-fit">
          {(['Diary', 'Notes'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-medium whitespace-nowrap ${
                tab === t ? 'glass-button-primary text-white' : 'text-[var(--text-secondary)]'
              }`}
            >
              {t === 'Diary' ? 'Full-Day Diary' : 'Quick Notes'}
            </button>
          ))}
        </div>

        {tab === 'Diary' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label htmlFor="diary-date" className="text-xs text-[var(--text-secondary)] shrink-0">
              Date:
            </label>
            <input
              id="diary-date"
              type="date"
              value={jDate}
              onChange={(e) => setJDate(e.target.value)}
              className="glass-input flex-1 sm:flex-none px-3 py-1.5 sm:py-2 text-xs font-mono-num"
            />
          </div>
        )}
      </div>

      {tab === 'Diary' ? (
        isLocked ? (
          <div className="p-8 sm:p-12 rounded-3xl liquid-glass-panel text-center max-w-lg mx-auto space-y-4 my-8">
            <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Personal Diary is Locked</h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Your daily reflections, time-logs, and achievements are protected by your 4-digit PIN / FaceID.
            </p>
            <button
              type="button"
              onClick={() => setLockModalOpen(true)}
              className="liquid-glass-fire px-6 py-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Unlock className="w-4 h-4" />
              <span>Enter PIN / FaceID to Unlock</span>
            </button>
          </div>
        ) : (
        <div className="space-y-4">
          {/* Sub-tabs: Apple Journal vs Time-Activity Log */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-[var(--glass-border-subtle)] w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setDiarySubTab('Story')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  diarySubTab === 'Story'
                    ? 'glass-button-primary text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <BookHeart className="w-3.5 h-3.5 text-pink-400" />
                <span>✍️ Daily Journal (મુખ્ય ડાયરી)</span>
              </button>
              <button
                type="button"
                onClick={() => setDiarySubTab('TimeLog')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  diarySubTab === 'TimeLog'
                    ? 'glass-button-primary text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>⏱️ Time Log (કેટલા વાગે શું કર્યું)</span>
              </button>
            </div>

            <div className="text-xs text-[var(--text-muted)] hidden sm:block">
              {diarySubTab === 'Story' ? 'Private Apple Journal reflection' : `${logsForDate.length} logged moments today`}
            </div>
          </div>

          {/* Sub-tab 1: Daily Journal (Story) */}
          {diarySubTab === 'Story' ? (
            <form onSubmit={handleSaveJournal} className="glass p-4 sm:p-7 space-y-5 rounded-3xl max-w-4xl mx-auto shadow-2xl">
              {/* Header with Mood Pills */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BookHeart className="w-5 h-5 text-pink-400" />
                    <h2 className="text-lg font-bold tracking-tight">Today&apos;s Story &amp; Mindset</h2>
                  </div>
                  <span className="text-xs font-medium text-[var(--accent)] bg-[var(--accent)]/10 px-2.5 py-1 rounded-full">
                    {formatDateReadable(jDate, data.settings.dateFormat)}
                  </span>
                </div>

                {/* Mood Pills Selector */}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                    આજે તમારો મૂડ કેવો છે? (How are you feeling today?)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { mood: 'Calm', emoji: '🧘', label: 'Calm (શાંત)' },
                      { mood: 'Focused', emoji: '🎯', label: 'Focused (એકાગ્ર)' },
                      { mood: 'Energized', emoji: '⚡', label: 'Energized (ઉર્જાવાન)' },
                      { mood: 'Happy', emoji: '😊', label: 'Happy (આનંદી)' },
                      { mood: 'Tired', emoji: '😴', label: 'Tired (થાકેલા)' },
                      { mood: 'Stressed', emoji: '😟', label: 'Stressed (તણાવ)' },
                    ].map((m) => {
                      const isSelected = jMood === m.mood;
                      return (
                        <button
                          key={m.mood}
                          type="button"
                          onClick={() => setJMood(m.mood)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[var(--accent)] text-slate-950 font-semibold shadow-[0_0_12px_rgba(56,189,248,0.4)] scale-105'
                              : 'bg-white/[0.05] border border-white/10 text-[var(--text-secondary)] hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <span>{m.emoji}</span>
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Gratitude & Wins Prompt Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/8 space-y-1.5">
                  <label className="block text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <span>✨</span>
                    <span>Gratitude (શેના માટે આભારી છો?)</span>
                  </label>
                  <input
                    value={jGratitude}
                    onChange={(e) => setJGratitude(e.target.value)}
                    placeholder="e.g. Good health, family dinner, peaceful morning..."
                    className="glass-input w-full px-3 py-2 text-sm bg-transparent"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/8 space-y-1.5">
                  <label className="block text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                    <span>🏆</span>
                    <span>Wins &amp; Achievements (આજની સિદ્ધિ)</span>
                  </label>
                  <input
                    value={jAchievements}
                    onChange={(e) => setJAchievements(e.target.value)}
                    placeholder="e.g. Finished project, 8 glasses water, 5km walk..."
                    className="glass-input w-full px-3 py-2 text-sm bg-transparent"
                  />
                </div>
              </div>

              {/* Main Apple Journal Writing Canvas */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-semibold flex items-center gap-1.5">
                    <span>📝</span>
                    <span>Full Journal Reflection (આખા દિવસની વાત અને વિચારો)</span>
                  </label>

                  {/* Gujarati / English Voice Dictation Button */}
                  <button
                    type="button"
                    onClick={toggleVoiceRecording}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      voiceRecording
                        ? 'bg-rose-500 text-white animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.6)]'
                        : 'liquid-glass-pill text-[var(--accent)] hover:text-white'
                    }`}
                    title="બોલીને ડાયરી લખો"
                  >
                    {voiceRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    <span>{voiceRecording ? 'Stop Recording' : '🎙️ બોલીને લખો (Voice)'}</span>
                  </button>
                </div>

                {voiceStatus && (
                  <div className="text-xs text-[var(--accent)] font-medium p-2 rounded-xl bg-[var(--accent)]/10 animate-pulse">
                    {voiceStatus}
                  </div>
                )}

                <div className="relative rounded-2xl border border-white/12 bg-white/[0.03] focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/20 transition-all">
                  <textarea
                    rows={10}
                    value={jReflection}
                    onChange={(e) => handleReflectionChange(e.target.value)}
                    placeholder="અહીં શાંતિથી તમારા આજના વિચારો, અનુભવો કે જે કાંઈ લખવું હોય તે લખો... (તમે ગુજરાતી કે અંગ્રેજીમાં લખી શકો છો)"
                    className="w-full p-4 sm:p-5 bg-transparent border-0 text-[17px] sm:text-[18px] leading-relaxed font-diary text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none resize-y min-h-[200px]"
                  />
                  <div className="px-4 py-2 border-t border-white/8 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span>{jReflection.trim().split(/\s+/).filter(Boolean).length} words · {jReflection.length} characters</span>
                    <span>Auto-saved locally</span>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <span className="text-xs font-medium text-emerald-400">
                  {jMsg}
                </span>

                <button
                  type="submit"
                  disabled={isSavingJournal}
                  className="glass-button-primary px-6 py-3 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-transform"
                >
                  <BookHeart className="w-4 h-4" />
                  <span>{isSavingJournal ? 'Saving Diary...' : 'Save Daily Diary (ડાયરી સેવ કરો)'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* Sub-tab 2: Time-Stamped Activity Log ("Ketla vage su karyu") */
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-5 items-start">
              <div className="xl:col-span-6 space-y-3 sm:space-y-4">
                <form onSubmit={handleQuickAddDiaryLog} className="glass p-3.5 sm:p-5 space-y-3 sm:space-y-3.5 rounded-3xl">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[var(--accent)]" />
                      <h2 className="text-base font-semibold">
                        Log Moment (કેટલા વાગે શું કર્યું)
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuickTime(getCurrentHHmm(data.settings.timezone))}
                      className="text-[11px] text-[var(--accent)] hover:underline font-medium"
                    >
                      Set Current Time
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-4">
                      <label htmlFor="diary-time" className="sr-only">Entry Time</label>
                      <input
                        id="diary-time"
                        type="time"
                        value={quickTime}
                        onChange={(e) => setQuickTime(e.target.value)}
                        className="glass-input w-full px-3 py-2 text-sm font-mono-num"
                      />
                    </div>
                    <div className="sm:col-span-8">
                      <input
                        value={quickTitle}
                        onChange={(e) => setQuickTitle(e.target.value)}
                        placeholder="Short title (e.g. Lunch, Study, Walk)"
                        className="glass-input w-full px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <GlassSelect
                    value={quickCategory}
                    onChange={(val) => setQuickCategory(val as Category)}
                    ariaLabel="Diary log category"
                    className="w-full px-3 py-2 text-sm"
                    options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                  />

                  <textarea
                    rows={3}
                    value={quickActivity}
                    onChange={(e) => setQuickActivity(e.target.value)}
                    placeholder="Write clearly what you did at this time... (e.g., Woke up at 6:30, drank warm water, completed 1 chapter)"
                    className="glass-input w-full p-3 text-sm"
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="glass-button-primary px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add to Today&apos;s Timeline</span>
                    </button>
                  </div>
                </form>
              </div>

              <div className="xl:col-span-6 space-y-3 sm:space-y-4">
                <section className="glass p-3.5 sm:p-5 space-y-3 sm:space-y-4 rounded-3xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">
                      Timeline for {formatDateReadable(jDate, data.settings.dateFormat)}
                    </h3>
                    <span className="text-xs font-mono-num text-[var(--text-muted)]">
                      {logsForDate.length} {logsForDate.length === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>

                  {logsForDate.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] py-8 text-center">
                      No time-stamped diary entries recorded for this date yet. Add your first moment on the left!
                    </p>
                  ) : (
                    <div className="space-y-3 relative before:absolute before:left-[18px] before:top-3 before:bottom-3 before:w-px before:bg-[var(--glass-border)]">
                      {logsForDate.map((entry) => (
                        <div key={entry.id} className="relative pl-10">
                          <span
                            className="absolute left-3 top-3.5 w-3 h-3 rounded-full bg-[var(--accent)] ring-4 ring-[var(--background)]"
                            aria-hidden="true"
                          />
                          <div className="p-3.5 rounded-2xl bg-white/[0.045] border border-[var(--glass-border-subtle)] space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono-num text-xs font-bold text-[var(--accent)]">
                                  {formatTimeDisplay(entry.entryTime, data.settings.timeFormat)}
                                </span>
                                {entry.title && (
                                  <span className="text-sm font-semibold">{entry.title}</span>
                                )}
                                <span className="text-[11px] text-[var(--text-muted)]">
                                  · {entry.category}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openEditLog(entry)}
                                  aria-label={`Edit diary entry ${entry.entryTime}`}
                                  className="glass-button p-1.5"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await api.del(`/api/diary-logs/${entry.id}`);
                                    await onRefresh();
                                  }}
                                  aria-label={`Delete diary entry ${entry.entryTime}`}
                                  className="glass-button p-1.5 text-[var(--danger)]"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <p className="font-diary text-[17px] leading-relaxed text-[var(--text-primary)] whitespace-pre-line">
                              {entry.activity}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}
        </div>
      )
    ) : (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes or tags..."
              className="glass-input w-full pl-10 pr-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {filteredNotes.map((n) => (
              <div key={n.id} className="glass p-3.5 sm:p-5 flex flex-col justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold">{n.title}</h3>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={async () => {
                          await api.put(`/api/notes/${n.id}`, { ...n, pinned: !n.pinned });
                          await onRefresh();
                        }}
                        aria-label={n.pinned ? `Unpin ${n.title}` : `Pin ${n.title}`}
                        className={`glass-button p-1.5 ${n.pinned ? 'text-[var(--accent)]' : ''}`}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(n)}
                        aria-label={`Edit ${n.title}`}
                        className="glass-button p-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await api.del(`/api/notes/${n.id}`);
                          await onRefresh();
                        }}
                        aria-label={`Delete ${n.title}`}
                        className="glass-button p-1.5 text-[var(--danger)]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] whitespace-pre-line">{n.content}</p>
                </div>

                <div className="text-[11px] text-[var(--text-muted)] pt-2 border-t border-[var(--glass-border-subtle)]">
                  {n.category}
                  {n.linkedDate ? ` · ${formatDateReadable(n.linkedDate, data.settings.dateFormat)}` : ''}
                  {n.tags.length > 0 ? ` · ${n.tags.join(', ')}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <GlassModal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Note' : 'New Note'}>
        <form onSubmit={handleSaveNote} className="space-y-3.5">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title" className="glass-input w-full px-3.5 py-2.5 text-sm" />
          <textarea rows={5} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write note content..." className="glass-input w-full p-3.5 text-sm" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <GlassSelect
              value={category}
              onChange={(val) => setCategory(val as Category)}
              ariaLabel="Note category"
              className="w-full px-3 py-2 text-sm"
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
            <input type="date" value={linkedDate} onChange={(e) => setLinkedDate(e.target.value)} className="glass-input w-full px-3 py-2 text-sm font-mono-num" />
          </div>
          <input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="Tags (comma-separated)" className="glass-input w-full px-3.5 py-2 text-xs" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="glass-button px-4 py-2 text-xs">Cancel</button>
            <button type="submit" className="glass-button-primary px-5 py-2 text-xs font-semibold">Save Note</button>
          </div>
        </form>
      </GlassModal>

      <GlassModal open={logModalOpen} onClose={() => setLogModalOpen(false)} title="Edit Time-Log Entry">
        <form onSubmit={handleSaveEditLog} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Time</label>
              <input type="time" value={logTime} onChange={(e) => setLogTime(e.target.value)} className="glass-input w-full px-3 py-2 text-sm font-mono-num" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Category</label>
              <GlassSelect
                value={logCategory}
                onChange={(val) => setLogCategory(val as Category)}
                ariaLabel="Time-log category"
                className="w-full px-3 py-2 text-sm"
                options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
            </div>
          </div>
          <input value={logTitle} onChange={(e) => setLogTitle(e.target.value)} placeholder="Short title" className="glass-input w-full px-3.5 py-2.5 text-sm" />
          <textarea rows={4} value={logActivity} onChange={(e) => setLogActivity(e.target.value)} placeholder="What did you do at this time?" className="glass-input w-full p-3.5 text-sm" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setLogModalOpen(false)} className="glass-button px-4 py-2 text-xs">Cancel</button>
            <button type="submit" className="glass-button-primary px-5 py-2 text-xs font-semibold">Update Entry</button>
          </div>
        </form>
      </GlassModal>

      {/* Keepsake Printable Diary Book Modal */}
      <KeepsakeBookModal
        open={keepsakeOpen}
        onClose={() => setKeepsakeOpen(false)}
        data={data}
      />

      {/* Privacy Lock Security Modal */}
      <PrivacyLockModal
        open={lockModalOpen}
        onClose={() => setLockModalOpen(false)}
        onUnlockSuccess={handleUnlockSuccess}
        currentPin={savedPin}
        onSaveNewPin={(newPin) => {
          setSavedPin(newPin);
          localStorage.setItem('raas_diary_pin', newPin);
        }}
      />
    </div>
  );
};
