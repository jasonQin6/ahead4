import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-gpu','--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5 });
await page.goto('http://127.0.0.1:8137/index.html', { waitUntil: 'load' });
await page.waitForFunction(() => window.__scene && window.__scene.ready, null, { timeout: 30000 });
await page.waitForTimeout(1800);
await page.evaluate(() => window.__scene.pause());
for (const [act, p] of [[3, 0.2], [3, 0.8]]) {
  await page.evaluate(([a, pp]) => { const A = window.__scene.acts[a]; window.__scene.seek(A.start + pp * (A.end - A.start)); }, [act, p]);
  await page.waitForTimeout(500);
  const out = await page.evaluate(() => {
    const st = window.__scene.stage;
    const cam = st.camera;
    const v = st.europa.group.position.clone();
    return st.fleet.group.children.map(s => {
      v.copy(s.position).project(cam);
      return {
        px: Math.round((v.x*0.5+0.5)*2400), py: Math.round((-v.y*0.5+0.5)*1500), z: +v.z.toFixed(3),
        op: +s.material.opacity.toFixed(2), sc: s.scale.x,
        dist: Math.round(st.camera.position.distanceTo(s.position)),
      };
    }).concat([{ visible: st.fleet.group.visible }]);
  });
  console.log('act'+act+' p'+p, JSON.stringify(out));
}
await browser.close();
