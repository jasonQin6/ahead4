import { chromium } from '/Users/jason/Library/pnpm/global/5/.pnpm/playwright-core@1.60.0/node_modules/playwright-core/index.mjs';
import path from 'path';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-gpu','--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: 1539, height: 984 }, deviceScaleFactor: 1 });
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0,200)); });
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
await page.goto('file://' + path.resolve('自然选择号-全舰.html'));
await page.waitForFunction(() => window.__bow && window.__bow.ready);
await page.waitForTimeout(3000);
const st = await page.evaluate(() => ({ labels: document.querySelectorAll('.lbl.on').length, items: document.querySelectorAll('.row').length, shift: window.__bow.cam.shiftX }));
// hover and click a few parts
const hover = [];
for (const [x, y] of [[760, 470], [900, 500], [1180, 450], [520, 430]]) {
  await page.mouse.move(x, y);
  await page.waitForTimeout(120);
  hover.push(await page.evaluate(() => window.__bow.state.hover));
}
// click fork
await page.mouse.click(520, 430);
await page.waitForTimeout(300);
const sel = await page.evaluate(() => window.__bow.state.sel);
// explode via button and slider
await page.click('#btnExplode');
await page.waitForTimeout(1000);
await page.evaluate(() => { const s = document.querySelector('#explode'); s.value = 55; s.dispatchEvent(new Event('input')); });
await page.waitForTimeout(900);
const e = await page.evaluate(() => window.__bow.state.explodeTarget);
// theme button
await page.click('#themeBtn');
await page.waitForTimeout(900);
const dark = await page.evaluate(() => document.body.classList.contains('dark'));
await page.click('#themeBtn');
await page.waitForTimeout(500);
// reset
await page.click('#btnReset');
await page.waitForTimeout(900);
await page.screenshot({ path: 'shots/qa2.png' });
console.log(JSON.stringify({ st, hover, sel, e, dark, errs }));
await browser.close();
