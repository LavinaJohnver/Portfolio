/**
 * scene/model.js
 * ─────────────────────────────────────────────────────────────────
 * Loads the arcade machine GLB model and wires it into the scene.
 *
 * HOW TO USE YOUR OWN MODEL
 * ─────────────────────────
 * 1. Drop your .glb file into /public/models/arcade-machine.glb
 * 2. The loader will auto-discover the mesh whose name contains
 *    "screen" or "monitor" (case-insensitive) and expose it as
 *    `screenMesh` so screen.js can align the CSS3DObject to it.
 * 3. If your mesh has a different name, change SCREEN_MESH_KEYWORD.
 *
 * PLACEHOLDER BEHAVIOUR
 * ─────────────────────
 * Until a real GLB is provided, a low-poly stand-in cabinet is
 * constructed from basic geometries so the rest of the scene
 * still functions correctly.
 */

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

// ── Config ────────────────────────────────────────────────────────
const MODEL_PATH          = '/models/arcade-machine.glb'
const SCREEN_MESH_KEYWORD = 'screen'          // mesh name fragment to match

// ─── DRACO decoder (optional — handles compressed GLBs) ───────────
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')

// ─── Shared GLTFLoader instance ───────────────────────────────────
const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

// ─────────────────────────────────────────────────────────────────
/**
 * loadArcadeModel(scene, onProgress?)
 *
 * Returns a Promise that resolves with:
 * {
 *   model      : THREE.Group   — the full GLTF scene graph
 *   screenMesh : THREE.Mesh    — the monitor face mesh (for alignment)
 * }
 *
 * If the GLB cannot be found, falls back to a procedural placeholder
 * and still resolves successfully.
 */
export async function loadArcadeModel(scene, onProgress) {
  return new Promise((resolve) => {
    gltfLoader.load(
      MODEL_PATH,

      // ── onLoad ────────────────────────────────────────────────
      (gltf) => {
        const model = gltf.scene

        // Enable shadows on every mesh
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow    = true
            child.receiveShadow = true
          }
        })

        // Optionally normalise scale / position here if your model
        // needs it — uncomment and adjust:
        // model.scale.setScalar(1.0)
        // model.position.set(0, 0, 0)

        scene.add(model)

        // Locate the screen mesh by keyword
        const screenMesh = findScreenMesh(model)

        console.info(
          screenMesh
            ? `[Model] Screen mesh found: "${screenMesh.name}"`
            : '[Model] No screen mesh found — using origin fallback'
        )

        resolve({ model, screenMesh })
      },

      // ── onProgress ────────────────────────────────────────────
      (xhr) => {
        if (onProgress && xhr.total) {
          onProgress(xhr.loaded / xhr.total)
        }
      },

      // ── onError ───────────────────────────────────────────────
      (err) => {
        console.warn('[Model] GLB not found — using placeholder cabinet.', err)
        const { model, screenMesh } = buildPlaceholderCabinet()
        scene.add(model)
        resolve({ model, screenMesh })
      }
    )
  })
}

// ─── Helper: find the screen mesh inside the loaded model ─────────
function findScreenMesh(root) {
  let found = null
  root.traverse((child) => {
    if (
      child.isMesh &&
      child.name.toLowerCase().includes(SCREEN_MESH_KEYWORD)
    ) {
      found = child
    }
  })
  return found
}
// ─── Placeholder: procedural arcade cabinet ───────────────────────
/**
 * A minimal stand-in so you can develop the full scene without a
 * model file.  The returned `screenMesh` sits at the same world
 * position that the CSS3DObject will target.
 *
 *  Cabinet layout (Y up, Z forward):
 *
 *     ┌──────────┐  ← top trim
 *     │  [SCREEN]│  ← monitor panel  (y ≈ 1.65, z ≈ 0.22)
 *     │          │
 *     ├──────────┤  ← control panel
 *     │          │  ← lower body
 *     └──────────┘
 */
function buildPlaceholderCabinet() {
  const group = new THREE.Group()

  // Shared dark cabinet material
  const cabinetMat = new THREE.MeshStandardMaterial({
    color: 0x111118,
    roughness: 0.7,
    metalness: 0.3,
  })

  // ── Lower body ─────────────────────────────────────────────
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.1, 0.55),
    cabinetMat
  )
  body.position.set(0, 0.55, 0)
  body.castShadow = true
  body.receiveShadow = true
  group.add(body)

  // ── Control panel (angled top of lower body) ────────────────
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.08, 0.45),
    new THREE.MeshStandardMaterial({ color: 0x1a1a26, roughness: 0.5 })
  )
  panel.position.set(0, 1.12, 0.04)
  panel.rotation.x = -0.25
  panel.castShadow = true
  group.add(panel)

  // Buttons
  const buttonColors = [0xff2244, 0x22aaff, 0xffcc00]
  buttonColors.forEach((c, i) => {
    const btn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.04, 12),
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.3, emissive: c, emissiveIntensity: 0.4 })
    )
    btn.position.set(0.1 + i * 0.1, 1.22, 0.04)
    group.add(btn)
  })

  // ── Monitor bezel ────────────────────────────────────────────
  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(0.82, 0.65, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x0a0a12, roughness: 0.8 })
  )
  bezel.position.set(0, 1.65, 0.22)
  bezel.castShadow = true
  group.add(bezel)

  // ── Screen face — this is the mesh CSS3DObject aligns to ─────
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x0a1a0a,
    roughness: 0.1,
    metalness: 0.0,
    emissive: 0x041004,
    emissiveIntensity: 1.0,
  })

  const screenMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.68, 0.50),
    screenMat
  )
  screenMesh.name = 'screen'     // keyword match for findScreenMesh()
  screenMesh.position.set(0, 1.65, 0.262)
  group.add(screenMesh)

  // ── Top hood ─────────────────────────────────────────────────
  const hood = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.22, 0.55),
    cabinetMat
  )
  hood.position.set(0, 2.05, 0)
  group.add(hood)

  // Marquee glow strip
  const marquee = new THREE.Mesh(
    new THREE.BoxGeometry(0.82, 0.14, 0.02),
    new THREE.MeshStandardMaterial({
      color: 0x1aff6e,
      emissive: 0x1aff6e,
      emissiveIntensity: 2.0,
      roughness: 0.2,
    })
  )
  marquee.position.set(0, 1.98, 0.28)
  group.add(marquee)

  // Floor shadow receiver
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 6),
    new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.9 })
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = 0
  floor.receiveShadow = true
  group.add(floor)

  return { model: group, screenMesh }
}
