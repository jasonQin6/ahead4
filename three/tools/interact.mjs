import { chromium } from 'playwright-core';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--enable-gpu', '--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: 1539, height: 984 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('file://' + path.join(root, '自然选择号-全舰-three.html'));
await page.waitForFunction(() => window.__ship && window.__ship.ready);
await page.waitForTimeout(2600);

const results = [];
const check = (name, ok, extra) => { results.push({ name, ok: !!ok, extra }); console.log(ok ? 'PASS' : 'FAIL', name, extra ?? ''); };
const S = () => page.evaluate(() => {
  const v = window.__ship.state;
  return {
    selected: v.selected, hovered: v.hovered, visible: v.visible.slice(),
    explodeTarget: v.explodeTarget, auto: v.auto, distGoal: v.distGoal, yaw: v.yaw,
    targetX: v.targetGoal.x, targetY: v.targetGoal.y, targetZ: v.targetGoal.z,
    roll: v.roll, renderSize: [v.W, v.H], css: [v.cssW, v.cssH],
    labelsOn: document.getElementById('btnLabels').classList.contains('on'),
    perfOn: document.getElementById('perf').classList.contains('on'),
    panelOpen: document.getElementById('panel').classList.contains('open'),
    dark: document.body.classList.contains('dark'),
    panelDisplay: document.getElementById('panel').style.display,
  };
});

// theme
await page.click('#themeBtn');
await page.waitForTimeout(250);
check('theme button -> dark', (await S()).dark);
await page.click('#themeSeg [data-theme="light"]');
await page.waitForTimeout(250);
check('theme segment -> light', !(await S()).dark);

// part list selection + eye
await page.click('.row:nth-of-type(5)');
check('row click selects part 5', (await S()).selected === 4);
check('detail shows part 5', (await page.textContent('#detail .dname')).includes('左舷吊舱'));
await page.click('.row:nth-of-type(5) .eye');
let s = await S();
check('eye hides part 5', s.visible[4] === false);
check('hidden row dimmed', await page.evaluate(() => document.querySelectorAll('.row')[4].classList.contains('hid')));
await page.click('.row:nth-of-type(5) .eye');
s = await S();
check('eye restores part 5', s.visible[4] === true);

// keyboard
await page.evaluate(() => document.activeElement && document.activeElement.blur());
await page.keyboard.press('e');
await page.waitForTimeout(200);
check('E explodes', (await S()).explodeTarget > 0.5);
await page.keyboard.press('e');
check('E assembles', (await S()).explodeTarget === 0);
await page.keyboard.press(' ');
check('Space starts auto-orbit', (await S()).auto);
await page.keyboard.press(' ');
check('Space stops auto-orbit', !(await S()).auto);
const labelsBefore = (await S()).labelsOn;
await page.keyboard.press('l');
check('L toggles labels', (await S()).labelsOn !== labelsBefore);
await page.keyboard.press('l');
await page.keyboard.press('p');
check('P opens perf overlay', (await S()).perfOn);
await page.keyboard.press('p');
check('P closes perf overlay', !(await S()).perfOn);

// wheel zoom
const d0 = (await S()).distGoal;
await page.mouse.move(900, 500);
await page.mouse.wheel(0, -420);
await page.waitForTimeout(150);
const d1 = (await S()).distGoal;
check('wheel zooms in', d1 < d0, `${d0.toFixed(2)} -> ${d1.toFixed(2)}`);

// drag orbit
await page.evaluate(() => window.__ship.resetView());
await page.waitForTimeout(1200);
const y0 = (await S()).yaw;
await page.mouse.move(1000, 500);
await page.mouse.down();
await page.mouse.move(1140, 525, { steps: 6 });
await page.mouse.up();
const y1 = (await S()).yaw;
check('drag orbits the camera', Math.abs(y1 - y0) > 0.3, `${y0.toFixed(2)} -> ${y1.toFixed(2)}`);

// hover + double-click focus
await page.evaluate(() => window.__ship.resetView());
await page.waitForTimeout(1300);
const a = await page.evaluate(() => window.__ship.viewer.projectAnchor(3));
await page.mouse.move(20, 20);
await page.waitForTimeout(100);
await page.mouse.move(a[0], a[1]);
await page.waitForTimeout(150);
check('hover picks part 3', (await S()).hovered === 3, `anchor ${a[0].toFixed(0)},${a[1].toFixed(0)}`);
await page.mouse.move(20, 20);
await page.mouse.dblclick(a[0], a[1]);
await page.waitForTimeout(500);
s = await S();
check('double-click selects part 3', s.selected === 3);
const focusX = await page.evaluate(() => window.__ship.PARTS[3].anchor[0]);
check('double-click focuses part 3', Math.abs(s.targetX - focusX) < 0.05, `${s.targetX.toFixed(3)} vs ${focusX.toFixed(3)}`);
await page.keyboard.press('Escape');
check('Escape clears selection', (await S()).selected === -1);

// panel hide/show
await page.keyboard.press('h');
check('H hides the panel', (await S()).panelDisplay === 'none');
await page.keyboard.press('h');
check('H shows the panel', (await S()).panelDisplay === '');

// breakpoints
await page.setViewportSize({ width: 900, height: 700 });
await page.waitForTimeout(600);
s = await S();
check('resize updates canvas', s.css[0] === 900 && s.css[1] === 700, s.renderSize);
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(700);
s = await S();
check('narrow breakpoint rolls the camera', Math.abs(s.roll + 1.3) < 0.01, s.roll);
await page.click('#btnPanel');
s = await S();
check('narrow panel opens', s.panelOpen);
await page.click('#btnPanel');
check('narrow panel closes', !(await S()).panelOpen);

// idle after everything settles
await page.setViewportSize({ width: 1539, height: 984 });
await page.waitForTimeout(2200);
const f0 = await page.evaluate(() => window.__ship.state.frames);
await page.waitForTimeout(1200);
const f1 = await page.evaluate(() => window.__ship.state.frames);
check('renders stop when idle', f1 === f0, `${f1 - f0} frames`);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
console.log('errors', errors);
await browser.close();
if (failed.length) process.exitCode = 1;
