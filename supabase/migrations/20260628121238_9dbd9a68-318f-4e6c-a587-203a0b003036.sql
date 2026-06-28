DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'file_visibility'
  ) THEN
    CREATE TYPE public.file_visibility AS ENUM ('authenticated', 'private');
  END IF;
END $$;

UPDATE public.files
SET visibility = 'authenticated', public_url = NULL
WHERE visibility = 'public';

DROP POLICY IF EXISTS "Authenticated can read public/authenticated files" ON public.files;
DROP POLICY IF EXISTS "Authenticated can read allowed files" ON public.files;
DROP POLICY IF EXISTS "Uploader or admin can insert files" ON public.files;
DROP POLICY IF EXISTS "Uploader or admin can update files" ON public.files;

ALTER TABLE public.files
  DROP CONSTRAINT IF EXISTS files_visibility_check;

ALTER TABLE public.files
  ALTER COLUMN visibility DROP DEFAULT;

ALTER TABLE public.files
  ALTER COLUMN visibility TYPE public.file_visibility
  USING visibility::public.file_visibility;

ALTER TABLE public.files
  ALTER COLUMN visibility SET DEFAULT 'authenticated'::public.file_visibility;

ALTER TABLE public.files
  ALTER COLUMN visibility SET NOT NULL;

CREATE POLICY "Authenticated can read allowed files"
  ON public.files
  FOR SELECT
  TO authenticated
  USING (
    visibility = 'authenticated'::public.file_visibility
    OR uploader_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "Uploader or admin can insert files"
  ON public.files
  FOR INSERT
  TO authenticated
  WITH CHECK (uploader_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Uploader or admin can update files"
  ON public.files
  FOR UPDATE
  TO authenticated
  USING (uploader_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (uploader_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Authenticated users can delete PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete PDFs" ON storage.objects;
CREATE POLICY "Admins can delete PDFs"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'pdfs'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );