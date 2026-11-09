-- Ejecutar en el SQL Editor de Supabase antes de usar el cambio de cocina.
-- Resuelve nombres sin exponer el resto de las columnas de perfiles_admin.
BEGIN;

CREATE OR REPLACE FUNCTION public.obtener_usuarios_comandas(p_restaurante_id uuid)
RETURNS TABLE (pedido_id uuid, nombre_usuario text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT pedido.id, nullif(btrim(autor.nombre_usuario::text), '')
  FROM public.pedidos AS pedido
  JOIN public.perfiles_admin AS autor ON autor.id = pedido.usuario_id
  WHERE pedido.restaurante_id = p_restaurante_id
    AND pedido.estado = 'pendiente'
    AND EXISTS (
      SELECT 1
      FROM public.perfiles_admin AS solicitante
      WHERE solicitante.id = auth.uid()
        AND (
          solicitante.restaurante_id = p_restaurante_id
          OR solicitante.rol = 'super_admin'
        )
    );
$function$;

REVOKE ALL ON FUNCTION public.obtener_usuarios_comandas(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obtener_usuarios_comandas(uuid) TO authenticated;

COMMIT;
