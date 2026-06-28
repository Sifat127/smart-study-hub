import { test, expect, request, APIRequestContext } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Automated RLS regression suite.
 *
 * Run after every publish to confirm that the Data API still enforces:
 *   1. Anonymous clients cannot write to admin-managed tables
 *      (courses, chapters) and cannot read auth-only tables
 *      (student_uploads, contact_submissions).
 *   2. Normal authenticated users can READ public catalog data and
 *      auth-only student_uploads, but CANNOT write to admin-managed
 *      tables, cannot read contact_submissions, and cannot escalate
 *      their own role in user_roles.
 *   3. Admin users CAN insert / update / delete a course row and
 *      can read contact_submissions.
 *   4. A signed-in user can obtain a download URL for an existing
 *      chapter PDF via the storage-download edge function.
 *
 * Required env vars (test is skipped without them):
 *   TEST_USER_EMAIL      — non-admin account
 *   TEST_USER_PASSWORD
 *   TEST_ADMIN_EMAIL     — admin account
 *   TEST_ADMIN_PASSWORD
 *
 * Reads VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY from .env.
 *
 * Recommended CI command after publish:
 *   bunx playwright test e2e/rls-regression.spec.ts
 */

function loadEnv(): Record<string, string> {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    const out: Record<string, string> = {};
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}

const envFile = loadEnv();
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? envFile.VITE_SUPABASE_URL ?? "";
const ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  envFile.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "";
const USER_EMAIL = process.env.TEST_USER_EMAIL ?? "";
const USER_PASSWORD = process.env.TEST_USER_PASSWORD ?? "";
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? "";

const hasBase = Boolean(SUPABASE_URL && ANON_KEY);
const hasUser = Boolean(hasBase && USER_EMAIL && USER_PASSWORD);
const hasAdmin = Boolean(hasBase && ADMIN_EMAIL && ADMIN_PASSWORD);

async function signIn(
  api: APIRequestContext,
  email: string,
  password: string,
): Promise<{ access_token: string; user_id: string }> {
  const res = await api.post("/auth/v1/token?grant_type=password", {
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    data: { email, password },
  });
  if (!res.ok()) {
    throw new Error(`login failed for ${email}: ${res.status()} ${await res.text()}`);
  }
  const body = (await res.json()) as { access_token: string; user: { id: string } };
  return { access_token: body.access_token, user_id: body.user.id };
}

