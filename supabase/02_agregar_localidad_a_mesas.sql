-- Ejecutar después de 01_crear_localidades.sql.
-- Las mesas existentes conservan localidad_id = NULL hasta asignarlas.
-- Se asume que public.mesas.restaurante_id es UUID.
BEGIN;

ALTER TABLE public.mesas
    ADD COLUMN localidad_id UUID,
    ADD CONSTRAINT mesas_localidad_requiere_restaurante_check
        CHECK (localidad_id IS NULL OR restaurante_id IS NOT NULL),
    ADD CONSTRAINT mesas_localidad_id_fkey
        FOREIGN KEY (restaurante_id, localidad_id)
        REFERENCES public.localidades (restaurante_id, id);

CREATE INDEX mesas_restaurante_localidad_idx
    ON public.mesas (restaurante_id, localidad_id);

COMMENT ON COLUMN public.mesas.localidad_id IS
    'Localidad a la que pertenece la mesa; debe ser del mismo restaurante.';

COMMIT;
