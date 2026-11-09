// 2-bo'lim: Test ishlash (1–4-sinf, maxsus maktablar), variantlar
const { Markup } = require('telegraf');
const { db } = require('../db');
const cats = require('../categories');
const { BTN } = require('../keyboards');
const { esc, money, safeEdit, hasAccess, purchasedIds, purchase, itemLabel, getUser } = require('../utils');
const { startQuiz } = require('../quiz');
const { log } = require('../logger');

const catKb = () => Markup.inlineKeyboard([
  ...cats.list('test').map((c) => [Markup.button.callback(c.name, `tc:${c.code}`)]),
  [Markup.button.callback('📄 Testlarning elektron variantlari (PDF)', 'tp_home')],
]);
const pdfItem = (v) => ({ id: v.id, price: v.pdf_price, title: `${v.title} (PDF)` });
const CAT_TEXT = '📝 <b>Test ishlash</b>\n\nBo\'limni tanlang:';

async function showCategory(ctx, code) {
  const cat = cats.find('test', code);
  if (!cat || !cat.is_active) return safeEdit(ctx, "Bu bo'lim topilmadi.");
  const list = await db('variants').where({ category: code, is_active: 1 }).orderBy('id');
  const bought = await purchasedIds(ctx.from.id, 'variant');
  const rows = list.map((v) => [Markup.button.callback(itemLabel(v, bought), `tv:${v.id}`)]);
  rows.push([Markup.button.callback('⬅️ Orqaga', 'tc_back')]);
  const text = list.length
    ? `📝 <b>${cat.name}</b>\n\nVariantni tanlang:`
    : `📝 <b>${cat.name}</b>\n\nHozircha variantlar qo'shilmagan. Tez orada!`;
  return safeEdit(ctx, text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) });
}

async function showVariant(ctx, id) {
  const v = await db('variants').where({ id, is_active: 1 }).first();
  if (!v) return safeEdit(ctx, 'Variant topilmadi.', Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', 'tc_back')]]));
  const cat = cats.find('test', v.category);
  const [{ cnt }] = await db('questions').where({ owner_type: 'variant', owner_id: id }).count({ cnt: '*' });
  const access = await hasAccess(ctx.from.id, 'variant', v);
  const u = await getUser(ctx.from.id);
  let text = `📝 <b>${esc(v.title)}</b>\n📚 ${cat ? cat.name : ''}\n❓ Savollar soni: ${cnt}\n⏱ Vaqt: ${v.time_limit ? `${v.time_limit} daqiqa` : 'cheklanmagan'}\n💵 Narxi: ${v.price ? money(v.price) : 'bepul'}\n\n`;
  const rows = [];
  if (access) {
    text += '✅ Testni boshlashingiz mumkin.';
    rows.push([Markup.button.callback('▶️ Boshlash', `tstart:${id}`)]);
  } else {
    text += `🔒 Testni ishlash uchun uni sotib oling.\n💰 Balansingiz: ${money(u.balance)}`;
    rows.push([Markup.button.callback(`💳 Sotib olish — ${money(v.price)}`, `buy:variant:${id}`)]);
  }
  if (v.pdf_id) {
    const own = await hasAccess(ctx.from.id, 'pdf', pdfItem(v));
    rows.push([Markup.button.callback(own ? '📄 PDF variantini yuklab olish' : `📄 PDF variant — ${v.pdf_price ? money(v.pdf_price) : 'bepul'}`, `tpd:${id}`)]);
  }
  rows.push([Markup.button.callback('⬅️ Orqaga', `tc:${v.category}`)]);
  return safeEdit(ctx, text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) });
}

// ---------- 📄 Elektron variantlar (PDF) ----------
const PDF_TEXT = "📄 <b>Testlarning elektron variantlari</b>\n\nTestlarni PDF ko'rinishida sotib olib, chop etishingiz yoki telefoningizda saqlashingiz mumkin.\n\nBo'limni tanlang:";

async function pdfHome(ctx) {
  const rows = [];
  for (const c of cats.list('test')) {
    const [{ n }] = await db('variants').where({ category: c.code, is_active: 1 }).whereNotNull('pdf_id').count({ n: '*' });
    if (Number(n)) rows.push([Markup.button.callback(`${c.name} (${n})`, `tpc:${c.code}`)]);
  }
  if (!rows.length) rows.push([Markup.button.callback("Hozircha PDF variantlar yo'q", 'tc_back')]);
  rows.push([Markup.button.callback('⬅️ Orqaga', 'tc_back')]);
  return safeEdit(ctx, PDF_TEXT, { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) });
}

async function pdfCategory(ctx, code) {
  const cat = cats.find('test', code);
  const list = await db('variants').where({ category: code, is_active: 1 }).whereNotNull('pdf_id').orderBy('id');
  const bought = await purchasedIds(ctx.from.id, 'pdf');
  const rows = list.map((v) => [Markup.button.callback(
    !v.pdf_price ? `🆓 ${v.title}` : bought.has(v.id) ? `✅ ${v.title}` : `📄 ${v.title} — ${money(v.pdf_price)}`, `tpd:${v.id}`,
  )]);
  rows.push([Markup.button.callback('⬅️ Orqaga', 'tp_home')]);
  return safeEdit(ctx, `📄 <b>${esc(cat ? cat.name : '')}</b> — elektron variantlar:`, { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) });
}

