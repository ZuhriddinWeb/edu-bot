// O'qituvchilar uchun: test tuzish -> havola orqali o'quvchilarga yuborish -> natijalarni ko'rish
const crypto = require('crypto');
const { Markup } = require('telegraf');
const { db } = require('../db');
const { BTN, cancelKb } = require('../keyboards');
const { esc, money, now, fmtDate, getNum, getUser, charge, textOf, safeEdit, parseAmount } = require('../utils');
const { startQuiz } = require('../quiz');
const { showMainMenu } = require('../menu');
const wizard = require('../questionWizard');
const { log } = require('../logger');

const timeKb = () => Markup.keyboard([['0', '10', '15'], ['20', '30', '45'], [BTN.CANCEL]]).resize();

const link = (ctx, t) => `https://t.me/${ctx.botInfo.username}?start=tt_${t.code}`;
const qCount = async (id) => Number((await db('questions').where({ owner_type: 'tt', owner_id: id }).count({ c: '*' }))[0].c);
const getTest = (where) => db('teacher_tests').where({ ...where, is_deleted: 0 }).first();

async function newCode() {
  for (;;) {
    const code = crypto.randomBytes(5).toString('hex'); // 10 belgi
    if (!(await db('teacher_tests').where({ code }).first())) return code;
  }
}

function shareKb(ctx, t, extra = []) {
  const url = link(ctx, t);
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`📝 «${t.title}» testini yeching:`)}`;
  return Markup.inlineKeyboard([[Markup.button.url("📤 O'quvchilarga yuborish", shareUrl)], ...extra]);
}

// ---------- O'quvchi tomoni ----------
async function openByCode(ctx, code) {
  const t = await getTest({ code });
  if (!t) return ctx.reply('❌ Test topilmadi yoki o\'chirilgan.');
  if (Number(t.teacher_tg) === ctx.from.id) {
    return ctx.reply(`ℹ️ Bu sizning testingiz: «${esc(t.title)}». Natijalarni «${BTN.TEACHER}» → «📋 Mening testlarim» bo'limida ko'rasiz.`, { parse_mode: 'HTML' });
  }
  const done = await db('results').where({ user_tg: ctx.from.id, owner_type: 'tt', owner_id: t.id }).first();
  if (done) {
    return ctx.reply(`✅ Siz «${esc(t.title)}» testini allaqachon yechgansiz.\nNatijangiz: <b>${done.correct}/${done.total}</b>`, { parse_mode: 'HTML' });
  }
  if (!t.is_open) return ctx.reply(`🔒 «${esc(t.title)}» testi o'qituvchi tomonidan yopilgan.`, { parse_mode: 'HTML' });
  const teacher = await getUser(t.teacher_tg);
  const n = await qCount(t.id);
  return ctx.reply(
    `📝 <b>${esc(t.title)}</b>\n👨‍🏫 O'qituvchi: ${esc(teacher ? `${teacher.first_name} ${teacher.last_name}` : '')}\n❓ Savollar soni: ${n}\n⏱ Vaqt: ${t.time_limit ? `${t.time_limit} daqiqa` : 'cheklanmagan'}\n\n⚠️ Testni faqat <b>bir marta</b> yechish mumkin. Natijangiz o'qituvchiga yuboriladi.`,
    { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('▶️ Boshlash', `tts:${t.id}`)]]) },
  );
}

// /start tt_xxx orqali kelgan bo'lsa, testni ochadi. true — ochildi
async function openPending(ctx) {
  const code = ctx.session && ctx.session.pendingTest;
  if (!code) return false;
  ctx.session.pendingTest = null;
  await openByCode(ctx, code);
  return true;
}

async function notifyTeacher(telegram, studentTg, testId, correct, total) {
  const t = await db('teacher_tests').where({ id: testId }).first();
  if (!t) return;
  const u = await getUser(studentTg);
  const pct = Math.round((correct / total) * 100);
  await telegram.sendMessage(
    t.teacher_tg,
    `📥 <b>Yangi natija</b>\n📝 ${esc(t.title)}\n👤 ${esc(u.first_name)} ${esc(u.last_name)}\n✅ ${correct}/${total} (${pct}%)`,
    { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback("📊 Barcha natijalar", `ttr:${t.id}`)]]) },
  );
}

