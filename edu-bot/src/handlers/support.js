// 7-bo'lim: Admin bilan bog'lanish
const { Markup } = require('telegraf');
const config = require('../config');
const { BTN, cancelKb } = require('../keyboards');
const { esc, getUser } = require('../utils');
const { showMainMenu } = require('../menu');

function register({ menu, states, deepLinks }) {
  const prompt = async (ctx) => {
    ctx.session.state = 'support';
    const extra = config.ADMIN_USERNAME ? `\n\nYoki to'g'ridan-to'g'ri yozing: @${config.ADMIN_USERNAME}` : '';
    return ctx.reply(`☎️ <b>Admin bilan bog'lanish</b>\n\nSavol yoki taklifingizni yozing (matn, rasm, ovozli xabar) — adminga yetkazamiz.${extra}`, {
      parse_mode: 'HTML',
      ...cancelKb(),
    });
  };
  menu(BTN.SUPPORT, prompt);
  deepLinks.support = prompt;

  states.support = async (ctx) => {
    const u = await getUser(ctx.from.id);
    const head = `📨 <b>Yangi murojaat</b>\n👤 ${esc(u.first_name)} ${esc(u.last_name)}\n📞 ${esc(u.phone)}\n🆔 <code>${u.tg_id}</code>${ctx.from.username ? ` (@${esc(ctx.from.username)})` : ''}`;
    const kb = Markup.inlineKeyboard([[Markup.button.callback('↩️ Javob berish', `adm_reply:${u.tg_id}`)]]);
    let sent = 0;
    for (const adminId of config.ADMIN_IDS) {
      try {
        await ctx.telegram.sendMessage(adminId, head, { parse_mode: 'HTML' });
        await ctx.telegram.copyMessage(adminId, ctx.chat.id, ctx.message.message_id, kb);
        sent += 1;
      } catch (e) {
        console.error('[support] adminga yuborilmadi', adminId, e.message);
      }
    }
    ctx.session.state = null;
    return showMainMenu(ctx, sent ? '✅ Xabaringiz adminga yuborildi. Tez orada javob beramiz.' : "⚠️ Xabarni yuborib bo'lmadi, keyinroq urinib ko'ring.");
  };
}

module.exports = { register };
