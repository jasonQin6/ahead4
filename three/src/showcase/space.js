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

void main(){
  vec3 d = normalize(vDir);
  float bank = dot(d, uBandNormal);
  float band = exp(-bank * bank / 0.011);
  float wide = exp(-bank * bank / 0.070);

  float cloud = fbm(d * 3.4 + 4.0);
  float fine = fbm(d * 11.0 + 1.7);
  float lanes = smoothstep(0.46, 0.70, fbm(d * 7.3 + 9.1));

  vec3 col = vec3(0.0006, 0.0008, 0.0016);
  vec3 cool = vec3(0.060, 0.094, 0.158);
  vec3 warm = vec3(0.120, 0.102, 0.080);
  float tex = 0.28 + 0.92 * cloud + 0.38 * fine;
  col += mix(cool, warm, smoothstep(0.34, 0.82, cloud)) * tex * (band * 0.60 + wide * 0.034) * uBand;
  col *= 1.0 - lanes * band * 0.55;

  // a very faint cold halo along the band, still far below star brightness
  col += vec3(0.007, 0.013, 0.026) * wide * uBand * 0.45;
  gl_FragColor = vec4(col, 1.0);
}`;

export function createBackground() {
  const geo = new THREE.SphereGeometry(14000, 48, 28);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uBandNormal: { value: new THREE.Vector3(0.744, 0.600, -0.280).normalize() },
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
    const R = 8200;
    pos[i * 3] = r * Math.cos(th) * R;
    pos[i * 3 + 1] = u * R;
    pos[i * 3 + 2] = r * Math.sin(th) * R;

    // magnitude distribution: many faint, a handful bright
    const m = Math.pow(rand(), 3.2);
    size[i] = 0.72 + m * 2.9;
    const temp = rand();
    if (temp < 0.14) tmp.setRGB(1.0, 0.86, 0.70);
    else if (temp < 0.36) tmp.setRGB(1.0, 0.96, 0.90);
    else if (temp < 0.78) tmp.setRGB(0.86, 0.93, 1.0);
    else tmp.setRGB(0.72, 0.84, 1.0);
    const b = 0.52 + m * 1.25 + rand() * 0.20;
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
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  group.add(points);

  // dense star dust hugging the Milky Way plane
  const bpos = new Float32Array(bandCount * 3);
  const bsize = new Float32Array(bandCount);
  const bcol = new Float32Array(bandCount * 3);
  const bn = new THREE.Vector3(0.744, 0.600, -0.280).normalize();
  const e1 = new THREE.Vector3(0, 0, 1).cross(bn).normalize();
  const e2 = new THREE.Vector3().crossVectors(bn, e1).normalize();
  for (let i = 0; i < bandCount; i++) {
    const th = rand() * TAU;
    const g = (rand() + rand() + rand() + rand() - 2) * 0.070;
    const dir = new THREE.Vector3()
      .addScaledVector(e1, Math.cos(th))
      .addScaledVector(e2, Math.sin(th))
      .addScaledVector(bn, g)
      .normalize();
    const R = 8000 + rand() * 500;
    bpos[i * 3] = dir.x * R;
    bpos[i * 3 + 1] = dir.y * R;
    bpos[i * 3 + 2] = dir.z * R;
    bsize[i] = 0.55 + Math.pow(rand(), 2.4) * 1.45;
    const b = 0.34 + rand() * 0.56;
    const warm = rand();
    bcol[i * 3] = b * (warm < 0.3 ? 1.0 : 0.82);
    bcol[i * 3 + 1] = b * (warm < 0.3 ? 0.88 : 0.90);
    bcol[i * 3 + 2] = b * (warm < 0.3 ? 0.72 : 1.0);
  }
  geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(bpos, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(bsize, 1));
  geo.setAttribute('aColor', new THREE.BufferAttribute(bcol, 3));
  const bandPoints = new THREE.Points(geo, mat);
  bandPoints.frustumCulled = false;
  bandPoints.renderOrder = -79;
  group.add(bandPoints);

  return {
    group,
    setDpr(dpr) { mat.uniforms.uDpr.value = dpr; },
    update(dt, speed) { group.rotation.y += dt * speed; },
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

  vec3 dark = vec3(0.105, 0.062, 0.043);
  vec3 mid  = vec3(0.420, 0.280, 0.172);
  vec3 light = vec3(0.820, 0.690, 0.520);
  float v = 0.5 + 0.5 * bands;
  v = mix(v, smoothstep(0.1, 0.9, 0.5 + 0.5 * belts), 0.45);
  vec3 col = mix(dark, mid, smoothstep(0.18, 0.72, v));
  col = mix(col, light, smoothstep(0.66, 0.96, v) * 0.70);
  col *= 0.80 + 0.34 * fbm(p * 18.0 + 3.4);
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
  float day = smoothstep(-0.16, 0.34, sunN);
  float engN = max(dot(N, uEngineDir), 0.0);
  float engLit = pow(engN, 2.60) * uEngine;

  // ship shadow, an elongated patch inside the drive-lit crescent
  vec3 sd = normalize(uShadowDir);
  vec3 st1 = normalize(cross(sd, vec3(0.0, 1.0, 0.0)));
  vec3 st2 = cross(sd, st1);
  vec2 sp = vec2(dot(N, st1) / uShadowRadius.x, dot(N, st2) / uShadowRadius.y);
  float sh = (1.0 - smoothstep(0.34, 1.05, dot(sp, sp))) * uShadow;
  sh = mix(sh, 0.0, smoothstep(0.72, 1.0, 1.0 - engN) * 0.55);
  engLit *= 1.0 - sh;

  float night = 1.0 - day;

  // faint equatorial phosphorescence, patchy and far dimmer than the bands
  float phosTex = fbm(p * 11.0 + vec3(0.0, uTime * 0.05, 0.0));
  float phosBand = 0.20 + 0.80 * smoothstep(-0.2, 0.75, sin(lat * 42.0 + warp * 3.0));
  float phos = night * smoothstep(0.50, 0.82, phosTex) * phosBand;

  // ionised filaments, thin bright seams instead of broad clouds
  float stormMask = smoothstep(0.55, 0.86, fbm(p * 4.2 + vec3(uTime * 0.06, 0.0, 0.0)));
  float ridge = fbm(p * vec3(17.0, 36.0, 17.0) + vec3(0.0, uTime * 0.10, 0.0));
  float bolt = 1.0 - smoothstep(0.0, 0.040, abs(ridge - 0.555));
  bolt *= smoothstep(0.30, 0.72, fbm(p * 9.0 + vec3(uTime * 0.18, 0.0, 0.0)));
  float flash = uFlash * night * stormMask * bolt;

  vec3 colLit = col * (0.030 + day * 0.74 + engLit * 0.30);
  colLit += (col * 0.50 + vec3(0.18, 0.26, 0.36)) * engLit * 0.55;
  colLit += mix(col, vec3(0.22, 0.30, 0.34), 0.5) * night * 0.030;
  colLit += vec3(0.035, 0.230, 0.260) * phos * uGlow * 0.22;
  colLit += vec3(0.560, 0.800, 1.0) * flash * 1.10;
  colLit += vec3(0.120, 0.340, 0.460) * uFlash * stormMask * night * 0.10;
  colLit *= 1.0 - sh * 0.92;

  vec3 V = normalize(cameraPosition - vWorldPos);
  float rim = pow(clamp(1.0 - max(dot(N, V), 0.0), 0.0, 1.0), 3.4);
  colLit += mix(vec3(0.018, 0.090, 0.110), vec3(0.300, 0.190, 0.105), day) * rim * uGlow * 0.55;

  gl_FragColor = vec4(colLit * uFade, 1.0);
}`;

