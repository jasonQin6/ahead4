// ============================================================
//  自然选择号 · 舰艏 — procedural geometry
//  x = forward, y = up, z = port
// ============================================================

const MATS = {
  armor:   { c: [0.470, 0.487, 0.506], r: 0.58 },
  armorL:  { c: [0.560, 0.576, 0.596], r: 0.55 },
  armorD:  { c: [0.352, 0.366, 0.384], r: 0.62 },
  plate:   { c: [0.432, 0.448, 0.468], r: 0.57 },
  recess:  { c: [0.045, 0.048, 0.056], r: 0.85 },
  dark:    { c: [0.170, 0.177, 0.190], r: 0.68 },
  rubber:  { c: [0.145, 0.150, 0.160], r: 0.46 },
  metal:   { c: [0.430, 0.444, 0.462], r: 0.30 },
  ring:    { c: [0.500, 0.512, 0.528], r: 0.55 },
  ringDk:  { c: [0.235, 0.243, 0.256], r: 0.70 },
  steel:   { c: [0.330, 0.342, 0.360], r: 0.38 },
};
const M_ = k => MATS[k];
const cc = k => MATS[k].c;
const TAU = Math.PI * 2;

const PARTS = [
  { id: 0, name: '双轨主炮', en: 'RAILGUN PRONGS', color: '#7fd4ff',
    desc: '舰艏最前端的双轨电磁主炮:上下两条长导轨,内缘带装填齿,根部收束进炮座。',
    anchor: [8.60, 0.26, 0], off: [3.05, 0, 0] },
  { id: 1, name: '炮座万向节', en: 'GUN MOUNT', color: '#9fe0ff',
    desc: '球形万向节 + 耳轴 + 助退筒,把双轨炮连接到舰艏锥盾,可俯仰配平。',
    anchor: [7.52, 0.02, 0], off: [1.55, 0, 0] },
  { id: 2, name: '舰艏锥盾', en: 'NOSE SHIELD', color: '#ffd27f',
    desc: '七面体锥盾,承载顶部菱形装甲、侧舷小舱口与前端环形接驳口。',
    anchor: [6.80, 0.26, 0], off: [0.74, 0, 0] },
  { id: 3, name: '主装甲舱', en: 'MAIN ARMOUR', color: '#8effc2',
    desc: '舰艏主承力舱段:分层侧舷装甲、背部平甲板、X 形承力窗、纵向导管与检修板。',
    anchor: [4.95, 0.60, 0.50], off: [0, 0, 0] },
  { id: 4, name: '左舷吊舱', en: 'PORT PODS', color: '#ffa8d8',
    desc: '左舷两组外挂设备舱:带环形加强肋的前端与 X 形检修盖。',
    anchor: [5.15, 0.63, 0.78], off: [0, 0.5, 1.2] },
  { id: 5, name: '右舷吊舱', en: 'STBD PODS', color: '#ff9f9f',
    desc: '右舷对称的两组设备舱,构型与左舷一致。',
    anchor: [5.15, 0.63, -0.78], off: [0, 0.5, -1.2] },
  { id: 6, name: '背脊组件', en: 'DORSAL SPINE', color: '#d4b9ff',
    desc: '舰背中央的脊状设备舱、腹鳍龙骨与两根基座天线。',
    anchor: [5.30, 0.95, 0], off: [0, 1.7, 0] },
  { id: 7, name: '环座抱箍', en: 'RING CRADLE', color: '#ffe08a',
    desc: '颈部加强环、抱箍与锁紧螺栓,是巨环的承力基座。',
    anchor: [2.95, 0.62, 0.52], off: [-0.6, 0, 0] },
  { id: 8, name: '巨环', en: 'GIANT RING', color: '#8fd0ff',
    desc: '环绕舰体的巨型环带,外缘为双排履齿结构,由四组卡爪固定。',
    anchor: [2.42, 2.30, 0], off: [-1.9, 0, 0] },
  { id: 9, name: '球形储罐', en: 'SPHERE TANKS', color: '#ffb36b',
    desc: '两舷各三具球形储罐,深色涂层、带赤道焊缝与中央舱口。',
    anchor: [1.86, 0.80, 0.86], off: [-2.7, 0, 0] },
  { id: 10, name: '过渡脊', en: 'TRANSITION SPINE', color: '#a8b6ff',
    desc: '巨环之后的三段盒式脊节与核心舱,承载两侧散热组件并连接尾部引擎组。',
    anchor: [1.35, 0.55, 0.5], off: [-3.4, 0, 0] },
  { id: 11, name: '引擎鼓包', en: 'ENGINE CLUSTER', color: '#7fe6c0',
    desc: '六具并列主引擎鼓包,带加强环与尾部喷口,是整舰的推进核心。',
    anchor: [-0.9, 0.85, 0.8], off: [-5.4, 0, 0] },
  { id: 12, name: '尾段核心', en: 'STERN CORE', color: '#c8b6ff',
    desc: '尾部中央承力梁与尾锥,把引擎组、尾鳍与舰体主结构连成一体。',
    anchor: [-2.4, 0.35, 0.15], off: [-6.7, 0, 0] },
  { id: 13, name: '尾鳍组', en: 'STERN FINS', color: '#ffc48a',
    desc: '尾部六片后掠稳定鳍,兼具姿态控制与散热功能,是最醒目的尾部特征。',
    anchor: [-2.6, 1.25, 0.6], off: [-8.0, 0, 0] },
  { id: 14, name: '展示支架', en: 'DISPLAY STAND', color: '#a9b4c2',
    desc: '套件附带的展示支架:双支脚 + 弯曲支臂 + 承托夹,可单独显示或收起。',
    anchor: [0.4, -2.6, 0.3], off: [0, -3.2, 0] },
];

// stand hidden by default
PARTS[14].hiddenByDefault = true;

// global shaping: long & slightly flat
const SHIP_SCALE = [1.15, 0.90, 0.97];
for (const p of PARTS) {
  p.anchor = p.anchor.map((v, i) => v * SHIP_SCALE[i]);
  p.off = p.off.map((v, i) => v * SHIP_SCALE[i]);
}

// ---------- cross section ----------
const PROF = [
  [0.000, 1.000], [0.360, 1.000], [0.620, 0.970], [0.820, 0.870],
  [0.950, 0.640], [1.000, 0.320], [1.000, -0.160], [0.930, -0.480],
  [0.780, -0.720], [0.500, -0.900], [0.000, -1.000], [-0.500, -0.900],
  [-0.780, -0.720], [-0.930, -0.480], [-1.000, -0.160], [-1.000, 0.320],
  [-0.950, 0.640], [-0.820, 0.870], [-0.620, 0.970], [-0.360, 1.000],
];

const ST = [
  { x: 7.33, rz: 0.170, ry: 0.158 },
  { x: 7.05, rz: 0.250, ry: 0.230 },
  { x: 6.75, rz: 0.355, ry: 0.322 },
  { x: 6.45, rz: 0.480, ry: 0.430 },
  { x: 6.22, rz: 0.585, ry: 0.512 },
  { x: 5.95, rz: 0.665, ry: 0.578 },
  { x: 5.60, rz: 0.722, ry: 0.628 },
  { x: 5.20, rz: 0.765, ry: 0.665 },
  { x: 4.80, rz: 0.795, ry: 0.692 },
  { x: 4.40, rz: 0.820, ry: 0.714 },
  { x: 4.00, rz: 0.840, ry: 0.732 },
  { x: 3.70, rz: 0.850, ry: 0.742 },
  { x: 3.55, rz: 0.850, ry: 0.742 },
  { x: 3.42, rz: 0.830, ry: 0.730 },
  { x: 3.30, rz: 0.755, ry: 0.690 },
  { x: 3.16, rz: 0.705, ry: 0.660 },
  { x: 3.02, rz: 0.742, ry: 0.698 },
  { x: 2.90, rz: 0.862, ry: 0.820 },
  { x: 2.78, rz: 0.968, ry: 0.930 },
  { x: 2.66, rz: 1.010, ry: 0.975 },
  { x: 2.55, rz: 0.980, ry: 0.950 },
  { x: 2.46, rz: 0.900, ry: 0.872 },
  { x: 2.30, rz: 0.845, ry: 0.820 },
  { x: 2.15, rz: 0.855, ry: 0.830 },
  { x: 1.98, rz: 0.900, ry: 0.872 },
  { x: 1.80, rz: 0.930, ry: 0.900 },
  { x: 1.60, rz: 0.950, ry: 0.918 },
  { x: 1.02, rz: 0.958, ry: 0.925 },
];

function stAt(x) {
  if (x >= ST[0].x) return { rz: ST[0].rz, ry: ST[0].ry };
  const last = ST[ST.length - 1];
  if (x <= last.x) return { rz: last.rz, ry: last.ry };
  for (let i = 0; i < ST.length - 1; i++) {
    const a = ST[i], b = ST[i + 1];
    if (x <= a.x && x >= b.x) {
      const t = (a.x - x) / (a.x - b.x);
      return { rz: lerp(a.rz, b.rz, t), ry: lerp(a.ry, b.ry, t) };
    }
  }
  return { rz: 1, ry: 1 };
}
const cross2 = (a, b) => a[0] * b[1] - a[1] * b[0];

function surf(x, th) {
  const s = stAt(x);
  const d = [Math.sin(th) / s.rz, Math.cos(th) / s.ry];
  for (let i = 0; i < PROF.length; i++) {
    const a = PROF[i], b = PROF[(i + 1) % PROF.length];
    const e = [b[0] - a[0], b[1] - a[1]];
    const den = cross2(e, d);
    if (Math.abs(den) < 1e-9) continue;
    const t = -cross2(a, d) / den;
    if (t < -1e-6 || t > 1 + 1e-6) continue;
    const p = [a[0] + e[0] * t, a[1] + e[1] * t];
    if (p[0] * d[0] + p[1] * d[1] < 0) continue;
    return [x, p[1] * s.ry, p[0] * s.rz];
  }
  return [x, Math.cos(th) * s.ry, Math.sin(th) * s.rz];
}

function surfN(x, th) {
  const s = stAt(x);
  const dz = Math.sin(th), dy = Math.cos(th);
  for (let i = 0; i < PROF.length; i++) {
    const a = PROF[i], b = PROF[(i + 1) % PROF.length];
    const e = [b[0] - a[0], b[1] - a[1]];
    const n2 = [e[1], -e[0]];
    if (n2[0] * dz + n2[1] * dy > 0.2) return V.norm([0, n2[1] / s.ry, n2[0] / s.rz]);
  }
  return V.norm([0, Math.cos(th), Math.sin(th)]);
}
function surfT(x, th) { return V.norm([0, -Math.sin(th), Math.cos(th)]); }

