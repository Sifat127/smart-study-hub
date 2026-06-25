import { test, expect, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Verifies the chapter PDF download flow on CourseDetail:
 *  - Clicks the "Download PDF" button
 *  - Confirms the underlying file fetch returns 200
 *  - Confirms a browser download is triggered
 *
 * The page fetches chapters from Supabase. To keep this test hermetic and
 * independent of remote data / auth state, we intercept the chapters query
 * and serve a fixture pointing at a local PDF served from a data URL via
 * route fulfilment. The Catbox download path is proxied through the
 * `download-file` edge function in the app; we intercept that as well and
 * fulfill it with a tiny inline PDF so the assertion is deterministic.
 */

const env = (() => {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    const out: Record<string, string> = {};
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m) out[m[1]] = m[2].replace(/^"|"$/g, "");
    }
    return out;
  } catch {
    return {} as Record<string, string>;
  }
})();

const SUPABASE_URL = env.VITE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;

const COURSE_ID = "00000000-0000-0000-0000-0000000000c1";
const CHAPTER_ID = "00000000-0000-0000-0000-0000000000ch";
const PDF_URL = "https://files.catbox.moe/test-fixture.pdf";
const PDF_NAME = "fixture.pdf";

// Minimal valid PDF (1 page, "Hi").
const PDF_BYTES = Buffer.from(
  "255044462d312e0a25e2e3cfd30a312030206f626a3c3c2f547970652f436174616c6f672f50616765732032203020523e3e656e646f626a0a322030206f626a3c3c2f547970652f50616765732f4b6964735b33203020525d2f436f756e7420313e3e656e646f626a0a332030206f626a3c3c2f547970652f506167652f506172656e742032203020522f4d65646961426f785b30203020363132203739325d3e3e656e646f626a0a78726566200a30203420200a3030303030303030303020363535333520660a30303030303030303135203030303030206e0a30303030303030303630203030303030206e0a30303030303030313131203030303030206e0a747261696c65723c3c2f53697a652034202f526f6f742031203020523e3e0a7374617274787265660a3137340a2525454f46",
  "hex"
);

test.describe("chapter PDF download", () => {
  test.skip(!SUPABASE_URL, "VITE_SUPABASE_URL not configured");

  test("clicking Download PDF triggers a successful file download", async ({ page }) => {
    let downloadResponseStatus: number | null = null;

    // 1. Stub the courses lookup
    await page.route(`${SUPABASE_URL}/rest/v1/courses*`, (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ id: COURSE_ID, code: "TST", name: "Test Course" }]),
      })
    );

    // 2. Stub the chapters lookup with one chapter pointing at a Catbox URL
    await page.route(`${SUPABASE_URL}/rest/v1/chapters*`, (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: CHAPTER_ID,
            title: "Chapter 1",
            description: null,
            pdf_name: PDF_NAME,
            pdf_path: null,
            pdf_url: PDF_URL,
            notes_name: null,
            notes_path: null,
            notes_url: null,
            uploaded_at: new Date().toISOString(),
          },
        ]),
      })
    );

    // 3. Stub student_uploads (anon read is blocked normally; return empty)
    await page.route(`${SUPABASE_URL}/rest/v1/student_uploads*`, (route: Route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
    );

    // 4. Intercept the download-file edge function proxy and return a tiny PDF.
    //    Record the status so we can assert it.
    await page.route(`${SUPABASE_URL}/functions/v1/download-file*`, async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/pdf",
        headers: { "Content-Disposition": `attachment; filename="${PDF_NAME}"` },
        body: PDF_BYTES,
      });
      downloadResponseStatus = 200;
    });

    await page.goto(`/departments/cse/semester/1/course/${COURSE_ID}?tab=materials`);

    const downloadButton = page.getByRole("button", { name: /download pdf/i }).first();
    await expect(downloadButton).toBeVisible();

    // Wait for both the network response and the browser download event.
    const [response, download] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/functions/v1/download-file")),
      page.waitForEvent("download"),
      downloadButton.click(),
    ]);

    expect(response.status()).toBe(200);
    expect(downloadResponseStatus).toBe(200);
    expect(download.suggestedFilename()).toBe(PDF_NAME);

    // Button should re-enable after completion and a success toast should appear.
    await expect(downloadButton).toBeEnabled();
    await expect(page.getByText(/download started/i)).toBeVisible();
  });
});
