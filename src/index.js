const config = require('./config');
const { db, migrate } = require('./db');
const { createBot } = require('./bot');
const logger = require('./logger');
const { startServer } = require('./server');

async function main() {
  if (!config.BOT_TOKEN) {
    console.error("BOT_TOKEN topilmadi. .env faylini to'ldiring (.env.example dan nusxa oling).");
    process.exit(1);
  }
  if (!config.ADMIN_IDS.length) console.warn("⚠️ ADMIN_IDS bo'sh — admin panel hech kimga ko'rinmaydi.");

  await migrate();
  await require('./categories').seed();
  console.log(`[db] ${config.DB_CLIENT} tayyor`);

  const bot = createBot(config.BOT_TOKEN);
  bot.botInfo = await bot.telegram.getMe();
  await bot.telegram.setMyCommands([{ command: 'start', description: 'Asosiy menyu' }]);

  logger.start(bot.telegram);

  // Mini ilova: server + chat pastidagi "menyu" tugmasi
  const server = startServer(bot);
  if (config.WEBAPP_URL) {
    await bot.telegram
      .callApi('setChatMenuButton', { menu_button: { type: 'web_app', text: '📱 Ilova', web_app: { url: config.WEBAPP_URL } } })
      .catch((e) => console.error('[webapp] menyu tugmasi:', e.message));
  } else {
    console.log("[webapp] WEBAPP_URL berilmagan — mini ilova tugmasi ko'rsatilmaydi");
  }

  bot.launch({ dropPendingUpdates: false });
  console.log(`🤖 Bot ishga tushdi: @${bot.botInfo.username}`);

  const stop = async (sig) => {
    bot.stop(sig);
    server.close();
    await db.destroy();
    process.exit(0);
  };
  process.once('SIGINT', () => stop('SIGINT'));
  process.once('SIGTERM', () => stop('SIGTERM'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
