import * as THREE from 'three';
import { PARTS } from './model.js';

const DPR_MAX = 1.5;
const MAX_PIXELS = 6.2e6;
const AO_SCALE = 0.5;

const DEF = { yaw: 3.36, pitch: 0.36, dist: 28.0, target: [3.30, 0.18, 0] };
const FOCUS_DIST = { 0: 7.5, 1: 4.8, 2: 5.0, 3: 12.0, 4: 7.0, 5: 7.0, 6: 8.5, 7: 5.6, 8: 14.0, 9: 6.4, 10: 6.0, 11: 6.4, 12: 6.4, 13: 8.5, 14: 7.5 };
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;

const THEMES = {
  light: {
    dark: 0,
    bgTop: [0.935, 0.945, 0.95], bgBot: [0.795, 0.815, 0.832],
    glowCol: [0.105, 0.12, 0.135], vigCol: [0.60, 0.63, 0.66],
    vig: 0.34, exposure: 0.80, ao: 0.70, lift: 0.030, seam: 1.0, env: 0.95,
    accent: [0.10, 0.55, 0.70],
    key: [1.06, 1.02, 0.965], keyI: 3.0,
    fill: [0.245, 0.30, 0.38], fillI: 1.0,
    rim: [0.76, 0.82, 0.92], rimI: 1.5,
    hemiSky: [0.255, 0.276, 0.302], hemiGround: [0.038, 0.040, 0.046], hemiI: 0.65,
  },
  dark: {
    dark: 1,
    bgTop: [0.020, 0.028, 0.043], bgBot: [0.003, 0.005, 0.009],
    glowCol: [0.028, 0.048, 0.085], vigCol: [0, 0, 0],
    vig: 0.82, exposure: 1.0, ao: 0.95, lift: 0.02, seam: 0.9, env: 0.95,
    accent: [0.34, 0.85, 1.0],
    key: [0.60, 0.72, 0.92], keyI: 3.1,
    fill: [0.09, 0.16, 0.25], fillI: 1.1,
    rim: [0.46, 0.64, 0.95], rimI: 2.0,
    hemiSky: [0.048, 0.066, 0.095], hemiGround: [0.004, 0.005, 0.008], hemiI: 0.85,
  },
};

const POST_VS = `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const AO_FS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uDepth;
uniform mat4 uInvProj;
uniform vec2 uFull;
uniform float uProjY;
uniform float uRadius;

float hash12(vec2 p){
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}
vec3 vpos(vec2 uv){
  float d = texture2D(uDepth, uv).r;
  vec2 ndc = uv * 2.0 - 1.0;
  vec4 p = uInvProj * vec4(ndc, d * 2.0 - 1.0, 1.0);
  return p.xyz / p.w;
}
void main(){
  float d = texture2D(uDepth, vUv).r;
  if(d >= 0.99999){ gl_FragColor = vec4(1.0); return; }
  vec3 p = vpos(vUv);
  if(-p.z < 0.05){ gl_FragColor = vec4(1.0); return; }
  vec3 px = vpos(vUv + vec2(1.0 / uFull.x, 0.0));
  vec3 py = vpos(vUv + vec2(0.0, 1.0 / uFull.y));
  vec3 n = normalize(cross(px - p, py - p));
  if(dot(n, -p) < 0.0) n = -n;
  float rp = clamp(uRadius * uProjY / max(0.2, -p.z), 1.0, 26.0);
  float a0 = hash12(vUv * uFull) * 6.2831853;
  float occ = 0.0;
  for(int i = 0; i < 12; i++){
    float fi = float(i);
    float ang = a0 + fi * 2.39996323;
    float rr = sqrt((fi + 0.5) / 12.0);
    vec2 off = vec2(cos(ang), sin(ang)) * rr * rp / uFull;
    float d2 = texture2D(uDepth, vUv + off).r;
    if(d2 >= 0.99999) continue;
    vec3 q = vpos(vUv + off);
    vec3 dv = q - p;
    float dist = length(dv);
    if(dist < 0.0005 || dist > uRadius * 2.0) continue;
    float ndl = dot(dv / dist, n);
    if(ndl <= 0.03) continue;
    occ += ndl * (1.0 - dist / (uRadius * 2.0));
  }
  float ao = 1.0 - (occ / 12.0) * 5.2;
  ao = clamp(ao, 0.0, 1.0);
  gl_FragColor = vec4(ao, ao, ao, 1.0);
}`;

