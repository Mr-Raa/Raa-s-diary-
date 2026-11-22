import React, { useState } from 'react';
import {
  Bell,
  Calendar,
  Check,
  Cloud,
  Database,
  Download,
  Eye,
  EyeOff,
  FileText,
  HardDrive,
  KeyRound,
  Lock,
  Shield,
  Smartphone,
  Sparkles,
  Upload,
} from 'lucide-react';
import type { BootstrapData } from '../api/client';
import { api } from '../api/client';
import type { AppSettings, NavModule } from '../types';
import { PWAInstallButton } from '../hooks/usePWAInstall';
import {
  LiquidGlassSwitch,
  LiquidGlassToastStack,
  type LiquidToastItem,
} from './LiquidGlass';
import { GlassSelect } from './GlassSelect';

interface SettingsViewProps {
  data: BootstrapData;
  onRefresh: () => Promise<void>;
  onOpenAuth: () => void;
  onOpenCloudGuide?: () => void;
}

const ACCENTS = [
  '#6b9cff', // Royal Blue (Default)
  '#a78bfa', // Lavender Purple
  '#38bdf8', // Neon Cyan
  '#55d6a5', // Emerald Mint
  '#f5bb68', // Warm Amber
  '#f43f5e', // Rose Coral
  '#ec4899', // Hot Pink
  '#10b981', // Forest Green
  '#f97316', // Sunset Orange
];

