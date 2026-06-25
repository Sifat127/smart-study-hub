CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_roll text;
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

  BEGIN
    INSERT INTO public.profiles (user_id, full_name, roll_number)
    VALUES (
      NEW.id,
      COALESCE(
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.raw_user_meta_data ->> 'name'
      ),
      v_roll
    );
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'This roll number is already registered.'
      USING ERRCODE = 'unique_violation';
  END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$function$;