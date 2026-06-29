
-- ============ Phase 1: pdf_reactions ============
CREATE TABLE public.pdf_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('like','dislike')),
  reacted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (file_id, user_id)
);

GRANT SELECT ON public.pdf_reactions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_reactions TO authenticated;
GRANT ALL ON public.pdf_reactions TO service_role;

ALTER TABLE public.pdf_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reactions are publicly readable"
  ON public.pdf_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users insert their own reaction"
  ON public.pdf_reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own reaction"
  ON public.pdf_reactions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own reaction"
  ON public.pdf_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_pdf_reactions_file ON public.pdf_reactions(file_id);
CREATE INDEX idx_pdf_reactions_user ON public.pdf_reactions(user_id);

-- ============ Phase 1: pdf_views ============
CREATE TABLE public.pdf_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  viewed_day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date
);

GRANT SELECT ON public.pdf_views TO anon, authenticated;
GRANT INSERT ON public.pdf_views TO authenticated;
GRANT ALL ON public.pdf_views TO service_role;

ALTER TABLE public.pdf_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Views are publicly readable"
  ON public.pdf_views FOR SELECT USING (true);

-- No direct insert policy: clients must use record_pdf_view() RPC.

CREATE UNIQUE INDEX idx_pdf_views_dedupe ON public.pdf_views(file_id, viewer_id, viewed_day)
  WHERE viewer_id IS NOT NULL;
CREATE INDEX idx_pdf_views_file ON public.pdf_views(file_id);

-- ============ RPC: set_pdf_reaction ============
CREATE OR REPLACE FUNCTION public.set_pdf_reaction(_file_id uuid, _reaction text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF _reaction IS NULL THEN
    DELETE FROM public.pdf_reactions WHERE file_id = _file_id AND user_id = uid;
    RETURN;
  END IF;

  IF _reaction NOT IN ('like','dislike') THEN
    RAISE EXCEPTION 'Invalid reaction type' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.pdf_reactions (file_id, user_id, reaction_type)
  VALUES (_file_id, uid, _reaction)
  ON CONFLICT (file_id, user_id)
  DO UPDATE SET reaction_type = EXCLUDED.reaction_type, reacted_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_pdf_reaction(uuid, text) TO authenticated;

-- ============ RPC: record_pdf_view ============
CREATE OR REPLACE FUNCTION public.record_pdf_view(_file_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.pdf_views (file_id, viewer_id)
  VALUES (_file_id, uid)
  ON CONFLICT (file_id, viewer_id, viewed_day) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_pdf_view(uuid) TO authenticated;

-- ============ Views ============
CREATE OR REPLACE VIEW public.pdf_reaction_counts AS
SELECT
  f.id AS file_id,
  COALESCE(SUM(CASE WHEN r.reaction_type = 'like' THEN 1 ELSE 0 END), 0)::bigint AS likes,
  COALESCE(SUM(CASE WHEN r.reaction_type = 'dislike' THEN 1 ELSE 0 END), 0)::bigint AS dislikes
FROM public.files f
LEFT JOIN public.pdf_reactions r ON r.file_id = f.id
GROUP BY f.id;

GRANT SELECT ON public.pdf_reaction_counts TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.pdf_view_counts AS
SELECT f.id AS file_id, COUNT(v.id)::bigint AS views
FROM public.files f
LEFT JOIN public.pdf_views v ON v.file_id = f.id
GROUP BY f.id;

GRANT SELECT ON public.pdf_view_counts TO anon, authenticated, service_role;

-- ============ Phase 2: contributor_stats view ============
CREATE OR REPLACE VIEW public.contributor_stats AS
WITH uploads AS (
  SELECT
    f.uploader_id AS user_id,
    COUNT(f.id)::bigint AS uploads,
    COALESCE(SUM(rc.likes), 0)::bigint AS likes_received,
    COALESCE(SUM(rc.dislikes), 0)::bigint AS dislikes_received,
    COALESCE(SUM(vc.views), 0)::bigint AS views
  FROM public.files f
  LEFT JOIN public.pdf_reaction_counts rc ON rc.file_id = f.id
  LEFT JOIN public.pdf_view_counts vc ON vc.file_id = f.id
  WHERE f.uploader_id IS NOT NULL
    AND f.visibility = 'authenticated'
  GROUP BY f.uploader_id
)
SELECT
  p.user_id,
  p.full_name,
  p.roll_number,
  p.department,
  p.batch,
  p.avatar_url,
  COALESCE(u.uploads, 0)::bigint AS uploads,
  COALESCE(u.likes_received, 0)::bigint AS likes_received,
  COALESCE(u.dislikes_received, 0)::bigint AS dislikes_received,
  COALESCE(u.views, 0)::bigint AS views,
  DENSE_RANK() OVER (
    ORDER BY COALESCE(u.uploads,0) DESC,
             COALESCE(u.likes_received,0) DESC,
             COALESCE(u.views,0) DESC
  ) AS rank
FROM public.profiles p
LEFT JOIN uploads u ON u.user_id = p.user_id;

GRANT SELECT ON public.contributor_stats TO anon, authenticated, service_role;

-- ============ Index helpers ============
CREATE INDEX IF NOT EXISTS idx_files_uploader_visibility ON public.files(uploader_id, visibility);
