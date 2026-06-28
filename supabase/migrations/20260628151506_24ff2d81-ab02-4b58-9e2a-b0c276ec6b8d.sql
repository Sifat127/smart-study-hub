
-- Audit log table
CREATE TABLE public.chapter_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid,
  course_id uuid,
  chapter_title text,
  action text NOT NULL CHECK (action IN ('insert','update','delete')),
  field_name text,
  old_value text,
  new_value text,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chapter_audit_log_changed_at_idx ON public.chapter_audit_log (changed_at DESC);
CREATE INDEX chapter_audit_log_chapter_id_idx ON public.chapter_audit_log (chapter_id);

GRANT SELECT ON public.chapter_audit_log TO authenticated;
GRANT ALL ON public.chapter_audit_log TO service_role;

ALTER TABLE public.chapter_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read chapter audit log"
  ON public.chapter_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger function
CREATE OR REPLACE FUNCTION public.log_chapter_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.chapter_audit_log
      (chapter_id, course_id, chapter_title, action, field_name, old_value, new_value, changed_by)
    VALUES
      (NEW.id, NEW.course_id, NEW.title, 'insert', NULL, NULL, NEW.title, actor);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.title IS DISTINCT FROM OLD.title THEN
      INSERT INTO public.chapter_audit_log (chapter_id, course_id, chapter_title, action, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, NEW.course_id, NEW.title, 'update', 'title', OLD.title, NEW.title, actor);
    END IF;
    IF NEW.description IS DISTINCT FROM OLD.description THEN
      INSERT INTO public.chapter_audit_log (chapter_id, course_id, chapter_title, action, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, NEW.course_id, NEW.title, 'update', 'description', OLD.description, NEW.description, actor);
    END IF;
    IF NEW.course_id IS DISTINCT FROM OLD.course_id THEN
      INSERT INTO public.chapter_audit_log (chapter_id, course_id, chapter_title, action, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, NEW.course_id, NEW.title, 'update', 'course_id', OLD.course_id::text, NEW.course_id::text, actor);
    END IF;
    IF NEW.pdf_name IS DISTINCT FROM OLD.pdf_name THEN
      INSERT INTO public.chapter_audit_log (chapter_id, course_id, chapter_title, action, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, NEW.course_id, NEW.title, 'update', 'pdf_name', OLD.pdf_name, NEW.pdf_name, actor);
    END IF;
    IF NEW.pdf_url IS DISTINCT FROM OLD.pdf_url THEN
      INSERT INTO public.chapter_audit_log (chapter_id, course_id, chapter_title, action, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, NEW.course_id, NEW.title, 'update', 'pdf_url', OLD.pdf_url, NEW.pdf_url, actor);
    END IF;
    IF NEW.file_id IS DISTINCT FROM OLD.file_id THEN
      INSERT INTO public.chapter_audit_log (chapter_id, course_id, chapter_title, action, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, NEW.course_id, NEW.title, 'update', 'file_id', OLD.file_id::text, NEW.file_id::text, actor);
    END IF;
    IF NEW.notes_name IS DISTINCT FROM OLD.notes_name THEN
      INSERT INTO public.chapter_audit_log (chapter_id, course_id, chapter_title, action, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, NEW.course_id, NEW.title, 'update', 'notes_name', OLD.notes_name, NEW.notes_name, actor);
    END IF;
    IF NEW.notes_url IS DISTINCT FROM OLD.notes_url THEN
      INSERT INTO public.chapter_audit_log (chapter_id, course_id, chapter_title, action, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, NEW.course_id, NEW.title, 'update', 'notes_url', OLD.notes_url, NEW.notes_url, actor);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.chapter_audit_log
      (chapter_id, course_id, chapter_title, action, field_name, old_value, new_value, changed_by)
    VALUES
      (OLD.id, OLD.course_id, OLD.title, 'delete', NULL, OLD.title, NULL, actor);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER chapters_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.chapters
FOR EACH ROW EXECUTE FUNCTION public.log_chapter_changes();
