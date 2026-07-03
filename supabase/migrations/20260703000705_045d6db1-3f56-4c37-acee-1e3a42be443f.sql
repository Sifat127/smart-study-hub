
CREATE OR REPLACE FUNCTION public.complete_profile(
  _roll_number text,
  _department text,
  _batch text
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  r text := btrim(coalesce(_roll_number, ''));
  d text := btrim(coalesce(_department, ''));
  b text := btrim(coalesce(_batch, ''));
  missing text[] := ARRAY[]::text[];
  dup boolean;
  updated public.profiles;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF r = '' THEN missing := array_append(missing, 'roll_number'); END IF;
  IF d = '' THEN missing := array_append(missing, 'department');  END IF;
  IF b = '' THEN missing := array_append(missing, 'batch');       END IF;

  IF array_length(missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Missing required fields: %', array_to_string(missing, ', ')
      USING ERRCODE = '23514', HINT = array_to_string(missing, ',');
  END IF;

  IF r !~ '^[A-Za-z0-9-]{3,20}$' THEN
    RAISE EXCEPTION 'Roll number must be 3-20 characters, letters, numbers or dashes only.'
      USING ERRCODE = '23514';
  END IF;

  IF length(d) > 100 THEN
    RAISE EXCEPTION 'Department name is too long.' USING ERRCODE = '23514';
  END IF;
  IF length(b) > 20 THEN
    RAISE EXCEPTION 'Batch value is too long.' USING ERRCODE = '23514';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(roll_number) = lower(r) AND user_id <> uid
  ) INTO dup;
  IF dup THEN
    RAISE EXCEPTION 'This roll number is already registered.'
      USING ERRCODE = 'unique_violation';
  END IF;

  UPDATE public.profiles
     SET roll_number = r,
         department  = d,
         batch       = b
   WHERE user_id = uid
   RETURNING * INTO updated;

  IF updated.user_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for current user.' USING ERRCODE = 'P0002';
  END IF;

  RETURN updated;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_profile(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_profile(text, text, text) TO authenticated;
