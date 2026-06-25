// End-to-end tests for the public.log_profile_admin_changes() trigger.
//
// Connects to the project database with SUPABASE_DB_URL (full privileges so we
// can seed auth.users) and exercises the trigger by issuing UPDATEs against
// public.profiles with `request.jwt.claims` set so that auth.uid() inside the
// trigger resolves to the seeded admin user.

import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const DB_URL = Deno.env.get("SUPABASE_DB_URL");
if (!DB_URL) throw new Error("SUPABASE_DB_URL is required to run audit log tests");

async function withClient<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const client = new Client(DB_URL);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

interface Seeded {
  adminId: string;
  targetId: string;
  targetRoll: string;
  targetName: string;
}

async function seed(c: Client): Promise<Seeded> {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
  const adminEmail = `audit_admin_${stamp}@diu.edu.bd`;
  const targetEmail = `audit_target_${stamp}@diu.edu.bd`;
  const adminRoll = `AUD-A-${stamp}`.slice(0, 20);
  const targetRoll = `AUD-T-${stamp}`.slice(0, 20);
  const adminName = "Audit Admin";
  const targetName = "Audit Target";

  const insertUser = async (email: string, name: string, roll: string) => {
    const res = await c.queryObject<{ id: string }>`
      INSERT INTO auth.users (id, instance_id, email, aud, role, raw_user_meta_data)
      VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        ${email},
        'authenticated',
        'authenticated',
        jsonb_build_object('full_name', ${name}::text, 'roll_number', ${roll}::text)
      )
      RETURNING id::text
    `;
    return res.rows[0].id;
  };

  const adminId = await insertUser(adminEmail, adminName, adminRoll);
  const targetId = await insertUser(targetEmail, targetName, targetRoll);

  // Promote admin (handle_new_user inserted a 'user' role for both).
  await c.queryArray`UPDATE public.user_roles SET role='admin' WHERE user_id=${adminId}::uuid`;
  // Clear any audit rows from the bootstrap inserts (there shouldn't be any).
  await c.queryArray`DELETE FROM public.profile_audit_log WHERE target_user_id=${targetId}::uuid`;

  return { adminId, targetId, targetRoll, targetName };
}

async function cleanup(c: Client, ids: string[]) {
  for (const id of ids) {
    await c.queryArray`DELETE FROM public.profile_audit_log WHERE target_user_id=${id}::uuid OR changed_by=${id}::uuid`;
    await c.queryArray`DELETE FROM auth.users WHERE id=${id}::uuid`;
  }
}

/** Runs `cb` inside a transaction with auth.uid() bound to `actorId`. */
async function asActor(c: Client, actorId: string, cb: (c: Client) => Promise<void>) {
  await c.queryArray`BEGIN`;
  try {
    await c.queryArray`SELECT set_config('request.jwt.claims', ${JSON.stringify({ sub: actorId })}, true)`;
    await cb(c);
    await c.queryArray`COMMIT`;
  } catch (err) {
    await c.queryArray`ROLLBACK`;
    throw err;
  }
}

interface AuditRow {
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  changed_at: Date;
}

async function readAudit(c: Client, targetId: string): Promise<AuditRow[]> {
  const r = await c.queryObject<AuditRow>`
    SELECT field_name, old_value, new_value, changed_by::text, changed_at
    FROM public.profile_audit_log
    WHERE target_user_id=${targetId}::uuid
    ORDER BY field_name
  `;
  return r.rows;
}

