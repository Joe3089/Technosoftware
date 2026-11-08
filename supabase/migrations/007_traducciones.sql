-- ═══════════════════════════════════════════════════════════════
-- Technosoftware — migración 007 (no destructiva, idempotente)
-- Caché compartida de traducciones automáticas de la web y la app.
-- Cada texto se traduce una sola vez por idioma; solo la usa la API (service role).
-- Ejecutar después de 006_contratacion_encuesta_resenas.sql.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.traducciones (
  idioma      text not null check (idioma in ('en-US', 'en-GB', 'pt-BR', 'pt-PT', 'it')),
  hash        text not null,                 -- sha256 del texto original
  original    text not null,
  traduccion  text not null,
  fuente      text not null default 'ia' check (fuente in ('ia', 'mymemory')),  -- mymemory = provisional
  created_at  timestamptz not null default now(),
  primary key (idioma, hash)
);

-- Sin políticas: nadie la lee ni escribe directamente desde el navegador
alter table public.traducciones enable row level security;

-- Si la tabla ya existía sin la columna
alter table public.traducciones add column if not exists fuente text not null default 'ia';
