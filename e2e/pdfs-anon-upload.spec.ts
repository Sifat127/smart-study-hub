import { test, expect, request } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Verifies that an anonymous (logged-out) client CANNOT upload to the
 * `pdfs` storage bucket. The bucket's INSERT policy is restricted to
 * authenticated users, so the Storage API must reject the request with
 * a 4xx authorization error and no object should be created.
 *
 * The test talks to the Supabase Storage API directly with Playwright's
 * request context — same surface the browser uses — so we exercise the
 * exact policy without depending on any UI upload flow.
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

const hasEnv = Boolean(SUPABASE_URL && ANON_KEY);

// Minimal valid 1-page PDF.
const PDF_BYTES = Buffer.from(
  "%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 10 10]>>endobj\n" +
    "trailer<</Root 1 0 R>>\n%%EOF\n",
  "utf8",
);

test.describe("pdfs bucket — anonymous upload", () => {
  test.skip(
    !hasEnv,
    "VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY missing from .env",
  );

  test("anonymous upload is rejected with an authorization error", async () => {
    const api = await request.newContext({ baseURL: SUPABASE_URL });

    // Random path so a leak would be detectable on the next run.
    const objectPath = `anon-test/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.pdf`;

    // 1. Attempt upload with the anon key only (no user session).
    const uploadRes = await api.post(`/storage/v1/object/pdfs/${objectPath}`, {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        "Content-Type": "application/pdf",
        "x-upsert": "false",
      },
      data: PDF_BYTES,
    });

    const status = uploadRes.status();
    const body = await uploadRes.text();

    // Must be a 4xx auth/policy error — never a 2xx success.
    expect(
      status,
      `expected anonymous upload to be blocked but got ${status}: ${body}`,
    ).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThan(500);
    expect([401, 403]).toContain(status);
    expect(body.toLowerCase()).toMatch(
      /unauthorized|permission|policy|not allowed|jwt|rls/,
    );

    // 2. Confirm no object was created at that path. The pdfs bucket is
    //    public-readable, so a successful HEAD would mean the write leaked.
    const headRes = await api.fetch(
      `/storage/v1/object/public/pdfs/${objectPath}`,
      { method: "HEAD", headers: { apikey: ANON_KEY } },
    );
    expect(
      headRes.status(),
      `object unexpectedly exists at ${objectPath}`,
    ).toBe(404);

    await api.dispose();
  });
});
