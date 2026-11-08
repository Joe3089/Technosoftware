-- 013 · Tiempo real para la gestión interna. Ejecutar después de 012.
-- La app escucha INSERT en auditoria (cada cambio de cualquier área) y en notificaciones.
-- Realtime aplica RLS con la sesión de cada suscriptor: solo recibe eventos de lo que puede ver.
do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['auditoria', 'notificaciones'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
