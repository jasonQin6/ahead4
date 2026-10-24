import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-gpu','--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5 });
await page.goto('http://127.0.0.1:8137/index.html', { waitUntil: 'load' });
await page.waitForFunction(() => window.__scene && window.__scene.ready, null, { timeout: 30000 });
await page.waitForTimeout(2000);
await page.evaluate(() => window.__scene.pause());
await page.evaluate(() => { const A = window.__scene.acts[1]; window.__scene.seek(A.start + 0.9 * (A.end - A.start)); });
await page.waitForTimeout(600);
const names = await page.evaluate(() => {
  const st = window.__scene.stage;
  return ['bg','stars','sun','ship','jupiter','europa','io','fleet','port','moonLight'].filter(n => st[n] && st[n].group).concat(['hemi','sunLight','rimLight','cameraFill']);
});
console.log('groups:', names.join(','));
for (let i = 0; i < names.length; i++) {
  const n = names[i];
  const ok = await page.evaluate((n) => {
    const st = window.__scene.stage;
    const o = st[n] && (st[n].group || st[n]);
    if (!o) return false;
    o.visible = false;
    return true;
  }, n);
  if (!ok) { console.log('skip', n); continue; }
  await page.evaluate(() => window.__scene.renderOnce && window.__scene.renderOnce());
  await page.waitForTimeout(250);
  await page.screenshot({ path: `shots/showcase/_hide_${i}_${n}.png` });
  await page.evaluate((n) => {
    const st = window.__scene.stage;
    const o = st[n] && (st[n].group || st[n]);
    if (o) o.visible = true;
  }, n);
  console.log('shot', n);
}
await browser.close();
