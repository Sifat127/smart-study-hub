import { test, expect, request } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Verifies that the `student_uploads` table is readable to authenticated
 * users but blocked for anonymous (logged-out) clients.
 *
 * The test talks to the Supabase Data API (PostgREST) directly with
 * Playwright's request context — same surface the browser uses — so we
 * exercise the exact RLS + GRANT rules without depending on any UI page
 * that lists uploads.
 *
 * Required env vars:
 *   TEST_USER_EMAIL      — a non-admin account email
 *   TEST_USER_PASSWORD   — that account's password
 *
 * Reads VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY from .env.
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

const hasCreds = SUPABASE_URL && ANON_KEY && USER_EMAIL && USER_PASSWORD;

test.describe("student_uploads RLS", () => {
  test.skip(
    !hasCreds,
    "Set TEST_USER_EMAIL / TEST_USER_PASSWORD (and ensure VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY are present in .env)",
  );

  test("logged-out request is blocked, logged-in user can read", async () => {
    const api = await request.newContext({ baseURL: SUPABASE_URL });

    // 1. Anonymous read — anon role has no SELECT grant + no permissive
    //    policy, so PostgREST must refuse it (401/403, or empty data with a
    //    permission/JWT error in the body).
    const anonRes = await api.get(
      "/rest/v1/student_uploads?select=id&limit=1",
      { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } },
    );
    const anonStatus = anonRes.status();
    const anonBody = await anonRes.text();

    if (anonStatus === 200) {
      // Some PostgREST versions return 200 with an empty array when RLS
      // filters everything out — that's still "blocked" for our purposes,
      // because no rows leak. Reject any actual row content.
      const parsed = JSON.parse(anonBody);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(0);
    } else {
      expect([401, 403]).toContain(anonStatus);
      expect(anonBody.toLowerCase()).toMatch(
        /permission denied|jwt|not authorized|rls/,
      );
    }

    // 2. Sign in as a normal user to obtain a JWT.
    const loginRes = await api.post(
      "/auth/v1/token?grant_type=password",
      {
        headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
        data: { email: USER_EMAIL, password: USER_PASSWORD },
      },
    );
    expect(loginRes.ok(), `login failed: ${await loginRes.text()}`).toBe(true);
    const { access_token } = (await loginRes.json()) as {
      access_token: string;
    };
    expect(access_token).toBeTruthy();

    // 3. Authenticated read — must succeed and return an array (possibly
    //    empty if the table has no rows yet, which is still a pass).
    const authRes = await api.get(
      "/rest/v1/student_uploads?select=id,student_name,batch&limit=5",
      {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${access_token}`,
        },
      },
    );
    expect(
      authRes.ok(),
      `authenticated read failed: ${authRes.status()} ${await authRes.text()}`,
    ).toBe(true);
    const rows = await authRes.json();
    expect(Array.isArray(rows)).toBe(true);

    await api.dispose();
  });
});