export const SettingsView: React.FC<SettingsViewProps> = ({ data, onRefresh, onOpenAuth, onOpenCloudGuide }) => {
  const [tab, setTab] = useState<'Appearance' | 'General' | 'AI & Calendar' | 'Notifications' | 'Backup & Account'>('Appearance');
  const [statusMsg, setStatusMsg] = useState('');
  const [toasts, setToasts] = useState<LiquidToastItem[]>([]);

  // Password & PIN Change State
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [diaryPin, setDiaryPin] = useState(() => localStorage.getItem('raas_diary_pin') || '1234');
  const [newPinInput, setNewPinInput] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');

  const pushToast = (message: string, icon: LiquidToastItem['icon'] = 'check') => {
    const id = String(Date.now() + Math.random());
    setToasts((prev) => [...prev.slice(-2), { id, message, icon }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  };

  const updateSettings = async (patch: Partial<AppSettings>) => {
    await api.put('/api/settings', patch);
    await onRefresh();
  };

  const s = data.settings;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');
    if (!currentPass || !newPass) {
      setPassError('Current password and new password are required.');
      return;
    }
    if (newPass.length < 6) {
      setPassError('New password must be at least 6 characters.');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('New passwords do not match.');
      return;
    }
    setPassLoading(true);
    try {
      await api.post('/api/auth/change-password', {
        currentPassword: currentPass,
        newPassword: newPass,
      });
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setPassSuccess('Password updated successfully! ✅');
      pushToast('Password updated successfully', 'check');
    } catch (err) {
      setPassError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setPassLoading(false);
    }
  };

  const handleUpdatePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(newPinInput)) {
      setPassError('PIN must be exactly 4 digits.');
      return;
    }
    localStorage.setItem('raas_diary_pin', newPinInput);
    setDiaryPin(newPinInput);
    setNewPinInput('');
    setPinSuccess('Diary PIN updated! ✅');
    pushToast('Diary PIN updated', 'check');
  };

  const handleRequestBrowserNotif = async () => {
    if (!('Notification' in window)) {
      setStatusMsg('This browser does not support desktop notifications.');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      new Notification("Raa's Diary", { body: 'Notifications are active and ready.' });
      setStatusMsg('Browser notifications enabled.');
      pushToast('Browser notifications active', 'bell');
    } else {
      setStatusMsg(`Browser notification permission: ${perm}`);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Settings Control Center</h1>
        <p className="hidden sm:block text-xs text-[var(--text-secondary)] mt-0.5">
          Customize Crystal Liquid Glass optics, preferences, AI defaults, notifications, and database backups.
        </p>
      </div>

      <div className="flex gap-1.5 glass p-1 sm:p-1.5 w-full sm:w-fit overflow-x-auto no-scrollbar flex-nowrap">
        {(['Appearance', 'General', 'AI & Calendar', 'Notifications', 'Backup & Account'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 ${
              tab === t ? 'glass-button-primary text-white' : 'text-[var(--text-secondary)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {statusMsg && (
        <div className="glass p-3 text-xs text-[var(--accent)]">{statusMsg}</div>
      )}

      {tab === 'Appearance' && (
        <div className="glass p-3.5 sm:p-6 space-y-4 sm:space-y-5 max-w-3xl">
          <div className="space-y-2">
            <span className="text-xs font-semibold">Theme Mode</span>
            <div className="flex gap-2">
              {(['dark', 'light', 'system'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    updateSettings({ theme: mode });
                    pushToast(`Theme set to ${mode}`, 'info');
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize ${
                    s.theme === mode ? 'glass-button-primary text-white' : 'glass-button'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Accent Color</span>
              <span className="text-[11px] font-mono-num text-[var(--text-muted)]">{s.accentColor}</span>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              {ACCENTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    updateSettings({ accentColor: c });
                    pushToast('Accent color updated');
                  }}
                  aria-label={`Set accent ${c}`}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 transition-transform cursor-pointer ${
                    s.accentColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}

              {/* Custom Hex Color Picker */}
              <label
                htmlFor="custom-accent"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/20 flex items-center justify-center cursor-pointer hover:border-white/50 text-[10px] text-white/70 overflow-hidden relative"
                title="Choose custom HEX color"
              >
                <span>+</span>
                <input
                  id="custom-accent"
                  type="color"
                  value={s.accentColor}
                  onChange={(e) => {
                    updateSettings({ accentColor: e.target.value });
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Glass Transparency</span>
                <span className="font-mono-num">{Math.round(s.glassOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.04}
                max={0.24}
                step={0.01}
                value={s.glassOpacity}
                onChange={(e) => updateSettings({ glassOpacity: Number(e.target.value) })}
                className="w-full accent-[var(--accent)]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Glass Blur</span>
                <span className="font-mono-num">{s.glassBlur}px</span>
              </div>
              <input
                type="range"
                min={8}
                max={40}
                step={2}
                value={s.glassBlur}
                onChange={(e) => updateSettings({ glassBlur: Number(e.target.value) })}
                className="w-full accent-[var(--accent)]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Corner Radius</span>
                <span className="font-mono-num">{s.glassRadius}px</span>
              </div>
              <input
                type="range"
                min={10}
                max={30}
                step={2}
                value={s.glassRadius}
                onChange={(e) => updateSettings({ glassRadius: Number(e.target.value) })}
                className="w-full accent-[var(--accent)]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Base Font Size</span>
                <span className="font-mono-num">{s.fontSize}px</span>
              </div>
              <input
                type="range"
                min={13}
                max={18}
                step={1}
                value={s.fontSize}
                onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                className="w-full accent-[var(--accent)]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold">Typography Preset</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(
                [
                  { id: 'vision', label: 'Manrope Display', sub: 'Manrope + Jakarta Sans' },
                  { id: 'editorial', label: 'Editorial Diary', sub: 'Fraunces + Cormorant' },
                  { id: 'classic', label: 'Classic Modern', sub: 'Plus Jakarta Sans' },
                ] as const
              ).map((fp) => (
                <button
                  key={fp.id}
                  type="button"
                  onClick={() => {
                    updateSettings({ fontStyle: fp.id });
                    pushToast(`Font preset: ${fp.label}`);
                  }}
                  className={`p-3 rounded-xl text-left transition-colors ${
                    (s.fontStyle || 'vision') === fp.id
                      ? 'glass-button-primary text-white'
                      : 'glass-button'
                  }`}
                >
                  <div className="text-xs font-semibold">{fp.label}</div>
                  <div className="text-[11px] opacity-80 mt-0.5">{fp.sub}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-[var(--glass-border-subtle)]">
            <LiquidGlassSwitch
              checked={s.reducedMotion}
              label="Reduced Motion"
              description="Minimize spring and ambient glass animations"
              onChange={(next) => {
                updateSettings({ reducedMotion: next });
                pushToast(next ? 'Reduced motion enabled' : 'Liquid spring motion active');
              }}
            />
          </div>
        </div>
      )}

      {tab === 'General' && (
        <div className="glass p-3.5 sm:p-6 space-y-4 max-w-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5">App &amp; AI Language</label>
              <GlassSelect
                value={s.language}
                onChange={(val) => updateSettings({ language: val as AppSettings['language'] })}
                ariaLabel="App and AI language"
                className="w-full px-3 py-2.5 text-sm"
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'gu-en', label: 'Gujarati + English Mix' },
                  { value: 'gu', label: 'ગુજરાતી (Gujarati)' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5">Timezone</label>
              <GlassSelect
                value={s.timezone}
                onChange={(val) => updateSettings({ timezone: val })}
                ariaLabel="Timezone"
                className="w-full px-3 py-2.5 text-sm"
                options={[
                  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
                  { value: 'UTC', label: 'UTC' },
                  { value: 'America/New_York', label: 'America/New_York' },
                  { value: 'Europe/London', label: 'Europe/London' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5">Date Format</label>
              <GlassSelect
                value={s.dateFormat}
                onChange={(val) => updateSettings({ dateFormat: val as AppSettings['dateFormat'] })}
                ariaLabel="Date format"
                className="w-full px-3 py-2.5 text-sm"
                options={[
                  { value: 'MMM D, YYYY', label: 'Nov 15, 2026' },
                  { value: 'DD/MM/YYYY', label: '15/11/2026' },
                  { value: 'YYYY-MM-DD', label: '2026-11-15' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5">Time Format</label>
              <GlassSelect
                value={s.timeFormat}
                onChange={(val) => updateSettings({ timeFormat: val as '12h' | '24h' })}
                ariaLabel="Time format"
                className="w-full px-3 py-2.5 text-sm"
                options={[
                  { value: '12h', label: '12-hour (AM/PM)' },
                  { value: '24h', label: '24-hour' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5">Week Starts On</label>
              <GlassSelect
                value={String(s.weekStartsOn)}
                onChange={(val) => updateSettings({ weekStartsOn: Number(val) as 0 | 1 })}
                ariaLabel="Week starts on"
                className="w-full px-3 py-2.5 text-sm"
                options={[
                  { value: '1', label: 'Monday' },
                  { value: '0', label: 'Sunday' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5">Startup Module</label>
              <GlassSelect
                value={s.startupModule}
                onChange={(val) => updateSettings({ startupModule: val as NavModule })}
                ariaLabel="Startup module"
                className="w-full px-3 py-2.5 text-sm"
                options={[
                  { value: 'dashboard', label: 'Home Dashboard' },
                  { value: 'routine', label: 'My Routine' },
                  { value: 'tasks', label: 'Tasks' },
                  { value: 'calendar', label: 'Calendar' },
                ]}
              />
            </div>
          </div>
        </div>
      )}

      {tab === 'AI & Calendar' && (
        <div className="glass p-3.5 sm:p-6 space-y-4 sm:space-y-5 max-w-3xl">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="w-4 h-4 text-[var(--accent)]" />
              <span>AURAA AI Preferences</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5">Default AI Model</label>
                <GlassSelect
                  value={s.aiModel}
                  onChange={(val) => updateSettings({ aiModel: val as AppSettings['aiModel'] })}
                  ariaLabel="Default AI model"
                  className="w-full px-3 py-2.5 text-sm"
                  options={[
                    { value: 'gemini-4-hydrogen', label: 'gemini-4-hydrogen (Balanced)' },
                    { value: 'gemini-4-carbon', label: 'gemini-4-carbon (High Thinking)' },
                    { value: 'gemini-3.1-flash-lite', label: 'gemini-3.1-flash-lite (Fast)' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Response Style</label>
                <GlassSelect
                  value={s.aiResponseStyle}
                  onChange={(val) =>
                    updateSettings({ aiResponseStyle: val as AppSettings['aiResponseStyle'] })
                  }
                  ariaLabel="Response style"
                  className="w-full px-3 py-2.5 text-sm"
                  options={[
                    { value: 'practical', label: 'Practical & Encouraging' },
                    { value: 'concise', label: 'Concise Bullet Points' },
                    { value: 'detailed', label: 'Detailed Deep Breakdown' },
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--glass-border-subtle)] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Calendar Sync</h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Keep your Raa's Diary timetable in sync with Google Calendar, Apple Calendar (iPhone), and Outlook.
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <a
                href="/api/calendar/export.ics"
                className="glass-button-primary inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold"
              >
                <Download className="w-4 h-4" />
                <span>Export Standard .ICS Calendar</span>
              </a>

              <button
                type="button"
                onClick={() =>
                  pushToast(
                    'Direct 2-way OAuth live sync is scheduled. Use the instant .ICS export on the left to sync directly with Google & Apple Calendar!',
                    'info'
                  )
                }
                className="glass-button inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-white"
              >
                <Calendar className="w-4 h-4 text-[var(--accent)]" />
                <span>Google Calendar Live Sync</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'Notifications' && (
        <div className="glass p-3.5 sm:p-6 space-y-4 max-w-3xl">
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--glass-border-subtle)]">
            <div className="flex items-center gap-2.5 min-w-0">
              <Bell className="w-4 h-4 text-[var(--accent)] shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium">In-App Reminders</div>
                <div className="text-xs text-[var(--text-secondary)]">Show overdue and planning alerts inside Raa's Diary</div>
              </div>
            </div>
            <LiquidGlassSwitch
              checked={s.notificationsEnabled}
              ariaLabel="In-App Reminders"
              onChange={(next) => {
                updateSettings({ notificationsEnabled: next });
                pushToast(next ? 'In-app reminders enabled' : 'In-app reminders paused', 'bell');
              }}
            />
          </div>

          <div className="p-4 rounded-xl bg-white/[0.04] space-y-2.5">
            <div className="text-sm font-semibold">Browser Push Permission</div>
            <p className="text-xs text-[var(--text-secondary)]">
              Browser notifications only appear when granted by your browser and while the tab or supported PWA is active.
            </p>
            <button type="button" onClick={handleRequestBrowserNotif} className="glass-button px-4 py-2 text-xs font-semibold">
              Check / Enable Browser Notifications
            </button>
          </div>
        </div>
      )}

      {tab === 'Backup & Account' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
          <section className="glass p-3.5 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Shield className="w-4 h-4 text-[var(--accent)]" />
              <span>Account &amp; Multi-Device Session</span>
            </div>
            <div className="text-xs text-[var(--text-secondary)] space-y-1">
              <div>Active User: <span className="font-semibold text-[var(--text-primary)]">{data.user.name}</span></div>
              <div>Email: <span className="font-mono-num">{data.user.email}</span></div>
              <div>Authentication: scrypt password hash + HttpOnly session cookie</div>
            </div>
            <button type="button" onClick={onOpenAuth} className="glass-button-primary px-4 py-2 text-xs font-semibold">
              Switch / Sign In / Create Account
            </button>

            {/* Change Account Password Form */}
            <div className="pt-4 border-t border-[var(--glass-border-subtle)] space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <KeyRound className="w-4 h-4 text-[var(--accent)]" />
                <span>Change Account Password (પાસવર્ડ બદલો)</span>
              </div>
              <form onSubmit={handleChangePassword} className="space-y-2.5">
                {passError && <p className="text-xs text-[var(--danger)]">{passError}</p>}
                {passSuccess && <p className="text-xs text-[var(--success)]">{passSuccess}</p>}

                <div>
                  <label className="block text-xs font-medium mb-1">Current Password (વર્તમાન પાસવર્ડ)</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      placeholder="Enter current password (default: mydayos2026)"
                      className="glass-input w-full px-3 py-2 text-xs pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white"
                    >
                      {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium mb-1">New Password (નવો પાસવર્ડ)</label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="Min 6 characters"
                      className="glass-input w-full px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Confirm New Password</label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                      placeholder="Repeat new password"
                      className="glass-input w-full px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={passLoading || !currentPass || !newPass}
                  className="glass-button-primary px-4 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  {passLoading ? 'Updating...' : 'Update Password (પાસવર્ડ સાચવો)'}
                </button>
              </form>
            </div>

            {/* Change 4-digit Diary PIN */}
            <div className="pt-4 border-t border-[var(--glass-border-subtle)] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>Diary 4-Digit Lock PIN (ડાયરી PIN)</span>
                </div>
                <span className="text-xs font-mono-num text-[var(--text-secondary)]">Current: {diaryPin}</span>
              </div>
              <form onSubmit={handleUpdatePin} className="flex items-center gap-2">
                <input
                  type="password"
                  maxLength={4}
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="New 4 digits (e.g. 1234)"
                  className="glass-input w-36 px-3 py-2 text-xs font-mono-num tracking-widest text-center"
                />
                <button
                  type="submit"
                  disabled={newPinInput.length !== 4}
                  className="glass-button px-3.5 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  Save PIN
                </button>
                {pinSuccess && <span className="text-xs text-[var(--success)]">{pinSuccess}</span>}
              </form>
            </div>

            <div className="pt-4 border-t border-[var(--glass-border-subtle)] space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Smartphone className="w-4 h-4 text-[var(--accent-secondary)]" />
                <span>Install on Mobile Phone or PC (PWA)</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Add Raa's Diary directly to your Android, iPhone, Windows, or Mac so it launches full-screen like a native app.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <PWAInstallButton />
                {onOpenCloudGuide && (
                  <button
                    type="button"
                    onClick={onOpenCloudGuide}
                    className="liquid-glass-pill px-3.5 py-2 text-xs font-semibold inline-flex items-center gap-1.5 min-h-[40px] text-sky-300 border-sky-400/30 bg-sky-500/10"
                  >
                    <Cloud className="w-4 h-4 text-sky-400" />
                    <span>૨૪/૭ ક્લાઉડ સેટઅપ (લેપટોપ વગર)</span>
                  </button>
                )}
                <a
                  href="/RAA_DIARY_CLOUD_DEPLOY_GUJARATI.txt"
                  download="RAA_DIARY_CLOUD_DEPLOY_GUJARATI.txt"
                  className="glass-button px-3.5 py-2 text-xs font-semibold inline-flex items-center gap-1.5 min-h-[40px]"
                >
                  <FileText className="w-4 h-4 text-sky-400" />
                  <span>ક્લાઉડ ગાઈડ (.txt)</span>
                </a>
                <a
                  href="/RAA_DIARY_FEATURES_GUIDE_GUJARATI.txt"
                  download="RAA_DIARY_FEATURES_GUIDE_GUJARATI.txt"
                  className="glass-button-primary px-3.5 py-2 text-xs font-semibold inline-flex items-center gap-1.5 min-h-[40px]"
                >
                  <FileText className="w-4 h-4 text-emerald-300" />
                  <span>સંપૂર્ણ ફીચર્સ ગાઇડ (.txt)</span>
                </a>
                <a
                  href="/RAA_DIARY_USE_KARVANI_RIT_GUJARATI.txt"
                  download="RAA_DIARY_USE_KARVANI_RIT_GUJARATI.txt"
                  className="glass-button px-3.5 py-2 text-xs font-semibold inline-flex items-center gap-1.5 min-h-[40px]"
                >
                  <FileText className="w-4 h-4 text-[var(--accent-cyan)]" />
                  <span>ઉપયોગ રીત ગાઇડ (.txt)</span>
                </a>
              </div>
            </div>
          </section>

          <section className="glass p-3.5 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <HardDrive className="w-4 h-4 text-[var(--success)]" />
              <span>SQLite Storage &amp; Backups</span>
            </div>
            <div className="text-xs text-[var(--text-secondary)] space-y-1 font-mono-num">
              <div>Database: {data.storageStats.dbPath} ({Math.round(data.storageStats.sizeBytes / 1024)} KB)</div>
              <div>
                Records: {data.storageStats.counts.routines} routines · {data.storageStats.counts.tasks} tasks ·{' '}
                {data.storageStats.counts.events} events · {data.storageStats.counts.goals} goals
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  const res = await api.post<{ filename: string }>('/api/backup/snapshot');
                  setStatusMsg(`SQLite snapshot created: ${res.filename}`);
                }}
                className="glass-button px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Create Server Snapshot</span>
              </button>
              <a
                href="/api/backup/export"
                className="glass-button-primary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Full JSON</span>
              </a>
            </div>

            <div className="pt-4 border-t border-[var(--glass-border-subtle)] space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Cloud className="w-4 h-4 text-[var(--accent-cyan)]" />
                <span>Cloud Backups (iCloud &amp; Google Drive)</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                On iPhone X Safari, tap Export below to save your complete diary directly into your iPhone iCloud Files folder or Google Drive.
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href="/api/backup/export"
                  download={`raas-diary-icloud-backup-${data.today}.json`}
                  className="glass-button px-3.5 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Cloud className="w-3.5 h-3.5 text-blue-400" />
                  <span>Save to iCloud Files</span>
                </a>
                <a
                  href="/api/backup/export"
                  download={`raas-diary-gdrive-backup-${data.today}.json`}
                  className="glass-button px-3.5 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Save to Google Drive</span>
                </a>
              </div>
            </div>
          </section>
        </div>
      )}

      <LiquidGlassToastStack toasts={toasts} />
    </div>
  );
};
