import type { AlarmTone } from '../types';

let activeInterval: number | null = null;
let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedCtx) {
    sharedCtx = new Ctx();
  }
  if (sharedCtx.state === 'suspended') {
    sharedCtx.resume().catch(() => undefined);
  }
  return sharedCtx;
}

function playNote(ctx: AudioContext, freq: number, delaySec: number, durationSec: number, type: OscillatorType = 'sine', volume = 0.14) {
  const now = ctx.currentTime + delaySec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + durationSec + 0.05);
}

function playChord(ctx: AudioContext, freqs: number[], delay: number, dur: number, type: OscillatorType = 'sine', vol = 0.08) {
  for (const f of freqs) playNote(ctx, f, delay, dur, type, vol);
}

export function playToneOnce(tone: AlarmTone) {
  const ctx = getAudioContext();
  if (!ctx) return;

  switch (tone) {
    case 'sunrise':
      playNote(ctx, 523.25, 0.0, 0.5, 'triangle', 0.16);
      playNote(ctx, 659.25, 0.22, 0.5, 'triangle', 0.16);
      playNote(ctx, 783.99, 0.44, 0.65, 'sine', 0.18);
      playNote(ctx, 1046.5, 0.68, 0.9, 'sine', 0.16);
      break;

    case 'waterdrop':
      playNote(ctx, 880, 0.0, 0.25, 'sine', 0.14);
      playNote(ctx, 1174.66, 0.12, 0.35, 'sine', 0.15);
      playNote(ctx, 1318.51, 0.32, 0.45, 'sine', 0.12);
      break;

    case 'pulse':
      playNote(ctx, 740, 0.0, 0.22, 'sine', 0.16);
      playNote(ctx, 740, 0.28, 0.22, 'sine', 0.16);
      playNote(ctx, 987.77, 0.56, 0.45, 'sine', 0.18);
      break;

    case 'zen':
      playNote(ctx, 396, 0.0, 1.2, 'sine', 0.12);
      playNote(ctx, 528, 0.4, 1.0, 'sine', 0.10);
      playNote(ctx, 639, 0.9, 1.4, 'sine', 0.09);
      break;

    case 'harp':
      for (let i = 0; i < 6; i++) {
        playNote(ctx, 440 * Math.pow(2, i / 6), i * 0.09, 0.8 - i * 0.06, 'triangle', 0.13 - i * 0.012);
      }
      break;

    case 'chime':
      playNote(ctx, 1046.5, 0.0, 0.4, 'sine', 0.16);
      playNote(ctx, 1318.51, 0.15, 0.4, 'sine', 0.14);
      playNote(ctx, 1567.98, 0.3, 0.6, 'sine', 0.12);
      break;

    case 'ocean':
      playNote(ctx, 110, 0.0, 2.0, 'sine', 0.08);
      playNote(ctx, 165, 0.3, 1.5, 'sine', 0.06);
      playNote(ctx, 220, 0.8, 1.2, 'triangle', 0.07);
      playNote(ctx, 330, 1.3, 1.0, 'sine', 0.05);
      break;

    case 'birdsong':
      playNote(ctx, 1800, 0.0, 0.08, 'sine', 0.12);
      playNote(ctx, 2200, 0.1, 0.06, 'sine', 0.11);
      playNote(ctx, 1600, 0.2, 0.1, 'sine', 0.13);
      playNote(ctx, 2400, 0.35, 0.08, 'sine', 0.10);
      playNote(ctx, 2000, 0.5, 0.12, 'sine', 0.12);
      playNote(ctx, 1700, 0.68, 0.15, 'sine', 0.09);
      break;

    case 'piano':
      playNote(ctx, 261.63, 0.0, 0.8, 'triangle', 0.16);
      playNote(ctx, 329.63, 0.25, 0.7, 'triangle', 0.14);
      playNote(ctx, 392, 0.5, 0.65, 'triangle', 0.14);
      playNote(ctx, 523.25, 0.75, 1.0, 'triangle', 0.16);
      break;

    case 'bell':
      playNote(ctx, 830, 0.0, 1.5, 'sine', 0.18);
      playNote(ctx, 1245, 0.0, 1.0, 'sine', 0.08);
      playNote(ctx, 1660, 0.0, 0.6, 'sine', 0.04);
      break;

    case 'marimba':
      playNote(ctx, 523.25, 0.0, 0.3, 'triangle', 0.18);
      playNote(ctx, 659.25, 0.18, 0.3, 'triangle', 0.16);
      playNote(ctx, 783.99, 0.36, 0.3, 'triangle', 0.16);
      playNote(ctx, 1046.5, 0.54, 0.3, 'triangle', 0.14);
      playNote(ctx, 783.99, 0.72, 0.3, 'triangle', 0.12);
      break;

    case 'flute':
      playNote(ctx, 587.33, 0.0, 0.9, 'sine', 0.14);
      playNote(ctx, 698.46, 0.4, 0.8, 'sine', 0.13);
      playNote(ctx, 880, 0.9, 1.1, 'sine', 0.12);
      break;

    case 'rainfall':
      for (let i = 0; i < 12; i++) {
        const freq = 3000 + Math.sin(i * 1.7) * 2000;
        playNote(ctx, freq, i * 0.12, 0.08, 'sine', 0.03 + Math.random() * 0.02);
      }
      playNote(ctx, 440, 0.6, 1.5, 'sine', 0.06);
      break;

    case 'cosmic':
      playNote(ctx, 220, 0.0, 1.8, 'sine', 0.10);
      playNote(ctx, 277.18, 0.3, 1.5, 'sine', 0.09);
      playNote(ctx, 349.23, 0.7, 1.4, 'triangle', 0.08);
      playNote(ctx, 440, 1.2, 1.6, 'sine', 0.07);
      break;

    case 'breeze':
      playNote(ctx, 349.23, 0.0, 1.0, 'sine', 0.10);
      playNote(ctx, 440, 0.3, 0.9, 'sine', 0.09);
      playNote(ctx, 523.25, 0.6, 0.8, 'triangle', 0.08);
      playNote(ctx, 659.25, 0.95, 1.2, 'sine', 0.10);
      break;

    case 'sparkle':
      for (let i = 0; i < 5; i++) {
        playNote(ctx, 1200 + i * 300, i * 0.12, 0.25, 'sine', 0.12 - i * 0.015);
      }
      playNote(ctx, 2400, 0.7, 0.6, 'sine', 0.08);
      break;

    case 'aurora':
      playChord(ctx, [261.63, 329.63, 392], 0.0, 1.5, 'sine', 0.07);
      playChord(ctx, [293.66, 369.99, 440], 0.8, 1.5, 'sine', 0.07);
      playChord(ctx, [329.63, 415.3, 523.25], 1.6, 2.0, 'sine', 0.06);
      break;

    case 'cricket':
      for (let i = 0; i < 8; i++) {
        playNote(ctx, 4200, i * 0.15, 0.04, 'square', 0.04);
        playNote(ctx, 4600, i * 0.15 + 0.05, 0.04, 'square', 0.03);
      }
      break;

    case 'windchime': {
      const chimeFreqs = [1046.5, 1174.66, 1318.51, 1396.91, 1567.98];
      chimeFreqs.forEach((f, i) => {
        playNote(ctx, f, i * 0.22, 1.2 - i * 0.15, 'sine', 0.12 - i * 0.015);
      });
      break;
    }

    case 'tibetan':
      playNote(ctx, 174.61, 0.0, 2.5, 'sine', 0.14);
      playNote(ctx, 349.23, 0.0, 2.0, 'sine', 0.07);
      playNote(ctx, 523.25, 0.0, 1.5, 'sine', 0.04);
      playNote(ctx, 698.46, 0.5, 1.5, 'sine', 0.03);
      break;

    case 'bamboo':
      playNote(ctx, 440, 0.0, 0.15, 'triangle', 0.18);
      playNote(ctx, 587.33, 0.3, 0.15, 'triangle', 0.16);
      playNote(ctx, 440, 0.6, 0.15, 'triangle', 0.14);
      playNote(ctx, 349.23, 0.9, 0.2, 'triangle', 0.16);
      break;

    case 'dreambell':
      playNote(ctx, 659.25, 0.0, 1.8, 'sine', 0.12);
      playNote(ctx, 830.61, 0.3, 1.5, 'sine', 0.10);
      playNote(ctx, 1046.5, 0.7, 1.4, 'sine', 0.09);
      playNote(ctx, 1318.51, 1.2, 1.8, 'sine', 0.08);
      break;

    case 'horizon':
      playNote(ctx, 196, 0.0, 2.0, 'sine', 0.12);
      playNote(ctx, 246.94, 0.5, 1.8, 'sine', 0.11);
      playNote(ctx, 293.66, 1.0, 1.6, 'triangle', 0.10);
      playNote(ctx, 392, 1.6, 2.0, 'sine', 0.09);
      break;

    case 'twilight':
      playChord(ctx, [293.66, 349.23, 440], 0.0, 1.8, 'sine', 0.06);
      playNote(ctx, 587.33, 0.5, 1.0, 'triangle', 0.10);
      playChord(ctx, [349.23, 440, 523.25], 1.2, 2.0, 'sine', 0.06);
      break;

    case 'crystal':
    default:
      playNote(ctx, 659.25, 0.0, 0.6, 'sine', 0.14);
      playNote(ctx, 987.77, 0.16, 0.7, 'sine', 0.13);
      playNote(ctx, 1318.51, 0.36, 0.95, 'sine', 0.11);
      break;
  }
}

export function startAlarmLoop(tone: AlarmTone) {
  stopAlarmLoop();
  playToneOnce(tone);
  if (typeof window !== 'undefined') {
    activeInterval = window.setInterval(() => {
      playToneOnce(tone);
    }, 2400);
  }
}

export function stopAlarmLoop() {
  if (activeInterval !== null && typeof window !== 'undefined') {
    window.clearInterval(activeInterval);
    activeInterval = null;
  }
}
