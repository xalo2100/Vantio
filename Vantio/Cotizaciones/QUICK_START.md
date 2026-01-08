# 🚀 Guía Rápida de Configuración - AlfaQuote v2.0

## Paso 1: Configurar Supabase (5 minutos)

### 1.1 Crear Proyecto
1. Ve a [app.supabase.com](https://app.supabase.com)
2. Haz clic en "New Project"
3. Completa:
   - **Name**: AlfaQuote
   - **Database Password**: (guárdala)
   - **Region**: South America (São Paulo)
4. Espera 2 minutos mientras se crea

### 1.2 Ejecutar SQL
1. Ve a **SQL Editor** (ícono de base de datos)
2. Copia y pega este script:

```sql
-- Crear tabla de cotizaciones
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_number TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL,
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

-- Índices
CREATE INDEX idx_quotes_user_id ON quotes(user_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_created_at ON quotes(created_at DESC);

-- RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Política para acceso público (micrositios)
CREATE POLICY "Public can view quotes by ID"
  ON quotes FOR SELECT
  USING (true);

-- Política para actualizar estado (micrositios)
CREATE POLICY "Public can update quote status"
  ON quotes FOR UPDATE
  USING (true)
  WITH CHECK (true);
```

3. Haz clic en **Run**

### 1.3 Configurar Google OAuth
1. Ve a **Authentication** > **Providers**
2. Habilita **Google**
3. Sigue las instrucciones para obtener Client ID y Secret de [Google Cloud Console](https://console.cloud.google.com)
4. Pega las credenciales en Supabase

### 1.4 Obtener Credenciales
1. Ve a **Settings** > **API**
2. Copia:
   - **Project URL**
   - **anon public key**

---

## Paso 2: Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Paso 3: Ejecutar la Aplicación

```bash
# Instalar dependencias (si no lo has hecho)
npm install

# Ejecutar en desarrollo
npm run dev
```

---

## Paso 4: Probar

1. **Login**: Ve a `http://localhost:5173/login`
2. **Autenticar**: Haz clic en "Continuar con Google"
3. **Crear Cotización**: Usa el builder para crear una cotización
4. **Verificar**: Ve al Dashboard de Supabase > Table Editor > quotes

---

## ⚠️ Troubleshooting

### Error: "Invalid API key"
- Verifica que las credenciales en `.env` sean correctas
- Reinicia el servidor (`npm run dev`)

### Error: "Failed to fetch"
- Verifica que el script SQL se ejecutó correctamente
- Revisa la consola del navegador para más detalles

### No puedo hacer login
- Verifica que Google OAuth esté configurado en Supabase
- Asegúrate de estar usando HTTPS o localhost

---

## 📚 Recursos

- [Documentación de Supabase](https://supabase.com/docs)
- [SUPABASE_SETUP.md](file:///Users/gonzalo/proyectos/carpeta%20sin%20título/Cotizaciones/SUPABASE_SETUP.md) - Guía detallada
- [Walkthrough](file:///Users/gonzalo/.gemini/antigravity/brain/d0b6b798-01c2-4846-a922-9894a6d111e0/walkthrough.md) - Documentación completa de cambios
