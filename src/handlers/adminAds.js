// Admin: 📣 Reklama (muddati bilan) va 📋 E'lonlar (kitob / markaz e'lonlarini boshqarish)
const { Markup } = require('telegraf');
const { db } = require('../db');
const { BTN, adminKb, cancelKb, skipKb } = require('../keyboards');
const { CENTER_KINDS } = require('../constants');
const { esc, now, DAY, fmtDate, isAdmin, parseAmount, textOf, safeEdit, sleep, getUser } = require('../utils');
const { showMainMenu } = require('../menu');
const { sendAd } = require('../ads');
const { log } = require('../logger');

const daysKb = () => Markup.keyboard([['1', '3', '7'], ['15', '30', '60'], [BTN.CANCEL]]).resize();

function adStatus(ad) {
  const t = now();
  if (!ad.is_active) return '⏸ To\'xtatilgan';
  if (Number(ad.ends_at) <= t) return `🔴 Tugagan (${fmtDate(ad.ends_at)})`;
  if (Number(ad.starts_at) > t) return `⏳ ${fmtDate(ad.starts_at)} dan`;
  return `🟢 Faol: ${fmtDate(ad.ends_at)} gacha`;
}
const adTitle = (ad) => (ad.text || (ad.media_type === 'photo' ? '🖼 Rasm' : '🎥 Video')).replace(/\s+/g, ' ').slice(0, 40);

