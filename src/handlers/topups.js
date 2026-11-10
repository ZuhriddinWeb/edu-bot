/**
 * Balansni to'ldirish so'rovlari.
 * Foydalanuvchi: summa (kamida min_topup) -> chek -> adminga yuboriladi.
 * Admin: ✅ tasdiqlash | ✏️ boshqa summa | ❌ rad etish (6 ta tayyor sabab yoki o'zi yozadi).
 * Har bir so'rov bazada saqlanadi (topups) — bir nechta admin bo'lsa ham faqat bir marta ko'rib chiqiladi,
 * barcha adminlardagi xabar natija bilan yangilanadi.
 */
const { Markup } = require('telegraf');
const { db } = require('../db');
const config = require('../config');
const { BTN, adminKb, cancelKb } = require('../keyboards');
const { esc, money, now, getUser, getNum, getSetting, isOn, isAdmin, addBalance, parseAmount, textOf, fmtDate } = require('../utils');
const { showMainMenu } = require('../menu');
const { log } = require('../logger');

const REASONS = [
  "Chek aniq ko'rinmayapti, o'qib bo'lmaydi",
  "To'lov summasi ko'rsatilgan summaga mos kelmaydi",
  "To'lov hisobimizga tushmagan",
  'Bu chek avval ishlatilgan',
  'Chek soxta yoki tahrirlangan',
  "To'lov summasi minimal summadan kam",
];

async function prompt(ctx) {
  if (!(await isOn('topup'))) return showMainMenu(ctx, "⛔ Bu bo'lim vaqtincha o'chirilgan.");
  const min = await getNum('min_topup');
  const info = await getSetting('payment_info');
  const adminLine = config.ADMIN_USERNAME ? `\n\nSavollar bo'lsa: @${config.ADMIN_USERNAME}` : '';
  ctx.session.state = 'topup_amount';
  ctx.session.form = {};
  const quick = [min, min * 2, min * 5].filter((x) => x > 0).map((x) => String(x));
  return ctx.reply(
    `💳 <b>Balansni to'ldirish</b>\n\n${esc(info)}\n\n` +
    (min ? `❗️ Minimal to'ldirish summasi: <b>${money(min)}</b>\n\n` : '') +
    `<b>1-qadam.</b> Qancha summa to'ldirmoqchisiz? Summani yozing:${adminLine}`,
    { parse_mode: 'HTML', ...Markup.keyboard([...(quick.length ? [quick] : []), [BTN.CANCEL]]).resize() },
  );
}

const statusText = (t) => (t.status === 'approved'
  ? `✅ Tasdiqlandi: +${money(t.amount)}`
  : t.status === 'rejected' ? `❌ Rad etildi: ${esc(t.reason || '')}` : '⏳ Kutilmoqda');

const adminText = (t, u) =>
  `💳 <b>Balansni to'ldirish so'rovi #${t.id}</b>\n👤 ${esc(u.first_name)} ${esc(u.last_name)}${u.username ? ` (@${esc(u.username)})` : ''}\n` +
  `📞 ${esc(u.phone)}\n🆔 <code>${u.tg_id}</code>\n💵 So'ralgan summa: <b>${money(t.amount)}</b>\n💰 Hozirgi balans: ${money(u.balance)}\n📅 ${fmtDate(t.created_at)}` +
  (t.status !== 'pending' ? `\n\n${statusText(t)}${t.admin_tg ? ` (admin ${t.admin_tg})` : ''}` : '');

const pendingKb = (t) => Markup.inlineKeyboard([
  [Markup.button.callback(`✅ Tasdiqlash — ${money(t.amount)}`, `tu_ok:${t.id}`)],
  [Markup.button.callback('✏️ Boshqa summa bilan', `tu_amt:${t.id}`), Markup.button.callback('❌ Rad etish', `tu_rej:${t.id}`)],
]);

// Barcha adminlardagi so'rov xabarini yangilash
async function refreshAdminMessages(telegram, t) {
  const u = await getUser(t.user_tg);
  let msgs = [];
  try { msgs = JSON.parse(t.admin_msgs || '[]'); } catch (e) { msgs = []; }
  for (const [chatId, msgId] of msgs) {
    await telegram.editMessageText(chatId, msgId, undefined, adminText(t, u), {
      parse_mode: 'HTML', ...(t.status === 'pending' ? pendingKb(t) : {}),
    }).catch(() => {});
  }
}

