const { Markup } = require('telegraf');
const config = require('./config');
const { isAdmin } = require('./utils');

const cache = new Map(); // userId -> amal qilish muddati
const CACHE_MS = 5 * 60 * 1000;

// Kanal holati — ishga tushganda verifyChannel() tekshiradi
const channel = {
  ok: false, // kanal topildi va bot unda admin — obuna tekshiriladi
  url: '', // "Kanalga o'tish" tugmasi havolasi
  title: '',
  problem: '', // nima noto'g'ri (adminlarga ko'rsatiladi)
};

/**
 * Ishga tushganda kanalni tekshiradi: kanal bormi, bot unda adminmi, havolasi qanday.
 * Kanal noto'g'ri sozlangan bo'lsa obuna tekshiruvi VAQTINCHA O'CHADI (aks holda hech kim
 * botdan foydalana olmaydi) va adminlarga nima qilish kerakligi yoziladi.
 */
async function verifyChannel(telegram, botId) {
  if (!config.CHANNEL_ID) {
    channel.problem = '';
    console.log("[obuna] CHANNEL_ID berilmagan — majburiy obuna o'chiq");
    return channel;
  }
  try {
    const chat = await telegram.getChat(config.CHANNEL_ID);
    channel.title = chat.title || config.CHANNEL_ID;
    const me = await telegram.getChatMember(chat.id, botId);
    if (!['administrator', 'creator'].includes(me.status)) {
      channel.problem = `Bot «${channel.title}» kanalida admin emas. Botni kanalga admin qilib qo'shing.`;
    } else {
      channel.ok = true;
      channel.problem = '';
    }
    // Havola: .env dagi CHANNEL_URL > ochiq kanal username > yopiq kanal taklif havolasi
    const envUrl = (process.env.CHANNEL_URL || '').trim();
    channel.url = '';
    if (envUrl) channel.url = envUrl;
    else if (chat.username) channel.url = `https://t.me/${chat.username}`;
    else if (chat.invite_link) channel.url = chat.invite_link;
    else if (channel.ok) channel.url = await telegram.exportChatInviteLink(chat.id).catch(() => '');
  } catch (e) {
    channel.ok = false;
    channel.problem = `CHANNEL_ID=${config.CHANNEL_ID} kanali topilmadi (${e.message}). .env dagi CHANNEL_ID ni to'g'rilang: ochiq kanal uchun @username, yopiq kanal uchun -100... ID.`;
  }
  if (channel.ok) console.log(`[obuna] ✅ Majburiy obuna kanali: ${channel.title} (${channel.url || 'havola yo\'q'})`);
  else console.error(`[obuna] ⚠️ ${channel.problem}\n[obuna] Obuna tekshiruvi vaqtincha O'CHIRILDI, to'g'rilangach botni qayta ishga tushiring.`);
  return channel;
}

async function isSubscribed(telegram, userId) {
  if (!config.CHANNEL_ID || !channel.ok) return true; // kanal sozlanmagan bo'lsa hech kimni to'xtatmaymiz
  const until = cache.get(userId);
  if (until && until > Date.now()) return true;
  try {
    const m = await telegram.getChatMember(config.CHANNEL_ID, userId);
    const ok = ['creator', 'administrator', 'member'].includes(m.status) || (m.status === 'restricted' && m.is_member);
    if (ok) cache.set(userId, Date.now() + CACHE_MS);
    return ok;
  } catch (e) {
    console.error(`[obuna] getChatMember xatosi: ${e.message}`);
    return true; // Telegram xatosida foydalanuvchini to'xtatmaymiz
  }
}

const subscribeKb = () => {
  const rows = [];
  if (channel.url) rows.push([Markup.button.url("📢 Kanalga o'tish", channel.url)]);
  rows.push([Markup.button.callback("✅ Obuna bo'ldim", 'check_sub')]);
  return Markup.inlineKeyboard(rows);
};

module.exports = (bot) => {
  bot.use(async (ctx, next) => {
    if (!ctx.from) return next();
    // Adminga kanal muammosini bir marta eslatamiz
    if (isAdmin(ctx.from.id)) {
      if (channel.problem && ctx.message && !ctx.session.channelWarned) {
        ctx.session.channelWarned = true;
        await ctx.reply(`⚠️ <b>Majburiy obuna ishlamayapti</b>\n\n${channel.problem}\n\nHozircha foydalanuvchilar obunasiz kiryapti.`, { parse_mode: 'HTML' }).catch(() => {});
      }
      return next();
    }

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

    if (ctx.callbackQuery) return ctx.answerCbQuery("Avval kanalga obuna bo'ling", { show_alert: true }).catch(() => {});
    // Oldingi obuna xabarlari va /start ni o'chirib, bittasini qoldiramiz
    await require('./cleaner').cleanup(ctx);
    return ctx.reply(
      `👋 Botdan foydalanish va ro'yxatdan o'tish uchun avval kanalimizga obuna bo'ling${channel.title ? ` (<b>${channel.title.replace(/[<>&]/g, '')}</b>)` : ''}, so'ng «✅ Obuna bo'ldim» tugmasini bosing.`,
      { parse_mode: 'HTML', ...subscribeKb() },
    );
  });
};

module.exports.isSubscribed = isSubscribed;
module.exports.verifyChannel = verifyChannel;
module.exports.channel = channel;
