import { chromium } from '/Users/jason/Library/pnpm/global/5/.pnpm/playwright-core@1.60.0/node_modules/playwright-core/index.mjs';
import path from 'path';
const file = 'file://' + path.resolve('自然选择号-全舰.html');
const W = +(process.env.W || 1539), H = +(process.env.H || 984), DPR = +(process.env.DPR || 1);
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true, args: ['--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist']
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DPR });
page.on('console', m => { const t = m.text(); if (!t.includes('[bow]')) console.log('PAGE:', m.type(), t); });
page.on('pageerror', e => console.log('PAGEERR:', e.message));
await page.goto(file);
await page.waitForFunction(() => window.__bow && window.__bow.ready, { timeout: 20000 });
await page.waitForTimeout(2200);
const shots = JSON.parse(process.env.SHOTS || '[]');
if (!shots.length) {
  await page.screenshot({ path: 'shots/main.png' });
  console.log('shot shots/main.png');
} else {
  for (const s of shots) {
    await page.evaluate(s => {
      const b = window.__bow;
      if (s.theme) b.setTheme(s.theme);
      if (s.labels !== undefined) b.setLabels(s.labels);
      if (s.explode !== undefined) b.setExplode(s.explode, true);
      if (s.select !== undefined) b.select(s.select);
      if (s.panel !== undefined) b.togglePanel(s.panel);
      if (s.view) b.setView(s.view[0], s.view[1], s.view[2], s.view[3]);
      if (s.shift) b.setShift(s.shift[0], s.shift[1]);
    }, s);
    await page.waitForTimeout(s.wait || 900);
    await page.screenshot({ path: 'shots/' + s.name + '.png' });
    console.log('shot', s.name);
  }
}
await browser.close();
