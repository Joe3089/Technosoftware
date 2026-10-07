/**
 * TECHNO SOFTWARE — main.js
 * Lógica principal: navbar, partículas, scroll reveal, formulario
 */

// ── Navbar scroll ──────────────────────────────────
const nav = document.getElementById('nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  });
}

// ── Active link ────────────────────────────────────
const sections = ['inicio', 'quienes-somos', 'portafolio', 'contacto'];
window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el && window.scrollY >= el.offsetTop - 120) current = id;
  });
  document.querySelectorAll('.nav-menu a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === `#${current}`);
  });
});

// ── Partículas ─────────────────────────────────────
const particlesEl = document.getElementById('particles');
if (particlesEl) {
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('div');
    p.className = 'p';
    const size = Math.random() * 3 + 1;
    Object.assign(p.style, {
      width:             `${size}px`,
      height:            `${size}px`,
      left:              `${Math.random() * 100}%`,
      animationDuration: `${Math.random() * 16 + 10}s`,
      animationDelay:    `${Math.random() * 14}s`,
      opacity:           String(Math.random() * 0.4 + 0.1),
    });
    particlesEl.appendChild(p);
  }
}

// ── Data lines ─────────────────────────────────────
const dlinesEl = document.getElementById('dlines');
if (dlinesEl) {
  for (let i = 0; i < 8; i++) {
    const l = document.createElement('div');
    l.className = 'dline';
    Object.assign(l.style, {
      left:              `${i * 14 + Math.random() * 8}%`,
      animationDuration: `${Math.random() * 8 + 6}s`,
      animationDelay:    `${Math.random() * 8}s`,
      opacity:           String(Math.random() * 0.5 + 0.2),
    });
    dlinesEl.appendChild(l);
  }
}

// ── Scroll reveal ──────────────────────────────────
const revealObserver = new IntersectionObserver(
  entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); revealObserver.unobserve(e.target); }
  }),
  { threshold: 0.08 }
);
document.querySelectorAll('.rev').forEach(el => revealObserver.observe(el));

// ── Formulario de contacto ─────────────────────────
window.doSend = function(e) {
  e.preventDefault();
  const ok = document.getElementById('form-ok');
  if (ok) {
    ok.style.display = 'block';
    setTimeout(() => { ok.style.display = 'none'; }, 6000);
  }
  e.target.reset();
};
