-- Create user_organizations table to track many-to-many relationship
CREATE TABLE IF NOT EXISTS user_organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'vendedor' CHECK (role IN ('super_admin', 'admin', 'vendedor')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Enable RLS
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own organization memberships"
  ON user_organizations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create organization memberships for themselves"
  ON user_organizations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Backfill existing relationships
INSERT INTO user_organizations (user_id, organization_id, role)
SELECT id as user_id, organization_id, role
FROM profiles
WHERE organization_id IS NOT NULL
ON CONFLICT (user_id, organization_id) DO NOTHING;
