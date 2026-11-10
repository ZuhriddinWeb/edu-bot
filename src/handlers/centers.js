// 6-bo'lim: O'quv markaz va xususiy maktab — viloyat -> tuman -> ro'yxat; qo'shish (pullik, 1 oy)
const { Markup } = require('telegraf');
const { db } = require('../db');
const REGIONS = require('../regions');
const { CENTER_KINDS } = require('../constants');
const { BTN, cancelKb, skipKb, chunk } = require('../keyboards');
const { esc, money, fmtDate, now, DAY, getNum, getUser, charge, textOf, safeEdit, isAdmin } = require('../utils');
const { showMainMenu } = require('../menu');
const { registerMine } = require('../listings');
const { log } = require('../logger');

const active = () => db('centers').where('is_active', 1).andWhere('expires_at', '>', now());

const card = (c) => {
  const k = CENTER_KINDS[c.kind];
  return `${k.icon} <b>${esc(c.name)}</b>\n<i>${k.name}</i>\n\n📍 ${esc(c.region)}, ${esc(c.district)}\n` +
    (c.address ? `🏠 ${esc(c.address)}\n` : '') +
    `📞 ${esc(c.phone)}`;
};

const regionsKb = (prefix, back) =>
  Markup.inlineKeyboard([
    ...chunk(REGIONS.map((r, i) => Markup.button.callback(r.name, `${prefix}:${i}`))),
    ...(back ? [[Markup.button.callback('⬅️ Orqaga', back)]] : []),
  ]);

const districtsKb = (ri, prefix, extraRows = []) =>
  Markup.inlineKeyboard([
    ...chunk(REGIONS[ri].districts.map((d, di) => Markup.button.callback(d, `${prefix}:${di}`))),
    ...extraRows,
  ]);

