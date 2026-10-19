import { chromium } from '/Users/jason/Library/pnpm/global/5/.pnpm/playwright-core@1.60.0/node_modules/playwright-core/index.mjs';
import path from 'path';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-gpu','--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('PAGEERR:', e.message));
await page.goto('file://' + path.resolve('自然选择号-全舰.html'));
await page.waitForFunction(() => window.__bow && window.__bow.ready);
await page.waitForTimeout(1500);
await page.evaluate(() => { window.__bow.togglePanel(false); window.__bow.setLabels(false); });
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/cur.png' });
const out = await page.evaluate(() => {
  const b = window.__bow, r = b.renderer, gl = r.gl;
  gl.bindFramebuffer(gl.FRAMEBUFFER, r.resFbo);
  const res = {};
  const pts = { whiteBlob: [1000, 150], white2: [700, 80], blackTop: [200, 700], topMid: [600, 700], midShip: [700, 420], belowPanel: [200, 200] };
  for (const [k, [x, y]] of Object.entries(pts)) {
    const px = new Uint8Array(4);
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    res[k] = Array.from(px);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return res;
});
console.log(JSON.stringify(out));
await browser.close();
