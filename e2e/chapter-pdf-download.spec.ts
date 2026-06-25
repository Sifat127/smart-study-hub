import { test, expect, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Verifies the chapter PDF download flow on CourseDetail:
 *  - Renders multiple chapters with distinct PDF naming conventions
 *  - Clicks each "Download PDF" button
 *  - Confirms the proxied download response is 200
 *  - Confirms the browser download fires and the suggested filename
 *    matches the chapter's `pdf_name` exactly
 *
 * Runs across chromium, firefox, and webkit via the projects in
 * playwright.config.ts.
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

// Minimal valid PDF body reused for every fixture.
const PDF_BYTES = Buffer.from(
  "255044462d312e0a25e2e3cfd30a312030206f626a3c3c2f547970652f436174616c6f672f50616765732032203020523e3e656e646f626a0a322030206f626a3c3c2f547970652f50616765732f4b6964735b33203020525d2f436f756e7420313e3e656e646f626a0a332030206f626a3c3c2f547970652f506167652f506172656e742032203020522f4d65646961426f785b30203020363132203739325d3e3e656e646f626a0a78726566200a30203420200a3030303030303030303020363535333520660a30303030303030303135203030303030206e0a30303030303030303630203030303030206e0a30303030303030313131203030303030206e0a747261696c65723c3c2f53697a652034202f526f6f742031203020523e3e0a7374617274787265660a3137340a2525454f46",
  "hex"
);

// Distinct chapter/PDF naming conventions to assert exact matches.
const CHAPTERS = [
  {
    id: "00000000-0000-0000-0000-0000000000a1",
    title: "Chapter 1 - Introduction",
    pdf_name: "CSE101_Chapter-01_Introduction.pdf",
    pdf_url: "https://files.catbox.moe/aaaaaa.pdf",
  },
  {
    id: "00000000-0000-0000-0000-0000000000a2",
    title: "Chapter 2: Data & Spaces",
    pdf_name: "CSE101 Chapter 02 - Data & Spaces (v2).pdf",
    pdf_url: "https://files.catbox.moe/bbbbbb.pdf",
  },
  {
    id: "00000000-0000-0000-0000-0000000000a3",
    title: "Chapter 3",
    pdf_name: "lecture-notes_03.final.pdf",
    pdf_url: "https://files.catbox.moe/cccccc.pdf",
  },
];

test.describe("chapter PDF download — filename conventions", () => {
  test.skip(!SUPABASE_URL, "VITE_SUPABASE_URL not configured");

  test.beforeEach(async ({ page }) => {
    await page.route(`${SUPABASE_URL}/rest/v1/courses*`, (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ id: COURSE_ID, code: "CSE101", name: "Test Course" }]),
      })
    );

    await page.route(`${SUPABASE_URL}/rest/v1/chapters*`, (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          CHAPTERS.map((c) => ({
            id: c.id,
            title: c.title,
            description: null,
            pdf_name: c.pdf_name,
            pdf_path: null,
            pdf_url: c.pdf_url,
            notes_name: null,
            notes_path: null,
            notes_url: null,
            uploaded_at: new Date().toISOString(),
          }))
        ),
      })
    );

    await page.route(`${SUPABASE_URL}/rest/v1/student_uploads*`, (route: Route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
    );

    // Proxy: echo the requested `name` param back via Content-Disposition so
    // the browser's suggested filename reflects the chapter's pdf_name.
    await page.route(`${SUPABASE_URL}/functions/v1/download-file*`, (route: Route) => {
      const url = new URL(route.request().url());
      const name = (url.searchParams.get("name") || "download.pdf").replace(/[\r\n"]/g, "_");
      return route.fulfill({
        status: 200,
        contentType: "application/pdf",
        headers: { "Content-Disposition": `attachment; filename="${name}"` },
        body: PDF_BYTES,
      });
    });
  });

  for (const chapter of CHAPTERS) {
    test(`downloads "${chapter.pdf_name}" with exact filename match`, async ({ page, browserName }) => {
      await page.goto(`/departments/cse/semester/1/course/${COURSE_ID}?tab=materials`);

      // Locate the chapter card by its title, then the download button within.
      const card = page.locator("div", { hasText: chapter.title }).filter({
        has: page.getByRole("button", { name: /download pdf/i }),
      }).first();
      const button = card.getByRole("button", { name: /download pdf/i });
      await expect(button).toBeVisible();

      const [response, download] = await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes("/functions/v1/download-file") &&
            decodeURIComponent(r.url()).includes(chapter.pdf_name)
        ),
        page.waitForEvent("download"),
        button.click(),
      ]);

      expect(response.status(), `proxy 200 on ${browserName}`).toBe(200);
      expect(
        download.suggestedFilename(),
        `suggested filename matches pdf_name on ${browserName}`
      ).toBe(chapter.pdf_name);

      const disposition = response.headers()["content-disposition"] ?? "";
      expect(disposition).toContain(`filename="${chapter.pdf_name}"`);
    });
  }
});
