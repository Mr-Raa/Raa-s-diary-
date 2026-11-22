import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import {
  Activity,
  AlarmClock,
  Bell,
  BookOpen,
  Briefcase,
  Calendar as CalendarIcon,
  CheckSquare,
  Clock,
  Droplets,
  FileText,
  History,
  Home,
  LayoutGrid,
  Lock,
  Moon,
  Palette,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  Sun,
  Target,
  Timer,
  Unlock,
  User,
  X,
} from 'lucide-react';
import type { AppNotification, AppSettings, NavModule, UserProfile } from '../types';
import { formatDateReadable } from '../utils/dateLogic';
import { PWAInstallButton } from '../hooks/usePWAInstall';
import { BrandLogo } from './BrandLogo';

export interface NavItem {
  id: NavModule;
  label: string;
  mobileLabel?: string;
  guLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Home', mobileLabel: 'Home', guLabel: 'હોમ', icon: Home },
  { id: 'routine', label: 'My Routine', mobileLabel: 'Routine', guLabel: 'દિનચર્યા', icon: Clock },
  { id: 'tasks', label: 'Tasks', mobileLabel: 'Tasks', guLabel: 'કાર્યો', icon: CheckSquare },
  { id: 'alarms', label: 'Alarms', mobileLabel: 'Alarms', guLabel: 'એલાર્મ', icon: AlarmClock },
  { id: 'calendar', label: 'Calendar', mobileLabel: 'Calendar', guLabel: 'કેલેન્ડર', icon: CalendarIcon },
  { id: 'trackers', label: 'Trackers', mobileLabel: 'Trackers', guLabel: 'ટ્રેકર્સ', icon: Droplets },
  { id: 'goals', label: 'Goals & Habits', mobileLabel: 'Goals', guLabel: 'લક્ષ્યો', icon: Target },
  { id: 'study', label: 'Study', mobileLabel: 'Study', guLabel: 'અભ્યાસ', icon: BookOpen },
  { id: 'work', label: 'Work', mobileLabel: 'Work', guLabel: 'કામ', icon: Briefcase },
  { id: 'focus', label: 'Focus Mode', mobileLabel: 'Focus', guLabel: 'ફોકસ', icon: Timer },
  { id: 'notes', label: 'Notes & Diary', mobileLabel: 'Diary', guLabel: 'નોંધ અને ડાયરી', icon: FileText },
  { id: 'analytics', label: 'Analytics', mobileLabel: 'Analytics', guLabel: 'વિશ્લેષણ', icon: Activity },
  { id: 'history', label: 'History', mobileLabel: 'History', guLabel: 'ઇતિહાસ', icon: History },
  { id: 'ai', label: 'AURAA AI', mobileLabel: 'AURAA', guLabel: 'AURAA AI', icon: Sparkles },
  { id: 'settings', label: 'Settings', mobileLabel: 'Settings', guLabel: 'સેટિંગ્સ', icon: SettingsIcon },
];

export const MOBILE_PRIMARY_TABS: NavModule[] = [
  'dashboard',
  'routine',
  'tasks',
  'notes',
  'ai',
  'settings',
];

interface LiveClockProps {
  timezone: string;
  timeFormat: '12h' | '24h';
}

const LiveClock: React.FC<LiveClockProps> = React.memo(({ timezone, timeFormat }) => {
  const [clock, setClock] = useState('');

  useEffect(() => {
    const updateClock = () => {
      try {
        const formatted = new Intl.DateTimeFormat('en-IN', {
          timeZone: timezone || 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: timeFormat === '12h',
        }).format(new Date());
        setClock(formatted);
      } catch {
        setClock(new Date().toLocaleTimeString());
      }
    };

    const isWide =
      typeof window !== 'undefined' ? window.matchMedia('(min-width: 640px)').matches : true;
    if (!isWide) return;

    updateClock();
    const t = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(t);
  }, [timezone, timeFormat]);

  if (!clock) return null;

  return (
    <div
      className="hidden sm:block font-mono-num text-xs sm:text-sm text-[var(--text-secondary)] px-2.5 py-1.5 rounded-xl bg-white/[0.04] whitespace-nowrap"
      aria-label="Live clock"
    >
      {clock}
    </div>
  );
});
LiveClock.displayName = 'LiveClock';

