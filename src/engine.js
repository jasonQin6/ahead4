// ============================================================
//  Mini 3D engine — WebGL2 / zero dependencies
// ============================================================
"use strict";

const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);

// ---------- 4x4 matrices (column-major) ----------
const M = {
  ident: () => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]),
  mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  },
  perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), o = new Float32Array(16);
    o[0] = f / aspect; o[5] = f; o[10] = (far + near) / (near - far); o[11] = -1;
    o[14] = 2 * far * near / (near - far);
    return o;
  },
  lookAt(eye, center, up) {
    const z = V.norm(V.sub(eye, center));
    const x = V.norm(V.cross(up, z));
    const y = V.cross(z, x);
    return new Float32Array([
      x[0], y[0], z[0], 0,
      x[1], y[1], z[1], 0,
      x[2], y[2], z[2], 0,
      -V.dot(x, eye), -V.dot(y, eye), -V.dot(z, eye), 1,
    ]);
  },
  invert(m) {
    const a = m, o = new Float32Array(16);
    const b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4],
          b02 = a[0] * a[7] - a[3] * a[4], b03 = a[1] * a[6] - a[2] * a[5],
          b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6],
          b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12],
          b08 = a[8] * a[15] - a[11] * a[12], b09 = a[9] * a[14] - a[10] * a[13],
          b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return M.ident();
    det = 1 / det;
    o[0]  = ( a[5] * b11 - a[6] * b10 + a[7] * b09) * det;
    o[1]  = (-a[1] * b11 + a[2] * b10 - a[3] * b09) * det;
    o[2]  = ( a[13] * b05 - a[14] * b04 + a[15] * b03) * det;
    o[3]  = (-a[9] * b05 + a[10] * b04 - a[11] * b03) * det;
    o[4]  = (-a[4] * b11 + a[6] * b08 - a[7] * b07) * det;
    o[5]  = ( a[0] * b11 - a[2] * b08 + a[3] * b07) * det;
    o[6]  = (-a[12] * b05 + a[14] * b02 - a[15] * b01) * det;
    o[7]  = ( a[8] * b05 - a[10] * b02 + a[11] * b01) * det;
    o[8]  = ( a[4] * b10 - a[5] * b08 + a[7] * b06) * det;
    o[9]  = (-a[0] * b10 + a[1] * b08 - a[3] * b06) * det;
    o[10] = ( a[12] * b04 - a[13] * b02 + a[15] * b00) * det;
    o[11] = (-a[8] * b04 + a[9] * b02 - a[11] * b00) * det;
    o[12] = (-a[4] * b09 + a[5] * b07 - a[6] * b06) * det;
    o[13] = ( a[0] * b09 - a[1] * b07 + a[2] * b06) * det;
    o[14] = (-a[12] * b03 + a[13] * b01 - a[14] * b00) * det;
    o[15] = ( a[8] * b03 - a[9] * b01 + a[10] * b00) * det;
    return o;
  },
};

// ============================================================
//  Mesh builder — interleaved, one big buffer, per-part ranges
//   attrs: pos3 nrm3 col3 rough1 glow1 part1 panel1  (13 floats)
// ============================================================
const FPV = 13;
const STRIDE = FPV * 4;

class Builder {
  constructor() {
    this.buf = [];
    this.ranges = [];
    this.partId = 0;
    this._start = 0;
    this._r = 0.5; this._g = 0; this._p = 0;
  }
  begin(id, rough = 0.5, glow = 0, panel = 0) {
    this.partId = id; this._start = this.buf.length / FPV;
    this._r = rough; this._g = glow; this._p = panel;
  }
  end() {
    const r = { start: this._start, count: this.buf.length / FPV - this._start };
    if (r.count <= 0) return;
    (this.ranges[this.partId] || (this.ranges[this.partId] = [])).push(r);
  }
  v(p, n, c, r = this._r, g = this._g, panel = this._p) {
    this.buf.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], r, g, this.partId, panel);
  }
  tri(p0, p1, p2, c, n0, n1, n2) {
    const n = n0 ? null : faceN(p0, p1, p2);
    this.v(p0, n0 || n, c); this.v(p1, n1 || n, c); this.v(p2, n2 || n, c);
  }
  quad(p0, p1, p2, p3, c, n0, n1, n2, n3) {
    if (n0) {
      this.v(p0, n0, c); this.v(p1, n1, c); this.v(p2, n2, c);
      this.v(p0, n0, c); this.v(p2, n2, c); this.v(p3, n3, c);
    } else {
      const n = faceN(p0, p1, p2);
      this.v(p0, n, c); this.v(p1, n, c); this.v(p2, n, c);
      this.v(p0, n, c); this.v(p2, n, c); this.v(p3, n, c);
    }
  }
  data() { return new Float32Array(this.buf); }
}

