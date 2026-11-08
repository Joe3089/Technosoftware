-- ═══════════════════════════════════════════════════════════════
-- Technosoftware — migración 009 (idempotente)
-- Conciliación de recargas: después de que administración APRUEBA un pago,
-- se concilia contra el abono de la billetera y la tasa BCV, y la IA deja
-- una nota de conciliación. La IA no verifica ni aprueba pagos.
-- Ejecutar después de 008_seguridad.sql.
-- ═══════════════════════════════════════════════════════════════

alter table public.recargas add column if not exists conciliacion  jsonb;        -- { estado, controles[], nota, tasa_bcv, at }
alter table public.recargas add column if not exists conciliado_at timestamptz;

-- Columnas de una versión previa (verificación automática con IA), retirada antes de usarse en producción
drop index if exists public.recargas_comprobante_hash_idx;
alter table public.recargas drop column if exists verificacion;
alter table public.recargas drop column if exists verificado_at;
alter table public.recargas drop column if exists comprobante_hash;

create index if not exists recargas_referencia_idx on public.recargas (lower(referencia)) where referencia is not null;
