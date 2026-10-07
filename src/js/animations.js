/* ═══════════════════════════════════════
   animations.js — Partículas y scroll reveal
═══════════════════════════════════════ */

// ── Partículas flotantes ──────────────────────────────────────
export function initParticles() {
  const container = document.getElementById('particles')
  if (!container) return

  const COUNT = 26
  for (let i = 0; i < COUNT; i++) {
    const p = document.createElement('div')
    p.className = 'p'
    const size = Math.random() * 3 + 1
    Object.assign(p.style, {
      width:             `${size}px`,
      height:            `${size}px`,
      left:              `${Math.random() * 100}%`,
      animationDuration: `${Math.random() * 16 + 10}s`,
      animationDelay:    `${Math.random() * 14}s`,
      opacity:           String(Math.random() * 0.4 + 0.1),
    })
    container.appendChild(p)
  }
}

// ── Líneas de datos ────────────────────────────────────────────
export function initDataLines() {
  const container = document.getElementById('dlines')
  if (!container) return

  for (let i = 0; i < 8; i++) {
    const l = document.createElement('div')
    l.className = 'dline'
    Object.assign(l.style, {
      left:              `${i * 14 + Math.random() * 8}%`,
      animationDuration: `${Math.random() * 8 + 6}s`,
      animationDelay:    `${Math.random() * 8}s`,
      opacity:           String(Math.random() * 0.5 + 0.2),
    })
    container.appendChild(l)
  }
}

// ── Scroll Reveal con IntersectionObserver ─────────────────────
export function initScrollReveal() {
  const elements = document.querySelectorAll('.rev')
  if (!elements.length) return

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in')
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.08 }
  )

  elements.forEach(el => observer.observe(el))
}
