import * as THREE from 'three';

const TAU = Math.PI * 2;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export const TOTAL = 88;

export const ACTS = [
  {
    id: 0, no: '01', title: '一％光速', en: 'CRUISE', start: 0, end: 20,
    chapter: '01 / 巡航 · CRUISE',
    quote: '在这无垠的外太空，它的速度丝毫显现不出来……仿佛静止地悬浮于深邃的空间中。',
    note: '木星与土星轨道之间 · 航向天鹅座',
    readouts: [
      ['速度', '0.0100 c'],
      ['推进', '巡航'],
      ['光源', '太阳 · 极远'],
      ['位置', '木星—土星'],
    ],
    cam: [
      { t: 0.00, yaw: 0.95, pitch: 0.18, dist: 48, target: [0.0, 0.5, 0], fov: 32, roll: 0.010, shift: 0.105 },
      { t: 0.42, yaw: 0.58, pitch: 0.09, dist: 35, target: [0.4, 0.4, 0], fov: 32, roll: 0.006, shift: 0.100 },
      { t: 0.74, yaw: 0.12, pitch: 0.02, dist: 26, target: [0.5, 0.3, 0], fov: 34, roll: 0.000, shift: 0.085 },
      { t: 1.00, yaw: 0.40, pitch: 0.11, dist: 31, target: [0.5, 0.5, 0], fov: 34, roll: 0.004, shift: 0.090 },
    ],
    jupiter: { pos: [0, 0, 0], fade: 0, scale: 1 },
    ship: { yaw: 0.0, roll: 0.0, pitch: 0.0 },
    sun: 1.0,
  },
  {
    id: 1, no: '02', title: '木星背阴面', en: 'JUPITER PORT', start: 20, end: 40,
    chapter: '02 / 军港 · JUPITER PORT',
    quote: '每一道山脉就是一艘停泊的太空战舰。',
    note: '亚洲舰队木星军港 · 四百余艘战舰',
    readouts: [
      ['速度', '0.0099 c'],
      ['推进', '怠速'],
      ['月光', '木卫二'],
      ['位置', '木星背阴面'],
    ],
    cam: [
      { t: 0.00, yaw: 4.86, pitch: 0.17, dist: 46, target: [1.2, 0.7, 0], fov: 36, roll: -0.012, shift: 0.030 },
      { t: 0.40, yaw: 4.55, pitch: 0.09, dist: 33, target: [2.2, 0.9, 0], fov: 34, roll: -0.008, shift: 0.025 },
      { t: 0.74, yaw: 5.14, pitch: 0.25, dist: 39, target: [2.8, 1.0, 0], fov: 39, roll: 0.010, shift: 0.040 },
      { t: 1.00, yaw: 4.68, pitch: 0.12, dist: 31, target: [2.2, 0.8, 0], fov: 33, roll: -0.004, shift: 0.020 },
    ],
    jupiter: { pos: [3600, -820, 240], fade: 1, scale: 1 },
    ship: { yaw: 0.18, roll: 0.0, pitch: 0.0 },
    sun: 0.18,
  },
  {
    id: 2, no: '03', title: '前进四', en: 'FORWARD FOUR', start: 40, end: 68,
    chapter: '03 / 全功率 · FORWARD FOUR',
    quote: '木星轨道上突然出现了一颗小太阳。',
    note: '无工质聚变发动机 · 全功率',
    readouts: [
      ['速度', '0.0100 → 0.0128 c'],
      ['推进', '前进四'],
      ['阴影', '可容下一个地球'],
      ['光源', '小太阳'],
    ],
    cam: [
      { t: 0.00, yaw: 4.68, pitch: 0.12, dist: 34, target: [2.2, 0.8, 0], fov: 34, roll: -0.004, shift: 0.020 },
      { t: 0.12, yaw: 4.56, pitch: 0.10, dist: 32, target: [2.2, 0.8, 0], fov: 33, roll: -0.010, shift: 0.020 },
      { t: 0.26, yaw: 4.44, pitch: 0.16, dist: 54, target: [3.2, 0.9, 0], fov: 36, roll: 0.012, shift: 0.036 },
      { t: 0.54, yaw: 4.98, pitch: 0.24, dist: 66, target: [4.6, 1.1, 0], fov: 39, roll: 0.018, shift: 0.048 },
      { t: 0.78, yaw: 4.30, pitch: 0.06, dist: 49, target: [2.4, 0.5, 0], fov: 34, roll: -0.006, shift: 0.016 },
      { t: 1.00, yaw: 4.58, pitch: 0.20, dist: 82, target: [4.6, 1.0, 0], fov: 38, roll: 0.008, shift: 0.040 },
    ],
    jupiter: { pos: [3400, -860, -220], fade: 1, scale: 1 },
    ship: { yaw: 0.18, roll: 0.0, pitch: 0.0 },
    sun: 0.10,
  },
  {
    id: 3, no: '04', title: '余晖', en: 'AFTERGLOW', start: 68, end: 88,
    chapter: '04 / 余晖 · AFTERGLOW',
    quote: '小太阳渐渐缩小，变成一颗明亮的星星。',
    note: '四十五分钟后，追击舰队起航',
    readouts: [
      ['速度', '0.0128 c'],
      ['推进', '前进四'],
      ['追击', '六艘'],
      ['可见', '一周'],
    ],
    cam: [
      { t: 0.00, yaw: 4.50, pitch: 0.26, dist: 58, target: [3.0, 0.9, 0], fov: 38, roll: 0.008, shift: 0.035 },
      { t: 0.48, yaw: 4.34, pitch: 0.16, dist: 80, target: [3.0, 0.9, 0], fov: 36, roll: 0.004, shift: 0.030 },
      { t: 1.00, yaw: 4.70, pitch: 0.08, dist: 112, target: [3.0, 0.8, 0], fov: 34, roll: 0.000, shift: 0.025 },
    ],
    jupiter: { pos: [4200, -900, -160], fade: 0.92, scale: 1 },
    ship: { yaw: 0.10, roll: 0.0, pitch: 0.0 },
    sun: 0.12,
  },
];

