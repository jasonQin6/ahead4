import { buildShipGeometries } from '../geometry.js';
import { Stage } from './stage.js';
import { Show, ACTS, TOTAL } from './show.js';

const $ = (s) => document.querySelector(s);
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const NARROW = window.matchMedia('(max-width: 860px)');

const boot = $('#boot');
const canvas = $('#gl');
const dipEl = $('#dip');
const fillEl = $('#fill');
const clockEl = $('#clock');
const thrEl = $('#thr');
const statusEl = $('#status');
const playBtn = $('#play');
const timeline = $('#timeline');
const caption = $('#caption');
const chapEl = $('#chap');
const titleEl = $('#title');
const quoteEl = $('#quote');
const noteEl = $('#note');
const readoutsEl = $('#readouts');
const actsEl = $('#acts');
const hint = $('#hint');

let stage, show;
try {
  const geometries = buildShipGeometries().geometries;
  stage = new Stage(canvas, geometries, {
    mobile: NARROW.matches,
    reduceMotion: REDUCED,
  });
  show = new Show(stage);
} catch (err) {
  console.error(err);
  boot.innerHTML = '<div class="b1">WEBGL2 REQUIRED</div><div class="b2">当前浏览器无法建立三维场景</div>';
  boot.classList.add('failed');
  throw err;
}

let time = REDUCED ? 0.45 : 0.22;
let playing = !REDUCED;
let lastNow = performance.now();
let lastClock = '';
let currentAct = -1;
let scrubbing = false;
let firstFrame = true;
let hintTimer = 0;

// ---------------------------------------------------------------- captions
const actButtons = [...actsEl.querySelectorAll('button')];
const marks = $('#marks');
ACTS.forEach((a, i) => {
  const b = document.createElement('b');
  b.textContent = a.no;
  b.style.left = (a.start / TOTAL * 100) + '%';
  marks.appendChild(b);
  if (i > 0) {
    const tick = document.createElement('i');
    tick.style.left = (a.start / TOTAL * 100) + '%';
    marks.appendChild(tick);
  }
});

function renderAct(a) {
  currentAct = a.id;
  chapEl.textContent = a.chapter;
  titleEl.textContent = a.title;
  quoteEl.textContent = a.quote;
  noteEl.textContent = a.note;
  readoutsEl.innerHTML = a.readouts.map(([k, v]) =>
    '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>').join('');
  actButtons.forEach((b, i) => {
    const on = i === a.id;
    b.classList.toggle('on', on);
    b.setAttribute('aria-current', on ? 'true' : 'false');
  });
}

// ---------------------------------------------------------------- controls
function setPlaying(on) {
  playing = !!on;
  playBtn.classList.toggle('is-paused', !playing);
  playBtn.setAttribute('aria-label', playing ? '暂停' : '播放');
  statusEl.textContent = playing ? 'PLAYING' : 'PAUSED';
}

function seek(t, opts = {}) {
  time = ((t % TOTAL) + TOTAL) % TOTAL;
  if (opts.fromScrub) hideHint(true);
}
function seekAct(i) {
  const a = ACTS[(i + ACTS.length) % ACTS.length];
  seek(a.start + 0.04);
  if (show.actIndex === a.id) renderAct(a);
}

playBtn.onclick = () => setPlaying(!playing);
$('#prev').onclick = () => {
  const a = show.act;
  const p = (time - a.start) / (a.end - a.start);
  seekAct(p > 0.16 ? a.id : a.id - 1);
};
$('#next').onclick = () => seekAct(show.actIndex + 1);
actButtons.forEach((b, i) => { b.onclick = () => seekAct(i); });

timeline.addEventListener('pointerdown', (e) => {
  scrubbing = true;
  timeline.setPointerCapture(e.pointerId);
  hideHint(true);
  seekAtPointer(e);
});
timeline.addEventListener('pointermove', (e) => { if (scrubbing) seekAtPointer(e); });
function endScrub(e) {
  if (!scrubbing) return;
  scrubbing = false;
  try { timeline.releasePointerCapture(e.pointerId); } catch (_) {}
}
timeline.addEventListener('pointerup', endScrub);
timeline.addEventListener('pointercancel', endScrub);
function seekAtPointer(e) {
  const r = timeline.getBoundingClientRect();
  const p = clamp((e.clientX - r.left) / Math.max(1, r.width), 0, 1);
  seek(p * TOTAL, { fromScrub: true });
}

