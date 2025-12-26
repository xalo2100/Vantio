-- Script para agregar columnas faltantes a la tabla 'products'
-- Ejecuta esto en el SQL Editor de Supabase

-- Agregar columna sales_conditions si no existe
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sales_conditions TEXT;

-- Agregar columna technical_specs si no existe (por si acaso también falta)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS technical_specs TEXT;

-- Agregar columna video_url si no existe
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Agregar columna additional_images si no existe
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS additional_images TEXT[] DEFAULT '{}';

-- Asegurar que organization_settings tenga default_sales_conditions
ALTER TABLE organization_settings
ADD COLUMN IF NOT EXISTS default_sales_conditions TEXT;

-- Recargar el caché del esquema (esto es automático en Supabase, pero bueno saberlo)
NOTIFY pgrst, 'reload schema';