function hermite(keys, field, p) {
  if (keys.length === 1) return keys[0][field];
  let i = 0;
  while (i < keys.length - 2 && p > keys[i + 1].t) i++;
  const k1 = keys[i], k2 = keys[i + 1];
  const k0 = keys[i - 1] || k1;
  const k3 = keys[i + 2] || k2;
  const span = Math.max(1e-4, k2.t - k1.t);
  const u = clamp((p - k1.t) / span, 0, 1);
  const m1 = (k2[field] - k0[field]) / Math.max(1e-4, k2.t - k0.t) * span;
  const m2 = (k3[field] - k1[field]) / Math.max(1e-4, k3.t - k1.t) * span;
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * k1[field] + (u3 - 2 * u2 + u) * m1 +
         (-2 * u3 + 3 * u2) * k2[field] + (u3 - u2) * m2;
}

function hermiteVec(keys, field, p) {
  const out = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    const tmp = keys.map(k => ({ t: k.t, v: k[field][c] }));
    out[c] = hermite(tmp, 'v', p);
  }
  return out;
}

export class Show {
  constructor(stage) {
    this.stage = stage;
    this.time = 0;
    this.actIndex = -1;
    this.flash = 0;
    this.shake = 0;
    this.lightning = 0;
    this.nextLightning = 0;
    this.ignited = false;
    this.lookYaw = 0;
    this.lookPitch = 0;
    this.zoom = 1;
    this.lookIdle = 10;
    this._jupiterBase = new THREE.Vector3();
    this._engineWorld = new THREE.Vector3();
    this._shadowDir = new THREE.Vector3();
    this._shadowT1 = new THREE.Vector3();
    this._shadowT2 = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
    this._fleetPos = new THREE.Vector3();
    this._jupSun = new THREE.Vector3(0.82, 0.22, -0.52).normalize();
    this._target = new THREE.Vector3();
    this._camPos = new THREE.Vector3();
    this._lastNow = 0;
    this._info = { act: ACTS[0], p: 0, time: 0, throttle: 0, speed: 0.01 };
  }

