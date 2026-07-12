import { test, expect } from "@playwright/test";

test.describe("pre-native-deploy smoke", () => {
  test("app loads without JS crashes", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    expect(
      errors,
      `Zero JS errors on load. Got: ${errors.join(", ")}`,
    ).toHaveLength(0);
  });

  test("critical auth UI is present", async ({ page }) => {
    await page.goto("/");

    const elements = [
      'text=Sign In',
      'text=Continue with Google',
      'text=Continue with Apple',
    ];

    for (const selector of elements) {
      const el = page.locator(selector);
      await expect(el).toBeVisible({ timeout: 10_000 });
    }
  });

  test("no broken network requests", async ({ page }) => {
    const failures: string[] = [];
    page.on("requestfailed", (req) => {
      failures.push(`${req.url()} — ${req.failure()?.errorText}`);
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    expect(
      failures,
      `Zero failed network requests. Got: ${failures.join(", ")}`,
    ).toHaveLength(0);
  });
});
