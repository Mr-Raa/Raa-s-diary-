import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPwaBuilderUrl,
  DEV_PREVIEW_URL,
  detectDefaultInstallTab,
  getInstallGuideSteps,
  resolveShareableAppUrl,
} from './installLogic';

test('resolveShareableAppUrl preserves live hosted origins and maps localhost to live preview URL', () => {
  assert.equal(resolveShareableAppUrl('localhost', 'http://localhost:3000'), DEV_PREVIEW_URL);
  assert.equal(resolveShareableAppUrl('127.0.0.1', 'http://127.0.0.1:3000'), DEV_PREVIEW_URL);
  assert.equal(
    resolveShareableAppUrl(
      'ais-dev-abc.asia-east1.run.app',
      'https://ais-dev-abc.asia-east1.run.app'
    ),
    'https://ais-dev-abc.asia-east1.run.app'
  );
  assert.equal(
    resolveShareableAppUrl(
      'ais-pre-custom.run.app',
      'https://ais-pre-custom.run.app'
    ),
    'https://ais-pre-custom.run.app'
  );
});

test('buildPwaBuilderUrl encodes site parameter cleanly', () => {
  const url = buildPwaBuilderUrl(DEV_PREVIEW_URL);
  assert.equal(
    url,
    `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(DEV_PREVIEW_URL)}`
  );
});

test('detectDefaultInstallTab picks iOS, Android, or PC desktop accurately', () => {
  assert.equal(
    detectDefaultInstallTab('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'),
    'ios'
  );
  assert.equal(
    detectDefaultInstallTab('Mozilla/5.0 (Linux; Android 14; Pixel 8)'),
    'android'
  );
  assert.equal(
    detectDefaultInstallTab('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0'),
    'pc'
  );
});

test('getInstallGuideSteps returns actionable 3-step guides for Windows & iOS', () => {
  const pcSteps = getInstallGuideSteps('pc');
  assert.equal(pcSteps.length, 3);
  assert.ok(pcSteps[1].detail.includes('Edge'));

  const iosSteps = getInstallGuideSteps('ios');
  assert.equal(iosSteps.length, 3);
  assert.ok(iosSteps[2].title.includes('Add to Home Screen'));

  const exeSteps = getInstallGuideSteps('exe');
  assert.equal(exeSteps.length, 3);
  assert.ok(exeSteps[1].title.includes('PWABuilder'));
});