interface SidebarProps {
  active: NavModule;
  onSelect: (m: NavModule) => void;
  user: UserProfile;
  settings: AppSettings;
  onOpenAuth?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ active, onSelect, user, settings, onOpenAuth }) => {
  return (
    <aside
      className="hidden lg:flex flex-col w-[248px] shrink-0 h-screen sticky top-0 glass-sidebar z-20 px-3.5 py-5 justify-between"
      aria-label="Primary navigation"
    >
      <div className="space-y-5 overflow-y-auto pr-1">
        <div className="px-2">
          <BrandLogo size="md" showText subtitle="Personal Life OS" />
        </div>

        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            const textLabel = settings.language === 'gu' ? item.guLabel : item.label;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left whitespace-nowrap transition-colors ${
                  isActive
                    ? 'text-[var(--text-primary)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-500/10'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="sidebar-liquid-pill"
                    transition={{ type: 'spring', stiffness: 440, damping: 32 }}
                    className="absolute inset-0 rounded-xl glass-active-pill -z-10"
                    aria-hidden="true"
                  />
                )}
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[var(--accent)]' : ''}`} />
                <span className="truncate">{textLabel}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="pt-3 border-t border-[var(--glass-border-subtle)] px-1">
        <button
          type="button"
          onClick={() => (onOpenAuth ? onOpenAuth() : onSelect('settings'))}
          className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-900/[0.05] dark:hover:bg-white/[0.06] transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-full bg-[var(--accent)]/18 flex items-center justify-center text-xs font-semibold shrink-0 text-[var(--accent)]">
            {user.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold truncate">{user.name}</div>
            <div className="text-[11px] text-[var(--text-muted)] truncate">{user.email}</div>
          </div>
        </button>
      </div>
    </aside>
  );
};

export const THEME_PRESETS = [
  { name: 'Royal Blue', hex: '#6b9cff' },
  { name: 'Lavender Violet', hex: '#a78bfa' },
  { name: 'Neon Cyan', hex: '#38bdf8' },
  { name: 'Emerald Mint', hex: '#55d6a5' },
  { name: 'Warm Amber', hex: '#f5bb68' },
  { name: 'Rose Coral', hex: '#f43f5e' },
  { name: 'Hot Pink', hex: '#ec4899' },
  { name: 'Forest Green', hex: '#10b981' },
  { name: 'Sunset Orange', hex: '#f97316' },
];

