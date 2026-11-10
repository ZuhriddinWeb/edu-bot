const { db } = require('./db');
const config = require('./config');
const { DEFAULT_SETTINGS } = require('./constants');

const DAY = 24 * 60 * 60 * 1000;
const now = () => Date.now();

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const money = (n) => `${String(Math.trunc(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so'm`;

const pad = (n) => String(n).padStart(2, '0');
const fmtDate = (ms) => {
  const d = new Date(Number(ms));
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};

const isAdmin = (id) => config.ADMIN_IDS.includes(Number(id));

const getUser = (tgId) => db('users').where({ tg_id: tgId }).first();

// "12 000", "12000 so'm" -> 12000 ; noto'g'ri bo'lsa null
const parseAmount = (text, { allowNegative = false } = {}) => {
  if (!text) return null;
  const clean = String(text).replace(/[\s,_]/g, '').replace(/so'?m$/i, '');
  if (!(allowNegative ? /^-?\d+$/ : /^\d+$/).test(clean)) return null;
  return parseInt(clean, 10);
};

// ---------- Sozlamalar ----------
// Har bir so'rovda bazaga murojaat qilmaslik uchun 5 soniyalik kesh
let cache = null;
let cacheAt = 0;
async function allSettings() {
  if (!cache || Date.now() - cacheAt > 5000) {
    const rows = await db('settings').select('name', 'value');
    cache = { ...DEFAULT_SETTINGS };
    for (const r of rows) cache[r.name] = r.value;
    cacheAt = Date.now();
  }
  return cache;
}
async function getSetting(name) {
  return (await allSettings())[name];
}
async function getNum(name) {
  return Number(await getSetting(name)) || 0;
}
async function setSetting(name, value) {
  const exists = await db('settings').where({ name }).first();
  if (exists) await db('settings').where({ name }).update({ value });
  else await db('settings').insert({ name, value });
  cache = null;
}
// Bo'lim yoqilganmi
async function isOn(feature) {
  return (await getSetting(`f_${feature}`)) !== '0';
}

// ---------- Balans ----------
async function addBalance(tgId, amount, type, note) {
  await db.transaction(async (trx) => {
    await trx('users').where({ tg_id: tgId }).increment('balance', amount);
    await trx('transactions').insert({ user_tg: tgId, amount, type, note: (note || '').slice(0, 250), created_at: now() });
  });
}

/**
 * Balansdan pul yechish (atomar). `extra(trx)` shu tranzaksiya ichida bajariladi
 * (masalan, e'lonni yozish). Natija: 'ok' | 'nofunds' | extra qaytargan qiymat.
 */
async function charge(tgId, amount, type, note, extra) {
  return db.transaction(async (trx) => {
    if (amount > 0) {
      const n = await trx('users').where('tg_id', tgId).andWhere('balance', '>=', amount).decrement('balance', amount);
      if (!n) return 'nofunds';
      await trx('transactions').insert({ user_tg: tgId, amount: -amount, type, note: (note || '').slice(0, 250), created_at: now() });
    }
    if (extra) {
      const r = await extra(trx);
      if (r) return r;
    }
    return 'ok';
  });
}

// ---------- Kontentga ruxsat ----------
const ITEM_TABLE = { variant: 'variants', topic: 'topics' };
// Video yechim egasining jadvali (o'qituvchi testlari ham)
const OWNER_TABLE = { variant: 'variants', topic: 'topics', tt: 'teacher_tests' };

async function hasAccess(tgId, type, item) {
  if (!item.price || isAdmin(tgId)) return true;
  const p = await db('purchases').where({ user_tg: tgId, item_type: type, item_id: item.id }).first();
  return !!p;
}

async function purchasedIds(tgId, type) {
  const rows = await db('purchases').where({ user_tg: tgId, item_type: type }).select('item_id');
  return new Set(rows.map((r) => r.item_id));
}

async function purchase(tgId, type, item) {
  if (await hasAccess(tgId, type, item)) return 'owned';
  try {
    return await charge(tgId, item.price, 'purchase', `${type}#${item.id}: ${item.title}`, async (trx) => {
      await trx('purchases').insert({ user_tg: tgId, item_type: type, item_id: item.id, amount: item.price, created_at: now() });
    });
  } catch (e) {
    // unique cheklovi: ikki marta bosilgan bo'lsa
    if (/unique|duplicate/i.test(e.message)) return 'owned';
    throw e;
  }
}

const itemLabel = (item, bought) => {
  if (!item.price) return `🆓 ${item.title}`;
  if (bought.has(item.id)) return `✅ ${item.title}`;
  return `🔒 ${item.title} — ${money(item.price)}`;
};

// ---------- Telegram yordamchilari ----------
async function safeEdit(ctx, text, extra = {}) {
  try {
    return await ctx.editMessageText(text, extra);
  } catch (e) {
    if (/message is not modified/.test(e.message)) return null;
    return ctx.reply(text, extra);
  }
}

const userHeader = (u) =>
  `👤 <b>${esc(u.first_name)} ${esc(u.last_name)}</b>\n` +
  `📞 ${esc(u.phone)}\n` +
  `🆔 <code>${u.tg_id}</code>\n` +
  `💰 Balans: <b>${money(u.balance)}</b>`;

const fmtTime = (ms) => {
  const d = new Date(Number(ms));
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
const mmss = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
};

const textOf = (ctx) => (ctx.message && typeof ctx.message.text === 'string' ? ctx.message.text.trim() : null);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = {
  DAY, now, esc, money, fmtDate, isAdmin, getUser, parseAmount,
  allSettings, getSetting, getNum, setSetting, isOn, addBalance, charge,
  ITEM_TABLE, OWNER_TABLE, hasAccess, purchasedIds, purchase, itemLabel,
  safeEdit, userHeader, textOf, sleep, fmtTime, mmss,
};
