// 2-bo'lim: Test ishlash (1–4-sinf, maxsus maktablar), variantlar
const { Markup } = require('telegraf');
const { db } = require('../db');
const cats = require('../categories');
const { BTN } = require('../keyboards');
const { esc, money, safeEdit, hasAccess, purchasedIds, purchase, itemLabel, getUser } = require('../utils');
const { startQuiz } = require('../quiz');
const { log } = require('../logger');

const catKb = () => Markup.inlineKeyboard(cats.list('test').map((c) => [Markup.button.callback(c.name, `tc:${c.code}`)]));
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
  rows.push([Markup.button.callback('⬅️ Orqaga', `tc:${v.category}`)]);
  return safeEdit(ctx, text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) });
}

function register({ bot, menu }) {
  menu(BTN.TESTS, (ctx) => ctx.reply(CAT_TEXT, { parse_mode: 'HTML', ...catKb() }));

  bot.action('tc_back', async (ctx) => {
    await ctx.answerCbQuery();
    return safeEdit(ctx, CAT_TEXT, { parse_mode: 'HTML', ...catKb() });
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
