-- FIX SETTINGS RLS POLICIES
-- Run this in Supabase SQL Editor to allow users to save settings.

-- 1. DROP existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can insert their org settings" ON organization_settings;
DROP POLICY IF EXISTS "Users can update their org settings" ON organization_settings;

-- 2. Create INSERT Policy
CREATE POLICY "Users can insert their org settings"
ON organization_settings FOR INSERT
WITH CHECK (organization_id IN (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
));

-- 3. Create UPDATE Policy
CREATE POLICY "Users can update their org settings"
ON organization_settings FOR UPDATE
USING (organization_id IN (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
));

-- 4. Verify we didn't break SELECT
DROP POLICY IF EXISTS "Users can view their org settings" ON organization_settings;
CREATE POLICY "Users can view their org settings"
ON organization_settings FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
));

-- 5. Force enable RLS just in case
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

SELECT 'RLS Policies updated successfully!' as result;