const BLUR_FS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uDir;
void main(){
  float w0 = 0.2270270, w1 = 0.1945946, w2 = 0.1216216, w3 = 0.0540541, w4 = 0.0162162;
  float s = texture2D(uTex, vUv).r * w0;
  s += texture2D(uTex, vUv + uDir * 1.0).r * w1;
  s += texture2D(uTex, vUv - uDir * 1.0).r * w1;
  s += texture2D(uTex, vUv + uDir * 2.0).r * w2;
  s += texture2D(uTex, vUv - uDir * 2.0).r * w2;
  s += texture2D(uTex, vUv + uDir * 3.0).r * w3;
  s += texture2D(uTex, vUv - uDir * 3.0).r * w3;
  s += texture2D(uTex, vUv + uDir * 4.0).r * w4;
  s += texture2D(uTex, vUv - uDir * 4.0).r * w4;
  gl_FragColor = vec4(s, s, s, 1.0);
}`;

const COMP_FS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uAO;
uniform vec2 uRes;
uniform float uAOStrength;
uniform vec3 uBgTop, uBgBot, uGlowCol, uVigCol;
uniform float uDark, uTime, uVig, uExposure, uLift;

float hash21(vec2 p){
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}
vec3 shade(vec2 uv){
  vec4 s = texture2D(uScene, uv);
  float ao = texture2D(uAO, uv).r;
  // PBR ship radiance is tone-mapped and encoded; the backdrop is authored
  // directly in display space (as in the original WebGL2 renderer).
  vec3 sc = s.rgb * mix(1.0, ao, uAOStrength) * uExposure + uLift;
  sc = sc / (sc + vec3(0.92)) * 1.62;
  sc = pow(max(sc, vec3(0.0)), vec3(0.4545));
  vec3 bg = mix(uBgBot, uBgTop, smoothstep(0.0, 1.0, uv.y));
  vec2 q = uv - vec2(0.52, 0.55);
  bg += uGlowCol * exp(-dot(q, q) * 3.2);
  bg += uGlowCol * exp(-dot(uv - vec2(0.5), uv - vec2(0.5)) * 0.9) * 0.5 * uDark;
  return mix(bg, sc, s.a);
}
vec3 fxaa(vec2 uv){
  vec3 rgbM = shade(uv);
  vec3 rgbNW = shade(uv + vec2(-1.0, -1.0) / uRes);
  vec3 rgbNE = shade(uv + vec2( 1.0, -1.0) / uRes);
  vec3 rgbSW = shade(uv + vec2(-1.0,  1.0) / uRes);
  vec3 rgbSE = shade(uv + vec2( 1.0,  1.0) / uRes);
  vec3 luma = vec3(0.299, 0.587, 0.114);
  float lumaM = dot(rgbM, luma);
  float lumaNW = dot(rgbNW, luma), lumaNE = dot(rgbNE, luma);
  float lumaSW = dot(rgbSW, luma), lumaSE = dot(rgbSE, luma);
  float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
  float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));
  if(lumaMax - lumaMin < max(0.0312, lumaMax * 0.125)) return rgbM;
  vec2 dir;
  dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
  dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));
  float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * 0.25 * 0.03125, 1.0 / 128.0);
  float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
  dir = clamp(dir * rcpDirMin, vec2(-8.0), vec2(8.0)) / uRes;
  vec3 rgbA = 0.5 * (shade(uv + dir * (1.0 / 3.0 - 0.5)) + shade(uv + dir * (2.0 / 3.0 - 0.5)));
  vec3 rgbB = rgbA * 0.5 + 0.25 * (shade(uv - dir * 0.5) + shade(uv + dir * 0.5));
  float lumaB = dot(rgbB, luma);
  return (lumaB < lumaMin || lumaB > lumaMax) ? rgbA : rgbB;
}
void main(){
  vec3 col = fxaa(vUv);
  vec2 sp = vUv * uRes / 1400.0;
  float st = hash21(floor(sp * 160.0));
  float star = smoothstep(0.9975, 1.0, st) * (0.35 + 0.65 * hash21(floor(sp * 160.0) + 3.1));
  col += vec3(0.7, 0.85, 1.0) * star * 0.9 * uDark;
  vec2 vq = vUv - 0.5;
  col *= 1.0 - uVig * dot(vq, vq) * 1.15;
  col = mix(col, uVigCol, smoothstep(0.35, 0.85, dot(vq, vq)) * 0.20);
  col += (hash21(vUv * uRes + fract(uTime)) - 0.5) * 0.012;
  gl_FragColor = vec4(col, 1.0);
}`;

