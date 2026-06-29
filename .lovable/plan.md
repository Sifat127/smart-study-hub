## Status
The fix is already live on the database — `has_role` now has `EXECUTE` for `authenticated` and `anon` (verified in `pg_proc.proacl`).

The error screenshot is from the request you sent **before** the migration finished. No further code or database changes are required.

## What to do
1. Hard-refresh the Profile page (Ctrl/Cmd+Shift+R) to drop the cached failed request.
2. Edit a field and click **Save changes** again.
3. You should see "Profile updated" and the row will persist.

If — after a hard refresh — the same `permission denied for function has_role` toast still appears, send the new screenshot and I'll dig further (next step would be forcing a PostgREST schema reload).