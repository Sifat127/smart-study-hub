
-- 1. Replace the permissive "Anyone can read chapters" policy with an
--    authenticated-only SELECT policy. Anon visitors must now go through
--    the chapters_public view, which structurally excludes sensitive
--    columns instead of relying on column-level grants.
DROP POLICY IF EXISTS "Anyone can read chapters" ON public.chapters;

CREATE POLICY "Authenticated can read chapters"
ON public.chapters
FOR SELECT
TO authenticated
USING (true);

-- 2. Revoke direct table access from anon. The view below is how anon
--    reads catalog data.
REVOKE ALL ON public.chapters FROM anon;

-- 3. Public catalog view — only safe columns, no storage paths/URLs/file_id.
--    security_invoker=off (default) means the view executes with the owner's
--    privileges, so it bypasses the new authenticated-only RLS policy and
--    can serve anonymous catalog browsing safely.
DROP VIEW IF EXISTS public.chapters_public;
CREATE VIEW public.chapters_public AS
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
