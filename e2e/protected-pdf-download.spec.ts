import { test, expect, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Protected PDF download coverage:
 *  1. Anon users see a "Sign in to download" gate on chapter cards —
 *     clicking it navigates to /login and NEVER hits the download-file
 *     edge function.
 *  2. When a course has no chapters and no student uploads, both anon
 *     and signed-in visits render the "No materials yet" empty state
 *     (no download buttons rendered at all).
 *  3. Signed-in users see a real "Download PDF" button that proxies
 *     through the download-file function with the correct filename.
 *
 * Downloads are stubbed at the network layer so the test is hermetic.
 * Login happy-path is skipped without TEST_USER_EMAIL / TEST_USER_PASSWORD.
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
const USER_EMAIL = process.env.TEST_USER_EMAIL ?? "";
const USER_PASSWORD = process.env.TEST_USER_PASSWORD ?? "";

const COURSE_ID_WITH_CHAPTER = "00000000-0000-0000-0000-0000000000e1";
const COURSE_ID_EMPTY = "00000000-0000-0000-0000-0000000000e2";

const CHAPTER = {
  id: "00000000-0000-0000-0000-0000000000e3",
  title: "Protected Chapter 1",
  pdf_name: "CSE101_Protected_Chapter-01.pdf",
  pdf_url: "https://files.catbox.moe/protected-fixture.pdf",
};

const PDF_BYTES = Buffer.from(
  "255044462d312e0a25e2e3cfd30a312030206f626a3c3c2f547970652f436174616c6f672f50616765732032203020523e3e656e646f626a0a322030206f626a3c3c2f547970652f50616765732f4b6964735b33203020525d2f436f756e7420313e3e656e646f626a0a332030206f626a3c3c2f547970652f506167652f506172656e742032203020522f4d65646961426f785b30203020363132203739325d3e3e656e646f626a0a78726566200a30203420200a3030303030303030303020363535333520660a30303030303030303135203030303030206e0a30303030303030303630203030303030206e0a30303030303030313131203030303030206e0a747261696c65723c3c2f53697a652034202f526f6f742031203020523e3e0a7374617274787265660a3137340a2525454f46",
  "hex"
);

function coursePath(courseId: string) {
  return `/departments/cse/semester/1/course/${courseId}?tab=materials`;
}

async function stubCourse(page: import("@playwright/test").Page) {
  await page.route(`${SUPABASE_URL}/rest/v1/courses*`, (route: Route) => {
    const url = new URL(route.request().url());
    const id = url.searchParams.get("id") ?? "";
    const match = id.replace(/^eq\./, "");
    if (match === COURSE_ID_WITH_CHAPTER || match === COURSE_ID_EMPTY) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: match, code: "CSE101", name: "Protected Test Course" },
        ]),
      });
    }
    return route.continue();
  });
}

async function stubChapters(
  page: import("@playwright/test").Page,
  rows: Array<Record<string, unknown>>,
) {
  await page.route(`${SUPABASE_URL}/rest/v1/chapters*`, (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(rows),
    }),
  );
}

async function stubUploads(page: import("@playwright/test").Page) {
  await page.route(
    `${SUPABASE_URL}/rest/v1/student_uploads*`,
    (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      }),
  );
}

async function stubDownloadProxy(
  page: import("@playwright/test").Page,
  onHit: () => void,
) {
  await page.route(
    `${SUPABASE_URL}/functions/v1/download-file*`,
    (route: Route) => {
      onHit();
      const url = new URL(route.request().url());
      const name = (url.searchParams.get("name") || "download.pdf").replace(
        /[\r\n"]/g,
        "_",
      );
      return route.fulfill({
        status: 200,
        contentType: "application/pdf",
        headers: { "Content-Disposition": `attachment; filename="${name}"` },
        body: PDF_BYTES,
      });
    },
  );
}

test.describe("protected PDF download — gating & empty state", () => {
  test.skip(!SUPABASE_URL, "VITE_SUPABASE_URL not configured");

  test("anon user sees Sign-in gate and cannot hit download-file", async ({
    page,
  }) => {
    let downloadHits = 0;
    await stubCourse(page);
    await stubChapters(page, [
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
    ]);
    await stubUploads(page);
    await stubDownloadProxy(page, () => {
      downloadHits += 1;
    });

    // Ensure anon.
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => window.localStorage.clear());

    await page.goto(coursePath(COURSE_ID_WITH_CHAPTER), {
      waitUntil: "domcontentloaded",
    });

    // Real download button is NOT present; only the sign-in gate.
    await expect(
      page.getByRole("button", { name: /^download pdf$/i }),
    ).toHaveCount(0);
    const gate = page.getByRole("button", { name: /sign in to download/i });
    await expect(gate.first()).toBeVisible();

    await gate.first().click();

    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 10_000 })
      .toBe("/login");

    expect(downloadHits, "download-file must not fire for anon").toBe(0);
  });

  test("empty course renders 'No materials yet' with no download controls", async ({
    page,
  }) => {
    let downloadHits = 0;
    await stubCourse(page);
    await stubChapters(page, []);
    await stubUploads(page);
    await stubDownloadProxy(page, () => {
      downloadHits += 1;
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => window.localStorage.clear());
    await page.goto(coursePath(COURSE_ID_EMPTY), {
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByText(/no materials yet/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^download pdf$/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /sign in to download/i }),
    ).toHaveCount(0);
    expect(downloadHits).toBe(0);
  });
});

test.describe("protected PDF download — signed-in happy path", () => {
  test.skip(
    !(SUPABASE_URL && USER_EMAIL && USER_PASSWORD),
    "Requires TEST_USER_EMAIL / TEST_USER_PASSWORD",
  );

  test("signed-in user downloads via proxy with exact filename", async ({
    page,
  }) => {
    let downloadHits = 0;
    await stubCourse(page);
    await stubChapters(page, [
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
    ]);
    await stubUploads(page);
    await stubDownloadProxy(page, () => {
      downloadHits += 1;
    });

    // Real login via UI.
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/email/i).fill(USER_EMAIL);
    await page.getByLabel(/password/i).fill(USER_PASSWORD);
    await Promise.all([
      page.waitForURL((u) => u.pathname !== "/login", { timeout: 20_000 }),
      page.getByRole("button", { name: /^log in$/i }).click(),
    ]);

    await page.goto(coursePath(COURSE_ID_WITH_CHAPTER), {
      waitUntil: "domcontentloaded",
    });

    // Sign-in gate must be gone; real button visible.
    await expect(
      page.getByRole("button", { name: /sign in to download/i }),
    ).toHaveCount(0);
    const btn = page.getByRole("button", { name: /^download pdf$/i });
    await expect(btn).toBeVisible();

    const [response, download] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes("/functions/v1/download-file") &&
          decodeURIComponent(r.url()).includes(CHAPTER.pdf_name),
      ),
      page.waitForEvent("download"),
      btn.click(),
    ]);

    expect(response.status()).toBe(200);
    expect(download.suggestedFilename()).toBe(CHAPTER.pdf_name);
    expect(downloadHits).toBeGreaterThanOrEqual(1);

    const disposition = response.headers()["content-disposition"] ?? "";
    expect(disposition).toContain(`filename="${CHAPTER.pdf_name}"`);
  });
});
