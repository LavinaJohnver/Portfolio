/**
 * components/loader.js
 * ─────────────────────────────────────────────────────────────────
 * Thin wrapper around the #loading-overlay UI.
 * Call setProgress(0–1) during asset loading, then hide() when done.
 */

const overlay    = document.getElementById('loading-overlay')
const bar        = document.getElementById('loading-bar')
const statusText = document.getElementById('loading-status')

const MESSAGES = [
  'Initialising renderer...',
  'Loading cabinet model...',
  'Wiring up the screen bridge...',
  'Calibrating OrbitControls...',
  'Inserting coin...',
  'Ready. Insert coin ▶',
]

export function setProgress(value, messageIndex) {
  const pct = Math.round(Math.min(Math.max(value, 0), 1) * 100)
  bar.style.width = `${pct}%`

  if (messageIndex !== undefined && MESSAGES[messageIndex]) {
    statusText.textContent = MESSAGES[messageIndex]
  }
}

export function hide() {
  statusText.textContent = MESSAGES[MESSAGES.length - 1]
  bar.style.width = '100%'

  setTimeout(() => {
    overlay.classList.add('hidden')
  }, 600)
}
