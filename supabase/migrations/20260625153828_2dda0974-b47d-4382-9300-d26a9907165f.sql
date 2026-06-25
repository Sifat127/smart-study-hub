ALTER TABLE public.profiles DROP COLUMN IF EXISTS room_number;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS section text;

DROP FUNCTION IF EXISTS public.admin_list_users();

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  roll_number text,
  phone_number text,
  section text,
  department text,
  batch text,
  role app_role,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    u.email::text,
    p.full_name,
    p.roll_number,
    p.phone_number,
    p.section,
    p.department,
    p.batch,
    COALESCE(
      (SELECT ur.role FROM public.user_roles ur
       WHERE ur.user_id = p.user_id
       ORDER BY (ur.role = 'admin') DESC
       LIMIT 1),
      'user'::app_role
    ) AS role,
    p.created_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  ORDER BY p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;