async function pdfDetail(ctx, id) {
  const v = await db('variants').where({ id, is_active: 1 }).first();
  if (!v || !v.pdf_id) return safeEdit(ctx, 'PDF topilmadi.', Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', 'tp_home')]]));
  const own = await hasAccess(ctx.from.id, 'pdf', pdfItem(v));
  const u = await getUser(ctx.from.id);
  const cat = cats.find('test', v.category);
  let text = `📄 <b>${esc(v.title)}</b> — elektron variant (PDF)\n📚 ${esc(cat ? cat.name : '')}\n💵 Narxi: ${v.pdf_price ? money(v.pdf_price) : 'bepul'}\n\n`;
  const rows = [];
  if (own) {
    text += '✅ Sizda bor. Faylni istalgan vaqtda qayta yuklab olishingiz mumkin.';
    rows.push([Markup.button.callback('📥 PDFni yuklab olish', `tpget:${id}`)]);
  } else {
    text += `💰 Balansingiz: ${money(u.balance)}`;
    rows.push([Markup.button.callback(`💳 Sotib olish — ${money(v.pdf_price)}`, `buy:pdf:${id}`)]);
  }
  rows.push([Markup.button.callback('📝 Shu testni onlayn ishlash', `tv:${id}`)]);
  rows.push([Markup.button.callback('⬅️ Orqaga', `tpc:${v.category}`)]);
  return safeEdit(ctx, text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) });
}

// Sotib olingan fayl chatda qoladi (telegram.sendDocument — chat tozalagich o'chirmaydi)
async function sendPdf(ctx, v) {
  return ctx.telegram.sendDocument(ctx.chat.id, v.pdf_id, {
    caption: `📄 <b>${esc(v.title)}</b> — elektron variant`, parse_mode: 'HTML',
  });
}

function register({ bot, menu }) {
  menu(BTN.TESTS, (ctx) => ctx.reply(CAT_TEXT, { parse_mode: 'HTML', ...catKb() }));

  bot.action('tc_back', async (ctx) => {
    await ctx.answerCbQuery();
    return safeEdit(ctx, CAT_TEXT, { parse_mode: 'HTML', ...catKb() });
  });

  bot.action('tp_home', async (ctx) => {
    await ctx.answerCbQuery();
    return pdfHome(ctx);
  });

  bot.action(/^tpc:(\w+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return pdfCategory(ctx, ctx.match[1]);
  });

  bot.action(/^tpd:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return pdfDetail(ctx, Number(ctx.match[1]));
  });

  bot.action(/^buy:pdf:(\d+)$/, async (ctx) => {
    const v = await db('variants').where({ id: Number(ctx.match[1]), is_active: 1 }).first();
    if (!v || !v.pdf_id) return ctx.answerCbQuery('PDF topilmadi');
    const r = await purchase(ctx.from.id, 'pdf', pdfItem(v));
    if (r === 'nofunds') {
      return ctx.answerCbQuery(`Balansda mablag' yetarli emas. Kerak: ${money(v.pdf_price)}. «💰 Balans» bo'limidan to'ldiring.`, { show_alert: true });
    }
    if (r === 'ok') log(ctx.from.id, `🛒 PDF sotib oldi: ${esc(v.title)} — ${money(v.pdf_price)}`);
    await ctx.answerCbQuery(r === 'ok' ? '✅ Sotib olindi!' : 'Sizda bu PDF bor');
    await sendPdf(ctx, v);
    return pdfDetail(ctx, v.id);
  });

  bot.action(/^tpget:(\d+)$/, async (ctx) => {
    const v = await db('variants').where({ id: Number(ctx.match[1]), is_active: 1 }).first();
    if (!v || !v.pdf_id) return ctx.answerCbQuery('PDF topilmadi');
    if (!(await hasAccess(ctx.from.id, 'pdf', pdfItem(v)))) return ctx.answerCbQuery('Avval sotib oling', { show_alert: true });
    await ctx.answerCbQuery('📥 Yuborilmoqda...');
    log(ctx.from.id, `📥 PDF yuklab oldi: ${esc(v.title)}`);
    return sendPdf(ctx, v);
  });

  bot.action(/^tc:(\w+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return showCategory(ctx, ctx.match[1]);
  });

  bot.action(/^tv:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return showVariant(ctx, Number(ctx.match[1]));
  });

  bot.action(/^buy:variant:(\d+)$/, async (ctx) => {
    const v = await db('variants').where({ id: Number(ctx.match[1]), is_active: 1 }).first();
    if (!v) return ctx.answerCbQuery('Variant topilmadi');
    const r = await purchase(ctx.from.id, 'variant', v);
    if (r === 'nofunds') {
      return ctx.answerCbQuery(`Balansda mablag' yetarli emas. Kerak: ${money(v.price)}. «💰 Balans» bo'limidan to'ldiring.`, { show_alert: true });
    }
    if (r === 'ok') log(ctx.from.id, `🛒 Test sotib oldi: ${esc(v.title)} — ${money(v.price)}`);
    await ctx.answerCbQuery(r === 'ok' ? '✅ Sotib olindi!' : 'Sizda bu test bor');
    return showVariant(ctx, v.id);
  });

  bot.action(/^tstart:(\d+)$/, async (ctx) => {
    const v = await db('variants').where({ id: Number(ctx.match[1]), is_active: 1 }).first();
    if (!v) return ctx.answerCbQuery('Variant topilmadi');
    if (!(await hasAccess(ctx.from.id, 'variant', v))) return ctx.answerCbQuery('Avval testni sotib oling', { show_alert: true });
    await ctx.answerCbQuery();
    return startQuiz(ctx, 'variant', v.id, v.title, { timeLimit: v.time_limit });
  });
}

module.exports = { register };
