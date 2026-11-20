import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BookmarkCheck,
  BookmarkPlus,
  Check,
  Copy,
  Quote,
  RefreshCw,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { api } from '../api/client';
import {
  getDailySeededAffirmation,
  pickRandomAffirmation,
  type AffirmationCategory,
  type PositiveQuote,
} from '../utils/affirmationLogic';
import { IOS_SPRING_SMOOTH, IOS_SPRING_SNAPPY, IOS_TAP_SCALE } from '../utils/motionPresets';

interface DailyAffirmationCardProps {
  today: string;
  language?: string;
  onSavedToDiary?: () => Promise<void> | void;
  compact?: boolean;
  onOpenExpanded?: () => void;
}

const CATEGORIES: Array<{ id: AffirmationCategory; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'focus', label: 'Focus' },
  { id: 'calm', label: 'Calm' },
  { id: 'energy', label: 'Energy' },
  { id: 'gujarati', label: 'ગુજરાતી' },
];

export const DailyAffirmationCard: React.FC<DailyAffirmationCardProps> = ({
  today,
  language = 'gu-en',
  onSavedToDiary,
  compact = false,
  onOpenExpanded,
}) => {
  const [category, setCategory] = useState<AffirmationCategory>(() =>
    language === 'gu' ? 'gujarati' : 'all'
  );
  const [quote, setQuote] = useState<PositiveQuote>(() =>
    getDailySeededAffirmation(today, language === 'gu' ? 'gujarati' : 'all')
  );
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      try {
        window.speechSynthesis?.cancel?.();
      } catch {
        // ignore speech cleanup errors
      }
    };
  }, []);

  const fetchFreshQuote = useCallback(
    async (targetCategory: AffirmationCategory = category, preferLiveApi = true) => {
      setLoading(true);
      setSaved(false);
      try {
        if (preferLiveApi && targetCategory !== 'gujarati') {
          const live = await api.get<PositiveQuote>(
            `/api/affirmations/random?category=${encodeURIComponent(targetCategory)}&exclude=${encodeURIComponent(quote.id)}`
          );
          if (live && live.quote) {
            setQuote(live);
            return;
          }
        }
        setQuote((prev) => pickRandomAffirmation(targetCategory, prev.id));
      } catch {
        // Always stay graceful with the curated collection if offline or API unavailable
        setQuote((prev) => pickRandomAffirmation(targetCategory, prev.id));
      } finally {
        setLoading(false);
      }
    },
    [category, quote.id]
  );

  const handleCategoryChange = (nextCat: AffirmationCategory) => {
    setCategory(nextCat);
    setSaved(false);
    setQuote((prev) => pickRandomAffirmation(nextCat, prev.id));
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(`"${quote.quote}" — ${quote.author}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(quote.quote);
      utterance.lang = quote.category === 'gujarati' ? 'gu-IN' : 'en-US';
      utterance.rate = 0.96;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeaking(false);
    }
  };

  const handleSaveToDiary = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (saving || saved) return;
    setSaving(true);
    try {
      await api.post('/api/notes', {
        title: `Daily Affirmation · ${quote.theme}`,
        content: `"${quote.quote}"\n\n— ${quote.author}`,
        category: 'Personal',
        tags: ['affirmation', quote.category],
        pinned: false,
        linkedDate: today,
      });
      setSaved(true);
      await onSavedToDiary?.();
    } catch {
      setSaved(false);
    } finally {
      setSaving(false);
    }
  };

  if (compact) {
    return (
      <motion.div
        whileTap={IOS_TAP_SCALE}
        transition={IOS_SPRING_SNAPPY}
        onClick={onOpenExpanded}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenExpanded?.();
          }
        }}
        aria-label="Open Daily Affirmation"
        className="glass rounded-2xl px-3 py-2 flex items-center justify-between gap-2.5 text-left shrink-0 cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-xl glass-icon-capsule bg-[var(--accent-secondary)]/22 flex items-center justify-center shrink-0">
            <Quote className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10.5px] font-semibold text-[var(--accent-secondary)] leading-tight flex items-center gap-1">
              <span>Daily Affirmation</span>
              <span className="text-[var(--text-muted)] font-normal">· {quote.theme}</span>
            </div>
            <p className="text-[11px] font-diary italic text-[var(--text-primary)] truncate">
              &ldquo;{quote.quote}&rdquo;
            </p>
          </div>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.88 }}
          onClick={(e) => {
            e.stopPropagation();
            fetchFreshQuote(category, true);
          }}
          disabled={loading}
          aria-label="Next daily affirmation"
          className="w-7 h-7 rounded-xl glass-button flex items-center justify-center shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0.01, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={IOS_SPRING_SMOOTH}
      className="glass p-5 space-y-3.5 relative overflow-hidden"
      aria-label="Daily Affirmation"
    >
      {/* Subtle Liquid Glass Aurora Accent Glow */}
      <div
        className="pointer-events-none absolute -top-10 -right-10 w-36 h-36 rounded-full opacity-25 blur-2xl"
        style={{
          background:
            'radial-gradient(circle, var(--accent-secondary) 0%, var(--accent-cyan) 65%, transparent 100%)',
        }}
        aria-hidden="true"
      />

      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-xl glass-icon-capsule bg-[var(--accent-secondary)]/20 flex items-center justify-center shrink-0">
            <Quote className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-tight truncate">Daily Affirmation</h2>
            <p className="text-[10.5px] text-[var(--text-muted)] leading-tight truncate">
              {quote.source === 'external'
                ? 'Live Positive Quote'
                : quote.source === 'ai'
                  ? 'Personalized by AURAA'
                  : 'Curated Mindfulness'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={handleSpeak}
            aria-label={speaking ? 'Stop reading affirmation' : 'Read affirmation aloud'}
            title={speaking ? 'Stop speaking' : 'Listen'}
            className="glass-button w-8 h-8 flex items-center justify-center"
          >
            {speaking ? (
              <VolumeX className="w-3.5 h-3.5 text-[var(--accent)]" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={handleSaveToDiary}
            disabled={saving}
            aria-label={saved ? 'Saved affirmation to Notes' : 'Save affirmation to Notes'}
            title={saved ? 'Saved to Diary Notes' : 'Save to Diary Notes'}
            className="glass-button w-8 h-8 flex items-center justify-center disabled:opacity-50"
          >
            {saved ? (
              <BookmarkCheck className="w-3.5 h-3.5 text-[var(--success)]" />
            ) : (
              <BookmarkPlus className="w-3.5 h-3.5" />
            )}
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={handleCopy}
            aria-label="Copy affirmation"
            title="Copy quote"
            className="glass-button w-8 h-8 flex items-center justify-center"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-[var(--success)]" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => fetchFreshQuote(category, true)}
            disabled={loading}
            aria-label="Refresh daily affirmation"
            title="New positive quote"
            className="glass-button w-8 h-8 flex items-center justify-center disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>
      </div>

      {/* Category Filter Strip */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar relative z-10">
        {CATEGORIES.map((cat) => {
          const active = category === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryChange(cat.id)}
              className={`relative px-2.5 py-1 rounded-xl text-[11px] font-medium whitespace-nowrap transition-colors ${
                active
                  ? 'text-[var(--text-primary)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="affirmation-cat-pill"
                  transition={IOS_SPRING_SNAPPY}
                  className="absolute inset-0 rounded-xl glass-active-pill -z-10"
                  aria-hidden="true"
                />
              )}
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Animated Quote Stage */}
      <div className="min-h-[76px] flex flex-col justify-between relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={quote.id}
            initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
            transition={IOS_SPRING_SMOOTH}
            className="space-y-2.5"
          >
            <blockquote className="font-diary italic text-[19px] leading-snug text-[var(--text-primary)]">
              &ldquo;{quote.quote}&rdquo;
            </blockquote>
            <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--text-secondary)]">
              <span className="truncate font-medium">— {quote.author}</span>
              <span className="inline-flex items-center gap-1 text-[var(--accent-secondary)] font-medium shrink-0">
                <Sparkles className="w-3 h-3" />
                <span>{quote.theme}</span>
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.section>
  );
};
