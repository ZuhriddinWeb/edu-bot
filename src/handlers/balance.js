// 4-bo'lim: Balans, do'stlarni taklif qilish, admin orqali to'ldirish
const { Markup } = require('telegraf');
const { db } = require('../db');
const config = require('../config');
const { BTN, cancelKb } = require('../keyboards');
const { esc, money, getUser, getNum, getSetting, fmtDate, isOn, safeEdit } = require('../utils');
const { log } = require('../logger');
const { showMainMenu } = require('../menu');

const refLink = (ctx) => `https://t.me/${ctx.botInfo.username}?start=ref_${ctx.from.id}`;

const TX_NAMES = { referral: '👥 Taklif bonusi', admin: '💳 Admin', purchase: '🛒 Xarid', book: "📚 Kitob e'loni", center: "🏫 Markaz e'loni", teacher: "👨‍🏫 O'qituvchi testi" };

function register({ bot, menu, states, deepLinks }) {
  const balanceView = async (ctx, edit) => {
    const u = await getUser(ctx.from.id);
    const [{ cnt }] = await db('users').where({ referrer_id: ctx.from.id, is_registered: 1 }).count({ cnt: '*' });
    const bonus = await getNum('referral_bonus');
    const refOn = await isOn('referral');
    const rows = [];
    if (refOn) rows.push([Markup.button.callback("👥 Do'stlarni taklif qilish", 'bal_ref')]);
    if (await isOn('topup')) rows.push([Markup.button.callback("💳 Admin orqali to'ldirish", 'bal_topup')]);
    rows.push([Markup.button.callback('📜 Amallar tarixi', 'bal_hist')]);
    const text = `💰 <b>Balansingiz: ${money(u.balance)}</b>` + (refOn ? `\n\n👥 Taklif qilgan do'stlaringiz: ${cnt} ta\n🎁 Har bir do'st uchun: ${money(bonus)}\n<i>(Bonus do'stingiz kanalga a'zo bo'lib ro'yxatdan o'tgach beriladi)</i>` : '');
    const extra = { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) };
    return edit ? safeEdit(ctx, text, extra) : ctx.reply(text, extra);
  };
  menu(BTN.BALANCE, (ctx) => balanceView(ctx, false));
  bot.action('bal_home', async (ctx) => {
    await ctx.answerCbQuery();
    return balanceView(ctx, true);
  });

  bot.action('bal_ref', async (ctx) => {
    await ctx.answerCbQuery();
    const link = refLink(ctx);
    const bonus = await getNum('referral_bonus');
    const shareText = "Bolalar uchun testlar va videodarslar boti! Qo'shiling:";
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`;
    return safeEdit(ctx,
      `👥 <b>Do'stlarni taklif qiling va balansni to'ldiring!</b>\n\nQuyidagi havolani do'stlaringizga yuboring. Har bir do'stingiz ro'yxatdan o'tganda balansingizga <b>${money(bonus)}</b> qo'shiladi.\n\n🔗 Sizning havolangiz:\n<code>${link}</code>`,
      { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.url('📤 Ulashish', shareUrl)], [Markup.button.callback('⬅️ Balans', 'bal_home')]]) },
    );
  });

  const topupPrompt = async (ctx) => {
    if (!(await isOn('topup'))) return showMainMenu(ctx, "⛔ Bu bo'lim vaqtincha o'chirilgan.");
    ctx.session.state = 'topup_check';
    const info = await getSetting('payment_info');
    const adminLine = config.ADMIN_USERNAME ? `\n\nSavollar bo'lsa: @${config.ADMIN_USERNAME}` : '';
    return ctx.reply(
      `💳 <b>Balansni to'ldirish</b>\n\n${esc(info)}\n\n🆔 Sizning ID: <code>${ctx.from.id}</code>\n\n📸 To'lov chekini (rasm yoki matn) shu yerga yuboring — admin tekshirib balansingizni to'ldiradi.${adminLine}`,
      { parse_mode: 'HTML', ...cancelKb() },
    );
  };
  bot.action('bal_topup', async (ctx) => {
    await ctx.answerCbQuery();
    return topupPrompt(ctx);
  });
  deepLinks.topup = topupPrompt;

  // Foydalanuvchi chek yubordi -> adminlarga
  states.topup_check = async (ctx) => {
    const u = await getUser(ctx.from.id);
    const head = `💳 <b>Balansni to'ldirish so'rovi</b>\n👤 ${esc(u.first_name)} ${esc(u.last_name)}\n📞 ${esc(u.phone)}\n🆔 <code>${u.tg_id}</code>${ctx.from.username ? ` (@${esc(ctx.from.username)})` : ''}\n💰 Hozirgi balans: ${money(u.balance)}`;
    const kb = Markup.inlineKeyboard([[Markup.button.callback("✅ Balansni to'ldirish", `adm_topup:${u.tg_id}`)]]);
    let sent = 0;
    for (const adminId of config.ADMIN_IDS) {
      try {
        await ctx.telegram.copyMessage(adminId, ctx.chat.id, ctx.message.message_id);
        await ctx.telegram.sendMessage(adminId, head, { parse_mode: 'HTML', ...kb });
        sent += 1;
      } catch (e) {
        console.error('[topup] adminga yuborilmadi', adminId, e.message);
      }
    }
    ctx.session.state = null;
    log(ctx.from.id, `💳 To'lov cheki yubordi (adminga ${sent ? 'yetkazildi' : 'yetkazilmadi'})`);
    return showMainMenu(ctx, sent ? "✅ Chekingiz adminga yuborildi. Tekshirilgach balansingiz to'ldiriladi va sizga xabar keladi." : "⚠️ Hozircha adminga yuborib bo'lmadi, keyinroq urinib ko'ring.");
  };

  bot.action('bal_hist', async (ctx) => {
    await ctx.answerCbQuery();
    const rows = await db('transactions').where({ user_tg: ctx.from.id }).orderBy('id', 'desc').limit(15);
    const back = Markup.inlineKeyboard([[Markup.button.callback('⬅️ Balans', 'bal_home')]]);
    if (!rows.length) return safeEdit(ctx, "📜 Hozircha amallar yo'q.", back);
    const lines = rows.map((r) => `${fmtDate(r.created_at)}  ${r.amount > 0 ? '➕' : '➖'} ${money(Math.abs(r.amount))}  ${TX_NAMES[r.type] || r.type}`);
    return safeEdit(ctx, `📜 <b>Oxirgi amallar</b>\n\n${lines.join('\n')}`, { parse_mode: 'HTML', ...back });
  });
}

module.exports = { register };
