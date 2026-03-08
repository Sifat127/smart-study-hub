CREATE TABLE public.chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  pdf_name text,
  pdf_path text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

-- Anyone can read chapters
CREATE POLICY "Anyone can read chapters"
ON public.chapters FOR SELECT
TO public
USING (true);

-- Admins can insert
CREATE POLICY "Admins can insert chapters"
ON public.chapters FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update
CREATE POLICY "Admins can update chapters"
ON public.chapters FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete
CREATE POLICY "Admins can delete chapters"
ON public.chapters FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
