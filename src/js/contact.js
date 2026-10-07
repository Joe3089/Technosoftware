/* ================================================================
   contact.js  —  Mapa Leaflet · Phone Dropdown · Calendario VET
   NO ES UN MÓDULO — se carga con <script src="..."> normal
================================================================ */

/* ════════════════════════════════════════
   1. MAPA LEAFLET (OpenStreetMap, gratis)
════════════════════════════════════════ */
var _map = null, _marker = null;

function locationClick() {
  var txt = document.getElementById('location-text');
  if (txt) txt.textContent = 'Selecciona tu ubicación en el mapa...';
  openMapModal();
}

function openMapModal() {
  var modal = document.getElementById('mapModal');
  if (!modal) return;
  modal.style.display = 'flex';

  // Esperar a que el div sea visible antes de inicializar
  setTimeout(function () {
    if (!_map) {
      _map = L.map('leaflet-map').setView([10.48, -66.87], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19
      }).addTo(_map);
      _map.on('click', function (e) { placeMarker(e.latlng); });
    } else {
      _map.invalidateSize();
    }

    // Geolocalización en tiempo real
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (pos) {
        var ll = L.latLng(pos.coords.latitude, pos.coords.longitude);
        _map.setView(ll, 15);
        placeMarker(ll);
      }, function () {
        placeMarker(L.latLng(10.48, -66.87));
      });
    } else {
      placeMarker(L.latLng(10.48, -66.87));
    }
  }, 120);
}

function placeMarker(latlng) {
  if (_marker) _marker.remove();
  _marker = L.marker(latlng, { draggable: true }).addTo(_map);
  _marker.on('dragend', function (e) { reverseGeocode(e.target.getLatLng()); });
  reverseGeocode(latlng);
}

function reverseGeocode(latlng) {
  fetch(
    'https://nominatim.openstreetmap.org/reverse?lat=' + latlng.lat +
    '&lon=' + latlng.lng + '&format=json',
    { headers: { 'Accept-Language': 'es' } }
  )
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var addr = d.display_name || 'Ubicación seleccionada';
      var el = document.getElementById('map-address');
      if (el) el.textContent = addr;
    })
    .catch(function () {});
}

function closeMapModal() {
  var modal = document.getElementById('mapModal');
  if (modal) modal.style.display = 'none';
}

function confirmLocation() {
  var addr = document.getElementById('map-address');
  var txt  = document.getElementById('location-text');
  if (addr && txt) txt.textContent = addr.textContent;
  closeMapModal();
}

// Geolocalización automática al cargar
(function () {
  var el = document.getElementById('location-text');
  if (!el || !navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(function (pos) {
    fetch(
      'https://nominatim.openstreetmap.org/reverse?lat=' + pos.coords.latitude +
      '&lon=' + pos.coords.longitude + '&format=json',
      { headers: { 'Accept-Language': 'es' } }
    )
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var city    = d.address.city || d.address.town || d.address.village || '';
        var country = d.address.country || '';
        el.textContent = [city, country].filter(Boolean).join(', ');
      })
      .catch(function () {});
  }, function () {
    el.textContent = 'Ciudad de México · Monterrey, NL';
  });
})();

