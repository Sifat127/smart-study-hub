// Placeholder function so the directory is a valid edge function.
// The real content of this folder is the Deno test file `audit_log_test.ts`,
// which exercises the profile_audit_log trigger end-to-end.
Deno.serve(() => new Response("audit-log-tests: tests only", { status: 200 }));