// So'rovni faqat bir marta ko'rib chiqish (atomar): status 'pending' bo'lsagina o'zgaradi
async function decide(id, fields) {
  const n = await db('topups').where({ id, status: 'pending' }).update({ ...fields, decided_at: now() });
  return n > 0;
}

/**
 * To'ldirish so'rovini yaratib, adminlarga yuboradi (bot va mini ilova uchun umumiy).
 * forwardReceipt(adminId) — chekni shu adminga yuboruvchi funksiya.
 */
async function createRequest(telegram, tg, amount, forwardReceipt, receiptId = null) {
  const [id] = await db('topups').insert({ user_tg: tg, amount, status: 'pending', receipt_id: receiptId, created_at: now() });
  const t = await db('topups').where({ id }).first();
  const u = await getUser(tg);
  const msgs = [];
  for (const adminId of config.ADMIN_IDS) {
    try {
      const fwd = await forwardReceipt(adminId);
      // Mini ilovadan kelgan chek: birinchi yuborilgan rasmning file_id sini saqlaymiz (admin panelda ko'rsatish uchun)
      if (!receiptId && fwd && fwd.photo && fwd.photo.length) {
        receiptId = fwd.photo[fwd.photo.length - 1].file_id;
        await db('topups').where({ id }).update({ receipt_id: receiptId });
      }
      const sent = await telegram.sendMessage(adminId, adminText(t, u), { parse_mode: 'HTML', ...pendingKb(t) });
      msgs.push([adminId, sent.message_id]);
    } catch (e) {
      console.error('[topup] adminga yuborilmadi', adminId, e.message);
    }
  }
  await db('topups').where({ id }).update({ admin_msgs: JSON.stringify(msgs) });
  log(tg, `💳 To'ldirish so'rovi #${id}: ${money(amount)} (chek yuborildi)`);
  return { id, sent: msgs.length };
}

/** Tasdiqlash (bot va mini ilova uchun umumiy). Natija: { ok } yoki { error } */
async function approveTopup(telegram, adminTg, id, amount) {
  const t = await db('topups').where({ id }).first();
  if (!t) return { error: "So'rov topilmadi." };
  if (!(await decide(id, { status: 'approved', amount, admin_tg: adminTg }))) {
    return { error: `Bu so'rov allaqachon ko'rib chiqilgan: ${statusText(t)}` };
  }
  await addBalance(t.user_tg, amount, 'admin', `To'ldirish #${id} (admin ${adminTg})`);
  const u = await getUser(t.user_tg);
  log(adminTg, `🛠 To'ldirish #${id} tasdiqlandi: +${money(amount)} → ${t.user_tg}`);
  log(t.user_tg, `💳 Balans to'ldirildi #${id}: +${money(amount)}`);
  telegram.sendMessage(t.user_tg, `✅ Balansingiz to'ldirildi: <b>+${money(amount)}</b>\n💰 Joriy balans: <b>${money(u.balance)}</b>`, { parse_mode: 'HTML' }).catch(() => {});
  await refreshAdminMessages(telegram, await db('topups').where({ id }).first());
  return { ok: true };
}

/** Rad etish (bot va mini ilova uchun umumiy) */
async function rejectTopup(telegram, adminTg, id, reason) {
  const t = await db('topups').where({ id }).first();
  if (!t) return { error: "So'rov topilmadi." };
  if (!(await decide(id, { status: 'rejected', reason: String(reason).slice(0, 500), admin_tg: adminTg }))) {
    return { error: "Bu so'rov allaqachon ko'rib chiqilgan." };
  }
  log(adminTg, `🛠 To'ldirish #${id} rad etildi: ${esc(reason)}`);
  log(t.user_tg, `❌ To'ldirish so'rovi #${id} rad etildi: ${esc(reason)}`);
  telegram.sendMessage(
    t.user_tg,
    `❌ <b>Balansni to'ldirish so'rovingiz rad etildi</b> (#${id}, ${money(t.amount)})\n\n📝 Sabab: ${esc(reason)}\n\nSavollar bo'lsa, «☎️ Admin bilan bog'lanish» orqali yozing yoki qaytadan to'g'ri chek yuboring.`,
    { parse_mode: 'HTML' },
  ).catch(() => {});
  await refreshAdminMessages(telegram, await db('topups').where({ id }).first());
  return { ok: true };
}