  get act() { return ACTS[Math.max(0, this.actIndex)]; }

  _enterAct(i) {
    this.actIndex = i;
    this.ignited = false;
    this.lightning = 0;
    this.nextLightning = 0;
    const a = ACTS[i];
    this._jupiterBase.set(...a.jupiter.pos);
    this.stage.jupiter.setPosition(this._jupiterBase);
    this.stage.jupiter.group.scale.setScalar(a.jupiter.scale || 1);
    this.stage.jupiter.setFade(a.jupiter.fade);
  }

  drag(dx, dy) {
    this.lookYaw = clamp(this.lookYaw - dx * 0.0028, -0.75, 0.75);
    this.lookPitch = clamp(this.lookPitch + dy * 0.0026, -0.45, 0.45);
    this.lookIdle = 0;
  }

  zoomBy(f) {
    this.zoom = clamp(this.zoom * f, 0.72, 1.35);
    this.lookIdle = 0;
  }

  resetLook() {
    this.lookYaw = 0;
    this.lookPitch = 0;
    this.zoom = 1;
  }

  apply(time, dt) {
    const t = ((time % TOTAL) + TOTAL) % TOTAL;
    this.time = t;
    let i = ACTS.length - 1;
    for (let k = 0; k < ACTS.length; k++) {
      if (t < ACTS[k].end) { i = k; break; }
    }
    if (i !== this.actIndex) this._enterAct(i);
    const a = ACTS[i];
    const p = clamp((t - a.start) / (a.end - a.start), 0, 1);

    // drag look slowly returns to the authored shot
    this.lookIdle += dt;
    if (this.lookIdle > 1.4) {
      const k = Math.exp(-dt * 0.55);
      this.lookYaw *= k;
      this.lookPitch *= k;
      this.zoom = lerp(this.zoom, 1, 1 - Math.exp(-dt * 0.18));
    }

    // ---------------- camera ----------------
    const cam = a.cam;
    let yaw = hermite(cam, 'yaw', p) + this.lookYaw;
    let pitch = hermite(cam, 'pitch', p) + this.lookPitch;
    let dist = hermite(cam, 'dist', p) * this.zoom;
    let fov = hermite(cam, 'fov', p);
    let roll = hermite(cam, 'roll', p);
    let shift = hermite(cam, 'shift', p);

    const tg = hermiteVec(cam, 'target', p);
    this._target.set(tg[0], tg[1], tg[2]);

    if (!this.stage.reduceMotion) {
      const tt = t + 0.0;
      yaw += 0.0032 * Math.sin(tt * 0.37) + 0.0018 * Math.sin(tt * 0.91 + 1.7);
      pitch += 0.0022 * Math.sin(tt * 0.29 + 1.3) + 0.0013 * Math.sin(tt * 0.73);
      roll += 0.0035 * Math.sin(tt * 0.21 + 0.8);
      this._target.y += 0.018 * Math.sin(tt * 0.43);
      this._target.x += 0.022 * Math.sin(tt * 0.31 + 0.5);
    }

    if (this.shake > 0.002) {
      const s = this.shake * 0.16;
      const tt = performance.now() * 0.001;
      this._target.x += Math.sin(tt * 71.3) * s * 0.35;
      this._target.y += Math.sin(tt * 83.7 + 1.1) * s * 0.35;
      yaw += Math.sin(tt * 67.1 + 0.4) * s * 0.0025;
      pitch += Math.sin(tt * 59.7 + 1.9) * s * 0.0025;
      roll += Math.sin(tt * 47.9) * s * 0.003;
    }

    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    this._camPos.set(
      this._target.x + dist * cp * Math.sin(yaw),
      this._target.y + dist * sp,
      this._target.z + dist * cp * Math.cos(yaw)
    );
    const cam3 = this.stage.camera;
    cam3.position.copy(this._camPos);
    cam3.fov = fov;
    cam3.lookAt(this._target);
    if (roll) cam3.rotateZ(roll);

    const mobile = this.stage.mobile;
    const sx = mobile ? 0 : shift;
    const sy = mobile ? 0.05 : 0.010;
    cam3.updateProjectionMatrix();
    cam3.projectionMatrix.elements[8] = -sx;
    cam3.projectionMatrix.elements[9] = -sy;
    cam3.projectionMatrixInverse.copy(cam3.projectionMatrix).invert();
    cam3.updateMatrixWorld(true);

    // ---------------- ship ----------------
    const ship = this.stage.ship;
    const shipYaw = a.ship.yaw + (this.stage.reduceMotion ? 0 : Math.sin(t * 0.055) * 0.012);
    const shipRoll = a.ship.roll + (this.stage.reduceMotion ? 0 : Math.sin(t * 0.043 + 1.2) * 0.006);
    ship.group.rotation.set(a.ship.pitch || 0, shipYaw, shipRoll);
    ship.group.updateMatrixWorld(true);

    // ---------------- engine throttle ----------------
    let throttle;
    if (a.id === 0) throttle = 0.10 + 0.012 * Math.sin(t * 0.42);
    else if (a.id === 1) throttle = 0.045 + 0.008 * Math.sin(t * 0.55);
    else if (a.id === 2) {
      if (p > 0.075 && !this.ignited) {
        this.ignited = true;
        this.flash = 0.38;
        this.shake = 0.9;
      }
      throttle = 0.045 + 0.955 * smoothstep(0.075, 0.21, p);
      throttle += 0.025 * Math.sin(t * 34.0) * smoothstep(0.20, 0.4, p);
      throttle = clamp(throttle, 0, 1);
    } else {
      throttle = 0.98 - 0.46 * smoothstep(0, 1, p);
    }
    this.stage.engine.setThrottle(throttle, t);

    // ---------------- jupiter ----------------
    const jup = this.stage.jupiter;
    jup.group.position.set(
      this._jupiterBase.x + Math.sin(t * 0.071) * 28,
      this._jupiterBase.y + Math.cos(t * 0.052) * 14,
      this._jupiterBase.z + Math.sin(t * 0.043 + 1.0) * 30
    );
    jup.update(dt);
    jup.uniforms.uSunDir.value.copy(this._jupSun);
    const engOnJup = a.id === 3 ? throttle * 0.35 : throttle * 1.25;
    jup.uniforms.uEngine.value = a.jupiter.fade > 0.01 ? engOnJup : 0;
    jup.uniforms.uGlow.value = a.id === 0 ? 1.0 : 1.0;
    jup.uniforms.uFlash.value = this.lightning;

    // shadow centre: the sub-engine point on Jupiter, swept sideways
    this.stage.engine.group.getWorldPosition(this._engineWorld);
    const jp = jup.group.position;
    jup.uniforms.uEngineDir.value.copy(this._engineWorld).sub(jp).normalize();
    this._shadowDir.copy(jup.uniforms.uEngineDir.value);
    this._shadowT1.crossVectors(this._shadowDir, this._up).normalize();
    this._shadowT2.crossVectors(this._shadowDir, this._shadowT1);
    const sweep = a.id === 2 ? smoothstep(0.16, 0.92, p) : 0;
    this._shadowDir
      .addScaledVector(this._shadowT1, Math.sin(sweep * 1.9 - 0.45) * 0.20)
      .addScaledVector(this._shadowT2, Math.sin(sweep * 1.5 + 0.6) * 0.05)
      .normalize();
    jup.uniforms.uShadowDir.value.copy(this._shadowDir);
    jup.uniforms.uShadow.value = a.id === 2 ? 0.94 * smoothstep(0.10, 0.28, p) : 0;
    const rr = a.id === 2 ? 0.185 + 0.035 * p : 0.185;
    jup.uniforms.uShadowRadius.value.set(rr, rr * 0.40);

    // lightning on the night side
    if (a.id === 2 && p > 0.12) {
      this.nextLightning -= dt;
      if (this.nextLightning <= 0) {
        this.lightning = 0.55 + Math.random() * 0.85;
        this.nextLightning = 0.7 + Math.random() * 2.1;
        this.shake = Math.max(this.shake, 0.10);
      }
    }
    this.lightning *= Math.exp(-dt * 4.5);
    this.flash *= Math.exp(-dt * 4.0);
    this.shake *= Math.exp(-dt * 1.9);

    // ---------------- moons ----------------
    const R = 1000 * (a.jupiter.scale || 1);
    const europa = this.stage.europa;
    europa.group.position.set(
      jp.x - R * 0.18 + Math.sin(t * 0.06) * 20,
      jp.y + R * 0.58 + Math.cos(t * 0.048) * 14,
      jp.z - R * 1.05
    );
    europa.material.emissiveIntensity = 0.28 + throttle * 0.22;
    europa.group.visible = a.jupiter.fade > 0.01;
    europa.setOpacity(a.jupiter.fade * (a.id === 0 ? 0 : 1));

    const io = this.stage.io;
    const ioCross = a.id === 2 ? smoothstep(0.22, 0.82, p) : 0.22;
    io.group.position.set(
      jp.x - R * 0.50,
      jp.y - R * 0.38 + Math.sin(ioCross * Math.PI) * R * 0.30,
      jp.z - R * 1.15 + ioCross * R * 2.55
    );
    io.material.emissiveIntensity = 0.35 + throttle * 0.25;
    io.group.visible = a.jupiter.fade > 0.01 && a.id !== 1;
    io.setOpacity(a.jupiter.fade * (a.id === 0 ? 0 : 1));

    // ---------------- fleet / port / sun / stars ----------------
    this._fleetPos.set(jp.x + R * 0.55, jp.y + R * 1.05, jp.z + R * 0.75);
    this.stage.fleet.setPosition(this._fleetPos);
    let fleetA = 0;
    if (a.id === 2) fleetA = 0.40 * smoothstep(0.86, 1.0, p);
    else if (a.id === 3) fleetA = 0.42 + 0.30 * smoothstep(0, 0.5, p);
    this.stage.fleet.setOpacity(fleetA, t);

    let portA = 0;
    if (a.id === 1) portA = 0.95 * smoothstep(0.0, 0.18, p);
    else if (a.id === 2) portA = 0.55 * (1 - smoothstep(0.16, 0.4, p));
    else if (a.id === 3) portA = 0.24 * (1 - smoothstep(0.5, 1.0, p));
    this.stage.port.setOpacity(portA);
    this.stage.port.update(dt);

    this.stage.sun.setOpacity(a.sun * (1.0 - smoothstep(0.2, 0.6, a.jupiter.fade)));
    this.stage.stars.update(dt, 0.00028 + throttle * 0.00050);

    this._info.act = a;
    this._info.p = p;
    this._info.time = t;
    this._info.throttle = throttle;
    this._info.speed = a.id === 2 ? 0.01 + 0.0028 * smoothstep(0.15, 1, p) : (a.id === 3 ? 0.0128 : 0.01);

    return {
      time: t,
      bloom: 0.16 + throttle * 0.48 + this.lightning * 0.10,
      exposure: 1.0 + this.flash * 0.35,
      flash: this.flash,
    };
  }

  getInfo() { return this._info; }
}