// ---------- detail helpers ----------
function plateAt(b, x0, x1, t0, t1, opts = {}) {
  const mat = opts.mat || 'armor';
  const h = opts.h !== undefined ? opts.h : 0.06;
  const bevel = opts.bevel !== undefined ? opts.bevel : 0.022;
  const back = opts.back !== false;
  if (back) {
    const ex = opts.be || 0.048, et = opts.bt !== undefined ? opts.bt : 0.04;
    const base = [surf(x0 - ex, t0 - et), surf(x1 + ex, t0 - et), surf(x1 + ex, t1 + et), surf(x0 - ex, t1 + et)];
    const n = V.norm(V.add(V.add(surfN(x0, t0), surfN(x1, t1)), V.add(surfN(x1, t0), surfN(x0, t1))));
    raisedPoly(b, base, n, 0.024, 0.008, cc('recess'));
  }
  const base = [surf(x0, t0), surf(x1, t0), surf(x1, t1), surf(x0, t1)];
  const n = V.norm(V.add(V.add(surfN(x0, t0), surfN(x1, t1)), V.add(surfN(x1, t0), surfN(x0, t1))));
  raisedPoly(b, base, n, h, bevel, cc(opts.dark ? 'armorD' : mat));
  return { n, mid: surf((x0 + x1) / 2, (t0 + t1) / 2) };
}

function boltAt(b, p, n, r = 0.016, h = 0.014, col = 'metal') {
  pipe(b, V.add(p, V.mul(n, 0.002)), V.add(p, V.mul(n, h + 0.004)), r, r * 0.85, 6, cc(col), true);
}

function raisedOnFrame(b, p, u, t, n, sx, st, h, col, bevel = 0.008) {
  const base = [
    V.add(p, V.add(V.mul(u, -sx), V.mul(t, -st))), V.add(p, V.add(V.mul(u, sx), V.mul(t, -st))),
    V.add(p, V.add(V.mul(u, sx), V.mul(t, st))), V.add(p, V.add(V.mul(u, -sx), V.mul(t, st))),
  ];
  raisedPoly(b, base, n, h, bevel, col);
  return V.add(p, V.mul(n, h));
}

function xVent(b, x, th, sx, st, opts = {}) {
  const p = surf(x, th), n = surfN(x, th), t = surfT(x, th), u = [1, 0, 0];
  raisedOnFrame(b, p, u, t, n, sx * 1.05, st * 1.05, 0.025, cc('recess'), 0.004);
  const c = V.add(p, V.mul(n, 0.028));
  const d1 = V.norm(V.add(u, t)), d2 = V.norm(V.sub(u, t));
  const w = opts.bar || 0.022;
  obox(b, c, d1, V.cross(n, d1), n, sx * 0.82, w, 0.013, cc('armorL'));
  obox(b, c, d2, V.cross(n, d2), n, sx * 0.82, w, 0.015, cc('armorL'));
  const fr = 0.02;
  obox(b, V.add(c, V.add(V.mul(t, st), V.mul(n, 0.002))), u, t, n, sx, fr, 0.011, cc('armorD'));
  obox(b, V.add(c, V.add(V.mul(t, -st), V.mul(n, 0.002))), u, t, n, sx, fr, 0.011, cc('armorD'));
  obox(b, V.add(c, V.add(V.mul(u, sx), V.mul(n, 0.002))), u, t, n, fr, st, 0.011, cc('armorD'));
  obox(b, V.add(c, V.add(V.mul(u, -sx), V.mul(n, 0.002))), u, t, n, fr, st, 0.011, cc('armorD'));
  if (opts.bolts !== false) {
    for (const su of [-1, 1]) for (const sv of [-1, 1]) {
      boltAt(b, V.add(V.add(V.add(p, V.mul(u, su * sx * 1.18)), V.mul(t, sv * st * 1.18)), V.mul(n, 0.012)), n);
    }
  }
}

function grille(b, x, th, sx, st, slats = 4, opts = {}) {
  const p = surf(x, th), n = surfN(x, th), t = surfT(x, th), u = [1, 0, 0];
  raisedOnFrame(b, p, u, t, n, sx * 1.06, st * 1.06, 0.022, cc('recess'), 0.004);
  for (let i = 0; i < slats; i++) {
    const f = (i + 0.5) / slats * 2 - 1;
    const c = V.add(V.add(p, V.mul(t, f * st * 0.78)), V.mul(n, 0.026));
    obox(b, c, u, t, n, sx * 0.86, st * 0.30 / slats, 0.011, cc('armorD'));
  }
  for (const s of [-1, 1]) boltAt(b, V.add(V.add(p, V.mul(t, s * st * 1.12)), V.mul(n, 0.012)), n);
}

function microPlate(b, x, th, sx, st, mat = 'armorL', h = 0.03) {
  const p = surf(x, th), n = surfN(x, th), t = surfT(x, th), u = [1, 0, 0];
  raisedOnFrame(b, p, u, t, n, sx, st, h, cc(mat), Math.min(h * 0.4, 0.012));
}

function loftRings(b, rings, col, capFirst, capLast) {
  const P = rings[0].length;
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < P; j++) {
      const j2 = (j + 1) % P;
      b.quad(rings[i][j], rings[i][j2], rings[i + 1][j2], rings[i + 1][j], col);
    }
  }
  if (capFirst) {
    const r = rings[0], nrm = [-1, 0, 0];
    for (let j = 0; j < P; j++) b.tri([r[0][0], 0, 0], r[(j + 1) % P], r[j], col, nrm, nrm, nrm);
  }
  if (capLast) {
    const r = rings[rings.length - 1], nrm = [1, 0, 0];
    for (let j = 0; j < P; j++) b.tri([r[0][0], 0, 0], r[j], r[(j + 1) % P], col, nrm, nrm, nrm);
  }
}

function hullRings(x0, x1, steps, scale = 1) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const x = lerp(x0, x1, i / steps), s = stAt(x);
    out.push(PROF.map(([z, y]) => [x, y * s.ry * scale, z * s.rz * scale]));
  }
  return out;
}

function revolveX(b, profile, segs, col, opts = {}) {
  for (let i = 0; i < profile.length - 1; i++) {
    const [x0, r0] = profile[i], [x1, r1] = profile[i + 1];
    const dx = x1 - x0, dr = r1 - r0, l = Math.hypot(dx, dr) || 1;
    const n = [-dr / l, dx / l];
    for (let j = 0; j < segs; j++) {
      const a0 = j / segs * TAU, a1 = (j + 1) / segs * TAU;
      const P = (x, r, a) => [x, r * Math.cos(a), r * Math.sin(a)];
      const N = (a) => [n[0], n[1] * Math.cos(a), n[1] * Math.sin(a)];
      b.quad(P(x0, r0, a0), P(x0, r0, a1), P(x1, r1, a1), P(x1, r1, a0), col, N(a0), N(a1), N(a1), N(a0));
    }
  }
}

// ============================================================
function buildShip(b) {
  buildCore(b);
  buildNoseCone(b);
  buildMainHull(b);
  buildPods(b);
  buildSpine(b);
  buildGun(b);
  buildRails(b);
  buildCollar(b);
  buildRing(b);
  buildSpheres(b);
  buildWaist(b);
  buildEngines(b);
  buildTail(b);
  buildFins(b);
  buildStand(b);
  const [sx, sy, sz] = SHIP_SCALE;
  for (let i = 0; i < b.buf.length; i += FPV) {
    b.buf[i] *= sx; b.buf[i + 1] *= sy; b.buf[i + 2] *= sz;
    let nx = b.buf[i + 3] / sx, ny = b.buf[i + 4] / sy, nz = b.buf[i + 5] / sz;
    const l = Math.hypot(nx, ny, nz) || 1;
    b.buf[i + 3] = nx / l; b.buf[i + 4] = ny / l; b.buf[i + 5] = nz / l;
  }
}

function buildCore(b) {
  b.begin(3, 0.8, 0, 0);
  loftRings(b, hullRings(6.5, 1.03, 30, 0.80), cc('recess'), true, true);
  for (let i = 0; i < 3; i++) {
    const x = 2.2 - i * 0.36;
    revolveX(b, [[x - 0.02, 0.80], [x + 0.02, 0.80]], 14, cc('dark'));
  }
  b.end();
}