function register({ bot, menu, states, deepLinks }) {
  const mainText = async () => {
    const price = await getNum('center_price');
    const days = await getNum('center_days');
    return `🏫 <b>O'quv markaz va xususiy maktablar</b>\n\nViloyat va tuman bo'yicha qidiring yoki o'z markazingizni qo'shing.\n\nℹ️ Qo'shish: ${money(price)} / ${days} kun`;
  };
  const mainKb = () =>
    Markup.inlineKeyboard([
      [Markup.button.callback("🔎 O'quv markaz qidirish", 'ce_s:center')],
      [Markup.button.callback('🔎 Xususiy maktab qidirish', 'ce_s:school')],
      [Markup.button.callback("➕ O'quv markaz / maktab qo'shish", 'ce_add')],
      [Markup.button.callback("🗂 Mening e'lonlarim", 'ce_my')],
    ]);

  menu(BTN.CENTERS, async (ctx) => ctx.reply(await mainText(), { parse_mode: 'HTML', ...mainKb() }));

  bot.action('ce_home', async (ctx) => {
    await ctx.answerCbQuery();
    return safeEdit(ctx, await mainText(), { parse_mode: 'HTML', ...mainKb() });
  });

  // --- Qidiruv: tur -> viloyat -> tuman -> ro'yxat ---
  bot.action(/^ce_s:(center|school)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const kind = ctx.match[1];
    return safeEdit(ctx, `${CENTER_KINDS[kind].icon} <b>${CENTER_KINDS[kind].plural}</b>\n\nViloyatni tanlang:`, {
      parse_mode: 'HTML',
      ...regionsKb(`ce_r:${kind}`, 'ce_home'),
    });
  });

  bot.action(/^ce_r:(center|school):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const [, kind, ri] = ctx.match;
    const r = REGIONS[Number(ri)];
    if (!r) return null;
    return safeEdit(ctx, `${CENTER_KINDS[kind].icon} <b>${CENTER_KINDS[kind].plural}</b>\n📍 ${r.name}\n\nTumanni tanlang:`, {
      parse_mode: 'HTML',
      ...districtsKb(Number(ri), `ce_d:${kind}:${ri}`, [
        [Markup.button.callback('🗺 Butun viloyat bo\'yicha', `ce_d:${kind}:${ri}:all`)],
        [Markup.button.callback('⬅️ Orqaga', `ce_s:${kind}`)],
      ]),
    });
  });

  bot.action(/^ce_d:(center|school):(\d+):(\d+|all)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const [, kind, ri, di] = ctx.match;
    const r = REGIONS[Number(ri)];
    if (!r) return null;
    let q = active().andWhere({ kind, region: r.name });
    let place = r.name;
    if (di !== 'all') {
      const d = r.districts[Number(di)];
      q = q.andWhere({ district: d });
      place += `, ${d}`;
    }
    const list = await q.orderBy('id', 'desc').limit(50);
    const back = [[Markup.button.callback('⬅️ Orqaga', `ce_r:${kind}:${ri}`)]];
    if (!list.length) {
      return safeEdit(ctx, `📍 ${esc(place)}\n\n😔 Bu hududda hozircha ${CENTER_KINDS[kind].plural.toLowerCase()} qo'shilmagan.`, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(back),
      });
    }
    const rows = list.map((c) => [Markup.button.callback(`${CENTER_KINDS[c.kind].icon} ${c.name}`.slice(0, 60), `ce:${c.id}`)]);
    return safeEdit(ctx, `📍 <b>${esc(place)}</b>\n${CENTER_KINDS[kind].plural}: ${list.length} ta`, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([...rows, ...back]),
    });
  });

  bot.action(/^ce:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const c = await active().andWhere('id', Number(ctx.match[1])).first();
    const close = Markup.button.callback('⬅️ Orqaga', 'close_msg');
    if (!c) return ctx.reply("Bu e'lon endi faol emas.", Markup.inlineKeyboard([[close]]));
    const rows = [];
    if (c.latitude != null && c.longitude != null) rows.push([Markup.button.callback("📍 Xaritada ko'rish", `ce_loc:${c.id}`)]);
    rows.push([close]);
    return ctx.reply(card(c), { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) });
  });

  // Lokatsiya alohida xabar bo'lib keladi — uning ostida ham yopish tugmasi
  bot.action(/^ce_loc:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const c = await active().andWhere('id', Number(ctx.match[1])).first();
    if (!c || c.latitude == null) return null;
    return ctx.replyWithLocation(c.latitude, c.longitude, Markup.inlineKeyboard([[Markup.button.callback('⬅️ Yopish', 'close_msg')]]));
  });

  // --- Qo'shish ---
  const addStart = async (ctx) => {
    const price = isAdmin(ctx.from.id) ? 0 : await getNum('center_price'); // admin uchun bepul
    const u = await getUser(ctx.from.id);
    if (u.balance < price) {
      return ctx.reply(`⚠️ Qo'shish narxi ${money(price)}. Balansingiz: ${money(u.balance)}.\n«💰 Balans» bo'limidan to'ldiring.`);
    }
    ctx.session.form = {};
    ctx.session.state = null;
    return safeEdit(ctx, 'Nimani qo\'shmoqchisiz?', Markup.inlineKeyboard([
      [Markup.button.callback("🏫 O'quv markaz", 'ce_ak:center')],
      [Markup.button.callback('🏛 Xususiy maktab', 'ce_ak:school')],
      [Markup.button.callback('⬅️ Orqaga', 'ce_home')],
    ]));
  };
  bot.action('ce_add', async (ctx) => {
    await ctx.answerCbQuery();
    return addStart(ctx);
  });
  deepLinks.addcenter = addStart;

  bot.action(/^ce_ak:(center|school)$/, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.form = { kind: ctx.match[1] };
    return safeEdit(ctx, '📍 Viloyatni tanlang:', regionsKb('ce_ar', 'ce_add'));
  });

  bot.action(/^ce_ar:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const f = ctx.session.form;
    const ri = Number(ctx.match[1]);
    if (!f || !f.kind || !REGIONS[ri]) return safeEdit(ctx, "Ma'lumotlar eskirgan, qaytadan boshlang.");
    f.ri = ri;
    f.region = REGIONS[ri].name;
    return safeEdit(ctx, `📍 ${f.region}\n\nTumanni tanlang:`, districtsKb(ri, 'ce_ad', [[Markup.button.callback('⬅️ Orqaga', `ce_ak:${f.kind}`)]]));
  });

  bot.action(/^ce_ad:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const f = ctx.session.form;
    if (!f || f.ri == null) return safeEdit(ctx, "Ma'lumotlar eskirgan, qaytadan boshlang.");
    const d = REGIONS[f.ri].districts[Number(ctx.match[1])];
    if (!d) return null;
    f.district = d;
    await safeEdit(ctx, `📍 ${f.region}, ${d}`);
    ctx.session.state = 'center_name';
    return ctx.reply(`${CENTER_KINDS[f.kind].name} nomini kiriting:`, cancelKb());
  });

  states.center_name = async (ctx) => {
    const t = textOf(ctx);
    if (!t || t.length > 200) return ctx.reply('Nomini matn shaklida kiriting (200 belgigacha):');
    ctx.session.form.name = t;
    ctx.session.state = 'center_phone';
    const u = await getUser(ctx.from.id);
    return ctx.reply('📞 Telefon raqam(lar):', Markup.keyboard([[u.phone], [BTN.CANCEL]]).resize());
  };

  states.center_phone = async (ctx) => {
    const t = textOf(ctx);
    if (!t || t.length < 5) return ctx.reply('Telefon raqamni kiriting:');
    ctx.session.form.phone = t.slice(0, 64);
    ctx.session.state = 'center_address';
    return ctx.reply("🏠 Manzil (ko'cha, mo'ljal):", skipKb());
  };

  states.center_address = async (ctx) => {
    const t = textOf(ctx);
    if (!t) return ctx.reply('Manzilni matn shaklida kiriting:');
    ctx.session.form.address = t === BTN.SKIP ? null : t.slice(0, 255);
    ctx.session.state = 'center_location';
    return ctx.reply(
      "📌 Lokatsiyani yuboring (📎 → Joylashuv orqali xaritadan aniq nuqtani tanlash mumkin):",
      Markup.keyboard([[Markup.button.locationRequest('📍 Hozirgi joylashuvim')], [BTN.SKIP], [BTN.CANCEL]]).resize(),
    );
  };

  states.center_location = async (ctx) => {
    const loc = ctx.message.location || (ctx.message.venue && ctx.message.venue.location);
    const f = ctx.session.form;
    if (loc) {
      f.latitude = loc.latitude;
      f.longitude = loc.longitude;
    } else if (textOf(ctx) !== BTN.SKIP) {
      return ctx.reply(`Lokatsiya yuboring yoki «${BTN.SKIP}» ni bosing.`);
    }
    ctx.session.state = null;
    const price = isAdmin(ctx.from.id) ? 0 : await getNum('center_price'); // admin uchun bepul
    const days = await getNum('center_days');
    await ctx.reply("👇 E'lon ko'rinishi:", Markup.removeKeyboard());
    return ctx.reply(card(f) + (f.latitude != null ? '\n📌 Lokatsiya biriktirilgan' : ''), {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(`✅ Joylash — ${money(price)} (${days} kun)`, 'ce_confirm')],
        [Markup.button.callback('❌ Bekor qilish', 'ce_cancel')],
      ]),
    });
  };

  bot.action('ce_cancel', async (ctx) => {
    ctx.session.form = null;
    await ctx.answerCbQuery('Bekor qilindi');
    await ctx.editMessageReplyMarkup(undefined).catch(() => {});
    return showMainMenu(ctx);
  });

  bot.action('ce_confirm', async (ctx) => {
    const f = ctx.session.form;
    if (!f || !f.name || !f.district) return ctx.answerCbQuery("Ma'lumotlar eskirgan, qaytadan qo'shing", { show_alert: true });
    const price = isAdmin(ctx.from.id) ? 0 : await getNum('center_price'); // admin uchun bepul
    const days = await getNum('center_days');
    const expires = now() + days * DAY;
    const res = await charge(ctx.from.id, price, 'center', `${CENTER_KINDS[f.kind].name}: ${f.name}`, async (trx) => {
      await trx('centers').insert({
        user_tg: ctx.from.id, kind: f.kind, region: f.region, district: f.district, name: f.name,
        phone: f.phone, address: f.address || null, latitude: f.latitude ?? null, longitude: f.longitude ?? null,
        is_active: 1, expires_at: expires, created_at: now(),
      });
    });
    if (res === 'nofunds') return ctx.answerCbQuery(`Balansda mablag' yetarli emas. Kerak: ${money(price)}`, { show_alert: true });
    ctx.session.form = null;
    log(ctx.from.id, `🏫 E'lon joyladi: ${esc(f.name)} (${esc(f.region)}, ${esc(f.district)}) — ${money(price)}`);
    await ctx.answerCbQuery('✅ Joylandi!');
    await ctx.editMessageReplyMarkup(undefined).catch(() => {});
    return showMainMenu(ctx, `✅ E'loningiz joylandi! ${fmtDate(expires)} gacha ko'rinib turadi.`);
  });

  registerMine(bot, {
    home: 'ce_home',
    table: 'centers', p: 'ce', priceKey: 'center_price', daysKey: 'center_days', txType: 'center',
    title: (r) => `${CENTER_KINDS[r.kind].icon} ${r.name}`,
  });
}

module.exports = { register };
