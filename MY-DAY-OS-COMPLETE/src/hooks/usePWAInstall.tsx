import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Laptop,
  PlusSquare,
  Share,
  Smartphone,
  WifiOff,
  X,
} from 'lucide-react';
import { GlassModal } from '../components/GlassModal';
import { BrandLogo } from '../components/BrandLogo';
import {
  buildPwaBuilderUrl,
  detectDefaultInstallTab,
  getInstallGuideSteps,
  resolveShareableAppUrl,
  type InstallPlatformTab,
} from '../utils/installLogic';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-5 left-4 z-50 glass px-3.5 py-2 flex items-center gap-2 text-xs font-medium text-[var(--warning)] border-[var(--warning)]/40">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Offline Mode — Cached view active</span>
    </div>
  );
};

interface IOSInstructionOverlayProps {
  open: boolean;
  onClose: () => void;
  shareableUrl: string;
}

const IOSAddToHomeOverlay: React.FC<IOSInstructionOverlayProps> = ({
  open,
  onClose,
  shareableUrl,
}) => {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10090] bg-slate-950/90 md:backdrop-blur-md flex flex-col justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] text-white"
      role="dialog"
      aria-modal="true"
      aria-label="iOS Add to Home Screen Guide"
      onClick={onClose}
    >
      {/* Top Close Header */}
      <div className="flex items-center justify-between max-w-md w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <BrandLogo size="sm" />
          <div>
            <div className="text-sm font-semibold">Install on iPhone (Safari)</div>
            <div className="text-[11px] text-slate-300">iOS Home Screen App Setup</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close iOS overlay"
          className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Central Visual Instruction Walkthrough */}
      <div
        className="max-w-md w-full mx-auto space-y-3 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-3xl bg-slate-900/95 border border-white/15 p-4 sm:p-5 space-y-3.5 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 font-mono-num text-xs font-bold flex items-center justify-center shrink-0">
              1
            </div>
            <div className="text-xs leading-relaxed">
              <div className="font-semibold text-white">Open in Apple Safari</div>
              <p className="text-slate-300 mt-0.5">
                Open the app link inside <strong>Safari</strong> (in Chrome/preview, Add to Home Screen does not give full-screen mode).
              </p>
              <a
                href={shareableUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-[11px] font-semibold"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Open App in Safari</span>
              </a>
            </div>
          </div>

          <div className="flex items-start gap-3 pt-2 border-t border-white/10">
            <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 font-mono-num text-xs font-bold flex items-center justify-center shrink-0">
              2
            </div>
            <div className="text-xs leading-relaxed">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <span>Tap the Safari Share Button</span>
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-white/10 border border-white/20">
                  <Share className="w-3.5 h-3.5 text-sky-300" />
                </span>
              </div>
              <p className="text-slate-300 mt-0.5">
                Safari માં નીચે વચ્ચે <strong>Share (ચોરસમાં ઉપર તીર)</strong> આઇકન દબાવો.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 pt-2 border-t border-white/10">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono-num text-xs font-bold flex items-center justify-center shrink-0">
              3
            </div>
            <div className="text-xs leading-relaxed w-full">
              <div className="font-semibold text-white">Tap &ldquo;Add to Home Screen&rdquo; → &ldquo;Add&rdquo;</div>
              <div className="mt-2 p-2.5 rounded-2xl bg-white/[0.06] border border-white/15 flex items-center justify-between">
                <span className="text-xs font-medium text-white">Add to Home Screen</span>
                <PlusSquare className="w-4 h-4 text-sky-300" />
              </div>
              <p className="text-slate-300 mt-1.5">
                નીચે સ્ક્રોલ કરી <strong>Add to Home Screen</strong> પસંદ કરો અને ઉપર <strong>Add</strong> દબાવો.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Simulated iPhone Safari Bottom Toolbar Spotlight */}
      <div
        className="max-w-md w-full mx-auto space-y-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-2xl bg-slate-900/95 border border-white/20 px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs text-slate-400">‹</span>
          <span className="text-xs text-slate-400">›</span>
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/25 border-2 border-sky-400 flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.45)]">
              <Share className="w-5 h-5 text-sky-300" />
            </div>
            <span className="text-[10px] font-semibold text-sky-300 mt-1">Tap Share here</span>
          </div>
          <span className="text-xs text-slate-400">⊞</span>
          <span className="text-xs text-slate-400">tabs</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-white text-slate-950 text-xs font-bold active:scale-[0.98] transition-transform"
        >
          Got It, Close Guide
        </button>
      </div>
    </div>,
    document.body
  );
};

