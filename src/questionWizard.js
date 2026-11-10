/**
 * Savollarni bittalab kiritish (admin va o'qituvchilar uchun umumiy).
 * 3 qadam: 1) savol matni yoki rasm  2) javob variantlari  3) to'g'ri javob — savol shu zahoti saqlanadi.
 * «✅ Tayyor» bosilganda butun test uchun BITTA video yechim so'raladi (ixtiyoriy).
 */
const { Markup } = require('telegraf');
const { db } = require('./db');
const { BTN, cancelKb, skipKb } = require('./keyboards');
const { esc, now, textOf, isAdmin, OWNER_TABLE } = require('./utils');
const { log } = require('./logger');

const L = 'ABCDEF';
const MAX_OPTS = 6;
const onDone = {}; // back -> async (ctx, {type, id, count})

const GUIDE =
  "📘 <b>Savol kiritish tartibi</b>\n\n" +
  "Har bir savol <b>3 qadamda</b> kiritiladi, bot har qadamda nima yozishni aytib turadi:\n\n" +
  "<b>1️⃣ Savol matni</b>\nSavolni oddiy xabar qilib yozing.\n<i>Misol:</i> <code>5 + 3 = ?</code>\n" +
  "🖼 Rasmli savol: rasmni yuboring va izohiga (caption) savolni yozing.\n\n" +
  "<b>2️⃣ Javob variantlari</b>\nEng qulayi — hammasini <b>bitta xabarda</b>, har birini yangi qatordan yozing:\n" +
  "<code>7\n8\n9\n10</code>\n" +
  "Bot ularni o'zi A, B, C, D qilib belgilaydi. (Bittalab yuborsangiz ham bo'ladi.) 2 tadan 6 tagacha variant.\n\n" +
  "<b>3️⃣ To'g'ri javob</b>\nChiqqan A, B, C... tugmalardan to'g'risini bosing (yoki harfni yozing) — savol saqlanadi.\n\n" +
  `✅ Keyingi savol so'raladi.\n• Xato kiritsangiz — «${BTN.UNDO}»\n• Hammasi kiritilgach — «${BTN.DONE}»\n\n` +
  "🎥 <b>Video yechim</b> — barcha savollardan keyin, butun test uchun <b>bitta</b> video so'raladi (ixtiyoriy).";

const count = async (type, id) => Number((await db('questions').where({ owner_type: type, owner_id: id }).count({ c: '*' }))[0].c);

async function canEdit(ctx, type, id) {
  if (type === 'tt') {
    const t = await db('teacher_tests').where({ id }).first();
    return !!t && Number(t.teacher_tg) === ctx.from.id;
  }
  return isAdmin(ctx.from.id);
}

const bodyKb = (n) => Markup.keyboard([
  [BTN.DONE],
  ...(n ? [[BTN.UNDO]] : []),
  [BTN.HELP, BTN.CANCEL],
]).resize();

async function askBody(ctx, prefix = '') {
  const qw = ctx.session.qw;
  qw.d = { options: [] };
  ctx.session.state = 'qw_body';
  const saved = await count(qw.type, qw.id);
  return ctx.reply(
    `${prefix ? `${prefix}\n\n` : ''}❓ <b>${saved + 1}-savol</b> · qadam 1/3\n\n✏️ Savol matnini yozing.\n<i>Misol:</i> <code>12 - 5 = ?</code>\n🖼 Rasmli bo'lsa — rasmni izohi bilan yuboring.` +
    (saved ? `\n\nKiritilgan savollar: <b>${saved}</b>. Tugatish — «${BTN.DONE}».` : ''),
    { parse_mode: 'HTML', ...bodyKb(saved) },
  );
}

async function startWizard(ctx, { type, id, back }) {
  ctx.session.qw = { type, id, back, d: null };
  await ctx.reply(GUIDE, { parse_mode: 'HTML' });
  return askBody(ctx);
}

// «Tayyor»: savollar bo'lsa — butun test uchun bitta video yechim so'raymiz
async function askTestSolution(ctx) {
  const qw = ctx.session.qw;
  const n = await count(qw.type, qw.id);
  if (!n) return finish(ctx);
  const owner = await db(OWNER_TABLE[qw.type]).where({ id: qw.id }).first();
  ctx.session.state = 'qw_testsol';
  return ctx.reply(
    `✅ Savollar kiritildi: <b>${n}</b> ta.\n\n🎥 Endi <b>butun test uchun bitta video yechim</b> yuboring (video fayl yoki havola).\n` +
    (owner && owner.sol_ref ? "Hozir video yechim bor — yangisini yuborsangiz almashtiriladi.\n" : '') +
    `Kerak bo'lmasa — «${BTN.SKIP}».`,
    { parse_mode: 'HTML', ...skipKb() },
  );
}

