// @ts-check
const { test, expect } = require("@playwright/test");
test("has title", async ({ page }) => {
  console.log("process.env.1", process.env.JJJ);
  console.log("process.env.3", process.env.URL);
  if (!process.env.URL) {
    throw new Error("URL is not defined");
  }
  await page.goto(process.env.URL);

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Playwright/);
});
