-- Migration: Multi-CRM Support
-- Date: 2025-12-15
-- Description: Add support for multiple CRM integrations (12 CRMs total)

-- ============================================
-- 1. CREATE CRM CONFIGURATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS crm_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  crm_type TEXT NOT NULL CHECK (crm_type IN (
    'pipedrive', 'goldmine', 'hubspot', 'defontana', 
    'odoo', 'upnify', 'crmchile', 'simply', 
    'sap', 'datacrm', 'netsuite', 'siebel',
    'salesforce', 'zoho', 'bitrix24', 'freshsales',
    'dynamics365', 'sugarcrm', 'insightly'
  )),
  is_enabled BOOLEAN DEFAULT false,
  credentials JSONB NOT NULL DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one config per CRM type per organization
  UNIQUE(organization_id, crm_type)
);

-- ============================================
-- 2. CREATE CRM FIELD MAPPINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS crm_field_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crm_config_id UUID REFERENCES crm_configurations(id) ON DELETE CASCADE NOT NULL,
  crm_field_name TEXT NOT NULL,
  internal_field_name TEXT NOT NULL,
  field_type TEXT DEFAULT 'string' CHECK (field_type IN ('string', 'number', 'date', 'boolean', 'json')),
  is_required BOOLEAN DEFAULT false,
  transform_function TEXT, -- Optional JS function to transform the value
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique mapping per CRM config and internal field
  UNIQUE(crm_config_id, internal_field_name)
);

-- ============================================
-- 3. CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_crm_configs_org ON crm_configurations(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_configs_type ON crm_configurations(crm_type);
CREATE INDEX IF NOT EXISTS idx_crm_configs_enabled ON crm_configurations(is_enabled);
CREATE INDEX IF NOT EXISTS idx_crm_field_mappings_config ON crm_field_mappings(crm_config_id);

-- ============================================
-- 4. MIGRATE EXISTING PIPEDRIVE DATA (IF EXISTS)
-- ============================================

-- Only migrate if the columns exist in organization_settings
DO $$
BEGIN
  -- Check if pipedrive columns exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_settings' 
    AND column_name = 'pipedrive_api_token'
  ) THEN
    -- Migrate Pipedrive credentials from organization_settings to crm_configurations
    INSERT INTO crm_configurations (organization_id, crm_type, is_enabled, credentials, settings, last_sync)
    SELECT 
      organization_id,
      'pipedrive' as crm_type,
      COALESCE(pipedrive_sync_enabled, false) as is_enabled,
      jsonb_build_object(
        'api_token', pipedrive_api_token,
        'company_domain', pipedrive_company_domain
      ) as credentials,
      '{}'::jsonb as settings,
      pipedrive_last_sync as last_sync
    FROM organization_settings
    WHERE pipedrive_api_token IS NOT NULL
    ON CONFLICT (organization_id, crm_type) DO NOTHING;
    
    RAISE NOTICE 'Pipedrive data migrated successfully';
  ELSE
    RAISE NOTICE 'No existing Pipedrive columns found, skipping migration';
  END IF;
END $$;

-- ============================================
-- 5. CREATE DEFAULT FIELD MAPPINGS FOR PIPEDRIVE
-- ============================================

-- Insert default field mappings for each Pipedrive configuration
INSERT INTO crm_field_mappings (crm_config_id, crm_field_name, internal_field_name, field_type, is_required)
SELECT 
  cc.id as crm_config_id,
  mapping.crm_field,
  mapping.internal_field,
  mapping.field_type,
  mapping.is_required
FROM crm_configurations cc
CROSS JOIN (
  VALUES 
    ('name', 'name', 'string', true),
    ('email', 'email', 'string', true),
    ('phone', 'phone', 'string', false),
    ('org_id', 'company', 'string', false),
    ('owner_id', 'owner_id', 'number', false)
) AS mapping(crm_field, internal_field, field_type, is_required)
WHERE cc.crm_type = 'pipedrive'
ON CONFLICT (crm_config_id, internal_field_name) DO NOTHING;

-- ============================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE crm_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_field_mappings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. RLS POLICIES FOR CRM CONFIGURATIONS
-- ============================================

-- Super admins can view all CRM configs in their organization
CREATE POLICY "Super admins can view CRM configs"
ON crm_configurations FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Super admins can insert CRM configs
CREATE POLICY "Super admins can insert CRM configs"
ON crm_configurations FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Super admins can update CRM configs
CREATE POLICY "Super admins can update CRM configs"
ON crm_configurations FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Super admins can delete CRM configs
CREATE POLICY "Super admins can delete CRM configs"
ON crm_configurations FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Service role can access all configs (for Edge Functions)
CREATE POLICY "Service role can access CRM configs"
ON crm_configurations FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 8. RLS POLICIES FOR FIELD MAPPINGS
-- ============================================

-- Super admins can view field mappings for their org's CRM configs
CREATE POLICY "Super admins can view field mappings"
ON crm_field_mappings FOR SELECT
USING (
  crm_config_id IN (
    SELECT id FROM crm_configurations 
    WHERE organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  )
);

-- Super admins can insert field mappings
CREATE POLICY "Super admins can insert field mappings"
ON crm_field_mappings FOR INSERT
WITH CHECK (
  crm_config_id IN (
    SELECT id FROM crm_configurations 
    WHERE organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  )
);

-- Super admins can update field mappings
CREATE POLICY "Super admins can update field mappings"
ON crm_field_mappings FOR UPDATE
USING (
  crm_config_id IN (
    SELECT id FROM crm_configurations 
    WHERE organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  )
);

-- Super admins can delete field mappings
CREATE POLICY "Super admins can delete field mappings"
ON crm_field_mappings FOR DELETE
USING (
  crm_config_id IN (
    SELECT id FROM crm_configurations 
    WHERE organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  )
);

-- Service role can access all mappings (for Edge Functions)
CREATE POLICY "Service role can access field mappings"
ON crm_field_mappings FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 9. CREATE UPDATE TRIGGER FUNCTION
-- ============================================

-- Create the function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER crm_configurations_updated_at
BEFORE UPDATE ON crm_configurations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 10. ADD HELPER FUNCTION TO GET ACTIVE CRMS
-- ============================================

CREATE OR REPLACE FUNCTION get_active_crms(org_id UUID)
RETURNS TABLE (
  id UUID,
  crm_type TEXT,
  credentials JSONB,
  settings JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id,
    cc.crm_type,
    cc.credentials,
    cc.settings
  FROM crm_configurations cc
  WHERE cc.organization_id = org_id
    AND cc.is_enabled = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DONE!
-- ============================================

SELECT 'Multi-CRM support schema created successfully!' AS status;
