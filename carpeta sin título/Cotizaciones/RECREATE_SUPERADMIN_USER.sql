-- ============================================
-- RECREAR USUARIO SUPERADMIN CON CONTRASEÑA
-- ============================================
-- Este script elimina el usuario actual y crea uno nuevo
-- con email/password y rol de superadmin
-- ============================================

-- PASO 1: Eliminar registros relacionados primero
-- Eliminar invitaciones asociadas al usuario
DELETE FROM invitations WHERE invited_by IN (
    SELECT id FROM auth.users WHERE email = 'gsanchez@alfapack.cl'
);

-- Eliminar el perfil (si existe)
DELETE FROM profiles WHERE email = 'gsanchez@alfapack.cl';

-- Eliminar usuario de auth.users
DELETE FROM auth.users WHERE email = 'gsanchez@alfapack.cl';


-- PASO 2: Verificar que se eliminó
SELECT 'Usuario eliminado' as status, 
       COUNT(*) as usuarios_restantes 
FROM auth.users 
WHERE email = 'gsanchez@alfapack.cl';

-- ============================================
-- IMPORTANTE: Esto debe hacerse desde el Dashboard de Supabase
-- porque no podemos crear usuarios con contraseña desde SQL
-- 
-- Ve a: Authentication → Users → "Add user"
-- Email: gsanchez@alfapack.cl
-- Password: 123Momia.
-- ✅ Auto Confirm User: YES
-- 
-- Después de crear el usuario, continúa con el PASO 4
-- ============================================

-- PASO 4: Obtener el ID del nuevo usuario
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'gsanchez@alfapack.cl';

-- PASO 5: Crear/Actualizar perfil con rol superadmin
-- IMPORTANTE: Reemplaza 'NUEVO_USER_ID' con el ID obtenido en PASO 4

DO $$
DECLARE
    v_user_id UUID;
    v_org_id UUID := 'ca2d1743-fb12-4c73-b3fc-03b4bd93dd41'; -- Organization ID existente
BEGIN
    -- Obtener el ID del usuario recién creado
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'gsanchez@alfapack.cl';

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no encontrado. Asegúrate de haberlo creado en el Dashboard primero.';
    END IF;

    -- Crear o actualizar el perfil
    INSERT INTO profiles (id, email, full_name, role, organization_id, is_active)
    VALUES (
        v_user_id,
        'gsanchez@alfapack.cl',
        'Gonzalo Sanchez',
        'super_admin',
        v_org_id,
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        role = 'super_admin',
        organization_id = v_org_id,
        full_name = 'Gonzalo Sanchez',
        is_active = true,
        updated_at = NOW();

    -- Actualizar la organización para que este sea el super_admin
    UPDATE organizations
    SET super_admin_id = v_user_id
    WHERE id = v_org_id;

    -- Crear entrada en user_organizations
    INSERT INTO user_organizations (user_id, organization_id, role)
    VALUES (v_user_id, v_org_id, 'admin')
    ON CONFLICT (user_id, organization_id) DO UPDATE SET
        role = 'admin';

    RAISE NOTICE '✅ Usuario creado exitosamente como superadmin';
    RAISE NOTICE 'User ID: %', v_user_id;
    RAISE NOTICE 'Organization ID: %', v_org_id;
END $$;

-- PASO 6: Verificar que todo está correcto
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.organization_id,
    o.name as organization_name,
    CASE 
        WHEN p.role = 'super_admin' AND p.organization_id IS NOT NULL THEN '✅ TODO CORRECTO'
        ELSE '❌ FALTA CONFIGURACIÓN'
    END as status
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.email = 'gsanchez@alfapack.cl';
