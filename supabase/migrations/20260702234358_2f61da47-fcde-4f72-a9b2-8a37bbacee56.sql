-- Test-only helper: lets the realtime integration test insert a `files`
-- row on behalf of an rls_test_* user without needing production GRANTs on
-- public.files (writes normally happen via the upload edge function).
create or replace function public._test_insert_rls_file(_uploader uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_id uuid;
begin
  select email into v_email from auth.users where id = _uploader;
  if v_email is null or v_email !~ '^rls_test_[A-Za-z0-9_-]+@diu\.edu\.bd$' then
    raise exception 'Only rls_test_<id>@diu.edu.bd test accounts may use this helper.';
  end if;
  insert into public.files (
    title, original_filename, unique_filename, object_key, bucket_name,
    file_size, file_type, uploader_id, visibility
  ) values (
    'rls-test-' || substr(md5(random()::text), 1, 8),
    'rt.pdf',
    'rt-' || substr(md5(random()::text), 1, 8) || '.pdf',
    'test/rt-' || substr(md5(random()::text), 1, 8) || '.pdf',
    'pdfs', 1, 'application/pdf', _uploader, 'authenticated'
  ) returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public._test_insert_rls_file(uuid) to authenticated, anon;

-- Also let the helper delete its own test file rows without needing grants.
create or replace function public._test_delete_rls_file(_file_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  select u.email into v_email
  from public.files f join auth.users u on u.id = f.uploader_id
  where f.id = _file_id;
  if v_email is null or v_email !~ '^rls_test_[A-Za-z0-9_-]+@diu\.edu\.bd$' then
    raise exception 'Only rls_test_ file rows may be deleted via this helper.';
  end if;
  delete from public.files where id = _file_id;
end;
$$;

grant execute on function public._test_delete_rls_file(uuid) to authenticated, anon;