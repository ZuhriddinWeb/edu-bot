// Botda test ishlash: vaqt cheklovi, rasmli savollar, video yechimlar
const { Markup } = require('telegraf');
const { db } = require('./db');
const { esc, now, mmss, isAdmin, isOn, OWNER_TABLE } = require('./utils');
const { log } = require('./logger');

const L = 'ABCDEF';
const active = new Map(); // tg -> joriy test holati (xotirada; timer shu yerda ishlaydi)

const remainLine = (q) => (q.deadline ? `\n⏱ Qolgan vaqt: <b>${mmss(q.deadline - now())}</b>` : '');

const questionText = (row, idx, total, extra = '') => {
  const opts = JSON.parse(row.options);
  return `<b>${idx + 1}/${total}.</b> ${esc(row.body || '')}\n\n` + opts.map((o, i) => `<b>${L[i]})</b> ${esc(o)}`).join('\n') + extra;
};

async function startQuiz(ctx, ownerType, ownerId, title, opts = {}) {
  const rows = await db('questions').where({ owner_type: ownerType, owner_id: ownerId }).orderBy('id').select('id');
  if (!rows.length) return ctx.reply("⚠️ Bu testga hali savollar qo'shilmagan.");
  const old = active.get(ctx.from.id);
  if (old) clearTimeout(old.timer);

  const timeLimit = Number(opts.timeLimit) || 0;
  const q = {
    tg: ctx.from.id, chatId: ctx.chat.id, telegram: ctx.telegram,
    ownerType, ownerId, title, ids: rows.map((r) => r.id), idx: 0, correct: 0,
    reveal: opts.reveal !== false, deadline: timeLimit ? now() + timeLimit * 60000 : null, timer: null,
  };
  if (q.deadline) q.timer = setTimeout(() => timeUp(q), timeLimit * 60000);
  active.set(q.tg, q);
  log(q.tg, `▶️ Testni boshladi: ${esc(title)}`);

  await ctx.reply(
    `📝 <b>${esc(title)}</b>\n❓ Savollar soni: ${rows.length}\n⏱ Vaqt: ${timeLimit ? `<b>${timeLimit} daqiqa</b> (vaqt tugasa test avtomatik yakunlanadi)` : 'cheklanmagan'}\n\nOmad! 🍀`,
    { parse_mode: 'HTML' },
  );
  return sendQuestion(q);
}

async function sendQuestion(q) {
  const row = await db('questions').where({ id: q.ids[q.idx] }).first();
  if (!row) {
    q.idx += 1;
    return q.idx >= q.ids.length ? finish(q) : sendQuestion(q);
  }
  const opts = JSON.parse(row.options);
  const kb = Markup.inlineKeyboard([
    opts.map((_, i) => Markup.button.callback(L[i], `qa:${q.idx}:${i}`)),
    [Markup.button.callback("⛔ Testni to'xtatish", 'qstop')],
  ]);
  const text = questionText(row, q.idx, q.ids.length, remainLine(q));
  if (row.photo_id) {
    return q.telegram.sendPhoto(q.chatId, row.photo_id, { caption: text.slice(0, 1024), parse_mode: 'HTML', protect_content: true, ...kb });
  }
  return q.telegram.sendMessage(q.chatId, text, { parse_mode: 'HTML', protect_content: true, ...kb });
}

async function testSolution(type, id) {
  const t = OWNER_TABLE[type];
  if (!t) return null;
  const row = await db(t).where({ id }).first();
  return row && row.sol_ref ? row : null;
}

async function solutionCount(ids) {
  if (!ids.length) return 0;
  return Number((await db('questions').whereIn('id', ids).whereNotNull('sol_ref').count({ c: '*' }))[0].c);
}

