// ============================================================
//  深空舞台：银河、星点、太阳、木星、卫星、引擎小太阳、追击舰队
// ============================================================
import * as THREE from 'three';

const TAU = Math.PI * 2;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeGlowTexture(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0.0, 'rgba(255,255,255,1)');
  g.addColorStop(0.06, 'rgba(255,255,255,1)');
  g.addColorStop(0.16, 'rgba(232,245,255,0.92)');
  g.addColorStop(0.34, 'rgba(150,205,255,0.38)');
  g.addColorStop(0.62, 'rgba(70,130,220,0.10)');
  g.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------- background
const BG_VS = `
varying vec3 vDir;
void main(){
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const BG_FS = `
precision highp float;
varying vec3 vDir;
uniform vec3 uBandNormal;
uniform vec3 uCoreDir;
uniform float uBand;
uniform float uTime;

float hash31(vec3 p){
  p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.23));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise3(vec3 x){
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash31(i + vec3(0,0,0)), hash31(i + vec3(1,0,0)), f.x),
        mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
        mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}
float fbm(vec3 p){
  float s = 0.0, a = 0.5;
  for(int i = 0; i < 5; i++){ s += a * noise3(p); p = p * 2.03 + 11.7; a *= 0.5; }
  return s;
}
float ridge(vec3 p){
  float s = 0.0, a = 0.5;
  for(int i = 0; i < 4; i++){ s += a * (1.0 - abs(noise3(p) * 2.0 - 1.0)); p = p * 2.11 + 5.3; a *= 0.5; }
  return s;
}

