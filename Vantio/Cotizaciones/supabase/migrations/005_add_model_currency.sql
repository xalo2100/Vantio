-- Agregar campos de Modelo y Moneda a Productos
-- Ejecuta este script en el SQL Editor de Supabase

ALTER TABLE products ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'CLP' CHECK (currency IN ('CLP', 'USD', 'EUR'));
