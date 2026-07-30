import { test, expect } from '@playwright/test';

test('Check Dashboard layout and scroll', async ({ page }) => {
  await page.goto('http://localhost:5173');
  
  // Wait for loading to finish
  await page.waitForSelector('text=Рабочие моменты');
  // Wait for the skeleton to disappear
  await page.waitForTimeout(2000);

  // Check window height and document height
  const { windowHeight, docHeight } = await page.evaluate(() => {
    return {
      windowHeight: window.innerHeight,
      docHeight: document.documentElement.scrollHeight
    };
  });
  
  console.log(`Window Height: ${windowHeight}, Document Height: ${docHeight}`);
  
  const hasGlobalScroll = docHeight > windowHeight;
  console.log(`Has global scroll: ${hasGlobalScroll}`);

  // Check if "Рабочие моменты" list is scrollable
  const actionListScrollHeight = await page.evaluate(() => {
    const el = document.querySelector('.hide-scrollbar');
    if (!el) return null;
    return {
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight
    };
  });
  
  console.log('Action list scroll info:', actionListScrollHeight);
});
