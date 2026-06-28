import { test, expect, devices } from "@playwright/test";

test.use({ ...devices["Pixel 5"] });

test.describe("mobile: instant menus, no slide effects", () => {
  test("navbar mobile menu opens and closes instantly", async ({ page }) => {
    await page.goto("/");

    const toggle = page.getByRole("button", { name: /open menu/i });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await toggle.click();
    const menu = page.locator("#mobile-menu");
    // Must be visible at full height on the very next frame (no slide-in).
    await expect(menu).toBeVisible();
    const box1 = await menu.boundingBox();
    await page.waitForTimeout(16);
    const box2 = await menu.boundingBox();
    expect(box1?.height).toBeGreaterThan(100);
    expect(Math.abs((box1?.height ?? 0) - (box2?.height ?? 0))).toBeLessThan(1);

    const close = page.getByRole("button", { name: /close menu/i });
    await expect(close).toHaveAttribute("aria-expanded", "true");
    await close.click();
    await expect(page.locator("#mobile-menu")).toHaveCount(0);
  });

  test("global CSS forces zero transition/animation duration on mobile", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(() => {
      const samples = Array.from(document.querySelectorAll("a, button, div")).slice(0, 50);
      const offenders: string[] = [];
      for (const el of samples) {
        const cs = getComputedStyle(el as Element);
        const td = parseFloat(cs.transitionDuration);
        const ad = parseFloat(cs.animationDuration);
        if (td > 0.01 || ad > 0.01) {
          offenders.push(`${(el as Element).tagName} td=${cs.transitionDuration} ad=${cs.animationDuration}`);
        }
      }
      return offenders;
    });
    expect(result).toEqual([]);
  });

  test("aurora background is not rendered on mobile", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".aurora-orb")).toHaveCount(0);
  });

  test("keyboard accessibility: menu toggle is focusable and operable", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: /open menu/i });
    await toggle.focus();
    await expect(toggle).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#mobile-menu")).toBeVisible();
    await page.keyboard.press("Tab");
    // First focusable child link should be focused.
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBe("A");
  });
});
