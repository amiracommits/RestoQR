-- Ejecutar después de 01_crear_localidades.sql.
-- El restaurante indicado debe existir. Puede repetirse sin duplicar datos.
BEGIN;

INSERT INTO public.localidades (restaurante_id, nombre)
VALUES
    ('969435c5-b28d-43a6-8b4a-8eef93eb884d', 'terraza'),
    ('969435c5-b28d-43a6-8b4a-8eef93eb884d', 'barra'),
    ('969435c5-b28d-43a6-8b4a-8eef93eb884d', 'salon principal'),
    ('969435c5-b28d-43a6-8b4a-8eef93eb884d', 'salon el capitan')
ON CONFLICT (restaurante_id, nombre) DO NOTHING;

COMMIT;
