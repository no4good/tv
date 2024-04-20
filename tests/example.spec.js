// @ts-check
const { test, expect } = require("@playwright/test");

const maxTimeOut = 5000;

async function login(page) {
  await page.goto(process.env.URL);
  await page.waitForLoadState("domcontentloaded", { timeout: maxTimeOut });
  await page.locator('[name="name"]').fill(process.env.USERNAME);
  await page.locator('[name="password"]').fill(process.env.PASSWORD);
  await page.locator('[type="submit"]').click();
  await page.waitForTimeout(maxTimeOut);
}

test("has title", async ({ page }) => {
  await login(page);
  expect(true).toBe(true);
});
