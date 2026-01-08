-- Add 'items' column to sales_notes to store the snapshot of items
-- Also ensure 'billing_details' exists as specificed in the code usage
ALTER TABLE public.sales_notes 
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS billing_details JSONB DEFAULT '{}'::jsonb;

-- Ensure RLS allows insert/update for authenticated users (basic check)
-- (Assuming standard RLS setup, usually authenticated users can insert their own rows)

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
