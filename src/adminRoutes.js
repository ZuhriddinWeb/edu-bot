/**
 * Mini ilova — ADMIN PANEL API. Barcha so'rovlar faqat ADMIN_IDS dagi foydalanuvchilar uchun.
 * Botdagi admin panel ham ishlayveradi (zaxira); ikkalasi bir xil baza va mantiqdan foydalanadi.
 */
const { db } = require('./db');
const cats = require('./categories');
const REGIONS = require('./regions');
const { DEFAULT_SETTINGS, SETTING_HELP, FEATURES, CENTER_KINDS } = require('./constants');
const {
  now, DAY, esc, money, fmtDate, getUser, getSetting, setSetting, isOn, isAdmin, addBalance, sleep, ITEM_TABLE,
} = require('./utils');

const TX_NAMES = { referral: "Do'st taklifi", welcome: 'Start bonusi', admin: "To'ldirish / admin", purchase: 'Xarid', book: "Kitob e'loni", center: "Markaz e'loni", teacher: "O'qituvchi testi" };

module.exports = (h) => {
  const { ApiError, wlog, fileUrl, bot, qCount } = h;
  const cnt = async (q) => Number((await q.count({ c: '*' }))[0].c);
  const sum = async (q, col = 'amount') => Number((await q.sum({ s: col }))[0].s) || 0;
  const mustAdmin = (me) => { if (!me.admin) throw new ApiError(403, 'forbidden', "Bu bo'lim faqat adminlar uchun"); };
  const str = (v, max, name, required = true) => {
    const s = (v == null ? '' : String(v)).trim();
    if (required && !s) throw new ApiError(400, 'bad_input', `${name} kiritilmagan`);
    if (s.length > max) throw new ApiError(400, 'bad_input', `${name} juda uzun (${max} belgigacha)`);
    return s;
  };
  const int = (v, name, min = 0, max = 1e9) => {
    const n = parseInt(String(v).replace(/[\s,_]/g, ''), 10);
    if (!Number.isFinite(n) || n < min || n > max) throw new ApiError(400, 'bad_input', `${name}: ${min}–${max} oralig'idagi raqam kiriting`);
    return n;
  };
  const sectionOf = (type) => (type === 'variant' ? 'test' : 'video');
  const groupCol = (type) => (type === 'variant' ? 'category' : 'grp');
  const typeOf = (v) => (v === 'topic' ? 'topic' : 'variant');

  const routes = {
    // ================= Statistika =================
    'GET /api/admin/stats': async (me) => {
      mustAdmin(me);
      const t = now();
      const [users, regs, today, active, blocked, refs, vars, tops, qs, tts, books, centers, buys, tests24, pending, certs, ads] = await Promise.all([
        cnt(db('users')), cnt(db('users').where('is_registered', 1)), cnt(db('users').where('created_at', '>', t - DAY)),
        cnt(db('users').where('last_seen', '>', t - DAY)), cnt(db('users').where('is_blocked', 1)),
        cnt(db('users').whereNotNull('referrer_id').andWhere('is_registered', 1)),
        cnt(db('variants').where('is_active', 1)), cnt(db('topics').where('is_active', 1)), cnt(db('questions')),
        cnt(db('teacher_tests').where('is_deleted', 0)),
        cnt(db('books').where('is_active', 1).andWhere('expires_at', '>', t)), cnt(db('centers').where('is_active', 1).andWhere('expires_at', '>', t)),
        cnt(db('purchases')), cnt(db('results').where('created_at', '>', t - DAY)), cnt(db('topups').where({ status: 'pending' })),
        cnt(db('certificates')), cnt(require('./ads').activeQuery()),
      ]);
      return {
        users, regs, today, active, blocked, refs, vars, tops, qs, tts, books, centers, buys, tests24, pending, certs, ads,
        topups: await sum(db('transactions').where('type', 'admin').andWhere('amount', '>', 0)),
        spent: -(await sum(db('transactions').where('amount', '<', 0))),
        bonus: await sum(db('transactions').whereIn('type', ['referral', 'welcome'])),
        balance: await sum(db('users'), 'balance'),
      };
    },

    // ================= Foydalanuvchilar =================
    'GET /api/admin/users': async (me, q) => {
      mustAdmin(me);
      let query = db('users');
      const s = String(q.q || '').trim();
      if (q.mode === 'blocked') query = query.where('is_blocked', 1);
      else if (s) {
        const digits = s.replace(/[\s\-()+]/g, '');
        if (/^\d{5,15}$/.test(digits)) query = query.where('tg_id', Number(digits)).orWhere('phone', 'like', `%${digits.slice(-9)}`);
        else {
          const like = `%${s.toLowerCase().replace(/[%_]/g, '')}%`;
          query = query.whereRaw('LOWER(first_name) LIKE ?', [like]).orWhereRaw('LOWER(last_name) LIKE ?', [like]).orWhereRaw('LOWER(username) LIKE ?', [like]);
        }
      } else query = query.where('is_registered', 1);
      const rows = await query.orderBy('id', 'desc').limit(40);
      return rows.map((u) => ({ tg: Number(u.tg_id), name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || "(ro'yxatdan o'tmagan)", phone: u.phone, balance: u.balance, blocked: !!u.is_blocked }));
    },

    'GET /api/admin/user': async (me, q) => {
      mustAdmin(me);
      const tg = Number(q.tg);
      const u = await getUser(tg);
      if (!u) throw new ApiError(404, 'not_found', 'Foydalanuvchi topilmadi');
      const tx = await db('transactions').where({ user_tg: tg }).orderBy('id', 'desc').limit(20);
      const res = await db('results').where({ user_tg: tg }).orderBy('id', 'desc').limit(20);
      const names = {};
      for (const r of res) {
        const k = `${r.owner_type}:${r.owner_id}`;
        if (!names[k]) {
          const table = r.owner_type === 'tt' ? 'teacher_tests' : ITEM_TABLE[r.owner_type];
          const it = table ? await db(table).where({ id: r.owner_id }).first() : null;
          names[k] = it ? it.title : "(o'chirilgan)";
        }
      }
      return {
        tg, name: `${u.first_name || ''} ${u.last_name || ''}`.trim(), username: u.username, phone: u.phone, balance: u.balance,
        blocked: !!u.is_blocked, registered: !!u.is_registered, isAdmin: isAdmin(tg),
        created: u.created_at ? fmtDate(u.created_at) : '—', seen: u.last_seen ? fmtDate(u.last_seen) : '—',
        refs: await cnt(db('users').where({ referrer_id: tg, is_registered: 1 })), buys: await cnt(db('purchases').where({ user_tg: tg })),
        tx: tx.map((r) => ({ amount: r.amount, type: TX_NAMES[r.type] || r.type, note: r.note, at: Number(r.created_at) })),
        results: res.map((r) => ({ title: names[`${r.owner_type}:${r.owner_id}`], correct: r.correct, total: r.total, at: Number(r.created_at) })),
      };
    },

    'POST /api/admin/user/balance': async (me, q, b) => {
      mustAdmin(me);
      const tg = Number(b.tg);
      const amount = int(b.amount, 'Summa', -1e8, 1e8);
      if (!amount) throw new ApiError(400, 'bad_input', "Summa 0 bo'lmasin");
      if (!(await getUser(tg))) throw new ApiError(404, 'not_found');
      await addBalance(tg, amount, 'admin', `Admin ${me.tg} (mini ilova)`);
      const u = await getUser(tg);
      wlog(me.tg, `🛠 Balans: ${tg} ga ${amount > 0 ? '+' : ''}${money(amount)}`);
      bot().telegram.sendMessage(tg, `${amount > 0 ? "✅ Balansingiz to'ldirildi" : 'ℹ️ Balansingizdan yechildi'}: <b>${money(Math.abs(amount))}</b>\n💰 Joriy balans: <b>${money(u.balance)}</b>`, { parse_mode: 'HTML' }).catch(() => {});
      return { balance: u.balance };
    },

    'POST /api/admin/user/block': async (me, q, b) => {
      mustAdmin(me);
      const tg = Number(b.tg);
      if (isAdmin(tg)) throw new ApiError(400, 'bad_input', "Adminni bloklab bo'lmaydi");
      const u = await getUser(tg);
      if (!u) throw new ApiError(404, 'not_found');
      await db('users').where({ tg_id: tg }).update({ is_blocked: u.is_blocked ? 0 : 1 });
      wlog(me.tg, `🛠 ${u.is_blocked ? 'Blokdan chiqardi' : 'Blokladi'}: ${tg}`);
      bot().telegram.sendMessage(tg, u.is_blocked ? '✅ Hisobingiz blokdan chiqarildi. /start' : '🚫 Hisobingiz admin tomonidan bloklandi.').catch(() => {});
      return { blocked: !u.is_blocked };
    },

    'POST /api/admin/user/message': async (me, q, b) => {
      mustAdmin(me);
      const text = str(b.text, 3500, 'Xabar');
      await bot().telegram.sendMessage(Number(b.tg), `📩 <b>Admin xabari:</b>\n\n${esc(text)}`, { parse_mode: 'HTML' });
      wlog(me.tg, `🛠 Xabar yubordi: ${b.tg}`);
      return { ok: true };
    },

    // ================= To'ldirish so'rovlari =================
    'GET /api/admin/topups': async (me, q) => {
      mustAdmin(me);
      const status = ['approved', 'rejected'].includes(q.status) ? q.status : 'pending';
      const rows = await db('topups').where({ status }).orderBy('id', status === 'pending' ? 'asc' : 'desc').limit(50);
      const out = [];
      for (const t of rows) {
        const u = await getUser(t.user_tg);
        out.push({
          id: t.id, amount: t.amount, status: t.status, reason: t.reason, at: Number(t.created_at), receipt: fileUrl(t.receipt_id),
          user: u ? { tg: Number(u.tg_id), name: `${u.first_name || ''} ${u.last_name || ''}`.trim(), phone: u.phone, balance: u.balance } : { tg: Number(t.user_tg), name: '?' },
        });
      }
      return { reasons: require('./handlers/topups').REASONS, items: out };
    },

    'POST /api/admin/topup/approve': async (me, q, b) => {
      mustAdmin(me);
      const t = await db('topups').where({ id: Number(b.id) }).first();
      if (!t) throw new ApiError(404, 'not_found');
      const amount = b.amount != null && b.amount !== '' ? int(b.amount, 'Summa', 1, 5e7) : t.amount;
      const r = await require('./handlers/topups').approveTopup(bot().telegram, me.tg, t.id, amount);
      if (r.error) throw new ApiError(409, 'done', r.error.replace(/<[^>]+>/g, ''));
      return { ok: true };
    },

    'POST /api/admin/topup/reject': async (me, q, b) => {
      mustAdmin(me);
      const reason = str(b.reason, 500, 'Sabab');
      const r = await require('./handlers/topups').rejectTopup(bot().telegram, me.tg, Number(b.id), reason);
      if (r.error) throw new ApiError(409, 'done', r.error);
      return { ok: true };
    },

    // ================= Kontent: test variantlari va video mavzular =================
    'GET /api/admin/content': async (me, q) => {
      mustAdmin(me);
      const type = typeOf(q.type);
      const col = groupCol(type);
      const list = cats.list(sectionOf(type), true);
      const pos = new Map(list.map((c, i) => [c.code, i]));
      const items = (await db(ITEM_TABLE[type]).orderBy('id').limit(300))
        .sort((a, b2) => (pos.get(a[col]) ?? 999) - (pos.get(b2[col]) ?? 999) || a.id - b2.id);
      const out = [];
      for (const it of items) {
        out.push({ id: it.id, title: it.title, group: it[col], groupName: cats.name(sectionOf(type), it[col]), price: it.price, active: !!it.is_active, qcount: await qCount(type, it.id), pdf: !!it.pdf_id });
      }
      return { groups: list.map((c) => ({ code: c.code, name: c.name, active: !!c.is_active })), items: out };
    },

    'GET /api/admin/item': async (me, q) => {
      mustAdmin(me);
      const type = typeOf(q.type);
      const it = await db(ITEM_TABLE[type]).where({ id: Number(q.id) }).first();
      if (!it) throw new ApiError(404, 'not_found', 'Topilmadi');
      const qs = await db('questions').where({ owner_type: type, owner_id: it.id }).orderBy('id');
      return {
        type, id: it.id, title: it.title, group: it[groupCol(type)], price: it.price, time_limit: it.time_limit, active: !!it.is_active,
        description: it.description || '', video_type: it.video_type || null, video_ref: it.video_type === 'url' ? it.video_ref : null, has_video: !!it.video_ref,
        pdf: it.pdf_id ? { name: it.pdf_name, price: it.pdf_price } : null,
        test_sol: it.sol_ref ? { type: it.sol_type, url: it.sol_type === 'url' ? it.sol_ref : null } : null,
        buys: await cnt(db('purchases').where({ item_type: type, item_id: it.id })),
        pdfBuys: type === 'variant' ? await cnt(db('purchases').where({ item_type: 'pdf', item_id: it.id })) : 0,
        solved: await cnt(db('results').where({ owner_type: type, owner_id: it.id })),
        questions: qs.map((x) => ({ id: x.id, body: x.body, options: JSON.parse(x.options), correct: x.correct, photo: fileUrl(x.photo_id), sol: x.sol_ref ? x.sol_type : null })),
      };
    },

    'POST /api/admin/item/save': async (me, q, b) => {
      mustAdmin(me);
      const type = typeOf(b.type);
      const section = sectionOf(type);
      const f = {};
      if (b.title !== undefined) f.title = str(b.title, 200, 'Nomi');
      if (b.group !== undefined) {
        if (!cats.find(section, String(b.group))) throw new ApiError(400, 'bad_input', "Bo'limni tanlang");
        f[groupCol(type)] = String(b.group);
      }
      if (b.price !== undefined) f.price = int(b.price, 'Narx', 0, 1e8);
      if (b.time_limit !== undefined) f.time_limit = int(b.time_limit, 'Vaqt', 0, 600);
      if (b.active !== undefined) f.is_active = b.active ? 1 : 0;
      if (type === 'topic') {
        if (b.description !== undefined) f.description = str(b.description, 800, 'Tavsif', false) || null;
        if (b.video_url) {
          const u = str(b.video_url, 500, 'Video havolasi');
          if (!/^https?:\/\/\S+$/i.test(u)) throw new ApiError(400, 'bad_input', 'Video havolasi https:// bilan boshlansin');
          Object.assign(f, { video_type: 'url', video_ref: u });
        }
        if (b.video_file) Object.assign(f, { video_type: b.video_kind === 'document' ? 'document' : 'video', video_ref: String(b.video_file) });
      } else {
        if (b.pdf_file) Object.assign(f, { pdf_id: String(b.pdf_file), pdf_name: str(b.pdf_name || 'test.pdf', 250, 'Fayl nomi') });
        if (b.pdf_remove) Object.assign(f, { pdf_id: null, pdf_name: null });
        if (b.pdf_price !== undefined) f.pdf_price = int(b.pdf_price, 'PDF narxi', 0, 1e8);
      }
      // Butun test uchun bitta video yechim
      if (b.sol_file) Object.assign(f, { sol_type: b.sol_kind === 'document' ? 'document' : 'video', sol_ref: String(b.sol_file) });
      else if (b.sol_url) {
        const u = str(b.sol_url, 500, 'Video yechim havolasi');
        if (!/^https?:\/\/\S+$/i.test(u)) throw new ApiError(400, 'bad_input', 'Video yechim havolasi https:// bilan boshlansin');
        Object.assign(f, { sol_type: 'url', sol_ref: u });
      } else if (b.sol_remove) Object.assign(f, { sol_type: null, sol_ref: null });
      const table = ITEM_TABLE[type];
      if (b.id) {
        await db(table).where({ id: Number(b.id) }).update(f);
        wlog(me.tg, `🛠 Tahrirladi: ${type}#${b.id}`);
        return { id: Number(b.id) };
      }
      if (!f.title || !f[groupCol(type)]) throw new ApiError(400, 'bad_input', "Nomi va bo'limini kiriting");
      if (type === 'topic' && !f.video_ref) throw new ApiError(400, 'bad_input', 'Video faylni yuklang yoki havola kiriting');
      const [id] = await db(table).insert({ price: 0, time_limit: 0, ...f, is_active: f.is_active ?? 1, created_at: now() });
      wlog(me.tg, `🛠 Yaratdi: ${type}#${id} ${esc(f.title)}`);
      return { id };
    },

    'POST /api/admin/item/delete': async (me, q, b) => {
      mustAdmin(me);
      const type = typeOf(b.type);
      const id = Number(b.id);
      await db.transaction(async (trx) => {
        await trx('questions').where({ owner_type: type, owner_id: id }).del();
        await trx(ITEM_TABLE[type]).where({ id }).del();
      });
      wlog(me.tg, `🛠 O'chirdi: ${type}#${id}`);
      return { ok: true };
    },

    'POST /api/admin/question': async (me, q, b) => {
      mustAdmin(me);
      const type = typeOf(b.type);
      const it = await db(ITEM_TABLE[type]).where({ id: Number(b.owner_id) }).first();
      if (!it) throw new ApiError(404, 'not_found');
      const text = str(b.body, 800, 'Savol matni', !b.photo_file);
      const options = (Array.isArray(b.options) ? b.options : []).map((o) => String(o || '').trim()).filter(Boolean);
      if (options.length < 2 || options.length > 6) throw new ApiError(400, 'bad_input', '2 tadan 6 tagacha variant kiriting');
      if (options.some((o) => o.length > 200)) throw new ApiError(400, 'bad_input', 'Variant juda uzun (200 belgigacha)');
      const correct = Number(b.correct);
      if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) throw new ApiError(400, 'bad_input', "To'g'ri javobni belgilang");
      let sol = { sol_type: null, sol_ref: null };
      if (b.sol_file) sol = { sol_type: b.sol_kind === 'document' ? 'document' : 'video', sol_ref: String(b.sol_file) };
      else if (b.sol_url) {
        const u = str(b.sol_url, 500, 'Video yechim havolasi');
        if (!/^https?:\/\/\S+$/i.test(u)) throw new ApiError(400, 'bad_input', 'Havola https:// bilan boshlansin');
        sol = { sol_type: 'url', sol_ref: u };
      }
      const [id] = await db('questions').insert({
        owner_type: type, owner_id: it.id, body: text, options: JSON.stringify(options), correct, photo_id: b.photo_file || null, ...sol, created_at: now(),
      });
      wlog(me.tg, `➕ Savol qo'shdi (${type}#${it.id})`);
      return { id, count: await qCount(type, it.id) };
    },

    'POST /api/admin/question/delete': async (me, q, b) => {
      mustAdmin(me);
      await db('questions').where({ id: Number(b.id) }).whereIn('owner_type', ['variant', 'topic']).del();
      return { ok: true };
    },

    // ================= Sinf bo'limlari =================
    'GET /api/admin/cats': async (me) => {
      mustAdmin(me);
      const out = {};
      for (const section of ['test', 'video']) {
        out[section] = [];
        for (const c of cats.list(section, true)) out[section].push({ id: c.id, name: c.name, active: !!c.is_active, count: await cats.contentCount(c) });
      }
      return out;
    },
    'POST /api/admin/cat/save': async (me, q, b) => {
      mustAdmin(me);
      const name = str(b.name, 60, 'Nomi');
      const section = b.section === 'video' ? 'video' : 'test';
      if (cats.list(section, true).some((c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== Number(b.id))) throw new ApiError(400, 'bad_input', "Bunday nomli bo'lim bor");
      if (b.id) await cats.update(Number(b.id), { name });
      else await cats.create(section, name);
      wlog(me.tg, `🛠 Sinf bo'limi: ${esc(name)}`);
      return { ok: true };
    },
    'POST /api/admin/cat/toggle': async (me, q, b) => {
      mustAdmin(me);
      const c = cats.byId(b.id);
      if (!c) throw new ApiError(404, 'not_found');
      await cats.update(c.id, { is_active: c.is_active ? 0 : 1 });
      return { ok: true };
    },
    'POST /api/admin/cat/move': async (me, q, b) => {
      mustAdmin(me);
      await cats.move(Number(b.id), Number(b.dir) < 0 ? -1 : 1);
      return { ok: true };
    },
    'POST /api/admin/cat/delete': async (me, q, b) => {
      mustAdmin(me);
      const c = cats.byId(b.id);
      if (!c) throw new ApiError(404, 'not_found');
      const n = await cats.contentCount(c);
      if (n) throw new ApiError(400, 'not_empty', `Bo'limda ${n} ta ${c.section === 'test' ? 'test' : 'mavzu'} bor. Avval ularni boshqa bo'limga ko'chiring yoki bo'limni yashiring.`);
      await cats.remove(c.id);
      return { ok: true };
    },

    // ================= Reklama =================
    'GET /api/admin/ads': async (me) => {
      mustAdmin(me);
      const t = now();
      const rows = await db('ads').orderBy('id', 'desc').limit(50);
      return rows.map((a) => ({
        id: a.id, text: a.text, media_type: a.media_type, photo: a.media_type === 'photo' ? fileUrl(a.media_id) : null, btn_text: a.btn_text, btn_url: a.btn_url,
        shows: a.shows, ends: Number(a.ends_at), starts: Number(a.starts_at),
        status: !a.is_active ? 'paused' : Number(a.ends_at) <= t ? 'ended' : Number(a.starts_at) > t ? 'scheduled' : 'active',
      }));
    },
    'POST /api/admin/ad/save': async (me, q, b) => {
      mustAdmin(me);
      const days = int(b.days, 'Kunlar', b.id ? 0 : 1, 365);
      const t = now();
      if (b.id) {
        await db('ads').where({ id: Number(b.id) }).update({ ends_at: days ? t + days * DAY : t, ...(days ? { is_active: 1 } : {}) });
        return { ok: true };
      }
      const media = b.media_file ? { media_type: b.media_kind === 'video' ? 'video' : 'photo', media_id: String(b.media_file) } : { media_type: null, media_id: null };
      const text = str(b.text, media.media_type ? 1024 : 3500, 'Reklama matni', !media.media_type);
      let btn = { btn_text: null, btn_url: null };
      if (b.btn_url) {
        const url = str(b.btn_url, 500, 'Havola');
        if (!/^https?:\/\/\S+$/i.test(url)) throw new ApiError(400, 'bad_input', 'Havola https:// bilan boshlansin');
        btn = { btn_text: str(b.btn_text || 'Batafsil', 60, 'Tugma matni'), btn_url: url };
      }
      const [id] = await db('ads').insert({ text, ...media, ...btn, starts_at: t, ends_at: t + days * DAY, is_active: 1, shows: 0, created_at: t });
      wlog(me.tg, `📣 Reklama joyladi #${id} (${days} kun)`);
      return { id };
    },
    'POST /api/admin/ad/toggle': async (me, q, b) => {
      mustAdmin(me);
      const a = await db('ads').where({ id: Number(b.id) }).first();
      if (!a) throw new ApiError(404, 'not_found');
      await db('ads').where({ id: a.id }).update({ is_active: a.is_active ? 0 : 1 });
      return { ok: true };
    },
    'POST /api/admin/ad/delete': async (me, q, b) => {
      mustAdmin(me);
      await db('ads').where({ id: Number(b.id) }).del();
      return { ok: true };
    },
    'POST /api/admin/ad/broadcast': async (me, q, b) => {
      mustAdmin(me);
      const ad = await db('ads').where({ id: Number(b.id) }).first();
      if (!ad) throw new ApiError(404, 'not_found');
      const users = await db('users').where({ is_registered: 1, is_blocked: 0 }).select('tg_id');
      const tg = bot().telegram;
      const { sendAd } = require('./ads');
      wlog(me.tg, `📣 Reklama #${ad.id} ni hammaga yubordi (${users.length})`);
      (async () => {
        let ok = 0;
        let fail = 0;
        for (const u of users) {
          const fake = { reply: (t, e) => tg.sendMessage(u.tg_id, t, e), replyWithPhoto: (p, e) => tg.sendPhoto(u.tg_id, p, e), replyWithVideo: (v, e) => tg.sendVideo(u.tg_id, v, e) };
          try { await sendAd(fake, ad); ok += 1; } catch (e) { fail += 1; }
          await sleep(40);
        }
        await db('ads').where({ id: ad.id }).increment('shows', ok);
        tg.sendMessage(me.tg, `📢 Reklama #${ad.id} yuborildi.\n✅ Yetkazildi: ${ok}\n❌ Xato: ${fail}`).catch(() => {});
      })();
      return { total: users.length };
    },

    // ================= E'lonlar (kitob / markaz) =================
    'GET /api/admin/listings': async (me, q) => {
      mustAdmin(me);
      const table = q.table === 'centers' ? 'centers' : 'books';
      const t = now();
      const base = db(table).where('is_active', 1);
      const rows = await (q.mode === 'expired' ? base.andWhere('expires_at', '<=', t) : base.andWhere('expires_at', '>', t)).orderBy('id', 'desc').limit(80);
      const out = [];
      for (const r of rows) {
        const o = await getUser(r.user_tg);
        out.push({
          id: r.id, title: table === 'books' ? r.title : `${CENTER_KINDS[r.kind] ? CENTER_KINDS[r.kind].icon : ''} ${r.name}`,
          sub: table === 'books' ? [r.author, r.price_text].filter(Boolean).join(', ') : `${r.region}, ${r.district}`,
          phone: r.phone, expires: Number(r.expires_at), owner: o ? `${o.first_name || ''} ${o.last_name || ''}`.trim() : String(r.user_tg),
        });
      }
      return out;
    },
    'POST /api/admin/listing/days': async (me, q, b) => {
      mustAdmin(me);
      const table = b.table === 'centers' ? 'centers' : 'books';
      const days = int(b.days, 'Kunlar', 0, 3650);
      const t = now();
      await db(table).where({ id: Number(b.id) }).update({ expires_at: days ? t + days * DAY : t });
      wlog(me.tg, `🛠 E'lon ${table}#${b.id} muddati: ${days} kun`);
      return { ok: true };
    },
    'POST /api/admin/listing/delete': async (me, q, b) => {
      mustAdmin(me);
      const table = b.table === 'centers' ? 'centers' : 'books';
      await db(table).where({ id: Number(b.id) }).update({ is_active: 0 });
      return { ok: true };
    },

    // ================= Narxlar, sozlamalar, bo'limlar =================
    'GET /api/admin/settings': async (me) => {
      mustAdmin(me);
      const keys = Object.keys(DEFAULT_SETTINGS).filter((k) => !k.startsWith('f_'));
      const settings = [];
      for (const k of keys) settings.push({ key: k, value: await getSetting(k), help: SETTING_HELP[k] || k, text: ['payment_info', 'cert_signer'].includes(k) });
      const features = [];
      for (const [k, name] of Object.entries(FEATURES)) features.push({ key: k, name, on: await isOn(k) });
      return { settings, features };
    },
    'POST /api/admin/setting': async (me, q, b) => {
      mustAdmin(me);
      const key = String(b.key || '');
      if (!(key in DEFAULT_SETTINGS) || key.startsWith('f_')) throw new ApiError(400, 'bad_input', "Bunday sozlama yo'q");
      const value = ['payment_info', 'cert_signer'].includes(key) ? str(b.value, 1000, 'Qiymat') : String(int(b.value, 'Qiymat', 0, 1e9));
      await setSetting(key, value);
      wlog(me.tg, `🛠 Sozlama: ${key} = ${esc(value.slice(0, 50))}`);
      return { ok: true };
    },
    'POST /api/admin/feature': async (me, q, b) => {
      mustAdmin(me);
      const key = String(b.key || '');
      if (!FEATURES[key]) throw new ApiError(400, 'bad_input', "Bunday bo'lim yo'q");
      const on = await isOn(key);
      await setSetting(`f_${key}`, on ? '0' : '1');
      wlog(me.tg, `🛠 Bo'lim ${on ? "o'chirildi" : 'yoqildi'}: ${esc(FEATURES[key])}`);
      return { on: !on };
    },

    // ================= Hammaga xabar yuborish =================
    'POST /api/admin/broadcast': async (me, q, b) => {
      mustAdmin(me);
      const photo = b.photo_file ? String(b.photo_file) : null;
      const text = str(b.text, photo ? 1024 : 3500, 'Xabar matni', !photo);
      const users = await db('users').where({ is_registered: 1, is_blocked: 0 }).select('tg_id');
      const tg = bot().telegram;
      wlog(me.tg, `📢 Xabar yuborishni boshladi: ${users.length} ta`);
      (async () => {
        let ok = 0;
        let fail = 0;
        for (const u of users) {
          try {
            if (photo) await tg.sendPhoto(u.tg_id, photo, text ? { caption: text } : {});
            else await tg.sendMessage(u.tg_id, text);
            ok += 1;
          } catch (e) { fail += 1; }
          await sleep(40);
        }
        tg.sendMessage(me.tg, `📢 Yuborish tugadi.\n✅ Yetkazildi: ${ok}\n❌ Xato (botni bloklaganlar): ${fail}`).catch(() => {});
      })();
      return { total: users.length };
    },

    'GET /api/admin/regions': async (me) => { mustAdmin(me); return REGIONS; },
  };

  /**
   * Fayl yuklash (video / PDF / rasm) — JSON emas, xom bayt sifatida keladi (50 MB gacha, Telegram cheklovi).
   * Fayl adminning o'z chatiga yuborilib, Telegram file_id olinadi va xabar darhol o'chiriladi.
   */
  async function upload(me, kind, name, buf) {
    mustAdmin(me);
    if (!buf || !buf.length) throw new ApiError(400, 'bad_input', "Fayl bo'sh");
    const tg = bot().telegram;
    const file = { source: buf, filename: name || 'fayl' };
    let msg;
    let id;
    let type = kind;
    if (kind === 'photo') {
      msg = await tg.sendPhoto(me.tg, file, { disable_notification: true });
      id = msg.photo[msg.photo.length - 1].file_id;
    } else if (kind === 'video') {
      msg = await tg.sendVideo(me.tg, file, { disable_notification: true, supports_streaming: true });
      if (msg.video) id = msg.video.file_id;
      else if (msg.document) { id = msg.document.file_id; type = 'document'; }
    } else {
      msg = await tg.sendDocument(me.tg, file, { disable_notification: true });
      id = msg.document.file_id;
      type = 'document';
    }
    tg.deleteMessage(me.tg, msg.message_id).catch(() => {});
    if (!id) throw new ApiError(500, 'upload', "Faylni yuklab bo'lmadi");
    wlog(me.tg, `📎 Fayl yukladi (${type}, ${(buf.length / 1048576).toFixed(1)} MB)`);
    return { file_id: id, kind: type, name };
  }

  return { routes, upload };
};
