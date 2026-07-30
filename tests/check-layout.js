import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1024, height: 768 } // lg breakpoint
  });

  page.on('console', msg => console.log('BROWSER:', msg.text()));

  try {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('text=Рабочие моменты');
    await page.waitForTimeout(2000); // wait for load and render

    const result = await page.evaluate(() => {
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      
      const listEl = document.querySelector('.hide-scrollbar');
      let listInfo = null;
      if (listEl) {
        listInfo = {
          scrollHeight: listEl.scrollHeight,
          clientHeight: listEl.clientHeight
        };
      }

      // Find the aside to check if it's actually sticky
      const asideEl = document.querySelector('aside');
      let asideInfo = null;
      if (asideEl) {
        const rect = asideEl.getBoundingClientRect();
        asideInfo = {
          top: rect.top,
          height: rect.height,
          position: window.getComputedStyle(asideEl).position
        };
      }

      // Check if main flex layout is overflowing the screen
      const rootDiv = document.querySelector('#root > div');
      let rootHeight = rootDiv ? rootDiv.clientHeight : 0;

      return {
        windowHeight,
        docHeight,
        hasGlobalScroll: docHeight > windowHeight,
        rootHeight,
        listInfo,
        asideInfo
      };
    });

    console.log(JSON.stringify(result, null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
})();
