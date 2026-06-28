
REVOKE SELECT ON public.chapters FROM anon;

GRANT SELECT (
  id,
  course_id,
  title,
  description,
  pdf_name,
  notes_name,
  uploaded_at
) ON public.chapters TO anon;

GRANT SELECT ON public.chapters TO authenticated;
