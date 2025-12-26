-- Force update ALL organization settings to have a visible test value
-- This verifies if the Frontend is capable of reading from the Database at all.

INSERT INTO organization_settings (organization_id, default_sales_conditions)
SELECT id, '<h3>✅ PRUEBA DE CONEXIÓN EXITOSA</h3><p>Si ves este texto, el Cotizador lee correctamente la base de datos.</p>'
FROM organizations
ON CONFLICT (organization_id) 
DO UPDATE SET default_sales_conditions = '<h3>✅ PRUEBA DE CONEXIÓN EXITOSA</h3><p>Si ves este texto, el Cotizador lee correctamente la base de datos.</p>';
