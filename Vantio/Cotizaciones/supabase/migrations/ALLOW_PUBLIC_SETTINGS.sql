-- Allow public access to ORGANIZATION_SETTINGS (logo, colors)
-- This is needed for the Microsite to display the logo correctly
DROP POLICY IF EXISTS "Public can view org settings" ON organization_settings;
CREATE POLICY "Public can view org settings"
ON organization_settings FOR SELECT
TO public
USING (true);

-- Ensure RLS is enabled
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload config';
