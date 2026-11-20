import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Droplets,
  Flame,
  Share2,
  Sparkles,
  Trophy,
} from 'lucide-react';
import type { BootstrapData } from '../api/client';
import { formatDateReadable } from '../utils/dateLogic';
import { calculateHabitStreak } from '../utils/analyticsLogic';
import { GlassModal } from './GlassModal';

interface DailyReportModalProps {
  open: boolean;
  onClose: () => void;
  data: BootstrapData;
}

export const DailyReportModal: React.FC<DailyReportModalProps> = ({
  open,
  onClose,
  data,
}) => {
  const [copied, setCopied] = useState(false);

  const report = useMemo(() => {
    const today = data.today;
    const tasks = data.tasks.filter((t) => t.dueDate === today);
    const tasksDone = tasks.filter((t) => t.status === 'Completed').length;
    const tasksTotal = tasks.length;
    const taskRate = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 100;

    const occurrences = data.routineOccurrences.filter((o) => o.date === today);
    const routinesDone = occurrences.filter((o) => o.status === 'completed').length;
    const routinesTotal = Math.max(occurrences.length, data.routines.length);
    const routineRate =
      routinesTotal > 0 ? Math.round((routinesDone / routinesTotal) * 100) : 100;

    const waterIntake = data.dayContext.waterIntake;
    const waterTotalMl = waterIntake?.totalMl ?? 0;
    const waterGoalMl = waterIntake?.goalMl || 2500;
    const waterRate = Math.min(100, Math.round((waterTotalMl / waterGoalMl) * 100));

    const todayFocus = data.focusSessions.filter((s) => s.date === today);
    const focusMinutes = todayFocus.reduce((sum, s) => sum + (s.actualMinutes || s.plannedMinutes || 0), 0);

    const todayStudy = data.studySessions.filter((s) => s.date === today);
    const studyMinutes = todayStudy.reduce((sum, s) => sum + s.durationMinutes, 0);

    const totalProductiveMinutes = focusMinutes + studyMinutes;
    const focusHours = Math.round((totalProductiveMinutes / 60) * 10) / 10;

    // Highest habit streak
    let bestHabit = '';
    let maxStreak = 0;
    data.habits.forEach((h) => {
      const s = calculateHabitStreak(h, today);
      if (s > maxStreak) {
        maxStreak = s;
        bestHabit = h.title;
      }
    });

    // Score calculation
    const overallScore = Math.round(
      taskRate * 0.4 + routineRate * 0.3 + waterRate * 0.15 + (totalProductiveMinutes > 60 ? 15 : 5)
    );

    const grade =
      overallScore >= 90
        ? 'A+'
        : overallScore >= 80
        ? 'A'
        : overallScore >= 70
        ? 'B'
        : overallScore >= 50
        ? 'C'
        : 'Keep Going';

    return {
      today,
      tasksDone,
      tasksTotal,
      taskRate,
      routinesDone,
      routinesTotal,
      routineRate,
      waterTotalMl,
      waterGoalMl,
      waterRate,
      focusHours,
      bestHabit,
      maxStreak,
      overallScore,
      grade,
    };
  }, [data]);

  const handleCopy = async () => {
    const formattedDate = formatDateReadable(report.today, data.settings.dateFormat);
    const text = `🌟 Raa's Diary — Daily Report Card
📅 ${formattedDate}
━━━━━━━━━━━━━━━━━━━━━━
🏆 Overall Score: ${report.overallScore}% (Grade: ${report.grade})
✅ Tasks Completed: ${report.tasksDone}/${report.tasksTotal} (${report.taskRate}%)
🔄 Routines Completed: ${report.routinesDone}/${report.routinesTotal} (${report.routineRate}%)
💧 Water Intake: ${report.waterTotalMl} / ${report.waterGoalMl} ml (${report.waterRate}%)
⏱️ Productive Focus: ${report.focusHours}h
${report.maxStreak > 0 ? `🔥 Top Streak: ${report.maxStreak} days (${report.bestHabit})\n` : ''}━━━━━━━━━━━━━━━━━━━━━━
Tracked with Raa's Diary — Personal Life OS 🚀`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title="Daily Report Card"
      subtitle={`Summary for ${formatDateReadable(data.today, data.settings.dateFormat)}`}
    >
      <div className="space-y-4">
        {/* Score & Grade Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[var(--accent)]/15 via-[var(--accent-secondary)]/15 to-[var(--success)]/15 border border-[var(--glass-border)] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs text-[var(--text-secondary)] font-medium">Daily Productivity</span>
            <div className="text-3xl font-extrabold font-mono-num text-[var(--text-primary)]">
              {report.overallScore}%
            </div>
            <div className="text-xs text-[var(--success)] font-medium flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" />
              <span>Performance Grade: {report.grade}</span>
            </div>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-white/[0.08] border border-white/[0.12] flex items-center justify-center text-3xl font-black text-[var(--accent)] shadow-inner">
            {report.grade}
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-xl bg-white/[0.04] border border-[var(--glass-border-subtle)] space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)]" />
              <span>Tasks</span>
            </div>
            <div className="text-base font-bold font-mono-num">
              {report.tasksDone}/{report.tasksTotal}
              <span className="text-xs text-[var(--text-muted)] font-normal ml-1">({report.taskRate}%)</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.04] border border-[var(--glass-border-subtle)] space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <Clock className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
              <span>Focus Hours</span>
            </div>
            <div className="text-base font-bold font-mono-num">{report.focusHours}h</div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.04] border border-[var(--glass-border-subtle)] space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <Droplets className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Water</span>
            </div>
            <div className="text-base font-bold font-mono-num">
              {report.waterTotalMl}
              <span className="text-xs text-[var(--text-muted)] font-normal ml-1">/ {report.waterGoalMl}ml</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.04] border border-[var(--glass-border-subtle)] space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <Flame className="w-3.5 h-3.5 text-[var(--warning)]" />
              <span>Top Streak</span>
            </div>
            <div className="text-base font-bold font-mono-num">
              {report.maxStreak}
              <span className="text-xs text-[var(--text-muted)] font-normal ml-1">days</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleCopy}
            className="glass-button-primary flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Report Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Copy &amp; Share Daily Report</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="glass-button px-4 py-2.5 text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </GlassModal>
  );
};
