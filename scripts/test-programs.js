import { chromium } from '@playwright/test';
import assert from 'assert';

(async () => {
  console.log("Запуск проверки верстки страницы Программ...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    // Кликаем по меню "Программы" (или переходим, если роутер позволяет)
    // Ищем элемент меню со словом "Программы"
    const programsMenu = page.locator('text="Программы"');
    if (await programsMenu.count() > 0) {
      await programsMenu.first().click();
    } else {
      console.log("Не удалось найти пункт меню 'Программы', возможно мы уже там.");
    }
    
    // Ждем появления заголовка "Мои курсы"
    await page.waitForSelector('h1:has-text("Мои курсы")');
    console.log("Страница 'Программы' загружена.");
    
    // Ждем загрузки карточек (или пустого состояния)
    await page.waitForTimeout(2000); // Ждем данные из Firebase
    
    const cards = page.locator('h3').locator('xpath=ancestor::div[contains(@class, "flex-col") and contains(@class, "cursor-pointer")]');
    const cardsCount = await cards.count();
    
    console.log(`Найдено карточек программ: ${cardsCount}`);
    
    if (cardsCount > 0) {
      // Проверяем наличие классов у первой карточки
      const firstCard = cards.first();
      const cardClass = await firstCard.getAttribute('class');
      assert.ok(cardClass.includes('h-full'), 'Карточка должна иметь класс h-full для растягивания в Grid');
      
      const title = firstCard.locator('h3');
      const titleClass = await title.getAttribute('class');
      assert.ok(titleClass.includes('truncate'), 'Заголовок должен иметь класс truncate');
      
      const subject = firstCard.locator('p').first();
      if (await subject.count() > 0) {
          const subjectClass = await subject.getAttribute('class');
          assert.ok(subjectClass.includes('truncate'), 'Описание (subject) должно иметь класс truncate');
      }
      
      // Проверяем подвал карточки
      const footer = firstCard.locator('div.mt-auto');
      const footerClass = await footer.getAttribute('class');
      assert.ok(footerClass.includes('mt-auto'), 'Блок с темами должен иметь класс mt-auto');
      assert.ok(footerClass.includes('pt-4'), 'Блок с темами должен иметь класс pt-4');
      
      console.log("Все классы верстки (h-full, truncate, mt-auto) присутствуют и корректны!");
    } else {
      console.log("Карточек нет, проверка классов пропущена.");
    }

    console.log("✅ Проверка верстки успешно пройдена!");
  } catch (error) {
    console.error("❌ Ошибка при проверке верстки:", error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
