
-- 1. DROP existing trigger and function if they exist to start fresh
DROP TRIGGER IF EXISTS trigger_generate_sales_note_number ON sales_notes;
DROP FUNCTION IF EXISTS generate_note_number();

-- 2. Create the sequence logic. We want a strictly increasing number.
-- We can use a sequence object or just MAX() logic.
-- Given "without repeating", a SEQUENCE is safest against concurrency.
-- Let's create a global sequence for sales notes.

CREATE SEQUENCE IF NOT EXISTS sales_notes_seq START 1;

-- 3. Create the function that assigns the number
CREATE OR REPLACE FUNCTION set_sales_note_number()
RETURNS TRIGGER AS $$
DECLARE
  next_val INTEGER;
BEGIN
  -- Only assign if not provided
  IF NEW.note_number IS NULL THEN
     -- Get next value from sequence
     next_val := nextval('sales_notes_seq');
     -- Format: NV-0001 (padding to 4 digits seems standard, or maybe 5)
     -- User asked for "consecutive without repeating current number".
     -- Let's use NV-XXXXX
     NEW.note_number := 'NV-' || LPAD(next_val::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach trigger
CREATE TRIGGER trigger_generate_sales_note_number
BEFORE INSERT ON sales_notes
FOR EACH ROW
EXECUTE FUNCTION set_sales_note_number();

-- 5. Backfill existing notes if any (handle nulls)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM sales_notes WHERE note_number IS NULL LOOP
     UPDATE sales_notes SET note_number = 'NV-' || LPAD(nextval('sales_notes_seq')::TEXT, 5, '0') WHERE id = r.id;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