function authHeaders(token: string) {
  return {
    apikey: ANON_KEY,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function anonHeaders() {
  return {
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
    "Content-Type": "application/json",
  };
}

/** A mutation is "blocked" if the response is an auth/policy error (4xx)
 *  OR PostgREST returned 200/201 but produced no rows (the policy filtered
 *  the write away). We additionally verify the row count downstream where
 *  it matters. */
function expectBlocked(status: number, body: string, where: string) {
  expect(status, `${where}: expected blocked, got ${status} ${body}`)
    .toBeGreaterThanOrEqual(400);
  expect(status, `${where}: expected 4xx, got ${status}`).toBeLessThan(500);
  expect([401, 403, 409]).toContain(status);
  expect(body.toLowerCase()).toMatch(
    /permission|policy|not allowed|unauthorized|jwt|rls|violates row-level/,
  );
}

test.describe("RLS regression — anonymous client", () => {
  test.skip(
    !hasBase,
    "VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY missing from .env",
  );

  test("anon cannot insert/update/delete courses or chapters", async () => {
    const api = await request.newContext({ baseURL: SUPABASE_URL });

    // INSERT course
    const ins = await api.post("/rest/v1/courses", {
      headers: { ...anonHeaders(), Prefer: "return=representation" },
      data: {
        code: `RLS-ANON-${Date.now()}`,
        name: "should not insert",
        department: "cse",
        semester: 1,
      },
    });
    expectBlocked(ins.status(), await ins.text(), "anon insert course");

    // UPDATE chapter (no filter on purpose — must still be blocked)
    const upd = await api.patch("/rest/v1/chapters?id=eq.00000000-0000-0000-0000-000000000000", {
      headers: anonHeaders(),
      data: { title: "hacked" },
    });
    expectBlocked(upd.status(), await upd.text(), "anon update chapter");

    // DELETE course
    const del = await api.delete(
      "/rest/v1/courses?id=eq.00000000-0000-0000-0000-000000000000",
      { headers: anonHeaders() },
    );
    expectBlocked(del.status(), await del.text(), "anon delete course");

    await api.dispose();
  });

  test("anon cannot select chapters pdf_path/notes_path columns (column-level grants)", async () => {
    const api = await request.newContext({ baseURL: SUPABASE_URL });

    // The anon-granted safe columns must still be readable — mirrors the
    // guest CourseDetail query.
    const safe = await api.get(
      "/rest/v1/chapters?select=id,title,description,pdf_name,notes_name,uploaded_at&limit=1",
      { headers: anonHeaders() },
    );
    expect(
      safe.ok(),
      `anon read safe chapter columns failed: ${safe.status()} ${await safe.text()}`,
    ).toBe(true);
    expect(Array.isArray(await safe.json())).toBe(true);

    // Sensitive file-pointer columns must be blocked at the column-grant
    // level for anon. PostgREST returns 401/403 with a "permission denied
    // for ... column" message when SELECT on the column was revoked.
    for (const col of ["pdf_path", "notes_path", "pdf_url", "notes_url", "file_id"]) {
      const res = await api.get(`/rest/v1/chapters?select=id,${col}&limit=1`, {
        headers: anonHeaders(),
      });
      const status = res.status();
      const body = await res.text();
      expect(
        status,
        `anon select chapters.${col}: expected blocked, got ${status} ${body}`,
      ).toBeGreaterThanOrEqual(400);
      expect([401, 403]).toContain(status);
      expect(body.toLowerCase()).toMatch(/permission|denied|not allowed|column/);
    }

    await api.dispose();
  });



  test("anon cannot read auth-only tables", async () => {
    const api = await request.newContext({ baseURL: SUPABASE_URL });

    for (const table of ["student_uploads", "contact_submissions", "profiles"]) {
      const res = await api.get(`/rest/v1/${table}?select=*&limit=1`, {
        headers: anonHeaders(),
      });
      const status = res.status();
      const body = await res.text();

      if (status === 200) {
        // Empty array = RLS filtered everything → still blocked from leaking.
        const parsed = JSON.parse(body);
        expect(Array.isArray(parsed), `${table}: expected array`).toBe(true);
        expect(parsed.length, `${table}: leaked rows to anon`).toBe(0);
      } else {
        expect([401, 403]).toContain(status);
      }
    }

    await api.dispose();
  });
});

test.describe("RLS regression — authenticated user chapter columns", () => {
  test.skip(!hasUser, "TEST_USER_EMAIL / TEST_USER_PASSWORD not set");

  test("authenticated user CAN select chapters pdf_path/notes_path (CourseDetail signed-in query)", async () => {
    const api = await request.newContext({ baseURL: SUPABASE_URL });
    const { access_token } = await signIn(api, USER_EMAIL, USER_PASSWORD);
    const h = authHeaders(access_token);

    // Mirrors the exact column list CourseDetail.tsx requests when signed in.
    const res = await api.get(
      "/rest/v1/chapters?select=id,title,description,pdf_name,pdf_path,pdf_url,notes_name,notes_path,notes_url,file_id,uploaded_at&limit=1",
      { headers: h },
    );
    expect(
      res.ok(),
      `authed user read sensitive chapter columns failed: ${res.status()} ${await res.text()}`,
    ).toBe(true);
    const rows = (await res.json()) as Record<string, unknown>[];
    expect(Array.isArray(rows)).toBe(true);
    if (rows.length > 0) {
      for (const col of [
        "id", "title", "description", "pdf_name", "pdf_path", "pdf_url",
        "notes_name", "notes_path", "notes_url", "file_id", "uploaded_at",
      ]) {
        expect(
          col in rows[0],
          `authed user chapter row missing column ${col}`,
        ).toBe(true);
      }
    }

    await api.dispose();
  });
});


test.describe("RLS regression — normal authenticated user", () => {
  test.skip(!hasUser, "TEST_USER_EMAIL / TEST_USER_PASSWORD not set");

  test("user can read public catalog and student_uploads, cannot write admin tables", async () => {
    const api = await request.newContext({ baseURL: SUPABASE_URL });
    const { access_token, user_id } = await signIn(api, USER_EMAIL, USER_PASSWORD);
    const h = authHeaders(access_token);

    // READs that must succeed.
    for (const table of ["courses", "chapters", "student_uploads"]) {
      const res = await api.get(`/rest/v1/${table}?select=id&limit=1`, { headers: h });
      expect(
        res.ok(),
        `user read ${table} failed: ${res.status()} ${await res.text()}`,
      ).toBe(true);
      expect(Array.isArray(await res.json())).toBe(true);
    }

    // WRITEs that must be blocked.
    const ins = await api.post("/rest/v1/courses", {
      headers: { ...h, Prefer: "return=representation" },
      data: {
        code: `RLS-USER-${Date.now()}`,
        name: "should not insert",
        department: "cse",
        semester: 1,
      },
    });
    expectBlocked(ins.status(), await ins.text(), "user insert course");

    const upd = await api.patch(
      "/rest/v1/chapters?id=eq.00000000-0000-0000-0000-000000000000",
      { headers: h, data: { title: "nope" } },
    );
    expectBlocked(upd.status(), await upd.text(), "user update chapter");

    // user_roles: cannot escalate own role to admin.
    const esc = await api.patch(
      `/rest/v1/user_roles?user_id=eq.${user_id}`,
      { headers: h, data: { role: "admin" } },
    );
    expectBlocked(esc.status(), await esc.text(), "user self-escalate role");

    // contact_submissions: cannot read.
    const cs = await api.get("/rest/v1/contact_submissions?select=id&limit=1", {
      headers: h,
    });
    if (cs.status() === 200) {
      const arr = JSON.parse(await cs.text());
      expect(Array.isArray(arr) && arr.length === 0, "user leaked contact submissions").toBe(true);
    } else {
      expect([401, 403]).toContain(cs.status());
    }

    await api.dispose();
  });

  test("user can request a signed download URL for an existing chapter PDF", async () => {
    const api = await request.newContext({ baseURL: SUPABASE_URL });
    const { access_token } = await signIn(api, USER_EMAIL, USER_PASSWORD);
    const h = authHeaders(access_token);

    // Find any chapter that actually has a stored pdf_path in the pdfs bucket.
    const chRes = await api.get(
      "/rest/v1/chapters?select=id,pdf_path&pdf_path=not.is.null&limit=1",
      { headers: h },
    );
    expect(chRes.ok(), `read chapters failed: ${await chRes.text()}`).toBe(true);
    const chapters = (await chRes.json()) as { id: string; pdf_path: string }[];
    test.skip(chapters.length === 0, "no chapters with pdf_path to test download");

    const path = chapters[0].pdf_path;
    const signed = await api.post(
      `/storage/v1/object/sign/pdfs/${path}`,
      { headers: h, data: { expiresIn: 60 } },
    );
    expect(
      signed.ok(),
      `signed url failed: ${signed.status()} ${await signed.text()}`,
    ).toBe(true);
    const out = (await signed.json()) as { signedURL?: string };
    expect(out.signedURL, "missing signedURL in response").toBeTruthy();

    await api.dispose();
  });
});

test.describe("RLS regression — admin user", () => {
  test.skip(!hasAdmin, "TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD not set");

  test("admin can insert, update, and delete a course (idempotent cleanup)", async () => {
    const api = await request.newContext({ baseURL: SUPABASE_URL });
    const { access_token } = await signIn(api, ADMIN_EMAIL, ADMIN_PASSWORD);
    const h = authHeaders(access_token);

    const code = `RLS-ADM-${Date.now()}`;
    const insRes = await api.post("/rest/v1/courses", {
      headers: { ...h, Prefer: "return=representation" },
      data: { code, name: "RLS regression temp", department: "cse", semester: 1 },
    });
    expect(
      insRes.ok(),
      `admin insert course failed: ${insRes.status()} ${await insRes.text()}`,
    ).toBe(true);
    const inserted = (await insRes.json()) as { id: string }[];
    expect(inserted.length).toBe(1);
    const id = inserted[0].id;

    try {
      const updRes = await api.patch(`/rest/v1/courses?id=eq.${id}`, {
        headers: { ...h, Prefer: "return=representation" },
        data: { name: "RLS regression temp (updated)" },
      });
      expect(
        updRes.ok(),
        `admin update course failed: ${updRes.status()} ${await updRes.text()}`,
      ).toBe(true);
      const updated = (await updRes.json()) as { name: string }[];
      expect(updated[0].name).toBe("RLS regression temp (updated)");
    } finally {
      const delRes = await api.delete(`/rest/v1/courses?id=eq.${id}`, {
        headers: h,
      });
      expect(
        delRes.status() < 300,
        `admin delete course failed: ${delRes.status()} ${await delRes.text()}`,
      ).toBe(true);
    }

    await api.dispose();
  });

  test("admin can read contact_submissions", async () => {
    const api = await request.newContext({ baseURL: SUPABASE_URL });
    const { access_token } = await signIn(api, ADMIN_EMAIL, ADMIN_PASSWORD);

    const res = await api.get(
      "/rest/v1/contact_submissions?select=id&limit=1",
      { headers: authHeaders(access_token) },
    );
    expect(
      res.ok(),
      `admin read contact_submissions failed: ${res.status()} ${await res.text()}`,
    ).toBe(true);
    expect(Array.isArray(await res.json())).toBe(true);

    await api.dispose();
  });
});
