-- ============================================
-- FIX: Agregar política para que usuarios vean su propio perfil
-- ============================================
-- El problema es que la política actual requiere organization_id
-- para ver perfiles, pero necesitas ver tu perfil para obtener
-- el organization_id. Esto crea un círculo vicioso.
-- ============================================

-- Eliminar la política problemática
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;

-- Crear dos políticas nuevas:
-- 1. Los usuarios SIEMPRE pueden ver su propio perfil
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
USING (id = auth.uid());

-- 2. Los usuarios pueden ver otros perfiles en su organización
CREATE POLICY "Users can view profiles in their organization"
ON profiles FOR SELECT
USING (
  organization_id IS NOT NULL 
  AND organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

-- Verificar que funciona
SELECT 
    id,
    email,
    role,
    organization_id
FROM profiles
WHERE email = 'gsanchez@alfapack.cl';
