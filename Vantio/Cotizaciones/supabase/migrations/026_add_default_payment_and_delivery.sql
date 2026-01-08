-- Migración: Agregar términos de pago y entrega por defecto a la configuración de la organización
-- Propósito: Permitir que los usuarios configuren valores predeterminados para nuevas cotizaciones

ALTER TABLE organization_settings
ADD COLUMN IF NOT EXISTS default_payment_terms TEXT DEFAULT '50% anticipo, 50% contra entrega',
ADD COLUMN IF NOT EXISTS default_delivery_time TEXT DEFAULT '15 a 20 días hábiles';

-- Comentario para documentación
COMMENT ON COLUMN organization_settings.default_payment_terms IS 'Términos de pago por defecto para nuevas cotizaciones';
COMMENT ON COLUMN organization_settings.default_delivery_time IS 'Plazo de entrega por defecto para nuevas cotizaciones';

-- Mensaje de éxito
SELECT 'Migración 026 completada exitosamente!' AS status;