void main(){
  vec3 d = normalize(vDir);
  float bank = dot(d, uBandNormal);
  float band = exp(-bank * bank / 0.0085);
  float wide = exp(-bank * bank / 0.085);
  float ang = acos(clamp(dot(d, uCoreDir), -1.0, 1.0));

  float cloud = fbm(d * 2.55 + 4.0);
  float fine = fbm(d * 8.6 + 1.7);
  float fil = ridge(d * 4.7 + cloud * 1.6);
  float dust = fbm(d * 6.1 + 9.1);
  float dustFine = fbm(d * 15.0 + 2.2);

  vec3 col = vec3(0.0004, 0.0006, 0.0013);

  // warm toward the galactic core, cool at the rim of the band
  float warmth = smoothstep(1.35, 0.18, ang);
  vec3 cool = vec3(0.082, 0.118, 0.198);
  vec3 warm = vec3(0.198, 0.152, 0.106);
  vec3 base = mix(cool, warm, warmth * 0.92);

  float tex = 0.10 + 0.95 * cloud + 0.50 * fine + 0.42 * fil;
  float clump = 0.08 + 1.95 * smoothstep(0.34, 0.84, fbm(d * 13.0 + 6.4));
  col += base * tex * clump * (band * 0.30 + wide * 0.014) * uBand;
  col += base * 0.007 * (0.4 + 0.6 * warmth) * wide * uBand;

  // continuous luminous spine along the galactic plane
  float spine = exp(-bank * bank / 0.0020);
  vec3 spineCol = mix(vec3(0.135, 0.140, 0.152), vec3(0.280, 0.220, 0.150), warmth);
  col += spineCol * spine * (0.30 + 0.70 * fil) * (0.55 + 0.45 * fine) * 0.26 * uBand;

  // a tight, warm bulge where the band is thickest
  col += vec3(0.300, 0.220, 0.140) * exp(-ang * ang / 0.16) * band * 0.16 * uBand;

  // dark rifts carving the band into separate star clouds
  float lane = smoothstep(0.36, 0.60, dust) * (0.55 + 0.45 * smoothstep(0.38, 0.68, dustFine));
  col *= 1.0 - lane * band * 1.0;
  col *= 1.0 - smoothstep(0.62, 0.94, dustFine) * wide * 0.38;

  // faint scattered nebulosity well away from the band
  float neb = smoothstep(0.58, 0.88, fbm(d * 1.9 + 13.0));
  float nebHue = fbm(d * 1.2 + 31.0);
  col += mix(vec3(0.045, 0.026, 0.072), vec3(0.024, 0.058, 0.088), nebHue) * neb * 0.040 * uBand * (1.0 - band * 0.7);

  gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
}`;

export function makeFlareTexture(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const m = size / 2;
  ctx.translate(m, m);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, m);
  g.addColorStop(0.0, 'rgba(255,255,255,1)');
  g.addColorStop(0.05, 'rgba(255,255,255,0.98)');
  g.addColorStop(0.12, 'rgba(214,236,255,0.70)');
  g.addColorStop(0.30, 'rgba(120,175,255,0.16)');
  g.addColorStop(0.62, 'rgba(60,110,220,0.04)');
  g.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, m, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  const spike = (len, wide, alpha) => {
    const sg = ctx.createLinearGradient(-len, 0, len, 0);
    sg.addColorStop(0, 'rgba(180,215,255,0)');
    sg.addColorStop(0.5, 'rgba(235,245,255,' + alpha + ')');
    sg.addColorStop(1, 'rgba(180,215,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(-len, -wide, len * 2, wide * 2);
  };
  spike(m * 0.98, m * 0.014, 0.85);
  ctx.rotate(Math.PI / 2);
  spike(m * 0.98, m * 0.014, 0.85);
  ctx.rotate(Math.PI / 4);
  spike(m * 0.42, m * 0.008, 0.32);
  ctx.rotate(Math.PI / 2);
  spike(m * 0.42, m * 0.008, 0.32);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createBackground() {
  const geo = new THREE.SphereGeometry(14000, 48, 28);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uBandNormal: { value: new THREE.Vector3(0.60, 0.28, -0.75).normalize() },
      uCoreDir: { value: new THREE.Vector3(0.62, -0.72, 0.30).normalize() },
      uBand: { value: 1.0 },
      uTime: { value: 0 },
    },
    vertexShader: BG_VS,
    fragmentShader: BG_FS,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -100;
  return mesh;
}

// ---------------------------------------------------------------- stars
const STAR_VS = `
attribute float aSize;
attribute vec3 aColor;
varying vec3 vColor;
uniform float uDpr;
void main(){
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uDpr;
}`;

const STAR_FS = `
precision highp float;
varying vec3 vColor;
void main(){
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p);
  if(d > 0.5) discard;
  float a = smoothstep(0.5, 0.08, d);
  a *= a;
  gl_FragColor = vec4(vColor, a);
}`;

export function createStarfield({ count = 15000, bandCount = 9000 } = {}) {
  const rand = mulberry32(0x5eed1234);
  const group = new THREE.Group();
  group.name = 'stars';
  group.renderOrder = -80;

  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const col = new Float32Array(count * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const u = rand() * 2 - 1;
    const th = rand() * TAU;
    const r = Math.sqrt(1 - u * u);
    const R = 12500;
    pos[i * 3] = r * Math.cos(th) * R;
    pos[i * 3 + 1] = u * R;
    pos[i * 3 + 2] = r * Math.sin(th) * R;

    // magnitude distribution: a dense veil of faint stars, a few unmistakable ones
    const m = Math.pow(rand(), 2.6);
    size[i] = 1.5 + m * 6.5;
    const temp = rand();
    if (temp < 0.16) tmp.setRGB(1.0, 0.80, 0.58);
    else if (temp < 0.36) tmp.setRGB(1.0, 0.95, 0.88);
    else if (temp < 0.76) tmp.setRGB(0.88, 0.94, 1.0);
    else tmp.setRGB(0.66, 0.80, 1.0);
    const b = 0.30 + m * 2.1 + rand() * 0.18;
    col[i * 3] = tmp.r * b;
    col[i * 3 + 1] = tmp.g * b;
    col[i * 3 + 2] = tmp.b * b;
  }
  let geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uDpr: { value: 1 } },
    vertexShader: STAR_VS,
    fragmentShader: STAR_FS,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  group.add(points);

  // the handful of first-magnitude stars get real diffraction spikes
  const flareTex = makeFlareTexture(256);
  const flares = [];
  for (let i = 0; i < 22; i++) {
    const u = rand() * 2 - 1;
    const th = rand() * TAU;
    const r = Math.sqrt(1 - u * u);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: flareTex,
      color: new THREE.Color().setRGB(1.0, 0.86 + rand() * 0.12, 0.72 + rand() * 0.26),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      opacity: 0.55 + rand() * 0.4,
      rotation: rand() * TAU,
    }));
    sp.position.set(r * Math.cos(th) * 12400, u * 12400, r * Math.sin(th) * 12400);
    sp.scale.setScalar(40 + Math.pow(rand(), 2.0) * 68);
    sp.renderOrder = -78;
    sp.userData.spin = (rand() - 0.5) * 0.006;
    group.add(sp);
    flares.push(sp);
  }

  // dense star dust hugging the Milky Way plane
  const bn = new THREE.Vector3(0.60, 0.28, -0.75).normalize();
  const e1 = new THREE.Vector3(0, 0, 1).cross(bn).normalize();
  const e2 = new THREE.Vector3().crossVectors(bn, e1).normalize();
  const bpos = new Float32Array(bandCount * 3);
  const bsize = new Float32Array(bandCount);
  const bcol = new Float32Array(bandCount * 3);
  for (let i = 0; i < bandCount; i++) {
    const th = rand() * TAU;
    const g = (rand() + rand() + rand() + rand() - 2) * 0.062;
    const dir = new THREE.Vector3()
      .addScaledVector(e1, Math.cos(th))
      .addScaledVector(e2, Math.sin(th))
      .addScaledVector(bn, g)
      .normalize();
    const R = 12400 + rand() * 700;
    bpos[i * 3] = dir.x * R;
    bpos[i * 3 + 1] = dir.y * R;
    bpos[i * 3 + 2] = dir.z * R;
    bsize[i] = 1.15 + Math.pow(rand(), 2.6) * 4.2;
    const b = 0.18 + rand() * 0.54;
    const warm = rand();
    bcol[i * 3] = b * (warm < 0.34 ? 1.0 : 0.80);
    bcol[i * 3 + 1] = b * (warm < 0.34 ? 0.88 : 0.90);
    bcol[i * 3 + 2] = b * (warm < 0.34 ? 0.70 : 1.0);
  }

  // compact clusters: a few brighter knots inside the band
  const clusterCount = Math.round(bandCount * 0.012);
  const cpos = new Float32Array(clusterCount * 3);
  const csize = new Float32Array(clusterCount);
  const ccol = new Float32Array(clusterCount * 3);
  for (let i = 0; i < clusterCount; i++) {
    const th = rand() * TAU;
    const g = (rand() + rand() + rand() - 1.5) * 0.045;
    const dir = new THREE.Vector3()
      .addScaledVector(e1, Math.cos(th))
      .addScaledVector(e2, Math.sin(th))
      .addScaledVector(bn, g)
      .normalize();
    const R = 12450 + rand() * 450;
    cpos[i * 3] = dir.x * R;
    cpos[i * 3 + 1] = dir.y * R;
    cpos[i * 3 + 2] = dir.z * R;
    csize[i] = 3.5 + rand() * 6.5;
    const b = 0.70 + rand() * 0.70;
    ccol[i * 3] = b * 0.92;
    ccol[i * 3 + 1] = b * 0.94;
    ccol[i * 3 + 2] = b;
  }
  geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(bpos, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(bsize, 1));
  geo.setAttribute('aColor', new THREE.BufferAttribute(bcol, 3));
  const bandPoints = new THREE.Points(geo, mat);
  bandPoints.frustumCulled = false;
  bandPoints.renderOrder = -79;
  group.add(bandPoints);

  geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(cpos, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(csize, 1));
  geo.setAttribute('aColor', new THREE.BufferAttribute(ccol, 3));
  const clusters = new THREE.Points(geo, mat);
  clusters.frustumCulled = false;
  clusters.renderOrder = -78;
  group.add(clusters);

  // soft luminous clouds that tie the band together into one continuous ribbon
  const glowTex = makeGlowTexture(256);
  for (let i = 0; i < 30; i++) {
    const th = rand() * TAU;
    const g = (rand() + rand() - 1.0) * 0.055;
    const dir = new THREE.Vector3()
      .addScaledVector(e1, Math.cos(th))
      .addScaledVector(e2, Math.sin(th))
      .addScaledVector(bn, g)
      .normalize();
    const warm = rand();
    const cloud = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex,
      color: new THREE.Color().setRGB(
        0.62 + warm * 0.10, 0.60 + warm * 0.06, 0.60 + (1 - warm) * 0.10),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      opacity: 0.035 + rand() * 0.045,
    }));
    cloud.position.copy(dir).multiplyScalar(12350);
    cloud.scale.setScalar(650 + rand() * 1650);
    cloud.renderOrder = -79;
    group.add(cloud);
  }

  return {
    group,
    setDpr(dpr) { mat.uniforms.uDpr.value = dpr; },
    update(dt, speed) {
      group.rotation.y += dt * speed;
      for (const sp of flares) sp.material.rotation += dt * sp.userData.spin;
    },
  };
}

// ---------------------------------------------------------------- sun
export function createSun() {
  const group = new THREE.Group();
  const tex = makeGlowTexture(256);
  const core = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending,
    depthTest: false, depthWrite: false, opacity: 1.0,
  }));
  core.scale.setScalar(32);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, color: 0xa9c8ff, transparent: true, blending: THREE.AdditiveBlending,
    depthTest: false, depthWrite: false, opacity: 0.40,
  }));
  halo.scale.setScalar(118);
  group.add(halo, core);
  group.position.set(-0.55, 0.10, -0.82).normalize().multiplyScalar(9000);
  group.renderOrder = -70;
  return {
    group,
    setOpacity(v) { core.material.opacity = v; halo.material.opacity = 0.40 * v; group.visible = v > 0.01; },
  };
}

// ---------------------------------------------------------------- jupiter
const JUP_VS = `
varying vec3 vObjN;
varying vec3 vWorldN;
varying vec3 vWorldPos;
void main(){
  vObjN = normalize(normal);
  vWorldN = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const JUP_FS = `
precision highp float;
varying vec3 vObjN;
varying vec3 vWorldN;
varying vec3 vWorldPos;

uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uEngineDir;
uniform float uEngine;
uniform float uShadow;
uniform vec3 uShadowDir;
uniform vec2 uShadowRadius;
uniform float uFlash;
uniform float uGlow;
uniform float uFade;
uniform float uSunInt;

float hash31(vec3 p){
  p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.23));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise3(vec3 x){
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash31(i + vec3(0,0,0)), hash31(i + vec3(1,0,0)), f.x),
        mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
        mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}
float fbm(vec3 p){
  float s = 0.0, a = 0.5;
  for(int i = 0; i < 5; i++){ s += a * noise3(p); p = p * 2.03 + 7.1; a *= 0.5; }
  return s;
}

void main(){
  vec3 p = normalize(vObjN);
  float lat = p.y;

  float warp = fbm(p * vec3(3.0, 7.0, 3.0) + vec3(0.0, uTime * 0.035, 0.0));
  float warp2 = fbm(p * vec3(6.3, 13.0, 6.3) + vec3(uTime * 0.02, 0.0, 0.0));
  float bands = sin(lat * 47.0 + warp * 4.2 + warp2 * 1.6);
  float belts = sin(lat * 13.0 + warp * 2.4);

  vec3 dark = vec3(0.085, 0.047, 0.032);
  vec3 mid  = vec3(0.340, 0.215, 0.132);
  vec3 light = vec3(0.700, 0.560, 0.408);
  float v = 0.5 + 0.5 * bands;
  v = mix(v, smoothstep(0.1, 0.9, 0.5 + 0.5 * belts), 0.45);
  vec3 col = mix(dark, mid, smoothstep(0.18, 0.72, v));
  col = mix(col, light, smoothstep(0.68, 0.97, v) * 0.62);
  col *= 0.74 + 0.40 * fbm(p * 22.0 + 3.4);
  col = mix(col, col * vec3(0.74, 0.78, 0.84), smoothstep(0.78, 1.0, abs(lat)) * 0.45);

  // Great Red Spot
  vec3 grs = normalize(vec3(0.58, -0.30, 0.76));
  vec3 gt1 = normalize(cross(grs, vec3(0.0, 1.0, 0.0)));
  vec3 gt2 = cross(grs, gt1);
  vec2 gp = vec2(dot(p, gt1) / 0.155, dot(p, gt2) / 0.072);
  float spot = 1.0 - smoothstep(0.62, 1.08, dot(gp, gp));
  col = mix(col, vec3(0.470, 0.180, 0.105), spot * 0.86);
  col = mix(col, vec3(0.700, 0.330, 0.180), spot * smoothstep(0.45, 0.95, fbm(p * 22.0)) * 0.5);

  vec3 N = normalize(vWorldN);
  float sunN = dot(N, uSunDir);
  float day = smoothstep(-0.12, 0.42, sunN) * uSunInt;
  float engN = max(dot(N, uEngineDir), 0.0);
  float engLit = pow(engN, 2.30) * uEngine;

  // ship shadow, an elongated patch inside the drive-lit crescent
  vec3 sd = normalize(uShadowDir);
  vec3 st1 = normalize(cross(sd, vec3(0.0, 1.0, 0.0)));
  vec3 st2 = cross(sd, st1);
  vec2 sp = vec2(dot(N, st1) / uShadowRadius.x, dot(N, st2) / uShadowRadius.y);
  float sh = (1.0 - smoothstep(0.30, 1.12, dot(sp, sp))) * uShadow;
  sh = mix(sh, 0.0, smoothstep(0.72, 1.0, 1.0 - engN) * 0.45);
  engLit *= 1.0 - sh;

  float night = 1.0 - day;

  // faint equatorial phosphorescence, patchy and far dimmer than the bands
  float phosTex = fbm(p * 11.0 + vec3(0.0, uTime * 0.05, 0.0));
  float phosBand = 0.20 + 0.80 * smoothstep(-0.2, 0.75, sin(lat * 42.0 + warp * 3.0));
  float phos = night * smoothstep(0.50, 0.82, phosTex) * phosBand;

  // ionised filaments, thin bright seams instead of broad clouds
  float stormMask = smoothstep(0.66, 0.92, fbm(p * 4.2 + vec3(uTime * 0.06, 0.0, 0.0)));
  float ridgeN = fbm(p * vec3(17.0, 36.0, 17.0) + vec3(0.0, uTime * 0.10, 0.0));
  float bolt = 1.0 - smoothstep(0.0, 0.020, abs(ridgeN - 0.555));
  bolt *= smoothstep(0.34, 0.74, fbm(p * 9.0 + vec3(uTime * 0.18, 0.0, 0.0)));
  float flash = uFlash * night * stormMask * bolt;

  vec3 colLit = col * (0.004 + day * 0.40 + engLit * 0.22);
  colLit += (col * 0.62 + vec3(0.05, 0.09, 0.16)) * engLit * 0.20;
  colLit += vec3(0.30, 0.55, 0.95) * pow(engN, 7.0) * uEngine * 0.07;
  // faint scattered light keeps the hull shadow readable instead of a black hole
  colLit += col * (0.020 + 0.030 * day) * sh;
  colLit += mix(col, vec3(0.22, 0.30, 0.34), 0.5) * night * 0.010;
  colLit += vec3(0.030, 0.200, 0.235) * phos * uGlow * 0.18;
  colLit += vec3(0.560, 0.800, 1.0) * flash * 0.85;
  colLit += vec3(0.120, 0.340, 0.460) * uFlash * stormMask * night * 0.06;
  colLit *= 1.0 - sh * 0.92;

  vec3 V = normalize(cameraPosition - vWorldPos);
  float rim = pow(clamp(1.0 - max(dot(N, V), 0.0), 0.0, 1.0), 3.4);
  colLit += mix(vec3(0.018, 0.090, 0.110), vec3(0.300, 0.190, 0.105), day) * rim * uGlow * 0.30;
  // the drive itself rims the limb it faces
  colLit += vec3(0.62, 0.82, 1.0) * rim * smoothstep(0.05, 0.85, engN) * uEngine * 0.45;

  gl_FragColor = vec4(colLit * uFade, 1.0);
}`;

const ATM_VS = JUP_VS;
const ATM_FS = `
precision highp float;
varying vec3 vObjN;
varying vec3 vWorldN;
varying vec3 vWorldPos;
uniform vec3 uSunDir;
uniform vec3 uEngineDir;
uniform float uEngine;
uniform float uGlow;
uniform float uFade;
uniform float uSunInt;
void main(){
  vec3 N = normalize(vWorldN);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float rim = pow(clamp(1.0 - abs(dot(N, V)), 0.0, 1.0), 3.1);
  float day = smoothstep(-0.22, 0.5, dot(N, uSunDir)) * uSunInt;
  float eng = smoothstep(0.18, 0.95, dot(N, uEngineDir)) * uEngine;
  vec3 col = mix(vec3(0.010, 0.055, 0.075), vec3(0.360, 0.215, 0.110), day);
  col += vec3(0.26, 0.48, 0.92) * eng * 1.05;
  float a = rim * (0.08 * uGlow + eng * 0.10) * uFade;
  gl_FragColor = vec4(col * rim * 0.70 * uGlow * uFade, a);
}`;

export function createJupiter(radius = 1000) {
  const group = new THREE.Group();
  group.name = 'jupiter';

  const uniforms = {
    uTime: { value: 0 },
    uSunDir: { value: new THREE.Vector3(1, 0.2, 0.3).normalize() },
    uEngineDir: { value: new THREE.Vector3(-1, 0, 0) },
    uEngine: { value: 0 },
    uShadow: { value: 0 },
    uShadowDir: { value: new THREE.Vector3(1, 0, 0) },
    uShadowRadius: { value: new THREE.Vector2(0.115, 0.055) },
    uFlash: { value: 0 },
    uGlow: { value: 1 },
    uFade: { value: 1 },
    uSunInt: { value: 0.16 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: JUP_VS,
    fragmentShader: JUP_FS,
    depthWrite: true,
  });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 64), mat);
  group.add(sphere);

  const atmU = {
    uSunDir: uniforms.uSunDir,
    uEngineDir: uniforms.uEngineDir,
    uEngine: uniforms.uEngine,
    uGlow: uniforms.uGlow,
    uFade: uniforms.uFade,
    uSunInt: uniforms.uSunInt,
  };
  const atmMat = new THREE.ShaderMaterial({
    uniforms: atmU,
    vertexShader: ATM_VS,
    fragmentShader: ATM_FS,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });
  const atm = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.018, 96, 64), atmMat);
  atm.renderOrder = 4;
  group.add(atm);

  return {
    group,
    radius,
    uniforms,
    setPosition(v) { group.position.copy(v); },
    setFade(v) {
      uniforms.uFade.value = clamp(v, 0, 1);
      group.visible = v > 0.005;
    },
    update(dt) {
      sphere.rotation.y += dt * 0.020;
      uniforms.uTime.value += dt;
    },
  };
}

