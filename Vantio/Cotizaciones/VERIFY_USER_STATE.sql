-- ============================================
-- VERIFICAR ESTADO ACTUAL DEL USUARIO
-- ============================================
-- Ejecuta esto para ver si el cambio se aplicó correctamente

SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.organization_id,
    o.name as organization_name,
    o.super_admin_id,
    CASE 
        WHEN p.organization_id IS NOT NULL THEN '✅ TIENE ORGANIZATION_ID'
        ELSE '❌ FALTA ORGANIZATION_ID'
    END as status
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.email = 'gsanchez@alfapack.cl';

-- ============================================
-- Si el resultado muestra que SÍ tiene organization_id
-- pero la app no lo detecta, el problema es de caché
-- ============================================