function register({ bot, menu, states }) {
  const adminMenu = (text, fn) => menu(text, (ctx) => (isAdmin(ctx.from.id) ? fn(ctx) : showMainMenu(ctx)));
  const adminAction = (trigger, fn) => bot.action(trigger, (ctx) => (isAdmin(ctx.from.id) ? fn(ctx) : ctx.answerCbQuery("Ruxsat yo'q")));
  const adminState = (name, fn) => {
    states[name] = (ctx) => (isAdmin(ctx.from.id) ? fn(ctx) : showMainMenu(ctx));
  };
  const toPanel = (ctx, text) => {
    ctx.session.state = null;
    return ctx.reply(text, { parse_mode: 'HTML', ...adminKb() });
  };

  // ======================= 📣 REKLAMA =======================
  async function adsList(ctx, edit) {
    const list = await db('ads').orderBy('id', 'desc').limit(30);
    const rows = list.map((a) => [Markup.button.callback(`${adStatus(a).split(':')[0]} ${adTitle(a)}`.slice(0, 60), `ad_i:${a.id}`)]);
    rows.unshift([Markup.button.callback('➕ Yangi reklama', 'ad_new')]);
    const text = "📣 <b>Reklama</b>\n\nReklama foydalanuvchilarga menyu ochganda ko'rsatiladi (bir odamga «💵 Narxlar» dagi oraliqda bir marta). " +
      "Muddat tugagach avtomatik to'xtaydi.\n\n🟢 faol · ⏳ boshlanmagan · 🔴 tugagan · ⏸ to'xtatilgan";
    const extra = { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) };
    return edit ? safeEdit(ctx, text, extra) : ctx.reply(text, extra);
  }

  adminMenu(BTN.A_ADS, (ctx) => adsList(ctx, false));
  adminAction('ad_home', async (ctx) => {
    await ctx.answerCbQuery();
    return adsList(ctx, true);
  });

  // --- Yangi reklama: kontent -> tugma -> muddat -> tasdiq ---
  adminAction('ad_new', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.form = {};
    ctx.session.state = 'adm_ad_content';
    return ctx.reply(
      "📣 <b>Yangi reklama</b>\n\n<b>1-qadam.</b> Reklama matnini yuboring.\nRasm yoki video bilan bo'lsa — rasm/videoni yuborib, izohiga (caption) matnni yozing.",
      { parse_mode: 'HTML', ...cancelKb() },
    );
  });

  adminState('adm_ad_content', async (ctx) => {
    const m = ctx.message;
    const f = ctx.session.form;
    if (m.photo && m.photo.length) Object.assign(f, { media_type: 'photo', media_id: m.photo[m.photo.length - 1].file_id, text: m.caption || '' });
    else if (m.video) Object.assign(f, { media_type: 'video', media_id: m.video.file_id, text: m.caption || '' });
    else if (textOf(ctx)) Object.assign(f, { media_type: null, media_id: null, text: textOf(ctx) });
    else return ctx.reply('Matn, rasm yoki video yuboring.');
    if (f.media_type && f.text.length > 1024) return ctx.reply("Rasm/video izohi 1024 belgidan oshmasin. Qisqartirib qayta yuboring.");
    ctx.session.state = 'adm_ad_button';
    return ctx.reply(
      "<b>2-qadam.</b> Reklama ostida tugma kerakmi?\nFormat: <code>Tugma matni | https://havola</code>\nMasalan: <code>Ro'yxatdan o'tish | https://t.me/kanal</code>\n\nTugma kerak bo'lmasa — «⏭ O'tkazib yuborish».",
      { parse_mode: 'HTML', ...skipKb() },
    );
  });

  adminState('adm_ad_button', async (ctx) => {
    const t = textOf(ctx);
    if (!t) return ctx.reply('Matn yuboring yoki «⏭ O\'tkazib yuborish».');
    if (t !== BTN.SKIP) {
      const m = t.match(/^(.{1,60}?)\s*\|\s*(https?:\/\/\S+)$/);
      if (!m) return ctx.reply("Format noto'g'ri. Masalan: Batafsil | https://example.uz");
      if (m[2].length > 500) return ctx.reply('Havola juda uzun (500 belgigacha).');
      Object.assign(ctx.session.form, { btn_text: m[1].trim(), btn_url: m[2] });
    }
    ctx.session.state = 'adm_ad_days';
    return ctx.reply('<b>3-qadam.</b> Reklama necha kun ko\'rsatilsin?', { parse_mode: 'HTML', ...daysKb() });
  });

  adminState('adm_ad_days', async (ctx) => {
    const days = parseAmount(textOf(ctx));
    if (!days || days > 365) return ctx.reply('Kunlar sonini kiriting (1–365):');
    const f = ctx.session.form;
    f.days = days;
    ctx.session.state = null;
    await ctx.reply(`👇 Ko'rinishi (${days} kun, bugundan ${fmtDate(now() + days * DAY)} gacha):`, Markup.removeKeyboard());
    return sendAd(ctx, f, [
      [Markup.button.callback('✅ Joylash', 'ad_save'), Markup.button.callback('❌ Bekor', 'ad_cancel')],
    ]);
  });

  adminAction('ad_cancel', async (ctx) => {
    ctx.session.form = null;
    await ctx.answerCbQuery('Bekor qilindi');
    await ctx.deleteMessage().catch(() => {});
    return toPanel(ctx, '❌ Bekor qilindi.');
  });

  adminAction('ad_save', async (ctx) => {
    const f = ctx.session.form;
    if (!f || !f.days) return ctx.answerCbQuery("Ma'lumotlar eskirgan", { show_alert: true });
    const t = now();
    const [id] = await db('ads').insert({
      text: f.text || '', media_type: f.media_type || null, media_id: f.media_id || null,
      btn_text: f.btn_text || null, btn_url: f.btn_url || null,
      starts_at: t, ends_at: t + f.days * DAY, is_active: 1, shows: 0, created_at: t,
    });
    ctx.session.form = null;
    log(ctx.from.id, `📣 Reklama joyladi #${id} (${f.days} kun)`);
    await ctx.answerCbQuery('✅ Joylandi');
    await ctx.editMessageReplyMarkup(undefined).catch(() => {});
    await toPanel(ctx, `✅ Reklama #${id} joylandi. ${fmtDate(t + f.days * DAY)} gacha ko'rsatiladi.`);
    return showAd(ctx, id, false);
  });

  // --- Reklama kartochkasi ---
  async function showAd(ctx, id, edit = true) {
    const ad = await db('ads').where({ id }).first();
    if (!ad) return safeEdit(ctx, 'Topilmadi.', Markup.inlineKeyboard([[Markup.button.callback('⬅️ Reklamalar', 'ad_home')]]));
    const text = `📣 <b>Reklama #${ad.id}</b>\n\n${esc(adTitle(ad))}${(ad.text || '').length > 40 ? '…' : ''}\n\n` +
      `📅 Boshlangan: ${fmtDate(ad.starts_at)}\n${adStatus(ad)}\n👁 Ko'rsatilgan: ${ad.shows} marta` +
      (ad.btn_url ? `\n🔗 Tugma: ${esc(ad.btn_text)}` : '');
    const extra = {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback("👁 Ko'rib chiqish", `ad_pv:${id}`), Markup.button.callback("📅 Muddatni o'zgartirish", `ad_dt:${id}`)],
        [Markup.button.callback(ad.is_active ? "⏸ To'xtatish" : '▶️ Yoqish', `ad_t:${id}`), Markup.button.callback('📢 Hozir hammaga yuborish', `ad_bc:${id}`)],
        [Markup.button.callback("🗑 O'chirish", `ad_d:${id}`)],
        [Markup.button.callback('⬅️ Reklamalar', 'ad_home')],
      ]),
    };
    return edit ? safeEdit(ctx, text, extra) : ctx.reply(text, extra);
  }

  adminAction(/^ad_i:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return showAd(ctx, Number(ctx.match[1]));
  });

  adminAction(/^ad_pv:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const ad = await db('ads').where({ id: Number(ctx.match[1]) }).first();
    if (!ad) return null;
    return sendAd(ctx, ad, [[Markup.button.callback('⬅️ Yopish', 'close_msg')]]);
  });

  adminAction(/^ad_dt:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.form = { adId: Number(ctx.match[1]) };
    ctx.session.state = 'adm_ad_redays';
    return ctx.reply("📅 Bugundan boshlab necha kun ko'rsatilsin?\n(0 — hozir tugatish)", daysKb());
  });

  adminState('adm_ad_redays', async (ctx) => {
    const days = parseAmount(textOf(ctx));
    if (days == null || days > 365) return ctx.reply('Kunlar sonini kiriting (0–365):');
    const { adId } = ctx.session.form || {};
    const t = now();
    await db('ads').where({ id: adId }).update({ ends_at: days ? t + days * DAY : t, ...(days ? { is_active: 1 } : {}) });
    ctx.session.form = null;
    log(ctx.from.id, `📣 Reklama #${adId} muddati: ${days} kun`);
    await toPanel(ctx, days ? `✅ Reklama ${fmtDate(t + days * DAY)} gacha ko'rsatiladi.` : '✅ Reklama tugatildi.');
    return showAd(ctx, adId, false);
  });

  adminAction(/^ad_t:(\d+)$/, async (ctx) => {
    const ad = await db('ads').where({ id: Number(ctx.match[1]) }).first();
    if (!ad) return ctx.answerCbQuery();
    await db('ads').where({ id: ad.id }).update({ is_active: ad.is_active ? 0 : 1 });
    await ctx.answerCbQuery(ad.is_active ? "⏸ To'xtatildi" : '▶️ Yoqildi');
    return showAd(ctx, ad.id);
  });

  adminAction(/^ad_d:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const id = ctx.match[1];
    return safeEdit(ctx, '⚠️ Reklama o\'chirilsinmi?', Markup.inlineKeyboard([
      [Markup.button.callback("Ha, o'chirish", `ad_dd:${id}`), Markup.button.callback("Yo'q", `ad_i:${id}`)],
    ]));
  });

  adminAction(/^ad_dd:(\d+)$/, async (ctx) => {
    await db('ads').where({ id: Number(ctx.match[1]) }).del();
    await ctx.answerCbQuery("🗑 O'chirildi");
    return adsList(ctx, true);
  });

  // Hozir barcha foydalanuvchilarga yuborish (fon rejimida)
  adminAction(/^ad_bc:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const id = ctx.match[1];
    const [{ c }] = await db('users').where({ is_registered: 1, is_blocked: 0 }).count({ c: '*' });
    return safeEdit(ctx, `📢 Reklama ${c} ta foydalanuvchiga yuborilsinmi?`, Markup.inlineKeyboard([
      [Markup.button.callback('Ha, yuborish', `ad_bcc:${id}`), Markup.button.callback("Yo'q", `ad_i:${id}`)],
    ]));
  });

  adminAction(/^ad_bcc:(\d+)$/, async (ctx) => {
    const ad = await db('ads').where({ id: Number(ctx.match[1]) }).first();
    if (!ad) return ctx.answerCbQuery();
    await ctx.answerCbQuery('Yuborish boshlandi');
    const users = await db('users').where({ is_registered: 1, is_blocked: 0 }).select('tg_id');
    const adminId = ctx.from.id;
    const tg = ctx.telegram;
    log(adminId, `📣 Reklama #${ad.id} ni hammaga yubordi (${users.length})`);
    await safeEdit(ctx, `📢 Yuborilmoqda: ${users.length} ta foydalanuvchi. Tugagach xabar beraman.`, Markup.inlineKeyboard([[Markup.button.callback('⬅️ Reklama', `ad_i:${ad.id}`)]]));
    (async () => {
      let ok = 0;
      let fail = 0;
      for (const u of users) {
        // har bir foydalanuvchi uchun "soxta" ctx — sendAd faqat reply metodlaridan foydalanadi
        const fake = {
          reply: (t, e) => tg.sendMessage(u.tg_id, t, e),
          replyWithPhoto: (p, e) => tg.sendPhoto(u.tg_id, p, e),
          replyWithVideo: (v, e) => tg.sendVideo(u.tg_id, v, e),
        };
        try {
          await sendAd(fake, ad);
          ok += 1;
        } catch (e) {
          fail += 1;
        }
        await sleep(40);
      }
      await db('ads').where({ id: ad.id }).increment('shows', ok);
      tg.sendMessage(adminId, `📢 Reklama #${ad.id} yuborildi.\n✅ Yetkazildi: ${ok}\n❌ Xato: ${fail}`).catch(() => {});
    })();
    return null;
  });

  // ======================= 📋 E'LONLAR (kitob / markaz) =======================
  const LT = {
    books: { title: '📚 Kitob e\'lonlari', name: (r) => r.title },
    centers: { title: "🏫 Markaz / maktab e'lonlari", name: (r) => `${CENTER_KINDS[r.kind] ? CENTER_KINDS[r.kind].icon : ''} ${r.name}` },
  };
  const LS_TEXT = "📋 <b>E'lonlar</b>\n\nFoydalanuvchilar joylagan kitob va o'quv markaz e'lonlari. Muddatini o'zgartirish yoki o'chirish mumkin.\nNarx va standart muddat — «💵 Narxlar» da.\nO'zingiz (admin) joylagan e'lonlar bepul.";
  const lsKb = () => Markup.inlineKeyboard([
    [Markup.button.callback("📚 Kitob e'lonlari", 'ls_l:books:a'), Markup.button.callback("🏫 Markaz e'lonlari", 'ls_l:centers:a')],
    [Markup.button.callback("🔴 Muddati tugagan kitoblar", 'ls_l:books:e'), Markup.button.callback('🔴 Tugagan markazlar', 'ls_l:centers:e')],
  ]);

  adminMenu(BTN.A_LISTINGS, (ctx) => ctx.reply(LS_TEXT, { parse_mode: 'HTML', ...lsKb() }));
  adminAction('ls_home', async (ctx) => {
    await ctx.answerCbQuery();
    return safeEdit(ctx, LS_TEXT, { parse_mode: 'HTML', ...lsKb() });
  });

  adminAction(/^ls_l:(books|centers):(a|e)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const [, table, mode] = ctx.match;
    const t = now();
    const q = db(table).where('is_active', 1);
    const list = await (mode === 'a' ? q.andWhere('expires_at', '>', t) : q.andWhere('expires_at', '<=', t)).orderBy('id', 'desc').limit(50);
    const rows = list.map((r) => [Markup.button.callback(`${LT[table].name(r)} · ${fmtDate(r.expires_at)}`.slice(0, 60), `ls_i:${table}:${r.id}`)]);
    rows.push([Markup.button.callback('⬅️ Orqaga', 'ls_home')]);
    return safeEdit(ctx, `${LT[table].title} — ${mode === 'a' ? 'faol' : 'muddati tugagan'}: ${list.length} ta`, Markup.inlineKeyboard(rows));
  });

  async function showListing(ctx, table, id) {
    const r = await db(table).where({ id }).first();
    const back = [Markup.button.callback('⬅️ Orqaga', `ls_l:${table}:a`)];
    if (!r) return safeEdit(ctx, 'Topilmadi.', Markup.inlineKeyboard([back]));
    const owner = await getUser(r.user_tg);
    const active = Number(r.expires_at) > now();
    const details = table === 'books'
      ? `📚 <b>${esc(r.title)}</b>${r.author ? `\n✍️ ${esc(r.author)}` : ''}${r.price_text ? `\n💵 ${esc(r.price_text)}` : ''}\n📞 ${esc(r.phone)}`
      : `${CENTER_KINDS[r.kind].icon} <b>${esc(r.name)}</b>\n📍 ${esc(r.region)}, ${esc(r.district)}\n📞 ${esc(r.phone)}`;
    const text = `${details}\n\n👤 Egasi: ${owner ? `${esc(owner.first_name)} ${esc(owner.last_name)} (<code>${owner.tg_id}</code>)` : r.user_tg}\n` +
      `📅 Joylangan: ${fmtDate(r.created_at)}\n${active ? `🟢 ${fmtDate(r.expires_at)} gacha` : `🔴 Tugagan: ${fmtDate(r.expires_at)}`}`;
    return safeEdit(ctx, text, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback("📅 Muddatni o'zgartirish", `ls_dt:${table}:${id}`), Markup.button.callback("🗑 O'chirish", `ls_d:${table}:${id}`)],
        back,
      ]),
    });
  }

  adminAction(/^ls_i:(books|centers):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return showListing(ctx, ctx.match[1], Number(ctx.match[2]));
  });

  adminAction(/^ls_dt:(books|centers):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.form = { table: ctx.match[1], id: Number(ctx.match[2]) };
    ctx.session.state = 'adm_ls_days';
    return ctx.reply("📅 Bugundan boshlab necha kun ko'rinsin?\n(0 — hozir to'xtatish)", daysKb());
  });

  adminState('adm_ls_days', async (ctx) => {
    const days = parseAmount(textOf(ctx));
    if (days == null || days > 3650) return ctx.reply('Kunlar sonini kiriting:');
    const { table, id } = ctx.session.form || {};
    const t = now();
    await db(table).where({ id }).update({ expires_at: days ? t + days * DAY : t });
    ctx.session.form = null;
    log(ctx.from.id, `🛠 E'lon ${table}#${id} muddati: ${days} kun`);
    await toPanel(ctx, days ? `✅ E'lon ${fmtDate(t + days * DAY)} gacha ko'rinadi.` : "✅ E'lon to'xtatildi.");
    return ctx.reply("📋 E'lonlar", lsKb());
  });

  adminAction(/^ls_d:(books|centers):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const [, table, id] = ctx.match;
    return safeEdit(ctx, "⚠️ E'lon o'chirilsinmi?", Markup.inlineKeyboard([
      [Markup.button.callback("Ha, o'chirish", `ls_dd:${table}:${id}`), Markup.button.callback("Yo'q", `ls_i:${table}:${id}`)],
    ]));
  });

  adminAction(/^ls_dd:(books|centers):(\d+)$/, async (ctx) => {
    const [, table, id] = ctx.match;
    await db(table).where({ id: Number(id) }).update({ is_active: 0 });
    log(ctx.from.id, `🛠 E'lonni o'chirdi: ${table}#${id}`);
    await ctx.answerCbQuery("🗑 O'chirildi");
    return safeEdit(ctx, "🗑 E'lon o'chirildi.", Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', `ls_l:${table}:a`)]]));
  });
}

module.exports = { register };
