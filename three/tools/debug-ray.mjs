import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-gpu','--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5 });
await page.goto('http://127.0.0.1:8137/index.html', { waitUntil: 'load' });
await page.waitForFunction(() => window.__scene && window.__scene.ready, null, { timeout: 30000 });
await page.waitForTimeout(2000);
await page.evaluate(() => window.__scene.pause());
await page.evaluate(() => { const A = window.__scene.acts[1]; window.__scene.seek(A.start + 0.9 * (A.end - A.start)); });
await page.waitForTimeout(600);
const out = await page.evaluate(() => {
  const stage = window.__scene.stage;
  const THREE = stage.THREE || window.THREE;
  const scene = stage.scene;
  const cam = stage.camera;
  const ndc = new THREE.Vector2((1829/2400)*2-1, -((849/1500)*2-1));
  const rc = new THREE.Raycaster();
  rc.setFromCamera(ndc, cam);
  const hits = rc.intersectObjects(scene.children, true);
  return hits.slice(0, 8).map(h => {
    const o = h.object;
    const names = [];
    let p = o;
    while (p) { names.push(p.name || p.type); p = p.parent; }
    return { dist: h.distance.toFixed(1), type: o.type, geo: o.geometry && o.geometry.type, mat: o.material && o.material.type, color: o.material && o.material.color && o.material.color.getHexString(), path: names.join(' < ') };
  });
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
