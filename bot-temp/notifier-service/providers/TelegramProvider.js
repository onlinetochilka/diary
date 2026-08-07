const { Telegraf } = require("telegraf");
const NotificationProvider = require("./NotificationProvider");

class TelegramProvider extends NotificationProvider {
  constructor(token) {
    super();
    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN is missing");
    }
    this.bot = new Telegraf(token);
    this.setupHandlers();
  }

  /**
   * Настройка обработчиков команд бота
   */
  setupHandlers() {
    this.bot.start((ctx) => {
      // payload - это часть команды после /start, например /start student_1234
      const payload = ctx.payload; 
      
      if (!payload) {
        return ctx.reply("Привет! Я бот для уведомлений от 'Точилки'. Чтобы получать уведомления, перейдите по специальной ссылке, которую вам отправит репетитор.");
      }

      if (payload.startsWith("student_")) {
        const studentId = payload.replace("student_", "");
        const chatId = ctx.from.id.toString();
        
        // Здесь мы генерируем событие, которое обработает основной класс приложения,
        // чтобы сохранить связку studentId <-> chatId в PocketBase.
        if (this.onStudentLinked) {
          this.onStudentLinked(studentId, chatId, ctx);
        } else {
          ctx.reply("Ссылка распознана, но база данных пока не подключена.");
        }
      } else {
        ctx.reply("Неизвестный код. Запросите у репетитора новую ссылку.");
      }
    });

    const handleNews = (ctx) => {
      const post = ctx.update.channel_post || ctx.update.edited_channel_post;
      if (!post) return;
      const text = post.text || post.caption || "";
      if (this.onNewsPost) {
        this.onNewsPost({
          messageId: post.message_id.toString(),
          text: text,
          channelName: post.chat.username ? `@${post.chat.username}` : post.chat.title,
          date: new Date(post.date * 1000).toISOString()
        });
      }
    };
    
    this.bot.on('channel_post', handleNews);
    this.bot.on('edited_channel_post', handleNews);
  }

  async start() {
    console.log("[TelegramProvider] Запуск Telegram бота...");
    this.bot.launch();
    
    // Enable graceful stop
    process.once("SIGINT", () => this.bot.stop("SIGINT"));
    process.once("SIGTERM", () => this.bot.stop("SIGTERM"));
  }

  async stop() {
    console.log("[TelegramProvider] Остановка Telegram бота...");
    this.bot.stop();
  }

  async sendMessage(recipientId, message) {
    try {
      await this.bot.telegram.sendMessage(recipientId, message, {
        parse_mode: "HTML",
      });
      return true;
    } catch (err) {
      console.error(`[TelegramProvider] Ошибка отправки сообщения ${recipientId}:`, err.message);
      return false;
    }
  }
}

module.exports = TelegramProvider;
