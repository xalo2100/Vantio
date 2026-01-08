-- Create sales_notes table
CREATE TABLE IF NOT EXISTS sales_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id),
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  number SERIAL,
  status TEXT DEFAULT 'draft', -- draft, final, cancelled
  payment_method TEXT,
  billing_details JSONB,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sales_notes ENABLE ROW LEVEL SECURITY;

-- Policies

-- Select Policy
CREATE POLICY "sales_notes_select_policy"
ON sales_notes FOR SELECT
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM profiles p1
    JOIN profiles p2 ON p1.organization_id = p2.organization_id
    WHERE p1.id = auth.uid()
    AND p2.id = sales_notes.user_id
    AND p1.role IN ('admin', 'super_admin')
  )
);

-- Insert Policy
CREATE POLICY "sales_notes_insert_policy"
ON sales_notes FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

-- Update Policy
CREATE POLICY "sales_notes_update_policy"
ON sales_notes FOR UPDATE
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM profiles p1
    JOIN profiles p2 ON p1.organization_id = p2.organization_id
    WHERE p1.id = auth.uid()
    AND p2.id = sales_notes.user_id
    AND p1.role IN ('admin', 'super_admin')
  )
);

-- Delete Policy
CREATE POLICY "sales_notes_delete_policy"
ON sales_notes FOR DELETE
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM profiles p1
    JOIN profiles p2 ON p1.organization_id = p2.organization_id
    WHERE p1.id = auth.uid()
    AND p2.id = sales_notes.user_id
    AND p1.role IN ('admin', 'super_admin')
  )
);
