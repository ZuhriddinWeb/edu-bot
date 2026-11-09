const { Markup } = require('telegraf');
const { db } = require('../db');
const { textOf, getNum, addBalance, money, esc, getUser, isOn, isAdmin } = require('../utils');
const { log } = require('../logger');
const { showMainMenu } = require('../menu');

async function beginRegistration(ctx) {
  ctx.session.state = 'reg_first';
  ctx.session.form = {};
  return ctx.reply("📝 Ro'yxatdan o'tish\n\nIsmingizni kiriting:", Markup.removeKeyboard());
}

const validName = (t) => t && t.length >= 2 && t.length <= 50 && !t.startsWith('/');

const regStates = {
  async reg_first(ctx) {
    const t = textOf(ctx);
    if (!validName(t)) return ctx.reply('Iltimos, ismingizni to\'g\'ri kiriting (2–50 ta harf):');
    ctx.session.form.first_name = t;
    ctx.session.state = 'reg_last';
    return ctx.reply('Familiyangizni kiriting:');
  },

  async reg_last(ctx) {
    const t = textOf(ctx);
    if (!validName(t)) return ctx.reply('Iltimos, familiyangizni to\'g\'ri kiriting:');
    ctx.session.form.last_name = t;
    ctx.session.state = 'reg_phone';
    return ctx.reply(
      "📞 Telefon raqamingizni yuboring (pastdagi tugmani bosing yoki +998901234567 ko'rinishida yozing):",
      Markup.keyboard([[Markup.button.contactRequest('📞 Raqamni yuborish')]]).resize().oneTime(),
    );
  },

  async reg_phone(ctx) {
    let phone = null;
    const c = ctx.message && ctx.message.contact;
    if (c) {
      if (c.user_id && c.user_id !== ctx.from.id) return ctx.reply("Iltimos, o'zingizning raqamingizni yuboring.");
      phone = c.phone_number.startsWith('+') ? c.phone_number : `+${c.phone_number}`;
    } else {
      const t = (textOf(ctx) || '').replace(/[\s\-()]/g, '');
      if (/^\+?998\d{9}$/.test(t)) phone = t.startsWith('+') ? t : `+${t}`;
    }
    if (!phone) return ctx.reply("Raqam noto'g'ri. Tugmani bosing yoki +998901234567 ko'rinishida yozing.");

    const f = ctx.session.form || {};
    // Faqat hali ro'yxatdan o'tmagan bo'lsa yangilanadi — bonuslar takror berilmasligi uchun
    const changed = await db('users').where({ tg_id: ctx.from.id, is_registered: 0 }).update({
      first_name: f.first_name, last_name: f.last_name, phone, is_registered: 1,
    });
    if (!changed) {
      ctx.session.state = null;
      ctx.session.form = null;
      return showMainMenu(ctx);
    }
    ctx.session.state = null;
    ctx.session.form = null;

    // Taklif qilgan do'stga bonus
    const u = await getUser(ctx.from.id);
    log(ctx.from.id, `✅ Ro'yxatdan o'tdi${u.referrer_id ? ` (taklif qilgan: ${u.referrer_id})` : ''}`);
    // Start bonusi — faqat to'liq ro'yxatdan o'tgach (kanal obunasi + ism + familiya + telefon), bir marta.
    // Bazadagi 'welcome' yozuvi bilan solishtiriladi; summani admin belgilaydi, 0 — berilmaydi
    let welcome = '';
    const startBonus = await getNum('start_bonus');
    if (startBonus > 0 && !(await db('transactions').where({ user_tg: u.tg_id, type: 'welcome' }).first())) {
      await addBalance(u.tg_id, startBonus, 'welcome', "Ro'yxatdan o'tish bonusi");
      log(u.tg_id, `🎁 Start bonusi: +${money(startBonus)}`);
      welcome = `\n🎁 Sizga sovg'a: balansingizga <b>${money(startBonus)}</b> qo'shildi!`;
    }
    // Bonus faqat kanalga a'zo bo'lib ro'yxatdan o'tgandan keyin beriladi (obuna tekshiruvi bu bosqichdan oldin)
    if (u.referrer_id && (await isOn('referral'))) {
      const bonus = await getNum('referral_bonus');
      if (bonus > 0) {
        await addBalance(u.referrer_id, bonus, 'referral', `Taklif: ${u.tg_id}`);
        log(u.referrer_id, `🎁 Taklif bonusi: +${money(bonus)} (${esc(u.first_name)})`);
        ctx.telegram
          .sendMessage(u.referrer_id, `🎉 Siz taklif qilgan do'stingiz <b>${esc(u.first_name)}</b> ro'yxatdan o'tdi!\n💰 Balansingizga <b>${money(bonus)}</b> qo'shildi.`, { parse_mode: 'HTML' })
          .catch(() => {});
      }
    }
    await showMainMenu(ctx, `✅ Ro'yxatdan muvaffaqiyatli o'tdingiz!${welcome}`);
    return require('./teacher').openPending(ctx);
  },
};

function register({ bot, deepLinks }) {
  bot.start(async (ctx) => {
    ctx.session.state = null;
    await require('../cleaner').cleanup(ctx);
    if (!ctx.user.is_registered) return beginRegistration(ctx);
    if (await require('./teacher').openPending(ctx)) return null;
    // Mini ilovadan kelgan buyruqlar (/start topup, /start addbook ...)
    const p = ((ctx.message && ctx.message.text) || '').split(/\s+/)[1];
    if (p && deepLinks[p]) {
      const DL_FEATURE = { topup: 'topup', addbook: 'books', addcenter: 'centers', teacher: 'teacher', support: 'support' };
      if (!isAdmin(ctx.from.id) && DL_FEATURE[p] && !(await isOn(DL_FEATURE[p]))) return showMainMenu(ctx, "⛔ Bu bo'lim vaqtincha o'chirilgan.");
      return deepLinks[p](ctx);
    }
    return showMainMenu(ctx);
  });

  // Ro'yxatdan o'tmaganlar faqat ro'yxatdan o'tish oqimida bo'ladi
  bot.use(async (ctx, next) => {
    if (ctx.user && ctx.user.is_registered) return next();
    if (ctx.callbackQuery) return ctx.answerCbQuery("Avval ro'yxatdan o'ting: /start").catch(() => {});
    const st = ctx.session.state;
    const isStart = ctx.message && typeof ctx.message.text === 'string' && ctx.message.text.startsWith('/start');
    if (ctx.message && !isStart && st && regStates[st]) return regStates[st](ctx);
    if (isStart) return next(); // bot.start qayta ishlaydi
    return beginRegistration(ctx);
  });
}

module.exports = { register, beginRegistration };
