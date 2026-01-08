-- ============================================
-- CONFIGURACIÓN INICIAL DE ORGANIZACIÓN Y USUARIO
-- ============================================
-- Ejecuta este script DESPUÉS de crear las tablas con NUEVA_DB_SETUP.sql
-- y DESPUÉS de iniciar sesión por primera vez en la aplicación
-- ============================================

-- PASO 1: Obtener tu User ID
-- Ejecuta esta consulta primero para obtener tu user_id
SELECT id, email, raw_user_meta_data->>'full_name' as nombre
FROM auth.users
ORDER BY created_at DESC;

-- Copia el 'id' de tu usuario y reemplázalo en las siguientes consultas

-- ============================================
-- PASO 2: Crear tu Organización
-- ============================================
-- Reemplaza 'NOMBRE_DE_TU_EMPRESA' con el nombre real de tu empresa
-- Reemplaza 'TU_USER_ID_AQUI' con el id que obtuviste en el PASO 1

INSERT INTO organizations (name, super_admin_id)
VALUES ('NOMBRE_DE_TU_EMPRESA', 'TU_USER_ID_AQUI')
RETURNING id, name;

-- Copia el 'id' de la organización que se creó

-- ============================================
-- PASO 3: Actualizar tu Perfil
-- ============================================
-- Reemplaza 'ORGANIZATION_ID_AQUI' con el id de la organización del PASO 2
-- Reemplaza 'TU_USER_ID_AQUI' con tu user_id del PASO 1

UPDATE profiles
SET 
  organization_id = 'ORGANIZATION_ID_AQUI',
  role = 'super_admin',
  is_active = true,
  invitation_accepted_at = NOW()
WHERE id = 'TU_USER_ID_AQUI'
RETURNING id, email, full_name, role, organization_id;

-- ============================================
-- PASO 4: Crear Configuración de Organización
-- ============================================
-- Reemplaza 'ORGANIZATION_ID_AQUI' con el id de la organización del PASO 2

INSERT INTO organization_settings (
  organization_id,
  default_sales_conditions
)
VALUES (
  'ORGANIZATION_ID_AQUI',
  'Condiciones generales de venta por defecto. Edita este texto desde la configuración de la aplicación.'
)
RETURNING id, organization_id;

-- ============================================
-- PASO 5: Verificar la Configuración
-- ============================================
-- Ejecuta esta consulta para verificar que todo está correcto

SELECT 
  o.id as org_id,
  o.name as org_name,
  p.id as user_id,
  p.email,
  p.full_name,
  p.role,
  os.id as settings_id
FROM organizations o
JOIN profiles p ON p.organization_id = o.id
LEFT JOIN organization_settings os ON os.organization_id = o.id
WHERE p.id = auth.uid();

-- Si ves tu información correctamente, ¡la configuración está completa! ✅

-- ============================================
-- OPCIONAL: Crear Productos de Ejemplo
-- ============================================
-- Puedes crear algunos productos de ejemplo para probar la aplicación
-- Reemplaza 'ORGANIZATION_ID_AQUI' y 'TU_USER_ID_AQUI'

INSERT INTO products (
  organization_id,
  created_by,
  name,
  description,
  category,
  unit_price,
  currency,
  is_active
)
VALUES 
(
  'ORGANIZATION_ID_AQUI',
  'TU_USER_ID_AQUI',
  'Producto de Ejemplo 1',
  'Este es un producto de ejemplo para probar el sistema',
  'Electrónica',
  99990,
  'CLP',
  true
),
(
  'ORGANIZATION_ID_AQUI',
  'TU_USER_ID_AQUI',
  'Producto de Ejemplo 2',
  'Otro producto de ejemplo',
  'Servicios',
  150000,
  'CLP',
  true
)
RETURNING id, name, unit_price, currency;

-- ============================================
-- ✅ CONFIGURACIÓN COMPLETADA
-- ============================================
