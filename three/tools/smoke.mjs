import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const chrome = process.env.CHROME_PATH ||
  (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' :
   process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' :
   '/usr/bin/google-chrome');

fs.mkdirSync(path.join(root, 'shots'), { recursive: true });
const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--enable-gpu', '--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: 1539, height: 984 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto('file://' + path.join(root, '自然选择号-全舰-three.html'));
await page.waitForFunction(() => window.__ship && window.__ship.ready, null, { timeout: 15000 });
await page.waitForTimeout(2500);
console.log('stats', await page.evaluate(() => window.__ship.getStats()));
console.log('errors', errors);
await page.screenshot({ path: path.join(root, 'shots/smoke.png') });
await browser.close();
