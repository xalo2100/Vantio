-- Migration: Create quotes storage bucket
-- Purpose: Store generated PDFs for WhatsApp sharing

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('quotes', 'quotes', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policies for 'quotes' bucket
DROP POLICY IF EXISTS "Public Access Quotes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Quotes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Quotes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Quotes" ON storage.objects;

-- Allow public read access
CREATE POLICY "Public Access Quotes"
ON storage.objects FOR SELECT
USING ( bucket_id = 'quotes' );

-- Allow authenticated upload
CREATE POLICY "Authenticated Upload Quotes"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'quotes' AND auth.role() = 'authenticated' );

-- Allow authenticated update/delete
CREATE POLICY "Authenticated Update Quotes"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'quotes' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated Delete Quotes"
ON storage.objects FOR DELETE
USING ( bucket_id = 'quotes' AND auth.role() = 'authenticated' );