function faceN(a, b, c) {
  return V.norm(V.cross(V.sub(b, a), V.sub(c, a)));
}

// base polygon -> raised, chamfered plate (convex polygon, counter-clockwise-ish)
function raisedPoly(b, base, n, h, bevel, c, sideC) {
  const cen = base.reduce((s, p) => V.add(s, p), [0, 0, 0]).map(x => x / base.length);
  const off = V.mul(n, h);
  const top = base.map(p => {
    const d = V.sub(p, cen), l = V.len(d) || 1;
    const k = Math.max(0, (l - bevel)) / l;
    return V.add(V.add(cen, V.mul(d, k)), off);
  });
  const tc = V.add(cen, off);
  const sc = sideC || [c[0] * 0.62, c[1] * 0.62, c[2] * 0.64];
  for (let i = 1; i < top.length - 1; i++) b.tri(tc, top[0], top[i], c, n, n, n), b.tri(tc, top[i], top[i + 1], c, n, n, n);
  for (let i = 0; i < base.length; i++) {
    const j = (i + 1) % base.length;
    b.quad(base[i], base[j], top[j], top[i], sc);
  }
}

// oriented box: centre o, orthonormal axes ax/ay/az, half-extents sx/sy/sz
function obox(b, o, ax, ay, az, sx, sy, sz, c) {
  const P = (i, j, k) => [
    o[0] + ax[0] * sx * i + ay[0] * sy * j + az[0] * sz * k,
    o[1] + ax[1] * sx * i + ay[1] * sy * j + az[1] * sz * k,
    o[2] + ax[2] * sx * i + ay[2] * sy * j + az[2] * sz * k,
  ];
  const v = [
    P(-1,-1,-1), P(1,-1,-1), P(1,1,-1), P(-1,1,-1),
    P(-1,-1, 1), P(1,-1, 1), P(1,1, 1), P(-1,1, 1),
  ];
  b.quad(v[0], v[1], v[2], v[3], c);
  b.quad(v[7], v[6], v[5], v[4], c);
  b.quad(v[0], v[3], v[7], v[4], c);
  b.quad(v[1], v[5], v[6], v[2], c);
  b.quad(v[0], v[4], v[5], v[1], c);
  b.quad(v[3], v[2], v[6], v[7], c);
}

// cylinder between two points
function pipe(b, p0, p1, r0, r1, segs, c, cap = true) {
  const axis = V.sub(p1, p0), L = V.len(axis);
  if (L < 1e-6) return;
  const w = V.norm(axis);
  let ref = Math.abs(w[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = V.norm(V.cross(ref, w));
  const vv = V.cross(w, u);
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
    const d0 = V.add(V.mul(u, Math.cos(a0)), V.mul(vv, Math.sin(a0)));
    const d1 = V.add(V.mul(u, Math.cos(a1)), V.mul(vv, Math.sin(a1)));
    b.quad(V.add(p0, V.mul(d0, r0)), V.add(p0, V.mul(d1, r0)), V.add(p1, V.mul(d1, r1)), V.add(p1, V.mul(d0, r1)), c, d0, d1, d1, d0);
    if (cap) {
      if (r0 > 1e-5) { const n0 = V.mul(w, -1); b.tri(p0, V.add(p0, V.mul(d1, r0)), V.add(p0, V.mul(d0, r0)), c, n0, n0, n0); }
      if (r1 > 1e-5) { b.tri(p1, V.add(p1, V.mul(d0, r1)), V.add(p1, V.mul(d1, r1)), c, w, w, w); }
    }
  }
}

// revolve a profile [[x, r], ...] around the X axis
function revolveX(b, profile, segs, c, opts = {}) {
  const closed = !!opts.closed, smoothN = opts.smooth !== false;
  const n = profile.length;
  const segN = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = profile[i + 1][0] - profile[i][0];
    const dr = profile[i + 1][1] - profile[i][1];
    const l = Math.hypot(dx, dr) || 1;
    segN.push([-dr / l, dx / l]);
  }
  const ringPoint = (i, a) => {
    const [x, r] = profile[i];
    return [x, r * Math.cos(a), r * Math.sin(a)];
  };
  const normAt = (i, a, which) => {
    let s;
    if (which === 'smooth') {
      const a0 = segN[Math.max(0, i - 1)], a1 = segN[Math.min(segN.length - 1, i)];
      s = [a0[0] + a1[0], a0[1] + a1[1]];
    } else s = segN[Math.min(i, segN.length - 1)];
    const l = Math.hypot(s[0], s[1]) || 1;
    return [s[0] / l, (s[1] / l) * Math.cos(a), (s[1] / l) * Math.sin(a)];
  };
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < segs; j++) {
      const a0 = (j / segs) * Math.PI * 2, a1 = ((j + 1) / segs) * Math.PI * 2;
      const p00 = ringPoint(i, a0), p10 = ringPoint(i, a1), p01 = ringPoint(i + 1, a0), p11 = ringPoint(i + 1, a1);
      if (smoothN) {
        b.quad(p00, p10, p11, p01, c, normAt(i, a0, 'smooth'), normAt(i, a1, 'smooth'), normAt(i + 1, a1, 'smooth'), normAt(i + 1, a0, 'smooth'));
      } else {
        b.quad(p00, p10, p11, p01, c);
      }
    }
  }
  if (closed) {
    // handled by closed profile passed in (first==last); nothing here
  }
  const capFan = (idx) => {
    const [x, r] = profile[idx];
    if (r <= 1e-5) return;
    const nrm = idx === 0 ? [-1, 0, 0] : [1, 0, 0];
    for (let j = 0; j < segs; j++) {
      const a0 = (j / segs) * Math.PI * 2, a1 = ((j + 1) / segs) * Math.PI * 2;
      b.tri([x, 0, 0], ringPoint(idx, a0), ringPoint(idx, a1), c, nrm, nrm, nrm);
    }
  };
  if (opts.cap !== false) { capFan(0); capFan(n - 1); }
}

