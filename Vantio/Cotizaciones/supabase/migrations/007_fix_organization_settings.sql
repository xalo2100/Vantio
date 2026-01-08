-- Migration: Add missing columns to organization_settings
-- Date: 2026-01-05

ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS openrouter_api_key TEXT,
ADD COLUMN IF NOT EXISTS qwen_api_key TEXT,
ADD COLUMN IF NOT EXISTS zai_api_key TEXT,
ADD COLUMN IF NOT EXISTS default_payment_terms TEXT,
ADD COLUMN IF NOT EXISTS default_delivery_time TEXT,
ADD COLUMN IF NOT EXISTS use_internal_crm BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_provider_priority JSONB DEFAULT '["gemini", "xiaomi", "zai", "qwen"]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_task_routing JSONB DEFAULT '{"insights": "gemini", "followup": "xiaomi", "marketing": "qwen", "data_extraction": "xiaomi"}'::jsonb,
ADD COLUMN IF NOT EXISTS quote_header_border_color TEXT DEFAULT '#6B7280',
ADD COLUMN IF NOT EXISTS quote_logo_bg_color TEXT DEFAULT '#FFFFFF',
ADD COLUMN IF NOT EXISTS quote_logo_bg_transparent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS show_sku_in_quotes BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS quote_logo_url TEXT,
ADD COLUMN IF NOT EXISTS sales_terms_templates JSONB DEFAULT '{}'::jsonb;

-- Ensure RLS is updated if necessary (though existing policies should work fine with new columns)
DO $$ 
BEGIN
    -- If there's any specific logic needed for new columns, add here.
END $$;
