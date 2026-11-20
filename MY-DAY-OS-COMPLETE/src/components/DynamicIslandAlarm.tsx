import React, { useEffect, useState } from 'react';
import { AlarmClock, Droplets, Sun, X } from 'lucide-react';
import type { Alarm } from '../types';
import { formatTimeDisplay } from '../utils/dateLogic';

interface DynamicIslandAlarmProps {
  alarm: Alarm | null;
  timeFormat: '12h' | '24h';
  onDismiss: () => void;
}

/**
 * iPhone-style Dynamic Island alarm notification.
 * Shows as an animated pill at the top of the screen on mobile.
 * On desktop it's hidden (the full modal handles it).
 */
export const DynamicIslandAlarm: React.FC<DynamicIslandAlarmProps> = ({
  alarm,
  timeFormat,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(false);
  const [collapsing, setCollapsing] = useState(false);

  useEffect(() => {
    if (alarm) {
      setCollapsing(false);
      setVisible(true);
    } else {
      setVisible(false);
      setCollapsing(false);
    }
  }, [alarm]);

  const handleDismiss = () => {
    setCollapsing(true);
    setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 350);
  };

  if (!visible || !alarm) return null;

  const icon =
    alarm.alarmType === 'water' ? (
      <Droplets className="w-4 h-4 text-cyan-400 shrink-0" />
    ) : alarm.alarmType === 'wakeup' ? (
      <Sun className="w-4 h-4 text-yellow-400 shrink-0" />
    ) : (
      <AlarmClock className="w-4 h-4 text-[var(--accent)] shrink-0" />
    );

  return (
    // Only show on mobile (md: hidden)
    <div className="fixed z-[9999] top-0 left-0 right-0 flex justify-center pointer-events-none md:hidden">
      <div
        className={`dynamic-island pointer-events-auto flex items-center gap-3 px-4 py-2.5 text-white ${collapsing ? 'collapsing' : ''}`}
        role="alertdialog"
        aria-label={`Alarm: ${alarm.title || alarm.time}`}
      >
        {/* Pulsing ring */}
        <span className="relative shrink-0">
          <span className="absolute inset-0 rounded-full bg-[var(--accent)]/30 animate-ping" />
          {icon}
        </span>

        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate">
            {alarm.title || 'Alarm'}
          </div>
          <div className="text-[11px] text-white/70 font-mono-num">
            {formatTimeDisplay(alarm.time, timeFormat)}
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Dismiss alarm"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
