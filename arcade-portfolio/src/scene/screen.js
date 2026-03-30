/**
 * scene/screen.js
 * ─────────────────────────────────────────────────────────────────
 * The "Screen Bridge" — connects a DOM element to the 3D world.
 *
 * ARCHITECTURE
 * ────────────
 *  ┌─────────────────┐      ┌─────────────────────┐
 *  │  #webgl-canvas  │      │  #css3d-container   │
 *  │  (THREE scene)  │      │  (CSS3DRenderer)    │
 *  │                 │      │                     │
 *  │  screenMesh ────┼──────┼──► CSS3DObject      │
 *  │  (invisible     │      │    wraps             │
 *  │   placeholder)  │      │   #arcade-screen-   │
 *  │                 │      │    content (DOM)     │
 *  └─────────────────┘      └─────────────────────┘
 *
 * The CSS3DObject is placed at the same world coordinates as the
 * arcade model's screen mesh.  A thin invisible Three.js plane
 * ("occluder") ensures the DOM element is hidden when the camera
 * rotates behind the cabinet.
 *
 * CUSTOMISING THE SCREEN SIZE
 * ───────────────────────────
 * Two values drive layout:
 *   DOM_W / DOM_H  — the CSS pixel dimensions of the DOM element
 *   SCALE          — shrinks the CSS3DObject to match the 3D world
 *
 * The relationship is:  world_size = DOM_px * SCALE
 * For the placeholder cabinet the screen face is 0.68 × 0.50 m, so:
 *   DOM_W=680, DOM_H=500, SCALE=0.001  →  0.68 × 0.50 ✓
 *
 * Adjust these three constants to fit a real model.
 */

import * as THREE from 'three'
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js'

// ── Screen DOM size (CSS pixels) ──────────────────────────────────
export const DOM_W  = 680
export const DOM_H  = 500

// ── Scale factor: maps CSS pixels → Three.js world units ─────────
// 0.001 means 1 CSS-px = 0.001 world units  (1 m = 1000 px)
export const SCALE  = 0.001

// ─────────────────────────────────────────────────────────────────
/**
 * createCSS3DRenderer()
 * Builds the CSS3DRenderer and appends it to #css3d-container.
 */
export function createCSS3DRenderer() {
  const renderer = new CSS3DRenderer()
  renderer.setSize(window.innerWidth, window.innerHeight)

  // The renderer creates its own <div> — mount it in our layer
  const container = document.getElementById('css3d-container')
  container.appendChild(renderer.domElement)

  return renderer
}

// ─────────────────────────────────────────────────────────────────
/**
 * createScreenObject(screenMesh?)
 *
 * Wraps #arcade-screen-content in a CSS3DObject and positions it
 * at the same world transform as `screenMesh` (or a default
 * position if no mesh is provided).
 *
 * @param {THREE.Mesh|null} screenMesh  — optional reference mesh
 * @returns {{ css3dObject, occluder }}
 */
export function createScreenObject(screenMesh) {
  // ── 1. Grab the DOM element that will appear on screen ─────────
  const el = document.getElementById('arcade-screen-content')

  // Set explicit pixel dimensions so CSS3D knows the element size
  el.style.width  = `${DOM_W}px`
  el.style.height = `${DOM_H}px`

  // ── 2. Wrap it in a CSS3DObject ─────────────────────────────────
  const css3dObject = new CSS3DObject(el)

  // ── 3. Position the CSS3DObject ─────────────────────────────────
  if (screenMesh) {
    // Copy world position and quaternion from the screen mesh
    screenMesh.updateWorldMatrix(true, false)
    const worldPos = new THREE.Vector3()
    const worldQuat = new THREE.Quaternion()
    const worldScale = new THREE.Vector3()
    screenMesh.matrixWorld.decompose(worldPos, worldQuat, worldScale)

    css3dObject.position.copy(worldPos)
    css3dObject.quaternion.copy(worldQuat)

    // Scale so DOM pixels match the mesh's world dimensions
    // screenMesh geometry width/height → derive from bounding box
    screenMesh.geometry.computeBoundingBox()
    const bb = screenMesh.geometry.boundingBox
    const meshW = (bb.max.x - bb.min.x) * worldScale.x
    const meshH = (bb.max.y - bb.min.y) * worldScale.y
    const scaleX = meshW / DOM_W
    const scaleY = meshH / DOM_H
    css3dObject.scale.set(scaleX, scaleY, 1)
  } else {
    // ── Default position for placeholder cabinet ─────────────────
    css3dObject.position.set(0, 1.65, 0.262)
    css3dObject.scale.setScalar(SCALE)
  }

  // ── 4. Occluder mesh ────────────────────────────────────────────
  // An invisible Three.js mesh at the same position.
  // It writes to the depth buffer so WebGL correctly occludes the
  // CSS3DObject when the camera swings behind the cabinet.
  const occluder = buildOccluder(css3dObject)

  return { css3dObject, occluder }
}

// ─── Occluder helper ──────────────────────────────────────────────
function buildOccluder(css3dObject) {
  const geo = new THREE.PlaneGeometry(DOM_W * SCALE, DOM_H * SCALE)

  const mat = new THREE.MeshBasicMaterial({
    opacity:     0,
    transparent: true,
    // Writing to depth buffer makes it occlude CSS3D content
    depthWrite:  true,
    side:        THREE.DoubleSide,
    colorWrite:  false,
  })

  const mesh = new THREE.Mesh(geo, mat)

  // Mirror the CSS3DObject transform
  mesh.position.copy(css3dObject.position)
  mesh.quaternion.copy(css3dObject.quaternion)
  // Slight Z offset so it sits just in front of the screen face
  mesh.position.z += 0.001

  return mesh
}

// ─────────────────────────────────────────────────────────────────
/**
 * renderScreen(css3dRenderer, cssScene, camera)
 * Call every frame AFTER rendering the WebGL scene.
 */
export function renderScreen(css3dRenderer, cssScene, camera) {
  css3dRenderer.render(cssScene, camera)
}
