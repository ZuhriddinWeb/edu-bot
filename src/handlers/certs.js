/**
 * 🎓 Sertifikatlar — ikki xil dizayn:
 *  • Mavzu sertifikati (videodars testi) — zumrad ramkali dizayn, cert_min_percent (standart 80%)
 *  • Test sertifikati (test varianti) — zamonaviy dizayn, cert_test_min_percent (standart 60%)
 * Har bir test/mavzu uchun bitta sertifikat; keyinroq yaxshiroq natija qilsa — yangilanadi.
 */
const { Markup } = require('telegraf');
const { db } = require('../db');
const cats = require('../categories');
const { esc, now, fmtDate, getNum, getSetting, isOn, getUser, safeEdit } = require('../utils');
const { log } = require('../logger');

async function ownerTitle(type, id) {
  if (type === 'topic') {
    const t = await db('topics').where({ id }).first();
    return t ? t.title.slice(0, 250) : null;
  }
  const v = await db('variants').where({ id }).first();
  if (!v) return null;
  const c = cats.find('test', v.category);
  return (c ? `${c.name} — ${v.title}` : v.title).slice(0, 250);
}

// Sertifikat turi bo'yicha minimal foiz
const minFor = (type) => getNum(type === 'variant' ? 'cert_test_min_percent' : 'cert_min_percent');

async function imageFor(cert) {
  const u = await getUser(cert.user_tg);
  if (cert.owner_type === 'variant') {
    return require('../certificateTest').renderTest({
      name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
      test: cert.title,
      correct: cert.correct,
      total: cert.total,
      date: fmtDate(cert.created_at),
      signer: await getSetting('cert_signer'),
      no: `T-${String(cert.id).padStart(6, '0')}`,
    });
  }
  return require('../certificateTopic').renderTopic({
    name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
    topic: cert.title,
    correct: cert.correct,
    total: cert.total,
    date: fmtDate(cert.created_at),
    signer: await getSetting('cert_signer'),
    no: `V-${String(cert.id).padStart(6, '0')}`,
  });
}

async function sendCert(telegram, chatId, cert, caption) {
  const img = await imageFor(cert);
  return telegram.sendPhoto(chatId, { source: img, filename: `sertifikat-${cert.id}.jpg` }, {
    caption, parse_mode: 'HTML',
    ...Markup.inlineKeyboard([[Markup.button.callback('📥 Yuqori sifatda (chop etish uchun)', `cert_file:${cert.id}`)]]),
  });
}

/**
 * Test tugagach chaqiriladi. Sertifikat berilgan bo'lsa true qaytaradi.
 * Xatolik bo'lsa (masalan rasm kutubxonasi o'rnatilmagan) — testga ta'sir qilmaydi.
 */
async function maybeAward(telegram, tg, type, id, correct, total) {
  try {
    if (!['variant', 'topic'].includes(type) || !total || !(await isOn('certs'))) return false;
    const pct = Math.round((correct / total) * 100);
    if (pct < (await minFor(type))) return false;
    const title = await ownerTitle(type, id);
    if (!title) return false;
    const old = await db('certificates').where({ user_tg: tg, owner_type: type, owner_id: id }).first();
    if (old && old.correct / old.total >= correct / total) return false; // yaxshiroq natija emas
    if (old) {
      await db('certificates').where({ id: old.id }).update({ correct, total, title, created_at: now() });
    } else {
      try {
        await db('certificates').insert({ user_tg: tg, owner_type: type, owner_id: id, title, correct, total, created_at: now() });
      } catch (e) {
        return false; // parallel so'rov allaqachon yozgan
      }
    }
    const cert = await db('certificates').where({ user_tg: tg, owner_type: type, owner_id: id }).first();
    await sendCert(telegram, tg, cert, `🎓 <b>Tabriklaymiz!</b> «${esc(title)}» bo'yicha ${pct}% natija uchun sertifikat${old ? ' (yangilandi)' : ''}.`);
    log(tg, `🎓 Sertifikat oldi: ${esc(title)} — ${pct}%`);
    return true;
  } catch (e) {
    console.error('[sertifikat]', e.message);
    return false;
  }
}

function register({ bot }) {
  // Mening sertifikatlarim
  const myList = async (ctx) => {
    const list = await db('certificates').where({ user_tg: ctx.from.id }).orderBy('id', 'desc').limit(40);
    const minT = await minFor('variant');
    const minV = await minFor('topic');
    if (!list.length) {
      return safeEdit(ctx, `🎓 <b>Mening sertifikatlarim</b>\n\nHozircha sertifikat yo'q.\n📝 Test variantini <b>${minT}%</b> dan, 🎬 videodars testini <b>${minV}%</b> dan yuqori natija bilan yeching — sertifikat avtomatik beriladi.`, {
        parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Yopish', 'close_msg')]]),
      });
    }
    const rows = list.map((c) => [Markup.button.callback(`${c.owner_type === 'variant' ? '📝' : '🎬'} ${c.title} — ${Math.round((c.correct / c.total) * 100)}%`.slice(0, 60), `cert_get:${c.id}`)]);
    rows.push([Markup.button.callback('⬅️ Yopish', 'close_msg')]);
    return safeEdit(ctx, `🎓 <b>Mening sertifikatlarim</b> (${list.length})\n\nKo'rish uchun bosing:`, { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) });
  };
  bot.action('cert_my', async (ctx) => {
    await ctx.answerCbQuery();
    return myList(ctx);
  });

  bot.action(/^cert_get:(\d+)$/, async (ctx) => {
    const c = await db('certificates').where({ id: Number(ctx.match[1]), user_tg: ctx.from.id }).first();
    if (!c) return ctx.answerCbQuery('Topilmadi');
    await ctx.answerCbQuery('⏳ Tayyorlanmoqda...');
    try {
      return await sendCert(ctx.telegram, ctx.chat.id, c, `🎓 «${esc(c.title)}» — ${Math.round((c.correct / c.total) * 100)}%`);
    } catch (e) {
      console.error('[sertifikat]', e.message);
      return ctx.reply("⚠️ Sertifikatni tayyorlab bo'lmadi. Keyinroq urinib ko'ring.");
    }
  });

  // Asl sifatdagi fayl (Telegram rasmni siqadi — chop etish uchun hujjat sifatida)
  bot.action(/^cert_file:(\d+)$/, async (ctx) => {
    const c = await db('certificates').where({ id: Number(ctx.match[1]), user_tg: ctx.from.id }).first();
    if (!c) return ctx.answerCbQuery('Topilmadi');
    await ctx.answerCbQuery('📥 Yuborilmoqda...');
    try {
      const img = await imageFor(c);
      return await ctx.telegram.sendDocument(ctx.chat.id, { source: img, filename: `sertifikat-${c.id}.jpg` }, { caption: `🎓 ${esc(c.title)}`, parse_mode: 'HTML' });
    } catch (e) {
      console.error('[sertifikat]', e.message);
      return ctx.reply("⚠️ Faylni tayyorlab bo'lmadi.");
    }
  });
}

module.exports = { register, maybeAward, imageFor, minFor };
