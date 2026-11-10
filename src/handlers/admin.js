// Admin panel: statistika, foydalanuvchilar, test/video qo'shish, kontent, narxlar, bo'limlar, xabar yuborish
const { Markup } = require('telegraf');
const { db } = require('../db');
const { DEFAULT_SETTINGS, SETTING_HELP, FEATURES } = require('../constants');
const cats = require('../categories');
const { BTN, adminKb, cancelKb, skipKb } = require('../keyboards');
const {
  esc, money, now, DAY, fmtDate, isAdmin, getUser, getSetting, getNum, setSetting, isOn, addBalance, parseAmount,
  textOf, safeEdit, sleep, ITEM_TABLE,
} = require('../utils');
const { showMainMenu } = require('../menu');
const wizard = require('../questionWizard');
const { log } = require('../logger');

const L = 'ABCDEF';
const catName = (code) => cats.name('test', code);
const grpName = (code) => cats.name('video', code);
const cnt = async (q) => Number((await q.count({ c: '*' }))[0].c);
const timeKb = () => Markup.keyboard([['0', '10', '15'], ['20', '30', '45'], ['60', '90'], [BTN.CANCEL]]).resize();
const TX_NAMES = { referral: '👥 Taklif', welcome: '🎁 Start bonusi', admin: '💳 Admin', purchase: '🛒 Xarid', book: '📚 Kitob', center: '🏫 Markaz', teacher: "👨‍🏫 O'qituvchi" };

