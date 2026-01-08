-- Migration: Create Clients System (Consolidated)
-- Date: 2026-01-06
-- Description: Creates clients, interactions, and purchases tables with all necessary fields.

-- 1. Create Clients Table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  pipedrive_person_id INTEGER UNIQUE,
  
  -- Client Information
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  rut TEXT,
  city TEXT,
  address TEXT,
  internal_notes TEXT,
  sync_to_crm BOOLEAN DEFAULT true,
  
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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT clients_organization_id_rut_key UNIQUE (organization_id, rut)
);

-- 2. Create Client Interactions Table
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

-- 3. Create Client Purchases Table
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

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_to ON clients(assigned_to);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_client_interactions_client_id ON client_interactions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_purchases_client_id ON client_purchases(client_id);

-- 5. Enable Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_purchases ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
DROP POLICY IF EXISTS "Users can manage their org clients" ON clients;
CREATE POLICY "Users can manage their org clients"
ON clients FOR ALL
USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
));

DROP POLICY IF EXISTS "Users can view interactions of their clients" ON client_interactions;
CREATE POLICY "Users can view interactions of their clients"
ON client_interactions FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create interactions" ON client_interactions;
CREATE POLICY "Users can create interactions"
ON client_interactions FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view purchases of their clients" ON client_purchases;
CREATE POLICY "Users can view purchases of their clients"
ON client_purchases FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

-- 7. Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS clients_updated_at ON clients;
CREATE TRIGGER clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
