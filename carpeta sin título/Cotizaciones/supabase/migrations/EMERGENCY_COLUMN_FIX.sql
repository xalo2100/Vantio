-- EMERGENCY FIX: Add missing column that is causing the crash
-- The previous scripts missed this specific column "quote_logo_url"

ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS quote_logo_url text;

-- Also ensure others are there just in case
ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS quote_logo_bg_color text DEFAULT '#FFFFFF',
ADD COLUMN IF NOT EXISTS quote_logo_bg_transparent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS quote_header_border_color text DEFAULT '#6B7280';

-- Force a refresh of the schema cache
NOTIFY pgrst, 'reload config';
