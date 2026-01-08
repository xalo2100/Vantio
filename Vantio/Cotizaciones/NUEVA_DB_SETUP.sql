-- ============================================
-- ALFAQUOTE - CONFIGURACIÓN COMPLETA DE BASE DE DATOS
-- ============================================
-- Ejecuta este script COMPLETO en el SQL Editor de Supabase
-- URL: https://app.supabase.com/project/qrqpidwheqznkhoahmha/sql
-- ============================================

-- ============================================
-- 1. ORGANIZATIONS (Organizaciones)
-- ============================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  super_admin_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. PROFILES (Usuarios extendidos)
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'vendedor' CHECK (role IN ('super_admin', 'admin', 'vendedor')),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES auth.users(id),
  invitation_accepted_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. PRODUCTS (Catálogo de productos)
-- ============================================

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  model TEXT,
  unit_price NUMERIC(10, 2) NOT NULL,
  cost NUMERIC(10, 2),
  currency TEXT DEFAULT 'CLP' CHECK (currency IN ('CLP', 'USD', 'EUR')),
  sku TEXT,
  is_active BOOLEAN DEFAULT true,
  video_url TEXT,
  main_image TEXT,
  additional_images JSONB DEFAULT '[]',
  technical_specs TEXT,
  sales_conditions TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. QUOTES (Cotizaciones)
-- ============================================

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_number TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  client_rut TEXT,
  project_name TEXT NOT NULL,
  valid_until DATE,
  items JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  conditions TEXT,
  internal_notes TEXT,
  subtotal NUMERIC(10, 2) DEFAULT 0,
  tax NUMERIC(10, 2) DEFAULT 0,
  total NUMERIC(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'accepted', 'rejected')),
  rejection_reason TEXT,
  status_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. INVITATIONS (Invitaciones de usuarios)
-- ============================================

CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'vendedor')),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. ORGANIZATION_SETTINGS (Configuración)
-- ============================================

CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  default_sales_conditions TEXT,
  gemini_api_key TEXT,
  pipedrive_api_key TEXT,
  pipedrive_domain TEXT,
  resend_api_key TEXT,
  company_logo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- ============================================
-- 7. AI_INSIGHTS (Insights de IA - Kaizen)
-- ============================================

CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('performance', 'kaizen', 'recommendation', 'alert', 'recognition')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metrics JSONB,
  actions JSONB,
  expected_impact TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  generated_by UUID REFERENCES auth.users(id),
  is_visible_to_user BOOLEAN DEFAULT true,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. SALES_NOTES (Notas de Venta)
-- ============================================

CREATE TABLE IF NOT EXISTS sales_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  note_number TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  client_rut TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(10, 2) DEFAULT 0,
  tax NUMERIC(10, 2) DEFAULT 0,
  total NUMERIC(10, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. STORAGE BUCKET
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 10. INDEXES (Para mejor rendimiento)
-- ============================================

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Products
CREATE INDEX IF NOT EXISTS idx_products_organization_id ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- Quotes
CREATE INDEX IF NOT EXISTS idx_quotes_organization_id ON quotes(organization_id);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at DESC);

-- Invitations
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_organization_id ON invitations(organization_id);

-- AI Insights
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_organization_id ON ai_insights(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_created_at ON ai_insights(created_at DESC);

-- Sales Notes
CREATE INDEX IF NOT EXISTS idx_sales_notes_organization_id ON sales_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_notes_user_id ON sales_notes(user_id);

-- ============================================
-- 11. ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_notes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 12. RLS POLICIES - ORGANIZATIONS
-- ============================================

CREATE POLICY "Users can view their organization"
ON organizations FOR SELECT
USING (
  id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Super admins can update their organization"
ON organizations FOR UPDATE
USING (super_admin_id = auth.uid());

-- ============================================
-- 13. RLS POLICIES - PROFILES
-- ============================================

CREATE POLICY "Users can view profiles in their organization"
ON profiles FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "Admins can update profiles in their organization"
ON profiles FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  )
);

-- ============================================
-- 14. RLS POLICIES - PRODUCTS
-- ============================================

CREATE POLICY "Users can view products in their organization"
ON products FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create products"
ON products FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update products"
ON products FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Admins can delete products"
ON products FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- ============================================
-- 15. RLS POLICIES - QUOTES
-- ============================================

CREATE POLICY "Users can view quotes in their organization"
ON quotes FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create quotes"
ON quotes FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update quotes"
ON quotes FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Admins can delete quotes"
ON quotes FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- ============================================
-- 16. RLS POLICIES - ORGANIZATION_SETTINGS
-- ============================================

CREATE POLICY "Users can view their org settings"
ON organization_settings FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Admins can insert org settings"
ON organization_settings FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can update org settings"
ON organization_settings FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- ============================================
-- 17. RLS POLICIES - INVITATIONS
-- ============================================

CREATE POLICY "Admins can manage invitations"
ON invitations FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Public can view invitations by token"
ON invitations FOR SELECT
USING (true);

-- ============================================
-- 18. RLS POLICIES - AI_INSIGHTS
-- ============================================

CREATE POLICY "Users can view their own insights"
ON ai_insights FOR SELECT
USING (
  user_id = auth.uid() AND is_visible_to_user = true
);

CREATE POLICY "Admins can view all insights in organization"
ON ai_insights FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  )
);

CREATE POLICY "Admins can create insights"
ON ai_insights FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  )
);

CREATE POLICY "Users can update their insights"
ON ai_insights FOR UPDATE
USING (user_id = auth.uid());

-- ============================================
-- 19. RLS POLICIES - SALES_NOTES
-- ============================================

CREATE POLICY "Users can view sales notes in their organization"
ON sales_notes FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create sales notes"
ON sales_notes FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update sales notes"
ON sales_notes FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

-- ============================================
-- 20. STORAGE POLICIES
-- ============================================

CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');

CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'products' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'products' AND auth.role() = 'authenticated');

-- ============================================
-- 21. FUNCTIONS
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 22. TRIGGERS
-- ============================================

-- Triggers para updated_at
CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER quotes_updated_at
BEFORE UPDATE ON quotes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER organization_settings_updated_at
BEFORE UPDATE ON organization_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER organizations_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER sales_notes_updated_at
BEFORE UPDATE ON sales_notes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Trigger para crear perfil automáticamente
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ✅ COMPLETADO
-- ============================================

SELECT 'Base de datos configurada exitosamente!' AS status;
