-- Migration: Add Detailed Location and Client Data Columns
-- Date: 2026-01-09

-- 1. Upgrade Clients Table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS city TEXT; -- Ensure city is explicitly there even if it existed in some versions

-- 2. Upgrade Quotes Table for full persistence
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS client_region TEXT,
ADD COLUMN IF NOT EXISTS client_city TEXT,
ADD COLUMN IF NOT EXISTS client_rut TEXT;

-- 3. Notify schema reload
NOTIFY pgrst, 'reload schema';

SELECT 'Schema updated with detailed location fields!' AS status;
