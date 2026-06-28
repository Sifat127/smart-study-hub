
CREATE TABLE public.departments (
  id text PRIMARY KEY,
  name text NOT NULL,
  full_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'Layers',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.departments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Departments are viewable by everyone"
  ON public.departments FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert departments"
  ON public.departments FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update departments"
  ON public.departments FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete departments"
  ON public.departments FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER departments_set_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.departments (id, name, full_name, description, icon, sort_order) VALUES
  ('cse', 'CSE', 'Computer Science & Engineering', 'Programming, algorithms, data structures, AI, networking and more.', 'Monitor', 10),
  ('eee', 'EEE', 'Electrical & Electronic Engineering', 'Circuits, power systems, electronics, signal processing and control systems.', 'Zap', 20),
  ('bba', 'BBA', 'Bachelor of Business Administration', 'Management, marketing, finance, accounting and business strategy.', 'Briefcase', 30),
  ('swe', 'SWE', 'Software Engineering', 'Software development, testing, project management and system design.', 'Code', 40),
  ('cis', 'CIS', 'Computing & Information System', 'Information systems, database management and enterprise solutions.', 'Database', 50),
  ('pharmacy', 'PHARMACY', 'Department of Pharmacy', 'Pharmaceutical sciences, drug design, pharmacology and clinical practice.', 'Pill', 60),
  ('english', 'ENGLISH', 'Department of English', 'English language, literature, linguistics and communication studies.', 'BookText', 70),
  ('law', 'LAW', 'Department of Law', 'Legal studies, constitutional law, criminal law and corporate law.', 'Scale', 80),
  ('textile', 'TEXTILE', 'Textile Engineering', 'Textile manufacturing, fiber science, fabric design and apparel technology.', 'Shirt', 90),
  ('arch', 'ARCH', 'Department of Architecture', 'Architectural design, urban planning, construction and environmental design.', 'Building2', 100),
  ('jmc', 'JMC', 'Journalism, Media & Communication', 'Mass communication, digital media, journalism and public relations.', 'Radio', 110),
  ('thm', 'THM', 'Tourism & Hospitality Management', 'Tourism planning, hotel management, event management and hospitality.', 'Plane', 120),
  ('nfe', 'NFE', 'Nutrition & Food Engineering', 'Food science, nutrition, food processing and quality control.', 'Apple', 130),
  ('ph', 'PH', 'Public Health', 'Epidemiology, health policy, community health and disease prevention.', 'HeartPulse', 140),
  ('mct', 'MCT', 'Multimedia & Creative Technology', 'Animation, game design, film production and digital content creation.', 'Clapperboard', 150),
  ('civil', 'CIVIL', 'Civil Engineering', 'Structural analysis, construction management, transportation and environmental engineering.', 'Building2', 160);
