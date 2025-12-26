-- Add Quote Logo Background customization
ALTER TABLE public.organization_settings
ADD COLUMN IF NOT EXISTS quote_logo_bg_color text DEFAULT '#FFFFFF',
ADD COLUMN IF NOT EXISTS quote_logo_bg_transparent boolean DEFAULT false;

-- Fix missing organization_settings for existing organizations
-- This ensures the UI doesn't hang on "Loading..." or return null
INSERT INTO public.organization_settings (organization_id, default_sales_conditions)
SELECT 
    id, 
    '<p><strong>Condiciones Generales de Venta</strong></p><p>1. Validez de la oferta: 15 días.</p><p>2. Forma de pago: A convenir.</p><p>3. Plazo de entrega: Según disponibilidad.</p>'
FROM 
    public.organizations o
WHERE 
    NOT EXISTS (
        SELECT 1 FROM public.organization_settings os WHERE os.organization_id = o.id
    );
