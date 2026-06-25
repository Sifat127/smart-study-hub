
CREATE OR REPLACE FUNCTION public._test_profile_audit_log_scenarios()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  stamp text := extract(epoch FROM clock_timestamp())::text || floor(random() * 1e6)::text;
  admin_email text := 'audit_admin_' || stamp || '@diu.edu.bd';
  target_email text := 'audit_target_' || stamp || '@diu.edu.bd';
  plain_email text := 'audit_plain_' || stamp || '@diu.edu.bd';
  admin_roll text := substr('AUD-A-' || stamp, 1, 20);
  target_roll text := substr('AUD-T-' || stamp, 1, 20);
  plain_roll text := substr('AUD-P-' || stamp, 1, 20);
  admin_id uuid;
  target_id uuid;
  plain_id uuid;
  before_ts timestamptz;
  after_ts timestamptz;
  report jsonb := '{}'::jsonb;
  full_update_rows jsonb;
  partial_update_rows jsonb;
  self_edit_count int;
  nonadmin_edit_count int;
BEGIN
  -- Seed three auth.users; handle_new_user trigger creates their profiles + user_roles rows.
  INSERT INTO auth.users (id, instance_id, email, aud, role, raw_user_meta_data)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', admin_email,
          'authenticated', 'authenticated',
          jsonb_build_object('full_name', 'Audit Admin', 'roll_number', admin_roll))
  RETURNING id INTO admin_id;

  INSERT INTO auth.users (id, instance_id, email, aud, role, raw_user_meta_data)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', target_email,
          'authenticated', 'authenticated',
          jsonb_build_object('full_name', 'Audit Target', 'roll_number', target_roll))
  RETURNING id INTO target_id;

  INSERT INTO auth.users (id, instance_id, email, aud, role, raw_user_meta_data)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', plain_email,
          'authenticated', 'authenticated',
          jsonb_build_object('full_name', 'Audit Plain', 'roll_number', plain_roll))
  RETURNING id INTO plain_id;

  UPDATE public.user_roles SET role = 'admin' WHERE user_id = admin_id;

  -- Clear any rows produced by bootstrap inserts (none expected, but be safe).
  DELETE FROM public.profile_audit_log
  WHERE target_user_id IN (admin_id, target_id, plain_id);

  ----------------------------------------------------------------------
  -- Scenario 1: admin edits every supported field.
  ----------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims',
                     jsonb_build_object('sub', admin_id::text)::text, true);
  before_ts := clock_timestamp();
  UPDATE public.profiles SET
    full_name = 'Edited Name',
    roll_number = 'EDIT-ROLL-01',
    phone_number = '+8801711000111',
    section = '63_A',
    department = 'Computer Science & Engineering',
    batch = '60th',
    bio = 'Updated by admin'
  WHERE user_id = target_id;
  after_ts := clock_timestamp();

  SELECT jsonb_agg(jsonb_build_object(
            'field_name', field_name,
            'old_value', old_value,
            'new_value', new_value,
            'changed_by', changed_by,
            'changed_at', changed_at,
            'in_window', changed_at BETWEEN before_ts - interval '5 seconds'
                                       AND after_ts + interval '5 seconds'
         ) ORDER BY field_name)
  INTO full_update_rows
  FROM public.profile_audit_log
  WHERE target_user_id = target_id;

  ----------------------------------------------------------------------
  -- Scenario 2: admin updates again but only `bio` actually changes.
  ----------------------------------------------------------------------
  DELETE FROM public.profile_audit_log WHERE target_user_id = target_id;
  UPDATE public.profiles SET
    full_name = 'Edited Name',
    roll_number = 'EDIT-ROLL-01',
    phone_number = '+8801711000111',
    section = '63_A',
    department = 'Computer Science & Engineering',
    batch = '60th',
    bio = 'Second revision'
  WHERE user_id = target_id;

  SELECT jsonb_agg(jsonb_build_object(
            'field_name', field_name,
            'old_value', old_value,
            'new_value', new_value,
            'changed_by', changed_by
         ))
  INTO partial_update_rows
  FROM public.profile_audit_log
  WHERE target_user_id = target_id;

  ----------------------------------------------------------------------
  -- Scenario 3: target user edits their own profile (must NOT audit).
  ----------------------------------------------------------------------
  DELETE FROM public.profile_audit_log WHERE target_user_id = target_id;
  PERFORM set_config('request.jwt.claims',
                     jsonb_build_object('sub', target_id::text)::text, true);
  UPDATE public.profiles SET bio = 'self update', section = 'Z'
  WHERE user_id = target_id;
  SELECT count(*) INTO self_edit_count
  FROM public.profile_audit_log WHERE target_user_id = target_id;

  ----------------------------------------------------------------------
  -- Scenario 4: a non-admin user edits the target's profile (must NOT audit).
  ----------------------------------------------------------------------
  DELETE FROM public.profile_audit_log WHERE target_user_id = target_id;
  PERFORM set_config('request.jwt.claims',
                     jsonb_build_object('sub', plain_id::text)::text, true);
  UPDATE public.profiles SET bio = 'sneaky edit' WHERE user_id = target_id;
  SELECT count(*) INTO nonadmin_edit_count
  FROM public.profile_audit_log WHERE target_user_id = target_id;

  report := jsonb_build_object(
    'admin_id', admin_id,
    'target_id', target_id,
    'target_name_before', 'Audit Target',
    'target_roll_before', target_roll,
    'full_update_rows', coalesce(full_update_rows, '[]'::jsonb),
    'partial_update_rows', coalesce(partial_update_rows, '[]'::jsonb),
    'self_edit_count', self_edit_count,
    'nonadmin_edit_count', nonadmin_edit_count
  );

  -- Cleanup (cascades through profiles/user_roles; remove audit rows manually).
  DELETE FROM public.profile_audit_log
  WHERE target_user_id IN (admin_id, target_id, plain_id)
     OR changed_by IN (admin_id, target_id, plain_id);
  DELETE FROM auth.users WHERE id IN (admin_id, target_id, plain_id);

  RETURN report;
EXCEPTION WHEN OTHERS THEN
  -- Best-effort cleanup on failure so reruns stay clean.
  BEGIN
    DELETE FROM public.profile_audit_log
    WHERE target_user_id IN (admin_id, target_id, plain_id)
       OR changed_by IN (admin_id, target_id, plain_id);
    DELETE FROM auth.users WHERE id IN (admin_id, target_id, plain_id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RAISE;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public._test_profile_audit_log_scenarios() FROM PUBLIC;
-- Only the in-sandbox test runner role can call this helper.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public._test_profile_audit_log_scenarios() TO sandbox_exec';
  END IF;
END $$;
