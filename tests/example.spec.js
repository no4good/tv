// @ts-check
const { test, expect } = require("@playwright/test");
console.log("process.env.2", process.env);
test("has title", async ({ page }) => {
  console.log("process.env.3", process.env);
  if (!process.env.URL) {
    throw new Error("URL is not defined");
  }
  await page.goto(process.env.URL);

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Playwright/);
});