// ---------- O'qituvchi tomoni ----------
function register({ bot, menu, states, deepLinks }) {
  const homeText = async () => {
    const price = await getNum('teacher_test_price');
    return "👨‍🏫 <b>O'qituvchilar uchun</b>\n\nO'z testingizni tuzing, havolasini o'quvchilaringizga yuboring va natijalarni shu yerda kuzating." +
      (price ? `\n\nℹ️ Test tuzish: ${money(price)}` : '');
  };
  const homeKb = () => Markup.inlineKeyboard([
    [Markup.button.callback('➕ Test tuzish', 'tt_new')],
    [Markup.button.callback('📋 Mening testlarim', 'tt_list')],
  ]);

  const home = async (ctx) => ctx.reply(await homeText(), { parse_mode: 'HTML', ...homeKb() });
  menu(BTN.TEACHER, home);
  deepLinks.teacher = home;

  bot.action('tt_home', async (ctx) => {
    await ctx.answerCbQuery();
    return safeEdit(ctx, await homeText(), { parse_mode: 'HTML', ...homeKb() });
  });

  // O'quvchi testni boshlaydi
  bot.action(/^tts:(\d+)$/, async (ctx) => {
    const t = await getTest({ id: Number(ctx.match[1]) });
    if (!t || !t.is_open) return ctx.answerCbQuery('Test yopilgan yoki topilmadi', { show_alert: true });
    const done = await db('results').where({ user_tg: ctx.from.id, owner_type: 'tt', owner_id: t.id }).first();
    if (done) return ctx.answerCbQuery('Siz bu testni yechgansiz', { show_alert: true });
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(undefined).catch(() => {});
    return startQuiz(ctx, 'tt', t.id, t.title, { reveal: false, timeLimit: t.time_limit });
  });

  // --- Test tuzish ---
  bot.action('tt_new', async (ctx) => {
    await ctx.answerCbQuery();
    const price = await getNum('teacher_test_price');
    const u = await getUser(ctx.from.id);
    if (u.balance < price) {
      return ctx.reply(`⚠️ Test tuzish narxi ${money(price)}. Balansingiz: ${money(u.balance)}.\n«💰 Balans» bo'limidan to'ldiring.`);
    }
    ctx.session.state = 'tch_title';
    return ctx.reply('📝 Test nomini kiriting (masalan: 3-sinf matematika, 1-chorak):', cancelKb());
  });

  states.tch_title = async (ctx) => {
    const title = textOf(ctx);
    if (!title || title.length > 200) return ctx.reply('Test nomini matn shaklida kiriting (200 belgigacha):');
    ctx.session.form = { title };
    ctx.session.state = 'tch_time';
    return ctx.reply('⏱ Test uchun vaqt (daqiqada) kiriting. 0 — vaqt cheklanmagan:', timeKb());
  };

  states.tch_time = async (ctx) => {
    const minutes = parseAmount(textOf(ctx));
    if (minutes == null || minutes > 600) return ctx.reply('Daqiqani raqamda kiriting (0–600):');
    const { title } = ctx.session.form || {};
    if (!title) return showMainMenu(ctx);
    const price = await getNum('teacher_test_price');
    const code = await newCode();
    let id;
    const res = await charge(ctx.from.id, price, 'teacher', `O'qituvchi testi: ${title}`, async (trx) => {
      [id] = await trx('teacher_tests').insert({ teacher_tg: ctx.from.id, code, title, time_limit: minutes, is_open: 1, is_deleted: 0, created_at: now() });
    });
    ctx.session.form = null;
    if (res === 'nofunds') {
      ctx.session.state = null;
      return showMainMenu(ctx, `⚠️ Balansda mablag' yetarli emas. Kerak: ${money(price)}`);
    }
    log(ctx.from.id, `👨‍🏫 Test yaratdi: ${esc(title)} (${minutes} daq.)`);
    await ctx.reply(`✅ «${esc(title)}» testi yaratildi. Endi savollarni bittalab kiriting.`, { parse_mode: 'HTML' });
    return wizard.startWizard(ctx, { type: 'tt', id, back: 'teacher' });
  };

  // Savollar kiritib bo'lingach
  wizard.onDone.teacher = async (ctx, { id, count }) => {
    const t = await getTest({ id, teacher_tg: ctx.from.id });
    if (!t) return showMainMenu(ctx);
    if (!count) return showMainMenu(ctx, `⚠️ «${esc(t.title)}» testida hali savol yo'q. «📋 Mening testlarim» orqali savol qo'shing.`);
    await showMainMenu(ctx, `✅ «${esc(t.title)}» testi tayyor! Savollar: ${count} ta.`);
    return ctx.reply(
      `🔗 Test havolasi:\n<code>${link(ctx, t)}</code>\n\nShu havolani o'quvchilaringizga yuboring. Har bir o'quvchi yechganda natijasi sizga keladi.`,
      { parse_mode: 'HTML', ...shareKb(ctx, t, [[Markup.button.callback('📋 Mening testlarim', 'tt_list')]]) },
    );
  };

  // --- Mening testlarim ---
  bot.action('tt_list', async (ctx) => {
    await ctx.answerCbQuery();
    const list = await db('teacher_tests').where({ teacher_tg: ctx.from.id, is_deleted: 0 }).orderBy('id', 'desc').limit(40);
    if (!list.length) return safeEdit(ctx, "📋 Sizda hali testlar yo'q.", Markup.inlineKeyboard([[Markup.button.callback('➕ Test tuzish', 'tt_new')], [Markup.button.callback('⬅️ Orqaga', 'tt_home')]]));
    const rows = list.map((t) => [Markup.button.callback(`${t.is_open ? '🟢' : '🔒'} ${t.title}`.slice(0, 60), `tti:${t.id}`)]);
    rows.push([Markup.button.callback('⬅️ Orqaga', 'tt_home')]);
    return safeEdit(ctx, '📋 <b>Mening testlarim</b>\n🟢 ochiq, 🔒 yopiq', { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) });
  });

  async function showTest(ctx, id) {
    const t = await getTest({ id, teacher_tg: ctx.from.id });
    if (!t) return safeEdit(ctx, 'Test topilmadi.');
    const n = await qCount(id);
    const solved = Number((await db('results').where({ owner_type: 'tt', owner_id: id }).count({ c: '*' }))[0].c);
    const text = `📝 <b>${esc(t.title)}</b>\n📅 ${fmtDate(t.created_at)}\n⏱ Vaqt: ${t.time_limit ? `${t.time_limit} daqiqa` : 'cheklanmagan'}\n❓ Savollar: ${n}\n👥 Yechganlar: ${solved}\n${t.is_open ? '🟢 Ochiq' : '🔒 Yopiq'}\n\n🔗 <code>${link(ctx, t)}</code>`;
    return safeEdit(ctx, text, {
      parse_mode: 'HTML',
      ...shareKb(ctx, t, [
        [Markup.button.callback('📊 Natijalar', `ttr:${id}`), Markup.button.callback("➕ Savol qo'shish", `ttq:${id}`)],
        [Markup.button.callback(t.is_open ? '🔒 Yopish' : '🟢 Ochish', `ttt:${id}`), Markup.button.callback("🗑 O'chirish", `ttd:${id}`)],
        [Markup.button.callback('⬅️ Testlarim', 'tt_list')],
      ]),
    });
  }

  bot.action(/^tti:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return showTest(ctx, Number(ctx.match[1]));
  });

  bot.action(/^ttr:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const id = Number(ctx.match[1]);
    const t = await getTest({ id, teacher_tg: ctx.from.id });
    if (!t) return ctx.reply('Test topilmadi.', Markup.inlineKeyboard([[Markup.button.callback('⬅️ Testlarim', 'tt_list')]]));
    const rows = await db('results')
      .join('users', 'users.tg_id', 'results.user_tg')
      .where({ 'results.owner_type': 'tt', 'results.owner_id': id })
      .orderBy([{ column: 'results.correct', order: 'desc' }, { column: 'results.id', order: 'asc' }])
      .limit(100)
      .select('users.first_name', 'users.last_name', 'results.correct', 'results.total', 'results.created_at');
    const back = Markup.inlineKeyboard([[Markup.button.callback('⬅️ Testga qaytish', `tti:${id}`)]]);
    if (!rows.length) return safeEdit(ctx, `📊 «${esc(t.title)}» — hali hech kim yechmagan.`, { parse_mode: 'HTML', ...back });
    const avg = Math.round(rows.reduce((s, r) => s + (r.correct / r.total) * 100, 0) / rows.length);
    const lines = rows.map((r, i) => `${i + 1}. ${esc(r.first_name)} ${esc(r.last_name)} — <b>${r.correct}/${r.total}</b> (${Math.round((r.correct / r.total) * 100)}%)`);
    let text = `📊 <b>${esc(t.title)}</b>\n👥 Yechganlar: ${rows.length}\n📈 O'rtacha: ${avg}%\n\n${lines.join('\n')}`;
    if (text.length > 4000) text = `${text.slice(0, 3990)}\n…`;
    return safeEdit(ctx, text, { parse_mode: 'HTML', ...back });
  });

  bot.action(/^ttq:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const t = await getTest({ id: Number(ctx.match[1]), teacher_tg: ctx.from.id });
    if (!t) return null;
    return wizard.startWizard(ctx, { type: 'tt', id: t.id, back: 'teacher' });
  });

  bot.action(/^ttt:(\d+)$/, async (ctx) => {
    const t = await getTest({ id: Number(ctx.match[1]), teacher_tg: ctx.from.id });
    if (!t) return ctx.answerCbQuery('Topilmadi');
    await db('teacher_tests').where({ id: t.id }).update({ is_open: t.is_open ? 0 : 1 });
    await ctx.answerCbQuery(t.is_open ? '🔒 Yopildi' : '🟢 Ochildi');
    return showTest(ctx, t.id);
  });

  bot.action(/^ttd:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const id = ctx.match[1];
    return safeEdit(ctx, "⚠️ Test o'chirilsinmi? Havola ishlamay qoladi.", Markup.inlineKeyboard([
      [Markup.button.callback("Ha, o'chirish", `ttdd:${id}`), Markup.button.callback("Yo'q", `tti:${id}`)],
    ]));
  });

  bot.action(/^ttdd:(\d+)$/, async (ctx) => {
    await db('teacher_tests').where({ id: Number(ctx.match[1]), teacher_tg: ctx.from.id }).update({ is_deleted: 1, is_open: 0 });
    await ctx.answerCbQuery("🗑 O'chirildi");
    return safeEdit(ctx, "🗑 Test o'chirildi.", Markup.inlineKeyboard([[Markup.button.callback('📋 Mening testlarim', 'tt_list')]]));
  });
}

module.exports = { register, openPending, openByCode, notifyTeacher };
