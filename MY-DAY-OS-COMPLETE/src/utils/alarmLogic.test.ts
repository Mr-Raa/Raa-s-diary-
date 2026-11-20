import test from 'node:test';
import assert from 'node:assert/strict';
import type { Alarm } from '../types';
import {
  formatMinutesCountdown,
  getIntervalScheduleTimes,
  getNextUpcomingAlarm,
  shouldAlarmTriggerAt,
} from './alarmLogic';

const baseAlarm: Alarm = {
  id: 'alm_1',
  userId: 'u_1',
  title: 'Morning Wake-Up',
  reminderNote: 'Drink warm water and stretch',
  alarmType: 'wakeup',
  time: '06:15',
  repeatMode: 'daily',
  selectedDays: [],
  intervalMinutes: 60,
  startTime: '08:00',
  endTime: '20:00',
  tone: 'sunrise',
  enabled: true,
  snoozeMinutes: 5,
  createdAt: '',
  updatedAt: '',
};

test('getIntervalScheduleTimes builds accurate hydration slots', () => {
  const slots = getIntervalScheduleTimes('08:00', '14:00', 90);
  assert.deepEqual(slots, ['08:00', '09:30', '11:00', '12:30', '14:00']);
});

test('shouldAlarmTriggerAt respects enabled, weekdays, and water intervals', () => {
  assert.equal(shouldAlarmTriggerAt(baseAlarm, '06:15', 0), true);
  assert.equal(shouldAlarmTriggerAt({ ...baseAlarm, enabled: false }, '06:15', 0), false);
  assert.equal(shouldAlarmTriggerAt({ ...baseAlarm, repeatMode: 'weekdays' }, '06:15', 0), false);
  assert.equal(shouldAlarmTriggerAt({ ...baseAlarm, repeatMode: 'weekdays' }, '06:15', 1), true);

  const waterAlarm: Alarm = {
    ...baseAlarm,
    id: 'alm_water',
    alarmType: 'water',
    repeatMode: 'interval',
    startTime: '08:00',
    endTime: '21:00',
    intervalMinutes: 90,
  };
  assert.equal(shouldAlarmTriggerAt(waterAlarm, '09:30', 3), true);
  assert.equal(shouldAlarmTriggerAt(waterAlarm, '09:45', 3), false);
});

test('getNextUpcomingAlarm finds nearest alarm across standard and interval slots', () => {
  const waterAlarm: Alarm = {
    ...baseAlarm,
    id: 'alm_water',
    title: 'Drink Water',
    alarmType: 'water',
    repeatMode: 'interval',
    startTime: '08:00',
    endTime: '20:00',
    intervalMinutes: 120,
  };
  const next = getNextUpcomingAlarm([baseAlarm, waterAlarm], '09:15', 2);
  assert.equal(next?.alarm.id, 'alm_water');
  assert.equal(next?.time, '10:00');
  assert.equal(next?.minutesUntil, 45);
  assert.equal(formatMinutesCountdown(next!.minutesUntil), 'in 45m');
});
