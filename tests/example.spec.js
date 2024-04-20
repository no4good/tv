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

async function sendTelegramMessage(message) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const url = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(
    message
  )}`;

  await fetch(url, { method: "POST" });
}

test("has title", async ({ page }) => {
  await login(page);
  // Send notification to Telegram
  const message = `login successful at ${new Date().toLocaleString()}`;
  await sendTelegramMessage(message);
  if (process.env.TITLE) {
    await expect(page).toHaveTitle(process.env.TITLE);
  }
});
