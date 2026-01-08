-- FIX: Add missing columns causing save errors
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS client_address TEXT,
ADD COLUMN IF NOT EXISTS client_rut TEXT,
ADD COLUMN IF NOT EXISTS client_city TEXT,
ADD COLUMN IF NOT EXISTS client_contact TEXT;

-- Reload schema cache to apply changes immediately
NOTIFY pgrst, 'reload schema';

-- Verify columns (Optional)
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'quotes' 
AND column_name IN ('client_address', 'client_rut');
