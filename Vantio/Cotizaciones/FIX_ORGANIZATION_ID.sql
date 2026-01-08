-- ============================================
-- FIX: Asignar Organization ID al Superadmin
-- ============================================
-- PROBLEMA: El usuario tiene role='super_admin' pero organization_id=NULL
-- SOLUCIÓN: Crear/asignar organización al superadmin
-- ============================================

-- PASO 1: Ver el estado actual del usuario
SELECT 
    id,
    email,
    full_name,
    role,
    organization_id,
    is_active
FROM profiles
WHERE email = 'gsanchez@alfapack.cl';

-- PASO 2: Ver si existe una organización
SELECT * FROM organizations ORDER BY created_at DESC;

-- ============================================
-- OPCIÓN A: Si YA EXISTE una organización
-- ============================================
-- Asignar el usuario a la organización existente
-- REEMPLAZA 'ORGANIZATION_ID_AQUI' con el ID de la organización que viste en PASO 2

-- UPDATE profiles 
-- SET organization_id = 'ORGANIZATION_ID_AQUI'
-- WHERE email = 'gsanchez@alfapack.cl';

-- ============================================
-- OPCIÓN B: Si NO EXISTE ninguna organización
-- ============================================
-- Crear una nueva organización y asignar el usuario

-- 1. Crear la organización
INSERT INTO organizations (name, super_admin_id)
VALUES (
    'Alfapack',  -- Nombre de tu empresa
    (SELECT id FROM profiles WHERE email = 'gsanchez@alfapack.cl')
)
RETURNING id;

-- 2. Copiar el ID que te devolvió el comando anterior y usarlo aquí:
-- REEMPLAZA 'ORGANIZATION_ID_DEVUELTO' con el ID que obtuviste

-- UPDATE profiles 
-- SET organization_id = 'ORGANIZATION_ID_DEVUELTO'
-- WHERE email = 'gsanchez@alfapack.cl';

-- ============================================
-- OPCIÓN C: Todo en uno (RECOMENDADO)
-- ============================================
-- Este script hace todo automáticamente

DO $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_existing_org_id UUID;
BEGIN
    -- Obtener el ID del usuario
    SELECT id INTO v_user_id 
    FROM profiles 
    WHERE email = 'gsanchez@alfapack.cl';
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no encontrado';
    END IF;
    
    -- Verificar si ya existe una organización
    SELECT id INTO v_existing_org_id 
    FROM organizations 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    IF v_existing_org_id IS NOT NULL THEN
        -- Si existe, usar esa organización
        v_org_id := v_existing_org_id;
        RAISE NOTICE 'Usando organización existente: %', v_org_id;
        
        -- Actualizar super_admin_id de la organización
        UPDATE organizations 
        SET super_admin_id = v_user_id 
        WHERE id = v_org_id;
    ELSE
        -- Si no existe, crear una nueva
        INSERT INTO organizations (name, super_admin_id)
        VALUES ('Alfapack', v_user_id)
        RETURNING id INTO v_org_id;
        
        RAISE NOTICE 'Nueva organización creada: %', v_org_id;
    END IF;
    
    -- Asignar la organización al usuario
    UPDATE profiles 
    SET organization_id = v_org_id
    WHERE id = v_user_id;
    
    RAISE NOTICE 'Usuario actualizado con organization_id: %', v_org_id;
    
    -- Crear configuración inicial de la organización si no existe
    INSERT INTO organization_settings (organization_id)
    VALUES (v_org_id)
    ON CONFLICT (organization_id) DO NOTHING;
    
    RAISE NOTICE 'Configuración de organización creada/verificada';
END $$;

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
-- Ejecuta esto para confirmar que todo está correcto

SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    p.role,
    p.organization_id,
    o.name as organization_name,
    o.super_admin_id,
    CASE 
        WHEN p.organization_id IS NOT NULL THEN '✅ CORRECTO'
        ELSE '❌ FALTA ORGANIZATION_ID'
    END as status
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.email = 'gsanchez@alfapack.cl';
