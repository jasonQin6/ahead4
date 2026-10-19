// ============================================================
//  自然选择号 · 舰艏 — interaction / UI / labels
// ============================================================
(function () {
  const $ = s => document.querySelector(s);
  const canvas = $('#gl');

  let renderer;
  try {
    renderer = new Renderer(canvas);
  } catch (e) {
    console.error(e);
    $('#boot').innerHTML = '<div class="b1">WEBGL2 REQUIRED</div><div class="b2">当前浏览器不支持 WebGL2</div>';
    return;
  }

  const builder = new Builder();
  const tBuild = performance.now();
  buildShip(builder);
  renderer.upload(builder);
  console.log('[bow] build', (performance.now() - tBuild).toFixed(1) + 'ms', renderer.triCount + ' tris');

  const cam = new Camera();
  const isNarrow = window.innerWidth < 860;
  cam.shiftX = 0.06; cam.shiftY = 0.012;
  if (isNarrow) { cam.shiftX = 0.0; cam.shiftY = 0.01; cam.roll = -1.30; }

  // keep the ship centred in the area that is not covered by the module panel
  function layoutFraming() {
    const W = window.innerWidth;
    let reserved = 0;
    if (!isNarrow) {
      const pr = document.getElementById('panel');
      if (pr && pr.offsetWidth) reserved = pr.getBoundingClientRect().right;
    }
    const safeCenter = (reserved + W) * 0.5;
    cam.shiftX = clamp((safeCenter - W * 0.5) / (W * 0.5), 0, 0.27);
  }
  layoutFraming();
  const DEF = { yaw: 3.36, pitch: 0.36, dist: 28.0, target: [3.30, 0.18, 0] };
  let yaw = DEF.yaw - 0.10, pitch = DEF.pitch - 0.04;
  let dist = DEF.dist * (isNarrow ? 1.95 : 1.28), distGoal = DEF.dist * (isNarrow ? 1.72 : 1);
  let target = DEF.target.slice(), targetGoal = DEF.target.slice();
  let vyaw = 0, vpitch = 0;
  let currentTheme = 'light';

  const state = {
    visible: new Array(PARTS.length).fill(true),
    offsetsFlat: new Float32Array(PARTS.length * 3),
    sel: -1, hover: -1,
    explode: 0, explodeTarget: 0,
    labels: true, auto: false,
    darkMix: 0, time: 0, seam: 1, aoRadius: 0.26, aoStrength: 0.95, debugAO: 0,
    accent: [0.10, 0.55, 0.70],
    lights: { keyDir: [0.42, 0.80, -0.44], fillDir: [-0.62, 0.20, -0.55], rimDir: [0.10, 0.32, 0.92],
      keyCol: [1, 0.975, 0.94], fillCol: [0.34, 0.40, 0.48], rimCol: [0.78, 0.84, 0.92],
      skyCol: [0.300, 0.322, 0.350], groundCol: [0.050, 0.052, 0.058], exposure: 0.82 },
    bgTop: [0.935, 0.945, 0.95], bgBot: [0.80, 0.82, 0.835],
    glowCol: [0.10, 0.115, 0.13], vigCol: [0.62, 0.65, 0.68], vig: 0.34,
  };

  const THEMES = {
    light: {
      dark: 0,
      lights: { keyDir: [0.42, 0.80, -0.44], fillDir: [-0.62, 0.20, -0.55], rimDir: [0.10, 0.32, 0.92],
        keyCol: [1.06, 1.02, 0.965], fillCol: [0.245, 0.30, 0.38], rimCol: [0.76, 0.82, 0.92],
        skyCol: [0.255, 0.276, 0.302], groundCol: [0.038, 0.040, 0.046], exposure: 0.80 },
      bgTop: [0.935, 0.945, 0.95], bgBot: [0.795, 0.815, 0.832],
      glowCol: [0.105, 0.12, 0.135], vigCol: [0.60, 0.63, 0.66], vig: 0.34,
      accent: [0.10, 0.55, 0.70], seam: 1.0, ao: 0.85,
    },
    dark: {
      dark: 1,
      lights: { keyDir: [0.40, 0.66, -0.55], fillDir: [-0.72, 0.06, -0.42], rimDir: [-0.16, 0.30, 0.94],
        keyCol: [0.60, 0.72, 0.92], fillCol: [0.09, 0.16, 0.25], rimCol: [0.46, 0.64, 0.95],
        skyCol: [0.048, 0.066, 0.095], groundCol: [0.004, 0.005, 0.008], exposure: 1.0 },
      bgTop: [0.020, 0.028, 0.043], bgBot: [0.003, 0.005, 0.009],
      glowCol: [0.028, 0.048, 0.085], vigCol: [0, 0, 0], vig: 0.82,
      accent: [0.34, 0.85, 1.0], seam: 0.9, ao: 0.95,
    },
  };

  // ---------------- labels ----------------
  const labelEls = [], lineEls = [], dotEls = [];
  (function buildLabels() {
    const svg = $('#leaders'), root = $('#labels');
    PARTS.forEach((p, i) => {
      const el = document.createElement('div');
      el.className = 'lbl';
      el.innerHTML = '<span class="n">' + String(i + 1).padStart(2, '0') + '</span><span class="t">' + p.name + '</span>';
      root.appendChild(el);
      labelEls.push(el);
      const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ln.setAttribute('opacity', '0');
      const dt = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dt.setAttribute('r', '1.6'); dt.setAttribute('opacity', '0');
      svg.appendChild(ln); svg.appendChild(dt);
      lineEls.push(ln); dotEls.push(dt);
    });
  })();

  // ---------------- part list ----------------
  const listEl = $('#list');
  const rows = [];
  PARTS.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.setAttribute('role', 'button');
    row.tabIndex = 0;
    row.innerHTML = '<span class="num">' + String(i + 1).padStart(2, '0') + '</span>' +
      '<span class="nm">' + p.name + '<span class="en">' + p.en + '</span></span>' +
      '<button class="eye" title="显示 / 隐藏"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M1.5 8s2.4-4 6.5-4 6.5 4 6.5 4-2.4 4-6.5 4S1.5 8 1.5 8Z"/><circle cx="8" cy="8" r="1.9"/></svg></button>';
    row.addEventListener('click', e => {
      if (e.target.closest('.eye')) { toggleVisible(i); return; }
      select(selPart === i ? -1 : i);
    });
    row.querySelector('.eye').addEventListener('click', e => { e.stopPropagation(); toggleVisible(i); });
    listEl.appendChild(row);
    rows.push({ row, eye: row.querySelector('.eye') });
  });

  const detailEl = $('#detail');
  function renderDetail() {
    if (state.sel < 0) {
      detailEl.innerHTML = '<div class="dnum">NATURAL SELECTION</div>' +
        '<div class="dname">全舰 · 全 15 构件</div>' +
        '<div class="den">FULL SHIP / ASSEMBLY</div>' +
        '<p>从双轨主炮、巨环、球形储罐到引擎组与尾鳍，完整复原自然选择号。拖拽旋转、滚轮缩放；点击构件或左侧列表查看名称、功能与在总装中的位置。</p>' +
        '<div class="acts"><button class="mini" id="dExplode">分解总装</button><button class="mini" id="dLabels">显示标注</button></div>';
      const de = $('#dExplode'), dl = $('#dLabels');
      if (de) de.onclick = () => setExplode(state.explodeTarget > 0.05 ? 0 : 0.82);
      if (dl) dl.onclick = () => setLabels(!state.labels);
      return;
    }
    const p = PARTS[state.sel];
    detailEl.innerHTML =
      '<div class="dtop"><span class="dnum">' + String(state.sel + 1).padStart(2, '0') + ' / ' + String(PARTS.length).padStart(2, '0') + '</span>' +
      '<span class="den">' + p.en + '</span></div>' +
      '<div class="dname">' + p.name + '</div>' +
      '<p>' + p.desc + '</p>' +
      '<div class="acts"><button class="mini" id="dFocus">聚焦此件</button>' +
      '<button class="mini" id="dVis">' + (state.visible[state.sel] ? '隐藏' : '显示') + '</button>' +
      '<button class="mini" id="dClear">取消</button></div>';
    $('#dFocus').onclick = () => focusPart(state.sel);
    $('#dVis').onclick = () => toggleVisible(state.sel);
    $('#dClear').onclick = () => select(-1);
  }

  let selPart = -1;
  function select(i) {
    selPart = i; state.sel = i;
    rows.forEach((r, k) => r.row.classList.toggle('sel', k === i));
    if (i >= 0) {
      const el = labelEls[i];
      labelEls.forEach((l, k) => l.classList.toggle('sel', k === i));
      // do not steal focus from the canvas
    } else {
      labelEls.forEach(l => l.classList.remove('sel'));
    }
    renderDetail();
  }

  function toggleVisible(i) {
    state.visible[i] = !state.visible[i];
    rows[i].row.classList.toggle('hid', !state.visible[i]);
    rows[i].eye.classList.toggle('off', !state.visible[i]);
    if (state.sel === i) renderDetail();
  }

  // ---------------- camera helpers ----------------
  function focusPart(i) {
    const p = PARTS[i];
    const off = p.off;
    targetGoal = [p.anchor[0] + off[0] * state.explode, p.anchor[1] + off[1] * state.explode, p.anchor[2] + off[2] * state.explode];
    const sizes = { 0: 7.5, 1: 4.8, 2: 5.0, 3: 12.0, 4: 7.0, 5: 7.0, 6: 8.5, 7: 5.6, 8: 14.0, 9: 6.4, 10: 6.0, 11: 6.4, 12: 6.4, 13: 8.5, 14: 7.5 };
    distGoal = sizes[i] || 4;
  }
  function resetView() {
    targetGoal = DEF.target.slice();
    distGoal = DEF.dist;
    yaw = DEF.yaw; pitch = DEF.pitch; vyaw = 0; vpitch = 0;
  }

  if (isNarrow) {
    document.getElementById('panel').classList.remove('collapsed');
    state.labels = false;
    const lb = document.getElementById('btnLabels');
    if (lb) lb.classList.remove('on');
    const sub = document.querySelector('.hero .sub');
    if (sub) sub.style.display = 'none';
  }

  // ---------------- UI wiring ----------------
  const btnExplode = $('#btnExplode'), slider = $('#explode'), btnLabels = $('#btnLabels'),
    btnAuto = $('#btnAuto'), btnReset = $('#btnReset'), themeSeg = $('#themeSeg'), themeBtn = $('#themeBtn');

  function setExplode(v, snap) {
    state.explodeTarget = clamp(v, 0, 1);
    slider.value = Math.round(state.explodeTarget * 100);
    const on = state.explodeTarget > 0.02;
    btnExplode.classList.toggle('on', on);
    const lab = btnExplode.querySelector('span');
    if (lab) lab.textContent = on ? '装配' : '分解';
    if (snap) state.explode = state.explodeTarget;
  }
  function setLabels(on) {
    state.labels = !!on;
    btnLabels.classList.toggle('on', state.labels);
  }
  function setAuto(on) {
    state.auto = !!on;
    btnAuto.classList.toggle('on', state.auto);
  }
  function setTheme(name) {
    if (!THEMES[name]) return;
    currentTheme = name;
    document.body.classList.toggle('dark', name === 'dark');
    [...themeSeg.querySelectorAll('.btn')].forEach(b => b.classList.toggle('on', b.dataset.theme === name));
  }

  btnExplode.onclick = () => setExplode(state.explodeTarget > 0.05 ? 0 : 0.82);
  const btnPanel = $('#btnPanel');
  if (btnPanel) btnPanel.onclick = () => {
    const p = $('#panel');
    const open = p.classList.toggle('open');
    btnPanel.classList.toggle('on', open);
  };
  slider.oninput = () => setExplode(slider.value / 100);
  btnLabels.onclick = () => setLabels(!state.labels);
  btnAuto.onclick = () => setAuto(!state.auto);
  btnReset.onclick = resetView;
  const btnStand = $('#btnStand');
  btnStand.onclick = () => {
    state.visible[14] = !state.visible[14];
    rows[14].row.classList.toggle('hid', !state.visible[14]);
    rows[14].eye.classList.toggle('off', !state.visible[14]);
    btnStand.classList.toggle('on', state.visible[14]);
    if (state.sel === 14) renderDetail();
  };
  btnStand.classList.toggle('on', !!state.visible[14]);
  themeSeg.onclick = e => { const b = e.target.closest('[data-theme]'); if (b) setTheme(b.dataset.theme); };
  themeBtn.onclick = () => setTheme(currentTheme === 'light' ? 'dark' : 'light');

  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    switch (e.key) {
      case 'e': case 'E': setExplode(state.explodeTarget > 0.05 ? 0 : 0.82); break;
      case 'l': case 'L': setLabels(!state.labels); break;
      case ' ': e.preventDefault(); setAuto(!state.auto); break;
      case 'r': case 'R': resetView(); break;
      case 'Escape': select(-1); break;
      case 'ArrowDown': e.preventDefault(); select((state.sel + 1) % PARTS.length); break;
      case 'ArrowUp': e.preventDefault(); select((state.sel - 1 + PARTS.length) % PARTS.length); break;
      case 'h': case 'H': $('#panel').style.display = $('#panel').style.display === 'none' ? '' : 'none'; break;
    }
  });

  // parts hidden by default (display stand)
  PARTS.forEach((p, i) => { if (p.hiddenByDefault) { state.visible[i] = false; rows[i].row.classList.add('hid'); rows[i].eye.classList.add('off'); } });
  const sb = document.getElementById('btnStand');
  if (sb) sb.classList.toggle('on', !!state.visible[14]);
  $('#modCount').textContent = String(PARTS.length).padStart(2, '0');
  renderDetail();
  $('#meta').innerHTML = '<div><b>' + renderer.triCount.toLocaleString('en-US') + '</b> 三角面</div><div><b>' + PARTS.length + '</b> 构件 · 全舰</div><div>参考原型 · 忆拾-CLEMRY 拼装模型</div>';

  // ---------------- pointer controls ----------------
  const pointers = new Map();
  let dragging = false, lastX = 0, lastY = 0, downX = 0, downY = 0, moved = 0, pinch = 0;
  let hoverTimer = 0;

  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      dragging = true; moved = 0;
      lastX = e.clientX; lastY = e.clientY; downX = e.clientX; downY = e.clientY;
      vyaw = 0; vpitch = 0;
      canvas.classList.add('dragging');
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });

  canvas.addEventListener('pointermove', e => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch > 0) distGoal = clamp(distGoal * (pinch / d), 4.2, 44);
      pinch = d;
      return;
    }
    if (dragging) {
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      yaw -= dx * 0.0058;
      pitch = clamp(pitch + dy * 0.0058, -1.30, 1.30);
      vyaw = -dx * 0.0058 * 0.55;
      vpitch = dy * 0.0058 * 0.55;
      state.auto = false; btnAuto.classList.remove('on');
      return;
    }
    // hover pick (throttled)
    const now = performance.now();
    if (now - hoverTimer > 45) {
      hoverTimer = now;
      const r = canvas.getBoundingClientRect();
      const id = renderer.pick(e.clientX - r.left, e.clientY - r.top);
      if (id !== state.hover) {
        state.hover = id;
        rows.forEach((rr, k) => rr.row.classList.toggle('hover', k === id));
        canvas.style.cursor = id >= 0 ? 'pointer' : 'grab';
      }
    }
  });

  function endPointer(e) {
    pointers.delete(e.pointerId);
    if (pointers.size === 0) {
      canvas.classList.remove('dragging');
      if (dragging && moved < 7) {
        const r = canvas.getBoundingClientRect();
        const id = renderer.pick(e.clientX - r.left, e.clientY - r.top);
        select(id);
      }
      dragging = false;
      pinch = 0;
    } else if (pointers.size === 1) {
      const [a] = [...pointers.values()];
      lastX = a.x; lastY = a.y; moved = 99;
    }
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', () => { if (!dragging) { state.hover = -1; rows.forEach(r => r.row.classList.remove('hover')); } });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    distGoal = clamp(distGoal * Math.exp(e.deltaY * 0.0011), 4.2, 44);
  }, { passive: false });

  canvas.addEventListener('dblclick', e => {
    const r = canvas.getBoundingClientRect();
    const id = renderer.pick(e.clientX - r.left, e.clientY - r.top);
    if (id >= 0) { select(id); focusPart(id); } else resetView();
  });

  // ---------------- resize ----------------
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.resize(w, h, window.devicePixelRatio || 1);
    cam.aspect = w / h;
    layoutFraming();
  }
  window.addEventListener('resize', resize);
  resize();

  // preferred screen-space direction for each callout (x right, y down)
  const LBL_DIR = {
    0: [-1.0, 0.02], 1: [-0.75, 1.0], 2: [-0.55, -0.95], 3: [0.55, 1.0],
    4: [-0.18, -1.0], 5: [0.30, -1.0], 6: [0.05, -1.0], 7: [0.42, 1.0],
    8: [1.0, -0.30], 9: [1.0, 0.45], 10: [0.8, 1.0],
    11: [0.15, 1.0], 12: [0.55, 1.0], 13: [1.0, -0.45], 14: [-0.6, 1.0],
  };

  // ---------------- labels update ----------------
  const svgAxes = {
    x: $('#axx'), y: $('#axy'), z: $('#axz'),
    tx: $('#tx'), ty: $('#ty'), tz: $('#tz'),
  };
  function updateOverlay() {
    const W = window.innerWidth, H = window.innerHeight;
    const centerP = cam.project(cam.target, W, H) || [W * 0.6, H * 0.52];
    const items = [];
    for (let i = 0; i < PARTS.length; i++) {
      const el = labelEls[i], ln = lineEls[i], dt = dotEls[i];
      const o = state.offsetsFlat;
      const anchor = [PARTS[i].anchor[0] + o[i * 3], PARTS[i].anchor[1] + o[i * 3 + 1], PARTS[i].anchor[2] + o[i * 3 + 2]];
      const pr = cam.project(anchor, W, H);
      const show = state.labels && state.visible[i] && pr;
      if (!show) {
        el.classList.remove('on');
        ln.setAttribute('opacity', '0'); dt.setAttribute('opacity', '0');
        continue;
      }
      el.classList.add('on');
      el.classList.toggle('hidden', !state.visible[i]);
      let dx = pr[0] - centerP[0], dy = pr[1] - centerP[1];
      const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const pref = LBL_DIR[i];
      if (pref) { dx = pref[0]; dy = pref[1]; }
      // bias toward the part's own side (top/bottom)
      const wy = PARTS[i].anchor[1] + o[i * 3 + 1];
      if (!pref) { dy += wy > 0.15 ? -0.55 : wy < -0.15 ? 0.55 : 0; }
      const l2 = Math.hypot(dx, dy) || 1;
      items.push({ i, el, pr, lx: pr[0] + dx / l2 * 74, ly: pr[1] + dy / l2 * 74 });
    }
    // de-overlap
    for (let it = 0; it < 26; it++) {
      for (let a = 0; a < items.length; a++) for (let b = a + 1; b < items.length; b++) {
        const A = items[a], B = items[b];
        const w = 168, h = 26;
        const ox = w - Math.abs(A.lx - B.lx), oy = h - Math.abs(A.ly - B.ly);
        if (ox > 0 && oy > 0) {
          const sx = Math.sign(A.lx - B.lx) || 1, sy = Math.sign(A.ly - B.ly) || 1;
          const k = 0.52;
          if (ox < oy) { A.lx += sx * ox * k; B.lx -= sx * ox * k; }
          else { A.ly += sy * oy * k; B.ly -= sy * oy * k; }
        }
      }
    }
    const panel = $('#panel').getBoundingClientRect();
    for (const it of items) {
      let { lx, ly } = it;
      const el = it.el;
      if (!el._w) el._w = Math.max(72, el.offsetWidth || 96);
      const hw = el._w * 0.5;
      lx = clamp(lx, hw + 14, W - hw - 14);
      ly = clamp(ly, 92, H - 92);
      // keep clear of the module panel
      if (panel.width > 0 && lx - hw < panel.right + 14 && lx + hw > panel.left && ly > panel.top - 26 && ly < panel.bottom + 26) {
        lx = panel.right + 14 + hw;
      }
      el.style.left = lx + 'px'; el.style.top = ly + 'px';
      const ln = lineEls[it.i], dt = dotEls[it.i];
      ln.setAttribute('opacity', '0.85'); dt.setAttribute('opacity', '0.9');
      ln.setAttribute('x1', it.pr[0]); ln.setAttribute('y1', it.pr[1]);
      ln.setAttribute('x2', lx); ln.setAttribute('y2', ly);
      dt.setAttribute('cx', it.pr[0]); dt.setAttribute('cy', it.pr[1]);
    }
    // axis gizmo
    const axc = [44, 44], axes = [
      { key: 'x', v: [1, 0, 0], el: svgAxes.x, tx: svgAxes.tx, lbl: '前' },
      { key: 'y', v: [0, 1, 0], el: svgAxes.y, tx: svgAxes.ty, lbl: '上' },
      { key: 'z', v: [0, 0, 1], el: svgAxes.z, tx: svgAxes.tz, lbl: '左' },
    ];
    const p0 = cam.project(cam.target, W, H);
    for (const a of axes) {
      const p1 = cam.project([cam.target[0] + a.v[0], cam.target[1] + a.v[1], cam.target[2] + a.v[2]], W, H);
      if (!p1 || !p0) continue;
      let dx = p1[0] - p0[0], dy = p1[1] - p0[1];
      const ll = Math.hypot(dx, dy) || 1;
      dx = dx / ll * 25; dy = dy / ll * 25;
      a.el.setAttribute('x2', axc[0] + dx); a.el.setAttribute('y2', axc[1] + dy);
      a.tx.setAttribute('x', axc[0] + dx * 1.24); a.tx.setAttribute('y', axc[1] + dy * 1.24 + 3);
      a.tx.textContent = a.lbl;
    }
  }

  // ---------------- main loop ----------------
  let last = -1, frames = 0;
  const tmp = { a: [0, 0, 0] };
  const lerpArr = (a, b, k) => { a[0] += (b[0] - a[0]) * k; a[1] += (b[1] - a[1]) * k; a[2] += (b[2] - a[2]) * k; };

  function frame(now) {
    if (last < 0) last = now;
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    state.time += dt;

    // theme interpolation
    const T = THEMES[currentTheme];
    const kt = 1 - Math.exp(-dt * 7);
    for (const key of ['keyDir', 'fillDir', 'rimDir', 'keyCol', 'fillCol', 'rimCol', 'skyCol', 'groundCol']) lerpArr(state.lights[key], T.lights[key], kt);
    state.lights.exposure += (T.lights.exposure - state.lights.exposure) * kt;
    for (const key of ['bgTop', 'bgBot', 'glowCol', 'vigCol']) lerpArr(state[key], T[key], kt);
    state.vig += (T.vig - state.vig) * kt;
    state.accent[0] += (T.accent[0] - state.accent[0]) * kt;
    state.accent[1] += (T.accent[1] - state.accent[1]) * kt;
    state.accent[2] += (T.accent[2] - state.accent[2]) * kt;
    state.darkMix += (T.dark - state.darkMix) * kt;
    state.seam += (T.seam - state.seam) * kt;
    state.aoStrength += ((T.ao || 0.85) - state.aoStrength) * kt;

    // explode + camera
    state.explode += (state.explodeTarget - state.explode) * (1 - Math.exp(-dt * 7.5));
    if (state.auto) yaw += dt * 0.11;
    if (!dragging) {
      yaw += vyaw; pitch = clamp(pitch + vpitch, -1.30, 1.30);
      vyaw *= Math.pow(0.02, dt); vpitch *= Math.pow(0.02, dt);
      if (Math.abs(vyaw) < 1e-5) vyaw = 0;
      if (Math.abs(vpitch) < 1e-5) vpitch = 0;
    }
    dist += (distGoal - dist) * (1 - Math.exp(-dt * 7));
    for (let i = 0; i < 3; i++) target[i] += (targetGoal[i] - target[i]) * (1 - Math.exp(-dt * 5.5));

    const e = state.explode;
    for (let i = 0; i < PARTS.length; i++) {
      const o = PARTS[i].off;
      state.offsetsFlat[i * 3] = o[0] * e;
      state.offsetsFlat[i * 3 + 1] = o[1] * e;
      state.offsetsFlat[i * 3 + 2] = o[2] * e;
    }
    cam.target = [target[0] - 2.8 * e, target[1] + 0.1 * e, target[2]];
    cam.yaw = yaw; cam.pitch = pitch;
    cam.dist = dist * (1 + 0.80 * e);
    cam.update(window.innerWidth / window.innerHeight);

    renderer.render(cam, state);
    updateOverlay();

    if (frames === 1) {
      const boot = $('#boot');
      boot.classList.add('gone');
      setTimeout(() => boot.remove(), 800);
    }
    frames++;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // expose for tests / deep-linking
  window.__bow = {
    setTheme, setLabels, setAuto, setExplode, select, focusPart, resetView,
    setView(y, p, d, t) {
      if (y !== undefined) yaw = y;
      if (p !== undefined) pitch = p;
      if (d !== undefined) { dist = d; distGoal = d; }
      if (t) { target = t.slice(); targetGoal = t.slice(); }
    },
    setShift(x, y) { cam.shiftX = x; cam.shiftY = y; },
    state, cam, PARTS, renderer,
    togglePanel(on) { $('#panel').style.display = on ? '' : 'none'; },
    ready: true,
  };
})();
