create or replace function public.record_pdf_view(_file_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  -- The dedupe index is partial (WHERE viewer_id IS NOT NULL), so ON CONFLICT
  -- must reference that same predicate, otherwise Postgres reports "no unique
  -- or exclusion constraint matching the ON CONFLICT specification" (42P10).
  insert into public.pdf_views (file_id, viewer_id)
  values (_file_id, uid)
  on conflict (file_id, viewer_id, viewed_day)
    where viewer_id is not null
    do nothing;
end;
$$;