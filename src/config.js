require('dotenv').config();

const env = process.env;
const list = (s) => (s || '').split(',').map((x) => x.trim()).filter(Boolean);
const first = (...keys) => {
  for (const k of keys) if (env[k] && String(env[k]).trim()) return String(env[k]).trim();
  return '';
};

const CHANNEL_ID = (env.CHANNEL_ID || '').trim();
let CHANNEL_URL = (env.CHANNEL_URL || '').trim();
if (!CHANNEL_URL && CHANNEL_ID.startsWith('@')) CHANNEL_URL = `https://t.me/${CHANNEL_ID.slice(1)}`;

// ---------- MySQL ----------
// Qo'llab-quvvatlanadi: MYSQL_URL / DATABASE_URL (mysql://user:parol@host:port/baza),
// Railway nomlari (MYSQLHOST, MYSQLPORT, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE)
// va oldingi nomlar (MYSQL_HOST, MYSQL_PORT, ...).
function parseMysqlUrl(url) {
  try {
    const u = new URL(url);
    if (!/^mysql/.test(u.protocol)) return null;
    return {
      host: u.hostname,
      port: Number(u.port || 3306),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: decodeURIComponent(u.pathname.replace(/^\//, '')),
    };
  } catch (e) {
    return null;
  }
}

// Bo'sh qiymatlar o'tkazib yuboriladi — birinchi to'ldirilgani olinadi
const fromUrl = parseMysqlUrl(first('MYSQL_URL', 'DATABASE_URL', 'MYSQL_PRIVATE_URL', 'MYSQL_PUBLIC_URL'));
const MYSQL = fromUrl || {
  host: first('MYSQLHOST', 'MYSQL_HOST') || '127.0.0.1',
  port: Number(first('MYSQLPORT', 'MYSQL_PORT') || 3306),
  user: first('MYSQLUSER', 'MYSQL_USER') || 'root',
  password: first('MYSQLPASSWORD', 'MYSQL_PASSWORD'),
  database: first('MYSQLDATABASE', 'MYSQL_DATABASE') || 'edu_bot',
};
const mysqlGiven = !!(fromUrl || first('MYSQLHOST', 'MYSQL_HOST'));

// DB_CLIENT aniq berilmagan bo'lsa: MySQL o'zgaruvchilari bor — mysql, aks holda — sqlite
const DB_CLIENT = (first('DB_CLIENT') || (mysqlGiven ? 'mysql' : 'sqlite')).toLowerCase();

// ---------- Mini ilova manzili ----------
// WEBAPP_URL berilmasa, Railway domeni (RAILWAY_PUBLIC_DOMAIN) ishlatiladi
let WEBAPP_URL = first('WEBAPP_URL').replace(/\/$/, '');
if (!WEBAPP_URL && env.RAILWAY_PUBLIC_DOMAIN) WEBAPP_URL = `https://${env.RAILWAY_PUBLIC_DOMAIN}`;

module.exports = {
  BOT_TOKEN: first('BOT_TOKEN'),
  ADMIN_IDS: list(env.ADMIN_IDS).map(Number),
  ADMIN_USERNAME: (env.ADMIN_USERNAME || '').replace(/^@/, ''),
  CHANNEL_ID,
  CHANNEL_URL,
  // Loglar yoziladigan maxfiy kanal (bot u yerda admin bo'lishi kerak)
  LOG_CHANNEL_ID: (env.LOG_CHANNEL_ID || '').trim(),
  LOG_INTERVAL_MS: Number(env.LOG_INTERVAL_MS || 3000),
  LOG_SESSION_MINUTES: Number(env.LOG_SESSION_MINUTES || 30),
  // Mini App
  WEBAPP_URL,
  PORT: Number(env.PORT || 3000),
  DB_CLIENT,
  SQLITE_FILE: env.SQLITE_FILE || './data/bot.sqlite',
  MYSQL,
  ON_RAILWAY: !!(env.RAILWAY_ENVIRONMENT || env.RAILWAY_PROJECT_ID || env.RAILWAY_SERVICE_ID),
};
