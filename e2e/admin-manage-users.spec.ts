import { test, expect, Page } from "@playwright/test";

/**
 * End-to-end test:
 *   1. Sign in as an admin on /login.
 *   2. Open /admin/users and pick a target user (by roll or first non-self row).
 *   3. Edit the roll number, save, and assert:
 *        - the table cell reflects the new value
 *        - the "Admin edit history" panel shows a new entry with old → new
 *        - the page is still functional (no error boundary / route change)
 *   4. Revert the roll number so the test is idempotent.
 *
 * Required env vars:
 *   TEST_ADMIN_EMAIL       — admin account email
 *   TEST_ADMIN_PASSWORD    — admin account password
 *   TEST_TARGET_ROLL       — (optional) roll number of the user to edit;
 *                            defaults to the first non-self row in the table.
 */

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? "";
const TARGET_ROLL = process.env.TEST_TARGET_ROLL ?? "";

const hasCreds = ADMIN_EMAIL && ADMIN_PASSWORD;

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /sign in|log in|login/i }).click();
  // Wait for auth to settle — header avatar or admin link should appear.
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 15_000,
  });
}

async function openEditSheet(page: Page) {
  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: /manage users/i })).toBeVisible();

  // Pick a row: either the one with the configured target roll, or the
  // first row whose name is not flagged "(You)" (so we never edit ourself).
  let row;
  if (TARGET_ROLL) {
    row = page.locator("tr", { hasText: TARGET_ROLL }).first();
  } else {
    row = page
      .locator("tbody tr")
      .filter({ hasNot: page.locator("text=(You)") })
      .first();
  }
  await expect(row).toBeVisible();
  await row.click();

  // Sheet opens with "Edit user" title.
  await expect(page.getByRole("heading", { name: /edit user/i })).toBeVisible();
}

test.describe("Admin → Manage Users", () => {
  test.skip(!hasCreds, "TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD not set");

  test("admin can edit a roll number and the audit log records it", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => consoleErrors.push(String(err)));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await signIn(page);
    await openEditSheet(page);

    const rollInput = page.locator("#m_roll");
    await expect(rollInput).toBeVisible();
    const originalRoll = (await rollInput.inputValue()).trim();
    expect(originalRoll.length).toBeGreaterThan(0);

    // Generate a safe edited value that satisfies ^[A-Za-z0-9-]{3,20}$
    const stamp = Date.now().toString().slice(-6);
    const editedRoll = `E2E-${stamp}`.slice(0, 20);
    expect(editedRoll).toMatch(/^[A-Za-z0-9-]{3,20}$/);

    await rollInput.fill(editedRoll);
    await page.getByRole("button", { name: /save changes/i }).click();

    // After save, the form/table reflect the new value and the audit log
    // gains an entry for roll_number with old → new.
    await expect(rollInput).toHaveValue(editedRoll, { timeout: 10_000 });

    const auditSection = page
      .locator("section, div", { hasText: /admin edit history/i })
      .last();
    await expect(auditSection).toContainText("roll_number", { timeout: 10_000 });
    await expect(auditSection).toContainText(originalRoll);
    await expect(auditSection).toContainText(editedRoll);

    // Page is still functional: route unchanged, heading still mounted,
    // no React error boundary / runtime errors surfaced.
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(
      page.getByRole("heading", { name: /manage users/i }),
    ).toBeVisible();
    expect(
      consoleErrors.filter((e) => !/ResizeObserver|net::ERR_/i.test(e)),
    ).toEqual([]);

    // Restore the original roll so the test is idempotent.
    await rollInput.fill(originalRoll);
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(rollInput).toHaveValue(originalRoll, { timeout: 10_000 });
  });
});
