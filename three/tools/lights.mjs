import { chromium } from 'playwright-core';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--enable-gpu', '--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: 1539, height: 984 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto('file://' + path.join(root, '自然选择号-全舰-three.html'));
await page.waitForFunction(() => window.__ship && window.__ship.ready);
await page.waitForTimeout(2200);

const sets = {
  b: { keyI: 3.0, fillI: 1.4, rimI: 1.5, hemiI: 2.0, env: 1.4 },
  c: { keyI: 2.2, fillI: 2.0, rimI: 1.4, hemiI: 3.0, env: 1.8 },
  d: { keyI: 2.0, fillI: 2.2, rimI: 1.2, hemiI: 2.2, env: 1.7 },
  e: { keyI: 2.6, fillI: 1.8, rimI: 1.4, hemiI: 2.4, env: 1.6, exposure: 0.9 },
  f: { keyI: 2.4, fillI: 2.0, rimI: 1.3, hemiI: 2.6, env: 2.0, exposure: 0.95 },
};
for (const [name, s] of Object.entries(sets)) {
  await page.evaluate((s) => {
    const v = window.__ship.viewer;
    Object.assign(v.cur, s);
    Object.assign(v.themeTarget, s);
    v.invalidate();
  }, s);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(root, `shots/light_${name}.png`) });
  console.log('shot', name);
}
await browser.close();