/* ════════════════════════════════════════
   2. PHONE DROPDOWN CON BANDERAS
════════════════════════════════════════ */
var COUNTRIES = [
  { iso: 've', n: 'Venezuela',      c: '+58'   },
  { iso: 'mx', n: 'México',         c: '+52'   },
  { iso: 'us', n: 'EE.UU.',         c: '+1'    },
  { iso: 'co', n: 'Colombia',       c: '+57'   },
  { iso: 'ar', n: 'Argentina',      c: '+54'   },
  { iso: 'cl', n: 'Chile',          c: '+56'   },
  { iso: 'pe', n: 'Perú',           c: '+51'   },
  { iso: 'ec', n: 'Ecuador',        c: '+593'  },
  { iso: 'bo', n: 'Bolivia',        c: '+591'  },
  { iso: 'py', n: 'Paraguay',       c: '+595'  },
  { iso: 'uy', n: 'Uruguay',        c: '+598'  },
  { iso: 'pa', n: 'Panamá',         c: '+507'  },
  { iso: 'cr', n: 'Costa Rica',     c: '+506'  },
  { iso: 'do', n: 'R. Dominicana',  c: '+1809' },
  { iso: 'cu', n: 'Cuba',           c: '+53'   },
  { iso: 'gt', n: 'Guatemala',      c: '+502'  },
  { iso: 'hn', n: 'Honduras',       c: '+504'  },
  { iso: 'sv', n: 'El Salvador',    c: '+503'  },
  { iso: 'ni', n: 'Nicaragua',      c: '+505'  },
  { iso: 'br', n: 'Brasil',         c: '+55'   },
  { iso: 'es', n: 'España',         c: '+34'   },
  { iso: 'gb', n: 'Reino Unido',    c: '+44'   },
  { iso: 'de', n: 'Alemania',       c: '+49'   },
  { iso: 'fr', n: 'Francia',        c: '+33'   },
  { iso: 'it', n: 'Italia',         c: '+39'   },
  { iso: 'pt', n: 'Portugal',       c: '+351'  },
  { iso: 'ca', n: 'Canadá',         c: '+1'    },
];

function flagUrl(iso) {
  return 'https://flagcdn.com/w20/' + iso + '.png';
}

function renderCountries(list) {
  var el = document.getElementById('countryList');
  if (!el) return;
  el.innerHTML = list.map(function (c) {
    return '<div class="country-item" onclick="selectCountry(\'' + c.iso + '\',\'' + c.c + '\')">' +
      '<img src="' + flagUrl(c.iso) + '" width="20" height="14" ' +
      'style="border-radius:2px;object-fit:cover;flex-shrink:0;vertical-align:middle" alt="' + c.iso + '"/>' +
      '<span style="flex:1">' + c.n + '</span>' +
      '<span style="opacity:.55;font-size:.76rem">' + c.c + '</span>' +
      '</div>';
  }).join('');
}

function filterCountries(q) {
  renderCountries(q
    ? COUNTRIES.filter(function (c) {
        return c.n.toLowerCase().indexOf(q.toLowerCase()) >= 0 || c.c.indexOf(q) >= 0;
      })
    : COUNTRIES);
}

function selectCountry(iso, code) {
  var f = document.getElementById('selectedFlag');
  if (f) { f.src = flagUrl(iso); f.alt = iso.toUpperCase(); }
  var sc = document.getElementById('selectedCode');
  if (sc) sc.textContent = code;
  var d = document.getElementById('countryDrop');
  if (d) d.style.display = 'none';
}

function toggleCountryDrop(e) {
  e.stopPropagation();
  var d = document.getElementById('countryDrop');
  if (!d) return;
  var open = d.style.display === 'flex';
  d.style.display = open ? 'none' : 'flex';
  d.style.flexDirection = 'column';
  if (!open) {
    var s = document.getElementById('countrySearch');
    if (s) { s.value = ''; filterCountries(''); setTimeout(function(){s.focus();}, 50); }
  }
}

document.addEventListener('click', function () {
  var d = document.getElementById('countryDrop');
  if (d) d.style.display = 'none';
});

// Inicializar lista al cargar
document.addEventListener('DOMContentLoaded', function () {
  renderCountries(COUNTRIES);
});

/* ════════════════════════════════════════
   3. CALENDARIO VET (UTC-4)
════════════════════════════════════════ */
var calYear, calMonth, selectedDate = null, selectedSlot = null;

var SLOTS = [
  '9:00','9:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','13:00','13:30','14:00','14:30',
  '15:00','15:30','16:00','16:30'
];
var MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];
var DAY_NAMES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

function vetNow() {
  var n = new Date();
  return new Date(n.getTime() + n.getTimezoneOffset() * 60000 - 4 * 3600000);
}

function initCal() {
  var v = vetNow();
  calYear  = v.getFullYear();
  calMonth = v.getMonth();
  renderCal();
}

