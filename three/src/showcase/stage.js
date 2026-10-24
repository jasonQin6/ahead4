import * as THREE from 'three';
import { createShip, buildEnvironment } from './ship.js';
import {
  createBackground, createStarfield, createSun, createJupiter,
  createMoon, createFleetLights, createPortLights,
} from './space.js';

const POST_VS = `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const BRIGHT_FS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uThreshold;
uniform float uKnee;
void main(){
  vec3 c = vec3(0.0);
  c += texture2D(uTex, vUv + uTexel * vec2(-0.5, -0.5)).rgb;
  c += texture2D(uTex, vUv + uTexel * vec2( 0.5, -0.5)).rgb;
  c += texture2D(uTex, vUv + uTexel * vec2(-0.5,  0.5)).rgb;
  c += texture2D(uTex, vUv + uTexel * vec2( 0.5,  0.5)).rgb;
  c *= 0.25;
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - uThreshold + uKnee, 0.0, 2.0 * uKnee);
  soft = soft * soft / (4.0 * uKnee + 0.0001);
  float contrib = max(soft, br - uThreshold) / max(br, 0.0001);
  gl_FragColor = vec4(c * contrib, 1.0);
}`;

const BLUR_FS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uDir;
void main(){
  float w0 = 0.2270270, w1 = 0.1945946, w2 = 0.1216216, w3 = 0.0540541, w4 = 0.0162162;
  vec3 s = texture2D(uTex, vUv).rgb * w0;
  s += texture2D(uTex, vUv + uDir * 1.0).rgb * w1;
  s += texture2D(uTex, vUv - uDir * 1.0).rgb * w1;
  s += texture2D(uTex, vUv + uDir * 2.0).rgb * w2;
  s += texture2D(uTex, vUv - uDir * 2.0).rgb * w2;
  s += texture2D(uTex, vUv + uDir * 3.0).rgb * w3;
  s += texture2D(uTex, vUv - uDir * 3.0).rgb * w3;
  s += texture2D(uTex, vUv + uDir * 4.0).rgb * w4;
  s += texture2D(uTex, vUv - uDir * 4.0).rgb * w4;
  gl_FragColor = vec4(s, 1.0);
}`;

const COMP_FS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uBloom0;
uniform sampler2D uBloom1;
uniform sampler2D uBloom2;
uniform sampler2D uStreak;
uniform vec2 uRes;
uniform float uTime;
uniform float uBloomStrength;
uniform float uExposure;
uniform float uFlash;
uniform float uVig;
uniform float uGrain;

float hash21(vec2 p){
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}
vec3 aces(vec3 c){
  return clamp((c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14), 0.0, 1.0);
}
void main(){
  vec2 uv = vUv;
  vec2 q = uv - 0.5;
  float ca = 0.0012 * dot(q, q);
  vec3 sc;
  sc.r = texture2D(uScene, uv + q * ca).r;
  sc.g = texture2D(uScene, uv).g;
  sc.b = texture2D(uScene, uv - q * ca).b;

  vec3 bl = texture2D(uBloom0, uv).rgb * 0.62
          + texture2D(uBloom1, uv).rgb * 0.44
          + texture2D(uBloom2, uv).rgb * 0.34;
  vec3 col = sc + bl * uBloomStrength;
  col += texture2D(uStreak, uv).rgb * vec3(0.30, 0.48, 0.85) * uBloomStrength * 0.85;
  col += vec3(0.62, 0.78, 1.0) * uFlash * 1.15;

  col = aces(col * uExposure);
  col = pow(col, vec3(0.4545));

  // deep-space colour grade: cool shadows, restrained warm highlights
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, col * vec3(0.84, 0.92, 1.06), (1.0 - l) * 0.55);
  col = mix(col, col * vec3(1.03, 1.0, 0.96), smoothstep(0.55, 1.0, l) * 0.35);
  col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, 1.06);

  // gentle filmic S-curve: deeper space, crisper speculars
  col = mix(col, smoothstep(0.0, 1.0, col), 0.16);

  col *= 1.0 - uVig * dot(q, q) * 1.35;
  col = mix(col, vec3(0.0), smoothstep(0.42, 0.95, dot(q, q)) * 0.30);

  float g = hash21(uv * uRes + fract(uTime) * 37.0) - 0.5;
  col += g * uGrain;
  col += (hash21(uv * uRes + 11.3) - 0.5) / 255.0;
  gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
}`;

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

export class Stage {
  constructor(canvas, geometries, options = {}) {
    this.canvas = canvas;
    this.mobile = !!options.mobile;
    this.reduceMotion = !!options.reduceMotion;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      stencil: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.info.autoReset = false;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.2, 30000);
    this.camera.up.set(0, 1, 0);

