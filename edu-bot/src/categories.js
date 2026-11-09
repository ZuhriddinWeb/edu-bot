/**
 * Sinf bo'limlari (test bo'limlari va videodars bo'limlari) — admin boshqaradi.
 * section: 'test' | 'video'. code — variants.category / topics.grp ustunida saqlanadigan kalit.
 * Tez ishlashi uchun xotirada kesh; har bir o'zgarishdan keyin reload() chaqiriladi.
 */
const { db } = require('./db');
const { TEST_CATEGORIES, VIDEO_GROUPS } = require('./constants');

let cache = { test: [], video: [] };

async function reload() {
  const rows = await db('categories').orderBy([{ column: 'sort' }, { column: 'id' }]);
  cache = { test: rows.filter((r) => r.section === 'test'), video: rows.filter((r) => r.section === 'video') };
}

// Birinchi ishga tushishda boshlang'ich bo'limlarni yozish
async function seed() {
  const n = Number((await db('categories').count({ c: '*' }))[0].c);
  if (!n) {
    const rows = [
      ...TEST_CATEGORIES.map((c, i) => ({ section: 'test', code: c.code, name: c.name, sort: (i + 1) * 10, is_active: 1 })),
      ...VIDEO_GROUPS.map((c, i) => ({ section: 'video', code: c.code, name: c.name, sort: (i + 1) * 10, is_active: 1 })),
    ];
    await db('categories').insert(rows);
    console.log("[db] boshlang'ich sinf bo'limlari yozildi");
  }
  await reload();
}

/** Bo'limlar ro'yxati. all=false — faqat foydalanuvchiga ko'rinadiganlari */
const list = (section, all = false) => cache[section].filter((c) => all || c.is_active).map((c) => ({ ...c }));
const find = (section, code) => cache[section].find((c) => c.code === code) || null;
const name = (section, code) => (find(section, code) || {}).name || code;
const byId = (id) => [...cache.test, ...cache.video].find((c) => c.id === Number(id)) || null;

async function create(section, title) {
  const max = cache[section].reduce((m, c) => Math.max(m, c.sort), 0);
  const [id] = await db('categories').insert({ section, code: `tmp${Date.now()}`, name: title, sort: max + 10, is_active: 1 });
  await db('categories').where({ id }).update({ code: `k${id}` }); // noyob, o'zgarmas kalit
  await reload();
  return id;
}

async function update(id, fields) {
  await db('categories').where({ id }).update(fields);
  await reload();
}

// Tartibni o'zgartirish: qo'shni bo'lim bilan joy almashtirish
async function move(id, dir) {
  const c = byId(id);
  if (!c) return;
  const arr = cache[c.section];
  const i = arr.findIndex((x) => x.id === c.id);
  const j = i + dir;
  if (j < 0 || j >= arr.length) return;
  // tartib raqamlarini qayta tiklab, keyin almashtiramiz
  const order = arr.map((x) => x.id);
  [order[i], order[j]] = [order[j], order[i]];
  await db.transaction(async (trx) => {
    for (let k = 0; k < order.length; k += 1) await trx('categories').where({ id: order[k] }).update({ sort: (k + 1) * 10 });
  });
  await reload();
}

async function contentCount(c) {
  const table = c.section === 'test' ? 'variants' : 'topics';
  const col = c.section === 'test' ? 'category' : 'grp';
  return Number((await db(table).where({ [col]: c.code }).count({ c: '*' }))[0].c);
}

async function remove(id) {
  await db('categories').where({ id }).del();
  await reload();
}

module.exports = { seed, reload, list, find, name, byId, create, update, move, remove, contentCount };
