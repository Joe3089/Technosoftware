/**
 * TECHNO SOFTWARE — loader.js
 * Loader global con logo giratorio.
 * Usar: TSLoader.show('Texto...') / TSLoader.hide()
 * NO es un módulo — cargar con <script src="..."> normal
 */

var TSLoader = (function () {
  var overlay, bar, text, progress, interval;

  function init() {
    if (document.getElementById('ts-loader')) return;

    overlay = document.createElement('div');
    overlay.id = 'ts-loader';
    overlay.innerHTML = [
      '<div class="ts-loader-logo">',
      '  <div class="ts-loader-ring"></div>',
      '  <div class="ts-loader-ring-2"></div>',
      '  <img src="./assets/logo.png" alt="Cargando..."/>',
      '</div>',
      '<p class="ts-loader-text" id="ts-loader-text">Cargando...</p>',
      '<div class="ts-loader-bar-wrap">',
      '  <div class="ts-loader-bar" id="ts-loader-bar"></div>',
      '</div>',
    ].join('');
    document.body.appendChild(overlay);

    bar  = document.getElementById('ts-loader-bar');
    text = document.getElementById('ts-loader-text');
  }

  function show(msg, duration) {
    init();
    progress = 0;
    if (bar)  bar.style.width  = '0%';
    if (text) text.textContent = msg || 'Cargando...';
    overlay.classList.add('active');

    clearInterval(interval);
    var ms = duration || 2200;
    var steps = 60;
    var step  = 0;
    interval = setInterval(function () {
      step++;
      // Ease-out: fast at start, slow near end
      progress = Math.min(95, Math.round(step / steps * 100 * (1 - step / (steps * 2))));
      if (bar) bar.style.width = progress + '%';
      if (step >= steps) clearInterval(interval);
    }, ms / steps);
  }

  function hide() {
    clearInterval(interval);
    if (bar) bar.style.width = '100%';
    setTimeout(function () {
      if (overlay) overlay.classList.remove('active');
      if (bar)     bar.style.width = '0%';
    }, 200);
  }

  // Auto-intercept all <a> clicks that go to another page
  document.addEventListener('DOMContentLoaded', function () {
    init();
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href');
      // Skip anchors, external links, empty
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return;
      // Skip if it opens in new tab
      if (a.target === '_blank') return;

      e.preventDefault();
      TSLoader.show('Navegando...', 1000);
      setTimeout(function () { window.location.href = href; }, 900);
    });
  });

  return { show: show, hide: hide };
})();
