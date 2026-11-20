import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MotionConfig, motion } from 'motion/react';
import { api, type BootstrapData } from './api/client';
import type { Alarm, NavModule, Task } from './types';
import { MobileNav, Sidebar, TopBar } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { RoutineView } from './components/RoutineView';
import { TasksView } from './components/TasksView';
import { AlarmsView } from './components/AlarmsView';
import { AlarmRingingModal } from './components/AlarmRingingModal';
import { DynamicIslandAlarm } from './components/DynamicIslandAlarm';
import { CalendarView } from './components/CalendarView';
import { GoalsHabitsView } from './components/GoalsHabitsView';
import { StudyWorkView } from './components/StudyWorkView';
import { FocusView } from './components/FocusView';
import { NotesView } from './components/NotesView';
import { AnalyticsView } from './components/AnalyticsView';
import { HistoryView } from './components/HistoryView';
import { AiAssistantView } from './components/AiAssistantView';
import { SettingsView } from './components/SettingsView';
import { AccountModal } from './components/AccountModal';
import { TrackersView } from './components/TrackersView';
import { WaterBottomSheet } from './components/WaterBottomSheet';
import { OfflineIndicator, PWAInstallModal } from './hooks/usePWAInstall';
import { CloudHostingModal } from './components/CloudHostingModal';
import {
  getCachedBootstrap,
  saveCachedBootstrap,
  getOfflineMutationQueue,
  clearOfflineMutationQueue,
} from './utils/offlineStorage';
import { shouldAlarmTriggerAt } from './utils/alarmLogic';
import { startAlarmLoop, stopAlarmLoop } from './utils/alarmAudio';

