
-- 1) Chapters: link notes to a files.id so reactions/views can attach.
ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS notes_file_id uuid REFERENCES public.files(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS chapters_notes_file_id_idx ON public.chapters(notes_file_id);

-- 2) Enable realtime streaming on reactions + views so leaderboards update live.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pdf_reactions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pdf_views;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
ALTER TABLE public.pdf_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.pdf_views REPLICA IDENTITY FULL;

-- 3) Restrict raw reaction/view rows to signed-in users (hides viewer UUID pairs
--    from anonymous visitors). Aggregate counts stay public via the views below.
DROP POLICY IF EXISTS "Reactions are publicly readable" ON public.pdf_reactions;
CREATE POLICY "Reactions readable by authenticated"
  ON public.pdf_reactions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Views are publicly readable" ON public.pdf_views;
CREATE POLICY "Views readable by authenticated"
  ON public.pdf_views FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.pdf_reactions FROM anon;
REVOKE SELECT ON public.pdf_views FROM anon;

-- 4) Aggregate views (owner-run so anon can see totals without touching PII rows).
CREATE OR REPLACE VIEW public.pdf_reaction_counts
WITH (security_invoker = off) AS
SELECT
  f.id AS file_id,
  COALESCE(SUM(CASE WHEN r.reaction_type = 'like' THEN 1 ELSE 0 END), 0)::bigint AS likes,
  COALESCE(SUM(CASE WHEN r.reaction_type = 'dislike' THEN 1 ELSE 0 END), 0)::bigint AS dislikes
FROM public.files f
LEFT JOIN public.pdf_reactions r ON r.file_id = f.id
GROUP BY f.id;

CREATE OR REPLACE VIEW public.pdf_view_counts
WITH (security_invoker = off) AS
SELECT
  f.id AS file_id,
  COUNT(v.id)::bigint AS views
FROM public.files f
LEFT JOIN public.pdf_views v ON v.file_id = f.id
GROUP BY f.id;

GRANT SELECT ON public.pdf_reaction_counts TO anon, authenticated;
GRANT SELECT ON public.pdf_view_counts TO anon, authenticated;