// ---------------------------------------------------------------- moons
export function createMoon(radius, { color = 0xd9e4ef, emissive = 0x18222c, glow = 0.35 } = {}) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.82,
    metalness: 0.02,
    emissive,
    emissiveIntensity: 1.0,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), mat);
  group.add(mesh);
  const tex = makeGlowTexture(128);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, color, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, depthTest: true, opacity: glow,
  }));
  halo.scale.setScalar(radius * 4.2);
  halo.renderOrder = 5;
  group.add(halo);
  return {
    group,
    mesh,
    material: mat,
    halo,
    setOpacity(v) { halo.material.opacity = glow * v; },
  };
}

// ---------------------------------------------------------------- engine
function makeSunTexture(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const m = size / 2;
  const g = ctx.createRadialGradient(m, m, 0, m, m, m);
  g.addColorStop(0.0, 'rgba(255,255,255,1)');
  g.addColorStop(0.10, 'rgba(250,253,255,1)');
  g.addColorStop(0.22, 'rgba(214,235,255,0.86)');
  g.addColorStop(0.42, 'rgba(150,195,255,0.30)');
  g.addColorStop(0.70, 'rgba(80,140,235,0.05)');
  g.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // granulation, so the "little sun" is a surface rather than a gradient
  ctx.globalCompositeOperation = 'lighter';
  const rand = mulberry32(0x51f0a2);
  for (let i = 0; i < 900; i++) {
    const a = rand() * TAU;
    const r = Math.pow(rand(), 0.62) * m * 0.42;
    const rad = (0.4 + rand() * 1.5) * (m / 128);
    const x = m + Math.cos(a) * r;
    const y = m + Math.sin(a) * r;
    const gg = ctx.createRadialGradient(x, y, 0, x, y, rad * 3.4);
    const v = 0.10 + rand() * 0.32;
    gg.addColorStop(0, 'rgba(255,255,255,' + v.toFixed(3) + ')');
    gg.addColorStop(1, 'rgba(150,200,255,0)');
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(x, y, rad * 3.4, 0, TAU);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const PLUME_VS = `
varying vec2 vUv;
varying vec3 vN;
varying vec3 vV;
void main(){
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vV = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const PLUME_FS = `
precision highp float;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vV;
uniform float uTime;
uniform float uThrottle;

float hash31(vec3 p){
  p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.23));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise3(vec3 x){
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash31(i + vec3(0,0,0)), hash31(i + vec3(1,0,0)), f.x),
        mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
        mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}
