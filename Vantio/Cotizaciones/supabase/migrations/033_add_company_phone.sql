-- Migration: Add Company Phone Column
-- Date: 2026-01-09

-- 1. Upgrade Clients Table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS company_phone TEXT;

-- 2. Upgrade Quotes Table
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS client_company_phone TEXT;

-- 3. Notify schema reload
NOTIFY pgrst, 'reload schema';

SELECT 'Schema updated with Company Phone field!' AS status;