export class ShipViewer {
  constructor(canvas, geometries, options = {}) {
    this.canvas = canvas;
    this.geometries = geometries;
    this.isNarrow = !!options.isNarrow;
    this.onFrame = null;
    this.onFirstFrame = null;
    this._firstFrame = true;
    this._dirty = true;
    this._raf = 0;
    this._lastNow = 0;
    this.frames = 0;
    this.time = 0;
    this.frameMs = 0;
    this.W = 1; this.H = 1; this.aw = 1; this.ah = 1;
    this.cssW = 1; this.cssH = 1; this.dpr = 1;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      depth: true,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.info.autoReset = false;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.08, 120);
    this.camera.up.set(0, 1, 0);

    // camera state (matches the WebGL2 version)
    this.yaw = DEF.yaw - 0.10;
    this.pitch = DEF.pitch - 0.04;
    this.dist = DEF.dist * (this.isNarrow ? 1.95 : 1.28);
    this.distGoal = DEF.dist * (this.isNarrow ? 1.72 : 1);
    this.target = new THREE.Vector3(...DEF.target);
    this.targetGoal = this.target.clone();
    this.camTarget = this.target.clone();
    this.vyaw = 0;
    this.vpitch = 0;
    this.auto = false;
    this.dragging = false;
    this.explode = 0;
    this.explodeTarget = 0;
    this.shiftX = this.isNarrow ? 0 : 0.06;
    this.shiftY = this.isNarrow ? 0.01 : 0.012;
    this.roll = this.isNarrow ? -1.30 : 0;
    this.aoRadius = 0.26;

    this.visible = PARTS.map(p => !p.hiddenByDefault);
    this.selected = -1;
    this.hovered = -1;

    this.themeName = 'light';
    this.cur = this._themeSnapshot(THEMES.light);
    this.themeTarget = THEMES.light;

    this.raycaster = new THREE.Raycaster();