function renderCal() {
  var lbl  = document.getElementById('calMonthLabel');
  var grid = document.getElementById('calGrid');
  if (!lbl || !grid) return;
  lbl.textContent = MONTH_NAMES[calMonth] + ' ' + calYear;

  var vet   = vetNow();
  var today = new Date(vet.getFullYear(), vet.getMonth(), vet.getDate());
  var first = new Date(calYear, calMonth, 1).getDay();
  var total = new Date(calYear, calMonth + 1, 0).getDate();

  var h = DAY_NAMES.map(function(d){ return '<div class="cal-day-name">' + d + '</div>'; }).join('');
  for (var i = 0; i < first; i++) h += '<div class="cal-day empty"></div>';

  for (var d = 1; d <= total; d++) {
    var dt   = new Date(calYear, calMonth, d);
    var dow  = dt.getDay();
    var past = dt < today;
    var we   = (dow === 0 || dow === 6);
    var sel  = selectedDate && dt.toDateString() === selectedDate.toDateString();
    var tod  = dt.toDateString() === today.toDateString();
    var cls  = 'cal-day' + (past||we?' disabled':'') + (sel?' selected':'') + (tod&&!sel?' today':'');
    var clk  = (!past && !we) ? ' onclick="pickDate(' + calYear + ',' + calMonth + ',' + d + ')"' : '';
    h += '<div class="' + cls + '"' + clk + '>' + d + '</div>';
  }
  grid.innerHTML = h;
}

function pickDate(y, m, d) {
  selectedDate = new Date(y, m, d);
  selectedSlot = null;
  renderCal();
  var ts = document.getElementById('timeSlots');
  var sg = document.getElementById('slotsGrid');
  if (!ts || !sg) return;
  ts.style.display = 'block';
  sg.innerHTML = SLOTS.map(function(s){
    return '<div class="slot" onclick="pickSlot(this,\'' + s + '\')">' + s + '</div>';
  }).join('');
  updateBtn();
}

function pickSlot(el, s) {
  var slots = document.querySelectorAll('.slot');
  for (var i = 0; i < slots.length; i++) slots[i].classList.remove('selected');
  el.classList.add('selected');
  selectedSlot = s;
  updateBtn();
  // Enable confirm button
  var cb = document.getElementById('confirmSchedBtn');
  if (cb) { cb.disabled = false; cb.style.opacity = '1'; cb.style.pointerEvents = 'auto'; }
}

function updateBtn() {
  var b = document.getElementById('scheduleBtnText');
  if (!b) return;
  if (selectedDate && selectedSlot) {
    var ds = selectedDate.toLocaleDateString('es', { weekday:'long', day:'numeric', month:'long' });
    b.textContent = '✅ ' + ds + ' · ' + selectedSlot + ' VET';
  } else if (selectedDate) {
    b.textContent = '📅 ' + selectedDate.toLocaleDateString('es', { day:'numeric', month:'long' }) + ' — elige hora';
  }
}

function prevMonth() {
  if (calMonth === 0) { calMonth = 11; calYear--; } else calMonth--;
  renderCal();
}

function nextMonth() {
  if (calMonth === 11) { calMonth = 0; calYear++; } else calMonth++;
  renderCal();
}

function toggleCalendar() {
  var w = document.getElementById('calWrap');
  if (!w) return;
  var showing = w.style.display !== 'none' && w.style.display !== '';
  w.style.display = showing ? 'none' : 'block';
  if (!showing) initCal();
}

/* ════ CALENDAR CONFIRM / CANCEL ════ */
function confirmSchedule() {
  if (!selectedDate || !selectedSlot) return;
  var ds = selectedDate.toLocaleDateString('es', { weekday:'long', day:'numeric', month:'long' });
  var b  = document.getElementById('scheduleBtnText');
  if (b) b.textContent = '✅ ' + ds + ' · ' + selectedSlot + ' VET';
  var w  = document.getElementById('calWrap');
  if (w) w.style.display = 'none';
}

function cancelSchedule() {
  selectedDate = null;
  selectedSlot = null;
  var w  = document.getElementById('calWrap');
  if (w) w.style.display = 'none';
  var b  = document.getElementById('scheduleBtnText');
  if (b) b.textContent = '📅 Seleccionar fecha y hora';
  var ts = document.getElementById('timeSlots');
  if (ts) ts.style.display = 'none';
}

