import puppeteer from 'puppeteer';
import fs from 'fs';

const BASE_URL = 'http://localhost:5173/?mock_user=true';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function runBlock3Tests() {
  console.log("==========================================");
  console.log("    QA SCHEDULE: BLOCK 3 (STRESS & STATE)");
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

  const recordResult = (testName, passed, details, location = null) => {
    results.push({ testName, passed, details, location });
    const status = passed ? "✅ PASSED" : "❌ FAILED (BUG FOUND)";
    console.log(`[${status}] ${testName}`);
    if (details) console.log(`   Details: ${details}`);
    if (location) console.log(`   Location: ${location}`);
    console.log('');
  };

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    page.on('dialog', async dialog => {
      // automatically confirm native delete prompts
      await dialog.accept();
    });
    
    // Capture unhandled errors on the page
    let pageErrors = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
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

    // -------------------------------------------------------------
    // TEST 3.1: Double-click Attack
    // -------------------------------------------------------------
    console.log("--- Running Test 3.1: Double-click Attack ---");
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
    
    const uniqueName = 'SpamTestStudent_' + Date.now();
    await typeReactInput('form input', uniqueName);
    
    // SPAM CLICK
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.click();
          submitBtn.click();
          submitBtn.click();
          submitBtn.click();
        }
      }
    });
    await new Promise(r => setTimeout(r, 1000));
    
    const duplicateCount = await page.evaluate((name) => {
      return Array.from(document.querySelectorAll('*')).filter(el => el.innerText === name && el.children.length === 0).length;
    }, uniqueName);

    // Some false positives might occur in DOM if the name is in a table cell + a tooltip. 
    // Usually if it's protected, it submits once. If it's vulnerable, it creates 4 rows.
    // Let's check via the internal DOM table rows if possible.
    const isProtected = await page.evaluate(async () => {
       const res = await fetch('/src/components/students/StudentFormDrawer.jsx');
       const text = await res.text();
       return text.includes('if (isSubmitting) return;');
    });

    if (duplicateCount > 2) {
      recordResult("3.1 Double-click Attack (Student Form)", false, `System allowed duplicate submissions. Found ${duplicateCount} instances of the name.`, "src/components/students/StudentFormDrawer.jsx");
    } else if (!isProtected) {
       recordResult("3.1 Double-click Attack", false, "Submit button lacks disabled={isSubmitting} protection against multiple clicks.");
    } else {
      recordResult("3.1 Double-click Attack", true, "Forms are protected against multiple concurrent submissions via isSubmitting state.");
    }

    // -------------------------------------------------------------
    // TEST 3.2: Cascade Deletion & Orphan Rendering
    // -------------------------------------------------------------
    console.log("--- Running Test 3.2: Cascade Deletion & Orphan Rendering ---");
    // Ensure we have a student with a lesson
    // Add lesson for the spam student
    navButtons = await page.$$('button');
    for (const btn of navButtons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text && text.includes("Расписание")) {
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 800));
    
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
    await typeReactInput('form input[type="time"]:nth-of-type(1)', '14:00');
    await typeReactInput('form input[type="time"]:nth-of-type(2)', '15:00');

    await page.evaluate(() => {
      const submitBtn = document.querySelector('form button[type="submit"]');
      if (submitBtn) submitBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Now delete the student
    navButtons = await page.$$('button');
    for (const btn of navButtons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text && text.includes("Ученики")) {
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 800));
    
    await page.evaluate((name) => {
      // Find the row and click it to open drawer
      const cells = Array.from(document.querySelectorAll('td, div')).filter(el => el.innerText.includes(name));
      if (cells.length > 0) cells[0].click();
    }, uniqueName);
    await new Promise(r => setTimeout(r, 800));

    // Find and click delete button in drawer
    await page.evaluate(() => {
      const deleteBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Удалить'));
      if (deleteBtn) deleteBtn.click();
    });
    // The dialog.accept() will handle the native confirm
    await new Promise(r => setTimeout(r, 1000));

    // Go back to schedule
    navButtons = await page.$$('button');
    for (const btn of navButtons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text && text.includes("Расписание")) {
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1000));

    if (pageErrors.length > 0) {
      recordResult("3.2 Cascade Deletion", false, `Uncaught TypeError during render. App crashed! Errors: ${pageErrors.join(' | ')}`, "src/pages/SchedulePage.jsx");
    } else {
      // Check if the lesson was deleted or if it's orphaned
      const isOrphaned = await page.evaluate(async () => {
        // Inspect deleteStudent code logic
        try {
           const res = await fetch('/src/services/database.js');
           const text = await res.text();
           return !text.includes('deleteDoc(doc(col.lessons()'); // Check if deleteStudent deletes lessons
        } catch(e) { return true; }
      });
      if (isOrphaned) {
        recordResult("3.2 Cascade Deletion", false, "Deleting a student does NOT delete their lessons! Orphaned lessons remain in DB and Schedule.", "src/services/database.js : deleteStudent()");
      } else {
        recordResult("3.2 Cascade Deletion", true, "Student deletion gracefully removes or handles linked lessons without crashing.");
      }
    }


    // -------------------------------------------------------------
    // TEST 3.3: Navigation State Leak
    // -------------------------------------------------------------
    console.log("--- Running Test 3.3: Navigation State Leak ---");
    navButtons = await page.$$('button');
    for (const btn of navButtons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text && text.includes("Ученики")) {
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 800));

    await page.evaluate(() => {
      const addBtn = document.querySelector('button[data-action="add_student"]');
      if (addBtn) addBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // Now click schedule tab while drawer is open
    navButtons = await page.$$('button');
    for (const btn of navButtons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text && text.includes("Расписание")) {
        await page.evaluate(b => b.click(), btn);
        break;
      }
    }
    await new Promise(r => setTimeout(r, 800));

    // Go back to students
    navButtons = await page.$$('button');
    for (const btn of navButtons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text && text.includes("Ученики")) {
        await page.evaluate(b => b.click(), btn);
        break;
      }
    }
    await new Promise(r => setTimeout(r, 800));

    const drawerLingering = await page.evaluate(() => {
      const form = document.querySelector('form');
      const dialog = document.querySelector('dialog[open]');
      return !!form && !!dialog;
    });

    if (drawerLingering) {
      recordResult("3.3 Navigation State", false, "Drawer state leaked across navigation tabs. Drawer remained open after switching pages back and forth.", "src/pages/StudentsPage.jsx");
    } else {
      recordResult("3.3 Navigation State", true, "Navigation correctly clears unmounted modal states or handles transitions cleanly.");
    }

  } catch (err) {
    console.error("Test execution error:", err);
  } finally {
    await browser.close();
    console.log("==========================================");
    console.log("FINAL SUMMARY OF BLOCK 3 TESTS:");
    console.table(results);
    console.log("==========================================");
  }
}

runBlock3Tests();
