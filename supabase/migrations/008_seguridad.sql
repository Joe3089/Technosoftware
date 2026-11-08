-- ═══════════════════════════════════════════════════════════════
-- Technosoftware — migración 008 (no destructiva, idempotente)
-- Endurecimiento: un usuario no puede cambiar su rol ni su correo de perfil
-- (el correo debe coincidir siempre con la cuenta autenticada).
-- Ejecutar después de 007_traducciones.sql.
-- ═══════════════════════════════════════════════════════════════

create or replace function public.protect_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Solo un administrador puede cambiar roles';
    end if;
    if new.email is distinct from old.email or new.id is distinct from old.id then
      raise exception 'El correo y el identificador del perfil no se pueden modificar';
    end if;
  end if;
  return new;
end $$;

-- Función interna (SECURITY DEFINER): no expuesta vía la API REST /rpc a anónimos ni usuarios
revoke execute on function public.tiene_proyecto_contratado(uuid) from public, anon, authenticated;
