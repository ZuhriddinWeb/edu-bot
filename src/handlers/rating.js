// 🏆 Reyting: o'quvchilar faolligi bo'yicha
// Ball = har bir testdagi ENG YAXSHI natijadagi to'g'ri javoblar yig'indisi.
// (Bitta testni qayta-qayta yechib ball yig'ib bo'lmaydi.)
// Hisobga olinadi: test variantlari, video mavzu testlari va o'qituvchi testlari.
const { Markup } = require('telegraf');
const { db } = require('../db');
const { BTN } = require('../keyboards');
const { esc, safeEdit } = require('../utils');

const PERIODS = {
  w: { name: 'Shu hafta', since: () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); } },
  m: { name: 'Shu oy', since: () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(1); return d.getTime(); } },
  a: { name: 'Umumiy', since: () => 0 },
};
const TOP = 10;
const MEDALS = ['🥇', '🥈', '🥉'];

// Ism + familiyaning birinchi harfi (masalan: "Ali V.")
const shortName = (u) => `${esc(u.first_name || '')} ${u.last_name ? `${esc(u.last_name[0])}.` : ''}`.trim();

async function leaderboard(since) {
  const best = db('results')
    .select('user_tg')
    .max({ best: 'correct' })
    .where('created_at', '>=', since)
    .groupBy('user_tg', 'owner_type', 'owner_id')
    .as('b');
  const rows = await db
    .from(best)
    .select('user_tg')
    .sum({ pts: 'best' })
    .count({ tests: '*' })
    .groupBy('user_tg')
    .orderBy([{ column: 'pts', order: 'desc' }, { column: 'tests', order: 'desc' }]);
  return rows.map((r) => ({ tg: Number(r.user_tg), pts: Number(r.pts) || 0, tests: Number(r.tests) || 0 })).filter((r) => r.pts > 0);
}

async function render(ctx, key, edit) {
  const p = PERIODS[key] || PERIODS.w;
  const all = await leaderboard(p.since());
  const top = all.slice(0, TOP);
  const users = top.length ? await db('users').whereIn('tg_id', top.map((r) => r.tg)).select('tg_id', 'first_name', 'last_name') : [];
  const byId = new Map(users.map((u) => [Number(u.tg_id), u]));

  let text = `🏆 <b>Reyting — ${p.name}</b>\n<i>Eng faol o'quvchilar (to'g'ri javoblar soni bo'yicha)</i>\n\n`;
  if (!top.length) {
    text += "Hozircha bu davrda hech kim test yechmagan. Birinchi bo'ling! 💪";
  } else {
    text += top.map((r, i) => {
      const u = byId.get(r.tg) || {};
      const me = r.tg === ctx.from.id ? ' 👈' : '';
      return `${MEDALS[i] || `${i + 1}.`} ${shortName(u)} — <b>${r.pts}</b> ball, ${r.tests} ta test${me}`;
    }).join('\n');
  }

  const myIdx = all.findIndex((r) => r.tg === ctx.from.id);
  if (myIdx >= 0) {
    const mine = all[myIdx];
    text += `\n\n📍 Sizning o'rningiz: <b>${myIdx + 1}</b> / ${all.length}\n⭐ Ballingiz: <b>${mine.pts}</b> (${mine.tests} ta test)`;
    if (myIdx > 0) text += `\n⬆️ Keyingi o'ringacha: ${all[myIdx - 1].pts - mine.pts + 1} ball`;
  } else {
    text += "\n\n📍 Siz bu davrda hali test yechmagansiz. «📝 Test ishlash» bo'limidan boshlang!";
  }
  text += "\n\nℹ️ Bitta testni qayta yechsangiz, eng yaxshi natijangiz hisobga olinadi.";

  const kb = Markup.inlineKeyboard([
    Object.entries(PERIODS).map(([k, v]) => Markup.button.callback(k === key ? `• ${v.name} •` : v.name, `rt:${k}`)),
    [Markup.button.callback('🎓 Mening sertifikatlarim', 'cert_my')],
  ]);
  return edit ? safeEdit(ctx, text, { parse_mode: 'HTML', ...kb }) : ctx.reply(text, { parse_mode: 'HTML', ...kb });
}

function register({ bot, menu }) {
  menu(BTN.RATING, (ctx) => render(ctx, 'w', false));
  bot.action(/^rt:([wma])$/, async (ctx) => {
    await ctx.answerCbQuery();
    return render(ctx, ctx.match[1], true);
  });
}

module.exports = { register, leaderboard };
