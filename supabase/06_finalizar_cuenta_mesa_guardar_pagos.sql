-- Ejecutar después de 05_finalizar_cuenta_mesa_pago_mixto.sql.
-- Crea una versión de cinco argumentos, sin eliminar la versión anterior.
-- Conserva el cuerpo original, su propietario y SECURITY DEFINER/INVOKER.
-- El guardado de pagos y la finalización se ejecutan en una transacción.
BEGIN;

DO $migration$
DECLARE
  v_original regprocedure := to_regprocedure('public.finalizar_cuenta_mesa(uuid,text)');
  v_definicion text;
  v_cuerpo text;
  v_cuerpo_nuevo text;
  v_propietario text;
  v_preparacion text := $body$
  -- Bloquear y validar antes de guardar los montos o cerrar la cuenta.
  PERFORM 1 FROM public.facturas
  WHERE id = target_factura_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factura % no existe', target_factura_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.facturas
    WHERE id = target_factura_id AND estado = 'generada'
  ) THEN
    RAISE EXCEPTION 'La factura no está disponible para cobrar.';
  END IF;

  IF p_pago_efectivo IS NULL OR p_pago_tarjeta IS NULL OR p_pago_transferencia IS NULL
     OR p_pago_efectivo::text IN ('NaN', 'Infinity', '-Infinity')
     OR p_pago_tarjeta::text IN ('NaN', 'Infinity', '-Infinity')
     OR p_pago_transferencia::text IN ('NaN', 'Infinity', '-Infinity')
     OR p_pago_efectivo < 0 OR p_pago_tarjeta < 0 OR p_pago_transferencia < 0
     OR p_pago_efectivo <> round(p_pago_efectivo, 2)
     OR p_pago_tarjeta <> round(p_pago_tarjeta, 2)
     OR p_pago_transferencia <> round(p_pago_transferencia, 2) THEN
    RAISE EXCEPTION 'Los pagos deben ser no negativos y tener máximo dos decimales.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.facturas WHERE id = target_factura_id
    AND p_pago_efectivo + p_pago_tarjeta + p_pago_transferencia > coalesce(total, 0)
  ) THEN
    RAISE EXCEPTION 'La suma de los pagos no puede superar el total de la factura.';
  END IF;

  UPDATE public.facturas SET
    pago_efectivo = CASE WHEN p_forma_pago = 'mixto' THEN p_pago_efectivo
                        WHEN p_forma_pago = 'efectivo' THEN coalesce(total, 0) ELSE 0 END,
    pago_tarjeta = CASE WHEN p_forma_pago = 'mixto' THEN p_pago_tarjeta
                       WHEN p_forma_pago = 'tarjeta' THEN coalesce(total, 0) ELSE 0 END,
    pago_transferencia = CASE WHEN p_forma_pago = 'mixto' THEN p_pago_transferencia
                             WHEN p_forma_pago = 'transferencia' THEN coalesce(total, 0) ELSE 0 END
  WHERE id = target_factura_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se pudo guardar el desglose de pagos. Revisa los permisos de la función.';
  END IF;
$body$;
BEGIN
  IF v_original IS NULL THEN
    RAISE EXCEPTION 'No existe public.finalizar_cuenta_mesa(uuid,text).';
  END IF;

  SELECT pg_get_functiondef(oid), prosrc, pg_get_userbyid(proowner)
  INTO v_definicion, v_cuerpo, v_propietario
  FROM pg_proc WHERE oid = v_original::oid;

  -- Evita cambiar privilegios para solucionar RLS: conserva los de la función base.
  IF NOT (SELECT prosecdef FROM pg_proc WHERE oid = v_original::oid) THEN
    RAISE EXCEPTION 'La función original es SECURITY INVOKER. Revisa su autorización antes de aplicar esta migración: no puede eludir RLS.';
  END IF;

  IF v_cuerpo !~* $pattern$p_forma_pago\s+not\s+in\s*\([^)]*'mixto'$pattern$ THEN
    RAISE EXCEPTION 'Primero ejecuta el script 05 para permitir pago mixto.';
  END IF;

  -- Inserta las validaciones dentro del BEGIN original, conservando su lógica.
  v_cuerpo_nuevo := regexp_replace(v_cuerpo, '\mBEGIN\M', 'BEGIN' || chr(10) || v_preparacion, 'i');
  IF v_cuerpo_nuevo = v_cuerpo THEN
    RAISE EXCEPTION 'No se encontró el BEGIN esperado. No se modificó la función.';
  END IF;

  v_definicion := replace(v_definicion, v_cuerpo, v_cuerpo_nuevo);
  v_definicion := replace(
    v_definicion,
    'finalizar_cuenta_mesa(target_factura_id uuid, p_forma_pago text)',
    'finalizar_cuenta_mesa(target_factura_id uuid, p_forma_pago text, p_pago_efectivo numeric, p_pago_tarjeta numeric, p_pago_transferencia numeric)'
  );
  IF position('p_pago_transferencia numeric)' IN v_definicion) = 0 THEN
    RAISE EXCEPTION 'La firma original no coincide con la esperada.';
  END IF;

  EXECUTE v_definicion;
  EXECUTE format(
    'ALTER FUNCTION public.finalizar_cuenta_mesa(uuid,text,numeric,numeric,numeric) OWNER TO %I',
    v_propietario
  );
END;
$migration$;

REVOKE ALL ON FUNCTION public.finalizar_cuenta_mesa(uuid,text,numeric,numeric,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalizar_cuenta_mesa(uuid,text,numeric,numeric,numeric) TO authenticated;

COMMIT;
