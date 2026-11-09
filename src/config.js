require('dotenv').config();

const list = (s) => (s || '').split(',').map((x) => x.trim()).filter(Boolean);

const CHANNEL_ID = (process.env.CHANNEL_ID || '').trim();
let CHANNEL_URL = (process.env.CHANNEL_URL || '').trim();
if (!CHANNEL_URL && CHANNEL_ID.startsWith('@')) CHANNEL_URL = `https://t.me/${CHANNEL_ID.slice(1)}`;

module.exports = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  ADMIN_IDS: list(process.env.ADMIN_IDS).map(Number),
  ADMIN_USERNAME: (process.env.ADMIN_USERNAME || '').replace(/^@/, ''),
  CHANNEL_ID,
  CHANNEL_URL,
  // Loglar yoziladigan maxfiy kanal (bot u yerda admin bo'lishi kerak)
  LOG_CHANNEL_ID: (process.env.LOG_CHANNEL_ID || '').trim(),
  LOG_INTERVAL_MS: Number(process.env.LOG_INTERVAL_MS || 3000),
  LOG_SESSION_MINUTES: Number(process.env.LOG_SESSION_MINUTES || 30),
  // Mini App
  WEBAPP_URL: (process.env.WEBAPP_URL || '').trim().replace(/\/$/, ''),
  PORT: Number(process.env.PORT || 3000),
  DB_CLIENT: (process.env.DB_CLIENT || 'sqlite').toLowerCase(),
  SQLITE_FILE: process.env.SQLITE_FILE || './data/bot.sqlite',
  MYSQL: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'edu_bot',
  },
};
