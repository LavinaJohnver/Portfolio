/**
 * scene/raycaster.js
 * ─────────────────────────────────────────────────────────────────
 * Manages a THREE.Raycaster that fires on click/tap events on the
 * WebGL canvas and checks for intersections against a list of
 * registered meshes.
 *
 * USAGE
 * ─────
 *   const ray = createRaycaster(camera, renderer.domElement)
 *   ray.register('screen', screenMesh, () => onScreenClick())
 *   // call ray.dispose() on cleanup
 */

import * as THREE from 'three'

export function createRaycaster(camera, domElement) {
  const raycaster  = new THREE.Raycaster()
  const pointer    = new THREE.Vector2()

  // Map of id → { mesh, callback }
  const targets = new Map()

  // ── Pointer normalisation ──────────────────────────────────────
  function getPointer(event) {
    const rect = domElement.getBoundingClientRect()
    // Support both mouse and touch
    const clientX = event.touches ? event.touches[0].clientX : event.clientX
    const clientY = event.touches ? event.touches[0].clientY : event.clientY
    pointer.x =  ((clientX - rect.left) / rect.width)  * 2 - 1
    pointer.y = -((clientY - rect.top)  / rect.height) * 2 + 1
  }

  // ── Click / tap handler ────────────────────────────────────────
  let _pointerDownPos = new THREE.Vector2()

  function onPointerDown(e) {
    getPointer(e)
    _pointerDownPos.copy(pointer)
  }

  function onPointerUp(e) {
    getPointer(e)

    // Guard: ignore drags (pointer moved more than 4px in NDC)
    const dx = pointer.x - _pointerDownPos.x
    const dy = pointer.y - _pointerDownPos.y
    if (Math.sqrt(dx * dx + dy * dy) > 0.02) return

    // Cast
    raycaster.setFromCamera(pointer, camera)
    const meshes = Array.from(targets.values()).map(t => t.mesh)
    const hits   = raycaster.intersectObjects(meshes, false)

    if (!hits.length) return

    // Find which registered target was hit
    for (const [id, { mesh, callback }] of targets) {
      if (hits[0].object === mesh) {
        callback(hits[0])
        break
      }
    }
  }

  domElement.addEventListener('pointerdown', onPointerDown)
  domElement.addEventListener('pointerup',   onPointerUp)

  return {
    /**
     * Register a mesh to watch.
     * @param {string}        id       — unique key
     * @param {THREE.Mesh}    mesh     — target mesh
     * @param {Function}      callback — called on hit with the intersection
     */
    register(id, mesh, callback) {
      targets.set(id, { mesh, callback })
    },

    /** Remove a registered target */
    unregister(id) {
      targets.delete(id)
    },

    dispose() {
      domElement.removeEventListener('pointerdown', onPointerDown)
      domElement.removeEventListener('pointerup',   onPointerUp)
      targets.clear()
    },
  }
}
