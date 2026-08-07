require("dotenv").config();
const DatabaseClient = require("./db");
const TelegramProvider = require("./providers/TelegramProvider");
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
          ctx.reply(`✅ Уведомления от преподавателя успешно подключены для ученика: ${student.name}`);
        } else {
          ctx.reply("❌ Ошибка привязки. Возможно, ученик не найден.");
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
