const config = require('./config');
const { db, migrate, waitForDb } = require('./db');

// Bir martalik buyruq: SQLite bazani MySQL ga ko'chirish
//   node bot.js migrate-sqlite data/bot.sqlite [--force]
if (process.argv[2] === 'migrate-sqlite') {
  require('./tools/sqliteToMysql')
    .run(process.argv[3], process.argv.includes('--force'))
    .then(() => process.exit(0))
    .catch((e) => {
      console.error('❌', e.message);
      process.exit(1);
    });
} else {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

// 409 Conflict — boshqa nusxa hali ishlayapti (masalan Railway yangi versiyani qo'yayotganda). Biroz kutib qayta urinamiz.
async function launchWithRetry(bot) {
  for (let i = 1; ; i += 1) {
    try {
      await bot.launch({ dropPendingUpdates: false }, () => {
        console.log(`🤖 Bot ishga tushdi: @${bot.botInfo.username}  (v${require('../package.json').version}, baza: ${config.DB_CLIENT}, papka: ${process.cwd()})`);
      });
      return;
    } catch (e) {
      const conflict = e && (e.code === 409 || /409|Conflict/i.test(e.message || ''));
      if (!conflict || i >= 12) throw e;
      console.warn(`[bot] 409 Conflict: boshqa nusxa ishlayapti, ${i * 5} soniyadan keyin qayta urinaman (${i}/12)...`);
      await new Promise((r) => setTimeout(r, i * 5000));
    }
  }
}

async function main() {
  const { createBot } = require('./bot');
  const logger = require('./logger');
  const { startServer } = require('./server');

  if (!config.BOT_TOKEN) {
    const raw = process.env.BOT_TOKEN;
    const known = ['BOT_TOKEN', 'ADMIN_IDS', 'CHANNEL_ID', 'LOG_CHANNEL_ID', 'MYSQL_URL'].map((k) => `${k}: ${process.env[k] === undefined ? "yo'q" : String(process.env[k]).trim() ? 'bor' : "bo'sh"}`);
    console.error('❌ BOT_TOKEN topilmadi.');
    console.error(raw === undefined
      ? "   Sabab: BOT_TOKEN o'zgaruvchisi umuman kelmadi. Railway'da: o'zgaruvchilar qo'shilgach yuqoridagi «Deploy / Apply changes» ni bosing va ular aynan BOT xizmatiga (MySQL ga emas) qo'shilganini tekshiring."
      : "   Sabab: BOT_TOKEN bo'sh. Qiymatni qo'shtirnoqsiz, bo'sh joysiz kiriting (masalan 123456789:AAH...).");
    console.error(`   Ko'rinayotgan o'zgaruvchilar → ${known.join(', ')}`);
    // Tez-tez qayta ishga tushib loglarni to'ldirmaslik uchun biroz kutamiz
    await new Promise((r) => setTimeout(r, 30000));
    process.exit(1);
  }
  if (!config.ADMIN_IDS.length) console.warn("⚠️ ADMIN_IDS bo'sh — admin panel hech kimga ko'rinmaydi.");
  if (config.ON_RAILWAY && config.DB_CLIENT !== 'mysql' && process.env.ALLOW_SQLITE !== '1') {
    const v = ['MYSQL_URL', 'DATABASE_URL', 'MYSQL_PUBLIC_URL'].map((k) => process.env[k]).find((x) => x !== undefined && String(x).trim()) ?? process.env.MYSQL_URL;
    console.error("❌ Railway'da MySQL ulanmagan — SQLite bilan ishga tushirilmaydi, aks holda har deploy'da barcha ma'lumotlar (foydalanuvchilar, balanslar) o'chib ketadi.");
    console.error(v === undefined
      ? "   Sabab: MYSQL_URL o'zgaruvchisi yo'q. Bot xizmati → Variables → MYSQL_URL = ${{MySQL.MYSQL_URL}} qo'shing va Deploy bosing."
      : !v.trim()
        ? "   Sabab: MYSQL_URL BO'SH. ${{MySQL.MYSQL_URL}} dagi «MySQL» — MySQL xizmatining aniq nomi bo'lishi kerak (Railway'da xizmat nomini tekshiring, masalan ${{MySQL-abcd.MYSQL_URL}}). Qiymat yozayotganda avtomatik taklifdan tanlang."
        : `   Sabab: MYSQL_URL noto'g'ri formatda (mysql://... bo'lishi kerak). Hozirgi boshi: ${v.slice(0, 12)}...`);
    await new Promise((r) => setTimeout(r, 30000));
    process.exit(1);
  }

  await waitForDb();
  await migrate();
  await require('./categories').seed();
  const where = config.DB_CLIENT === 'mysql' ? `${config.MYSQL.host}:${config.MYSQL.port}/${config.MYSQL.database}` : config.SQLITE_FILE;
  console.log(`[db] ${config.DB_CLIENT} tayyor (${where})`);

  const bot = createBot(config.BOT_TOKEN);
  // Server avval ishga tushadi — hosting holat tekshiruvi (/health) tez javob olsin
  const server = startServer(bot);

  bot.botInfo = await bot.telegram.getMe();
  await require('./subscription').verifyChannel(bot.telegram, bot.botInfo.id);
  await bot.telegram.setMyCommands([{ command: 'start', description: 'Asosiy menyu' }]);
  logger.start(bot.telegram);

  if (config.WEBAPP_URL) {
    await bot.telegram
      .callApi('setChatMenuButton', { menu_button: { type: 'web_app', text: '📱 Ilova', web_app: { url: config.WEBAPP_URL } } })
      .catch((e) => console.error('[webapp] menyu tugmasi:', e.message));
    console.log(`[webapp] Mini ilova: ${config.WEBAPP_URL}`);
  } else {
    console.log("[webapp] WEBAPP_URL berilmagan — mini ilova tugmasi ko'rsatilmaydi");
  }

  const stop = async (sig) => {
    console.log(`[bot] ${sig} — to'xtatilmoqda...`);
    try { bot.stop(sig); } catch (e) { /* allaqachon to'xtagan */ }
    server.close();
    await db.destroy().catch(() => {});
    process.exit(0);
  };
  process.once('SIGINT', () => stop('SIGINT'));
  process.once('SIGTERM', () => stop('SIGTERM'));

  await launchWithRetry(bot);
}
