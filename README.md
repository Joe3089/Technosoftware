# Techno Software — Landing Page

Proyecto frontend con **Vite** — estructura limpia, modular y segura.

## 📁 Estructura
```
techno-software/
├── src/
│   ├── index.html          ← Landing page principal
│   ├── login.html          ← Página de acceso / registro
│   ├── assets/
│   │   └── logo.png        ← Logo oficial
│   ├── css/
│   │   ├── variables.css   ← Variables de diseño (colores, fuentes)
│   │   ├── reset.css       ← Reset y estilos base
│   │   ├── navbar.css      ← Barra de navegación
│   │   ├── hero.css        ← Sección hero (portada)
│   │   ├── sections.css    ← Quiénes Somos, Portafolio, Contacto
│   │   ├── footer.css      ← Pie de página
│   │   └── login.css       ← Página de login
│   └── js/
│       ├── main.js         ← Lógica principal (navbar, partículas, scroll)
│       └── login.js        ← Lógica de autenticación
├── package.json
├── vite.config.js
└── README.md
```

## 🚀 Instalación y uso
```bash
# 1. Instalar dependencias
npm install

# 2. Servidor de desarrollo (http://localhost:3000)
npm run dev

# 3. Construir para producción
npm run build

# 4. Previsualizar la build
npm run preview
```

## 🔒 Seguridad implementada
- **Content Security Policy (CSP)** — bloquea recursos externos no autorizados
- **X-Frame-Options: DENY** — previene clickjacking
- **X-Content-Type-Options: nosniff** — previene MIME sniffing
- **Referrer-Policy** — controla información de referencia
- **Permissions-Policy** — deshabilita cámara, micrófono, geolocalización
- **noindex en login** — la página de acceso no aparece en buscadores
- **autocomplete** correcto en formularios
- **novalidate + validación JS** controlada

## 🛠 Tecnologías
- **Vite 5** — bundler moderno, HMR, build optimizado
- **HTML5 + CSS3 + Vanilla JS** — sin dependencias innecesarias
- **ES Modules** — imports/exports nativos del navegador
- **CSS Variables** — theming centralizado
