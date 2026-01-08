-- ============================================
-- Auto-assign First User as Super Admin
-- ============================================
-- This migration modifies the handle_new_user trigger to automatically
-- assign the first user who registers as a super_admin with their own organization.

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Replace the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  new_org_id UUID;
  existing_org_id UUID;
  org_name TEXT;
  is_superadmin_email BOOLEAN;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
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
      -- Generate organization name from user's name or email
      org_name := 'Alfapack';
      
      -- Create organization for the first superadmin
      INSERT INTO public.organizations (name, super_admin_id)
      VALUES (org_name, NEW.id)
      RETURNING id INTO new_org_id;
      
      -- Create organization settings
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

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Verification
-- ============================================

-- Check if the function was created successfully
SELECT 'Migration 012 completed successfully!' AS status;
SELECT 'Next user to register will be assigned as super_admin if no users exist.' AS info;