interface TopBarProps {
  active: NavModule;
  today: string;
  user: UserProfile;
  settings: AppSettings;
  notifications: AppNotification[];
  onToggleTheme: () => void;
  onUpdateAccentColor?: (color: string) => void;
  onMarkAllRead: () => void;
  onSelectModule: (m: NavModule) => void;
  onOpenAuth: () => void;
  onOpenInstallGuide?: () => void;
  onOpenModulesMenu?: () => void;
  onOpenCommandPalette?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  active,
  today,
  user,
  settings,
  notifications,
  onToggleTheme,
  onUpdateAccentColor,
  onMarkAllRead,
  onSelectModule,
  onOpenAuth,
  onOpenInstallGuide,
  onOpenModulesMenu,
  onOpenCommandPalette,
}) => {
  const [notifOpen, setNotifOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const activeItem = NAV_ITEMS.find((n) => n.id === active);

  return (
    <header className="max-md:relative md:sticky md:top-0 z-30 shrink-0 glass-topbar max-md:min-h-[48px] max-md:px-2.5 pt-[max(0.35rem,env(safe-area-inset-top))] pb-1 sm:px-6 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
      {/* Left: Brand / Active Module */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 460, damping: 28 }}
          onClick={() => onSelectModule('dashboard')}
          aria-label="Go to MY DAY OS Home"
          className="lg:hidden shrink-0 flex items-center min-w-0 text-left"
        >
          <BrandLogo
            size="sm"
            showText
            animated
            labelOverride={active === 'dashboard' ? 'MY DAY OS' : activeItem?.mobileLabel || activeItem?.label}
          />
        </motion.button>
        <span className="hidden lg:inline text-sm font-semibold tracking-tight whitespace-nowrap">
          {activeItem?.label ?? 'Home'}
        </span>
      </div>

      {/* Center: Unified Non-Colliding Date & Clock Badge */}
      <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/5 text-xs text-[var(--text-secondary)] whitespace-nowrap shrink-0">
        <span className="font-medium text-[var(--text-primary)]">
          {formatDateReadable(today, settings.dateFormat)}
        </span>
        <span className="opacity-30" aria-hidden="true">|</span>
        <LiveClock timezone={settings.timezone} timeFormat={settings.timeFormat} />
      </div>

      {/* Right: Essential Clean Action Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Notifications Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            aria-label={`Notifications (${unreadCount} unread)`}
            title="Notifications"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900/[0.055] hover:bg-slate-900/[0.10] dark:bg-white/[0.05] dark:hover:bg-white/[0.10] flex items-center justify-center relative active:scale-95 transition-all cursor-pointer"
          >
            <Bell className="w-4 h-4 text-[var(--text-secondary)]" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 max-w-[90vw] glass-modal p-4 z-50 space-y-3 ios-sheet-up rounded-2xl shadow-2xl border border-white/15">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Notifications</span>
                <button
                  type="button"
                  onClick={() => {
                    onMarkAllRead();
                    setNotifOpen(false);
                  }}
                  className="text-xs text-[var(--accent)] hover:underline"
                >
                  Mark all read
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] py-3 text-center">No notifications yet.</p>
                ) : (
                  notifications.slice(0, 8).map((n) => (
                    <div
                      key={n.id}
                      className={`p-2.5 rounded-xl ${
                        n.read
                          ? 'bg-slate-900/[0.03] dark:bg-white/[0.025] opacity-65'
                          : 'bg-slate-900/[0.06] dark:bg-white/[0.06]'
                      }`}
                    >
                      <div className="text-xs font-semibold">{n.title}</div>
                      <div className="text-xs text-[var(--text-secondary)] mt-0.5">{n.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Profile / All Modules Trigger (< lg) */}
        <button
          type="button"
          onClick={() => (onOpenModulesMenu ? onOpenModulesMenu() : onOpenAuth())}
          aria-label="Profile and All Modules"
          title="Account / Menu"
          className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--accent)]/18 hover:bg-[var(--accent)]/28 flex items-center justify-center relative active:scale-95 transition-all cursor-pointer"
        >
          <span className="text-xs font-bold text-[var(--accent)]">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
        </button>

        {/* Desktop/Tablet Account Trigger */}
        <div className="hidden lg:flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenAuth}
            aria-label="Account and Profile"
            className="min-w-[40px] min-h-[40px] px-3 rounded-xl bg-slate-900/[0.055] hover:bg-slate-900/[0.10] dark:bg-white/[0.05] dark:hover:bg-white/[0.10] flex items-center justify-center gap-2 whitespace-nowrap transition-all cursor-pointer"
          >
            <User className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="hidden md:inline text-xs font-medium">{user.name}</span>
          </button>
        </div>

        {/* AURAA AI Quick Action Button */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.05, y: -1 }}
          whileTap={{ scale: 0.93 }}
          transition={{ type: 'spring', stiffness: 460, damping: 26 }}
          onClick={() => onSelectModule('ai')}
          aria-label="Ask AURAA AI"
          className="hidden sm:flex glass-button-primary auraa-btn-animated px-3 sm:px-3.5 h-10 text-xs font-semibold items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 auraa-spark-animated" />
          <span className="relative z-10 tracking-wide">AURAA</span>
        </motion.button>
      </div>
    </header>
  );
};