// ---------- nose cone ----------
function buildNoseCone(b) {
  b.begin(2, 0.58, 0, 1);
  loftRings(b, hullRings(7.33, 6.44, 12), cc('armor'), true, false);
  b.end();

  b.begin(2, 0.6, 0, 1);
  const T = d => d * Math.PI / 180;
  // faceted longitudinal panels
  for (const th of [0, Math.PI, T(58), T(-58), T(122), T(-122)]) {
    plateAt(b, 7.24, 6.50, th - 0.16, th + 0.16, { h: 0.032, bevel: 0.01, back: true, be: 0.02, bt: 0.014, mat: 'armorL' });
  }
  // dorsal arrow plate
  {
    const pts = [surf(7.20, 0), surf(6.99, 0.52), surf(6.48, 0.42), surf(6.48, -0.42), surf(6.99, -0.52)];
    const n = surfN(6.88, 0);
    raisedPoly(b, pts, n, 0.05, 0.02, cc('armorL'));
    const pts2 = pts.map(p => V.add(V.add(p, V.mul(n, 0.045)), V.mul(V.sub(surf(6.88, 0), p), 0.13)));
    raisedPoly(b, pts2, n, 0.018, 0.012, cc('armor'));
    // recessed hatch in the arrow
    const c = surf(6.86, 0);
    raisedOnFrame(b, V.add(c, V.mul(n, 0.064)), [1, 0, 0], surfT(6.86, 0), n, 0.13, 0.085, 0.012, cc('recess'), 0.004);
    // ventral smaller plate
    const pv = pts.map(p => [p[0], -p[1], p[2]]);
    raisedPoly(b, pv, [n[0], -n[1], n[2]], 0.038, 0.018, cc('armorD'));
  }
  // side chevron plates
  {
    const T2 = d => d * Math.PI / 180;
    for (const s of [1, -1]) {
      for (let k = 0; k < 3; k++) {
        const x0 = 7.02 - k * 0.16, x1 = x0 - 0.12;
        const a = s * (T2(52) + k * T2(9)), c = s * (T2(96) + k * T2(9));
        plateAt(b, x1, x0, Math.min(a, c) + 0.03, Math.max(a, c) - 0.03, { h: 0.035, bevel: 0.012, back: true, be: 0.015, bt: 0.012, mat: k % 2 ? 'armorL' : 'armor' });
      }
    }
  }
  // collar rings
  for (const [x, r, w, col] of [[7.06, 0.265, 0.05, 'armorD'], [6.72, 0.39, 0.05, 'metal'], [6.48, 0.46, 0.06, 'armorD']]) {
    b.begin(2, 0.5, 0, 0);
    revolveX(b, [[x - w, r * 0.98], [x - w * 0.5, r * 1.06], [x + w * 0.5, r * 1.06], [x + w, r * 0.98]], 22, cc(col));
    b.end();
  }
  b.begin(2, 0.6, 0, 1);
  for (const s of [1, -1]) {
    microPlate(b, 6.86, s * 1.15, 0.10, 0.08, 'armorD', 0.024);
    microPlate(b, 6.62, s * 2.1, 0.09, 0.07, 'armorL', 0.02);
    grille(b, 7.00, s * 1.7, 0.065, 0.05, 3);
    xVent(b, 6.63, s * 1.55, 0.06, 0.05, { bar: 0.012, bolts: false });
    // raised ribs along the cone
    for (let i = 0; i < 3; i++) {
      const x = 7.02 - i * 0.16;
      const pp = V.add(surf(x, s * 0.9), V.mul(surfN(x, s * 0.9), 0.01));
      // thin longitudinal rib
      obox(b, pp, [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.05, 0.012, 0.012, cc('armorD'));
    }
  }
  b.end();
}

// ---------- main armoured hull ----------
function buildMainHull(b) {
  b.begin(3, 0.6, 0, 1);
  loftRings(b, hullRings(6.44, 3.42, 26), cc('armor'), false, true);
  b.end();

  const T = d => d * Math.PI / 180;
  b.begin(3, 0.6, 0, 1);
  // dorsal flat deck + spine
  plateAt(b, 6.24, 3.50, -T(50), T(50), { h: 0.085, bevel: 0.032, back: true, be: 0.04, bt: 0.03, mat: 'armorL' });
  plateAt(b, 6.10, 3.60, -T(42), T(42), { h: 0.045, bevel: 0.022, back: false, mat: 'armor' });
  plateAt(b, 5.86, 3.72, -T(24), T(24), { h: 0.115, bevel: 0.03, back: true, be: 0.05, bt: 0.035, mat: 'armorL' });
  xVent(b, 5.42, 0, 0.30, 0.13, { bar: 0.024 });
  grille(b, 4.72, 0, 0.22, 0.085, 4);
  grille(b, 4.16, 0, 0.18, 0.07, 3);
  // long deck rails
  for (const z of [0.24, -0.24]) {
    const x0 = 6.02, x1 = 3.66;
    const p0 = [x0, stAt(x0).ry + 0.10, z], p1 = [x1, stAt(x1).ry + 0.10, z];
    pipe(b, p0, p1, 0.022, 0.022, 6, cc('armorD'), false);
    for (let i = 0; i < 6; i++) {
      const x = lerp(x0, x1, (i + 0.5) / 6);
      obox(b, [x, stAt(x).ry + 0.105, z], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.035, 0.03, 0.038, cc('armorD'));
    }
  }
  // deck panel row
  for (let i = 0; i < 4; i++) {
    microPlate(b, 5.72 - i * 0.5, 0.52, 0.11, 0.06, i % 2 ? 'armorL' : 'armorD', 0.026);
    microPlate(b, 5.72 - i * 0.5, -0.52, 0.11, 0.06, i % 2 ? 'armorD' : 'armorL', 0.026);
  }
  // dorsal spine ridge
  const ridge = [];
  for (let i = 0; i <= 8; i++) {
    const x = lerp(6.14, 3.6, i / 8), y = stAt(x).ry + 0.115;
    ridge.push([x, y + 0.075, -0.06], [x, y + 0.075, 0.06], [x, y - 0.02, 0.115], [x, y - 0.02, -0.115]);
  }
  for (let i = 0; i < 8; i++) for (let k = 0; k < 4; k++) {
    const k2 = (k + 1) % 4;
    b.quad(ridge[i * 4 + k], ridge[i * 4 + k2], ridge[(i + 1) * 4 + k2], ridge[(i + 1) * 4 + k], cc('armorD'));
  }
  for (let i = 0; i < 7; i++) {
    const x = lerp(6.05, 3.68, i / 6), y = stAt(x).ry + 0.115 + 0.075;
    obox(b, [x, y + 0.012, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.028, 0.024, 0.085, cc('armorL'));
  }
  b.end();

  b.begin(3, 0.6, 0, 1);
  for (const s of [1, -1]) {
    // big flank plate (two facets wide)
    plateAt(b, 5.90, 3.58, s * T(52), s * T(103), { h: 0.09, bevel: 0.038, back: true, be: 0.04, bt: 0.03, mat: 'plate' });
    // inner framed panel
    plateAt(b, 5.76, 3.72, s * T(58), s * T(97), { h: 0.045, bevel: 0.022, back: false, mat: 'armorL' });
    // forward wedge
    const a = s * T(52), c = s * T(103);
    const wx = [surf(6.34, a + 0.08), surf(5.92, a + 0.04), surf(5.92, c - 0.04), surf(6.26, c - 0.18)];
    raisedPoly(b, wx, surfN(6.05, (a + c) / 2), 0.06, 0.024, cc('armorD'));
    // shoulder band
    plateAt(b, 5.66, 3.66, s * T(26), s * T(50), { h: 0.055, bevel: 0.024, back: true, be: 0.024, bt: 0.02, mat: 'armor' });
    // bold sponson plate (stepped out armour module)
    plateAt(b, 5.62, 3.86, s * T(62), s * T(92), { h: 0.155, bevel: 0.045, back: true, be: 0.06, bt: 0.05, mat: 'armorL' });
    plateAt(b, 5.50, 3.98, s * T(67), s * T(87), { h: 0.05, bevel: 0.02, back: false, mat: 'armor' });
    // detail row on the sponson
    for (let i = 0; i < 5; i++) {
      const x = 5.42 - i * 0.32;
      microPlate(b, x, s * T(64), 0.085, 0.045, i % 2 ? 'armorD' : 'armorL', 0.028);
      boltAt(b, V.add(V.add(surf(x, s * T(64)), V.mul(surfN(x, s * T(64)), 0.135)), V.mul(surfT(x, s * T(64)), 0.075)), surfN(x, s * T(64)), 0.013, 0.012);
    }
    // louvers on the sponson
    for (let i = 0; i < 4; i++) {
      const x = 5.30 - i * 0.26;
      grille(b, x, s * T(74), 0.085, 0.045, 3, {});
    }
    // sponson end caps (hard steps)
    for (const xx of [5.66, 3.82]) {
      const c0 = surf(xx, s * T(62)), c1 = surf(xx, s * T(92));
      const nn = V.norm(V.add(surfN(xx, s * T(62)), surfN(xx, s * T(92))));
      const off = V.mul(nn, 0.10);
      const b0 = [c0, c1, V.add(c1, V.mul(surfN(xx, s * T(92)), 0.16)), V.add(c0, V.mul(surfN(xx, s * T(62)), 0.16))];
      raisedPoly(b, b0, [1, 0, 0], xx < 5 ? 0.02 : 0.02, 0.01, cc('armorD'));
    }
    // lower flank
    plateAt(b, 5.52, 3.64, s * T(105), s * T(134), { h: 0.06, bevel: 0.026, back: true, be: 0.026, bt: 0.02, mat: 'armor' });
    // bottom keel plate
    plateAt(b, 5.30, 3.70, s * T(142), s * T(178), { h: 0.05, bevel: 0.022, back: true, be: 0.024, bt: 0.018, mat: 'armorD' });
    // hero details
    xVent(b, 5.02, s * T(78), 0.30, 0.20, { bar: 0.028 });
    grille(b, 4.52, s * T(78), 0.25, 0.10, 5);
    microPlate(b, 4.02, s * T(78), 0.20, 0.155, 'armorD', 0.034);
    grille(b, 4.02, s * T(78), 0.13, 0.055, 3);
    // strong waterline chine + undercut shadow line
    {
      const th = s * T(92);
      const pts = [];
      for (let i = 0; i <= 10; i++) pts.push(surf(lerp(6.30, 3.52, i / 10), th));
      for (let i = 0; i < 10; i++) {
        const n0 = surfN(lerp(6.30, 3.52, i / 10), th), n1 = surfN(lerp(6.30, 3.52, (i + 1) / 10), th);
        const a = V.add(pts[i], V.mul(n0, 0.035)), b2 = V.add(pts[i + 1], V.mul(n1, 0.035));
        const c = V.add(pts[i + 1], V.mul(n1, 0.10)), d = V.add(pts[i], V.mul(n0, 0.10));
        b.quad(a, b2, c, d, cc('armorD'));
        const e = V.add(pts[i + 1], V.mul(n1, 0.10)), f = V.add(pts[i], V.mul(n0, 0.10));
        const g = V.add(pts[i + 1], V.mul(n1, 0.165)), h = V.add(pts[i], V.mul(n0, 0.165));
        b.quad(f, e, g, h, cc('armorL'));
        b.quad(h, g, V.add(pts[i + 1], V.mul(n1, 0.155)), V.add(pts[i], V.mul(n0, 0.155)), cc('dark'));
      }
      // ribs on the chine
      for (let i = 0; i < 6; i++) {
        const x = lerp(6.05, 3.7, i / 5);
        const p = V.add(surf(x, th), V.mul(surfN(x, th), 0.12));
        obox(b, p, [1, 0, 0], surfT(x, th), surfN(x, th), 0.035, 0.05, 0.045, cc('armorD'));
      }
    }
    // long edge ribs
    for (const th of [T(56), T(99)]) {
      const p0 = V.add(surf(5.90, s * th), V.mul(surfN(5.9, s * th), 0.03));
      const p1 = V.add(surf(3.62, s * th), V.mul(surfN(3.62, s * th), 0.03));
      pipe(b, p0, p1, 0.026, 0.026, 6, cc('armorD'), false);
    }
    // shoulder rib strip
    for (let i = 0; i < 9; i++) {
      const x = 5.86 - i * 0.25;
      microPlate(b, x, s * T(40), 0.09, 0.045, i % 3 === 0 ? 'armorD' : 'armorL', 0.026);
    }
    // lower flank hatches (row)
    for (let i = 0; i < 4; i++) {
      const x = 5.42 - i * 0.42;
      microPlate(b, x, s * T(118), 0.13, 0.06, 'armorL', 0.03);
      boltAt(b, V.add(surf(x, s * T(118)), V.mul(surfN(x, s * T(118)), 0.05)), surfN(x, s * T(118)), 0.012, 0.01);
    }
    // belly panel frames
    for (let i = 0; i < 2; i++) {
      const x0 = 5.30 - i * 0.72, x1 = x0 - 0.56;
      plateAt(b, x1, x0, s * T(152), s * T(176), { h: 0.035, bevel: 0.014, back: true, be: 0.018, bt: 0.012, mat: 'armorD' });
    }
    // corner bolts on the flank plate
    for (const xx of [5.82, 3.66]) for (const tt of [s * T(56), s * T(99)]) {
      boltAt(b, V.add(surf(xx, tt), V.mul(surfN(xx, tt), 0.088)), surfN(xx, tt), 0.014, 0.012);
    }
    // conduits along shoulder
    for (const th of [T(46), T(112)]) {
      const pts = [];
      for (let i = 0; i <= 6; i++) {
        const x = lerp(6.0, 3.6, i / 6);
        pts.push(V.add(surf(x, s * th), V.mul(surfN(x, s * th), 0.04)));
      }
      for (let i = 0; i < 6; i++) pipe(b, pts[i], pts[i + 1], 0.022, 0.022, 6, cc('steel'), false);
      for (let i = 0; i <= 6; i++) {
        const n2 = surfN(lerp(6.0, 3.6, i / 6), s * th);
        pipe(b, pts[i], V.add(pts[i], V.mul(n2, 0.02)), 0.034, 0.03, 6, cc('armorD'), false);
      }
    }
    // small vent stacks on the flank plate
    for (let i = 0; i < 3; i++) {
      const x = 5.55 - i * 0.34, th = s * T(66);
      const p = V.add(surf(x, th), V.mul(surfN(x, th), 0.095));
      const t = surfT(x, th), n = surfN(x, th);
      obox(b, p, [1, 0, 0], t, n, 0.06, 0.05, 0.022, cc('armorD'));
      obox(b, V.add(p, V.mul(n, 0.024)), [1, 0, 0], t, n, 0.045, 0.032, 0.012, cc('recess'));
    }
  }
  b.end();

  b.begin(3, 0.6, 0, 1);
  // rear shoulder step around the hull
  for (let i = 0; i < 10; i++) {
    const t0 = i / 10 * TAU, t1 = (i + 1) / 10 * TAU;
    plateAt(b, 3.84, 3.56, t0 + 0.05, t1 - 0.05, { h: 0.04, bevel: 0.014, back: false, mat: i % 2 ? 'armorD' : 'armor' });
  }
  // ---- fine greeble rows (deterministic) ----
  let seed = 8123;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (const s of [1, -1]) {
    // deck edge row
    for (let i = 0; i < 9; i++) {
      const x = 6.02 - i * 0.28 + (rnd() - 0.5) * 0.04;
      const th = s * (0.60 + (i % 3) * 0.03 + rnd() * 0.02);
      const w = 0.055 + rnd() * 0.045, hgt = 0.03 + rnd() * 0.02;
      microPlate(b, x, th, w, hgt, rnd() > 0.55 ? 'armorD' : 'armorL', 0.018 + rnd() * 0.012);
      if (rnd() > 0.5) boltAt(b, V.add(surf(x, th), V.mul(surfN(x, th), 0.04)), surfN(x, th), 0.011, 0.009);
    }
    // belly row
    for (let i = 0; i < 8; i++) {
      const x = 5.92 - i * 0.30 + (rnd() - 0.5) * 0.05;
      const th = s * (2.10 + (i % 2) * 0.04 + rnd() * 0.02);
      microPlate(b, x, th, 0.06 + rnd() * 0.04, 0.032 + rnd() * 0.02, rnd() > 0.5 ? 'armorL' : 'armorD', 0.02);
    }
    // small sensor blisters
    for (let i = 0; i < 2; i++) {
      const x = 5.5 - i * 0.85, th = s * (0.95 + i * 0.15);
      const p = V.add(surf(x, th), V.mul(surfN(x, th), 0.105));
      const n = surfN(x, th), t = surfT(x, th);
      pipe(b, p, V.add(p, V.mul(n, 0.03)), 0.05, 0.035, 10, cc('armorD'), false);
      pipe(b, V.add(p, V.mul(n, 0.03)), V.add(p, V.mul(n, 0.045)), 0.026, 0.02, 8, cc('dark'), true);
    }
    // small pipe pair along the belly
    for (let i = 0; i < 2; i++) {
      const th = s * (2.35 + i * 0.10);
      const pts = [];
      for (let k = 0; k <= 5; k++) { const x = lerp(5.8, 3.8, k / 5); pts.push(V.add(surf(x, th), V.mul(surfN(x, th), 0.03))); }
      for (let k = 0; k < 5; k++) pipe(b, pts[k], pts[k + 1], 0.014, 0.014, 5, cc('steel'), false);
    }
  }
  // ring rim bolts
  // lateral thruster blocks near the stern of the block
  for (const s of [1, -1]) {
    const p = surf(3.66, s * 1.75);
    const n = surfN(3.66, s * 1.75);
    obox(b, V.add(p, V.mul(n, 0.06)), [1, 0, 0], surfT(3.66, s * 1.75), n, 0.10, 0.07, 0.05, cc('armorD'));
    for (let k = 0; k < 3; k++) obox(b, V.add(V.add(p, V.mul(n, 0.11)), V.mul(surfT(3.66, s * 1.75), (k - 1) * 0.045)), [1, 0, 0], surfT(3.66, s * 1.75), n, 0.07, 0.012, 0.03, cc('recess'));
  }
  b.end();
}

// ---------- side pods ----------
function podShape(b, id, s, cfg) {
  const th = cfg.th, x0 = cfg.x0, x1 = cfg.x1, rad = cfg.r;
  b.begin(id, 0.58, 0, 0);
  const secs = [];
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = lerp(x0, x1, t);
    const r = rad * (1 - 0.24 * Math.pow(t, 3.0)) * (1 + 0.05 * Math.sin(t * Math.PI));
    const c = V.add(surf(x, s * th), V.mul(surfN(x, s * th), rad * 0.52));
    const tng = surfT(x, s * th), nn = surfN(x, s * th);
    const pts = [];
    const K = 8;
    for (let k = 0; k < K; k++) {
      const a = (k / K) * TAU + Math.PI / 8;
      pts.push(V.add(c, V.add(V.mul(tng, Math.cos(a) * r * 0.92), V.mul(nn, Math.sin(a) * r * 0.70))));
    }
    secs.push(pts);
  }
  for (let i = 0; i < secs.length - 1; i++) for (let k = 0; k < 8; k++) {
    const k2 = (k + 1) % 8;
    b.quad(secs[i][k], secs[i][k2], secs[i + 1][k2], secs[i + 1][k], cc('armor'));
  }
  for (const [idx, flip] of [[0, true], [secs.length - 1, false]]) {
    const ring = secs[idx];
    const cen = ring.reduce((a, p) => V.add(a, p), [0, 0, 0]).map(v => v / 8);
    const nn = flip ? [-1, 0, 0] : [1, 0, 0];
    for (let k = 0; k < 8; k++) b.tri(cen, ring[k], ring[(k + 1) % 8], cc('armorD'), nn, nn, nn);
  }
  b.end();

  b.begin(id, 0.55, 0, 0);
  for (let i = 0; i < 3; i++) {
    const x = x0 - 0.10 - i * 0.10;
    const c = V.add(surf(x, s * th), V.mul(surfN(x, s * th), rad * 0.52));
    const tng = surfT(x, s * th), nn = surfN(x, s * th);
    const N = 16, pts = [];
    for (let k = 0; k < N; k++) {
      const a = k / N * TAU;
      pts.push(V.add(c, V.add(V.mul(tng, Math.cos(a) * rad * 1.06), V.mul(nn, Math.sin(a) * rad * 0.82))));
    }
    for (let k = 0; k < N; k++) {
      const k2 = (k + 1) % N;
      const q0 = V.add(pts[k], [0.032, 0, 0]), q1 = V.add(pts[k2], [0.032, 0, 0]);
      const r0 = V.sub(pts[k], [0.032, 0, 0]), r1 = V.sub(pts[k2], [0.032, 0, 0]);
      b.quad(r0, r1, q1, q0, cc('armorL'));
    }
  }
  b.end();

  b.begin(id, 0.6, 0, 0);
  const cx = lerp(x0, x1, 0.56);
  const pc = V.add(surf(cx, s * th), V.mul(surfN(cx, s * th), rad * 1.18));
  const tng = surfT(cx, s * th), nn = surfN(cx, s * th), ax = [1, 0, 0];
  // outer access panel with X
  const base = [
    V.add(pc, V.add(V.mul(ax, -rad * 0.62), V.mul(tng, -rad * 0.62))), V.add(pc, V.add(V.mul(ax, rad * 0.62), V.mul(tng, -rad * 0.62))),
    V.add(pc, V.add(V.mul(ax, rad * 0.62), V.mul(tng, rad * 0.62))), V.add(pc, V.add(V.mul(ax, -rad * 0.62), V.mul(tng, rad * 0.62))),
  ];
  raisedPoly(b, base, nn, 0.03, 0.012, cc('armorD'));
  const pc2 = V.add(pc, V.mul(nn, 0.03));
  const d1 = V.norm(V.add(ax, tng)), d2 = V.norm(V.sub(ax, tng));
  obox(b, pc2, d1, V.cross(nn, d1), nn, rad * 0.46, 0.018, 0.012, cc('armorL'));
  obox(b, pc2, d2, V.cross(nn, d2), nn, rad * 0.46, 0.018, 0.014, cc('armorL'));
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    boltAt(b, V.add(V.add(V.add(pc, V.mul(ax, su * rad * 0.68)), V.mul(tng, sv * rad * 0.68)), V.mul(nn, 0.02)), nn, 0.012, 0.01);
  }
  for (let i = 0; i < 3; i++) {
    const x = lerp(x0, x1, 0.18 + i * 0.16);
    const p = V.add(surf(x, s * th), V.mul(surfN(x, s * th), rad * 1.14));
    obox(b, p, ax, tng, nn, 0.055, rad * 0.2, 0.018, cc('armorD'));
  }
  b.end();
}

