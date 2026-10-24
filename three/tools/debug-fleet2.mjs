import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-gpu','--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5 });
await page.goto('http://127.0.0.1:8137/index.html', { waitUntil: 'load' });
await page.waitForFunction(() => window.__scene && window.__scene.ready, null, { timeout: 30000 });
await page.waitForTimeout(1800);
await page.evaluate(() => window.__scene.pause());
for (const p of [0.2, 0.5, 0.8, 1.0]) {
  await page.evaluate((pp) => { const A = window.__scene.acts[3]; window.__scene.seek(A.start + pp * (A.end - A.start)); }, p);
  await page.waitForTimeout(300);
  const out = await page.evaluate(() => {
    const st = window.__scene.stage;
    const cam = st.camera;
    const v = st.europa.group.position.clone();
    const jp = st.jupiter.group.position.clone();
    const ship = st.ship.group.position;
    const proj = (x,y,z) => { v.set(x,y,z).project(cam); return [Math.round((v.x*0.5+0.5)*2400), Math.round((-v.y*0.5+0.5)*1500)]; };
    const fleet = st.fleet.group.children.map(s => proj(s.position.x, s.position.y, s.position.z));
    // estimate planet screen radius: project a point offset by R on camera-right
    const R = 1000;
    const right = cam.position.clone().sub(jp).cross(cam.up).normalize();
    const edge = proj(jp.x + right.x*R, jp.y + right.y*R, jp.z + right.z*R);
    return { jup: proj(jp.x,jp.y,jp.z), edge, ship: proj(ship.x,ship.y,ship.z), fleet };
  });
  console.log('p'+p, JSON.stringify(out));
}
await browser.close();
