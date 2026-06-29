## Bug
Profile load and save both 403 with `permission denied for function has_role`.

The `has_role(uuid, app_role)` security-definer function lost `EXECUTE` for `authenticated` and `anon` (current `proacl` shows only `postgres`, `service_role`, `sandbox_exec`). Since every profile RLS policy ("Admins can view all profiles", "Admins can update all profiles") calls `has_role`, Postgres evaluates the policy, the function rejects the caller, and the whole query fails — even for the user's own row. Same failure surface exists on every other table whose policies call `has_role` (courses, departments, semesters, chapters, student_uploads, user_roles, files).

## Fix (single migration)

1. `GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;`
2. Re-grant execute on the other policy-referenced functions to be safe: `admin_list_users()` to `authenticated`.
3. Verify with `pg_proc.proacl` that `authenticated=X` is present.

No schema, policy, or app code changes. After the migration, Profile load + save, Admin dashboards, and any admin-gated query start working again.

## Verification
- Reload `/profile` → profile fields populate.
- Edit a field → "Profile updated" toast, row updated.
- Admin pages (`/admin/manage-users`, courses, etc.) still load.
- Re-run security scan + linter; expect no regressions.