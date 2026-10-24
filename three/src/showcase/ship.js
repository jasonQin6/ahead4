import * as THREE from 'three';
import { PARTS } from '../model.js';
import { createEngineGlow } from './space.js';

const SHIP_CENTER_X = -3.89;

function makeHullMaterial() {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.55,
    metalness: 0.24,
    envMapIntensity: 1.25,
    side: THREE.DoubleSide,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSeam = { value: 0.85 };
    shader.uniforms.uRimCol = { value: new THREE.Color(0.18, 0.42, 0.72) };
    shader.uniforms.uRim = { value: 0.10 };
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
      uniform vec3 uRimCol;
      uniform float uRim;
      float nsHash21(vec2 p){
        p = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 34.23);
        return fract(p.x * p.y);
      }`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
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
      diffuseColor.rgb *= 1.0 - 0.42 * uSeam * nsSeam * vMisc.z;
      float nsGrain = nsHash21(floor(vObjPos.xz * 46.0) + floor(vObjPos.yy * 46.0));
      diffuseColor.rgb *= 0.985 + 0.03 * nsGrain;`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
      roughnessFactor = clamp(vMisc.x, 0.12, 1.0);`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      totalEmissiveRadiance += vec3(0.28, 0.72, 1.0) * vMisc.y * 0.85;
      float nsRim = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 3.0);
      totalEmissiveRadiance += uRimCol * nsRim * uRim;`
    );
  };
  mat.customProgramCacheKey = () => 'ns-showcase-hull-v1';
  return mat;
}

export function createShip(geometries) {
  const group = new THREE.Group();
  group.name = 'ship';
  group.position.set(SHIP_CENTER_X, 0.15, 0);

  const material = makeHullMaterial();
  const meshes = [];
  for (let i = 0; i < PARTS.length; i++) {
    const geo = geometries[i];
    if (!geo || PARTS[i].en === 'DISPLAY STAND') continue;
    const mesh = new THREE.Mesh(geo, material);
    mesh.name = PARTS[i].name;
    mesh.frustumCulled = true;
    group.add(mesh);
    meshes.push(mesh);
  }

  const engine = createEngineGlow();
  engine.group.position.set(-4.35, 0.42, 0);
  group.add(engine.group);

  return { group, meshes, material, engine };
}

export function buildEnvironment(renderer) {
  const W = 256, H = 128;
  const data = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    const t = y / (H - 1);
    const sky = 0.012 + 0.075 * Math.pow(t, 1.7);
    for (let x = 0; x < W; x++) {
      const u = x / (W - 1);
      let r = sky * 0.62, g = sky * 0.80, b = sky * 1.00;
      // cold engine bounce band
      const d = Math.abs(t - 0.42) / 0.05;
      const band = Math.exp(-d * d * 3.0) * (0.35 + 0.65 * Math.pow(Math.sin(u * Math.PI), 2.0));
      r += band * 0.10;
      g += band * 0.18;
      b += band * 0.30;
      // faint warm upper strip for form
      const d2 = Math.abs(t - 0.84) / 0.04;
      const band2 = Math.exp(-d2 * d2 * 3.0) * (0.3 + 0.7 * Math.pow(Math.sin(u * Math.PI + 0.8), 2.0));
      r += band2 * 0.09;
      g += band2 * 0.075;
      b += band2 * 0.06;
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

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envRT = pmrem.fromEquirectangular(tex);
  tex.dispose();
  pmrem.dispose();
  return envRT;
}
