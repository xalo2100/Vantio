-- Agregar columna logo_url a la tabla organizations
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Recargar esquema
NOTIFY pgrst, 'reload schema';