// lofted hull: stations [{x, rz, ry, dy}] + normalised profile [[z,y],...]
function loftX(b, stations, prof, c, opts = {}) {
  const S = stations.length, P = prof.length;
  const rings = stations.map(s => prof.map(([z, y]) => [s.x, y * s.ry + (s.dy || 0), z * s.rz]));
  for (let i = 0; i < S - 1; i++) {
    for (let j = 0; j < P; j++) {
      const j2 = (j + 1) % P;
      b.quad(rings[i][j], rings[i][j2], rings[i + 1][j2], rings[i + 1][j], c);
    }
  }
  if (opts.cap0 !== false) {
    const r = rings[0], nrm = [-1, 0, 0];
    for (let j = 0; j < P; j++) b.tri([stations[0].x, 0, 0], r[(j + 1) % P], r[j], c, nrm, nrm, nrm);
  }
  if (opts.cap1 !== false) {
    const r = rings[S - 1], nrm = [1, 0, 0];
    for (let j = 0; j < P; j++) b.tri([stations[S - 1].x, 0, 0], r[j], r[(j + 1) % P], c, nrm, nrm, nrm);
  }
}

function sphere(b, cpos, rad, segs, rings, c, mat) {
  for (let i = 0; i < rings; i++) {
    const t0 = Math.PI * i / rings, t1 = Math.PI * (i + 1) / rings;
    for (let j = 0; j < segs; j++) {
      const p0 = (j / segs) * Math.PI * 2, p1 = ((j + 1) / segs) * Math.PI * 2;
      const P = (t, p) => [cpos[0] + rad * Math.sin(t) * Math.cos(p), cpos[1] + rad * Math.cos(t), cpos[2] + rad * Math.sin(t) * Math.sin(p)];
      const N = (t, p) => [Math.sin(t) * Math.cos(p), Math.cos(t), Math.sin(t) * Math.sin(p)];
      const a = P(t0, p0), bb = P(t0, p1), cc = P(t1, p1), d = P(t1, p0);
      b.quad(a, bb, cc, d, c, N(t0, p0), N(t0, p1), N(t1, p1), N(t1, p0));
    }
  }
}

function xformPoint(p, o, ax, ay, az) {
  return [
    o[0] + ax[0] * p[0] + ay[0] * p[1] + az[0] * p[2],
    o[1] + ax[1] * p[0] + ay[1] * p[1] + az[1] * p[2],
    o[2] + ax[2] * p[0] + ay[2] * p[1] + az[2] * p[2],
  ];
}

// ============================================================
//  Renderer
// ============================================================
const SCENE_VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in vec3 aCol;
layout(location=3) in float aRough;
layout(location=4) in float aGlow;
layout(location=5) in float aPart;
layout(location=6) in float aPanel;
uniform mat4 uView, uProj;
uniform vec3 uOff[16];
out vec3 vW; out vec3 vO; out vec3 vN; out vec3 vC;
out float vR; out float vG; out float vP; out float vPanel;
void main(){
  vec3 p = aPos + uOff[int(aPart + 0.5)];
  vW = p; vO = aPos; vN = aNrm; vC = aCol; vR = aRough; vG = aGlow; vP = aPart; vPanel = aPanel;
  gl_Position = uProj * uView * vec4(p, 1.0);
}`;

const SCENE_FS = `#version 300 es
precision highp float;
in vec3 vW; in vec3 vO; in vec3 vN; in vec3 vC;
in float vR; in float vG; in float vP; in float vPanel;
uniform vec3 uCam, uKeyDir, uFillDir, uRimDir;
uniform vec3 uKeyCol, uFillCol, uRimCol, uSkyCol, uGroundCol;
uniform vec3 uAccent;
uniform float uSel, uHover, uDark, uSeam, uExposure;
out vec4 outColor;

