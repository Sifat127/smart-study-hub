CREATE TABLE IF NOT EXISTS public.profile_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  changed_by uuid,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_audit_log_target_idx
  ON public.profile_audit_log (target_user_id, changed_at DESC);

GRANT SELECT ON public.profile_audit_log TO authenticated;
GRANT ALL ON public.profile_audit_log TO service_role;

ALTER TABLE public.profile_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view profile audit log" ON public.profile_audit_log;
CREATE POLICY "Admins can view profile audit log"
  ON public.profile_audit_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.log_profile_admin_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  -- Only log when an admin edits someone else's profile.
  IF actor IS NULL OR actor = NEW.user_id THEN
    RETURN NEW;
  END IF;
  IF NOT public.has_role(actor, 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.full_name IS DISTINCT FROM OLD.full_name THEN
    INSERT INTO public.profile_audit_log (target_user_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.user_id, actor, 'full_name', OLD.full_name, NEW.full_name);
  END IF;
  IF NEW.roll_number IS DISTINCT FROM OLD.roll_number THEN
    INSERT INTO public.profile_audit_log (target_user_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.user_id, actor, 'roll_number', OLD.roll_number, NEW.roll_number);
  END IF;
  IF NEW.phone_number IS DISTINCT FROM OLD.phone_number THEN
    INSERT INTO public.profile_audit_log (target_user_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.user_id, actor, 'phone_number', OLD.phone_number, NEW.phone_number);
  END IF;
  IF NEW.section IS DISTINCT FROM OLD.section THEN
    INSERT INTO public.profile_audit_log (target_user_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.user_id, actor, 'section', OLD.section, NEW.section);
  END IF;
  IF NEW.department IS DISTINCT FROM OLD.department THEN
    INSERT INTO public.profile_audit_log (target_user_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.user_id, actor, 'department', OLD.department, NEW.department);
  END IF;
  IF NEW.batch IS DISTINCT FROM OLD.batch THEN
    INSERT INTO public.profile_audit_log (target_user_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.user_id, actor, 'batch', OLD.batch, NEW.batch);
  END IF;
  IF NEW.bio IS DISTINCT FROM OLD.bio THEN
    INSERT INTO public.profile_audit_log (target_user_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.user_id, actor, 'bio', OLD.bio, NEW.bio);
  END IF;
  IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
    INSERT INTO public.profile_audit_log (target_user_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.user_id, actor, 'avatar_url', OLD.avatar_url, NEW.avatar_url);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_profile_admin_changes ON public.profiles;
CREATE TRIGGER trg_log_profile_admin_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_admin_changes();