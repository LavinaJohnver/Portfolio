/**
 * main.js
 * ─────────────────────────────────────────────────────────────────
 * Entry point for the Arcade Portfolio.
 *
 * Interaction flow:
 *   User clicks screen mesh
 *     → Raycaster detects hit
 *     → cameraTransition.focusScreen() [GSAP]
 *     → OrbitControls disabled, Exit button appears
 *
 *   User clicks Exit (or presses Escape)
 *     → cameraTransition.exitFocus() [GSAP]
 *     → OrbitControls re-enabled, Exit button hides
 *
 * Render pipeline (every frame):
 *   1. OrbitControls.update()       — damping (skipped while animating)
 *   2. WebGLRenderer.render()       — 3D scene → canvas
 *   3. CSS3DRenderer.render()       — DOM screen overlay
 */

import * as THREE from 'three'

// ── Scene modules ─────────────────────────────────────────────────
import {
  createRenderer,
  createCamera,
  createLights,
  createControls,
  handleResize,
} from './scene/setup.js'

import { setupEnvironment }         from './scene/environment.js'
import { loadArcadeModel }          from './scene/model.js'
import {
  createCSS3DRenderer,
  createScreenObject,
  renderScreen,
} from './scene/screen.js'
import { createCameraTransition }   from './scene/cameraTransition.js'

// ── UI ────────────────────────────────────────────────────────────
import { setProgress, hide as hideLoader } from './components/loader.js'
import { createFocusUI }                   from './components/focusUI.js'
import { initScreenApp }                   from './components/screenApp.js'

