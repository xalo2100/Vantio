-- Migration to separate Pipedrive Sync and File Upload functions
-- Run this in the Supabase SQL Editor

ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS pipedrive_file_sync_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sidebar_active_item_color TEXT DEFAULT '#f97316';

-- Update labels for branding to be more descriptive
COMMENT ON COLUMN organization_settings.sidebar_accent_color IS 'Color for logo box';
COMMENT ON COLUMN organization_settings.sidebar_active_item_color IS 'Color for active menu button and other highlights';

-- Refresh cache (CRITICAL to avoid "Could not find column in schema cache")
NOTIFY pgrst, 'reload schema';
ALTER ROLE authenticator SET pgrst.db_plan_enabled = false;
NOTIFY pgrst, 'reload config';
