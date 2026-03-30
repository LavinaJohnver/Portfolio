/**
 * scene/cameraTransition.js
 * ─────────────────────────────────────────────────────────────────
 * Manages two camera states and animates between them using GSAP.
 *
 *  ┌──────────────┐   focusScreen()   ┌──────────────────┐
 *  │  FREE  mode  │ ────────────────► │  FOCUS  mode     │
 *  │  OrbitCtrls  │                   │  screen fills VP  │
 *  │  enabled     │ ◄──────────────── │  controls locked │
 *  └──────────────┘   exitFocus()     └──────────────────┘
 *
 * GSAP animates three things simultaneously:
 *   1. camera.position  (Vector3 → Vector3)
 *   2. controls.target  (Vector3 → Vector3)  — what the camera looks at
 *   3. camera.fov       (number  → number)   — slight FOV zoom-in effect
 *
 * Quaternion is NOT animated directly — letting Three.js recompute it
 * each frame via lookAt keeps gimbal-lock issues away.
 *
 * FOCUS POSITION DERIVATION
 * ─────────────────────────
 * We place the camera directly in front of the screen mesh, at a
 * distance calculated so the screen fills ~90% of the viewport height:
 *
 *   half_height = screenWorldH / 2
 *   dist        = half_height / tan(fov/2)
 *
 * This mirrors how real photographers frame a flat subject.
 */

import * as THREE from 'three'
import gsap from 'gsap'

// ─── Duration & easing constants ─────────────────────────────────
const DURATION_IN  = 1.1   // seconds — free → focus
const DURATION_OUT = 0.85  // seconds — focus → free
const EASE_IN      = 'power3.inOut'
const EASE_OUT     = 'power2.inOut'

// Target FOV values
const FOV_DEFAULT = 45
const FOV_FOCUS   = 28    // narrower = less distortion on flat screen

// ─────────────────────────────────────────────────────────────────
export function createCameraTransition(camera, controls, screenMesh) {

  // ── Snapshot the "home" state immediately after setup ──────────
  const homePosition = camera.position.clone()
  const homeTarget   = controls.target.clone()
  const homeFov      = FOV_DEFAULT

  // ── Derive the "focus" camera state from the screen mesh ───────
  const focusState = computeFocusState(camera, screenMesh)

  let isFocused = false
  let isAnimating = false

  // ─────────────────────────────────────────────────────────────
  /**
   * focusScreen()
   * Animate camera from current position to the screen-fill view.
   * Disables OrbitControls for the duration.
   */
  function focusScreen(onComplete) {
    if (isFocused || isAnimating) return
    isAnimating = true

    // Lock controls immediately so the user can't interfere
    controls.enabled = false

    // Proxy objects GSAP can tween
    const posProxy = { x: camera.position.x, y: camera.position.y, z: camera.position.z }
    const tgtProxy = { x: controls.target.x, y: controls.target.y, z: controls.target.z }
    const fovProxy = { fov: camera.fov }

    const tl = gsap.timeline({
      onComplete: () => {
        isFocused   = true
        isAnimating = false
        onComplete?.()
      }
    })

    // Animate position
    tl.to(posProxy, {
      x: focusState.position.x,
      y: focusState.position.y,
      z: focusState.position.z,
      duration: DURATION_IN,
      ease: EASE_IN,
      onUpdate: () => camera.position.set(posProxy.x, posProxy.y, posProxy.z),
    }, 0)

    // Animate controls target (the look-at point)
    tl.to(tgtProxy, {
      x: focusState.target.x,
      y: focusState.target.y,
      z: focusState.target.z,
      duration: DURATION_IN,
      ease: EASE_IN,
      onUpdate: () => {
        controls.target.set(tgtProxy.x, tgtProxy.y, tgtProxy.z)
        camera.lookAt(controls.target)
      },
    }, 0)

    // Animate FOV
    tl.to(fovProxy, {
      fov: FOV_FOCUS,
      duration: DURATION_IN * 0.9,
      ease: EASE_IN,
      onUpdate: () => {
        camera.fov = fovProxy.fov
        camera.updateProjectionMatrix()
      },
    }, 0)
  }

  // ─────────────────────────────────────────────────────────────
  /**
   * exitFocus()
   * Animate camera back to the saved home state.
   * Re-enables OrbitControls once complete.
   */
  function exitFocus(onComplete) {
    if (!isFocused || isAnimating) return
    isAnimating = true

    const posProxy = { x: camera.position.x, y: camera.position.y, z: camera.position.z }
    const tgtProxy = { x: controls.target.x, y: controls.target.y, z: controls.target.z }
    const fovProxy = { fov: camera.fov }

    const tl = gsap.timeline({
      onComplete: () => {
        isFocused   = false
        isAnimating = false

        // Sync OrbitControls internal state before re-enabling
        // (prevents a snap when the user first moves after exit)
        controls.target.copy(homeTarget)
        camera.position.copy(homePosition)
        camera.fov = homeFov
        camera.updateProjectionMatrix()
        controls.update()

        controls.enabled = true
        onComplete?.()
      }
    })

    tl.to(posProxy, {
      x: homePosition.x,
      y: homePosition.y,
      z: homePosition.z,
      duration: DURATION_OUT,
      ease: EASE_OUT,
      onUpdate: () => camera.position.set(posProxy.x, posProxy.y, posProxy.z),
    }, 0)

    tl.to(tgtProxy, {
      x: homeTarget.x,
      y: homeTarget.y,
      z: homeTarget.z,
      duration: DURATION_OUT,
      ease: EASE_OUT,
      onUpdate: () => {
        controls.target.set(tgtProxy.x, tgtProxy.y, tgtProxy.z)
        camera.lookAt(controls.target)
      },
    }, 0)

    tl.to(fovProxy, {
      fov: homeFov,
      duration: DURATION_OUT,
      ease: EASE_OUT,
      onUpdate: () => {
        camera.fov = fovProxy.fov
        camera.updateProjectionMatrix()
      },
    }, 0)
  }

  return { focusScreen, exitFocus, get isFocused() { return isFocused } }
}

