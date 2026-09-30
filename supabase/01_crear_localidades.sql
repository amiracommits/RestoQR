-- Ejecutar primero. Se asume que public.restaurantes.id es UUID.
BEGIN;

CREATE TABLE public.localidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurante_id UUID NOT NULL,
    nombre TEXT NOT NULL CHECK (length(btrim(nombre)) > 0),
    CONSTRAINT localidades_restaurante_id_fkey
        FOREIGN KEY (restaurante_id) REFERENCES public.restaurantes (id),
    CONSTRAINT localidades_restaurante_nombre_key
        UNIQUE (restaurante_id, nombre),
    -- Permite validar el tenant en la relación con mesas.
    CONSTRAINT localidades_restaurante_id_id_key
        UNIQUE (restaurante_id, id)
);

COMMENT ON TABLE public.localidades IS
    'Áreas del restaurante que agrupan mesas, como terraza, barra o salones.';

COMMIT;
