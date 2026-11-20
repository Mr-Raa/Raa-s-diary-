export type InstallPlatformTab = 'pc' | 'exe' | 'ios' | 'android';

export const DEV_PREVIEW_URL = 'https://ais-dev-wvdiwvyynhbmc3epotyaqg-845783384775.asia-east1.run.app';
export const SHARED_APP_URL = 'https://ais-pre-wvdiwvyynhbmc3epotyaqg-845783384775.asia-east1.run.app';

/**
 * Resolves the best live URL for opening standalone or copying/packaging.
 * Preserves any hosted HTTPS origin (including active ais-dev-* preview hosts
 * and published ais-pre-* hosts) so clicking "Open Standalone App" never hits
 * a 404 on an unpublished ais-pre URL. Maps only local loopback origins to the
 * active cloud preview URL.
 */
export function resolveShareableAppUrl(
  hostname?: string,
  origin?: string,
  fallbackUrl: string = DEV_PREVIEW_URL
): string {
  if (!hostname || !origin) return fallbackUrl;
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
    return fallbackUrl;
  }
  return origin;
}

/**
 * Builds a direct Microsoft PWABuilder report-card URL pre-filled with the app URL
 * so Windows users can download an .msix / desktop installer in one click.
 */
export function buildPwaBuilderUrl(appUrl: string): string {
  const cleanUrl = appUrl.trim() || DEV_PREVIEW_URL;
  return `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(cleanUrl)}`;
}

/**
 * Detects the best default installation guide tab from the user agent string.
 */
export function detectDefaultInstallTab(userAgent: string): InstallPlatformTab {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'pc';
}

export interface InstallGuideStep {
  step: number;
  title: string;
  detail: string;
  gujarati: string;
}

/**
 * Returns structured step-by-step installation instructions for Windows Chrome/Edge
 * and iPhone/iPad Safari Add to Home Screen flows.
 */
export function getInstallGuideSteps(platform: InstallPlatformTab): InstallGuideStep[] {
  if (platform === 'ios') {
    return [
      {
        step: 1,
        title: 'Open in Apple Safari',
        detail: 'Open the standalone app link in Safari on your iPhone or iPad.',
        gujarati: 'લિંકને iPhone ના Safari બ્રાઉઝરમાં ખોલો.',
      },
      {
        step: 2,
        title: 'Tap the Share Icon',
        detail: 'Tap the Share button (square with upward arrow) on Safari bottom bar.',
        gujarati: 'Safari ના નીચેના બારમાં Share (□↑) બટન દબાવો.',
      },
      {
        step: 3,
        title: 'Tap "Add to Home Screen"',
        detail: 'Scroll down the share sheet and select Add to Home Screen, then tap Add.',
        gujarati: 'નીચે સ્ક્રોલ કરી "Add to Home Screen" અને પછી "Add" દબાવો.',
      },
    ];
  }

  if (platform === 'exe') {
    return [
      {
        step: 1,
        title: 'Deploy & Copy Permanent App URL',
        detail: 'Publish/Deploy the app once so it runs 24/7 even when Google AI Studio is closed, then copy the live HTTPS URL above.',
        gujarati: 'પહેલા એપને Deploy/Publish કરી કાયમી લિંક કોપી કરો (AI Studio બંધ હશે તો પણ ચાલશે).',
      },
      {
        step: 2,
        title: 'Build Store Packages with PWABuilder or Capacitor',
        detail: 'Use PWABuilder for Play Store (.AAB) + Windows (.MSIX) bundles, or run Capacitor (capacitor.config.json included) for Apple App Store (.IPA) in Xcode.',
        gujarati: 'PWABuilder થી Android Play Store (.AAB) અને Windows (.MSIX), તથા Capacitor/Xcode થી Apple App Store (.IPA) બનાવો.',
      },
      {
        step: 3,
        title: 'Upload to Play Console & App Store Connect',
        detail: 'Submit the signed .AAB to Google Play Console, .IPA to Apple App Store Connect, or run the Windows installer directly on PC.',
        gujarati: 'તૈયાર ફાઈલ Play Store, App Store પર અપલોડ કરો અથવા PC માં સીધી ઇન્સ્ટોલ કરો.',
      },
    ];
  }

  if (platform === 'android') {
    return [
      {
        step: 1,
        title: 'Open in Google Chrome',
        detail: 'Open the live standalone app link inside Google Chrome on your Android phone.',
        gujarati: 'લિંકને Android ફોનના Google Chrome માં ખોલો.',
      },
      {
        step: 2,
        title: 'Tap Chrome Menu (⋮)',
        detail: 'Tap the three dots menu at the top right corner of Chrome.',
        gujarati: 'Chrome માં ઉપર જમણી બાજુ ⋮ (3 ટપકાં) દબાવો.',
      },
      {
        step: 3,
        title: 'Tap "Install app"',
        detail: 'Confirm Install — Raa’s Diary appears on your Home Screen and works independently.',
        gujarati: 'Install app દબાવી Confirm કરો — હોમ સ્ક્રીન પર અસલી એપ બની જશે.',
      },
    ];
  }

  return [
    {
      step: 1,
      title: 'Open in Chrome, Edge, or macOS Safari',
      detail: 'Click Open Standalone App above so Raa’s Diary opens in its own top-level browser tab.',
      gujarati: 'Windows માં Chrome/Edge અથવા Mac માં Safari/Chrome માં Open Standalone App ખોલો.',
    },
    {
      step: 2,
      title: 'Click Install (⊕) or Mac Safari "Add to Dock"',
      detail: 'In Chrome click Install (⊕) or ⋮ → Save and share → Install; in Edge click Apps → Install this site as an app; on macOS Safari click File → Add to Dock.',
      gujarati: 'Chrome/Edge માં Install (⊕) દબાવો, અથવા Mac Safari માં File → Add to Dock પસંદ કરો.',
    },
    {
      step: 3,
      title: 'Pin to Windows Taskbar or macOS Dock',
      detail: 'Launches in its own borderless native-feeling desktop window even when Google AI Studio is closed.',
      gujarati: 'Windows Desktop/Taskbar અથવા Mac Dock માં અસલી એપ તરીકે હંમેશા ચાલશે.',
    },
  ];
}
