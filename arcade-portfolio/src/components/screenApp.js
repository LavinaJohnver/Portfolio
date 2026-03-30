/**
 * components/screenApp.js
 * ─────────────────────────────────────────────────────────────────
 * Self-contained controller for everything that runs INSIDE the
 * arcade screen (the CSS3DObject DOM surface).
 *
 * Responsibilities:
 *   • Section routing  — swap Home / About / Projects views
 *   • Carousel         — horizontal scroll with prev/next arrows
 *   • Lightbox         — full-surface image overlay with close btn
 *
 * This module has ZERO knowledge of Three.js or the camera.
 * It communicates with main.js only through the focus guard
 * (window.__arcadeFocusRequest) which is set up in main.js.
 *
 * ── HOW TO ADD A PROJECT ────────────────────────────────────────
 * Add an entry to the PROJECTS array below. Each entry needs:
 *   title  : string   — shown under the image
 *   desc   : string   — one-line subtitle
 *   img    : string   — path relative to /public  (or full URL)
 *   url    : string   — (optional) external link
 * ────────────────────────────────────────────────────────────────
 */

// ── Project data ─────────────────────────────────────────────────
let currentLightboxIndex = 0

const PROJECTS = [
  {
    title: 'TEMPLE CONCEPT ART',
    desc:  'Environment concept inspired by Angkor Wat, made in Blender and colored in Photoshop.',
    img:   '/images/1. Temple (Concept art).jpg',
  },
  {
    title: 'ACABANDONED CAR ENVIRONMENT STUDY',
    desc:  'Last of Us inspired environment study, made in Blender and colored in Photoshop.',
    img:   '/images/2. Abandoned Car (environment study).jpg',
  },
  {
    title: 'TATOOINE ENVIRONMENT STUDY',
    desc:  'Big fan of Star Wars, so I made a Tatooine-inspired environment.',
    img:   '/images/3. Tatooine (Environment study).jpg',
  },
  {
    title: 'ROGGENROLA TEXTURE STUDY',
    desc:  'A quick texture painting study of Roggenrola from Pokémon, made in Blender, hand-textured with Ucupaint',
    img:   '/images/4. Roggenrola (texture painting study).png',
  },
  {
    title: 'PLANET YTHIA CONCEPT ART',
    desc:  'Made this for a game design class project.',
    img:   '/images/5. Ythia (Game Concept Art).jpg',
  },
]

// ─────────────────────────────────────────────────────────────────
export function initScreenApp() {

  // ── 1. Section routing ─────────────────────────────────────────
  initNav()

  // ── 2. Build carousel cards from data ─────────────────────────
  buildCarousel()

  // ── 3. Wire carousel arrows ────────────────────────────────────
  initCarousel()

  // ── 4. Wire lightbox ───────────────────────────────────────────
  initLightbox()
}

// ═══════════════════════════════════════════════════════════════
// SECTION ROUTING
// ═══════════════════════════════════════════════════════════════
function initNav() {
  const navBar = document.getElementById('screen-nav-bar')
  if (!navBar) return

  navBar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-target]')
    if (!btn) return
    showSection(btn.dataset.target)
  })
}

/**
 * showSection(id)
 * Deactivates all sections, activates the one matching `id`.
 * Exported so external code (e.g. deep-link from URL hash) can call it.
 */
export function showSection(id) {
  document.querySelectorAll('.screen-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === `section-${id}`)
  })
}

// ═══════════════════════════════════════════════════════════════
// CAROUSEL — BUILD
// ═══════════════════════════════════════════════════════════════
function buildCarousel() {
  const track = document.getElementById('carousel-track')
  if (!track) return

  track.innerHTML = '' // clear placeholder comment

  PROJECTS.forEach((project, index) => {
    const li = document.createElement('li')
    li.className = 'carousel-card'
    li.dataset.index = index
    li.setAttribute('role', 'button')
    li.setAttribute('aria-label', `Open ${project.title} in lightbox`)

    li.innerHTML = `
      <img src="${project.img}" alt="${project.title}" loading="lazy" />
      <div class="card-info">
        <span class="card-title">${project.title}</span>
        <span class="card-desc">${project.desc}</span>
      </div>
      <span class="card-zoom-hint">ZOOM ⊕</span>
    `

    // Click → open lightbox
    li.addEventListener('click', () => openLightbox(index))

    track.appendChild(li)
  })
}

