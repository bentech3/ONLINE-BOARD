-- Update the handle_new_user function to support OAuth providers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  user_count INTEGER;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'New User'),
    NEW.email
  );

  -- Check if this is the first user
  SELECT COUNT(*) INTO user_count FROM public.profiles;

  IF user_count = 1 THEN
    -- First user is admin
    user_role := 'admin';
  ELSE
    -- Check for role in metadata (for manual signup) or app_metadata (for OAuth)
    user_role := COALESCE(
      (NEW.raw_user_meta_data->>'role')::app_role,
      (NEW.raw_app_meta_data->>'role')::app_role,
      'student'
    );
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);

  RETURN NEW;
END;
$$;