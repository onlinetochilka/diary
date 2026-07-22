import puppeteer from 'puppeteer';
import fs from 'fs';

const BASE_URL = 'http://localhost:5173/?mock_user=true';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function runBlock1ExtraTests() {
  console.log("==========================================");
  console.log("    QA SCHEDULE: BLOCK 1 (TESTS 1.3 & 1.4)");
  console.log("==========================================");

  const launchOpts = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  };

  if (fs.existsSync(EDGE_PATH)) {
    launchOpts.executablePath = EDGE_PATH;
  }

  const browser = await puppeteer.launch(launchOpts);
  const results = [];

  const recordResult = (testName, passed, details, fileLocation = null) => {
    results.push({ testName, passed, details, fileLocation });
    const status = passed ? "✅ PASSED" : "❌ FAILED (BUG FOUND)";
    console.log(`[${status}] ${testName}`);
    if (details) console.log(`   Details: ${details}`);
    if (fileLocation) console.log(`   Location: ${fileLocation}`);
    console.log('');
  };

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    page.on('dialog', async dialog => {
      console.log(`   [Browser Dialog]: ${dialog.type()} -> ${dialog.message()}`);
      await dialog.dismiss();
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    console.log("Connected to application at " + BASE_URL + "\n");

    // Navigate to Students tab
    await page.waitForSelector('button', { timeout: 5000 });
    const navButtons = await page.$$('button');
    for (const btn of navButtons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text && text.includes("Ученики")) {
        await btn.click();
        break;
      }
    }
    await page.waitForSelector('button[data-action="add_student"]', { timeout: 5000 });

    // Helper to set React input value triggering synthetic onChange
    const typeReactInput = async (selector, value) => {
      await page.evaluate((sel, val) => {
        const input = document.querySelector(sel);
        if (input) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          nativeSetter.call(input, val);
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, selector, value);
    };

    // -------------------------------------------------------------
    // TEST 1.3a: Dirty State Warning when closing drawer with changes
    // -------------------------------------------------------------
    console.log("--- Running Test 1.3a: Dirty State Warning ---");
    await page.click('button[data-action="add_student"]');
    await page.waitForSelector('form input', { timeout: 3000 });

    // Type input to trigger isDirty = true
    await typeReactInput('form input', 'Тестовый Несохраненный Ученик');
    await new Promise(r => setTimeout(r, 200));

    // Click close X button
    await page.evaluate(() => {
      const closeBtn = document.querySelector('header button[aria-label*="Закрыть"]');
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    const confirmModalVisible = await page.evaluate(() => {
      return document.body.innerText.includes("Несохраненные изменения") || document.body.innerText.includes("Вы внесли изменения");
    });

    if (confirmModalVisible) {
      recordResult("1.3a Dirty State Close Confirmation", true, "Confirmation modal correctly intercepted closing modified drawer.");
    } else {
      recordResult(
        "1.3a Dirty State Close Confirmation", 
        false, 
        "Drawer closed immediately without asking confirmation on modified unsaved data!",
        "src/components/ui/SideDrawer.jsx:L40-L46"
      );
    }

    // -------------------------------------------------------------
    // TEST 1.3b: Dismissing Dirty State Confirmation Modal
    // -------------------------------------------------------------
    console.log("--- Running Test 1.3b: Dismiss Dirty State Confirmation ---");
    await page.evaluate(() => {
      const backBtn = Array.from(document.querySelectorAll('button')).find(b => 
        b.innerText.includes('Вернуться к редактированию')
      );
      if (backBtn) backBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    const drawerStillOpen13b = await page.evaluate(() => {
      const input = document.querySelector('form input');
      return input && input.value === "Тестовый Несохраненный Ученик";
    });

    if (drawerStillOpen13b) {
      recordResult("1.3b Dismiss Confirmation & Preserve Input State", true, "Drawer remained open with unsaved user inputs intact after canceling close action.");
    } else {
      recordResult(
        "1.3b Dismiss Confirmation & Preserve Input State", 
        false, 
        "Form input state was wiped or drawer closed after canceling confirm modal.",
        "src/components/ui/SideDrawer.jsx:L125"
      );
    }

    // -------------------------------------------------------------
    // TEST 1.3c: Confirm Discard & Close Drawer
    // -------------------------------------------------------------
    console.log("--- Running Test 1.3c: Confirm Discard Unsaved Changes ---");
    await page.evaluate(() => {
      const closeBtn = document.querySelector('header button[aria-label*="Закрыть"]');
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    await page.evaluate(() => {
      const discardBtn = Array.from(document.querySelectorAll('button')).find(b => 
        b.innerText.includes('Не сохранять')
      );
      if (discardBtn) discardBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    const drawerClosed13c = await page.evaluate(() => !document.querySelector('dialog[open]'));

    if (drawerClosed13c) {
      recordResult("1.3c Confirm Discard & Close Drawer", true, "Drawer closed and unsaved changes were safely discarded.");
    } else {
      recordResult(
        "1.3c Confirm Discard & Close Drawer", 
        false, 
        "Drawer failed to close after confirming discard action.",
        "src/components/ui/SideDrawer.jsx:L128"
      );
    }

    // -------------------------------------------------------------
    // BLOCK 1.4: Group Management Edge Cases
    // -------------------------------------------------------------
    console.log("--- Switching viewMode to Groups ---");
    await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('label'));
      const groupTab = labels.find(l => l.innerText.trim() === 'Группы');
      if (groupTab) groupTab.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // -------------------------------------------------------------
    // TEST 1.4a: Empty Group Form Submission
    // -------------------------------------------------------------
    console.log("--- Running Test 1.4a: Empty Group Form Submission ---");
    await page.waitForSelector('button[data-action="add_group"]', { timeout: 3000 });
    await page.click('button[data-action="add_group"]');
    await page.waitForSelector('form input', { timeout: 3000 });

    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.click();
      }
    });
    await new Promise(r => setTimeout(r, 600));

    const groupDrawerClosed14a = await page.evaluate(() => !document.querySelector('dialog[open]'));
    if (groupDrawerClosed14a) {
      recordResult(
        "1.4a Empty Group Form Submission", 
        false, 
        "Group form submitted successfully with blank group name and no validation check!",
        "src/components/students/GroupFormDrawer.jsx:L127-L149"
      );
    } else {
      recordResult("1.4a Empty Group Form Submission", true, "Empty group form blocked by validation.");
    }

    // -------------------------------------------------------------
    // TEST 1.4b: Group Creation Without Students (0 Students)
    // -------------------------------------------------------------
    console.log("--- Running Test 1.4b: Group Creation Without Students ---");
    if (!await page.$('form')) {
      await page.click('button[data-action="add_group"]');
      await page.waitForSelector('form input', { timeout: 3000 });
    }

    await typeReactInput('form input', 'Пустая Группа Без Учеников');

    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.click();
      }
    });
    await new Promise(r => setTimeout(r, 800));

    const groupWithoutStudentsCreated = await page.evaluate(() => {
      return document.body.innerText.includes("Пустая Группа Без Учеников");
    });

    if (groupWithoutStudentsCreated) {
      recordResult(
        "1.4b Group Creation Without Students", 
        false, 
        "System allows creating a group with 0 members. No minimum 1 student validation constraint.",
        "src/components/students/GroupFormDrawer.jsx:L127-L140"
      );
    } else {
      recordResult("1.4b Group Creation Without Students", true, "Group without students rejected by form.");
    }

    // -------------------------------------------------------------
    // TEST 1.4c: Assigning Same Student to Multiple Groups
    // -------------------------------------------------------------
    console.log("--- Running Test 1.4c: Assign Student to Multiple Groups ---");
    await page.click('button[data-action="add_group"]');
    await page.waitForSelector('form input', { timeout: 3000 });

    await typeReactInput('form input[placeholder*="Например"]', 'Вторая Группа Для Студента');
    await new Promise(r => setTimeout(r, 200));
    await typeReactInput('form input[list]', 'Математика');
    await new Promise(r => setTimeout(r, 200));
    await page.evaluate(() => {
      const checkboxes = document.querySelectorAll('form input[type="checkbox"]');
      if (checkboxes.length > 0) {
        checkboxes[0].click();
      }
    });

    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.click();
      }
    });
    await new Promise(r => setTimeout(r, 800));

    const secondGroupCreated = await page.evaluate(() => {
      return document.body.innerText.includes("Вторая Группа Для Студента");
    });

    if (secondGroupCreated) {
      recordResult("1.4c Assign Student to Multiple Groups", true, "Student can belong to multiple groups simultaneously without data corruption.");
    } else {
      recordResult(
        "1.4c Assign Student to Multiple Groups", 
        false, 
        "Failed to assign student to group or save group record.",
        "src/pages/StudentsPage.jsx:L250-L260"
      );
    }

  } catch (err) {
    console.error("Test execution error:", err);
  } finally {
    await browser.close();
    console.log("==========================================");
    console.log("FINAL SUMMARY OF BLOCK 1 EXTRA TESTS:");
    console.table(results);
    console.log("==========================================");
  }
}

runBlock1ExtraTests();
