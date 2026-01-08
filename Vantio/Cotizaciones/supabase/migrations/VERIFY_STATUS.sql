-- ============================================
-- VERIFICACIÓN: Revisar Estado Actual
-- ============================================
-- Ejecuta este script para ver el estado actual de tu usuario

-- 1. Ver si la tabla organizations existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'organizations'
) AS organizations_exists;

-- 2. Ver todas las tablas que existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 3. Ver tu usuario actual
SELECT 
  id,
  email,
  full_name,
  role,
  organization_id,
  created_at
FROM profiles
WHERE email = 'gonzalosanchezmarambio@gmail.com';

-- 4. Ver organizaciones (si existen)
SELECT * FROM organizations;

-- 5. Ver el trigger actual
SELECT 
  tgname as trigger_name,
  tgenabled as enabled
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
