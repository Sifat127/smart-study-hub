CREATE TABLE public.pdf_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id uuid REFERENCES public.files(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE CASCADE,
  item_name text NOT NULL CHECK (length(item_name) BETWEEN 1 AND 300),
  reason text NOT NULL CHECK (reason IN ('broken','outdated','wrong_content','other')),
  details text CHECK (details IS NULL OR length(details) <= 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (file_id IS NOT NULL OR chapter_id IS NOT NULL)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_reports TO authenticated;
GRANT ALL ON public.pdf_reports TO service_role;
ALTER TABLE public.pdf_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users create own reports" ON public.pdf_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() AND status = 'open');
CREATE POLICY "Users view own reports, admins all" ON public.pdf_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update reports" ON public.pdf_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete reports" ON public.pdf_reports FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX pdf_reports_status_idx ON public.pdf_reports(status, created_at DESC);
CREATE TRIGGER pdf_reports_set_updated_at BEFORE UPDATE ON public.pdf_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();