float fbm(vec3 p){
  float s = 0.0, a = 0.5;
  for(int i = 0; i < 4; i++){ s += a * noise3(p); p = p * 2.07 + 3.1; a *= 0.5; }
  return s;
}

void main(){
  float t = clamp(vUv.y, 0.0, 1.0);
  float ang = vUv.x * 6.2831853;
  vec3 q = vec3(cos(ang) * 1.7, sin(ang) * 1.7, t * 7.0 - uTime * 2.2);
  float turb = fbm(q) * 0.7 + fbm(q * 2.3 + 4.0) * 0.3;

  float body = pow(1.0 - t, 1.35);
  float filaments = smoothstep(0.28, 0.78, turb);
  float shock = 0.55 + 0.45 * sin(t * 30.0 - uTime * 7.0);
  float a = body * (0.16 + 0.60 * filaments) * (0.72 + 0.28 * shock);
  a *= 0.22 + uThrottle * 0.95;

  vec3 hot = vec3(0.92, 0.97, 1.0);
  vec3 cool = vec3(0.24, 0.50, 1.0);
  vec3 col = mix(hot, cool, smoothstep(0.0, 0.62, t));
  col += vec3(0.35, 0.60, 1.0) * pow(filaments, 2.0) * 0.45;
  gl_FragColor = vec4(col * a, a * 0.9);
}`;

const SHOCK_FS = `
precision highp float;
varying vec2 vUv;
uniform float uAge;
void main(){
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float ring = smoothstep(0.02, 0.0, abs(r - 0.84)) * 1.0;
  float halo = smoothstep(0.92, 0.30, r) * 0.24;
  float a = (ring * 1.0 + halo) * uAge;
  vec3 col = mix(vec3(0.55, 0.75, 1.0), vec3(1.0), ring);
  gl_FragColor = vec4(col * a, a);
}`;

const SHOCK_VS = `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export function createEngineGlow() {
  const group = new THREE.Group();
  group.name = 'engine';

  const glowTex = makeGlowTexture(256);
  const flareTex = makeFlareTexture(256);
  const sunTex = makeSunTexture(512);

  const mk = (map, color, scale, opacity) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map, color, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: true, opacity,
    }));
    s.scale.setScalar(scale);
    s.renderOrder = 12;
    group.add(s);
    return s;
  };

  const wide = mk(glowTex, 0x3f7dff, 8, 0.05);
  const halo = mk(flareTex, 0x9dc9ff, 4.2, 0.28);
  const sun = mk(sunTex, 0xeaf4ff, 2.0, 0.9);
  const core = mk(glowTex, 0xffffff, 1.2, 0.45);

  // exhaust: a real volumetric-looking cone behind the nozzle
  const plumeGeo = new THREE.CylinderGeometry(1.15, 0.10, 11.0, 28, 30, true);
  plumeGeo.rotateZ(Math.PI / 2);
  const plumeMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uThrottle: { value: 0 },
    },
    vertexShader: PLUME_VS,
    fragmentShader: PLUME_FS,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const plume = new THREE.Mesh(plumeGeo, plumeMat);
  plume.position.x = -5.6;
  plume.renderOrder = 10;
  group.add(plume);

  // ignition shockwave, billboarded to the camera
  const shockMat = new THREE.ShaderMaterial({
    uniforms: { uAge: { value: 0 } },
    vertexShader: SHOCK_VS,
    fragmentShader: SHOCK_FS,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const shock = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shockMat);
  shock.scale.setScalar(4);
  shock.visible = false;
  shock.renderOrder = 11;
  group.add(shock);

  const light = new THREE.PointLight(0xbcdcff, 0, 0, 2);
  light.position.set(-1.6, 0.15, 0);
  group.add(light);
  let shockAge = 0;

  return {
    group,
    light,
    burst() { shockAge = 1; shock.visible = true; },
    update(camera, dt) {
      if (shockAge > 0) {
        shockAge = Math.max(0, shockAge - dt * 0.75);
        const k = 1 - shockAge;
        shock.scale.setScalar(3.5 + k * 34);
        shockMat.uniforms.uAge.value = shockAge * shockAge;
        shock.quaternion.copy(camera.quaternion);
        if (shockAge <= 0) shock.visible = false;
      }
      sun.material.rotation += dt * 0.05;
      halo.material.rotation -= dt * 0.03;
      plumeMat.uniforms.uTime.value += dt;
    },
    setThrottle(v, time) {
      const t = clamp(v, 0, 1);
      const pulse = 0.96 + 0.04 * Math.sin(time * 31.0) + 0.02 * Math.sin(time * 7.7);
      wide.material.opacity = (0.020 + t * 0.10) * pulse;
      halo.material.opacity = (0.07 + t * 0.44) * pulse;
      sun.material.opacity = 0.30 + t * 0.58;
      core.material.opacity = 0.16 + t * 0.20;
      sun.scale.setScalar(1.55 + t * 4.60);
      core.scale.setScalar(1.00 + t * 2.10);
      halo.scale.setScalar(3.20 + t * 6.20);
      wide.scale.setScalar(6.50 + t * 14.0);
      plumeMat.uniforms.uThrottle.value = t;
      plume.visible = t > 0.04;
      plume.scale.set(1, 0.65 + t * 0.75, 0.65 + t * 0.75);
      light.intensity = 5 + Math.pow(t, 1.7) * 120;
      light.distance = 0;
    },
  };
}