interface PWAInstallModalProps {
  open: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ open, onClose }) => {
  const { isInstallable, isIOS, install } = usePWAInstall();
  const [platformTab, setPlatformTab] = useState<InstallPlatformTab>(() =>
    typeof window !== 'undefined' ? detectDefaultInstallTab(window.navigator.userAgent) : 'pc'
  );
  const [copied, setCopied] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [showIOSOverlay, setShowIOSOverlay] = useState(false);

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }
  }, []);

  const shareableUrl =
    typeof window !== 'undefined'
      ? resolveShareableAppUrl(window.location.hostname, window.location.origin)
      : resolveShareableAppUrl();

  const pwaBuilderUrl = buildPwaBuilderUrl(shareableUrl);
  const currentSteps = getInstallGuideSteps(platformTab);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <GlassModal
        open={open}
        onClose={onClose}
        title="Download App & Store Ready"
        subtitle="iOS, Android, Windows, macOS & Play Store / App Store Packaging"
      >
        <div className="space-y-2.5 sm:space-y-3.5 text-xs sm:text-sm">
          {/* App Card Header + Primary Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 p-2.5 sm:p-3.5 rounded-2xl bg-slate-900/[0.045] dark:bg-white/[0.04]">
            <BrandLogo size="md" showText subtitle="Personal Diary & Life OS" />
            <div className="flex items-center gap-2 flex-wrap">
              {isInstallable ? (
                <button
                  type="button"
                  onClick={async () => {
                    const done = await install();
                    if (done) onClose();
                  }}
                  className="glass-button-primary px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold flex items-center justify-center gap-1.5 flex-1 sm:flex-none min-h-[36px] sm:min-h-[40px]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Install App Now</span>
                </button>
              ) : (
                <a
                  href={shareableUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-button-primary px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold flex items-center justify-center gap-1.5 flex-1 sm:flex-none min-h-[36px] sm:min-h-[40px]"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Standalone App</span>
                </a>
              )}
              <button
                type="button"
                onClick={handleCopyUrl}
                className="glass-button px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-medium flex items-center justify-center gap-1.5 min-h-[36px] sm:min-h-[40px]"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-[var(--success)]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {isInIframe && !isInstallable && (
            <div className="p-2.5 sm:p-3 rounded-2xl bg-amber-500/10 border border-amber-400/25 text-[11px] sm:text-xs space-y-0.5 sm:space-y-1">
              <div className="font-semibold text-amber-700 dark:text-amber-300">
                Standalone Install Tip (સીધી એપ ઇન્સ્ટોલ કરવા માટે)
              </div>
              <p className="text-[var(--text-secondary)] leading-snug sm:leading-relaxed">
                <strong>&ldquo;Open Standalone App&rdquo;</strong> દબાવી એપને અલગ ટેબમાં ખોલો (અથવા <strong>Copy Link</strong> કરો), પછી Safari (Share → Add to Home Screen) અથવા Chrome/Edge (Install ⊕) થી ઇન્સ્ટોલ કરો.
              </p>
            </div>
          )}

          {/* Platform Switcher */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-1.5 p-1 rounded-xl bg-slate-900/[0.045] dark:bg-white/[0.04]">
            <button
              type="button"
              onClick={() => setPlatformTab('pc')}
              className={`px-2 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap flex items-center justify-center gap-1.5 min-h-[34px] sm:min-h-[38px] ${
                platformTab === 'pc' ? 'glass-button-primary text-white' : 'text-[var(--text-secondary)]'
              }`}
            >
              <Laptop className="w-3.5 h-3.5 shrink-0" />
              <span>Win / Mac</span>
            </button>
            <button
              type="button"
              onClick={() => setPlatformTab('ios')}
              className={`px-2 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap flex items-center justify-center gap-1.5 min-h-[34px] sm:min-h-[38px] ${
                platformTab === 'ios' ? 'glass-button-primary text-white' : 'text-[var(--text-secondary)]'
              }`}
            >
              <Share className="w-3.5 h-3.5 shrink-0" />
              <span>iPhone / iOS</span>
            </button>
            <button
              type="button"
              onClick={() => setPlatformTab('exe')}
              className={`px-2 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap flex items-center justify-center gap-1.5 min-h-[34px] sm:min-h-[38px] ${
                platformTab === 'exe' ? 'glass-button-primary text-white' : 'text-[var(--text-secondary)]'
              }`}
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>Stores / .EXE</span>
            </button>
            <button
              type="button"
              onClick={() => setPlatformTab('android')}
              className={`px-2 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap flex items-center justify-center gap-1.5 min-h-[34px] sm:min-h-[38px] ${
                platformTab === 'android'
                  ? 'glass-button-primary text-white'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              <span>Android</span>
            </button>
          </div>

          {/* Step-by-step Guide Body */}
          <div className="space-y-2 sm:space-y-3 p-2.5 sm:p-4 rounded-2xl bg-slate-900/[0.04] dark:bg-white/[0.035]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold text-[var(--accent)] text-xs sm:text-sm">
                {platformTab === 'pc' && 'Windows (Chrome/Edge) & macOS (Safari Dock) Install'}
                {platformTab === 'ios' &&
                  `iPhone / iPad Safari Guide${isIOS ? ' · Detected' : ''}`}
                {platformTab === 'exe' && 'Play Store (.AAB), App Store (.IPA) & Windows (.MSIX)'}
                {platformTab === 'android' && 'Android Google Chrome Install Guide'}
              </div>

              {platformTab === 'ios' && (
                <button
                  type="button"
                  onClick={() => setShowIOSOverlay(true)}
                  className="glass-button-primary px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] font-semibold flex items-center gap-1.5 min-h-[32px]"
                >
                  <PlusSquare className="w-3.5 h-3.5" />
                  <span>Open iOS Visual Overlay</span>
                </button>
              )}
            </div>

            <div className="space-y-1.5 sm:space-y-2.5">
              {currentSteps.map((st) => (
                <div
                  key={st.step}
                  className="p-2 sm:p-3 rounded-xl bg-white/70 dark:bg-white/[0.04] flex items-start gap-2 sm:gap-2.5"
                >
                  <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] font-mono-num text-[10px] sm:text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {st.step}
                  </span>
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-[11.5px] sm:text-xs font-semibold text-[var(--text-primary)]">{st.title}</div>
                    <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] leading-snug sm:leading-relaxed">{st.detail}</p>
                    <p className="text-[10.5px] sm:text-[11px] text-[var(--success)] leading-snug sm:leading-relaxed">{st.gujarati}</p>
                  </div>
                </div>
              ))}
            </div>

            {platformTab === 'exe' && (
              <div className="pt-0.5 sm:pt-1 flex flex-wrap items-center gap-2">
                <a
                  href={pwaBuilderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-button-primary px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold inline-flex items-center gap-1.5 min-h-[36px]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Package in PWABuilder (Android/Win/iOS)</span>
                </a>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <a
              href="/RAA_DIARY_USE_KARVANI_RIT_GUJARATI.txt"
              download="RAA_DIARY_USE_KARVANI_RIT_GUJARATI.txt"
              className="glass-button px-3 py-1.5 sm:py-2 text-xs font-medium inline-flex items-center gap-1.5 min-h-[36px] sm:min-h-[40px]"
            >
              <FileText className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
              <span>ગુજરાતી ગાઇડ ડાઉનલોડ (.txt)</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="glass-button px-4 py-1.5 sm:py-2 text-xs font-semibold min-h-[36px] sm:min-h-[40px]"
            >
              Done
            </button>
          </div>
        </div>
      </GlassModal>

      <IOSAddToHomeOverlay
        open={showIOSOverlay}
        onClose={() => setShowIOSOverlay(false)}
        shareableUrl={shareableUrl}
      />
    </>
  );
};

interface PWAInstallButtonProps {
  compact?: boolean;
  iconOnlyOnMobile?: boolean;
  onOpenInstallGuide?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
  iconOnlyOnMobile = false,
  onOpenInstallGuide,
}) => {
  const { isInstallable, isInstalled } = usePWAInstall();
  const [guideOpen, setGuideOpen] = useState(false);

  const handleOpen = () => {
    if (onOpenInstallGuide) {
      onOpenInstallGuide();
    } else {
      setGuideOpen(true);
    }
  };

  if (isInstalled && compact) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Download App"
        title="Download App"
        className={`glass-button flex items-center justify-center gap-1.5 font-medium whitespace-nowrap active:scale-95 transition-transform ${
          iconOnlyOnMobile
            ? 'w-10 h-10 sm:w-auto sm:px-3.5 sm:h-10 text-xs'
            : compact
              ? 'min-w-[40px] min-h-[40px] px-2.5 text-xs'
              : 'px-3.5 py-2 text-xs min-h-[40px]'
        }`}
      >
        <Download className="w-4 h-4 text-[var(--accent)] shrink-0" />
        <span
          className={
            iconOnlyOnMobile
              ? 'hidden sm:inline'
              : compact
                ? 'hidden xl:inline'
                : ''
          }
        >
          {isInstallable ? 'Install App' : 'Download App'}
        </span>
      </button>

      {!onOpenInstallGuide && (
        <PWAInstallModal open={guideOpen} onClose={() => setGuideOpen(false)} />
      )}
    </>
  );
};
