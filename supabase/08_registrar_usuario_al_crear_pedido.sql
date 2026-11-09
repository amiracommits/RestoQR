-- Ejecutar después de 07_agregar_usuario_a_pedidos.sql.
-- Captura el usuario de la sesión al insertar desde cualquier RPC, incluido
-- agregar_pedido_mesero. No requiere modificar la firma ni el cuerpo del RPC.
-- auth.uid() identifica al usuario del JWT incluso en RPCs SECURITY DEFINER.
-- No modifica pedidos existentes ni atribuye usuarios a pedidos anónimos.
BEGIN;

CREATE OR REPLACE FUNCTION public.asignar_usuario_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_usuario_id uuid := auth.uid();
BEGIN
  IF v_usuario_id IS NOT NULL THEN
    -- Usa la identidad de la sesión, aunque se envíe otro ID al insertar.
    NEW.usuario_id := v_usuario_id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS pedidos_asignar_usuario_insert ON public.pedidos;

CREATE TRIGGER pedidos_asignar_usuario_insert
BEFORE INSERT ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.asignar_usuario_pedido();

COMMIT;
