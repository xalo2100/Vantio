-- ============================================
-- VERIFICAR POLÍTICAS RLS ACTUALES
-- ============================================
-- Ver todas las políticas activas en la tabla profiles

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- ============================================
-- PROBAR CONSULTA COMO USUARIO AUTENTICADO
-- ============================================
-- Simular lo que hace useRole hook

SELECT 
    id,
    email,
    full_name,
    role,
    organization_id,
    is_active
FROM profiles
WHERE id = 'b8ee86cd-a246-4fde-a4f2-8d1f305a6ad7';

-- ============================================
-- VER TODOS LOS USUARIOS (como super_admin)
-- ============================================

SELECT 
    id,
    email,
    full_name,
    role,
    organization_id,
    is_active
FROM profiles
ORDER BY created_at DESC;
