-- Add Resend API Key to organization_settings
ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS resend_api_key TEXT;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
