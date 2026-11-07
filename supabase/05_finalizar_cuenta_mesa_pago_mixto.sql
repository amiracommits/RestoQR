-- Ejecutar en el SQL Editor de Supabase.
-- Requiere que facturas_forma_pago_check ya permita 'mixto'.
-- Actualiza la función existente sin alterar su firma, permisos,
-- SECURITY DEFINER/INVOKER ni configuración de search_path.
BEGIN;

DO $migration$
DECLARE
  v_funcion regprocedure;
  v_definicion text;
  v_actualizada text;
BEGIN
  v_funcion := to_regprocedure('public.finalizar_cuenta_mesa(uuid,text)');

  IF v_funcion IS NULL THEN
    RAISE EXCEPTION 'No existe public.finalizar_cuenta_mesa(uuid,text). Verifica la firma de la función.';
  END IF;

  SELECT pg_get_functiondef(v_funcion::oid) INTO v_definicion;

  -- La validación pasa a aceptar:
  -- p_forma_pago NOT IN ('efectivo', 'tarjeta', 'transferencia', 'mixto')
  v_actualizada := regexp_replace(
    v_definicion,
    $pattern$p_forma_pago\s+not\s+in\s*\(\s*'efectivo'\s*,\s*'tarjeta'\s*,\s*'transferencia'\s*\)$pattern$,
    $replacement$p_forma_pago not in ('efectivo', 'tarjeta', 'transferencia', 'mixto')$replacement$,
    'i'
  );

  IF v_actualizada = v_definicion THEN
    IF v_definicion ~* $pattern$p_forma_pago\s+not\s+in\s*\(\s*'efectivo'\s*,\s*'tarjeta'\s*,\s*'transferencia'\s*,\s*'mixto'\s*\)$pattern$ THEN
      RAISE NOTICE 'La función ya acepta pago mixto.';
      RETURN;
    END IF;

    RAISE EXCEPTION 'La validación de forma de pago no coincide con la definición esperada. No se modificó la función.';
  END IF;

  -- pg_get_functiondef devuelve CREATE OR REPLACE FUNCTION completo.
  -- Conserva el lock, numeración legal, actualización de factura,
  -- liberación de mesa y actualización de pedidos originales.
  EXECUTE v_actualizada;
END;
$migration$;

COMMIT;
