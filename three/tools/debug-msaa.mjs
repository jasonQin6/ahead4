import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-gpu','--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5 });
await page.goto('http://127.0.0.1:8137/index.html', { waitUntil: 'load' });
await page.waitForFunction(() => window.__scene && window.__scene.ready, null, { timeout: 30000 });
await page.waitForTimeout(2000);
await page.evaluate(() => window.__scene.pause());
await page.evaluate(() => { const A = window.__scene.acts[1]; window.__scene.seek(A.start + 0.9 * (A.end - A.start)); });
await page.waitForTimeout(600);
// disable MSAA by swapping RT
const ok = await page.evaluate(() => {
  const st = window.__scene.stage;
  st._origRT = st.sceneRT;
  const proto = Object.getPrototypeOf(st.sceneRT);
  return { samples: st.sceneRT.samples, type: st.sceneRT.texture.type, isHalf: st.sceneRT.texture.type === 1016 };
});
console.log('rt:', JSON.stringify(ok));
await page.screenshot({ path: 'shots/showcase/_dbg_base.png' });
// try toggling atmosphere / port / jupiter shader uniform shadow
await page.evaluate(() => {
  const st = window.__scene.stage;
  st.jupiter.uniforms.uShadow.value = 0;
  st.jupiter.uniforms.uShadowDir.value.set(0,0,1);
  st.jupiter.uniforms.uEngineDir.value.set(-1,0,0);
});
await page.evaluate(() => window.__scene.renderOnce && window.__scene.renderOnce());
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/showcase/_dbg_shadow0.png' });
// hide atmosphere only
const kids = await page.evaluate(() => {
  const g = window.__scene.stage.jupiter.group;
  return g.children.map((c,i) => ({ i, type: c.type, geo: c.geometry && c.geometry.type, name: c.name, vis: c.visible }));
});
console.log('jupiter children:', JSON.stringify(kids));
for (const k of kids) {
  if (k.type !== 'Mesh') continue;
  await page.evaluate((i) => { window.__scene.stage.jupiter.group.children[i].visible = false; window.__scene.renderOnce && window.__scene.renderOnce(); }, k.i);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `shots/showcase/_dbg_child${k.i}.png` });
  await page.evaluate((i) => { window.__scene.stage.jupiter.group.children[i].visible = true; }, k.i);
}
await browser.close();
