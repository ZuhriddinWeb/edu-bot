/**
 * 👤 Ism-familiyani o'zgartirish (bot va mini ilova uchun umumiy mantiq).
 *
 * Qoidalar:
 *  • Foydalanuvchi ismini `name_change_days` (standart 30) kunda bir marta o'zgartira oladi.
 *    Admin bu muddatni sozlamalardan o'zgartiradi (0 — cheklovsiz).
 *  • Admin istalgan foydalanuvchining ismini istalgan payt o'zgartira oladi
 *    (bu foydalanuvchining 30 kunlik muddatini boshlamaydi).
 *  • Sertifikatlarda ism berilgan paytdagi holatida muhrlanadi (certificates.cert_name),
 *    keyingi o'zgarishlar eski sertifikatlarga ta'sir qilmaydi.
 *  • Har bir o'zgarish log kanaliga «eski → yangi» ko'rinishida yoziladi.
 */
const { db } = require('./db');
const { DAY, now, getNum, getUser, fmtDate, esc } = require('./utils');
const { log } = require('./logger');

const fullName = (u) => `${(u && u.first_name) || ''} ${(u && u.last_name) || ''}`.trim();

// Ism/familiya tekshiruvi (ro'yxatdan o'tishdagi bilan bir xil)
const clean = (t) => String(t || '').replace(/\s+/g, ' ').trim();
const validName = (t) => t.length >= 2 && t.length <= 50 && !t.startsWith('/') && !/[<>]/.test(t);

// Keyingi o'zgartirish mumkin bo'lgan vaqt (ms). 0 — hozir mumkin.
async function nextChangeAt(u) {
  const days = await getNum('name_change_days');
  if (!days || !u || !u.name_changed_at) return 0;
  const at = Number(u.name_changed_at) + days * DAY;
  return at > now() ? at : 0;
}

/**
 * Ismni o'zgartiradi. Natija: { ok: true, old, name } yoki { error: 'matn' }.
 * byAdmin — admin ID si (admin o'zgartirsa muddat cheklovi yo'q).
 */
async function changeName(tg, first, last, byAdmin = null) {
  const f = clean(first);
  const l = clean(last);
  if (!validName(f)) return { error: "Ism 2–50 ta harfdan iborat bo'lsin" };
  if (!validName(l)) return { error: "Familiya 2–50 ta harfdan iborat bo'lsin" };
  const u = await getUser(tg);
  if (!u) return { error: 'Foydalanuvchi topilmadi' };
  if (!byAdmin) {
    const next = await nextChangeAt(u);
    if (next) return { error: `Ismni ${fmtDate(next)} dan keyin yana o'zgartirish mumkin` };
  }
  const old = fullName(u);
  const name = `${f} ${l}`;
  if (old === name) return { error: 'Yangi ism hozirgisi bilan bir xil' };
  const patch = { first_name: f, last_name: l };
  if (!byAdmin) patch.name_changed_at = now();
  await db('users').where({ tg_id: tg }).update(patch);
  log(byAdmin || tg, byAdmin
    ? `✏️ Admin foydalanuvchi ${tg} ismini o'zgartirdi: ${esc(old)} → ${esc(name)}`
    : `✏️ Ismini o'zgartirdi: ${esc(old)} → ${esc(name)}`);
  return { ok: true, old, name };
}

module.exports = { fullName, nextChangeAt, changeName, validName, clean };
