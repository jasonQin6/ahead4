// Geometry helpers shared by the procedural ship model.
// The mesh builder keeps the same API as the original engine so model.js
// can be reused verbatim.

export const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};

export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;

export const FPV = 13;
export const STRIDE = FPV * 4;

export class Builder {
  constructor() {
    this.buf = [];
    this.ranges = [];
    this.partId = 0;
    this._start = 0;
    this._r = 0.5;
    this._g = 0;
    this._p = 0;
  }
  begin(id, rough = 0.5, glow = 0, panel = 0) {
    this.partId = id;
    this._start = this.buf.length / FPV;
    this._r = rough;
    this._g = glow;
    this._p = panel;
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

export function faceN(a, b, c) {
  return V.norm(V.cross(V.sub(b, a), V.sub(c, a)));
}

// base polygon -> raised, chamfered plate (convex polygon, counter-clockwise-ish)
export function raisedPoly(b, base, n, h, bevel, c, sideC) {
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
export function obox(b, o, ax, ay, az, sx, sy, sz, c) {
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
export function pipe(b, p0, p1, r0, r1, segs, c, cap = true) {
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

export function sphere(b, cpos, rad, segs, rings, c) {
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
