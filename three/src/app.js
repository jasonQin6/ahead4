// ============================================================
//  自然选择号 · 全舰 — interaction / UI / labels (three.js)
// ============================================================
import { ShipViewer } from './viewer.js';
import { PARTS } from './model.js';

const $ = (s) => document.querySelector(s);
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const NARROW_QUERY = '(max-width: 860px)';
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

const THEMES = {
  light: {
    label: '影棚',
  },
  dark: {
    label: '深空',
  },
};

// preferred screen-space direction for each callout (x right, y down)
const LBL_DIR = {
  0: [-1.0, 0.02], 1: [-0.75, 1.0], 2: [-0.55, -0.95], 3: [0.55, 1.0],
  4: [-0.18, -1.0], 5: [0.30, -1.0], 6: [0.05, -1.0], 7: [0.42, 1.0],
  8: [1.0, -0.30], 9: [1.0, 0.45], 10: [0.8, 1.0],
  11: [0.15, 1.0], 12: [0.55, 1.0], 13: [1.0, -0.45], 14: [-0.6, 1.0],
};

export function initApp(build) {
  const canvas = $('#gl');
  const boot = $('#boot');
  const panelEl = $('#panel');
  const mq = window.matchMedia(NARROW_QUERY);
  const reduceMotion = window.matchMedia(REDUCED_QUERY).matches;

  let viewer;
  try {
    viewer = new ShipViewer(canvas, build.geometries, { isNarrow: mq.matches });
  } catch (err) {
    console.error(err);
    boot.innerHTML = '<div class="b1">WEBGL2 REQUIRED</div><div class="b2">当前浏览器不支持 WebGL2 / three.js</div>';
    boot.classList.add('failed');
    return null;
  }

  const state = viewer;
  let currentTheme = 'light';
  let labelsOn = !mq.matches;
  let isNarrow = mq.matches;
  let selPart = -1;
  let panelOpen = false;

  // ---------------- part list ----------------
  const listEl = $('#list');
  const rows = [];
  PARTS.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.setAttribute('role', 'button');
    row.setAttribute('aria-pressed', 'false');
    row.setAttribute('aria-label', `${String(i + 1).padStart(2, '0')} ${p.name} ${p.en}`);
    row.tabIndex = 0;
    row.innerHTML = '<span class="num">' + String(i + 1).padStart(2, '0') + '</span>' +
      '<span class="nm">' + p.name + '<span class="en">' + p.en + '</span></span>' +
      '<button type="button" class="eye" title="显示 / 隐藏" aria-label="显示 / 隐藏 ' + p.name + '" aria-pressed="true"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M1.5 8s2.4-4 6.5-4 6.5 4 6.5 4-2.4 4-6.5 4S1.5 8 1.5 8Z"/><circle cx="8" cy="8" r="1.9"/></svg></button>';
    row.addEventListener('click', (e) => {
      if (e.target.closest('.eye')) return;
      select(selPart === i ? -1 : i);
    });
    row.addEventListener('keydown', (e) => {
      if (e.target !== row) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        select(selPart === i ? -1 : i);
      }
    });
    row.querySelector('.eye').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleVisible(i);
    });
    listEl.appendChild(row);
    rows.push({ row, eye: row.querySelector('.eye') });
  });

  const detailEl = $('#detail');
  detailEl.setAttribute('aria-live', 'polite');

  function renderDetail() {
    if (selPart < 0) {
      detailEl.innerHTML = '<div class="dnum">NATURAL SELECTION</div>' +
        '<div class="dname">全舰 · 全 ' + PARTS.length + ' 构件</div>' +
        '<div class="den">FULL SHIP / ASSEMBLY</div>' +
        '<p>从双轨主炮、巨环、球形储罐到引擎组与尾鳍，完整复原自然选择号。拖拽旋转、滚轮缩放；点击构件或左侧列表查看名称、功能与在总装中的位置。</p>' +
        '<div class="acts"><button type="button" class="mini" id="dExplode">分解总装</button><button type="button" class="mini" id="dLabels">显示标注</button></div>';
      $('#dExplode').onclick = () => setExplode(state.explodeTarget > 0.05 ? 0 : 0.82);
      $('#dLabels').onclick = () => setLabels(!labelsOn);
      return;
    }
    const p = PARTS[selPart];
    detailEl.innerHTML =
      '<div class="dtop"><span class="dnum">' + String(selPart + 1).padStart(2, '0') + ' / ' + String(PARTS.length).padStart(2, '0') + '</span>' +
      '<span class="den">' + p.en + '</span></div>' +
      '<div class="dname">' + p.name + '</div>' +
      '<p>' + p.desc + '</p>' +
      '<div class="acts"><button type="button" class="mini" id="dFocus">聚焦此件</button>' +
      '<button type="button" class="mini" id="dVis">' + (state.visible[selPart] ? '隐藏' : '显示') + '</button>' +
      '<button type="button" class="mini" id="dClear">取消</button></div>';
    $('#dFocus').onclick = () => focusPart(selPart);
    $('#dVis').onclick = () => toggleVisible(selPart);
    $('#dClear').onclick = () => select(-1);
  }

  function select(i) {
    selPart = i;
    state.select(i);
    rows.forEach((r, k) => {
      const on = k === i;
      r.row.classList.toggle('sel', on);
      r.row.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    renderDetail();
  }

  function syncPartRow(i) {
    const on = state.visible[i];
    rows[i].row.classList.toggle('hid', !on);
    rows[i].eye.classList.toggle('off', !on);
    rows[i].eye.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (i === 14) $('#btnStand').classList.toggle('on', on);
  }

  function toggleVisible(i) {
    state.setVisible(i, !state.visible[i]);
    syncPartRow(i);
    if (selPart === i) renderDetail();
  }

  // ---------------- camera helpers ----------------
  function focusPart(i) {
    state.focusPart(i);
  }

  function resetView() {
    state.resetView();
  }

  // ---------------- labels ----------------
  const labelEls = [], lineEls = [], dotEls = [], labelW = [];
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

  // Cache the panel rect: measuring it every rendered frame forces layout.
  let panelRect = { width: 0, left: 0, right: 0, top: 0, bottom: 0 };
  let panelDirty = true;
  function refreshPanelRect() {
    if (isNarrow || panelEl.style.display === 'none') {
      panelRect = { width: 0, left: 0, right: 0, top: 0, bottom: 0 };
    } else {
      const r = panelEl.getBoundingClientRect();
      panelRect = { width: r.width, left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    }
    panelDirty = false;
  }

  function layoutFraming() {
    if (panelDirty) refreshPanelRect();
    if (isNarrow) {
      state.setShift(0, 0.01);
      return;
    }
    const W = window.innerWidth;
    const reserved = panelRect.right;
    const safeCenter = (reserved + W) * 0.5;
    state.setShift(clamp((safeCenter - W * 0.5) / (W * 0.5), 0, 0.27), 0.012);
  }

  const panelRO = new ResizeObserver(() => {
    panelDirty = true;
    if (!isNarrow) layoutFraming();
  });
  panelRO.observe(panelEl);

  // ---------------- UI wiring ----------------
  const btnExplode = $('#btnExplode'), slider = $('#explode'), btnLabels = $('#btnLabels'),
    btnAuto = $('#btnAuto'), btnReset = $('#btnReset'), themeSeg = $('#themeSeg'), themeBtn = $('#themeBtn');

  function setExplode(v, snap) {
    state.setExplode(v, snap);
    slider.value = Math.round(state.explodeTarget * 100);
    const on = state.explodeTarget > 0.02;
    btnExplode.classList.toggle('on', on);
    btnExplode.setAttribute('aria-pressed', on ? 'true' : 'false');
    const lab = btnExplode.querySelector('span');
    if (lab) lab.textContent = on ? '装配' : '分解';
  }

  function setLabels(on) {
    labelsOn = !!on;
    btnLabels.classList.toggle('on', labelsOn);
    btnLabels.setAttribute('aria-pressed', labelsOn ? 'true' : 'false');
    state.invalidate();
  }

  function setAuto(on) {
    state.setAuto(on);
    btnAuto.classList.toggle('on', state.auto);
    btnAuto.setAttribute('aria-pressed', state.auto ? 'true' : 'false');
  }

  function setTheme(name) {
    if (!THEMES[name]) return;
    currentTheme = name;
    document.body.classList.toggle('dark', name === 'dark');
    [...themeSeg.querySelectorAll('.btn')].forEach((b) => {
      const on = b.dataset.theme === name;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', name === 'dark' ? '#05080c' : '#e3e6e8');
    state.setTheme(name);
  }

  btnExplode.onclick = () => setExplode(state.explodeTarget > 0.05 ? 0 : 0.82);
  const btnPanel = $('#btnPanel');
  btnPanel.onclick = () => {
    panelOpen = panelEl.classList.toggle('open');
    btnPanel.classList.toggle('on', panelOpen);
    btnPanel.setAttribute('aria-expanded', panelOpen ? 'true' : 'false');
    panelDirty = true;
  };
  slider.oninput = () => setExplode(slider.value / 100);
  btnLabels.onclick = () => setLabels(!labelsOn);
  btnAuto.onclick = () => setAuto(!state.auto);
  btnReset.onclick = resetView;

  const btnStand = $('#btnStand');
  btnStand.onclick = () => toggleVisible(14);

  themeSeg.onclick = (e) => {
    const b = e.target.closest('[data-theme]');
    if (b) setTheme(b.dataset.theme);
  };
  themeBtn.onclick = () => setTheme(currentTheme === 'light' ? 'dark' : 'light');

  // ---------------- performance overlay ----------------
  const perfEl = $('#perf');
  let perfOn = false, perfTimer = 0, lastPerfFrames = 0, lastPerfTime = 0;
  function updatePerf() {
    const s = state.getStats();
    const now = performance.now();
    const df = state.frames - lastPerfFrames;
    const dt = Math.max(0.001, (now - lastPerfTime) / 1000);
    const fps = df / dt;
    lastPerfFrames = state.frames;
    lastPerfTime = now;
    perfEl.innerHTML =
      '<div><span>渲染</span><b>' + (df === 0 ? 'IDLE' : fps.toFixed(0) + ' fps') + '</b></div>' +
      '<div><span>批次</span><b>' + s.calls + '</b></div>' +
      '<div><span>三角面</span><b>' + s.triangles.toLocaleString('en-US') + '</b></div>' +
      '<div><span>画布</span><b>' + s.renderSize[0] + '×' + s.renderSize[1] + ' @' + s.dpr.toFixed(2) + '</b></div>' +
      '<div><span>AO</span><b>' + s.aoSize[0] + '×' + s.aoSize[1] + '</b></div>' +
      '<div><span>提交</span><b>' + s.frameMs.toFixed(2) + ' ms</b></div>' +
      '<div><span>显存</span><b>' + s.rtMB.toFixed(1) + ' MB' + (s.halfFloat ? ' · HDR' : '') + '</b></div>';
  }
  function togglePerf(on) {
    perfOn = on === undefined ? !perfOn : !!on;
    perfEl.classList.toggle('on', perfOn);
    perfEl.setAttribute('aria-hidden', perfOn ? 'false' : 'true');
    if (perfOn) {
      lastPerfFrames = state.frames;
      lastPerfTime = performance.now();
      updatePerf();
      if (!perfTimer) perfTimer = setInterval(updatePerf, 500);
    } else if (perfTimer) {
      clearInterval(perfTimer);
      perfTimer = 0;
    }
  }

  // ---------------- keyboard ----------------
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    switch (e.key) {
      case 'e': case 'E': setExplode(state.explodeTarget > 0.05 ? 0 : 0.82); break;
      case 'l': case 'L': setLabels(!labelsOn); break;
      case ' ': e.preventDefault(); setAuto(!state.auto); break;
      case 'r': case 'R': resetView(); break;
      case 'p': case 'P': togglePerf(); break;
      case 'Escape': select(-1); break;
      case 'ArrowDown': e.preventDefault(); select((selPart + 1) % PARTS.length); break;
      case 'ArrowUp': e.preventDefault(); select((selPart - 1 + PARTS.length) % PARTS.length); break;
      case 'h': case 'H': {
        const hidden = panelEl.style.display === 'none';
        panelEl.style.display = hidden ? '' : 'none';
        panelDirty = true;
        layoutFraming();
        break;
      }
    }
  });

  // ---------------- initial state ----------------
  PARTS.forEach((p, i) => {
    state.visible[i] = !p.hiddenByDefault;
    state.setVisible(i, state.visible[i]);
    syncPartRow(i);
  });
  $('#modCount').textContent = String(PARTS.length).padStart(2, '0');
  setLabels(labelsOn);
  setExplode(0, true);
  if (isNarrow) {
    panelEl.classList.remove('open');
    btnPanel.classList.remove('on');
    btnPanel.setAttribute('aria-expanded', 'false');
  }
  renderDetail();

  // ---------------- pointer controls ----------------
  const pointers = new Map();
  let dragging = false, lastX = 0, lastY = 0, downX = 0, downY = 0, moved = 0, pinch = 0;
  let hoverTimer = 0;

  function setHover(id) {
    if (state.hovered === id) return;
    state.hover(id);
    rows.forEach((r, k) => r.row.classList.toggle('hover', k === id));
    canvas.style.cursor = id >= 0 ? 'pointer' : '';
  }

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      dragging = true; moved = 0;
      lastX = e.clientX; lastY = e.clientY; downX = e.clientX; downY = e.clientY;
      state.setDragging(true);
      canvas.classList.add('dragging');
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = Math.hypot(a.x - b.x, a.y - b.y);
      moved = 99;
      state.setDragging(false);
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch > 0 && d > 0) state.zoomBy(pinch / d);
      pinch = d;
      return;
    }
    if (dragging) {
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      if (state.auto) setAuto(false);
      state.orbit(dx, dy);
      return;
    }
    // hover pick (throttled, CPU raycast with AABB prefilter)
    const now = performance.now();
    if (now - hoverTimer > 60) {
      hoverTimer = now;
      setHover(state.pick(e.clientX, e.clientY));
    }
  });

  function endPointer(e) {
    pointers.delete(e.pointerId);
    if (pointers.size === 0) {
      canvas.classList.remove('dragging');
      if (dragging && moved < 7) {
        select(state.pick(e.clientX, e.clientY));
      }
      dragging = false;
      state.setDragging(false);
      pinch = 0;
    } else if (pointers.size === 1) {
      const [a] = [...pointers.values()];
      lastX = a.x; lastY = a.y; moved = 99;
    }
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', () => {
    if (!dragging) setHover(-1);
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    state.zoomBy(Math.exp(e.deltaY * 0.0011));
  }, { passive: false });

  canvas.addEventListener('dblclick', (e) => {
    const id = state.pick(e.clientX, e.clientY);
    if (id >= 0) { select(id); focusPart(id); } else resetView();
  });

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    boot.innerHTML = '<div class="b1">RENDER CONTEXT LOST</div><div class="b2">图形上下文已丢失 · 请刷新页面</div>';
    boot.classList.remove('gone');
    boot.classList.add('failed');
  });

  // ---------------- labels update ----------------
  const svgAxes = {
    x: $('#axx'), y: $('#axy'), z: $('#axz'),
    tx: $('#tx'), ty: $('#ty'), tz: $('#tz'),
  };

  function updateOverlay() {
    const W = state.cssW, H = state.cssH;
    const centerP = state.projectWorld(state.camTarget.x, state.camTarget.y, state.camTarget.z) || [W * 0.6, H * 0.52];
    const items = [];
    for (let i = 0; i < PARTS.length; i++) {
      const el = labelEls[i], ln = lineEls[i], dt = dotEls[i];
      const pr = state.projectAnchor(i);
      const show = labelsOn && state.visible[i] && pr;
      if (!show) {
        el.classList.remove('on');
        ln.setAttribute('opacity', '0');
        dt.setAttribute('opacity', '0');
        continue;
      }
      el.classList.add('on');
      if (!labelW[i]) labelW[i] = Math.max(72, el.offsetWidth || 96);
      let dx = pr[0] - centerP[0], dy = pr[1] - centerP[1];
      const pref = LBL_DIR[i];
      if (pref) { dx = pref[0]; dy = pref[1]; }
      else {
        dy += PARTS[i].anchor[1] > 0.15 ? -0.55 : PARTS[i].anchor[1] < -0.15 ? 0.55 : 0;
      }
      const l = Math.hypot(dx, dy) || 1;
      items.push({ i, el, pr, lx: pr[0] + dx / l * 74, ly: pr[1] + dy / l * 74 });
    }

    // fewer relaxation passes than the original: callouts only need to be
    // legible, and every pass here is 105 pair tests while the camera moves.
    for (let it = 0; it < 8; it++) {
      for (let a = 0; a < items.length; a++) {
        for (let b = a + 1; b < items.length; b++) {
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
    }

    if (panelDirty) refreshPanelRect();
    for (const it of items) {
      let { lx, ly } = it;
      const hw = labelW[it.i] * 0.5;
      lx = clamp(lx, hw + 14, W - hw - 14);
      ly = clamp(ly, 92, H - 92);
      // keep clear of the module panel
      if (panelRect.width > 0 && lx - hw < panelRect.right + 14 && lx + hw > panelRect.left && ly > panelRect.top - 26 && ly < panelRect.bottom + 26) {
        lx = panelRect.right + 14 + hw;
      }
      // translate (not left/top) keeps this off the layout path
      it.el.style.translate = lx + 'px ' + ly + 'px';
      const ln = lineEls[it.i], dt = dotEls[it.i];
      ln.setAttribute('opacity', '0.85'); dt.setAttribute('opacity', '0.9');
      ln.setAttribute('x1', it.pr[0]); ln.setAttribute('y1', it.pr[1]);
      ln.setAttribute('x2', lx); ln.setAttribute('y2', ly);
      dt.setAttribute('cx', it.pr[0]); dt.setAttribute('cy', it.pr[1]);
    }

    // axis gizmo
    const axc = [44, 44], axes = [
      { v: [1, 0, 0], el: svgAxes.x, tx: svgAxes.tx, lbl: '前' },
      { v: [0, 1, 0], el: svgAxes.y, tx: svgAxes.ty, lbl: '上' },
      { v: [0, 0, 1], el: svgAxes.z, tx: svgAxes.tz, lbl: '左' },
    ];
    const p0 = state.projectWorld(state.camTarget.x, state.camTarget.y, state.camTarget.z);
    if (p0) {
      for (const a of axes) {
        const p1 = state.projectWorld(
          state.camTarget.x + a.v[0],
          state.camTarget.y + a.v[1],
          state.camTarget.z + a.v[2]
        );
        if (!p1) continue;
        let dx = p1[0] - p0[0], dy = p1[1] - p0[1];
        const ll = Math.hypot(dx, dy) || 1;
        dx = dx / ll * 25; dy = dy / ll * 25;
        a.el.setAttribute('x2', axc[0] + dx); a.el.setAttribute('y2', axc[1] + dy);
        a.tx.setAttribute('x', axc[0] + dx * 1.24); a.tx.setAttribute('y', axc[1] + dy * 1.24 + 3);
        a.tx.textContent = a.lbl;
      }
    }
  }

  // ---------------- sizing ----------------
  let resizePending = false;
  function onResize() {
    if (resizePending) return;
    resizePending = true;
    requestAnimationFrame(() => {
      resizePending = false;
      state.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
      panelDirty = true;
      layoutFraming();
    });
  }
  window.addEventListener('resize', onResize);

  mq.addEventListener('change', (e) => {
    isNarrow = e.matches;
    if (isNarrow) {
      panelEl.classList.remove('open');
      panelOpen = false;
      btnPanel.classList.remove('on');
      btnPanel.setAttribute('aria-expanded', 'false');
    }
    state.setNarrow(isNarrow);
    panelDirty = true;
    layoutFraming();
    state.invalidate();
  });

  state.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  layoutFraming();

  // ---------------- frame callbacks ----------------
  state.onFrame = updateOverlay;
  state.onFirstFrame = () => {
    boot.classList.add('gone');
    setTimeout(() => { if (boot.parentNode) boot.remove(); }, 800);
    updateMeta();
  };

  function updateMeta() {
    const s = state.getStats();
    const tris = (build.stats.triangles || s.triangles).toLocaleString('en-US');
    $('#meta').innerHTML =
      '<div><b>' + tris + '</b> 三角面</div>' +
      '<div><b>' + s.calls + '</b> 绘制批次 · ' + PARTS.length + ' 构件</div>' +
      '<div>three.js · 按需渲染 · CPU 拾取</div>';
  }

  if (!reduceMotion) {
    const autoBtn = $('#btnAuto');
    autoBtn.title = '自动环绕 (空格)';
  } else {
    document.body.classList.add('reduce-motion');
  }

  // re-measure once webfonts settle (label widths drive callout clamping)
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      for (let i = 0; i < labelW.length; i++) labelW[i] = 0;
      state.invalidate();
    });
  }

  // ---------------- test / deep-link API ----------------
  window.__ship = {
    ready: true,
    viewer: state,
    state,
    PARTS,
    stats: build.stats,
    setTheme, setLabels, setAuto, setExplode, select, focusPart, resetView,
    setVisible(i, on) {
      state.setVisible(i, on);
      syncPartRow(i);
      if (selPart === i) renderDetail();
    },
    setView: (y, p, d, t) => state.setView(y, p, d, t),
    setShift: (x, y) => state.setShift(x, y),
    setRoll: (r) => state.setRoll(r),
    pick: (x, y) => state.pick(x, y),
    togglePerf,
    getStats: () => state.getStats(),
    togglePanel(on) {
      const show = on === undefined ? panelEl.style.display === 'none' : !!on;
      panelEl.style.display = show ? '' : 'none';
      panelDirty = true;
      layoutFraming();
    },
  };

  return { viewer: state, rows, setTheme, setLabels, setAuto, setExplode, select, focusPart, resetView };
}
