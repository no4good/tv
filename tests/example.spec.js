// @ts-check
const { test } = require("@playwright/test");
const { Octokit } = require("@octokit/rest");
// const fs = require("fs");

const maxTimeOut = 5000;

const resMap = {
  w1: "id=1&gid=1",
  w2: "id=3&gid=1",
  w3: "id=14&gid=1",
  w4: "id=17&gid=1",
  cl1: "id=5&gid=2",
  cl2: "id=6&gid=2",
  cl3: "id=16&gid=2",
  cl4: "id=18&gid=2",
  i1: "id=4&gid=3",
  i2: "id=10&gid=3",
  i3: "id=7&gid=3",
  i4: "id=11&gid=3",
  c1: "id=8&gid=4",
  c2: "id=9&gid=4",
  c3: "id=12&gid=4",
  c4: "id=13&gid=4",
  c5: "id=2&gid=4",
  c6: "id=15&gid=4",
};

const resKeys = Object.keys(resMap);

const villageMap = {
  main_building: { id: "id=26", category: 0, name: "Main Building" },
  warehouse: { id: "id=31", category: 1, name: "Warehouse" },
  cranny: { id: "id=21", category: 1, name: "Cranny" },
  granary: { id: "id=29", category: 1, name: "Granary" },
  embassy: { id: "id=19", category: 1, name: "Embassy" },
  marketplace: { id: "id=22", category: 1, name: "Marketplace" },
  residence: { id: "id=24", category: 1, name: "Residence" },
  barracks: { id: "id=20", category: 2, name: "Barracks" },
  academy: { id: "id=35", category: 2, name: "Academy" },
  smithy: { id: "id=32", category: 2, name: "Smithy" },
  stable: { id: "id=37", category: 2, name: "Stable" },
  hero: { id: "id=36", category: 2, name: "Hero's Mansion" },
  wall: { id: "id=40", category: 0, name: "Stone Wall" },
};

const villageKeys = Object.keys(villageMap);

const positionDetailsTemplate = (x, y) => `${process.env.URL}position_details.php?x=${x}&y=${y}`;
const positionRallyPoint = `${process.env.URL}build.php?id=39&gid=16&tt=2`;

async function sendAttack(page, attk) {
  try {
    for (const cords of attk) {
      const x = `${cords.x}`;
      const y = `${cords.y}`;
      await page.goto(positionDetailsTemplate(x, y));
      await page.waitForTimeout(1500);
      const title = await page.locator(".titleInHeader").first().innerText();
      if (title.includes("Unoccupied oasis")) {
        const isVisible = await page.locator('[id="troop_info"]:not(.rep)', { hasText: "none" }).isVisible();
        if (isVisible) {
          await page.goto(positionRallyPoint);
          const inputElement = await page.locator('input[name="troop[t1]"]:not(.disabled)');
          if (inputElement) {
            await inputElement.fill("3");
            const radioInputs = await page.locator('input[name="eventType"]').elementHandles();
            if (radioInputs.length === 3) {
              await radioInputs[2].check();
            }
            const xCoordInput = await page.locator('input[id="xCoordInput"]');
            const yCoordInput = await page.locator('input[id="yCoordInput"]');
            if (xCoordInput && yCoordInput) {
              await xCoordInput.fill(x);
              await yCoordInput.fill(y);
            }
            const submitButton = await page.locator('button[type="submit"]');
            if (submitButton) {
              await page.waitForTimeout(500);
              await submitButton.click();
              await page.waitForTimeout(500);
              await page.locator(".rallyPointConfirm").first().click();
              await page.waitForTimeout(500);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(error);
  }
}

async function clickIfVisible(locator, res, name) {
  const isAvailable = await locator.isVisible();
  if (isAvailable) {
    await locator.click();
    return { result: res, text: name };
  }
  return null;
}

async function navigateToPage(page, url) {
  await page.goto(url);
  await page.waitForLoadState("domcontentloaded", { timeout: maxTimeOut });
}

async function buildRes(page, res) {
  await navigateToPage(page, `${process.env.URL}build.php?${resMap[res]}`);
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

async function buildVillage(page, res) {
  const { id, name, category } = villageMap[res];
  await navigateToPage(page, `${process.env.URL}build.php?${id}`);
  const titleInHeader = await page.locator(".titleInHeader").first().innerText();
  if (titleInHeader === "Construct new building") {
    await navigateToPage(page, `${process.env.URL}build.php?${id}&category=${category}`);

    const button = await page
      .locator(".buildingWrapper", {
        has: page.locator("h2", {
          hasText: name,
        }),
      })
      .locator(".textButtonV1.green");

    return clickIfVisible(button, res, name);
  } else {
    const element = await page.locator(".section1 .green.build");
    await page.waitForTimeout(maxTimeOut);
    return await clickIfVisible(element, res, name);
  }
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
  let { actions, attk, sync } = data;

  if (attk.length > 0) {
    await sendTelegramMessage(`Attack actions: ${JSON.stringify(attk)}`);
    await sendAttack(page, attk);
  }

  if (actions.length === 0) {
    // await sendTelegramMessage(`No more actions to perform`);
    return;
  }

  let toBeDeleted = [];

  for (const action of actions) {
    let actionType = null;
    if (resKeys.includes(action)) {
      actionType = await buildRes(page, action);
    }
    if (villageKeys.includes(action)) {
      actionType = await buildVillage(page, action);
    }

    if (actionType) {
      await sendTelegramMessage(`Built element:${actionType.result}-${actionType.text} `);
      toBeDeleted.push(actionType.result);
    }
    if (sync) {
      break;
    }
  }

  for (const deleted of toBeDeleted) {
    const index = actions.findIndex((action) => action === deleted);
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

// async function createScreenshot(page) {
//   const screenshotBuffer = await page.screenshot();

//   const botToken = process.env.TELEGRAM_BOT_TOKEN;
//   const chatId = process.env.TELEGRAM_CHAT_ID;

//   const formData = new FormData();
//   formData.append("chat_id", chatId);
//   formData.append("photo", {
//     value: screenshotBuffer,
//     options: {
//       filename: "screenshot.png",
//       contentType: "image/png",
//     },
//   });

//   console.log(formData);

//   const a = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
//     method: "POST",
//     body: formData,
//     headers: {
//       "Content-Type": "multipart/form-data",
//     },
//   });
//   console.log(a);
// }

async function sendAdventures(page) {
  await page.goto(`${process.env.URL}hero/adventures`);
  await page.waitForTimeout(maxTimeOut);
  const adventureList = await page
    .locator(".adventureList .textButtonV2.buttonFramed.rectangle.withText.green")
    .first();
  const isVisible = await adventureList.isVisible();
  if (isVisible) {
    await adventureList.click();
  }
}

test("has title", async ({ page }) => {
  await login(page);
  // const response = await getAllRes(page);
  // await sendTelegramMessage(`---- Login successful at ${new Date().toLocaleString()} ----`);
  // await sendTelegramMessage(`${JSON.stringify(response)}`);
  // await createScreenshot(page);
  await connectToGithub(page);
  await sendAdventures(page);
  // await sendTelegramMessage(`-------------------------------------`);
});
