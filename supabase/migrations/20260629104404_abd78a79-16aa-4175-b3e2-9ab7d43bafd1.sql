
CREATE OR REPLACE FUNCTION public._test_profiles_rls_scenarios()
RETURNS jsonb
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
  alice_id    uuid;
  bob_id      uuid;

  own_update_rows  int := 0;
  cross_update_rows int := 0;
  cross_delete_rows int := 0;
  cross_select_rows int := 0;

  cross_insert_blocked boolean := false;
  cross_insert_error text := NULL;

  anon_update_blocked boolean := false;
  anon_update_error text := NULL;
  anon_update_rows int := 0;

  bob_bio_after text;
  bob_still_exists boolean;

  own_bio_new text := 'own-update-' || stamp;
  attempted_cross_bio text := 'cross-update-' || stamp;
  attempted_anon_bio text := 'anon-update-' || stamp;
BEGIN
  -- Create two real auth users (handle_new_user trigger fires and inserts profiles + user_roles).
  INSERT INTO auth.users (id, instance_id, email, aud, role, raw_user_meta_data, email_confirmed_at)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', alice_email,
          'authenticated', 'authenticated',
          jsonb_build_object('full_name', 'RLS Alice', 'roll_number', alice_roll),
          now())
  RETURNING id INTO alice_id;

  INSERT INTO auth.users (id, instance_id, email, aud, role, raw_user_meta_data, email_confirmed_at)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', bob_email,
          'authenticated', 'authenticated',
          jsonb_build_object('full_name', 'RLS Bob', 'roll_number', bob_roll),
          now())
  RETURNING id INTO bob_id;

  --------------------------------------------------------------------
  -- Act as Alice (authenticated role + jwt.sub = alice_id)
  --------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', alice_id::text, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  -- 1) Update own profile (expect 1 row).
  UPDATE public.profiles SET bio = own_bio_new WHERE user_id = alice_id;
  GET DIAGNOSTICS own_update_rows = ROW_COUNT;

  -- 2) Try to update Bob's profile (expect 0 rows — RLS filters it out).
  UPDATE public.profiles SET bio = attempted_cross_bio WHERE user_id = bob_id;
  GET DIAGNOSTICS cross_update_rows = ROW_COUNT;

  -- 3) Try to INSERT a row for Bob's user_id (expect WITH CHECK violation).
  BEGIN
    INSERT INTO public.profiles (user_id, full_name, roll_number)
    VALUES (bob_id, 'Hijack', substr('HIJ' || stamp, 1, 20));
    cross_insert_blocked := false;
  EXCEPTION WHEN OTHERS THEN
    cross_insert_blocked := true;
    cross_insert_error := SQLERRM;
  END;

  -- 4) Try to DELETE Bob's profile (expect 0 rows).
  DELETE FROM public.profiles WHERE user_id = bob_id;
  GET DIAGNOSTICS cross_delete_rows = ROW_COUNT;

  -- 5) SELECT Bob's row (expect 0 rows — Alice cannot see it).
  SELECT count(*) INTO cross_select_rows
  FROM public.profiles WHERE user_id = bob_id;

  --------------------------------------------------------------------
  -- Act as anon (no jwt, role = anon)
  --------------------------------------------------------------------
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);
  SET LOCAL ROLE anon;

  BEGIN
    UPDATE public.profiles SET bio = attempted_anon_bio WHERE user_id = alice_id;
    GET DIAGNOSTICS anon_update_rows = ROW_COUNT;
    anon_update_blocked := (anon_update_rows = 0);
  EXCEPTION WHEN OTHERS THEN
    anon_update_blocked := true;
    anon_update_error := SQLERRM;
  END;

  --------------------------------------------------------------------
  -- Verify Bob's row was untouched, then clean up (as definer/postgres).
  --------------------------------------------------------------------
  RESET ROLE;

  SELECT bio INTO bob_bio_after FROM public.profiles WHERE user_id = bob_id;
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = bob_id) INTO bob_still_exists;

  DELETE FROM public.user_roles WHERE user_id IN (alice_id, bob_id);
  DELETE FROM public.profiles  WHERE user_id IN (alice_id, bob_id);
  DELETE FROM auth.users        WHERE id      IN (alice_id, bob_id);

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
  RESET ROLE;
  BEGIN
    DELETE FROM public.user_roles WHERE user_id IN (alice_id, bob_id);
    DELETE FROM public.profiles  WHERE user_id IN (alice_id, bob_id);
    DELETE FROM auth.users        WHERE id      IN (alice_id, bob_id);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public._test_profiles_rls_scenarios() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._test_profiles_rls_scenarios() TO anon, authenticated, service_role;
