
-- ==============================================================================
-- SCRIPT COMPLETO DE REPARACIÓN: TABLA NOTAS DE VENTA + NUMERACIÓN AUTOMÁTICA
-- ==============================================================================

-- 1. CREAR TABLA (Si no existe)
CREATE TABLE IF NOT EXISTS sales_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  note_number TEXT UNIQUE NOT NULL, -- Aquí es donde irá el NV-00001
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  client_rut TEXT,
  client_address TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(10, 2) DEFAULT 0,
  tax NUMERIC(10, 2) DEFAULT 0,
  total NUMERIC(10, 2) DEFAULT 0,
  notes TEXT,
  payment_method TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'cancelled', 'pending', 'paid')),
  billing_details JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. HABILITAR SEGURIDAD (RLS)
ALTER TABLE sales_notes ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad (Acceso total para admin/super_admin)
CREATE POLICY "Admins can view sales notes" ON sales_notes FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Admins can insert sales notes" ON sales_notes FOR INSERT WITH CHECK (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Admins can update sales notes" ON sales_notes FOR UPDATE USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Admins can delete sales notes" ON sales_notes FOR DELETE USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- 3. CONFIGURAR NUMERACIÓN AUTOMÁTICA (NV-00001, NV-00002...)
-- Limpiamos funciones viejas para asegurar la nueva lógica
DROP TRIGGER IF EXISTS trigger_generate_sales_note_number ON sales_notes;
DROP FUNCTION IF EXISTS generate_note_number();
DROP FUNCTION IF EXISTS set_sales_note_number();

-- Creamos la secuencia (contador)
CREATE SEQUENCE IF NOT EXISTS sales_notes_seq START 1;

-- Creamos la función del trigger
CREATE OR REPLACE FUNCTION set_sales_note_number()
RETURNS TRIGGER AS $$
DECLARE
  next_val INTEGER;
BEGIN
  -- Si no viene con número, se lo asignamos
  IF NEW.note_number IS NULL THEN
     next_val := nextval('sales_notes_seq');
     NEW.note_number := 'NV-' || LPAD(next_val::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Conectamos el trigger a la tabla
CREATE TRIGGER trigger_generate_sales_note_number
BEFORE INSERT ON sales_notes
FOR EACH ROW
EXECUTE FUNCTION set_sales_note_number();

-- 4. RECARGAR CACHÉ DE SCHEMAS
NOTIFY pgrst, 'reload schema';

SELECT '¡Instalación completa! Tabla y numeración listas.' as status;
