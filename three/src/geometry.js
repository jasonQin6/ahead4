import * as THREE from 'three';
import { Builder, FPV } from './helpers.js';
import { PARTS, buildShip } from './model.js';

const q = (v, s) => Math.round(v * s);
const clampI8 = (v) => (v < -128 ? -128 : v > 127 ? 127 : v);

// Split the flat procedural buffer into one indexed geometry per part.
// Vertices are deduplicated (position/normal/colour/misc) and packed into
// 24 bytes each:
//   position float32 x3 (12) + normal int8 x3 (3) +
//   colour uint8 x3 (3) + misc(rough, glow, panel) uint8 x3 (3)
export function buildShipGeometries() {
  const t0 = performance.now();
  const b = new Builder();
  buildShip(b);
  const shipMs = performance.now() - t0;
  const rawVerts = b.buf.length / FPV;

  const geometries = [];
  let uniqueVerts = 0;
  let indexCount = 0;

  for (let id = 0; id < PARTS.length; id++) {
    const ranges = b.ranges[id] || [];
    let cap = 0;
    for (const r of ranges) cap += r.count;
    if (!cap) continue;

    const pos = new Float32Array(cap * 3);
    const px = new Int32Array(cap * 3); // quantised position, for exact compare
    const nrm = new Int8Array(cap * 3);
    const col = new Uint8Array(cap * 3);
    const misc = new Uint8Array(cap * 3);
    const idx = new Uint32Array(cap);
    const buckets = new Map();

    // current quantised vertex, read by matches() during bucket probing
    let cx = 0, cy = 0, cz = 0;
    let cnx = 0, cny = 0, cnz = 0;
    let ccr = 0, ccg = 0, ccb = 0;
    let cro = 0, cgl = 0, cpa = 0;
    const matches = (j) => {
      const j3 = j * 3;
      return px[j3] === cx && px[j3 + 1] === cy && px[j3 + 2] === cz &&
        nrm[j3] === cnx && nrm[j3 + 1] === cny && nrm[j3 + 2] === cnz &&
        col[j3] === ccr && col[j3 + 1] === ccg && col[j3 + 2] === ccb &&
        misc[j3] === cro && misc[j3 + 1] === cgl && misc[j3 + 2] === cpa;
    };

    let u = 0, ii = 0;
    for (const r of ranges) {
      const end = r.start + r.count;
      for (let vi = r.start; vi < end; vi++) {
        const o = vi * FPV;
        cx = q(b.buf[o], 1e4); cy = q(b.buf[o + 1], 1e4); cz = q(b.buf[o + 2], 1e4);
        cnx = clampI8(q(b.buf[o + 3], 127)); cny = clampI8(q(b.buf[o + 4], 127)); cnz = clampI8(q(b.buf[o + 5], 127));
        ccr = q(b.buf[o + 6], 255); ccg = q(b.buf[o + 7], 255); ccb = q(b.buf[o + 8], 255);
        cro = q(b.buf[o + 9], 100); cgl = q(b.buf[o + 10], 100);
        cpa = b.buf[o + 12] > 0.5 ? 255 : 0;

        let h = 0x811c9dc5;
        h = Math.imul(h ^ cx, 0x01000193);
        h = Math.imul(h ^ cy, 0x01000193);
        h = Math.imul(h ^ cz, 0x01000193);
        h = Math.imul(h ^ cnx, 0x01000193);
        h = Math.imul(h ^ cny, 0x01000193);
        h = Math.imul(h ^ cnz, 0x01000193);
        h = Math.imul(h ^ ccr, 0x01000193);
        h = Math.imul(h ^ ccg, 0x01000193);
        h = Math.imul(h ^ ccb, 0x01000193);
        h = Math.imul(h ^ cro, 0x01000193);
        h = Math.imul(h ^ cgl, 0x01000193);
        h = Math.imul(h ^ cpa, 0x01000193);
        h = (h ^ (h >>> 13)) >>> 0;

        const slot = buckets.get(h);
        let out = -1;
        if (typeof slot === 'number') {
          if (matches(slot)) out = slot;
        } else if (slot !== undefined) {
          for (let k = 0; k < slot.length; k++) {
            if (matches(slot[k])) { out = slot[k]; break; }
          }
        }

        if (out < 0) {
          out = u++;
          const o3 = out * 3;
          px[o3] = cx; px[o3 + 1] = cy; px[o3 + 2] = cz;
          pos[o3] = cx / 1e4; pos[o3 + 1] = cy / 1e4; pos[o3 + 2] = cz / 1e4;
          nrm[o3] = cnx; nrm[o3 + 1] = cny; nrm[o3 + 2] = cnz;
          col[o3] = ccr; col[o3 + 1] = ccg; col[o3 + 2] = ccb;
          misc[o3] = cro; misc[o3 + 1] = cgl; misc[o3 + 2] = cpa;
          if (slot === undefined) buckets.set(h, out);
          else if (typeof slot === 'number') buckets.set(h, [slot, out]);
          else slot.push(out);
        }
        idx[ii++] = out;
      }
    }

    if (!ii) continue;

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos.slice(0, u * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nrm.slice(0, u * 3), 3, true));
    g.setAttribute('color', new THREE.BufferAttribute(col.slice(0, u * 3), 3, true));
    g.setAttribute('aMisc', new THREE.BufferAttribute(misc.slice(0, u * 3), 3, true));
    if (u > 65535) {
      g.setIndex(new THREE.BufferAttribute(idx.slice(0, ii), 1));
    } else {
      const small = new Uint16Array(ii);
      for (let k = 0; k < ii; k++) small[k] = idx[k];
      g.setIndex(new THREE.BufferAttribute(small, 1));
    }
    g.computeBoundingBox();
    g.computeBoundingSphere();
    g.name = PARTS[id].name;

    geometries[id] = g;
    uniqueVerts += u;
    indexCount += ii;
  }

  const buildMs = performance.now() - t0;
  const rawBytes = b.buf.length * 4;
  const packedBytes = uniqueVerts * 24 + indexCount * 2;
  const stats = {
    buildMs,
    buildShipMs: +shipMs.toFixed(1),
    splitMs: +(buildMs - shipMs).toFixed(1),
    rawVerts,
    uniqueVerts,
    triangles: indexCount / 3,
    rawBytes,
    packedBytes,
    ranges: b.ranges.map((r) => (r ? r.length : 0)),
  };
  console.log('[three] geometry', stats);
  return { geometries, stats, parts: PARTS };
}
