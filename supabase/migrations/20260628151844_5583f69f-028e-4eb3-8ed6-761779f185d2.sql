
CREATE TABLE public.semesters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  number integer NOT NULL UNIQUE,
  name text NOT NULL,
  description text DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.semesters TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.semesters TO authenticated;
GRANT ALL ON public.semesters TO service_role;

ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Semesters are viewable by everyone"
  ON public.semesters FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert semesters"
  ON public.semesters FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update semesters"
  ON public.semesters FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete semesters"
  ON public.semesters FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_semesters_updated_at
  BEFORE UPDATE ON public.semesters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.semesters (number, name, sort_order)
SELECT n, 'Semester ' || n, n * 10
FROM generate_series(1, 12) n
ON CONFLICT (number) DO NOTHING;
