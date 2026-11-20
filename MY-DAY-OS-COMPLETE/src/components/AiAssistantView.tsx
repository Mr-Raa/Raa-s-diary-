import React, { useEffect, useRef, useState } from 'react';
import {
  AlarmClock,
  ArrowUp,
  BookOpen,
  CalendarClock,
  Check,
  CheckCheck,
  ChevronDown,
  Copy,
  Droplets,
  History,
  Image as ImageIcon,
  Mic,
  MicOff,
  PhoneCall,
  Plus,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { BootstrapData } from '../api/client';
import { api } from '../api/client';
import type { AiMessage, AiProposedAction, NavModule } from '../types';
import {
  LiquidGlassSwitch,
  LiquidGlassToastStack,
  type LiquidToastItem,
} from './LiquidGlass';
import { GlassSelect } from './GlassSelect';

interface AiAssistantViewProps {
  data: BootstrapData;
  onRefresh: () => Promise<void>;
  onNavigate?: (m: NavModule) => void;
}

type VoiceLang = 'gu-IN' | 'hi-IN' | 'en-IN';

interface PowerMode {
  id: string;
  label: string;
  subtitle: string;
  prompt: string;
  icon: React.ComponentType<{ className?: string }>;
}

const AI_POWER_MODES: PowerMode[] = [
  {
    id: 'plan',
    label: 'Auto-Plan My Day',
    subtitle: 'Schedule tasks & free slots',
    prompt:
      'Analyze my pending tasks, overdue items, routines, and alarms right now, then build a balanced hour-by-hour plan for the rest of today with one-click actions.',
    icon: CalendarClock,
  },
  {
    id: 'diary',
    label: 'Evening Diary & Review',
    subtitle: 'Summarize today & reflection',
    prompt:
      'Review what I completed today, my diary logs, habits, and water intake, give an honest summary, and propose diary log / reflection actions if helpful.',
    icon: BookOpen,
  },
  {
    id: 'hydration',
    label: 'Habit & Water Coach',
    subtitle: 'Check hydration & streaks',
    prompt:
      'Check my water intake, active alarms, and habit streaks today. Recommend practical hydration or wake-up alarms I can activate with one click.',
    icon: Droplets,
  },
  {
    id: 'gujarati',
    label: 'ગુજરાતી ડે પ્લાનર',
    subtitle: 'આજના સમયનું બેસ્ટ પ્લાનિંગ',
    prompt:
      'મારા આજના બાકી કામો, રૂટિન, એલાર્મ અને પાણી પીવાના ટાર્ગેટ જોઈને સરળ ગુજરાતીમાં આજના બાકીના સમયનો બેસ્ટ પ્લાન બનાવો.',
    icon: AlarmClock,
  },
];

const SAFE_AUTO_VOICE_ACTIONS = new Set([
  'create_task',
  'create_alarm',
  'log_diary',
  'log_water',
  'navigate_module',
]);

function renderInlineSegments(text: string): React.ReactNode[] {
  const tokens = text.split(/(\*\*.*?\*\*|`[^`]+`)/g);
  return tokens.map((tok, i) => {
    if (tok.startsWith('**') && tok.endsWith('**') && tok.length > 4) {
      return (
        <strong key={i} className="font-semibold text-[var(--text-primary)]">
          {tok.slice(2, -2)}
        </strong>
      );
    }
    if (tok.startsWith('`') && tok.endsWith('`') && tok.length > 2) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded-md bg-white/[0.08] dark:bg-white/[0.05] font-mono-num text-[0.9em] border border-white/10"
        >
          {tok.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={i}>{tok}</React.Fragment>;
  });
}

function renderFormattedAiText(content: string): React.ReactNode {
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = (keyPrefix: string) => {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul key={`${keyPrefix}-ul`} className="space-y-1.5 pl-4 list-disc marker:text-[var(--accent)]">
        {listBuffer.map((item, idx) => (
          <li key={idx} className="leading-relaxed">
            {renderInlineSegments(item)}
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line) {
      flushList(`b-${idx}`);
      return;
    }
    if (/^#{1,3}\s+/.test(line)) {
      flushList(`h-${idx}`);
      const heading = line.replace(/^#{1,3}\s+/, '');
      blocks.push(
        <div
          key={`h-${idx}`}
          className="text-sm font-semibold text-[var(--text-primary)] pt-2 first:pt-0"
        >
          {renderInlineSegments(heading)}
        </div>
      );
      return;
    }
    if (/^[-*•]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      listBuffer.push(line.replace(/^([-*•]|\d+\.)\s+/, ''));
      return;
    }
    flushList(`p-${idx}`);
    blocks.push(
      <p key={`p-${idx}`} className="leading-relaxed">
        {renderInlineSegments(line)}
      </p>
    );
  });
  flushList('end');
  return <div className="space-y-2">{blocks}</div>;
}

function cleanTextForSpeech(raw: string): string {
  return raw
    .replace(/[#*`_~>-]+/g, ' ')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({ data, onRefresh, onNavigate }) => {
  const [activeConvId, setActiveConvId] = useState<string | null>(
    data.aiConversations[0]?.id ?? null
  );
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState<
    'gemini-4-hydrogen' | 'gemini-4-carbon' | 'gemini-3.1-flash-lite' | 'gemini-4-argon'
  >(data.settings.aiModel || 'gemini-4-hydrogen');
  const [highThinking, setHighThinking] = useState(false);

  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [sending, setSending] = useState(false);
  const [applyingKey, setApplyingKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  // Voice & Mitra Conversational Mode
  const [listening, setListening] = useState(false);
  const [voiceFriendMode, setVoiceFriendMode] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceLang, setVoiceLang] = useState<VoiceLang>(
    data.settings.language === 'gu' ? 'gu-IN' : 'en-IN'
  );
  const [voiceNote, setVoiceNote] = useState('');
  const [toasts, setToasts] = useState<LiquidToastItem[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const voiceFriendRef = useRef(voiceFriendMode);
  voiceFriendRef.current = voiceFriendMode;

  const pushToast = (message: string, icon: LiquidToastItem['icon'] = 'check') => {
    const id = String(Date.now() + Math.random());
    setToasts((prev) => [...prev.slice(-2), { id, message, icon }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  };

  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }
    api
      .get<AiMessage[]>(`/api/ai/conversations/${activeConvId}/messages`)
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [activeConvId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop?.();
        window.speechSynthesis?.cancel?.();
      } catch {
        // ignore cleanup errors
      }
    };
  }, []);

  const speakText = (rawText: string, restartListeningAfter = false) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const spoken = cleanTextForSpeech(rawText);
    if (!spoken) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(spoken);
      utterance.lang = voiceLang;
      utterance.rate = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const langPrefix = voiceLang.split('-')[0];
      const matchedVoice =
        voices.find((v) => v.lang.toLowerCase() === voiceLang.toLowerCase()) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => {
        setSpeaking(false);
        if (restartListeningAfter && voiceFriendRef.current) {
          setTimeout(() => startVoiceRecognition(true), 300);
        }
      };
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeaking(false);
    }
  };

  const handleImagePick = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const [header, b64] = result.split(',');
      const mime = header.match(/data:(.*?);base64/)?.[1] || file.type || 'image/png';
      setImageBase64(b64);
      setImageMimeType(mime);
      setImagePreviewUrl(result);
      setSelectedModel('gemini-4-argon');
    };
    reader.readAsDataURL(file);
  };

  const applySingleAction = async (
    msg: AiMessage,
    action: AiProposedAction,
    actionIndex: number
  ) => {
    const key = `${msg.id}:${actionIndex}`;
    setApplyingKey(key);
    try {
      const res = await api.post<{ ok: boolean; navigateTo?: NavModule }>('/api/ai/apply-action', {
        action,
        messageId: msg.id,
        actionIndex,
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? {
                ...m,
                proposedActions: m.proposedActions?.map((a, idx) =>
                  idx === actionIndex ? { ...a, applied: true } : a
                ),
              }
            : m
        )
      );
      if (action.type === 'navigate_module' || res.navigateTo) {
        const target = (res.navigateTo || action.payload.module) as NavModule | undefined;
        if (target && onNavigate) {
          pushToast(`Opening ${target}...`, 'info');
          setTimeout(() => onNavigate(target), 350);
          return;
        }
      }
      await onRefresh();
      pushToast(`Saved: ${action.label}`, 'check');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not apply action.');
    } finally {
      setApplyingKey(null);
    }
  };

  const handleSend = async (promptOverride?: string, fromVoice = false) => {
    const text = (promptOverride ?? input).trim();
    if (!text && !imageBase64) return;
    setSending(true);
    setErrorMsg('');

    const optimisticUser: AiMessage = {
      id: `temp_${Date.now()}`,
      conversationId: activeConvId || 'pending',
      role: 'user',
      content: text || '[Image uploaded for timetable & note analysis]',
      imageAttached: Boolean(imageBase64),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
    if (!promptOverride) setInput('');

    const imgData = imageBase64;
    const imgMime = imageMimeType;
    setImageBase64(null);
    setImageMimeType(null);
    setImagePreviewUrl(null);

    try {
      const res = await api.post<{
        conversationId: string;
        assistantMessage: AiMessage;
      }>('/api/ai/chat', {
        conversationId: activeConvId,
        message: text,
        requestedModel: selectedModel,
        highThinking: highThinking || selectedModel === 'gemini-4-carbon',
        voiceMode: fromVoice || voiceFriendMode,
        imageBase64: imgData,
        imageMimeType: imgMime,
      });

      if (!activeConvId) {
        setActiveConvId(res.conversationId);
        await onRefresh();
      }
      const assistantMsg = res.assistantMessage;
      setMessages((prev) => [...prev, assistantMsg]);

      // Auto-execute safe actions when initiated from Voice / Mitra Voice Mode
      if ((fromVoice || voiceFriendRef.current) && assistantMsg.proposedActions?.length) {
        for (let i = 0; i < assistantMsg.proposedActions.length; i++) {
          const act = assistantMsg.proposedActions[i];
          if (!act.applied && SAFE_AUTO_VOICE_ACTIONS.has(act.type)) {
            await applySingleAction(assistantMsg, act, i);
          }
        }
      }

      if (fromVoice || autoSpeak || voiceFriendRef.current) {
        speakText(assistantMsg.content, voiceFriendRef.current);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to connect to AI assistant.');
    } finally {
      setSending(false);
    }
  };

  const startVoiceRecognition = (autoSubmit = false) => {
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;
    if (!SpeechRec) {
      setVoiceNote('Voice input is not supported in this browser.');
      return;
    }

    try {
      window.speechSynthesis?.cancel?.();
      setSpeaking(false);
    } catch {
      // ignore
    }

    setVoiceNote('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new (SpeechRec as any)();
    recognitionRef.current = rec;
    rec.lang = voiceLang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setListening(true);

    rec.onresult = (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
      const spoken = (e.results[0]?.[0]?.transcript || '').trim();
      setListening(false);
      if (!spoken) return;
      if (autoSubmit || voiceFriendRef.current) {
        handleSend(spoken, true);
      } else {
        setInput((prev) => (prev ? `${prev} ${spoken}` : spoken));
      }
    };
    rec.onerror = () => {
      setListening(false);
      setVoiceNote('Microphone access denied or unavailable.');
    };
    rec.onend = () => setListening(false);
    rec.start();
  };

  const handleVoiceToggle = () => {
    if (listening) {
      try {
        recognitionRef.current?.stop?.();
      } catch {
        // ignore
      }
      setListening(false);
      return;
    }
    startVoiceRecognition(voiceFriendMode);
  };

  const toggleVoiceFriendMode = () => {
    const next = !voiceFriendMode;
    setVoiceFriendMode(next);
    setAutoSpeak(next);
    if (next) {
      pushToast('Mitra Voice Mode ON — બોલો, હું સાંભળું છું!', 'info');
      startVoiceRecognition(true);
    } else {
      try {
        recognitionRef.current?.stop?.();
        window.speechSynthesis?.cancel?.();
      } catch {
        // ignore
      }
      setListening(false);
      setSpeaking(false);
    }
  };

  const handleApplyAll = async (msg: AiMessage) => {
    if (!msg.proposedActions?.length) return;
    setApplyingKey(`${msg.id}:all`);
    try {
      for (let i = 0; i < msg.proposedActions.length; i++) {
        const act = msg.proposedActions[i];
        if (act.applied) continue;
        await api.post('/api/ai/apply-action', {
          action: act,
          messageId: msg.id,
          actionIndex: i,
        });
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? {
                ...m,
                proposedActions: m.proposedActions?.map((a) => ({ ...a, applied: true })),
              }
            : m
        )
      );
      await onRefresh();
      pushToast('All proposed actions saved', 'check');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not apply all actions.');
    } finally {
      setApplyingKey(null);
    }
  };

  const handleNewConversation = () => {
    setActiveConvId(null);
    setMessages([]);
    setMobileHistoryOpen(false);
  };

  const modelLabels: Record<string, string> = {
    'gemini-4-hydrogen': 'AURAA 4.0 · Balanced',
    'gemini-4-carbon': 'AURAA Pro · High Thinking',
    'gemini-3.1-flash-lite': 'AURAA Flash · Ultra Fast',
    'gemini-4-argon': 'AURAA Vision · Timetables & Docs',
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-3 lg:gap-5 h-[calc(100dvh-130px)] lg:h-[calc(100vh-140px)] min-h-[460px] w-full relative">
      {/* Desktop Conversation Sidebar (ChatGPT/Claude Style) */}
      <aside className="hidden lg:flex lg:col-span-3 glass p-4 flex-col justify-between gap-3 overflow-hidden rounded-3xl border border-white/15 dark:border-white/10 shadow-xl">
        <div className="space-y-3 overflow-y-auto no-scrollbar">
          <button
            type="button"
            onClick={handleNewConversation}
            className="liquid-glass-pill w-full py-2.5 px-3.5 text-xs font-semibold flex items-center justify-between text-[var(--text-primary)] hover:text-white transition-all group"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[var(--accent)]/20 border border-[var(--accent)]/40 flex items-center justify-center text-[var(--accent)] group-hover:scale-110 transition-transform">
                <Plus className="w-3.5 h-3.5" />
              </div>
              <span>New Chat</span>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent)] opacity-70 group-hover:opacity-100" />
          </button>

          <div className="pt-2">
            <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Recent Chats
            </div>
            {data.aiConversations.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-[var(--text-muted)] italic">
                No previous conversations yet
              </div>
            ) : (
              <div className="space-y-1">
                {data.aiConversations.map((c) => (
                  <div
                    key={c.id}
                    className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-2xl text-xs cursor-pointer transition-all ${
                      activeConvId === c.id
                        ? 'bg-white/[0.14] dark:bg-white/[0.1] border border-white/20 text-[var(--text-primary)] font-semibold shadow-sm'
                        : 'text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-[var(--text-primary)] border border-transparent'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveConvId(c.id)}
                      className="truncate text-left flex-1"
                    >
                      {c.title}
                    </button>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await api.del(`/api/ai/conversations/${c.id}`);
                        if (activeConvId === c.id) {
                          setActiveConvId(null);
                          setMessages([]);
                        }
                        await onRefresh();
                      }}
                      aria-label={`Delete conversation ${c.title}`}
                      className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--danger)] transition-opacity p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-[var(--glass-border-subtle)] text-[11px] text-[var(--text-muted)] leading-relaxed flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="truncate">Connected to tasks, alarms &amp; diary</span>
        </div>
      </aside>

      {/* Main Chat Workspace */}
      <section className="lg:col-span-9 glass flex flex-col overflow-hidden flex-1 h-full rounded-2xl sm:rounded-3xl border border-white/15 dark:border-white/10 shadow-2xl relative">
        {/* Top Minimalist Bar (ChatGPT / Gemini Header) */}
        <div className="px-3 py-2.5 sm:px-5 sm:py-3 border-b border-[var(--glass-border-subtle)] flex items-center justify-between gap-2 shrink-0 backdrop-blur-xl bg-white/[0.03]">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile History Sheet Button */}
            <button
              type="button"
              onClick={() => setMobileHistoryOpen(true)}
              aria-label="Open conversation history"
              className="lg:hidden w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 flex items-center justify-center shrink-0 text-[var(--text-primary)]"
            >
              <History className="w-4 h-4" />
            </button>

            {/* Model Selector Capsule Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setModelDropdownOpen((v) => !v)}
                className="liquid-glass-pill px-3 py-1.5 flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] hover:border-white/30 transition-all"
              >
                <div className="w-2 h-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
                <span className="truncate max-w-[140px] sm:max-w-[220px]">
                  {modelLabels[selectedModel] || 'AURAA 4.0'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
              </button>

              {modelDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setModelDropdownOpen(false)}
                  />
                  <div className="absolute left-0 mt-1.5 w-64 rounded-2xl glass p-1.5 z-40 border border-white/20 shadow-2xl space-y-1">
                    {[
                      { id: 'gemini-4-hydrogen', name: 'AURAA 4.0', desc: 'Balanced & Daily Assistant' },
                      { id: 'gemini-4-carbon', name: 'AURAA Pro', desc: 'High Thinking & Deep Reasoning' },
                      { id: 'gemini-3.1-flash-lite', name: 'AURAA Flash', desc: 'Ultra Fast brief generation' },
                      { id: 'gemini-4-argon', name: 'AURAA Vision', desc: 'Analyzes photos & timetables' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedModel(m.id as typeof selectedModel);
                          setModelDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2 rounded-xl text-xs transition-colors flex flex-col ${
                          selectedModel === m.id
                            ? 'bg-white/[0.14] text-[var(--accent)] font-semibold'
                            : 'text-[var(--text-secondary)] hover:bg-white/[0.08] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <span className="font-semibold">{m.name}</span>
                        <span className="text-[10.5px] opacity-70">{m.desc}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Header Actions: Voice Live, Mute, New Chat */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Gujarati / English Voice Selector */}
            <GlassSelect
              value={voiceLang}
              onChange={(val) => setVoiceLang(val as VoiceLang)}
              ariaLabel="Voice language"
              className="px-2 py-1 text-[11px] font-medium h-8 rounded-full border border-white/15"
              options={[
                { value: 'gu-IN', label: 'ગુજરાતી' },
                { value: 'hi-IN', label: 'हिंदी' },
                { value: 'en-IN', label: 'English' },
              ]}
            />

            {/* Voice Live / Mitra Mode */}
            <button
              type="button"
              onClick={toggleVoiceFriendMode}
              aria-label="Toggle Voice Conversation"
              title="Voice Call Mode"
              className={`h-8 px-2.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                voiceFriendMode
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : 'bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{voiceFriendMode ? 'Voice Live' : 'Voice Mode'}</span>
            </button>

            {/* Audio Read-out Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !autoSpeak;
                setAutoSpeak(next);
                if (!next) {
                  try {
                    window.speechSynthesis?.cancel?.();
                    setSpeaking(false);
                  } catch {
                    // ignore
                  }
                }
              }}
              aria-label={autoSpeak ? 'Mute voice replies' : 'Read replies aloud'}
              title={autoSpeak ? 'Mute voice' : 'Enable voice read-out'}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                autoSpeak
                  ? 'bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/40'
                  : 'bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              {autoSpeak ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* New Chat Button */}
            <button
              type="button"
              onClick={handleNewConversation}
              aria-label="Start new chat"
              title="New Chat"
              className="h-8 px-2.5 sm:px-3 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-xs font-semibold flex items-center gap-1.5 text-[var(--text-primary)] hover:text-white transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden md:inline">New Chat</span>
            </button>
          </div>
        </div>

        {/* Mobile History Drawer / Slide-Over Sheet */}
        {mobileHistoryOpen && (
          <div className="lg:hidden absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col justify-end sm:justify-start">
            <div className="bg-[#0b1222] border-t sm:border-r border-white/20 p-4 h-[75vh] sm:h-full sm:w-80 rounded-t-3xl sm:rounded-none flex flex-col justify-between shadow-2xl">
              <div className="space-y-3 overflow-y-auto no-scrollbar">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-sm font-bold flex items-center gap-2">
                    <History className="w-4 h-4 text-[var(--accent)]" />
                    <span>Conversation History</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileHistoryOpen(false)}
                    className="p-1.5 rounded-full hover:bg-white/10"
                    aria-label="Close history"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleNewConversation}
                  className="liquid-glass-pill w-full py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-2 text-[var(--text-primary)]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Start New Chat</span>
                </button>

                <div className="space-y-1 pt-2">
                  {data.aiConversations.map((c) => (
                    <div
                      key={c.id}
                      className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl text-xs ${
                        activeConvId === c.id
                          ? 'bg-white/[0.16] font-semibold text-white border border-white/20'
                          : 'text-[var(--text-secondary)] hover:bg-white/[0.06]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveConvId(c.id);
                          setMobileHistoryOpen(false);
                        }}
                        className="truncate text-left flex-1"
                      >
                        {c.title}
                      </button>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await api.del(`/api/ai/conversations/${c.id}`);
                          if (activeConvId === c.id) {
                            setActiveConvId(null);
                            setMessages([]);
                          }
                          await onRefresh();
                        }}
                        className="text-[var(--text-muted)] hover:text-[var(--danger)] p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message Stream Area */}
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 sm:p-6 space-y-4 sm:space-y-6">
          {messages.length === 0 ? (
            /* Empty State (Modern ChatGPT/Gemini Style with Liquid Glass Prompt Cards) */
            <div className="min-h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-6 sm:py-10 space-y-5 sm:space-y-6">
              {/* Refractive Ambient Glowing Orb */}
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-500 p-[2px] shadow-[0_0_35px_rgba(56,189,248,0.4)] animate-pulse">
                  <div className="w-full h-full rounded-full bg-slate-950/80 backdrop-blur-md flex items-center justify-center border border-white/30">
                    <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.7)]" />
                  </div>
                </div>
              </div>

              {/* Clean Minimalist Greeting */}
              <div className="space-y-1.5 px-2">
                <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-white">
                  How can I help you today?
                </h2>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto">
                  Connected to your tasks, alarms, habits, water tracker, and diary.
                </p>
              </div>

              {/* 4 Sleek Liquid Glass Prompt Cards (Inspired by User's Reference Images) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5 w-full pt-2">
                {AI_POWER_MODES.map((mode) => {
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      disabled={sending}
                      onClick={() => handleSend(mode.prompt)}
                      className="liquid-glass-panel p-3.5 sm:p-4 text-left flex items-start gap-3 hover:border-white/35 transition-all group disabled:opacity-50"
                    >
                      <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Icon className="w-4 h-4 text-[var(--accent)]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] group-hover:text-white transition-colors">
                          {mode.label}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-1">
                          {mode.subtitle}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Messages List */
            messages.map((m) => {
              const pendingActionsCount = (m.proposedActions || []).filter((a) => !a.applied).length;
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}
                >
                  {/* User or Assistant Message Capsule */}
                  {m.role === 'user' ? (
                    <div className="max-w-[88%] sm:max-w-[75%] rounded-3xl rounded-br-sm px-4 py-3 bg-gradient-to-r from-blue-600/35 to-indigo-600/35 backdrop-blur-xl border border-white/25 text-white shadow-lg text-sm">
                      <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                    </div>
                  ) : (
                    <div className="w-full max-w-[96%] sm:max-w-[88%] flex items-start gap-2.5 sm:gap-3.5">
                      {/* Avatar */}
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-sky-400 via-indigo-500 to-purple-500 p-[1.5px] shrink-0 mt-0.5 shadow-md">
                        <div className="w-full h-full rounded-full bg-[#0a101f] flex items-center justify-center">
                          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-300" />
                        </div>
                      </div>

                      {/* Content Card */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="rounded-3xl rounded-tl-sm p-4 sm:p-5 bg-white/[0.05] dark:bg-white/[0.04] backdrop-blur-xl border border-white/15 dark:border-white/10 text-sm shadow-md space-y-3">
                          {renderFormattedAiText(m.content)}

                          {/* Message Footer Toolbar */}
                          <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-white/10 text-[11px] text-[var(--text-muted)]">
                            <span className="truncate opacity-80">
                              {m.model || 'AURAA'}
                              {m.thinkingUsed ? ' · Deep Think' : ''}
                            </span>
                            <div className="flex items-center gap-3 shrink-0">
                              <button
                                type="button"
                                onClick={() => speakText(m.content, false)}
                                className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors"
                                aria-label="Listen to message"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>Listen</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(m.content);
                                  setCopiedId(m.id);
                                  setTimeout(() => setCopiedId(null), 1500);
                                }}
                                className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors"
                              >
                                {copiedId === m.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                                <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Proposed Actions (Liquid Glass Action Sheet Cards) */}
                        {m.proposedActions && m.proposedActions.length > 0 && (
                          <div className="mt-2 space-y-2 max-w-xl">
                            {pendingActionsCount > 1 && (
                              <div className="flex justify-end pb-1">
                                <button
                                  type="button"
                                  disabled={applyingKey === `${m.id}:all`}
                                  onClick={() => handleApplyAll(m)}
                                  className="liquid-glass-fire px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-60"
                                >
                                  <CheckCheck className="w-3.5 h-3.5" />
                                  <span>
                                    {applyingKey === `${m.id}:all`
                                      ? 'Saving All...'
                                      : `Apply All (${pendingActionsCount})`}
                                  </span>
                                </button>
                              </div>
                            )}

                            {m.proposedActions.map((act, idx) => {
                              const isBusy = applyingKey === `${m.id}:${idx}`;
                              return (
                                <div
                                  key={idx}
                                  className="p-3 rounded-2xl border border-white/15 bg-white/[0.04] backdrop-blur-md flex items-center justify-between gap-3 shadow-sm hover:border-white/25 transition-all"
                                >
                                  <div className="text-xs min-w-0">
                                    <div className="font-semibold text-[var(--text-primary)] truncate">
                                      {act.label}
                                    </div>
                                    <div className="text-[10.5px] text-[var(--text-muted)] truncate">
                                      {act.type.replace('_', ' ')} · 1-click action
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    disabled={Boolean(act.applied) || isBusy}
                                    onClick={() => applySingleAction(m, act, idx)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
                                      act.applied
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : 'liquid-glass-pill text-[var(--text-primary)] hover:text-white'
                                    }`}
                                  >
                                    {act.applied ? 'Saved ✓' : isBusy ? 'Saving...' : 'Confirm'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Assistant Thinking Indicator */}
          {sending && (
            <div className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)] pl-2">
              <div className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-400/40 flex items-center justify-center animate-spin">
                <Sparkles className="w-3 h-3 text-sky-400" />
              </div>
              <span>AURAA is thinking...</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-2xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 text-xs text-[var(--danger)]">
              {errorMsg}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Floating Liquid Glass Composer (Gemini / Claude / Apple iOS Style) */}
        <div className="p-2.5 sm:p-4 border-t border-[var(--glass-border-subtle)] bg-white/[0.02] shrink-0">
          {imagePreviewUrl && (
            <div className="flex items-center gap-2 p-2 mb-2 rounded-2xl bg-white/[0.08] border border-white/15 w-fit">
              <img
                src={imagePreviewUrl}
                alt="Uploaded preview"
                className="w-10 h-10 rounded-xl object-cover border border-white/20"
              />
              <span className="text-xs text-[var(--text-secondary)]">Image attached</span>
              <button
                type="button"
                onClick={() => {
                  setImageBase64(null);
                  setImageMimeType(null);
                  setImagePreviewUrl(null);
                }}
                aria-label="Remove attached image"
                className="p-1 text-[var(--danger)] hover:bg-white/10 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {voiceNote && <p className="text-[11px] text-[var(--warning)] mb-1 px-2">{voiceNote}</p>}

          {/* Floating Pill Bar */}
          <div className="liquid-glass-pill p-1.5 sm:p-2 flex items-center gap-1.5 sm:gap-2.5 w-full max-w-4xl mx-auto shadow-2xl border border-white/20">
            {/* Attachment Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImagePick(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach photo or timetable"
              title="Attach photo or timetable"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/15 flex items-center justify-center shrink-0 transition-colors text-[var(--text-secondary)] hover:text-white"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            {/* Input Field */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                listening ? 'Listening... Speak now' : 'Ask AURAA anything about your day...'
              }
              className="bg-transparent border-none outline-none flex-1 min-w-0 px-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none max-h-28 overflow-y-auto"
            />

            {/* Deep Think Pill Toggle */}
            <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/[0.06] border border-white/10">
              <span className="text-[10.5px] font-medium text-[var(--text-muted)]">Deep Think</span>
              <LiquidGlassSwitch
                checked={highThinking || selectedModel === 'gemini-4-carbon'}
                ariaLabel="Enable Deep Thinking"
                onChange={(next) => {
                  setHighThinking(next);
                  if (next) setSelectedModel('gemini-4-carbon');
                }}
              />
            </div>

            {/* Voice Mic Button */}
            <button
              type="button"
              onClick={handleVoiceToggle}
              aria-label="Voice input"
              title={listening ? 'Stop recording' : 'Voice input'}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
                listening
                  ? 'bg-rose-500 text-white animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.6)]'
                  : 'bg-white/[0.06] hover:bg-white/[0.14] border border-white/15 text-[var(--accent)] hover:text-white'
              }`}
            >
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Send Button */}
            <button
              type="button"
              disabled={sending || (!input.trim() && !imageBase64)}
              onClick={() => handleSend()}
              aria-label="Send message"
              title="Send"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--accent)] hover:brightness-110 flex items-center justify-center shrink-0 text-white shadow-md disabled:opacity-30 disabled:hover:brightness-100 transition-all active:scale-95"
            >
              <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </section>

      <LiquidGlassToastStack toasts={toasts} />
    </div>
  );
};