// ─────────────────────────────────────────────────────────────────
async function init() {

  // ── 1. Core Three.js ───────────────────────────────────────────
  setProgress(0.05, 0)

  const scene    = new THREE.Scene()
  const camera   = createCamera()
  const renderer = createRenderer()

  // ── 2. CSS3D ───────────────────────────────────────────────────
  const css3dRenderer = createCSS3DRenderer()
  const cssScene      = new THREE.Scene()

  // ── 3. Lights & environment ────────────────────────────────────
  setProgress(0.15, 0)
  createLights(scene)
  setupEnvironment(scene)

  // ── 4. OrbitControls ───────────────────────────────────────────
  setProgress(0.25, 3)
  const controls = createControls(camera, renderer.domElement)

  // ── 5. Load arcade model ───────────────────────────────────────
  setProgress(0.35, 1)

  const { screenMesh, joystickMesh } = await loadArcadeModel(scene, (progress) => {
    setProgress(0.35 + progress * 0.35, 1)
  })

  // ── 6. Screen bridge ───────────────────────────────────────────
  setProgress(0.75, 2)

  const { css3dObject, occluder } = createScreenObject(screenMesh)
  cssScene.add(css3dObject)
  scene.add(occluder)

  // ── 7. Camera transition controller ───────────────────────────
  const camTransition = createCameraTransition(camera, controls, screenMesh)

  // ── 8. Focus UI ────────────────────────────────────────────────
  const focusUI = createFocusUI(() => {
    camTransition.exitFocus(() => {
      focusUI.hideFocusMode()
      // Re-enable the guard so the screen is clickable again
      document.body.classList.remove('arcade-focused')
    })
  })

  // ── 9. Focus guard — replaces Raycaster for screen clicks ──────
  // The #screen-focus-guard div covers the whole CSS3DObject surface.
  // It sits above the app content (z-index:5) in non-focused mode.
  // Clicking it anywhere is equivalent to "clicking the screen mesh".
  // No raycaster math needed — the DOM handles hit detection for us.
  const guard = document.getElementById('screen-focus-guard')
  if (guard) {
    guard.addEventListener('click', () => {
      if (camTransition.isFocused) return
      camTransition.focusScreen(() => {
        document.body.classList.add('arcade-focused') // hides guard via CSS
        focusUI.showFocusMode()
      })
    })
  }

  // ── 10. Init screen app (nav, carousel, lightbox) ───────────────
  initScreenApp()

  // ── 10.5. Email copy shortcut in footer
  setupEmailCopy('.credit-count', 'lavinajohnver@gmail.com')

  // ── 11. Keyboard controls: navigation and confirm (space) ────
  const keyState = {
    forward: false, back: false, left: false, right: false,
  }

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return

    const key = e.key.toLowerCase()

    if (key === 'escape' && camTransition.isFocused) {
      camTransition.exitFocus(() => {
        focusUI.hideFocusMode()
        document.body.classList.remove('arcade-focused')
      })
      return
    }

    if (key === ' ' || key === 'spacebar') {
      e.preventDefault()
      if (camTransition.isFocused) {
        camTransition.exitFocus(() => {
          focusUI.hideFocusMode()
          document.body.classList.remove('arcade-focused')
        })
      } else {
        camTransition.focusScreen(() => {
          focusUI.showFocusMode()
          document.body.classList.add('arcade-focused')
        })
      }
      return
    }

    if (key === 'w' || key === 'arrowup') keyState.forward = true
    if (key === 's' || key === 'arrowdown') keyState.back = true
    if (key === 'a' || key === 'arrowleft') keyState.left = true
    if (key === 'd' || key === 'arrowright') keyState.right = true

    if (joystickMesh) {
      const rot = THREE.MathUtils.degToRad(20)
      let updated = false

      if (key === 'd' || key === 'arrowright') {
        joystickMesh.rotation.y += rot
        updated = true
      }
      if (key === 'a' || key === 'arrowleft') {
        joystickMesh.rotation.y -= rot
        updated = true
      }
      if (key === 'w' || key === 'arrowup') {
        joystickMesh.rotation.x -= rot
        updated = true
      }
      if (key === 's' || key === 'arrowdown') {
        joystickMesh.rotation.x += rot
        updated = true
      }

      if (updated) {
        joystickMesh.rotation.x = THREE.MathUtils.clamp(joystickMesh.rotation.x, -Math.PI / 2, Math.PI / 2)
      }
    }
  })

  window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase()

    if (key === 'w' || key === 'arrowup') keyState.forward = false
    if (key === 's' || key === 'arrowdown') keyState.back = false
    if (key === 'a' || key === 'arrowleft') keyState.left = false
    if (key === 'd' || key === 'arrowright') keyState.right = false
  })

  // ── 12. Cursor — pointer on hover (CSS driven) ─────────────────
  // The guard's cursor:pointer is set in CSS. When focused, the
  // cursor is managed by individual interactive elements inside the app.

  // ── 13. Resize ─────────────────────────────────────────────────
  handleResize(renderer, css3dRenderer, camera)

  // ── 14. Done ───────────────────────────────────────────────────
  setProgress(1.0, 5)
  hideLoader()
  focusUI.showClickHint()

  // ── Utility: clipboard copy toast for footer email
  function setupEmailCopy(selector, email) {
    const target = document.querySelector(selector)
    if (!target) return

    const toast = document.createElement('div')
    toast.textContent = 'Copied email to clipboard'
    Object.assign(toast.style, {
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '8px 12px',
      borderRadius: '3px',
      background: 'rgba(0,0,0,0.8)',
      color: '#8cff97',
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      letterSpacing: '0.08em',
      zIndex: '300',
      opacity: '0',
      transition: 'opacity 0.2s ease, transform 0.2s ease',
      pointerEvents: 'none',
    })
    document.body.appendChild(toast)

    let hideTimer = null
    function showToast() {
      clearTimeout(hideTimer)
      toast.style.opacity = '1'
      toast.style.transform = 'translateX(-50%) translateY(-3px)'
      hideTimer = setTimeout(() => {
        toast.style.opacity = '0'
        toast.style.transform = 'translateX(-50%) translateY(0)'
      }, 1600)
    }

    target.style.cursor = 'pointer'
    target.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(email)
        showToast()
      } catch (err) {
        console.warn('Clipboard write failed', err)
        // fallback with prompt for old browsers
        window.prompt('Copy this email', email)
      }
    })
  }

  // ── 15. Render loop ────────────────────────────────────────────
  const clock = new THREE.Clock()

  function animate() {
    requestAnimationFrame(animate)

    const elapsed = clock.getElapsedTime()

    controls.update()

    scene.traverse((obj) => {
      if (obj.userData?.update) obj.userData.update(elapsed)
    })

    renderer.render(scene, camera)
    renderScreen(css3dRenderer, cssScene, camera)
  }

  animate()
}

// ─────────────────────────────────────────────────────────────────
init().catch((err) => {
  console.error('[Arcade Portfolio] Fatal init error:', err)
})
