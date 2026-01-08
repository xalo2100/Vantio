-- Migration: Cloudflare Database Configuration
-- Purpose: Store Cloudflare database ID and API token for secondary database integration

ALTER TABLE organization_settings
ADD COLUMN IF NOT EXISTS cloudflare_database_id TEXT,
ADD COLUMN IF NOT EXISTS cloudflare_api_token TEXT;

COMMENT ON COLUMN organization_settings.cloudflare_database_id IS 'Cloudflare D1 Database ID';
COMMENT ON COLUMN organization_settings.cloudflare_api_token IS 'Cloudflare API Token for database access';

-- Verify columns
SELECT 'Migration 027 (Cloudflare Config) completed successfully!' AS status;
