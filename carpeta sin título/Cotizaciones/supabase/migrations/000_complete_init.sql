-- AlfaQuote - Script de Inicialización Completo
-- Ejecuta este script UNA SOLA VEZ en Supabase SQL Editor

-- ============================================
-- 1. ORGANIZATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  super_admin_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. PROFILES (Usuarios)
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
-- 3. PRODUCTS
-- ============================================

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
-- 4. QUOTES
-- ============================================

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_number TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
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
-- 5. INVITATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
-- 6. ORGANIZATION SETTINGS
-- ============================================

CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  default_sales_conditions TEXT,
  gemini_api_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- ============================================
-- 7. STORAGE BUCKET for Products
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 8. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

CREATE INDEX IF NOT EXISTS idx_products_organization_id ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

CREATE INDEX IF NOT EXISTS idx_quotes_organization_id ON quotes(organization_id);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_organization_id ON invitations(organization_id);

-- ============================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- PRODUCTS POLICIES
CREATE POLICY "Users can view their org products"
ON products FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can create products"
ON products FOR INSERT
WITH CHECK (organization_id IN (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can update products"
ON products FOR UPDATE
USING (organization_id IN (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Admins can delete products"
ON products FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- QUOTES POLICIES
CREATE POLICY "Users can view their org quotes"
ON quotes FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can create quotes"
ON quotes FOR INSERT
WITH CHECK (organization_id IN (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can update quotes"
ON quotes FOR UPDATE
USING (organization_id IN (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
));

-- ORGANIZATION SETTINGS POLICIES
CREATE POLICY "Users can view their org settings"
ON organization_settings FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Admins can insert org settings"
ON organization_settings FOR INSERT
WITH CHECK (organization_id IN (
  SELECT organization_id FROM profiles 
  WHERE id = auth.uid() 
  AND role IN ('admin', 'super_admin')
));

CREATE POLICY "Admins can update org settings"
ON organization_settings FOR UPDATE
USING (organization_id IN (
  SELECT organization_id FROM profiles 
  WHERE id = auth.uid() 
  AND role IN ('admin', 'super_admin')
));

-- INVITATIONS POLICIES
CREATE POLICY "Admins can manage invitations"
ON invitations FOR ALL
USING (organization_id IN (
  SELECT organization_id FROM profiles 
  WHERE id = auth.uid() 
  AND role IN ('admin', 'super_admin')
));

-- ============================================
-- 10. STORAGE POLICIES
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
-- 11. TRIGGERS
-- ============================================

-- Auto-update updated_at on profiles
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- DONE!
-- ============================================

SELECT 'Database initialized successfully!' AS status;
