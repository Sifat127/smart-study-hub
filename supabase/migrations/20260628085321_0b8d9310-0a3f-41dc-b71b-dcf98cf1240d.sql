
-- Files table: single source of truth for all uploaded assets
CREATE TABLE public.files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  unique_filename TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  storage_provider TEXT NOT NULL DEFAULT 'r2',
  bucket_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  sha256 TEXT,
  uploader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject TEXT,
  department TEXT,
  semester TEXT,
  course_code TEXT,
  course_id UUID,
  year TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  visibility TEXT NOT NULL DEFAULT 'authenticated' CHECK (visibility IN ('public','authenticated','private')),
  download_count BIGINT NOT NULL DEFAULT 0,
  public_url TEXT,
  upload_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX files_department_semester_idx ON public.files (department, semester);
CREATE INDEX files_course_id_idx ON public.files (course_id);
CREATE INDEX files_sha256_idx ON public.files (sha256);
CREATE INDEX files_tags_gin_idx ON public.files USING GIN (tags);
CREATE INDEX files_uploader_idx ON public.files (uploader_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.files TO authenticated;
GRANT ALL ON public.files TO service_role;

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read public/authenticated files"
  ON public.files FOR SELECT
  TO authenticated
  USING (visibility IN ('public','authenticated') OR uploader_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Uploader or admin can insert files"
  ON public.files FOR INSERT
  TO authenticated
  WITH CHECK (uploader_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Uploader or admin can update files"
  ON public.files FOR UPDATE
  TO authenticated
  USING (uploader_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (uploader_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Uploader or admin can delete files"
  ON public.files FOR DELETE
  TO authenticated
  USING (uploader_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER files_set_last_updated
  BEFORE UPDATE ON public.files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Wait, update_updated_at_column updates "updated_at" not "last_updated". Use inline trigger.
DROP TRIGGER files_set_last_updated ON public.files;

CREATE OR REPLACE FUNCTION public.files_touch_last_updated()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER files_set_last_updated
  BEFORE UPDATE ON public.files
  FOR EACH ROW EXECUTE FUNCTION public.files_touch_last_updated();

-- Add file_id references on existing tables (nullable, legacy *_url columns kept as fallback)
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS file_id UUID REFERENCES public.files(id) ON DELETE SET NULL;
ALTER TABLE public.student_uploads ADD COLUMN IF NOT EXISTS file_id UUID REFERENCES public.files(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS chapters_file_id_idx ON public.chapters (file_id);
CREATE INDEX IF NOT EXISTS student_uploads_file_id_idx ON public.student_uploads (file_id);

-- Deletion-failure queue for janitor retries
CREATE TABLE public.file_deletion_failures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  object_key TEXT NOT NULL,
  bucket_name TEXT NOT NULL,
  storage_provider TEXT NOT NULL,
  reason TEXT,
  attempts INT NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_deletion_failures TO authenticated;
GRANT ALL ON public.file_deletion_failures TO service_role;

ALTER TABLE public.file_deletion_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage deletion failures"
  ON public.file_deletion_failures FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