import { BrandLogo } from './components/BrandLogo';
import { CommandPalette } from './components/CommandPalette';

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '107, 156, 255';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export default function App() {
  const [data, setData] = useState<BootstrapData | null>(() => {
    return getCachedBootstrap()?.data || null;
  });
  const [loading, setLoading] = useState(() => !getCachedBootstrap()?.data);
  const [error, setError] = useState('');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [cloudModalOpen, setCloudModalOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<NavModule>('dashboard');
  const [initializedRoute, setInitializedRoute] = useState(false);
  const [showLaunchIntro, setShowLaunchIntro] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  });

  // Quick-action triggers from Dashboard
  const [quickTaskAdd, setQuickTaskAdd] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [quickRoutineAdd, setQuickRoutineAdd] = useState(false);
  const [quickGoalAdd, setQuickGoalAdd] = useState(false);
  const [waterSheetOpen, setWaterSheetOpen] = useState(false);
  const [initialTrackerKey, setInitialTrackerKey] = useState<string | null>(null);

  // Account / History, Modules Sheet, Command Palette & Install Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [installGuideOpen, setInstallGuideOpen] = useState(false);
  const [modulesSheetOpen, setModulesSheetOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Live Alarm Ringing State
  const [ringingAlarm, setRingingAlarm] = useState<Alarm | null>(null);
  const triggeredKeysRef = useRef<Set<string>>(new Set());
  const snoozedAlarmsRef = useRef<Array<{ fireAtMs: number; alarm: Alarm }>>([]);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!showLaunchIntro) return;
    const t = window.setTimeout(() => setShowLaunchIntro(false), 680);
    return () => window.clearTimeout(t);
  }, [showLaunchIntro]);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [activeModule]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<BootstrapData>('/api/bootstrap');
      setData(res);
      saveCachedBootstrap(res);
      setIsOfflineMode(false);
      setError('');

      // Auto-replay offline mutation queue if any
      const queue = getOfflineMutationQueue();
      if (queue.length > 0) {
        clearOfflineMutationQueue();
        Promise.allSettled(
          queue.map((m) => {
            if (m.method === 'POST') return api.post(m.endpoint, m.body);
            if (m.method === 'PUT') return api.put(m.endpoint, m.body);
            if (m.method === 'DELETE') return api.del(m.endpoint);
            return Promise.resolve();
          })
        ).then(() => {
          api.get<BootstrapData>('/api/bootstrap').then((synced) => {
            setData(synced);
            saveCachedBootstrap(synced);
          }).catch(() => {});
        });
      }

      if (!initializedRoute) {
        const params = new URLSearchParams(window.location.search);
        const modParam = params.get('module') as NavModule | null;
        if (modParam) {
          setActiveModule(modParam);
        } else if (res.settings.startupModule) {
          setActiveModule(res.settings.startupModule);
        }
        setInitializedRoute(true);
      }
    } catch (err) {
      const cached = getCachedBootstrap();
      if (cached?.data) {
        setData(cached.data);
        setIsOfflineMode(true);
        setError('');
        if (!initializedRoute) {
          setInitializedRoute(true);
        }
      } else {
        setError(err instanceof Error ? err.message : "Unable to connect to Raa's Diary server.");
      }
    } finally {
      setLoading(false);
    }
  }, [initializedRoute]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Apply Crystal Liquid Glass theme & CSS variables dynamically
  useEffect(() => {
    if (!data) return;
    const s = data.settings;
    const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
    const resolvedTheme = s.theme === 'system' ? (prefersLight ? 'light' : 'dark') : s.theme;

    const root = document.documentElement;
    root.setAttribute('data-theme', resolvedTheme);
    root.setAttribute('data-font-style', s.fontStyle || 'vision');
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    if (s.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    const alpha =
      resolvedTheme === 'light'
        ? Math.max(0.68, Math.min(0.88, s.glassOpacity + 0.62))
        : Math.min(0.16, Math.max(0.065, s.glassOpacity * 0.95));
    root.style.setProperty('--glass-alpha', String(alpha));
    root.style.setProperty('--glass-alpha-hover', String(Math.min(0.95, alpha + 0.045)));
    root.style.setProperty('--glass-blur', `${Math.max(16, s.glassBlur)}px`);
    root.style.setProperty('--glass-radius', `${s.glassRadius}px`);
    const rawAccent = s.accentColor || '#6b9cff';
    const effectiveAccent =
      resolvedTheme === 'light' && rawAccent.toLowerCase() === '#6b9cff' ? '#2563eb' : rawAccent;
    root.style.setProperty('--accent', effectiveAccent);
    root.style.setProperty('--accent-rgb', hexToRgb(effectiveAccent));
    root.style.setProperty('--ui-font-size', `${s.fontSize || 15}px`);

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute('content', resolvedTheme === 'light' ? '#eaf0fb' : '#060914');
    }
  }, [data]);

  const fireAlarmOverlay = useCallback(
    (alarm: Alarm) => {
      setRingingAlarm(alarm);
      if (data?.settings.notificationSound !== false) {
        startAlarmLoop(alarm.tone || 'crystal');
      }
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification(`⏰ ${alarm.title}`, {
            body: alarm.reminderNote || "Scheduled Raa's Diary reminder",
            icon: '/pwa-192x192.png',
          });
        } catch {
          // ignore browser notification failures
        }
      }
      api.post(`/api/alarms/${alarm.id}/triggered`).catch(() => undefined);
    },
    [data?.settings.notificationSound]
  );

  useEffect(() => {
    if (!data?.alarms) return;
    const checkAlarms = () => {
      const now = new Date();
      const tz = data.settings.timezone || 'Asia/Kolkata';
      const hhmm = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(now);
      const weekdayShort = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        weekday: 'short',
      }).format(now);
      const wMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      const dayOfWeek = wMap[weekdayShort] ?? now.getDay();

      // Check snoozed alarms first
      const dueSnoozeIdx = snoozedAlarmsRef.current.findIndex((s) => s.fireAtMs <= Date.now());
      if (dueSnoozeIdx !== -1) {
        const [item] = snoozedAlarmsRef.current.splice(dueSnoozeIdx, 1);
        fireAlarmOverlay({ ...item.alarm, time: hhmm });
        return;
      }

      for (const alarm of data.alarms) {
        if (!shouldAlarmTriggerAt(alarm, hhmm, dayOfWeek)) continue;
        const triggerKey = `${data.today}_${hhmm}_${alarm.id}`;
        if (triggeredKeysRef.current.has(triggerKey)) continue;
        triggeredKeysRef.current.add(triggerKey);
        fireAlarmOverlay({ ...alarm, time: hhmm });
        break;
      }
    };

    const timer = window.setInterval(checkAlarms, 10000);
    return () => window.clearInterval(timer);
  }, [data?.alarms, data?.settings.timezone, data?.today, fireAlarmOverlay]);

  const handleToggleTheme = async () => {
    if (!data) return;
    const nextTheme = data.settings.theme === 'light' ? 'dark' : 'light';
    await api.put('/api/settings', { theme: nextTheme });
    await refresh();
  };

  const handleUpdateAccentColor = async (color: string) => {
    if (!data) return;
    await api.put('/api/settings', { accentColor: color });
    await refresh();
  };

  const handleMarkAllRead = async () => {
    await api.post('/api/notifications/mark-all-read');
    await refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="ambient-canvas" />
        <div className="glass p-7 text-center space-y-3 relative z-10 flex flex-col items-center">
          <BrandLogo size="lg" />
          <div className="text-base font-bold tracking-tight">Raa&apos;s Diary</div>
          <p className="text-xs text-[var(--text-secondary)]">Loading your personal life operating system...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="ambient-canvas" />
        <div className="glass p-8 max-w-md text-center space-y-4 relative z-10">
          <div className="text-lg font-bold text-[var(--danger)]">Connection Error</div>
          <p className="text-xs text-[var(--text-secondary)]">{error || 'Unable to load workspace.'}</p>
          <button type="button" onClick={refresh} className="glass-button-primary px-5 py-2.5 text-xs font-semibold">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion={data.settings.reducedMotion ? 'always' : 'user'}>
      <div className="h-[100dvh] max-md:h-[100dvh] md:min-h-screen flex flex-col lg:flex-row relative bg-[var(--background)] overflow-x-hidden">
        {/* iOS 27 Opening Crystal Launch Morph */}
        {showLaunchIntro && !data.settings.reducedMotion && (
          <div
            className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center bg-[var(--background)] ios-launch-overlay"
            aria-hidden="true"
          >
            <div className="ios-launch-emblem flex flex-col items-center gap-3">
              <BrandLogo size="xl" />
              <div className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)]">
                Raa&apos;s Diary
              </div>
            </div>
          </div>
        )}

        {/* Ambient Midnight Aurora & Fire Glow Lighting Background (Hidden on mobile for 60fps smoothness) */}
        <div className="ambient-canvas" aria-hidden="true">
          <div
            className="ambient-orb hidden md:block"
            style={{ width: 440, height: 440, top: '-10%', left: '8%', background: 'var(--accent)' }}
          />
          <div
            className="ambient-orb hidden md:block"
            style={{
              width: 380,
              height: 380,
              top: '18%',
              right: '10%',
              background: '#ff5722',
              opacity: 0.18,
              animationDelay: '-5s',
            }}
          />
          <div
            className="ambient-orb hidden md:block"
            style={{
              width: 390,
              height: 390,
              bottom: '2%',
              right: '6%',
              background: 'var(--accent-secondary)',
              animationDelay: '-8s',
            }}
          />
          <div
            className="ambient-orb hidden md:block"
            style={{
              width: 300,
              height: 300,
              top: '38%',
              left: '42%',
              background: 'var(--accent-cyan)',
              opacity: 0.24,
              animationDelay: '-15s',
            }}
          />
        </div>

      {/* Desktop Glass Sidebar */}
      <Sidebar
        active={activeModule}
        onSelect={setActiveModule}
        user={data.user}
        settings={data.settings}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col relative z-10">
        <TopBar
          active={activeModule}
          today={data.today}
          user={data.user}
          settings={data.settings}
          notifications={data.notifications}
          onToggleTheme={handleToggleTheme}
          onUpdateAccentColor={handleUpdateAccentColor}
          onMarkAllRead={handleMarkAllRead}
          onSelectModule={setActiveModule}
          onOpenAuth={() => setAuthModalOpen(true)}
          onOpenInstallGuide={() => setInstallGuideOpen(true)}
          onOpenModulesMenu={() => setModulesSheetOpen(true)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />

        <main
          ref={mainRef}
          className={`flex-1 min-h-0 w-full max-w-[1440px] mx-auto overflow-y-auto overscroll-y-contain overflow-x-hidden mobile-scroll-area no-scrollbar px-2 sm:px-6 lg:p-8 pt-1.5 ${
            activeModule === 'ai'
              ? 'pb-[calc(60px+env(safe-area-inset-bottom))] lg:pb-8 flex flex-col'
              : 'pb-[calc(70px+env(safe-area-inset-bottom))] lg:pb-10'
          }`}
        >
          {/* Subtle Liquid Glass Offline Notification Banner */}
          {isOfflineMode && (
            <div className="mb-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 backdrop-blur-md flex flex-wrap items-center justify-between gap-2.5 text-xs text-amber-200">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <span>
                  <b>📱 ઑફલાઇન મોડ (લેપટોપ બંધ છે)</b>: તમારા બધા ડેટા, નોટ્સ અને ટાસ્ક સુરક્ષિત છે.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setCloudModalOpen(true)}
                  className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold border border-amber-500/30 text-[11px]"
                >
                  ૨૪/૭ સેટઅપ ☁️
                </button>
                <button
                  type="button"
                  onClick={refresh}
                  className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[11px]"
                >
                  રીટ્રાય 🔄
                </button>
              </div>
            </div>
          )}

          <motion.div
            key={activeModule}
            initial={{ opacity: 0.01, y: 8, scale: 0.992 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30, mass: 0.8 }}
            className={`w-full max-w-full min-w-0 ${activeModule === 'ai' ? 'flex-1 h-full flex flex-col' : ''}`}
          >
            {activeModule === 'dashboard' && (
              <DashboardView
                data={data}
                onRefresh={refresh}
                onNavigate={setActiveModule}
                onOpenWaterSheet={() => setWaterSheetOpen(true)}
                onOpenWaterTracker={() => {
                  setInitialTrackerKey('water');
                  setActiveModule('trackers');
                }}
                onOpenModulesMenu={() => setModulesSheetOpen(true)}
                onQuickAddTask={() => {
                  setQuickTaskAdd(true);
                  setActiveModule('tasks');
                }}
                onQuickAddRoutine={() => {
                  setQuickRoutineAdd(true);
                  setActiveModule('routine');
                }}
                onQuickAddGoal={() => {
                  setQuickGoalAdd(true);
                  setActiveModule('goals');
                }}
                onEditTask={(t) => {
                  setTaskToEdit(t);
                  setActiveModule('tasks');
                }}
              />
            )}

            {activeModule === 'routine' && (
              <RoutineView
                data={data}
                onRefresh={refresh}
                externalAddOpen={quickRoutineAdd}
                onCloseExternalAdd={() => setQuickRoutineAdd(false)}
              />
            )}

            {activeModule === 'tasks' && (
              <TasksView
                data={data}
                onRefresh={refresh}
                externalTaskToEdit={taskToEdit}
                externalAddOpen={quickTaskAdd}
                onCloseExternal={() => {
                  setTaskToEdit(null);
                  setQuickTaskAdd(false);
                }}
              />
            )}

            {activeModule === 'alarms' && (
              <AlarmsView
                data={data}
                onRefresh={refresh}
                onTestTriggerAlarm={(alarm) => fireAlarmOverlay(alarm)}
              />
            )}

            {activeModule === 'calendar' && <CalendarView data={data} onRefresh={refresh} />}

            {activeModule === 'trackers' && (
              <TrackersView
                data={data}
                onRefresh={refresh}
                initialTrackerKey={initialTrackerKey}
                onClearInitialTracker={() => setInitialTrackerKey(null)}
              />
            )}

            {activeModule === 'goals' && (
              <GoalsHabitsView
                data={data}
                onRefresh={refresh}
                externalAddGoalOpen={quickGoalAdd}
                onCloseExternalAddGoal={() => setQuickGoalAdd(false)}
              />
            )}

            {activeModule === 'study' && <StudyWorkView mode="study" data={data} onRefresh={refresh} />}
            {activeModule === 'work' && <StudyWorkView mode="work" data={data} onRefresh={refresh} />}
            {activeModule === 'focus' && <FocusView data={data} onRefresh={refresh} />}
            {activeModule === 'notes' && <NotesView data={data} onRefresh={refresh} />}
            {activeModule === 'analytics' && <AnalyticsView data={data} />}
            {activeModule === 'history' && <HistoryView data={data} onRefresh={refresh} />}
            {activeModule === 'ai' && (
              <AiAssistantView data={data} onRefresh={refresh} onNavigate={setActiveModule} />
            )}
            {activeModule === 'settings' && (
              <SettingsView
                data={data}
                onRefresh={refresh}
                onOpenAuth={() => setAuthModalOpen(true)}
                onOpenCloudGuide={() => setCloudModalOpen(true)}
              />
            )}
          </motion.div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <MobileNav
        active={activeModule}
        onSelect={setActiveModule}
        user={data.user}
        settings={data.settings}
        modulesSheetOpen={modulesSheetOpen}
        onSetModulesSheetOpen={setModulesSheetOpen}
        onToggleTheme={handleToggleTheme}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenInstallGuide={() => setInstallGuideOpen(true)}
      />
      <OfflineIndicator />

      <AlarmRingingModal
        alarm={ringingAlarm}
        timeFormat={data.settings.timeFormat}
        onDismiss={() => {
          stopAlarmLoop();
          setRingingAlarm(null);
        }}
        onSnooze={(mins) => {
          stopAlarmLoop();
          if (ringingAlarm) {
            snoozedAlarmsRef.current.push({
              fireAtMs: Date.now() + mins * 60 * 1000,
              alarm: ringingAlarm,
            });
          }
          setRingingAlarm(null);
        }}
        onDrinkWaterAndDismiss={async () => {
          stopAlarmLoop();
          setRingingAlarm(null);
          await api.post('/api/water', { date: data.today, amountMl: 250 });
          await refresh();
        }}
      />

      {/* Dynamic Island style alarm — mobile only, shown together with modal */}
      <DynamicIslandAlarm
        alarm={ringingAlarm}
        timeFormat={data.settings.timeFormat}
        onDismiss={() => {
          stopAlarmLoop();
          setRingingAlarm(null);
        }}
      />

      <WaterBottomSheet
        open={waterSheetOpen}
        onClose={() => setWaterSheetOpen(false)}
        waterIntake={data.waterIntake}
        today={data.today}
        onLogged={refresh}
        onOpenFullTracker={() => {
          setInitialTrackerKey('water');
          setActiveModule('trackers');
        }}
      />

      <AccountModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        data={data}
        onRefresh={refresh}
        onNavigate={setActiveModule}
      />

      <PWAInstallModal
        open={installGuideOpen}
        onClose={() => setInstallGuideOpen(false)}
      />

      <CloudHostingModal
        open={cloudModalOpen}
        onClose={() => setCloudModalOpen(false)}
      />

      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        data={data}
        onNavigate={setActiveModule}
        onQuickWater250={async () => {
          await api.post('/api/water', { date: data.today, amountMl: 250 });
          await refresh();
        }}
        onQuickAddTask={() => {
          setQuickTaskAdd(true);
          setActiveModule('tasks');
        }}
        onQuickAddRoutine={() => {
          setQuickRoutineAdd(true);
          setActiveModule('routine');
        }}
        onToggleTheme={handleToggleTheme}
        onOpenInstallGuide={() => setInstallGuideOpen(true)}
      />
      </div>
    </MotionConfig>
  );
}
