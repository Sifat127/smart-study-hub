// End-to-end tests for the public.log_profile_admin_changes() trigger.
//
// These tests use the service role to provision two real auth users (an admin
// and a target), then issue UPDATE statements against public.profiles through
// PostgREST using the admin's JWT so that auth.uid() resolves correctly inside
// the trigger. Audit rows are then read back with the service role and
// asserted against the expected field_name / old_value / new_value /
// changed_by / changed_at values.
//
// Run with: supabase--test_edge_functions { functions: ["audit-log-tests"] }

import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

if (!SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY) {
  throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY");
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PASSWORD = "Test-Password-123!";

interface SeededUser {
  id: string;
  email: string;
  rollNumber: string;
  client: SupabaseClient;
}

async function seedUser(label: "admin" | "target"): Promise<SeededUser> {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
  const email = `audit_${label}_${stamp}@diu.edu.bd`;
  const rollNumber = `AUD-${label.toUpperCase()}-${stamp}`.slice(0, 20);

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `Audit ${label}`, roll_number: rollNumber },
  });
  if (createErr || !created.user) throw createErr ?? new Error("createUser returned no user");

  if (label === "admin") {
    // Promote: handle_new_user already inserted a 'user' role row.
    const { error: roleErr } = await admin
      .from("user_roles")
      .update({ role: "admin" })
      .eq("user_id", created.user.id);
    if (roleErr) throw roleErr;
  }

  // Sign in to get a JWT-bound client so auth.uid() resolves to this user.
  const session = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInErr } = await session.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInErr) throw signInErr;

  return { id: created.user.id, email, rollNumber, client: session };
}

async function cleanup(ids: string[]) {
  // FK ON DELETE CASCADE on profiles/user_roles handles the rest.
  // profile_audit_log has no FK and we clear it explicitly so reruns stay clean.
  await admin.from("profile_audit_log").delete().in("target_user_id", ids);
  for (const id of ids) {
    await admin.auth.admin.deleteUser(id);
  }
}

async function readAudit(targetId: string) {
  const { data, error } = await admin
    .from("profile_audit_log")
    .select("field_name, old_value, new_value, changed_by, changed_at")
    .eq("target_user_id", targetId)
    .order("changed_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

Deno.test("trigger logs every changed admin-editable profile field", async () => {
  const adminUser = await seedUser("admin");
  const target = await seedUser("target");
  try {
    // Clear any entries from setup-time profile writes.
    await admin.from("profile_audit_log").delete().eq("target_user_id", target.id);

    const before = Date.now();

    const updates = {
      full_name: "Edited Name",
      roll_number: "EDIT-ROLL-01",
      phone_number: "+8801711000111",
      section: "63_A",
      department: "Computer Science & Engineering",
      bio: "Updated by admin",
      batch: "60th",
    };

    const { error: updErr } = await adminUser.client
      .from("profiles")
      .update(updates)
      .eq("user_id", target.id);
    assertEquals(updErr, null, `update failed: ${updErr?.message}`);

    const after = Date.now();
    const rows = await readAudit(target.id);

    // Build a map keyed by field_name and assert one entry per changed field.
    const byField = new Map(rows.map((r) => [r.field_name, r]));
    for (const [field, newValue] of Object.entries(updates)) {
      const entry = byField.get(field);
      assertExists(entry, `missing audit entry for ${field}`);
      assertEquals(entry!.new_value, newValue, `wrong new_value for ${field}`);
      // old_value is null because handle_new_user only populated full_name + roll_number.
      if (field === "full_name") assertEquals(entry!.old_value, "Audit target");
      else if (field === "roll_number") assertEquals(entry!.old_value, target.rollNumber);
      else assertEquals(entry!.old_value, null, `wrong old_value for ${field}`);
      assertEquals(entry!.changed_by, adminUser.id, `wrong changed_by for ${field}`);

      const ts = new Date(entry!.changed_at).getTime();
      assert(ts >= before - 1000 && ts <= after + 1000, `changed_at out of range for ${field}`);
    }

    assertEquals(byField.size, Object.keys(updates).length, "extra audit entries written");
  } finally {
    await cleanup([adminUser.id, target.id]);
  }
});

Deno.test("subsequent admin update only logs the fields that changed", async () => {
  const adminUser = await seedUser("admin");
  const target = await seedUser("target");
  try {
    // First update sets a baseline; clear log afterwards.
    await adminUser.client
      .from("profiles")
      .update({ section: "A", department: "CSE", bio: "v1" })
      .eq("user_id", target.id);
    await admin.from("profile_audit_log").delete().eq("target_user_id", target.id);

    // Change only `bio`; keep section/department identical.
    const { error } = await adminUser.client
      .from("profiles")
      .update({ section: "A", department: "CSE", bio: "v2" })
      .eq("user_id", target.id);
    assertEquals(error, null);

    const rows = await readAudit(target.id);
    assertEquals(rows.length, 1, "expected exactly one audit row for the changed field");
    assertEquals(rows[0].field_name, "bio");
    assertEquals(rows[0].old_value, "v1");
    assertEquals(rows[0].new_value, "v2");
    assertEquals(rows[0].changed_by, adminUser.id);
  } finally {
    await cleanup([adminUser.id, target.id]);
  }
});

Deno.test("self edits by a non-admin do not create audit entries", async () => {
  const target = await seedUser("target");
  try {
    await admin.from("profile_audit_log").delete().eq("target_user_id", target.id);

    const { error } = await target.client
      .from("profiles")
      .update({ bio: "self update", section: "Z" })
      .eq("user_id", target.id);
    assertEquals(error, null);

    const rows = await readAudit(target.id);
    assertEquals(rows.length, 0, "self edits must not be audited");
  } finally {
    await cleanup([target.id]);
  }
});
