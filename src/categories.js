/**
 * Sinf bo'limlari (test bo'limlari va videodars bo'limlari) — admin boshqaradi.
 * section: 'test' | 'video'. code — variants.category / topics.grp ustunida saqlanadigan kalit.
 * Tez ishlashi uchun xotirada kesh; har bir o'zgarishdan keyin reload() chaqiriladi.
 *
 * Ichki bo'limlar: bo'limning parent_id si bo'lsa, u boshqa bo'lim ichida turadi (bir daraja).
 * Masalan «Prezident maktablariga tayyorgarlik» → «Matematika va mantiqiy masalalar», «Tanqidiy fikrlash».
 * Kesh ro'yxati daraxt tartibida: avval yuqori bo'lim, darhol ostida uning ichki bo'limlari.
 * label — to'liq nom («Ota › Ichki»), name — faqat o'z nomi.
 */
const { db } = require('./db');
const { TEST_CATEGORIES, VIDEO_GROUPS } = require('./constants');

let cache = { test: [], video: [] };

function tree(rows) {
  const tops = rows.filter((r) => !r.parent_id || !rows.some((p) => p.id === r.parent_id));
  const out = [];
  for (const t of tops) {
    out.push({ ...t, parent_id: null, depth: 0, label: t.name });
    for (const c of rows.filter((r) => r.parent_id === t.id)) out.push({ ...c, depth: 1, label: `${t.name} › ${c.name}`, parentActive: !!t.is_active });
  }
  return out;
}

async function reload() {
  const rows = (await db('categories').orderBy([{ column: 'sort' }, { column: 'id' }])).map((r) => ({ ...r, parent_id: r.parent_id ? Number(r.parent_id) : null }));
  cache = { test: tree(rows.filter((r) => r.section === 'test')), video: tree(rows.filter((r) => r.section === 'video')) };
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
// Foydalanuvchiga ko'rinadimi: o'zi va (ichki bo'lim bo'lsa) otasi ham faol
const visible = (c) => !!c.is_active && (!c.parent_id || c.parentActive);
const list = (section, all = false) => cache[section].filter((c) => all || visible(c)).map((c) => ({ ...c }));
const top = (section, all = false) => list(section, all).filter((c) => !c.parent_id);
const children = (section, parentId, all = false) => list(section, all).filter((c) => c.parent_id === Number(parentId));
const find = (section, code) => cache[section].find((c) => c.code === code) || null;
const name = (section, code) => (find(section, code) || {}).label || code;
const byId = (id) => [...cache.test, ...cache.video].find((c) => c.id === Number(id)) || null;

async function create(section, title, parentId = null) {
  const pid = parentId ? Number(parentId) : null;
  const max = cache[section].filter((c) => (c.parent_id || null) === pid).reduce((m, c) => Math.max(m, c.sort), 0);
  const [id] = await db('categories').insert({ section, code: `tmp${Date.now()}`, name: title, sort: max + 10, is_active: 1, parent_id: pid });
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
  const arr = cache[c.section].filter((x) => (x.parent_id || null) === (c.parent_id || null)); // faqat bir xil darajadagilar
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

module.exports = { seed, reload, list, top, children, visible, find, name, byId, create, update, move, remove, contentCount };