function buildPods(b) {
  const T = d => d * Math.PI / 180;
  podShape(b, 4, 1, { th: T(34), x0: 6.02, x1: 4.30, r: 0.315 });
  podShape(b, 4, 1, { th: T(126), x0: 5.42, x1: 4.14, r: 0.275 });
  podShape(b, 5, -1, { th: T(34), x0: 6.02, x1: 4.30, r: 0.315 });
  podShape(b, 5, -1, { th: T(126), x0: 5.42, x1: 4.14, r: 0.275 });
}

// ---------- dorsal spine & keel ----------
function buildSpine(b) {
  b.begin(6, 0.55, 0, 0);
  const x0 = 6.05, x1 = 4.24, r = 0.245;
  const secs = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10, x = lerp(x0, x1, t);
    const s = stAt(x);
    const yb = s.ry + 0.02;
    const hh = r * (1 - 0.15 * t), ww = r * (1 - 0.03 * t);
    secs.push([
      [x, yb + hh, -ww * 0.7], [x, yb + hh * 0.85, ww * 0.85],
      [x, yb + hh * 0.1, ww], [x, yb - 0.02, ww * 0.9],
      [x, yb - 0.02, -ww * 0.9], [x, yb + hh * 0.1, -ww],
      [x, yb + hh * 0.85, -ww * 0.85],
    ]);
  }
  for (let i = 0; i < secs.length - 1; i++) for (let k = 0; k < 7; k++) {
    const k2 = (k + 1) % 7;
    b.quad(secs[i][k], secs[i][k2], secs[i + 1][k2], secs[i + 1][k], cc('armor'));
  }
  for (const [idx, nn] of [[0, [-1, 0, 0]], [secs.length - 1, [1, 0, 0]]]) {
    const ring = secs[idx], cen = ring.reduce((a, p) => V.add(a, p), [0, 0, 0]).map(v => v / ring.length);
    for (let k = 0; k < 7; k++) b.tri(cen, ring[k], ring[(k + 1) % 7], cc('armorD'), nn, nn, nn);
  }
  // front ribs
  for (let i = 0; i < 3; i++) {
    const x = x0 - 0.10 - i * 0.10;
    const s = stAt(x), yb = s.ry + 0.02, hh = r;
    const N = 14;
    for (let k = 0; k < N; k++) {
      const a0 = k / N * TAU, a1 = (k + 1) / N * TAU;
      const P = (a, xx) => [xx, yb + hh * 0.45 + Math.cos(a) * hh * 0.66, Math.sin(a) * r * 1.02];
      b.quad(P(a0, x - 0.028), P(a1, x - 0.028), P(a1, x + 0.028), P(a0, x + 0.028), cc('armorD'));
    }
  }
  b.end();

  b.begin(6, 0.45, 0, 0);
  for (const s of [1, -1]) {
    const base = [4.72, stAt(4.72).ry + 0.10, s * 0.15];
    const tip = [5.92, stAt(5.92).ry + 0.30, s * 0.22];
    pipe(b, base, tip, 0.016, 0.008, 6, cc('metal'), true);
    obox(b, [4.72, stAt(4.72).ry + 0.09, s * 0.15], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.06, 0.05, 0.035, cc('dark'));
    pipe(b, [5.55, stAt(5.55).ry + 0.17, s * 0.19], [5.55, stAt(5.55).ry + 0.24, s * 0.19], 0.02, 0.02, 6, cc('dark'));
  }
  b.end();

  // ventral keel blade
  b.begin(6, 0.6, 0, 0);
  const rings = [];
  for (let i = 0; i <= 10; i++) {
    const x = lerp(5.95, 3.95, i / 10), s = stAt(x);
    const d = 0.30 * Math.sin(Math.PI * (i / 10) * 0.9 + 0.1) + 0.02;
    rings.push([[x, -s.ry + 0.02, -0.045], [x, -s.ry - d, -0.022], [x, -s.ry - d, 0.022], [x, -s.ry + 0.02, 0.045]]);
  }
  for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < 4; k++) {
    const k2 = (k + 1) % 4;
    b.quad(rings[i][k], rings[i][k2], rings[i + 1][k2], rings[i + 1][k], cc('armorD'));
  }
  b.end();
}