const ATM_VS = JUP_VS;
const ATM_FS = `
precision highp float;
varying vec3 vObjN;
varying vec3 vWorldN;
varying vec3 vWorldPos;
uniform vec3 uSunDir;
uniform float uGlow;
uniform float uFade;
void main(){
  vec3 N = normalize(vWorldN);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float rim = pow(clamp(1.0 - abs(dot(N, V)), 0.0, 1.0), 3.1);
  float day = smoothstep(-0.22, 0.5, dot(N, uSunDir));
  vec3 col = mix(vec3(0.014, 0.105, 0.130), vec3(0.430, 0.255, 0.130), day);
  float a = rim * 0.30 * uGlow * uFade;
  gl_FragColor = vec4(col * rim * 1.10 * uGlow * uFade, a);
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
    uGlow: uniforms.uGlow,
    uFade: uniforms.uFade,
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
export function createEngineGlow() {
  const group = new THREE.Group();
  group.name = 'engine';
  const glowTex = makeGlowTexture(256);

  const mk = (color, scale, opacity) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: true, opacity,
    }));
    s.scale.setScalar(scale);
    s.renderOrder = 12;
    group.add(s);
    return s;
  };

  const wide = mk(0x5f9cff, 6, 0.06);
  const halo = mk(0x9dc9ff, 3.4, 0.30);
  const core = mk(0xffffff, 1.2, 0.55);

  const light = new THREE.PointLight(0xbcdcff, 0, 0, 2);
  light.position.set(-1.6, 0.15, 0);
  group.add(light);

  return {
    group,
    light,
    setThrottle(v, time) {
      const t = clamp(v, 0, 1);
      const pulse = 0.96 + 0.04 * Math.sin(time * 31.0) + 0.02 * Math.sin(time * 7.7);
      wide.material.opacity = (0.020 + t * 0.10) * pulse;
      halo.material.opacity = (0.07 + t * 0.40) * pulse;
      core.material.opacity = 0.26 + t * 0.70;
      core.scale.setScalar(0.85 + t * 1.55);
      halo.scale.setScalar(2.8 + t * 4.4);
      wide.scale.setScalar(5.0 + t * 10.5);
      light.intensity = 5 + Math.pow(t, 1.7) * 88;
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
