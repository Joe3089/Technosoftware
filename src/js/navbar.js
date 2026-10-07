/* ═══════════════════════════════════════
   navbar.js — Lógica del navbar
═══════════════════════════════════════ */

export function initNavbar() {
  const nav = document.getElementById('nav')
  if (!nav) return

  // ── Efecto scroll ──────────────────────
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 60)
  }
  window.addEventListener('scroll', onScroll, { passive: true })

  // ── Link activo según sección visible ──
  const sectionIds = ['inicio', 'quienes-somos', 'portafolio', 'contacto']
  const links = nav.querySelectorAll('.nav-menu a')

  const highlightActive = () => {
    let current = ''
    sectionIds.forEach(id => {
      const el = document.getElementById(id)
      if (el && window.scrollY >= el.offsetTop - 120) current = id
    })
    links.forEach(a =>
      a.classList.toggle('active', a.getAttribute('href') === `#${current}`)
    )
  }
  window.addEventListener('scroll', highlightActive, { passive: true })
  highlightActive()
}
