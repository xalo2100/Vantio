-- Add missing columns for quote customization
ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS quote_logo_bg_color text DEFAULT '#FFFFFF',
ADD COLUMN IF NOT EXISTS quote_logo_bg_transparent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS quote_header_border_color text DEFAULT '#6B7280';

-- Force a schema cache reload (sometimes needed in Supabase)
NOTIFY pgrst, 'reload config';
