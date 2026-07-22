import puppeteer from 'puppeteer';
import fs from 'fs';

const BASE_URL = 'http://localhost:5173/?mock_user=true';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function runTest24() {
  console.log("==========================================");
  console.log("    QA SCHEDULE: BLOCK 2 - TEST 2.4");
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

  const recordResult = (testName, passed, details) => {
    results.push({ testName, passed, details });
    const status = passed ? "✅ PASSED" : "❌ FAILED (BUG FOUND)";
    console.log(`[${status}] ${testName}`);
    if (details) console.log(`   Details: ${details}`);
    console.log('');
  };

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

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

    // First ensure we have a student and a group
    console.log("--- Setup: Creating Test Student ---");
    await page.waitForSelector('button', { timeout: 5000 });
    let navButtons = await page.$$('button');
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
    await typeReactInput('form input', 'Студент 2.4');
    await page.evaluate(() => {
      const submitBtn = document.querySelector('form button[type="submit"]');
      if (submitBtn) submitBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    console.log("--- Setup: Creating Test Group ---");
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('Группы'));
      if (tabs.length > 0) tabs[0].click();
    });
    await new Promise(r => setTimeout(r, 800));
    
    // We don't strictly need to fully create a group if we just want to select one in the UI.
    // If the mock DB has 0 groups, the group select will be empty.
    await page.evaluate(() => {
      const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Группу') || b.innerText.includes('группу'));
      if (addBtn) addBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));
    // Let's just create a group
    await typeReactInput('form input[placeholder*="Например"]', 'Группа 2.4');
    await new Promise(r => setTimeout(r, 200));
    await typeReactInput('form input[list]', 'Математика');
    await new Promise(r => setTimeout(r, 200));
    // Click checkbox
    await page.evaluate(() => {
      const checkboxes = document.querySelectorAll('form input[type="checkbox"]');
      if (checkboxes.length > 0) checkboxes[0].click();
    });
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
    navButtons = await page.$$('button');
    for (const btn of navButtons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text && text.includes("Расписание")) {
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1000));

    // -------------------------------------------------------------
    // TEST 2.4: Type Toggle State Cleanup
    // -------------------------------------------------------------
    console.log("--- Running Test 2.4: Type Toggle State Cleanup ---");
    // Open Add Lesson drawer
    await page.evaluate(() => {
      const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Урок'));
      if (addBtn) addBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // Select Student
    await page.evaluate(() => {
      const selects = document.querySelectorAll('form select');
      if (selects.length > 0) {
        selects[0].selectedIndex = 1;
        selects[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 300));

    // Switch to Group
    await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('form label'));
      const groupLabel = labels.find(l => l.innerText.includes('Групповой'));
      if (groupLabel) groupLabel.click();
    });
    await new Promise(r => setTimeout(r, 300));

    // Check if Select changed from "Ученик" to "Группа"
    // And check if the value is empty
    const groupState = await page.evaluate(() => {
      const selects = document.querySelectorAll('form select');
      if (selects.length > 0) {
        return {
          selectedIndex: selects[0].selectedIndex,
          value: selects[0].value
        };
      }
      return null;
    });

    if (groupState && groupState.value === "") {
      recordResult("2.4a Switch to Group", true, "Student selection was cleared when switching to Group type.");
    } else {
      recordResult("2.4a Switch to Group", false, "State was not cleared! Select value: " + (groupState ? groupState.value : 'null'));
    }

    // Select a Group
    await page.evaluate(() => {
      const selects = document.querySelectorAll('form select');
      if (selects.length > 0) {
        selects[0].selectedIndex = 1; // Pick the first available group
        selects[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 300));

    // Switch back to Individual
    await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('form label'));
      const indLabel = labels.find(l => l.innerText.includes('Индивидуальный'));
      if (indLabel) indLabel.click();
    });
    await new Promise(r => setTimeout(r, 300));

    const indState = await page.evaluate(() => {
      const selects = document.querySelectorAll('form select');
      if (selects.length > 0) {
        return {
          selectedIndex: selects[0].selectedIndex,
          value: selects[0].value
        };
      }
      return null;
    });

    if (indState && indState.value === "") {
      recordResult("2.4b Switch to Individual", true, "Group selection was cleared when switching back to Individual type.");
    } else {
      recordResult("2.4b Switch to Individual", false, "State was not cleared! Select value: " + (indState ? indState.value : 'null'));
    }

  } catch (err) {
    console.error("Test execution error:", err);
  } finally {
    await browser.close();
    console.log("==========================================");
    console.log("FINAL SUMMARY:");
    console.table(results);
    console.log("==========================================");
  }
}

runTest24();
