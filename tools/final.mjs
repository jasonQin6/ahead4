import { chromium } from '/Users/jason/Library/pnpm/global/5/.pnpm/playwright-core@1.60.0/node_modules/playwright-core/index.mjs';
import path from 'path';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-gpu','--use-angle=metal'] });
const file = 'file://' + path.resolve('自然选择号-全舰.html');
async function shot(w, h, name, fn) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.log('PAGEERR:', e.message));
  await page.goto(file);
  await page.waitForFunction(() => window.__bow && window.__bow.ready);
  await page.waitForTimeout(2800);
  if (fn) { await page.evaluate(fn); await page.waitForTimeout(1600); }
  await page.screenshot({ path: 'shots/' + name + '.png' });
  await page.close();
}
await shot(1539, 984, 'fin_light');
await shot(1539, 984, 'fin_dark', () => { window.__bow.setTheme('dark'); });
await shot(1280, 800, 'fin_1280');
await shot(1539, 984, 'fin_nose', () => { window.__bow.setView(3.75, 0.30, 9.5, [8.4, 0.0, 0]); window.__bow.setLabels(false); });
await shot(1539, 984, 'fin_ring', () => { window.__bow.setView(3.30, 0.30, 11.5, [2.45, 0.2, 0]); window.__bow.setLabels(false); });
await browser.close();