// ─── Derive focus camera position from screen mesh world state ────
function computeFocusState(camera, screenMesh) {
  // Default: directly in front of the placeholder screen position
  // If screenMesh is null, fall back to a known-good position
  const screenCenter = new THREE.Vector3(0, 1.65, 0.262)
  const screenNormal = new THREE.Vector3(0, 0, 1)   // screen faces +Z

  if (screenMesh) {
    screenMesh.updateWorldMatrix(true, false)
    screenMesh.getWorldPosition(screenCenter)

    // Compute screen's world-space forward direction
    const localNormal = new THREE.Vector3(0, 0, 1)
    screenNormal.copy(localNormal).applyQuaternion(
      new THREE.Quaternion().setFromRotationMatrix(screenMesh.matrixWorld)
    )

    // Derive screen world height for distance calculation
    screenMesh.geometry.computeBoundingBox()
    const bb = screenMesh.geometry.boundingBox
    const worldScale = new THREE.Vector3()
    screenMesh.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), worldScale)
    const screenWorldH = (bb.max.y - bb.min.y) * worldScale.y

    const dist = computeFramingDistance(camera, screenWorldH, FOV_FOCUS, 0.90)
    const focusPos = screenCenter.clone().addScaledVector(screenNormal, dist)

    return { position: focusPos, target: screenCenter.clone() }
  }

  // Placeholder fallback — screen is at z=0.262, faces +Z
  // Screen world height = 0.50 (from DOM_H=500 × SCALE=0.001)
  const dist = computeFramingDistance(camera, 0.50, FOV_FOCUS, 2)
  return {
    position: new THREE.Vector3(0, 1.65, 0.262 + dist),
    target:   screenCenter.clone(),
  }
}

/**
 * Distance so the screen fills `fillRatio` of the vertical FOV.
 * @param {number} screenH    world-space height of the screen
 * @param {number} fov        camera FOV in degrees
 * @param {number} fillRatio  0–1, how much of the frame to fill
 */
function computeFramingDistance(camera, screenH, fov, fillRatio) {
  const halfFovRad = THREE.MathUtils.degToRad(fov / 2)
  // account for aspect ratio — portrait viewports need more distance
  const aspect = window.innerWidth / window.innerHeight
  const effectiveFovRad = aspect < 1
    ? Math.atan(Math.tan(halfFovRad) * aspect)
    : halfFovRad

  return (screenH / 2) / (Math.tan(effectiveFovRad) * fillRatio)
}
