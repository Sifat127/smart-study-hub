import { test, expect, request } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Regression: load CourseDetail as an authenticated user in a real
 * browser and assert the signed-in chapters query returns the full
 * field set required to RENDER and DOWNLOAD PDFs/notes.
 *
 * What this guards against:
 *   - A future RLS / column-grant change that strips pdf_path,
 *     pdf_url, notes_path, notes_url, or file_id from the
 *     authenticated SELECT on public.chapters would silently
 *     hide the download buttons. This test fails loudly instead.
 *
 * Strategy:
 *   1. Sign in via Supabase auth REST → get session JSON.
 *   2. Find (department, semester, course) for a course that has at
 *      least one chapter with a downloadable PDF (pdf_path or
 *      pdf_url or file_id).
 *   3. Inject the session into localStorage on the app origin so the
 *      Supabase JS client picks it up.
 *   4. Navigate to /departments/:deptId/semester/:semId/course/:courseId
 *      and assert a real "Download" button is rendered (NOT the
 *      "Sign in to download" guest CTA), proving the signed-in row
 *      came back with the file-pointer columns intact.
 *
 * Required env (test is skipped if missing):
 *   VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
 *   TEST_USER_EMAIL, TEST_USER_PASSWORD
 *
 * Optional:
 *   E2E_BASE_URL (defaults to http://localhost:8080 via playwright.config.ts)
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

const hasAll = Boolean(SUPABASE_URL && ANON_KEY && USER_EMAIL && USER_PASSWORD);

function projectRef(url: string): string {
  // https://<ref>.supabase.co → <ref>
  const m = url.match(/^https?:\/\/([^.]+)\.supabase\./);
  if (!m) throw new Error(`cannot derive project ref from ${url}`);
  return m[1];
}

test.describe("CourseDetail — authenticated user can render downloads", () => {
  test.skip(
    !hasAll,
    "Requires VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, TEST_USER_EMAIL, TEST_USER_PASSWORD",
  );

  test("signed-in CourseDetail exposes pdf_path/pdf_url/file_id and renders a Download button", async ({
    page,
    baseURL,
  }) => {
    // 1) Sign in via REST and capture the full session JSON.
    const api = await request.newContext({ baseURL: SUPABASE_URL });
    const loginRes = await api.post("/auth/v1/token?grant_type=password", {
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      data: { email: USER_EMAIL, password: USER_PASSWORD },
    });
    expect(
      loginRes.ok(),
      `sign-in failed: ${loginRes.status()} ${await loginRes.text()}`,
    ).toBe(true);
    const session = await loginRes.json();
    const accessToken = session.access_token as string;
    expect(accessToken, "missing access_token").toBeTruthy();

    const authedHeaders = {
      apikey: ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    // 2) Find a chapter (and its course) that actually has a
    //    downloadable asset. We try pdf_path first, then pdf_url, then
    //    file_id — matching CourseDetail's `(pdf_url || pdf_path || file_id)`.
    async function findChapter(filter: string) {
      const r = await api.get(
        `/rest/v1/chapters?select=id,course_id,pdf_path,pdf_url,notes_path,notes_url,file_id&${filter}&limit=1`,
        { headers: authedHeaders },
      );
      if (!r.ok()) return null;
      const rows = (await r.json()) as Array<{
        id: string;
        course_id: string;
        pdf_path: string | null;
        pdf_url: string | null;
        notes_path: string | null;
        notes_url: string | null;
        file_id: string | null;
      }>;
      return rows[0] ?? null;
    }

    const chapter =
      (await findChapter("pdf_path=not.is.null")) ??
      (await findChapter("pdf_url=not.is.null")) ??
      (await findChapter("file_id=not.is.null"));

    test.skip(
      !chapter,
      "no chapter with a downloadable PDF exists in this database",
    );

    // Sanity: the signed-in query DID return the sensitive columns.
    // (If any of these were stripped by a future RLS/grant change, the
    // download button would never render in the UI.)
    expect(chapter!.course_id, "chapter missing course_id").toBeTruthy();
    expect(
      chapter!.pdf_path || chapter!.pdf_url || chapter!.file_id,
      "chapter signed-in row missing all of pdf_path/pdf_url/file_id",
    ).toBeTruthy();

    // 3) Look up the course → semester / department for the URL.
    const courseRes = await api.get(
      `/rest/v1/courses?select=id,department,semester&id=eq.${chapter!.course_id}&limit=1`,
      { headers: authedHeaders },
    );
    expect(courseRes.ok(), `course lookup failed: ${await courseRes.text()}`).toBe(
      true,
    );
    const course = ((await courseRes.json()) as Array<{
      id: string;
      department: string;
      semester: number;
    }>)[0];
    expect(course, "course row not found").toBeTruthy();

    await api.dispose();

    // 4) Inject the Supabase session into localStorage on the app origin,
    //    then navigate to CourseDetail.
    const ref = projectRef(SUPABASE_URL);
    const storageKey = `sb-${ref}-auth-token`;

    const origin = baseURL ?? "http://localhost:8080";
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    await page.evaluate(
      ([key, value]) => {
        window.localStorage.setItem(key, value);
      },
      [storageKey, JSON.stringify(session)] as const,
    );

    const target = `/departments/${course.department}/semester/${course.semester}/course/${course.id}`;
    await page.goto(target, { waitUntil: "domcontentloaded" });

    // The materials tab is the default — wait for the chapters list to render.
    // The guest CTA reads "Sign in to download"; the authed one reads "Download".
    // If signed-in fields were missing, BOTH would be absent (button is gated on
    // (pdf_url || pdf_path || file_id)), so asserting "Download" exists is enough.
    const downloadBtn = page
      .getByRole("button", { name: /^Download$/i })
      .first();
    await expect(
      downloadBtn,
      "Download button did not render — signed-in CourseDetail query likely stripped pdf_path/pdf_url/file_id",
    ).toBeVisible({ timeout: 15_000 });

    // And the guest CTA must NOT be present for a signed-in user.
    await expect(
      page.getByRole("button", { name: /Sign in to download/i }),
      "guest 'Sign in to download' CTA leaked into signed-in CourseDetail",
    ).toHaveCount(0);
  });
});
