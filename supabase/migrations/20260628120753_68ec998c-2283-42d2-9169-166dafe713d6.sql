-- Tighten legacy pdfs storage policies.
DROP POLICY IF EXISTS "Authenticated users can upload PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update PDFs" ON storage.objects;

CREATE POLICY "Users upload PDFs only to own folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Admins can update PDFs"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'pdfs'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    bucket_id = 'pdfs'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Direct role mutation from the browser is not allowed. Admin role changes now go
-- through the protected admin-update-user-role edge function using service role.
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "No direct role updates" ON public.user_roles;
DROP POLICY IF EXISTS "No direct role inserts" ON public.user_roles;
DROP POLICY IF EXISTS "No direct role deletes" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "No direct role inserts"
  ON public.user_roles
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "No direct role updates"
  ON public.user_roles
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No direct role deletes"
  ON public.user_roles
  FOR DELETE
  TO anon, authenticated
  USING (false);

-- This app gates file viewing/downloading behind auth, so do not allow rows to
-- advertise unauthenticated public metadata visibility.
UPDATE public.files
SET visibility = 'authenticated', public_url = NULL
WHERE visibility = 'public';

ALTER TABLE public.files
  DROP CONSTRAINT IF EXISTS files_visibility_check;

ALTER TABLE public.files
  ADD CONSTRAINT files_visibility_check
  CHECK (visibility = ANY (ARRAY['authenticated'::text, 'private'::text]));

-- Public visibility is no longer a valid app mode, so only signed-in users can
-- read authenticated files, own files, private own files, or admin-visible files.
DROP POLICY IF EXISTS "Authenticated can read public/authenticated files" ON public.files;
CREATE POLICY "Authenticated can read allowed files"
  ON public.files
  FOR SELECT
  TO authenticated
  USING (
    visibility = 'authenticated'
    OR uploader_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Prevent browser RPC execution of SECURITY DEFINER admin listing.
REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO service_role;