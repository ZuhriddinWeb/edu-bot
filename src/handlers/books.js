// 5-bo'lim: Kitoblar — qidiruv, sotuvdagi kitoblar, kitob qo'shish (pullik, 1 oy)
const { Markup } = require('telegraf');
const { db } = require('../db');
const { BTN, cancelKb, skipKb } = require('../keyboards');
const { esc, money, fmtDate, now, DAY, getNum, getUser, charge, textOf, safeEdit } = require('../utils');
const { showMainMenu } = require('../menu');
const { registerMine } = require('../listings');
const { log } = require('../logger');

const PAGE = 10;
const BACK_HOME = Markup.button.callback('⬅️ Kitoblar', 'bk_home');
// Alohida yuborilgan kartochkani yopish (ro'yxat yuqorida qoladi)
const BACK_CLOSE = Markup.button.callback('⬅️ Orqaga', 'close_msg');
const active = () => db('books').where('is_active', 1).andWhere('expires_at', '>', now());

const bookCard = (b) =>
  `📚 <b>${esc(b.title)}</b>\n` +
  (b.author ? `✍️ Muallif: ${esc(b.author)}\n` : '') +
  (b.price_text ? `💵 Narxi: ${esc(b.price_text)}\n` : '') +
  (b.description ? `\n${esc(b.description)}\n` : '') +
  `\n📞 Aloqa: ${esc(b.phone)}`;

const listKb = (books, extraRows = []) =>
  Markup.inlineKeyboard([...books.map((b) => [Markup.button.callback(`📖 ${b.title}`.slice(0, 60), `bk:${b.id}`)]), ...extraRows]);

async function showPage(ctx, page) {
  const [{ cnt }] = await active().clone().count({ cnt: '*' });
  const total = Number(cnt);
  if (!total) return safeEdit(ctx, "📚 Hozircha sotuvda kitoblar yo'q.", Markup.inlineKeyboard([[BACK_HOME]]));
  const books = await active().orderBy('id', 'desc').offset(page * PAGE).limit(PAGE);
  const nav = [];
  if (page > 0) nav.push(Markup.button.callback('⬅️', `bk_list:${page - 1}`));
  if ((page + 1) * PAGE < total) nav.push(Markup.button.callback('➡️', `bk_list:${page + 1}`));
  const pages = Math.ceil(total / PAGE);
  return safeEdit(ctx, `📚 <b>Sotuvdagi kitoblar</b> (${total} ta) — ${page + 1}/${pages}-sahifa`, {
    parse_mode: 'HTML',
    ...listKb(books, [...(nav.length ? [nav] : []), [BACK_HOME]]),
  });
}