$('#btnFull').onclick = async () => {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch (_) {}
};

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  switch (e.key) {
    case ' ': e.preventDefault(); setPlaying(!playing); break;
    case 'ArrowRight': e.preventDefault(); $('#next').click(); break;
    case 'ArrowLeft': e.preventDefault(); $('#prev').click(); break;
    case '1': case '2': case '3': case '4': seekAct(Number(e.key) - 1); break;
    case 'r': case 'R': seek(0); show.resetLook(); break;
    case 'f': case 'F': $('#btnFull').click(); break;
    case 'Escape': if (!document.fullscreenElement) show.resetLook(); break;
  }
});

// ---------------------------------------------------------------- pointer look
const pointers = new Map();
let dragging = false, lastX = 0, lastY = 0, moved = 0, pinch = 0;

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) {
    dragging = true; moved = 0;
    lastX = e.clientX; lastY = e.clientY;
    canvas.classList.add('dragging');
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinch = Math.hypot(a.x - b.x, a.y - b.y);
    moved = 99;
    dragging = false;
  }
  hideHint(true);
});
canvas.addEventListener('pointermove', (e) => {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size >= 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinch > 0 && d > 0) show.zoomBy(pinch / d);
    pinch = d;
    return;
  }
  if (!dragging) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  moved += Math.abs(dx) + Math.abs(dy);
  show.drag(dx, dy);
});
function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pointers.size === 0) {
    dragging = false;
    canvas.classList.remove('dragging');
    pinch = 0;
  } else if (pointers.size === 1) {
    const [a] = [...pointers.values()];
    lastX = a.x; lastY = a.y;
  }
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  show.zoomBy(Math.exp(e.deltaY * 0.0011));
  hideHint(true);
}, { passive: false });
canvas.addEventListener('dblclick', () => show.resetLook());

function hideHint(force) {
  if (!hint || hint.classList.contains('gone')) return;
  if (force) { clearTimeout(hintTimer); hint.classList.add('gone'); }
}
hintTimer = setTimeout(() => hideHint(true), 9000);

// ---------------------------------------------------------------- resize
let resizePending = false;
function resize() {
  if (resizePending) return;
  resizePending = true;
  requestAnimationFrame(() => {
    resizePending = false;
    stage.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  });
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
NARROW.addEventListener('change', (e) => { stage.mobile = e.matches; resize(); });
stage.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);

// ---------------------------------------------------------------- frame
function dipAt(t) {
  let near = 999;
  for (const b of [20, 40, 68, TOTAL]) {
    const d = Math.abs(t - b);
    near = Math.min(near, d);
  }
  return 1 - smoothstep(0.02, 0.64, near);
}

function fmt(t) {
  const s = Math.floor(t);
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

function updateUI(state) {
  fillEl.style.width = (time / TOTAL * 100).toFixed(3) + '%';
  const c = fmt(time) + ' <i>/ ' + fmt(TOTAL) + '</i>';
  if (c !== lastClock) { clockEl.innerHTML = c; lastClock = c; }
  thrEl.style.width = (state.throttle * 100).toFixed(1) + '%';
  const meter = thrEl.parentNode.parentNode;
  meter.classList.toggle('live', state.throttle > 0.5);
  const a = show.act;
  if (a && a.id !== currentAct) {
    renderAct(a);
    caption.classList.add('swap');
    requestAnimationFrame(() => caption.classList.remove('swap'));
  }
  const dip = dipAt(time);
  dipEl.style.opacity = (dip * 0.96).toFixed(3);
  timeline.setAttribute('aria-valuenow', Math.round(time));
}

function frame(now) {
  const dt = Math.min(0.05, Math.max(0.001, (now - lastNow) / 1000));
  lastNow = now;
  if (playing && !document.hidden) time = (time + dt) % TOTAL;
  const state = show.apply(time, dt);
  if (!document.hidden) stage.render(state);
  updateUI(state);
  if (firstFrame) {
    firstFrame = false;
    setTimeout(() => {
      boot.classList.add('gone');
      setTimeout(() => { if (boot.parentNode) boot.remove(); }, 1300);
    }, 260);
  }
  requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => {
  lastNow = performance.now();
});

renderAct(ACTS[0]);
setPlaying(playing);
requestAnimationFrame(frame);

// ---------------------------------------------------------------- test API
window.__scene = {
  ready: true,
  stage,
  show,
  acts: ACTS,
  total: TOTAL,
  get time() { return time; },
  getInfo: () => show.getInfo(),
  seek(t) { seek(t); },
  seekAct(i, p = 0.04) { seek(ACTS[i].start + p); },
  play() { setPlaying(true); },
  pause() { setPlaying(false); },
  setPlaying,
  renderOnce() { const s = show.apply(time, 0.016); stage.render(s); updateUI(s); },
};
