/* ═══════════════════════════════════════
   main.js — Entry point de la aplicación
═══════════════════════════════════════ */
import { initNavbar }      from './js/navbar.js'
import { initParticles, initDataLines, initScrollReveal } from './js/animations.js'
import { initContactForm } from './js/contact.js'

// Inicializar todo cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  initNavbar()
  initParticles()
  initDataLines()
  initScrollReveal()
  initContactForm()
})
