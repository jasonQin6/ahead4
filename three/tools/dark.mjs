import { chromium } from 'playwright-core';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--enable-gpu', '--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: 1539, height: 984 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto('file://' + path.join(root, '自然选择号-全舰-three.html'));
await page.waitForFunction(() => window.__ship && window.__ship.ready);
await page.waitForTimeout(2200);
await page.evaluate(() => window.__ship.setTheme('dark'));
await page.waitForTimeout(1400);
await page.screenshot({ path: path.join(root, 'shots/dark_tuned.png') });
console.log(await page.evaluate(() => window.__ship.getStats()));
await browser.close();
