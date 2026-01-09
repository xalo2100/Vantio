-- Migration: Add Appwrite Settings to Organization
-- Date: 2026-01-09

-- 1. Update organization_settings table
ALTER TABLE public.organization_settings 
ADD COLUMN IF NOT EXISTS appwrite_endpoint TEXT,
ADD COLUMN IF NOT EXISTS appwrite_project_id TEXT,
ADD COLUMN IF NOT EXISTS appwrite_database_id TEXT,
ADD COLUMN IF NOT EXISTS appwrite_api_key TEXT;

-- 2. Notify schema reload
NOTIFY pgrst, 'reload schema';

SELECT 'Appwrite settings columns added successfully!' AS status;
