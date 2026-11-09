-- Ejecutar en el SQL Editor de Supabase.
-- Usuario autenticado que registró el pedido (por ejemplo, desde caja).
-- Los pedidos existentes y los creados sin usuario pueden conservar NULL.
BEGIN;

ALTER TABLE public.pedidos
  ADD COLUMN usuario_id uuid NULL,
  ADD CONSTRAINT pedidos_usuario_id_fkey
    FOREIGN KEY (usuario_id)
    REFERENCES auth.users (id)
    ON DELETE SET NULL;

CREATE INDEX pedidos_usuario_id_idx ON public.pedidos (usuario_id);

COMMENT ON COLUMN public.pedidos.usuario_id IS
  'ID del usuario autenticado que registró el pedido. NULL para pedidos sin usuario identificado.';

COMMIT;
