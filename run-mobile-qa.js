import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Emulate a mobile device (iPhone 13 dimensions)
  await page.setViewport({
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
  });

  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', error => logs.push(`[ERROR] ${error.message}`));

  console.log("🚀 Запуск мобильного QA-тестирования (Viewport: 390x844)...");

  try {
    // 1. Check Students Page
    console.log("➡️ Переход на страницу учеников...");
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    
    // Check horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    console.log(`- Горизонтальный скролл (overflow): ${hasOverflow ? 'ОБНАРУЖЕН ❌' : 'ОТСУТСТВУЕТ ✅'}`);

    // Wait for students to load (Wait for Card or empty state)
    await page.waitForSelector('.group.flex.flex-col', { timeout: 5000 }).catch(() => {});
    
    // Check Drawer opens properly on mobile
    console.log("➡️ Попытка открыть карточку ученика (Drawer)...");
    const editBtns = await page.$$('button[aria-label="Изменить"]');
    if (editBtns.length > 0) {
      await editBtns[0].click();
      await page.waitForSelector('input[name="name"]', { visible: true, timeout: 3000 });
      console.log("- Drawer успешно открылся ✅");
      
      const drawerWidth = await page.evaluate(() => {
        const drawer = document.querySelector('div[role="dialog"] > div.flex');
        return drawer ? drawer.getBoundingClientRect().width : 0;
      });
      console.log(`- Ширина шторки (Drawer): ${drawerWidth}px (Viewport: 390px)`);
      if (drawerWidth > 390) {
        console.log("- ВНИМАНИЕ: Шторка шире экрана! ❌");
      } else {
        console.log("- Шторка помещается на экране ✅");
      }

      // Close drawer
      const closeBtns = await page.$$('button > svg.lucide-x');
      if (closeBtns.length > 0) {
        await closeBtns[0].click();
        await new Promise(r => setTimeout(r, 500)); // wait for animation
      }
    } else {
      console.log("- Нет учеников для тестирования шторки ⚠️");
    }

    // 2. Check Schedule Page
    console.log("➡️ Переход на страницу расписания...");
    // Assuming there's a navigation button to Schedule. Or just go directly.
    const navButtons = await page.$$('nav button, aside button, .flex button');
    // Let's just click the "Расписание" button. We can evaluate based on text.
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const scheduleBtn = btns.find(b => b.textContent.includes('Расписание'));
      if (scheduleBtn) scheduleBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 1500)); // wait for navigation and data load

    // Verify auto-switch to Agenda view
    const isAgendaView = await page.evaluate(() => {
      // The agenda view has unique classes or text or segment control is set to agenda
      const text = document.body.innerText;
      return text.includes('Запланировано на сегодня') || text.includes('Пн') || document.querySelector('.space-y-4') !== null;
    });
    
    const segmentControls = await page.evaluate(() => {
       const labels = Array.from(document.querySelectorAll('label'));
       const agendaLabel = labels.find(l => l.textContent.includes('Повестка'));
       if (!agendaLabel) return false;
       return agendaLabel.querySelector('input').checked || agendaLabel.classList.contains('bg-white'); // rough check
    });

    console.log(`- Автоматическое переключение на "Повестка" (Agenda) при < 1024px: ${segmentControls ? 'РАБОТАЕТ ✅' : 'НЕ РАБОТАЕТ ❌'}`);

    // Check horizontal overflow on Schedule Page
    const hasOverflowSchedule = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    console.log(`- Горизонтальный скролл на странице Расписания: ${hasOverflowSchedule ? 'ОБНАРУЖЕН ❌' : 'ОТСУТСТВУЕТ ✅'}`);

    console.log("-----------------------------------------");
    console.log("Логи браузера (Ошибки/Предупреждения):");
    const errorLogs = logs.filter(l => l.includes('ERROR') || l.includes('error'));
    if (errorLogs.length === 0) {
      console.log("Чисто ✅");
    } else {
      errorLogs.forEach(l => console.log(l));
    }

  } catch (error) {
    console.error("ОШИБКА ТЕСТИРОВАНИЯ:", error);
  } finally {
    await browser.close();
    console.log("🏁 Тестирование завершено.");
  }
})();