    this._buildEnvironment();
    this._buildLights();
    this._buildShip();
    this._buildPost();
    this._applyTheme();
    this._syncExplode();
    this._updateCamera();
    this.invalidate();
  }

  // ---------------------------------------------------------------- setup
  _buildEnvironment() {
    const W = 256, H = 128;
    const data = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++) {
      const t = y / (H - 1); // row 0 = bottom of the equirect image
      const sky = 0.10 + 0.52 * Math.pow(t, 1.6);
      for (let x = 0; x < W; x++) {
        const u = x / (W - 1);
        let r = sky * 0.94, g = sky * 0.97, b = sky * 1.04;
        // two soft studio strip lights in the upper hemisphere
        for (const [band, width, gain, tint] of [[0.70, 0.030, 0.85, [1.0, 0.98, 0.94]], [0.54, 0.018, 0.45, [0.72, 0.86, 1.0]]]) {
          const d = Math.abs(t - band) / width;
          const bandMask = Math.exp(-d * d * 3.0) * (0.35 + 0.65 * Math.pow(Math.sin(u * Math.PI), 2.0));
          r += bandMask * gain * tint[0];
          g += bandMask * gain * tint[1];
          b += bandMask * gain * tint[2];
        }
        const o = (y * W + x) * 4;
        data[o] = Math.min(255, Math.round(r * 255));
        data[o + 1] = Math.min(255, Math.round(g * 255));
        data[o + 2] = Math.min(255, Math.round(b * 255));
        data[o + 3] = 255;
      }
    }
    const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    this.envRT = pmrem.fromEquirectangular(tex);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = 0.95;
    tex.dispose();
    pmrem.dispose();
  }

  _buildLights() {
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x111111, 0.65);
    this.scene.add(this.hemi);

    this.lightTarget = new THREE.Object3D();
    this.lightTarget.position.set(...DEF.target);
    this.scene.add(this.lightTarget);

    this.key = new THREE.DirectionalLight(0xffffff, 3.0);
    this.fill = new THREE.DirectionalLight(0xffffff, 1.0);
    this.rim = new THREE.DirectionalLight(0xffffff, 1.5);
    for (const [light, dir] of [
      [this.key, [0.42, 0.80, -0.44]],
      [this.fill, [-0.62, 0.20, -0.55]],
      [this.rim, [0.10, 0.32, 0.92]],
    ]) {
      light.target = this.lightTarget;
      light.position.set(...dir).normalize().multiplyScalar(12).add(this.lightTarget.position);
      this.scene.add(light);
    }
  }

  _makeMaterial() {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.55,
      metalness: 0.14,
      envMapIntensity: 1.0,
      side: THREE.DoubleSide,
    });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uSeam = { value: 1.0 };
      mat.userData.shader = shader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
        attribute vec3 aMisc;
        varying vec3 vMisc;
        varying vec3 vObjPos;`
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vMisc = aMisc;
        vObjPos = position;`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
        varying vec3 vMisc;
        varying vec3 vObjPos;
        uniform float uSeam;
        float nsHash21(vec2 p){
          p = fract(p * vec2(127.1, 311.7));
          p += dot(p, p + 34.23);
          return fract(p.x * p.y);
        }`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        // model.js colors are authored in sRGB; vertex-color attributes are
        // consumed as linear, so convert before any procedural tinting.
        diffuseColor.rgb = pow(diffuseColor.rgb, vec3(1.7));
        float nsSeam = 0.0;
        if(vMisc.z > 0.5){
          float ang = atan(vObjPos.z, vObjPos.y);
          float rr = max(length(vObjPos.yz), 0.25);
          float segA = 6.2831853 / 20.0;
          float ax = vObjPos.x / 0.36;
          float fA = abs(fract(ax + 0.5) - 0.5) * 0.36;
          float wA = max(fwidth(vObjPos.x) * 1.1, 0.006);
          float lA = 1.0 - smoothstep(0.004, 0.004 + wA, fA);
          float av = ang / segA;
          float fB = abs(fract(av + 0.5) - 0.5) * segA * rr;
          float wB = max(fwidth(ang) * rr * 1.1, 0.005);
          float lB = 1.0 - smoothstep(0.003, 0.003 + wB, fB);
          nsSeam = clamp(lA + lB * 0.85, 0.0, 1.0);
        }
        diffuseColor.rgb *= 1.0 - 0.38 * uSeam * nsSeam * vMisc.z;
        float nsGrain = nsHash21(floor(vObjPos.xz * 46.0) + floor(vObjPos.yy * 46.0));
        diffuseColor.rgb *= 0.99 + 0.02 * nsGrain;`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = clamp(vMisc.x, 0.05, 1.0);`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(0.35, 0.85, 1.0) * vMisc.y;`
      );
    };
    mat.customProgramCacheKey = () => 'ns-ship-v1';
    return mat;
  }

  _buildShip() {
    this.shipGroup = new THREE.Group();
    this.scene.add(this.shipGroup);
    this.materials = [];
    this.meshes = [];
    for (let i = 0; i < PARTS.length; i++) {
      const mat = this._makeMaterial();
      const mesh = new THREE.Mesh(this.geometries[i], mat);
      mesh.name = PARTS[i].name;
      mesh.userData.partIndex = i;
      mesh.visible = this.visible[i];
      mesh.frustumCulled = true;
      this.materials.push(mat);
      this.meshes.push(mesh);
      this.shipGroup.add(mesh);
    }
  }

  _buildPost() {
    const supportsHalf = this.renderer.extensions.has('EXT_color_buffer_float') || this.renderer.extensions.has('EXT_color_buffer_half_float');
    this.halfFloat = supportsHalf;

    this.sceneRT = new THREE.WebGLRenderTarget(1, 1, {
      type: supportsHalf ? THREE.HalfFloatType : THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
      samples: 0,
    });
    this.sceneRT.texture.colorSpace = THREE.LinearSRGBColorSpace;
    this.sceneRT.depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
    this.sceneRT.depthTexture.format = THREE.DepthFormat;

    const aoOpts = {
      format: THREE.RedFormat,
      type: THREE.UnsignedByteType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    };
    this.aoRT = new THREE.WebGLRenderTarget(1, 1, aoOpts);
    this.aoRT2 = new THREE.WebGLRenderTarget(1, 1, aoOpts);
    this.aoRT.texture.colorSpace = THREE.NoColorSpace;
    this.aoRT2.texture.colorSpace = THREE.NoColorSpace;

    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    this.postQuad.frustumCulled = false;
    this.postScene.add(this.postQuad);

    this.aoMat = new THREE.ShaderMaterial({
      uniforms: {
        uDepth: { value: this.sceneRT.depthTexture },
        uInvProj: { value: new THREE.Matrix4() },
        uFull: { value: new THREE.Vector2(1, 1) },
        uProjY: { value: 1 },
        uRadius: { value: this.aoRadius },
      },
      vertexShader: POST_VS,
      fragmentShader: AO_FS,
      depthTest: false,
      depthWrite: false,
    });

    this.blurMat = new THREE.ShaderMaterial({
      uniforms: {
        uTex: { value: null },
        uDir: { value: new THREE.Vector2() },
      },
      vertexShader: POST_VS,
      fragmentShader: BLUR_FS,
      depthTest: false,
      depthWrite: false,
    });

    this.compMat = new THREE.ShaderMaterial({
      uniforms: {
        uScene: { value: null },
        uAO: { value: null },
        uRes: { value: new THREE.Vector2(1, 1) },
        uAOStrength: { value: 0.85 },
        uBgTop: { value: new THREE.Color() },
        uBgBot: { value: new THREE.Color() },
        uGlowCol: { value: new THREE.Color() },
        uVigCol: { value: new THREE.Color() },
        uDark: { value: 0 },
        uTime: { value: 0 },
        uVig: { value: 0.34 },
        uExposure: { value: 0.8 },
        uLift: { value: 0.03 },
      },
      vertexShader: POST_VS,
      fragmentShader: COMP_FS,
      depthTest: false,
      depthWrite: false,
    });
  }

  // ---------------------------------------------------------------- sizing
  resize(cssW, cssH, devicePixelRatio) {
    let dpr = Math.min(devicePixelRatio || 1, DPR_MAX);
    let W = Math.max(1, Math.round(cssW * dpr));
    let H = Math.max(1, Math.round(cssH * dpr));
    if (W * H > MAX_PIXELS) {
      const k = Math.sqrt(MAX_PIXELS / (W * H));
      W = Math.max(1, Math.round(W * k));
      H = Math.max(1, Math.round(H * k));
      dpr = W / cssW;
    }
    if (W === this.W && H === this.H) {
      this.cssW = cssW;
      this.cssH = cssH;
      this.camera.aspect = cssW / cssH;
      this._updateCamera();
      this.invalidate();
      return;
    }
    this.cssW = cssW;
    this.cssH = cssH;
    this.dpr = dpr;
    this.W = W;
    this.H = H;
    this.aw = Math.max(1, Math.ceil(W * AO_SCALE));
    this.ah = Math.max(1, Math.ceil(H * AO_SCALE));

    this.renderer.setSize(W, H, false);
    this.sceneRT.setSize(W, H);
    this.aoRT.setSize(this.aw, this.ah);
    this.aoRT2.setSize(this.aw, this.ah);

    this.aoMat.uniforms.uFull.value.set(W, H);
    this.compMat.uniforms.uRes.value.set(W, H);

    this.camera.aspect = cssW / cssH;
    this._updateCamera();
    this.invalidate();
  }

  // ---------------------------------------------------------------- theme
  _themeSnapshot(t) {
    return {
      dark: t.dark,
      bgTop: t.bgTop.slice(), bgBot: t.bgBot.slice(),
      glowCol: t.glowCol.slice(), vigCol: t.vigCol.slice(),
      vig: t.vig, exposure: t.exposure, ao: t.ao, lift: t.lift, seam: t.seam, env: t.env,
      accent: t.accent.slice(),
      key: t.key.slice(), keyI: t.keyI,
      fill: t.fill.slice(), fillI: t.fillI,
      rim: t.rim.slice(), rimI: t.rimI,
      hemiSky: t.hemiSky.slice(), hemiGround: t.hemiGround.slice(), hemiI: t.hemiI,
    };
  }

  setTheme(name) {
    if (!THEMES[name] || name === this.themeName) return;
    this.themeName = name;
    this.themeTarget = THEMES[name];
    this.invalidate();
  }

  _lerpTheme(k) {
    const c = this.cur, t = this.themeTarget;
    let max = 0;
    const l3 = (a, b) => {
      for (let i = 0; i < 3; i++) {
        const d = b[i] - a[i];
        a[i] += d * k;
        max = Math.max(max, Math.abs(d));
      }
    };
    const l1 = (a, b) => {
      const d = b - a;
      max = Math.max(max, Math.abs(d));
      return a + d * k;
    };
    l3(c.bgTop, t.bgTop); l3(c.bgBot, t.bgBot);
    l3(c.glowCol, t.glowCol); l3(c.vigCol, t.vigCol);
    l3(c.accent, t.accent);
    l3(c.key, t.key); l3(c.fill, t.fill); l3(c.rim, t.rim);
    l3(c.hemiSky, t.hemiSky); l3(c.hemiGround, t.hemiGround);
    c.dark = l1(c.dark, t.dark);
    c.vig = l1(c.vig, t.vig);
    c.exposure = l1(c.exposure, t.exposure);
    c.ao = l1(c.ao, t.ao);
    c.lift = l1(c.lift, t.lift);
    c.seam = l1(c.seam, t.seam);
    c.env = l1(c.env, t.env);
    c.keyI = l1(c.keyI, t.keyI);
    c.fillI = l1(c.fillI, t.fillI);
    c.rimI = l1(c.rimI, t.rimI);
    c.hemiI = l1(c.hemiI, t.hemiI);
    return max > 0.001;
  }

  _applyTheme() {
    const c = this.cur;
    this.key.color.setRGB(c.key[0], c.key[1], c.key[2]);
    this.key.intensity = c.keyI;
    this.fill.color.setRGB(c.fill[0], c.fill[1], c.fill[2]);
    this.fill.intensity = c.fillI;
    this.rim.color.setRGB(c.rim[0], c.rim[1], c.rim[2]);
    this.rim.intensity = c.rimI;
    this.hemi.color.setRGB(c.hemiSky[0], c.hemiSky[1], c.hemiSky[2]);
    this.hemi.groundColor.setRGB(c.hemiGround[0], c.hemiGround[1], c.hemiGround[2]);
    this.hemi.intensity = c.hemiI;
    this.scene.environmentIntensity = c.env;

    const u = this.compMat.uniforms;
    u.uBgTop.value.setRGB(c.bgTop[0], c.bgTop[1], c.bgTop[2]);
    u.uBgBot.value.setRGB(c.bgBot[0], c.bgBot[1], c.bgBot[2]);
    u.uGlowCol.value.setRGB(c.glowCol[0], c.glowCol[1], c.glowCol[2]);
    u.uVigCol.value.setRGB(c.vigCol[0], c.vigCol[1], c.vigCol[2]);
    u.uDark.value = c.dark;
    u.uVig.value = c.vig;
    u.uExposure.value = c.exposure;
    u.uAOStrength.value = c.ao;
    u.uLift.value = c.lift;
    for (let i = 0; i < this.materials.length; i++) {
      const sh = this.materials[i].userData.shader;
      if (sh) sh.uniforms.uSeam.value = c.seam;
    }
    this._applyHighlights();
  }

  _applyHighlights() {
    const a = this.cur.accent;
    for (let i = 0; i < this.materials.length; i++) {
      const m = this.materials[i];
      m.emissive.setRGB(a[0], a[1], a[2]);
      m.emissiveIntensity = i === this.selected ? 0.20 : (i === this.hovered ? 0.07 : 0.0);
    }
  }

  // ---------------------------------------------------------------- camera
  _updateCamera() {
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const d = this.dist * (1 + 0.80 * this.explode);
    this.camTarget.set(this.target.x - 2.8 * this.explode, this.target.y + 0.1 * this.explode, this.target.z);
    this.camera.position.set(
      this.camTarget.x + d * cp * Math.sin(this.yaw),
      this.camTarget.y + d * sp,
      this.camTarget.z + d * cp * Math.cos(this.yaw)
    );
    this.camera.lookAt(this.camTarget);
    if (this.roll) this.camera.rotateZ(this.roll);
    this.camera.aspect = this.cssW / this.cssH;
    this.camera.updateProjectionMatrix();
    this.camera.projectionMatrix.elements[8] = -this.shiftX;
    this.camera.projectionMatrix.elements[9] = -this.shiftY;
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
    this.camera.updateMatrixWorld(true);
    this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();
  }

  orbit(dx, dy) {
    this.yaw -= dx * 0.0058;
    this.pitch = clamp(this.pitch + dy * 0.0058, -1.30, 1.30);
    this.vyaw = -dx * 0.0058 * 0.55;
    this.vpitch = dy * 0.0058 * 0.55;
    this.auto = false;
    this.invalidate();
  }

  setDragging(on) {
    this.dragging = !!on;
    if (this.dragging) { this.vyaw = 0; this.vpitch = 0; }
    this.invalidate();
  }

  zoomBy(factor) {
    this.distGoal = clamp(this.distGoal * factor, 4.2, 44);
    this.invalidate();
  }

  setAuto(on) {
    this.auto = !!on;
    this.invalidate();
  }

  focusPart(i) {
    const p = PARTS[i];
    const e = this.explode;
    this.targetGoal.set(p.anchor[0] + p.off[0] * e, p.anchor[1] + p.off[1] * e, p.anchor[2] + p.off[2] * e);
    this.distGoal = FOCUS_DIST[i] || 6;
    this.invalidate();
  }

  resetView() {
    this.targetGoal.set(...DEF.target);
    this.distGoal = DEF.dist;
    this.yaw = DEF.yaw;
    this.pitch = DEF.pitch;
    this.vyaw = 0;
    this.vpitch = 0;
    this.invalidate();
  }

  setView(yaw, pitch, dist, target) {
    if (yaw !== undefined) this.yaw = yaw;
    if (pitch !== undefined) this.pitch = pitch;
    if (dist !== undefined) { this.dist = dist; this.distGoal = dist; }
    if (target) { this.target.set(...target); this.targetGoal.set(...target); }
    this.invalidate();
  }

  setShift(x, y) {
    this.shiftX = x;
    if (y !== undefined) this.shiftY = y;
    this.invalidate();
  }

  setRoll(r) {
    this.roll = r;
    this.invalidate();
  }

  setNarrow(on) {
    this.isNarrow = !!on;
    this.roll = on ? -1.30 : 0;
    this.shiftX = on ? 0 : this.shiftX;
    this.shiftY = on ? 0.01 : 0.012;
    this.invalidate();
  }

  setExplodeTarget(v) {
    this.explodeTarget = clamp(v, 0, 1);
    this.invalidate();
  }

  setExplode(v, snap) {
    this.explodeTarget = clamp(v, 0, 1);
    if (snap) this.explode = this.explodeTarget;
    this._syncExplode();
    this.invalidate();
  }

  _syncExplode() {
    for (let i = 0; i < this.meshes.length; i++) {
      const o = PARTS[i].off;
      this.meshes[i].position.set(o[0] * this.explode, o[1] * this.explode, o[2] * this.explode);
    }
  }

  // ---------------------------------------------------------------- picking / projection
  pick(cssX, cssY) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return -1;
    const nx = ((cssX - rect.left) / rect.width) * 2 - 1;
    const ny = -((cssY - rect.top) / rect.height) * 2 + 1;
    this._updateCamera();
    this.scene.updateMatrixWorld(true);
    this.raycaster.setFromCamera({ x: nx, y: ny }, this.camera);

    const candidates = [];
    const hitPoint = new THREE.Vector3();
    for (let i = 0; i < this.meshes.length; i++) {
      const mesh = this.meshes[i];
      if (!mesh.visible) continue;
      const box = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
      if (this.raycaster.ray.intersectBox(box, hitPoint)) {
        candidates.push({ i, d: hitPoint.distanceToSquared(this.raycaster.ray.origin) });
      }
    }
    if (!candidates.length) return -1;
    candidates.sort((a, b) => a.d - b.d);
    for (const c of candidates) {
      const hit = this.raycaster.intersectObject(this.meshes[c.i], false);
      if (hit.length) return c.i;
    }
    return candidates[0].i;
  }

  projectWorld(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    if (v.z < -1 || v.z > 1) return null;
    return [(v.x * 0.5 + 0.5) * this.cssW, (-v.y * 0.5 + 0.5) * this.cssH, v.z];
  }

  projectAnchor(i, explode = this.explode) {
    const p = PARTS[i];
    return this.projectWorld(p.anchor[0] + p.off[0] * explode, p.anchor[1] + p.off[1] * explode, p.anchor[2] + p.off[2] * explode);
  }

  // ---------------------------------------------------------------- state
  setVisible(i, on) {
    this.visible[i] = !!on;
    this.meshes[i].visible = !!on;
    if (!on && this.hovered === i) this.hovered = -1;
    this.invalidate();
  }

  select(i) {
    this.selected = i;
    this._applyHighlights();
    this.invalidate();
  }

  hover(i) {
    if (this.hovered === i) return;
    this.hovered = i;
    this._applyHighlights();
    this.invalidate();
  }

  // ---------------------------------------------------------------- loop
  invalidate() {
    this._dirty = true;
    this._schedule();
  }

  _schedule() {
    if (!this._raf) this._raf = requestAnimationFrame(this._tick);
  }

  _tick = (now) => {
    this._raf = 0;
    const dt = this._lastNow ? Math.min(0.05, (now - this._lastNow) / 1000) : 1 / 60;
    this._lastNow = now;
    this.time += dt;

    const active = this._update(dt);
    if (this._dirty || active) {
      this._render();
      this._dirty = false;
      this.frames++;
      if (this._firstFrame) {
        this._firstFrame = false;
        if (this.onFirstFrame) this.onFirstFrame();
      }
      if (this.onFrame) this.onFrame();
    }
    if (active || this._dirty) {
      this._schedule();
    } else {
      this._lastNow = 0;
    }
  };

  _update(dt) {
    let active = false;

    const kt = 1 - Math.exp(-dt * 7);
    if (this._lerpTheme(kt)) active = true;

    if (Math.abs(this.explodeTarget - this.explode) > 1e-5) {
      this.explode += (this.explodeTarget - this.explode) * (1 - Math.exp(-dt * 7.5));
      if (Math.abs(this.explodeTarget - this.explode) < 1e-5) this.explode = this.explodeTarget;
      this._syncExplode();
      active = true;
    } else if (this.explode !== this.explodeTarget) {
      this.explode = this.explodeTarget;
      this._syncExplode();
      active = true;
    }

    if (!this.dragging) {
      if (this.auto) { this.yaw += dt * 0.11; active = true; }
      if (this.vyaw || this.vpitch) {
        this.yaw += this.vyaw;
        this.pitch = clamp(this.pitch + this.vpitch, -1.30, 1.30);
        const damp = Math.pow(0.02, dt);
        this.vyaw *= damp;
        this.vpitch *= damp;
        if (Math.abs(this.vyaw) < 1e-5) this.vyaw = 0;
        if (Math.abs(this.vpitch) < 1e-5) this.vpitch = 0;
        active = true;
      }
    }

    if (Math.abs(this.distGoal - this.dist) > 1e-4) {
      this.dist += (this.distGoal - this.dist) * (1 - Math.exp(-dt * 7));
      if (Math.abs(this.distGoal - this.dist) < 1e-4) this.dist = this.distGoal;
      active = true;
    }
    if (this.target.distanceToSquared(this.targetGoal) > 1e-7) {
      this.target.lerp(this.targetGoal, 1 - Math.exp(-dt * 5.5));
      if (this.target.distanceToSquared(this.targetGoal) < 1e-7) this.target.copy(this.targetGoal);
      active = true;
    }

    this._updateCamera();
    this._applyTheme();
    return active;
  }

  _pass(material, target) {
    this.postQuad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.postScene, this.postCamera);
  }

  _render() {
    const t0 = performance.now();
    const r = this.renderer;
    r.info.reset();

    // scene -> HDR target (depth stays available for SSAO)
    r.setRenderTarget(this.sceneRT);
    r.render(this.scene, this.camera);

    // half-res depth-based SSAO
    const aoU = this.aoMat.uniforms;
    aoU.uDepth.value = this.sceneRT.depthTexture;
    aoU.uInvProj.value.copy(this.camera.projectionMatrixInverse);
    aoU.uFull.value.set(this.W, this.H);
    aoU.uProjY.value = this.camera.projectionMatrix.elements[5] * this.H * 0.5;
    aoU.uRadius.value = this.aoRadius;
    this._pass(this.aoMat, this.aoRT);

    // separable blur at half res
    const bU = this.blurMat.uniforms;
    bU.uTex.value = this.aoRT.texture;
    bU.uDir.value.set(1 / this.aw, 0);
    this._pass(this.blurMat, this.aoRT2);
    bU.uTex.value = this.aoRT2.texture;
    bU.uDir.value.set(0, 1 / this.ah);
    this._pass(this.blurMat, this.aoRT);

    // composite + FXAA to the canvas
    const cU = this.compMat.uniforms;
    cU.uScene.value = this.sceneRT.texture;
    cU.uAO.value = this.aoRT.texture;
    cU.uRes.value.set(this.W, this.H);
    cU.uTime.value = this.time;
    this._pass(this.compMat, null);

    this.frameMs = performance.now() - t0;
  }

  // ---------------------------------------------------------------- stats
  getStats() {
    const info = this.renderer.info;
    const rtBytes = this.W * this.H * (this.halfFloat ? 8 : 4) + this.W * this.H * 4 + this.aw * this.ah * 2;
    return {
      calls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      frames: this.frames,
      frameMs: +this.frameMs.toFixed(2),
      renderSize: [this.W, this.H],
      aoSize: [this.aw, this.ah],
      cssSize: [this.cssW, this.cssH],
      dpr: +this.dpr.toFixed(3),
      halfFloat: this.halfFloat,
      drawCallsExpected: this.meshes.filter(m => m.visible).length + 4,
      rtBytes,
      rtMB: +(rtBytes / 1048576).toFixed(1),
    };
  }
}
