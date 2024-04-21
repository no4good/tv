// @ts-check
const { test, expect } = require("@playwright/test");
const { get } = require("http");

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

async function getAllRes(page) {
  const results = [];
  for (let i = 1; i <= 4; i++) {
    const result = await page.locator(`div #l${i}`).first().innerText();
    results.push(result);
  }
  const [capacityOne, capacityTwo] = await page.locator(`.capacity .value`);
  capacityOne.innerText();
  capacityTwo.innerText();

  return [results, [capacityOne, capacityTwo]];
}

test("has title", async ({ page }) => {
  await login(page);
  const res = await getAllRes(page);
  // Send notification to Telegram
  const message = `login successful at ${new Date().toLocaleString()} ${JSON.stringify(res)}`;
  await sendTelegramMessage(message);
  if (process.env.TITLE) {
    await expect(page).toHaveTitle(process.env.TITLE);
  }
});
