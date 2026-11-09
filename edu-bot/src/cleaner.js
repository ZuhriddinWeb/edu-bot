/**
 * Chatni toza saqlash: yangi menyu tanlanganda oldingi menyu xabarlari va
 * foydalanuvchi bosgan tugma xabari o'chiriladi — chatda faqat joriy bo'lim qoladi.
 *
 * Kuzatiladi: bot ctx.reply / replyWithPhoto / replyWithLocation orqali yuborgan
 * xabarlar va holat (state) davomida foydalanuvchi yozgan javoblar.
 * Kuzatilmaydi (o'chmaydi): test savollari, natijalar, video darslar va video yechimlar,
 * adminlarga boradigan xabarlar.
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

// Har bir update uchun ctx.reply... ni o'rab, yuborilgan xabar ID sini eslab qolamiz
function middleware() {
  return (ctx, next) => {
    if (ctx.chat && ctx.chat.type === 'private') {
      for (const m of TRACKED) {
        const orig = ctx[m].bind(ctx);
        ctx[m] = async (...args) => {
          const res = await orig(...args);
          if (res && res.message_id) remember(ctx, res.message_id);
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
  const ids = [...(ctx.session.screens || [])];
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

module.exports = { middleware, cleanup, remember };