float hash21(vec2 p){ p = fract(p*vec2(127.1, 311.7)); p += dot(p, p+34.23); return fract(p.x*p.y); }

void main(){
  vec3 N = normalize(vN);
  if(!gl_FrontFacing) N = -N;
  vec3 Vv = normalize(uCam - vW);

  // ---- procedural panel seams on hull surfaces ----
  float seam = 0.0;
  if(vPanel > 0.5){
    float ang = atan(vO.z, vO.y);
    float rr = max(length(vO.yz), 0.25);
    float segA = 6.2831853 / 20.0;
    float ax = vO.x / 0.36;
    float fA = abs(fract(ax + 0.5) - 0.5) * 0.36;
    float wA = max(fwidth(vO.x) * 1.1, 0.006);
    float lA = 1.0 - smoothstep(0.004, 0.004 + wA, fA);
    float av = ang / segA;
    float fB = abs(fract(av + 0.5) - 0.5) * segA * rr;
    float wB = max(fwidth(ang) * rr * 1.1, 0.005);
    float lB = 1.0 - smoothstep(0.003, 0.003 + wB, fB);
    seam = clamp(lA + lB * 0.85, 0.0, 1.0) * uSeam;
  }

  vec3 albedo = vC * (1.0 - 0.30 * seam);
  float grain = hash21(floor(vO.xz * 46.0) + floor(vO.yy * 46.0));
  albedo *= 0.99 + 0.02 * grain;

  vec3 Lk = normalize(uKeyDir), Lf = normalize(uFillDir), Lr = normalize(uRimDir);
  float dk = max(dot(N, Lk), 0.0), df = max(dot(N, Lf), 0.0), dr = max(dot(N, Lr), 0.0);
  vec3 irr = uKeyCol * (dk * 0.95 + 0.10) + uFillCol * (df * 0.45) + uRimCol * (dr * 0.40);
  vec3 amb = mix(uGroundCol, uSkyCol, N.y * 0.5 + 0.5);
  vec3 col = albedo * (irr + amb);

  vec3 Hv = normalize(Lk + Vv);
  float shin = mix(140.0, 5.0, vR);
  float spec = pow(max(dot(N, Hv), 0.0), shin) * (1.0 - vR * 0.9);
  col += uKeyCol * spec * 0.55;
  vec3 Hf = normalize(Lf + Vv);
  col += uFillCol * pow(max(dot(N, Hf), 0.0), shin) * 0.18 * (1.0 - vR * 0.9);

  float fres = pow(1.0 - max(dot(N, Vv), 0.0), 3.5);
  col += uRimCol * fres * 0.16;
  vec3 env = mix(vec3(0.16, 0.175, 0.20), vec3(0.62, 0.65, 0.70), N.y * 0.5 + 0.5);
  col += env * fres * (0.18 + 0.25 * (1.0 - vR));
  vec3 Hf2 = normalize(normalize(uFillDir + Vv) + vec3(0.0, 0.35, 0.0));
  col += uFillCol * pow(max(dot(N, Hf2), 0.0), 24.0) * 0.25;

  col += albedo * vG * vec3(0.35, 0.85, 1.0) * 2.2 * uDark;
  col += uAccent * vG * 0.5 * uDark;

  float sel = step(abs(vP - uSel), 0.4);
  float hov = step(abs(vP - uHover), 0.4);
  albedo = mix(albedo, uAccent, 0.13 * sel + 0.055 * hov * (1.0 - sel));
  col = mix(col, albedo * (irr + amb) + uAccent * 0.06, 0.22 * sel + 0.08 * hov * (1.0 - sel));
  col += uAccent * fres * (0.65 * sel + 0.18 * hov * (1.0 - sel));
  col += uAccent * (0.02 * sel);

  col *= uExposure;
  col = col / (col + vec3(0.92)) * 1.62;
  col = pow(max(col, vec3(0.0)), vec3(0.4545));
  outColor = vec4(col, 1.0);
}`;

const PICK_VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=5) in float aPart;
uniform mat4 uView, uProj;
uniform vec3 uOff[16];
flat out float vPart;
out float vDepth;
void main(){
  vec3 p = aPos + uOff[int(aPart + 0.5)];
  vPart = aPart;
  vec4 vp = uView * vec4(p, 1.0);
  vDepth = -vp.z;
  gl_Position = uProj * vp;
}`;

