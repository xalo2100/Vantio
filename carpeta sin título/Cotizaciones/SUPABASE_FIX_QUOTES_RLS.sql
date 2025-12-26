-- SOLUCIÓN COMPLETA: Políticas RLS para quotes
-- Incluye acceso público para micrositios

-- PASO 1: Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Enable read access for users and admins" ON quotes;
DROP POLICY IF EXISTS "Public access for row" ON quotes;
DROP POLICY IF EXISTS "quotes_select_policy" ON quotes;
DROP POLICY IF EXISTS "quotes_insert_policy" ON quotes;
DROP POLICY IF EXISTS "quotes_update_policy" ON quotes;
DROP POLICY IF EXISTS "quotes_delete_policy" ON quotes;
DROP POLICY IF EXISTS "quotes_public_read" ON quotes;

-- PASO 2: Crear política de SELECT con acceso público para micrositios
CREATE POLICY "quotes_select_policy"
ON quotes FOR SELECT
USING (
  -- Acceso público de lectura (para micrositios)
  true
);

-- PASO 3: Crear política de INSERT (solo usuarios autenticados)
CREATE POLICY "quotes_insert_policy"
ON quotes FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

-- PASO 4: Crear política de UPDATE
CREATE POLICY "quotes_update_policy"
ON quotes FOR UPDATE
USING (
  -- El usuario puede actualizar sus propias cotizaciones
  auth.uid() = user_id
  OR
  -- O si es admin de la misma organización
  EXISTS (
    SELECT 1 FROM profiles p1
    JOIN profiles p2 ON p1.organization_id = p2.organization_id
    WHERE p1.id = auth.uid()
    AND p2.id = quotes.user_id
    AND p1.role IN ('admin', 'super_admin')
  )
  OR
  -- O si no hay usuario autenticado (para que clientes puedan aceptar/rechazar)
  auth.uid() IS NULL
);

-- PASO 5: Crear política de DELETE (solo usuarios autenticados)
CREATE POLICY "quotes_delete_policy"
ON quotes FOR DELETE
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM profiles p1
    JOIN profiles p2 ON p1.organization_id = p2.organization_id
    WHERE p1.id = auth.uid()
    AND p2.id = quotes.user_id
    AND p1.role IN ('admin', 'super_admin')
  )
);

-- PASO 6: Asegurar que RLS esté habilitado
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- PASO 7: Verificar las políticas creadas
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'quotes'
ORDER BY policyname;
