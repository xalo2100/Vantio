-- ============================================
-- FIX: Actualizar Usuario Existente a Superadmin
-- ============================================
-- Este script actualiza un usuario existente para convertirlo en superadmin
-- Úsalo si ya te registraste ANTES de ejecutar la migración 012

-- PASO 1: Crear la organización Alfapack si no existe
INSERT INTO public.organizations (name, super_admin_id)
SELECT 
  'Alfapack',
  id
FROM auth.users
WHERE email = 'gonzalosanchezmarambio@gmail.com'
LIMIT 1
ON CONFLICT DO NOTHING;

-- PASO 2: Obtener el ID de la organización
DO $$
DECLARE
  org_id UUID;
  user1_id UUID;
  user2_id UUID;
BEGIN
  -- Obtener ID de la organización
  SELECT id INTO org_id FROM public.organizations WHERE name = 'Alfapack' LIMIT 1;
  
  -- Obtener IDs de usuarios
  SELECT id INTO user1_id FROM auth.users WHERE email = 'gonzalosanchezmarambio@gmail.com';
  SELECT id INTO user2_id FROM auth.users WHERE email = 'gsanchez@alfapack.cl';
  
  -- Actualizar primer usuario a superadmin
  IF user1_id IS NOT NULL THEN
    UPDATE public.profiles
    SET 
      role = 'super_admin',
      organization_id = org_id,
      updated_at = NOW()
    WHERE id = user1_id;
    
    RAISE NOTICE 'Usuario gonzalosanchezmarambio@gmail.com actualizado a superadmin';
  END IF;
  
  -- Actualizar segundo usuario a superadmin (si existe)
  IF user2_id IS NOT NULL THEN
    UPDATE public.profiles
    SET 
      role = 'super_admin',
      organization_id = org_id,
      updated_at = NOW()
    WHERE id = user2_id;
    
    RAISE NOTICE 'Usuario gsanchez@alfapack.cl actualizado a superadmin';
  END IF;
  
  -- Actualizar super_admin_id en la organización
  IF user1_id IS NOT NULL THEN
    UPDATE public.organizations
    SET super_admin_id = user1_id
    WHERE id = org_id;
  END IF;
  
  -- Crear configuración de organización si no existe
  INSERT INTO public.organization_settings (organization_id)
  VALUES (org_id)
  ON CONFLICT (organization_id) DO NOTHING;
  
END $$;

-- PASO 3: Verificar los cambios
SELECT 
  p.email,
  p.full_name,
  p.role,
  o.name as organization_name
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.email IN ('gonzalosanchezmarambio@gmail.com', 'gsanchez@alfapack.cl')
ORDER BY p.email;

SELECT 'Usuarios actualizados a superadmin exitosamente!' AS status;
