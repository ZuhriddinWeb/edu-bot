// 4-bo'lim: Balans, do'stlarni taklif qilish, admin orqali to'ldirish
const { Markup } = require('telegraf');
const { db } = require('../db');
const { BTN, cancelKb } = require('../keyboards');
const { money, getUser, getNum, fmtDate, isOn, safeEdit, esc } = require('../utils');
const { showMainMenu } = require('../menu');

const refLink = (ctx) => `https://t.me/${ctx.botInfo.username}?start=ref_${ctx.from.id}`;

const TX_NAMES = { referral: '👥 Taklif bonusi', welcome: '🎁 Start bonusi', admin: '💳 Admin', purchase: '🛒 Xarid', book: "📚 Kitob e'loni", center: "🏫 Markaz e'loni", teacher: "👨‍🏫 O'qituvchi testi" };

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
    rows.push([Markup.button.callback("✏️ Ism-familiyani o'zgartirish", 'pf_name')]);
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

  // ✏️ Ism-familiyani o'zgartirish (30 kunda bir marta)
  bot.action('pf_name', async (ctx) => {
    const profile = require('../profile');
    const u = await getUser(ctx.from.id);
    const next = await profile.nextChangeAt(u);
    if (next) return ctx.answerCbQuery(`Ismni ${fmtDate(next)} dan keyin yana o'zgartirish mumkin.`, { show_alert: true });
    await ctx.answerCbQuery();
    const days = await getNum('name_change_days');
    ctx.session.state = 'pf_first';
    ctx.session.form = {};
    return ctx.reply(
      `✏️ <b>Ism-familiyani o'zgartirish</b>\n\nHozirgi: <b>${esc(profile.fullName(u))}</b>\n\n` +
      (days ? `⚠️ Ismni <b>${days} kunda bir marta</b> o'zgartirish mumkin. Oldin olingan sertifikatlarda eski ism qoladi.\n\n` : '') +
      'Yangi <b>ismingizni</b> kiriting:',
      { parse_mode: 'HTML', ...cancelKb() },
    );
  });
  states.pf_first = async (ctx) => {
    const profile = require('../profile');
    const t = profile.clean(ctx.message && ctx.message.text);
    if (!profile.validName(t)) return ctx.reply("Ismni to'g'ri kiriting (2–50 ta harf):");
    ctx.session.form = { first: t };
    ctx.session.state = 'pf_last';
    return ctx.reply('Endi <b>familiyangizni</b> kiriting:', { parse_mode: 'HTML' });
  };
  states.pf_last = async (ctx) => {
    const profile = require('../profile');
    const t = profile.clean(ctx.message && ctx.message.text);
    if (!profile.validName(t)) return ctx.reply("Familiyani to'g'ri kiriting (2–50 ta harf):");
    const first = ctx.session.form && ctx.session.form.first;
    ctx.session.state = null;
    ctx.session.form = null;
    if (!first) return showMainMenu(ctx);
    const r = await profile.changeName(ctx.from.id, first, t);
    return showMainMenu(ctx, r.ok ? `✅ Ism-familiyangiz o'zgartirildi: <b>${esc(r.name)}</b>` : `⚠️ ${esc(r.error)}`);
  };

  const topupPrompt = (ctx) => require('./topups').prompt(ctx);
  bot.action('bal_topup', async (ctx) => {
    await ctx.answerCbQuery();
    return topupPrompt(ctx);
  });
  deepLinks.topup = topupPrompt;

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
