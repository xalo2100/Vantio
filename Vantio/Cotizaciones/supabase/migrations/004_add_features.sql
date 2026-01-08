-- AlfaQuote v3.1 - Nuevas Funcionalidades
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Actualizar Tabla de Productos
ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS main_image TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS additional_images JSONB DEFAULT '[]';

-- 2. Actualizar Tabla de Cotizaciones
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS conditions TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- 3. Configurar Storage (Bucket 'products')
-- Intentamos crear el bucket. Si falla, créalo manualmente en el Dashboard > Storage.
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Políticas de Seguridad para Storage
-- Permitir lectura pública
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'products' );

-- Permitir subida a usuarios autenticados
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'products' AND auth.role() = 'authenticated' );

-- Permitir actualización a usuarios autenticados
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'products' AND auth.role() = 'authenticated' );

-- Permitir borrado a usuarios autenticados
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'products' AND auth.role() = 'authenticated' );
