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
  l0: { lift: 0.0, ao: 0.85 },
  l1: { lift: 0.02, ao: 0.85 },
  l2: { lift: 0.04, ao: 0.85 },
  l3: { lift: 0.06, ao: 0.85 },
  l4: { lift: 0.04, ao: 0.55 },
  l5: { lift: 0.06, ao: 0.55 },
};
for (const [name, s] of Object.entries(sets)) {
  await page.evaluate((s) => {
    const v = window.__ship.viewer;
    v.compMat.uniforms.uLift.value = s.lift;
    v.cur.ao = s.ao;
    v.themeTarget.ao = s.ao;
    v.invalidate();
  }, s);
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(root, `shots/lift_${name}.png`), clip: { x: 860, y: 300, width: 500, height: 340 } });
  console.log('shot', name);
}
await browser.close();