interface MobileNavProps {
  active: NavModule;
  onSelect: (m: NavModule) => void;
  user?: UserProfile;
  settings: AppSettings;
  modulesSheetOpen: boolean;
  onSetModulesSheetOpen: (open: boolean) => void;
  onToggleTheme: () => void;
  onOpenAuth?: () => void;
  onOpenInstallGuide?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  active,
  onSelect,
  user,
  settings,
  modulesSheetOpen,
  onSetModulesSheetOpen,
  onToggleTheme,
  onOpenAuth,
  onOpenInstallGuide,
}) => {
  const secondaryItems = NAV_ITEMS.filter((i) => !MOBILE_PRIMARY_TABS.includes(i.id));

  const drawerPortal =
    modulesSheetOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="lg:hidden fixed inset-0 z-[9999] bg-black/65 md:backdrop-blur-sm flex items-end"
            onClick={() => onSetModulesSheetOpen(false)}
          >
            <div
              className="glass-modal ios-sheet-up w-full p-4 sm:p-5 pb-[max(2rem,env(safe-area-inset-bottom))] rounded-t-[28px] max-h-[85dvh] overflow-y-auto no-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="w-10 h-1 rounded-full bg-slate-400/35 mx-auto mb-3.5"
                aria-hidden="true"
              />
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-[var(--accent)]" />
                  <span className="text-base font-semibold">Profile &amp; All Modules</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onToggleTheme}
                    aria-label={settings.theme === 'light' ? 'Switch to Dark theme' : 'Switch to Light theme'}
                    className="glass-button w-10 h-10 flex items-center justify-center"
                  >
                    {settings.theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetModulesSheetOpen(false)}
                    aria-label="Close modules menu"
                    className="glass-button p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2.5 mb-3.5 p-2.5 rounded-2xl bg-slate-900/[0.045] dark:bg-white/[0.045]">
                {onOpenAuth ? (
                  <button
                    type="button"
                    onClick={() => {
                      onSetModulesSheetOpen(false);
                      onOpenAuth();
                    }}
                    className="flex items-center gap-2.5 min-w-0 text-left flex-1 py-1 px-1"
                  >
                    <div className="w-9 h-9 rounded-full bg-[var(--accent)]/22 flex items-center justify-center text-xs font-semibold shrink-0 text-[var(--accent)]">
                      {user?.name?.slice(0, 1).toUpperCase() || 'R'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{user?.name || 'Account'}</div>
                      <div className="text-[11px] text-[var(--text-muted)] truncate">
                        Account &amp; Sync
                      </div>
                    </div>
                  </button>
                ) : null}
                <PWAInstallButton
                  onOpenInstallGuide={() => {
                    onSetModulesSheetOpen(false);
                    onOpenInstallGuide?.();
                  }}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pb-4">
                {secondaryItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = active === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelect(item.id);
                        onSetModulesSheetOpen(false);
                      }}
                      className={`min-h-[48px] flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-xs font-medium text-left active:scale-[0.98] transition-transform ${
                        isActive ? 'glass-button-primary text-white' : 'glass-button'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass-mobile-tabbar px-1 pt-1 pb-[max(0.2rem,env(safe-area-inset-bottom))]"
        aria-label="Mobile navigation"
      >
        <div className="grid grid-cols-6 gap-0.5 sm:gap-1">
          {MOBILE_PRIMARY_TABS.map((id) => {
            const item = NAV_ITEMS.find((n) => n.id === id)!;
            const Icon = item.icon;
            const isActive = active === id;
            const shortLabel = item.mobileLabel || item.label;
            return (
              <motion.button
                key={id}
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  onSelect(id);
                  onSetModulesSheetOpen(false);
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`relative min-h-[46px] flex flex-col items-center justify-center rounded-2xl text-[10.5px] font-medium transition-colors ${
                  isActive ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-secondary)]'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="mobile-tab-liquid-pill"
                    transition={{ type: 'spring', stiffness: 460, damping: 32 }}
                    className="absolute inset-0.5 rounded-2xl glass-active-pill -z-10"
                    aria-hidden="true"
                  />
                )}
                <motion.span
                  animate={{ scale: isActive ? 1.12 : 1, y: isActive ? -1 : 0 }}
                  transition={{ type: 'spring', stiffness: 480, damping: 28 }}
                  className="inline-flex"
                >
                  <Icon className={`w-[18px] h-[18px] mb-0.5 ${isActive ? 'text-[var(--accent)]' : ''}`} />
                </motion.span>
                <span className="truncate max-w-full px-0.5">{shortLabel}</span>
              </motion.button>
            );
          })}
        </div>
      </nav>
      {drawerPortal}
    </>
  );
};
