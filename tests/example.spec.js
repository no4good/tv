// @ts-check
const { test } = require("@playwright/test");
const { Octokit } = require("@octokit/rest");

const maxTimeOut = 5000;

const resMap = {
  wood1: "id=1&gid=1",
  wood2: "id=3&gid=1",
  wood3: "id=14&gid=1",
  wood4: "id=17&gid=1",
  clay1: "id=5&gid=2",
  clay2: "id=6&gid=2",
  clay3: "id=16&gid=2",
  clay4: "id=18&gid=2",
  iron1: "id=4&gid=3",
  iron2: "id=10&gid=3",
  iron3: "id=7&gid=3",
  iron4: "id=11&gid=3",
  crop1: "id=8&gid=4",
  crop2: "id=9&gid=4",
  crop3: "id=12&gid=4",
  crop4: "id=13&gid=4",
  crop5: "id=2&gid=4",
  crop6: "id=15&gid=4",
};

async function buildRes(page, res) {
  await page.goto(`${process.env.URL}build.php?${resMap[res]}`);
  await page.waitForLoadState("domcontentloaded", { timeout: maxTimeOut });
  const element = await page.locator(".section1 .green.build");
  await page.waitForTimeout(maxTimeOut);
  const isAvailable = await element.isVisible();
  if (!isAvailable) {
    return null;
  }
  const text = await element.innerText();
  await element.click();
  return { result: res, text };
}

async function connectToGithub(page) {
  const octokit = new Octokit({
    auth: process.env.GH_TOKEN,
  });

  if (!process.env.GH_OWNER || !process.env.GH_REPO || !process.env.GH_FILENAME) {
    throw new Error("GH_OWNER, GH_REPO, GH_FILENAME are required");
  }
  const owner = process.env.GH_OWNER;
  const repo = process.env.GH_REPO;
  const filename = process.env.GH_FILENAME;

  const response = await octokit.repos.getContent({
    owner,
    repo,
    path: filename,
  });

  // Decode the content from base64
  // @ts-ignore
  const content = Buffer.from(response.data.content, "base64").toString("utf-8");

  // Parse the content as JSON
  const data = JSON.parse(content);

  // Extract the stack array under the actions key
  let { actions } = data;

  if (actions.length === 0) {
    await sendTelegramMessage(`No more actions to perform`);
    return;
  }

  let toBeDeleted;

  for (const action of actions) {
    const res = await buildRes(page, action);
    if (res) {
      await sendTelegramMessage(`Built element:${res.result}-${res.text} `);
      toBeDeleted = res.result;
      break;
    }
  }

  if (toBeDeleted) {
    const index = actions.findIndex((action) => action === toBeDeleted);
    if (index !== -1) {
      actions.splice(index, 1);
    }
  }
  await sendTelegramMessage(`Queue actions: ${JSON.stringify(actions)}`);

  // Encode the modified content as base64
  const content2 = Buffer.from(JSON.stringify(data, null, 2)).toString("base64");

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filename,
    message: "Update",
    content: content2,
    // @ts-ignore
    sha: response.data.sha, // Required for updating existing files
  });
}

async function login(page) {
  await page.goto(process.env.URL);
  await page.waitForLoadState("domcontentloaded", { timeout: maxTimeOut });
  await page.locator('[name="name"]').fill(process.env.USERNAME_LOGIN);
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
  const capacityElements = await page.locator(".capacity .value").elementHandles();
  const capacities = [];
  for (const element of capacityElements) {
    const capacity = await element.innerText();
    capacities.push(capacity);
  }

  const [wood, clay, iron, crop] = results;
  const [mainCapacity, cropCapacity] = capacities;

  const str = `Wood: ${wood}, Clay: ${clay}, Iron: ${iron} - capacity: ${mainCapacity}. Crop: ${crop} - capacity: ${cropCapacity}`;
  return str;
}

test("has title", async ({ page }) => {
  await login(page);
  const response = await getAllRes(page);
  await sendTelegramMessage(`---- Login successful at ${new Date().toLocaleString()} ----`);
  await sendTelegramMessage(`${JSON.stringify(response)}`);
  await connectToGithub(page);
  await sendTelegramMessage(`-------------------------------------`);
});
