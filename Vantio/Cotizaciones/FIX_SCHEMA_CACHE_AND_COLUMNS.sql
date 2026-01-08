-- Consolidated Branding and Settings Fix
-- This script ensures all columns expected by the UI exist in the organization_settings table
-- and reloads the PostgREST schema cache to resolve "Column not found" errors.

ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS resend_api_key TEXT,
ADD COLUMN IF NOT EXISTS quote_header_border_color TEXT DEFAULT '#6B7280',
ADD COLUMN IF NOT EXISTS quote_logo_bg_color TEXT DEFAULT '#FFFFFF',
ADD COLUMN IF NOT EXISTS quote_logo_bg_transparent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS show_sku_in_quotes BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS quote_logo_url TEXT,
ADD COLUMN IF NOT EXISTS sidebar_bg_color TEXT DEFAULT '#0f3242',
ADD COLUMN IF NOT EXISTS sidebar_accent_color TEXT DEFAULT '#f8f4f1',
ADD COLUMN IF NOT EXISTS sidebar_text_color TEXT DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS app_bg_color TEXT DEFAULT '#fdfbf7',
ADD COLUMN IF NOT EXISTS default_payment_terms TEXT,
ADD COLUMN IF NOT EXISTS default_delivery_time TEXT,
ADD COLUMN IF NOT EXISTS sales_terms_templates JSONB DEFAULT '{}'::jsonb;

-- Ensure columns exist in quotes table
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS client_phone TEXT,
ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Reload schema cache to fix "Column not found" errors
NOTIFY pgrst, 'reload schema';

-- Verification (Run this to check if columns exist)
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'organization_settings';
