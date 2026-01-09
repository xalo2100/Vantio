-- FIX: Add missing user_id column and re-apply RLS policies for sales_notes

-- 1. Add user_id column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_notes' AND column_name = 'user_id') THEN
        ALTER TABLE sales_notes ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 2. Update existing rows to have a valid user_id (optional, using current user if possible or just leaving null)
-- Note: new rows will require it for RLS.

-- 3. Re-enable RLS
ALTER TABLE sales_notes ENABLE ROW LEVEL SECURITY;

-- 4. Re-apply policies
DROP POLICY IF EXISTS "sales_notes_insert_policy" ON sales_notes;
CREATE POLICY "sales_notes_insert_policy"
ON sales_notes FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

DROP POLICY IF EXISTS "sales_notes_select_policy" ON sales_notes;
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

DROP POLICY IF EXISTS "sales_notes_update_policy" ON sales_notes;
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

DROP POLICY IF EXISTS "sales_notes_delete_policy" ON sales_notes;
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
