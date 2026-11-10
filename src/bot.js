const { Telegraf, session } = require('telegraf');
const { db } = require('./db');
const { BTN, BTN_FEATURE, adminKb } = require('./keyboards');
const { getUser, now, isAdmin, isOn } = require('./utils');
const { showMainMenu } = require('./menu');
const logger = require('./logger');
const cleaner = require('./cleaner');

// Inline tugmalar -> bo'lim (bo'lim o'chirilgan bo'lsa ishlamaydi)
const CALLBACK_FEATURE = [
  [/^(tc:|tc_back|tv:|tstart:|buy:variant:|tp_home|tpc:|tpd:|tpget:|buy:pdf:)/, 'tests'],
  [/^(vg:|vg_back|vt:|vq:|buy:topic:)/, 'videos'],
  [/^bk/, 'books'],
  [/^ce[_:]/, 'centers'],
  [/^(tt_|tti:|ttr:|ttq:|ttt:|ttd:|ttdd:|tts:)/, 'teacher'],
  [/^rt:/, 'rating'],
  [/^cert_/, 'certs'],
  [/^bal_ref/, 'referral'],
  [/^bal_topup/, 'topup'],
];
const OFF_TEXT = "⛔ Bu bo'lim vaqtincha o'chirilgan.";

function createBot(token) {
  const bot = new Telegraf(token, { handlerTimeout: 60_000 });

  // Faqat shaxsiy chatlar
  bot.use((ctx, next) => (ctx.chat && ctx.chat.type !== 'private' ? undefined : next()));

  // Sessiya (holatlar xotirada saqlanadi)
  bot.use(session({ defaultSession: () => ({}) }));
  bot.use((ctx, next) => {
    if (!ctx.session) ctx.session = {};
    return next();
  });
  // Yuborilgan menyu xabarlarini eslab qolish (keyin o'chirish uchun)
  bot.use(cleaner.middleware());

  // Foydalanuvchini yuklash / birinchi marta kelganda yaratish (taklif havolasini ham saqlaydi)
  bot.use(async (ctx, next) => {
    if (!ctx.from || ctx.from.is_bot) return undefined;
    let u = await getUser(ctx.from.id);
    if (!u) {
      let ref = null;
      const text = (ctx.message && ctx.message.text) || '';
      const m = text.match(/^\/start\s+ref_(\d+)/);
      if (m && Number(m[1]) !== ctx.from.id) {
        const r = await getUser(Number(m[1]));
        if (r && r.is_registered) ref = r.tg_id;
      }
      try {
        await db('users').insert({
          tg_id: ctx.from.id, username: ctx.from.username || null, referrer_id: ref,
          balance: 0, is_registered: 0, created_at: now(),
        });
      } catch (e) { /* parallel so'rovda allaqachon yaratilgan */ }
      u = await getUser(ctx.from.id);
    } else if ((u.username || null) !== (ctx.from.username || null)) {
      await db('users').where({ tg_id: u.tg_id }).update({ username: ctx.from.username || null });
    }
    // O'qituvchi testi havolasi: /start tt_xxxx (ro'yxatdan o'tgach ham ochiladi)
    const tt = ((ctx.message && ctx.message.text) || '').match(/^\/start\s+tt_([a-f0-9]+)/i);
    if (tt) ctx.session.pendingTest = tt[1].toLowerCase();
    // Oxirgi faollik (har 5 daqiqada bir yangilanadi)
    if (!u.last_seen || now() - u.last_seen > 5 * 60 * 1000) {
      await db('users').where({ tg_id: u.tg_id }).update({ last_seen: now() });
    }
    ctx.user = u;
    return next();
  });

  // Harakatlarni log kanaliga yozish
  bot.use(logger.middleware());

  // Bloklangan foydalanuvchi va texnik ishlar rejimi
  bot.use(async (ctx, next) => {
    if (isAdmin(ctx.from.id)) return next();
    let text = null;
    if (ctx.user && ctx.user.is_blocked) text = '🚫 Hisobingiz bloklangan. Savollar bo\'lsa, admin bilan bog\'laning.';
    else if (!(await isOn('bot'))) text = "🛠 Botda texnik ishlar olib borilmoqda. Birozdan so'ng qayta urinib ko'ring.";
    if (!text) return next();
    if (ctx.callbackQuery) return ctx.answerCbQuery(text, { show_alert: true }).catch(() => {});
    return ctx.reply(text);
  });

  // Majburiy kanal obunasi
  require('./subscription')(bot);

  // Ro'yxatdan o'tish (/start va ro'yxatdan o'tmaganlar uchun to'siq)
  // Mini ilovadan botga qaytish havolalari: /start topup, /start addbook ...
  const deepLinks = {};
  require('./handlers/registration').register({ bot, deepLinks });

  const states = {};
  // Menyu tugmasi bosilganda joriy holat (state) bekor qilinadi
  const menu = (text, fn) =>
    bot.hears(text, async (ctx) => {
      ctx.session.state = null;
      await cleaner.cleanup(ctx); // oldingi menyu va bosilgan tugma o'chadi
      await fn(ctx);
      return require('./ads').maybeShow(ctx); // vaqti kelgan bo'lsa reklama
    });

  // O'chirilgan bo'limlar uchun to'siq (adminlarga ta'sir qilmaydi)
  bot.use(async (ctx, next) => {
    if (isAdmin(ctx.from.id)) return next();
    const text = ctx.message && ctx.message.text;
    if (text && BTN_FEATURE[text] && !(await isOn(BTN_FEATURE[text]))) {
      await cleaner.cleanup(ctx);
      return showMainMenu(ctx, OFF_TEXT);
    }
    const data = ctx.callbackQuery && ctx.callbackQuery.data;
    if (data) {
      const hit = CALLBACK_FEATURE.find(([re]) => re.test(data));
      if (hit && !(await isOn(hit[1]))) return ctx.answerCbQuery(OFF_TEXT, { show_alert: true });
    }
    return next();
  });

  bot.hears(BTN.CANCEL, async (ctx) => {
    await cleaner.cleanup(ctx);
    const st = ctx.session.state || '';
    const adminFlow = st.startsWith('adm_') || (ctx.session.qw && ctx.session.qw.back === 'admin');
    ctx.session.state = null;
    ctx.session.form = null;
    ctx.session.qw = null;
    if (adminFlow && isAdmin(ctx.from.id)) return ctx.reply('❌ Bekor qilindi.', adminKb());
    return showMainMenu(ctx, '❌ Bekor qilindi.');
  });

  const deps = { bot, menu, states, deepLinks };
  require('./quiz').register(deps);
  require('./questionWizard').register(deps);
  require('./handlers/tests').register(deps);
  require('./handlers/videos').register(deps);
  require('./handlers/balance').register(deps);
  require('./handlers/topups').register(deps);
  require('./handlers/books').register(deps);
  require('./handlers/centers').register(deps);
  require('./handlers/support').register(deps);
  require('./handlers/teacher').register(deps);
  require('./handlers/rating').register(deps);
  require('./handlers/certs').register(deps);

  // 📱 Mini ilova — inline web_app tugmasi (initData bilan ochiladi)
  menu(BTN.WEBAPP, (ctx) => {
    const { WEBAPP_URL } = require('./config');
    const { Markup } = require('telegraf');
    if (!WEBAPP_URL) return showMainMenu(ctx, "📱 Mini ilova hozircha sozlanmagan.");
    return ctx.reply("📱 Mini ilovani ochish uchun pastdagi tugmani bosing.\n\nYoki chat pastidagi chap burchakdagi «📱 Ilova» tugmasidan ham ochish mumkin.",
      Markup.inlineKeyboard([[Markup.button.webApp('📱 Mini ilovani ochish', WEBAPP_URL)]]));
  });
  require('./handlers/admin').register(deps);
  require('./handlers/adminAds').register(deps);

  // Holatga qarab xabarni yo'naltirish
  bot.on('message', async (ctx) => {
    const st = ctx.session.state;
    if (st && states[st]) {
      cleaner.remember(ctx, ctx.message.message_id); // foydalanuvchi javobi ham keyin o'chadi
      return states[st](ctx);
    }
    await cleaner.cleanup(ctx);
    return showMainMenu(ctx);
  });

  // «⬅️ Orqaga / Yopish» — alohida yuborilgan kartochkani o'chiradi (oldingi ro'yxat yuqorida qoladi)
  bot.action('close_msg', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.deleteMessage().catch(() => ctx.editMessageReplyMarkup(undefined).catch(() => {}));
  });

  bot.on('callback_query', (ctx) => ctx.answerCbQuery('Bu tugma eskirgan. /start ni bosing.').catch(() => {}));

  bot.catch((err, ctx) => {
    console.error(`[xato] update ${ctx.update && ctx.update.update_id}:`, err);
    ctx.reply("⚠️ Xatolik yuz berdi. Qaytadan urinib ko'ring yoki /start ni bosing.").catch(() => {});
  });

  return bot;
}

module.exports = { createBot };