    this.envRT = buildEnvironment(this.renderer);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = 0.62;

    this.bg = createBackground();
    this.scene.add(this.bg);

    this.stars = createStarfield({
      count: this.mobile ? 9000 : 20000,
      bandCount: this.mobile ? 22000 : 62000,
    });
    this.scene.add(this.stars.group);

    this.sun = createSun();
    this.scene.add(this.sun.group);

    this.ship = createShip(geometries);
    this.scene.add(this.ship.group);
    this.engine = this.ship.engine;

    this.jupiter = createJupiter(1000);
    this.scene.add(this.jupiter.group);

    this.port = createPortLights(460);
    this.jupiter.group.add(this.port.group);

    this.europa = createMoon(54, { color: 0xc9d3dc, emissive: 0x121a22, glow: 0.28 });
    this.scene.add(this.europa.group);
    this.io = createMoon(40, { color: 0xc0a374, emissive: 0x3d2a12, glow: 0.16 });
    this.scene.add(this.io.group);

    this.fleet = createFleetLights(6);
    this.scene.add(this.fleet.group);

    this._buildLights();
    this._buildPost();
  }

  _buildLights() {
    this.sunDir = new THREE.Vector3(-0.55, 0.10, -0.82).normalize();

    this.hemi = new THREE.HemisphereLight(0x0a1828, 0x000000, 0.48);
    this.scene.add(this.hemi);

    this.lightTarget = new THREE.Object3D();
    this.scene.add(this.lightTarget);

    this.sunLight = new THREE.DirectionalLight(0xfff0d8, 0.85);
    this.sunLight.position.copy(this.sunDir).multiplyScalar(100);
    this.sunLight.target = this.lightTarget;
    this.scene.add(this.sunLight);

    this.rimLight = new THREE.DirectionalLight(0x4f7dbb, 0.85);
    this.rimLight.position.set(0.35, -0.55, 0.76).normalize().multiplyScalar(100);
    this.rimLight.target = this.lightTarget;
    this.scene.add(this.rimLight);

    this.cameraFill = new THREE.DirectionalLight(0x8fb6dd, 0.42);
    this.cameraFill.target = this.lightTarget;
    this.scene.add(this.cameraFill);

    this.moonLight = new THREE.DirectionalLight(0xbfe0ff, 0.0);
    this.moonLight.target = this.lightTarget;
    this.scene.add(this.moonLight);
  }

  _buildPost() {
    const half = this.renderer.extensions.has('EXT_color_buffer_float') ||
      this.renderer.extensions.has('EXT_color_buffer_half_float');
    this.halfFloat = half;

    const sceneOpts = {
      type: half ? THREE.HalfFloatType : THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
      samples: this.mobile ? 0 : 4,
    };
    this.sceneRT = new THREE.WebGLRenderTarget(1, 1, sceneOpts);
    this.sceneRT.texture.colorSpace = THREE.NoColorSpace;

    const bloomOpts = {
      type: half ? THREE.HalfFloatType : THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    };
    const mkBloomRT = () => {
      const rt = new THREE.WebGLRenderTarget(1, 1, bloomOpts);
      rt.texture.colorSpace = THREE.NoColorSpace;
      return rt;
    };
    this.bloomLevels = [0, 1, 2].map(() => ({ a: mkBloomRT(), b: mkBloomRT() }));
    this.streak = { a: mkBloomRT(), b: mkBloomRT() };

    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    this.postQuad.frustumCulled = false;
    this.postScene.add(this.postQuad);

    this.brightMat = new THREE.ShaderMaterial({
      uniforms: {
        uTex: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uThreshold: { value: 0.92 },
        uKnee: { value: 0.40 },
      },
      vertexShader: POST_VS,
      fragmentShader: BRIGHT_FS,
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
        uBloom0: { value: null },
        uBloom1: { value: null },
        uBloom2: { value: null },
        uStreak: { value: null },
        uRes: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uBloomStrength: { value: 0.7 },
        uExposure: { value: 1.0 },
        uFlash: { value: 0 },
        uVig: { value: 0.42 },
        uGrain: { value: 0.010 },
      },
      vertexShader: POST_VS,
      fragmentShader: COMP_FS,
      depthTest: false,
      depthWrite: false,
    });
  }

  _pass(material, target) {
    this.postQuad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.postScene, this.postCamera);
  }

  resize(cssW, cssH, dpr) {
    const maxDpr = this.mobile ? 1.35 : 1.75;
    let ratio = Math.min(dpr || 1, maxDpr);
    let W = Math.max(1, Math.round(cssW * ratio));
    let H = Math.max(1, Math.round(cssH * ratio));
    const maxPixels = this.mobile ? 2.3e6 : 4.6e6;
    if (W * H > maxPixels) {
      const k = Math.sqrt(maxPixels / (W * H));
      W = Math.max(1, Math.round(W * k));
      H = Math.max(1, Math.round(H * k));
      ratio = W / cssW;
    }
    this.cssW = cssW;
    this.cssH = cssH;
    this.dpr = ratio;
    this.W = W;
    this.H = H;
    this.bw = Math.max(1, Math.round(W * 0.5));
    this.bh = Math.max(1, Math.round(H * 0.5));
    this.bloomSizes = [0.5, 0.25, 0.125].map((s) => [
      Math.max(1, Math.round(W * s)),
      Math.max(1, Math.round(H * s)),
    ]);
    this.streakSize = this.bloomSizes[1];

    this.renderer.setSize(W, H, false);
    this.sceneRT.setSize(W, H);
    this.bloomLevels.forEach((lv, i) => {
      lv.a.setSize(this.bloomSizes[i][0], this.bloomSizes[i][1]);
      lv.b.setSize(this.bloomSizes[i][0], this.bloomSizes[i][1]);
    });
    this.streak.a.setSize(this.streakSize[0], this.streakSize[1]);
    this.streak.b.setSize(this.streakSize[0], this.streakSize[1]);
    this.camera.aspect = cssW / cssH;
    this.camera.updateProjectionMatrix();
    this.stars.setDpr(ratio);
    this.port.setDpr(ratio);
    this.compMat.uniforms.uRes.value.set(W, H);
    this.brightMat.uniforms.uTexel.value.set(1 / W, 1 / H);
  }

  render(state = {}) {
    const r = this.renderer;
    r.info.reset();

    // keep the faint camera-side fill from ever becoming a studio key light
    this.cameraFill.position.copy(this.camera.position);
    this.lightTarget.position.set(0, 0.2, 0);
    this.moonLight.position.copy(this.jupiter.group.position).lerp(this.camera.position, 0.55);
    this.engine.update(this.camera, state.dt || 0.016);

    r.setRenderTarget(this.sceneRT);
    r.render(this.scene, this.camera);

    this.brightMat.uniforms.uTex.value = this.sceneRT.texture;
    this._pass(this.brightMat, this.bloomLevels[0].a);

    // progressively wider blur pyramids give a soft, film-like halo
    const b = this.blurMat.uniforms;
    for (let i = 0; i < this.bloomLevels.length; i++) {
      const lv = this.bloomLevels[i];
      const src = i === 0 ? lv.a : this.bloomLevels[i - 1].a;
      const sw = i === 0 ? this.W : this.bloomSizes[i - 1][0];
      const sh = i === 0 ? this.H : this.bloomSizes[i - 1][1];
      const texel = [1 / sw, 1 / sh];
      if (i > 0) {
        b.uTex.value = src.texture;
        b.uDir.value.set(texel[0], 0);
        this._pass(this.blurMat, lv.a);
      }
      b.uTex.value = lv.a.texture;
      b.uDir.value.set(1 / this.bloomSizes[i][0], 0);
      this._pass(this.blurMat, lv.b);
      b.uTex.value = lv.b.texture;
      b.uDir.value.set(0, 1 / this.bloomSizes[i][1]);
      this._pass(this.blurMat, lv.a);
    }

    // anamorphic streak for the drive: kept very low, only the hottest pixels reach it
    const st = this.streak;
    b.uTex.value = this.bloomLevels[1].a.texture;
    b.uDir.value.set(5 / this.streakSize[0], 0);
    this._pass(this.blurMat, st.a);
    b.uTex.value = st.a.texture;
    this._pass(this.blurMat, st.b);
    b.uTex.value = st.b.texture;
    this._pass(this.blurMat, st.a);

    const c = this.compMat.uniforms;
    c.uScene.value = this.sceneRT.texture;
    c.uBloom0.value = this.bloomLevels[0].a.texture;
    c.uBloom1.value = this.bloomLevels[1].a.texture;
    c.uBloom2.value = this.bloomLevels[2].a.texture;
    c.uStreak.value = st.a.texture;
    c.uTime.value = state.time || 0;
    c.uBloomStrength.value = state.bloom !== undefined ? state.bloom : 0.7;
    c.uExposure.value = state.exposure !== undefined ? state.exposure : 1.0;
    c.uFlash.value = state.flash || 0;
    this._pass(this.compMat, null);
  }
}
