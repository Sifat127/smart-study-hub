
-- 1. Public bucket: drop anon listing, restrict to authenticated
DROP POLICY IF EXISTS "Anyone can read PDFs" ON storage.objects;
CREATE POLICY "Authenticated users can read PDFs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'pdfs');

-- 2. Contact form: replace WITH CHECK (true) with real validation
DROP POLICY IF EXISTS "Anyone can submit contact form" ON public.contact_submissions;
CREATE POLICY "Anyone can submit contact form"
  ON public.contact_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    name IS NOT NULL AND length(btrim(name)) BETWEEN 1 AND 120
    AND email IS NOT NULL AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 254
    AND message IS NOT NULL AND length(btrim(message)) BETWEEN 5 AND 5000
  );

-- 3. user_roles: explicit deny on direct INSERT (trigger uses SECURITY DEFINER so it bypasses)
CREATE POLICY "No direct role inserts"
  ON public.user_roles FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);
CREATE POLICY "No direct role deletes"
  ON public.user_roles FOR DELETE
  TO anon, authenticated
  USING (false);

-- 4. SECURITY DEFINER functions: revoke broad EXECUTE
-- Trigger helpers — never called via API
REVOKE EXECUTE ON FUNCTION public.handle_new_user()               FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()      FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_profile_admin_changes()     FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.files_touch_last_updated()      FROM anon, authenticated, PUBLIC;

-- Test harness — never callable from clients
REVOKE EXECUTE ON FUNCTION public._test_profile_audit_log_scenarios() FROM anon, authenticated, PUBLIC;

-- has_role: only the SQL engine needs it (used in policies). Keep service_role.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, PUBLIC;

-- admin_list_users: signed-in admins still need to call it from the app, but anon never
REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
