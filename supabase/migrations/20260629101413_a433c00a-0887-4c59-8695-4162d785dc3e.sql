
DROP POLICY IF EXISTS "Anon can read safe chapter columns" ON public.chapters;

CREATE OR REPLACE VIEW public.chapters_public
WITH (security_invoker = true) AS
SELECT
  id,
  course_id,
  title,
  description,
  pdf_name,
  notes_name,
  uploaded_at
FROM public.chapters;

GRANT SELECT ON public.chapters_public TO anon, authenticated;

REVOKE SELECT ON public.files FROM anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.files TO authenticated;
GRANT ALL ON public.files TO service_role;
