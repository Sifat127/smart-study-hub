CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF lower(NEW.email) !~ '^[^@\s]+@diu\.edu\.bd$' THEN
    RAISE EXCEPTION 'Only @diu.edu.bd email addresses are allowed to register.'
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$function$;