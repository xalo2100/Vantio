-- Add more branding settings to organization_settings
ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS sidebar_text_color TEXT DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS app_bg_color TEXT DEFAULT '#fdfbf7'; -- Default beige-50 approx
