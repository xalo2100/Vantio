-- Migration to insert default organization_settings for existing organizations that lack them
-- This fixes the issue where new or migrated organizations return 'null' for settings fetch.

INSERT INTO public.organization_settings (organization_id, default_sales_conditions)
SELECT 
    id as organization_id, 
    '<p><strong>Condiciones Generales de Venta</strong></p><p>1. Validez de la oferta: 15 días.</p><p>2. Forma de pago: A convenir.</p><p>3. Plazo de entrega: Según disponibilidad.</p>' as default_sales_conditions
FROM 
    public.organizations o
WHERE 
    NOT EXISTS (
        SELECT 1 FROM public.organization_settings os WHERE os.organization_id = o.id
    );

-- Log the result (optional, but good for confirmation if run manually)
DO $$
DECLARE
    row_count integer;
BEGIN
    GET DIAGNOSTICS row_count = ROW_COUNT;
    RAISE NOTICE 'Inserted % default settings rows.', row_count;
END $$;
