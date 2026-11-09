/**
 * Foydalanuvchi harakatlarini maxfiy kanalga yozadi.
 * Har bir foydalanuvchining bitta sessiyasi = kanalda bitta xabar; yangi harakatlar
 * shu xabarni tahrirlab (edit) pastiga qo'shiladi. Sessiya LOG_SESSION_MINUTES daqiqa
 * harakatsizlikdan keyin yoki xabar to'lib qolsa yangisi boshlanadi.
 *
 * Telegram kanalga taxminan 20 ta xabar/daqiqa cheklovi bor, shuning uchun
 * yozuvlar navbatga yig'iladi va LOG_INTERVAL_MS da bir marta bitta xabar yangilanadi
 * (bir foydalanuvchining shu orada yig'ilgan barcha qatorlari bitta tahrirda chiqadi).
 */
const config = require('./config');
const { db } = require('./db');
const { esc, fmtDate, fmtTime } = require('./utils');

const MAX_LEN = 3800;
const sessions = new Map(); // tg -> { msgId, header, lines, lastAt, part }
const queue = []; // yangilanishi kerak bo'lgan sessiyalar (tartib bilan)
let telegram = null;
let pausedUntil = 0;

const enabled = () => !!(telegram && config.LOG_CHANNEL_ID);

function render(s) {
  return `${s.header}\n${s.lines.join('\n')}`;
}

async function headerFor(tg, part) {
  const u = await db('users').where({ tg_id: tg }).first();
  const name = u ? `${esc(u.first_name || '')} ${esc(u.last_name || '')}`.trim() || "(ro'yxatdan o'tmagan)" : '?';
  const uname = u && u.username ? ` @${esc(u.username)}` : '';
  const phone = u && u.phone ? ` | 📞 ${esc(u.phone)}` : '';
  return `👤 <b>${name}</b>${uname}\n🆔 <code>${tg}</code>${phone}\n🕒 Sessiya: ${fmtDate(Date.now())} ${fmtTime(Date.now())}${part > 1 ? ` (davomi ${part})` : ''}\n━━━━━━━━━━━━`;
}

function enqueue(s) {
  if (!s.queued) {
    s.queued = true;
    queue.push(s);
  }
}

/** Foydalanuvchi harakatini yozish. line — HTML xavfsiz bo'lishi kerak (esc qiling). */
async function log(tg, line) {
  if (!enabled() || !tg) return;
  try {
    const t = Date.now();
    let s = sessions.get(tg);
    const gap = config.LOG_SESSION_MINUTES * 60 * 1000;
    const entry = `<code>${fmtTime(t)}</code> ${line}`;
    if (!s || t - s.lastAt > gap) {
      s = { tg, msgId: null, header: await headerFor(tg, 1), lines: [], lastAt: t, part: 1 };
      sessions.set(tg, s);
    } else if (render(s).length + entry.length > MAX_LEN) {
      // Xabar to'ldi — davomini yangi xabarda boshlaymiz
      const part = s.part + 1;
      s = { tg, msgId: null, header: await headerFor(tg, part), lines: [], lastAt: t, part };
      sessions.set(tg, s);
    }
    // Ro'yxatdan o'tgach sarlavhaga ism va telefonni qo'shamiz
    if (s.header.includes("ro'yxatdan o'tmagan")) s.header = await headerFor(tg, s.part);
    s.lines.push(entry.slice(0, 600));
    s.lastAt = t;
    enqueue(s);
  } catch (e) {
    console.error('[log]', e.message);
  }
}

async function flushOne() {
  if (!queue.length || Date.now() < pausedUntil) return;
  const s = queue.shift();
  s.queued = false;
  const text = render(s);
  try {
    if (!s.msgId) {
      const m = await telegram.sendMessage(config.LOG_CHANNEL_ID, text, { parse_mode: 'HTML', disable_notification: true, link_preview_options: { is_disabled: true } });
      s.msgId = m.message_id;
    } else {
      await telegram.editMessageText(config.LOG_CHANNEL_ID, s.msgId, undefined, text, { parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
    }
  } catch (e) {
    const retry = e.parameters && e.parameters.retry_after;
    if (retry) {
      pausedUntil = Date.now() + retry * 1000;
      enqueue(s); // keyin qayta urinamiz
    } else if (!/message is not modified/.test(e.message)) {
      console.error('[log] kanalga yozilmadi:', e.message);
    }
  }
}

// Eski sessiyalarni xotiradan tozalash
function gc() {
  const limit = Date.now() - config.LOG_SESSION_MINUTES * 60 * 1000 * 2;
  for (const [tg, s] of sessions) if (s.lastAt < limit && !s.queued) sessions.delete(tg);
}

function start(tg) {
  telegram = tg;
  if (!config.LOG_CHANNEL_ID) {
    console.log("[log] LOG_CHANNEL_ID berilmagan — loglar o'chiq");
    return;
  }
  let busy = false;
  setInterval(async () => {
    if (busy) return;
    busy = true;
    await flushOne();
    busy = false;
  }, config.LOG_INTERVAL_MS).unref();
  setInterval(gc, 10 * 60 * 1000).unref();
  console.log(`[log] loglar ${config.LOG_CHANNEL_ID} kanaliga yoziladi`);
}

// Bosilgan inline tugma matnini topish (log uchun o'qiladigan nom)
function pressedText(cq) {
  const kb = (cq.message && cq.message.reply_markup && cq.message.reply_markup.inline_keyboard) || [];
  for (const row of kb) for (const b of row) if (b.callback_data === cq.data) return b.text;
  return cq.data;
}

// Har bir update ni avtomatik log qiluvchi middleware
function middleware() {
  return (ctx, next) => {
    if (enabled() && ctx.from) {
      const m = ctx.message;
      let line = null;
      if (ctx.callbackQuery) line = `👆 ${esc(pressedText(ctx.callbackQuery))}`;
      else if (m) {
        const st = ctx.session && ctx.session.state;
        if (m.text) {
          const t = m.text.length > 200 ? `${m.text.slice(0, 200)}…` : m.text;
          line = m.text.startsWith('/') ? `⌨️ ${esc(t)}` : st ? `✏️ [${esc(st)}] ${esc(t)}` : `💬 ${esc(t)}`;
        } else if (m.contact) line = `📞 Kontakt yubordi: ${esc(m.contact.phone_number)}`;
        else if (m.location) line = '📍 Lokatsiya yubordi';
        else if (m.photo) line = `🖼 Rasm yubordi${st ? ` [${esc(st)}]` : ''}`;
        else if (m.video) line = `🎥 Video yubordi${st ? ` [${esc(st)}]` : ''}`;
        else if (m.document) line = `📎 Fayl yubordi: ${esc(m.document.file_name || '')}`;
        else if (m.voice) line = '🎙 Ovozli xabar yubordi';
        else if (m.web_app_data) line = '📱 Mini ilovadan maʼlumot';
        else line = '📨 Xabar yubordi';
      }
      if (line) log(ctx.from.id, line);
    }
    return next();
  };
}

module.exports = { start, log, middleware };
