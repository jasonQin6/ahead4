import { chromium } from '/Users/jason/Library/pnpm/global/5/.pnpm/playwright-core@1.60.0/node_modules/playwright-core/index.mjs';
import path from 'path';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-gpu','--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('PAGEERR:', e.message));
await page.goto('file://' + path.resolve('自然选择号-全舰.html'));
await page.waitForFunction(() => window.__bow && window.__bow.ready);
await page.waitForTimeout(1400);
const out = await page.evaluate(() => {
  const b = window.__bow, r = b.renderer, gl = r.gl;
  const pw = r.pw, ph = r.ph;
  const read = (fbo, x, y) => { gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); const p = new Uint8Array(4); gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, p); return Array.from(p); };
  const samples = {};
  // screen points over model: use CPU projection of known world points -> pick coords
  const pts = { hullFront: [5.6, 0.6, 0.4], hullMid: [4.6, 0.5, 0.5], ring: [2.42, 2.0, 0], sphere: [1.9, 0.5, 0.8], nose: [6.8, 0.2, 0.2] };
  for (const [k, p] of Object.entries(pts)) {
    const s = b.cam.project(p, innerWidth, innerHeight);
    if (!s) { samples[k] = null; continue; }
    const x = Math.round(s[0] / innerWidth * pw), y = Math.round((1 - s[1] / innerHeight) * ph);
    const pick = read(r.pickFbo, x, y);
    const depth = (pick[0] * 255 + pick[1] * 255 / 255) / 255 * 60;
    const ao = read(r.aoFbo2, x, y);
    samples[k] = { screen: [Math.round(s[0]), Math.round(s[1])], pick, depth: +depth.toFixed(2), ao: ao[0] };
  }
  return { pw, ph, samples, invProj: Array.from(b.cam.invProj).map(v=>+v.toFixed(3)), proj: Array.from(b.cam.proj).map(v=>+v.toFixed(3)), aoStr: b.state.aoStrength, aoRadius: b.state.aoRadius };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
