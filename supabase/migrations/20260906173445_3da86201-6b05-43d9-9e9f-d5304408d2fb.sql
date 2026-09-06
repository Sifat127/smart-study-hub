CREATE TABLE public.chapter_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapter_comments TO authenticated;
GRANT ALL ON public.chapter_comments TO service_role;

ALTER TABLE public.chapter_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read comments"
  ON public.chapter_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users insert own comments"
  ON public.chapter_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own comments"
  ON public.chapter_comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users or admins delete comments"
  ON public.chapter_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX chapter_comments_chapter_idx ON public.chapter_comments (chapter_id, created_at DESC);

CREATE TRIGGER chapter_comments_set_updated_at
  BEFORE UPDATE ON public.chapter_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE VIEW public.chapter_comments_public
WITH (security_invoker = true) AS
  SELECT c.id, c.chapter_id, c.user_id, c.body, c.created_at,
         p.full_name, p.avatar_url
  FROM public.chapter_comments c
  LEFT JOIN public.profiles p ON p.user_id = c.user_id;

GRANT SELECT ON public.chapter_comments_public TO authenticated;