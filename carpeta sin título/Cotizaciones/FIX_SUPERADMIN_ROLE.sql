-- Script para asignar organización al usuario
-- Ejecuta este script en Supabase SQL Editor

-- 1. Ver el estado actual
SELECT 
    p.id as profile_id,
    p.email,
    p.full_name,
    p.role,
    p.organization_id,
    o.name as org_name
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.email = 'gsanchez@alfapack.cl'; -- Cambia por tu email

-- 2. Ver todas las organizaciones disponibles
SELECT 
    id,
    name,
    super_admin_id,
    created_at
FROM organizations
ORDER BY created_at DESC;

-- 3. SOLUCIÓN A: Si existe una organización, asignarla al usuario
-- Descomenta y ejecuta después de verificar el ID de la organización

/*
-- Obtener el ID de la primera organización
DO $$
DECLARE
    org_id UUID;
    user_id UUID;
BEGIN
    -- Obtener el ID del usuario
    SELECT id INTO user_id FROM profiles WHERE email = 'gsanchez@alfapack.cl';
    
    -- Obtener el ID de la primera organización
    SELECT id INTO org_id FROM organizations ORDER BY created_at LIMIT 1;
    
    -- Actualizar el perfil con la organización y rol super_admin
    UPDATE profiles
    SET 
        organization_id = org_id,
        role = 'super_admin'
    WHERE id = user_id;
    
    -- Actualizar la organización para que este usuario sea el super_admin
    UPDATE organizations
    SET super_admin_id = user_id
    WHERE id = org_id;
    
    RAISE NOTICE 'Usuario actualizado con organización % y rol super_admin', org_id;
END $$;
*/

-- 4. SOLUCIÓN B: Si NO existe ninguna organización, crear una nueva
-- Descomenta y ejecuta si no hay organizaciones

/*
DO $$
DECLARE
    new_org_id UUID;
    user_id UUID;
BEGIN
    -- Obtener el ID del usuario
    SELECT id INTO user_id FROM profiles WHERE email = 'gsanchez@alfapack.cl';
    
    -- Crear nueva organización
    INSERT INTO organizations (name, super_admin_id)
    VALUES ('AlfaPack', user_id)
    RETURNING id INTO new_org_id;
    
    -- Actualizar el perfil
    UPDATE profiles
    SET 
        organization_id = new_org_id,
        role = 'super_admin'
    WHERE id = user_id;
    
    -- Crear configuración de organización
    INSERT INTO organization_settings (organization_id)
    VALUES (new_org_id)
    ON CONFLICT (organization_id) DO NOTHING;
    
    RAISE NOTICE 'Nueva organización creada con ID: %', new_org_id;
END $$;
*/

-- 5. Verificar que todo está correcto
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.organization_id,
    o.name as organization_name,
    o.super_admin_id,
    CASE 
        WHEN p.id = o.super_admin_id THEN 'SÍ ✅'
        ELSE 'NO ❌'
    END as es_super_admin_de_org
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.email = 'gsanchez@alfapack.cl';
