
CREATE TABLE public.student_uploads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('material','notes')),
  batch text NOT NULL,
  student_name text,
  title text NOT NULL,
  description text,
  file_name text NOT NULL,
  file_url text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.student_uploads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_uploads TO authenticated;
GRANT ALL ON public.student_uploads TO service_role;

ALTER TABLE public.student_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read student uploads"
  ON public.student_uploads FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert own uploads"
  ON public.student_uploads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update own uploads"
  ON public.student_uploads FOR UPDATE
  TO authenticated
  USING (auth.uid() = uploaded_by OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete own uploads or admins"
  ON public.student_uploads FOR DELETE
  TO authenticated
  USING (auth.uid() = uploaded_by OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_student_uploads_course_kind ON public.student_uploads(course_id, kind);
