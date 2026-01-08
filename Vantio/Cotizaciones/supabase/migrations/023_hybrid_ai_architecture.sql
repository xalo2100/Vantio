-- Migration: Add Hybrid AI Architecture support
-- Providers: Gemini, OpenRouter (Xiaomi/Qwen), Z.ai

ALTER TABLE organization_settings
ADD COLUMN IF NOT EXISTS openrouter_api_key TEXT,
ADD COLUMN IF NOT EXISTS zai_api_key TEXT,
ADD COLUMN IF NOT EXISTS ai_provider_priority JSONB DEFAULT '["gemini", "xiaomi", "zai", "qwen"]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_task_routing JSONB DEFAULT '{
    "insights": "gemini",
    "followup": "xiaomi",
    "marketing": "qwen",
    "stories": "xiaomi"
}'::jsonb;

-- Update comments
COMMENT ON COLUMN organization_settings.openrouter_api_key IS 'API key for OpenRouter (Xiaomi/Qwen)';
COMMENT ON COLUMN organization_settings.zai_api_key IS 'API key for Z.ai (GLM models)';
COMMENT ON COLUMN organization_settings.ai_provider_priority IS 'Ordered list of providers for fallback';
COMMENT ON COLUMN organization_settings.ai_task_routing IS 'Mapping of task types to preferred providers';
