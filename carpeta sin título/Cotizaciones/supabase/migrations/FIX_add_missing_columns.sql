-- Script para agregar SOLO las columnas faltantes
-- Ejecuta esto si la tabla products ya existe

-- Agregar columnas nuevas a products
ALTER TABLE products ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'CLP' CHECK (currency IN ('CLP', 'USD', 'EUR'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS main_image TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS additional_images JSONB DEFAULT '[]';
ALTER TABLE products ADD COLUMN IF NOT EXISTS technical_specs TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sales_conditions TEXT;

-- Mensaje de éxito
SELECT 'Columnas agregadas exitosamente!' AS resultado;
