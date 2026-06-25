// End-to-end tests for the public.log_profile_admin_changes() trigger.
//
// All scenario orchestration runs inside the database via the SECURITY DEFINER
// helper `public._test_profile_audit_log_scenarios()` (it needs auth.users
// access that no API role has). The helper seeds test users, exercises four
// edit scenarios, cleans up, and returns a JSON report. These tests verify
// every claim in that report.

import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const DB_URL = Deno.env.get("SUPABASE_DB_URL");
if (!DB_URL) throw new Error("SUPABASE_DB_URL is required to run audit log tests");

interface AuditRow {
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  changed_at?: string;
  in_window?: boolean;
}

interface Report {
  admin_id: string;
  target_id: string;
  target_name_before: string;
  target_roll_before: string;
  full_update_rows: AuditRow[];
  partial_update_rows: AuditRow[];
  self_edit_count: number;
  nonadmin_edit_count: number;
}

let cachedReport: Report | null = null;
let cachedError: unknown = null;

async function getReport(): Promise<Report> {
  if (cachedReport) return cachedReport;
  if (cachedError) throw cachedError;
  const client = new Client(DB_URL);
  await client.connect();
  try {
    const res = await client.queryObject<{ report: Report }>`
      SELECT public._test_profile_audit_log_scenarios() AS report
    `;
    cachedReport = res.rows[0].report;
    return cachedReport;
  } catch (err) {
    cachedError = err;
    throw err;
  } finally {
    await client.end();
  }
}

Deno.test("admin update of every field writes one audit entry per field with correct old/new values, actor, and timestamp", async () => {
  const r = await getReport();

  const expected: Record<string, { old: string | null; new: string }> = {
    full_name: { old: r.target_name_before, new: "Edited Name" },
    roll_number: { old: r.target_roll_before, new: "EDIT-ROLL-01" },
    phone_number: { old: null, new: "+8801711000111" },
    section: { old: null, new: "63_A" },
    department: { old: null, new: "Computer Science & Engineering" },
    batch: { old: null, new: "60th" },
    bio: { old: null, new: "Updated by admin" },
  };

  const byField = new Map(r.full_update_rows.map((row) => [row.field_name, row]));
  assertEquals(
    byField.size,
    Object.keys(expected).length,
    `expected ${Object.keys(expected).length} audit rows, got ${byField.size}: ${
      [...byField.keys()].join(", ")
    }`,
  );

  for (const [field, exp] of Object.entries(expected)) {
    const entry = byField.get(field);
    assertExists(entry, `missing audit entry for ${field}`);
    assertEquals(entry!.old_value, exp.old, `wrong old_value for ${field}`);
    assertEquals(entry!.new_value, exp.new, `wrong new_value for ${field}`);
    assertEquals(entry!.changed_by, r.admin_id, `wrong changed_by for ${field}`);
    assertExists(entry!.changed_at, `missing changed_at for ${field}`);
    assertEquals(entry!.in_window, true, `changed_at for ${field} not within scenario window`);
    // Sanity-check ISO 8601 timestamp parseability.
    assert(!Number.isNaN(new Date(entry!.changed_at!).getTime()), `unparseable changed_at for ${field}`);
  }
});

Deno.test("only the fields that actually change are audited on subsequent admin updates", async () => {
  const r = await getReport();
  assertEquals(
    r.partial_update_rows.length,
    1,
    `expected exactly one audit row, got ${r.partial_update_rows.length}`,
  );
  const row = r.partial_update_rows[0];
  assertEquals(row.field_name, "bio");
  assertEquals(row.old_value, "Updated by admin");
  assertEquals(row.new_value, "Second revision");
  assertEquals(row.changed_by, r.admin_id);
});

Deno.test("a user editing their own profile is not audited", async () => {
  const r = await getReport();
  assertEquals(r.self_edit_count, 0, "self edits must not produce audit rows");
});

Deno.test("a non-admin actor editing someone else is not audited", async () => {
  const r = await getReport();
  assertEquals(r.nonadmin_edit_count, 0, "non-admin edits must not produce audit rows");
});
