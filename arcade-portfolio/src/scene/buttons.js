import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { gsap } from 'gsap'

const BUTTONS_MODEL_PATH = '/models/buttons.glb'
const BUTTON_NAME_REGEX = /^(?:button|btn|b\d+)$/i

const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')

const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

function findButtons(root) {
  const buttons = []

  root.traverse((child) => {
    if (child.isMesh && BUTTON_NAME_REGEX.test(child.name)) {
      buttons.push(child)
    }
    if (child.isGroup && BUTTON_NAME_REGEX.test(child.name) && child.children.length > 0) {
      buttons.push(child)
    }
  })

  return buttons
}

function buildPlaceholderButtons() {
  const group = new THREE.Group()
  const buttonGroup = new THREE.Group()
  const radius = 0.04

  for (let i = 0; i < 10; i += 1) {
    const button = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, 0.03, 16),
      new THREE.MeshStandardMaterial({ color: 0xffa500, roughness: 0.3, metalness: 0.2 })
    )

    button.name = `button-${i}`
    const x = (i - 4.5) * 0.1
    button.position.set(x, 1.12, 0.07)
    button.rotation.x = Math.PI / 2
    button.castShadow = true
    button.receiveShadow = true
    buttonGroup.add(button)
  }

  group.add(buttonGroup)
  return { group, buttons: buttonGroup.children.slice() }
}

export async function loadButtonsModel(scene, onProgress) {
  try {
    const gltfScene = await new Promise((resolve, reject) => {
      gltfLoader.load(
        BUTTONS_MODEL_PATH,
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

    const buttons = findButtons(gltfScene)
    if (buttons.length === 0) {
      console.warn('[Buttons] No button meshes found in buttons.glb. Using placeholder buttons.')
      const { group, buttons: placeholderButtons } = buildPlaceholderButtons()
      scene.add(group)
      return { model: group, buttons: placeholderButtons }
    }

    return { model: gltfScene, buttons }
  } catch (err) {
    console.warn('[Buttons] Cannot load buttons model, using placeholder.', err)
    const { group, buttons } = buildPlaceholderButtons()
    scene.add(group)
    return { model: group, buttons }
  }
}

function pressButton(button) {
  if (!button) return

  if (button.userData.originalY === undefined) {
    button.userData.originalY = button.position.y
  }

  const originalY = button.userData.originalY
  gsap.killTweensOf(button.position)

  // Ensure we start from the exact original Y before animating
  button.position.y = originalY

  gsap.timeline()
    .to(button.position, { y: originalY - 0.004, duration: 0.08, ease: 'power2.out' })
    .to(button.position, { y: originalY, duration: 0.12, ease: 'bounce.out' })
} 

export function createButtonsController(buttons) {
  if (!Array.isArray(buttons) || buttons.length === 0) {
    console.warn('[Buttons] No buttons available for controller.')
    return { dispose: () => {} }
  }

  function onKeyDown(e) {
    const key = e.key
    if (!/^[0-9]$/.test(key)) return

    const buttonName = `b${key}`
    let buttonTarget = buttons.find((btn) => btn.name && btn.name.toLowerCase() === buttonName)

    if (!buttonTarget) {
      // fallback to random if no exact match
      buttonTarget = buttons[Math.floor(Math.random() * buttons.length)]
    }

    pressButton(buttonTarget)
  }

  window.addEventListener('keydown', onKeyDown)

  return {
    dispose() {
      window.removeEventListener('keydown', onKeyDown)
    },
  }
}
