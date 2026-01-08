-- ============================================
-- ACTUALIZACIÓN DIRECTA: Cambiar Rol a Super Admin
-- ============================================
-- Este script actualiza DIRECTAMENTE tu rol a super_admin
-- Es la forma más simple y directa

-- PASO 1: Actualizar el rol a super_admin
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'gonzalosanchezmarambio@gmail.com';

-- PASO 2: Verificar el cambio
SELECT 
  email,
  role,
  organization_id,
  updated_at
FROM public.profiles
WHERE email = 'gonzalosanchezmarambio@gmail.com';

-- Debería mostrar: role = 'super_admin'