const PICK_FS = `#version 300 es
precision highp float;
flat in float vPart;
in float vDepth;
out vec4 outColor;
void main(){
  float d = clamp(vDepth / 60.0, 0.0, 1.0) * 255.0;
  float hi = floor(d) / 255.0;
  float lo = fract(d);
  outColor = vec4(hi, lo, (vPart + 1.0) / 255.0, 1.0);
}`;

const BG_VS = `#version 300 es
out vec2 vUV;
void main(){
  vec2 p = vec2((gl_VertexID == 1) ? 3.0 : -1.0, (gl_VertexID == 2) ? 3.0 : -1.0);
  gl_Position = vec4(p, 0.0, 1.0);
  vUV = p * 0.5 + 0.5;
}`;

const COMP_FS = `#version 300 es
precision highp float;
in vec2 vUV;
uniform sampler2D uScene;
uniform sampler2D uAO;
uniform float uAOStr;
uniform float uDebugAO;
uniform vec2 uRes;
uniform vec3 uBgTop, uBgBot, uGlowCol, uVigCol;
uniform float uDark, uTime, uVig, uAOOn;
out vec4 outColor;

float hash21(vec2 p){ p = fract(p*vec2(127.1, 311.7)); p += dot(p, p+34.23); return fract(p.x*p.y); }

void main(){
  vec2 uv = vUV;
  vec3 bg = mix(uBgBot, uBgTop, smoothstep(0.0, 1.0, uv.y));
  vec2 q = uv - vec2(0.52, 0.55);
  bg += uGlowCol * exp(-dot(q, q) * 3.2);
  vec2 sp = uv * uRes / 1400.0;
  float st = hash21(floor(sp * 160.0));
  float star = smoothstep(0.9975, 1.0, st) * (0.35 + 0.65 * hash21(floor(sp * 160.0) + 3.1));
  bg += vec3(0.7, 0.85, 1.0) * star * 0.9 * uDark;
  bg += uGlowCol * exp(-dot(uv - vec2(0.5, 0.5), uv - vec2(0.5, 0.5)) * 0.9) * 0.5 * uDark;
  vec4 s = texture(uScene, uv);
  float ao = texture(uAO, uv).r;
  vec3 sc = s.rgb * mix(1.0, ao, uAOStr);
  if(uDebugAO > 0.5){ outColor = vec4(vec3(ao), 1.0); return; }
  vec3 col = mix(bg, sc, s.a);
  vec2 vq = uv - 0.5;
  col *= 1.0 - uVig * dot(vq, vq) * 1.15;
  col = mix(col, uVigCol, smoothstep(0.35, 0.85, dot(vq, vq)) * 0.20);
  col += (hash21(uv * uRes + fract(uTime)) - 0.5) * 0.012;
  outColor = vec4(col, 1.0);
}`;


const AO_FS = `#version 300 es
precision highp float;
in vec2 vUV;
uniform sampler2D uDP;
uniform mat4 uInvProj;
uniform vec2 uRes;
uniform float uProjY;
uniform float uRadius;
out vec4 outColor;

float unpackD(vec2 rg){ return (rg.x*255.0 + rg.y*255.0/255.0) / 255.0 * 60.0; }

vec3 vpos(vec2 uv){
  vec2 ndc = uv*2.0-1.0;
  vec4 p = uInvProj * vec4(ndc, 1.0, 1.0);
  vec3 dir = p.xyz / p.w;
  float d = unpackD(texture(uDP, uv).rg);
  return dir * (d / max(0.0001, -dir.z));
}

float hash12(vec2 p){ p = fract(p*vec2(443.897, 441.423)); p += dot(p, p.yx+19.19); return fract((p.x+p.y)*p.x); }

void main(){
  vec4 dp = texture(uDP, vUV);
  float depth = unpackD(dp.rg);
  if(depth <= 0.001){ outColor = vec4(1.0); return; }
  vec3 p = vpos(vUV);
  float e = 1.0 / uRes.x;
  vec3 px = vpos(vUV + vec2(e, 0.0));
  vec3 py = vpos(vUV + vec2(0.0, e));
  vec3 n = normalize(cross(px - p, py - p));
  if(dot(n, -p) < 0.0) n = -n;
  float rp = clamp(uRadius * uProjY / max(0.2, -p.z), 1.0, 26.0);
  float a0 = hash12(vUV * uRes) * 6.2831853;
  float occ = 0.0;
  for(int i=0;i<12;i++){
    float fi = float(i);
    float ang = a0 + fi * 2.39996323;
    float rr = sqrt((fi + 0.5) / 12.0);
    vec2 off = vec2(cos(ang), sin(ang)) * rr * rp / uRes;
    float d2 = unpackD(texture(uDP, vUV + off).rg);
    if(d2 <= 0.001) continue;
    vec3 q = vpos(vUV + off);
    vec3 dv = q - p;
    float dist = length(dv);
    if(dist < 0.0005 || dist > uRadius*2.0) continue;
    float ndl = dot(dv / dist, n);
    if(ndl <= 0.03) continue;
    occ += ndl * (1.0 - dist / (uRadius*2.0));
  }
  float ao = 1.0 - (occ / 12.0) * 5.2;
  ao = clamp(ao, 0.0, 1.0);
  outColor = vec4(ao, ao, ao, 1.0);
}`;

