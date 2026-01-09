-- Migration 031: Correlative numbering for quotes
-- Replaces random client-side numbering with a database sequence

-- 1. Create a sequence for quotes starting at 1001
CREATE SEQUENCE IF NOT EXISTS quotes_seq START 1001;

-- 2. Create the function to set the correlative number
CREATE OR REPLACE FUNCTION set_quote_number()
RETURNS TRIGGER AS $$
DECLARE
  next_val INTEGER;
BEGIN
  -- Only assign a new number if quote_number is NULL, empty, or an old-style random number (optional check)
  -- To be safe, if we are inserting a new record and quote_number isn't explicitly set to a "final" value, we assign sequence
  IF NEW.quote_number IS NULL OR NEW.quote_number = '' OR NEW.quote_number LIKE 'COT-%-%-%' THEN
     next_val := nextval('quotes_seq');
     NEW.quote_number := 'COT-' || LPAD(next_val::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS trigger_generate_quote_number ON quotes;
CREATE TRIGGER trigger_generate_quote_number
BEFORE INSERT ON quotes
FOR EACH ROW
EXECUTE FUNCTION set_quote_number();

-- 4. Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';

SELECT '¡Numeración correlativa activada para cotizaciones!' AS resultado;