// ---------- gun mount ----------
function buildGun(b) {
  b.begin(1, 0.5, 0, 0);
  revolveX(b, [[7.28, 0.14], [7.31, 0.19], [7.40, 0.23], [7.50, 0.22], [7.58, 0.155]], 18, cc('armorD'));
  sphere(b, [7.44, 0, 0], 0.205, 18, 12, cc('steel'));
  pipe(b, [7.44, 0, -0.40], [7.44, 0, 0.40], 0.075, 0.075, 12, cc('metal'));
  for (const s of [-1, 1]) pipe(b, [7.44, 0, s * 0.38], [7.44, 0, s * 0.44], 0.12, 0.105, 12, cc('armorD'));
  // yoke to rails
  for (const s of [-1, 1]) {
    obox(b, [7.76, s * 0.25, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.20, 0.19, 0.035, cc('armor'));
    obox(b, [7.58, s * 0.15, 0], [0.7, s * 0.7, 0], [0, 0, 1], [s * 0.7, -0.7, 0], 0.20, 0.05, 0.035, cc('armorD'));
    boltAt(b, [7.76, s * 0.25, 0.04], [0, 0, 1], 0.02, 0.014);
  }
  // trunnion housing
  obox(b, [7.46, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.16, 0.19, 0.20, cc('armorD'));
  // receiver block
  obox(b, [7.26, -0.18, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.24, 0.115, 0.185, cc('armor'));
  obox(b, [7.26, -0.30, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.19, 0.02, 0.14, cc('armorD'));
  for (let i = 0; i < 3; i++) obox(b, [7.14 - i * 0.085, -0.18, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.016, 0.085, 0.14, cc('recess'));
  // barrel
  pipe(b, [7.48, 0, 0], [8.24, 0, 0], 0.062, 0.052, 14, cc('metal'), true);
  for (const x of [8.04, 8.17]) revolveX(b, [[x - 0.016, 0.066], [x, 0.076], [x + 0.016, 0.066]], 14, cc('dark'));
  // muzzle
  pipe(b, [8.22, 0, 0], [8.30, 0, 0], 0.072, 0.062, 12, cc('dark'));
  b.end();
}

// ---------- railgun prongs (vertical fork) ----------
function buildRails(b) {
  b.begin(0, 0.50, 0, 0);
  const shape = [
    [-1.00, -0.52], [1.00, -0.52], [1.00, 0.12], [0.55, 0.42],
    [0.00, 0.52], [-0.55, 0.42], [-1.00, 0.12],
  ];
  for (const s of [1, -1]) {             // s=+1 upper, -1 lower
    const yc = s * 0.265;
    const stations = [
      [10.22, 0.030, 0.050], [9.85, 0.072, 0.122], [9.44, 0.103, 0.168],
      [9.02, 0.122, 0.195], [8.66, 0.130, 0.205], [8.38, 0.122, 0.195],
      [8.10, 0.112, 0.182], [7.98, 0.160, 0.270], [7.82, 0.198, 0.320],
      [7.58, 0.218, 0.350],
    ];
    const rings = stations.map(([x, w, h]) => shape.map(([pz, py]) => [x, yc + s * py * h, pz * w]));
    loftRings(b, rings, cc('armor'), true, true);
    // inner rack teeth
    for (let i = 0; i < 11; i++) {
      const x = 9.15 - i * 0.088;
      const yy = yc - s * 0.155;
      obox(b, [x, yy, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.03, 0.032, 0.075, cc('armorD'));
    }
    // outer ridge plates
    for (let i = 0; i < 4; i++) {
      const x = 8.98 - i * 0.18;
      obox(b, [x, yc + s * 0.188, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.075, 0.026, 0.030, cc('armorL'));
    }
    // base shoulder plate
    obox(b, [7.68, yc, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.12, 0.17, 0.115, cc('armorL'));
    // dark inset on the blade flank
    obox(b, [9.35, yc, 0.118], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.22, 0.042, 0.016, cc('dark'));
    obox(b, [9.35, yc, -0.118], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.22, 0.042, 0.016, cc('dark'));
  }
  // cross brace + stock plate between the prongs
  obox(b, [8.05, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.03, 0.25, 0.05, cc('armorD'));
  obox(b, [7.70, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.12, 0.36, 0.13, cc('armor'));
  obox(b, [7.70, 0, 0.14], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.09, 0.30, 0.02, cc('armorD'));
  obox(b, [7.70, 0, -0.14], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.09, 0.30, 0.02, cc('armorD'));
  b.end();
}

// ---------- ring cradle ----------
function buildCollar(b) {
  b.begin(7, 0.60, 0, 1);
  loftRings(b, hullRings(3.44, 2.48, 12), cc('armor'), false, true);
  b.end();

  b.begin(7, 0.55, 0, 0);
  for (const [x, r, w, col] of [[3.40, 0.862, 0.07, 'armorD'], [3.02, 0.762, 0.075, 'metal'], [2.86, 0.90, 0.075, 'armorD'], [2.64, 1.02, 0.08, 'armorD']]) {
    revolveX(b, [[x - w, r], [x - w * 0.5, r * 1.035], [x + w * 0.5, r * 1.035], [x + w, r]], 22, cc(col));
  }
  const T = d => d * Math.PI / 180;
  for (let i = 0; i < 12; i++) {
    const t0 = -Math.PI + i / 12 * TAU, t1 = t0 + TAU / 12 - 0.045;
    if (Math.abs((t0 + t1) / 2) < 0.55) continue;
    plateAt(b, 2.96, 2.56, t0, t1, { h: 0.045, bevel: 0.015, back: false, mat: i % 2 ? 'armor' : 'armorD' });
  }
  b.end();

  // strap
  b.begin(7, 0.5, 0, 0);
  const xS = 3.10, halfW = 0.075, thick = 0.08;
  const a0 = Math.PI * 0.58, a1 = Math.PI * 1.42;
  const N = 30;
  for (let i = 0; i < N; i++) {
    const t0 = lerp(a0, a1, i / N), t1 = lerp(a0, a1, (i + 1) / N);
    const p0 = strapPoint(xS, t0), p1 = strapPoint(xS, t1);
    const q0 = strapPoint(xS + halfW * 2, t0), q1 = strapPoint(xS + halfW * 2, t1);
    const o0 = V.mul(surfN(xS, t0), thick), o1 = V.mul(surfN(xS, t1), thick);
    b.quad(V.add(p0, o0), V.add(p1, o1), V.add(q1, o1), V.add(q0, o0), cc('dark'));
    b.quad(p0, p1, V.add(p1, o1), V.add(p0, o0), cc('dark'));
    b.quad(q0, q1, V.add(q1, o1), V.add(q0, o0), cc('dark'));
  }
  for (const t of [a0, a1]) {
    const p = V.add(strapPoint(xS, t), V.mul(surfN(xS, t), 0.10));
    pipe(b, p, V.add(p, V.mul(surfN(xS, t), 0.05)), 0.055, 0.048, 6, cc('metal'));
    pipe(b, V.add(p, V.mul(surfN(xS, t), 0.05)), V.add(p, V.mul(surfN(xS, t), 0.08)), 0.026, 0.026, 6, cc('steel'));
  }
  b.end();

  b.begin(7, 0.6, 0, 0);
  for (let i = 0; i < 8; i++) {
    const th = 0.25 + i * 0.75;
    microPlate(b, 2.83, th, 0.09, 0.09, i % 2 ? 'armorL' : 'armorD', 0.03);
  }
  for (let i = 0; i < 5; i++) {
    const th = -0.9 + i * 0.45;
    obox(b, V.add(surf(2.76, th), V.mul(surfN(2.76, th), 0.06)), [1, 0, 0], surfT(2.76, th), surfN(2.76, th), 0.045, 0.055, 0.035, cc('dark'));
  }
  b.end();
}
function strapPoint(x, t) {
  const th = Math.PI / 2 - t;
  return V.add(surf(x, th), V.mul(surfN(x, th), 0.012));
}

// ---------- giant ring ----------
function buildRing(b) {
  const X = 2.52, Ri = 1.92, Ro = 2.82, half = 0.40;
  b.begin(8, 0.55, 0, 0);
  const prof = [
    [X - half, Ri + 0.04], [X - half + 0.02, Ro - 0.08], [X - half + 0.08, Ro],
    [X - 0.14, Ro], [X - 0.14, Ro - 0.10], [X + 0.14, Ro - 0.10], [X + 0.14, Ro],
    [X + half - 0.08, Ro], [X + half - 0.02, Ro - 0.08], [X + half, Ri + 0.04],
    [X + half - 0.02, Ri - 0.02], [X - half + 0.02, Ri - 0.02], [X - half, Ri + 0.04],
  ];
  revolveX(b, prof, 112, cc('ring'));
  b.end();

  b.begin(8, 0.62, 0, 0);
  const segs = 72;
  for (let row = 0; row < 2; row++) {
    const xoff = row ? 0.265 : -0.265;
    for (let i = 0; i < segs; i++) {
      const a = (i + (row ? 0.5 : 0)) / segs * TAU;
      const w = TAU / segs * 0.66;
      const r0 = Ro - 0.012;
      const c = [X + xoff, r0 * Math.cos(a), r0 * Math.sin(a)];
      const rad = [0, Math.cos(a), Math.sin(a)];
      const tang = [0, -Math.sin(a), Math.cos(a)];
      const ax = [1, 0, 0];
      const basePts = [
        V.add(c, V.add(V.mul(ax, -0.17), V.mul(tang, -w * 0.40))),
        V.add(c, V.add(V.mul(ax, 0.17), V.mul(tang, -w * 0.40))),
        V.add(c, V.add(V.mul(ax, 0.17), V.mul(tang, w * 0.40))),
        V.add(c, V.add(V.mul(ax, -0.17), V.mul(tang, w * 0.40))),
      ];
      raisedPoly(b, basePts, rad, 0.045, 0.016, cc('ring'));
      obox(b, V.add(c, V.mul(rad, 0.046)), ax, tang, rad, 0.125, w * 0.24, 0.010, cc('ringDk'));
    }
  }
  // central rib
  for (let i = 0; i < 160; i++) {
    const a0 = i / 160 * TAU, a1 = (i + 1) / 160 * TAU;
    const P = (a, r) => [X + 0.06, r * Math.cos(a), r * Math.sin(a)];
    const Q = (a, r) => [X - 0.06, r * Math.cos(a), r * Math.sin(a)];
    b.quad(P(a0, Ro), P(a1, Ro), Q(a1, Ro + 0.02), Q(a0, Ro + 0.02), cc('ringDk'));
  }
  b.end();

  // inner gussets
  b.begin(8, 0.6, 0, 0);
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * TAU;
    const c = [X, Ri * Math.cos(a), Ri * Math.sin(a)];
    obox(b, c, [1, 0, 0], [0, Math.cos(a), Math.sin(a)], [0, -Math.sin(a), Math.cos(a)], 0.10, 0.05, 0.05, cc('dark'));
  }
  b.end();

  // clamp arms
  b.begin(8, 0.58, 0, 0);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2;
    const rin = 1.02, rout = Ri + 0.02;
    const dir = [0, Math.cos(a), Math.sin(a)];
    const p0 = V.add([X, 0, 0], V.mul(dir, rin)), p1 = V.add([X, 0, 0], V.mul(dir, rout));
    const tang = [0, -Math.sin(a), Math.cos(a)];
    const w0 = 0.10, w1 = 0.22;
    const pts = [V.add(p0, V.mul(tang, -w0)), V.add(p1, V.mul(tang, -w1)), V.add(p1, V.mul(tang, w1)), V.add(p0, V.mul(tang, w0))];
    const ax = [1, 0, 0];
    for (const sgn of [-1, 1]) {
      const pp = pts.map(p => [p[0] + 0.045 * sgn, p[1], p[2]]);
      raisedPoly(b, pp, sgn > 0 ? ax : [-1, 0, 0], 0.03, 0.01, cc('armorD'));
    }
  }
  b.end();
}

// ---------- sphere tanks ----------
function buildSpheres(b) {
  const specs = [
    [1.98, 0.80, 1, 0.585], [1.90, 0.00, 1, 0.620], [1.82, -0.80, 1, 0.575],
    [1.98, 0.80, -1, 0.585], [1.90, 0.00, -1, 0.620], [1.82, -0.80, -1, 0.575],
  ];
  b.begin(9, 0.44, 0, 0);
  for (const [x, y, s, r] of specs) {
    const cz = s * 0.92;
    const c = [x, y, cz];
    sphere(b, c, r, 26, 18, cc('rubber'));
    // equator band
    const n = 30;
    for (let i = 0; i < n; i++) {
      const a0 = i / n * TAU, a1 = (i + 1) / n * TAU;
      const rr = Math.sqrt(1 - 0.42 * 0.42) * r;
      const ringP = a => [x + Math.cos(a) * rr, y + Math.sin(a) * rr, cz + s * (r * 0.42)];
      const p0 = ringP(a0), p1 = ringP(a1);
      const o0 = V.add(p0, V.mul(V.norm([p0[0] - x, p0[1] - y, p0[2] - cz]), 0.016));
      const o1 = V.add(p1, V.mul(V.norm([p1[0] - x, p1[1] - y, p1[2] - cz]), 0.016));
      b.quad(p0, p1, o1, o0, cc('dark'));
    }
    const p = [x, y, cz + s * r * 0.985];
    const ax = [0, 0, s];
    pipe(b, p, V.add(p, V.mul(ax, 0.03)), r * 0.31, r * 0.27, 14, cc('armorD'));
    pipe(b, V.add(p, V.mul(ax, 0.03)), V.add(p, V.mul(ax, 0.05)), r * 0.17, r * 0.15, 6, cc('steel'));
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1 + 0.4;
      obox(b, [x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, cz + s * r * 0.8], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.028, 0.018, 0.01, cc('dark'));
    }
    obox(b, [x, y, cz - s * r * 0.80], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.13, r * 0.5, 0.08, cc('recess'));
  }
  b.end();
}

// ---------- waist / transition spine ----------
function buildWaist(b) {
  const segs = [[1.96, 1.72, 0.86], [1.66, 1.36, 0.895], [1.30, 1.04, 0.912]];
  b.begin(10, 0.6, 0, 0);
  for (const [x0, x1, r] of segs) {
    const rings = [];
    const N = 16;
    for (let i = 0; i < 8; i++) {
      const x = lerp(x0, x1, 0.06 + 0.88 * i / 7);
      const s = stAt(x);
      const k = r / 0.92;
      rings.push(PROF.map(([z, y]) => [x, y * s.ry * k, z * s.rz * k]));
    }
    for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < PROF.length; j++) {
      const j2 = (j + 1) % PROF.length;
      b.quad(rings[i][j], rings[i][j2], rings[i + 1][j2], rings[i + 1][j], cc('armor'));
    }
    for (const [idx, nn] of [[0, [-1, 0, 0]], [rings.length - 1, [1, 0, 0]]]) {
      const ring = rings[idx], cen = ring.reduce((a, p) => V.add(a, p), [0, 0, 0]).map(v => v / ring.length);
      for (let j = 0; j < PROF.length; j++) b.tri(cen, ring[j], ring[(j + 1) % PROF.length], cc('recess'), nn, nn, nn);
    }
    // large framed recessed panels (4 per segment)
    for (let j = 0; j < 4; j++) {
      const th = j / 4 * TAU + Math.PI / 4;
      const cx = (x0 + x1) / 2;
      const sy = stAt(cx).ry, sz = stAt(cx).rz, k2 = r / 0.92;
      const p = [cx, Math.cos(th) * sy * k2 * 0.985, Math.sin(th) * sz * k2 * 0.985];
      const nn = V.norm([0, Math.cos(th) / sy, Math.sin(th) / sz]);
      const tang = V.norm([0, -Math.sin(th), Math.cos(th)]);
      const ax = [1, 0, 0];
      const sx = (x1 - x0) * 0.38, st = 0.335;
      const base = [
        V.add(p, V.add(V.mul(ax, -sx), V.mul(tang, -st))), V.add(p, V.add(V.mul(ax, sx), V.mul(tang, -st))),
        V.add(p, V.add(V.mul(ax, sx), V.mul(tang, st))), V.add(p, V.add(V.mul(ax, -sx), V.mul(tang, st))),
      ];
      // raised frame
      const top = raisedPoly(b, base, nn, 0.045, 0.016, cc('armorL'));
      // dark inset inside the frame
      const cen = base.reduce((a, q) => V.add(a, q), [0, 0, 0]).map(v => v / base.length);
      const inset = base.map(q => V.add(cen, V.mul(V.sub(q, cen), 0.78)));
      raisedPoly(b, inset.map(q => V.add(q, V.mul(nn, 0.046))), nn, 0.012, 0.006, cc('recess'));
      for (const su of [-1, 1]) for (const sv of [-1, 1]) {
        boltAt(b, V.add(V.add(V.add(p, V.mul(ax, su * sx * 1.12)), V.mul(tang, sv * st * 1.12)), V.mul(nn, 0.03)), nn, 0.018, 0.012);
      }
    }
    // rim ridges at both ends
    for (const [xx, sgn] of [[x0 + 0.02, -1], [x1 - 0.02, 1]]) {
      const s = stAt(xx), k = r / 0.92;
      for (let j = 0; j < PROF.length; j++) {
        const j2 = (j + 1) % PROF.length;
        const A = [xx, PROF[j][1] * s.ry * k * 1.04, PROF[j][0] * s.rz * k * 1.04];
        const B = [xx, PROF[j2][1] * s.ry * k * 1.04, PROF[j2][0] * s.rz * k * 1.04];
        const C = [xx - sgn * 0.035, PROF[j2][1] * s.ry * k, PROF[j2][0] * s.rz * k];
        const D = [xx - sgn * 0.035, PROF[j][1] * s.ry * k, PROF[j][0] * s.rz * k];
        b.quad(A, B, C, D, cc('armorD'));
      }
    }
  }
  b.end();

  // core module block behind the waist (feeds the engine cluster)
  b.begin(10, 0.6, 0, 0);
  const coreSegs = [[1.00, 0.60, 0.995], [0.60, 0.10, 1.02], [0.10, -0.25, 1.00]];
  for (const [x0, x1, r] of coreSegs) {
    const rings = [];
    for (let i = 0; i < 6; i++) {
      const x = lerp(x0, x1, 0.05 + 0.9 * i / 5);
      const s0 = stAt(x), k = r / 0.92;
      rings.push(PROF.map(([z, y]) => [x, y * s0.ry * k, z * s0.rz * k]));
    }
    for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < PROF.length; j++) {
      const j2 = (j + 1) % PROF.length;
      b.quad(rings[i][j], rings[i][j2], rings[i + 1][j2], rings[i + 1][j], cc('armor'));
    }
    for (const [idx, nn] of [[0, [-1, 0, 0]], [rings.length - 1, [1, 0, 0]]]) {
      const ring = rings[idx], cen = ring.reduce((a, p) => V.add(a, p), [0, 0, 0]).map(v => v / ring.length);
      for (let j = 0; j < PROF.length; j++) b.tri(cen, ring[j], ring[(j + 1) % PROF.length], cc('dark'), nn, nn, nn);
    }
  }
  // four side radiator blocks (A13)
  for (const a of [0.72, Math.PI - 0.72, Math.PI + 0.72, -0.72]) {
    const x0 = 0.82, x1 = 0.18, r = 1.03;
    const p = [ (x0 + x1) / 2, Math.cos(a) * r * 0.93, Math.sin(a) * r * 0.93 ];
    const nn = V.norm([0, Math.cos(a) / 0.86, Math.sin(a) / 0.92]);
    const tang = V.norm([0, -Math.sin(a), Math.cos(a)]);
    const ax = [1, 0, 0];
    obox(b, p, ax, tang, nn, 0.36, 0.24, 0.10, cc('armorD'));
    obox(b, V.add(p, V.mul(nn, 0.11)), ax, tang, nn, 0.28, 0.16, 0.02, cc('armorL'));
    for (let i = 0; i < 3; i++) {
      obox(b, V.add(p, V.add(V.mul(nn, 0.13), V.mul(ax, (i - 1) * 0.11))), ax, tang, nn, 0.03, 0.11, 0.015, cc('recess'));
    }
  }
  // collar rings at both ends of the core
  for (const [x, r, w, col] of [[0.95, 1.02, 0.05, 'metal'], [-0.2, 1.0, 0.06, 'armorD']]) {
    revolveX(b, [[x - w, r], [x - w * 0.5, r * 1.045], [x + w * 0.5, r * 1.045], [x + w, r]], 22, cc(col));
  }
  b.end();
}


// ============================================================
//  stern section
// ============================================================

// cylinder along X, offset in YZ, with arbitrary radius profile
function xProf(b, profile, cy, cz, segs, col, capStart, capEnd) {
  for (let i = 0; i < profile.length - 1; i++) {
    const [x0, r0] = profile[i], [x1, r1] = profile[i + 1];
    for (let j = 0; j < segs; j++) {
      const a0 = j / segs * TAU, a1 = (j + 1) / segs * TAU;
      const P = (x, r, a) => [x, cy + r * Math.cos(a), cz + r * Math.sin(a)];
      b.quad(P(x0, r0, a0), P(x0, r0, a1), P(x1, r1, a1), P(x1, r1, a0), col);
    }
  }
  const cap = (idx, sgn) => {
    const [x, r] = profile[idx];
    if (r <= 1e-4) return;
    for (let j = 0; j < segs; j++) {
      const a0 = j / segs * TAU, a1 = (j + 1) / segs * TAU;
      b.tri([x, cy, cz], [x, cy + r * Math.cos(a0), cz + r * Math.sin(a0)], [x, cy + r * Math.cos(a1), cz + r * Math.sin(a1)], col, [sgn, 0, 0], [sgn, 0, 0], [sgn, 0, 0]);
    }
  };
  if (capStart) cap(0, -1);
  if (capEnd) cap(profile.length - 1, 1);
}

// band ring around a drum
function xBand(b, x, cy, cz, r, w, col, segs = 24) {
  for (let j = 0; j < segs; j++) {
    const a0 = j / segs * TAU, a1 = (j + 1) / segs * TAU;
    const P = (xx, rr, a) => [xx, cy + rr * Math.cos(a), cz + rr * Math.sin(a)];
    b.quad(P(x - w, r, a0), P(x - w, r, a1), P(x - w * 0.6, r * 1.055, a1), P(x - w * 0.6, r * 1.055, a0), col);
    b.quad(P(x - w * 0.6, r * 1.055, a0), P(x - w * 0.6, r * 1.055, a1), P(x + w * 0.6, r * 1.055, a1), P(x + w * 0.6, r * 1.055, a0), cc('armorL'));
    b.quad(P(x + w * 0.6, r * 1.055, a0), P(x + w * 0.6, r * 1.055, a1), P(x + w, r, a1), P(x + w, r, a0), col);
  }
}

// ---------- engine cluster (part 11) ----------
const ENGINES = [
  [0.96, 0.74, 0.505, 0.06], [0.00, 1.06, 0.535, -0.02], [-0.96, 0.74, 0.505, 0.03],
  [0.96, -0.74, 0.505, 0.06], [0.00, -1.06, 0.535, -0.02], [-0.96, -0.74, 0.505, 0.03],
];

function drumPanel(b, x, cy, cz, r, a, sx, st, h, col) {
  const rad = [0, Math.cos(a), Math.sin(a)];
  const tang = [0, -Math.sin(a), Math.cos(a)];
  const p = [x, cy + r * Math.cos(a), cz + r * Math.sin(a)];
  obox(b, p, [1, 0, 0], tang, rad, sx, st, h, col);
}

function buildDrum(b, cy, cz, r, dx) {
  const xf = 0.34 + dx, xr = -1.90 + dx;
  const prof = [
    [xf + 0.05, r * 0.885], [xf + 0.00, r * 0.975], [xf - 0.08, r], [xr + 0.22, r],
    [xr + 0.05, r * 0.975], [xr - 0.02, r * 0.885],
  ];
  xProf(b, prof, cy, cz, 24, cc('armor'), false, false);

  // flat front cap + raised square hatch
  for (let j = 0; j < 24; j++) {
    const a0 = j / 24 * TAU, a1 = (j + 1) / 24 * TAU;
    const P = (a) => [xf + 0.05, cy + r * 0.885 * Math.cos(a), cz + r * 0.885 * Math.sin(a)];
    b.tri([xf + 0.05, cy, cz], P(a0), P(a1), cc('armorD'), [-1, 0, 0], [-1, 0, 0], [-1, 0, 0]);
  }
  raisedOnFrame(b, [xf + 0.05, cy, cz], [0, 1, 0], [0, 0, 1], [-1, 0, 0], r * 0.52, r * 0.52, 0.028, cc('armorL'), 0.03);

  // boxy armoured cap section (4 big plates + corner strips)
  for (const a of [0.79, 2.36, 3.93, 5.50]) {
    drumPanel(b, xf - 0.17, cy, cz, r * 1.004, a, 0.15, 0.20, 0.032, cc('armorL'));
    drumPanel(b, xf - 0.17, cy, cz, r * 1.004, a + 0.785, 0.155, 0.045, 0.026, cc('armorD'));
  }
  xBand(b, xf - 0.35, cy, cz, r, 0.05, cc('armorD'));
  xBand(b, xr + 0.16, cy, cz, r, 0.055, cc('armorD'));
  xBand(b, xf - 0.70, cy, cz, r, 0.045, cc('armorD'));
  xBand(b, xf - 1.34, cy, cz, r, 0.045, cc('armorD'));

  // longitudinal ribs (3 segments each)
  for (const a of [0.32, 1.30, 2.44, 3.56, 4.72, 5.70]) {
    for (let k = 0; k < 3; k++) {
      const x = xf - 0.58 - k * 0.45;
      drumPanel(b, x, cy, cz, r * 1.004, a, 0.185, 0.042, 0.028, cc(k === 1 ? 'armorL' : 'armor'));
    }
  }
  // transverse recessed seams
  for (const x of [xf - 0.45, xf - 0.93, xf - 1.41, xf - 1.83]) {
    for (let j = 0; j < 24; j++) {
      const a0 = j / 24 * TAU, a1 = (j + 1) / 24 * TAU;
      const P = (xx, a) => [xx, cy + r * 1.002 * Math.cos(a), cz + r * 1.002 * Math.sin(a)];
      b.quad(P(x, a0), P(x, a1), P(x - 0.018, a1), P(x - 0.018, a0), cc('recess'));
    }
  }
  // upper nub row
  for (let i = 0; i < 5; i++) {
    const x = xf - 0.52 - i * 0.30;
    const y = cy + (r + 0.018) * (cy > 0 ? 0.98 : 0.98);
    const p = [x, cy + (r + 0.02) * Math.cos(0.22), cz + (r + 0.02) * Math.sin(0.22)];
    pipe(b, p, [x, p[1] + 0.03, p[2]], 0.02, 0.016, 6, cc('metal'), true);
  }
  // side pipe cluster
  const pa = [xf - 0.22, cy + r * 0.56, cz + r * 0.76], pb = [xr + 0.45, cy + r * 0.56, cz + r * 0.76];
  pipe(b, pa, pb, 0.026, 0.026, 6, cc('steel'), false);
  for (let i = 0; i < 3; i++) {
    const x = xf - 0.35 - i * 0.52;
    obox(b, [x, cy + r * 0.60, cz + r * 0.78], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.028, 0.05, 0.06, cc('armorD'));
  }
  // rear nozzle recess
  for (let j = 0; j < 24; j++) {
    const a0 = j / 24 * TAU, a1 = (j + 1) / 24 * TAU;
    const P = (a, rr) => [xr - 0.01, cy + rr * Math.cos(a), cz + rr * Math.sin(a)];
    b.tri(P(a0, r * 0.80), P(a1, r * 0.80), P((a0 + a1) / 2, r * 0.42), cc('recess'), [1, 0, 0], [1, 0, 0], [1, 0, 0]);
  }
}

function buildEngines(b) {
  b.begin(11, 0.58, 0, 0);
  for (const [cy, cz, r, dx] of ENGINES) buildDrum(b, cy, cz, r, dx);
  b.end();

  b.begin(11, 0.6, 0, 0);
  // compact dorsal & ventral fairing over the top/bottom drums
  for (const sgn of [1, -1]) {
    const y = sgn * 1.40;
    obox(b, [0.50, y, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.68, 0.06, 0.43, cc('armor'));
    obox(b, [0.50, y + sgn * 0.06, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.54, 0.028, 0.31, cc('armorL'));
    obox(b, [0.28, y + sgn * 0.08, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.18, 0.014, 0.20, cc('recess'));
    for (let i = 0; i < 3; i++) {
      const x = 0.86 - i * 0.22;
      obox(b, [x, y + sgn * 0.055, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.06, 0.016, 0.12, cc('dark'));
    }
    obox(b, [0.50, y + sgn * 0.03, 0.38], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.62, 0.055, 0.045, cc('armorD'));
    obox(b, [0.50, y + sgn * 0.03, -0.38], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.62, 0.055, 0.045, cc('armorD'));
    // beam running aft to the fin root
    obox(b, [-0.50, y + sgn * 0.05, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.42, 0.05, 0.08, cc('armorD'));
    pipe(b, [-0.2, y + sgn * 0.12, 0.2], [-1.6, y + sgn * 0.12, 0.2], 0.022, 0.022, 6, cc('steel'), false);
  }
  b.end();
}

// ---------- stern core + tail (part 12) ----------
function buildTail(b) {
  b.begin(12, 0.6, 0, 0);
  // central armoured tail block
  const rings = [];
  for (let i = 0; i < 7; i++) {
    const x = lerp(-1.30, -2.55, i / 6);
    const sc = 1.0 - 0.16 * (i / 6);
    const pts = [];
    for (let j = 0; j < 12; j++) {
      const a = j / 12 * TAU + Math.PI / 12;
      pts.push([x, 0.64 * sc * Math.cos(a), 0.80 * sc * Math.sin(a)]);
    }
    rings.push(pts);
  }
  for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < 12; j++) {
    const j2 = (j + 1) % 12;
    b.quad(rings[i][j], rings[i][j2], rings[i + 1][j2], rings[i + 1][j], cc('armor'));
  }
  for (const [idx, nn] of [[0, [-1, 0, 0]], [rings.length - 1, [1, 0, 0]]]) {
    const ring = rings[idx], cen = ring.reduce((a, p) => V.add(a, p), [0, 0, 0]).map(v => v / ring.length);
    for (let j = 0; j < 12; j++) b.tri(cen, ring[j], ring[(j + 1) % 12], cc('armorD'), nn, nn, nn);
  }
  // side recessed panels
  for (const s of [1, -1]) {
    for (let i = 0; i < 2; i++) {
      const x = -1.52 - i * 0.52;
      const p = [x, 0, s * 0.80];
      const n = [0, 0, s];
      raisedOnFrame(b, p, [1, 0, 0], [0, 1, 0], n, 0.21, 0.26, 0.032, cc('armorL'), 0.02);
      raisedOnFrame(b, V.add(p, V.mul(n, 0.032)), [1, 0, 0], [0, 1, 0], n, 0.14, 0.18, 0.012, cc('recess'), 0.008);
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) boltAt(b, V.add(V.add(p, [sx * 0.22, sy * 0.19, 0]), V.mul(n, 0.02)), n, 0.017, 0.012);
    }
  }
  // central thruster pod
  xProf(b, [[-2.20, 0.16], [-2.30, 0.28], [-2.70, 0.29], [-2.86, 0.23], [-2.92, 0.10]], 0, 0, 20, cc('armor'), false, false);
  revolveX(b, [[-2.92, 0.10], [-2.97, 0.16], [-2.97, 0.20]], 20, cc('dark'));
  for (const x of [-2.42, -2.68]) xBand(b, x, 0, 0, 0.29, 0.04, cc('armorD'));
  // fin-root housings top/bottom
  for (const sgn of [1, -1]) {
    obox(b, [-2.18, sgn * 0.60, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.34, 0.22, 0.36, cc('armorD'));
    obox(b, [-2.18, sgn * 0.81, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.23, 0.05, 0.25, cc('armorL'));
  }
  // dark aft plate between the fins
  for (let j = 0; j < 16; j++) {
    const a0 = j / 16 * TAU, a1 = (j + 1) / 16 * TAU;
    b.tri([-2.60, 0, 0], [-2.60, 0.42 * Math.cos(a0), 0.58 * Math.sin(a0)], [-2.60, 0.42 * Math.cos(a1), 0.58 * Math.sin(a1)], cc('recess'), [1, 0, 0], [1, 0, 0], [1, 0, 0]);
  }
  b.end();
}

// ---------- stern fins (part 13) ----------
function finBlade(b, angle, scale) {
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const to3 = (x, r) => [x, r * ca, r * sa];
  const nrm = [0, -sa, ca];
  const pts2 = [
    [-1.55, 0.98], [-2.00, 1.75], [-2.60, 2.30], [-3.20, 2.48], [-3.45, 2.36],
    [-3.00, 1.80], [-2.40, 1.22], [-1.82, 0.95],
  ];
  const base = pts2.map(([x, r]) => to3(x, r * scale));
  raisedPoly(b, base, nrm, 0.050, 0.016, cc('plate'));
  raisedPoly(b, base, V.mul(nrm, -1), 0.050, 0.016, cc('plate'));
  const cen = base.reduce((a, p) => V.add(a, p), [0, 0, 0]).map(v => v / base.length);
  const inset = base.map(p => V.add(cen, V.mul(V.sub(p, cen), 0.70)));
  raisedPoly(b, inset, nrm, 0.016, 0.01, cc('armorD'));
  raisedPoly(b, inset, V.mul(nrm, -1), 0.016, 0.01, cc('armorD'));
  const pan = base.map(p => V.add(cen, V.mul(V.sub(p, cen), 0.50)));
  raisedPoly(b, pan, nrm, 0.012, 0.008, cc('armorL'));
  raisedPoly(b, pan, V.mul(nrm, -1), 0.012, 0.008, cc('armorL'));
  // vents near the root on both faces
  for (const s of [1, -1]) {
    const p = V.add(V.add(to3(-2.18, 1.16 * scale), V.mul(nrm, s * 0.062)), [0.12, 0, 0]);
    for (let i = 0; i < 3; i++) obox(b, V.add(p, [i * 0.055 - 0.055, 0, 0]), [1, 0, 0], [0, ca, sa], nrm, 0.016, 0.048, 0.007, cc('dark'));
  }
  // leading edge rib
  pipe(b, to3(-1.86, 1.44 * scale), to3(-3.25, 2.38 * scale), 0.028, 0.014, 6, cc('armorD'), false);
  // hub cylinder along X at the root
  const hy = ca * scale * 1.02, hz = sa * scale * 1.02, hubX = -1.78;
  xProf(b, [[hubX + 0.30, 0.14], [hubX + 0.22, 0.27], [hubX - 0.22, 0.27], [hubX - 0.30, 0.14]], hy, hz, 18, cc('armorD'), true, true);
  for (const x of [hubX + 0.16, hubX, hubX - 0.16]) xBand(b, x, hy, hz, 0.27, 0.032, cc('metal'));
  // root fairing block
  obox(b, to3(-1.45, 1.02 * scale), [1, 0, 0], [0, ca, sa], nrm, 0.26, 0.20, 0.24, cc('armorD'));
  // tip cap
  obox(b, to3(-3.36, 2.44 * scale), [1, 0, 0], [0, ca, sa], nrm, 0.05, 0.03, 0.02, cc('metal'));
}

function buildFins(b) {
  b.begin(13, 0.55, 0, 0);
  for (const d of [0, 60, 120, 180, 240, 300]) finBlade(b, d * Math.PI / 180, 1.10);
  b.end();
}

// ---------- display stand (part 14) ----------
function buildStand(b) {
  b.begin(14, 0.5, 0, 0);
  const baseY = -3.0;
  // V-shaped feet
  for (const s of [-1, 1]) {
    const ang = s * 0.30;
    const ax = [Math.cos(ang), 0, Math.sin(ang)], az = [-Math.sin(ang), 0, Math.cos(ang)];
    const c = [0.55 + ax[0] * 1.30, baseY, ax[2] * 1.30];
    obox(b, c, ax, [0, 1, 0], az, 1.45, 0.065, 0.19, cc('armorD'));
    obox(b, V.add(c, [0, 0.075, 0]), ax, [0, 1, 0], az, 1.20, 0.018, 0.11, cc('dark'));
    obox(b, V.add(c, ax.map(v => v * 1.40)), ax, [0, 1, 0], az, 0.17, 0.10, 0.25, cc('dark'));
  }
  // centre block
  obox(b, [0.55, baseY + 0.09, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.32, 0.09, 0.40, cc('armorD'));
  // curved I-beam arm
  const path = [[0.55, baseY + 0.16], [0.72, baseY + 0.72], [0.96, baseY + 1.30], [1.24, baseY + 1.90], [1.50, baseY + 2.18]];
  for (let i = 0; i < path.length - 1; i++) {
    const [x0, y0] = path[i], [x1, y1] = path[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0);
    const ax = [Math.cos(ang), Math.sin(ang), 0], ay = [-Math.sin(ang), Math.cos(ang), 0];
    const c = [(x0 + x1) / 2, (y0 + y1) / 2, 0];
    obox(b, c, ax, ay, [0, 0, 1], len * 0.55, 0.05, 0.135, cc('dark'));
    obox(b, V.add(c, V.mul(ay, 0.105)), ax, ay, [0, 0, 1], len * 0.55, 0.032, 0.15, cc('armorD'));
    obox(b, V.add(c, V.mul(ay, -0.105)), ax, ay, [0, 0, 1], len * 0.55, 0.032, 0.15, cc('armorD'));
    obox(b, c, ax, ay, [0, 0, 1], len * 0.2, 0.028, 0.02, cc('recess'));
  }
  // cradle under the hull
  const cy = -0.70;
  obox(b, [1.50, cy - 0.12, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.22, 0.10, 0.30, cc('metal'));
  for (const s of [-1, 1]) obox(b, [1.50, cy + 0.08, s * 0.22], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.20, 0.22, 0.045, cc('metal'));
  obox(b, [1.50, cy + 0.08, 0], [0, 1, 0], [0, 0, 1], [1, 0, 0], 0.20, 0.035, 0.035, cc('steel'));
  // bolts
  for (const s of [-1, 1]) for (const x of [-0.4, 1.4]) boltAt(b, [x, baseY + 0.10, s * 0.55], [0, 1, 0], 0.03, 0.018);
  b.end();
}