// ---------------------------------------------------------------- pursuit fleet
export function createFleetLights(count = 6) {
  const group = new THREE.Group();
  group.name = 'fleet';
  const tex = makeGlowTexture(128);
  const sprites = [];
  const rand = mulberry32(0xaa11cc);
  const base = new THREE.Vector3(0, 0, 0);
  for (let i = 0; i < count; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, color: 0xcfe4ff, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: true, opacity: 0,
    }));
    const a = i / count * TAU + 0.4;
    const r = 110 + rand() * 190;
    s.userData.base = new THREE.Vector3(
      Math.cos(a) * r + (rand() - 0.5) * 90,
      Math.sin(a) * r * 0.34 + (rand() - 0.5) * 70,
      Math.sin(a) * r * 0.55 + (rand() - 0.5) * 110
    );
    s.scale.setScalar(34 + rand() * 16);
    s.material.color.setHex(rand() < 0.6 ? 0xffe2b8 : 0xd8e8ff);
    s.position.copy(base).add(s.userData.base);
    s.renderOrder = 8;
    group.add(s);
    sprites.push(s);
  }
  return {
    group,
    setPosition(v) { base.copy(v); sprites.forEach(s => s.position.copy(v).add(s.userData.base)); },
    setOpacity(v, time) {
      group.visible = v > 0.005;
      sprites.forEach((s, i) => {
        s.material.opacity = v * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(time * 0.7 + i * 2.1)));
      });
    },
  };
}

