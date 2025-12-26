-- ============================================
-- Auto-assign First User as Super Admin (SaaS Version)
-- ============================================
-- This migration modifies the handle_new_user trigger to automatically
-- assign THE VERY FIRST user who registers as a super_admin with their own organization.
-- This makes the app ready for SaaS deployment where each customer gets their own instance.

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Replace the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  new_org_id UUID;
  org_name TEXT;
  invitation_record RECORD;
BEGIN
  -- Count existing users (profiles)
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  RAISE NOTICE 'Processing new user: %. Current user count: %', NEW.email, user_count;
  
  -- Check if user was invited
  SELECT * INTO invitation_record
  FROM public.invitations
  WHERE email = NEW.email
  AND accepted_at IS NULL
  AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- CASE 1: This is the VERY FIRST user (no profiles exist)
  IF user_count = 0 THEN
    -- Generate organization name from email domain or use default
    org_name := COALESCE(
      INITCAP(SPLIT_PART(SPLIT_PART(NEW.email, '@', 2), '.', 1)),
      'Mi Empresa'
    );
    
    -- Create organization for the first user
    INSERT INTO public.organizations (name, super_admin_id)
    VALUES (org_name, NEW.id)
    RETURNING id INTO new_org_id;
    
    -- Create organization settings
    INSERT INTO public.organization_settings (organization_id)
    VALUES (new_org_id)
    ON CONFLICT (organization_id) DO NOTHING;
    
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
    
    RAISE NOTICE '🎉 FIRST USER! Created super_admin with organization: %', org_name;
    
  -- CASE 2: User was invited to an organization
  ELSIF invitation_record IS NOT NULL THEN
    -- Create profile with the role specified in the invitation
    INSERT INTO public.profiles (id, email, full_name, role, organization_id, is_active)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
      invitation_record.role,
      invitation_record.organization_id,
      true
    );
    
    -- Mark invitation as accepted
    UPDATE public.invitations
    SET accepted_at = NOW()
    WHERE id = invitation_record.id;
    
    RAISE NOTICE '✉️ User created from invitation with role: %', invitation_record.role;
    
  -- CASE 3: Subsequent users without invitation (should not happen in production)
  ELSE
    -- Create profile with default role (vendedor) and NO organization
    -- They will need to be invited to an organization
    INSERT INTO public.profiles (id, email, full_name, role, is_active)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
      'vendedor',
      true
    );
    
    RAISE NOTICE '⚠️ User created without invitation (no organization assigned): %', NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Verification
-- ============================================

SELECT 'Migration 016 completed successfully!' AS status;
SELECT 'The FIRST user to register will automatically become super_admin with their own organization.' AS info;
SELECT 'Subsequent users must be invited by the super_admin.' AS info2;
