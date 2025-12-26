-- ============================================
-- DIAGNÓSTICO DE SUPERADMIN
-- ============================================
-- Ejecuta este script en Supabase SQL Editor para diagnosticar
-- el problema de detección de rol de superadmin
-- ============================================

-- 1. Ver todos los usuarios en auth.users
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- 2. Ver todos los perfiles y sus roles
SELECT 
    id,
    email,
    full_name,
    role,
    organization_id,
    is_active,
    created_at
FROM profiles
ORDER BY created_at DESC;

-- 3. Buscar usuarios con email específico (reemplaza con tu email)
-- IMPORTANTE: Reemplaza 'tu-email@ejemplo.com' con el email del superadmin
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.organization_id,
    p.is_active,
    o.name as organization_name,
    o.super_admin_id
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.email ILIKE '%@alfapack.cl%'  -- Ajusta según tu dominio
ORDER BY p.created_at DESC;

-- 4. Ver organizaciones y sus super_admin_id
SELECT 
    id,
    name,
    super_admin_id,
    created_at
FROM organizations
ORDER BY created_at DESC;

-- 5. Verificar si hay perfiles sin rol o con rol incorrecto
SELECT 
    id,
    email,
    role,
    CASE 
        WHEN role IS NULL THEN '❌ ROL NULO'
        WHEN role NOT IN ('super_admin', 'admin', 'vendedor') THEN '❌ ROL INVÁLIDO'
        ELSE '✅ ROL VÁLIDO'
    END as status
FROM profiles
WHERE role IS NULL OR role NOT IN ('super_admin', 'admin', 'vendedor');

-- ============================================
-- SOLUCIÓN: Si encuentras que tu usuario NO tiene role='super_admin'
-- ============================================

-- PASO 1: Identifica tu user ID (reemplaza el email)
-- SELECT id FROM profiles WHERE email = 'tu-email@ejemplo.com';

-- PASO 2: Actualiza el rol a super_admin (reemplaza el ID)
-- UPDATE profiles 
-- SET role = 'super_admin' 
-- WHERE id = 'tu-user-id-aqui';

-- PASO 3: Verifica el cambio
-- SELECT id, email, role FROM profiles WHERE id = 'tu-user-id-aqui';
