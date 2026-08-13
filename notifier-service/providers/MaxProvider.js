/**
 * MaxProvider.js
 * ────────────────────────────────────────────────────────────────────────────
 * Провайдер уведомлений для мессенджера MAX (max.ru).
 * Использует MAX Bot API: https://platform-api.max.ru
 *
 * Токен передаётся через env: MAX_BOT_TOKEN
 * Авторизация: Authorization: Bearer <TOKEN>
 *
 * API эндпоинты:
 *   POST /messages — отправка сообщения
 *   GET  /updates  — получение обновлений (long polling)
 *   POST /subscriptions — регистрация webhook
 */

const NotificationProvider = require("./NotificationProvider");

const MAX_API_BASE = "https://platform-api.max.ru";

class MaxProvider extends NotificationProvider {
  constructor(token) {
    super();
    if (!token) {
      throw new Error("MAX_BOT_TOKEN is missing");
    }
    this.token = token;
    this.headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    this.polling = false;
    this.pollingTimeout = null;
  }

  /**
   * Запуск бота в режиме long polling (для разработки).
   * В продакшне рекомендуется использовать webhooks.
   */
  async start() {
    console.log("[MaxProvider] Запуск MAX бота (long polling)...");
    this.polling = true;
    this._poll();

    process.once("SIGINT", () => this.stop());
    process.once("SIGTERM", () => this.stop());
  }

  async stop() {
    console.log("[MaxProvider] Остановка MAX бота...");
    this.polling = false;
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
    }
  }

  /**
   * Long polling для получения обновлений
   */
  async _poll() {
    if (!this.polling) return;

    try {
      const url = `${MAX_API_BASE}/updates?timeout=30`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 35000);

      const res = await fetch(url, {
        headers: this.headers,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data.updates && Array.isArray(data.updates)) {
          for (const update of data.updates) {
            await this._handleUpdate(update);
          }
        }
      } else {
        console.error(`[MaxProvider] Polling error: ${res.status} ${res.statusText}`);
        // Задержка перед повторной попыткой при ошибке
        await new Promise(r => setTimeout(r, 5000));
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error("[MaxProvider] Polling exception:", err.message);
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    // Продолжаем polling
    if (this.polling) {
      this.pollingTimeout = setTimeout(() => this._poll(), 100);
    }
  }

  /**
   * Обработка входящего обновления
   */
  async _handleUpdate(update) {
    try {
      // MAX API отправляет разные типы обновлений
      const message = update.message || update.body;
      if (!message) return;

      const chatId = message.recipient?.chat_id || message.chat?.chat_id;
      const text = message.body?.text || message.text || "";
      const userId = message.sender?.user_id;

      if (!chatId && !userId) return;
      const targetChatId = chatId || userId;

      // Обработка команды /start с payload
      if (text.startsWith("/start")) {
        const payload = text.replace("/start", "").trim();

        if (!payload) {
          await this.sendMessage(
            targetChatId,
            "Привет! Я бот-помощник репетитора из «Точилки». " +
            "Чтобы получать уведомления, перейдите по специальной ссылке, " +
            "которую вам отправит репетитор."
          );
          return;
        }

        // Пытаемся декодировать payload
        try {
          const data = JSON.parse(Buffer.from(payload, 'base64').toString());
          const { studentId } = data;

          if (studentId && this.onStudentLinked) {
            await this.onStudentLinked(studentId, targetChatId.toString(), {
              reply: (msg) => this.sendMessage(targetChatId, msg),
            });
          } else {
            await this.sendMessage(targetChatId, "Неизвестный код. Запросите у репетитора новую ссылку.");
          }
        } catch {
          // Если payload вида student_XXXX (альтернативный формат)
          if (payload.startsWith("student_")) {
            const studentId = payload.replace("student_", "");
            if (this.onStudentLinked) {
              await this.onStudentLinked(studentId, targetChatId.toString(), {
                reply: (msg) => this.sendMessage(targetChatId, msg),
              });
            }
          } else {
            await this.sendMessage(targetChatId, "Неизвестный код. Запросите у репетитора новую ссылку.");
          }
        }
        return;
      }

      // Обработка /stop
      if (text.startsWith("/stop")) {
        await this.sendMessage(
          targetChatId,
          "🔕 Уведомления отключены.\nЧтобы снова включить — попросите репетитора прислать ссылку."
        );
        return;
      }

      // Обычное сообщение
      await this.sendMessage(
        targetChatId,
        "👋 Я бот-помощник репетитора. Используйте ссылку от репетитора для подключения уведомлений."
      );
    } catch (err) {
      console.error("[MaxProvider] Error handling update:", err.message);
    }
  }

  /**
   * Отправка сообщения пользователю через MAX Bot API
   * @param {string} chatId — ID чата или пользователя
   * @param {string} message — текст сообщения
   */
  async sendMessage(chatId, message) {
    try {
      const res = await fetch(`${MAX_API_BASE}/messages?chat_id=${chatId}`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          text: message,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.error(`[MaxProvider] Ошибка отправки: ${res.status} ${errBody}`);
        return false;
      }

      return true;
    } catch (err) {
      console.error(`[MaxProvider] Ошибка отправки сообщения ${chatId}:`, err.message);
      return false;
    }
  }

  /**
   * Получение информации о боте
   */
  async getBotInfo() {
    try {
      const res = await fetch(`${MAX_API_BASE}/me`, {
        headers: this.headers,
      });
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (err) {
      console.error("[MaxProvider] Ошибка получения информации о боте:", err.message);
      return null;
    }
  }
}

module.exports = MaxProvider;