function register({ bot, menu, states, deepLinks }) {
  const home = async (ctx, edit) => {
    ctx.session.state = null;
    const price = await getNum('book_price');
    const days = await getNum('listing_days');
    return (edit ? safeEdit : (c, t, e) => c.reply(t, e))(ctx,
      `📚 <b>Kitoblar</b>\n\nKitob nomi yoki muallif bo'yicha qidiring, sotuvdagi kitoblarni ko'ring yoki o'z kitobingizni sotuvga qo'ying.\n\nℹ️ Kitob qo'shish: ${money(price)} / ${days} kun`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔎 Qidirish', 'bk_search')],
          [Markup.button.callback('📚 Sotuvdagi kitoblar', 'bk_list:0')],
          [Markup.button.callback("➕ Kitob qo'shish", 'bk_add')],
          [Markup.button.callback("🗂 Mening e'lonlarim", 'bk_my')],
        ]),
      },
    );
  };
  menu(BTN.BOOKS, (ctx) => home(ctx, false));
  bot.action('bk_home', async (ctx) => {
    await ctx.answerCbQuery();
    return home(ctx, true);
  });

  // --- Qidiruv ---
  bot.action('bk_search', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.state = 'book_search';
    return ctx.reply('🔎 Kitob nomi yoki muallifini yozing:', cancelKb());
  });

  states.book_search = async (ctx) => {
    const q = textOf(ctx);
    if (!q || q.length < 2) return ctx.reply('Kamida 2 ta harf yozing:');
    const like = `%${q.toLowerCase().replace(/[%_]/g, '')}%`;
    const books = await active()
      .andWhere((w) => w.whereRaw('LOWER(title) LIKE ?', [like]).orWhereRaw('LOWER(author) LIKE ?', [like]))
      .orderBy('id', 'desc')
      .limit(20);
    if (!books.length) return ctx.reply(`😔 «${q}» bo'yicha hech narsa topilmadi. Boshqa so'z bilan urinib ko'ring yoki «${BTN.CANCEL}» ni bosing.`, Markup.inlineKeyboard([[BACK_HOME]]));
    return ctx.reply(`🔎 «${esc(q)}» bo'yicha topildi: ${books.length} ta\n\nYana qidirish uchun yangi so'z yozing.`, { parse_mode: 'HTML', ...listKb(books, [[BACK_HOME]]) });
  };

  // --- Sotuvdagilar ---
  bot.action(/^bk_list:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return showPage(ctx, Number(ctx.match[1]));
  });

  bot.action(/^bk:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const b = await active().andWhere('id', Number(ctx.match[1])).first();
    if (!b) return ctx.reply("Bu e'lon endi faol emas.", Markup.inlineKeyboard([[BACK_CLOSE]]));
    const kb = Markup.inlineKeyboard([[BACK_CLOSE]]);
    if (b.photo_id) return ctx.replyWithPhoto(b.photo_id, { caption: bookCard(b).slice(0, 1024), parse_mode: 'HTML', ...kb });
    return ctx.reply(bookCard(b), { parse_mode: 'HTML', ...kb });
  });

  // --- Kitob qo'shish ---
  const addStart = async (ctx) => {
    const price = await getNum('book_price');
    const u = await getUser(ctx.from.id);
    if (u.balance < price) {
      return ctx.reply(`⚠️ Kitob qo'shish narxi ${money(price)}. Balansingiz: ${money(u.balance)}.\n«💰 Balans» bo'limidan to'ldiring.`);
    }
    ctx.session.form = {};
    ctx.session.state = 'book_title';
    return ctx.reply('📖 Kitob nomini kiriting:', cancelKb());
  };
  bot.action('bk_add', async (ctx) => {
    await ctx.answerCbQuery();
    return addStart(ctx);
  });
  deepLinks.addbook = addStart;

  states.book_title = async (ctx) => {
    const t = textOf(ctx);
    if (!t || t.length > 200) return ctx.reply('Kitob nomini matn shaklida kiriting (200 belgigacha):');
    ctx.session.form.title = t;
    ctx.session.state = 'book_author';
    return ctx.reply('✍️ Muallifini kiriting:', skipKb());
  };

  states.book_author = async (ctx) => {
    const t = textOf(ctx);
    if (!t) return ctx.reply('Muallifni matn shaklida kiriting:');
    ctx.session.form.author = t === BTN.SKIP ? null : t.slice(0, 200);
    ctx.session.state = 'book_price';
    return ctx.reply('💵 Kitob narxini yozing (masalan: 35 000 so\'m):', cancelKb());
  };

  states.book_price = async (ctx) => {
    const t = textOf(ctx);
    if (!t) return ctx.reply('Narxni matn shaklida yozing:');
    ctx.session.form.price_text = t.slice(0, 100);
    ctx.session.state = 'book_desc';
    return ctx.reply("📝 Qisqacha tavsif (holati, nashr yili va h.k.):", skipKb());
  };

  states.book_desc = async (ctx) => {
    const t = textOf(ctx);
    if (!t) return ctx.reply('Tavsifni matn shaklida yozing:');
    ctx.session.form.description = t === BTN.SKIP ? null : t.slice(0, 800);
    ctx.session.state = 'book_phone';
    const u = await getUser(ctx.from.id);
    return ctx.reply('📞 Aloqa uchun telefon raqam:', Markup.keyboard([[u.phone], [BTN.CANCEL]]).resize());
  };

  states.book_phone = async (ctx) => {
    const t = textOf(ctx);
    if (!t || t.length < 5) return ctx.reply('Telefon raqamni kiriting:');
    ctx.session.form.phone = t.slice(0, 64);
    ctx.session.state = 'book_photo';
    return ctx.reply('🖼 Kitob rasmini yuboring:', skipKb());
  };

  states.book_photo = async (ctx) => {
    const photos = ctx.message.photo;
    if (photos && photos.length) ctx.session.form.photo_id = photos[photos.length - 1].file_id;
    else if (textOf(ctx) !== BTN.SKIP) return ctx.reply(`Rasm yuboring yoki «${BTN.SKIP}» ni bosing.`);
    ctx.session.state = null;
    const f = ctx.session.form;
    const price = await getNum('book_price');
    const days = await getNum('listing_days');
    await ctx.reply('👇 E\'lon ko\'rinishi:', Markup.removeKeyboard());
    const kb = Markup.inlineKeyboard([
      [Markup.button.callback(`✅ Joylash — ${money(price)} (${days} kun)`, 'bk_confirm')],
      [Markup.button.callback('❌ Bekor qilish', 'bk_cancel')],
    ]);
    if (f.photo_id) return ctx.replyWithPhoto(f.photo_id, { caption: bookCard(f).slice(0, 1024), parse_mode: 'HTML', ...kb });
    return ctx.reply(bookCard(f), { parse_mode: 'HTML', ...kb });
  };

  bot.action('bk_cancel', async (ctx) => {
    ctx.session.form = null;
    await ctx.answerCbQuery('Bekor qilindi');
    await ctx.editMessageReplyMarkup(undefined).catch(() => {});
    return showMainMenu(ctx);
  });

  bot.action('bk_confirm', async (ctx) => {
    const f = ctx.session.form;
    if (!f || !f.title || !f.phone) return ctx.answerCbQuery("Ma'lumotlar eskirgan, qaytadan qo'shing", { show_alert: true });
    const price = await getNum('book_price');
    const days = await getNum('listing_days');
    const expires = now() + days * DAY;
    const res = await charge(ctx.from.id, price, 'book', `Kitob: ${f.title}`, async (trx) => {
      await trx('books').insert({ ...f, user_tg: ctx.from.id, is_active: 1, expires_at: expires, created_at: now() });
    });
    if (res === 'nofunds') return ctx.answerCbQuery(`Balansda mablag' yetarli emas. Kerak: ${money(price)}`, { show_alert: true });
    ctx.session.form = null;
    log(ctx.from.id, `📚 Kitob e'lonini joyladi: ${esc(f.title)} — ${money(price)}`);
    await ctx.answerCbQuery('✅ Joylandi!');
    await ctx.editMessageReplyMarkup(undefined).catch(() => {});
    return showMainMenu(ctx, `✅ Kitobingiz sotuvga qo'yildi! ${fmtDate(expires)} gacha ko'rinib turadi.`);
  });

  registerMine(bot, { home: 'bk_home', table: 'books', p: 'bk', priceKey: 'book_price', txType: 'book', title: (r) => r.title });
}

module.exports = { register };
