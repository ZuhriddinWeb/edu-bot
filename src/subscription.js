const { Markup } = require('telegraf');
const config = require('./config');
const { isAdmin } = require('./utils');

const cache = new Map(); // userId -> amal qilish muddati
const CACHE_MS = 5 * 60 * 1000;

async function isSubscribed(telegram, userId) {
  if (!config.CHANNEL_ID) return true;
  const until = cache.get(userId);
  if (until && until > Date.now()) return true;
  try {
    const m = await telegram.getChatMember(config.CHANNEL_ID, userId);
    const ok = ['creator', 'administrator', 'member'].includes(m.status) || (m.status === 'restricted' && m.is_member);
    if (ok) cache.set(userId, Date.now() + CACHE_MS);
    return ok;
  } catch (e) {
    console.error(`[obuna] getChatMember xatosi (bot kanalga admin qilinganmi?): ${e.message}`);
    return false;
  }
}

const subscribeKb = () => {
  const rows = [];
  if (config.CHANNEL_URL) rows.push([Markup.button.url("📢 Kanalga o'tish", config.CHANNEL_URL)]);
  rows.push([Markup.button.callback('✅ Obuna bo\'ldim', 'check_sub')]);
  return Markup.inlineKeyboard(rows);
};

module.exports = (bot) => {
  bot.use(async (ctx, next) => {
    if (!ctx.from || isAdmin(ctx.from.id)) return next();

    if (ctx.callbackQuery && ctx.callbackQuery.data === 'check_sub') {
      if (!(await isSubscribed(ctx.telegram, ctx.from.id))) {
        return ctx.answerCbQuery("❌ Siz hali kanalga obuna bo'lmagansiz", { show_alert: true });
      }
      await ctx.answerCbQuery('✅ Rahmat!');
      await ctx.deleteMessage().catch(() => {});
      const { beginRegistration } = require('./handlers/registration');
      const { showMainMenu } = require('./menu');
      if (!(ctx.user && ctx.user.is_registered)) return beginRegistration(ctx);
      if (await require('./handlers/teacher').openPending(ctx)) return null;
      return showMainMenu(ctx);
    }

    if (await isSubscribed(ctx.telegram, ctx.from.id)) return next();

    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    return ctx.reply(
      "👋 Botdan foydalanish va ro'yxatdan o'tish uchun avval kanalimizga obuna bo'ling, so'ng «✅ Obuna bo'ldim» tugmasini bosing.",
      subscribeKb(),
    );
  });
};

module.exports.isSubscribed = isSubscribed;
