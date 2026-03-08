CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  department text NOT NULL,
  semester integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Anyone can read courses
CREATE POLICY "Anyone can read courses"
ON public.courses FOR SELECT
TO public
USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert courses"
ON public.courses FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update
CREATE POLICY "Admins can update courses"
ON public.courses FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete
CREATE POLICY "Admins can delete courses"
ON public.courses FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed some initial data
INSERT INTO public.courses (code, name, department, semester) VALUES
  ('CSE101', 'Introduction to Programming', 'CSE', 1),
  ('CSE201', 'Data Structures', 'CSE', 3),
  ('EEE101', 'Circuit Analysis', 'EEE', 1),
  ('BBA101', 'Business Communication', 'BBA', 1),
  ('CSE301', 'Database Management', 'CSE', 5);
