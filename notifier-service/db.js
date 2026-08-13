const PocketBase = require("pocketbase/cjs");

class DatabaseClient {
  constructor(url, email, password) {
    if (!url || !email || !password) {
      throw new Error("POCKETBASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD are required");
    }
    this.pb = new PocketBase(url);
    this.pb.autoCancellation(false);
    this.email = email;
    this.password = password;
  }

  async authenticate() {
    console.log(`[DatabaseClient] Авторизация в PocketBase: ${this.pb.baseUrl}`);
    try {
      await this.pb.collection('_superusers').authWithPassword(this.email, this.password);
      console.log("[DatabaseClient] Успешная авторизация!");
    } catch (err) {
      console.error("[DatabaseClient] Ошибка авторизации:", err.message);
      throw err;
    }
  }

  /**
   * Получает настройки репетитора (user_config) по tutorId
   */
  async getTutorConfig(tutorId) {
    try {
      const records = await this.pb.collection("user_config").getFullList({
        filter: `userId = "${tutorId}"`
      });
      return records.length > 0 ? records[0] : null;
    } catch (err) {
      console.error(`[DatabaseClient] Ошибка получения настроек репетитора ${tutorId}:`, err.message);
      return null;
    }
  }

  /**
   * Привязывает tgChatId к ученику
   */
  async linkStudentTelegram(studentId, chatId) {
    try {
      const student = await this.pb.collection("students").getOne(studentId);
      
      // Обновляем ученика, записывая tgChatId. 
      // (В PocketBase нужно будет заранее добавить поле tgChatId с типом Text в таблицу students!)
      await this.pb.collection("students").update(studentId, {
        tgChatId: chatId
      });
      return student;
    } catch (err) {
      console.error(`[DatabaseClient] Ошибка привязки ученика ${studentId}:`, err.message);
      return null;
    }
  }

  /**
   * Привязывает maxChatId к ученику
   */
  async linkStudentMax(studentId, chatId) {
    try {
      const student = await this.pb.collection("students").getOne(studentId);
      
      await this.pb.collection("students").update(studentId, {
        maxChatId: chatId
      });
      return student;
    } catch (err) {
      console.error(`[DatabaseClient] Ошибка привязки MAX для ученика ${studentId}:`, err.message);
      return null;
    }
  }

  /**
   * Получает все активные настройки рассылок (user_config)
   */
  async getActiveNotificationConfigs() {
    try {
      const records = await this.pb.collection("user_config").getFullList({
        filter: "notifications != null"
      });
      return records;
    } catch (err) {
      console.error("[DatabaseClient] Ошибка получения настроек:", err.message);
      return [];
    }
  }

  /**
   * Получает учеников для конкретного репетитора, исключая архивированных
   */
  async getStudentsForTutor(tutorId) {
    try {
      return await this.pb.collection("students").getFullList({
        filter: `tutorId = "${tutorId}" && isArchived = false`,
      });
    } catch (err) {
      console.error(`[DatabaseClient] Ошибка получения учеников для репетитора ${tutorId}:`, err.message);
      return [];
    }
  }

  /**
   * Получает уроки (для проверки ДЗ)
   */
  async getLessonsForStudent(studentId, fromDate, toDate) {
    try {
      return await this.pb.collection("lessons").getFullList({
        filter: `studentId = "${studentId}" && date >= "${fromDate}" && date <= "${toDate}"`,
        sort: "date"
      });
    } catch (err) {
      console.error(`[DatabaseClient] Ошибка получения уроков для ученика ${studentId}:`, err.message);
      return [];
    }
  }
  /**
   * Сохраняет или обновляет новость в коллекции community_news
   */
  async saveCommunityNews(postData) {
    try {
      // Ищем, нет ли уже такой новости (по messageId)
      const existing = await this.pb.collection("community_news").getFullList({
        filter: `messageId = "${postData.messageId}"`
      });

      if (existing.length > 0) {
        const updateData = { text: postData.text };
        if (postData.imageData) updateData.imageData = postData.imageData;
        if (postData.isVideo !== undefined) updateData.isVideo = postData.isVideo;

        await this.pb.collection("community_news").update(existing[0].id, updateData);
        console.log(`[DatabaseClient] Обновлена новость: ${postData.messageId}`);
      } else {
        await this.pb.collection("community_news").create(postData);
        console.log(`[DatabaseClient] Создана новость: ${postData.messageId}`);
      }
    } catch (err) {
      console.error("[DatabaseClient] Ошибка сохранения новости:", err.message);
    }
  }
}

module.exports = DatabaseClient;
