/**
 * Reklama: admin joylaydi (matn / rasm / video + ixtiyoriy tugma), muddati bilan.
 * Foydalanuvchiga menyu ochganda ko'rsatiladi, lekin har ad_interval_hours soatda bir martadan ko'p emas.
 * Bir nechta faol reklama bo'lsa, eng kam ko'rsatilgani tanlanadi (navbat bilan aylanadi).
 */
const { Markup } = require('telegraf');
const { db } = require('./db');
const { now, isAdmin, isOn, getNum } = require('./utils');
const { log } = require('./logger');

const activeQuery = () => {
  const t = now();
  return db('ads').where('is_active', 1).andWhere('starts_at', '<=', t).andWhere('ends_at', '>', t);
};

function adExtra(ad, extraRows = []) {
  const rows = [];
  if (ad.btn_text && ad.btn_url) rows.push([Markup.button.url(ad.btn_text, ad.btn_url)]);
  return rows.length || extraRows.length ? Markup.inlineKeyboard([...rows, ...extraRows]) : {};
}

/** Reklamani chatga yuborish (ctx.reply... orqali — chat tozalagich uni ham kuzatadi) */
async function sendAd(ctx, ad, extraRows = []) {
  const text = ad.text || '';
  const extra = adExtra(ad, extraRows);
  if (ad.media_type === 'photo') return ctx.replyWithPhoto(ad.media_id, { caption: text.slice(0, 1024), ...extra });
  if (ad.media_type === 'video') return ctx.replyWithVideo(ad.media_id, { caption: text.slice(0, 1024), ...extra });
  return ctx.reply(text || '📣', { link_preview_options: { is_disabled: false }, ...extra });
}

/** Menyu ochilganda chaqiriladi: vaqti kelgan bo'lsa bitta reklama ko'rsatadi */
async function maybeShow(ctx) {
  try {
    if (!ctx.from || isAdmin(ctx.from.id) || !(await isOn('ads'))) return;
    const u = ctx.user;
    if (!u || !u.is_registered) return;
    const interval = Math.max(0, await getNum('ad_interval_hours')) * 60 * 60 * 1000;
    if (u.last_ad_at && now() - Number(u.last_ad_at) < interval) return;
    const ad = await activeQuery().orderBy([{ column: 'shows', order: 'asc' }, { column: 'id', order: 'asc' }]).first();
    if (!ad) return;
    await db('users').where({ tg_id: u.tg_id }).update({ last_ad_at: now() });
    u.last_ad_at = now();
    await db('ads').where({ id: ad.id }).increment('shows', 1);
    await sendAd(ctx, ad);
    log(u.tg_id, `📣 Reklama ko'rsatildi #${ad.id}`);
  } catch (e) {
    console.error('[ads]', e.message);
  }
}

/** Mini ilova bosh sahifasi uchun bitta faol reklama (matn yoki rasm; video botda ko'rsatiladi) */
async function pickForWebapp() {
  if (!(await isOn('ads'))) return null;
  const list = (await activeQuery()).filter((a) => a.media_type !== 'video');
  return list.length ? list[Math.floor(Math.random() * list.length)] : null;
}

module.exports = { activeQuery, sendAd, maybeShow, pickForWebapp };
