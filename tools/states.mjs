import { chromium } from '/Users/jason/Library/pnpm/global/5/.pnpm/playwright-core@1.60.0/node_modules/playwright-core/index.mjs';
import path from 'path';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-gpu','--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: 1539, height: 984 }, deviceScaleFactor: 1 });
page.on('console', m => { if (!m.text().includes('[bow]')) console.log('PAGE:', m.text().slice(0,200)); });
page.on('pageerror', e => console.log('PAGEERR:', e.message));
await page.goto('file://' + path.resolve('自然选择号-全舰.html'));
await page.waitForFunction(() => window.__bow && window.__bow.ready);
await page.waitForTimeout(2400);
// explode
await page.evaluate(() => window.__bow.setExplode(1, true));
await page.waitForTimeout(900);
await page.screenshot({ path: 'shots/st_explode.png' });
// dark theme
await page.evaluate(() => { window.__bow.setExplode(0, true); window.__bow.setTheme('dark'); });
await page.waitForTimeout(1200);
await page.screenshot({ path: 'shots/st_dark.png' });
// select part
await page.evaluate(() => { window.__bow.setTheme('light'); window.__bow.select(3); });
await page.waitForTimeout(1200);
await page.screenshot({ path: 'shots/st_select.png' });
// focus part 8
await page.evaluate(() => window.__bow.focusPart(8));
await page.waitForTimeout(1500);
await page.screenshot({ path: 'shots/st_focus8.png' });
await browser.close();
