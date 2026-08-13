require("dotenv").config();
const DatabaseClient = require("./db");
const TelegramProvider = require("./providers/TelegramProvider");
const MaxProvider = require("./providers/MaxProvider");
const NotifierCron = require("./cron");

async function bootstrap() {
  try {
    // 1. Инициализация базы данных
    const dbClient = new DatabaseClient(
      process.env.POCKETBASE_URL,
      process.env.ADMIN_EMAIL,
      process.env.ADMIN_PASSWORD
    );
    await dbClient.authenticate();

    // 2. Инициализация провайдеров (пока только Telegram)
    const providers = [];
    if (process.env.TELEGRAM_BOT_TOKEN) {
      const tg = new TelegramProvider(process.env.TELEGRAM_BOT_TOKEN);
      
      // Настраиваем обработчик привязки ученика
      tg.onStudentLinked = async (studentId, chatId, ctx) => {
        console.log(`[Telegram] Привязка ученика ${studentId} к чату ${chatId}`);
        const student = await dbClient.linkStudentTelegram(studentId, chatId);
        if (student) {
          // Персонализация: имя учителя + предметы
          const tutorConfig = await dbClient.getTutorConfig(student.tutorId);
          const tutorName = tutorConfig?.displayName || '';
          const subjects = tutorConfig?.subjects || [];
          const subjectList = subjects.length ? ` (${subjects.join(', ')})` : '';

          let successText;
          if (tutorName) {
            successText = 
              `🎉 Готово! Уведомления подключены.\n\n` +
              `Ваш учитель: ${tutorName}${subjectList}\n\n` +
              `Теперь сюда будут приходить расписание, домашние задания и напоминания.`;
          } else {
            successText = 
              `🎉 Готово! Уведомления подключены.\n\n` +
              `Теперь сюда будут приходить:\n` +
              `• Расписание занятий\n` +
              `• Домашние задания\n` +
              `• Важные напоминания\n\n` +
              `Ожидайте первого уведомления!`;
          }

          ctx.reply(successText, {
            reply_markup: {
              inline_keyboard: [[
                { text: 'Канал с лайфхаками →', url: 'https://t.me/tochilka_online' },
                { text: 'tochilka.app →', url: 'https://tochilka.app' }
              ]]
            }
          });
        } else {
          ctx.reply(
            `😕 Не получилось подключиться — возможно, ссылка устарела или была неполной.\n\n` +
            `Пожалуйста, попросите вашего учителя прислать новую ссылку для подключения.\n\n` +
            `Если проблема повторится — напишите нам: help@tochilka.app`
          );
        }
      };

      // Обработчик новостей из канала
      tg.onNewsPost = async (postData) => {
        console.log(`[Telegram] Получена новость из канала: ${postData.channelName}`);
        await dbClient.saveCommunityNews(postData);
      };

      await tg.start();
      providers.push(tg);
    }

    // 3. Инициализация MAX провайдера (если токен указан)
    if (process.env.MAX_BOT_TOKEN) {
      const maxProvider = new MaxProvider(process.env.MAX_BOT_TOKEN);
      
      maxProvider.onStudentLinked = async (studentId, chatId, ctx) => {
        console.log(`[MAX] Привязка ученика ${studentId} к чату ${chatId}`);
        const student = await dbClient.linkStudentMax(studentId, chatId);
        if (student) {
          // Персонализация: имя учителя + предметы
          const tutorConfig = await dbClient.getTutorConfig(student.tutorId);
          const tutorName = tutorConfig?.displayName || '';
          const subjects = tutorConfig?.subjects || [];
          const subjectList = subjects.length ? ` (${subjects.join(', ')})` : '';

          let successText;
          if (tutorName) {
            successText = 
              `🎉 Готово! Уведомления подключены.\n\n` +
              `Ваш учитель: ${tutorName}${subjectList}\n\n` +
              `Теперь сюда будут приходить расписание, домашние задания и напоминания.`;
          } else {
            successText = 
              `🎉 Готово! Уведомления подключены.\n\n` +
              `Теперь сюда будут приходить:\n` +
              `• Расписание занятий\n` +
              `• Домашние задания\n` +
              `• Важные напоминания\n\n` +
              `Ожидайте первого уведомления!`;
          }

          ctx.reply(successText);
        } else {
          ctx.reply(
            `😕 Не получилось подключиться — возможно, ссылка устарела или была неполной.\n\n` +
            `Пожалуйста, попросите вашего учителя прислать новую ссылку для подключения.\n\n` +
            `Если проблема повторится — напишите нам: help@tochilka.app`
          );
        }
      };

      await maxProvider.start();
      providers.push(maxProvider);
    }

    // 3. Запуск планировщика
    const cronJob = new NotifierCron(dbClient, providers);
    cronJob.start();

    console.log("🚀 Notifier Service успешно запущен.");
  } catch (err) {
    console.error("Критическая ошибка запуска:", err);
    process.exit(1);
  }
}

bootstrap();
