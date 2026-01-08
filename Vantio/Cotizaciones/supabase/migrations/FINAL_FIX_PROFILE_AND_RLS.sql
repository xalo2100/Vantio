-- ============================================
-- SOLUCIÓN COMPLETA: Crear Perfil + Arreglar RLS
-- ============================================
-- Este script crea el perfil del usuario si no existe
-- y arregla las políticas RLS para permitir acceso

-- PASO 1: Deshabilitar RLS temporalmente para insertar datos
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- PASO 2: Insertar o actualizar el perfil del usuario
INSERT INTO profiles (id, email, full_name, role, is_active)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', SPLIT_PART(email, '@', 1)) as full_name,
  'super_admin' as role,
  true as is_active
FROM auth.users
WHERE email = 'gonzalosanchezmarambio@gmail.com'
ON CONFLICT (id) 
DO UPDATE SET 
  role = 'super_admin',
  updated_at = NOW();

-- PASO 3: Verificar que el perfil se creó
SELECT 
  id,
  email,
  full_name,
  role,
  organization_id,
  created_at
FROM profiles
WHERE email = 'gonzalosanchezmarambio@gmail.com';

-- PASO 4: Reactivar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- PASO 5: Eliminar políticas antiguas
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- PASO 6: Crear políticas simples y permisivas
CREATE POLICY "Enable read access for authenticated users"
ON profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable update for users based on id"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (true);

-- PASO 7: Verificar las políticas
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles';

SELECT '✅ Perfil creado y políticas RLS configuradas correctamente' AS status;