const BLUR_FS = `#version 300 es
precision highp float;
in vec2 vUV;
uniform sampler2D uTex;
uniform vec2 uTexel;
out vec4 outColor;
void main(){
  float s = 0.0;
  s += texture(uTex, vUV + uTexel * vec2(-1.5, -0.5)).r * 0.15;
  s += texture(uTex, vUV + uTexel * vec2(-0.5, -1.5)).r * 0.15;
  s += texture(uTex, vUV + uTexel * vec2( 0.5, -0.5)).r * 0.15;
  s += texture(uTex, vUV + uTexel * vec2( 1.5,  0.5)).r * 0.15;
  s += texture(uTex, vUV + uTexel * vec2(-0.5,  1.5)).r * 0.15;
  s += texture(uTex, vUV + uTexel * vec2( 0.5,  0.5)).r * 0.25;
  outColor = vec4(s, s, s, 1.0);
}`;

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    const opts = { antialias: false, alpha: false, depth: true, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
    const gl = canvas.getContext('webgl2', opts);
    if (!gl) throw new Error('WebGL2 not supported');
    this.gl = gl;
    this.samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES) || 0);
    this.progScene = this._program(SCENE_VS, SCENE_FS);
    this.progPick = this._program(PICK_VS, PICK_FS);
    this.progComp = this._program(BG_VS, COMP_FS);
    this.progAO = this._program(BG_VS, AO_FS);
    this.progBlur = this._program(BG_VS, BLUR_FS);
    this.vao = null;
    this.partRanges = [];
    this.fbo = null;
    this.compUni = {};
    this.dpr = 1;
    this.W = 1; this.H = 1;
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
    gl.clearColor(0, 0, 0, 0);
    this.emptyVao = gl.createVertexArray();
  }

  _program(vs, fs) {
    const gl = this.gl;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(s);
        console.error('shader error:', log, '\n', src.split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n'));
        throw new Error(log);
      }
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      u[info.name.replace('[0]', '')] = gl.getUniformLocation(p, info.name);
    }
    return { p, u, vs, fs };
  }

  upload(builder) {
    const gl = this.gl;
    this.partRanges = builder.ranges;
    const data = builder.data();
    if (this.vbo) gl.deleteBuffer(this.vbo);
    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    if (this.vao) gl.deleteVertexArray(this.vao);
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    const attrs = [
      [0, 3, 0], [1, 3, 3], [2, 3, 6], [3, 1, 9], [4, 1, 10], [5, 1, 11], [6, 1, 12],
    ];
    for (const [loc, size, off] of attrs) {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, STRIDE, off * 4);
    }
    gl.bindVertexArray(null);
    this.triCount = data.length / FPV / 3;
  }

  _drawParts(vis) {
    const gl = this.gl;
    for (let i = 0; i < this.partRanges.length; i++) {
      const list = this.partRanges[i];
      if (!list || !vis[i]) continue;
      for (let k = 0; k < list.length; k++) gl.drawArrays(gl.TRIANGLES, list[k].start, list[k].count);
    }
  }

  resize(cssW, cssH, dpr) {
    const gl = this.gl;
    dpr = clamp(dpr || 1, 1, 2);
    let bw = Math.round(cssW * dpr), bh = Math.round(cssH * dpr);
    const maxPx = 6.2e6;
    if (bw * bh > maxPx) { const k = Math.sqrt(maxPx / (bw * bh)); bw = Math.round(bw * k); bh = Math.round(bh * k); }
    if (this.W === bw && this.H === bh) return;
    this.W = bw; this.H = bh;
    this._cssW = cssW; this._cssH = cssH;
    this.canvas.width = bw; this.canvas.height = bh;
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    this._allocTargets();
  }

  _tex(w, h, internal) {
    const gl = this.gl;
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  _allocTargets() {
    const gl = this.gl;
    if (this.fbo) {
      for (const k of ['resTex', 'pickTex', 'aoTex', 'aoTex2']) if (this[k]) gl.deleteTexture(this[k]);
      for (const k of ['msColor', 'msDepth', 'resDepth', 'pickDepth']) if (this[k]) gl.deleteRenderbuffer(this[k]);
      for (const k of ['msFbo', 'resFbo', 'pickFbo', 'aoFbo', 'aoFbo2']) if (this[k]) gl.deleteFramebuffer(this[k]);
      this.fbo = null;
    }
    const W = this.W, H = this.H;
    // ---- multisampled scene target ----
    if (this.samples > 0) {
      this.msFbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.msFbo);
      this.msColor = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.msColor);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, gl.RGBA8, W, H);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this.msColor);
      this.msDepth = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.msDepth);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, gl.DEPTH_COMPONENT24, W, H);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.msDepth);
    }
    // ---- resolved target ----
    this.resFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.resFbo);
    this.resTex = this._tex(W, H, gl.RGBA8);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.resTex, 0);
    if (this.samples === 0) {
      this.resDepth = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.resDepth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, W, H);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.resDepth);
    }
    // ---- pick / depth target ----
    const pw = Math.max(1, W), ph = Math.max(1, H);
    this.pw = pw; this.ph = ph;
    this.pickFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickFbo);
    this.pickTex = this._tex(pw, ph, gl.RGBA8);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.pickTex, 0);
    this.pickDepth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.pickDepth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, pw, ph);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.pickDepth);
    // ---- AO targets (half res) ----
    this.aoFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.aoFbo);
    this.aoTex = this._tex(pw, ph, gl.RGBA8);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.aoTex, 0);
    this.aoFbo2 = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.aoFbo2);
    this.aoTex2 = this._tex(pw, ph, gl.RGBA8);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.aoTex2, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.fbo = true;
  }

  render(cam, state) {
    const gl = this.gl;
    const vis = state.visible;
    // ---------- pick / depth pass ----------
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickFbo);
    gl.viewport(0, 0, this.pw, this.ph);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const pp = this.progPick;
    gl.useProgram(pp.p);
    gl.uniformMatrix4fv(pp.u.uView, false, cam.view);
    gl.uniformMatrix4fv(pp.u.uProj, false, cam.proj);
    if (pp.u.uOff) gl.uniform3fv(pp.u.uOff, state.offsetsFlat);
    gl.bindVertexArray(this.vao);
    this._drawParts(vis);
    // ---------- scene ----------
    if (this.samples > 0) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.msFbo);
      gl.viewport(0, 0, this.W, this.H);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.resFbo);
      gl.viewport(0, 0, this.W, this.H);
    }
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const sp = this.progScene;
    gl.useProgram(sp.p);
    gl.uniformMatrix4fv(sp.u.uView, false, cam.view);
    gl.uniformMatrix4fv(sp.u.uProj, false, cam.proj);
    gl.uniform3fv(sp.u.uCam, cam.eye);
    const L = state.lights;
    gl.uniform3fv(sp.u.uKeyDir, L.keyDir);
    gl.uniform3fv(sp.u.uFillDir, L.fillDir);
    gl.uniform3fv(sp.u.uRimDir, L.rimDir);
    gl.uniform3fv(sp.u.uKeyCol, L.keyCol);
    gl.uniform3fv(sp.u.uFillCol, L.fillCol);
    gl.uniform3fv(sp.u.uRimCol, L.rimCol);
    gl.uniform3fv(sp.u.uSkyCol, L.skyCol);
    gl.uniform3fv(sp.u.uGroundCol, L.groundCol);
    gl.uniform3fv(sp.u.uAccent, state.accent);
    gl.uniform1f(sp.u.uSel, state.sel);
    gl.uniform1f(sp.u.uHover, state.hover);
    gl.uniform1f(sp.u.uDark, state.darkMix || 0);
    gl.uniform1f(sp.u.uSeam, state.seam);
    gl.uniform1f(sp.u.uExposure, L.exposure);
    if (sp.u.uOff) gl.uniform3fv(sp.u.uOff, state.offsetsFlat);
    gl.bindVertexArray(this.vao);
    this._drawParts(vis);
    gl.bindVertexArray(null);
    // ---------- resolve ----------
    if (this.samples > 0) {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.msFbo);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.resFbo);
      gl.blitFramebuffer(0, 0, this.W, this.H, 0, 0, this.W, this.H, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    // ---------- ambient occlusion ----------
    gl.disable(gl.DEPTH_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.aoFbo);
    gl.viewport(0, 0, this.pw, this.ph);
    const ap = this.progAO;
    gl.useProgram(ap.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.pickTex);
    gl.uniform1i(ap.u.uDP, 0);
    gl.uniformMatrix4fv(ap.u.uInvProj, false, cam.invProj);
    gl.uniform2f(ap.u.uRes, this.pw, this.ph);
    gl.uniform1f(ap.u.uProjY, cam.proj[5] * this.ph * 0.5);

    gl.uniform1f(ap.u.uRadius, state.aoRadius || 0.34);
    gl.bindVertexArray(this.emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // blur
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.aoFbo2);
    const bp = this.progBlur;
    gl.useProgram(bp.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.aoTex);
    gl.uniform1i(bp.u.uTex, 0);
    gl.uniform2f(bp.u.uTexel, 1.2 / this.pw, 1.2 / this.ph);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // second blur pass (smoother)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.aoFbo);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.aoTex2);
    gl.uniform2f(bp.u.uTexel, 2.0 / this.pw, 2.0 / this.ph);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);

    // ---------- composite ----------
    const cp = this.progComp;
    gl.useProgram(cp.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.W, this.H);
    gl.disable(gl.DEPTH_TEST);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.resTex);
    gl.uniform1i(cp.u.uScene, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.aoTex);
    gl.uniform1i(cp.u.uAO, 1);
    gl.uniform1f(cp.u.uAOStr, state.aoStrength !== undefined ? state.aoStrength : 0.9);
    gl.uniform1f(cp.u.uDebugAO, state.debugAO || 0);
    gl.uniform2f(cp.u.uRes, this.W, this.H);
    gl.uniform3fv(cp.u.uBgTop, state.bgTop);
    gl.uniform3fv(cp.u.uBgBot, state.bgBot);
    gl.uniform3fv(cp.u.uGlowCol, state.glowCol);
    gl.uniform3fv(cp.u.uVigCol, state.vigCol);
    gl.uniform1f(cp.u.uDark, state.darkMix || 0);
    gl.uniform1f(cp.u.uTime, state.time);
    gl.uniform1f(cp.u.uVig, state.vig);
    gl.uniform1f(cp.u.uAOOn, 0);
    gl.bindVertexArray(this.emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
    gl.enable(gl.DEPTH_TEST);
  }

  pick(cssX, cssY) {
    const gl = this.gl;
    const x = Math.round(cssX / this._cssW * this.pw);
    const y = Math.round((1 - cssY / this._cssH) * this.ph);
    if (x < 0 || y < 0 || x >= this.pw || y >= this.ph) return -1;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickFbo);
    const px = new Uint8Array(4);
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return px[2] - 1;
  }
}

