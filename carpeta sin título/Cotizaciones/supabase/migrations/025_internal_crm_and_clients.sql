-- Migration: Internal CRM and Clients support (Update)
-- This adds missing industrial fields to the existing clients table.

-- 1. Add toggle to organization_settings
ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS use_internal_crm BOOLEAN DEFAULT false;

-- 2. Add missing columns to existing clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS rut TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- 3. Add unique constraint for RUT within organization if not already there
-- Note: This might fail if there are existing duplicates, 
-- so we wrap it in a DO block to be safe.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'clients_organization_id_rut_key'
    ) THEN
        ALTER TABLE clients ADD CONSTRAINT clients_organization_id_rut_key UNIQUE (organization_id, rut);
    END IF;
END $$;

-- 4. Ensure RLS policies are broad enough for management
DROP POLICY IF EXISTS "Users can manage their org clients" ON clients;
CREATE POLICY "Users can manage their org clients"
ON clients FOR ALL
USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
));

COMMENT ON COLUMN organization_settings.use_internal_crm IS 'Whether to use the built-in client management system';
