-- Add currency and exchange_rate to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'CLP';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(10, 4) DEFAULT 1.0;

-- Update existing quotes to have CLP as default
UPDATE quotes SET currency = 'CLP', exchange_rate = 1.0 WHERE currency IS NULL;