async function finish(ctx) {
  const qw = ctx.session.qw;
  ctx.session.state = null;
  ctx.session.qw = null;
  if (!qw) return null;
  const n = await count(qw.type, qw.id);
  return onDone[qw.back](ctx, { type: qw.type, id: qw.id, count: n });
}

const optPrompt = (d) => {
  if (!d.options.length) {
    return "❓ Qadam 2/3 — <b>javob variantlari</b>\n\nHammasini bitta xabarda, har birini <b>yangi qatordan</b> yozing:\n<code>Samarqand\nToshkent\nBuxoro</code>\n\n(yoki bittalab yuboring — avval A variantini)";
  }
  const list = d.options.map((o, i) => `<b>${L[i]})</b> ${esc(o)}`).join('\n');
  return `${list}\n\n${L[d.options.length]} variantini yozing` + (d.options.length >= 2 ? ` yoki «${BTN.OPT_DONE}» ni bosing.` : '.');
};
const optKb = (d) => (d.options.length >= 2 ? Markup.keyboard([[BTN.OPT_DONE], [BTN.CANCEL]]).resize() : cancelKb());

const preview = (d) =>
  `${d.photo ? '🖼 ' : ''}${esc(d.body || '(rasmdagi savol)')}\n\n` + d.options.map((o, i) => `<b>${L[i]})</b> ${esc(o)}`).join('\n');

async function askCorrect(ctx) {
  const d = ctx.session.qw.d;
  ctx.session.state = 'qw_correct';
  await ctx.reply('❓ Qadam 3/3 — <b>to\'g\'ri javob</b>', { parse_mode: 'HTML', ...cancelKb() });
  return ctx.reply(`${preview(d)}\n\n👇 To'g'ri javobni bosing:`, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([d.options.map((_, i) => Markup.button.callback(L[i], `qwc:${i}`))]),
  });
}

async function setCorrect(ctx, i) {
  const qw = ctx.session.qw;
  qw.d.correct = i;
  if (!(await canEdit(ctx, qw.type, qw.id))) {
    ctx.session.state = null;
    ctx.session.qw = null;
    return ctx.reply("Ruxsat yo'q.");
  }
  const d = qw.d;
  await db('questions').insert({
    owner_type: qw.type, owner_id: qw.id, body: d.body || '', options: JSON.stringify(d.options), correct: d.correct,
    photo_id: d.photo || null, created_at: now(),
  });
  const n = await count(qw.type, qw.id);
  log(ctx.from.id, `➕ Savol qo'shdi (${qw.type}#${qw.id}), jami ${n}`);
  return askBody(ctx, `✅ <b>${n}-savol saqlandi:</b>\n${preview(d)}\nTo'g'ri javob: <b>${L[d.correct]}</b>`);
}

// "A) 7", "a. 7", "1) 7" kabi boshlanishlarni olib tashlash
const stripLabel = (s) => s.replace(/^\s*(?:[a-fA-F]|[1-6])\s*[).:-]\s+/, '').trim();

