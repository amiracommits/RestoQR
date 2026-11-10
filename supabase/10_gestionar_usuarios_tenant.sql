-- Ejecutar en el SQL Editor de Supabase antes de usar /admin/usuarios.
-- No modifica auth.users ni permite crear perfiles.
BEGIN;

CREATE OR REPLACE FUNCTION public.gestionar_usuarios_tenant(
  p_operacion text DEFAULT 'listar',
  p_id uuid DEFAULT NULL,
  p_nombre text DEFAULT NULL,
  p_rol text DEFAULT NULL
)
RETURNS TABLE (id uuid, nombre_usuario text, rol text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_restaurante uuid;
  v_rol text;
  v_afectados integer;
BEGIN
  SELECT perfil.restaurante_id, perfil.rol INTO v_restaurante, v_rol
  FROM public.perfiles_admin AS perfil WHERE perfil.id = auth.uid()
  FOR UPDATE;

  IF v_restaurante IS NULL OR v_rol IS NULL OR v_rol NOT IN ('admin', 'superadmin') THEN
    RAISE EXCEPTION 'No tienes permisos para gestionar usuarios de este restaurante.';
  END IF;

  IF p_operacion = 'editar' THEN
    IF p_nombre IS NULL OR btrim(p_nombre) = '' THEN
      RAISE EXCEPTION 'Ingresa el nombre para mostrar.';
    END IF;
    IF p_rol IS NULL OR p_rol NOT IN ('admin', 'cocina', 'cajero', 'superadmin', 'meseros', 'conta') THEN
      RAISE EXCEPTION 'Selecciona un rol válido.';
    END IF;
    IF p_id = auth.uid() AND p_rol <> v_rol THEN
      RAISE EXCEPTION 'No puedes cambiar tu propio rol desde esta pantalla.';
    END IF;
    UPDATE public.perfiles_admin AS perfil
      SET nombre_usuario = btrim(p_nombre), rol = p_rol, updated_at = now()
      WHERE perfil.id = p_id AND perfil.restaurante_id = v_restaurante;
    GET DIAGNOSTICS v_afectados = ROW_COUNT;
  ELSIF p_operacion = 'eliminar' THEN
    IF p_id = auth.uid() THEN
      RAISE EXCEPTION 'No puedes eliminar tu propio perfil.';
    END IF;
    DELETE FROM public.perfiles_admin AS perfil
      WHERE perfil.id = p_id AND perfil.restaurante_id = v_restaurante;
    GET DIAGNOSTICS v_afectados = ROW_COUNT;
  ELSIF p_operacion <> 'listar' OR p_operacion IS NULL THEN
    RAISE EXCEPTION 'Operación no válida.';
  END IF;

  IF p_operacion IN ('editar', 'eliminar') AND v_afectados = 0 THEN
    RAISE EXCEPTION 'El usuario ya no existe o no pertenece a tu restaurante.';
  END IF;

  RETURN QUERY SELECT perfil.id, perfil.nombre_usuario, perfil.rol
    FROM public.perfiles_admin AS perfil
    WHERE perfil.restaurante_id = v_restaurante
    ORDER BY perfil.nombre_usuario NULLS LAST, perfil.id;
END;
$function$;

REVOKE ALL ON FUNCTION public.gestionar_usuarios_tenant(text, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gestionar_usuarios_tenant(text, uuid, text, text) TO authenticated;

COMMIT;
