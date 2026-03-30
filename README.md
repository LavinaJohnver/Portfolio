# 🕹️ Arcade Portfolio — Three.js + Vite + Tailwind CSS

A 3D arcade cabinet portfolio powered by **Three.js**, **CSS3DRenderer**, **Vite**, and **Tailwind CSS v4**.

---

## File Structure

```
arcade-portfolio/
├── index.html                      ← Entry HTML, contains screen DOM
├── vite.config.js                  ← Vite + Tailwind plugin
├── package.json
├── public/
│   └── models/
│       └── arcade-machine.glb      ← ⚠️  Drop your model here
└── src/
    ├── main.js                     ← Orchestrator, render loop, wiring
    ├── styles/
    │   └── main.css                ← Tailwind + arcade screen styles
    ├── scene/
    │   ├── setup.js                ← Renderer, camera, lights, controls
    │   ├── model.js                ← GLTFLoader + placeholder cabinet
    │   ├── screen.js               ← CSS3DRenderer bridge
    │   ├── environment.js          ← Background, fog, particles
    │   ├── raycaster.js            ← Click detection on screen mesh
    │   └── cameraTransition.js     ← GSAP focus / exit animations
    └── components/
        ├── loader.js               ← Loading overlay UI
        └── focusUI.js              ← Exit button + focus hints
```

---

## Quick Start

```bash
npm install
npm run dev
```

The dev server opens at `http://localhost:5173`.  
Without a GLB file it renders a procedural placeholder cabinet.

---

## Adding Your Model

1. Export your arcade machine as `.glb` (with Draco compression optional).
2. Copy it to `public/models/arcade-machine.glb`.
3. Name the monitor face mesh so it contains the word **"screen"**
   (e.g. `"CRT_Screen"`, `"screen_face"` — case-insensitive).
4. If your mesh has a different name, change `SCREEN_MESH_KEYWORD`
   in `src/scene/model.js`.

The `CSS3DObject` will auto-align to that mesh's world transform.

---

## Customising the Screen Content

Edit the `#arcade-screen-content` div in `index.html`.  
It's a normal DOM element — use Tailwind classes, add React, whatever you need.

If the DOM element size changes, update the constants in `src/scene/screen.js`:

```js
export const DOM_W  = 680   // CSS pixel width of #arcade-screen-content
export const DOM_H  = 500   // CSS pixel height
export const SCALE  = 0.001 // 1 CSS-px = 0.001 Three.js world units
```

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| [Three.js](https://threejs.org) | 3D rendering, scene graph |
| [CSS3DRenderer](https://threejs.org/docs/#examples/en/renderers/CSS3DRenderer) | DOM-in-3D bridge |
| [GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader) | Model loading |
| [OrbitControls](https://threejs.org/docs/#examples/en/controls/OrbitControls) | Camera interaction |
| [GSAP](https://gsap.com) | Camera transition animations |
| [Vite](https://vitejs.dev) | Build tool & dev server |
| [Tailwind CSS v4](https://tailwindcss.com) | Utility-first styling |

---

## Interaction System

### Click-to-Focus
A `THREE.Raycaster` listens on the WebGL canvas. When the user clicks (or taps) the screen mesh without dragging, `cameraTransition.focusScreen()` fires.

```
pointerdown → record position
pointerup   → if delta < threshold → cast ray → hit screen → focusScreen()
```

### Camera Transition (GSAP)
`cameraTransition.js` stores the home camera state at startup, then computes the focus position from the screen mesh's world bounds:

```
dist = (screenWorldH / 2) / tan(FOV_focus / 2 × fillRatio)
focusPos = screenCenter + screenNormal × dist
```

GSAP simultaneously tweens `camera.position`, `controls.target`, and `camera.fov`. OrbitControls is disabled for the duration.

### Exit
Three ways to exit Focus Mode:
1. Click the **✕ EXIT** button (top-right)
2. Press **Escape**
3. (Extend: add swipe-down for mobile)

All three call `cameraTransition.exitFocus()` which reverses the GSAP tween back to the saved home state, then re-enables OrbitControls.

---



```
Every frame:
  1. controls.update()          → apply damping
  2. renderer.render()          → WebGL: 3D scene → canvas
  3. css3dRenderer.render()     → CSS3D: DOM overlay
```

The **occluder mesh** (an invisible `THREE.Plane` at the screen position)
writes to the WebGL depth buffer so the CSS3DObject is correctly hidden
when the camera orbits behind the cabinet.

---

## OrbitControls Constraints

| Parameter | Value | Effect |
|-----------|-------|--------|
| `minPolarAngle` | `π × 0.25` | Can't look from directly above |
| `maxPolarAngle` | `π × 0.55` | Can't go below the cabinet floor |
| `minAzimuthAngle` | `−π × 0.35` | 63° left sweep |
| `maxAzimuthAngle` | `+π × 0.35` | 63° right sweep |
| `minDistance` | `2.5` | Can't zoom into the screen |
| `maxDistance` | `7.0` | Can't zoom out to infinity |
| `enablePan` | `false` | Locked to the cabinet |

Tweak these in `src/scene/setup.js → createControls()`.
