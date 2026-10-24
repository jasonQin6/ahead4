import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const chrome = process.env.CHROME_PATH ||
  (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/google-chrome');
const b64 = (p) => 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
const a = b64(path.resolve(root, '../shots/final_hero.png'));
const b = b64(path.join(root, 'shots/smoke.png'));

const browser = await chromium.launch({ executablePath: chrome, headless: true });
const page = await browser.newPage();
const pts = [[0.60,0.33],[0.62,0.30],[0.75,0.40],[0.70,0.55],[0.35,0.10],[0.50,0.95],[0.55,0.30],[0.78,0.30],[0.62,0.28],[0.66,0.47],[0.90,0.20],[0.05,0.5]];
const out = await page.evaluate(async ({a, b, pts}) => {
  const load = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = src; });
  const [ia, ib] = await Promise.all([load(a), load(b)]);
  const draw = (im) => {
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0); return c;
  };
  const ca = draw(ia), cb = draw(ib);
  const ga = ca.getContext('2d'), gb = cb.getContext('2d');
  return pts.map(([x, y]) => {
    const pa = ga.getImageData(Math.round(ca.width * x), Math.round(ca.height * y), 1, 1).data;
    const pb = gb.getImageData(Math.round(cb.width * x), Math.round(cb.height * y), 1, 1).data;
    return { p: [x, y], orig: [pa[0], pa[1], pa[2]], next: [pb[0], pb[1], pb[2]] };
  });
}, {a, b, pts});
console.log('orig size / new size: see images');
for (const r of out) console.log(r.p.join(','), 'orig', r.orig.join(','), 'new', r.next.join(','));
await browser.close();
