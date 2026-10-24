import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const shotDir = path.join(root, 'shots', 'showcase');
fs.mkdirSync(shotDir, { recursive: true });

const chrome = process.env.CHROME_PATH ||
  (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' :
   process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' :
   '/usr/bin/google-chrome');

const url = process.env.URL || 'http://127.0.0.1:8137/index.html';
const errors = [];
const browser = await chromium.launch({
  executablePath: chrome,
  headless: true,
  args: ['--enable-gpu', '--use-angle=metal'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5 });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => window.__scene && window.__scene.ready, null, { timeout: 30000 });
await page.waitForTimeout(2200);

const shots = [
  ['act0_a', 0, 0.10],
  ['act0_b', 0, 0.55],
  ['act0_c', 0, 0.90],
  ['act1_a', 1, 0.15],
  ['act1_b', 1, 0.55],
  ['act1_c', 1, 0.90],
  ['act2_a', 2, 0.02],
  ['act2_b', 2, 0.14],
  ['act2_c', 2, 0.45],
  ['act2_d', 2, 0.72],
  ['act2_e', 2, 0.95],
  ['act3_a', 3, 0.20],
  ['act3_b', 3, 0.80],
];

await page.evaluate(() => window.__scene.pause());
for (const [name, act, p] of shots) {
  await page.evaluate(([a, pp]) => { const A = window.__scene.acts[a]; window.__scene.seek(A.start + pp * (A.end - A.start)); }, [act, p]);
  await page.waitForTimeout(650);
  await page.screenshot({ path: path.join(shotDir, name + '.png') });
}

const info = await page.evaluate(() => ({
  stats: window.__scene.stage ? {
    W: window.__scene.stage.W, H: window.__scene.stage.H,
    calls: window.__scene.stage.renderer.info.render.calls,
    tris: window.__scene.stage.renderer.info.render.triangles,
  } : null,
}));
console.log(JSON.stringify({ info, errors }, null, 2));

await browser.close();
