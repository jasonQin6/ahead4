import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-gpu','--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5 });
await page.goto('http://127.0.0.1:8137/index.html', { waitUntil: 'load' });
await page.waitForFunction(() => window.__scene && window.__scene.ready, null, { timeout: 30000 });
await page.waitForTimeout(1600);
await page.evaluate(() => window.__scene.pause());
for (const act of [1,2,3]) for (const p of [0.15,0.5,0.85]) {
  await page.evaluate(([a, pp]) => { const A = window.__scene.acts[a]; window.__scene.seek(A.start + pp * (A.end - A.start)); }, [act,p]);
  await page.waitForTimeout(200);
  const out = await page.evaluate(() => {
    const st = window.__scene.stage, cam = st.camera;
    const v = st.europa.group.position.clone();
    const jp = st.jupiter.group.position.clone();
    const proj = (x,y,z) => { v.set(x,y,z).project(cam); return [Math.round((v.x*0.5+0.5)*2400), Math.round((-v.y*0.5+0.5)*1500)]; };
    return { jup: proj(jp.x,jp.y,jp.z), eu: proj(st.europa.group.position.x, st.europa.group.position.y, st.europa.group.position.z), io: proj(st.io.group.position.x, st.io.group.position.y, st.io.group.position.z) };
  });
  console.log('act'+act+' p'+p, JSON.stringify(out));
}
await browser.close();