// ============================================================
//  Orbit camera
// ============================================================
class Camera {
  constructor() {
    this.target = [6.10, 0.05, 0];
    this.yaw = 3.47;
    this.pitch = 0.43;
    this.dist = 20.4;
    this.fov = 30 * Math.PI / 180;
    this.near = 0.08;
    this.far = 120;
    this.eye = [0, 0, 0];
    this.view = M.ident();
    this.proj = M.ident();
    this.shiftX = 0;
    this.shiftY = 0;
    this.roll = 0;
  }
  update(aspect) {
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    this.eye = [
      this.target[0] + this.dist * cp * Math.sin(this.yaw),
      this.target[1] + this.dist * sp,
      this.target[2] + this.dist * cp * Math.cos(this.yaw),
    ];
    this.view = M.lookAt(this.eye, this.target, [0, 1, 0]);
    this.proj = M.perspective(this.fov, aspect, this.near, this.far);
    this.proj[8] = -this.shiftX;
    this.proj[9] = -this.shiftY;
    if (this.roll) {
      const c = Math.cos(this.roll), s = Math.sin(this.roll);
      const ar = aspect; // W/H
      for (let col = 0; col < 4; col++) {
        const x = this.proj[col * 4], y = this.proj[col * 4 + 1];
        this.proj[col * 4] = c * x - s * y / ar;
        this.proj[col * 4 + 1] = s * ar * x + c * y;
      }
    }
    this.invProj = M.invert(this.proj);
    this.vp = M.mul(this.proj, this.view);
  }
  project(p, w, h) {
    const x = this.vp[0] * p[0] + this.vp[4] * p[1] + this.vp[8] * p[2] + this.vp[12];
    const y = this.vp[1] * p[0] + this.vp[5] * p[1] + this.vp[9] * p[2] + this.vp[13];
    const z = this.vp[2] * p[0] + this.vp[6] * p[1] + this.vp[10] * p[2] + this.vp[14];
    const ww = this.vp[3] * p[0] + this.vp[7] * p[1] + this.vp[11] * p[2] + this.vp[15];
    if (ww <= 0) return null;
    return [(x / ww * 0.5 + 0.5) * w, (1 - (y / ww * 0.5 + 0.5)) * h, z / ww];
  }
}
