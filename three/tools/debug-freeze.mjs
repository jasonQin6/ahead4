import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-gpu','--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5 });
await page.goto('http://127.0.0.1:8137/index.html', { waitUntil: 'load' });
await page.waitForFunction(() => window.__scene && window.__scene.ready, null, { timeout: 30000 });
await page.waitForTimeout(2000);
await page.evaluate(() => window.__scene.pause());
await page.evaluate(() => { const A = window.__scene.acts[1]; window.__scene.seek(A.start + 0.9 * (A.end - A.start)); });
await page.waitForTimeout(400);
// freeze state so visibilities are not reset
const frozen = await page.evaluate(() => {
  const sh = window.__scene.show;
  const st = sh.apply(window.__scene.time, 0.016);
  window.__state = st;
  sh.apply = () => st;
  return { throttle: st.throttle, act: st.act && st.act.id };
});
console.log('frozen:', JSON.stringify(frozen));
await page.waitForTimeout(400);
const list = await page.evaluate(() => {
  const st = window.__scene.stage;
  const out = [];
  const push = (label, obj) => { if (obj) out.push({ label, uuid: obj.uuid }); };
  push('bg', st.bg && (st.bg.group || st.bg));
  push('stars', st.stars.group); push('sun', st.sun.group); push('ship', st.ship.group);
  push('jupiter', st.jupiter.group); push('europa', st.europa.group); push('io', st.io.group); push('fleet', st.fleet.group);
  push('jup.sphere', st.jupiter.group.children[0]);
  push('jup.atm', st.jupiter.group.children[1]);
  push('port', st.jupiter.group.children[2]);
  return out;
});
const shot = async (name) => { await page.waitForTimeout(220); await page.screenshot({ path: `shots/showcase/_fz_${name}.png` }); };
await shot('base');
for (const it of list) {
  await page.evaluate((it) => {
    const st = window.__scene.stage;
    const all = [];
    st.scene.traverse(o => all.push(o));
    const o = all.find(o => o.uuid === it.uuid);
    if (o) { o.visible = false; window.__hidden = o; }
  }, it);
  await shot('no_' + it.label.replace('.', '_'));
  await page.evaluate(() => { if (window.__hidden) window.__hidden.visible = true; });
}
await browser.close();
