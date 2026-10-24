# Handoff — 自然选择号四幕展示站（ahead4）

Date: 2026-10-24
Workspace: `/Users/jason/Documents/workspace/ahead4`
Branch: `main`（未提交改动，见下）

## 项目定位

《三体》「自然选择号」四幕动态展示站（巡航 / 木星军港 / 前进四 / 余晖）。
3D 场景用 Three.js 手写，无框架；构建为单文件 `web/index.html`。
当前回话的主线工作：视觉打磨（银河、星野、调色、木星与引擎小太阳）。

关键文件：
- `three/src/showcase/show.js` — 四幕镜头、时间轴、灯光与统一 uniform 驱动
- `three/src/showcase/space.js` — 背景银河 shader、星野、太阳、木星、引擎辉光、军港灯火、卫星
- `three/src/showcase/stage.js` — 渲染器、多级 bloom、ACES/调色合成
- `three/build-showcase.mjs` — 构建到 `web/index.html`（约 642KB / gzip 170KB）
- `three/tools/showcase-shot.mjs` — 全四幕定帧截图到 `three/shots/showcase/`
- `three/tools/shot-mobile.mjs` — 移动端截图
- `three/tools/_errcheck.mjs` — 页面运行时错误检查（未跟踪文件）

## 本次已完成（任务 #6、#7）

### 银河与星野（#6 完成）
`space.js` 背景 shader：
- 新增连续亮脊 `spine = exp(-bank²/0.0020)`，暖核心色随 `warmth` 混合，避免蓝雾。
- 提高亮暗对比：`clump = 0.08 + 1.95*smoothstep(0.34,0.84,...)`，band 系数 0.24→0.30。
- 暗尘带加深：`lane * band * 1.0`，外层 `smoothstep(0.62,0.94,dustFine)*wide*0.38`。

星野：
- 星壳半径 8200 → **12500**（背景球 14000），解决星点压在木星圆盘上的穿帮。
- 主星 20000 / 带内星 62000（移动端 9000 / 22000）。
- 新增 30 个低透明加性 sprite“银河云絮”（半径 12350，scale 650–2300），把点云连成一条带。

### 泛光与调色（#7 完成）
`stage.js`：
- 亮部阈值 0.85/膝 0.45 → **0.92 / 0.40**，减少整体发灰。
- 合成新增胶片 S 曲线：`col = mix(col, smoothstep(0,1,col), 0.16)`。
- 保留 ACES + gamma 0.4545 + 冷暗部/暖高光分离 + 暗角 0.42 + 颗粒。
- 曝光默认 1.0，bloom 由 `show.js` 按幕驱动（约 0.16–0.64）。

### 引擎与木星（#8 进行中，已做一半）
`space.js`：
- 小太阳纹理颗粒范围 0.30→0.42 半径；`sun` tint 0xeaf4ff；sun/core 透明度下调（满推力 sun 0.88、core 0.36），避免白色死块。
- 木星飞船阴影：`sh` 羽化 `smoothstep(0.58,0.99)` → **`0.30,1.12`**；阴影内增加散射环境光 `col*(0.020+0.030*day)*sh`；遮蔽系数 0.97→0.92。
- 引擎侧受光略增强：`engLit*0.22`，二次散射 `*0.20`。
- 闪电收窄变暗：ridge 阈值 0.040→0.020，stormMask 0.55–0.86 → 0.66–0.92，亮度 1.10→0.85。

## 当前验证状态

- `node build-showcase.mjs` 成功；`node tools/showcase-shot.mjs` 无运行时错误（calls 53 / tris 92076）。
- 已目检 `act0_b`、`act1_a/b`、`act2_c/e`、`act3_a`。
- 木星盘上的细小暖白点 = `createPortLights` 军港灯火，属设计，不是星点穿帮。
- 闪电是随机触发，不同帧表现不一；定帧截图可能恰好无闪电。

## 未完成 / 下一步（任务 #8 剩余）

1. **引擎小太阳仍偏“白团”**：核心到日冕只有轻微蓝色过渡，纹理细节被 bloom 吃掉。可考虑：
   - 在 `space.js` `createEngineGlow()` 里给 `core` 换低透明暖白或再降不透明度；
   - 在 `makeSunTexture()` 增加 limb darkening（边缘压暗）和更大颗粒对比；
   - 如需镜头感，可加极低强度的 anamorphic 拉丝（`stage.js` 已有 streak 通道）。
2. **木星明暗关系**：act2 中日照面偏蓝灰、引擎照明不够“近距小太阳”的感觉。可微调 `JUP_FS` 的 `day`/`engLit` 权重与 `uEngine` 强度，但注意不要再把阴影拉成死黑。
3. **阴影形状**：当前是柔和椭圆，能读作飞船投影，但没有舰体轮廓。若要求更“巨大飞船阴影”，可在 `JUP_FS` 阴影函数里叠加一两个偏移的子椭圆/噪声扰动边缘（`show.js` 里 `uShadowRadius` 为 `rr, rr*0.32`）。
4. **移动端复检**：`node tools/shot-mobile.mjs`，确认 22000 带内星 + 30 个云 sprite 在低端机可接受。
5. **交互/全流程**：`node tools/interact.mjs` 或本地起服务跑一遍四幕切换、拖拽、滚轮缩放，确认无回退。
6. **构建产物**：`web/index.html` 已随每次 build 更新，但**未提交**。
7. **清理**：`three/tools/_errcheck.mjs`、`ref/*` 为未跟踪文件，按需提交或忽略。

## 常用命令

```bash
cd /Users/jason/Documents/workspace/ahead4/three
node build-showcase.mjs
node tools/showcase-shot.mjs      # 输出 three/shots/showcase/act*_*.png
node tools/shot-mobile.mjs
```

## 建议调用的 Skill

- `threejs-shaders` — 继续改 `JUP_FS` / `BG_FS` / 日冕纹理时读，避免 GLSL 语法与性能坑。
- `threejs-lighting` — 木星日照面、引擎照明、阴影权重调整。
- `threejs-postprocessing` — 若要继续调 bloom 金字塔、曝光、调色或加镜头效果。
- `frontend-design` — 若需要同步打磨 HUD/字幕/版式的整体质感。
- `show-me` — 需要把多张定帧拼成对照图给用户确认时。

## 注意事项

- 改完必须 `node build-showcase.mjs`，页面实际加载的是 `web/index.html` 单文件。
- 定帧截图工具会启动本地服务并 seek 到指定时间，不要用 `file://` 直接打开。
- 星野/银河改动很容易在“发灰蓝雾”和“黑得没细节”之间摆动，每次只动一个参数并看 act0/act3。
- 未获得用户确认前不要提交或发布。
