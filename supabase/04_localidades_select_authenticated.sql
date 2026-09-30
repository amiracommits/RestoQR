-- Ejecutar después de 01_crear_localidades.sql en el SQL Editor de Supabase.
-- Permite a cualquier usuario autenticado leer localidades de todos los restaurantes.
-- Puede repetirse: solo reemplaza la política de lectura definida aquí.
BEGIN;

ALTER TABLE public.localidades ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE public.localidades TO authenticated;

DROP POLICY IF EXISTS localidades_select_authenticated ON public.localidades;

CREATE POLICY localidades_select_authenticated
    ON public.localidades
    FOR SELECT
    TO authenticated
    USING (true);

COMMIT;
