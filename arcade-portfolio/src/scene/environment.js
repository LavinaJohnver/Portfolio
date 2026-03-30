/**
 * scene/environment.js
 * ─────────────────────────────────────────────────────────────────
 * Sets up the scene background, fog, and optional environment map.
 * Also adds a subtle grid/floor plane for depth cues.
 */

import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────────
export function setupEnvironment(scene) {
  // Deep charcoal background
  scene.background = new THREE.Color(0x060810)

  // Exponential fog — fades out the floor edges
  scene.fog = new THREE.FogExp2(0x060810, 0.12)

  // Grid floor
  addGridFloor(scene)

  // Vignette-style particle field (optional atmosphere)
  addParticleField(scene)
}

// ─── Grid floor ───────────────────────────────────────────────────
function addGridFloor(scene) {
  const grid = new THREE.GridHelper(20, 40, 0x1aff6e, 0x0d2d1a)
  grid.position.y = 0.001        // slightly above the shadow plane
  grid.material.opacity = 0.35
  grid.material.transparent = true
  scene.add(grid)
}

// ─── Ambient particle field ───────────────────────────────────────
function addParticleField(scene) {
  const COUNT = 300
  const positions = new Float32Array(COUNT * 3)

  for (let i = 0; i < COUNT; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 14   // x
    positions[i * 3 + 1] = Math.random() * 6             // y
    positions[i * 3 + 2] = (Math.random() - 0.5) * 14   // z
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const mat = new THREE.PointsMaterial({
    color:       0x1aff6e,
    size:        0.025,
    sizeAttenuation: true,
    transparent: true,
    opacity:     0.5,
  })

  const points = new THREE.Points(geo, mat)
  scene.add(points)

  // Slow drift animation — call update() from the render loop
  points.userData.update = (elapsed) => {
    points.rotation.y = elapsed * 0.02
  }
}
