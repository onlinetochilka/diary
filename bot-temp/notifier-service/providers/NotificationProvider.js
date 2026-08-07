class NotificationProvider {
  /**
   * Инициализирует провайдер (например, запускает бота)
   */
  async start() {
    throw new Error("Method not implemented.");
  }

  /**
   * Останавливает провайдер
   */
  async stop() {
    throw new Error("Method not implemented.");
  }

  /**
   * Отправляет сообщение пользователю
   * @param {string} recipientId - ID получателя (chat_id, email, и т.д.)
   * @param {string} message - Текст сообщения
   */
  async sendMessage(recipientId, message) {
    throw new Error("Method not implemented.");
  }
}

module.exports = NotificationProvider;
