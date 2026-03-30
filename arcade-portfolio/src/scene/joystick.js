import * as THREE from 'three'
import { gsap } from 'gsap'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

const JOYSTICK_MODEL_PATH = '/models/joystick.glb'
const JOYSTICK_KEYWORDS = ['joystick', 'stick', 'lever', 'control-stick']
const JOYSTICK_ANGLE = 0.35
const JOYSTICK_CLAMP = 0.35

const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')

const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

function findJoystickMesh(root) {
  let found = null

  root.traverse((child) => {
    const name = (child.name || '').toLowerCase()
    if (child.isMesh && JOYSTICK_KEYWORDS.some((keyword) => name.includes(keyword))) {
      found = child
    }
  })

  if (!found) {
    root.traverse((child) => {
      const name = (child.name || '').toLowerCase()
      if (name.includes('joystick') || name.includes('stick')) {
        found = child
      }
    })
  }

  return found
}

function createJoystickPivot(target) {
  if (!target) return null

  const pivot = new THREE.Group()
  const worldPos = new THREE.Vector3()
  target.getWorldPosition(worldPos)
  pivot.position.copy(worldPos)

  const parent = target.parent
  if (parent) {
    parent.add(pivot)
    parent.remove(target)
  }

  target.position.set(0, 0, 0)
  pivot.add(target)

  return pivot
}

function buildPlaceholderJoystick() {
  const joystickPivot = new THREE.Group()
  joystickPivot.position.set(-0.18, 1.16, 0.06)

  const joystick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.12, 8),
    new THREE.MeshStandardMaterial({ color: 0xff2244, roughness: 0.4 })
  )
  joystick.position.set(0, 0.06, 0)
  joystick.castShadow = true
  joystick.receiveShadow = true

  joystickPivot.add(joystick)

  return joystickPivot
}

export async function loadJoystickModel(scene, onProgress) {
  try {
    const gltfScene = await new Promise((resolve, reject) => {
      gltfLoader.load(
        JOYSTICK_MODEL_PATH,
        (gltf) => resolve(gltf.scene),
        (xhr) => {
          if (onProgress && xhr.total) onProgress(xhr.loaded / xhr.total)
        },
        (err) => reject(err)
      )
    })

    gltfScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })

    scene.add(gltfScene)

    const rawJoystick = findJoystickMesh(gltfScene)
    const joystickMesh = rawJoystick ? createJoystickPivot(rawJoystick) : buildPlaceholderJoystick()

    if (!rawJoystick) {
      console.warn('[Joystick] No joystick mesh found in joystick glb; using placeholder joystick')
      scene.add(joystickMesh)
    }

    console.info('[Joystick] loaded joystick mesh', joystickMesh)

    return joystickMesh
  } catch (err) {
    console.warn('[Joystick] failed to load joystick model, using placeholder', err)
    const placeholder = buildPlaceholderJoystick()
    scene.add(placeholder)
    return placeholder
  }
}

function getCurrentJoystickTarget(state) {
  let x = 0
  let z = 0
  if (state.forward) x -= JOYSTICK_ANGLE
  if (state.back) x += JOYSTICK_ANGLE
  if (state.left) z += JOYSTICK_ANGLE
  if (state.right) z -= JOYSTICK_ANGLE

  x = THREE.MathUtils.clamp(x, -JOYSTICK_CLAMP, JOYSTICK_CLAMP)
  z = THREE.MathUtils.clamp(z, -JOYSTICK_CLAMP, JOYSTICK_CLAMP)

  return { x, z }
}

function animateJoystick(joystickMesh, target, duration = 0.24) {
  if (!joystickMesh) {
    console.warn('[Joystick] animateJoystick called but no joystickMesh present')
    return
  }

  gsap.to(joystickMesh.rotation, {
    x: target.x,
    z: target.z,
    duration,
    ease: 'elastic.out(1, 0.45)',
    onUpdate: () => {
      joystickMesh.rotation.x = THREE.MathUtils.clamp(joystickMesh.rotation.x, -JOYSTICK_CLAMP, JOYSTICK_CLAMP)
      joystickMesh.rotation.z = THREE.MathUtils.clamp(joystickMesh.rotation.z, -JOYSTICK_CLAMP, JOYSTICK_CLAMP)
    },
  })
}

export function createJoystickController(joystickMesh, { onNavigate, isFocused }) {
  const state = {
    forward: false,
    back: false,
    left: false,
    right: false,
  }

  function handleMovement(dir, setTo) {
    state[dir] = setTo
    if (isFocused && isFocused()) {
      onNavigate?.(dir)
    }
    animateJoystick(joystickMesh, getCurrentJoystickTarget(state), setTo ? 0.22 : 0.38)
  }

  function onKeyDown(e) {
    const key = e.key.toLowerCase()
    if (e.repeat) return

    console.debug('[Joystick] onKeyDown', key)

    if (key === 'w') {
      state.forward = true
      onNavigate?.('up')
    }
    if (key === 's') {
      state.back = true
      onNavigate?.('down')
    }
    if (key === 'a') {
      state.left = true
      onNavigate?.('left')
    }
    if (key === 'd') {
      state.right = true
      onNavigate?.('right')
    }

    animateJoystick(joystickMesh, getCurrentJoystickTarget(state), 0.22)
  }

  function onKeyUp(e) {
    const key = e.key.toLowerCase()
    console.debug('[Joystick] onKeyUp', key)

    if (key === 'w') state.forward = false
    if (key === 's') state.back = false
    if (key === 'a') state.left = false
    if (key === 'd') state.right = false

    animateJoystick(joystickMesh, getCurrentJoystickTarget(state), 0.38)
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  return {
    dispose() {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    },
  }
}