function register({ bot, states }) {
  states.qw_body = async (ctx) => {
    const qw = ctx.session.qw;
    if (!qw) return null;
    const t = textOf(ctx);
    if (t === BTN.DONE) return askTestSolution(ctx);
    if (t === BTN.HELP) {
      await ctx.reply(GUIDE, { parse_mode: 'HTML' });
      return askBody(ctx);
    }
    if (t === BTN.UNDO) {
      const last = await db('questions').where({ owner_type: qw.type, owner_id: qw.id }).orderBy('id', 'desc').first();
      if (!last || !(await canEdit(ctx, qw.type, qw.id))) return askBody(ctx, "O'chiradigan savol yo'q.");
      await db('questions').where({ id: last.id }).del();
      log(ctx.from.id, `↩️ Oxirgi savolni o'chirdi (${qw.type}#${qw.id})`);
      return askBody(ctx, `↩️ O'chirildi: «${esc((last.body || 'rasmli savol').slice(0, 60))}»`);
    }
    const m = ctx.message;
    if (m.photo && m.photo.length) {
      qw.d.photo = m.photo[m.photo.length - 1].file_id;
      qw.d.body = (m.caption || '').trim();
    } else if (t) {
      qw.d.body = t;
    } else {
      return ctx.reply("Savolni matn yoki rasm ko'rinishida yuboring.");
    }
    if (qw.d.body.length > 800) return ctx.reply('Savol juda uzun (800 belgigacha). Qisqartirib qayta yuboring.');
    ctx.session.state = 'qw_opt';
    return ctx.reply(optPrompt(qw.d), { parse_mode: 'HTML', ...optKb(qw.d) });
  };

  states.qw_opt = async (ctx) => {
    const qw = ctx.session.qw;
    if (!qw) return null;
    const t = textOf(ctx);
    if (!t) return ctx.reply("Variantni matn ko'rinishida yozing.");
    if (t === BTN.OPT_DONE) {
      if (qw.d.options.length < 2) return ctx.reply('Kamida 2 ta variant kerak.');
      return askCorrect(ctx);
    }
    const lines = t.split('\n').map(stripLabel).filter(Boolean);
    if (lines.some((x) => x.length > 200)) return ctx.reply('Variant juda uzun (200 belgigacha).');
    if (qw.d.options.length + lines.length > MAX_OPTS) {
      return ctx.reply(`Ko'pi bilan ${MAX_OPTS} ta variant bo'ladi. Hozir ${qw.d.options.length} ta kiritilgan.`);
    }
    qw.d.options.push(...lines);
    // Bir xabarda 2+ variant yuborilsa — darhol to'g'ri javobni so'raymiz
    if (lines.length >= 2 || qw.d.options.length >= MAX_OPTS) return askCorrect(ctx);
    return ctx.reply(optPrompt(qw.d), { parse_mode: 'HTML', ...optKb(qw.d) });
  };

  // To'g'ri javobni harf bilan yozsa ham qabul qilamiz
  states.qw_correct = async (ctx) => {
    const qw = ctx.session.qw;
    const t = (textOf(ctx) || '').trim().toUpperCase();
    const i = L.indexOf(t);
    if (qw && t.length === 1 && i >= 0 && i < qw.d.options.length) return setCorrect(ctx, i);
    return ctx.reply("Yuqoridagi A, B, C... tugmalardan birini bosing yoki harfni yozing.");
  };

  bot.action(/^qwc:(\d)$/, async (ctx) => {
    const qw = ctx.session.qw;
    if (!qw || ctx.session.state !== 'qw_correct') return ctx.answerCbQuery('Eskirgan');
    const i = Number(ctx.match[1]);
    if (i >= qw.d.options.length) return ctx.answerCbQuery();
    await ctx.answerCbQuery(`To'g'ri javob: ${L[i]}`);
    await ctx.editMessageText(`${preview(qw.d)}\n\n✅ To'g'ri javob: <b>${L[i]}</b>`, { parse_mode: 'HTML' }).catch(() => {});
    return setCorrect(ctx, i);
  });

  // Tayyor testga video yechim qo'shish / almashtirish / o'chirish (admin va o'qituvchi)
  bot.action(/^qws:(variant|topic|tt):(\d+)$/, async (ctx) => {
    const type = ctx.match[1];
    const id = Number(ctx.match[2]);
    if (!(await canEdit(ctx, type, id))) return ctx.answerCbQuery("Ruxsat yo'q", { show_alert: true });
    await ctx.answerCbQuery();
    ctx.session.qw = { type, id, back: type === 'tt' ? 'teacher' : 'admin', d: { options: [] } };
    return askTestSolution(ctx);
  });
  bot.action(/^qwsd:(variant|topic|tt):(\d+)$/, async (ctx) => {
    const type = ctx.match[1];
    const id = Number(ctx.match[2]);
    if (!(await canEdit(ctx, type, id))) return ctx.answerCbQuery("Ruxsat yo'q", { show_alert: true });
    await db(OWNER_TABLE[type]).where({ id }).update({ sol_type: null, sol_ref: null });
    log(ctx.from.id, `🗑 Test video yechimini o'chirdi (${type}#${id})`);
    await ctx.answerCbQuery("Video yechim o'chirildi", { show_alert: true });
    return ctx.editMessageReplyMarkup(undefined).catch(() => {});
  });

  // Butun test uchun bitta video yechim
  states.qw_testsol = async (ctx) => {
    const qw = ctx.session.qw;
    if (!qw) return null;
    const m = ctx.message;
    const t = textOf(ctx);
    let sol = null;
    if (m.video) sol = { sol_type: 'video', sol_ref: m.video.file_id };
    else if (m.document) sol = { sol_type: 'document', sol_ref: m.document.file_id };
    else if (t && /^https?:\/\/\S+$/i.test(t)) sol = { sol_type: 'url', sol_ref: t };
    else if (t !== BTN.SKIP) return ctx.reply(`Video yoki havola yuboring, yoki «${BTN.SKIP}» ni bosing.`);
    if (sol && (await canEdit(ctx, qw.type, qw.id))) {
      await db(OWNER_TABLE[qw.type]).where({ id: qw.id }).update(sol);
      log(ctx.from.id, `🎥 Test video yechimi qo'shildi (${qw.type}#${qw.id})`);
      await ctx.reply('🎥 Video yechim saqlandi. O\'quvchilar uni testni tugatgach ko\'radi.');
    }
    return finish(ctx);
  };

}

module.exports = { register, startWizard, onDone, GUIDE };
