const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient();

async function getTelegramConfig() {
  const settings = await prisma.setting.findMany({
    where: { key: { in: ['telegramBotToken', 'telegramChatId', 'telegramNotificationsEnabled'] } }
  });
  const map = {};
  settings.forEach(s => { map[s.key] = s.value; });
  return {
    botToken: map.telegramBotToken || '',
    chatId: map.telegramChatId || '',
    enabled: map.telegramNotificationsEnabled === 'true'
  };
}

/**
 * Fire-and-forget notifier used by request-handling code — never throws,
 * so a Telegram outage can't break the order/payment flow it's attached to.
 */
async function sendTelegramNotification(text) {
  try {
    const { botToken, chatId, enabled } = await getTelegramConfig();
    if (!enabled || !botToken || !chatId) return;

    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'HTML'
    });
  } catch (error) {
    logger.error('Telegram notification failed:', error.response?.data || error.message);
  }
}

module.exports = { getTelegramConfig, sendTelegramNotification };
