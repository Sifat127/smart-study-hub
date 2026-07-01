CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_roll text;
  v_exists boolean;
BEGIN
  IF lower(NEW.email) !~ '^[^@\s]+@diu\.edu\.bd$' THEN
    RAISE EXCEPTION 'Only @diu.edu.bd email addresses are allowed to register.'
      USING ERRCODE = 'check_violation';
  END IF;

  v_roll := nullif(btrim(NEW.raw_user_meta_data ->> 'roll_number'), '');

  IF v_roll IS NOT NULL AND v_roll !~ '^[A-Za-z0-9-]{3,20}$' THEN
    RAISE EXCEPTION 'Roll number must be 3-20 characters, letters, numbers or dashes only.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Pre-check roll uniqueness so we don't abort the surrounding transaction
  -- with a unique_violation (which GoTrue surfaces as a generic 500).
  IF v_roll IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE lower(roll_number) = lower(v_roll)
    ) INTO v_exists;

    IF v_exists THEN
      RAISE EXCEPTION 'This roll number is already registered.'
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, roll_number)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name'
    ),
    v_roll
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;