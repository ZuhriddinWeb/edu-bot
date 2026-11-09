// 3-bo'lim: Videodarslar va mavzulashtirilgan testlar
const { Markup } = require('telegraf');
const { db } = require('../db');
const cats = require('../categories');
const { BTN } = require('../keyboards');
const { esc, money, safeEdit, hasAccess, purchasedIds, purchase, itemLabel, getUser } = require('../utils');
const { startQuiz } = require('../quiz');
const { log } = require('../logger');

const grpKb = () => Markup.inlineKeyboard(cats.list('video').map((g) => [Markup.button.callback(g.name, `vg:${g.code}`)]));
const GRP_TEXT = "🎬 <b>Videodarslar va mavzulashtirilgan testlar</b>\n\nBo'limni tanlang:";

async function showGroup(ctx, code) {
  const g = cats.find('video', code);
  if (!g || !g.is_active) return safeEdit(ctx, "Bu bo'lim topilmadi.");
  const list = await db('topics').where({ grp: code, is_active: 1 }).orderBy('id');
  const bought = await purchasedIds(ctx.from.id, 'topic');
  const rows = list.map((t) => [Markup.button.callback(itemLabel(t, bought), `vt:${t.id}`)]);
  rows.push([Markup.button.callback('⬅️ Orqaga', 'vg_back')]);
  const text = list.length ? `🎬 <b>${g.name}</b>\n\nMavzuni tanlang:` : `🎬 <b>${g.name}</b>\n\nHozircha mavzular qo'shilmagan.`;
  return safeEdit(ctx, text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) });
}

async function openTopic(ctx, id) {
  const t = await db('topics').where({ id, is_active: 1 }).first();
  if (!t) return ctx.reply('Mavzu topilmadi.');
  const [{ cnt }] = await db('questions').where({ owner_type: 'topic', owner_id: id }).count({ cnt: '*' });

  if (!(await hasAccess(ctx.from.id, 'topic', t))) {
    const u = await getUser(ctx.from.id);
    const text = `🎬 <b>${esc(t.title)}</b>\n\n${t.description ? esc(t.description) + '\n\n' : ''}` +
      `Ichida: 📺 video dars${Number(cnt) ? ` + 📝 ${cnt} ta savolli takrorlash testi` : ''}\n` +
      `💵 Narxi: ${money(t.price)}\n💰 Balansingiz: ${money(u.balance)}`;
    return safeEdit(ctx, text, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(`💳 Sotib olish — ${money(t.price)}`, `buy:topic:${id}`)],
        [Markup.button.callback('⬅️ Orqaga', `vg:${t.grp}`)],
      ]),
    });
  }

  // 1) Mavzuni tomosha qilish  2) Takrorlash uchun test
  const caption = `🎬 <b>${esc(t.title)}</b>${t.description ? `\n\n${esc(t.description)}` : ''}`.slice(0, 1000);
  const rows = [];
  if (Number(cnt)) rows.push([Markup.button.callback(`📝 Takrorlash uchun test (${cnt} savol${t.time_limit ? `, ${t.time_limit} daq.` : ''})`, `vq:${id}`)]);
  rows.push([Markup.button.callback('⬅️ Mavzular', `vg:${t.grp}`)]);
  const kb = Markup.inlineKeyboard(rows);
  // protect_content: pullik videoni boshqalarga uzatish/saqlashni cheklaydi
  const extra = { caption, parse_mode: 'HTML', protect_content: true, ...kb };
  if (t.video_type === 'video') return ctx.replyWithVideo(t.video_ref, extra);
  if (t.video_type === 'document') return ctx.replyWithDocument(t.video_ref, extra);
  const urlKb = Markup.inlineKeyboard([[Markup.button.url('▶️ Videoni ko\'rish', t.video_ref)], ...rows]);
  return ctx.reply(caption, { parse_mode: 'HTML', ...urlKb });
}

function register({ bot, menu }) {
  menu(BTN.VIDEOS, (ctx) => ctx.reply(GRP_TEXT, { parse_mode: 'HTML', ...grpKb() }));

  bot.action('vg_back', async (ctx) => {
    await ctx.answerCbQuery();
    return safeEdit(ctx, GRP_TEXT, { parse_mode: 'HTML', ...grpKb() });
  });

  bot.action(/^vg:(\w+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return showGroup(ctx, ctx.match[1]);
  });

  bot.action(/^vt:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return openTopic(ctx, Number(ctx.match[1]));
  });

  bot.action(/^buy:topic:(\d+)$/, async (ctx) => {
    const t = await db('topics').where({ id: Number(ctx.match[1]), is_active: 1 }).first();
    if (!t) return ctx.answerCbQuery('Mavzu topilmadi');
    const r = await purchase(ctx.from.id, 'topic', t);
    if (r === 'nofunds') {
      return ctx.answerCbQuery(`Balansda mablag' yetarli emas. Kerak: ${money(t.price)}. «💰 Balans» bo'limidan to'ldiring.`, { show_alert: true });
    }
    if (r === 'ok') log(ctx.from.id, `🛒 Video mavzu sotib oldi: ${esc(t.title)} — ${money(t.price)}`);
    await ctx.answerCbQuery(r === 'ok' ? '✅ Sotib olindi!' : 'Sizda bu mavzu bor');
    await ctx.deleteMessage().catch(() => {});
    return openTopic(ctx, t.id);
  });

  bot.action(/^vq:(\d+)$/, async (ctx) => {
    const t = await db('topics').where({ id: Number(ctx.match[1]), is_active: 1 }).first();
    if (!t) return ctx.answerCbQuery('Mavzu topilmadi');
    if (!(await hasAccess(ctx.from.id, 'topic', t))) return ctx.answerCbQuery('Avval mavzuni sotib oling', { show_alert: true });
    await ctx.answerCbQuery();
    return startQuiz(ctx, 'topic', t.id, `${t.title} — takrorlash testi`, { timeLimit: t.time_limit });
  });
}

module.exports = { register };
