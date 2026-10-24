import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const chrome = process.env.CHROME_PATH ||
  (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' :
   process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' :
   '/usr/bin/google-chrome');

const shots = path.join(root, 'shots');
fs.mkdirSync(shots, { recursive: true });
const file = 'file://' + path.join(root, '自然选择号-全舰-three.html');
const errors = [];

const browser = await chromium.launch({
  executablePath: chrome,
  headless: true,
  args: ['--enable-gpu', '--use-angle=metal'],
});

const page = await browser.newPage({ viewport: { width: 1539, height: 984 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(file);
await page.waitForFunction(() => window.__ship && window.__ship.ready, null, { timeout: 20000 });
await page.waitForFunction(() => window.__ship.viewer.frames > 2, null, { timeout: 20000 });
await page.waitForTimeout(2600);

const stats = await page.evaluate(() => window.__ship.getStats());
const geometry = await page.evaluate(() => window.__ship.stats);

await page.screenshot({ path: path.join(shots, 'three_hero.png') });

// idle: no RAF once the intro settles
const idle0 = await page.evaluate(() => window.__ship.viewer.frames);
await page.waitForTimeout(1500);
const idle1 = await page.evaluate(() => window.__ship.viewer.frames);

// sustained auto-orbit frame rate
await page.evaluate(() => window.__ship.setAuto(true));
await page.waitForTimeout(700);
const fps0 = await page.evaluate(() => window.__ship.viewer.frames);
const t0 = Date.now();
await page.waitForTimeout(2000);
const fps1 = await page.evaluate(() => window.__ship.viewer.frames);
const autoFps = (fps1 - fps0) / ((Date.now() - t0) / 1000);
await page.evaluate(() => { window.__ship.setAuto(false); window.__ship.resetView(); });
await page.waitForTimeout(1600);

// exploded assembly
await page.evaluate(() => window.__ship.setExplode(0.82));
await page.waitForTimeout(1600);
await page.screenshot({ path: path.join(shots, 'three_explode.png') });

// dark space theme
await page.evaluate(() => { window.__ship.setExplode(0, true); window.__ship.setTheme('dark'); });
await page.waitForTimeout(1300);
await page.screenshot({ path: path.join(shots, 'three_dark.png') });

// performance overlay
await page.evaluate(() => window.__ship.togglePerf(true));
await page.waitForTimeout(650);
await page.screenshot({ path: path.join(shots, 'three_perf.png') });
await page.evaluate(() => window.__ship.togglePerf(false));

// CPU picking: project part 3, click its anchor
await page.evaluate(() => { window.__ship.setTheme('light'); window.__ship.setLabels(true); window.__ship.resetView(); });
await page.waitForTimeout(1500);
const anchor = await page.evaluate(() => window.__ship.viewer.projectAnchor(3));
const pickId = await page.evaluate(([x, y]) => window.__ship.pick(x, y), [anchor[0], anchor[1]]);
await page.mouse.click(anchor[0], anchor[1]);
await page.waitForTimeout(600);
const clickSelected = await page.evaluate(() => window.__ship.state.selected);
await page.evaluate(() => window.__ship.select(3));
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(shots, 'three_select.png') });

// focus the giant ring
await page.evaluate(() => window.__ship.focusPart(8));
await page.waitForTimeout(1700);
await page.screenshot({ path: path.join(shots, 'three_focus.png') });

// display stand on
await page.evaluate(() => {
  window.__ship.resetView();
  window.__ship.select(-1);
  window.__ship.setVisible(14, true);
});
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(shots, 'three_stand.png') });

// back to a stable idle and re-check
await page.waitForTimeout(1600);
const idle2 = await page.evaluate(() => window.__ship.viewer.frames);
await page.waitForTimeout(1200);
const idle3 = await page.evaluate(() => window.__ship.viewer.frames);

// narrow / mobile layout
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
mobile.on('pageerror', (e) => errors.push('mobile pageerror: ' + e.message));
mobile.on('console', (m) => { if (m.type() === 'error') errors.push('mobile console: ' + m.text()); });
await mobile.goto(file);
await mobile.waitForFunction(() => window.__ship && window.__ship.ready, null, { timeout: 20000 });
await mobile.waitForTimeout(2600);
const narrowStats = await mobile.evaluate(() => window.__ship.getStats());
await mobile.screenshot({ path: path.join(shots, 'three_narrow.png') });
await mobile.evaluate(() => document.getElementById('btnPanel').click());
await mobile.waitForTimeout(600);
await mobile.screenshot({ path: path.join(shots, 'three_narrow_panel.png') });

const report = {
  geometry: {
    buildMs: +geometry.buildMs.toFixed(1),
    rawVerts: geometry.rawVerts,
    uniqueVerts: geometry.uniqueVerts,
    triangles: geometry.triangles,
    rawBytes: geometry.rawBytes,
    packedBytes: geometry.packedBytes,
    packedMB: +(geometry.packedBytes / 1048576).toFixed(2),
  },
  desktop: {
    ...stats,
    idleFramesOver1500ms: idle1 - idle0,
    idleFramesAfterInteractions: idle3 - idle2,
    autoFps: +autoFps.toFixed(1),
    pickId,
    clickSelected,
  },
  mobile: { renderSize: narrowStats.renderSize, aoSize: narrowStats.aoSize, dpr: narrowStats.dpr, calls: narrowStats.calls, triangles: narrowStats.triangles },
  errors,
};
console.log(JSON.stringify(report, null, 2));
await browser.close();
