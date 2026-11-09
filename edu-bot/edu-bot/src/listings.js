// Pullik e'lonlar (kitob, o'quv markaz) uchun umumiy: "Mening e'lonlarim", uzaytirish, o'chirish
const { Markup } = require('telegraf');
const { db } = require('./db');
const { esc, money, fmtDate, now, DAY, getNum, charge, safeEdit, isAdmin } = require('./utils');

/**
 * opts: { table, p (callback prefiksi), priceKey, txType, title(row) }
 */
function registerMine(bot, opts) {
  const { table, p, priceKey, daysKey, txType, title, home } = opts;
  const priceFor = async (ctx) => (isAdmin(ctx.from.id) ? 0 : getNum(priceKey));
  const backHome = [Markup.button.callback('⬅️ Orqaga', home)];

  async function showList(ctx) {
    const rows = await db(table).where({ user_tg: ctx.from.id, is_active: 1 }).orderBy('id', 'desc').limit(30);
    if (!rows.length) return safeEdit(ctx, "🗂 Sizda hali e'lonlar yo'q.", Markup.inlineKeyboard([backHome]));
    const t = now();
    const kb = rows.map((r) => [
      Markup.button.callback(`${r.expires_at > t ? '🟢' : '🔴'} ${title(r)}`.slice(0, 60), `${p}_mine:${r.id}`),
    ]);
    return safeEdit(ctx, "🗂 <b>Mening e'lonlarim</b>\n🟢 faol, 🔴 muddati tugagan", { parse_mode: 'HTML', ...Markup.inlineKeyboard([...kb, backHome]) });
  }

  bot.action(`${p}_my`, async (ctx) => {
    await ctx.answerCbQuery();
    return showList(ctx);
  });

  bot.action(new RegExp(`^${p}_mine:(\\d+)$`), async (ctx) => {
    await ctx.answerCbQuery();
    const r = await db(table).where({ id: Number(ctx.match[1]), user_tg: ctx.from.id, is_active: 1 }).first();
    if (!r) return safeEdit(ctx, "E'lon topilmadi.", Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', `${p}_my`)]]));
    const price = await priceFor(ctx);
    const days = await getNum(daysKey);
    const status = r.expires_at > now() ? `🟢 Faol: ${fmtDate(r.expires_at)} gacha` : `🔴 Muddati tugagan (${fmtDate(r.expires_at)})`;
    return safeEdit(ctx, `<b>${esc(title(r))}</b>\n${status}`, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(`🔄 ${days} kunga uzaytirish — ${money(price)}`, `${p}_ext:${r.id}`)],
        [Markup.button.callback("🗑 O'chirish", `${p}_del:${r.id}`)],
        [Markup.button.callback('⬅️ Orqaga', `${p}_my`)],
      ]),
    });
  });

  bot.action(new RegExp(`^${p}_ext:(\\d+)$`), async (ctx) => {
    const r = await db(table).where({ id: Number(ctx.match[1]), user_tg: ctx.from.id, is_active: 1 }).first();
    if (!r) return ctx.answerCbQuery("E'lon topilmadi");
    const price = await priceFor(ctx);
    const days = await getNum(daysKey);
    const res = await charge(ctx.from.id, price, txType, `Uzaytirish #${r.id}: ${title(r)}`, async (trx) => {
      const base = Math.max(Number(r.expires_at), now());
      await trx(table).where({ id: r.id }).update({ expires_at: base + days * DAY });
    });
    if (res === 'nofunds') return ctx.answerCbQuery(`Balansda mablag' yetarli emas. Kerak: ${money(price)}`, { show_alert: true });
    await ctx.answerCbQuery(`✅ ${days} kunga uzaytirildi`);
    return showList(ctx);
  });

  bot.action(new RegExp(`^${p}_del:(\\d+)$`), async (ctx) => {
    await db(table).where({ id: Number(ctx.match[1]), user_tg: ctx.from.id }).update({ is_active: 0 });
    await ctx.answerCbQuery("🗑 O'chirildi");
    return showList(ctx);
  });
}

module.exports = { registerMine };
