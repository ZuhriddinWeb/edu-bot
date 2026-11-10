/**
 * SQLite bazadagi barcha ma'lumotlarni MySQL ga ko'chirish (bir martalik).
 *
 *   node bot.js migrate-sqlite data/bot.sqlite          — MySQL jadvallari bo'sh bo'lsa
 *   node bot.js migrate-sqlite data/bot.sqlite --force  — MySQL dagi eski ma'lumotlarni o'chirib, qayta ko'chiradi
 *
 * MySQL manzili odatdagidek olinadi: MYSQL_URL (Railway'dan tashqarida — MYSQL_PUBLIC_URL qiymatini qo'ying)
 * yoki MYSQLHOST/MYSQLPORT/MYSQLUSER/MYSQLPASSWORD/MYSQLDATABASE.
 */
const fs = require('fs');
const path = require('path');
const knex = require('knex');
const config = require('../config');

// Ko'chirish tartibi (barcha jadvallar)
const TABLES = [
  'users', 'settings', 'categories', 'variants', 'topics', 'questions', 'purchases', 'results',
  'transactions', 'books', 'centers', 'teacher_tests', 'quiz_attempts', 'ads', 'topups', 'certificates',
];

async function run(file, force) {
  if (config.DB_CLIENT !== 'mysql') {
    throw new Error("MySQL sozlanmagan. MYSQL_URL (yoki MYSQLHOST...) ni .env ga yozing. Railway'dan tashqarida MySQL xizmatidagi MYSQL_PUBLIC_URL qiymatini MYSQL_URL sifatida qo'ying.");
  }
  if (!file) throw new Error('SQLite fayl yo\'lini yozing: node bot.js migrate-sqlite data/bot.sqlite');
  const src = path.resolve(file);
  if (!fs.existsSync(src)) throw new Error(`Fayl topilmadi: ${src}`);

  const { db, migrate, waitForDb } = require('../db'); // MySQL (manzil)
  const from = knex({ client: 'better-sqlite3', connection: { filename: src, options: { readonly: true } }, useNullAsDefault: true });

  console.log(`📦 Manba:  ${src}`);
  console.log(`🎯 Manzil: mysql://${config.MYSQL.user}@${config.MYSQL.host}:${config.MYSQL.port}/${config.MYSQL.database}`);
  await waitForDb(5, 3000);
  await migrate(); // MySQL da jadvallar va ustunlar yaratiladi

  // Manzil bo'shmi?
  const filled = [];
  for (const t of TABLES) {
    const n = Number((await db(t).count({ c: '*' }))[0].c);
    if (n) filled.push(`${t} (${n})`);
  }
  if (filled.length && !force) {
    throw new Error(`MySQL da allaqachon ma'lumot bor: ${filled.join(', ')}.\nUstidan yozish uchun oxiriga --force qo'shing (MySQL dagi bu ma'lumotlar o'chadi).`);
  }

  let total = 0;
  for (const t of TABLES) {
    if (!(await from.schema.hasTable(t))) {
      console.log(`  ⏭ ${t}: SQLite da yo'q`);
      continue;
    }
    const rows = await from(t).select('*');
    // Faqat MySQL jadvalida bor ustunlarni olamiz (eski/yangi versiya farqi uchun)
    const info = await db(t).columnInfo();
    const cols = Object.keys(info);
    const clean = rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => cols.includes(k))));
    await db.transaction(async (trx) => {
      if (force) await trx(t).del();
      for (let i = 0; i < clean.length; i += 300) await trx(t).insert(clean.slice(i, i + 300));
    });
    console.log(`  ✅ ${t}: ${clean.length}`);
    total += clean.length;
  }

  await from.destroy();
  await db.destroy();
  console.log(`\n🎉 Tayyor! Jami ${total} ta yozuv ko'chirildi. Endi botni MySQL bilan ishga tushiring.`);
}

module.exports = { run, TABLES };
