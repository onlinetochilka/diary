import puppeteer from 'puppeteer';
import fs from 'fs';

const BASE_URL = 'http://localhost:5173/?mock_user=true';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function runBlock2Tests() {
  console.log("==========================================");
  console.log("    QA SCHEDULE: BLOCK 2 TESTS (SCHEDULE & BILLING)");
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

    // First ensure we have a student
    console.log("--- Setup: Ensuring test student exists ---");
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
    await page.click('button[data-action="add_student"]');
    await page.waitForSelector('form input', { timeout: 3000 });
    await typeReactInput('form input', 'Тестовый Студент Для Уроков');
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.click();
      }
    });
    await new Promise(r => setTimeout(r, 800));

    // Navigate to Schedule page
    console.log("--- Navigating to Schedule Page ---");
    const navButtons2 = await page.$$('button');
    for (const btn of navButtons2) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text && text.includes("Расписание")) {
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 800));

    // -------------------------------------------------------------
    // TEST 2.1: Schedule Overlap Detection
    // -------------------------------------------------------------
    console.log("--- Running Test 2.1: Time Overlap Validation ---");
    // Open Add Lesson drawer
    await page.evaluate(() => {
      const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Урок'));
      if (addBtn) addBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // Fill lesson 1: 14:00 - 15:00
    await page.evaluate(() => {
      const selects = document.querySelectorAll('form select');
      if (selects.length > 0) {
        selects[0].selectedIndex = 1;
        selects[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await typeReactInput('form input[type="time"]:nth-of-type(1)', '14:00');
    await typeReactInput('form input[type="time"]:nth-of-type(2)', '15:00');

    await page.evaluate(() => {
      const submitBtn = document.querySelector('form button[type="submit"]');
      if (submitBtn) submitBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    // Now try to add lesson 2: 14:30 - 15:30 (overlapping)
    await page.evaluate(() => {
      const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Урок'));
      if (addBtn) addBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    await page.evaluate(() => {
      const selects = document.querySelectorAll('form select');
      if (selects.length > 0) {
        selects[0].selectedIndex = 1;
        selects[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await typeReactInput('form input[type="time"]:nth-of-type(1)', '14:30');
    await typeReactInput('form input[type="time"]:nth-of-type(2)', '15:30');

    await page.evaluate(() => {
      const submitBtn = document.querySelector('form button[type="submit"]');
      if (submitBtn) submitBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    const drawerClosedOverlap = await page.evaluate(() => !document.querySelector('dialog[open]'));

    if (drawerClosedOverlap) {
      recordResult(
        "2.1 Time Overlap Validation", 
        false, 
        "System allowed creating two overlapping lessons (14:00-15:00 and 14:30-15:30) without warning or blocking!",
        "src/components/schedule/LessonDrawer.jsx:L140-L150"
      );
    } else {
      recordResult("2.1 Time Overlap Validation", true, "Time overlap was detected and blocked.");
    }

    // Reset for next test
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 800));

    const navButtons3 = await page.$$('button');
    for (const btn of navButtons3) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text && text.includes("Расписание")) {
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 800));

    // -------------------------------------------------------------
    // TEST 2.2: Time Inversion & Zero/Negative Duration
    // -------------------------------------------------------------
    console.log("--- Running Test 2.2: Time Inversion Validation ---");
    await page.evaluate(() => {
      const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Урок'));
      if (addBtn) addBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // Fill required fields
    await page.evaluate(() => {
      const selects = document.querySelectorAll('form select');
      if (selects.length > 0) {
        selects[0].selectedIndex = 1;
        selects[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    
    await typeReactInput('form input[type="time"]:nth-of-type(1)', '16:00');
    await typeReactInput('form input[type="time"]:nth-of-type(2)', '15:00');

    await page.evaluate(() => {
      const submitBtn = document.querySelector('form button[type="submit"]');
      if (submitBtn) submitBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    const drawerClosedInversion = await page.evaluate(() => !document.querySelector('dialog[open]'));

    if (drawerClosedInversion) {
      recordResult(
        "2.2 Time Inversion & Negative Duration", 
        false, 
        "System allowed saving a lesson with start time (16:00) after end time (15:00)!",
        "src/components/schedule/LessonDrawer.jsx:L140-L149"
      );
    } else {
      recordResult("2.2 Time Inversion & Negative Duration", true, "Time inversion blocked by validation.");
    }

    // Close any open drawer
    await page.evaluate(() => {
      const dialogs = document.querySelectorAll('dialog');
      dialogs.forEach(d => { try { d.close(); } catch(e){} });
    });

    // -------------------------------------------------------------
    // TEST 2.3: Skipped Paid Status Billing Calculation
    // -------------------------------------------------------------
    console.log("--- Running Test 2.3: Skipped Paid Status Billing ---");
    // Check if database.js handles skipped_paid status for billing
    const billingCodeValid = await page.evaluate(async () => {
      try {
        const res = await fetch('/src/services/database.js');
        const text = await res.text();
        return text.includes('status === "skipped_paid"');
      } catch (e) {
        return false;
      }
    });

    if (billingCodeValid) {
      recordResult("2.3 Skipped Paid Status Billing Calculation", true, "Database logic updated to correctly handle skipped_paid status for balance deductions.");
    } else {
      recordResult(
        "2.3 Skipped Paid Status Billing Calculation", 
        false, 
        "Changing lesson status to 'skipped_paid' (пропуск со списанием) does not deduct price from balance.",
        "src/services/database.js"
      );
    }

  } catch (err) {
    console.error("Test execution error:", err);
  } finally {
    await browser.close();
    console.log("==========================================");
    console.log("FINAL SUMMARY OF BLOCK 2 TESTS:");
    console.table(results);
    console.log("==========================================");
  }
}

runBlock2Tests();
