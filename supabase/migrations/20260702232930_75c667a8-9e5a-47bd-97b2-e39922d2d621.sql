-- Keep contribution aggregate totals readable without exposing raw file storage metadata.
ALTER VIEW public.contributor_stats SET (security_invoker = off);
GRANT SELECT ON public.contributor_stats TO anon, authenticated, service_role;

-- Safe display-only file listing for contributor profile cards.
CREATE OR REPLACE VIEW public.files_public
WITH (security_invoker = off) AS
SELECT
  id,
  title,
  original_filename,
  upload_date,
  uploader_id,
  visibility
FROM public.files
WHERE visibility = 'authenticated'::public.file_visibility;

GRANT SELECT ON public.files_public TO anon, authenticated, service_role;

-- Broadcast upload-related changes so contribution totals and upload lists refresh live.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.files;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_uploads;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

ALTER TABLE public.files REPLICA IDENTITY FULL;
ALTER TABLE public.student_uploads REPLICA IDENTITY FULL;