function register({ bot, states }) {
  const adminAction = (trigger, fn) => bot.action(trigger, (ctx) => (isAdmin(ctx.from.id) ? fn(ctx) : ctx.answerCbQuery("Ruxsat yo'q")));
  const adminState = (name, fn) => {
    states[name] = (ctx) => (isAdmin(ctx.from.id) ? fn(ctx) : showMainMenu(ctx));
  };

  // ---------- Foydalanuvchi ----------
  states.topup_amount = async (ctx) => {
    const min = await getNum('min_topup');
    const amount = parseAmount(textOf(ctx));
    if (!amount) return ctx.reply("Summani raqamda yozing, masalan: 20000");
    if (amount < min) return ctx.reply(`❗️ Minimal to'ldirish summasi — ${money(min)}. Kattaroq summa yozing:`);
    if (amount > 50000000) return ctx.reply('Juda katta summa. Qayta yozing:');
    ctx.session.form = { amount };
    ctx.session.state = 'topup_check';
    return ctx.reply(
      `💵 Summa: <b>${money(amount)}</b>\n\n<b>2-qadam.</b> Shu summani yuqoridagi kartaga o'tkazing va <b>to'lov chekini</b> (skrinshot yoki rasm) shu yerga yuboring.`,
      { parse_mode: 'HTML', ...cancelKb() },
    );
  };

  states.topup_check = async (ctx) => {
    const m = ctx.message;
    if (!m.photo && !m.document && !textOf(ctx)) return ctx.reply("To'lov chekining rasmini yuboring.");
    const amount = ctx.session.form && ctx.session.form.amount;
    if (!amount) return prompt(ctx);
    const receiptId = m.photo && m.photo.length ? m.photo[m.photo.length - 1].file_id : m.document ? m.document.file_id : null;
    const r = await createRequest(ctx.telegram, ctx.from.id, amount, (adminId) => ctx.telegram.copyMessage(adminId, ctx.chat.id, m.message_id), receiptId);
    ctx.session.state = null;
    ctx.session.form = null;
    return showMainMenu(ctx, r.sent
      ? `✅ So'rovingiz (#${r.id}, ${money(amount)}) adminga yuborildi. Tekshirilgach sizga xabar keladi.`
      : "⚠️ Hozircha adminga yuborib bo'lmadi, keyinroq urinib ko'ring.");
  };

  // ---------- Admin: tasdiqlash ----------
  async function approve(ctx, id, amount) {
    const r = await approveTopup(ctx.telegram, ctx.from.id, id, amount);
    if (r.error) return ctx.reply(r.error, { parse_mode: 'HTML' });
    return null;
  }

  adminAction(/^tu_ok:(\d+)$/, async (ctx) => {
    const t = await db('topups').where({ id: Number(ctx.match[1]) }).first();
    if (!t) return ctx.answerCbQuery('Topilmadi');
    if (t.status !== 'pending') return ctx.answerCbQuery("Allaqachon ko'rib chiqilgan", { show_alert: true });
    await ctx.answerCbQuery('✅ Tasdiqlandi');
    return approve(ctx, t.id, t.amount);
  });

  adminAction(/^tu_amt:(\d+)$/, async (ctx) => {
    const t = await db('topups').where({ id: Number(ctx.match[1]) }).first();
    if (!t || t.status !== 'pending') return ctx.answerCbQuery("Allaqachon ko'rib chiqilgan", { show_alert: true });
    await ctx.answerCbQuery();
    ctx.session.form = { topupId: t.id };
    ctx.session.state = 'adm_topup_amount';
    return ctx.reply(`So'rov #${t.id}: haqiqatda tushgan summani kiriting (so'ralgan: ${money(t.amount)}):`, cancelKb());
  });

  adminState('adm_topup_amount', async (ctx) => {
    const amount = parseAmount(textOf(ctx));
    if (!amount) return ctx.reply('Summani raqamda kiriting:');
    const { topupId } = ctx.session.form || {};
    ctx.session.state = null;
    ctx.session.form = null;
    await approve(ctx, topupId, amount);
    return ctx.reply(`✅ So'rov #${topupId}: ${money(amount)} bilan tasdiqlandi.`, adminKb());
  });

  // ---------- Admin: kutilayotgan so'rovlar ro'yxati ----------
  adminAction('tu_list', async (ctx) => {
    await ctx.answerCbQuery();
    const list = await db('topups').where({ status: 'pending' }).orderBy('id').limit(30);
    if (!list.length) return ctx.reply("✅ Kutilayotgan to'ldirish so'rovlari yo'q.", Markup.inlineKeyboard([[Markup.button.callback('⬅️ Yopish', 'close_msg')]]));
    const rows = [];
    for (const t of list) {
      const u = await getUser(t.user_tg);
      rows.push([Markup.button.callback(`#${t.id} · ${money(t.amount)} · ${u ? u.first_name : t.user_tg}`.slice(0, 60), `tu_show:${t.id}`)]);
    }
    rows.push([Markup.button.callback('⬅️ Yopish', 'close_msg')]);
    return ctx.reply(`⏳ Kutilayotgan so'rovlar: ${list.length} ta`, Markup.inlineKeyboard(rows));
  });

  adminAction(/^tu_show:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const t = await db('topups').where({ id: Number(ctx.match[1]) }).first();
    if (!t) return null;
    const u = await getUser(t.user_tg);
    const sent = await ctx.telegram.sendMessage(ctx.chat.id, adminText(t, u), { parse_mode: 'HTML', ...(t.status === 'pending' ? pendingKb(t) : {}) });
    let msgs = [];
    try { msgs = JSON.parse(t.admin_msgs || '[]'); } catch (e) { msgs = []; }
    msgs.push([ctx.chat.id, sent.message_id]);
    await db('topups').where({ id: t.id }).update({ admin_msgs: JSON.stringify(msgs) });
    return null;
  });

  // ---------- Admin: rad etish ----------
  adminAction(/^tu_rej:(\d+)$/, async (ctx) => {
    const t = await db('topups').where({ id: Number(ctx.match[1]) }).first();
    if (!t || t.status !== 'pending') return ctx.answerCbQuery("Allaqachon ko'rib chiqilgan", { show_alert: true });
    await ctx.answerCbQuery();
    return ctx.editMessageReplyMarkup(Markup.inlineKeyboard([
      ...REASONS.map((r, i) => [Markup.button.callback(`${i + 1}. ${r}`.slice(0, 60), `tu_r:${t.id}:${i}`)]),
      [Markup.button.callback("✏️ Boshqa sabab (o'zim yozaman)", `tu_rc:${t.id}`)],
      [Markup.button.callback('⬅️ Orqaga', `tu_back:${t.id}`)],
    ]).reply_markup).catch(() => {});
  });

  adminAction(/^tu_back:(\d+)$/, async (ctx) => {
    const t = await db('topups').where({ id: Number(ctx.match[1]) }).first();
    await ctx.answerCbQuery();
    if (!t || t.status !== 'pending') return null;
    return ctx.editMessageReplyMarkup(pendingKb(t).reply_markup).catch(() => {});
  });

  async function reject(ctx, id, reason) {
    const r = await rejectTopup(ctx.telegram, ctx.from.id, id, reason);
    if (r.error) return ctx.reply(r.error);
    return null;
  }

  adminAction(/^tu_r:(\d+):(\d)$/, async (ctx) => {
    const id = Number(ctx.match[1]);
    const reason = REASONS[Number(ctx.match[2])];
    if (!reason) return ctx.answerCbQuery();
    const t = await db('topups').where({ id }).first();
    if (!t || t.status !== 'pending') return ctx.answerCbQuery("Allaqachon ko'rib chiqilgan", { show_alert: true });
    await ctx.answerCbQuery('❌ Rad etildi');
    return reject(ctx, id, reason);
  });

  adminAction(/^tu_rc:(\d+)$/, async (ctx) => {
    const t = await db('topups').where({ id: Number(ctx.match[1]) }).first();
    if (!t || t.status !== 'pending') return ctx.answerCbQuery("Allaqachon ko'rib chiqilgan", { show_alert: true });
    await ctx.answerCbQuery();
    ctx.session.form = { topupId: t.id };
    ctx.session.state = 'adm_topup_reason';
    return ctx.reply(`So'rov #${t.id} — rad etish sababini yozing (foydalanuvchiga yuboriladi):`, cancelKb());
  });

  adminState('adm_topup_reason', async (ctx) => {
    const reason = textOf(ctx);
    if (!reason || reason.length < 3) return ctx.reply('Sababni matn shaklida yozing:');
    const { topupId } = ctx.session.form || {};
    ctx.session.state = null;
    ctx.session.form = null;
    await reject(ctx, topupId, reason);
    return ctx.reply(`❌ So'rov #${topupId} rad etildi.`, adminKb());
  });
}

module.exports = { register, prompt, REASONS, createRequest, approveTopup, rejectTopup };
