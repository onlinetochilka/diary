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
      const payload = ctx.payload; 
      
      if (!payload) {
        return ctx.reply(
          `Привет! 👋\n\n` +
          `Я — помощник от Точилки. Через меня ваш учитель может присылать расписание, домашние задания и напоминания.\n\n` +
          `Чтобы подключиться, попросите вашего учителя прислать ссылку — это займёт пару секунд.`
        );
      }

      if (payload.startsWith("student_")) {
        const studentId = payload.replace("student_", "");
        const chatId = ctx.from.id.toString();
        
        if (this.onStudentLinked) {
          this.onStudentLinked(studentId, chatId, ctx);
        } else {
          ctx.reply("Ссылка распознана, но база данных пока не подключена.");
        }
      } else {
        ctx.reply(
          `😕 Не получилось подключиться — возможно, ссылка устарела или была неполной.\n\n` +
          `Пожалуйста, попросите вашего учителя прислать новую ссылку для подключения.\n\n` +
          `Если проблема повторится — напишите нам: help@tochilka.app`
        );
      }
    });

    // Команда /help
    this.bot.help((ctx) => {
      ctx.reply(
        `Что я умею:\n\n` +
        `✅ Напоминания о несданных домашних заданиях\n` +
        `✅ Уведомления о задолженности по оплате\n` +
        `🔜 Расписание занятий — скоро\n` +
        `🔜 Напоминания о предстоящих уроках — скоро\n\n` +
        `Все настройки на стороне вашего учителя.\n\n` +
        `Точилка → tochilka.app`
      );
    });

    // Обработчик новостей из канала
    const handleNews = async (ctx) => {
      const post = ctx.update.channel_post || ctx.update.edited_channel_post;
      if (!post) return;
      const text = post.text || post.caption || "";

      let imageData = null;
      let isVideo = false;

      try {
        if (post.photo && post.photo.length > 0) {
          const largestPhoto = post.photo[post.photo.length - 1];
          const fileLink = await ctx.telegram.getFileLink(largestPhoto.file_id);
          const response = await fetch(fileLink.href);
          const arrayBuffer = await response.arrayBuffer();
          imageData = Buffer.from(arrayBuffer).toString('base64');
        } else if (post.video) {
          isVideo = true;
          const thumb = post.video.thumbnail || post.video.thumb;
          if (thumb) {
            const fileLink = await ctx.telegram.getFileLink(thumb.file_id);
            const response = await fetch(fileLink.href);
            const arrayBuffer = await response.arrayBuffer();
            imageData = Buffer.from(arrayBuffer).toString('base64');
          }
        }
      } catch (err) {
        console.error("[TelegramProvider] Ошибка загрузки медиа:", err.message);
      }

      if (this.onNewsPost) {
        this.onNewsPost({
          messageId: post.message_id.toString(),
          text: text,
          channelName: post.chat.username ? `@${post.chat.username}` : post.chat.title,
          date: new Date(post.date * 1000).toISOString(),
          imageData: imageData,
          isVideo: isVideo
        });
      }
    };
    
    this.bot.on('channel_post', handleNews);
    this.bot.on('edited_channel_post', handleNews);

    // Обработчик произвольных текстовых сообщений
    this.bot.on('text', (ctx) => {
      ctx.reply(
        `Я автоматический бот и не могу отвечать на сообщения.\n\n` +
        `Если у вас есть вопросы — обратитесь к вашему учителю напрямую.`
      );
    });
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
