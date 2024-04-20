// @ts-check
const { test, expect } = require("@playwright/test");

test("has title", async ({ page }) => {
  if (!process.env.URL) {
    throw new Error("URL is not defined");
  }
  await page.goto(process.env.URL);

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Playwright/);
});
