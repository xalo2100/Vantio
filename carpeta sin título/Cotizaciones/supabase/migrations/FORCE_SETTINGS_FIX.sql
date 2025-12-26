-- FORCE SETTINGS FIX
-- Run this in the Supabase SQL Editor to ensure all organizations have a settings row.

DO $$
DECLARE
    org_rec RECORD;
BEGIN
    FOR org_rec IN SELECT id, name FROM public.organizations LOOP
        INSERT INTO public.organization_settings (organization_id, default_sales_conditions)
        VALUES (org_rec.id, '')
        ON CONFLICT (organization_id) DO NOTHING;
        
        RAISE NOTICE 'Checked/Fixed settings for organization: %', org_rec.name;
    END LOOP;
END $$;
