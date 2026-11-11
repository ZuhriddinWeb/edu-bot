/**
 * Chatni toza saqlash: yangi menyu tanlanganda oldingi menyu xabarlari va
 * foydalanuvchi bosgan tugma xabari o'chiriladi — chatda faqat joriy bo'lim qoladi.
 *
 * Kuzatiladi: bot ctx.reply / replyWithPhoto / replyWithLocation orqali yuborgan
 * xabarlar va holat (state) davomida foydalanuvchi yozgan javoblar.
 * Kuzatilmaydi (o'chmaydi): test savollari, natijalar, video darslar va video yechimlar,
 * adminlarga boradigan xabarlar.
 *
 * MUHIM: pastki menyu (reply keyboard) qaysi xabar bilan kelgan bo'lsa, o'sha xabar o'chirilsa,
 * Telegram (ayniqsa Android) menyuni yashirib qo'yadi va foydalanuvchi /start bosishga majbur bo'ladi.
 * Shuning uchun menyu olib kelgan oxirgi xabar ("langar", session.kbMsg) o'chirilmaydi;
 * yangi menyu kelganda eskisi oddiy xabar sifatida keyingi tozalashda o'chadi.
 *
 * Telegram cheklovi: 48 soatdan eski xabarlarni o'chirib bo'lmaydi.
 * Admin «🎛 Bo'limlar» dan «🧹 Chatni tozalash» ni o'chirib qo'yishi mumkin.
 */
const { isOn } = require('./utils');

const TRACKED = ['reply', 'replyWithPhoto', 'replyWithLocation'];
const MAX = 100;

function remember(ctx, id) {
  if (!ctx.session || !id) return;
  const list = ctx.session.screens || [];
  list.push(id);
  ctx.session.screens = list.slice(-MAX);
}

// Yuborilayotgan xabarda pastki menyu (reply keyboard) bormi?
function markupOf(args) {
  for (const a of args) {
    if (a && typeof a === 'object' && a.reply_markup) return a.reply_markup;
  }
  return null;
}

// Pastki menyu turi: asosiy menyu, admin panel yoki vaqtinchalik (Bekor qilish, O'tkazib yuborish...)
function kindOf(keyboard) {
  const { BTN } = require('./keyboards');
  const texts = keyboard.flat().map((b) => (typeof b === 'string' ? b : b && b.text));
  if (texts.includes(BTN.A_EXIT)) return 'admin';
  if (texts.includes(BTN.BALANCE) || texts.includes(BTN.TESTS) || texts.includes(BTN.ADMIN)) return 'main';
  return 'temp';
}

/**
 * Jarayon tugagach (state yo'q) pastda hali ham vaqtinchalik tugmalar («❌ Bekor qilish» kabi)
 * qolib ketgan bo'lsa — asosiy menyu yoki admin panel tugmalarini qaytaramiz.
 * Shunda foydalanuvchi hech qachon /start bosishga majbur bo'lmaydi.
 */
function restoreMiddleware() {
  return async (ctx, next) => {
    await next();
    try {
      if (!ctx.chat || ctx.chat.type !== 'private' || !ctx.session || !ctx.from) return;
      if (ctx.session.state || ctx.session.kbKind !== 'temp') return;
      const u = ctx.user;
      if (!u || !u.is_registered || u.is_blocked) return;
      const { isAdmin } = require('./utils');
      if (ctx.session.kbHome === 'admin' && isAdmin(ctx.from.id)) {
        const { adminKb } = require('./keyboards');
        await ctx.reply('🛠 Admin panel', adminKb());
      } else {
        const { mainKb } = require('./keyboards');
        const { featureFlags } = require('./menu');
        await ctx.reply('🏠 Asosiy menyu', mainKb(isAdmin(ctx.from.id), await featureFlags()));
      }
    } catch (e) {
      // foydalanuvchi botni bloklagan bo'lishi mumkin — e'tibor bermaymiz
    }
  };
}

// Har bir update uchun ctx.reply... ni o'rab, yuborilgan xabar ID sini eslab qolamiz
function middleware() {
  return (ctx, next) => {
    if (ctx.chat && ctx.chat.type === 'private') {
      for (const m of TRACKED) {
        const orig = ctx[m].bind(ctx);
        ctx[m] = async (...args) => {
          const res = await orig(...args);
          if (!res || !res.message_id || !ctx.session) return res;
          const rm = markupOf(args);
          if (rm && rm.keyboard) {
            // Yangi menyu langari: eskisini endi o'chirsa bo'ladi, yangisini saqlaymiz
            if (ctx.session.kbMsg && ctx.session.kbMsg !== res.message_id) remember(ctx, ctx.session.kbMsg);
            ctx.session.kbMsg = res.message_id;
            ctx.session.kbKind = kindOf(rm.keyboard);
            if (ctx.session.kbKind !== 'temp') ctx.session.kbHome = ctx.session.kbKind;
            return res;
          }
          if (rm && rm.remove_keyboard) {
            if (ctx.session.kbMsg) remember(ctx, ctx.session.kbMsg);
            ctx.session.kbMsg = null;
            ctx.session.kbKind = null;
          }
          remember(ctx, res.message_id);
          return res;
        };
      }
    }
    return next();
  };
}

// Oldingi menyu xabarlarini va joriy (tugma) xabarini o'chirish
async function cleanup(ctx) {
  if (!ctx.chat || !ctx.session) return;
  const anchor = ctx.session.kbMsg;
  const ids = (ctx.session.screens || []).filter((id) => id !== anchor);
  ctx.session.screens = [];
  if (!(await isOn('clean'))) return;
  if (ctx.message) ids.push(ctx.message.message_id);
  if (!ids.length) return;
  try {
    await ctx.telegram.callApi('deleteMessages', { chat_id: ctx.chat.id, message_ids: ids.slice(-MAX) });
  } catch (e) {
    // eski Bot API yoki xato bo'lsa — bittalab
    for (const id of ids) await ctx.telegram.deleteMessage(ctx.chat.id, id).catch(() => {});
  }
}

module.exports = { middleware, cleanup, remember, restoreMiddleware };