async function finish(q, reason) {
  if (q.finished) return null;
  q.finished = true;
  clearTimeout(q.timer);
  if (active.get(q.tg) === q) active.delete(q.tg);

  const total = q.ids.length;
  await db('results').insert({ user_tg: q.tg, owner_type: q.ownerType, owner_id: q.ownerId, correct: q.correct, total, created_at: now() });
  const pct = Math.round((q.correct / total) * 100);
  log(q.tg, `🏁 Testni tugatdi: ${esc(q.title)} — ${q.correct}/${total} (${pct}%)${reason === 'time' ? ' ⏰ vaqt tugadi' : ''}`);

  const mark = pct >= 86 ? "🏆 A'lo!" : pct >= 71 ? '👍 Yaxshi!' : pct >= 56 ? "🙂 Qoniqarli" : "📚 Ko'proq takrorlang";
  const unanswered = total - q.idx;
  let text = `🏁 <b>Test yakunlandi!</b>${reason === 'time' ? ' ⏰ Vaqt tugadi.' : ''}\n📝 ${esc(q.title)}\n\n` +
    `✅ To'g'ri: <b>${q.correct}</b>\n❌ Noto'g'ri: <b>${q.idx - q.correct}</b>\n` +
    (unanswered > 0 ? `⏭ Javob berilmagan: <b>${unanswered}</b>\n` : '') +
    `📊 Natija: <b>${q.correct}/${total} (${pct}%)</b>\n\n${mark}`;

  const rows = [];
  if ((await testSolution(q.ownerType, q.ownerId)) || (await solutionCount(q.ids))) rows.push([Markup.button.callback('🎥 Video yechim', `sol:${q.ownerType}:${q.ownerId}`)]);
  if (q.ownerType === 'tt') {
    text += "\nNatijangiz o'qituvchingizga yuborildi.";
    require('./handlers/teacher').notifyTeacher(q.telegram, q.tg, q.ownerId, q.correct, total).catch((e) => console.error('[tt]', e.message));
  } else {
    rows.push([Markup.button.callback('🔁 Qayta ishlash', q.ownerType === 'variant' ? `tstart:${q.ownerId}` : `vq:${q.ownerId}`)]);
    rows.push([Markup.button.callback('⬅️ Orqaga', q.ownerType === 'variant' ? `tv:${q.ownerId}` : `vt:${q.ownerId}`)]);
  }
  // Sertifikat haqida eslatma (minimal foizga yetmagan bo'lsa)
  if (q.ownerType !== 'tt' && (await isOn('certs'))) {
    const min = await require('./handlers/certs').minFor(q.ownerType);
    if (pct < min) text += `\n\n🎓 Sertifikat olish uchun kamida <b>${min}%</b> natija kerak. Yana urinib ko'ring!`;
  }
  const res = await q.telegram.sendMessage(q.chatId, text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) });
  if (q.ownerType !== 'tt') await require('./handlers/certs').maybeAward(q.telegram, q.tg, q.ownerType, q.ownerId, q.correct, total);
  return res;
}

async function timeUp(q) {
  if (q.finished || active.get(q.tg) !== q) return;
  await q.telegram.sendMessage(q.chatId, '⏰ <b>Vaqt tugadi!</b>', { parse_mode: 'HTML' }).catch(() => {});
  await finish(q, 'time').catch((e) => console.error('[quiz] timeUp', e.message));
}

// Foydalanuvchi bu test natijasini ko'rishga haqlimi (yechgan / admin / test egasi)
async function canSeeSolutions(tg, type, id) {
  if (isAdmin(tg)) return true;
  if (type === 'tt') {
    const t = await db('teacher_tests').where({ id }).first();
    if (t && Number(t.teacher_tg) === tg) return true;
  }
  return !!(await db('results').where({ user_tg: tg, owner_type: type, owner_id: id }).first());
}

async function sendSolution(telegram, chatId, qrow, num) {
  const cap = `🎥 <b>${num ? `${num}-savol` : 'Savol'} yechimi</b>\n${esc((qrow.body || '').slice(0, 300))}\n✅ To'g'ri javob: <b>${L[qrow.correct]}</b>`;
  const extra = { caption: cap, parse_mode: 'HTML', protect_content: true, ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Yopish', 'close_msg')]]) };
  if (qrow.sol_type === 'video') return telegram.sendVideo(chatId, qrow.sol_ref, extra);
  if (qrow.sol_type === 'document') return telegram.sendDocument(chatId, qrow.sol_ref, extra);
  return telegram.sendMessage(chatId, cap, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.url("▶️ Videoni ko'rish", qrow.sol_ref)]]) });
}

// Butun test uchun bitta video yechim
async function sendTestSolution(telegram, chatId, owner, title) {
  const cap = `🎥 <b>Video yechim</b>${title ? `\n📝 ${esc(title)}` : ''}`;
  const extra = { caption: cap, parse_mode: 'HTML', protect_content: true, ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Yopish', 'close_msg')]]) };
  if (owner.sol_type === 'video') return telegram.sendVideo(chatId, owner.sol_ref, extra);
  if (owner.sol_type === 'document') return telegram.sendDocument(chatId, owner.sol_ref, extra);
  return telegram.sendMessage(chatId, cap, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.url("▶️ Videoni ko'rish", owner.sol_ref)]]) });
}

