-- Migration: Customer Follow-up and Loyalty System
-- Date: 2025-12-15
-- Description: Sistema de seguimiento de clientes con integración a Pipedrive

-- ============================================
-- 1. CREATE CLIENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  pipedrive_person_id INTEGER UNIQUE,
  
  -- Client Information
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Tracking
  last_contact_date TIMESTAMPTZ,
  last_purchase_date TIMESTAMPTZ,
  total_purchases NUMERIC(12, 2) DEFAULT 0,
  purchase_count INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'needs_followup')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. CREATE CLIENT INTERACTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS client_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  
  -- Interaction Details
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('call', 'email', 'meeting', 'quote_sent', 'deal_won', 'other')),
  notes TEXT,
  
  -- Pipedrive Reference
  pipedrive_activity_id INTEGER,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. CREATE CLIENT PURCHASES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS client_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  
  -- Purchase Details
  pipedrive_deal_id INTEGER,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT DEFAULT 'CLP' CHECK (currency IN ('CLP', 'USD', 'EUR')),
  
  -- Dates
  purchase_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. ADD FOLLOWUP SETTINGS TO ORGANIZATION_SETTINGS
-- ============================================

ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS followup_days_threshold INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS followup_include_quotes BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS followup_dashboard_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS followup_email_notifications BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS followup_last_sync TIMESTAMPTZ;

-- ============================================
-- 5. CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_to ON clients(assigned_to);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_last_contact_date ON clients(last_contact_date);
CREATE INDEX IF NOT EXISTS idx_clients_pipedrive_person_id ON clients(pipedrive_person_id);

CREATE INDEX IF NOT EXISTS idx_client_interactions_client_id ON client_interactions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_interactions_user_id ON client_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_client_interactions_organization_id ON client_interactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_interactions_created_at ON client_interactions(created_at);

CREATE INDEX IF NOT EXISTS idx_client_purchases_client_id ON client_purchases(client_id);
CREATE INDEX IF NOT EXISTS idx_client_purchases_organization_id ON client_purchases(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_purchases_purchase_date ON client_purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_client_purchases_pipedrive_deal_id ON client_purchases(pipedrive_deal_id);

-- ============================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_purchases ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. RLS POLICIES FOR CLIENTS
-- ============================================

-- Vendedores pueden ver sus clientes asignados
CREATE POLICY "Users can view their assigned clients"
ON clients FOR SELECT
USING (
  assigned_to = auth.uid() 
  OR organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Admins pueden crear clientes
CREATE POLICY "Admins can create clients"
ON clients FOR INSERT
WITH CHECK (organization_id IN (
  SELECT organization_id FROM profiles 
  WHERE id = auth.uid() 
  AND role IN ('admin', 'super_admin')
));

-- Usuarios pueden actualizar sus clientes asignados
CREATE POLICY "Users can update their assigned clients"
ON clients FOR UPDATE
USING (
  assigned_to = auth.uid()
  OR organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Admins pueden eliminar clientes
CREATE POLICY "Admins can delete clients"
ON clients FOR DELETE
USING (organization_id IN (
  SELECT organization_id FROM profiles 
  WHERE id = auth.uid() 
  AND role IN ('admin', 'super_admin')
));

-- ============================================
-- 8. RLS POLICIES FOR CLIENT INTERACTIONS
-- ============================================

-- Usuarios pueden ver interacciones de sus clientes
CREATE POLICY "Users can view interactions of their clients"
ON client_interactions FOR SELECT
USING (
  client_id IN (
    SELECT id FROM clients 
    WHERE assigned_to = auth.uid()
  )
  OR organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Usuarios pueden crear interacciones para sus clientes
CREATE POLICY "Users can create interactions for their clients"
ON client_interactions FOR INSERT
WITH CHECK (
  client_id IN (
    SELECT id FROM clients 
    WHERE assigned_to = auth.uid()
  )
  OR organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- ============================================
-- 9. RLS POLICIES FOR CLIENT PURCHASES
-- ============================================

-- Usuarios pueden ver compras de sus clientes
CREATE POLICY "Users can view purchases of their clients"
ON client_purchases FOR SELECT
USING (
  client_id IN (
    SELECT id FROM clients 
    WHERE assigned_to = auth.uid()
  )
  OR organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Sistema puede insertar compras (desde Edge Functions)
CREATE POLICY "System can insert purchases"
ON client_purchases FOR INSERT
WITH CHECK (true);

-- ============================================
-- 10. TRIGGERS
-- ============================================

CREATE TRIGGER clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 11. FUNCTION TO UPDATE CLIENT STATUS
-- ============================================

CREATE OR REPLACE FUNCTION update_client_followup_status()
RETURNS void AS $$
DECLARE
  threshold_days INTEGER;
  org_record RECORD;
BEGIN
  -- Para cada organización
  FOR org_record IN 
    SELECT organization_id, followup_days_threshold 
    FROM organization_settings 
    WHERE followup_days_threshold IS NOT NULL
  LOOP
    -- Actualizar clientes que necesitan seguimiento
    UPDATE clients
    SET status = 'needs_followup'
    WHERE organization_id = org_record.organization_id
      AND status = 'active'
      AND (
        last_contact_date IS NULL 
        OR last_contact_date < NOW() - (org_record.followup_days_threshold || ' days')::INTERVAL
      );
    
    -- Actualizar clientes que ya fueron contactados
    UPDATE clients
    SET status = 'active'
    WHERE organization_id = org_record.organization_id
      AND status = 'needs_followup'
      AND last_contact_date IS NOT NULL
      AND last_contact_date >= NOW() - (org_record.followup_days_threshold || ' days')::INTERVAL;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DONE!
-- ============================================

SELECT 'Customer Follow-up System schema created successfully!' AS status;
