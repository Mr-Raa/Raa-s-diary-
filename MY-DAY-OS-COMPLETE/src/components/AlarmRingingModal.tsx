import React from 'react';
import { motion } from 'motion/react';
import { AlarmClock, BellOff, Droplets, Sun } from 'lucide-react';
import type { Alarm } from '../types';
import { formatTimeDisplay } from '../utils/dateLogic';
import { IOS_SPRING_BOUNCY, IOS_SPRING_MODAL, IOS_TAP_SCALE } from '../utils/motionPresets';

interface AlarmRingingModalProps {
  alarm: Alarm | null;
  timeFormat: '12h' | '24h';
  onDismiss: () => void;
  onSnooze: (minutes: number) => void;
  onDrinkWaterAndDismiss: () => void;
}

export const AlarmRingingModal: React.FC<AlarmRingingModalProps> = ({
  alarm,
  timeFormat,
  onDismiss,
  onSnooze,
  onDrinkWaterAndDismiss,
}) => {
  if (!alarm) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ringing-alarm-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={IOS_SPRING_MODAL}
        className="glass-modal w-full max-w-md p-6 sm:p-7 text-center space-y-5"
      >
        {/* Animated icon container */}
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={IOS_SPRING_BOUNCY}
          className="mx-auto w-16 h-16 rounded-2xl bg-[var(--accent)]/20 border border-[var(--glass-border)] flex items-center justify-center"
        >
          <motion.div
            animate={{ 
              rotate: [0, -8, 8, -8, 8, 0],
              scale: [1, 1.1, 1, 1.1, 1],
            }}
            transition={{ 
              duration: 0.6,
              repeat: Infinity,
              repeatDelay: 1.2,
              ease: 'easeInOut',
            }}
          >
            {alarm.alarmType === 'water' ? (
              <Droplets className="w-8 h-8 text-[var(--accent-cyan)]" />
            ) : alarm.alarmType === 'wakeup' ? (
              <Sun className="w-8 h-8 text-[var(--warning)]" />
            ) : (
              <AlarmClock className="w-8 h-8 text-[var(--accent)]" />
            )}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, ...IOS_SPRING_MODAL }}
          className="space-y-1.5"
        >
          <div className="text-4xl font-bold font-mono-num tracking-tight">
            {formatTimeDisplay(alarm.time, timeFormat)}
          </div>
          <h2 id="ringing-alarm-title" className="text-xl font-bold">
            {alarm.title}
          </h2>
          {alarm.reminderNote && (
            <p className="text-sm text-[var(--text-secondary)] pt-1">{alarm.reminderNote}</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, ...IOS_SPRING_MODAL }}
          className="space-y-2.5 pt-2"
        >
          {alarm.alarmType === 'water' && (
            <motion.button
              type="button"
              onClick={onDrinkWaterAndDismiss}
              whileTap={IOS_TAP_SCALE}
              className="glass-button-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Droplets className="w-4 h-4" />
              <span>Drank +1 Glass &amp; Dismiss</span>
            </motion.button>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <motion.button
              type="button"
              onClick={() => onSnooze(alarm.snoozeMinutes || 5)}
              whileTap={IOS_TAP_SCALE}
              whileHover={{ scale: 1.02 }}
              className="glass-button py-2.5 text-xs font-semibold"
            >
              Snooze +{alarm.snoozeMinutes || 5}m
            </motion.button>
            <motion.button
              type="button"
              onClick={onDismiss}
              whileTap={IOS_TAP_SCALE}
              whileHover={{ scale: 1.02 }}
              className={`${
                alarm.alarmType === 'water' ? 'glass-button' : 'glass-button-primary'
              } py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5`}
            >
              <BellOff className="w-3.5 h-3.5" />
              <span>Dismiss</span>
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
