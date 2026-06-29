"""End-to-end test: update profile in /settings and verify persistence after reload.

Run with:
    python3 tests/e2e/profile_persistence.py

Requires an injected Lovable browser session (LOVABLE_BROWSER_AUTH_STATUS=injected).
If you are signed out, sign in once in the Lovable preview and re-run.
"""
import asyncio
import json
import os
import sys
import time
from pathlib import Path

from playwright.async_api import async_playwright, expect

BASE_URL = "http://localhost:8080"
SCREENSHOTS = Path("/tmp/browser/profile-e2e/screenshots")
SCREENSHOTS.mkdir(parents=True, exist_ok=True)


async def main() -> int:
    status = os.environ.get("LOVABLE_BROWSER_AUTH_STATUS", "unknown")
    storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
    session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
    if status != "injected" or not storage_key or not session_json:
        print(f"FAIL: no managed session (status={status}). Sign in via the preview and retry.")
        return 2

    marker = f"E2E persistence check {int(time.time())}"
    print(f"using marker bio: {marker}")

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        # 1. Establish localhost origin, inject session, then go to /settings.
        await page.goto(BASE_URL, wait_until="domcontentloaded")
        await page.evaluate(
            f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
        )
        await page.goto(f"{BASE_URL}/settings", wait_until="domcontentloaded")
        await page.wait_for_selector("#bio", timeout=10_000)
        await page.screenshot(path=str(SCREENSHOTS / "1_loaded.png"))

        # 2. Capture original bio so we can restore it after the test.
        bio = page.locator("#bio")
        original_bio = await bio.input_value()
        print(f"original bio length: {len(original_bio)}")

        # 3. Update bio to the marker and save.
        await bio.fill(marker)
        await page.get_by_role("button", name="Save changes").click()

        # 4. Wait for the success toast.
        toast = page.get_by_text("Profile saved", exact=False)
        try:
            await expect(toast).to_be_visible(timeout=10_000)
        except Exception:
            await page.screenshot(path=str(SCREENSHOTS / "save_no_toast.png"))
            print("FAIL: success toast did not appear after save")
            await browser.close()
            return 1
        await page.screenshot(path=str(SCREENSHOTS / "2_saved.png"))

        # 5. Hard reload and re-read the bio field.
        await page.reload(wait_until="domcontentloaded")
        await page.wait_for_selector("#bio", timeout=10_000)
        reloaded_bio = await page.locator("#bio").input_value()
        await page.screenshot(path=str(SCREENSHOTS / "3_reloaded.png"))
        print(f"reloaded bio: {reloaded_bio!r}")

        ok = reloaded_bio == marker

        # 6. Restore the original bio so the test is non-destructive.
        await page.locator("#bio").fill(original_bio)
        await page.get_by_role("button", name="Save changes").click()
        try:
            await expect(page.get_by_text("Profile saved", exact=False)).to_be_visible(timeout=10_000)
        except Exception:
            print("WARN: could not confirm restore-save toast")

        await browser.close()

        if not ok:
            print(f"FAIL: bio did not persist. expected={marker!r} got={reloaded_bio!r}")
            return 1
        print("PASS: profile bio persisted across reload")
        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
