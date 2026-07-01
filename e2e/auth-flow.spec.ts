import { test, expect, request, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * End-to-end auth coverage:
 *
 *   1. Protected routes deny access to anonymous visitors and redirect
 *      them to /login (guards in ProtectedRoute).
 *   2. Signup form enforces client-side validation (DIU email required,
 *      roll number format, password length) BEFORE any network call.
 *   3. Signup happy-path — only runs when TEST_SIGNUP_EMAIL /
 *      TEST_SIGNUP_PASSWORD / TEST_SIGNUP_ROLL are supplied so CI can
 *      pre-provision a fresh, auto-confirmed DIU account. The test
 *      submits the form and asserts the app routes to /verify-email.
 *   4. Login happy-path — signs in with TEST_USER_EMAIL /
 *      TEST_USER_PASSWORD, then reloads a previously-gated route and
 *      asserts it now renders instead of bouncing to /login.
 *
 * Env (tests are skipped when required vars are absent):
 *   VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY  (login gate check)
 *   TEST_USER_EMAIL,   TEST_USER_PASSWORD             (login happy-path)
 *   TEST_SIGNUP_EMAIL, TEST_SIGNUP_PASSWORD, TEST_SIGNUP_ROLL (signup)
 *
 * Base URL is provided by playwright.config.ts (defaults to
 * http://localhost:8080).
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

const SIGNUP_EMAIL = process.env.TEST_SIGNUP_EMAIL ?? "";
const SIGNUP_PASSWORD = process.env.TEST_SIGNUP_PASSWORD ?? "";
const SIGNUP_ROLL = process.env.TEST_SIGNUP_ROLL ?? "";

function projectRef(url: string): string {
  const m = url.match(/^https?:\/\/([^.]+)\.supabase\./);
  if (!m) throw new Error(`cannot derive project ref from ${url}`);
  return m[1];
}

const PROTECTED_ROUTES = [
  "/dashboard",
  "/profile",
  "/settings",
  "/upload-notes",
  "/admin",
  "/admin/manage-users",
];

test.describe("Auth: protected routes deny anonymous access", () => {
  for (const path of PROTECTED_ROUTES) {
    test(`anon visit to ${path} redirects to /login`, async ({ page, baseURL }) => {
      const origin = baseURL ?? "http://localhost:8080";
      // Ensure no stale session leaks from a previous test in the same worker.
      await page.goto(origin, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => window.localStorage.clear());

      await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded" });

      // ProtectedRoute waits for the auth loading spinner to resolve
      // before navigating — give the SPA a beat to run its redirect.
      await expect
        .poll(() => new URL(page.url()).pathname, { timeout: 10_000 })
        .toBe("/login");

      // And the login form is actually mounted (not a blank white page).
      await expect(page.getByRole("heading", { name: /log in/i })).toBeVisible();
    });
  }
});

test.describe("Auth: signup form validation", () => {
  test("rejects non-DIU email before hitting the network", async ({ page }) => {
    let signupCalled = false;
    await page.route("**/auth/v1/signup**", (route) => {
      signupCalled = true;
      return route.abort();
    });

    await page.goto("/signup", { waitUntil: "domcontentloaded" });

    await page.getByLabel(/full name/i).fill("QA Bot");
    await page.getByLabel(/roll number/i).fill("221-15-1234");
    await page.getByLabel(/^email$/i).fill("not-a-diu@example.com");
    await page.getByLabel(/password/i).fill("supersecret");

    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/DIU email required/i).first()).toBeVisible();
    expect(signupCalled, "signup network call should not fire").toBe(false);
    await expect(page).toHaveURL(/\/signup$/);
  });

  test("rejects malformed roll number", async ({ page }) => {
    await page.goto("/signup", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/full name/i).fill("QA Bot");
    await page.getByLabel(/roll number/i).fill("!!"); // < 3 chars, invalid chars
    await page.getByLabel(/^email$/i).fill("qa.bot@diu.edu.bd");
    await page.getByLabel(/password/i).fill("supersecret");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByText(/Invalid roll number/i).first()).toBeVisible();
    await expect(page).toHaveURL(/\/signup$/);
  });
});

test.describe("Auth: signup happy-path", () => {
  test.skip(
    !(SIGNUP_EMAIL && SIGNUP_PASSWORD && SIGNUP_ROLL),
    "Requires TEST_SIGNUP_EMAIL, TEST_SIGNUP_PASSWORD, TEST_SIGNUP_ROLL (fresh DIU account)",
  );

  test("submits signup form and routes to /verify-email", async ({ page }) => {
    await page.goto("/signup", { waitUntil: "domcontentloaded" });

    await page.getByLabel(/full name/i).fill("Playwright QA");
    await page.getByLabel(/roll number/i).fill(SIGNUP_ROLL);
    await page.getByLabel(/^email$/i).fill(SIGNUP_EMAIL);
    await page.getByLabel(/password/i).fill(SIGNUP_PASSWORD);

    await page.getByRole("button", { name: /create account/i }).click();

    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 15_000 })
      .toBe("/verify-email");
    await expect(page).toHaveURL(
      new RegExp(`email=${encodeURIComponent(SIGNUP_EMAIL)}`, "i"),
    );
  });
});

async function signInViaUi(page: Page, email: string, password: string) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /^log in$/i }).click();
}

test.describe("Auth: login happy-path unlocks protected routes", () => {
  test.skip(
    !(SUPABASE_URL && ANON_KEY && USER_EMAIL && USER_PASSWORD),
    "Requires VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, TEST_USER_EMAIL, TEST_USER_PASSWORD",
  );

  test("valid credentials sign in and /dashboard becomes reachable", async ({
    page,
    baseURL,
  }) => {
    const origin = baseURL ?? "http://localhost:8080";

    // Sanity: /dashboard is gated for anon.
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => window.localStorage.clear());
    await page.goto(`${origin}/dashboard`, { waitUntil: "domcontentloaded" });
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 10_000 })
      .toBe("/login");

    // Sign in through the real form.
    await signInViaUi(page, USER_EMAIL, USER_PASSWORD);

    // The Login page routes admins to /admin and regular users to /.
    // Either way, we must NOT still be sitting on /login after auth.
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 15_000 })
      .not.toBe("/login");

    // Session cookie/localStorage should now be present.
    const ref = projectRef(SUPABASE_URL);
    const storageKey = `sb-${ref}-auth-token`;
    const stored = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      storageKey,
    );
    expect(stored, "supabase session missing from localStorage after login").toBeTruthy();

    // Now the previously-gated /dashboard route should render instead
    // of bouncing back to /login.
    await page.goto(`${origin}/dashboard`, { waitUntil: "domcontentloaded" });
    // Give ProtectedRoute one tick to resolve loading state.
    await page.waitForTimeout(500);
    expect(new URL(page.url()).pathname).toBe("/dashboard");
  });

  test("wrong password shows a Login failed toast", async ({ page }) => {
    // Independent of TEST_USER_* — we just need the auth endpoint reachable.
    await signInViaUi(page, "definitely-not-real@diu.edu.bd", "wrongpassword123");
    await expect(page.getByText(/login failed/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveURL(/\/login$/);
  });
});

// Guard against dead imports in environments where `request` isn't used
// directly — kept for parity with the other e2e specs in this folder.
void request;
