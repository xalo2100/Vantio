-- Migration: Add specific Qwen API Key field
ALTER TABLE organization_settings
ADD COLUMN IF NOT EXISTS qwen_api_key TEXT;

COMMENT ON COLUMN organization_settings.qwen_api_key IS 'Specific API key for Qwen (DashScope or direct provider)';
