import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-gpu','--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5 });
await page.goto('http://127.0.0.1:8137/index.html', { waitUntil: 'load' });
await page.waitForFunction(() => window.__scene && window.__scene.ready, null, { timeout: 30000 });
await page.waitForTimeout(2000);
await page.evaluate(() => window.__scene.pause());
await page.evaluate(() => { const A = window.__scene.acts[1]; window.__scene.seek(A.start + 0.9 * (A.end - A.start)); });
await page.waitForTimeout(500);
// 1. bloom off
await page.evaluate(() => { window.__scene.stage.compMat.uniforms.uBloomStrength.value = 0; window.__scene.renderOnce && window.__scene.renderOnce(); });
await page.waitForTimeout(250);
await page.screenshot({ path: 'shots/showcase/_p_nobloom.png' });
// 2. direct scene render to screen, then screenshot immediately in same task? renderer autoClear; take shot after
await page.evaluate(() => {
  const st = window.__scene.stage;
  st.compMat.uniforms.uBloomStrength.value = 0.7;
  const r = st.renderer;
  r.setRenderTarget(null);
  r.render(st.scene, st.camera);
});
await page.screenshot({ path: 'shots/showcase/_p_direct.png' });
// 3. MSAA off: recreate sceneRT with samples 0
const recreate = await page.evaluate(() => {
  const st = window.__scene.stage;
  const THREE = st.sceneRT.constructor; // not THREE
  return typeof st.sceneRT.samples;
});
console.log('rt samples type', recreate);
await browser.close();
