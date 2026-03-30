/**
 * scene/setup.js
 * ─────────────────────────────────────────────────────────────────
 * Bootstraps the Three.js WebGL scene:
 *   • WebGLRenderer  (canvas#webgl-canvas)
 *   • PerspectiveCamera
 *   • Ambient + directional lighting
 *   • OrbitControls with restricted polar angle
 *   • Window-resize handler (updates both renderers)
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// ─── Renderer ────────────────────────────────────────────────────
export function createRenderer() {
  const canvas = document.getElementById('webgl-canvas')

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  })

  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2

  return renderer
}

// ─── Camera ───────────────────────────────────────────────────────
export function createCamera() {
  const camera = new THREE.PerspectiveCamera(
    45,                                         // FOV
    window.innerWidth / window.innerHeight,     // Aspect
    0.1,                                        // Near
    100                                         // Far
  )

  // Starting position — slightly above and in front of the machine
  camera.position.set(0, 1.6, 4.5)
  camera.lookAt(0, 1.2, 0)

  return camera
}

// ─── Lights ───────────────────────────────────────────────────────
export function createLights(scene) {
  // Soft ambient fill
  const ambient = new THREE.AmbientLight(0xffffff, 0.4)
  scene.add(ambient)

  // Main key light (top-right)
  const key = new THREE.DirectionalLight(0xffffff, 2.0)
  key.position.set(3, 5, 3)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.near = 0.5
  key.shadow.camera.far = 20
  key.shadow.camera.left = -5
  key.shadow.camera.right = 5
  key.shadow.camera.top = 5
  key.shadow.camera.bottom = -5
  scene.add(key)

  // Neon green rim light from the screen side — mimics screen glow
  const screenGlow = new THREE.PointLight(0x1aff6e, 1.5, 4.0)
  screenGlow.position.set(0, 1.6, 1.0)
  scene.add(screenGlow)

  // Cool blue fill from behind
  const fill = new THREE.DirectionalLight(0x4488ff, 0.5)
  fill.position.set(-3, 2, -3)
  scene.add(fill)

  return { ambient, key, screenGlow, fill }
}

// ─── OrbitControls ────────────────────────────────────────────────
export function createControls(camera, domElement) {
  const controls = new OrbitControls(camera, domElement)

  controls.enableDamping = true
  controls.dampingFactor = 0.06

  // Target: the approximate centre of the arcade cabinet
  controls.target.set(0, 1.2, 0)

  // ── Polar angle (vertical rotation) ──────────────────────────
  // Keep camera between a slight downward view and eye level.
  // Prevents the user from going underneath or behind the machine.
  controls.minPolarAngle = Math.PI * 0.25   // ~45° from top
  controls.maxPolarAngle = Math.PI * 0.55   // ~99° (just past horizontal)

  // ── Azimuth angle (horizontal rotation) ──────────────────────
  // Allow a 120° sweep so the user can peek at the sides.
  controls.minAzimuthAngle = -Math.PI * 0.35
  controls.maxAzimuthAngle =  Math.PI * 0.35

  // ── Zoom (dolly) ──────────────────────────────────────────────
  controls.minDistance = 1.80
  controls.maxDistance = 7.0

  controls.enablePan = false   // Disable panning — portfolio, not CAD tool

  return controls
}

// ─── Resize Handler ───────────────────────────────────────────────
/**
 * Call this once during setup.
 * Pass the CSS3DRenderer too so both stay in sync.
 *
 * @param {THREE.WebGLRenderer} renderer
 * @param {CSS3DRenderer}       css3dRenderer
 * @param {THREE.PerspectiveCamera} camera
 */
export function handleResize(renderer, css3dRenderer, camera) {
  window.addEventListener('resize', () => {
    const w = window.innerWidth
    const h = window.innerHeight

    // Update camera aspect
    camera.aspect = w / h
    camera.updateProjectionMatrix()

    // Resize both renderers
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    css3dRenderer.setSize(w, h)
  })
}
