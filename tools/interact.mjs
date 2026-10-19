import { chromium } from '/Users/jason/Library/pnpm/global/5/.pnpm/playwright-core@1.60.0/node_modules/playwright-core/index.mjs';
import path from 'path';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-gpu','--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('PAGEERR:', e.message));
await page.goto('file://' + path.resolve('自然选择号-全舰.html'));
await page.waitForFunction(() => window.__bow && window.__bow.ready);
await page.waitForTimeout(1500);

// FPS measure
const fps = await page.evaluate(() => new Promise(res => {
  let n = 0; const t0 = performance.now();
  function f() { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(f); else res((n / (performance.now() - t0) * 1000).toFixed(1)); }
  requestAnimationFrame(f);
}));
console.log('FPS', fps);

// hover pick at hull center-ish
await page.mouse.move(760, 500);
await page.waitForTimeout(200);
console.log('hover', await page.evaluate(() => window.__bow.state.hover));
// drag
const before = await page.evaluate(() => [window.__bow.cam.yaw, window.__bow.cam.pitch]);
await page.mouse.move(760, 500);
await page.mouse.down();
await page.mouse.move(900, 540, { steps: 12 });
await page.mouse.up();
const after = await page.evaluate(() => [window.__bow.cam.yaw, window.__bow.cam.pitch]);
console.log('drag', before.map(v=>v.toFixed(3)), '->', after.map(v=>v.toFixed(3)));
// wheel zoom
const d0 = await page.evaluate(() => window.__bow.cam.dist);
await page.mouse.wheel(0, -300);
await page.waitForTimeout(500);
const d1 = await page.evaluate(() => window.__bow.cam.dist);
console.log('wheel', d0.toFixed(2), '->', d1.toFixed(2));
// click select
await page.evaluate(() => window.__bow.setView(3.47, 0.43, 20.4, [6.10, 0.05, 0]));
await page.waitForTimeout(700);
await page.mouse.click(760, 480);
await page.waitForTimeout(200);
console.log('selected', await page.evaluate(() => window.__bow.state.sel));
await page.screenshot({ path: 'shots/int_after.png' });
await browser.close();
