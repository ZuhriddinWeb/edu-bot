/**
 * Mini ilova (Telegram Web App) uchun HTTP server va API.
 * Qo'shimcha kutubxonasiz (node:http). Har bir so'rov Telegram initData imzosi bilan tekshiriladi.
 * Admin qismi faqat botda; mini ilova — foydalanuvchilar uchun.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');
const { db } = require('./db');
const REGIONS = require('./regions');
const { CENTER_KINDS, FEATURES } = require('./constants');
const cats = require('./categories');
const {
  now, esc, money, isAdmin, getUser, getNum, getSetting, isOn, hasAccess, purchasedIds, purchase,
} = require('./utils');
const { log } = require('./logger');
const { isSubscribed } = require('./subscription');
const { canSeeSolutions, sendSolution, sendTestSolution, testSolution } = require('./quiz');
const { leaderboard } = require('./handlers/rating');
const { pickForWebapp } = require('./ads');

const WEBAPP_DIR = path.join(__dirname, '..', 'webapp');
const GRACE_MS = 60 * 1000; // vaqt tugagach javob yuborish uchun qo'shimcha muhlat

// ---------------- Telegram initData tekshiruvi ----------------
function verifyInitData(initData, token) {
  if (!initData) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');
  const dcs = [...params.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const calc = crypto.createHmac('sha256', secret).update(dcs).digest('hex');
  if (calc.length !== hash.length || !crypto.timingSafeEqual(Buffer.from(calc), Buffer.from(hash))) return null;
  const authDate = Number(params.get('auth_date')) * 1000;
  if (!authDate || Date.now() - authDate > 24 * 60 * 60 * 1000) return null;
  try {
    return JSON.parse(params.get('user'));
  } catch (e) {
    return null;
  }
}

// Rasm (Telegram file_id) uchun imzolangan havola — begonalar boshqa fayllarni ocha olmasin
const fileSig = (f) => crypto.createHmac('sha256', config.BOT_TOKEN).update(`file:${f}`).digest('hex').slice(0, 32);
const fileUrl = (f) => (f ? `/api/file?f=${encodeURIComponent(f)}&s=${fileSig(f)}` : null);

class ApiError extends Error {
  constructor(status, code, message, extra) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

function send(res, status, body, headers = {}) {
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(data);
}

function readBody(req, limit = 100 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new ApiError(413, 'too_large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (e) {
        reject(new ApiError(400, 'bad_json'));
      }
    });
    req.on('error', reject);
  });
}

async function auth(req) {
  const tgUser = verifyInitData(req.headers['x-init-data'], config.BOT_TOKEN);
  if (!tgUser) throw new ApiError(401, 'bad_auth', "Mini ilovani Telegram ichidan oching");
  const tg = Number(tgUser.id);
  const u = await getUser(tg);
  const admin = isAdmin(tg);
  if (!u || !u.is_registered) throw new ApiError(403, 'not_registered', "Avval botda ro'yxatdan o'ting");
  if (u.is_blocked && !admin) throw new ApiError(403, 'blocked', 'Hisobingiz bloklangan');
  if (!admin && !(await isOn('bot'))) throw new ApiError(403, 'maintenance', 'Texnik ishlar olib borilmoqda');
  if (!admin && !(await isOn('webapp'))) throw new ApiError(403, 'disabled', "Mini ilova vaqtincha o'chirilgan");
  if (!admin && !(await isSubscribed(botRef.telegram, tg))) throw new ApiError(403, 'not_subscribed', "Mini ilovadan foydalanish uchun kanalimizga obuna bo'ling", { channelUrl: require('./subscription').channel.url });
  if (!u.last_seen || now() - u.last_seen > 5 * 60 * 1000) await db('users').where({ tg_id: tg }).update({ last_seen: now() });
  return { tg, u, admin };
}

async function need(feature, me) {
  if (!me.admin && !(await isOn(feature))) throw new ApiError(403, 'disabled', "Bu bo'lim vaqtincha o'chirilgan");
}

const qCount = async (type, id) => Number((await db('questions').where({ owner_type: type, owner_id: id }).count({ c: '*' }))[0].c);
const wlog = (tg, text) => log(tg, `📱 ${text}`);

let botRef = null;

// ---------------- API ----------------
const routes = {
  'GET /api/me': async (me) => {
    const flags = {};
    for (const k of Object.keys(FEATURES)) flags[k] = me.admin || (await isOn(k));
    const refCount = Number((await db('users').where({ referrer_id: me.tg, is_registered: 1 }).count({ c: '*' }))[0].c);
    const bot = botRef.botInfo ? botRef.botInfo.username : '';
    wlog(me.tg, 'Mini ilovani ochdi');
    return {
      user: { tg_id: me.tg, first_name: me.u.first_name, last_name: me.u.last_name, phone: me.u.phone, balance: me.u.balance },
      admin: me.admin,
      features: flags,
      bot,
      refLink: `https://t.me/${bot}?start=ref_${me.tg}`,
      refCount,
      referralBonus: await getNum('referral_bonus'),
      paymentInfo: await getSetting('payment_info'),
      minTopup: await getNum('min_topup'),
      teacherPrice: await getNum('teacher_test_price'),
      adminUsername: config.ADMIN_USERNAME,
      prices: { book: await getNum('book_price'), center: await getNum('center_price'), bookDays: await getNum('book_days'), centerDays: await getNum('center_days') },
      testCategories: cats.list('test').map((c) => ({ code: c.code, name: c.name })),
      videoGroups: cats.list('video').map((c) => ({ code: c.code, name: c.name })),
      centerKinds: CENTER_KINDS,
      channelUrl: require('./subscription').channel.url,
      ad: await (async () => {
        if (me.admin) return null;
        const a = await pickForWebapp();
        return a ? { text: a.text, photo: a.media_type === 'photo' ? fileUrl(a.media_id) : null, btn_text: a.btn_text, btn_url: a.btn_url } : null;
      })(),
    };
  },

  'GET /api/tests': async (me, q) => {
    await need('tests', me);
    const cat = cats.find('test', q.cat);
    if (!cat || !cat.is_active) throw new ApiError(404, 'not_found');
    wlog(me.tg, `Testlar: ${esc(cat.name)}`);
    const list = await db('variants').where({ category: cat.code, is_active: 1 }).orderBy('id');
    const owned = await purchasedIds(me.tg, 'variant');
    const pdfOwned = await purchasedIds(me.tg, 'pdf');
    return Promise.all(list.map(async (v) => ({
      id: v.id, title: v.title, price: v.price, time_limit: v.time_limit,
      owned: !v.price || me.admin || owned.has(v.id), qcount: await qCount('variant', v.id),
      pdf: v.pdf_id ? { price: v.pdf_price, owned: !v.pdf_price || me.admin || pdfOwned.has(v.id) } : null,
    })));
  },

  'GET /api/videos': async (me, q) => {
    await need('videos', me);
    const g = cats.find('video', q.grp);
    if (!g || !g.is_active) throw new ApiError(404, 'not_found');
    wlog(me.tg, `Videodarslar: ${esc(g.name)}`);
    const list = await db('topics').where({ grp: g.code, is_active: 1 }).orderBy('id');
    const owned = await purchasedIds(me.tg, 'topic');
    return Promise.all(list.map(async (t) => ({
      id: t.id, title: t.title, description: t.description, price: t.price, time_limit: t.time_limit,
      owned: !t.price || me.admin || owned.has(t.id), qcount: await qCount('topic', t.id),
    })));
  },

  'GET /api/topic': async (me, q) => {
    await need('videos', me);
    const t = await db('topics').where({ id: Number(q.id), is_active: 1 }).first();
    if (!t) throw new ApiError(404, 'not_found', 'Mavzu topilmadi');
    const access = await hasAccess(me.tg, 'topic', t);
    wlog(me.tg, `Mavzuni ochdi: ${esc(t.title)}`);
    return {
      id: t.id, title: t.title, description: t.description, price: t.price, time_limit: t.time_limit, owned: access,
      video_type: t.video_type, video_url: access && t.video_type === 'url' ? t.video_ref : null, qcount: await qCount('topic', t.id),
    };
  },

  'POST /api/buy': async (me, q, body) => {
    const type = ['topic', 'pdf'].includes(body.type) ? body.type : 'variant';
    await need(type === 'topic' ? 'videos' : 'tests', me);
    let item = await db(type === 'topic' ? 'topics' : 'variants').where({ id: Number(body.id), is_active: 1 }).first();
    if (!item || (type === 'pdf' && !item.pdf_id)) throw new ApiError(404, 'not_found', 'Topilmadi');
    if (type === 'pdf') item = { id: item.id, price: item.pdf_price, title: `${item.title} (PDF)` };
    const r = await purchase(me.tg, type, item);
    if (r === 'nofunds') throw new ApiError(402, 'nofunds', `Balansda mablag' yetarli emas. Kerak: ${money(item.price)}`);
    if (r === 'ok') wlog(me.tg, `🛒 Sotib oldi: ${esc(item.title)} — ${money(item.price)}`);
    const u = await getUser(me.tg);
    return { status: r, balance: u.balance };
  },

  // Videoni bot orqali chatga yuborish (Telegram videolarini mini ilovada to'g'ridan-to'g'ri ko'rsatib bo'lmaydi)
  'POST /api/topic/send': async (me, q, body) => {
    await need('videos', me);
    const t = await db('topics').where({ id: Number(body.id), is_active: 1 }).first();
    if (!t) throw new ApiError(404, 'not_found');
    if (!(await hasAccess(me.tg, 'topic', t))) throw new ApiError(402, 'not_owned', 'Avval mavzuni sotib oling');
    const extra = { caption: `🎬 <b>${esc(t.title)}</b>`, parse_mode: 'HTML', protect_content: true };
    if (t.video_type === 'video') await botRef.telegram.sendVideo(me.tg, t.video_ref, extra);
    else if (t.video_type === 'document') await botRef.telegram.sendDocument(me.tg, t.video_ref, extra);
    else throw new ApiError(400, 'is_url');
    wlog(me.tg, `🎬 Videoni chatga oldi: ${esc(t.title)}`);
    return { ok: true };
  },

  // Sotib olingan PDFni bot orqali chatga yuborish
  'POST /api/pdf/send': async (me, q, body) => {
    await need('tests', me);
    const v = await db('variants').where({ id: Number(body.id), is_active: 1 }).first();
    if (!v || !v.pdf_id) throw new ApiError(404, 'not_found', 'PDF topilmadi');
    if (!(await hasAccess(me.tg, 'pdf', { id: v.id, price: v.pdf_price }))) throw new ApiError(402, 'not_owned', 'Avval sotib oling');
    await botRef.telegram.sendDocument(me.tg, v.pdf_id, { caption: `📄 <b>${esc(v.title)}</b> — elektron variant`, parse_mode: 'HTML' });
    wlog(me.tg, `📥 PDF oldi: ${esc(v.title)}`);
    return { ok: true };
  },

  'POST /api/quiz/start': async (me, q, body) => {
    const type = ['topic', 'tt'].includes(body.type) ? body.type : 'variant';
    await need(type === 'topic' ? 'videos' : type === 'tt' ? 'teacher' : 'tests', me);
    let item;
    if (type === 'tt') {
      // O'qituvchi testi: kod bo'yicha, bir marta, o'z testini yechib bo'lmaydi
      item = await db('teacher_tests').where({ code: String(body.code || '').toLowerCase(), is_deleted: 0 }).first();
      if (!item) throw new ApiError(404, 'not_found', 'Test topilmadi');
      if (!item.is_open) throw new ApiError(403, 'closed', "Test o'qituvchi tomonidan yopilgan");
      if (Number(item.teacher_tg) === me.tg) throw new ApiError(403, 'own', "Bu sizning testingiz — uni o'quvchilaringiz yechadi");
      if (await db('results').where({ user_tg: me.tg, owner_type: 'tt', owner_id: item.id }).first()) throw new ApiError(409, 'done', 'Siz bu testni allaqachon yechgansiz');
    } else {
      item = await db(type === 'topic' ? 'topics' : 'variants').where({ id: Number(body.id), is_active: 1 }).first();
      if (!item) throw new ApiError(404, 'not_found', 'Topilmadi');
      if (!(await hasAccess(me.tg, type, item))) throw new ApiError(402, 'not_owned', 'Avval sotib oling');
    }
    const qs = await db('questions').where({ owner_type: type, owner_id: item.id }).orderBy('id');
    if (!qs.length) throw new ApiError(400, 'empty', "Bu testga hali savollar qo'shilmagan");
    const t = now();
    const deadline = item.time_limit ? t + item.time_limit * 60000 : null;
    const [attempt] = await db('quiz_attempts').insert({ user_tg: me.tg, owner_type: type, owner_id: item.id, started_at: t, deadline });
    const title = type === 'topic' ? `${item.title} — takrorlash testi` : item.title;
    wlog(me.tg, `▶️ Testni boshladi: ${esc(title)}`);
    return {
      attempt, title, deadline, now: t, reveal: type !== 'tt',
      questions: qs.map((x) => ({ id: x.id, body: x.body, options: JSON.parse(x.options), photo: fileUrl(x.photo_id) })),
    };
  },

  'POST /api/quiz/submit': async (me, q, body) => {
    const a = await db('quiz_attempts').where({ id: Number(body.attempt), user_tg: me.tg }).first();
    if (!a) throw new ApiError(404, 'not_found');
    if (a.finished_at) throw new ApiError(409, 'finished', 'Bu test allaqachon topshirilgan');
    if (a.owner_type === 'tt' && (await db('results').where({ user_tg: me.tg, owner_type: 'tt', owner_id: a.owner_id }).first())) {
      throw new ApiError(409, 'done', 'Siz bu testni allaqachon yechgansiz');
    }
    const t = now();
    const late = a.deadline && t > Number(a.deadline) + GRACE_MS;
    const answers = late ? {} : body.answers || {};
    const qs = await db('questions').where({ owner_type: a.owner_type, owner_id: a.owner_id }).orderBy('id');
    let correct = 0;
    const details = qs.map((x) => {
      const your = Number.isInteger(answers[x.id]) ? answers[x.id] : null;
      if (your === x.correct) correct += 1;
      return { id: x.id, your, correct: x.correct, has_sol: !!x.sol_ref };
    });
    await db('quiz_attempts').where({ id: a.id }).update({ finished_at: t });
    await db('results').insert({ user_tg: me.tg, owner_type: a.owner_type, owner_id: a.owner_id, correct, total: qs.length, created_at: t });
    if (a.owner_type === 'tt') {
      require('./handlers/teacher').notifyTeacher(botRef.telegram, me.tg, a.owner_id, correct, qs.length).catch(() => {});
      wlog(me.tg, `🏁 O'qituvchi testini tugatdi (tt#${a.owner_id}): ${correct}/${qs.length}`);
      const pctT = qs.length ? Math.round((correct / qs.length) * 100) : 0;
      // To'g'ri javoblar ko'rsatilmaydi (boshqalarga tarqalmasligi uchun)
      return { correct, total: qs.length, pct: pctT, late: !!late, reveal: false, test_sol: !!(await testSolution('tt', a.owner_id)), details: details.map((d) => ({ id: d.id, your: d.your })) };
    }
    const cert = await require('./handlers/certs').maybeAward(botRef.telegram, me.tg, a.owner_type, a.owner_id, correct, qs.length);
    const certMin = (await isOn('certs')) ? await require('./handlers/certs').minFor(a.owner_type) : null;
    const pct = qs.length ? Math.round((correct / qs.length) * 100) : 0;
    wlog(me.tg, `🏁 Testni tugatdi (${a.owner_type}#${a.owner_id}): ${correct}/${qs.length} (${pct}%)${late ? ' ⏰ kechikdi' : ''}`);
    return { correct, total: qs.length, pct, late: !!late, reveal: true, test_sol: !!(await testSolution(a.owner_type, a.owner_id)), details, cert, certMin };
  },

  // Butun test uchun bitta video yechim — botga yuboriladi
  'POST /api/solution/test': async (me, q, body) => {
    const type = String(body.type || '');
    const id = Number(body.id);
    if (!['variant', 'topic', 'tt'].includes(type)) throw new ApiError(400, 'bad_input');
    const owner = await testSolution(type, id);
    if (!owner) throw new ApiError(404, 'not_found', "Video yechim yo'q");
    if (!(await canSeeSolutions(me.tg, type, id))) throw new ApiError(403, 'not_solved', 'Avval testni yeching');
    await sendTestSolution(botRef.telegram, me.tg, owner, owner.title);
    wlog(me.tg, `🎥 Test video yechimini oldi (${type}#${id})`);
    return { ok: true, url: owner.sol_type === 'url' ? owner.sol_ref : null };
  },

  'POST /api/solution/send': async (me, q, body) => {
    const row = await db('questions').where({ id: Number(body.id) }).first();
    if (!row || !row.sol_ref) throw new ApiError(404, 'not_found');
    if (!(await canSeeSolutions(me.tg, row.owner_type, row.owner_id))) throw new ApiError(403, 'not_solved', 'Avval testni yeching');
    await sendSolution(botRef.telegram, me.tg, row, body.num);
    wlog(me.tg, `🎥 Video yechimni oldi (savol #${row.id})`);
    return { ok: true, url: row.sol_type === 'url' ? row.sol_ref : null };
  },

  'GET /api/rating': async (me, q) => {
    await need('rating', me);
    const periods = {
      w: () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); },
      m: () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(1); return d.getTime(); },
      a: () => 0,
    };
    const all = await leaderboard((periods[q.p] || periods.w)());
    const top = all.slice(0, 20);
    const users = top.length ? await db('users').whereIn('tg_id', top.map((r) => r.tg)).select('tg_id', 'first_name', 'last_name') : [];
    const byId = new Map(users.map((u) => [Number(u.tg_id), u]));
    const idx = all.findIndex((r) => r.tg === me.tg);
    wlog(me.tg, 'Reytingni ko\'rdi');
    return {
      top: top.map((r) => {
        const u = byId.get(r.tg) || {};
        return { name: `${u.first_name || ''} ${u.last_name ? `${u.last_name[0]}.` : ''}`.trim(), pts: r.pts, tests: r.tests, me: r.tg === me.tg };
      }),
      me: idx >= 0 ? { rank: idx + 1, pts: all[idx].pts, tests: all[idx].tests, total: all.length, next: idx > 0 ? all[idx - 1].pts - all[idx].pts + 1 : 0 } : null,
    };
  },

  'GET /api/books': async (me, q) => {
    await need('books', me);
    const page = Math.max(0, Number(q.page) || 0);
    let base = db('books').where('is_active', 1).andWhere('expires_at', '>', now());
    if (q.q && q.q.trim().length >= 2) {
      const like = `%${q.q.trim().toLowerCase().replace(/[%_]/g, '')}%`;
      base = base.andWhere((w) => w.whereRaw('LOWER(title) LIKE ?', [like]).orWhereRaw('LOWER(author) LIKE ?', [like]));
      wlog(me.tg, `📚 Kitob qidirdi: «${esc(q.q.trim().slice(0, 50))}»`);
    }
    const total = Number((await base.clone().count({ c: '*' }))[0].c);
    const rows = await base.orderBy('id', 'desc').offset(page * 20).limit(20);
    return { total, items: rows.map((b) => ({ id: b.id, title: b.title, author: b.author, price_text: b.price_text, photo: fileUrl(b.photo_id) })) };
  },

  'GET /api/book': async (me, q) => {
    await need('books', me);
    const b = await db('books').where({ id: Number(q.id), is_active: 1 }).andWhere('expires_at', '>', now()).first();
    if (!b) throw new ApiError(404, 'not_found', "E'lon topilmadi");
    wlog(me.tg, `📖 Kitobni ko'rdi: ${esc(b.title)}`);
    return { id: b.id, title: b.title, author: b.author, price_text: b.price_text, description: b.description, phone: b.phone, photo: fileUrl(b.photo_id) };
  },

  'GET /api/regions': async (me) => {
    await need('centers', me);
    return REGIONS;
  },

  'GET /api/centers': async (me, q) => {
    await need('centers', me);
    const kind = q.kind === 'school' ? 'school' : 'center';
    const r = REGIONS[Number(q.ri)];
    if (!r) throw new ApiError(404, 'not_found');
    let base = db('centers').where({ is_active: 1, kind, region: r.name }).andWhere('expires_at', '>', now());
    let place = r.name;
    if (q.di !== undefined && q.di !== 'all' && r.districts[Number(q.di)]) {
      base = base.andWhere({ district: r.districts[Number(q.di)] });
      place += `, ${r.districts[Number(q.di)]}`;
    }
    wlog(me.tg, `🏫 Qidirdi: ${CENTER_KINDS[kind].plural} — ${esc(place)}`);
    const rows = await base.orderBy('id', 'desc').limit(100);
    return rows.map((c) => ({ id: c.id, name: c.name, district: c.district, phone: c.phone }));
  },

  'GET /api/center': async (me, q) => {
    await need('centers', me);
    const c = await db('centers').where({ id: Number(q.id), is_active: 1 }).andWhere('expires_at', '>', now()).first();
    if (!c) throw new ApiError(404, 'not_found', "E'lon topilmadi");
    wlog(me.tg, `🏫 Ko'rdi: ${esc(c.name)}`);
    return { id: c.id, kind: c.kind, name: c.name, region: c.region, district: c.district, phone: c.phone, address: c.address, lat: c.latitude, lon: c.longitude };
  },

  'GET /api/history': async (me) => {
    const rows = await db('transactions').where({ user_tg: me.tg }).orderBy('id', 'desc').limit(30);
    return rows.map((r) => ({ amount: r.amount, type: r.type, note: r.note, at: Number(r.created_at) }));
  },
};

// Qo'shimcha imkoniyatlar (to'ldirish, e'lonlar, o'qituvchilar, sertifikatlar...)
const extra = require('./webappRoutes')({ ApiError, need, wlog, fileUrl, bot: () => botRef, qCount });
Object.assign(routes, extra.routes);
// Admin panel (faqat ADMIN_IDS)
const admin = require('./adminRoutes')({ ApiError, wlog, fileUrl, bot: () => botRef, qCount });
Object.assign(routes, admin.routes);

// Xom faylni o'qish (video/PDF yuklash uchun, 50 MB gacha)
function readRaw(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new ApiError(413, 'too_large', 'Fayl juda katta (50 MB gacha — Telegram cheklovi)')); req.destroy(); } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
// Rasm yuboriladigan so'rovlar uchun kattaroq hajm
const UPLOAD_ROUTES = new Set(['/api/topup', '/api/support', '/api/books/add', '/api/teacher/question']);

// Rasmlarni Telegramdan olib berish (savol rasmlari, kitob rasmlari)
async function serveFile(res, q) {
  if (!q.f || q.s !== fileSig(q.f)) return send(res, 403, { error: 'forbidden' });
  try {
    const link = await botRef.telegram.getFileLink(q.f);
    const r = await fetch(link.href);
    if (!r.ok) return send(res, 404, { error: 'not_found' });
    const buf = Buffer.from(await r.arrayBuffer());
    res.writeHead(200, { 'Content-Type': r.headers.get('content-type') || 'image/jpeg', 'Cache-Control': 'private, max-age=86400' });
    return res.end(buf);
  } catch (e) {
    return send(res, 404, { error: 'not_found' });
  }
}

function serveStatic(res, urlPath) {
  const file = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  // Bitta faylli (bot.js) versiyada sahifa fayl ichiga joylangan
  const embedded = global.__EMBEDDED_FILES && global.__EMBEDDED_FILES[`webapp/${file}`];
  if (embedded != null) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    return res.end(embedded);
  }
  const full = path.join(WEBAPP_DIR, file);
  if (!full.startsWith(WEBAPP_DIR) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
    return send(res, 404, 'Not found', { 'Content-Type': 'text/plain' });
  }
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
  res.writeHead(200, { 'Content-Type': types[path.extname(full)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  return fs.createReadStream(full).pipe(res);
}

function startServer(bot) {
  botRef = bot;
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const q = Object.fromEntries(url.searchParams);
    try {
      // Railway / hosting uchun holat tekshiruvi
      if (url.pathname === '/health') return send(res, 200, { ok: true, uptime: Math.round(process.uptime()) });
      if (req.method === 'GET' && url.pathname === '/api/file') return await serveFile(res, q);
      if (req.method === 'GET' && url.pathname === '/api/cert/img') return await extra.certImage(res, q, send);
      if (!url.pathname.startsWith('/api/')) return serveStatic(res, url.pathname);
      if (req.method === 'POST' && url.pathname === '/api/admin/upload') {
        const me = await auth(req); // avval tekshiramiz, keyin faylni qabul qilamiz
        if (!me.admin) throw new ApiError(403, 'forbidden', 'Faqat adminlar uchun');
        const buf = await readRaw(req, 50 * 1024 * 1024);
        const kind = ['video', 'photo', 'document'].includes(q.kind) ? q.kind : 'document';
        return send(res, 200, await admin.upload(me, kind, String(q.name || 'fayl').slice(0, 200), buf));
      }
      const handler = routes[`${req.method} ${url.pathname}`];
      if (!handler) return send(res, 404, { error: 'not_found' });
      const body = req.method === 'POST' ? await readBody(req, UPLOAD_ROUTES.has(url.pathname) ? 8 * 1024 * 1024 : 100 * 1024) : {};
      const me = await auth(req);
      return send(res, 200, await handler(me, q, body));
    } catch (e) {
      if (e instanceof ApiError) return send(res, e.status, { error: e.message, code: e.code, ...(e.extra || {}) });
      console.error('[webapp]', e);
      return send(res, 500, { error: 'Server xatosi', code: 'server' });
    }
  });
  // '::' — IPv4 va IPv6 (Railway ichki tarmog'i IPv6), bo'lmasa 0.0.0.0
  server.on('error', (e) => {
    if (e.code === 'EAFNOSUPPORT' || e.code === 'EADDRNOTAVAIL') server.listen(config.PORT, '0.0.0.0');
    else console.error('[webapp] server xatosi:', e.message);
  });
  server.listen(config.PORT, '::', () => console.log(`📱 Mini ilova serveri: http://localhost:${config.PORT}  (WEBAPP_URL=${config.WEBAPP_URL || 'berilmagan'})`));
  return server;
}

module.exports = { startServer, verifyInitData };
