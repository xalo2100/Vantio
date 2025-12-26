-- AlfaQuote v3.2 - Especificaciones y Configuración de Organización
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Agregar especificaciones técnicas a productos
ALTER TABLE products ADD COLUMN IF NOT EXISTS technical_specs TEXT;

-- 2. Crear tabla de configuración de la organización
CREATE TABLE IF NOT EXISTS organization_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    default_sales_conditions TEXT,
    gemini_api_key TEXT, -- Se almacenará encriptada en producción
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id)
);

-- 3. RLS para organization_settings
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver la configuración de su organización
CREATE POLICY "Users can view their org settings"
ON organization_settings FOR SELECT
USING (
    organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
);

-- Política: Solo Admins pueden insertar configuración
CREATE POLICY "Admins can insert org settings"
ON organization_settings FOR INSERT
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
);

-- Política: Solo Admins pueden actualizar configuración
CREATE POLICY "Admins can update org settings"
ON organization_settings FOR UPDATE
USING (
    organization_id IN (
        SELECT organization_id FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
);

-- 4. Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_organization_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organization_settings_updated_at
    BEFORE UPDATE ON organization_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_organization_settings_updated_at();
