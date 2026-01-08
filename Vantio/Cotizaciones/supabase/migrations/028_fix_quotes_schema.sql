-- MASTER FIX: Ensures all columns exist and reloads cache for the quotes table
-- Run this in Supabase SQL Editor

ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(12,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS payment_terms TEXT,
ADD COLUMN IF NOT EXISTS delivery_time TEXT,
ADD COLUMN IF NOT EXISTS client_phone TEXT,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Reload cache for PostgREST
NOTIFY pgrst, 'reload schema';

SELECT '¡Base de datos Maestra actualizada!' AS resultado;
