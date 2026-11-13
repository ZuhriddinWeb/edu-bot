const fs = require('fs');
const path = require('path');
const knex = require('knex');
const config = require('./config');

const isMysql = config.DB_CLIENT === 'mysql';

function makeKnex() {
  if (isMysql) {
    return knex({
      client: 'mysql2',
      connection: {
        ...config.MYSQL,
        charset: 'utf8mb4',
        supportBigNumbers: true, // Telegram ID lar (BIGINT) to'g'ri o'qilishi uchun
        decimalNumbers: true, // SUM() natijalari raqam bo'lib qaytsin
        connectTimeout: 20000,
      },
      pool: { min: 0, max: 10 },
    });
  }
  const file = path.resolve(config.SQLITE_FILE);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return knex({ client: 'better-sqlite3', connection: { filename: file }, useNullAsDefault: true });
}

// Baza tayyor bo'lguncha kutish (Railway'da MySQL botdan keyin ishga tushishi mumkin)
async function waitForDb(tries = 15, delayMs = 4000) {
  for (let i = 1; i <= tries; i += 1) {
    try {
      await db.raw('select 1');
      return;
    } catch (e) {
      const where = isMysql ? `${config.MYSQL.host}:${config.MYSQL.port}/${config.MYSQL.database}` : config.SQLITE_FILE;
      console.error(`[db] ulanib bo'lmadi (${i}/${tries}) ${where}: ${e.code || ''} ${e.message}`);
      if (i === tries) throw e;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

const db = makeKnex();

async function createIfMissing(name, build) {
  if (await db.schema.hasTable(name)) return;
  await db.schema.createTable(name, (t) => {
    build(t);
    if (isMysql) {
      t.charset('utf8mb4');
      t.collate('utf8mb4_unicode_ci');
    }
  });
  console.log(`[db] jadval yaratildi: ${name}`);
}

// Jadvallar SQLite va MySQL da bir xil ishlaydi.
// Vaqtlar millisekundlarda (Date.now()) bigInteger sifatida saqlanadi.
async function migrate() {
  await createIfMissing('users', (t) => {
    t.increments('id');
    t.bigInteger('tg_id').notNullable().unique();
    t.string('username', 64);
    t.string('first_name', 100);
    t.string('last_name', 100);
    t.string('phone', 32);
    t.integer('balance').notNullable().defaultTo(0);
    t.bigInteger('referrer_id').nullable().index();
    t.integer('is_registered').notNullable().defaultTo(0);
    t.bigInteger('created_at');
  });

  await createIfMissing('settings', (t) => {
    t.string('name', 64).primary();
    t.text('value');
  });

  // Test variantlari (2-bo'lim)
  await createIfMissing('variants', (t) => {
    t.increments('id');
    t.string('category', 20).notNullable().index();
    t.string('title', 200).notNullable();
    t.integer('price').notNullable().defaultTo(0);
    t.integer('is_active').notNullable().defaultTo(1);
    t.bigInteger('created_at');
  });

  // Video mavzular (3-bo'lim)
  await createIfMissing('topics', (t) => {
    t.increments('id');
    t.string('grp', 20).notNullable().index();
    t.string('title', 200).notNullable();
    t.text('description');
    t.string('video_type', 10); // video | document | url
    t.text('video_ref');
    t.integer('price').notNullable().defaultTo(0);
    t.integer('is_active').notNullable().defaultTo(1);
    t.bigInteger('created_at');
  });

  // Savollar: variant yoki mavzuga tegishli
  await createIfMissing('questions', (t) => {
    t.increments('id');
    t.string('owner_type', 10).notNullable(); // variant | topic
    t.integer('owner_id').notNullable();
    t.text('body').notNullable();
    t.text('options').notNullable(); // JSON massiv
    t.integer('correct').notNullable();
    t.bigInteger('created_at');
    t.index(['owner_type', 'owner_id']);
  });

  await createIfMissing('purchases', (t) => {
    t.increments('id');
    t.bigInteger('user_tg').notNullable();
    t.string('item_type', 10).notNullable();
    t.integer('item_id').notNullable();
    t.integer('amount').notNullable().defaultTo(0);
    t.bigInteger('created_at');
    t.unique(['user_tg', 'item_type', 'item_id']);
  });

  await createIfMissing('results', (t) => {
    t.increments('id');
    t.bigInteger('user_tg').notNullable().index();
    t.string('owner_type', 10).notNullable();
    t.integer('owner_id').notNullable();
    t.integer('correct').notNullable();
    t.integer('total').notNullable();
    t.bigInteger('created_at');
  });

  await createIfMissing('transactions', (t) => {
    t.increments('id');
    t.bigInteger('user_tg').notNullable().index();
    t.integer('amount').notNullable();
    t.string('type', 20).notNullable(); // referral | admin | purchase | book | center
    t.string('note', 255);
    t.bigInteger('created_at');
  });

  await createIfMissing('books', (t) => {
    t.increments('id');
    t.bigInteger('user_tg').notNullable().index();
    t.string('title', 200).notNullable();
    t.string('author', 200);
    t.string('price_text', 100);
    t.text('description');
    t.string('phone', 64);
    t.string('photo_id', 255);
    t.integer('is_active').notNullable().defaultTo(1);
    t.bigInteger('expires_at').notNullable().index();
    t.bigInteger('created_at');
  });

  // O'qituvchi tuzgan testlar (savollari questions jadvalida owner_type='tt')
  await createIfMissing('teacher_tests', (t) => {
    t.increments('id');
    t.bigInteger('teacher_tg').notNullable().index();
    t.string('code', 16).notNullable().unique();
    t.string('title', 200).notNullable();
    t.integer('is_open').notNullable().defaultTo(1);
    t.integer('is_deleted').notNullable().defaultTo(0);
    t.bigInteger('created_at');
  });

  // Sinf bo'limlari (admin boshqaradi)
  await createIfMissing('categories', (t) => {
    t.increments('id');
    t.string('section', 10).notNullable(); // test | video
    t.string('code', 20).notNullable();
    t.string('name', 100).notNullable();
    t.integer('sort').notNullable().defaultTo(0);
    t.integer('is_active').notNullable().defaultTo(1);
    t.unique(['section', 'code']);
  });

  // Reklamalar (admin joylaydi, muddati bilan)
  await createIfMissing('ads', (t) => {
    t.increments('id');
    t.text('text');
    t.string('media_type', 10); // photo | video | null
    t.string('media_id', 255);
    t.string('btn_text', 64);
    t.string('btn_url', 500);
    t.bigInteger('starts_at').notNullable();
    t.bigInteger('ends_at').notNullable().index();
    t.integer('is_active').notNullable().defaultTo(1);
    t.integer('shows').notNullable().defaultTo(0);
    t.bigInteger('created_at');
  });

  // Balansni to'ldirish so'rovlari (admin tasdiqlaydi yoki rad etadi)
  await createIfMissing('topups', (t) => {
    t.increments('id');
    t.bigInteger('user_tg').notNullable().index();
    t.integer('amount').notNullable();
    t.string('status', 10).notNullable().defaultTo('pending'); // pending | approved | rejected
    t.string('reason', 500);
    t.bigInteger('admin_tg');
    t.text('admin_msgs'); // [[chatId, msgId], ...]
    t.bigInteger('created_at');
    t.bigInteger('decided_at');
  });

  // Berilgan sertifikatlar (har bir test/mavzu uchun bittadan; yaxshiroq natijada yangilanadi)
  await createIfMissing('certificates', (t) => {
    t.increments('id');
    t.bigInteger('user_tg').notNullable().index();
    t.string('owner_type', 10).notNullable();
    t.integer('owner_id').notNullable();
    t.string('title', 255).notNullable();
    t.integer('correct').notNullable();
    t.integer('total').notNullable();
    t.bigInteger('created_at');
    t.unique(['user_tg', 'owner_type', 'owner_id']);
  });

  // Mini ilovadagi test urinishlari (vaqt nazorati server tomonda)
  await createIfMissing('quiz_attempts', (t) => {
    t.increments('id');
    t.bigInteger('user_tg').notNullable().index();
    t.string('owner_type', 10).notNullable();
    t.integer('owner_id').notNullable();
    t.bigInteger('started_at');
    t.bigInteger('deadline');
    t.bigInteger('finished_at');
  });

  await createIfMissing('centers', (t) => {
    t.increments('id');
    t.bigInteger('user_tg').notNullable().index();
    t.string('kind', 10).notNullable(); // center | school
    t.string('region', 64).notNullable();
    t.string('district', 64).notNullable();
    t.string('name', 200).notNullable();
    t.string('phone', 64);
    t.string('address', 255);
    t.double('latitude');
    t.double('longitude');
    t.integer('is_active').notNullable().defaultTo(1);
    t.bigInteger('expires_at').notNullable().index();
    t.bigInteger('created_at');
    t.index(['kind', 'region', 'district']);
  });

  // Oldingi versiyadan yangilanganlar uchun yangi ustunlar
  await addColumn('users', 'is_blocked', (t) => t.integer('is_blocked').notNullable().defaultTo(0));
  await addColumn('users', 'last_seen', (t) => t.bigInteger('last_seen'));
  // Butun test uchun bitta video yechim (har savolga alohida emas)
  for (const tbl of ['variants', 'topics', 'teacher_tests']) {
    await addColumn(tbl, 'sol_type', (t) => t.string('sol_type', 10));
    await addColumn(tbl, 'sol_ref', (t) => t.text('sol_ref'));
  }
  await addColumn('topups', 'receipt_id', (t) => t.string('receipt_id', 255));
  await addColumn('users', 'last_ad_at', (t) => t.bigInteger('last_ad_at'));
  // Ismni oxirgi marta o'zgartirgan vaqt (30 kunda bir marta cheklovi uchun)
  // Ichki bo'limlar (masalan, «Prezident maktablari» ichida «Tanqidiy fikrlash»)
  await addColumn('categories', 'parent_id', (t) => t.integer('parent_id'));
  await addColumn('users', 'name_changed_at', (t) => t.bigInteger('name_changed_at'));
  // Sertifikat berilgan paytdagi ism (keyingi ism o'zgarishi sertifikatga ta'sir qilmaydi)
  await addColumn('certificates', 'cert_name', (t) => t.string('cert_name', 120));
  // Eski sertifikatlarga hozirgi ismni muhrlab qo'yamiz (bir marta)
  const noName = await db('certificates').whereNull('cert_name').select('id', 'user_tg');
  for (const c of noName) {
    const u = await db('users').where({ tg_id: c.user_tg }).first();
    if (u) await db('certificates').where({ id: c.id }).update({ cert_name: `${u.first_name || ''} ${u.last_name || ''}`.trim().slice(0, 120) });
  }
  await addColumn('questions', 'photo_id', (t) => t.string('photo_id', 255));
  await addColumn('questions', 'sol_type', (t) => t.string('sol_type', 10)); // video | document | url
  await addColumn('questions', 'sol_ref', (t) => t.text('sol_ref'));
  await addColumn('variants', 'time_limit', (t) => t.integer('time_limit').notNullable().defaultTo(0)); // daqiqa
  await addColumn('topics', 'time_limit', (t) => t.integer('time_limit').notNullable().defaultTo(0));
  // Testning elektron varianti (PDF) — alohida sotiladi
  await addColumn('variants', 'pdf_id', (t) => t.string('pdf_id', 255));
  await addColumn('variants', 'pdf_name', (t) => t.string('pdf_name', 255));
  await addColumn('variants', 'pdf_price', (t) => t.integer('pdf_price').notNullable().defaultTo(0));
  await addColumn('teacher_tests', 'time_limit', (t) => t.integer('time_limit').notNullable().defaultTo(0));
}

async function addColumn(table, column, build) {
  if (await db.schema.hasColumn(table, column)) return;
  await db.schema.alterTable(table, build);
  console.log(`[db] ustun qo'shildi: ${table}.${column}`);
}

module.exports = { db, migrate, waitForDb, isMysql };
