/**
 * TECHNO SOFTWARE — login.js
 * Lógica de autenticación: tabs, toggle password, validaciones + loader
 */

// ── Tabs Login / Registro ──────────────────────────
window.switchTab = function(tab) {
  const isLogin = tab === 'login';
  document.getElementById('viewLogin').style.display    = isLogin ? '' : 'none';
  document.getElementById('viewRegister').style.display = isLogin ? 'none' : '';
  document.getElementById('viewForgot').style.display   = 'none';
  document.getElementById('tabLogin').classList.toggle('active', isLogin);
  document.getElementById('tabReg').classList.toggle('active', !isLogin);
};

// ── Olvidé contraseña ──────────────────────────────
window.showForgot = function(e) {
  e.preventDefault();
  document.getElementById('viewLogin').style.display  = 'none';
  document.getElementById('viewForgot').style.display = '';
  document.getElementById('tabLogin').classList.remove('active');
  document.getElementById('tabReg').classList.remove('active');
};
window.hideForgot = function() {
  document.getElementById('viewForgot').style.display = 'none';
  document.getElementById('viewLogin').style.display  = '';
  document.getElementById('tabLogin').classList.add('active');
};

// ── Toggle password ────────────────────────────────
window.togglePw = function(id, btn) {
  const inp = document.getElementById(id);
  inp.type  = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? '👁' : '🙈';
};

// ── Handlers de formularios ────────────────────────
window.handleLogin = function(e) {
  e.preventDefault();
  const err   = document.getElementById('loginErr');
  const email = document.getElementById('loginEmail').value;
  err.style.display = 'none';

  if (email.includes('fail')) {
    // Mostrar loader breve y luego error
    if (window.TSLoader) TSLoader.show('Verificando...', 1200);
    setTimeout(function() {
      if (window.TSLoader) TSLoader.hide();
      err.style.display = 'block';
    }, 1100);
    return;
  }

  // Login exitoso → loader + redirigir al dashboard
  if (window.TSLoader) TSLoader.show('Accediendo a tu cuenta...', 2000);

  // Guardar email en sessionStorage para el dashboard
  sessionStorage.setItem('ts_user_email', email);
  sessionStorage.setItem('ts_user_name',  email.split('@')[0]);

  setTimeout(function() {
    window.location.href = './dashboard.html';
  }, 1900);
};

window.handleRegister = function(e) {
  e.preventDefault();
  const err = document.getElementById('regErr');
  const ok  = document.getElementById('regOk');
  const p1  = document.getElementById('regPass').value;
  const p2  = document.getElementById('regPassConf').value;
  err.style.display = 'none';
  ok.style.display  = 'none';

  if (p1.length < 8) {
    err.textContent   = '✕ La contraseña debe tener al menos 8 caracteres.';
    err.style.display = 'block'; return;
  }
  if (p1 !== p2) {
    err.textContent   = '✕ Las contraseñas no coinciden.';
    err.style.display = 'block'; return;
  }

  // Registro exitoso → loader
  if (window.TSLoader) TSLoader.show('Creando tu cuenta...', 2000);
  setTimeout(function() {
    if (window.TSLoader) TSLoader.hide();
    ok.style.display = 'block';
    setTimeout(() => { ok.style.display = 'none'; switchTab('login'); }, 3500);
  }, 1900);
  e.target.reset();
};

window.handleForgot = function(e) {
  e.preventDefault();
  const ok = document.getElementById('forgotOk');
  if (window.TSLoader) TSLoader.show('Enviando enlace...', 1800);
  setTimeout(function() {
    if (window.TSLoader) TSLoader.hide();
    ok.style.display = 'block';
    setTimeout(() => { ok.style.display = 'none'; hideForgot(); }, 3500);
  }, 1700);
  e.target.reset();
};

// ── Deep link #register ────────────────────────────
if (window.location.hash === '#register') switchTab('register');
