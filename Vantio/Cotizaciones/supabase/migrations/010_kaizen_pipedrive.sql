-- Migration: Add Kaizen Insights System
-- Date: 2025-11-28

-- ============================================
-- 1. CREATE INSIGHTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('improvement', 'recognition', 'alert', 'pattern', 'benchmark')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  actions JSONB DEFAULT '[]',
  metrics JSONB,
  expected_impact TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  is_read BOOLEAN DEFAULT false,
  generated_by TEXT CHECK (generated_by IN ('ai', 'admin')),
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_insights_user_id ON insights(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_organization_id ON insights(organization_id);
CREATE INDEX IF NOT EXISTS idx_insights_is_read ON insights(is_read);
CREATE INDEX IF NOT EXISTS idx_insights_created_at ON insights(created_at);
CREATE INDEX IF NOT EXISTS idx_insights_type ON insights(type);
CREATE INDEX IF NOT EXISTS idx_insights_priority ON insights(priority);

-- ============================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS POLICIES FOR INSIGHTS
-- ============================================

-- Sellers can view their own insights
CREATE POLICY "Users can view their own insights"
ON insights FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all org insights
CREATE POLICY "Admins can view org insights"
ON insights FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM profiles 
  WHERE id = auth.uid() 
  AND role IN ('admin', 'super_admin')
));

-- Admins can create insights
CREATE POLICY "Admins can create insights"
ON insights FOR INSERT
WITH CHECK (organization_id IN (
  SELECT organization_id FROM profiles 
  WHERE id = auth.uid() 
  AND role IN ('admin', 'super_admin')
));

-- Users can update their own insights (mark as read)
CREATE POLICY "Users can update their own insights"
ON insights FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can update any org insight
CREATE POLICY "Admins can update org insights"
ON insights FOR UPDATE
USING (organization_id IN (
  SELECT organization_id FROM profiles 
  WHERE id = auth.uid() 
  AND role IN ('admin', 'super_admin')
));

-- ============================================
-- 5. UPDATE TRIGGER
-- ============================================

CREATE TRIGGER insights_updated_at
BEFORE UPDATE ON insights
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 6. MODIFY organization_settings FOR PIPEDRIVE
-- ============================================

ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS pipedrive_api_token TEXT,
ADD COLUMN IF NOT EXISTS pipedrive_company_domain TEXT,
ADD COLUMN IF NOT EXISTS pipedrive_sync_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pipedrive_last_sync TIMESTAMPTZ;

-- ============================================
-- 7. CREATE PIPEDRIVE SYNC LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS pipedrive_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('person', 'deal', 'organization')),
  entity_id TEXT NOT NULL,
  pipedrive_id INTEGER,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'sync')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. CREATE INDEXES FOR SYNC LOG
-- ============================================

CREATE INDEX IF NOT EXISTS idx_sync_log_organization ON pipedrive_sync_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_entity ON pipedrive_sync_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_pipedrive ON pipedrive_sync_log(pipedrive_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_status ON pipedrive_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_sync_log_created_at ON pipedrive_sync_log(created_at);

-- ============================================
-- 9. MODIFY QUOTES TABLE FOR PIPEDRIVE
-- ============================================

ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS pipedrive_deal_id INTEGER,
ADD COLUMN IF NOT EXISTS pipedrive_person_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_quotes_pipedrive_deal ON quotes(pipedrive_deal_id);
CREATE INDEX IF NOT EXISTS idx_quotes_pipedrive_person ON quotes(pipedrive_person_id);

-- ============================================
-- 10. RLS POLICIES FOR PIPEDRIVE SYNC LOG
-- ============================================

ALTER TABLE pipedrive_sync_log ENABLE ROW LEVEL SECURITY;

-- Admins can view sync logs
CREATE POLICY "Admins can view sync logs"
ON pipedrive_sync_log FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM profiles 
  WHERE id = auth.uid() 
  AND role IN ('admin', 'super_admin')
));

-- System can insert sync logs
CREATE POLICY "System can insert sync logs"
ON pipedrive_sync_log FOR INSERT
WITH CHECK (true);

-- ============================================
-- DONE!
-- ============================================

SELECT 'Kaizen Insights and Pipedrive integration schema created successfully!' AS status;
