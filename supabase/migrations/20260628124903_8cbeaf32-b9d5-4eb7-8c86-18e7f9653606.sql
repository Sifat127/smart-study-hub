
-- Recreate the view with security_invoker=on so it enforces the caller's
-- RLS + column privileges instead of running as the view owner.
DROP VIEW IF EXISTS public.chapters_public;
CREATE VIEW public.chapters_public
WITH (security_invoker = on) AS
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

-- Re-add an explicit anon SELECT policy on chapters. Combined with the
-- column-level GRANTs below, anon can only read non-sensitive columns —
-- attempting to select pdf_path / notes_path / pdf_url / notes_url /
-- file_id returns a hard "permission denied for column" error.
CREATE POLICY "Anon can read safe chapter columns"
ON public.chapters
FOR SELECT
TO anon
USING (true);

-- Column-level grants: anon gets only the safe catalog columns.
-- (Idempotent re-grant in case any earlier migration drifted.)
REVOKE ALL ON public.chapters FROM anon;
GRANT SELECT (id, course_id, title, description, pdf_name, notes_name, uploaded_at)
  ON public.chapters TO anon;
