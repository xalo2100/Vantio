-- ============================================
-- FIX: Crear tabla user_organizations faltante
-- ============================================
-- Esta tabla es necesaria para el sistema multi-organización
-- ============================================

-- Crear la tabla user_organizations si no existe
CREATE TABLE IF NOT EXISTS user_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    role TEXT DEFAULT 'vendedor' CHECK (role IN ('admin', 'vendedor')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- Habilitar RLS
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own organization memberships"
ON user_organizations FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage organization memberships"
ON user_organizations FOR ALL
USING (
    organization_id IN (
        SELECT organization_id FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_org_id ON user_organizations(organization_id);

-- ============================================
-- Migrar datos existentes
-- ============================================
-- Crear entradas en user_organizations para todos los usuarios que ya tienen organization_id

INSERT INTO user_organizations (user_id, organization_id, role)
SELECT 
    id as user_id,
    organization_id,
    CASE 
        WHEN role = 'super_admin' THEN 'admin'
        WHEN role = 'admin' THEN 'admin'
        ELSE 'vendedor'
    END as role
FROM profiles
WHERE organization_id IS NOT NULL
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- ============================================
-- Verificar
-- ============================================
SELECT 
    uo.user_id,
    p.email,
    uo.organization_id,
    o.name as organization_name,
    uo.role as membership_role,
    p.role as profile_role
FROM user_organizations uo
JOIN profiles p ON uo.user_id = p.id
JOIN organizations o ON uo.organization_id = o.id
ORDER BY p.email;
