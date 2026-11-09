/**
 * Savollarni bittalab kiritish (admin va o'qituvchilar uchun umumiy):
 *   savol matni (yoki rasm + izoh) -> A, B, C... variantlar -> to'g'ri javob -> video yechim (ixtiyoriy)
 * Saqlangach darhol keyingi savol so'raladi; «✅ Tayyor» — tugatish.
 */
const { Markup } = require('telegraf');
const { db } = require('./db');
const { BTN, cancelKb, doneKb, skipKb } = require('./keyboards');
const { esc, now, textOf, isAdmin } = require('./utils');
const { log } = require('./logger');

const L = 'ABCDEF';
const MAX_OPTS = 6;
const onDone = {}; // back -> async (ctx, {type, id, count})

const count = async (type, id) => Number((await db('questions').where({ owner_type: type, owner_id: id }).count({ c: '*' }))[0].c);

async function canEdit(ctx, type, id) {
  if (type === 'tt') {
    const t = await db('teacher_tests').where({ id }).first();
    return !!t && Number(t.teacher_tg) === ctx.from.id;
  }
  return isAdmin(ctx.from.id);
}

async function askBody(ctx, prefix = '') {
  const qw = ctx.session.qw;
  qw.d = { options: [] };
  ctx.session.state = 'qw_body';
  const n = (await count(qw.type, qw.id)) + 1;
  return ctx.reply(
    `${prefix ? `${prefix}\n\n` : ''}❓ <b>${n}-savol</b>\n\nSavol matnini yozing.\n🖼 Rasmli savol bo'lsa — rasmni izohi (caption) bilan yuboring.\n\nSavollar tugagan bo'lsa «${BTN.DONE}» ni bosing.`,
    { parse_mode: 'HTML', ...doneKb() },
  );
}

function startWizard(ctx, { type, id, back }) {
  ctx.session.qw = { type, id, back, d: null };
  return askBody(ctx);
}

async function finish(ctx) {
  const qw = ctx.session.qw;
  ctx.session.state = null;
  ctx.session.qw = null;
  if (!qw) return null;
  const n = await count(qw.type, qw.id);
  return onDone[qw.back](ctx, { type: qw.type, id: qw.id, count: n });
}

const optPrompt = (d) =>
  `${L[d.options.length]} variantini kiriting:` + (d.options.length >= 2 ? `\n(Variantlar yetarli bo'lsa «${BTN.OPT_DONE}»)` : '');
const optKb = (d) => (d.options.length >= 2 ? Markup.keyboard([[BTN.OPT_DONE], [BTN.CANCEL]]).resize() : cancelKb());

const preview = (d) =>
  `${d.photo ? '🖼 ' : ''}${esc(d.body || '(rasmdagi savol)')}\n\n` + d.options.map((o, i) => `<b>${L[i]})</b> ${esc(o)}`).join('\n');

async function askCorrect(ctx) {
  const d = ctx.session.qw.d;
  ctx.session.state = 'qw_correct';
  await ctx.reply('👇 Tekshiring:', cancelKb());
  return ctx.reply(`${preview(d)}\n\n✅ <b>To'g'ri javobni tanlang:</b>`, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([d.options.map((_, i) => Markup.button.callback(L[i], `qwc:${i}`))]),
  });
}

function register({ bot, states }) {
  states.qw_body = async (ctx) => {
    const qw = ctx.session.qw;
    if (!qw) return null;
    if (textOf(ctx) === BTN.DONE) return finish(ctx);
    const m = ctx.message;
    if (m.photo && m.photo.length) {
      qw.d.photo = m.photo[m.photo.length - 1].file_id;
      qw.d.body = (m.caption || '').trim();
    } else if (textOf(ctx)) {
      qw.d.body = textOf(ctx);
    } else {
      return ctx.reply('Savolni matn yoki rasm ko\'rinishida yuboring.');
    }
    if (qw.d.body.length > 800) return ctx.reply("Savol juda uzun (800 belgigacha). Qisqartirib qayta yuboring.");
    ctx.session.state = 'qw_opt';
    return ctx.reply(optPrompt(qw.d), optKb(qw.d));
  };

  states.qw_opt = async (ctx) => {
    const qw = ctx.session.qw;
    if (!qw) return null;
    const t = textOf(ctx);
    if (!t) return ctx.reply('Variantni matn ko\'rinishida yozing.');
    if (t === BTN.OPT_DONE) {
      if (qw.d.options.length < 2) return ctx.reply('Kamida 2 ta variant kerak.');
      return askCorrect(ctx);
    }
    if (t.length > 200) return ctx.reply('Variant juda uzun (200 belgigacha).');
    qw.d.options.push(t);
    if (qw.d.options.length >= MAX_OPTS) return askCorrect(ctx);
    return ctx.reply(optPrompt(qw.d), optKb(qw.d));
  };

  states.qw_correct = (ctx) => ctx.reply("Yuqoridagi tugmalardan to'g'ri javobni tanlang (A, B, C...).");

  bot.action(/^qwc:(\d)$/, async (ctx) => {
    const qw = ctx.session.qw;
    if (!qw || ctx.session.state !== 'qw_correct') return ctx.answerCbQuery('Eskirgan');
    const i = Number(ctx.match[1]);
    if (i >= qw.d.options.length) return ctx.answerCbQuery();
    qw.d.correct = i;
    await ctx.answerCbQuery(`To'g'ri javob: ${L[i]}`);
    await ctx.editMessageText(`${preview(qw.d)}\n\n✅ To'g'ri javob: <b>${L[i]}</b>`, { parse_mode: 'HTML' }).catch(() => {});
    ctx.session.state = 'qw_sol';
    return ctx.reply('🎥 Shu savolning <b>video yechimini</b> yuboring (video fayl yoki havola).\nVideo yechim bo\'lmasa — «⏭ O\'tkazib yuborish».', { parse_mode: 'HTML', ...skipKb() });
  });

  states.qw_sol = async (ctx) => {
    const qw = ctx.session.qw;
    if (!qw) return null;
    const m = ctx.message;
    const t = textOf(ctx);
    let sol = null;
    if (m.video) sol = { sol_type: 'video', sol_ref: m.video.file_id };
    else if (m.document) sol = { sol_type: 'document', sol_ref: m.document.file_id };
    else if (t && /^https?:\/\/\S+$/i.test(t)) sol = { sol_type: 'url', sol_ref: t };
    else if (t !== BTN.SKIP) return ctx.reply('Video, havola yuboring yoki «⏭ O\'tkazib yuborish» ni bosing.');

    if (!(await canEdit(ctx, qw.type, qw.id))) {
      ctx.session.state = null;
      ctx.session.qw = null;
      return ctx.reply('Ruxsat yo\'q.');
    }
    const d = qw.d;
    await db('questions').insert({
      owner_type: qw.type, owner_id: qw.id, body: d.body || '', options: JSON.stringify(d.options), correct: d.correct,
      photo_id: d.photo || null, sol_type: sol ? sol.sol_type : null, sol_ref: sol ? sol.sol_ref : null, created_at: now(),
    });
    const n = await count(qw.type, qw.id);
    log(ctx.from.id, `➕ Savol qo'shdi (${qw.type}#${qw.id}), jami ${n}`);
    return askBody(ctx, `✅ ${n}-savol saqlandi${sol ? ' (video yechim bilan)' : ''}.`);
  };
}

module.exports = { register, startWizard, onDone };
