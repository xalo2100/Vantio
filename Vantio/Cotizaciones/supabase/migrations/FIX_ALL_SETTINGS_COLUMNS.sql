-- FIX: Add all potentially missing columns to organization_settings
-- This script ensures the table schema matches the frontend requirements

ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS cloudflare_database_id TEXT,
ADD COLUMN IF NOT EXISTS cloudflare_api_token TEXT,
ADD COLUMN IF NOT EXISTS resend_api_key TEXT,
ADD COLUMN IF NOT EXISTS resend_from_email TEXT DEFAULT 'onboarding@resend.dev',
ADD COLUMN IF NOT EXISTS pipedrive_file_sync_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sidebar_bg_color TEXT DEFAULT '#0f3242',
ADD COLUMN IF NOT EXISTS sidebar_accent_color TEXT DEFAULT '#f97316',
ADD COLUMN IF NOT EXISTS sidebar_active_item_color TEXT DEFAULT '#f97316',
ADD COLUMN IF NOT EXISTS sidebar_text_color TEXT DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS app_bg_color TEXT DEFAULT '#fdfbf7',
ADD COLUMN IF NOT EXISTS show_sku_in_quotes BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS default_payment_terms TEXT,
ADD COLUMN IF NOT EXISTS default_delivery_time TEXT,
ADD COLUMN IF NOT EXISTS quote_header_border_color TEXT DEFAULT '#6B7280',
ADD COLUMN IF NOT EXISTS quote_logo_bg_color TEXT DEFAULT '#FFFFFF',
ADD COLUMN IF NOT EXISTS quote_logo_bg_transparent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_provider_priority TEXT DEFAULT 'openai',
ADD COLUMN IF NOT EXISTS ai_task_routing TEXT DEFAULT 'dynamic';

-- Force a refresh of the PostgREST schema cache
-- This is critical for the app to "see" the new columns
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Verify the columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'organization_settings';
