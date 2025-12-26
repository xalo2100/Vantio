-- ULTIMATE FIX for Organization Settings
-- 1. Ensure Columns Exist
ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS quote_logo_bg_color text DEFAULT '#FFFFFF',
ADD COLUMN IF NOT EXISTS quote_logo_bg_transparent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS quote_header_border_color text DEFAULT '#6B7280';

-- 2. Reset RLS Policies (Clean Slate)
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their org settings" ON organization_settings;
DROP POLICY IF EXISTS "Users can update their org settings" ON organization_settings;
DROP POLICY IF EXISTS "Users can view their org settings" ON organization_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON organization_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON organization_settings;

-- 3. Create Robust Policies
-- Allow viewing settings if you belong to the org
CREATE POLICY "Users can view their org settings"
ON organization_settings FOR SELECT
USING (
  auth.uid() IN (SELECT id FROM profiles WHERE organization_id = organization_settings.organization_id)
);

-- Allow updating settings if you belong to the org
CREATE POLICY "Users can update their org settings"
ON organization_settings FOR UPDATE
USING (
  auth.uid() IN (SELECT id FROM profiles WHERE organization_id = organization_settings.organization_id)
);

-- Allow inserting settings if you belong to the org
CREATE POLICY "Users can insert their org settings"
ON organization_settings FOR INSERT
WITH CHECK (
  auth.uid() IN (SELECT id FROM profiles WHERE organization_id = organization_settings.organization_id)
);

-- 4. Force Data (Verification)
INSERT INTO organization_settings (organization_id, default_sales_conditions)
SELECT id, '<h3>✅ SISTEMA REPARADO</h3><p>Ahora puedes editar esto en Configuración y guardar.</p>'
FROM organizations
ON CONFLICT (organization_id) 
DO UPDATE SET default_sales_conditions = '<h3>✅ SISTEMA REPARADO</h3><p>Ahora puedes editar esto en Configuración y guardar.</p>';

NOTIFY pgrst, 'reload config';
