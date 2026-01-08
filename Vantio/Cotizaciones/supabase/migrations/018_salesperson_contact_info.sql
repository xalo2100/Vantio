-- Add salesperson contact fields to profiles
-- Migration: 018_salesperson_contact_info

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS position VARCHAR(100);

COMMENT ON COLUMN profiles.phone IS 'Salesperson phone number for quotes';
COMMENT ON COLUMN profiles.position IS 'Salesperson job position/title';
