import puppeteer from 'puppeteer';
import fs from 'fs';

const BASE_URL = 'http://localhost:5173/?mock_user=true';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function runLayoutTests() {
  console.log("==========================================");
  console.log("      QA STUDENTS: LAYOUT TESTS         ");
  console.log("==========================================");

  const launchOpts = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  };

  // if (fs.existsSync(EDGE_PATH)) {
  //   launchOpts.executablePath = EDGE_PATH;
  // }

  const browser = await puppeteer.launch(launchOpts);
  let passed = true;

  try {
    const page = await browser.newPage();
    // Test different viewports
    const viewports = [
      { width: 1440, height: 900, name: "Desktop Large" },
      { width: 1024, height: 768, name: "Desktop Small" },
      { width: 768, height: 1024, name: "Tablet" },
      { width: 375, height: 812, name: "Mobile" }
    ];

    for (const vp of viewports) {
      console.log(`\nTesting viewport: ${vp.name} (${vp.width}x${vp.height})`);
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(BASE_URL);
      await page.waitForSelector('button', { timeout: 10000 });

      // Navigate to students
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
         console.log("❌ Could not find Students tab");
         passed = false;
         continue;
      }

      await new Promise(r => setTimeout(r, 1000)); // Wait for render

      // Check horizontal scroll / overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      if (hasHorizontalScroll) {
         console.log(`❌ FAILED: Horizontal scroll detected on ${vp.name}! (Layout broken)`);
         passed = false;
         
         // Find which element is overflowing
         const overflowElements = await page.evaluate(() => {
            const elements = document.querySelectorAll('*');
            const result = [];
            for (let el of elements) {
               if (el.scrollWidth > el.clientWidth) {
                  result.push({ tag: el.tagName, class: el.className });
               }
            }
            return result;
         });
         console.log("Overflowing elements:", overflowElements);
      } else {
         console.log(`✅ PASSED: No horizontal scroll on ${vp.name}`);
      }
    }
  } catch (err) {
    console.error("Test execution error:", err);
    passed = false;
  } finally {
    await browser.close();
    console.log("\n==========================================");
    if (passed) {
       console.log("✅ ALL LAYOUT TESTS PASSED");
    } else {
       console.log("❌ LAYOUT TESTS FAILED");
    }
    console.log("==========================================");
  }
}

runLayoutTests();
