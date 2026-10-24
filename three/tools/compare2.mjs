import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const [aPath, bPath, ...rest] = process.argv.slice(2);
const b64 = (p) => 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
const pts = rest.length ? rest.map((s) => s.split(',').map(Number)) : [[0.15, 0.45], [0.16, 0.52], [0.3, 0.45], [0.2, 0.8], [0.55, 0.6]];
const browser = await chromium.launch({ executablePath: chrome, headless: true });
const page = await browser.newPage();
const out = await page.evaluate(async ({ a, b, pts }) => {
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
    return { p: [x, y], a: [pa[0], pa[1], pa[2]], b: [pb[0], pb[1], pb[2]] };
  });
}, { a: b64(aPath), b: b64(bPath), pts });
console.log(path.basename(aPath), 'vs', path.basename(bPath));
for (const r of out) console.log(r.p.join(','), 'A', r.a.join(','), 'B', r.b.join(','));
await browser.close();
