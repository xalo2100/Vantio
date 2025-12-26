-- Add quote header border color customization to organization settings
-- Migration: 017_quote_header_color

-- Add column for customizable quote header border color
ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS quote_header_border_color VARCHAR(7) DEFAULT '#6B7280';

-- Add comment
COMMENT ON COLUMN organization_settings.quote_header_border_color IS 'Hex color code for quote header border (e.g., #6B7280)';
