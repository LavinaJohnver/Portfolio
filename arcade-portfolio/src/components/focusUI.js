/**
 * components/focusUI.js
 * ─────────────────────────────────────────────────────────────────
 * Manages all DOM elements that appear / disappear with Focus Mode:
 *
 *   • #focus-exit-btn   — "✕ EXIT" button (top-right corner)
 *   • #focus-hint       — "Click screen to interact" hint (bottom)
 *   • #click-hint       — "Click to focus" tooltip near screen (pre-focus)
 *
 * Uses GSAP for enter/exit animations so transitions feel polished.
 *
 * All elements are injected programmatically so this module is
 * self-contained — nothing needs to be added to index.html.
 */

import gsap from 'gsap'

// ─────────────────────────────────────────────────────────────────
export function createFocusUI(onExit) {
  // ── Build DOM ──────────────────────────────────────────────────
  const exitBtn   = buildExitButton(onExit)
  const focusHint = buildFocusHint()
  const clickHint = buildClickHint()

  document.body.appendChild(exitBtn)
  document.body.appendChild(focusHint)
  document.body.appendChild(clickHint)

  // ─────────────────────────────────────────────────────────────
  function showFocusMode() {
    // Hide the pre-focus click hint
    gsap.to(clickHint, { opacity: 0, y: -8, duration: 0.2, ease: 'power2.in',
      onComplete: () => { clickHint.style.display = 'none' } })

    // Slide in exit button
    exitBtn.style.display = 'flex'
    gsap.fromTo(exitBtn,
      { opacity: 0, x: 20 },
      { opacity: 1, x: 0, duration: 0.45, ease: 'power2.out', delay: 0.55 }
    )

    // Fade in bottom hint
    focusHint.style.display = 'block'
    gsap.fromTo(focusHint,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', delay: 0.7 }
    )
  }

  function hideFocusMode() {
    // Slide out exit button
    gsap.to(exitBtn, { opacity: 0, x: 20, duration: 0.3, ease: 'power2.in',
      onComplete: () => { exitBtn.style.display = 'none' } })

    // Fade out bottom hint
    gsap.to(focusHint, { opacity: 0, y: 10, duration: 0.25, ease: 'power2.in',
      onComplete: () => { focusHint.style.display = 'none' } })

    // Restore click hint after transition
    setTimeout(() => {
      clickHint.style.display = 'block'
      gsap.fromTo(clickHint,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
      )
    }, 900)
  }

  /** Show the "click to focus" hint (called once, after loading) */
  function showClickHint() {
    clickHint.style.display = 'block'
    gsap.fromTo(clickHint,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', delay: 0.3 }
    )
  }

  return { showFocusMode, hideFocusMode, showClickHint }
}

// ─── Exit Button ──────────────────────────────────────────────────
function buildExitButton(onExit) {
  const btn = document.createElement('button')
  btn.id = 'focus-exit-btn'

  btn.innerHTML = `
    <span class="exit-icon">✕</span>
    <span class="exit-label">EXIT</span>
  `

  Object.assign(btn.style, {
    display:    'none',
    position:   'fixed',
    top:        '24px',
    right:      '24px',
    zIndex:     '50',
    opacity:    '0',
  })

  btn.addEventListener('click', onExit)

  // Inject scoped styles once
  if (!document.getElementById('focus-ui-styles')) {
    const style = document.createElement('style')
    style.id = 'focus-ui-styles'
    style.textContent = `
      #focus-exit-btn {
        display:         flex;
        align-items:     center;
        gap:             8px;
        padding:         10px 18px;
        background:      rgba(6, 8, 16, 0.85);
        border:          1px solid rgba(26, 255, 110, 0.4);
        border-radius:   3px;
        color:           #1aff6e;
        font-family:     'Courier New', monospace;
        font-size:       12px;
        font-weight:     bold;
        letter-spacing:  0.15em;
        cursor:          pointer;
        backdrop-filter: blur(8px);
        transition:      background 0.15s ease, border-color 0.15s ease,
                         color 0.15s ease, box-shadow 0.15s ease;
        user-select:     none;
      }
      #focus-exit-btn:hover {
        background:    rgba(26, 255, 110, 0.12);
        border-color:  rgba(26, 255, 110, 0.9);
        color:         #fff;
        box-shadow:    0 0 18px rgba(26, 255, 110, 0.25);
      }
      #focus-exit-btn:active {
        transform: scale(0.97);
      }
      .exit-icon {
        font-size: 14px;
        line-height: 1;
      }

      /* ── Focus Hint (bottom) ── */
      #focus-hint {
        position:      fixed;
        bottom:        28px;
        left:          50%;
        transform:     translateX(-50%);
        z-index:       50;
        font-family:   'Courier New', monospace;
        font-size:     11px;
        color:         rgba(26, 255, 110, 0.5);
        letter-spacing: 0.12em;
        pointer-events: none;
        white-space:   nowrap;
      }

      /* ── Click Hint (pre-focus tooltip) ── */
      #click-hint {
        position:      fixed;
        bottom:        40px;
        left:          50%;
        transform:     translateX(-50%);
        z-index:       50;
        display:       flex;
        align-items:   center;
        gap:           8px;
        padding:       8px 16px;
        background:    rgba(6, 8, 16, 0.7);
        border:        1px solid rgba(26, 255, 110, 0.2);
        border-radius: 3px;
        backdrop-filter: blur(6px);
        font-family:   'Courier New', monospace;
        font-size:     16px;
        color:         rgba(26, 255, 110, 0.7);
        letter-spacing: 0.1em;
        pointer-events: none;
        white-space:   nowrap;
        animation:     hint-pulse 2.5s ease-in-out infinite;
      }
      .hint-dot {
        width:            7px;
        height:           7px;
        border-radius:    50%;
        background:       #1aff6e;
        animation:        hint-dot-blink 1.2s step-end infinite;
        flex-shrink:      0;
      }
      @keyframes hint-pulse {
        0%, 100% { opacity: 0.85; }
        50%       { opacity: 0.45; }
      }
      @keyframes hint-dot-blink {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0; }
      }
    `
    document.head.appendChild(style)
  }

  return btn
}

// ─── Bottom focus hint ────────────────────────────────────────────
function buildFocusHint() {
  const el = document.createElement('div')
  el.id = 'focus-hint'
  el.textContent = 'PRESS ESC OR CLICK EXIT TO RETURN'
  Object.assign(el.style, { display: 'none', opacity: '0' })
  return el
}

// ─── Pre-focus click hint ─────────────────────────────────────────
function buildClickHint() {
  const el = document.createElement('div')
  el.id = 'click-hint'
  el.innerHTML = `<span class="hint-dot"></span> CLICK SCREEN TO FOCUS`
  Object.assign(el.style, { display: 'none', opacity: '0' })
  return el
}