// ---------------------------------------------------------------- port lights
const PORT_VS = `
attribute float aSize;
attribute vec3 aColor;
attribute float aPhase;
uniform float uDpr;
uniform float uTime;
varying vec3 vColor;
varying float vA;
void main(){
  vColor = aColor;
  vA = 0.62 + 0.38 * sin(uTime * 0.85 + aPhase);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uDpr * clamp(2600.0 / -mv.z, 0.55, 1.7);
}`;

const PORT_FS = `
precision highp float;
varying vec3 vColor;
varying float vA;
uniform float uOpacity;
void main(){
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p);
  if(d > 0.5) discard;
  float a = smoothstep(0.5, 0.10, d) * vA * uOpacity;
  gl_FragColor = vec4(vColor * vA, a);
}`;

export function createPortLights(count = 460, radius = 1000) {
  const rand = mulberry32(0x778899);
  const group = new THREE.Group();
  group.name = 'port';
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const col = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const bands = 9;
  for (let i = 0; i < count; i++) {
    const bi = i % bands;
    const latBase = -0.54 + (bi / (bands - 1)) * 1.06;
    const lat = clamp(latBase + Math.sin(bi * 1.7) * 0.05 + (rand() - 0.5) * 0.045, -0.62, 0.62);
    const lon = Math.PI - 1.08 + rand() * 2.16;
    const cl = Math.sqrt(1 - lat * lat);
    const r = radius * (1.004 + rand() * 0.005);
    pos[i * 3] = cl * Math.cos(lon) * r;
    pos[i * 3 + 1] = lat * r;
    pos[i * 3 + 2] = cl * Math.sin(lon) * r;
    const hub = rand() < 0.045;
    size[i] = (hub ? 5.2 : 2.5) + rand() * (hub ? 2.2 : 1.7);
    const warm = rand() < 0.78;
    const b = (hub ? 1.55 : 1.05) + rand() * 0.60;
    col[i * 3] = b * (warm ? 1.0 : 0.74);
    col[i * 3 + 1] = b * (warm ? 0.76 : 0.88);
    col[i * 3 + 2] = b * (warm ? 0.44 : 1.0);
    phase[i] = rand() * TAU;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uDpr: { value: 1 },
      uTime: { value: 0 },
      uOpacity: { value: 0 },
    },
    vertexShader: PORT_VS,
    fragmentShader: PORT_FS,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  group.add(points);
  return {
    group,
    points,
    setDpr(dpr) { mat.uniforms.uDpr.value = dpr; },
    setOpacity(v) {
      mat.uniforms.uOpacity.value = clamp(v, 0, 1);
      group.visible = v > 0.005;
    },
    update(dt) { mat.uniforms.uTime.value += dt; },
  };
}
