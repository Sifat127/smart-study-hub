import { test, expect, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Verifies the chapter PDF download flow for a SIGNED-IN user:
 *  - Sign in via the real /login form using TEST_USER_EMAIL/PASSWORD
 *  - Visit a course detail page (chapters + download-file proxy are stubbed
 *    so the test is hermetic and doesn't depend on remote PDF hosts)
 *  - Click the "Download PDF" button
 *  - Confirm the proxied response is 200 and the suggested filename matches
 *    the chapter's pdf_name exactly
 *
 * Required env vars (test is skipped without them):
 *   TEST_USER_EMAIL     — a confirmed non-admin account on this project
 *   TEST_USER_PASSWORD  — that account's password
 *
 * Reads VITE_SUPABASE_URL from .env so route matchers target the right host.
 */

function loadEnv(): Record<string, string> {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    const out: Record<string, string> = {};
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m) out[m[1]] = m[2].replace(/^"|"$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}

const envFile = loadEnv();
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? envFile.VITE_SUPABASE_URL ?? "";
const USER_EMAIL = process.env.TEST_USER_EMAIL ?? "";
const USER_PASSWORD = process.env.TEST_USER_PASSWORD ?? "";

const COURSE_ID = "00000000-0000-0000-0000-0000000000d1";
const CHAPTER = {
  id: "00000000-0000-0000-0000-0000000000d2",
  title: "Signed-in Download Chapter",
  pdf_name: "CSE101_Chapter-Auth_Download.pdf",
  pdf_url: "https://files.catbox.moe/signedin-fixture.pdf",
};

// Minimal valid 1-page PDF.
const PDF_BYTES = Buffer.from(
  "255044462d312e0a25e2e3cfd30a312030206f626a3c3c2f547970652f436174616c6f672f50616765732032203020523e3e656e646f626a0a322030206f626a3c3c2f547970652f50616765732f4b6964735b33203020525d2f436f756e7420313e3e656e646f626a0a332030206f626a3c3c2f547970652f506167652f506172656e742032203020522f4d65646961426f785b30203020363132203739325d3e3e656e646f626a0a78726566200a30203420200a3030303030303030303020363535333520660a30303030303030303135203030303030206e0a30303030303030303630203030303030206e0a30303030303030313131203030303030206e0a747261696c65723c3c2f53697a652034202f526f6f742031203020523e3e0a7374617274787265660a3137340a2525454f46",
  "hex"
);

const hasCreds = !!(SUPABASE_URL && USER_EMAIL && USER_PASSWORD);

test.describe("chapter PDF download — signed in", () => {
  test.skip(
    !hasCreds,
    "Set TEST_USER_EMAIL / TEST_USER_PASSWORD (and ensure VITE_SUPABASE_URL is in .env)"
  );

  test("signs in, downloads PDF (200) with correct suggested filename", async ({
    page,
    browserName,
  }) => {
    // Stub course + chapter reads so the page renders deterministically.
    // We deliberately do NOT stub /auth/* — the test exercises the real login.
    await page.route(`${SUPABASE_URL}/rest/v1/courses*`, async (route: Route) => {
      const url = new URL(route.request().url());
      // Single-row lookup by id (CourseDetail). Profiles/other selects fall
      // through to the network.
      if (url.searchParams.get("id") === `eq.${COURSE_ID}`) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            { id: COURSE_ID, code: "CSE101", name: "Signed-in Test Course" },
          ]),
        });
      }
      return route.continue();
    });

    await page.route(`${SUPABASE_URL}/rest/v1/chapters*`, (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: CHAPTER.id,
            title: CHAPTER.title,
            description: null,
            pdf_name: CHAPTER.pdf_name,
            pdf_path: null,
            pdf_url: CHAPTER.pdf_url,
            notes_name: null,
            notes_path: null,
            notes_url: null,
            uploaded_at: new Date().toISOString(),
          },
        ]),
      })
    );

    await page.route(
      `${SUPABASE_URL}/rest/v1/student_uploads*`,
      (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: "[]",
        })
    );

    // Proxy: echo `name` back via Content-Disposition.
    await page.route(
      `${SUPABASE_URL}/functions/v1/download-file*`,
      (route: Route) => {
        const url = new URL(route.request().url());
        const name = (url.searchParams.get("name") || "download.pdf").replace(
          /[\r\n"]/g,
          "_"
        );
        return route.fulfill({
          status: 200,
          contentType: "application/pdf",
          headers: { "Content-Disposition": `attachment; filename="${name}"` },
          body: PDF_BYTES,
        });
      }
    );

    // 1. Real sign-in via the UI.
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(USER_EMAIL);
    await page.getByLabel(/password/i).fill(USER_PASSWORD);
    await Promise.all([
      page.waitForURL((u) => u.pathname === "/", { timeout: 20_000 }),
      page.getByRole("button", { name: /^log in$/i }).click(),
    ]);

    // Sanity: an authenticated session exists in localStorage.
    const hasSession = await page.evaluate(() => {
      const key = Object.keys(localStorage).find(
        (k) => k.startsWith("sb-") && k.endsWith("-auth-token")
      );
      if (!key) return false;
      try {
        const raw = JSON.parse(localStorage.getItem(key) || "{}");
        return !!raw?.access_token;
      } catch {
        return false;
      }
    });
    expect(hasSession, `auth session persisted on ${browserName}`).toBe(true);

    // 2. Visit the (stubbed) course page.
    await page.goto(
      `/departments/cse/semester/1/course/${COURSE_ID}?tab=materials`
    );

    // 3. The signed-in user should see the real Download PDF button — NOT
    //    the "Sign in to download" locked button.
    await expect(page.getByRole("button", { name: /sign in to download/i })).toHaveCount(0);
    const button = page.getByRole("button", { name: /download pdf/i });
    await expect(button).toBeVisible();

    // 4. Click and assert proxy 200 + exact suggested filename.
    const [response, download] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes("/functions/v1/download-file") &&
          decodeURIComponent(r.url()).includes(CHAPTER.pdf_name)
      ),
      page.waitForEvent("download"),
      button.click(),
    ]);

    expect(response.status(), `proxy 200 on ${browserName}`).toBe(200);
    expect(
      download.suggestedFilename(),
      `suggested filename on ${browserName}`
    ).toBe(CHAPTER.pdf_name);

    const disposition = response.headers()["content-disposition"] ?? "";
    expect(disposition).toContain(`filename="${CHAPTER.pdf_name}"`);

    // Button re-enables after the download completes.
    await expect(button).toBeEnabled();
  });
});
