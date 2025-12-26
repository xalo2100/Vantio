-- Script para arreglar permisos de eliminación (AlfaQuote)
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Eliminar política de eliminación existente (para evitar conflictos)
DROP POLICY IF EXISTS "Users can delete org products" ON products;
DROP POLICY IF EXISTS "Users can delete their own quotes" ON products; -- Por si acaso tenía otro nombre

-- 2. Crear la política de eliminación correcta
-- Permite eliminar si el usuario pertenece a la misma organización que el producto
CREATE POLICY "Users can delete org products" 
ON products 
FOR DELETE 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- 3. Asegurar que RLS está activo
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 4. Recargar caché
NOTIFY pgrst, 'reload schema';
