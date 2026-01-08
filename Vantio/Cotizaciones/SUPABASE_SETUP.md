# Configuración de Supabase

## Paso 1: Crear Proyecto en Supabase

1. Ve a [https://app.supabase.com](https://app.supabase.com)
2. Crea una cuenta o inicia sesión con Google
3. Haz clic en "New Project"
4. Completa los datos:
   - **Name**: AlfaQuote
   - **Database Password**: (guarda esta contraseña de forma segura)
   - **Region**: Elige la más cercana a tu ubicación
5. Haz clic en "Create new project"

## Paso 2: Obtener Credenciales

1. Una vez creado el proyecto, ve a **Settings** > **API**
2. Copia los siguientes valores:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Paso 3: Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con:

```env
VITE_SUPABASE_URL=tu_project_url_aqui
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

## Paso 4: Crear Tablas en Supabase

Ve a **SQL Editor** en Supabase y ejecuta el siguiente script:

```sql
-- Crear tabla de usuarios
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'sales' CHECK (role IN ('admin', 'manager', 'sales')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de cotizaciones
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  project_name TEXT NOT NULL,
  valid_until DATE,
  items JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  subtotal NUMERIC(10, 2) DEFAULT 0,
  tax NUMERIC(10, 2) DEFAULT 0,
  total NUMERIC(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'accepted', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar performance
CREATE INDEX idx_quotes_user_id ON quotes(user_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_created_at ON quotes(created_at DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Políticas para users
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Políticas para quotes
CREATE POLICY "Users can view their own quotes"
  ON quotes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all quotes"
  ON quotes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can create quotes"
  ON quotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quotes"
  ON quotes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quotes"
  ON quotes FOR DELETE
  USING (auth.uid() = user_id);

-- Política para acceso público a micrositios (solo lectura)
CREATE POLICY "Public can view quotes by ID"
  ON quotes FOR SELECT
  USING (true);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Paso 5: Configurar Google OAuth

1. Ve a **Authentication** > **Providers** en Supabase
2. Habilita **Google**
3. Sigue las instrucciones para configurar OAuth en Google Cloud Console
4. Copia el **Client ID** y **Client Secret** de Google
5. Pégalos en la configuración de Supabase

## Paso 6: Reiniciar el Servidor de Desarrollo

```bash
npm run dev
```

¡Listo! Ahora AlfaQuote está conectado a Supabase.
