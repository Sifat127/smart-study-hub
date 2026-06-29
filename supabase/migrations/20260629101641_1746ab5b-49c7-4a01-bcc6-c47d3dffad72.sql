
-- Remove the overly broad authenticated read on the private pdfs bucket.
-- The download-file / storage-download edge functions use service role and
-- bypass storage RLS, so user-initiated downloads continue to work.
DROP POLICY IF EXISTS "Authenticated users can read PDFs" ON storage.objects;

-- Keep an admin-only read so admins can preview/manage PDFs directly.
CREATE POLICY "Admins can read PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'pdfs' AND public.has_role(auth.uid(), 'admin'));
