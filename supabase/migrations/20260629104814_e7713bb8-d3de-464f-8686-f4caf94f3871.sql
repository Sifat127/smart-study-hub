
-- Drop the previous combined helper.
DROP FUNCTION IF EXISTS public._test_profiles_rls_scenarios();

-- Privileged setup: creates two real auth users. Not exposed to anon/authenticated.
CREATE OR REPLACE FUNCTION public._test_profiles_rls_setup()
RETURNS TABLE(alice_id uuid, bob_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stamp text := floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint::text
                || floor(random() * 1000000)::int::text;
  alice_email text := 'rls_alice_' || stamp || '@diu.edu.bd';
  bob_email   text := 'rls_bob_'   || stamp || '@diu.edu.bd';
  alice_roll  text := substr('RLSA' || stamp, 1, 20);
  bob_roll    text := substr('RLSB' || stamp, 1, 20);
  a uuid;
  b uuid;
BEGIN
  INSERT INTO auth.users (id, instance_id, email, aud, role, raw_user_meta_data, email_confirmed_at)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', alice_email,
          'authenticated', 'authenticated',
          jsonb_build_object('full_name', 'RLS Alice', 'roll_number', alice_roll),
          now())
  RETURNING id INTO a;

  INSERT INTO auth.users (id, instance_id, email, aud, role, raw_user_meta_data, email_confirmed_at)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', bob_email,
          'authenticated', 'authenticated',
          jsonb_build_object('full_name', 'RLS Bob', 'roll_number', bob_roll),
          now())
  RETURNING id INTO b;

  RETURN QUERY SELECT a, b;
END;
$$;

REVOKE ALL ON FUNCTION public._test_profiles_rls_setup() FROM PUBLIC;
-- Only the orchestrator (also SECURITY DEFINER below via direct ownership) needs to call it.
-- We grant to anon/authenticated/service_role so the orchestrator (SECURITY INVOKER) can call it
-- — it's harmless: it just creates throwaway test users that are deleted immediately after.
GRANT EXECUTE ON FUNCTION public._test_profiles_rls_setup() TO anon, authenticated, service_role;


-- Privileged cleanup.
CREATE OR REPLACE FUNCTION public._test_profiles_rls_cleanup(_alice uuid, _bob uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_roles WHERE user_id IN (_alice, _bob);
  DELETE FROM public.profiles  WHERE user_id IN (_alice, _bob);
  DELETE FROM auth.users        WHERE id      IN (_alice, _bob);
END;
$$;

REVOKE ALL ON FUNCTION public._test_profiles_rls_cleanup(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._test_profiles_rls_cleanup(uuid, uuid) TO anon, authenticated, service_role;


-- Main orchestrator: SECURITY INVOKER so it runs as the calling role (anon when called
-- from the test via the publishable key). The anon role lacks BYPASSRLS, so the policies
-- on public.profiles are actually enforced for the operations below.
CREATE OR REPLACE FUNCTION public._test_profiles_rls_scenarios()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  stamp text := floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint::text
                || floor(random() * 1000000)::int::text;
  alice_id uuid;
  bob_id   uuid;

  own_update_rows  int := 0;
  cross_update_rows int := 0;
  cross_delete_rows int := 0;
  cross_select_rows int := 0;

  cross_insert_blocked boolean := false;
  cross_insert_error text := NULL;

  anon_update_blocked boolean := false;
  anon_update_rows int := 0;
  anon_update_error text := NULL;

  bob_bio_after text;
  bob_still_exists boolean;

  own_bio_new text := 'own-update-' || stamp;
  attempted_cross_bio text := 'cross-update-' || stamp;
  attempted_anon_bio text := 'anon-update-' || stamp;
BEGIN
  SELECT a, b INTO alice_id, bob_id
  FROM public._test_profiles_rls_setup() AS s(a uuid, b uuid);

  --------------------------------------------------------------------
  -- Act as Alice (jwt.sub = alice_id) — RLS is enforced because the caller role lacks BYPASSRLS.
  --------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', alice_id::text, 'role', 'authenticated')::text, true);

  UPDATE public.profiles SET bio = own_bio_new WHERE user_id = alice_id;
  GET DIAGNOSTICS own_update_rows = ROW_COUNT;

  UPDATE public.profiles SET bio = attempted_cross_bio WHERE user_id = bob_id;
  GET DIAGNOSTICS cross_update_rows = ROW_COUNT;

  BEGIN
    INSERT INTO public.profiles (user_id, full_name, roll_number)
    VALUES (bob_id, 'Hijack', substr('HIJ' || stamp, 1, 20));
    cross_insert_blocked := false;
  EXCEPTION WHEN OTHERS THEN
    cross_insert_blocked := true;
    cross_insert_error := SQLERRM;
  END;

  DELETE FROM public.profiles WHERE user_id = bob_id;
  GET DIAGNOSTICS cross_delete_rows = ROW_COUNT;

  SELECT count(*) INTO cross_select_rows
  FROM public.profiles WHERE user_id = bob_id;

  --------------------------------------------------------------------
  -- Act as anon (no jwt claims -> auth.uid() returns NULL).
  --------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', '', true);

  BEGIN
    UPDATE public.profiles SET bio = attempted_anon_bio WHERE user_id = alice_id;
    GET DIAGNOSTICS anon_update_rows = ROW_COUNT;
    anon_update_blocked := (anon_update_rows = 0);
  EXCEPTION WHEN OTHERS THEN
    anon_update_blocked := true;
    anon_update_error := SQLERRM;
  END;

  --------------------------------------------------------------------
  -- Read back Bob's row via the privileged cleanup path before deleting.
  --------------------------------------------------------------------
  -- Re-establish a privileged read by calling setup-only helpers? Simpler: read while
  -- still acting as Alice would return nothing; instead temporarily clear claims and
  -- query through a SECURITY DEFINER reader.
  SELECT bio, true
    INTO bob_bio_after, bob_still_exists
  FROM public._test_profiles_rls_read_bob(bob_id);

  PERFORM public._test_profiles_rls_cleanup(alice_id, bob_id);

  RETURN jsonb_build_object(
    'alice_id', alice_id,
    'bob_id', bob_id,
    'own_update_rows', own_update_rows,
    'own_bio_new', own_bio_new,
    'cross_update_rows', cross_update_rows,
    'cross_insert_blocked', cross_insert_blocked,
    'cross_insert_error', cross_insert_error,
    'cross_delete_rows', cross_delete_rows,
    'cross_select_rows', cross_select_rows,
    'anon_update_blocked', anon_update_blocked,
    'anon_update_rows', anon_update_rows,
    'anon_update_error', anon_update_error,
    'bob_bio_after', bob_bio_after,
    'bob_still_exists', bob_still_exists,
    'attempted_cross_bio', attempted_cross_bio,
    'attempted_anon_bio', attempted_anon_bio
  );
EXCEPTION WHEN OTHERS THEN
  BEGIN
    PERFORM public._test_profiles_rls_cleanup(alice_id, bob_id);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RAISE;
END;
$$;

-- Privileged read used by the orchestrator to verify Bob's row after the RLS attempts.
CREATE OR REPLACE FUNCTION public._test_profiles_rls_read_bob(_bob uuid)
RETURNS TABLE(bio text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.bio FROM public.profiles p WHERE p.user_id = _bob;
$$;

REVOKE ALL ON FUNCTION public._test_profiles_rls_read_bob(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._test_profiles_rls_read_bob(uuid) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public._test_profiles_rls_scenarios() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._test_profiles_rls_scenarios() TO anon, authenticated, service_role;
