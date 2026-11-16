-- Ejecutar después de 15_agregar_propina_a_facturas.sql.
-- Conserva las políticas de otros flujos. Las políticas permisivas se combinan
-- con OR; el RPC también comprueba rol, tenant y estado explícitamente.
BEGIN;

ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.facturas TO authenticated;
GRANT UPDATE (valor_propina, total, updated_at) ON public.facturas TO authenticated;

DROP POLICY IF EXISTS facturas_select_cajero_tenant ON public.facturas;
CREATE POLICY facturas_select_cajero_tenant ON public.facturas
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.perfiles_admin p
  WHERE p.id = (SELECT auth.uid()) AND p.rol = 'cajero'
    AND p.restaurante_id = facturas.restaurante_id
));

DROP POLICY IF EXISTS facturas_update_cajero_tenant ON public.facturas;
CREATE POLICY facturas_update_cajero_tenant ON public.facturas
FOR UPDATE TO authenticated
USING (estado = 'generada' AND EXISTS (
  SELECT 1 FROM public.perfiles_admin p
  WHERE p.id = (SELECT auth.uid()) AND p.rol = 'cajero'
    AND p.restaurante_id = facturas.restaurante_id
))
WITH CHECK (estado = 'generada' AND EXISTS (
  SELECT 1 FROM public.perfiles_admin p
  WHERE p.id = (SELECT auth.uid()) AND p.rol = 'cajero'
    AND p.restaurante_id = facturas.restaurante_id
));

-- SECURITY INVOKER mantiene activas las RLS del usuario autenticado.
-- El bloqueo evita perder cambios simultáneos en total o propina.
CREATE OR REPLACE FUNCTION public.modificar_propina_factura(
  p_factura_id uuid,
  p_valor_propina numeric
)
RETURNS TABLE (valor_propina numeric, total numeric, valor_descuento numeric)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_factura public.facturas%ROWTYPE;
BEGIN
  IF p_valor_propina IS NULL OR p_valor_propina::text IN ('NaN', 'Infinity', '-Infinity')
     OR p_valor_propina < 0 OR p_valor_propina > 99999999.99
     OR p_valor_propina <> round(p_valor_propina, 2) THEN
    RAISE EXCEPTION 'La propina debe ser no negativa y tener máximo dos decimales.';
  END IF;

  SELECT f.* INTO v_factura FROM public.facturas f
  WHERE f.id = p_factura_id AND f.estado = 'generada'
    AND EXISTS (
      SELECT 1 FROM public.perfiles_admin p
      WHERE p.id = auth.uid() AND p.rol = 'cajero'
        AND p.restaurante_id = f.restaurante_id
    )
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solo un cajero del restaurante puede modificar la propina de una factura pendiente.';
  END IF;

  RETURN QUERY
  UPDATE public.facturas f
  SET valor_propina = p_valor_propina,
      total = coalesce(v_factura.total, 0) - coalesce(v_factura.valor_propina, 0) + p_valor_propina,
      updated_at = now()
  WHERE f.id = v_factura.id
  RETURNING f.valor_propina, f.total, f.valor_descuento;
END;
$function$;

REVOKE ALL ON FUNCTION public.modificar_propina_factura(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.modificar_propina_factura(uuid, numeric) TO authenticated;

COMMIT;
