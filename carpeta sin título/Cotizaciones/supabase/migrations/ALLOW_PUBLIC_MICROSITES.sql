-- Allow public access to QUOTES for microsites
-- We use a policy that allows SELECT to everyone (public/anon)
DROP POLICY IF EXISTS "Public can view quotes" ON quotes;
CREATE POLICY "Public can view quotes"
ON quotes FOR SELECT
TO public
USING (true);

-- Allow public access to ORGANIZATIONS (names, logos, etc)
-- Needed to display branding on the microsite
DROP POLICY IF EXISTS "Public can view organizations" ON organizations;
CREATE POLICY "Public can view organizations"
ON organizations FOR SELECT
TO public
USING (true);

-- Ensure RLS is enabled (should be already, but safety first)
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload config';