function register({ bot }) {
  bot.action(/^qa:(\d+):(\d+)$/, async (ctx) => {
    const q = active.get(ctx.from.id);
    const idx = Number(ctx.match[1]);
    const opt = Number(ctx.match[2]);
    if (!q || idx !== q.idx) return ctx.answerCbQuery('Bu savolga javob berilgan yoki test tugagan.');
    if (q.deadline && now() > q.deadline) {
      await ctx.answerCbQuery('⏰ Vaqt tugadi');
      return finish(q, 'time');
    }
    const row = await db('questions').where({ id: q.ids[idx] }).first();
    const ok = row && opt === row.correct;
    if (ok) q.correct += 1;
    q.idx += 1;
    await ctx.answerCbQuery(!q.reveal ? 'Javob qabul qilindi' : ok ? "✅ To'g'ri!" : "❌ Noto'g'ri");
    if (row) {
      const tail = !q.reveal
        ? `\n\nSizning javobingiz: <b>${L[opt]}</b>`
        : `\n\nSizning javobingiz: <b>${L[opt]}</b> ${ok ? '✅' : '❌'}` + (ok ? '' : `\nTo'g'ri javob: <b>${L[row.correct]}</b>`);
      const text = questionText(row, idx, q.ids.length, tail);
      const edit = ctx.callbackQuery.message && ctx.callbackQuery.message.photo
        ? ctx.editMessageCaption(text.slice(0, 1024), { parse_mode: 'HTML' })
        : ctx.editMessageText(text, { parse_mode: 'HTML' });
      await edit.catch(() => {});
    }
    return q.idx >= q.ids.length ? finish(q) : sendQuestion(q);
  });

  bot.action('qstop', async (ctx) => {
    const q = active.get(ctx.from.id);
    await ctx.answerCbQuery("Test to'xtatildi");
    await ctx.editMessageReplyMarkup(undefined).catch(() => {});
    if (!q) return null;
    clearTimeout(q.timer);
    q.finished = true;
    active.delete(ctx.from.id);
    log(ctx.from.id, `⛔ Testni to'xtatdi: ${esc(q.title)}`);
    return ctx.reply(`⛔ Test to'xtatildi. ${q.idx} ta savoldan ${q.correct} tasiga to'g'ri javob berdingiz. Natija saqlanmadi.`);
  });

  // Video yechimlar ro'yxati
  bot.action(/^sol:(variant|topic|tt):(\d+)$/, async (ctx) => {
    const type = ctx.match[1];
    const id = Number(ctx.match[2]);
    if (!(await canSeeSolutions(ctx.from.id, type, id))) return ctx.answerCbQuery('Avval testni yeching', { show_alert: true });
    await ctx.answerCbQuery();
    const owner = await testSolution(type, id);
    if (owner) await sendTestSolution(ctx.telegram, ctx.chat.id, owner, owner.title || owner.name);
    // Eski testlarda savollarga alohida yuklangan videolar bo'lsa — ro'yxat
    const qs = await db('questions').where({ owner_type: type, owner_id: id }).orderBy('id').select('id', 'sol_ref');
    const btns = qs.map((r, i) => (r.sol_ref ? Markup.button.callback(`${i + 1}-savol`, `solq:${r.id}:${i + 1}`) : null)).filter(Boolean);
    if (!btns.length) return owner ? null : ctx.reply("Bu testda video yechim yo'q.");
    const rows = [];
    for (let i = 0; i < btns.length; i += 4) rows.push(btns.slice(i, i + 4));
    rows.push([Markup.button.callback('⬅️ Yopish', 'close_msg')]);
    return ctx.reply('🎥 Qaysi savolning yechimini ko\'rasiz?', Markup.inlineKeyboard(rows));
  });

  bot.action(/^solq:(\d+):(\d+)$/, async (ctx) => {
    const row = await db('questions').where({ id: Number(ctx.match[1]) }).first();
    if (!row || !row.sol_ref) return ctx.answerCbQuery('Topilmadi');
    if (!(await canSeeSolutions(ctx.from.id, row.owner_type, row.owner_id))) return ctx.answerCbQuery('Avval testni yeching', { show_alert: true });
    await ctx.answerCbQuery();
    return sendSolution(ctx.telegram, ctx.chat.id, row, Number(ctx.match[2]));
  });
}

module.exports = { register, startQuiz, canSeeSolutions, sendSolution, sendTestSolution, testSolution };
