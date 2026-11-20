import React, { useMemo, useState } from 'react';
import { BookOpen, Check, Copy, Download, FileText, Printer, Sparkles, Trophy } from 'lucide-react';
import type { BootstrapData } from '../api/client';
import { formatDateReadable } from '../utils/dateLogic';
import { GlassModal } from './GlassModal';

interface KeepsakeBookModalProps {
  open: boolean;
  onClose: () => void;
  data: BootstrapData;
}

export const KeepsakeBookModal: React.FC<KeepsakeBookModalProps> = ({
  open,
  onClose,
  data,
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const journals = useMemo(() => {
    const list = [...(data.journals || [])];
    list.sort((a, b) => (b.date > a.date ? 1 : -1));
    if (selectedMonth === 'all') return list;
    return list.filter((j) => j.date.startsWith(selectedMonth));
  }, [data.journals, selectedMonth]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    (data.journals || []).forEach((j) => {
      if (j.date && j.date.length >= 7) {
        set.add(j.date.slice(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [data.journals]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyMarkdown = async () => {
    let md = `# 📖 Raa's Diary — Personal Keepsake Journal\n`;
    md += `**Author:** ${data.user.name} | **Generated:** ${new Date().toLocaleDateString('en-IN')}\n\n`;
    md += `---\n\n`;

    journals.forEach((j) => {
      md += `## 📅 ${j.date} — Mood: ${j.mood || 'Reflective'}\n`;
      if (j.reflection) md += `### 💭 Reflection\n${j.reflection}\n\n`;
      if (j.achievements) md += `### 🏆 Achievements\n${j.achievements}\n\n`;
      if (j.gratitude) md += `### 🙏 Gratitude\n${j.gratitude}\n\n`;
      md += `---\n\n`;
    });

    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  if (!open) return null;

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title="Printable Keepsake Diary Book"
      subtitle="Export your reflections, mood logs, and milestones as a beautiful PDF keepsake"
    >
      <div className="space-y-4">
        {/* Controls bar */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--text-secondary)]">Filter Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="glass-input px-3 py-1.5 rounded-xl text-xs bg-[#0b1328]"
            >
              <option value="all">All Lifetime Entries ({data.journals?.length || 0})</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="glass-button px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied MD!' : 'Copy Markdown'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="liquid-glass-fire px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>

        {/* Printable Keepsake Book Preview Container */}
        <div className="max-h-[52vh] overflow-y-auto no-scrollbar rounded-2xl border border-[var(--glass-border)] bg-[#070b16] p-4 sm:p-6 space-y-6 text-white print:max-h-none print:p-0 print:border-none print:bg-white print:text-black">
          {/* Cover Header */}
          <div className="text-center py-6 border-b border-white/10 space-y-2">
            <div className="inline-block p-3 rounded-2xl bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[var(--accent)] mb-1">
              <BookOpen className="w-8 h-8 mx-auto" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white print:text-black">
              Raa&apos;s Diary — Personal Keepsake
            </h1>
            <p className="text-xs text-[var(--text-muted)] print:text-gray-600">
              Reflections, Achievements &amp; Daily Life Logs of {data.user.name}
            </p>
            <div className="text-[11px] font-mono-num text-[var(--accent)] mt-2">
              {journals.length} Recorded Entries · Total Database: {data.storageStats?.counts?.tasks || 0} Tasks
            </div>
          </div>

          {/* Journal Entries List */}
          {journals.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              No journal reflections recorded yet. Write your first reflection in the Notes &amp; Diary section!
            </div>
          ) : (
            journals.map((j) => (
              <div
                key={j.id}
                className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2.5 print:bg-transparent print:border-b print:border-gray-300 print:p-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white print:text-black font-mono-num text-sm">
                    {formatDateReadable(j.date, data.settings.dateFormat)}
                  </span>
                  {j.mood && (
                    <span className="px-2.5 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/20 text-[11px] capitalize font-medium">
                      Mood: {j.mood}
                    </span>
                  )}
                </div>

                {j.reflection && (
                  <div className="space-y-1">
                    <span className="text-[11px] text-[var(--text-secondary)] font-semibold uppercase tracking-wider block">
                      Daily Reflection
                    </span>
                    <p className="text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                      {j.reflection}
                    </p>
                  </div>
                )}

                {j.achievements && (
                  <div className="space-y-1">
                    <span className="text-[11px] text-[var(--success)] font-semibold uppercase tracking-wider flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      Achievements &amp; Wins
                    </span>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                      {j.achievements}
                    </p>
                  </div>
                )}

                {j.gratitude && (
                  <div className="space-y-1">
                    <span className="text-[11px] text-amber-400 font-semibold uppercase tracking-wider block">
                      🙏 Gratitude
                    </span>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                      {j.gratitude}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </GlassModal>
  );
};