function register({ bot, menu, states }) {
  const adminMenu = (text, fn) => menu(text, (ctx) => (isAdmin(ctx.from.id) ? fn(ctx) : showMainMenu(ctx)));
  const adminAction = (trigger, fn) =>
    bot.action(trigger, (ctx) => (isAdmin(ctx.from.id) ? fn(ctx) : ctx.answerCbQuery("Ruxsat yo'q")));
  const adminState = (name, fn) => {
    states[name] = (ctx) => (isAdmin(ctx.from.id) ? fn(ctx) : showMainMenu(ctx));
  };

  const VERSION = require('../../package.json').version;
  const openPanel = (ctx, text = "🛠 <b>Admin panel</b>") => {
    ctx.session.state = null;
    return ctx.reply(text, { parse_mode: 'HTML', ...adminKb() });
  };

  adminMenu(BTN.ADMIN, (ctx) => openPanel(ctx));
  bot.command('admin', (ctx) => (isAdmin(ctx.from.id) ? openPanel(ctx) : null));
  bot.command('version', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return null;
    const cfg = require('../config');
    const dbInfo = cfg.DB_CLIENT === 'mysql' ? `MySQL (${cfg.MYSQL.host}/${cfg.MYSQL.database})` : `SQLite (${cfg.SQLITE_FILE})${cfg.ON_RAILWAY ? " ⚠️ Railway'da ma'lumotlar o'chadi!" : ''}`;
    const users = await cnt(db('users'));
    return ctx.reply(`🤖 Bot versiyasi: v${VERSION}\n🗄 Baza: ${dbInfo}\n👥 Foydalanuvchilar: ${users}\n📱 Mini ilova: ${cfg.WEBAPP_URL || "sozlanmagan"}\n📁 Papka: ${process.cwd()}`);
  });
  adminMenu(BTN.A_EXIT, (ctx) => showMainMenu(ctx));

  wizard.onDone.admin = (ctx, { count }) => openPanel(ctx, `✅ Saqlandi. Jami savollar: <b>${count}</b>\n\nTahrirlash: «${BTN.A_CONTENT}»`);

  // ================= Statistika =================
  adminMenu(BTN.A_STATS, async (ctx) => {
    const t = now();
    const [users, regs, today, active, blocked, refs, vars, tops, qs, tts, books, centers, buys, tests24] = await Promise.all([
      cnt(db('users')),
      cnt(db('users').where('is_registered', 1)),
      cnt(db('users').where('created_at', '>', t - DAY)),
      cnt(db('users').where('last_seen', '>', t - DAY)),
      cnt(db('users').where('is_blocked', 1)),
      cnt(db('users').whereNotNull('referrer_id').andWhere('is_registered', 1)),
      cnt(db('variants').where('is_active', 1)),
      cnt(db('topics').where('is_active', 1)),
      cnt(db('questions')),
      cnt(db('teacher_tests').where('is_deleted', 0)),
      cnt(db('books').where('is_active', 1).andWhere('expires_at', '>', t)),
      cnt(db('centers').where('is_active', 1).andWhere('expires_at', '>', t)),
      cnt(db('purchases')),
      cnt(db('results').where('created_at', '>', t - DAY)),
    ]);
    const sum = async (q) => Number((await q.sum({ s: 'amount' }))[0].s) || 0;
    const topups = await sum(db('transactions').where('type', 'admin').andWhere('amount', '>', 0));
    const spent = -(await sum(db('transactions').where('amount', '<', 0)));
    const bonus = await sum(db('transactions').where('type', 'referral'));
    const welcome = await sum(db('transactions').where('type', 'welcome'));
    const ads = await cnt(require('../ads').activeQuery());
    const pendingTopups = await cnt(db('topups').where({ status: 'pending' }));
    const certsCount = await cnt(db('certificates'));
    const bal = Number((await db('users').sum({ s: 'balance' }))[0].s) || 0;
    return ctx.reply(
      `📊 <b>Statistika</b>\n\n👥 Foydalanuvchilar: ${users}\n✅ Ro'yxatdan o'tgan: ${regs}\n🆕 Oxirgi 24 soatda qo'shilgan: ${today}\n🟢 Oxirgi 24 soatda faol: ${active}\n🚫 Bloklangan: ${blocked}\n🤝 Taklif orqali kelgan: ${refs}\n\n` +
      `📝 Test variantlari: ${vars}\n🎬 Video mavzular: ${tops}\n👨‍🏫 O'qituvchi testlari: ${tts}\n❓ Jami savollar: ${qs}\n🧮 24 soatda yechilgan testlar: ${tests24}\n🛒 Xaridlar: ${buys}\n\n` +
      `📚 Faol kitob e'lonlari: ${books}\n🏫 Faol markaz/maktab e'lonlari: ${centers}\n📣 Faol reklamalar: ${ads}\n🎓 Berilgan sertifikatlar: ${certsCount}\n\n` +
      `💳 Admin to'ldirgan: ${money(topups)}\n🎁 Taklif bonuslari: ${money(bonus)}\n🎉 Start bonuslari: ${money(welcome)}\n💸 Sarflangan: ${money(spent)}\n💰 Foydalanuvchilar balansi: ${money(bal)}\n⏳ Kutilayotgan to'ldirish so'rovlari: ${pendingTopups}`,
      { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback(`⏳ Kutilayotgan to'lovlar (${pendingTopups})`, 'tu_list')]]) },
    );
  });

  // ================= Foydalanuvchilar =================
  const USERS_TEXT = "👥 <b>Foydalanuvchilar</b>\n\n🔎 Foydalanuvchi ID si, telefon raqami yoki ismini yuboring.\nYoki ro'yxatni tanlang:";
  const usersKb = () => Markup.inlineKeyboard([[Markup.button.callback("🆕 Oxirgi 15 ta", 'au_last')], [Markup.button.callback('🚫 Bloklanganlar', 'au_blocked')]]);
  const BACK_USERS = [Markup.button.callback('⬅️ Foydalanuvchilar', 'au_home')];
  adminMenu(BTN.A_USERS, (ctx) => {
    ctx.session.state = 'adm_user_find';
    return ctx.reply(USERS_TEXT, { parse_mode: 'HTML', ...usersKb() });
  });
  adminAction('au_home', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.state = 'adm_user_find';
    return safeEdit(ctx, USERS_TEXT, { parse_mode: 'HTML', ...usersKb() });
  });

  const userRow = (u) => [Markup.button.callback(`${u.is_blocked ? '🚫 ' : ''}${u.first_name || ''} ${u.last_name || ''} — ${u.phone || u.tg_id}`.slice(0, 60), `au:${u.tg_id}`)];

  adminAction('au_last', async (ctx) => {
    await ctx.answerCbQuery();
    const list = await db('users').where('is_registered', 1).orderBy('id', 'desc').limit(15);
    if (!list.length) return safeEdit(ctx, "Hali foydalanuvchilar yo'q.", Markup.inlineKeyboard([BACK_USERS]));
    return safeEdit(ctx, "🆕 Oxirgi ro'yxatdan o'tganlar:", Markup.inlineKeyboard([...list.map(userRow), BACK_USERS]));
  });

  adminAction('au_blocked', async (ctx) => {
    await ctx.answerCbQuery();
    const list = await db('users').where('is_blocked', 1).orderBy('id', 'desc').limit(30);
    if (!list.length) return safeEdit(ctx, "Bloklangan foydalanuvchilar yo'q.", Markup.inlineKeyboard([BACK_USERS]));
    return safeEdit(ctx, '🚫 Bloklanganlar:', Markup.inlineKeyboard([...list.map(userRow), BACK_USERS]));
  });

  adminState('adm_user_find', async (ctx) => {
    const raw = textOf(ctx);
    if (!raw) return ctx.reply('ID, telefon yoki ism yuboring:');
    const digits = raw.replace(/[\s\-()+]/g, '');
    let list = [];
    if (/^\d{5,15}$/.test(digits)) {
      list = await db('users').where('tg_id', Number(digits)).orWhere('phone', 'like', `%${digits.slice(-9)}`).limit(15);
    } else {
      const like = `%${raw.toLowerCase().replace(/[%_]/g, '')}%`;
      list = await db('users')
        .whereRaw('LOWER(first_name) LIKE ?', [like]).orWhereRaw('LOWER(last_name) LIKE ?', [like]).orWhereRaw('LOWER(username) LIKE ?', [like])
        .limit(15);
    }
    if (!list.length) return ctx.reply('❌ Topilmadi. Qayta kiriting yoki «❌ Bekor qilish».', cancelKb());
    ctx.session.state = null;
    if (list.length === 1) return showUser(ctx, list[0].tg_id, false);
    return ctx.reply(`Topildi: ${list.length} ta`, Markup.inlineKeyboard([...list.map(userRow), BACK_USERS]));
  });

  async function showUser(ctx, tg, edit = true) {
    const u = await getUser(tg);
    if (!u) return ctx.reply('Topilmadi');
    const [refs, results, buys] = await Promise.all([
      cnt(db('users').where({ referrer_id: tg, is_registered: 1 })),
      cnt(db('results').where({ user_tg: tg })),
      cnt(db('purchases').where({ user_tg: tg })),
    ]);
    const text = `👤 <b>${esc(u.first_name || '')} ${esc(u.last_name || '')}</b>${u.username ? ` (@${esc(u.username)})` : ''}\n` +
      `🆔 <code>${u.tg_id}</code>\n📞 ${esc(u.phone || '—')}\n💰 Balans: <b>${money(u.balance)}</b>\n` +
      `📅 Qo'shilgan: ${u.created_at ? fmtDate(u.created_at) : '—'}\n🕒 Oxirgi faollik: ${u.last_seen ? fmtDate(u.last_seen) : '—'}\n` +
      `🧮 Yechgan testlari: ${results}\n🛒 Xaridlari: ${buys}\n👥 Taklif qilganlari: ${refs}\n` +
      `${u.is_registered ? '' : "⚠️ Ro'yxatdan o'tmagan\n"}${u.is_blocked ? '🚫 <b>BLOKLANGAN</b>' : '✅ Faol'}`;
    const kb = Markup.inlineKeyboard([
      [Markup.button.callback("💳 Balansni o'zgartirish", `au_bal:${tg}`), Markup.button.callback('📨 Xabar yozish', `adm_reply:${tg}`)],
      [Markup.button.callback('📜 Amallar tarixi', `au_tx:${tg}`), Markup.button.callback('🧮 Natijalari', `au_res:${tg}`)],
      [Markup.button.callback(u.is_blocked ? '✅ Blokdan chiqarish' : '🚫 Bloklash', `au_blk:${tg}`)],
      BACK_USERS,
    ]);
    return edit ? safeEdit(ctx, text, { parse_mode: 'HTML', ...kb }) : ctx.reply(text, { parse_mode: 'HTML', ...kb });
  }

  adminAction(/^au:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return showUser(ctx, Number(ctx.match[1]), true);
  });

  adminAction(/^au_blk:(\d+)$/, async (ctx) => {
    const tg = Number(ctx.match[1]);
    const u = await getUser(tg);
    if (!u) return ctx.answerCbQuery('Topilmadi');
    if (isAdmin(tg)) return ctx.answerCbQuery('Adminni bloklab bo\'lmaydi', { show_alert: true });
    await db('users').where({ tg_id: tg }).update({ is_blocked: u.is_blocked ? 0 : 1 });
    log(ctx.from.id, `🛠 ${u.is_blocked ? 'Blokdan chiqardi' : 'Blokladi'}: ${tg}`);
    ctx.telegram.sendMessage(tg, u.is_blocked ? '✅ Hisobingiz blokdan chiqarildi. /start' : "🚫 Hisobingiz admin tomonidan bloklandi.").catch(() => {});
    await ctx.answerCbQuery(u.is_blocked ? '✅ Blokdan chiqarildi' : '🚫 Bloklandi');
    return showUser(ctx, tg);
  });

  adminAction(/^au_tx:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const rows = await db('transactions').where({ user_tg: Number(ctx.match[1]) }).orderBy('id', 'desc').limit(25);
    const back = Markup.inlineKeyboard([[Markup.button.callback('⬅️ Foydalanuvchiga qaytish', `au:${ctx.match[1]}`)]]);
    if (!rows.length) return safeEdit(ctx, "Amallar yo'q.", back);
    return safeEdit(ctx, `📜 <b>Amallar tarixi</b>\n\n${rows.map((r) => `${fmtDate(r.created_at)} ${r.amount > 0 ? '➕' : '➖'}${money(Math.abs(r.amount))} ${TX_NAMES[r.type] || r.type} ${esc(r.note || '')}`).join('\n')}`.slice(0, 4000), { parse_mode: 'HTML', ...back });
  });

  adminAction(/^au_res:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const rows = await db('results').where({ user_tg: Number(ctx.match[1]) }).orderBy('id', 'desc').limit(25);
    const back = Markup.inlineKeyboard([[Markup.button.callback('⬅️ Foydalanuvchiga qaytish', `au:${ctx.match[1]}`)]]);
    if (!rows.length) return safeEdit(ctx, 'Hali test yechmagan.', back);
    const names = {};
    for (const r of rows) {
      const k = `${r.owner_type}:${r.owner_id}`;
      if (!names[k]) {
        const table = r.owner_type === 'tt' ? 'teacher_tests' : ITEM_TABLE[r.owner_type];
        const it = await db(table).where({ id: r.owner_id }).first();
        names[k] = it ? it.title : "(o'chirilgan)";
      }
    }
    return safeEdit(ctx, `🧮 <b>Test natijalari</b>\n\n${rows.map((r) => `${fmtDate(r.created_at)} ${esc(names[`${r.owner_type}:${r.owner_id}`])} — <b>${r.correct}/${r.total}</b>`).join('\n')}`.slice(0, 4000), { parse_mode: 'HTML', ...back });
  });

  // --- Balans ---
  async function askAmount(ctx, u) {
    ctx.session.form = { target: u.tg_id };
    ctx.session.state = 'adm_bal_amount';
    return ctx.reply(
      `👤 ${esc(u.first_name)} ${esc(u.last_name)}\n📞 ${esc(u.phone)}\n🆔 <code>${u.tg_id}</code>\n💰 Balans: ${money(u.balance)}\n\nQo'shiladigan summani kiriting (ayirish uchun minus bilan, masalan -5000):`,
      { parse_mode: 'HTML', ...cancelKb() },
    );
  }

  adminAction(/^(?:adm_topup|au_bal):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const u = await getUser(Number(ctx.match[1]));
    if (!u) return ctx.reply('Foydalanuvchi topilmadi');
    return askAmount(ctx, u);
  });

  adminState('adm_bal_amount', async (ctx) => {
    const amount = parseAmount(textOf(ctx), { allowNegative: true });
    if (!amount) return ctx.reply('Summani raqamda kiriting (masalan 20000):');
    const target = ctx.session.form && ctx.session.form.target;
    await addBalance(target, amount, 'admin', `Admin ${ctx.from.id}`);
    const u = await getUser(target);
    log(ctx.from.id, `🛠 Balans: ${target} ga ${amount > 0 ? '+' : ''}${money(amount)}`);
    log(target, `💳 Admin balansni o'zgartirdi: ${amount > 0 ? '+' : ''}${money(amount)}`);
    ctx.telegram
      .sendMessage(target, `${amount > 0 ? "✅ Balansingiz to'ldirildi" : 'ℹ️ Balansingizdan yechildi'}: <b>${money(Math.abs(amount))}</b>\n💰 Joriy balans: <b>${money(u.balance)}</b>`, { parse_mode: 'HTML' })
      .catch(() => {});
    ctx.session.form = null;
    return openPanel(ctx, `✅ Bajarildi. ${esc(u.first_name)} balansi: <b>${money(u.balance)}</b>`);
  });

  // --- Foydalanuvchiga yozish / murojaatga javob ---
  adminAction(/^adm_reply:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.form = { target: Number(ctx.match[1]) };
    ctx.session.state = 'adm_reply';
    return ctx.reply('Xabaringizni yozing (matn, rasm, fayl...):', cancelKb());
  });

  adminState('adm_reply', async (ctx) => {
    const target = ctx.session.form && ctx.session.form.target;
    try {
      await ctx.telegram.sendMessage(target, '📩 <b>Admin xabari:</b>', { parse_mode: 'HTML' });
      await ctx.telegram.copyMessage(target, ctx.chat.id, ctx.message.message_id);
      return openPanel(ctx, '✅ Yuborildi.');
    } catch (e) {
      return openPanel(ctx, `❌ Yuborilmadi: ${esc(e.message)}`);
    }
  });

  // ================= Test varianti qo'shish =================
  adminMenu(BTN.A_TEST, (ctx) =>
    ctx.reply("Qaysi bo'limga test varianti qo'shasiz?", Markup.inlineKeyboard(cats.list('test', true).map((c) => [Markup.button.callback(`${c.is_active ? '' : '🙈 '}${c.name}`, `at_c:${c.code}`)]))),
  );

  adminAction(/^at_c:(\w+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.form = { category: ctx.match[1] };
    ctx.session.state = 'adm_test_title';
    await safeEdit(ctx, `📚 ${catName(ctx.match[1])}`);
    return ctx.reply('Variant nomini kiriting (masalan: 1-variant):', cancelKb());
  });

  adminState('adm_test_title', async (ctx) => {
    const t = textOf(ctx);
    if (!t) return ctx.reply('Nomini kiriting:');
    ctx.session.form.title = t.slice(0, 200);
    ctx.session.state = 'adm_test_price';
    const def = await getNum('default_test_price');
    return ctx.reply("💵 Narxini kiriting (so'm). 0 — bepul.", Markup.keyboard([[String(def)], ['0'], [BTN.CANCEL]]).resize());
  });

  adminState('adm_test_price', async (ctx) => {
    const price = parseAmount(textOf(ctx));
    if (price == null) return ctx.reply('Narxni raqamda kiriting:');
    ctx.session.form.price = price;
    ctx.session.state = 'adm_test_time';
    return ctx.reply('⏱ Test uchun vaqt (daqiqada). 0 — cheklanmagan:', timeKb());
  });

  adminState('adm_test_time', async (ctx) => {
    const minutes = parseAmount(textOf(ctx));
    if (minutes == null || minutes > 600) return ctx.reply('Daqiqani raqamda kiriting (0–600):');
    ctx.session.form.time_limit = minutes;
    ctx.session.state = 'adm_test_pdf';
    return ctx.reply(
      "📄 Shu testning <b>elektron variantini (PDF)</b> yuboring — foydalanuvchilar uni alohida sotib olishadi.\nPDF bo'lmasa — «⏭ O'tkazib yuborish» (keyin «🗂 Kontent» dan qo'shsa ham bo'ladi).",
      { parse_mode: 'HTML', ...skipKb() },
    );
  });

  // PDF faylni xabardan olish
  const readPdf = (ctx) => {
    const d = ctx.message && ctx.message.document;
    if (!d) return null;
    if (d.mime_type !== 'application/pdf' && !/\.pdf$/i.test(d.file_name || '')) return false;
    return { pdf_id: d.file_id, pdf_name: (d.file_name || 'test.pdf').slice(0, 250) };
  };

  adminState('adm_test_pdf', async (ctx) => {
    if (textOf(ctx) === BTN.SKIP) return createVariant(ctx);
    const pdf = readPdf(ctx);
    if (pdf === false) return ctx.reply('Bu PDF emas. PDF fayl yuboring yoki «⏭ O\'tkazib yuborish».');
    if (!pdf) return ctx.reply('PDF faylni yuboring yoki «⏭ O\'tkazib yuborish».');
    Object.assign(ctx.session.form, pdf);
    ctx.session.state = 'adm_test_pdfprice';
    const def = await getNum('default_pdf_price');
    return ctx.reply("💵 PDF narxini kiriting (so'm). 0 — bepul.", Markup.keyboard([[String(def)], ['0'], [BTN.CANCEL]]).resize());
  });

  adminState('adm_test_pdfprice', async (ctx) => {
    const price = parseAmount(textOf(ctx));
    if (price == null) return ctx.reply('Narxni raqamda kiriting:');
    ctx.session.form.pdf_price = price;
    return createVariant(ctx);
  });

  async function createVariant(ctx) {
    const f = ctx.session.form;
    const [id] = await db('variants').insert({
      category: f.category, title: f.title, price: f.price, time_limit: f.time_limit, is_active: 1, created_at: now(),
      pdf_id: f.pdf_id || null, pdf_name: f.pdf_name || null, pdf_price: f.pdf_price || 0,
    });
    ctx.session.form = null;
    log(ctx.from.id, `🛠 Test varianti yaratdi: ${esc(f.title)}${f.pdf_id ? ' (+PDF)' : ''}`);
    await ctx.reply(
      `✅ Variant yaratildi: <b>${esc(f.title)}</b> (${catName(f.category)})\n💵 ${money(f.price)} | ⏱ ${f.time_limit ? `${f.time_limit} daqiqa` : 'cheklanmagan'}` +
      `${f.pdf_id ? `\n📄 PDF: ${money(f.pdf_price || 0)}` : ''}\n\nEndi savollarni bittalab kiriting.`,
      { parse_mode: 'HTML' },
    );
    return wizard.startWizard(ctx, { type: 'variant', id, back: 'admin' });
  }

  // ================= Video mavzu qo'shish =================
  adminMenu(BTN.A_VIDEO, (ctx) =>
    ctx.reply("Qaysi bo'limga video mavzu qo'shasiz?", Markup.inlineKeyboard(cats.list('video', true).map((g) => [Markup.button.callback(`${g.is_active ? '' : '🙈 '}${g.name}`, `av_g:${g.code}`)]))),
  );

  adminAction(/^av_g:(\w+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.form = { grp: ctx.match[1] };
    ctx.session.state = 'adm_vid_title';
    await safeEdit(ctx, `🎬 ${grpName(ctx.match[1])}`);
    return ctx.reply('Mavzu nomini kiriting:', cancelKb());
  });

  adminState('adm_vid_title', async (ctx) => {
    const t = textOf(ctx);
    if (!t) return ctx.reply('Nomini kiriting:');
    ctx.session.form.title = t.slice(0, 200);
    ctx.session.state = 'adm_vid_desc';
    return ctx.reply('Qisqacha tavsif:', skipKb());
  });

  adminState('adm_vid_desc', async (ctx) => {
    const t = textOf(ctx);
    if (!t) return ctx.reply('Tavsifni matn shaklida yozing:');
    ctx.session.form.description = t === BTN.SKIP ? null : t.slice(0, 800);
    ctx.session.state = 'adm_vid_price';
    const def = await getNum('default_video_price');
    return ctx.reply("💵 Narxini kiriting (so'm). 0 — bepul.", Markup.keyboard([[String(def)], ['0'], [BTN.CANCEL]]).resize());
  });

  adminState('adm_vid_price', async (ctx) => {
    const price = parseAmount(textOf(ctx));
    if (price == null) return ctx.reply('Narxni raqamda kiriting:');
    ctx.session.form.price = price;
    ctx.session.state = 'adm_vid_time';
    return ctx.reply('⏱ Takrorlash testi uchun vaqt (daqiqada). 0 — cheklanmagan:', timeKb());
  });

  adminState('adm_vid_time', async (ctx) => {
    const minutes = parseAmount(textOf(ctx));
    if (minutes == null || minutes > 600) return ctx.reply('Daqiqani raqamda kiriting (0–600):');
    ctx.session.form.time_limit = minutes;
    ctx.session.state = 'adm_vid_file';
    return ctx.reply('🎥 Mavzu videosini yuboring (video fayl) yoki havola (YouTube va h.k.):', cancelKb());
  });

  const readVideo = (ctx) => {
    const m = ctx.message;
    const t = textOf(ctx);
    if (m.video) return { video_type: 'video', video_ref: m.video.file_id };
    if (m.document) return { video_type: 'document', video_ref: m.document.file_id };
    if (t && /^https?:\/\/\S+$/i.test(t)) return { video_type: 'url', video_ref: t };
    return null;
  };

  adminState('adm_vid_file', async (ctx) => {
    const v = readVideo(ctx);
    if (!v) return ctx.reply('Video fayl yoki https:// havola yuboring:');
    const f = { ...ctx.session.form, ...v };
    const [id] = await db('topics').insert({
      grp: f.grp, title: f.title, description: f.description, video_type: f.video_type, video_ref: f.video_ref,
      price: f.price, time_limit: f.time_limit, is_active: 1, created_at: now(),
    });
    ctx.session.form = null;
    log(ctx.from.id, `🛠 Video mavzu yaratdi: ${esc(f.title)}`);
    await ctx.reply(`✅ Mavzu yaratildi: <b>${esc(f.title)}</b> (${grpName(f.grp)})\n\nEndi mavzu orqasidan keladigan <b>takrorlash testi</b> savollarini bittalab kiriting.`, { parse_mode: 'HTML' });
    return wizard.startWizard(ctx, { type: 'topic', id, back: 'admin' });
  });

  // ================= Kontent boshqaruvi =================
  const contentKb = () => Markup.inlineKeyboard([
    [Markup.button.callback('📝 Test variantlari', 'ac_l:variant')],
    [Markup.button.callback('🎬 Video mavzular', 'ac_l:topic')],
  ]);
  adminMenu(BTN.A_CONTENT, (ctx) => ctx.reply('🗂 Kontent', contentKb()));
  adminAction('ac_home', async (ctx) => {
    await ctx.answerCbQuery();
    return safeEdit(ctx, '🗂 Kontent', contentKb());
  });
  const BACK_CONTENT = [Markup.button.callback('⬅️ Kontent', 'ac_home')];

  const itemGroup = (type, it) => (type === 'variant' ? catName(it.category) : grpName(it.grp));

  adminAction(/^ac_l:(variant|topic)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const type = ctx.match[1];
    const col = type === 'variant' ? 'category' : 'grp';
    const pos = new Map(cats.list(type === 'variant' ? 'test' : 'video', true).map((c, i) => [c.code, i]));
    const items = (await db(ITEM_TABLE[type]).orderBy('id').limit(150))
      .sort((a, b) => (pos.get(a[col]) ?? 999) - (pos.get(b[col]) ?? 999) || a.id - b.id);
    if (!items.length) return safeEdit(ctx, "Hali hech narsa qo'shilmagan.", Markup.inlineKeyboard([BACK_CONTENT]));
    const rows = items.map((it) => [Markup.button.callback(`${it.is_active ? '' : '🙈 '}[${itemGroup(type, it)}] ${it.title}`.slice(0, 60), `ac_i:${type}:${it.id}`)]);
    rows.push(BACK_CONTENT);
    return safeEdit(ctx, type === 'variant' ? '📝 Test variantlari:' : '🎬 Video mavzular:', Markup.inlineKeyboard(rows));
  });

  async function showItem(ctx, type, id, edit = true) {
    const it = await db(ITEM_TABLE[type]).where({ id }).first();
    if (!it) return safeEdit(ctx, "Topilmadi (o'chirilgan bo'lishi mumkin).", Markup.inlineKeyboard([[Markup.button.callback("⬅️ Ro'yxat", `ac_l:${type}`)]]));
    const q = await cnt(db('questions').where({ owner_type: type, owner_id: id }));

    const b = await cnt(db('purchases').where({ item_type: type, item_id: id }));
    const solved = await cnt(db('results').where({ owner_type: type, owner_id: id }));
    const pdfBuys = type === 'variant' ? await cnt(db('purchases').where({ item_type: 'pdf', item_id: id })) : 0;
    const pdfLine = type !== 'variant' ? '' : it.pdf_id ? `\n📄 PDF: ${money(it.pdf_price)} · sotilgan: ${pdfBuys} marta` : "\n📄 PDF: yo'q";
    const text = `<b>${esc(it.title)}</b>\n📂 ${itemGroup(type, it)}\n💵 Narxi: ${money(it.price)}\n⏱ Vaqt: ${it.time_limit ? `${it.time_limit} daqiqa` : 'cheklanmagan'}\n` +
      `❓ Savollar: ${q}\n🎥 Video yechim: ${it.sol_ref ? 'bor ✅' : "yo'q"}\n🛒 Sotib olingan: ${b} marta\n🧮 Yechilgan: ${solved} marta${pdfLine}\n👁 Holati: ${it.is_active ? "ko'rinadi" : 'yashirin'}`;
    const rows = [
      [Markup.button.callback("➕ Savol qo'shish", `ac_q:${type}:${id}`), Markup.button.callback('📋 Savollar', `ac_ql:${type}:${id}`)],
      [Markup.button.callback('💵 Narx', `ac_p:${type}:${id}`), Markup.button.callback('⏱ Vaqt', `ac_tm:${type}:${id}`)],
      [Markup.button.callback(it.is_active ? "🙈 Yashirish" : "👁 Ko'rsatish", `ac_t:${type}:${id}`), Markup.button.callback("🗑 O'chirish", `ac_d:${type}:${id}`)],
    ];
    rows.splice(2, 0, [Markup.button.callback("📂 Bo'limini o'zgartirish", `ac_mv:${type}:${id}`)]);
    rows.splice(1, 0, it.sol_ref
      ? [Markup.button.callback('🎥 Yechimni almashtirish', `qws:${type}:${id}`), Markup.button.callback("▶️ Ko'rish", `sol:${type}:${id}`), Markup.button.callback('🗑 Yechim', `qwsd:${type}:${id}`)]
      : [Markup.button.callback("🎥 Video yechim qo'shish (butun test uchun)", `qws:${type}:${id}`)]);
    if (type === 'variant') {
      rows.splice(2, 0, it.pdf_id
        ? [Markup.button.callback('📄 PDFni almashtirish', `ac_pdf:${id}`), Markup.button.callback('📄 PDF narxi', `ac_pp:${id}`), Markup.button.callback('🗑 PDF', `ac_pdel:${id}`)]
        : [Markup.button.callback('📄 PDF (elektron variant) yuklash', `ac_pdf:${id}`)]);
    }
    if (type === 'topic') rows.splice(2, 0, [Markup.button.callback("🎥 Videoni almashtirish", `ac_v:${id}`), Markup.button.callback("▶️ Videoni ko'rish", `vt:${id}`)]);
    rows.push([Markup.button.callback("⬅️ Ro'yxat", `ac_l:${type}`)]);
    const extra = { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) };
    return edit ? safeEdit(ctx, text, extra) : ctx.reply(text, extra);
  }

  adminAction(/^ac_i:(variant|topic):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return showItem(ctx, ctx.match[1], Number(ctx.match[2]));
  });

  adminAction(/^ac_q:(variant|topic):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return wizard.startWizard(ctx, { type: ctx.match[1], id: Number(ctx.match[2]), back: 'admin' });
  });

  // Savollar ro'yxati, bittalab o'chirish
  async function showQuestions(ctx, type, id) {
    const qs = await db('questions').where({ owner_type: type, owner_id: id }).orderBy('id');
    if (!qs.length) {
      return safeEdit(ctx, "Savollar yo'q.", Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', `ac_i:${type}:${id}`)]]));
    }
    const lines = qs.map((q, i) => `<b>${i + 1}.</b> ${q.photo_id ? '🖼 ' : ''}${esc((q.body || '(rasm)').slice(0, 60))} — <b>${L[q.correct]}</b>${q.sol_ref ? ' 🎥' : ''}`);
    let text = `📋 <b>Savollar</b> (${qs.length})\n\n${lines.join('\n')}\n\n🗑 O'chirish uchun savol raqamini bosing:`;
    if (text.length > 3900) text = `${text.slice(0, 3890)}…`;
    const btns = qs.map((q, i) => Markup.button.callback(`🗑${i + 1}`, `ac_qd:${q.id}`));
    const rows = [];
    for (let i = 0; i < btns.length && rows.length < 12; i += 5) rows.push(btns.slice(i, i + 5));
    rows.push([Markup.button.callback("🧹 Hammasini o'chirish", `ac_qc:${type}:${id}`)]);
    rows.push([Markup.button.callback('⬅️ Orqaga', `ac_i:${type}:${id}`)]);
    return safeEdit(ctx, text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) });
  }

  adminAction(/^ac_ql:(variant|topic):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return showQuestions(ctx, ctx.match[1], Number(ctx.match[2]));
  });

  adminAction(/^ac_qd:(\d+)$/, async (ctx) => {
    const q = await db('questions').where({ id: Number(ctx.match[1]) }).first();
    if (!q || q.owner_type === 'tt') return ctx.answerCbQuery('Topilmadi');
    await db('questions').where({ id: q.id }).del();
    await ctx.answerCbQuery("🗑 Savol o'chirildi");
    return showQuestions(ctx, q.owner_type, q.owner_id);
  });

  adminAction(/^ac_p:(variant|topic):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.form = { type: ctx.match[1], id: Number(ctx.match[2]), field: 'price' };
    ctx.session.state = 'adm_item_num';
    return ctx.reply("💵 Yangi narxni kiriting (so'm):", cancelKb());
  });

  adminAction(/^ac_tm:(variant|topic):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.form = { type: ctx.match[1], id: Number(ctx.match[2]), field: 'time_limit' };
    ctx.session.state = 'adm_item_num';
    return ctx.reply('⏱ Yangi vaqtni kiriting (daqiqa, 0 — cheklanmagan):', timeKb());
  });

  adminState('adm_item_num', async (ctx) => {
    const val = parseAmount(textOf(ctx));
    if (val == null) return ctx.reply('Raqam kiriting:');
    const { type, id, field } = ctx.session.form;
    await db(ITEM_TABLE[type]).where({ id }).update({ [field]: val });
    ctx.session.form = null;
    await openPanel(ctx, `✅ O'zgartirildi: ${field === 'time_limit' ? `${val} daqiqa` : money(val)}`);
    return showItem(ctx, type, id, false);
  });

  // ---- PDF (elektron variant) boshqaruvi ----
  adminAction(/^ac_pdf:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.form = { id: Number(ctx.match[1]) };
    ctx.session.state = 'adm_pdf_upload';
    return ctx.reply('📄 PDF faylni yuboring:', cancelKb());
  });

  adminState('adm_pdf_upload', async (ctx) => {
    const pdf = readPdf(ctx);
    if (!pdf) return ctx.reply('PDF fayl yuboring:');
    const { id } = ctx.session.form;
    const v = await db('variants').where({ id }).first();
    const upd = { ...pdf };
    if (v && !v.pdf_id && !v.pdf_price) upd.pdf_price = await getNum('default_pdf_price');
    await db('variants').where({ id }).update(upd);
    ctx.session.form = null;
    log(ctx.from.id, `🛠 PDF yukladi: variant#${id}`);
    await openPanel(ctx, `✅ PDF saqlandi${upd.pdf_price != null ? ` (narxi ${money(upd.pdf_price)}, «📄 PDF narxi» dan o'zgartiring)` : ''}.`);
    return showItem(ctx, 'variant', id, false);
  });

  adminAction(/^ac_pp:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.form = { type: 'variant', id: Number(ctx.match[1]), field: 'pdf_price' };
    ctx.session.state = 'adm_item_num';
    return ctx.reply("📄 PDF narxini kiriting (so'm, 0 — bepul):", cancelKb());
  });

  adminAction(/^ac_pdel:(\d+)$/, async (ctx) => {
    await db('variants').where({ id: Number(ctx.match[1]) }).update({ pdf_id: null, pdf_name: null });
    await ctx.answerCbQuery('🗑 PDF olib tashlandi');
    return showItem(ctx, 'variant', Number(ctx.match[1]));
  });

  adminAction(/^ac_v:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.form = { id: Number(ctx.match[1]) };
    ctx.session.state = 'adm_vid_replace';
    return ctx.reply('🎥 Yangi videoni yuboring (fayl yoki havola):', cancelKb());
  });

  adminState('adm_vid_replace', async (ctx) => {
    const v = readVideo(ctx);
    if (!v) return ctx.reply('Video fayl yoki https:// havola yuboring:');
    const { id } = ctx.session.form;
    await db('topics').where({ id }).update(v);
    ctx.session.form = null;
    await openPanel(ctx, '✅ Video almashtirildi.');
    return showItem(ctx, 'topic', id, false);
  });

  adminAction(/^ac_t:(variant|topic):(\d+)$/, async (ctx) => {
    const [, type, id] = ctx.match;
    const it = await db(ITEM_TABLE[type]).where({ id: Number(id) }).first();
    if (it) await db(ITEM_TABLE[type]).where({ id: it.id }).update({ is_active: it.is_active ? 0 : 1 });
    await ctx.answerCbQuery('✅');
    return showItem(ctx, type, Number(id));
  });

  adminAction(/^ac_qc:(variant|topic):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const [, type, id] = ctx.match;
    return safeEdit(ctx, "⚠️ Barcha savollar o'chirilsinmi?", Markup.inlineKeyboard([
      [Markup.button.callback("Ha, o'chirish", `ac_qcc:${type}:${id}`), Markup.button.callback("Yo'q", `ac_i:${type}:${id}`)],
    ]));
  });

  adminAction(/^ac_qcc:(variant|topic):(\d+)$/, async (ctx) => {
    const [, type, id] = ctx.match;
    await db('questions').where({ owner_type: type, owner_id: Number(id) }).del();
    await ctx.answerCbQuery("🧹 Savollar o'chirildi");
    return showItem(ctx, type, Number(id));
  });

  adminAction(/^ac_d:(variant|topic):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const [, type, id] = ctx.match;
    return safeEdit(ctx, "⚠️ Rostdan ham o'chirilsinmi? Savollari ham o'chadi. (Vaqtincha yashirish uchun «🙈 Yashirish» dan foydalaning.)", Markup.inlineKeyboard([
      [Markup.button.callback("Ha, o'chirish", `ac_dd:${type}:${id}`), Markup.button.callback("Yo'q", `ac_i:${type}:${id}`)],
    ]));
  });

  adminAction(/^ac_dd:(variant|topic):(\d+)$/, async (ctx) => {
    const [, type, idS] = ctx.match;
    const id = Number(idS);
    await db.transaction(async (trx) => {
      await trx('questions').where({ owner_type: type, owner_id: id }).del();
      await trx(ITEM_TABLE[type]).where({ id }).del();
    });
    log(ctx.from.id, `🛠 O'chirdi: ${type}#${id}`);
    await ctx.answerCbQuery("🗑 O'chirildi");
    return safeEdit(ctx, "🗑 O'chirildi.", Markup.inlineKeyboard([[Markup.button.callback("⬅️ Ro'yxat", `ac_l:${type}`)]]));
  });

  // Testni / mavzuni boshqa sinf bo'limiga ko'chirish
  adminAction(/^ac_mv:(variant|topic):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const [, type, id] = ctx.match;
    const list = cats.list(type === 'variant' ? 'test' : 'video', true);
    return safeEdit(ctx, "📂 Qaysi bo'limga ko'chirasiz?", Markup.inlineKeyboard([
      ...list.map((c) => [Markup.button.callback(`${c.is_active ? '' : '🙈 '}${c.name}`, `ac_mvto:${type}:${id}:${c.code}`)]),
      [Markup.button.callback('⬅️ Orqaga', `ac_i:${type}:${id}`)],
    ]));
  });

  adminAction(/^ac_mvto:(variant|topic):(\d+):(\w+)$/, async (ctx) => {
    const [, type, id, code] = ctx.match;
    const section = type === 'variant' ? 'test' : 'video';
    if (!cats.find(section, code)) return ctx.answerCbQuery('Bo\'lim topilmadi');
    await db(ITEM_TABLE[type]).where({ id: Number(id) }).update({ [type === 'variant' ? 'category' : 'grp']: code });
    log(ctx.from.id, `🛠 ${type}#${id} → ${esc(cats.name(section, code))}`);
    await ctx.answerCbQuery(`✅ Ko'chirildi: ${cats.name(section, code)}`);
    return showItem(ctx, type, Number(id));
  });

  // ================= Sinf bo'limlari (qaysi sinflar birga / alohida) =================
  const SECTION_NAME = { test: "📝 Test bo'limlari", video: "📺 Onlayn dars (videodars) bo'limlari" };

  const catsHome = (ctx, edit) =>
    (edit ? safeEdit : (c, t, e) => c.reply(t, e))(ctx,
      "📂 <b>Sinf bo'limlari</b>\n\nBu yerda testlar va onlayn darslar qaysi sinflar uchun bo'lishini belgilaysiz: " +
      "sinflarni alohida (masalan «5-sinf») yoki birgalikda (masalan «6-7-sinf») qilib bo'lim yaratasiz. " +
      "Keyin test yoki mavzu qo'shganda shu bo'limni tanlaysiz.",
      { parse_mode: 'HTML', ...Markup.inlineKeyboard([
        [Markup.button.callback(SECTION_NAME.test, 'cat_l:test')],
        [Markup.button.callback(SECTION_NAME.video, 'cat_l:video')],
      ]) },
    );
  adminMenu(BTN.A_CATS, (ctx) => catsHome(ctx, false));
  adminAction('cat_home', async (ctx) => {
    await ctx.answerCbQuery();
    return catsHome(ctx, true);
  });
  const BACK_CATS = [Markup.button.callback('⬅️ Orqaga', 'cat_home')];

  async function showCats(ctx, section) {
    const list = cats.list(section, true);
    const rows = [];
    for (const c of list) rows.push([Markup.button.callback(`${c.is_active ? '✅' : '🙈'} ${c.name} (${await cats.contentCount(c)})`, `cat_i:${c.id}`)]);
    rows.push([Markup.button.callback("➕ Yangi bo'lim qo'shish", `cat_new:${section}`)]);
    rows.push(BACK_CATS);
    return safeEdit(ctx, `${SECTION_NAME[section]}\n\nQavs ichida — ${section === 'test' ? 'test variantlari' : 'mavzular'} soni. ✅ ko'rinadi, 🙈 yashirin.\nTartib foydalanuvchi menyusidagi tartib bilan bir xil.`, Markup.inlineKeyboard(rows));
  }

  adminAction(/^cat_l:(test|video)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return showCats(ctx, ctx.match[1]);
  });

  async function showCat(ctx, id) {
    const c = cats.byId(id);
    if (!c) return safeEdit(ctx, "Bo'lim topilmadi.", Markup.inlineKeyboard([BACK_CATS]));
    const n = await cats.contentCount(c);
    return safeEdit(ctx, `📂 <b>${esc(c.name)}</b>\n${SECTION_NAME[c.section]}\n${c.section === 'test' ? 'Test variantlari' : 'Mavzular'}: ${n}\nHolati: ${c.is_active ? "✅ ko'rinadi" : '🙈 yashirin'}`, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback("✏️ Nomini o'zgartirish", `cat_rn:${c.id}`)],
        [Markup.button.callback('⬆️ Yuqoriga', `cat_mv:${c.id}:-1`), Markup.button.callback('⬇️ Pastga', `cat_mv:${c.id}:1`)],
        [Markup.button.callback(c.is_active ? '🙈 Yashirish' : "👁 Ko'rsatish", `cat_t:${c.id}`), Markup.button.callback("🗑 O'chirish", `cat_d:${c.id}`)],
        [Markup.button.callback("⬅️ Ro'yxat", `cat_l:${c.section}`)],
      ]),
    });
  }

  adminAction(/^cat_i:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return showCat(ctx, Number(ctx.match[1]));
  });

  adminAction(/^cat_new:(test|video)$/, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.form = { section: ctx.match[1] };
    ctx.session.state = 'adm_cat_name';
    return ctx.reply(
      "Yangi bo'lim nomini yozing.\n\nMasalan:\n• <code>5-sinf</code> — alohida\n• <code>6-7-sinf</code> — birgalikda\n• <code>Olimpiadaga tayyorgarlik</code>",
      { parse_mode: 'HTML', ...cancelKb() },
    );
  });

  adminAction(/^cat_rn:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const c = cats.byId(ctx.match[1]);
    if (!c) return null;
    ctx.session.form = { id: c.id, section: c.section };
    ctx.session.state = 'adm_cat_name';
    return ctx.reply(`Hozirgi nomi: <b>${esc(c.name)}</b>\nYangi nomini yozing:`, { parse_mode: 'HTML', ...cancelKb() });
  });

  adminState('adm_cat_name', async (ctx) => {
    const t = textOf(ctx);
    if (!t || t.length > 60) return ctx.reply('Nomini yozing (60 belgigacha):');
    const { id, section } = ctx.session.form || {};
    if (!section) return openPanel(ctx);
    if (cats.list(section, true).some((c) => c.name.toLowerCase() === t.toLowerCase() && c.id !== id)) {
      return ctx.reply("Bunday nomli bo'lim allaqachon bor. Boshqa nom yozing:");
    }
    if (id) await cats.update(id, { name: t });
    else await cats.create(section, t);
    log(ctx.from.id, `🛠 Sinf bo'limi ${id ? "nomi o'zgardi" : 'yaratildi'}: ${esc(t)}`);
    ctx.session.form = null;
    await openPanel(ctx, `✅ Saqlandi: <b>${esc(t)}</b>`);
    const list = cats.list(section, true);
    const rows = list.map((c) => [Markup.button.callback(`${c.is_active ? '✅' : '🙈'} ${c.name}`, `cat_i:${c.id}`)]);
    rows.push([Markup.button.callback("➕ Yangi bo'lim qo'shish", `cat_new:${section}`)]);
    rows.push(BACK_CATS);
    return ctx.reply(SECTION_NAME[section], Markup.inlineKeyboard(rows));
  });

  adminAction(/^cat_mv:(\d+):(-?1)$/, async (ctx) => {
    await cats.move(Number(ctx.match[1]), Number(ctx.match[2]));
    await ctx.answerCbQuery('✅');
    return showCat(ctx, Number(ctx.match[1]));
  });

  adminAction(/^cat_t:(\d+)$/, async (ctx) => {
    const c = cats.byId(ctx.match[1]);
    if (!c) return ctx.answerCbQuery();
    await cats.update(c.id, { is_active: c.is_active ? 0 : 1 });
    await ctx.answerCbQuery(c.is_active ? '🙈 Yashirildi' : "👁 Ko'rsatildi");
    return showCat(ctx, c.id);
  });

  adminAction(/^cat_d:(\d+)$/, async (ctx) => {
    const c = cats.byId(ctx.match[1]);
    if (!c) return ctx.answerCbQuery();
    const n = await cats.contentCount(c);
    if (n) {
      return ctx.answerCbQuery(`Bu bo'limda ${n} ta ${c.section === 'test' ? 'test' : 'mavzu'} bor. Avval ularni «🗂 Kontent» orqali boshqa bo'limga ko'chiring yoki o'chiring. Yoki bo'limni yashiring.`, { show_alert: true });
    }
    await ctx.answerCbQuery();
    return safeEdit(ctx, `⚠️ «${esc(c.name)}» bo'limi o'chirilsinmi?`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([
      [Markup.button.callback("Ha, o'chirish", `cat_dd:${c.id}`), Markup.button.callback("Yo'q", `cat_i:${c.id}`)],
    ]) });
  });

  adminAction(/^cat_dd:(\d+)$/, async (ctx) => {
    const c = cats.byId(ctx.match[1]);
    if (!c) return ctx.answerCbQuery();
    if (await cats.contentCount(c)) return ctx.answerCbQuery("Bo'limda kontent bor", { show_alert: true });
    await cats.remove(c.id);
    log(ctx.from.id, `🛠 Sinf bo'limi o'chirildi: ${esc(c.name)}`);
    await ctx.answerCbQuery("🗑 O'chirildi");
    return showCats(ctx, c.section);
  });

  // ================= Narxlar va sozlamalar =================
  const PRICE_KEYS = Object.keys(DEFAULT_SETTINGS).filter((k) => !k.startsWith('f_'));
  const fmtVal = (k, v) => (k === 'cert_signer' ? String(v) : /^cert_.*percent$/.test(k) ? `${v}%` : k === 'payment_info' ? `${String(v).slice(0, 25)}…` : /_days$/.test(k) ? `${v} kun` : k === 'ad_interval_hours' ? `${v} soat` : money(v));

  // Tugmalarda qirqilmasligi uchun qisqa nomlar (to'liq izoh tugma bosilganda chiqadi)
  const SHORT = {
    start_bonus: "🎁 Start bonusi (ro'yxatdan o'tganga)",
    referral_bonus: "👥 Do'st taklif qilish bonusi",
    min_topup: "💳 Minimal to'ldirish summasi",
    default_test_price: '📝 Test narxi',
    default_pdf_price: '📄 Test PDF narxi',
    default_video_price: '🎬 Video mavzu narxi',
    book_price: "📚 Kitob e'loni narxi",
    book_days: "📚 Kitob e'loni muddati",
    center_price: "🏫 Markaz e'loni narxi",
    center_days: "🏫 Markaz e'loni muddati",
    teacher_test_price: "👨‍🏫 O'qituvchi testi narxi",
    ad_interval_hours: '📣 Reklama oralig\'i',
    cert_min_percent: '🎓 Mavzu sertifikati: min %',
    cert_test_min_percent: '🎓 Test sertifikati: min %',
    cert_signer: '🎓 Sertifikatdagi imzo',
    payment_info: "💳 To'lov ma'lumoti (karta)",
  };
  async function pricesView() {
    const order = ['start_bonus', 'referral_bonus', ...PRICE_KEYS.filter((k) => !['start_bonus', 'referral_bonus'].includes(k))];
    const rows = [];
    for (const k of order) {
      const v = k === 'payment_info' ? "o'zgartirish" : fmtVal(k, await getSetting(k));
      rows.push([Markup.button.callback(`${SHORT[k] || k}: ${v}`.slice(0, 64), `st:${k}`)]);
    }
    return { text: "💵 <b>Narxlar va sozlamalar</b>\n\nO'zgartirish uchun bosing:", extra: { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) } };
  }

  adminMenu(BTN.A_PRICES, async (ctx) => {
    const v = await pricesView();
    return ctx.reply(v.text, v.extra);
  });

  adminAction(/^st:(\w+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const key = ctx.match[1];
    if (!PRICE_KEYS.includes(key)) return null;
    ctx.session.form = { key };
    ctx.session.state = 'adm_setting';
    return ctx.reply(`✏️ <b>${esc(SETTING_HELP[key])}</b>\nHozirgi qiymat: <b>${esc(await getSetting(key))}</b>\n\nYangi qiymatni yuboring:`, { parse_mode: 'HTML', ...cancelKb() });
  });

  adminState('adm_setting', async (ctx) => {
    const { key } = ctx.session.form || {};
    const t = textOf(ctx);
    if (!key || !t) return ctx.reply('Qiymat yuboring:');
    let value = t;
    if (!['payment_info', 'cert_signer'].includes(key)) {
      const n = parseAmount(t);
      if (n == null) return ctx.reply("Raqam kiriting (masalan 30000):");
      value = String(n);
    }
    await setSetting(key, value);
    log(ctx.from.id, `🛠 Sozlama: ${key} = ${esc(value.slice(0, 50))}`);
    ctx.session.form = null;
    await openPanel(ctx, '✅ Saqlandi.');
    const v = await pricesView();
    return ctx.reply(v.text, v.extra);
  });

  bot.command('set', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return null;
    const m = ctx.message.text.match(/^\/set(?:@\w+)?\s+(\w+)\s+([\s\S]+)$/);
    if (!m) return ctx.reply('Format: /set nom qiymat');
    const [, key, value] = m;
    if (!(key in DEFAULT_SETTINGS)) return ctx.reply(`Bunday sozlama yo'q. Mavjudlari: ${PRICE_KEYS.join(', ')}`);
    if (!['payment_info', 'cert_signer'].includes(key) && parseAmount(value) == null) return ctx.reply("Qiymat raqam bo'lishi kerak.");
    await setSetting(key, ['payment_info', 'cert_signer'].includes(key) ? value.trim() : String(parseAmount(value)));
    return ctx.reply(`✅ ${key} = ${value.trim()}`);
  });

  // ================= Bo'limlarni yoqish / o'chirish =================
  async function featuresKb() {
    const rows = [];
    for (const [k, name] of Object.entries(FEATURES)) rows.push([Markup.button.callback(`${(await isOn(k)) ? '✅' : '❌'} ${name}`, `ft:${k}`)]);
    return Markup.inlineKeyboard(rows);
  }
  const FT_TEXT = "🎛 <b>Bo'limlar</b>\n\n✅ — yoqilgan, ❌ — o'chirilgan. Bosib o'zgartiring.\nO'chirilgan bo'lim foydalanuvchilarga ko'rinmaydi (adminlarga ko'rinadi).";

  adminMenu(BTN.A_FEATURES, async (ctx) => ctx.reply(FT_TEXT, { parse_mode: 'HTML', ...(await featuresKb()) }));

  adminAction(/^ft:(\w+)$/, async (ctx) => {
    const k = ctx.match[1];
    if (!FEATURES[k]) return ctx.answerCbQuery();
    const on = await isOn(k);
    await setSetting(`f_${k}`, on ? '0' : '1');
    log(ctx.from.id, `🛠 Bo'lim ${on ? "o'chirildi" : 'yoqildi'}: ${esc(FEATURES[k])}`);
    await ctx.answerCbQuery(on ? "❌ O'chirildi" : '✅ Yoqildi');
    return safeEdit(ctx, FT_TEXT, { parse_mode: 'HTML', ...(await featuresKb()) });
  });

  // ================= Xabar yuborish (hammaga) =================
  adminMenu(BTN.A_BROADCAST, (ctx) => {
    ctx.session.state = 'adm_broadcast';
    return ctx.reply('Barcha foydalanuvchilarga yuboriladigan xabarni yuboring (matn, rasm, video...):', cancelKb());
  });

  adminState('adm_broadcast', async (ctx) => {
    const fromChat = ctx.chat.id;
    const msgId = ctx.message.message_id;
    const adminId = ctx.from.id;
    const users = await db('users').where({ is_registered: 1, is_blocked: 0 }).select('tg_id');
    log(adminId, `📢 Xabar yuborishni boshladi: ${users.length} ta`);
    await openPanel(ctx, `📢 Yuborish boshlandi: ${users.length} ta foydalanuvchi. Tugagach xabar beraman.`);
    (async () => {
      let ok = 0;
      let fail = 0;
      for (const u of users) {
        try {
          await ctx.telegram.copyMessage(u.tg_id, fromChat, msgId);
          ok += 1;
        } catch (e) {
          fail += 1;
        }
        await sleep(40);
      }
      ctx.telegram.sendMessage(adminId, `📢 Yuborish tugadi.\n✅ Yetkazildi: ${ok}\n❌ Xato (botni bloklaganlar): ${fail}`).catch(() => {});
    })();
    return null;
  });
}

module.exports = { register };
