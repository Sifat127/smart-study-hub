
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
  uid_as_alice uuid;
  uid_as_anon uuid;
  alice_profile_exists boolean;

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
  bob_still_exists boolean := false;

  own_bio_new text := 'own-update-' || stamp;
  attempted_cross_bio text := 'cross-update-' || stamp;
  attempted_anon_bio text := 'anon-update-' || stamp;
BEGIN
  SELECT s.alice_id, s.bob_id INTO alice_id, bob_id
  FROM public._test_profiles_rls_setup() AS s;

  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', alice_id::text, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', alice_id::text, true);

  uid_as_alice := auth.uid();

  -- Confirm Alice's profile exists in the DB (read via privileged helper to bypass RLS).
  alice_profile_exists := EXISTS (SELECT 1 FROM public._test_profiles_rls_read_bob(alice_id));

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

  PERFORM set_config('request.jwt.claims', '', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);
  uid_as_anon := auth.uid();

  BEGIN
    UPDATE public.profiles SET bio = attempted_anon_bio WHERE user_id = alice_id;
    GET DIAGNOSTICS anon_update_rows = ROW_COUNT;
    anon_update_blocked := (anon_update_rows = 0);
  EXCEPTION WHEN OTHERS THEN
    anon_update_blocked := true;
    anon_update_error := SQLERRM;
  END;

  SELECT r.bio INTO bob_bio_after FROM public._test_profiles_rls_read_bob(bob_id) AS r;
  bob_still_exists := EXISTS (SELECT 1 FROM public._test_profiles_rls_read_bob(bob_id));

  PERFORM public._test_profiles_rls_cleanup(alice_id, bob_id);

  RETURN jsonb_build_object(
    'alice_id', alice_id,
    'bob_id', bob_id,
    'uid_as_alice', uid_as_alice,
    'uid_as_anon', uid_as_anon,
    'alice_profile_exists', alice_profile_exists,
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
