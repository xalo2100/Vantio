-- Script de Corrección para Supabase (AlfaQuote)
-- Ejecuta este script en el SQL Editor de Supabase para crear las tablas faltantes.

-- 1. Crear tabla de Organizaciones (si no existe)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear tabla de Perfiles (profiles) - Usada por la app en lugar de 'users'
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'vendedor',
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear tabla de Productos (products)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  model TEXT,
  unit_price NUMERIC(10, 2) NOT NULL,
  cost NUMERIC(10, 2),
  currency TEXT DEFAULT 'CLP',
  sku TEXT,
  is_active BOOLEAN DEFAULT true,
  video_url TEXT,
  main_image TEXT,
  additional_images TEXT[] DEFAULT '{}',
  technical_specs TEXT,
  sales_conditions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Crear tabla de Configuración de Organización (organization_settings)
CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) UNIQUE NOT NULL,
  default_sales_conditions TEXT,
  pipedrive_api_key TEXT,
  pipedrive_url TEXT,
  pipedrive_sync_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Habilitar RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS (Simplificadas para que funcione)

-- Profiles: Ver y editar su propio perfil
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Organizations: Ver su propia organización
CREATE POLICY "Users can view own organization" ON organizations FOR SELECT 
USING (id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Products: Ver y editar productos de su organización
CREATE POLICY "Users can view org products" ON products FOR SELECT 
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert org products" ON products FOR INSERT 
WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update org products" ON products FOR UPDATE 
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete org products" ON products FOR DELETE 
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Settings: Ver y editar configuración de su organización
CREATE POLICY "Users can view org settings" ON organization_settings FOR SELECT 
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update org settings" ON organization_settings FOR UPDATE 
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert org settings" ON organization_settings FOR INSERT 
WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));


-- 7. Trigger para crear perfil y organización automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Crear una nueva organización para el usuario
  INSERT INTO public.organizations (name)
  VALUES (NEW.raw_user_meta_data->>'full_name' || '''s Organization')
  RETURNING id INTO new_org_id;

  -- Crear el perfil del usuario vinculado a la organización
  INSERT INTO public.profiles (id, email, full_name, role, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    'admin', -- Primer usuario es admin por defecto
    new_org_id
  );

  -- Crear configuración por defecto para la organización
  INSERT INTO public.organization_settings (organization_id)
  VALUES (new_org_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disparador (Trigger)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. (Opcional) Corregir usuarios existentes que no tengan perfil
-- Esto intentará crear perfiles para usuarios que ya existen en auth.users pero no en profiles
DO $$
DECLARE
  user_record RECORD;
  new_org_id UUID;
BEGIN
  FOR user_record IN SELECT * FROM auth.users WHERE id NOT IN (SELECT id FROM public.profiles) LOOP
    
    INSERT INTO public.organizations (name)
    VALUES (COALESCE(user_record.raw_user_meta_data->>'full_name', 'My Organization'))
    RETURNING id INTO new_org_id;

    INSERT INTO public.profiles (id, email, full_name, role, organization_id)
    VALUES (
      user_record.id,
      user_record.email,
      COALESCE(user_record.raw_user_meta_data->>'full_name', 'User'),
      'admin',
      new_org_id
    );

    INSERT INTO public.organization_settings (organization_id)
    VALUES (new_org_id);
    
  END LOOP;
END $$;
