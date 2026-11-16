-- Ejecutar sobre la tabla definida en 14_facturas.sql.
-- Las facturas existentes y las nuevas tendrán valor_propina = 0 por defecto.
BEGIN;

ALTER TABLE public.facturas
    ADD COLUMN valor_propina NUMERIC(10, 2) NOT NULL DEFAULT 0,
    ADD CONSTRAINT facturas_valor_propina_check CHECK (valor_propina >= 0);

COMMENT ON COLUMN public.facturas.valor_propina IS
    'Importe monetario de la propina de la factura; no es un porcentaje.';

COMMIT;