Deno.test("trigger logs every changed admin-editable profile field", async () => {
  await withClient(async (c) => {
    const s = await seed(c);
    try {
      const before = Date.now();

      await asActor(c, s.adminId, async (cx) => {
        await cx.queryArray`
          UPDATE public.profiles SET
            full_name='Edited Name',
            roll_number='EDIT-ROLL-01',
            phone_number='+8801711000111',
            section='63_A',
            department='Computer Science & Engineering',
            batch='60th',
            bio='Updated by admin'
          WHERE user_id=${s.targetId}::uuid
        `;
      });

      const after = Date.now();
      const rows = await readAudit(c, s.targetId);
      const byField = new Map(rows.map((r) => [r.field_name, r]));

      const expected: Record<string, { old: string | null; new: string }> = {
        full_name: { old: s.targetName, new: "Edited Name" },
        roll_number: { old: s.targetRoll, new: "EDIT-ROLL-01" },
        phone_number: { old: null, new: "+8801711000111" },
        section: { old: null, new: "63_A" },
        department: { old: null, new: "Computer Science & Engineering" },
        batch: { old: null, new: "60th" },
        bio: { old: null, new: "Updated by admin" },
      };

      assertEquals(byField.size, Object.keys(expected).length, "extra audit entries written");

      for (const [field, exp] of Object.entries(expected)) {
        const entry = byField.get(field);
        assertExists(entry, `missing audit entry for ${field}`);
        assertEquals(entry!.old_value, exp.old, `wrong old_value for ${field}`);
        assertEquals(entry!.new_value, exp.new, `wrong new_value for ${field}`);
        assertEquals(entry!.changed_by, s.adminId, `wrong changed_by for ${field}`);
        const ts = entry!.changed_at.getTime();
        assert(
          ts >= before - 1000 && ts <= after + 1000,
          `changed_at out of range for ${field}: ${entry!.changed_at.toISOString()}`,
        );
      }
    } finally {
      await cleanup(c, [s.adminId, s.targetId]);
    }
  });
});

Deno.test("only fields that actually change get an audit row", async () => {
  await withClient(async (c) => {
    const s = await seed(c);
    try {
      await asActor(c, s.adminId, async (cx) => {
        await cx.queryArray`
          UPDATE public.profiles SET section='A', department='CSE', bio='v1'
          WHERE user_id=${s.targetId}::uuid
        `;
      });
      await c.queryArray`DELETE FROM public.profile_audit_log WHERE target_user_id=${s.targetId}::uuid`;

      await asActor(c, s.adminId, async (cx) => {
        // section/department unchanged; only bio differs.
        await cx.queryArray`
          UPDATE public.profiles SET section='A', department='CSE', bio='v2'
          WHERE user_id=${s.targetId}::uuid
        `;
      });

      const rows = await readAudit(c, s.targetId);
      assertEquals(rows.length, 1, `expected exactly one audit row, got ${rows.length}`);
      assertEquals(rows[0].field_name, "bio");
      assertEquals(rows[0].old_value, "v1");
      assertEquals(rows[0].new_value, "v2");
      assertEquals(rows[0].changed_by, s.adminId);
    } finally {
      await cleanup(c, [s.adminId, s.targetId]);
    }
  });
});

Deno.test("self edits by the profile owner are not audited", async () => {
  await withClient(async (c) => {
    const s = await seed(c);
    try {
      await asActor(c, s.targetId, async (cx) => {
        await cx.queryArray`
          UPDATE public.profiles SET bio='self update', section='Z'
          WHERE user_id=${s.targetId}::uuid
        `;
      });
      const rows = await readAudit(c, s.targetId);
      assertEquals(rows.length, 0, "self edits must not be audited");
    } finally {
      await cleanup(c, [s.adminId, s.targetId]);
    }
  });
});

Deno.test("edits by a non-admin actor against another profile are not audited", async () => {
  await withClient(async (c) => {
    const s = await seed(c);
    // Create a third, non-admin user as the actor.
    const stamp = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
    const nonAdminEmail = `audit_plain_${stamp}@diu.edu.bd`;
    const nonAdminRoll = `AUD-P-${stamp}`.slice(0, 20);
    const nonAdminRes = await c.queryObject<{ id: string }>`
      INSERT INTO auth.users (id, instance_id, email, aud, role, raw_user_meta_data)
      VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', ${nonAdminEmail},
              'authenticated', 'authenticated',
              jsonb_build_object('full_name', 'Plain User'::text, 'roll_number', ${nonAdminRoll}::text))
      RETURNING id::text
    `;
    const nonAdminId = nonAdminRes.rows[0].id;
    try {
      // Bypass RLS at the DB level by running as the privileged role we're already
      // connected with — the trigger logic is what we're testing, not RLS.
      await asActor(c, nonAdminId, async (cx) => {
        await cx.queryArray`
          UPDATE public.profiles SET bio='sneaky' WHERE user_id=${s.targetId}::uuid
        `;
      });
      const rows = await readAudit(c, s.targetId);
      assertEquals(rows.length, 0, "non-admin edits must not be audited");
    } finally {
      await cleanup(c, [s.adminId, s.targetId, nonAdminId]);
    }
  });
});
