-- Migration: Add SKU visibility setting to organization_settings
ALTER TABLE organization_settings
ADD COLUMN IF NOT EXISTS show_sku_in_quotes BOOLEAN DEFAULT true;

-- Update existing records to show SKU by default
UPDATE organization_settings SET show_sku_in_quotes = true WHERE show_sku_in_quotes IS NULL;
