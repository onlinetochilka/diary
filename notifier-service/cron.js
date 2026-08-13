const cron = require("node-cron");

class NotifierCron {
  constructor(dbClient, providers) {
    this.db = dbClient;
    this.providers = providers;
  }

  start() {
    console.log("[NotifierCron] Запуск планировщика...");
    
    // Запускаем каждый час в 00 минут
    cron.schedule("0 * * * *", () => {
      this.runHourlyChecks();
    });
  }

  async runHourlyChecks() {
    console.log("[NotifierCron] Выполнение ежечасной проверки...");
    const configs = await this.db.getActiveNotificationConfigs();

    for (const config of configs) {
      if (!config.notifications) continue;

      const notifSettings = config.notifications;
      const tutorId = config.userId || config.user; 
      
      const students = await this.db.getStudentsForTutor(tutorId);

      // Проверка на долги (Debt Reminder)
      if (notifSettings.debtReminder?.enabled) {
        await this.checkDebts(tutorId, students, notifSettings.debtReminder);
      }

      // Дополнительно можно проверять homeworkReminder и progressReport
    }
  }

  async checkDebts(tutorId, students, settings) {
    // В реальном проекте логика расчета времени возникновения долга сложнее.
    // Пока отправляем просто если у ученика есть долг и он входит в целевую группу.
    const recipients = settings.sendTo === "all" 
      ? students 
      : students.filter(s => settings.selectedStudentIds?.includes(s.id));

    for (const student of recipients) {
      if (!student.tgChatId && !student.maxChatId) continue; // Нет привязанных мессенджеров

      // Если баланс отрицательный — отправляем уведомление
      // В реальном проекте здесь нужна проверка, не отправляли ли мы уже уведомление,
      // чтобы не спамить каждый час.
      if (student.balance < 0) {
        const message = `🔔 <b>Напоминание об оплате</b>\n\nЗдравствуйте! На вашем балансе образовалась задолженность: ${student.balance} руб.\nПожалуйста, пополните баланс перед следующим занятием.`;
        
        // В будущем тут можно перебирать все провайдеры (Email, TG)
        const tgProvider = this.providers.find(p => p.constructor.name === "TelegramProvider");
        if (tgProvider && student.tgChatId) {
          await tgProvider.sendMessage(student.tgChatId, message);
        }

        const maxProvider = this.providers.find(p => p.constructor.name === "MaxProvider");
        if (maxProvider && student.maxChatId) {
          await maxProvider.sendMessage(student.maxChatId, message);
        }
      }
    }
  }
}

module.exports = NotifierCron;
