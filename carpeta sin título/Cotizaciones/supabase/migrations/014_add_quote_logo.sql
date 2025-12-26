-- Add quote_logo_url to organization_settings
ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS quote_logo_url TEXT;

-- Verify if brand_color exists in organizations (as referenced in QuoteBuilder), if not add it there or in settings.
-- QuoteBuilder line 115 selects logo_url, brand_color from organizations.
-- If they don't exist in migration 000, they must be added. 
-- Assuming they exist or were added. 
-- Just focusing on quote_logo_url in organization_settings for now as it makes semantic sense.