// ═══════════════════════════════════════════════════════════════
// CAROUSEL — NAVIGATION
// ═══════════════════════════════════════════════════════════════
function initCarousel() {
  const track    = document.getElementById('carousel-track')
  const prevBtn  = document.getElementById('carousel-prev')
  const nextBtn  = document.getElementById('carousel-next')
  if (!track || !prevBtn || !nextBtn) return

  // One "page" = width of one card + gap
  function getPageWidth() {
    const card = track.querySelector('.carousel-card')
    if (!card) return 200
    return card.offsetWidth + 10   // 10px = gap in CSS
  }

  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation()            // don't bubble to focus guard
    track.scrollBy({ left: -getPageWidth(), behavior: 'smooth' })
  })

  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    track.scrollBy({ left: getPageWidth(), behavior: 'smooth' })
  })

  // Update arrow disabled state on scroll
  function updateArrows() {
    prevBtn.disabled = track.scrollLeft <= 2
    nextBtn.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2
  }

  track.addEventListener('scroll', updateArrows, { passive: true })
  // Run once after cards are painted
  requestAnimationFrame(updateArrows)
}

// ═══════════════════════════════════════════════════════════════
// LIGHTBOX
// ═══════════════════════════════════════════════════════════════
function initLightbox() {
  const lightbox = document.getElementById('screen-lightbox')
  const closeBtn = document.getElementById('lightbox-close')
  const prevBtn  = document.getElementById('lightbox-prev')
  const nextBtn  = document.getElementById('lightbox-next')
  const img      = document.getElementById('lightbox-img')
  if (!lightbox || !closeBtn || !img || !prevBtn || !nextBtn) return

  // Close on button click
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    closeLightbox()
  })

  // Previous / Next in lightbox
  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    showLightboxAtIndex(currentLightboxIndex - 1)
  })

  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    showLightboxAtIndex(currentLightboxIndex + 1)
  })

  // Close on backdrop click (click outside the image)
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox()
  })

  // Keyboard nav in lightbox
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return
    if (e.key === 'Escape') {
      e.stopImmediatePropagation()
      closeLightbox()
      return
    }
    if (e.key === 'ArrowLeft') {
      showLightboxAtIndex(currentLightboxIndex - 1)
      return
    }
    if (e.key === 'ArrowRight') {
      showLightboxAtIndex(currentLightboxIndex + 1)
      return
    }
  }, true)   // capture phase → runs before main.js listener
}

function openLightbox(index) {
  currentLightboxIndex = index
  showLightboxAtIndex(currentLightboxIndex)
}

function showLightboxAtIndex(index) {
  const normalizedIndex = (index + PROJECTS.length) % PROJECTS.length
  const project = PROJECTS[normalizedIndex]
  if (!project) return

  currentLightboxIndex = normalizedIndex

  const lightbox = document.getElementById('screen-lightbox')
  const img      = document.getElementById('lightbox-img')
  const caption  = document.getElementById('lightbox-caption')
  if (!lightbox || !img) return

  img.src = project.img
  img.alt = project.title
  if (caption) caption.textContent = `${project.title} — ${project.desc}`

  lightbox.setAttribute('aria-hidden', 'false')
  lightbox.classList.add('open')
}

function closeLightbox() {
  const lightbox = document.getElementById('screen-lightbox')
  if (!lightbox) return
  lightbox.classList.remove('open')
  lightbox.setAttribute('aria-hidden', 'true')

  // Clear src after transition so there's no flash on reopen
  setTimeout(() => {
    const img = document.getElementById('lightbox-img')
    if (img && !lightbox.classList.contains('open')) img.src = ''
  }, 250)
}
