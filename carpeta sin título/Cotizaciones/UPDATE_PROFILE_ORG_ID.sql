-- Verificar el estado actual del perfil en la tabla profiles
SELECT 
    id,
    email,
    full_name,
    role,
    organization_id,
    is_active
FROM profiles
WHERE email = 'gsanchez@alfapack.cl';

-- Si organization_id es NULL, actualizarlo
UPDATE profiles
SET organization_id = 'ca2d1743-fb12-4c73-b3fc-03b4bd93dd41'
WHERE email = 'gsanchez@alfapack.cl'
AND organization_id IS NULL;

-- Verificar de nuevo
SELECT 
    id,
    email,
    role,
    organization_id,
    CASE 
        WHEN organization_id IS NOT NULL THEN '✅ TIENE ORG ID'
        ELSE '❌ FALTA ORG ID'
    END as status
FROM profiles
WHERE email = 'gsanchez@alfapack.cl';
