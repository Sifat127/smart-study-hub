
DROP FUNCTION IF EXISTS public._test_profiles_rls_scenarios();
DROP FUNCTION IF EXISTS public._test_profiles_rls_setup();
DROP FUNCTION IF EXISTS public._test_profiles_rls_cleanup(uuid, uuid);
DROP FUNCTION IF EXISTS public._test_profiles_rls_read_bob(uuid);

-- Marks a test account's email as confirmed. Locked to the rls_test_ email pattern so
-- it cannot be abused to confirm real users.
CREATE OR REPLACE FUNCTION public._test_confirm_rls_user(_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _email IS NULL OR _email !~ '^rls_test_[A-Za-z0-9_-]+@diu\.edu\.bd$' THEN
    RAISE EXCEPTION 'Only rls_test_<id>@diu.edu.bd test accounts may be confirmed via this helper.';
  END IF;
  UPDATE auth.users
     SET email_confirmed_at = COALESCE(email_confirmed_at, now())
   WHERE email = _email;
END;
$$;

REVOKE ALL ON FUNCTION public._test_confirm_rls_user(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._test_confirm_rls_user(text) TO anon, authenticated, service_role;


-- Deletes a test account (auth.users + profile + role rows). Locked to rls_test_ pattern.
CREATE OR REPLACE FUNCTION public._test_delete_rls_user(_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
BEGIN
  IF _email IS NULL OR _email !~ '^rls_test_[A-Za-z0-9_-]+@diu\.edu\.bd$' THEN
    RAISE EXCEPTION 'Only rls_test_<id>@diu.edu.bd test accounts may be deleted via this helper.';
  END IF;
  SELECT id INTO uid FROM auth.users WHERE email = _email;
  IF uid IS NULL THEN RETURN; END IF;

  DELETE FROM public.user_roles WHERE user_id = uid;
  DELETE FROM public.profiles  WHERE user_id = uid;
  DELETE FROM auth.users        WHERE id      = uid;
END;
$$;

REVOKE ALL ON FUNCTION public._test_delete_rls_user(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._test_delete_rls_user(text) TO anon, authenticated, service_role;
