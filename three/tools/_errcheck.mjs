import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-gpu','--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', e => console.log('PAGEERROR:', e.stack));
page.on('console', m => { if (m.type()==='error') console.log('CONSOLE:', m.text()); });
await page.goto('http://127.0.0.1:8137/index.html', { waitUntil: 'load' });
await page.waitForFunction(() => window.__scene && window.__scene.ready);
await page.evaluate(() => window.__scene.pause());
for (const p of [0.02, 0.14, 0.45]) {
  await page.evaluate((pp) => { const A = window.__scene.acts[2]; window.__scene.seek(A.start + pp * (A.end - A.start)); }, p);
  await page.waitForTimeout(500);
  console.log('p', p, await page.evaluate(() => window.__scene.show.getInfo().p));
}
await browser.close();
