-- Add branding settings to organization_settings
ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS sidebar_bg_color TEXT DEFAULT '#0f3242', -- Default petrol-500 approx
ADD COLUMN IF NOT EXISTS sidebar_accent_color TEXT DEFAULT '#f97316'; -- Default orange-500
