
CREATE TABLE public.chapter_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('pdf','notes')),
  file_name text,
  downloaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chapter_downloads_user_idx ON public.chapter_downloads (user_id, downloaded_at DESC);
CREATE INDEX chapter_downloads_chapter_idx ON public.chapter_downloads (chapter_id, downloaded_at DESC);

GRANT SELECT, INSERT ON public.chapter_downloads TO authenticated;
GRANT ALL ON public.chapter_downloads TO service_role;

ALTER TABLE public.chapter_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own downloads"
  ON public.chapter_downloads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own downloads"
  ON public.chapter_downloads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins delete downloads"
  ON public.chapter_downloads FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
