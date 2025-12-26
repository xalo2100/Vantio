-- ============================================
-- FIX: Agregar política para permitir INSERT en profiles
-- ============================================
-- El problema es que cuando un usuario inicia sesión por primera vez
-- con Google OAuth, Supabase intenta crear un perfil automáticamente
-- pero no hay política RLS que permita INSERT
-- ============================================

-- Ver políticas actuales de INSERT
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'INSERT';

-- Eliminar la política si existe
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Crear política para permitir que los usuarios creen su propio perfil
CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- Verificar que se creó
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'INSERT';
