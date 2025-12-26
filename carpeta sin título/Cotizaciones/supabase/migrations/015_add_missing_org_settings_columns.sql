-- Migration: Add missing columns to organization_settings and organizations tables
-- Purpose: Fix Gemini API integration and add branding support

-- Add Gemini AI columns to organization_settings
ALTER TABLE organization_settings
ADD COLUMN IF NOT EXISTS gemini_api_key TEXT,
ADD COLUMN IF NOT EXISTS gemini_daily_requests INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS gemini_last_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS gemini_model_preference TEXT DEFAULT 'gemini-2.0-flash-lite';

-- Add branding columns to organizations
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS favicon_url TEXT;

-- Add follow-up system columns to organization_settings (if not already added)
ALTER TABLE organization_settings
ADD COLUMN IF NOT EXISTS followup_days_threshold INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS followup_include_quotes BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS followup_dashboard_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS followup_email_notifications BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS followup_last_sync TIMESTAMP WITH TIME ZONE;

-- Create storage bucket for organization assets (logo, favicon)
INSERT INTO storage.buckets (id, name, public)
VALUES ('organization-assets', 'organization-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Superadmins can upload organization assets" ON storage.objects;
DROP POLICY IF EXISTS "Superadmins can update organization assets" ON storage.objects;
DROP POLICY IF EXISTS "Superadmins can delete organization assets" ON storage.objects;
DROP POLICY IF EXISTS "Public can view organization assets" ON storage.objects;

-- RLS policies for organization-assets bucket
-- Allow superadmins to upload/update/delete
CREATE POLICY "Superadmins can upload organization assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'organization-assets' AND
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
);

CREATE POLICY "Superadmins can update organization assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'organization-assets' AND
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
);

CREATE POLICY "Superadmins can delete organization assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'organization-assets' AND
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
);

-- Allow public read access to organization assets
CREATE POLICY "Public can view organization assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'organization-assets');

-- Create function to reset Gemini daily counter
CREATE OR REPLACE FUNCTION reset_gemini_daily_counter()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE organization_settings
    SET 
        gemini_daily_requests = 0,
        gemini_last_reset = NOW()
    WHERE gemini_last_reset < NOW() - INTERVAL '1 day';
END;
$$;

-- Create function to increment Gemini request counter
CREATE OR REPLACE FUNCTION increment_gemini_requests(org_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_count INTEGER;
    last_reset TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current count and last reset
    SELECT gemini_daily_requests, gemini_last_reset
    INTO current_count, last_reset
    FROM organization_settings
    WHERE organization_id = org_id;
    
    -- Reset if more than 24 hours have passed
    IF last_reset < NOW() - INTERVAL '1 day' THEN
        UPDATE organization_settings
        SET 
            gemini_daily_requests = 1,
            gemini_last_reset = NOW()
        WHERE organization_id = org_id;
        RETURN 1;
    END IF;
    
    -- Check if we're at the limit (1400 requests/day for safety margin)
    IF current_count >= 1400 THEN
        RAISE EXCEPTION 'Daily Gemini API quota exceeded. Limit: 1400 requests/day';
    END IF;
    
    -- Increment counter
    UPDATE organization_settings
    SET gemini_daily_requests = gemini_daily_requests + 1
    WHERE organization_id = org_id;
    
    RETURN current_count + 1;
END;
$$;

-- Comment on columns for documentation
COMMENT ON COLUMN organization_settings.gemini_api_key IS 'Gemini API key for AI features';
COMMENT ON COLUMN organization_settings.gemini_daily_requests IS 'Number of Gemini API requests made today';
COMMENT ON COLUMN organization_settings.gemini_last_reset IS 'Last time the daily counter was reset';
COMMENT ON COLUMN organization_settings.gemini_model_preference IS 'Preferred Gemini model (gemini-2.0-flash-lite or gemini-2.0-flash)';
COMMENT ON COLUMN organizations.logo_url IS 'URL to organization logo in Supabase Storage';
COMMENT ON COLUMN organizations.favicon_url IS 'URL to organization favicon in Supabase Storage';

-- Success message
SELECT 'Migration 015 completed successfully!' AS status;
