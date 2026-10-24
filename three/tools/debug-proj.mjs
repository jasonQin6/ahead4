import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-gpu','--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5 });
await page.goto('http://127.0.0.1:8137/index.html', { waitUntil: 'load' });
await page.waitForFunction(() => window.__scene && window.__scene.ready, null, { timeout: 30000 });
await page.waitForTimeout(1800);
await page.evaluate(() => window.__scene.pause());
for (const [act, p] of [[3, 0.2], [3, 0.8], [2, 0.72]]) {
  await page.evaluate(([a, pp]) => { const A = window.__scene.acts[a]; window.__scene.seek(A.start + pp * (A.end - A.start)); }, [act, p]);
  await page.waitForTimeout(400);
  const out = await page.evaluate(() => {
    const st = window.__scene.stage;
    const cam = st.camera;
    const v = st.europa.group.position.clone();
    const R = 1000;
    const jp = st.jupiter.group.position;
    const proj = (x, y, z) => {
      v.set(x, y, z).project(cam);
      return [Math.round((v.x * 0.5 + 0.5) * 2400), Math.round((-v.y * 0.5 + 0.5) * 1500)];
    };
    const res = {
      ship: proj(st.ship.group.position.x, st.ship.group.position.y, st.ship.group.position.z),
      jup: proj(jp.x, jp.y, jp.z),
      europa: proj(st.europa.group.position.x, st.europa.group.position.y, st.europa.group.position.z),
      io: proj(st.io.group.position.x, st.io.group.position.y, st.io.group.position.z),
      fleet: proj(jp.x - R*0.10, jp.y + R*1.28, jp.z - R*0.55),
      cand: {},
    };
    const cands = {
      a: [jp.x + R*0.30, jp.y + R*0.30, jp.z + R*0.60],
      b: [jp.x + R*0.55, jp.y + R*0.10, jp.z + R*0.75],
      c: [jp.x + R*0.20, jp.y - R*0.35, jp.z + R*0.85],
      d: [jp.x + R*0.70, jp.y + R*0.45, jp.z + R*0.40],
      e: [jp.x + R*0.95, jp.y + R*0.18, jp.z + R*0.85],
      f: [jp.x + R*0.05, jp.y + R*0.60, jp.z + R*0.95],
    };
    for (const k in cands) res.cand[k] = proj(...cands[k]);
    return res;
  });
  console.log('act' + act + ' p' + p, JSON.stringify(out));
}
await browser.close();