/* ════════════════════════════════════════
   4. MODAL CONFIRMACIÓN FORMULARIO
════════════════════════════════════════ */
function openConfirmModal() {
  // Validate form first
  var nombre   = document.getElementById('cf-nombre');
  var apellido = document.getElementById('cf-apellido');
  var email    = document.getElementById('cf-email');
  var mensaje  = document.getElementById('cf-mensaje');

  if (!nombre || !nombre.value.trim())   { nombre.focus();   return; }
  if (!apellido || !apellido.value.trim()){ apellido.focus(); return; }
  if (!email || !email.value.trim())     { email.focus();    return; }
  if (!mensaje || !mensaje.value.trim()) { mensaje.focus();  return; }

  // Build summary
  var empresa  = document.getElementById('cf-empresa');
  var location = document.getElementById('location-text');
  var schedBtn = document.getElementById('scheduleBtnText');
  var phoneNum = document.getElementById('phoneNumber');
  var selCode  = document.getElementById('selectedCode');

  var rows = [
    { label: '👤 Nombre',   value: nombre.value.trim() + ' ' + apellido.value.trim() },
    { label: '✉️ Correo',   value: email.value.trim() },
    { label: '🏢 Empresa',  value: empresa && empresa.value.trim() ? empresa.value.trim() : '—' },
    { label: '💬 Mensaje',  value: mensaje.value.trim().substring(0,120) + (mensaje.value.length > 120 ? '…' : '') },
    { label: '📍 Ubicación',value: location ? location.textContent : '—' },
    { label: '📱 Teléfono', value: selCode && phoneNum && phoneNum.value.trim()
        ? selCode.textContent + ' ' + phoneNum.value.trim() : '—' },
    { label: '📅 Horario',  value: schedBtn ? schedBtn.textContent.replace('📅 ','').replace('✅ ','') : '—' },
  ];

  var html = rows.map(function(r) {
    return '<div style="display:flex;gap:.6rem;padding:.45rem .6rem;border-radius:8px;background:rgba(77,127,255,.05);border:1px solid rgba(77,127,255,.1)">' +
      '<span style="font-size:.78rem;color:var(--silver);min-width:90px;flex-shrink:0">' + r.label + '</span>' +
      '<span style="font-size:.83rem;color:var(--white);word-break:break-word">' + r.value + '</span>' +
      '</div>';
  }).join('');

  var summary = document.getElementById('confirmSummary');
  if (summary) summary.innerHTML = html;

  var modal = document.getElementById('confirmModal');
  if (modal) modal.style.display = 'flex';
}

function confirmYes() {
  var modal = document.getElementById('confirmModal');
  if (modal) modal.style.display = 'none';

  // Show loader
  if (window.TSLoader) TSLoader.show('Agendando tu cita...', 2200);

  setTimeout(function() {
    if (window.TSLoader) TSLoader.hide();

    // Hide all send buttons
    var btns = document.querySelectorAll('.send-btn');
    btns.forEach(function(b) { b.style.display = 'none'; });

    // Show success notification
    var ok = document.getElementById('form-ok');
    if (ok) ok.style.display = 'block';

    // Reset form after delay
    setTimeout(function() {
      var form = document.getElementById('contactForm');
      if (form) form.reset();
      // Reset schedule button text
      var sb = document.getElementById('scheduleBtnText');
      if (sb) sb.textContent = '📅 Seleccionar fecha y hora';
      var ts = document.getElementById('timeSlots');
      if (ts) ts.style.display = 'none';
      var cw = document.getElementById('calWrap');
      if (cw) cw.style.display = 'none';
      // Show review btn again, hide ok
      btns.forEach(function(b) {
        if (b.id !== 'realSendBtn') b.style.display = 'block';
      });
      if (ok) ok.style.display = 'none';
    }, 6000);
  }, 2100);
}

function confirmNo() {
  // Close modal and clear ALL form fields
  var modal = document.getElementById('confirmModal');
  if (modal) modal.style.display = 'none';

  var ids = ['cf-nombre','cf-apellido','cf-email','cf-empresa','cf-mensaje'];
  ids.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });

  // Also hide real send btn and show review btn again
  var realBtn = document.getElementById('realSendBtn');
  if (realBtn) realBtn.style.display = 'none';
  var btns = document.querySelectorAll('.send-btn');
  btns.forEach(function(b) {
    if (b.id !== 'realSendBtn') b.style.display = 'block';
  });
}
