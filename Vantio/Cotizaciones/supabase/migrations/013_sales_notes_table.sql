-- ============================================
-- Módulo de Notas de Ventas
-- ============================================
-- Esta migración crea la tabla sales_notes y sus políticas RLS
-- Las notas de ventas están vinculadas a cotizaciones y solo son
-- accesibles por administradores

-- Crear tabla sales_notes
CREATE TABLE IF NOT EXISTS sales_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  note_number TEXT UNIQUE NOT NULL,
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
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_sales_notes_organization_id ON sales_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_notes_quote_id ON sales_notes(quote_id);
CREATE INDEX IF NOT EXISTS idx_sales_notes_status ON sales_notes(status);
CREATE INDEX IF NOT EXISTS idx_sales_notes_created_at ON sales_notes(created_at);

-- Habilitar RLS
ALTER TABLE sales_notes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Solo admin y super_admin pueden acceder
DROP POLICY IF EXISTS "Admins can view sales notes" ON sales_notes;
CREATE POLICY "Admins can view sales notes"
ON sales_notes FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

DROP POLICY IF EXISTS "Admins can create sales notes" ON sales_notes;
CREATE POLICY "Admins can create sales notes"
ON sales_notes FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

DROP POLICY IF EXISTS "Admins can update sales notes" ON sales_notes;
CREATE POLICY "Admins can update sales notes"
ON sales_notes FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

DROP POLICY IF EXISTS "Admins can delete sales notes" ON sales_notes;
CREATE POLICY "Admins can delete sales notes"
ON sales_notes FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Trigger para auto-actualizar updated_at
DROP TRIGGER IF EXISTS sales_notes_updated_at ON sales_notes;
CREATE TRIGGER sales_notes_updated_at
BEFORE UPDATE ON sales_notes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Función para generar número de nota automático
CREATE OR REPLACE FUNCTION generate_note_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  date_prefix TEXT;
BEGIN
  date_prefix := TO_CHAR(NOW(), 'YYYYMMDD');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(note_number FROM 10) AS INTEGER)), 0) + 1
  INTO next_number
  FROM sales_notes
  WHERE note_number LIKE 'NV-' || date_prefix || '-%';
  
  RETURN 'NV-' || date_prefix || '-' || LPAD(next_number::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Verificación
SELECT 'Migración 013 completada: Tabla sales_notes creada exitosamente' AS status;
