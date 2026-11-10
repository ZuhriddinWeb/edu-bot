/**
 * Mini ilova uchun qo'shimcha API: botdagi foydalanuvchi imkoniyatlarining hammasi.
 *  - balansni chek bilan to'ldirish, admin bilan bog'lanish
 *  - kitob / o'quv markaz qo'shish, «Mening e'lonlarim» (uzaytirish, o'chirish)
 *  - o'qituvchilar: test tuzish, savollar, natijalar; o'qituvchi testini kod bilan yechish
 *  - PDF variantlar ro'yxati, sertifikatlar
 * Rasmlar brauzerda kichraytirilib (base64 JPEG) yuboriladi va Telegram'ga yuklanadi.
 */
const crypto = require('crypto');
const { Markup } = require('telegraf');
const config = require('./config');
const { db } = require('./db');
const REGIONS = require('./regions');
const cats = require('./categories');
const { CENTER_KINDS } = require('./constants');
const {
  now, DAY, esc, money, fmtDate, getUser, getNum, isOn, charge, hasAccess, purchasedIds, parseAmount,
} = require('./utils');

module.exports = (h) => {
  const { ApiError, need, wlog, fileUrl, bot, qCount } = h;
  const L = 'ABCDEF';
  const sig = (s) => crypto.createHmac('sha256', config.BOT_TOKEN).update(s).digest('hex').slice(0, 32);
  const str = (v, max, name, required = true) => {
    const s = (v == null ? '' : String(v)).trim();
    if (required && !s) throw new ApiError(400, 'bad_input', `${name} kiritilmagan`);
    if (s.length > max) throw new ApiError(400, 'bad_input', `${name} juda uzun (${max} belgigacha)`);
    return s;
  };

  // data:image/jpeg;base64,... -> Buffer
  function decodeImage(dataUrl) {
    if (!dataUrl) return null;
    const m = String(dataUrl).match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!m) throw new ApiError(400, 'bad_image', "Rasm formati noto'g'ri");
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > 5 * 1024 * 1024) throw new ApiError(400, 'bad_image', 'Rasm juda katta (5 MB gacha)');
    return buf;
  }
  const largest = (msg) => msg.photo[msg.photo.length - 1].file_id;

  // Rasmni Telegram'ga yuklab file_id olish: foydalanuvchi chatiga jimgina yuborib, darhol o'chiramiz
  async function uploadPhoto(tg, buf) {
    const msg = await bot().telegram.sendPhoto(tg, { source: buf, filename: 'rasm.jpg' }, { disable_notification: true });
    bot().telegram.deleteMessage(tg, msg.message_id).catch(() => {});
    return largest(msg);
  }

  const userLine = (u) => `👤 ${esc(u.first_name)} ${esc(u.last_name)}\n📞 ${esc(u.phone)}\n🆔 <code>${u.tg_id}</code>${u.username ? ` (@${esc(u.username)})` : ''}`;

  const routes = {
    // ================= Balansni to'ldirish (chek bilan) =================
    'POST /api/topup': async (me, q, body) => {
      await need('topup', me);
      const min = await getNum('min_topup');
      const amount = parseAmount(body.amount);
      if (!amount) throw new ApiError(400, 'bad_input', 'Summani kiriting');
      if (amount < min) throw new ApiError(400, 'bad_input', `Minimal to'ldirish summasi — ${money(min)}`);
      if (amount > 50000000) throw new ApiError(400, 'bad_input', 'Juda katta summa');
      const img = decodeImage(body.image);
      if (!img) throw new ApiError(400, 'bad_input', "To'lov chekining rasmini tanlang");
      const { createRequest } = require('./handlers/topups');
      const r = await createRequest(bot().telegram, me.tg, amount, (adminId) => bot().telegram.sendPhoto(adminId, { source: img, filename: 'chek.jpg' }, {
        caption: `🧾 Chek (mini ilovadan) — ${me.u.first_name} ${me.u.last_name}`,
      }));
      if (!r.sent) throw new ApiError(503, 'no_admin', "Hozircha adminga yuborib bo'lmadi, keyinroq urinib ko'ring");
      return { id: r.id, amount };
    },

    // ================= Admin bilan bog'lanish =================
    'POST /api/support': async (me, q, body) => {
      await need('support', me);
      const text = str(body.text, 2000, 'Xabar matni', !body.image);
      const img = decodeImage(body.image);
      const kb = Markup.inlineKeyboard([[Markup.button.callback('↩️ Javob berish', `adm_reply:${me.tg}`)]]);
      const head = `📨 <b>Yangi murojaat</b> (mini ilovadan)\n${userLine(me.u)}`;
      let sent = 0;
      for (const adminId of config.ADMIN_IDS) {
        try {
          if (img) {
            await bot().telegram.sendPhoto(adminId, { source: img }, { caption: `${head}\n\n${esc(text)}`.slice(0, 1024), parse_mode: 'HTML', ...kb });
          } else {
            await bot().telegram.sendMessage(adminId, `${head}\n\n${esc(text)}`, { parse_mode: 'HTML', ...kb });
          }
          sent += 1;
        } catch (e) {
          console.error('[support/webapp]', e.message);
        }
      }
      if (!sent) throw new ApiError(503, 'no_admin', "Xabarni yuborib bo'lmadi, keyinroq urinib ko'ring");
      wlog(me.tg, `☎️ Adminga yozdi: ${esc(text.slice(0, 80))}`);
      return { ok: true };
    },

    // ================= Kitob qo'shish =================
    'POST /api/books/add': async (me, q, body) => {
      await need('books', me);
      const f = {
        title: str(body.title, 200, 'Kitob nomi'),
        author: str(body.author, 200, 'Muallif', false) || null,
        price_text: str(body.price_text, 100, 'Narxi'),
        description: str(body.description, 800, 'Tavsif', false) || null,
        phone: str(body.phone, 64, 'Telefon'),
      };
      const img = decodeImage(body.image);
      const price = me.admin ? 0 : await getNum('book_price');
      const days = await getNum('book_days');
      const expires = now() + days * DAY;
      // Avval rasmni yuklaymiz (pul yechilishidan oldin — xato bo'lsa pul yechilmaydi)
      let photoId = null;
      if (img) photoId = await uploadPhoto(me.tg, img);
      let id;
      const res = await charge(me.tg, price, 'book', `Kitob: ${f.title}`, async (trx) => {
        [id] = await trx('books').insert({ ...f, photo_id: photoId, user_tg: me.tg, is_active: 1, expires_at: expires, created_at: now() });
      });
      if (res === 'nofunds') throw new ApiError(402, 'nofunds', `Balansda mablag' yetarli emas. Kerak: ${money(price)}`);
      wlog(me.tg, `📚 Kitob e'lonini joyladi: ${esc(f.title)} — ${money(price)}`);
      bot().telegram.sendMessage(me.tg, `✅ «${esc(f.title)}» kitobingiz sotuvga qo'yildi. ${fmtDate(expires)} gacha ko'rinadi.`, { parse_mode: 'HTML' }).catch(() => {});
      return { id, expires };
    },

    // ================= O'quv markaz / maktab qo'shish =================
    'POST /api/centers/add': async (me, q, body) => {
      await need('centers', me);
      const kind = body.kind === 'school' ? 'school' : 'center';
      const r = REGIONS[Number(body.ri)];
      const d = r && r.districts[Number(body.di)];
      if (!r || !d) throw new ApiError(400, 'bad_input', 'Viloyat va tumanni tanlang');
      const f = {
        kind, region: r.name, district: d,
        name: str(body.name, 200, 'Nomi'),
        phone: str(body.phone, 64, 'Telefon'),
        address: str(body.address, 255, 'Manzil', false) || null,
        latitude: Number.isFinite(Number(body.lat)) && body.lat !== null && body.lat !== '' ? Number(body.lat) : null,
        longitude: Number.isFinite(Number(body.lon)) && body.lon !== null && body.lon !== '' ? Number(body.lon) : null,
      };
      const price = me.admin ? 0 : await getNum('center_price');
      const days = await getNum('center_days');
      const expires = now() + days * DAY;
      let id;
      const res = await charge(me.tg, price, 'center', `${CENTER_KINDS[kind].name}: ${f.name}`, async (trx) => {
        [id] = await trx('centers').insert({ ...f, user_tg: me.tg, is_active: 1, expires_at: expires, created_at: now() });
      });
      if (res === 'nofunds') throw new ApiError(402, 'nofunds', `Balansda mablag' yetarli emas. Kerak: ${money(price)}`);
      wlog(me.tg, `🏫 E'lon joyladi: ${esc(f.name)} (${esc(f.region)}, ${esc(f.district)}) — ${money(price)}`);
      bot().telegram.sendMessage(me.tg, `✅ «${esc(f.name)}» e'loni joylandi. ${fmtDate(expires)} gacha ko'rinadi.`, { parse_mode: 'HTML' }).catch(() => {});
      return { id, expires };
    },

    // ================= Mening e'lonlarim =================
    'GET /api/my/listings': async (me) => {
      const t = now();
      const books = await db('books').where({ user_tg: me.tg, is_active: 1 }).orderBy('id', 'desc').limit(50);
      const centers = await db('centers').where({ user_tg: me.tg, is_active: 1 }).orderBy('id', 'desc').limit(50);
      return {
        prices: {
          books: { price: me.admin ? 0 : await getNum('book_price'), days: await getNum('book_days') },
          centers: { price: me.admin ? 0 : await getNum('center_price'), days: await getNum('center_days') },
        },
        books: books.map((b) => ({ id: b.id, title: b.title, expires: Number(b.expires_at), active: Number(b.expires_at) > t })),
        centers: centers.map((c) => ({ id: c.id, title: `${CENTER_KINDS[c.kind].icon} ${c.name}`, expires: Number(c.expires_at), active: Number(c.expires_at) > t })),
      };
    },

    'POST /api/my/extend': async (me, q, body) => {
      const table = body.table === 'centers' ? 'centers' : 'books';
      const r = await db(table).where({ id: Number(body.id), user_tg: me.tg, is_active: 1 }).first();
      if (!r) throw new ApiError(404, 'not_found', "E'lon topilmadi");
      const price = me.admin ? 0 : await getNum(table === 'books' ? 'book_price' : 'center_price');
      const days = await getNum(table === 'books' ? 'book_days' : 'center_days');
      const res = await charge(me.tg, price, table === 'books' ? 'book' : 'center', `Uzaytirish #${r.id}`, async (trx) => {
        await trx(table).where({ id: r.id }).update({ expires_at: Math.max(Number(r.expires_at), now()) + days * DAY });
      });
      if (res === 'nofunds') throw new ApiError(402, 'nofunds', `Balansda mablag' yetarli emas. Kerak: ${money(price)}`);
      wlog(me.tg, `🔄 E'lonni uzaytirdi: ${table}#${r.id}`);
      return { ok: true };
    },

    'POST /api/my/delete': async (me, q, body) => {
      const table = body.table === 'centers' ? 'centers' : 'books';
      await db(table).where({ id: Number(body.id), user_tg: me.tg }).update({ is_active: 0 });
      wlog(me.tg, `🗑 E'lonni o'chirdi: ${table}#${body.id}`);
      return { ok: true };
    },

    // ================= PDF variantlar =================
    'GET /api/pdfs': async (me) => {
      await need('tests', me);
      const owned = await purchasedIds(me.tg, 'pdf');
      const out = [];
      for (const c of cats.list('test')) {
        const items = await db('variants').where({ category: c.code, is_active: 1 }).whereNotNull('pdf_id').orderBy('id');
        if (items.length) {
          out.push({
            code: c.code, name: c.name,
            items: items.map((v) => ({ id: v.id, title: v.title, price: v.pdf_price, owned: !v.pdf_price || me.admin || owned.has(v.id) })),
          });
        }
      }
      wlog(me.tg, "📄 PDF variantlarni ko'rdi");
      return out;
    },

    // ================= Sertifikatlar =================
    'GET /api/certs': async (me) => {
      const list = await db('certificates').where({ user_tg: me.tg }).orderBy('id', 'desc').limit(50);
      return {
        min: (await isOn('certs')) ? await require('./handlers/certs').minFor('topic') : null,
        minTest: (await isOn('certs')) ? await require('./handlers/certs').minFor('variant') : null,
        items: list.map((c) => ({
          id: c.id, type: c.owner_type, title: c.title, correct: c.correct, total: c.total, date: fmtDate(c.created_at),
          img: `/api/cert/img?id=${c.id}&s=${sig(`cert:${c.id}:${me.tg}`)}`,
        })),
      };
    },

    'POST /api/cert/send': async (me, q, body) => {
      const c = await db('certificates').where({ id: Number(body.id), user_tg: me.tg }).first();
      if (!c) throw new ApiError(404, 'not_found', 'Sertifikat topilmadi');
      const img = await require('./handlers/certs').imageFor(c);
      await bot().telegram.sendDocument(me.tg, { source: img, filename: `sertifikat-${c.id}.jpg` }, { caption: `🎓 ${esc(c.title)}`, parse_mode: 'HTML' });
      wlog(me.tg, `🎓 Sertifikatni yuklab oldi: ${esc(c.title)}`);
      return { ok: true };
    },

    // ================= O'qituvchilar =================
    'GET /api/teacher/tests': async (me) => {
      await need('teacher', me);
      const list = await db('teacher_tests').where({ teacher_tg: me.tg, is_deleted: 0 }).orderBy('id', 'desc').limit(50);
      const out = [];
      for (const t of list) {
        const solved = Number((await db('results').where({ owner_type: 'tt', owner_id: t.id }).count({ c: '*' }))[0].c);
        out.push({ id: t.id, title: t.title, open: !!t.is_open, qcount: await qCount('tt', t.id), solved, time_limit: t.time_limit });
      }
      return { price: await getNum('teacher_test_price'), items: out };
    },

    'POST /api/teacher/create': async (me, q, body) => {
      await need('teacher', me);
      const title = str(body.title, 200, 'Test nomi');
      const minutes = Math.max(0, Math.min(600, parseInt(body.time_limit, 10) || 0));
      const price = await getNum('teacher_test_price');
      const { newCode } = require('./handlers/teacher');
      const code = await newCode();
      let id;
      const res = await charge(me.tg, price, 'teacher', `O'qituvchi testi: ${title}`, async (trx) => {
        [id] = await trx('teacher_tests').insert({ teacher_tg: me.tg, code, title, time_limit: minutes, is_open: 1, is_deleted: 0, created_at: now() });
      });
      if (res === 'nofunds') throw new ApiError(402, 'nofunds', `Balansda mablag' yetarli emas. Kerak: ${money(price)}`);
      wlog(me.tg, `👨‍🏫 Test yaratdi: ${esc(title)}`);
      return { id };
    },

    'GET /api/teacher/test': async (me, q) => {
      await need('teacher', me);
      const t = await db('teacher_tests').where({ id: Number(q.id), teacher_tg: me.tg, is_deleted: 0 }).first();
      if (!t) throw new ApiError(404, 'not_found', 'Test topilmadi');
      const qs = await db('questions').where({ owner_type: 'tt', owner_id: t.id }).orderBy('id');
      const solved = Number((await db('results').where({ owner_type: 'tt', owner_id: t.id }).count({ c: '*' }))[0].c);
      const botName = bot().botInfo ? bot().botInfo.username : '';
      return {
        id: t.id, title: t.title, open: !!t.is_open, time_limit: t.time_limit, code: t.code, solved,
        sol_url: t.sol_ref ? (t.sol_type === 'url' ? t.sol_ref : '') : null,
        link: `https://t.me/${botName}?start=tt_${t.code}`,
        questions: qs.map((x) => ({ id: x.id, body: x.body, options: JSON.parse(x.options), correct: x.correct, photo: fileUrl(x.photo_id), sol: !!x.sol_ref })),
      };
    },

    'POST /api/teacher/question': async (me, q, body) => {
      await need('teacher', me);
      const t = await db('teacher_tests').where({ id: Number(body.test_id), teacher_tg: me.tg, is_deleted: 0 }).first();
      if (!t) throw new ApiError(404, 'not_found', 'Test topilmadi');
      const img = decodeImage(body.image);
      const text = str(body.body, 800, 'Savol matni', !img);
      const options = (Array.isArray(body.options) ? body.options : []).map((o) => String(o || '').trim()).filter(Boolean);
      if (options.length < 2 || options.length > 6) throw new ApiError(400, 'bad_input', "2 tadan 6 tagacha javob varianti kiriting");
      if (options.some((o) => o.length > 200)) throw new ApiError(400, 'bad_input', 'Variant juda uzun (200 belgigacha)');
      const correct = Number(body.correct);
      if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) throw new ApiError(400, 'bad_input', "To'g'ri javobni belgilang");
      const photoId = img ? await uploadPhoto(me.tg, img) : null;
      const [id] = await db('questions').insert({
        owner_type: 'tt', owner_id: t.id, body: text, options: JSON.stringify(options), correct,
        photo_id: photoId, created_at: now(),
      });
      wlog(me.tg, `➕ Savol qo'shdi (tt#${t.id})`);
      return { id, count: await qCount('tt', t.id) };
    },

    // O'qituvchi: butun test uchun bitta video yechim (havola). Video faylni botda yuborish mumkin.
    'POST /api/teacher/solution': async (me, q, body) => {
      await need('teacher', me);
      const t = await db('teacher_tests').where({ id: Number(body.test_id), teacher_tg: me.tg, is_deleted: 0 }).first();
      if (!t) throw new ApiError(404, 'not_found', 'Test topilmadi');
      if (body.remove) {
        await db('teacher_tests').where({ id: t.id }).update({ sol_type: null, sol_ref: null });
        return { ok: true };
      }
      const u = str(body.url, 500, 'Video yechim havolasi');
      if (!/^https?:\/\/\S+$/i.test(u)) throw new ApiError(400, 'bad_input', 'Havola https:// bilan boshlansin');
      await db('teacher_tests').where({ id: t.id }).update({ sol_type: 'url', sol_ref: u });
      wlog(me.tg, `🎥 Test video yechimi (tt#${t.id})`);
      return { ok: true };
    },

    'POST /api/teacher/question/delete': async (me, q, body) => {
      const x = await db('questions').where({ id: Number(body.id), owner_type: 'tt' }).first();
      if (!x) throw new ApiError(404, 'not_found');
      const t = await db('teacher_tests').where({ id: x.owner_id, teacher_tg: me.tg }).first();
      if (!t) throw new ApiError(403, 'forbidden', "Ruxsat yo'q");
      await db('questions').where({ id: x.id }).del();
      return { ok: true };
    },

    'POST /api/teacher/toggle': async (me, q, body) => {
      const t = await db('teacher_tests').where({ id: Number(body.id), teacher_tg: me.tg, is_deleted: 0 }).first();
      if (!t) throw new ApiError(404, 'not_found');
      await db('teacher_tests').where({ id: t.id }).update({ is_open: t.is_open ? 0 : 1 });
      return { open: !t.is_open };
    },

    'POST /api/teacher/delete': async (me, q, body) => {
      await db('teacher_tests').where({ id: Number(body.id), teacher_tg: me.tg }).update({ is_deleted: 1, is_open: 0 });
      wlog(me.tg, `🗑 O'qituvchi testini o'chirdi #${body.id}`);
      return { ok: true };
    },

    'GET /api/teacher/results': async (me, q) => {
      const t = await db('teacher_tests').where({ id: Number(q.id), teacher_tg: me.tg }).first();
      if (!t) throw new ApiError(404, 'not_found');
      const rows = await db('results').join('users', 'users.tg_id', 'results.user_tg')
        .where({ 'results.owner_type': 'tt', 'results.owner_id': t.id })
        .orderBy([{ column: 'results.correct', order: 'desc' }, { column: 'results.id', order: 'asc' }]).limit(200)
        .select('users.first_name', 'users.last_name', 'results.correct', 'results.total', 'results.created_at');
      return { title: t.title, items: rows.map((r) => ({ name: `${r.first_name || ''} ${r.last_name || ''}`.trim(), correct: r.correct, total: r.total, at: Number(r.created_at) })) };
    },

    // O'quvchi: o'qituvchi testini kod bo'yicha ochish
    'GET /api/tt': async (me, q) => {
      await need('teacher', me);
      const code = String(q.code || '').trim().toLowerCase().replace(/^.*tt_/, '');
      const t = await db('teacher_tests').where({ code, is_deleted: 0 }).first();
      if (!t) throw new ApiError(404, 'not_found', "Bunday kodli test topilmadi");
      const teacher = await getUser(t.teacher_tg);
      const done = await db('results').where({ user_tg: me.tg, owner_type: 'tt', owner_id: t.id }).first();
      return {
        code: t.code, title: t.title, open: !!t.is_open, time_limit: t.time_limit, qcount: await qCount('tt', t.id),
        teacher: teacher ? `${teacher.first_name} ${teacher.last_name}` : '', own: Number(t.teacher_tg) === me.tg,
        done: done ? { correct: done.correct, total: done.total } : null,
      };
    },
  };

  // Sertifikat rasmi (imzolangan havola — <img> uchun)
  async function certImage(res, q, send) {
    const c = await db('certificates').where({ id: Number(q.id) }).first();
    if (!c || q.s !== sig(`cert:${c.id}:${c.user_tg}`)) return send(res, 403, { error: 'forbidden' });
    const img = await require('./handlers/certs').imageFor(c);
    res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=3600' });
    return res.end(img);
  }

  return { routes, certImage, L, hasAccess };
};
