import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-gpu','--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5 });
await page.goto('http://127.0.0.1:8137/index.html', { waitUntil: 'load' });
await page.waitForFunction(() => window.__scene && window.__scene.ready, null, { timeout: 30000 });
await page.waitForTimeout(2000);
await page.evaluate(() => window.__scene.pause());
await page.evaluate(() => { const A = window.__scene.acts[1]; window.__scene.seek(A.start + 0.9 * (A.end - A.start)); });
await page.waitForTimeout(500);
const setVis = (cfg) => page.evaluate((cfg) => {
  const st = window.__scene.stage;
  const all = { bg: st.bg && st.bg.group || st.bg, stars: st.stars.group, sun: st.sun.group, ship: st.ship.group, jupiter: st.jupiter.group, europa: st.europa.group, io: st.io.group, fleet: st.fleet.group };
  for (const k in all) if (all[k]) all[k].visible = cfg[k] !== false;
  const jc = st.jupiter.group.children;
  jc[0].visible = cfg.sphere !== false;
  jc[1].visible = cfg.atm !== false;
  jc[2].visible = cfg.port !== false;
  window.__scene.renderOnce && window.__scene.renderOnce();
}, cfg);
const cases = [
  ['onlyjup', { bg:false, stars:false, sun:false, ship:false, europa:false, io:false, fleet:false }],
  ['sphereport', { bg:false, stars:false, sun:false, ship:false, europa:false, io:false, fleet:false, atm:false }],
  ['atmport', { bg:false, stars:false, sun:false, ship:false, europa:false, io:false, fleet:false, sphere:false }],
  ['sphereatm', { bg:false, stars:false, sun:false, ship:false, europa:false, io:false, fleet:false, port:false }],
  ['sphereonly', { bg:false, stars:false, sun:false, ship:false, europa:false, io:false, fleet:false, atm:false, port:false }],
  ['atmonly', { bg:false, stars:false, sun:false, ship:false, europa:false, io:false, fleet:false, sphere:false, port:false }],
];
for (const [name, cfg] of cases) {
  await setVis(cfg);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `shots/showcase/_iso_${name}.png` });
}
await browser.close();
