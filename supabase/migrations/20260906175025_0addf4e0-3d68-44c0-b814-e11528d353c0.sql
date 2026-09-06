CREATE OR REPLACE VIEW public.files_public
WITH (security_invoker = off) AS
SELECT
  f.id,
  f.title,
  f.original_filename,
  f.upload_date,
  f.uploader_id,
  f.visibility,
  f.department,
  f.semester,
  f.course_code,
  f.course_id,
  f.subject,
  f.file_size,
  f.file_type,
  p.full_name AS uploader_name,
  p.avatar_url AS uploader_avatar_url
FROM public.files f
LEFT JOIN public.profiles p ON p.user_id = f.uploader_id
WHERE f.visibility = 'authenticated'::file_visibility;

GRANT SELECT ON public.files_public TO authenticated;
GRANT SELECT ON public.files_public TO anon;