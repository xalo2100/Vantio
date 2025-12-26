-- ============================================
-- SETUP COMPLETO: Inicialización + Superadmins
-- ============================================
-- Este script ejecuta TODAS las migraciones necesarias en orden
-- Ejecuta este script UNA SOLA VEZ en Supabase SQL Editor

-- ============================================
-- 1. HABILITAR EXTENSIONES
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. CREAR TABLAS
-- ============================================

-- ORGANIZATIONS
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  super_admin_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROFILES (Usuarios)
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

-- PRODUCTS
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

-- QUOTES
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

-- ORGANIZATION SETTINGS
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
-- 3. INDEXES
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

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- PRODUCTS POLICIES
DROP POLICY IF EXISTS "Users can view their org products" ON products;
CREATE POLICY "Users can view their org products"
ON products FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
));

DROP POLICY IF EXISTS "Users can create products" ON products;
CREATE POLICY "Users can create products"
ON products FOR INSERT
WITH CHECK (organization_id IN (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
));

DROP POLICY IF EXISTS "Users can update products" ON products;
CREATE POLICY "Users can update products"
ON products FOR UPDATE
USING (organization_id IN (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
));

-- QUOTES POLICIES
DROP POLICY IF EXISTS "Users can view their org quotes" ON quotes;
CREATE POLICY "Users can view their org quotes"
ON quotes FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
));

DROP POLICY IF EXISTS "Users can create quotes" ON quotes;
CREATE POLICY "Users can create quotes"
ON quotes FOR INSERT
WITH CHECK (organization_id IN (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
));

DROP POLICY IF EXISTS "Users can update quotes" ON quotes;
CREATE POLICY "Users can update quotes"
ON quotes FOR UPDATE
USING (organization_id IN (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
));

-- ORGANIZATION SETTINGS POLICIES
DROP POLICY IF EXISTS "Users can view their org settings" ON organization_settings;
CREATE POLICY "Users can view their org settings"
ON organization_settings FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
));

-- ============================================
-- 5. TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS quotes_updated_at ON quotes;
CREATE TRIGGER quotes_updated_at
BEFORE UPDATE ON quotes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on user signup WITH SUPERADMIN LOGIC
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  existing_org_id UUID;
  org_name TEXT;
  is_superadmin_email BOOLEAN;
BEGIN
  -- Check if this email should be a superadmin
  is_superadmin_email := NEW.email IN (
    'gonzalosanchezmarambio@gmail.com',
    'gsanchez@alfapack.cl'
  );
  
  -- If this is one of the designated superadmin emails
  IF is_superadmin_email THEN
    -- Check if an organization already exists (for the second superadmin)
    SELECT id INTO existing_org_id 
    FROM public.organizations 
    WHERE super_admin_id IN (
      SELECT id FROM public.profiles 
      WHERE email IN ('gonzalosanchezmarambio@gmail.com', 'gsanchez@alfapack.cl')
    )
    LIMIT 1;
    
    -- If organization exists, use it; otherwise create new one
    IF existing_org_id IS NOT NULL THEN
      new_org_id := existing_org_id;
      RAISE NOTICE 'Using existing organization for second superadmin';
    ELSE
      org_name := 'Alfapack';
      
      INSERT INTO public.organizations (name, super_admin_id)
      VALUES (org_name, NEW.id)
      RETURNING id INTO new_org_id;
      
      INSERT INTO public.organization_settings (organization_id)
      VALUES (new_org_id)
      ON CONFLICT (organization_id) DO NOTHING;
      
      RAISE NOTICE 'First superadmin created with organization: %', org_name;
    END IF;
    
    -- Create profile as super_admin
    INSERT INTO public.profiles (id, email, full_name, role, organization_id, is_active)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
      'super_admin',
      new_org_id,
      true
    );
    
    RAISE NOTICE 'Superadmin user created: %', NEW.email;
  ELSE
    -- Subsequent users: create profile with default role (vendedor)
    INSERT INTO public.profiles (id, email, full_name, role, is_active)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
      'vendedor',
      true
    );
    
    RAISE NOTICE 'User created with default role (vendedor): %', NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 6. ACTUALIZAR USUARIO EXISTENTE A SUPERADMIN
-- ============================================

DO $$
DECLARE
  org_id UUID;
  user1_id UUID;
BEGIN
  -- Obtener ID del usuario existente
  SELECT id INTO user1_id FROM auth.users WHERE email = 'gonzalosanchezmarambio@gmail.com';
  
  IF user1_id IS NOT NULL THEN
    -- Crear organización Alfapack
    INSERT INTO public.organizations (name, super_admin_id)
    VALUES ('Alfapack', user1_id)
    RETURNING id INTO org_id;
    
    -- Actualizar perfil a superadmin
    UPDATE public.profiles
    SET 
      role = 'super_admin',
      organization_id = org_id,
      updated_at = NOW()
    WHERE id = user1_id;
    
    -- Crear configuración de organización
    INSERT INTO public.organization_settings (organization_id)
    VALUES (org_id)
    ON CONFLICT (organization_id) DO NOTHING;
    
    RAISE NOTICE 'Usuario gonzalosanchezmarambio@gmail.com actualizado a superadmin';
  END IF;
END $$;

-- ============================================
-- 7. VERIFICACIÓN
-- ============================================

SELECT 'Base de datos inicializada exitosamente!' AS status;

-- Ver usuarios
SELECT 
  p.email,
  p.full_name,
  p.role,
  o.name as organization_name
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
ORDER BY p.created_at;
