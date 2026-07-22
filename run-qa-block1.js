import puppeteer from 'puppeteer';
import fs from 'fs';

const BASE_URL = 'http://localhost:5173/?mock_user=true';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function runBlock1Tests() {
  console.log("==========================================");
  console.log("      QA SCHEDULE: BLOCK 1 TESTS         ");
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
  };

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    page.on('dialog', async dialog => {
      console.log(`   [Browser Dialog]: ${dialog.type()} -> ${dialog.message()}`);
      await dialog.dismiss();
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    console.log("Connected to application at " + BASE_URL);

    // Click on Students tab in Navigation
    await page.waitForSelector('button', { timeout: 5000 });
    
    const navButtons = await page.$$('button');
    let studentsNavFound = false;
    for (const btn of navButtons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text && text.includes("Ученики")) {
        await btn.click();
        studentsNavFound = true;
        break;
      }
    }

    if (!studentsNavFound) {
      throw new Error("Navigation button 'Ученики' not found on page");
    }

    await page.waitForSelector('button[data-action="add_student"]', { timeout: 5000 });
    console.log("Successfully navigated to Students page!");

    // Helper to open Student Drawer
    const openAddStudentDrawer = async () => {
      const form = await page.$('form');
      if (!form) {
        await page.click('button[data-action="add_student"]');
        await page.waitForSelector('form', { timeout: 3000 });
      }
    };

    // Helper to submit form reliably
    const submitForm = async () => {
      await page.evaluate(() => {
        const form = document.querySelector('form');
        if (form) {
          const submitBtn = form.querySelector('button[type="submit"]');
          if (submitBtn) {
            submitBtn.click();
          } else {
            form.requestSubmit();
          }
        }
      });
      await new Promise(r => setTimeout(r, 600));
    };

    // -------------------------------------------------------------
    // TEST 1.1a: XSS Injection in Student Name
    // -------------------------------------------------------------
    console.log("\n--- Running Test 1.1a: XSS Injection ---");
    await openAddStudentDrawer();

    const xssPayload = '<script>alert("XSS-STUDENT")</script>';
    await page.evaluate((payload) => {
      const nameInput = document.querySelector('form input');
      if (nameInput) {
        nameInput.value = payload;
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, xssPayload);

    await submitForm();

    const pageContent = await page.content();
    const createdStudentWithXss = pageContent.includes('<script>alert("XSS-STUDENT")</script>');
    if (createdStudentWithXss) {
      recordResult("1.1a XSS Injection in Student Name", false, "System accepted raw HTML/XSS script tag without sanitization/escaping validation in input.");
    } else {
      recordResult("1.1a XSS Injection in Student Name", true, "XSS payload handled safely.");
    }

    // -------------------------------------------------------------
    // TEST 1.1b: 600 Characters Name (Overflow & Limits)
    // -------------------------------------------------------------
    console.log("\n--- Running Test 1.1b: Extremely Long Name (>500 chars) ---");
    await openAddStudentDrawer();
    
    const longName = "A".repeat(600);
    await page.evaluate((payload) => {
      const nameInput = document.querySelector('form input');
      if (nameInput) {
        nameInput.value = payload;
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, longName);

    await submitForm();

    const longNameInDom = await page.evaluate((pattern) => {
      return document.body.innerText.includes(pattern);
    }, "A".repeat(100));

    if (longNameInDom) {
      recordResult("1.1b Extremely Long Student Name (>500 chars)", false, "Form allows saving student with 600 characters name without max-length limits.");
    } else {
      recordResult("1.1b Extremely Long Student Name", true, "Length validation working.");
    }

    // -------------------------------------------------------------
    // TEST 1.1c: Negative Lesson Price (-1500)
    // -------------------------------------------------------------
    console.log("\n--- Running Test 1.1c: Negative Price (-1500) ---");
    await openAddStudentDrawer();
    
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('form input'));
      if (inputs[0]) {
        inputs[0].value = "Олег Отрицательный";
        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      }
      const priceInput = inputs.find(i => i.placeholder?.includes('0') || i.type === 'number');
      if (priceInput) {
        priceInput.value = "-1500";
        priceInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    await submitForm();

    const negativePriceSaved = await page.evaluate(() => {
      return document.body.innerText.includes("-1500") || document.body.innerText.includes("-1 500");
    });

    if (negativePriceSaved) {
      recordResult("1.1c Negative Lesson Price (-1500)", false, "Form accepted negative price (-1500 ₽) for student subject without validation.");
    } else {
      recordResult("1.1c Negative Lesson Price (-1500)", true, "Negative price rejected.");
    }

    // -------------------------------------------------------------
    // TEST 1.2a: Completely Empty Form Submission
    // -------------------------------------------------------------
    console.log("\n--- Running Test 1.2a: Empty Form Submission ---");
    await openAddStudentDrawer();

    await page.evaluate(() => {
      const inputs = document.querySelectorAll('form input');
      inputs.forEach(i => {
        i.value = '';
        i.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });

    await submitForm();

    const drawerStillOpen12a = await page.evaluate(() => !!document.querySelector('form'));
    if (!drawerStillOpen12a) {
      recordResult("1.2a Empty Form Submission", false, "Form submitted successfully with completely empty student name and blank fields!");
    } else {
      recordResult("1.2a Empty Form Submission", true, "Form submission blocked for empty form.");
    }

    // -------------------------------------------------------------
    // TEST 1.2b: Spaces-only Name ("    ")
    // -------------------------------------------------------------
    console.log("\n--- Running Test 1.2b: Spaces-only Name ---");
    await openAddStudentDrawer();

    await page.evaluate(() => {
      const nameInput = document.querySelector('form input');
      if (nameInput) {
        nameInput.value = "     ";
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    await submitForm();

    const drawerStillOpen12b = await page.evaluate(() => !!document.querySelector('form'));
    if (!drawerStillOpen12b) {
      recordResult("1.2b Spaces-Only Name ('   ')", false, "Form submitted successfully when student name contained only whitespace characters.");
    } else {
      recordResult("1.2b Spaces-Only Name ('   ')", true, "Whitespace name correctly rejected.");
    }

    // -------------------------------------------------------------
    // TEST 1.2c: Invalid Contact Formats (Phone & Email)
    // -------------------------------------------------------------
    console.log("\n--- Running Test 1.2c: Garbage Contacts ---");
    await openAddStudentDrawer();

    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('form input'));
      if (inputs[0]) {
        inputs[0].value = "Василий НевалидныеКонтакты";
        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      }
      inputs.forEach(i => {
        if (i.placeholder?.includes('@') || i.placeholder?.includes('телефон') || i.placeholder?.includes('telegram')) {
          i.value = "GARBAGE_EMAIL_WITHOUT_AT_SYMBOL_123#";
          i.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    });

    await submitForm();

    const savedInvalidContact = await page.evaluate(() => {
      return document.body.innerText.includes("GARBAGE_EMAIL_WITHOUT_AT_SYMBOL_123#");
    });

    if (savedInvalidContact) {
      recordResult("1.2c Invalid Contact Format Validation", false, "Contacts field accepted malformed contact string without validation/formatting check.");
    } else {
      recordResult("1.2c Invalid Contact Format Validation", true, "Malformed contact rejected/formatted.");
    }

  } catch (err) {
    console.error("Test execution error:", err);
  } finally {
    await browser.close();
    console.log("\n==========================================");
    console.log("FINAL SUMMARY OF BLOCK 1 TEST RESULTS:");
    console.table(results);
    console.log("==========================================");
  }
}

runBlock1Tests();
