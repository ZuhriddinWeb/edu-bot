#!/usr/bin/env node
/**
 * edu-bot v2.6.0 — bitta faylli versiya (avtomatik yig'ilgan).
 * Ishga tushirish: npm install && node bot.js   (sozlamalar .env faylida)
 * Bu fayl src/ papkadagi 29 ta modul va mini ilova sahifasidan yig'ilgan.
 */
'use strict';
const __modules = {};
const __cache = {};
const __path = require('path');
function __resolve(from, req) {
  if (!req.startsWith('.')) return null;
  const base = __path.posix.normalize(__path.posix.join(__path.posix.dirname(from), req));
  for (const c of [base, base + '.js', base + '/index.js']) if (__modules[c]) return c;
  throw new Error('Modul topilmadi: ' + req + ' (' + from + ')');
}
function __require(from) {
  return (req) => {
    const id = __resolve(from, req);
    if (!id) return require(req);
    if (__cache[id]) return __cache[id].exports;
    const module = { exports: {} };
    __cache[id] = module;
    __modules[id](module, module.exports, __require(id));
    return module.exports;
  };
}
global.__EMBEDDED_FILES = {"webapp/index.html":"<!DOCTYPE html>\n<html lang=\"uz\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no\">\n<title>Ta'lim</title>\n<script src=\"https://telegram.org/js/telegram-web-app.js\"></script>\n<style>\n  :root {\n    --bg: var(--tg-theme-bg-color, #ffffff);\n    --bg2: var(--tg-theme-secondary-bg-color, #f2f3f5);\n    --text: var(--tg-theme-text-color, #1c1c1e);\n    --hint: var(--tg-theme-hint-color, #8e8e93);\n    --link: var(--tg-theme-link-color, #2b7de9);\n    --btn: var(--tg-theme-button-color, #2b7de9);\n    --btn-text: var(--tg-theme-button-text-color, #ffffff);\n    --card: var(--tg-theme-section-bg-color, var(--bg));\n    --ok: #2fb35a;\n    --bad: #e5484d;\n    --warn: #f5a524;\n    --radius: 14px;\n  }\n  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }\n  html, body { margin: 0; padding: 0; background: var(--bg2); color: var(--text);\n    font: 15px/1.4 -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif; }\n  #app { max-width: 640px; margin: 0 auto; padding: 12px 12px 90px; }\n  h1 { font-size: 20px; margin: 4px 4px 12px; }\n  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: var(--hint); font-weight: 600; margin: 18px 6px 8px; }\n  .card { background: var(--card); border-radius: var(--radius); padding: 14px; margin-bottom: 10px; }\n  .profile { display: flex; align-items: center; gap: 12px; }\n  .avatar { width: 48px; height: 48px; border-radius: 50%; background: var(--btn); color: var(--btn-text);\n    display: grid; place-items: center; font-weight: 700; font-size: 19px; flex: none; }\n  .muted { color: var(--hint); font-size: 13px; }\n  .balance { margin-left: auto; text-align: right; }\n  .balance b { font-size: 17px; display: block; }\n  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }\n  .tile { background: var(--card); border-radius: var(--radius); padding: 14px 12px; border: 0; color: var(--text);\n    text-align: left; font: inherit; cursor: pointer; min-height: 84px; display: flex; flex-direction: column; justify-content: space-between; }\n  .tile .ic { font-size: 26px; }\n  .tile b { font-size: 14px; }\n  .tile:active, .row:active, .opt:active { opacity: .7; }\n  .list { background: var(--card); border-radius: var(--radius); overflow: hidden; margin-bottom: 10px; }\n  .row { display: flex; align-items: center; gap: 10px; padding: 13px 14px; border: 0; width: 100%; background: none;\n    color: var(--text); font: inherit; text-align: left; cursor: pointer; border-bottom: 1px solid var(--bg2); }\n  .row:last-child { border-bottom: 0; }\n  .row .grow { flex: 1; min-width: 0; }\n  .row .title { font-weight: 500; overflow: hidden; text-overflow: ellipsis; }\n  .chev { color: var(--hint); }\n  .badge { font-size: 12px; padding: 3px 8px; border-radius: 99px; background: var(--bg2); white-space: nowrap; }\n  .badge.ok { background: color-mix(in srgb, var(--ok) 18%, transparent); color: var(--ok); }\n  .btn { display: block; width: 100%; border: 0; border-radius: 12px; padding: 13px; font: inherit; font-weight: 600;\n    background: var(--btn); color: var(--btn-text); cursor: pointer; margin-top: 8px; }\n  .btn.sec { background: var(--bg2); color: var(--link); }\n  .btn:disabled { opacity: .5; }\n  .tabs { display: flex; background: var(--card); border-radius: 12px; padding: 4px; gap: 4px; margin-bottom: 10px; }\n  .tabs button { flex: 1; border: 0; background: none; padding: 8px; border-radius: 9px; font: inherit; color: var(--text); cursor: pointer; }\n  .tabs button.on { background: var(--btn); color: var(--btn-text); font-weight: 600; }\n  input, select { width: 100%; padding: 12px; border-radius: 12px; border: 0; background: var(--card); color: var(--text); font: inherit; margin-bottom: 10px; }\n  .q-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }\n  .timer { font-weight: 700; font-variant-numeric: tabular-nums; }\n  .timer.low { color: var(--bad); }\n  .progress { height: 5px; background: var(--bg2); border-radius: 9px; overflow: hidden; margin-bottom: 12px; }\n  .progress i { display: block; height: 100%; background: var(--btn); transition: width .2s; }\n  .q-body { font-size: 17px; font-weight: 500; white-space: pre-wrap; margin-bottom: 12px; }\n  .q-img { width: 100%; border-radius: 12px; margin-bottom: 12px; background: var(--bg2); }\n  .opt { display: flex; gap: 10px; align-items: flex-start; width: 100%; text-align: left; padding: 13px; margin-bottom: 8px;\n    border-radius: 12px; border: 2px solid var(--bg2); background: var(--card); color: var(--text); font: inherit; cursor: pointer; }\n  .opt .l { font-weight: 700; width: 22px; flex: none; }\n  .opt.sel { border-color: var(--btn); }\n  .res-big { font-size: 44px; font-weight: 800; text-align: center; margin: 6px 0 0; }\n  .center { text-align: center; }\n  .mark-ok { color: var(--ok); } .mark-bad { color: var(--bad); }\n  .medal { width: 28px; text-align: center; font-weight: 700; }\n  .me { background: color-mix(in srgb, var(--btn) 10%, transparent); }\n  .empty { text-align: center; color: var(--hint); padding: 30px 10px; }\n  .pre { white-space: pre-wrap; }\n  .toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); background: rgba(0,0,0,.82); color: #fff;\n    padding: 10px 16px; border-radius: 12px; font-size: 14px; z-index: 10; max-width: 90%; text-align: center; }\n  .spinner { width: 28px; height: 28px; border: 3px solid var(--bg2); border-top-color: var(--btn); border-radius: 50%;\n    animation: spin .8s linear infinite; margin: 60px auto; }\n  @keyframes spin { to { transform: rotate(360deg); } }\n  .thumb { width: 46px; height: 46px; border-radius: 8px; object-fit: cover; background: var(--bg2); flex: none; }\n  .book-img { width: 100%; max-height: 320px; object-fit: contain; border-radius: 12px; background: var(--bg2); }\n  a { color: var(--link); }\n</style>\n</head>\n<body>\n<div id=\"app\"><div class=\"spinner\"></div></div>\n<script>\n(() => {\n  const tg = window.Telegram && window.Telegram.WebApp;\n  const app = document.getElementById('app');\n  const L = 'ABCDEF';\n  let ME = null;\n  const stack = []; // ekranlar tarixi (orqaga tugmasi uchun)\n  let quiz = null;\n\n  if (tg) { tg.ready(); tg.expand(); }\n\n  // ---------- yordamchilar ----------\n  const h = (s) => String(s ?? '').replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[c]));\n  const money = (n) => `${String(Math.trunc(Number(n) || 0)).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ' ')} so'm`;\n  const pad = (n) => String(n).padStart(2, '0');\n  const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; };\n  const date = (ms) => { const d = new Date(ms); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`; };\n  const haptic = (t = 'light') => { try { tg.HapticFeedback.impactOccurred(t); } catch (e) {} };\n\n  function toast(text) {\n    const el = document.createElement('div');\n    el.className = 'toast'; el.textContent = text;\n    document.body.appendChild(el);\n    setTimeout(() => el.remove(), 2600);\n  }\n\n  async function api(path, body) {\n    const opt = { method: body ? 'POST' : 'GET', headers: { 'X-Init-Data': tg ? tg.initData : '' } };\n    if (body) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }\n    const r = await fetch(path, opt);\n    const data = await r.json().catch(() => ({}));\n    if (!r.ok) { const e = new Error(data.error || 'Xatolik'); e.code = data.code; e.data = data; throw e; }\n    return data;\n  }\n\n  const openBot = (payload) => {\n    const url = `https://t.me/${ME.bot}${payload ? `?start=${payload}` : ''}`;\n    if (tg) { tg.openTelegramLink(url); tg.close(); } else location.href = url;\n  };\n  const openLink = (url) => (tg ? tg.openLink(url) : window.open(url, '_blank'));\n\n  function confirmBox(text) {\n    return new Promise((res) => (tg && tg.showConfirm ? tg.showConfirm(text, res) : res(window.confirm(text))));\n  }\n\n  // ---------- navigatsiya ----------\n  function go(screen, ...args) {\n    if (quiz && screen !== quizScreen && screen !== resultScreen) stopQuizTimer();\n    stack.push([screen, args]);\n    return render();\n  }\n  function back() {\n    if (quiz && quiz.running) {\n      return confirmBox(\"Testdan chiqasizmi? Javoblaringiz saqlanmaydi.\").then((ok) => {\n        if (!ok) return;\n        stopQuizTimer(); quiz = null; stack.pop(); render();\n      });\n    }\n    stack.pop();\n    if (!stack.length) stack.push([homeScreen, []]);\n    return render();\n  }\n  async function render() {\n    const [screen, args] = stack[stack.length - 1];\n    if (tg) { stack.length > 1 ? tg.BackButton.show() : tg.BackButton.hide(); tg.MainButton.hide(); }\n    window.scrollTo(0, 0);\n    try { await screen(...args); }\n    catch (e) { app.innerHTML = `<div class=\"card center\"><p>⚠️ ${h(e.message)}</p><button class=\"btn sec\" data-back>⬅️ Orqaga</button></div>`; bind(); }\n  }\n  if (tg) tg.BackButton.onClick(back);\n\n  const loading = () => { app.innerHTML = '<div class=\"spinner\"></div>'; };\n\n  // data-* atributlar orqali tugmalarga hodisa biriktirish\n  const actions = {};\n  function bind() {\n    app.querySelectorAll('[data-act]').forEach((el) => {\n      el.onclick = () => { haptic(); const fn = actions[el.dataset.act]; if (fn) fn(el.dataset.arg, el); };\n    });\n    app.querySelectorAll('[data-back]').forEach((el) => { el.onclick = back; });\n  }\n\n  // ---------- Bosh sahifa ----------\n  async function homeScreen() {\n    loading();\n    ME = await api('/api/me');\n    const u = ME.user; const f = ME.features;\n    const tiles = [\n      f.tests && ['📝', 'Test ishlash', 'tests'],\n      f.videos && ['🎬', 'Videodarslar va testlar', 'videos'],\n      f.rating && ['🏆', 'Reyting', 'rating'],\n      ['💰', 'Balans', 'balance'],\n      f.books && ['📚', 'Kitoblar', 'books'],\n      f.centers && ['🏫', \"O'quv markaz va maktablar\", 'centers'],\n      f.teacher && ['👨‍🏫', \"O'qituvchilar uchun\", 'teacher'],\n      f.support && ['☎️', \"Admin bilan bog'lanish\", 'support'],\n    ].filter(Boolean);\n    app.innerHTML = `\n      <div class=\"card profile\">\n        <div class=\"avatar\">${h((u.first_name || '?')[0])}</div>\n        <div><b>${h(u.first_name)} ${h(u.last_name)}</b><div class=\"muted\">${h(u.phone)}</div></div>\n        <div class=\"balance\"><span class=\"muted\">Balans</span><b>${money(u.balance)}</b></div>\n      </div>\n      ${ME.ad ? `<div class=\"card ad\">${ME.ad.photo ? `<img class=\"q-img\" src=\"${ME.ad.photo}\" alt=\"\">` : ''}<div class=\"pre\">${h(ME.ad.text)}</div>\n        ${ME.ad.btn_url ? `<button class=\"btn\" data-act=\"adlink\">${h(ME.ad.btn_text)}</button>` : ''}<div class=\"muted\" style=\"text-align:right;font-size:11px\">Reklama</div></div>` : ''}\n      <div class=\"grid\">${tiles.map(([ic, t, k]) => `<button class=\"tile\" data-act=\"open\" data-arg=\"${k}\"><span class=\"ic\">${ic}</span><b>${h(t)}</b></button>`).join('')}</div>`;\n    bind();\n  }\n  actions.adlink = () => {\n    const u = ME.ad.btn_url;\n    if (/^https:\\/\\/t\\.me\\//.test(u) && tg) tg.openTelegramLink(u); else openLink(u);\n  };\n  actions.open = (k) => {\n    const map = { tests: testsCats, videos: videoGroups, rating: ratingScreen, balance: balanceScreen, books: booksScreen, centers: centersScreen };\n    if (map[k]) return go(map[k]);\n    if (k === 'teacher') return openBot('teacher');\n    if (k === 'support') return openBot('support');\n  };\n\n  // ---------- Testlar ----------\n  async function testsCats() {\n    app.innerHTML = `<h1>📝 Test ishlash</h1><div class=\"list\">${ME.testCategories.map((c) =>\n      `<button class=\"row\" data-act=\"tcat\" data-arg=\"${c.code}\"><span class=\"grow title\">${h(c.name)}</span><span class=\"chev\">›</span></button>`).join('')}</div>`;\n    bind();\n  }\n  actions.tcat = (code) => go(testsList, code);\n\n  const itemBadge = (it) => (it.owned ? `<span class=\"badge ok\">${it.price ? '✅ Ochiq' : '🆓 Bepul'}</span>` : `<span class=\"badge\">🔒 ${money(it.price)}</span>`);\n\n  async function testsList(code) {\n    loading();\n    const cat = ME.testCategories.find((c) => c.code === code);\n    const list = await api(`/api/tests?cat=${code}`);\n    app.innerHTML = `<h1>📝 ${h(cat.name)}</h1>` + (list.length ? `<div class=\"list\">${list.map((v) =>\n      `<button class=\"row\" data-act=\"tvar\" data-arg=\"${v.id}\"><span class=\"grow\"><div class=\"title\">${h(v.title)}</div>\n       <div class=\"muted\">❓ ${v.qcount} ta savol · ⏱ ${v.time_limit ? `${v.time_limit} daqiqa` : 'cheklanmagan'}${v.pdf ? ' · 📄 PDF' : ''}</div></span>${itemBadge(v)}</button>`).join('')}</div>`\n      : '<div class=\"empty\">Hozircha variantlar qo\\'shilmagan</div>');\n    actions.tvar = (id) => go(itemScreen, 'variant', list.find((x) => String(x.id) === id), code);\n    bind();\n  }\n\n  // Test varianti yoki video mavzu sahifasi\n  async function itemScreen(type, item, parent) {\n    if (type === 'topic') { loading(); item = await api(`/api/topic?id=${item.id}`); }\n    const isTopic = type === 'topic';\n    let html = `<h1>${isTopic ? '🎬' : '📝'} ${h(item.title)}</h1><div class=\"card\">`;\n    if (item.description) html += `<p class=\"pre\">${h(item.description)}</p>`;\n    html += `<div class=\"muted\">❓ ${item.qcount} ta savol${isTopic ? ' (takrorlash testi)' : ''}<br>⏱ Vaqt: ${item.time_limit ? `${item.time_limit} daqiqa` : 'cheklanmagan'}<br>💵 Narxi: ${item.price ? money(item.price) : 'bepul'}</div></div>`;\n    if (!item.owned) {\n      html += `<div class=\"card\"><div class=\"muted\">Balansingiz: <b>${money(ME.user.balance)}</b></div>\n        <button class=\"btn\" data-act=\"buy\">💳 Sotib olish — ${money(item.price)}</button></div>`;\n    } else {\n      if (isTopic) {\n        html += item.video_url\n          ? `<button class=\"btn\" data-act=\"vurl\">▶️ Videoni ko'rish</button>`\n          : `<button class=\"btn\" data-act=\"vsend\">▶️ Videoni ko'rish (chatga yuboriladi)</button>`;\n      }\n      if (item.qcount) html += `<button class=\"btn ${isTopic ? 'sec' : ''}\" data-act=\"qstart\">📝 ${isTopic ? 'Takrorlash uchun test' : 'Testni boshlash'}</button>`;\n    }\n    if (!isTopic && item.pdf) {\n      html += `<div class=\"card\" style=\"margin-top:10px\"><b>📄 Elektron variant (PDF)</b><div class=\"muted\">Chop etish yoki saqlash uchun</div>` +\n        (item.pdf.owned ? '<button class=\"btn sec\" data-act=\"pdfget\">📥 PDFni chatga yuborish</button>'\n          : `<button class=\"btn sec\" data-act=\"pdfbuy\">💳 PDFni sotib olish — ${item.pdf.price ? money(item.pdf.price) : 'bepul'}</button>`) + '</div>';\n    }\n    app.innerHTML = html;\n    actions.buy = async (a, el) => {\n      if (!(await confirmBox(`«${item.title}» — ${money(item.price)}. Sotib olasizmi?`))) return;\n      el.disabled = true;\n      try {\n        const r = await api('/api/buy', { type, id: item.id });\n        ME.user.balance = r.balance; item.owned = true;\n        toast('✅ Sotib olindi!'); haptic('medium');\n        itemScreen(type, item, parent);\n      } catch (e) {\n        el.disabled = false;\n        if (e.code === 'nofunds' && (await confirmBox(`${e.message}\\n\\nBalansni to'ldirasizmi?`))) go(balanceScreen);\n        else if (e.code !== 'nofunds') toast(e.message);\n      }\n    };\n    actions.pdfbuy = async (a, el) => {\n      if (!(await confirmBox(`«${item.title}» PDF — ${money(item.pdf.price)}. Sotib olasizmi?`))) return;\n      el.disabled = true;\n      try {\n        const r = await api('/api/buy', { type: 'pdf', id: item.id });\n        ME.user.balance = r.balance; item.pdf.owned = true;\n        await api('/api/pdf/send', { id: item.id });\n        toast('✅ Sotib olindi! PDF chatga yuborildi'); haptic('medium');\n        itemScreen(type, item, parent);\n      } catch (e) {\n        el.disabled = false;\n        if (e.code === 'nofunds' && (await confirmBox(`${e.message}\\n\\nBalansni to'ldirasizmi?`))) go(balanceScreen);\n        else if (e.code !== 'nofunds') toast(e.message);\n      }\n    };\n    actions.pdfget = async (a, el) => {\n      el.disabled = true;\n      try { await api('/api/pdf/send', { id: item.id }); toast('📄 PDF chatga yuborildi'); } catch (e) { toast(e.message); }\n      el.disabled = false;\n    };\n    actions.vurl = () => openLink(item.video_url);\n    actions.vsend = async (a, el) => {\n      el.disabled = true;\n      try { await api('/api/topic/send', { id: item.id }); toast('🎬 Video chatga yuborildi'); if (tg) setTimeout(() => tg.close(), 900); }\n      catch (e) { toast(e.message); el.disabled = false; }\n    };\n    actions.qstart = () => startQuiz(type, item.id);\n    bind();\n  }\n\n  // ---------- Videodarslar ----------\n  async function videoGroups() {\n    app.innerHTML = `<h1>🎬 Videodarslar</h1><div class=\"list\">${ME.videoGroups.map((g) =>\n      `<button class=\"row\" data-act=\"vgrp\" data-arg=\"${g.code}\"><span class=\"grow title\">${h(g.name)}</span><span class=\"chev\">›</span></button>`).join('')}</div>`;\n    bind();\n  }\n  actions.vgrp = (code) => go(videoList, code);\n\n  async function videoList(code) {\n    loading();\n    const g = ME.videoGroups.find((x) => x.code === code);\n    const list = await api(`/api/videos?grp=${code}`);\n    app.innerHTML = `<h1>🎬 ${h(g.name)}</h1>` + (list.length ? `<div class=\"list\">${list.map((t) =>\n      `<button class=\"row\" data-act=\"vtop\" data-arg=\"${t.id}\"><span class=\"grow\"><div class=\"title\">${h(t.title)}</div>\n       <div class=\"muted\">📺 Video${t.qcount ? ` + 📝 ${t.qcount} ta savol` : ''}</div></span>${itemBadge(t)}</button>`).join('')}</div>`\n      : '<div class=\"empty\">Hozircha mavzular qo\\'shilmagan</div>');\n    actions.vtop = (id) => go(itemScreen, 'topic', { id }, code);\n    bind();\n  }\n\n  // ---------- Test ishlash ----------\n  function stopQuizTimer() { if (quiz && quiz.timer) { clearInterval(quiz.timer); quiz.timer = null; } }\n\n  async function startQuiz(type, id) {\n    loading();\n    try {\n      const d = await api('/api/quiz/start', { type, id });\n      quiz = { ...d, type, ownerId: id, idx: 0, answers: {}, running: true, offset: Date.now() - d.now };\n      go(quizScreen);\n    } catch (e) { toast(e.message); back(); }\n  }\n\n  function quizScreen() {\n    const qz = quiz;\n    if (!qz) return back();\n    const q = qz.questions[qz.idx];\n    const total = qz.questions.length;\n    const sel = qz.answers[q.id];\n    app.innerHTML = `\n      <div class=\"q-head\"><span class=\"muted\">${qz.idx + 1} / ${total}</span>${qz.deadline ? '<span class=\"timer\" id=\"timer\"></span>' : ''}</div>\n      <div class=\"progress\"><i style=\"width:${(qz.idx / total) * 100}%\"></i></div>\n      <div class=\"card\">\n        ${q.photo ? `<img class=\"q-img\" src=\"${q.photo}\" alt=\"\">` : ''}\n        ${q.body ? `<div class=\"q-body\">${h(q.body)}</div>` : ''}\n        ${q.options.map((o, i) => `<button class=\"opt ${sel === i ? 'sel' : ''}\" data-act=\"pick\" data-arg=\"${i}\"><span class=\"l\">${L[i]})</span><span>${h(o)}</span></button>`).join('')}\n      </div>\n      <div style=\"display:flex; gap:8px\">\n        ${qz.idx > 0 ? '<button class=\"btn sec\" style=\"flex:1\" data-act=\"prev\">⬅️</button>' : ''}\n        <button class=\"btn\" style=\"flex:3\" data-act=\"next\">${qz.idx + 1 < total ? 'Keyingi ➡️' : '✅ Yakunlash'}</button>\n      </div>`;\n    actions.pick = (i) => { qz.answers[q.id] = Number(i); quizScreen(); };\n    actions.prev = () => { qz.idx -= 1; quizScreen(); };\n    actions.next = async () => {\n      if (qz.idx + 1 < total) { qz.idx += 1; return quizScreen(); }\n      const left = total - Object.keys(qz.answers).length;\n      if (left && !(await confirmBox(`${left} ta savolga javob berilmagan. Yakunlaysizmi?`))) return;\n      submitQuiz(false);\n    };\n    bind();\n    if (qz.deadline && !qz.timer) qz.timer = setInterval(tick, 500);\n    tick();\n  }\n\n  function tick() {\n    if (!quiz || !quiz.deadline) return;\n    const left = quiz.deadline - (Date.now() - quiz.offset);\n    const el = document.getElementById('timer');\n    if (el) { el.textContent = `⏱ ${mmss(left)}`; el.classList.toggle('low', left < 60000); }\n    if (left <= 0 && quiz.running) { toast('⏰ Vaqt tugadi!'); submitQuiz(true); }\n  }\n\n  async function submitQuiz(timeUp) {\n    const qz = quiz;\n    if (!qz || !qz.running) return;\n    qz.running = false;\n    stopQuizTimer();\n    loading();\n    try {\n      const r = await api('/api/quiz/submit', { attempt: qz.attempt, answers: qz.answers });\n      haptic('heavy');\n      stack.pop(); // test ekranini tarixdan olib tashlaymiz\n      go(resultScreen, qz, r, timeUp);\n    } catch (e) { toast(e.message); stack.pop(); render(); }\n  }\n\n  function resultScreen(qz, r, timeUp) {\n    quiz = null;\n    const mark = r.pct >= 86 ? \"🏆 A'lo!\" : r.pct >= 71 ? '👍 Yaxshi!' : r.pct >= 56 ? '🙂 Qoniqarli' : \"📚 Ko'proq takrorlang\";\n    app.innerHTML = `\n      <div class=\"card center\">\n        <div class=\"muted\">${h(qz.title)}</div>\n        <div class=\"res-big\">${r.correct}/${r.total}</div>\n        <div><b>${r.pct}%</b> · ${mark}</div>\n        ${timeUp || r.late ? '<div class=\"muted\">⏰ Vaqt tugadi</div>' : ''}\n      </div>\n      <h2>Javoblar</h2>\n      <div class=\"list\">${r.details.map((d, i) => {\n        const q = qz.questions.find((x) => x.id === d.id) || { body: '' };\n        const ok = d.your === d.correct;\n        return `<div class=\"row\"><span class=\"${ok ? 'mark-ok' : 'mark-bad'}\">${ok ? '✅' : '❌'}</span>\n          <span class=\"grow\"><div class=\"title\">${i + 1}. ${h((q.body || 'Rasmdagi savol').slice(0, 70))}</div>\n          <div class=\"muted\">Sizning javobingiz: ${d.your == null ? '—' : L[d.your]} · To'g'ri: <b>${L[d.correct]}</b></div></span>\n          ${d.has_sol ? `<button class=\"badge\" style=\"border:0;cursor:pointer\" data-act=\"sol\" data-arg=\"${d.id}:${i + 1}\">🎥 Yechim</button>` : ''}</div>`;\n      }).join('')}</div>\n      <button class=\"btn\" data-act=\"again\">🔁 Qayta ishlash</button>\n      <button class=\"btn sec\" data-back>⬅️ Orqaga</button>`;\n    actions.sol = async (arg) => {\n      const [id, num] = arg.split(':');\n      try {\n        const res = await api('/api/solution/send', { id: Number(id), num: Number(num) });\n        if (res.url) openLink(res.url); else toast('🎥 Video yechim chatga yuborildi');\n      } catch (e) { toast(e.message); }\n    };\n    actions.again = () => { stack.pop(); startQuiz(qz.type, qz.ownerId); };\n    bind();\n  }\n\n  // ---------- Reyting ----------\n  async function ratingScreen(p = 'w') {\n    loading();\n    const r = await api(`/api/rating?p=${p}`);\n    const medals = ['🥇', '🥈', '🥉'];\n    app.innerHTML = `<h1>🏆 Reyting</h1>\n      <div class=\"tabs\">${[['w', 'Shu hafta'], ['m', 'Shu oy'], ['a', 'Umumiy']].map(([k, t]) => `<button class=\"${k === p ? 'on' : ''}\" data-act=\"rp\" data-arg=\"${k}\">${t}</button>`).join('')}</div>\n      ${r.me ? `<div class=\"card\"><b>📍 Sizning o'rningiz: ${r.me.rank} / ${r.me.total}</b><div class=\"muted\">⭐ ${r.me.pts} ball · ${r.me.tests} ta test${r.me.next ? ` · keyingi o'ringacha ${r.me.next} ball` : ''}</div></div>`\n        : '<div class=\"card muted\">Bu davrda hali test yechmagansiz. Test ishlab reytingga kiring! 💪</div>'}\n      ${r.top.length ? `<div class=\"list\">${r.top.map((x, i) => `<div class=\"row ${x.me ? 'me' : ''}\"><span class=\"medal\">${medals[i] || i + 1}</span>\n        <span class=\"grow title\">${h(x.name)}${x.me ? ' (siz)' : ''}</span><span class=\"muted\">${x.tests} test</span><b>${x.pts}</b></div>`).join('')}</div>`\n        : '<div class=\"empty\">Hozircha natijalar yo\\'q</div>'}\n      <div class=\"muted center\">Ball — har bir testdagi eng yaxshi natijadagi to'g'ri javoblar yig'indisi</div>`;\n    actions.rp = (k) => { stack[stack.length - 1][1] = [k]; ratingScreen(k); };\n    bind();\n  }\n\n  // ---------- Balans ----------\n  async function balanceScreen() {\n    loading();\n    ME = await api('/api/me');\n    const hist = await api('/api/history');\n    const f = ME.features;\n    const names = { referral: '👥 Taklif bonusi', welcome: '🎁 Start bonusi', admin: \"💳 To'ldirish\", purchase: '🛒 Xarid', book: \"📚 Kitob e'loni\", center: \"🏫 Markaz e'loni\", teacher: \"👨‍🏫 O'qituvchi testi\" };\n    app.innerHTML = `<h1>💰 Balans</h1>\n      <div class=\"card center\"><div class=\"muted\">Joriy balans</div><div class=\"res-big\">${money(ME.user.balance)}</div></div>\n      ${f.topup ? `<div class=\"card\"><b>💳 Balansni to'ldirish</b><p class=\"pre muted\">${h(ME.paymentInfo)}</p>\n        <button class=\"btn\" data-act=\"topup\">📸 Chek yuborish (botda)</button></div>` : ''}\n      ${f.referral ? `<div class=\"card\"><b>👥 Do'stlarni taklif qiling</b>\n        <p class=\"muted\">Har bir do'stingiz kanalga a'zo bo'lib ro'yxatdan o'tganda balansingizga <b>${money(ME.referralBonus)}</b> qo'shiladi. Taklif qilganlaringiz: <b>${ME.refCount}</b></p>\n        <input readonly value=\"${h(ME.refLink)}\" onclick=\"this.select()\">\n        <button class=\"btn\" data-act=\"share\">📤 Ulashish</button><button class=\"btn sec\" data-act=\"copy\">📋 Nusxa olish</button></div>` : ''}\n      <h2>Oxirgi amallar</h2>\n      ${hist.length ? `<div class=\"list\">${hist.map((x) => `<div class=\"row\"><span class=\"grow\"><div class=\"title\">${names[x.type] || h(x.type)}</div><div class=\"muted\">${date(x.at)}</div></span>\n        <b class=\"${x.amount > 0 ? 'mark-ok' : ''}\">${x.amount > 0 ? '+' : '−'}${money(Math.abs(x.amount))}</b></div>`).join('')}</div>` : '<div class=\"empty\">Amallar yo\\'q</div>'}`;\n    actions.topup = () => openBot('topup');\n    actions.share = () => {\n      const url = `https://t.me/share/url?url=${encodeURIComponent(ME.refLink)}&text=${encodeURIComponent(\"Bolalar uchun testlar va videodarslar! Qo'shiling:\")}`;\n      tg ? tg.openTelegramLink(url) : openLink(url);\n    };\n    actions.copy = async () => { try { await navigator.clipboard.writeText(ME.refLink); toast('📋 Nusxa olindi'); } catch (e) { toast('Havolani bosib, qo\\'lda nusxa oling'); } };\n    bind();\n  }\n\n  // ---------- Kitoblar ----------\n  async function booksScreen(query = '', page = 0) {\n    loading();\n    const r = await api(`/api/books?q=${encodeURIComponent(query)}&page=${page}`);\n    app.innerHTML = `<h1>📚 Kitoblar</h1>\n      <input id=\"bq\" type=\"search\" placeholder=\"🔎 Kitob nomi yoki muallif\" value=\"${h(query)}\">\n      <div class=\"muted\" style=\"margin:0 6px 8px\">${query ? `«${h(query)}» bo'yicha` : 'Sotuvdagi kitoblar'}: ${r.total} ta</div>\n      ${r.items.length ? `<div class=\"list\">${r.items.map((b) => `<button class=\"row\" data-act=\"book\" data-arg=\"${b.id}\">\n        ${b.photo ? `<img class=\"thumb\" src=\"${b.photo}\" loading=\"lazy\" alt=\"\">` : '<span class=\"thumb\" style=\"display:grid;place-items:center\">📖</span>'}\n        <span class=\"grow\"><div class=\"title\">${h(b.title)}</div><div class=\"muted\">${h(b.author || '')}${b.price_text ? ` · ${h(b.price_text)}` : ''}</div></span><span class=\"chev\">›</span></button>`).join('')}</div>`\n        : '<div class=\"empty\">Hech narsa topilmadi</div>'}\n      <div style=\"display:flex;gap:8px\">${page > 0 ? '<button class=\"btn sec\" data-act=\"bpg\" data-arg=\"-1\">⬅️</button>' : ''}${(page + 1) * 20 < r.total ? '<button class=\"btn sec\" data-act=\"bpg\" data-arg=\"1\">➡️</button>' : ''}</div>\n      <button class=\"btn\" data-act=\"addbook\">➕ Kitob qo'shish — ${money(ME.prices.book)} / ${ME.prices.bookDays} kun</button>`;\n    const inp = document.getElementById('bq');\n    let t;\n    inp.oninput = () => { clearTimeout(t); t = setTimeout(() => { const v = inp.value.trim(); if (v.length === 0 || v.length >= 2) { stack[stack.length - 1][1] = [v, 0]; booksScreen(v, 0); } }, 600); };\n    actions.bpg = (d) => { const p = page + Number(d); stack[stack.length - 1][1] = [query, p]; booksScreen(query, p); };\n    actions.book = (id) => go(bookScreen, id);\n    actions.addbook = () => openBot('addbook');\n    bind();\n  }\n\n  async function bookScreen(id) {\n    loading();\n    const b = await api(`/api/book?id=${id}`);\n    app.innerHTML = `${b.photo ? `<img class=\"book-img\" src=\"${b.photo}\" alt=\"\">` : ''}\n      <h1 style=\"margin-top:12px\">${h(b.title)}</h1>\n      <div class=\"card\">${b.author ? `<div>✍️ ${h(b.author)}</div>` : ''}${b.price_text ? `<div>💵 ${h(b.price_text)}</div>` : ''}\n      ${b.description ? `<p class=\"pre\">${h(b.description)}</p>` : ''}<div>📞 <a href=\"tel:${h(b.phone.replace(/[^\\d+]/g, ''))}\">${h(b.phone)}</a></div></div>`;\n    bind();\n  }\n\n  // ---------- O'quv markazlar ----------\n  let REGIONS = null;\n  async function centersScreen(kind = 'center', ri = '', di = 'all') {\n    loading();\n    if (!REGIONS) REGIONS = await api('/api/regions');\n    const list = ri !== '' ? await api(`/api/centers?kind=${kind}&ri=${ri}&di=${di}`) : null;\n    const k = ME.centerKinds;\n    app.innerHTML = `<h1>🏫 O'quv markaz va maktablar</h1>\n      <div class=\"tabs\">${Object.entries(k).map(([key, v]) => `<button class=\"${key === kind ? 'on' : ''}\" data-act=\"ck\" data-arg=\"${key}\">${v.icon} ${h(v.name)}</button>`).join('')}</div>\n      <select id=\"ri\"><option value=\"\">📍 Viloyatni tanlang</option>${REGIONS.map((r, i) => `<option value=\"${i}\" ${String(i) === String(ri) ? 'selected' : ''}>${h(r.name)}</option>`).join('')}</select>\n      ${ri !== '' ? `<select id=\"di\"><option value=\"all\">Barcha tumanlar</option>${REGIONS[ri].districts.map((d, i) => `<option value=\"${i}\" ${String(i) === String(di) ? 'selected' : ''}>${h(d)}</option>`).join('')}</select>` : ''}\n      ${list ? (list.length ? `<div class=\"list\">${list.map((c) => `<button class=\"row\" data-act=\"cen\" data-arg=\"${c.id}\"><span>${k[kind].icon}</span><span class=\"grow\"><div class=\"title\">${h(c.name)}</div><div class=\"muted\">${h(c.district)}</div></span><span class=\"chev\">›</span></button>`).join('')}</div>`\n        : `<div class=\"empty\">Bu hududda hozircha ${h(k[kind].plural.toLowerCase())} yo'q</div>`) : ''}\n      <button class=\"btn\" data-act=\"addcen\">➕ Qo'shish — ${money(ME.prices.center)} / ${ME.prices.centerDays} kun</button>`;\n    const set = (a) => { stack[stack.length - 1][1] = a; centersScreen(...a); };\n    document.getElementById('ri').onchange = (e) => set([kind, e.target.value, 'all']);\n    const diEl = document.getElementById('di');\n    if (diEl) diEl.onchange = (e) => set([kind, ri, e.target.value]);\n    actions.ck = (key) => set([key, ri, di]);\n    actions.cen = (id) => go(centerScreen, id);\n    actions.addcen = () => openBot('addcenter');\n    bind();\n  }\n\n  async function centerScreen(id) {\n    loading();\n    const c = await api(`/api/center?id=${id}`);\n    const kind = ME.centerKinds[c.kind];\n    app.innerHTML = `<h1>${kind.icon} ${h(c.name)}</h1><div class=\"card\">\n      <div class=\"muted\">${h(kind.name)}</div>\n      <p>📍 ${h(c.region)}, ${h(c.district)}${c.address ? `<br>🏠 ${h(c.address)}` : ''}</p>\n      <div>📞 <a href=\"tel:${h((c.phone || '').replace(/[^\\d+]/g, ''))}\">${h(c.phone)}</a></div></div>\n      ${c.lat != null ? '<button class=\"btn\" data-act=\"map\">🗺 Xaritada ko\\'rish</button>' : ''}`;\n    actions.map = () => openLink(`https://www.google.com/maps?q=${c.lat},${c.lon}`);\n    bind();\n  }\n\n  // ---------- Ishga tushirish ----------\n  async function boot() {\n    try {\n      stack.push([homeScreen, []]);\n      await homeScreen();\n    } catch (e) {\n      stack.length = 0;\n      let extra = '';\n      if (e.code === 'not_subscribed') extra = `<button class=\"btn\" id=\"join\">📢 Kanalga o'tish</button><button class=\"btn sec\" id=\"retry\">✅ Obuna bo'ldim</button>`;\n      if (e.code === 'not_registered') extra = '<p class=\"muted\">Botga qaytib /start ni bosing va ro\\'yxatdan o\\'ting.</p><button class=\"btn\" id=\"close\">Botga qaytish</button>';\n      app.innerHTML = `<div class=\"card center\" style=\"margin-top:40px\"><p style=\"font-size:40px;margin:0\">${e.code === 'blocked' ? '🚫' : e.code === 'maintenance' ? '🛠' : '⚠️'}</p><p>${h(e.message)}</p>${extra}</div>`;\n      const j = document.getElementById('join'); if (j) j.onclick = () => e.data && e.data.channelUrl && (tg ? tg.openTelegramLink(e.data.channelUrl) : openLink(e.data.channelUrl));\n      const r = document.getElementById('retry'); if (r) r.onclick = () => { loading(); boot(); };\n      const c = document.getElementById('close'); if (c) c.onclick = () => (tg ? tg.close() : null);\n    }\n  }\n  boot();\n})();\n</script>\n</body>\n</html>\n"};
__modules['package.json'] = (module) => { module.exports = {"name":"edu-bot","version":"2.6.0"}; };

// ===================== src/ads.js =====================
__modules["src/ads.js"] = function (module, exports, require) {
const __filename = "src/ads.js"; const __dirname = "src";
/**
 * Reklama: admin joylaydi (matn / rasm / video + ixtiyoriy tugma), muddati bilan.
 * Foydalanuvchiga menyu ochganda ko'rsatiladi, lekin har ad_interval_hours soatda bir martadan ko'p emas.
 * Bir nechta faol reklama bo'lsa, eng kam ko'rsatilgani tanlanadi (navbat bilan aylanadi).
 */
const { Markup } = require('telegraf');
const { db } = require('./db');
const { now, isAdmin, isOn, getNum } = require('./utils');
const { log } = require('./logger');

const activeQuery = () => {
  const t = now();
  return db('ads').where('is_active', 1).andWhere('starts_at', '<=', t).andWhere('ends_at', '>', t);
};

function adExtra(ad, extraRows = []) {
  const rows = [];
  if (ad.btn_text && ad.btn_url) rows.push([Markup.button.url(ad.btn_text, ad.btn_url)]);
  return rows.length || extraRows.length ? Markup.inlineKeyboard([...rows, ...extraRows]) : {};
}

/** Reklamani chatga yuborish (ctx.reply... orqali — chat tozalagich uni ham kuzatadi) */
async function sendAd(ctx, ad, extraRows = []) {
  const text = ad.text || '';
  const extra = adExtra(ad, extraRows);
  if (ad.media_type === 'photo') return ctx.replyWithPhoto(ad.media_id, { caption: text.slice(0, 1024), ...extra });
  if (ad.media_type === 'video') return ctx.replyWithVideo(ad.media_id, { caption: text.slice(0, 1024), ...extra });
  return ctx.reply(text || '📣', { link_preview_options: { is_disabled: false }, ...extra });
}

/** Menyu ochilganda chaqiriladi: vaqti kelgan bo'lsa bitta reklama ko'rsatadi */
async function maybeShow(ctx) {
  try {
    if (!ctx.from || isAdmin(ctx.from.id) || !(await isOn('ads'))) return;
    const u = ctx.user;
    if (!u || !u.is_registered) return;
    const interval = Math.max(0, await getNum('ad_interval_hours')) * 60 * 60 * 1000;
    if (u.last_ad_at && now() - Number(u.last_ad_at) < interval) return;
    const ad = await activeQuery().orderBy([{ column: 'shows', order: 'asc' }, { column: 'id', order: 'asc' }]).first();
    if (!ad) return;
    await db('users').where({ tg_id: u.tg_id }).update({ last_ad_at: now() });
    u.last_ad_at = now();
    await db('ads').where({ id: ad.id }).increment('shows', 1);
    await sendAd(ctx, ad);
    log(u.tg_id, `📣 Reklama ko'rsatildi #${ad.id}`);
  } catch (e) {
    console.error('[ads]', e.message);
  }
}

/** Mini ilova bosh sahifasi uchun bitta faol reklama (matn yoki rasm; video botda ko'rsatiladi) */
async function pickForWebapp() {
  if (!(await isOn('ads'))) return null;
  const list = (await activeQuery()).filter((a) => a.media_type !== 'video');
  return list.length ? list[Math.floor(Math.random() * list.length)] : null;
}

module.exports = { activeQuery, sendAd, maybeShow, pickForWebapp };

};

// ===================== src/bot.js =====================
__modules["src/bot.js"] = function (module, exports, require) {
const __filename = "src/bot.js"; const __dirname = "src";
const { Telegraf, session } = require('telegraf');
const { db } = require('./db');
const { BTN, BTN_FEATURE, adminKb } = require('./keyboards');
const { getUser, now, isAdmin, isOn } = require('./utils');
const { showMainMenu } = require('./menu');
const logger = require('./logger');
const cleaner = require('./cleaner');

// Inline tugmalar -> bo'lim (bo'lim o'chirilgan bo'lsa ishlamaydi)
const CALLBACK_FEATURE = [
  [/^(tc:|tc_back|tv:|tstart:|buy:variant:|tp_home|tpc:|tpd:|tpget:|buy:pdf:)/, 'tests'],
  [/^(vg:|vg_back|vt:|vq:|buy:topic:)/, 'videos'],
  [/^bk/, 'books'],
  [/^ce[_:]/, 'centers'],
  [/^(tt_|tti:|ttr:|ttq:|ttt:|ttd:|ttdd:|tts:)/, 'teacher'],
  [/^rt:/, 'rating'],
  [/^bal_ref/, 'referral'],
  [/^bal_topup/, 'topup'],
];
const OFF_TEXT = "⛔ Bu bo'lim vaqtincha o'chirilgan.";

function createBot(token) {
  const bot = new Telegraf(token, { handlerTimeout: 60_000 });

  // Faqat shaxsiy chatlar
  bot.use((ctx, next) => (ctx.chat && ctx.chat.type !== 'private' ? undefined : next()));

  // Sessiya (holatlar xotirada saqlanadi)
  bot.use(session({ defaultSession: () => ({}) }));
  bot.use((ctx, next) => {
    if (!ctx.session) ctx.session = {};
    return next();
  });
  // Yuborilgan menyu xabarlarini eslab qolish (keyin o'chirish uchun)
  bot.use(cleaner.middleware());

  // Foydalanuvchini yuklash / birinchi marta kelganda yaratish (taklif havolasini ham saqlaydi)
  bot.use(async (ctx, next) => {
    if (!ctx.from || ctx.from.is_bot) return undefined;
    let u = await getUser(ctx.from.id);
    if (!u) {
      let ref = null;
      const text = (ctx.message && ctx.message.text) || '';
      const m = text.match(/^\/start\s+ref_(\d+)/);
      if (m && Number(m[1]) !== ctx.from.id) {
        const r = await getUser(Number(m[1]));
        if (r && r.is_registered) ref = r.tg_id;
      }
      try {
        await db('users').insert({
          tg_id: ctx.from.id, username: ctx.from.username || null, referrer_id: ref,
          balance: 0, is_registered: 0, created_at: now(),
        });
      } catch (e) { /* parallel so'rovda allaqachon yaratilgan */ }
      u = await getUser(ctx.from.id);
    } else if ((u.username || null) !== (ctx.from.username || null)) {
      await db('users').where({ tg_id: u.tg_id }).update({ username: ctx.from.username || null });
    }
    // O'qituvchi testi havolasi: /start tt_xxxx (ro'yxatdan o'tgach ham ochiladi)
    const tt = ((ctx.message && ctx.message.text) || '').match(/^\/start\s+tt_([a-f0-9]+)/i);
    if (tt) ctx.session.pendingTest = tt[1].toLowerCase();
    // Oxirgi faollik (har 5 daqiqada bir yangilanadi)
    if (!u.last_seen || now() - u.last_seen > 5 * 60 * 1000) {
      await db('users').where({ tg_id: u.tg_id }).update({ last_seen: now() });
    }
    ctx.user = u;
    return next();
  });

  // Harakatlarni log kanaliga yozish
  bot.use(logger.middleware());

  // Bloklangan foydalanuvchi va texnik ishlar rejimi
  bot.use(async (ctx, next) => {
    if (isAdmin(ctx.from.id)) return next();
    let text = null;
    if (ctx.user && ctx.user.is_blocked) text = '🚫 Hisobingiz bloklangan. Savollar bo\'lsa, admin bilan bog\'laning.';
    else if (!(await isOn('bot'))) text = "🛠 Botda texnik ishlar olib borilmoqda. Birozdan so'ng qayta urinib ko'ring.";
    if (!text) return next();
    if (ctx.callbackQuery) return ctx.answerCbQuery(text, { show_alert: true }).catch(() => {});
    return ctx.reply(text);
  });

  // Majburiy kanal obunasi
  require('./subscription')(bot);

  // Ro'yxatdan o'tish (/start va ro'yxatdan o'tmaganlar uchun to'siq)
  // Mini ilovadan botga qaytish havolalari: /start topup, /start addbook ...
  const deepLinks = {};
  require('./handlers/registration').register({ bot, deepLinks });

  const states = {};
  // Menyu tugmasi bosilganda joriy holat (state) bekor qilinadi
  const menu = (text, fn) =>
    bot.hears(text, async (ctx) => {
      ctx.session.state = null;
      await cleaner.cleanup(ctx); // oldingi menyu va bosilgan tugma o'chadi
      await fn(ctx);
      return require('./ads').maybeShow(ctx); // vaqti kelgan bo'lsa reklama
    });

  // O'chirilgan bo'limlar uchun to'siq (adminlarga ta'sir qilmaydi)
  bot.use(async (ctx, next) => {
    if (isAdmin(ctx.from.id)) return next();
    const text = ctx.message && ctx.message.text;
    if (text && BTN_FEATURE[text] && !(await isOn(BTN_FEATURE[text]))) {
      await cleaner.cleanup(ctx);
      return showMainMenu(ctx, OFF_TEXT);
    }
    const data = ctx.callbackQuery && ctx.callbackQuery.data;
    if (data) {
      const hit = CALLBACK_FEATURE.find(([re]) => re.test(data));
      if (hit && !(await isOn(hit[1]))) return ctx.answerCbQuery(OFF_TEXT, { show_alert: true });
    }
    return next();
  });

  bot.hears(BTN.CANCEL, async (ctx) => {
    await cleaner.cleanup(ctx);
    const st = ctx.session.state || '';
    const adminFlow = st.startsWith('adm_') || (ctx.session.qw && ctx.session.qw.back === 'admin');
    ctx.session.state = null;
    ctx.session.form = null;
    ctx.session.qw = null;
    if (adminFlow && isAdmin(ctx.from.id)) return ctx.reply('❌ Bekor qilindi.', adminKb());
    return showMainMenu(ctx, '❌ Bekor qilindi.');
  });

  const deps = { bot, menu, states, deepLinks };
  require('./quiz').register(deps);
  require('./questionWizard').register(deps);
  require('./handlers/tests').register(deps);
  require('./handlers/videos').register(deps);
  require('./handlers/balance').register(deps);
  require('./handlers/books').register(deps);
  require('./handlers/centers').register(deps);
  require('./handlers/support').register(deps);
  require('./handlers/teacher').register(deps);
  require('./handlers/rating').register(deps);
  require('./handlers/admin').register(deps);
  require('./handlers/adminAds').register(deps);

  // Holatga qarab xabarni yo'naltirish
  bot.on('message', async (ctx) => {
    const st = ctx.session.state;
    if (st && states[st]) {
      cleaner.remember(ctx, ctx.message.message_id); // foydalanuvchi javobi ham keyin o'chadi
      return states[st](ctx);
    }
    await cleaner.cleanup(ctx);
    return showMainMenu(ctx);
  });

  // «⬅️ Orqaga / Yopish» — alohida yuborilgan kartochkani o'chiradi (oldingi ro'yxat yuqorida qoladi)
  bot.action('close_msg', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.deleteMessage().catch(() => ctx.editMessageReplyMarkup(undefined).catch(() => {}));
  });

  bot.on('callback_query', (ctx) => ctx.answerCbQuery('Bu tugma eskirgan. /start ni bosing.').catch(() => {}));

  bot.catch((err, ctx) => {
    console.error(`[xato] update ${ctx.update && ctx.update.update_id}:`, err);
    ctx.reply("⚠️ Xatolik yuz berdi. Qaytadan urinib ko'ring yoki /start ni bosing.").catch(() => {});
  });

  return bot;
}

module.exports = { createBot };

};

// ===================== src/categories.js =====================
__modules["src/categories.js"] = function (module, exports, require) {
const __filename = "src/categories.js"; const __dirname = "src";
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

};

// ===================== src/cleaner.js =====================
__modules["src/cleaner.js"] = function (module, exports, require) {
const __filename = "src/cleaner.js"; const __dirname = "src";
/**
 * Chatni toza saqlash: yangi menyu tanlanganda oldingi menyu xabarlari va
 * foydalanuvchi bosgan tugma xabari o'chiriladi — chatda faqat joriy bo'lim qoladi.
 *
 * Kuzatiladi: bot ctx.reply / replyWithPhoto / replyWithLocation orqali yuborgan
 * xabarlar va holat (state) davomida foydalanuvchi yozgan javoblar.
 * Kuzatilmaydi (o'chmaydi): test savollari, natijalar, video darslar va video yechimlar,
 * adminlarga boradigan xabarlar.
 *
 * Telegram cheklovi: 48 soatdan eski xabarlarni o'chirib bo'lmaydi.
 * Admin «🎛 Bo'limlar» dan «🧹 Chatni tozalash» ni o'chirib qo'yishi mumkin.
 */
const { isOn } = require('./utils');

const TRACKED = ['reply', 'replyWithPhoto', 'replyWithLocation'];
const MAX = 100;

function remember(ctx, id) {
  if (!ctx.session || !id) return;
  const list = ctx.session.screens || [];
  list.push(id);
  ctx.session.screens = list.slice(-MAX);
}

// Har bir update uchun ctx.reply... ni o'rab, yuborilgan xabar ID sini eslab qolamiz
function middleware() {
  return (ctx, next) => {
    if (ctx.chat && ctx.chat.type === 'private') {
      for (const m of TRACKED) {
        const orig = ctx[m].bind(ctx);
        ctx[m] = async (...args) => {
          const res = await orig(...args);
          if (res && res.message_id) remember(ctx, res.message_id);
          return res;
        };
      }
    }
    return next();
  };
}

// Oldingi menyu xabarlarini va joriy (tugma) xabarini o'chirish
async function cleanup(ctx) {
  if (!ctx.chat || !ctx.session) return;
  const ids = [...(ctx.session.screens || [])];
  ctx.session.screens = [];
  if (!(await isOn('clean'))) return;
  if (ctx.message) ids.push(ctx.message.message_id);
  if (!ids.length) return;
  try {
    await ctx.telegram.callApi('deleteMessages', { chat_id: ctx.chat.id, message_ids: ids.slice(-MAX) });
  } catch (e) {
    // eski Bot API yoki xato bo'lsa — bittalab
    for (const id of ids) await ctx.telegram.deleteMessage(ctx.chat.id, id).catch(() => {});
  }
}

module.exports = { middleware, cleanup, remember };

};

// ===================== src/config.js =====================
__modules["src/config.js"] = function (module, exports, require) {
const __filename = "src/config.js"; const __dirname = "src";
require('dotenv').config();

const list = (s) => (s || '').split(',').map((x) => x.trim()).filter(Boolean);

const CHANNEL_ID = (process.env.CHANNEL_ID || '').trim();
let CHANNEL_URL = (process.env.CHANNEL_URL || '').trim();
if (!CHANNEL_URL && CHANNEL_ID.startsWith('@')) CHANNEL_URL = `https://t.me/${CHANNEL_ID.slice(1)}`;

module.exports = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  ADMIN_IDS: list(process.env.ADMIN_IDS).map(Number),
  ADMIN_USERNAME: (process.env.ADMIN_USERNAME || '').replace(/^@/, ''),
  CHANNEL_ID,
  CHANNEL_URL,
  // Loglar yoziladigan maxfiy kanal (bot u yerda admin bo'lishi kerak)
  LOG_CHANNEL_ID: (process.env.LOG_CHANNEL_ID || '').trim(),
  LOG_INTERVAL_MS: Number(process.env.LOG_INTERVAL_MS || 3000),
  LOG_SESSION_MINUTES: Number(process.env.LOG_SESSION_MINUTES || 30),
  // Mini App
  WEBAPP_URL: (process.env.WEBAPP_URL || '').trim().replace(/\/$/, ''),
  PORT: Number(process.env.PORT || 3000),
  DB_CLIENT: (process.env.DB_CLIENT || 'sqlite').toLowerCase(),
  SQLITE_FILE: process.env.SQLITE_FILE || './data/bot.sqlite',
  MYSQL: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'edu_bot',
  },
};

};

// ===================== src/constants.js =====================
__modules["src/constants.js"] = function (module, exports, require) {
const __filename = "src/constants.js"; const __dirname = "src";
// Sinf bo'limlari endi bazada (categories jadvali) — admin «📂 Sinflar» orqali boshqaradi.
// Quyidagilar faqat birinchi ishga tushishdagi boshlang'ich ro'yxat.
// code — ichki kalit (o'zgarmaydi), name — foydalanuvchiga ko'rinadigan nom.
const TEST_CATEGORIES = [
  { code: 'c1', name: '1-sinf' },
  { code: 'c2', name: '2-sinf' },
  { code: 'c3', name: '3-sinf' },
  { code: 'c4', name: '4-sinf' },
  { code: 'c5', name: '5-sinf' },
  { code: 'c67', name: '6-7-sinf' },
  { code: 'sp', name: "Maxsus maktablarga tayyorgarlik" },
];

const VIDEO_GROUPS = [
  { code: 'g12', name: '1-2-sinf' },
  { code: 'g34', name: '3-4-sinf' },
  { code: 'g57', name: '5-7-sinf' },
  { code: 'sp', name: "Maxsus maktablarga tayyorgarlik" },
];

const CENTER_KINDS = {
  center: { name: "O'quv markaz", plural: "O'quv markazlar", icon: '🏫' },
  school: { name: 'Xususiy maktab', plural: 'Xususiy maktablar', icon: '🏛' },
};

// Admin yoqib/o'chira oladigan bo'limlar (settings jadvalida f_<kalit> = 1/0)
const FEATURES = {
  bot: "🤖 Bot (umuman, texnik ishlar rejimi)",
  tests: '📝 Test ishlash',
  videos: '🎬 Videodarslar',
  books: '📚 Kitoblar',
  centers: "🏫 O'quv markaz / maktablar",
  teacher: "👨‍🏫 O'qituvchilar uchun",
  rating: '🏆 Reyting',
  referral: "👥 Do'st taklif qilish (bonus)",
  topup: "💳 Balansni to'ldirish (chek)",
  support: "☎️ Admin bilan bog'lanish",
  webapp: '📱 Mini ilova',
  clean: "🧹 Chatni tozalash (eski menyu xabarlari o'chadi)",
  ads: "📣 Reklama ko'rsatish",
};

// Narxlar va sozlamalar (admin paneldagi «💵 Narxlar» orqali o'zgaradi)
const DEFAULT_SETTINGS = {
  default_test_price: '5000',
  default_video_price: '5000',
  default_pdf_price: '5000',
  book_price: '30000',
  book_days: '30',
  center_price: '30000',
  center_days: '30',
  start_bonus: '10000',
  referral_bonus: '5000',
  ad_interval_hours: '12',
  teacher_test_price: '0',
  payment_info: "💳 Karta: 8600 0000 0000 0000\n👤 Ism Familiya\n\nTo'lov qilgach, chek rasmini shu yerga yuboring.",
};
for (const k of Object.keys(FEATURES)) DEFAULT_SETTINGS[`f_${k}`] = '1';

const SETTING_HELP = {
  default_test_price: "Test varianti standart narxi (har bir variantga alohida ham qo'yiladi)",
  default_video_price: 'Video mavzu standart narxi',
  default_pdf_price: "Testning elektron varianti (PDF) standart narxi",
  book_price: "Kitob e'loni narxi",
  book_days: "Kitob e'loni muddati (kun)",
  center_price: "O'quv markaz/maktab e'loni narxi",
  center_days: "O'quv markaz/maktab e'loni muddati (kun)",
  start_bonus: "Start bonusi — to'liq ro'yxatdan o'tganga bir marta (0 — berilmaydi)",
  ad_interval_hours: "Reklama bitta foydalanuvchiga necha soatda bir ko'rsatiladi",
  referral_bonus: "Taklif qilingan do'st kanalga a'zo bo'lib ro'yxatdan o'tganda beriladigan bonus",
  teacher_test_price: "O'qituvchi test tuzishi narxi (0 — bepul)",
  payment_info: "Balansni to'ldirish uchun to'lov ma'lumoti (matn)",
};

module.exports = { TEST_CATEGORIES, VIDEO_GROUPS, CENTER_KINDS, FEATURES, DEFAULT_SETTINGS, SETTING_HELP };

};

// ===================== src/data/regions.js =====================
__modules["src/data/regions.js"] = function (module, exports, require) {
const __filename = "src/data/regions.js"; const __dirname = "src/data";
// O'zbekiston viloyatlari va tumanlari (kerak bo'lsa tahrirlang).
// Diqqat: e'lon qo'shilgandan keyin nomlarni o'zgartirsangiz, eski e'lonlar
// eski nom bilan saqlangan bo'ladi.
module.exports = [
  {
    name: 'Toshkent shahri',
    districts: ['Bektemir', 'Chilonzor', 'Mirobod', "Mirzo Ulug'bek", 'Olmazor', 'Sergeli', 'Shayxontohur', 'Uchtepa', 'Yakkasaroy', 'Yashnobod', 'Yangihayot', 'Yunusobod'],
  },
  {
    name: 'Toshkent viloyati',
    districts: ['Angren sh.', 'Bekobod sh.', 'Chirchiq sh.', 'Nurafshon sh.', 'Olmaliq sh.', 'Ohangaron sh.', 'Yangiyo\'l sh.', 'Bekobod', "Bo'ka", "Bo'stonliq", 'Chinoz', 'Ohangaron', "Oqqo'rg'on", "O'rta Chirchiq", 'Parkent', 'Piskent', 'Qibray', 'Quyi Chirchiq', 'Toshkent tumani', 'Yangiyo\'l', 'Yuqori Chirchiq', 'Zangiota'],
  },
  {
    name: 'Andijon viloyati',
    districts: ['Andijon sh.', 'Xonobod sh.', 'Andijon tumani', 'Asaka', 'Baliqchi', "Bo'ston", 'Buloqboshi', 'Izboskan', 'Jalaquduq', 'Marhamat', "Oltinko'l", 'Paxtaobod', "Qo'rg'ontepa", 'Shahrixon', "Ulug'nor", "Xo'jaobod"],
  },
  {
    name: 'Buxoro viloyati',
    districts: ['Buxoro sh.', 'Kogon sh.', 'Buxoro tumani', "G'ijduvon", 'Jondor', 'Kogon tumani', 'Olot', 'Peshku', "Qorako'l", 'Qorovulbozor', 'Romitan', 'Shofirkon', 'Vobkent'],
  },
  {
    name: "Farg'ona viloyati",
    districts: ["Farg'ona sh.", "Marg'ilon sh.", "Qo'qon sh.", 'Quvasoy sh.', "Bag'dod", 'Beshariq', 'Buvayda', "Dang'ara", "Farg'ona tumani", 'Furqat', "O'zbekiston", 'Oltiariq', "Qo'shtepa", 'Quva', 'Rishton', "So'x", 'Toshloq', "Uchko'prik", 'Yozyovon'],
  },
  {
    name: 'Jizzax viloyati',
    districts: ['Jizzax sh.', 'Arnasoy', 'Baxmal', "Do'stlik", 'Forish', "G'allaorol", "Mirzacho'l", 'Paxtakor', 'Sharof Rashidov', 'Yangiobod', 'Zafarobod', 'Zarbdor', 'Zomin'],
  },
  {
    name: 'Xorazm viloyati',
    districts: ['Urganch sh.', 'Xiva sh.', "Bog'ot", 'Gurlan', 'Hazorasp', 'Xiva tumani', 'Xonqa', "Qo'shko'pir", 'Shovot', "Tuproqqal'a", 'Urganch tumani', 'Yangiariq', 'Yangibozor'],
  },
  {
    name: 'Namangan viloyati',
    districts: ['Namangan sh.', 'Chortoq', 'Chust', 'Davlatobod', 'Kosonsoy', 'Mingbuloq', 'Namangan tumani', 'Norin', 'Pop', "To'raqo'rg'on", "Uchqo'rg'on", 'Uychi', "Yangiqo'rg'on"],
  },
  {
    name: 'Navoiy viloyati',
    districts: ['Navoiy sh.', 'Zarafshon sh.', "G'ozg'on sh.", 'Karmana', 'Konimex', 'Navbahor', 'Nurota', 'Qiziltepa', 'Tomdi', 'Uchquduq', 'Xatirchi'],
  },
  {
    name: 'Qashqadaryo viloyati',
    districts: ['Qarshi sh.', 'Shahrisabz sh.', 'Chiroqchi', 'Dehqonobod', "G'uzor", 'Kasbi', 'Kitob', 'Koson', "Ko'kdala", 'Mirishkor', 'Muborak', 'Nishon', 'Qamashi', 'Qarshi tumani', 'Shahrisabz tumani', "Yakkabog'"],
  },
  {
    name: 'Samarqand viloyati',
    districts: ['Samarqand sh.', "Kattaqo'rg'on sh.", "Bulung'ur", 'Ishtixon', 'Jomboy', "Kattaqo'rg'on tumani", 'Narpay', 'Nurobod', 'Oqdaryo', "Pastdarg'om", 'Paxtachi', 'Payariq', "Qo'shrabot", 'Samarqand tumani', 'Toyloq', 'Urgut'],
  },
  {
    name: 'Sirdaryo viloyati',
    districts: ['Guliston sh.', 'Shirin sh.', 'Yangiyer sh.', 'Boyovut', 'Guliston tumani', 'Mirzaobod', 'Oqoltin', 'Sardoba', 'Sayxunobod', 'Sirdaryo tumani', 'Xovos'],
  },
  {
    name: 'Surxondaryo viloyati',
    districts: ['Termiz sh.', 'Angor', 'Bandixon', 'Boysun', 'Denov', "Jarqo'rg'on", 'Muzrabot', 'Oltinsoy', 'Qiziriq', "Qumqo'rg'on", 'Sariosiyo', 'Sherobod', "Sho'rchi", 'Termiz tumani', 'Uzun'],
  },
  {
    name: "Qoraqalpog'iston Respublikasi",
    districts: ['Nukus sh.', 'Taxiatosh sh.', 'Amudaryo', 'Beruniy', "Bo'zatov", 'Chimboy', "Ellikqal'a", 'Kegeyli', "Mo'ynoq", 'Nukus tumani', "Qanliko'l", "Qo'ng'irot", "Qorao'zak", 'Shumanay', "Taxtako'pir", "To'rtko'l", "Xo'jayli"],
  },
];

};

// ===================== src/db.js =====================
__modules["src/db.js"] = function (module, exports, require) {
const __filename = "src/db.js"; const __dirname = "src";
const fs = require('fs');
const path = require('path');
const knex = require('knex');
const config = require('./config');

const isMysql = config.DB_CLIENT === 'mysql';

function makeKnex() {
  if (isMysql) {
    return knex({
      client: 'mysql2',
      connection: { ...config.MYSQL, charset: 'utf8mb4' },
      pool: { min: 0, max: 10 },
    });
  }
  const file = path.resolve(config.SQLITE_FILE);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return knex({ client: 'better-sqlite3', connection: { filename: file }, useNullAsDefault: true });
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
  await addColumn('users', 'last_ad_at', (t) => t.bigInteger('last_ad_at'));
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

module.exports = { db, migrate };

};

// ===================== src/handlers/admin.js =====================
__modules["src/handlers/admin.js"] = function (module, exports, require) {
const __filename = "src/handlers/admin.js"; const __dirname = "src/handlers";
// Admin panel: statistika, foydalanuvchilar, test/video qo'shish, kontent, narxlar, bo'limlar, xabar yuborish
const { Markup } = require('telegraf');
const { db } = require('../db');
const { DEFAULT_SETTINGS, SETTING_HELP, FEATURES } = require('../constants');
const cats = require('../categories');
const { BTN, adminKb, cancelKb, skipKb } = require('../keyboards');
const {
  esc, money, now, DAY, fmtDate, isAdmin, getUser, getSetting, getNum, setSetting, isOn, addBalance, parseAmount,
  textOf, safeEdit, sleep, ITEM_TABLE,
} = require('../utils');
const { showMainMenu } = require('../menu');
const wizard = require('../questionWizard');
const { log } = require('../logger');

const L = 'ABCDEF';
const catName = (code) => cats.name('test', code);
const grpName = (code) => cats.name('video', code);
const cnt = async (q) => Number((await q.count({ c: '*' }))[0].c);
const timeKb = () => Markup.keyboard([['0', '10', '15'], ['20', '30', '45'], ['60', '90'], [BTN.CANCEL]]).resize();
const TX_NAMES = { referral: '👥 Taklif', welcome: '🎁 Start bonusi', admin: '💳 Admin', purchase: '🛒 Xarid', book: '📚 Kitob', center: '🏫 Markaz', teacher: "👨‍🏫 O'qituvchi" };

function register({ bot, menu, states }) {
  const adminMenu = (text, fn) => menu(text, (ctx) => (isAdmin(ctx.from.id) ? fn(ctx) : showMainMenu(ctx)));
  const adminAction = (trigger, fn) =>
    bot.action(trigger, (ctx) => (isAdmin(ctx.from.id) ? fn(ctx) : ctx.answerCbQuery("Ruxsat yo'q")));
  const adminState = (name, fn) => {
    states[name] = (ctx) => (isAdmin(ctx.from.id) ? fn(ctx) : showMainMenu(ctx));
  };

  const VERSION = require('../../package.json').version;
  const openPanel = (ctx, text = "🛠 <b>Admin panel</b>") => {
    ctx.session.state = null;
    return ctx.reply(text, { parse_mode: 'HTML', ...adminKb() });
  };

  adminMenu(BTN.ADMIN, (ctx) => openPanel(ctx));
  bot.command('admin', (ctx) => (isAdmin(ctx.from.id) ? openPanel(ctx) : null));
  bot.command('version', (ctx) => (isAdmin(ctx.from.id) ? ctx.reply(`🤖 Bot versiyasi: v${VERSION}\n📁 Papka: ${process.cwd()}`) : null));
  adminMenu(BTN.A_EXIT, (ctx) => showMainMenu(ctx));

  wizard.onDone.admin = (ctx, { count }) => openPanel(ctx, `✅ Saqlandi. Jami savollar: <b>${count}</b>\n\nTahrirlash: «${BTN.A_CONTENT}»`);

  // ================= Statistika =================
  adminMenu(BTN.A_STATS, async (ctx) => {
    const t = now();
    const [users, regs, today, active, blocked, refs, vars, tops, qs, tts, books, centers, buys, tests24] = await Promise.all([
      cnt(db('users')),
      cnt(db('users').where('is_registered', 1)),
      cnt(db('users').where('created_at', '>', t - DAY)),
      cnt(db('users').where('last_seen', '>', t - DAY)),
      cnt(db('users').where('is_blocked', 1)),
      cnt(db('users').whereNotNull('referrer_id').andWhere('is_registered', 1)),
      cnt(db('variants').where('is_active', 1)),
      cnt(db('topics').where('is_active', 1)),
      cnt(db('questions')),
      cnt(db('teacher_tests').where('is_deleted', 0)),
      cnt(db('books').where('is_active', 1).andWhere('expires_at', '>', t)),
      cnt(db('centers').where('is_active', 1).andWhere('expires_at', '>', t)),
      cnt(db('purchases')),
      cnt(db('results').where('created_at', '>', t - DAY)),
    ]);
    const sum = async (q) => Number((await q.sum({ s: 'amount' }))[0].s) || 0;
    const topups = await sum(db('transactions').where('type', 'admin').andWhere('amount', '>', 0));
    const spent = -(await sum(db('transactions').where('amount', '<', 0)));
    const bonus = await sum(db('transactions').where('type', 'referral'));
    const welcome = await sum(db('transactions').where('type', 'welcome'));
    const ads = await cnt(require('../ads').activeQuery());
    const bal = Number((await db('users').sum({ s: 'balance' }))[0].s) || 0;
    return ctx.reply(
      `📊 <b>Statistika</b>\n\n👥 Foydalanuvchilar: ${users}\n✅ Ro'yxatdan o'tgan: ${regs}\n🆕 Oxirgi 24 soatda qo'shilgan: ${today}\n🟢 Oxirgi 24 soatda faol: ${active}\n🚫 Bloklangan: ${blocked}\n🤝 Taklif orqali kelgan: ${refs}\n\n` +
      `📝 Test variantlari: ${vars}\n🎬 Video mavzular: ${tops}\n👨‍🏫 O'qituvchi testlari: ${tts}\n❓ Jami savollar: ${qs}\n🧮 24 soatda yechilgan testlar: ${tests24}\n🛒 Xaridlar: ${buys}\n\n` +
      `📚 Faol kitob e'lonlari: ${books}\n🏫 Faol markaz/maktab e'lonlari: ${centers}\n📣 Faol reklamalar: ${ads}\n\n` +
      `💳 Admin to'ldirgan: ${money(topups)}\n🎁 Taklif bonuslari: ${money(bonus)}\n🎉 Start bonuslari: ${money(welcome)}\n💸 Sarflangan: ${money(spent)}\n💰 Foydalanuvchilar balansi: ${money(bal)}`,
      { parse_mode: 'HTML' },
    );
  });

  // ================= Foydalanuvchilar =================
  const USERS_TEXT = "👥 <b>Foydalanuvchilar</b>\n\n🔎 Foydalanuvchi ID si, telefon raqami yoki ismini yuboring.\nYoki ro'yxatni tanlang:";
  const usersKb = () => Markup.inlineKeyboard([[Markup.button.callback("🆕 Oxirgi 15 ta", 'au_last')], [Markup.button.callback('🚫 Bloklanganlar', 'au_blocked')]]);
  const BACK_USERS = [Markup.button.callback('⬅️ Foydalanuvchilar', 'au_home')];
  adminMenu(BTN.A_USERS, (ctx) => {
    ctx.session.state = 'adm_user_find';
    return ctx.reply(USERS_TEXT, { parse_mode: 'HTML', ...usersKb() });
  });
  adminAction('au_home', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.state = 'adm_user_find';
    return safeEdit(ctx, USERS_TEXT, { parse_mode: 'HTML', ...usersKb() });
  });

  const userRow = (u) => [Markup.button.callback(`${u.is_blocked ? '🚫 ' : ''}${u.first_name || ''} ${u.last_name || ''} — ${u.phone || u.tg_id}`.slice(0, 60), `au:${u.tg_id}`)];

  adminAction('au_last', async (ctx) => {
    await ctx.answerCbQuery();
    const list = await db('users').where('is_registered', 1).orderBy('id', 'desc').limit(15);
    if (!list.length) return safeEdit(ctx, "Hali foydalanuvchilar yo'q.", Markup.inlineKeyboard([BACK_USERS]));
    return safeEdit(ctx, "🆕 Oxirgi ro'yxatdan o'tganlar:", Markup.inlineKeyboard([...list.map(userRow), BACK_USERS]));
  });

  adminAction('au_blocked', async (ctx) => {
    await ctx.answerCbQuery();
    const list = await db('users').where('is_blocked', 1).orderBy('id', 'desc').limit(30);
    if (!list.length) return safeEdit(ctx, "Bloklangan foydalanuvchilar yo'q.", Markup.inlineKeyboard([BACK_USERS]));
    return safeEdit(ctx, '🚫 Bloklanganlar:', Markup.inlineKeyboard([...list.map(userRow), BACK_USERS]));
  });

  adminState('adm_user_find', async (ctx) => {
    const raw = textOf(ctx);
    if (!raw) return ctx.reply('ID, telefon yoki ism yuboring:');
    const digits = raw.replace(/[\s\-()+]/g, '');
    let list = [];
    if (/^\d{5,15}$/.test(digits)) {
      list = await db('users').where('tg_id', Number(digits)).orWhere('phone', 'like', `%${digits.slice(-9)}`).limit(15);
    } else {
      const like = `%${raw.toLowerCase().replace(/[%_]/g, '')}%`;
      list = await db('users')
        .whereRaw('LOWER(first_name) LIKE ?', [like]).orWhereRaw('LOWER(last_name) LIKE ?', [like]).orWhereRaw('LOWER(username) LIKE ?', [like])
        .limit(15);
    }
    if (!list.length) return ctx.reply('❌ Topilmadi. Qayta kiriting yoki «❌ Bekor qilish».', cancelKb());
    ctx.session.state = null;
    if (list.length === 1) return showUser(ctx, list[0].tg_id, false);
    return ctx.reply(`Topildi: ${list.length} ta`, Markup.inlineKeyboard([...list.map(userRow), BACK_USERS]));
  });

  async function showUser(ctx, tg, edit = true) {
    const u = await getUser(tg);
    if (!u) return ctx.reply('Topilmadi');
    const [refs, results, buys] = await Promise.all([
      cnt(db('users').where({ referrer_id: tg, is_registered: 1 })),
      cnt(db('results').where({ user_tg: tg })),
      cnt(db('purchases').where({ user_tg: tg })),
    ]);
    const text = `👤 <b>${esc(u.first_name || '')} ${esc(u.last_name || '')}</b>${u.username ? ` (@${esc(u.username)})` : ''}\n` +
      `🆔 <code>${u.tg_id}</code>\n📞 ${esc(u.phone || '—')}\n💰 Balans: <b>${money(u.balance)}</b>\n` +
      `📅 Qo'shilgan: ${u.created_at ? fmtDate(u.created_at) : '—'}\n🕒 Oxirgi faollik: ${u.last_seen ? fmtDate(u.last_seen) : '—'}\n` +
      `🧮 Yechgan testlari: ${results}\n🛒 Xaridlari: ${buys}\n👥 Taklif qilganlari: ${refs}\n` +
      `${u.is_registered ? '' : "⚠️ Ro'yxatdan o'tmagan\n"}${u.is_blocked ? '🚫 <b>BLOKLANGAN</b>' : '✅ Faol'}`;
    const kb = Markup.inlineKeyboard([
      [Markup.button.callback("💳 Balansni o'zgartirish", `au_bal:${tg}`), Markup.button.callback('📨 Xabar yozish', `adm_reply:${tg}`)],
      [Markup.button.callback('📜 Amallar tarixi', `au_tx:${tg}`), Markup.button.callback('🧮 Natijalari', `au_res:${tg}`)],
      [Markup.button.callback(u.is_blocked ? '✅ Blokdan chiqarish' : '🚫 Bloklash', `au_blk:${tg}`)],
      BACK_USERS,
    ]);
    return edit ? safeEdit(ctx, text, { parse_mode: 'HTML', ...kb }) : ctx.reply(text, { parse_mode: 'HTML', ...kb });
  }

  adminAction(/^au:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return showUser(ctx, Number(ctx.match[1]), true);
  });

  adminAction(/^au_blk:(\d+)$/, async (ctx) => {
    const tg = Number(ctx.match[1]);
    const u = await getUser(tg);
    if (!u) return ctx.answerCbQuery('Topilmadi');
    if (isAdmin(tg)) return ctx.answerCbQuery('Adminni bloklab bo\'lmaydi', { show_alert: true });
    await db('users').where({ tg_id: tg }).update({ is_blocked: u.is_blocked ? 0 : 1 });
    log(ctx.from.id, `🛠 ${u.is_blocked ? 'Blokdan chiqardi' : 'Blokladi'}: ${tg}`);
    ctx.telegram.sendMessage(tg, u.is_blocked ? '✅ Hisobingiz blokdan chiqarildi. /start' : "🚫 Hisobingiz admin tomonidan bloklandi.").catch(() => {});
    await ctx.answerCbQuery(u.is_blocked ? '✅ Blokdan chiqarildi' : '🚫 Bloklandi');
    return showUser(ctx, tg);
  });

  adminAction(/^au_tx:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const rows = await db('transactions').where({ user_tg: Number(ctx.match[1]) }).orderBy('id', 'desc').limit(25);
    const back = Markup.inlineKeyboard([[Markup.button.callback('⬅️ Foydalanuvchiga qaytish', `au:${ctx.match[1]}`)]]);
    if (!rows.length) return safeEdit(ctx, "Amallar yo'q.", back);
    return safeEdit(ctx, `📜 <b>Amallar tarixi</b>\n\n${rows.map((r) => `${fmtDate(r.created_at)} ${r.amount > 0 ? '➕' : '➖'}${money(Math.abs(r.amount))} ${TX_NAMES[r.type] || r.type} ${esc(r.note || '')}`).join('\n')}`.slice(0, 4000), { parse_mode: 'HTML', ...back });
  });

  adminAction(/^au_res:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const rows = await db('results').where({ user_tg: Number(ctx.match[1]) }).orderBy('id', 'desc').limit(25);
    const back = Markup.inlineKeyboard([[Markup.button.callback('⬅️ Foydalanuvchiga qaytish', `au:${ctx.match[1]}`)]]);
    if (!rows.length) return safeEdit(ctx, 'Hali test yechmagan.', back);
    const names = {};
    for (const r of rows) {
      const k = `${r.owner_type}:${r.owner_id}`;
      if (!names[k]) {
        const table = r.owner_type === 'tt' ? 'teacher_tests' : ITEM_TABLE[r.owner_type];
        const it = await db(table).where({ id: r.owner_id }).first();
        names[k] = it ? it.title : "(o'chirilgan)";
      }
    }
    return safeEdit(ctx, `🧮 <b>Test natijalari</b>\n\n${rows.map((r) => `${fmtDate(r.created_at)} ${esc(names[`${r.owner_type}:${r.owner_id}`])} — <b>${r.correct}/${r.total}</b>`).join('\n')}`.slice(0, 4000), { parse_mode: 'HTML', ...back });
  });

  // --- Balans ---
  async function askAmount(ctx, u) {
    ctx.session.form = { target: u.tg_id };
    ctx.session.state = 'adm_bal_amount';
    return ctx.reply(
      `👤 ${esc(u.first_name)} ${esc(u.last_name)}\n📞 ${esc(u.phone)}\n🆔 <code>${u.tg_id}</code>\n💰 Balans: ${money(u.balance)}\n\nQo'shiladigan summani kiriting (ayirish uchun minus bilan, masalan -5000):`,
      { parse_mode: 'HTML', ...cancelKb() },
    );
  }

  adminAction(/^(?:adm_topup|au_bal):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const u = await getUser(Number(ctx.match[1]));
    if (!u) return ctx.reply('Foydalanuvchi topilmadi');
    return askAmount(ctx, u);
  });

  adminState('adm_bal_amount', async (ctx) => {
    const amount = parseAmount(textOf(ctx), { allowNegative: true });
    if (!amount) return ctx.reply('Summani raqamda kiriting (masalan 20000):');
    const target = ctx.session.form && ctx.session.form.target;
    await addBalance(target, amount, 'admin', `Admin ${ctx.from.id}`);
    const u = await getUser(target);
    log(ctx.from.id, `🛠 Balans: ${target} ga ${amount > 0 ? '+' : ''}${money(amount)}`);
    log(target, `💳 Admin balansni o'zgartirdi: ${amount > 0 ? '+' : ''}${money(amount)}`);
    ctx.telegram
      .sendMessage(target, `${amount > 0 ? "✅ Balansingiz to'ldirildi" : 'ℹ️ Balansingizdan yechildi'}: <b>${money(Math.abs(amount))}</b>\n💰 Joriy balans: <b>${money(u.balance)}</b>`, { parse_mode: 'HTML' })
      .catch(() => {});
    ctx.session.form = null;
    return openPanel(ctx, `✅ Bajarildi. ${esc(u.first_name)} balansi: <b>${money(u.balance)}</b>`);
  });

  // --- Foydalanuvchiga yozish / murojaatga javob ---
  adminAction(/^adm_reply:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.form = { target: Number(ctx.match[1]) };
    ctx.session.state = 'adm_reply';
    return ctx.reply('Xabaringizni yozing (matn, rasm, fayl...):', cancelKb());
  });

  adminState('adm_reply', async (ctx) => {
    const target = ctx.session.form && ctx.session.form.target;
    try {
      await ctx.telegram.sendMessage(target, '📩 <b>Admin xabari:</b>', { parse_mode: 'HTML' });
      await ctx.telegram.copyMessage(target, ctx.chat.id, ctx.message.message_id);
      return openPanel(ctx, '✅ Yuborildi.');
    } catch (e) {
      return openPanel(ctx, `❌ Yuborilmadi: ${esc(e.message)}`);
    }
  });

  // ================= Test varianti qo'shish =================
  adminMenu(BTN.A_TEST, (ctx) =>
    ctx.reply("Qaysi bo'limga test varianti qo'shasiz?", Markup.inlineKeyboard(cats.list('test', true).map((c) => [Markup.button.callback(`${c.is_active ? '' : '🙈 '}${c.name}`, `at_c:${c.code}`)]))),
  );

  adminAction(/^at_c:(\w+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.form = { category: ctx.match[1] };
    ctx.session.state = 'adm_test_title';
    await safeEdit(ctx, `📚 ${catName(ctx.match[1])}`);
    return ctx.reply('Variant nomini kiriting (masalan: 1-variant):', cancelKb());
  });

  adminState('adm_test_title', async (ctx) => {
    const t = textOf(ctx);
    if (!t) return ctx.reply('Nomini kiriting:');
    ctx.session.form.title = t.slice(0, 200);
    ctx.session.state = 'adm_test_price';
    const def = await getNum('default_test_price');
    return ctx.reply("💵 Narxini kiriting (so'm). 0 — bepul.", Markup.keyboard([[String(def)], ['0'], [BTN.CANCEL]]).resize());
  });

  adminState('adm_test_price', async (ctx) => {
    const price = parseAmount(textOf(ctx));
    if (price == null) return ctx.reply('Narxni raqamda kiriting:');
    ctx.session.form.price = price;
    ctx.session.state = 'adm_test_time';
    return ctx.reply('⏱ Test uchun vaqt (daqiqada). 0 — cheklanmagan:', timeKb());
  });

  adminState('adm_test_time', async (ctx) => {
    const minutes = parseAmount(textOf(ctx));
    if (minutes == null || minutes > 600) return ctx.reply('Daqiqani raqamda kiriting (0–600):');
    ctx.session.form.time_limit = minutes;
    ctx.session.state = 'adm_test_pdf';
    return ctx.reply(
      "📄 Shu testning <b>elektron variantini (PDF)</b> yuboring — foydalanuvchilar uni alohida sotib olishadi.\nPDF bo'lmasa — «⏭ O'tkazib yuborish» (keyin «🗂 Kontent» dan qo'shsa ham bo'ladi).",
      { parse_mode: 'HTML', ...skipKb() },
    );
  });

  // PDF faylni xabardan olish
  const readPdf = (ctx) => {
    const d = ctx.message && ctx.message.document;
    if (!d) return null;
    if (d.mime_type !== 'application/pdf' && !/\.pdf$/i.test(d.file_name || '')) return false;
    return { pdf_id: d.file_id, pdf_name: (d.file_name || 'test.pdf').slice(0, 250) };
  };

  adminState('adm_test_pdf', async (ctx) => {
    if (textOf(ctx) === BTN.SKIP) return createVariant(ctx);
    const pdf = readPdf(ctx);
    if (pdf === false) return ctx.reply('Bu PDF emas. PDF fayl yuboring yoki «⏭ O\'tkazib yuborish».');
    if (!pdf) return ctx.reply('PDF faylni yuboring yoki «⏭ O\'tkazib yuborish».');
    Object.assign(ctx.session.form, pdf);
    ctx.session.state = 'adm_test_pdfprice';
    const def = await getNum('default_pdf_price');
    return ctx.reply("💵 PDF narxini kiriting (so'm). 0 — bepul.", Markup.keyboard([[String(def)], ['0'], [BTN.CANCEL]]).resize());
  });

  adminState('adm_test_pdfprice', async (ctx) => {
    const price = parseAmount(textOf(ctx));
    if (price == null) return ctx.reply('Narxni raqamda kiriting:');
    ctx.session.form.pdf_price = price;
    return createVariant(ctx);
  });

  async function createVariant(ctx) {
    const f = ctx.session.form;
    const [id] = await db('variants').insert({
      category: f.category, title: f.title, price: f.price, time_limit: f.time_limit, is_active: 1, created_at: now(),
      pdf_id: f.pdf_id || null, pdf_name: f.pdf_name || null, pdf_price: f.pdf_price || 0,
    });
    ctx.session.form = null;
    log(ctx.from.id, `🛠 Test varianti yaratdi: ${esc(f.title)}${f.pdf_id ? ' (+PDF)' : ''}`);
    await ctx.reply(
      `✅ Variant yaratildi: <b>${esc(f.title)}</b> (${catName(f.category)})\n💵 ${money(f.price)} | ⏱ ${f.time_limit ? `${f.time_limit} daqiqa` : 'cheklanmagan'}` +
      `${f.pdf_id ? `\n📄 PDF: ${money(f.pdf_price || 0)}` : ''}\n\nEndi savollarni bittalab kiriting.`,
      { parse_mode: 'HTML' },
    );
    return wizard.startWizard(ctx, { type: 'variant', id, back: 'admin' });
  }

  // ================= Video mavzu qo'shish =================
  adminMenu(BTN.A_VIDEO, (ctx) =>
    ctx.reply("Qaysi bo'limga video mavzu qo'shasiz?", Markup.inlineKeyboard(cats.list('video', true).map((g) => [Markup.button.callback(`${g.is_active ? '' : '🙈 '}${g.name}`, `av_g:${g.code}`)]))),
  );

  adminAction(/^av_g:(\w+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.form = { grp: ctx.match[1] };
    ctx.session.state = 'adm_vid_title';
    await safeEdit(ctx, `🎬 ${grpName(ctx.match[1])}`);
    return ctx.reply('Mavzu nomini kiriting:', cancelKb());
  });

  adminState('adm_vid_title', async (ctx) => {
    const t = textOf(ctx);
    if (!t) return ctx.reply('Nomini kiriting:');
    ctx.session.form.title = t.slice(0, 200);
    ctx.session.state = 'adm_vid_desc';
    return ctx.reply('Qisqacha tavsif:', skipKb());
  });

  adminState('adm_vid_desc', async (ctx) => {
    const t = textOf(ctx);
    if (!t) return ctx.reply('Tavsifni matn shaklida yozing:');
    ctx.session.form.description = t === BTN.SKIP ? null : t.slice(0, 800);
    ctx.session.state = 'adm_vid_price';
    const def = await getNum('default_video_price');
    return ctx.reply("💵 Narxini kiriting (so'm). 0 — bepul.", Markup.keyboard([[String(def)], ['0'], [BTN.CANCEL]]).resize());
  });

  adminState('adm_vid_price', async (ctx) => {
    const price = parseAmount(textOf(ctx));
    if (price == null) return ctx.reply('Narxni raqamda kiriting:');
    ctx.session.form.price = price;
    ctx.session.state = 'adm_vid_time';
    return ctx.reply('⏱ Takrorlash testi uchun vaqt (daqiqada). 0 — cheklanmagan:', timeKb());
  });

  adminState('adm_vid_time', async (ctx) => {
    const minutes = parseAmount(textOf(ctx));
    if (minutes == null || minutes > 600) return ctx.reply('Daqiqani raqamda kiriting (0–600):');
    ctx.session.form.time_limit = minutes;
    ctx.session.state = 'adm_vid_file';
    return ctx.reply('🎥 Mavzu videosini yuboring (video fayl) yoki havola (YouTube va h.k.):', cancelKb());
  });

  const readVideo = (ctx) => {
    const m = ctx.message;
    const t = textOf(ctx);
    if (m.video) return { video_type: 'video', video_ref: m.video.file_id };
    if (m.document) return { video_type: 'document', video_ref: m.document.file_id };
    if (t && /^https?:\/\/\S+$/i.test(t)) return { video_type: 'url', video_ref: t };
    return null;
  };

  adminState('adm_vid_file', async (ctx) => {
    const v = readVideo(ctx);
    if (!v) return ctx.reply('Video fayl yoki https:// havola yuboring:');
    const f = { ...ctx.session.form, ...v };
    const [id] = await db('topics').insert({
      grp: f.grp, title: f.title, description: f.description, video_type: f.video_type, video_ref: f.video_ref,
      price: f.price, time_limit: f.time_limit, is_active: 1, created_at: now(),
    });
    ctx.session.form = null;
    log(ctx.from.id, `🛠 Video mavzu yaratdi: ${esc(f.title)}`);
    await ctx.reply(`✅ Mavzu yaratildi: <b>${esc(f.title)}</b> (${grpName(f.grp)})\n\nEndi mavzu orqasidan keladigan <b>takrorlash testi</b> savollarini bittalab kiriting.`, { parse_mode: 'HTML' });
    return wizard.startWizard(ctx, { type: 'topic', id, back: 'admin' });
  });

  // ================= Kontent boshqaruvi =================
  const contentKb = () => Markup.inlineKeyboard([
    [Markup.button.callback('📝 Test variantlari', 'ac_l:variant')],
    [Markup.button.callback('🎬 Video mavzular', 'ac_l:topic')],
  ]);
  adminMenu(BTN.A_CONTENT, (ctx) => ctx.reply('🗂 Kontent', contentKb()));
  adminAction('ac_home', async (ctx) => {
    await ctx.answerCbQuery();
    return safeEdit(ctx, '🗂 Kontent', contentKb());
  });
  const BACK_CONTENT = [Markup.button.callback('⬅️ Kontent', 'ac_home')];

  const itemGroup = (type, it) => (type === 'variant' ? catName(it.category) : grpName(it.grp));

  adminAction(/^ac_l:(variant|topic)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const type = ctx.match[1];
    const col = type === 'variant' ? 'category' : 'grp';
    const pos = new Map(cats.list(type === 'variant' ? 'test' : 'video', true).map((c, i) => [c.code, i]));
    const items = (await db(ITEM_TABLE[type]).orderBy('id').limit(150))
      .sort((a, b) => (pos.get(a[col]) ?? 999) - (pos.get(b[col]) ?? 999) || a.id - b.id);
    if (!items.length) return safeEdit(ctx, "Hali hech narsa qo'shilmagan.", Markup.inlineKeyboard([BACK_CONTENT]));
    const rows = items.map((it) => [Markup.button.callback(`${it.is_active ? '' : '🙈 '}[${itemGroup(type, it)}] ${it.title}`.slice(0, 60), `ac_i:${type}:${it.id}`)]);
    rows.push(BACK_CONTENT);
    return safeEdit(ctx, type === 'variant' ? '📝 Test variantlari:' : '🎬 Video mavzular:', Markup.inlineKeyboard(rows));
  });

  async function showItem(ctx, type, id, edit = true) {
    const it = await db(ITEM_TABLE[type]).where({ id }).first();
    if (!it) return safeEdit(ctx, "Topilmadi (o'chirilgan bo'lishi mumkin).", Markup.inlineKeyboard([[Markup.button.callback("⬅️ Ro'yxat", `ac_l:${type}`)]]));
    const q = await cnt(db('questions').where({ owner_type: type, owner_id: id }));
    const sols = await cnt(db('questions').where({ owner_type: type, owner_id: id }).whereNotNull('sol_ref'));
    const b = await cnt(db('purchases').where({ item_type: type, item_id: id }));
    const solved = await cnt(db('results').where({ owner_type: type, owner_id: id }));
    const pdfBuys = type === 'variant' ? await cnt(db('purchases').where({ item_type: 'pdf', item_id: id })) : 0;
    const pdfLine = type !== 'variant' ? '' : it.pdf_id ? `\n📄 PDF: ${money(it.pdf_price)} · sotilgan: ${pdfBuys} marta` : "\n📄 PDF: yo'q";
    const text = `<b>${esc(it.title)}</b>\n📂 ${itemGroup(type, it)}\n💵 Narxi: ${money(it.price)}\n⏱ Vaqt: ${it.time_limit ? `${it.time_limit} daqiqa` : 'cheklanmagan'}\n` +
      `❓ Savollar: ${q} (🎥 video yechimli: ${sols})\n🛒 Sotib olingan: ${b} marta\n🧮 Yechilgan: ${solved} marta${pdfLine}\n👁 Holati: ${it.is_active ? "ko'rinadi" : 'yashirin'}`;
    const rows = [
      [Markup.button.callback("➕ Savol qo'shish", `ac_q:${type}:${id}`), Markup.button.callback('📋 Savollar', `ac_ql:${type}:${id}`)],
      [Markup.button.callback('💵 Narx', `ac_p:${type}:${id}`), Markup.button.callback('⏱ Vaqt', `ac_tm:${type}:${id}`)],
      [Markup.button.callback(it.is_active ? "🙈 Yashirish" : "👁 Ko'rsatish", `ac_t:${type}:${id}`), Markup.button.callback("🗑 O'chirish", `ac_d:${type}:${id}`)],
    ];
    rows.splice(2, 0, [Markup.button.callback("📂 Bo'limini o'zgartirish", `ac_mv:${type}:${id}`)]);
    if (type === 'variant') {
      rows.splice(2, 0, it.pdf_id
        ? [Markup.button.callback('📄 PDFni almashtirish', `ac_pdf:${id}`), Markup.button.callback('📄 PDF narxi', `ac_pp:${id}`), Markup.button.callback('🗑 PDF', `ac_pdel:${id}`)]
        : [Markup.button.callback('📄 PDF (elektron variant) yuklash', `ac_pdf:${id}`)]);
    }
    if (type === 'topic') rows.splice(2, 0, [Markup.button.callback("🎥 Videoni almashtirish", `ac_v:${id}`), Markup.button.callback("▶️ Videoni ko'rish", `vt:${id}`)]);
    rows.push([Markup.button.callback("⬅️ Ro'yxat", `ac_l:${type}`)]);
    const extra = { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) };
    return edit ? safeEdit(ctx, text, extra) : ctx.reply(text, extra);
  }

  adminAction(/^ac_i:(variant|topic):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return showItem(ctx, ctx.match[1], Number(ctx.match[2]));
  });

  adminAction(/^ac_q:(variant|topic):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return wizard.startWizard(ctx, { type: ctx.match[1], id: Number(ctx.match[2]), back: 'admin' });
  });

  // Savollar ro'yxati, bittalab o'chirish
  async function showQuestions(ctx, type, id) {
    const qs = await db('questions').where({ owner_type: type, owner_id: id }).orderBy('id');
    if (!qs.length) {
      return safeEdit(ctx, "Savollar yo'q.", Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', `ac_i:${type}:${id}`)]]));
    }
    const lines = qs.map((q, i) => `<b>${i + 1}.</b> ${q.photo_id ? '🖼 ' : ''}${esc((q.body || '(rasm)').slice(0, 60))} — <b>${L[q.correct]}</b>${q.sol_ref ? ' 🎥' : ''}`);
    let text = `📋 <b>Savollar</b> (${qs.length})\n\n${lines.join('\n')}\n\n🗑 O'chirish uchun savol raqamini bosing:`;
    if (text.length > 3900) text = `${text.slice(0, 3890)}…`;
    const btns = qs.map((q, i) => Markup.button.callback(`🗑${i + 1}`, `ac_qd:${q.id}`));
    const rows = [];
    for (let i = 0; i < btns.length && rows.length < 12; i += 5) rows.push(btns.slice(i, i + 5));
    rows.push([Markup.button.callback("🧹 Hammasini o'chirish", `ac_qc:${type}:${id}`)]);
    rows.push([Markup.button.callback('⬅️ Orqaga', `ac_i:${type}:${id}`)]);
    return safeEdit(ctx, text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) });
  }

  adminAction(/^ac_ql:(variant|topic):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return showQuestions(ctx, ctx.match[1], Number(ctx.match[2]));
  });

  adminAction(/^ac_qd:(\d+)$/, async (ctx) => {
    const q = await db('questions').where({ id: Number(ctx.match[1]) }).first();
    if (!q || q.owner_type === 'tt') return ctx.answerCbQuery('Topilmadi');
    await db('questions').where({ id: q.id }).del();
    await ctx.answerCbQuery("🗑 Savol o'chirildi");
    return showQuestions(ctx, q.owner_type, q.owner_id);
  });

  adminAction(/^ac_p:(variant|topic):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.form = { type: ctx.match[1], id: Number(ctx.match[2]), field: 'price' };
    ctx.session.state = 'adm_item_num';
    return ctx.reply("💵 Yangi narxni kiriting (so'm):", cancelKb());
  });

  adminAction(/^ac_tm:(variant|topic):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.form = { type: ctx.match[1], id: Number(ctx.match[2]), field: 'time_limit' };
    ctx.session.state = 'adm_item_num';
    return ctx.reply('⏱ Yangi vaqtni kiriting (daqiqa, 0 — cheklanmagan):', timeKb());
  });

  adminState('adm_item_num', async (ctx) => {
    const val = parseAmount(textOf(ctx));
    if (val == null) return ctx.reply('Raqam kiriting:');
    const { type, id, field } = ctx.session.form;
    await db(ITEM_TABLE[type]).where({ id }).update({ [field]: val });
    ctx.session.form = null;
    await openPanel(ctx, `✅ O'zgartirildi: ${field === 'time_limit' ? `${val} daqiqa` : money(val)}`);
    return showItem(ctx, type, id, false);
  });

  // ---- PDF (elektron variant) boshqaruvi ----
  adminAction(/^ac_pdf:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.form = { id: Number(ctx.match[1]) };
    ctx.session.state = 'adm_pdf_upload';
    return ctx.reply('📄 PDF faylni yuboring:', cancelKb());
  });

  adminState('adm_pdf_upload', async (ctx) => {
    const pdf = readPdf(ctx);
    if (!pdf) return ctx.reply('PDF fayl yuboring:');
    const { id } = ctx.session.form;
    const v = await db('variants').where({ id }).first();
    const upd = { ...pdf };
    if (v && !v.pdf_id && !v.pdf_price) upd.pdf_price = await getNum('default_pdf_price');
    await db('variants').where({ id }).update(upd);
    ctx.session.form = null;
    log(ctx.from.id, `🛠 PDF yukladi: variant#${id}`);
    await openPanel(ctx, `✅ PDF saqlandi${upd.pdf_price != null ? ` (narxi ${money(upd.pdf_price)}, «📄 PDF narxi» dan o'zgartiring)` : ''}.`);
    return showItem(ctx, 'variant', id, false);
  });

  adminAction(/^ac_pp:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.form = { type: 'variant', id: Number(ctx.match[1]), field: 'pdf_price' };
    ctx.session.state = 'adm_item_num';
    return ctx.reply("📄 PDF narxini kiriting (so'm, 0 — bepul):", cancelKb());
  });

  adminAction(/^ac_pdel:(\d+)$/, async (ctx) => {
    await db('variants').where({ id: Number(ctx.match[1]) }).update({ pdf_id: null, pdf_name: null });
    await ctx.answerCbQuery('🗑 PDF olib tashlandi');
    return showItem(ctx, 'variant', Number(ctx.match[1]));
  });

  adminAction(/^ac_v:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.form = { id: Number(ctx.match[1]) };
    ctx.session.state = 'adm_vid_replace';
    return ctx.reply('🎥 Yangi videoni yuboring (fayl yoki havola):', cancelKb());
  });

  adminState('adm_vid_replace', async (ctx) => {
    const v = readVideo(ctx);
    if (!v) return ctx.reply('Video fayl yoki https:// havola yuboring:');
    const { id } = ctx.session.form;
    await db('topics').where({ id }).update(v);
    ctx.session.form = null;
    await openPanel(ctx, '✅ Video almashtirildi.');
    return showItem(ctx, 'topic', id, false);
  });

  adminAction(/^ac_t:(variant|topic):(\d+)$/, async (ctx) => {
    const [, type, id] = ctx.match;
    const it = await db(ITEM_TABLE[type]).where({ id: Number(id) }).first();
    if (it) await db(ITEM_TABLE[type]).where({ id: it.id }).update({ is_active: it.is_active ? 0 : 1 });
    await ctx.answerCbQuery('✅');
    return showItem(ctx, type, Number(id));
  });

  adminAction(/^ac_qc:(variant|topic):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const [, type, id] = ctx.match;
    return safeEdit(ctx, "⚠️ Barcha savollar o'chirilsinmi?", Markup.inlineKeyboard([
      [Markup.button.callback("Ha, o'chirish", `ac_qcc:${type}:${id}`), Markup.button.callback("Yo'q", `ac_i:${type}:${id}`)],
    ]));
  });

  adminAction(/^ac_qcc:(variant|topic):(\d+)$/, async (ctx) => {
    const [, type, id] = ctx.match;
    await db('questions').where({ owner_type: type, owner_id: Number(id) }).del();
    await ctx.answerCbQuery("🧹 Savollar o'chirildi");
    return showItem(ctx, type, Number(id));
  });

  adminAction(/^ac_d:(variant|topic):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const [, type, id] = ctx.match;
    return safeEdit(ctx, "⚠️ Rostdan ham o'chirilsinmi? Savollari ham o'chadi. (Vaqtincha yashirish uchun «🙈 Yashirish» dan foydalaning.)", Markup.inlineKeyboard([
      [Markup.button.callback("Ha, o'chirish", `ac_dd:${type}:${id}`), Markup.button.callback("Yo'q", `ac_i:${type}:${id}`)],
    ]));
  });

  adminAction(/^ac_dd:(variant|topic):(\d+)$/, async (ctx) => {
    const [, type, idS] = ctx.match;
    const id = Number(idS);
    await db.transaction(async (trx) => {
      await trx('questions').where({ owner_type: type, owner_id: id }).del();
      await trx(ITEM_TABLE[type]).where({ id }).del();
    });
    log(ctx.from.id, `🛠 O'chirdi: ${type}#${id}`);
    await ctx.answerCbQuery("🗑 O'chirildi");
    return safeEdit(ctx, "🗑 O'chirildi.", Markup.inlineKeyboard([[Markup.button.callback("⬅️ Ro'yxat", `ac_l:${type}`)]]));
  });

  // Testni / mavzuni boshqa sinf bo'limiga ko'chirish
  adminAction(/^ac_mv:(variant|topic):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const [, type, id] = ctx.match;
    const list = cats.list(type === 'variant' ? 'test' : 'video', true);
    return safeEdit(ctx, "📂 Qaysi bo'limga ko'chirasiz?", Markup.inlineKeyboard([
      ...list.map((c) => [Markup.button.callback(`${c.is_active ? '' : '🙈 '}${c.name}`, `ac_mvto:${type}:${id}:${c.code}`)]),
      [Markup.button.callback('⬅️ Orqaga', `ac_i:${type}:${id}`)],
    ]));
  });

  adminAction(/^ac_mvto:(variant|topic):(\d+):(\w+)$/, async (ctx) => {
    const [, type, id, code] = ctx.match;
    const section = type === 'variant' ? 'test' : 'video';
    if (!cats.find(section, code)) return ctx.answerCbQuery('Bo\'lim topilmadi');
    await db(ITEM_TABLE[type]).where({ id: Number(id) }).update({ [type === 'variant' ? 'category' : 'grp']: code });
    log(ctx.from.id, `🛠 ${type}#${id} → ${esc(cats.name(section, code))}`);
    await ctx.answerCbQuery(`✅ Ko'chirildi: ${cats.name(section, code)}`);
    return showItem(ctx, type, Number(id));
  });

  // ================= Sinf bo'limlari (qaysi sinflar birga / alohida) =================
  const SECTION_NAME = { test: "📝 Test bo'limlari", video: "📺 Onlayn dars (videodars) bo'limlari" };

  const catsHome = (ctx, edit) =>
    (edit ? safeEdit : (c, t, e) => c.reply(t, e))(ctx,
      "📂 <b>Sinf bo'limlari</b>\n\nBu yerda testlar va onlayn darslar qaysi sinflar uchun bo'lishini belgilaysiz: " +
      "sinflarni alohida (masalan «5-sinf») yoki birgalikda (masalan «6-7-sinf») qilib bo'lim yaratasiz. " +
      "Keyin test yoki mavzu qo'shganda shu bo'limni tanlaysiz.",
      { parse_mode: 'HTML', ...Markup.inlineKeyboard([
        [Markup.button.callback(SECTION_NAME.test, 'cat_l:test')],
        [Markup.button.callback(SECTION_NAME.video, 'cat_l:video')],
      ]) },
    );
  adminMenu(BTN.A_CATS, (ctx) => catsHome(ctx, false));
  adminAction('cat_home', async (ctx) => {
    await ctx.answerCbQuery();
    return catsHome(ctx, true);
  });
  const BACK_CATS = [Markup.button.callback('⬅️ Orqaga', 'cat_home')];

  async function showCats(ctx, section) {
    const list = cats.list(section, true);
    const rows = [];
    for (const c of list) rows.push([Markup.button.callback(`${c.is_active ? '✅' : '🙈'} ${c.name} (${await cats.contentCount(c)})`, `cat_i:${c.id}`)]);
    rows.push([Markup.button.callback("➕ Yangi bo'lim qo'shish", `cat_new:${section}`)]);
    rows.push(BACK_CATS);
    return safeEdit(ctx, `${SECTION_NAME[section]}\n\nQavs ichida — ${section === 'test' ? 'test variantlari' : 'mavzular'} soni. ✅ ko'rinadi, 🙈 yashirin.\nTartib foydalanuvchi menyusidagi tartib bilan bir xil.`, Markup.inlineKeyboard(rows));
  }

  adminAction(/^cat_l:(test|video)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return showCats(ctx, ctx.match[1]);
  });

  async function showCat(ctx, id) {
    const c = cats.byId(id);
    if (!c) return safeEdit(ctx, "Bo'lim topilmadi.", Markup.inlineKeyboard([BACK_CATS]));
    const n = await cats.contentCount(c);
    return safeEdit(ctx, `📂 <b>${esc(c.name)}</b>\n${SECTION_NAME[c.section]}\n${c.section === 'test' ? 'Test variantlari' : 'Mavzular'}: ${n}\nHolati: ${c.is_active ? "✅ ko'rinadi" : '🙈 yashirin'}`, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback("✏️ Nomini o'zgartirish", `cat_rn:${c.id}`)],
        [Markup.button.callback('⬆️ Yuqoriga', `cat_mv:${c.id}:-1`), Markup.button.callback('⬇️ Pastga', `cat_mv:${c.id}:1`)],
        [Markup.button.callback(c.is_active ? '🙈 Yashirish' : "👁 Ko'rsatish", `cat_t:${c.id}`), Markup.button.callback("🗑 O'chirish", `cat_d:${c.id}`)],
        [Markup.button.callback("⬅️ Ro'yxat", `cat_l:${c.section}`)],
      ]),
    });
  }

  adminAction(/^cat_i:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return showCat(ctx, Number(ctx.match[1]));
  });

  adminAction(/^cat_new:(test|video)$/, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.form = { section: ctx.match[1] };
    ctx.session.state = 'adm_cat_name';
    return ctx.reply(
      "Yangi bo'lim nomini yozing.\n\nMasalan:\n• <code>5-sinf</code> — alohida\n• <code>6-7-sinf</code> — birgalikda\n• <code>Olimpiadaga tayyorgarlik</code>",
      { parse_mode: 'HTML', ...cancelKb() },
    );
  });

  adminAction(/^cat_rn:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const c = cats.byId(ctx.match[1]);
    if (!c) return null;
    ctx.session.form = { id: c.id, section: c.section };
    ctx.session.state = 'adm_cat_name';
    return ctx.reply(`Hozirgi nomi: <b>${esc(c.name)}</b>\nYangi nomini yozing:`, { parse_mode: 'HTML', ...cancelKb() });
  });

  adminState('adm_cat_name', async (ctx) => {
    const t = textOf(ctx);
    if (!t || t.length > 60) return ctx.reply('Nomini yozing (60 belgigacha):');
    const { id, section } = ctx.session.form || {};
    if (!section) return openPanel(ctx);
    if (cats.list(section, true).some((c) => c.name.toLowerCase() === t.toLowerCase() && c.id !== id)) {
      return ctx.reply("Bunday nomli bo'lim allaqachon bor. Boshqa nom yozing:");
    }
    if (id) await cats.update(id, { name: t });
    else await cats.create(section, t);
    log(ctx.from.id, `🛠 Sinf bo'limi ${id ? "nomi o'zgardi" : 'yaratildi'}: ${esc(t)}`);
    ctx.session.form = null;
    await openPanel(ctx, `✅ Saqlandi: <b>${esc(t)}</b>`);
    const list = cats.list(section, true);
    const rows = list.map((c) => [Markup.button.callback(`${c.is_active ? '✅' : '🙈'} ${c.name}`, `cat_i:${c.id}`)]);
    rows.push([Markup.button.callback("➕ Yangi bo'lim qo'shish", `cat_new:${section}`)]);
    rows.push(BACK_CATS);
    return ctx.reply(SECTION_NAME[section], Markup.inlineKeyboard(rows));
  });

  adminAction(/^cat_mv:(\d+):(-?1)$/, async (ctx) => {
    await cats.move(Number(ctx.match[1]), Number(ctx.match[2]));
    await ctx.answerCbQuery('✅');
    return showCat(ctx, Number(ctx.match[1]));
  });

  adminAction(/^cat_t:(\d+)$/, async (ctx) => {
    const c = cats.byId(ctx.match[1]);
    if (!c) return ctx.answerCbQuery();
    await cats.update(c.id, { is_active: c.is_active ? 0 : 1 });
    await ctx.answerCbQuery(c.is_active ? '🙈 Yashirildi' : "👁 Ko'rsatildi");
    return showCat(ctx, c.id);
  });

  adminAction(/^cat_d:(\d+)$/, async (ctx) => {
    const c = cats.byId(ctx.match[1]);
    if (!c) return ctx.answerCbQuery();
    const n = await cats.contentCount(c);
    if (n) {
      return ctx.answerCbQuery(`Bu bo'limda ${n} ta ${c.section === 'test' ? 'test' : 'mavzu'} bor. Avval ularni «🗂 Kontent» orqali boshqa bo'limga ko'chiring yoki o'chiring. Yoki bo'limni yashiring.`, { show_alert: true });
    }
    await ctx.answerCbQuery();
    return safeEdit(ctx, `⚠️ «${esc(c.name)}» bo'limi o'chirilsinmi?`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([
      [Markup.button.callback("Ha, o'chirish", `cat_dd:${c.id}`), Markup.button.callback("Yo'q", `cat_i:${c.id}`)],
    ]) });
  });

  adminAction(/^cat_dd:(\d+)$/, async (ctx) => {
    const c = cats.byId(ctx.match[1]);
    if (!c) return ctx.answerCbQuery();
    if (await cats.contentCount(c)) return ctx.answerCbQuery("Bo'limda kontent bor", { show_alert: true });
    await cats.remove(c.id);
    log(ctx.from.id, `🛠 Sinf bo'limi o'chirildi: ${esc(c.name)}`);
    await ctx.answerCbQuery("🗑 O'chirildi");
    return showCats(ctx, c.section);
  });

  // ================= Narxlar va sozlamalar =================
  const PRICE_KEYS = Object.keys(DEFAULT_SETTINGS).filter((k) => !k.startsWith('f_'));
  const fmtVal = (k, v) => (k === 'payment_info' ? `${String(v).slice(0, 25)}…` : /_days$/.test(k) ? `${v} kun` : k === 'ad_interval_hours' ? `${v} soat` : money(v));

  // Tugmalarda qirqilmasligi uchun qisqa nomlar (to'liq izoh tugma bosilganda chiqadi)
  const SHORT = {
    start_bonus: "🎁 Start bonusi (ro'yxatdan o'tganga)",
    referral_bonus: "👥 Do'st taklif qilish bonusi",
    default_test_price: '📝 Test narxi',
    default_pdf_price: '📄 Test PDF narxi',
    default_video_price: '🎬 Video mavzu narxi',
    book_price: "📚 Kitob e'loni narxi",
    book_days: "📚 Kitob e'loni muddati",
    center_price: "🏫 Markaz e'loni narxi",
    center_days: "🏫 Markaz e'loni muddati",
    teacher_test_price: "👨‍🏫 O'qituvchi testi narxi",
    ad_interval_hours: '📣 Reklama oralig\'i',
    payment_info: "💳 To'lov ma'lumoti (karta)",
  };
  async function pricesView() {
    const order = ['start_bonus', 'referral_bonus', ...PRICE_KEYS.filter((k) => !['start_bonus', 'referral_bonus'].includes(k))];
    const rows = [];
    for (const k of order) {
      const v = k === 'payment_info' ? "o'zgartirish" : fmtVal(k, await getSetting(k));
      rows.push([Markup.button.callback(`${SHORT[k] || k}: ${v}`.slice(0, 64), `st:${k}`)]);
    }
    return { text: "💵 <b>Narxlar va sozlamalar</b>\n\nO'zgartirish uchun bosing:", extra: { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) } };
  }

  adminMenu(BTN.A_PRICES, async (ctx) => {
    const v = await pricesView();
    return ctx.reply(v.text, v.extra);
  });

  adminAction(/^st:(\w+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const key = ctx.match[1];
    if (!PRICE_KEYS.includes(key)) return null;
    ctx.session.form = { key };
    ctx.session.state = 'adm_setting';
    return ctx.reply(`✏️ <b>${esc(SETTING_HELP[key])}</b>\nHozirgi qiymat: <b>${esc(await getSetting(key))}</b>\n\nYangi qiymatni yuboring:`, { parse_mode: 'HTML', ...cancelKb() });
  });

  adminState('adm_setting', async (ctx) => {
    const { key } = ctx.session.form || {};
    const t = textOf(ctx);
    if (!key || !t) return ctx.reply('Qiymat yuboring:');
    let value = t;
    if (key !== 'payment_info') {
      const n = parseAmount(t);
      if (n == null) return ctx.reply("Raqam kiriting (masalan 30000):");
      value = String(n);
    }
    await setSetting(key, value);
    log(ctx.from.id, `🛠 Sozlama: ${key} = ${esc(value.slice(0, 50))}`);
    ctx.session.form = null;
    await openPanel(ctx, '✅ Saqlandi.');
    const v = await pricesView();
    return ctx.reply(v.text, v.extra);
  });

  bot.command('set', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return null;
    const m = ctx.message.text.match(/^\/set(?:@\w+)?\s+(\w+)\s+([\s\S]+)$/);
    if (!m) return ctx.reply('Format: /set nom qiymat');
    const [, key, value] = m;
    if (!(key in DEFAULT_SETTINGS)) return ctx.reply(`Bunday sozlama yo'q. Mavjudlari: ${PRICE_KEYS.join(', ')}`);
    if (key !== 'payment_info' && parseAmount(value) == null) return ctx.reply("Qiymat raqam bo'lishi kerak.");
    await setSetting(key, key === 'payment_info' ? value.trim() : String(parseAmount(value)));
    return ctx.reply(`✅ ${key} = ${value.trim()}`);
  });

  // ================= Bo'limlarni yoqish / o'chirish =================
  async function featuresKb() {
    const rows = [];
    for (const [k, name] of Object.entries(FEATURES)) rows.push([Markup.button.callback(`${(await isOn(k)) ? '✅' : '❌'} ${name}`, `ft:${k}`)]);
    return Markup.inlineKeyboard(rows);
  }
  const FT_TEXT = "🎛 <b>Bo'limlar</b>\n\n✅ — yoqilgan, ❌ — o'chirilgan. Bosib o'zgartiring.\nO'chirilgan bo'lim foydalanuvchilarga ko'rinmaydi (adminlarga ko'rinadi).";

  adminMenu(BTN.A_FEATURES, async (ctx) => ctx.reply(FT_TEXT, { parse_mode: 'HTML', ...(await featuresKb()) }));

  adminAction(/^ft:(\w+)$/, async (ctx) => {
    const k = ctx.match[1];
    if (!FEATURES[k]) return ctx.answerCbQuery();
    const on = await isOn(k);
    await setSetting(`f_${k}`, on ? '0' : '1');
    log(ctx.from.id, `🛠 Bo'lim ${on ? "o'chirildi" : 'yoqildi'}: ${esc(FEATURES[k])}`);
    await ctx.answerCbQuery(on ? "❌ O'chirildi" : '✅ Yoqildi');
    return safeEdit(ctx, FT_TEXT, { parse_mode: 'HTML', ...(await featuresKb()) });
  });

  // ================= Xabar yuborish (hammaga) =================
  adminMenu(BTN.A_BROADCAST, (ctx) => {
    ctx.session.state = 'adm_broadcast';
    return ctx.reply('Barcha foydalanuvchilarga yuboriladigan xabarni yuboring (matn, rasm, video...):', cancelKb());
  });

  adminState('adm_broadcast', async (ctx) => {
    const fromChat = ctx.chat.id;
    const msgId = ctx.message.message_id;
    const adminId = ctx.from.id;
    const users = await db('users').where({ is_registered: 1, is_blocked: 0 }).select('tg_id');
    log(adminId, `📢 Xabar yuborishni boshladi: ${users.length} ta`);
    await openPanel(ctx, `📢 Yuborish boshlandi: ${users.length} ta foydalanuvchi. Tugagach xabar beraman.`);
    (async () => {
      let ok = 0;
      let fail = 0;
      for (const u of users) {
        try {
          await ctx.telegram.copyMessage(u.tg_id, fromChat, msgId);
          ok += 1;
        } catch (e) {
          fail += 1;
        }
        await sleep(40);
      }
      ctx.telegram.sendMessage(adminId, `📢 Yuborish tugadi.\n✅ Yetkazildi: ${ok}\n❌ Xato (botni bloklaganlar): ${fail}`).catch(() => {});
    })();
    return null;
  });
}

module.exports = { register };

};

// ===================== src/handlers/adminAds.js =====================
__modules["src/handlers/adminAds.js"] = function (module, exports, require) {
const __filename = "src/handlers/adminAds.js"; const __dirname = "src/handlers";
// Admin: 📣 Reklama (muddati bilan) va 📋 E'lonlar (kitob / markaz e'lonlarini boshqarish)
const { Markup } = require('telegraf');
const { db } = require('../db');
const { BTN, adminKb, cancelKb, skipKb } = require('../keyboards');
const { CENTER_KINDS } = require('../constants');
const { esc, now, DAY, fmtDate, isAdmin, parseAmount, textOf, safeEdit, sleep, getUser } = require('../utils');
const { showMainMenu } = require('../menu');
const { sendAd } = require('../ads');
const { log } = require('../logger');

const daysKb = () => Markup.keyboard([['1', '3', '7'], ['15', '30', '60'], [BTN.CANCEL]]).resize();

function adStatus(ad) {
  const t = now();
  if (!ad.is_active) return '⏸ To\'xtatilgan';
  if (Number(ad.ends_at) <= t) return `🔴 Tugagan (${fmtDate(ad.ends_at)})`;
  if (Number(ad.starts_at) > t) return `⏳ ${fmtDate(ad.starts_at)} dan`;
  return `🟢 Faol: ${fmtDate(ad.ends_at)} gacha`;
}
const adTitle = (ad) => (ad.text || (ad.media_type === 'photo' ? '🖼 Rasm' : '🎥 Video')).replace(/\s+/g, ' ').slice(0, 40);

function register({ bot, menu, states }) {
  const adminMenu = (text, fn) => menu(text, (ctx) => (isAdmin(ctx.from.id) ? fn(ctx) : showMainMenu(ctx)));
  const adminAction = (trigger, fn) => bot.action(trigger, (ctx) => (isAdmin(ctx.from.id) ? fn(ctx) : ctx.answerCbQuery("Ruxsat yo'q")));
  const adminState = (name, fn) => {
    states[name] = (ctx) => (isAdmin(ctx.from.id) ? fn(ctx) : showMainMenu(ctx));
  };
  const toPanel = (ctx, text) => {
    ctx.session.state = null;
    return ctx.reply(text, { parse_mode: 'HTML', ...adminKb() });
  };

  // ======================= 📣 REKLAMA =======================
  async function adsList(ctx, edit) {
    const list = await db('ads').orderBy('id', 'desc').limit(30);
    const rows = list.map((a) => [Markup.button.callback(`${adStatus(a).split(':')[0]} ${adTitle(a)}`.slice(0, 60), `ad_i:${a.id}`)]);
    rows.unshift([Markup.button.callback('➕ Yangi reklama', 'ad_new')]);
    const text = "📣 <b>Reklama</b>\n\nReklama foydalanuvchilarga menyu ochganda ko'rsatiladi (bir odamga «💵 Narxlar» dagi oraliqda bir marta). " +
      "Muddat tugagach avtomatik to'xtaydi.\n\n🟢 faol · ⏳ boshlanmagan · 🔴 tugagan · ⏸ to'xtatilgan";
    const extra = { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) };
    return edit ? safeEdit(ctx, text, extra) : ctx.reply(text, extra);
  }

  adminMenu(BTN.A_ADS, (ctx) => adsList(ctx, false));
  adminAction('ad_home', async (ctx) => {
    await ctx.answerCbQuery();
    return adsList(ctx, true);
  });

  // --- Yangi reklama: kontent -> tugma -> muddat -> tasdiq ---
  adminAction('ad_new', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.form = {};
    ctx.session.state = 'adm_ad_content';
    return ctx.reply(
      "📣 <b>Yangi reklama</b>\n\n<b>1-qadam.</b> Reklama matnini yuboring.\nRasm yoki video bilan bo'lsa — rasm/videoni yuborib, izohiga (caption) matnni yozing.",
      { parse_mode: 'HTML', ...cancelKb() },
    );
  });

  adminState('adm_ad_content', async (ctx) => {
    const m = ctx.message;
    const f = ctx.session.form;
    if (m.photo && m.photo.length) Object.assign(f, { media_type: 'photo', media_id: m.photo[m.photo.length - 1].file_id, text: m.caption || '' });
    else if (m.video) Object.assign(f, { media_type: 'video', media_id: m.video.file_id, text: m.caption || '' });
    else if (textOf(ctx)) Object.assign(f, { media_type: null, media_id: null, text: textOf(ctx) });
    else return ctx.reply('Matn, rasm yoki video yuboring.');
    if (f.media_type && f.text.length > 1024) return ctx.reply("Rasm/video izohi 1024 belgidan oshmasin. Qisqartirib qayta yuboring.");
    ctx.session.state = 'adm_ad_button';
    return ctx.reply(
      "<b>2-qadam.</b> Reklama ostida tugma kerakmi?\nFormat: <code>Tugma matni | https://havola</code>\nMasalan: <code>Ro'yxatdan o'tish | https://t.me/kanal</code>\n\nTugma kerak bo'lmasa — «⏭ O'tkazib yuborish».",
      { parse_mode: 'HTML', ...skipKb() },
    );
  });

  adminState('adm_ad_button', async (ctx) => {
    const t = textOf(ctx);
    if (!t) return ctx.reply('Matn yuboring yoki «⏭ O\'tkazib yuborish».');
    if (t !== BTN.SKIP) {
      const m = t.match(/^(.{1,60}?)\s*\|\s*(https?:\/\/\S+)$/);
      if (!m) return ctx.reply("Format noto'g'ri. Masalan: Batafsil | https://example.uz");
      Object.assign(ctx.session.form, { btn_text: m[1].trim(), btn_url: m[2] });
    }
    ctx.session.state = 'adm_ad_days';
    return ctx.reply('<b>3-qadam.</b> Reklama necha kun ko\'rsatilsin?', { parse_mode: 'HTML', ...daysKb() });
  });

  adminState('adm_ad_days', async (ctx) => {
    const days = parseAmount(textOf(ctx));
    if (!days || days > 365) return ctx.reply('Kunlar sonini kiriting (1–365):');
    const f = ctx.session.form;
    f.days = days;
    ctx.session.state = null;
    await ctx.reply(`👇 Ko'rinishi (${days} kun, bugundan ${fmtDate(now() + days * DAY)} gacha):`, Markup.removeKeyboard());
    return sendAd(ctx, f, [
      [Markup.button.callback('✅ Joylash', 'ad_save'), Markup.button.callback('❌ Bekor', 'ad_cancel')],
    ]);
  });

  adminAction('ad_cancel', async (ctx) => {
    ctx.session.form = null;
    await ctx.answerCbQuery('Bekor qilindi');
    await ctx.deleteMessage().catch(() => {});
    return toPanel(ctx, '❌ Bekor qilindi.');
  });

  adminAction('ad_save', async (ctx) => {
    const f = ctx.session.form;
    if (!f || !f.days) return ctx.answerCbQuery("Ma'lumotlar eskirgan", { show_alert: true });
    const t = now();
    const [id] = await db('ads').insert({
      text: f.text || '', media_type: f.media_type || null, media_id: f.media_id || null,
      btn_text: f.btn_text || null, btn_url: f.btn_url || null,
      starts_at: t, ends_at: t + f.days * DAY, is_active: 1, shows: 0, created_at: t,
    });
    ctx.session.form = null;
    log(ctx.from.id, `📣 Reklama joyladi #${id} (${f.days} kun)`);
    await ctx.answerCbQuery('✅ Joylandi');
    await ctx.editMessageReplyMarkup(undefined).catch(() => {});
    await toPanel(ctx, `✅ Reklama #${id} joylandi. ${fmtDate(t + f.days * DAY)} gacha ko'rsatiladi.`);
    return showAd(ctx, id, false);
  });

  // --- Reklama kartochkasi ---
  async function showAd(ctx, id, edit = true) {
    const ad = await db('ads').where({ id }).first();
    if (!ad) return safeEdit(ctx, 'Topilmadi.', Markup.inlineKeyboard([[Markup.button.callback('⬅️ Reklamalar', 'ad_home')]]));
    const text = `📣 <b>Reklama #${ad.id}</b>\n\n${esc(adTitle(ad))}${(ad.text || '').length > 40 ? '…' : ''}\n\n` +
      `📅 Boshlangan: ${fmtDate(ad.starts_at)}\n${adStatus(ad)}\n👁 Ko'rsatilgan: ${ad.shows} marta` +
      (ad.btn_url ? `\n🔗 Tugma: ${esc(ad.btn_text)}` : '');
    const extra = {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback("👁 Ko'rib chiqish", `ad_pv:${id}`), Markup.button.callback("📅 Muddatni o'zgartirish", `ad_dt:${id}`)],
        [Markup.button.callback(ad.is_active ? "⏸ To'xtatish" : '▶️ Yoqish', `ad_t:${id}`), Markup.button.callback('📢 Hozir hammaga yuborish', `ad_bc:${id}`)],
        [Markup.button.callback("🗑 O'chirish", `ad_d:${id}`)],
        [Markup.button.callback('⬅️ Reklamalar', 'ad_home')],
      ]),
    };
    return edit ? safeEdit(ctx, text, extra) : ctx.reply(text, extra);
  }

  adminAction(/^ad_i:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return showAd(ctx, Number(ctx.match[1]));
  });

  adminAction(/^ad_pv:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const ad = await db('ads').where({ id: Number(ctx.match[1]) }).first();
    if (!ad) return null;
    return sendAd(ctx, ad, [[Markup.button.callback('⬅️ Yopish', 'close_msg')]]);
  });

  adminAction(/^ad_dt:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.form = { adId: Number(ctx.match[1]) };
    ctx.session.state = 'adm_ad_redays';
    return ctx.reply("📅 Bugundan boshlab necha kun ko'rsatilsin?\n(0 — hozir tugatish)", daysKb());
  });

  adminState('adm_ad_redays', async (ctx) => {
    const days = parseAmount(textOf(ctx));
    if (days == null || days > 365) return ctx.reply('Kunlar sonini kiriting (0–365):');
    const { adId } = ctx.session.form || {};
    const t = now();
    await db('ads').where({ id: adId }).update({ ends_at: days ? t + days * DAY : t, ...(days ? { is_active: 1 } : {}) });
    ctx.session.form = null;
    log(ctx.from.id, `📣 Reklama #${adId} muddati: ${days} kun`);
    await toPanel(ctx, days ? `✅ Reklama ${fmtDate(t + days * DAY)} gacha ko'rsatiladi.` : '✅ Reklama tugatildi.');
    return showAd(ctx, adId, false);
  });

  adminAction(/^ad_t:(\d+)$/, async (ctx) => {
    const ad = await db('ads').where({ id: Number(ctx.match[1]) }).first();
    if (!ad) return ctx.answerCbQuery();
    await db('ads').where({ id: ad.id }).update({ is_active: ad.is_active ? 0 : 1 });
    await ctx.answerCbQuery(ad.is_active ? "⏸ To'xtatildi" : '▶️ Yoqildi');
    return showAd(ctx, ad.id);
  });

  adminAction(/^ad_d:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const id = ctx.match[1];
    return safeEdit(ctx, '⚠️ Reklama o\'chirilsinmi?', Markup.inlineKeyboard([
      [Markup.button.callback("Ha, o'chirish", `ad_dd:${id}`), Markup.button.callback("Yo'q", `ad_i:${id}`)],
    ]));
  });

  adminAction(/^ad_dd:(\d+)$/, async (ctx) => {
    await db('ads').where({ id: Number(ctx.match[1]) }).del();
    await ctx.answerCbQuery("🗑 O'chirildi");
    return adsList(ctx, true);
  });

  // Hozir barcha foydalanuvchilarga yuborish (fon rejimida)
  adminAction(/^ad_bc:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const id = ctx.match[1];
    const [{ c }] = await db('users').where({ is_registered: 1, is_blocked: 0 }).count({ c: '*' });
    return safeEdit(ctx, `📢 Reklama ${c} ta foydalanuvchiga yuborilsinmi?`, Markup.inlineKeyboard([
      [Markup.button.callback('Ha, yuborish', `ad_bcc:${id}`), Markup.button.callback("Yo'q", `ad_i:${id}`)],
    ]));
  });

  adminAction(/^ad_bcc:(\d+)$/, async (ctx) => {
    const ad = await db('ads').where({ id: Number(ctx.match[1]) }).first();
    if (!ad) return ctx.answerCbQuery();
    await ctx.answerCbQuery('Yuborish boshlandi');
    const users = await db('users').where({ is_registered: 1, is_blocked: 0 }).select('tg_id');
    const adminId = ctx.from.id;
    const tg = ctx.telegram;
    log(adminId, `📣 Reklama #${ad.id} ni hammaga yubordi (${users.length})`);
    await safeEdit(ctx, `📢 Yuborilmoqda: ${users.length} ta foydalanuvchi. Tugagach xabar beraman.`, Markup.inlineKeyboard([[Markup.button.callback('⬅️ Reklama', `ad_i:${ad.id}`)]]));
    (async () => {
      let ok = 0;
      let fail = 0;
      for (const u of users) {
        // har bir foydalanuvchi uchun "soxta" ctx — sendAd faqat reply metodlaridan foydalanadi
        const fake = {
          reply: (t, e) => tg.sendMessage(u.tg_id, t, e),
          replyWithPhoto: (p, e) => tg.sendPhoto(u.tg_id, p, e),
          replyWithVideo: (v, e) => tg.sendVideo(u.tg_id, v, e),
        };
        try {
          await sendAd(fake, ad);
          ok += 1;
        } catch (e) {
          fail += 1;
        }
        await sleep(40);
      }
      await db('ads').where({ id: ad.id }).increment('shows', ok);
      tg.sendMessage(adminId, `📢 Reklama #${ad.id} yuborildi.\n✅ Yetkazildi: ${ok}\n❌ Xato: ${fail}`).catch(() => {});
    })();
    return null;
  });

  // ======================= 📋 E'LONLAR (kitob / markaz) =======================
  const LT = {
    books: { title: '📚 Kitob e\'lonlari', name: (r) => r.title },
    centers: { title: "🏫 Markaz / maktab e'lonlari", name: (r) => `${CENTER_KINDS[r.kind] ? CENTER_KINDS[r.kind].icon : ''} ${r.name}` },
  };
  const LS_TEXT = "📋 <b>E'lonlar</b>\n\nFoydalanuvchilar joylagan kitob va o'quv markaz e'lonlari. Muddatini o'zgartirish yoki o'chirish mumkin.\nNarx va standart muddat — «💵 Narxlar» da.\nO'zingiz (admin) joylagan e'lonlar bepul.";
  const lsKb = () => Markup.inlineKeyboard([
    [Markup.button.callback("📚 Kitob e'lonlari", 'ls_l:books:a'), Markup.button.callback("🏫 Markaz e'lonlari", 'ls_l:centers:a')],
    [Markup.button.callback("🔴 Muddati tugagan kitoblar", 'ls_l:books:e'), Markup.button.callback('🔴 Tugagan markazlar', 'ls_l:centers:e')],
  ]);

  adminMenu(BTN.A_LISTINGS, (ctx) => ctx.reply(LS_TEXT, { parse_mode: 'HTML', ...lsKb() }));
  adminAction('ls_home', async (ctx) => {
    await ctx.answerCbQuery();
    return safeEdit(ctx, LS_TEXT, { parse_mode: 'HTML', ...lsKb() });
  });

  adminAction(/^ls_l:(books|centers):(a|e)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const [, table, mode] = ctx.match;
    const t = now();
    const q = db(table).where('is_active', 1);
    const list = await (mode === 'a' ? q.andWhere('expires_at', '>', t) : q.andWhere('expires_at', '<=', t)).orderBy('id', 'desc').limit(50);
    const rows = list.map((r) => [Markup.button.callback(`${LT[table].name(r)} · ${fmtDate(r.expires_at)}`.slice(0, 60), `ls_i:${table}:${r.id}`)]);
    rows.push([Markup.button.callback('⬅️ Orqaga', 'ls_home')]);
    return safeEdit(ctx, `${LT[table].title} — ${mode === 'a' ? 'faol' : 'muddati tugagan'}: ${list.length} ta`, Markup.inlineKeyboard(rows));
  });

  async function showListing(ctx, table, id) {
    const r = await db(table).where({ id }).first();
    const back = [Markup.button.callback('⬅️ Orqaga', `ls_l:${table}:a`)];
    if (!r) return safeEdit(ctx, 'Topilmadi.', Markup.inlineKeyboard([back]));
    const owner = await getUser(r.user_tg);
    const active = Number(r.expires_at) > now();
    const details = table === 'books'
      ? `📚 <b>${esc(r.title)}</b>${r.author ? `\n✍️ ${esc(r.author)}` : ''}${r.price_text ? `\n💵 ${esc(r.price_text)}` : ''}\n📞 ${esc(r.phone)}`
      : `${CENTER_KINDS[r.kind].icon} <b>${esc(r.name)}</b>\n📍 ${esc(r.region)}, ${esc(r.district)}\n📞 ${esc(r.phone)}`;
    const text = `${details}\n\n👤 Egasi: ${owner ? `${esc(owner.first_name)} ${esc(owner.last_name)} (<code>${owner.tg_id}</code>)` : r.user_tg}\n` +
      `📅 Joylangan: ${fmtDate(r.created_at)}\n${active ? `🟢 ${fmtDate(r.expires_at)} gacha` : `🔴 Tugagan: ${fmtDate(r.expires_at)}`}`;
    return safeEdit(ctx, text, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback("📅 Muddatni o'zgartirish", `ls_dt:${table}:${id}`), Markup.button.callback("🗑 O'chirish", `ls_d:${table}:${id}`)],
        back,
      ]),
    });
  }

  adminAction(/^ls_i:(books|centers):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return showListing(ctx, ctx.match[1], Number(ctx.match[2]));
  });

  adminAction(/^ls_dt:(books|centers):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.form = { table: ctx.match[1], id: Number(ctx.match[2]) };
    ctx.session.state = 'adm_ls_days';
    return ctx.reply("📅 Bugundan boshlab necha kun ko'rinsin?\n(0 — hozir to'xtatish)", daysKb());
  });

  adminState('adm_ls_days', async (ctx) => {
    const days = parseAmount(textOf(ctx));
    if (days == null || days > 3650) return ctx.reply('Kunlar sonini kiriting:');
    const { table, id } = ctx.session.form || {};
    const t = now();
    await db(table).where({ id }).update({ expires_at: days ? t + days * DAY : t });
    ctx.session.form = null;
    log(ctx.from.id, `🛠 E'lon ${table}#${id} muddati: ${days} kun`);
    await toPanel(ctx, days ? `✅ E'lon ${fmtDate(t + days * DAY)} gacha ko'rinadi.` : "✅ E'lon to'xtatildi.");
    return ctx.reply("📋 E'lonlar", lsKb());
  });

  adminAction(/^ls_d:(books|centers):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const [, table, id] = ctx.match;
    return safeEdit(ctx, "⚠️ E'lon o'chirilsinmi?", Markup.inlineKeyboard([
      [Markup.button.callback("Ha, o'chirish", `ls_dd:${table}:${id}`), Markup.button.callback("Yo'q", `ls_i:${table}:${id}`)],
    ]));
  });

  adminAction(/^ls_dd:(books|centers):(\d+)$/, async (ctx) => {
    const [, table, id] = ctx.match;
    await db(table).where({ id: Number(id) }).update({ is_active: 0 });
    log(ctx.from.id, `🛠 E'lonni o'chirdi: ${table}#${id}`);
    await ctx.answerCbQuery("🗑 O'chirildi");
    return safeEdit(ctx, "🗑 E'lon o'chirildi.", Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', `ls_l:${table}:a`)]]));
  });
}

module.exports = { register };

};

// ===================== src/handlers/balance.js =====================
__modules["src/handlers/balance.js"] = function (module, exports, require) {
const __filename = "src/handlers/balance.js"; const __dirname = "src/handlers";
// 4-bo'lim: Balans, do'stlarni taklif qilish, admin orqali to'ldirish
const { Markup } = require('telegraf');
const { db } = require('../db');
const config = require('../config');
const { BTN, cancelKb } = require('../keyboards');
const { esc, money, getUser, getNum, getSetting, fmtDate, isOn, safeEdit } = require('../utils');
const { log } = require('../logger');
const { showMainMenu } = require('../menu');

const refLink = (ctx) => `https://t.me/${ctx.botInfo.username}?start=ref_${ctx.from.id}`;

const TX_NAMES = { referral: '👥 Taklif bonusi', welcome: '🎁 Start bonusi', admin: '💳 Admin', purchase: '🛒 Xarid', book: "📚 Kitob e'loni", center: "🏫 Markaz e'loni", teacher: "👨‍🏫 O'qituvchi testi" };

function register({ bot, menu, states, deepLinks }) {
  const balanceView = async (ctx, edit) => {
    const u = await getUser(ctx.from.id);
    const [{ cnt }] = await db('users').where({ referrer_id: ctx.from.id, is_registered: 1 }).count({ cnt: '*' });
    const bonus = await getNum('referral_bonus');
    const refOn = await isOn('referral');
    const rows = [];
    if (refOn) rows.push([Markup.button.callback("👥 Do'stlarni taklif qilish", 'bal_ref')]);
    if (await isOn('topup')) rows.push([Markup.button.callback("💳 Admin orqali to'ldirish", 'bal_topup')]);
    rows.push([Markup.button.callback('📜 Amallar tarixi', 'bal_hist')]);
    const text = `💰 <b>Balansingiz: ${money(u.balance)}</b>` + (refOn ? `\n\n👥 Taklif qilgan do'stlaringiz: ${cnt} ta\n🎁 Har bir do'st uchun: ${money(bonus)}\n<i>(Bonus do'stingiz kanalga a'zo bo'lib ro'yxatdan o'tgach beriladi)</i>` : '');
    const extra = { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) };
    return edit ? safeEdit(ctx, text, extra) : ctx.reply(text, extra);
  };
  menu(BTN.BALANCE, (ctx) => balanceView(ctx, false));
  bot.action('bal_home', async (ctx) => {
    await ctx.answerCbQuery();
    return balanceView(ctx, true);
  });

  bot.action('bal_ref', async (ctx) => {
    await ctx.answerCbQuery();
    const link = refLink(ctx);
    const bonus = await getNum('referral_bonus');
    const shareText = "Bolalar uchun testlar va videodarslar boti! Qo'shiling:";
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`;
    return safeEdit(ctx,
      `👥 <b>Do'stlarni taklif qiling va balansni to'ldiring!</b>\n\nQuyidagi havolani do'stlaringizga yuboring. Har bir do'stingiz ro'yxatdan o'tganda balansingizga <b>${money(bonus)}</b> qo'shiladi.\n\n🔗 Sizning havolangiz:\n<code>${link}</code>`,
      { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.url('📤 Ulashish', shareUrl)], [Markup.button.callback('⬅️ Balans', 'bal_home')]]) },
    );
  });

  const topupPrompt = async (ctx) => {
    if (!(await isOn('topup'))) return showMainMenu(ctx, "⛔ Bu bo'lim vaqtincha o'chirilgan.");
    ctx.session.state = 'topup_check';
    const info = await getSetting('payment_info');
    const adminLine = config.ADMIN_USERNAME ? `\n\nSavollar bo'lsa: @${config.ADMIN_USERNAME}` : '';
    return ctx.reply(
      `💳 <b>Balansni to'ldirish</b>\n\n${esc(info)}\n\n🆔 Sizning ID: <code>${ctx.from.id}</code>\n\n📸 To'lov chekini (rasm yoki matn) shu yerga yuboring — admin tekshirib balansingizni to'ldiradi.${adminLine}`,
      { parse_mode: 'HTML', ...cancelKb() },
    );
  };
  bot.action('bal_topup', async (ctx) => {
    await ctx.answerCbQuery();
    return topupPrompt(ctx);
  });
  deepLinks.topup = topupPrompt;

  // Foydalanuvchi chek yubordi -> adminlarga
  states.topup_check = async (ctx) => {
    const u = await getUser(ctx.from.id);
    const head = `💳 <b>Balansni to'ldirish so'rovi</b>\n👤 ${esc(u.first_name)} ${esc(u.last_name)}\n📞 ${esc(u.phone)}\n🆔 <code>${u.tg_id}</code>${ctx.from.username ? ` (@${esc(ctx.from.username)})` : ''}\n💰 Hozirgi balans: ${money(u.balance)}`;
    const kb = Markup.inlineKeyboard([[Markup.button.callback("✅ Balansni to'ldirish", `adm_topup:${u.tg_id}`)]]);
    let sent = 0;
    for (const adminId of config.ADMIN_IDS) {
      try {
        await ctx.telegram.copyMessage(adminId, ctx.chat.id, ctx.message.message_id);
        await ctx.telegram.sendMessage(adminId, head, { parse_mode: 'HTML', ...kb });
        sent += 1;
      } catch (e) {
        console.error('[topup] adminga yuborilmadi', adminId, e.message);
      }
    }
    ctx.session.state = null;
    log(ctx.from.id, `💳 To'lov cheki yubordi (adminga ${sent ? 'yetkazildi' : 'yetkazilmadi'})`);
    return showMainMenu(ctx, sent ? "✅ Chekingiz adminga yuborildi. Tekshirilgach balansingiz to'ldiriladi va sizga xabar keladi." : "⚠️ Hozircha adminga yuborib bo'lmadi, keyinroq urinib ko'ring.");
  };

  bot.action('bal_hist', async (ctx) => {
    await ctx.answerCbQuery();
    const rows = await db('transactions').where({ user_tg: ctx.from.id }).orderBy('id', 'desc').limit(15);
    const back = Markup.inlineKeyboard([[Markup.button.callback('⬅️ Balans', 'bal_home')]]);
    if (!rows.length) return safeEdit(ctx, "📜 Hozircha amallar yo'q.", back);
    const lines = rows.map((r) => `${fmtDate(r.created_at)}  ${r.amount > 0 ? '➕' : '➖'} ${money(Math.abs(r.amount))}  ${TX_NAMES[r.type] || r.type}`);
    return safeEdit(ctx, `📜 <b>Oxirgi amallar</b>\n\n${lines.join('\n')}`, { parse_mode: 'HTML', ...back });
  });
}

module.exports = { register };

};

// ===================== src/handlers/books.js =====================
__modules["src/handlers/books.js"] = function (module, exports, require) {
const __filename = "src/handlers/books.js"; const __dirname = "src/handlers";
// 5-bo'lim: Kitoblar — qidiruv, sotuvdagi kitoblar, kitob qo'shish (pullik, 1 oy)
const { Markup } = require('telegraf');
const { db } = require('../db');
const { BTN, cancelKb, skipKb } = require('../keyboards');
const { esc, money, fmtDate, now, DAY, getNum, getUser, charge, textOf, safeEdit, isAdmin } = require('../utils');
const { showMainMenu } = require('../menu');
const { registerMine } = require('../listings');
const { log } = require('../logger');

const PAGE = 10;
const BACK_HOME = Markup.button.callback('⬅️ Kitoblar', 'bk_home');
// Alohida yuborilgan kartochkani yopish (ro'yxat yuqorida qoladi)
const BACK_CLOSE = Markup.button.callback('⬅️ Orqaga', 'close_msg');
const active = () => db('books').where('is_active', 1).andWhere('expires_at', '>', now());

const bookCard = (b) =>
  `📚 <b>${esc(b.title)}</b>\n` +
  (b.author ? `✍️ Muallif: ${esc(b.author)}\n` : '') +
  (b.price_text ? `💵 Narxi: ${esc(b.price_text)}\n` : '') +
  (b.description ? `\n${esc(b.description)}\n` : '') +
  `\n📞 Aloqa: ${esc(b.phone)}`;

const listKb = (books, extraRows = []) =>
  Markup.inlineKeyboard([...books.map((b) => [Markup.button.callback(`📖 ${b.title}`.slice(0, 60), `bk:${b.id}`)]), ...extraRows]);

async function showPage(ctx, page) {
  const [{ cnt }] = await active().clone().count({ cnt: '*' });
  const total = Number(cnt);
  if (!total) return safeEdit(ctx, "📚 Hozircha sotuvda kitoblar yo'q.", Markup.inlineKeyboard([[BACK_HOME]]));
  const books = await active().orderBy('id', 'desc').offset(page * PAGE).limit(PAGE);
  const nav = [];
  if (page > 0) nav.push(Markup.button.callback('⬅️', `bk_list:${page - 1}`));
  if ((page + 1) * PAGE < total) nav.push(Markup.button.callback('➡️', `bk_list:${page + 1}`));
  const pages = Math.ceil(total / PAGE);
  return safeEdit(ctx, `📚 <b>Sotuvdagi kitoblar</b> (${total} ta) — ${page + 1}/${pages}-sahifa`, {
    parse_mode: 'HTML',
    ...listKb(books, [...(nav.length ? [nav] : []), [BACK_HOME]]),
  });
}

function register({ bot, menu, states, deepLinks }) {
  const home = async (ctx, edit) => {
    ctx.session.state = null;
    const price = isAdmin(ctx.from.id) ? 0 : await getNum('book_price'); // admin uchun bepul
    const days = await getNum('book_days');
    return (edit ? safeEdit : (c, t, e) => c.reply(t, e))(ctx,
      `📚 <b>Kitoblar</b>\n\nKitob nomi yoki muallif bo'yicha qidiring, sotuvdagi kitoblarni ko'ring yoki o'z kitobingizni sotuvga qo'ying.\n\nℹ️ Kitob qo'shish: ${money(price)} / ${days} kun`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔎 Qidirish', 'bk_search')],
          [Markup.button.callback('📚 Sotuvdagi kitoblar', 'bk_list:0')],
          [Markup.button.callback("➕ Kitob qo'shish", 'bk_add')],
          [Markup.button.callback("🗂 Mening e'lonlarim", 'bk_my')],
        ]),
      },
    );
  };
  menu(BTN.BOOKS, (ctx) => home(ctx, false));
  bot.action('bk_home', async (ctx) => {
    await ctx.answerCbQuery();
    return home(ctx, true);
  });

  // --- Qidiruv ---
  bot.action('bk_search', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.state = 'book_search';
    return ctx.reply('🔎 Kitob nomi yoki muallifini yozing:', cancelKb());
  });

  states.book_search = async (ctx) => {
    const q = textOf(ctx);
    if (!q || q.length < 2) return ctx.reply('Kamida 2 ta harf yozing:');
    const like = `%${q.toLowerCase().replace(/[%_]/g, '')}%`;
    const books = await active()
      .andWhere((w) => w.whereRaw('LOWER(title) LIKE ?', [like]).orWhereRaw('LOWER(author) LIKE ?', [like]))
      .orderBy('id', 'desc')
      .limit(20);
    if (!books.length) return ctx.reply(`😔 «${q}» bo'yicha hech narsa topilmadi. Boshqa so'z bilan urinib ko'ring yoki «${BTN.CANCEL}» ni bosing.`, Markup.inlineKeyboard([[BACK_HOME]]));
    return ctx.reply(`🔎 «${esc(q)}» bo'yicha topildi: ${books.length} ta\n\nYana qidirish uchun yangi so'z yozing.`, { parse_mode: 'HTML', ...listKb(books, [[BACK_HOME]]) });
  };

  // --- Sotuvdagilar ---
  bot.action(/^bk_list:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return showPage(ctx, Number(ctx.match[1]));
  });

  bot.action(/^bk:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const b = await active().andWhere('id', Number(ctx.match[1])).first();
    if (!b) return ctx.reply("Bu e'lon endi faol emas.", Markup.inlineKeyboard([[BACK_CLOSE]]));
    const kb = Markup.inlineKeyboard([[BACK_CLOSE]]);
    if (b.photo_id) return ctx.replyWithPhoto(b.photo_id, { caption: bookCard(b).slice(0, 1024), parse_mode: 'HTML', ...kb });
    return ctx.reply(bookCard(b), { parse_mode: 'HTML', ...kb });
  });

  // --- Kitob qo'shish ---
  const addStart = async (ctx) => {
    const price = isAdmin(ctx.from.id) ? 0 : await getNum('book_price'); // admin uchun bepul
    const u = await getUser(ctx.from.id);
    if (u.balance < price) {
      return ctx.reply(`⚠️ Kitob qo'shish narxi ${money(price)}. Balansingiz: ${money(u.balance)}.\n«💰 Balans» bo'limidan to'ldiring.`);
    }
    ctx.session.form = {};
    ctx.session.state = 'book_title';
    return ctx.reply('📖 Kitob nomini kiriting:', cancelKb());
  };
  bot.action('bk_add', async (ctx) => {
    await ctx.answerCbQuery();
    return addStart(ctx);
  });
  deepLinks.addbook = addStart;

  states.book_title = async (ctx) => {
    const t = textOf(ctx);
    if (!t || t.length > 200) return ctx.reply('Kitob nomini matn shaklida kiriting (200 belgigacha):');
    ctx.session.form.title = t;
    ctx.session.state = 'book_author';
    return ctx.reply('✍️ Muallifini kiriting:', skipKb());
  };

  states.book_author = async (ctx) => {
    const t = textOf(ctx);
    if (!t) return ctx.reply('Muallifni matn shaklida kiriting:');
    ctx.session.form.author = t === BTN.SKIP ? null : t.slice(0, 200);
    ctx.session.state = 'book_price';
    return ctx.reply('💵 Kitob narxini yozing (masalan: 35 000 so\'m):', cancelKb());
  };

  states.book_price = async (ctx) => {
    const t = textOf(ctx);
    if (!t) return ctx.reply('Narxni matn shaklida yozing:');
    ctx.session.form.price_text = t.slice(0, 100);
    ctx.session.state = 'book_desc';
    return ctx.reply("📝 Qisqacha tavsif (holati, nashr yili va h.k.):", skipKb());
  };

  states.book_desc = async (ctx) => {
    const t = textOf(ctx);
    if (!t) return ctx.reply('Tavsifni matn shaklida yozing:');
    ctx.session.form.description = t === BTN.SKIP ? null : t.slice(0, 800);
    ctx.session.state = 'book_phone';
    const u = await getUser(ctx.from.id);
    return ctx.reply('📞 Aloqa uchun telefon raqam:', Markup.keyboard([[u.phone], [BTN.CANCEL]]).resize());
  };

  states.book_phone = async (ctx) => {
    const t = textOf(ctx);
    if (!t || t.length < 5) return ctx.reply('Telefon raqamni kiriting:');
    ctx.session.form.phone = t.slice(0, 64);
    ctx.session.state = 'book_photo';
    return ctx.reply('🖼 Kitob rasmini yuboring:', skipKb());
  };

  states.book_photo = async (ctx) => {
    const photos = ctx.message.photo;
    if (photos && photos.length) ctx.session.form.photo_id = photos[photos.length - 1].file_id;
    else if (textOf(ctx) !== BTN.SKIP) return ctx.reply(`Rasm yuboring yoki «${BTN.SKIP}» ni bosing.`);
    ctx.session.state = null;
    const f = ctx.session.form;
    const price = isAdmin(ctx.from.id) ? 0 : await getNum('book_price'); // admin uchun bepul
    const days = await getNum('book_days');
    await ctx.reply('👇 E\'lon ko\'rinishi:', Markup.removeKeyboard());
    const kb = Markup.inlineKeyboard([
      [Markup.button.callback(`✅ Joylash — ${money(price)} (${days} kun)`, 'bk_confirm')],
      [Markup.button.callback('❌ Bekor qilish', 'bk_cancel')],
    ]);
    if (f.photo_id) return ctx.replyWithPhoto(f.photo_id, { caption: bookCard(f).slice(0, 1024), parse_mode: 'HTML', ...kb });
    return ctx.reply(bookCard(f), { parse_mode: 'HTML', ...kb });
  };

  bot.action('bk_cancel', async (ctx) => {
    ctx.session.form = null;
    await ctx.answerCbQuery('Bekor qilindi');
    await ctx.editMessageReplyMarkup(undefined).catch(() => {});
    return showMainMenu(ctx);
  });

  bot.action('bk_confirm', async (ctx) => {
    const f = ctx.session.form;
    if (!f || !f.title || !f.phone) return ctx.answerCbQuery("Ma'lumotlar eskirgan, qaytadan qo'shing", { show_alert: true });
    const price = isAdmin(ctx.from.id) ? 0 : await getNum('book_price'); // admin uchun bepul
    const days = await getNum('book_days');
    const expires = now() + days * DAY;
    const res = await charge(ctx.from.id, price, 'book', `Kitob: ${f.title}`, async (trx) => {
      await trx('books').insert({ ...f, user_tg: ctx.from.id, is_active: 1, expires_at: expires, created_at: now() });
    });
    if (res === 'nofunds') return ctx.answerCbQuery(`Balansda mablag' yetarli emas. Kerak: ${money(price)}`, { show_alert: true });
    ctx.session.form = null;
    log(ctx.from.id, `📚 Kitob e'lonini joyladi: ${esc(f.title)} — ${money(price)}`);
    await ctx.answerCbQuery('✅ Joylandi!');
    await ctx.editMessageReplyMarkup(undefined).catch(() => {});
    return showMainMenu(ctx, `✅ Kitobingiz sotuvga qo'yildi! ${fmtDate(expires)} gacha ko'rinib turadi.`);
  });

  registerMine(bot, { home: 'bk_home', table: 'books', p: 'bk', priceKey: 'book_price', daysKey: 'book_days', txType: 'book', title: (r) => r.title });
}

module.exports = { register };

};

// ===================== src/handlers/centers.js =====================
__modules["src/handlers/centers.js"] = function (module, exports, require) {
const __filename = "src/handlers/centers.js"; const __dirname = "src/handlers";
// 6-bo'lim: O'quv markaz va xususiy maktab — viloyat -> tuman -> ro'yxat; qo'shish (pullik, 1 oy)
const { Markup } = require('telegraf');
const { db } = require('../db');
const REGIONS = require('../data/regions');
const { CENTER_KINDS } = require('../constants');
const { BTN, cancelKb, skipKb, chunk } = require('../keyboards');
const { esc, money, fmtDate, now, DAY, getNum, getUser, charge, textOf, safeEdit, isAdmin } = require('../utils');
const { showMainMenu } = require('../menu');
const { registerMine } = require('../listings');
const { log } = require('../logger');

const active = () => db('centers').where('is_active', 1).andWhere('expires_at', '>', now());

const card = (c) => {
  const k = CENTER_KINDS[c.kind];
  return `${k.icon} <b>${esc(c.name)}</b>\n<i>${k.name}</i>\n\n📍 ${esc(c.region)}, ${esc(c.district)}\n` +
    (c.address ? `🏠 ${esc(c.address)}\n` : '') +
    `📞 ${esc(c.phone)}`;
};

const regionsKb = (prefix, back) =>
  Markup.inlineKeyboard([
    ...chunk(REGIONS.map((r, i) => Markup.button.callback(r.name, `${prefix}:${i}`))),
    ...(back ? [[Markup.button.callback('⬅️ Orqaga', back)]] : []),
  ]);

const districtsKb = (ri, prefix, extraRows = []) =>
  Markup.inlineKeyboard([
    ...chunk(REGIONS[ri].districts.map((d, di) => Markup.button.callback(d, `${prefix}:${di}`))),
    ...extraRows,
  ]);

function register({ bot, menu, states, deepLinks }) {
  const mainText = async () => {
    const price = await getNum('center_price');
    const days = await getNum('center_days');
    return `🏫 <b>O'quv markaz va xususiy maktablar</b>\n\nViloyat va tuman bo'yicha qidiring yoki o'z markazingizni qo'shing.\n\nℹ️ Qo'shish: ${money(price)} / ${days} kun`;
  };
  const mainKb = () =>
    Markup.inlineKeyboard([
      [Markup.button.callback("🔎 O'quv markaz qidirish", 'ce_s:center')],
      [Markup.button.callback('🔎 Xususiy maktab qidirish', 'ce_s:school')],
      [Markup.button.callback("➕ O'quv markaz / maktab qo'shish", 'ce_add')],
      [Markup.button.callback("🗂 Mening e'lonlarim", 'ce_my')],
    ]);

  menu(BTN.CENTERS, async (ctx) => ctx.reply(await mainText(), { parse_mode: 'HTML', ...mainKb() }));

  bot.action('ce_home', async (ctx) => {
    await ctx.answerCbQuery();
    return safeEdit(ctx, await mainText(), { parse_mode: 'HTML', ...mainKb() });
  });

  // --- Qidiruv: tur -> viloyat -> tuman -> ro'yxat ---
  bot.action(/^ce_s:(center|school)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const kind = ctx.match[1];
    return safeEdit(ctx, `${CENTER_KINDS[kind].icon} <b>${CENTER_KINDS[kind].plural}</b>\n\nViloyatni tanlang:`, {
      parse_mode: 'HTML',
      ...regionsKb(`ce_r:${kind}`, 'ce_home'),
    });
  });

  bot.action(/^ce_r:(center|school):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const [, kind, ri] = ctx.match;
    const r = REGIONS[Number(ri)];
    if (!r) return null;
    return safeEdit(ctx, `${CENTER_KINDS[kind].icon} <b>${CENTER_KINDS[kind].plural}</b>\n📍 ${r.name}\n\nTumanni tanlang:`, {
      parse_mode: 'HTML',
      ...districtsKb(Number(ri), `ce_d:${kind}:${ri}`, [
        [Markup.button.callback('🗺 Butun viloyat bo\'yicha', `ce_d:${kind}:${ri}:all`)],
        [Markup.button.callback('⬅️ Orqaga', `ce_s:${kind}`)],
      ]),
    });
  });

  bot.action(/^ce_d:(center|school):(\d+):(\d+|all)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const [, kind, ri, di] = ctx.match;
    const r = REGIONS[Number(ri)];
    if (!r) return null;
    let q = active().andWhere({ kind, region: r.name });
    let place = r.name;
    if (di !== 'all') {
      const d = r.districts[Number(di)];
      q = q.andWhere({ district: d });
      place += `, ${d}`;
    }
    const list = await q.orderBy('id', 'desc').limit(50);
    const back = [[Markup.button.callback('⬅️ Orqaga', `ce_r:${kind}:${ri}`)]];
    if (!list.length) {
      return safeEdit(ctx, `📍 ${esc(place)}\n\n😔 Bu hududda hozircha ${CENTER_KINDS[kind].plural.toLowerCase()} qo'shilmagan.`, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(back),
      });
    }
    const rows = list.map((c) => [Markup.button.callback(`${CENTER_KINDS[c.kind].icon} ${c.name}`.slice(0, 60), `ce:${c.id}`)]);
    return safeEdit(ctx, `📍 <b>${esc(place)}</b>\n${CENTER_KINDS[kind].plural}: ${list.length} ta`, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([...rows, ...back]),
    });
  });

  bot.action(/^ce:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const c = await active().andWhere('id', Number(ctx.match[1])).first();
    const close = Markup.button.callback('⬅️ Orqaga', 'close_msg');
    if (!c) return ctx.reply("Bu e'lon endi faol emas.", Markup.inlineKeyboard([[close]]));
    const rows = [];
    if (c.latitude != null && c.longitude != null) rows.push([Markup.button.callback("📍 Xaritada ko'rish", `ce_loc:${c.id}`)]);
    rows.push([close]);
    return ctx.reply(card(c), { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) });
  });

  // Lokatsiya alohida xabar bo'lib keladi — uning ostida ham yopish tugmasi
  bot.action(/^ce_loc:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const c = await active().andWhere('id', Number(ctx.match[1])).first();
    if (!c || c.latitude == null) return null;
    return ctx.replyWithLocation(c.latitude, c.longitude, Markup.inlineKeyboard([[Markup.button.callback('⬅️ Yopish', 'close_msg')]]));
  });

  // --- Qo'shish ---
  const addStart = async (ctx) => {
    const price = isAdmin(ctx.from.id) ? 0 : await getNum('center_price'); // admin uchun bepul
    const u = await getUser(ctx.from.id);
    if (u.balance < price) {
      return ctx.reply(`⚠️ Qo'shish narxi ${money(price)}. Balansingiz: ${money(u.balance)}.\n«💰 Balans» bo'limidan to'ldiring.`);
    }
    ctx.session.form = {};
    ctx.session.state = null;
    return safeEdit(ctx, 'Nimani qo\'shmoqchisiz?', Markup.inlineKeyboard([
      [Markup.button.callback("🏫 O'quv markaz", 'ce_ak:center')],
      [Markup.button.callback('🏛 Xususiy maktab', 'ce_ak:school')],
      [Markup.button.callback('⬅️ Orqaga', 'ce_home')],
    ]));
  };
  bot.action('ce_add', async (ctx) => {
    await ctx.answerCbQuery();
    return addStart(ctx);
  });
  deepLinks.addcenter = addStart;

  bot.action(/^ce_ak:(center|school)$/, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.form = { kind: ctx.match[1] };
    return safeEdit(ctx, '📍 Viloyatni tanlang:', regionsKb('ce_ar', 'ce_add'));
  });

  bot.action(/^ce_ar:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const f = ctx.session.form;
    const ri = Number(ctx.match[1]);
    if (!f || !f.kind || !REGIONS[ri]) return safeEdit(ctx, "Ma'lumotlar eskirgan, qaytadan boshlang.");
    f.ri = ri;
    f.region = REGIONS[ri].name;
    return safeEdit(ctx, `📍 ${f.region}\n\nTumanni tanlang:`, districtsKb(ri, 'ce_ad', [[Markup.button.callback('⬅️ Orqaga', `ce_ak:${f.kind}`)]]));
  });

  bot.action(/^ce_ad:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const f = ctx.session.form;
    if (!f || f.ri == null) return safeEdit(ctx, "Ma'lumotlar eskirgan, qaytadan boshlang.");
    const d = REGIONS[f.ri].districts[Number(ctx.match[1])];
    if (!d) return null;
    f.district = d;
    await safeEdit(ctx, `📍 ${f.region}, ${d}`);
    ctx.session.state = 'center_name';
    return ctx.reply(`${CENTER_KINDS[f.kind].name} nomini kiriting:`, cancelKb());
  });

  states.center_name = async (ctx) => {
    const t = textOf(ctx);
    if (!t || t.length > 200) return ctx.reply('Nomini matn shaklida kiriting (200 belgigacha):');
    ctx.session.form.name = t;
    ctx.session.state = 'center_phone';
    const u = await getUser(ctx.from.id);
    return ctx.reply('📞 Telefon raqam(lar):', Markup.keyboard([[u.phone], [BTN.CANCEL]]).resize());
  };

  states.center_phone = async (ctx) => {
    const t = textOf(ctx);
    if (!t || t.length < 5) return ctx.reply('Telefon raqamni kiriting:');
    ctx.session.form.phone = t.slice(0, 64);
    ctx.session.state = 'center_address';
    return ctx.reply("🏠 Manzil (ko'cha, mo'ljal):", skipKb());
  };

  states.center_address = async (ctx) => {
    const t = textOf(ctx);
    if (!t) return ctx.reply('Manzilni matn shaklida kiriting:');
    ctx.session.form.address = t === BTN.SKIP ? null : t.slice(0, 255);
    ctx.session.state = 'center_location';
    return ctx.reply(
      "📌 Lokatsiyani yuboring (📎 → Joylashuv orqali xaritadan aniq nuqtani tanlash mumkin):",
      Markup.keyboard([[Markup.button.locationRequest('📍 Hozirgi joylashuvim')], [BTN.SKIP], [BTN.CANCEL]]).resize(),
    );
  };

  states.center_location = async (ctx) => {
    const loc = ctx.message.location || (ctx.message.venue && ctx.message.venue.location);
    const f = ctx.session.form;
    if (loc) {
      f.latitude = loc.latitude;
      f.longitude = loc.longitude;
    } else if (textOf(ctx) !== BTN.SKIP) {
      return ctx.reply(`Lokatsiya yuboring yoki «${BTN.SKIP}» ni bosing.`);
    }
    ctx.session.state = null;
    const price = isAdmin(ctx.from.id) ? 0 : await getNum('center_price'); // admin uchun bepul
    const days = await getNum('center_days');
    await ctx.reply("👇 E'lon ko'rinishi:", Markup.removeKeyboard());
    return ctx.reply(card(f) + (f.latitude != null ? '\n📌 Lokatsiya biriktirilgan' : ''), {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(`✅ Joylash — ${money(price)} (${days} kun)`, 'ce_confirm')],
        [Markup.button.callback('❌ Bekor qilish', 'ce_cancel')],
      ]),
    });
  };

  bot.action('ce_cancel', async (ctx) => {
    ctx.session.form = null;
    await ctx.answerCbQuery('Bekor qilindi');
    await ctx.editMessageReplyMarkup(undefined).catch(() => {});
    return showMainMenu(ctx);
  });

  bot.action('ce_confirm', async (ctx) => {
    const f = ctx.session.form;
    if (!f || !f.name || !f.district) return ctx.answerCbQuery("Ma'lumotlar eskirgan, qaytadan qo'shing", { show_alert: true });
    const price = isAdmin(ctx.from.id) ? 0 : await getNum('center_price'); // admin uchun bepul
    const days = await getNum('center_days');
    const expires = now() + days * DAY;
    const res = await charge(ctx.from.id, price, 'center', `${CENTER_KINDS[f.kind].name}: ${f.name}`, async (trx) => {
      await trx('centers').insert({
        user_tg: ctx.from.id, kind: f.kind, region: f.region, district: f.district, name: f.name,
        phone: f.phone, address: f.address || null, latitude: f.latitude ?? null, longitude: f.longitude ?? null,
        is_active: 1, expires_at: expires, created_at: now(),
      });
    });
    if (res === 'nofunds') return ctx.answerCbQuery(`Balansda mablag' yetarli emas. Kerak: ${money(price)}`, { show_alert: true });
    ctx.session.form = null;
    log(ctx.from.id, `🏫 E'lon joyladi: ${esc(f.name)} (${esc(f.region)}, ${esc(f.district)}) — ${money(price)}`);
    await ctx.answerCbQuery('✅ Joylandi!');
    await ctx.editMessageReplyMarkup(undefined).catch(() => {});
    return showMainMenu(ctx, `✅ E'loningiz joylandi! ${fmtDate(expires)} gacha ko'rinib turadi.`);
  });

  registerMine(bot, {
    home: 'ce_home',
    table: 'centers', p: 'ce', priceKey: 'center_price', daysKey: 'center_days', txType: 'center',
    title: (r) => `${CENTER_KINDS[r.kind].icon} ${r.name}`,
  });
}

module.exports = { register };

};

// ===================== src/handlers/rating.js =====================
__modules["src/handlers/rating.js"] = function (module, exports, require) {
const __filename = "src/handlers/rating.js"; const __dirname = "src/handlers";
// 🏆 Reyting: o'quvchilar faolligi bo'yicha
// Ball = har bir testdagi ENG YAXSHI natijadagi to'g'ri javoblar yig'indisi.
// (Bitta testni qayta-qayta yechib ball yig'ib bo'lmaydi.)
// Hisobga olinadi: test variantlari, video mavzu testlari va o'qituvchi testlari.
const { Markup } = require('telegraf');
const { db } = require('../db');
const { BTN } = require('../keyboards');
const { esc, safeEdit } = require('../utils');

const PERIODS = {
  w: { name: 'Shu hafta', since: () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); } },
  m: { name: 'Shu oy', since: () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(1); return d.getTime(); } },
  a: { name: 'Umumiy', since: () => 0 },
};
const TOP = 10;
const MEDALS = ['🥇', '🥈', '🥉'];

// Ism + familiyaning birinchi harfi (masalan: "Ali V.")
const shortName = (u) => `${esc(u.first_name || '')} ${u.last_name ? `${esc(u.last_name[0])}.` : ''}`.trim();

async function leaderboard(since) {
  const best = db('results')
    .select('user_tg')
    .max({ best: 'correct' })
    .where('created_at', '>=', since)
    .groupBy('user_tg', 'owner_type', 'owner_id')
    .as('b');
  const rows = await db
    .from(best)
    .select('user_tg')
    .sum({ pts: 'best' })
    .count({ tests: '*' })
    .groupBy('user_tg')
    .orderBy([{ column: 'pts', order: 'desc' }, { column: 'tests', order: 'desc' }]);
  return rows.map((r) => ({ tg: Number(r.user_tg), pts: Number(r.pts) || 0, tests: Number(r.tests) || 0 })).filter((r) => r.pts > 0);
}

async function render(ctx, key, edit) {
  const p = PERIODS[key] || PERIODS.w;
  const all = await leaderboard(p.since());
  const top = all.slice(0, TOP);
  const users = top.length ? await db('users').whereIn('tg_id', top.map((r) => r.tg)).select('tg_id', 'first_name', 'last_name') : [];
  const byId = new Map(users.map((u) => [Number(u.tg_id), u]));

  let text = `🏆 <b>Reyting — ${p.name}</b>\n<i>Eng faol o'quvchilar (to'g'ri javoblar soni bo'yicha)</i>\n\n`;
  if (!top.length) {
    text += "Hozircha bu davrda hech kim test yechmagan. Birinchi bo'ling! 💪";
  } else {
    text += top.map((r, i) => {
      const u = byId.get(r.tg) || {};
      const me = r.tg === ctx.from.id ? ' 👈' : '';
      return `${MEDALS[i] || `${i + 1}.`} ${shortName(u)} — <b>${r.pts}</b> ball, ${r.tests} ta test${me}`;
    }).join('\n');
  }

  const myIdx = all.findIndex((r) => r.tg === ctx.from.id);
  if (myIdx >= 0) {
    const mine = all[myIdx];
    text += `\n\n📍 Sizning o'rningiz: <b>${myIdx + 1}</b> / ${all.length}\n⭐ Ballingiz: <b>${mine.pts}</b> (${mine.tests} ta test)`;
    if (myIdx > 0) text += `\n⬆️ Keyingi o'ringacha: ${all[myIdx - 1].pts - mine.pts + 1} ball`;
  } else {
    text += "\n\n📍 Siz bu davrda hali test yechmagansiz. «📝 Test ishlash» bo'limidan boshlang!";
  }
  text += "\n\nℹ️ Bitta testni qayta yechsangiz, eng yaxshi natijangiz hisobga olinadi.";

  const kb = Markup.inlineKeyboard([
    Object.entries(PERIODS).map(([k, v]) => Markup.button.callback(k === key ? `• ${v.name} •` : v.name, `rt:${k}`)),
  ]);
  return edit ? safeEdit(ctx, text, { parse_mode: 'HTML', ...kb }) : ctx.reply(text, { parse_mode: 'HTML', ...kb });
}

function register({ bot, menu }) {
  menu(BTN.RATING, (ctx) => render(ctx, 'w', false));
  bot.action(/^rt:([wma])$/, async (ctx) => {
    await ctx.answerCbQuery();
    return render(ctx, ctx.match[1], true);
  });
}

module.exports = { register, leaderboard };

};

// ===================== src/handlers/registration.js =====================
__modules["src/handlers/registration.js"] = function (module, exports, require) {
const __filename = "src/handlers/registration.js"; const __dirname = "src/handlers";
const { Markup } = require('telegraf');
const { db } = require('../db');
const { textOf, getNum, addBalance, money, esc, getUser, isOn, isAdmin } = require('../utils');
const { log } = require('../logger');
const { showMainMenu } = require('../menu');

async function beginRegistration(ctx) {
  ctx.session.state = 'reg_first';
  ctx.session.form = {};
  return ctx.reply("📝 Ro'yxatdan o'tish\n\nIsmingizni kiriting:", Markup.removeKeyboard());
}

const validName = (t) => t && t.length >= 2 && t.length <= 50 && !t.startsWith('/');

const regStates = {
  async reg_first(ctx) {
    const t = textOf(ctx);
    if (!validName(t)) return ctx.reply('Iltimos, ismingizni to\'g\'ri kiriting (2–50 ta harf):');
    ctx.session.form.first_name = t;
    ctx.session.state = 'reg_last';
    return ctx.reply('Familiyangizni kiriting:');
  },

  async reg_last(ctx) {
    const t = textOf(ctx);
    if (!validName(t)) return ctx.reply('Iltimos, familiyangizni to\'g\'ri kiriting:');
    ctx.session.form.last_name = t;
    ctx.session.state = 'reg_phone';
    return ctx.reply(
      "📞 Telefon raqamingizni yuboring (pastdagi tugmani bosing yoki +998901234567 ko'rinishida yozing):",
      Markup.keyboard([[Markup.button.contactRequest('📞 Raqamni yuborish')]]).resize().oneTime(),
    );
  },

  async reg_phone(ctx) {
    let phone = null;
    const c = ctx.message && ctx.message.contact;
    if (c) {
      if (c.user_id && c.user_id !== ctx.from.id) return ctx.reply("Iltimos, o'zingizning raqamingizni yuboring.");
      phone = c.phone_number.startsWith('+') ? c.phone_number : `+${c.phone_number}`;
    } else {
      const t = (textOf(ctx) || '').replace(/[\s\-()]/g, '');
      if (/^\+?998\d{9}$/.test(t)) phone = t.startsWith('+') ? t : `+${t}`;
    }
    if (!phone) return ctx.reply("Raqam noto'g'ri. Tugmani bosing yoki +998901234567 ko'rinishida yozing.");

    const f = ctx.session.form || {};
    // Faqat hali ro'yxatdan o'tmagan bo'lsa yangilanadi — bonuslar takror berilmasligi uchun
    const changed = await db('users').where({ tg_id: ctx.from.id, is_registered: 0 }).update({
      first_name: f.first_name, last_name: f.last_name, phone, is_registered: 1,
    });
    if (!changed) {
      ctx.session.state = null;
      ctx.session.form = null;
      return showMainMenu(ctx);
    }
    ctx.session.state = null;
    ctx.session.form = null;

    // Taklif qilgan do'stga bonus
    const u = await getUser(ctx.from.id);
    log(ctx.from.id, `✅ Ro'yxatdan o'tdi${u.referrer_id ? ` (taklif qilgan: ${u.referrer_id})` : ''}`);
    // Start bonusi — faqat to'liq ro'yxatdan o'tgach (kanal obunasi + ism + familiya + telefon), bir marta.
    // Bazadagi 'welcome' yozuvi bilan solishtiriladi; summani admin belgilaydi, 0 — berilmaydi
    let welcome = '';
    const startBonus = await getNum('start_bonus');
    if (startBonus > 0 && !(await db('transactions').where({ user_tg: u.tg_id, type: 'welcome' }).first())) {
      await addBalance(u.tg_id, startBonus, 'welcome', "Ro'yxatdan o'tish bonusi");
      log(u.tg_id, `🎁 Start bonusi: +${money(startBonus)}`);
      welcome = `\n🎁 Sizga sovg'a: balansingizga <b>${money(startBonus)}</b> qo'shildi!`;
    }
    // Bonus faqat kanalga a'zo bo'lib ro'yxatdan o'tgandan keyin beriladi (obuna tekshiruvi bu bosqichdan oldin)
    if (u.referrer_id && (await isOn('referral'))) {
      const bonus = await getNum('referral_bonus');
      if (bonus > 0) {
        await addBalance(u.referrer_id, bonus, 'referral', `Taklif: ${u.tg_id}`);
        log(u.referrer_id, `🎁 Taklif bonusi: +${money(bonus)} (${esc(u.first_name)})`);
        ctx.telegram
          .sendMessage(u.referrer_id, `🎉 Siz taklif qilgan do'stingiz <b>${esc(u.first_name)}</b> ro'yxatdan o'tdi!\n💰 Balansingizga <b>${money(bonus)}</b> qo'shildi.`, { parse_mode: 'HTML' })
          .catch(() => {});
      }
    }
    await showMainMenu(ctx, `✅ Ro'yxatdan muvaffaqiyatli o'tdingiz!${welcome}`);
    return require('./teacher').openPending(ctx);
  },
};

function register({ bot, deepLinks }) {
  bot.start(async (ctx) => {
    ctx.session.state = null;
    await require('../cleaner').cleanup(ctx);
    if (!ctx.user.is_registered) return beginRegistration(ctx);
    if (await require('./teacher').openPending(ctx)) return null;
    // Mini ilovadan kelgan buyruqlar (/start topup, /start addbook ...)
    const p = ((ctx.message && ctx.message.text) || '').split(/\s+/)[1];
    if (p && deepLinks[p]) {
      const DL_FEATURE = { topup: 'topup', addbook: 'books', addcenter: 'centers', teacher: 'teacher', support: 'support' };
      if (!isAdmin(ctx.from.id) && DL_FEATURE[p] && !(await isOn(DL_FEATURE[p]))) return showMainMenu(ctx, "⛔ Bu bo'lim vaqtincha o'chirilgan.");
      return deepLinks[p](ctx);
    }
    return showMainMenu(ctx);
  });

  // Ro'yxatdan o'tmaganlar faqat ro'yxatdan o'tish oqimida bo'ladi
  bot.use(async (ctx, next) => {
    if (ctx.user && ctx.user.is_registered) return next();
    if (ctx.callbackQuery) return ctx.answerCbQuery("Avval ro'yxatdan o'ting: /start").catch(() => {});
    const st = ctx.session.state;
    const isStart = ctx.message && typeof ctx.message.text === 'string' && ctx.message.text.startsWith('/start');
    if (ctx.message && !isStart && st && regStates[st]) return regStates[st](ctx);
    if (isStart) return next(); // bot.start qayta ishlaydi
    return beginRegistration(ctx);
  });
}

module.exports = { register, beginRegistration };

};

// ===================== src/handlers/support.js =====================
__modules["src/handlers/support.js"] = function (module, exports, require) {
const __filename = "src/handlers/support.js"; const __dirname = "src/handlers";
// 7-bo'lim: Admin bilan bog'lanish
const { Markup } = require('telegraf');
const config = require('../config');
const { BTN, cancelKb } = require('../keyboards');
const { esc, getUser } = require('../utils');
const { showMainMenu } = require('../menu');

function register({ menu, states, deepLinks }) {
  const prompt = async (ctx) => {
    ctx.session.state = 'support';
    const extra = config.ADMIN_USERNAME ? `\n\nYoki to'g'ridan-to'g'ri yozing: @${config.ADMIN_USERNAME}` : '';
    return ctx.reply(`☎️ <b>Admin bilan bog'lanish</b>\n\nSavol yoki taklifingizni yozing (matn, rasm, ovozli xabar) — adminga yetkazamiz.${extra}`, {
      parse_mode: 'HTML',
      ...cancelKb(),
    });
  };
  menu(BTN.SUPPORT, prompt);
  deepLinks.support = prompt;

  states.support = async (ctx) => {
    const u = await getUser(ctx.from.id);
    const head = `📨 <b>Yangi murojaat</b>\n👤 ${esc(u.first_name)} ${esc(u.last_name)}\n📞 ${esc(u.phone)}\n🆔 <code>${u.tg_id}</code>${ctx.from.username ? ` (@${esc(ctx.from.username)})` : ''}`;
    const kb = Markup.inlineKeyboard([[Markup.button.callback('↩️ Javob berish', `adm_reply:${u.tg_id}`)]]);
    let sent = 0;
    for (const adminId of config.ADMIN_IDS) {
      try {
        await ctx.telegram.sendMessage(adminId, head, { parse_mode: 'HTML' });
        await ctx.telegram.copyMessage(adminId, ctx.chat.id, ctx.message.message_id, kb);
        sent += 1;
      } catch (e) {
        console.error('[support] adminga yuborilmadi', adminId, e.message);
      }
    }
    ctx.session.state = null;
    return showMainMenu(ctx, sent ? '✅ Xabaringiz adminga yuborildi. Tez orada javob beramiz.' : "⚠️ Xabarni yuborib bo'lmadi, keyinroq urinib ko'ring.");
  };
}

module.exports = { register };

};

// ===================== src/handlers/teacher.js =====================
__modules["src/handlers/teacher.js"] = function (module, exports, require) {
const __filename = "src/handlers/teacher.js"; const __dirname = "src/handlers";
// O'qituvchilar uchun: test tuzish -> havola orqali o'quvchilarga yuborish -> natijalarni ko'rish
const crypto = require('crypto');
const { Markup } = require('telegraf');
const { db } = require('../db');
const { BTN, cancelKb } = require('../keyboards');
const { esc, money, now, fmtDate, getNum, getUser, charge, textOf, safeEdit, parseAmount } = require('../utils');
const { startQuiz } = require('../quiz');
const { showMainMenu } = require('../menu');
const wizard = require('../questionWizard');
const { log } = require('../logger');

const timeKb = () => Markup.keyboard([['0', '10', '15'], ['20', '30', '45'], [BTN.CANCEL]]).resize();

const link = (ctx, t) => `https://t.me/${ctx.botInfo.username}?start=tt_${t.code}`;
const qCount = async (id) => Number((await db('questions').where({ owner_type: 'tt', owner_id: id }).count({ c: '*' }))[0].c);
const getTest = (where) => db('teacher_tests').where({ ...where, is_deleted: 0 }).first();

async function newCode() {
  for (;;) {
    const code = crypto.randomBytes(5).toString('hex'); // 10 belgi
    if (!(await db('teacher_tests').where({ code }).first())) return code;
  }
}

function shareKb(ctx, t, extra = []) {
  const url = link(ctx, t);
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`📝 «${t.title}» testini yeching:`)}`;
  return Markup.inlineKeyboard([[Markup.button.url("📤 O'quvchilarga yuborish", shareUrl)], ...extra]);
}

// ---------- O'quvchi tomoni ----------
async function openByCode(ctx, code) {
  const t = await getTest({ code });
  if (!t) return ctx.reply('❌ Test topilmadi yoki o\'chirilgan.');
  if (Number(t.teacher_tg) === ctx.from.id) {
    return ctx.reply(`ℹ️ Bu sizning testingiz: «${esc(t.title)}». Natijalarni «${BTN.TEACHER}» → «📋 Mening testlarim» bo'limida ko'rasiz.`, { parse_mode: 'HTML' });
  }
  const done = await db('results').where({ user_tg: ctx.from.id, owner_type: 'tt', owner_id: t.id }).first();
  if (done) {
    return ctx.reply(`✅ Siz «${esc(t.title)}» testini allaqachon yechgansiz.\nNatijangiz: <b>${done.correct}/${done.total}</b>`, { parse_mode: 'HTML' });
  }
  if (!t.is_open) return ctx.reply(`🔒 «${esc(t.title)}» testi o'qituvchi tomonidan yopilgan.`, { parse_mode: 'HTML' });
  const teacher = await getUser(t.teacher_tg);
  const n = await qCount(t.id);
  return ctx.reply(
    `📝 <b>${esc(t.title)}</b>\n👨‍🏫 O'qituvchi: ${esc(teacher ? `${teacher.first_name} ${teacher.last_name}` : '')}\n❓ Savollar soni: ${n}\n⏱ Vaqt: ${t.time_limit ? `${t.time_limit} daqiqa` : 'cheklanmagan'}\n\n⚠️ Testni faqat <b>bir marta</b> yechish mumkin. Natijangiz o'qituvchiga yuboriladi.`,
    { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('▶️ Boshlash', `tts:${t.id}`)]]) },
  );
}

// /start tt_xxx orqali kelgan bo'lsa, testni ochadi. true — ochildi
async function openPending(ctx) {
  const code = ctx.session && ctx.session.pendingTest;
  if (!code) return false;
  ctx.session.pendingTest = null;
  await openByCode(ctx, code);
  return true;
}

async function notifyTeacher(telegram, studentTg, testId, correct, total) {
  const t = await db('teacher_tests').where({ id: testId }).first();
  if (!t) return;
  const u = await getUser(studentTg);
  const pct = Math.round((correct / total) * 100);
  await telegram.sendMessage(
    t.teacher_tg,
    `📥 <b>Yangi natija</b>\n📝 ${esc(t.title)}\n👤 ${esc(u.first_name)} ${esc(u.last_name)}\n✅ ${correct}/${total} (${pct}%)`,
    { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback("📊 Barcha natijalar", `ttr:${t.id}`)]]) },
  );
}

// ---------- O'qituvchi tomoni ----------
function register({ bot, menu, states, deepLinks }) {
  const homeText = async () => {
    const price = await getNum('teacher_test_price');
    return "👨‍🏫 <b>O'qituvchilar uchun</b>\n\nO'z testingizni tuzing, havolasini o'quvchilaringizga yuboring va natijalarni shu yerda kuzating." +
      (price ? `\n\nℹ️ Test tuzish: ${money(price)}` : '');
  };
  const homeKb = () => Markup.inlineKeyboard([
    [Markup.button.callback('➕ Test tuzish', 'tt_new')],
    [Markup.button.callback('📋 Mening testlarim', 'tt_list')],
  ]);

  const home = async (ctx) => ctx.reply(await homeText(), { parse_mode: 'HTML', ...homeKb() });
  menu(BTN.TEACHER, home);
  deepLinks.teacher = home;

  bot.action('tt_home', async (ctx) => {
    await ctx.answerCbQuery();
    return safeEdit(ctx, await homeText(), { parse_mode: 'HTML', ...homeKb() });
  });

  // O'quvchi testni boshlaydi
  bot.action(/^tts:(\d+)$/, async (ctx) => {
    const t = await getTest({ id: Number(ctx.match[1]) });
    if (!t || !t.is_open) return ctx.answerCbQuery('Test yopilgan yoki topilmadi', { show_alert: true });
    const done = await db('results').where({ user_tg: ctx.from.id, owner_type: 'tt', owner_id: t.id }).first();
    if (done) return ctx.answerCbQuery('Siz bu testni yechgansiz', { show_alert: true });
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(undefined).catch(() => {});
    return startQuiz(ctx, 'tt', t.id, t.title, { reveal: false, timeLimit: t.time_limit });
  });

  // --- Test tuzish ---
  bot.action('tt_new', async (ctx) => {
    await ctx.answerCbQuery();
    const price = await getNum('teacher_test_price');
    const u = await getUser(ctx.from.id);
    if (u.balance < price) {
      return ctx.reply(`⚠️ Test tuzish narxi ${money(price)}. Balansingiz: ${money(u.balance)}.\n«💰 Balans» bo'limidan to'ldiring.`);
    }
    ctx.session.state = 'tch_title';
    return ctx.reply('📝 Test nomini kiriting (masalan: 3-sinf matematika, 1-chorak):', cancelKb());
  });

  states.tch_title = async (ctx) => {
    const title = textOf(ctx);
    if (!title || title.length > 200) return ctx.reply('Test nomini matn shaklida kiriting (200 belgigacha):');
    ctx.session.form = { title };
    ctx.session.state = 'tch_time';
    return ctx.reply('⏱ Test uchun vaqt (daqiqada) kiriting. 0 — vaqt cheklanmagan:', timeKb());
  };

  states.tch_time = async (ctx) => {
    const minutes = parseAmount(textOf(ctx));
    if (minutes == null || minutes > 600) return ctx.reply('Daqiqani raqamda kiriting (0–600):');
    const { title } = ctx.session.form || {};
    if (!title) return showMainMenu(ctx);
    const price = await getNum('teacher_test_price');
    const code = await newCode();
    let id;
    const res = await charge(ctx.from.id, price, 'teacher', `O'qituvchi testi: ${title}`, async (trx) => {
      [id] = await trx('teacher_tests').insert({ teacher_tg: ctx.from.id, code, title, time_limit: minutes, is_open: 1, is_deleted: 0, created_at: now() });
    });
    ctx.session.form = null;
    if (res === 'nofunds') {
      ctx.session.state = null;
      return showMainMenu(ctx, `⚠️ Balansda mablag' yetarli emas. Kerak: ${money(price)}`);
    }
    log(ctx.from.id, `👨‍🏫 Test yaratdi: ${esc(title)} (${minutes} daq.)`);
    await ctx.reply(`✅ «${esc(title)}» testi yaratildi. Endi savollarni bittalab kiriting.`, { parse_mode: 'HTML' });
    return wizard.startWizard(ctx, { type: 'tt', id, back: 'teacher' });
  };

  // Savollar kiritib bo'lingach
  wizard.onDone.teacher = async (ctx, { id, count }) => {
    const t = await getTest({ id, teacher_tg: ctx.from.id });
    if (!t) return showMainMenu(ctx);
    if (!count) return showMainMenu(ctx, `⚠️ «${esc(t.title)}» testida hali savol yo'q. «📋 Mening testlarim» orqali savol qo'shing.`);
    await showMainMenu(ctx, `✅ «${esc(t.title)}» testi tayyor! Savollar: ${count} ta.`);
    return ctx.reply(
      `🔗 Test havolasi:\n<code>${link(ctx, t)}</code>\n\nShu havolani o'quvchilaringizga yuboring. Har bir o'quvchi yechganda natijasi sizga keladi.`,
      { parse_mode: 'HTML', ...shareKb(ctx, t, [[Markup.button.callback('📋 Mening testlarim', 'tt_list')]]) },
    );
  };

  // --- Mening testlarim ---
  bot.action('tt_list', async (ctx) => {
    await ctx.answerCbQuery();
    const list = await db('teacher_tests').where({ teacher_tg: ctx.from.id, is_deleted: 0 }).orderBy('id', 'desc').limit(40);
    if (!list.length) return safeEdit(ctx, "📋 Sizda hali testlar yo'q.", Markup.inlineKeyboard([[Markup.button.callback('➕ Test tuzish', 'tt_new')], [Markup.button.callback('⬅️ Orqaga', 'tt_home')]]));
    const rows = list.map((t) => [Markup.button.callback(`${t.is_open ? '🟢' : '🔒'} ${t.title}`.slice(0, 60), `tti:${t.id}`)]);
    rows.push([Markup.button.callback('⬅️ Orqaga', 'tt_home')]);
    return safeEdit(ctx, '📋 <b>Mening testlarim</b>\n🟢 ochiq, 🔒 yopiq', { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) });
  });

  async function showTest(ctx, id) {
    const t = await getTest({ id, teacher_tg: ctx.from.id });
    if (!t) return safeEdit(ctx, 'Test topilmadi.');
    const n = await qCount(id);
    const solved = Number((await db('results').where({ owner_type: 'tt', owner_id: id }).count({ c: '*' }))[0].c);
    const text = `📝 <b>${esc(t.title)}</b>\n📅 ${fmtDate(t.created_at)}\n⏱ Vaqt: ${t.time_limit ? `${t.time_limit} daqiqa` : 'cheklanmagan'}\n❓ Savollar: ${n}\n👥 Yechganlar: ${solved}\n${t.is_open ? '🟢 Ochiq' : '🔒 Yopiq'}\n\n🔗 <code>${link(ctx, t)}</code>`;
    return safeEdit(ctx, text, {
      parse_mode: 'HTML',
      ...shareKb(ctx, t, [
        [Markup.button.callback('📊 Natijalar', `ttr:${id}`), Markup.button.callback("➕ Savol qo'shish", `ttq:${id}`)],
        [Markup.button.callback(t.is_open ? '🔒 Yopish' : '🟢 Ochish', `ttt:${id}`), Markup.button.callback("🗑 O'chirish", `ttd:${id}`)],
        [Markup.button.callback('⬅️ Testlarim', 'tt_list')],
      ]),
    });
  }

  bot.action(/^tti:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return showTest(ctx, Number(ctx.match[1]));
  });

  bot.action(/^ttr:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const id = Number(ctx.match[1]);
    const t = await getTest({ id, teacher_tg: ctx.from.id });
    if (!t) return ctx.reply('Test topilmadi.', Markup.inlineKeyboard([[Markup.button.callback('⬅️ Testlarim', 'tt_list')]]));
    const rows = await db('results')
      .join('users', 'users.tg_id', 'results.user_tg')
      .where({ 'results.owner_type': 'tt', 'results.owner_id': id })
      .orderBy([{ column: 'results.correct', order: 'desc' }, { column: 'results.id', order: 'asc' }])
      .limit(100)
      .select('users.first_name', 'users.last_name', 'results.correct', 'results.total', 'results.created_at');
    const back = Markup.inlineKeyboard([[Markup.button.callback('⬅️ Testga qaytish', `tti:${id}`)]]);
    if (!rows.length) return safeEdit(ctx, `📊 «${esc(t.title)}» — hali hech kim yechmagan.`, { parse_mode: 'HTML', ...back });
    const avg = Math.round(rows.reduce((s, r) => s + (r.correct / r.total) * 100, 0) / rows.length);
    const lines = rows.map((r, i) => `${i + 1}. ${esc(r.first_name)} ${esc(r.last_name)} — <b>${r.correct}/${r.total}</b> (${Math.round((r.correct / r.total) * 100)}%)`);
    let text = `📊 <b>${esc(t.title)}</b>\n👥 Yechganlar: ${rows.length}\n📈 O'rtacha: ${avg}%\n\n${lines.join('\n')}`;
    if (text.length > 4000) text = `${text.slice(0, 3990)}\n…`;
    return safeEdit(ctx, text, { parse_mode: 'HTML', ...back });
  });

  bot.action(/^ttq:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const t = await getTest({ id: Number(ctx.match[1]), teacher_tg: ctx.from.id });
    if (!t) return null;
    return wizard.startWizard(ctx, { type: 'tt', id: t.id, back: 'teacher' });
  });

  bot.action(/^ttt:(\d+)$/, async (ctx) => {
    const t = await getTest({ id: Number(ctx.match[1]), teacher_tg: ctx.from.id });
    if (!t) return ctx.answerCbQuery('Topilmadi');
    await db('teacher_tests').where({ id: t.id }).update({ is_open: t.is_open ? 0 : 1 });
    await ctx.answerCbQuery(t.is_open ? '🔒 Yopildi' : '🟢 Ochildi');
    return showTest(ctx, t.id);
  });

  bot.action(/^ttd:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const id = ctx.match[1];
    return safeEdit(ctx, "⚠️ Test o'chirilsinmi? Havola ishlamay qoladi.", Markup.inlineKeyboard([
      [Markup.button.callback("Ha, o'chirish", `ttdd:${id}`), Markup.button.callback("Yo'q", `tti:${id}`)],
    ]));
  });

  bot.action(/^ttdd:(\d+)$/, async (ctx) => {
    await db('teacher_tests').where({ id: Number(ctx.match[1]), teacher_tg: ctx.from.id }).update({ is_deleted: 1, is_open: 0 });
    await ctx.answerCbQuery("🗑 O'chirildi");
    return safeEdit(ctx, "🗑 Test o'chirildi.", Markup.inlineKeyboard([[Markup.button.callback('📋 Mening testlarim', 'tt_list')]]));
  });
}

module.exports = { register, openPending, openByCode, notifyTeacher };

};

// ===================== src/handlers/tests.js =====================
__modules["src/handlers/tests.js"] = function (module, exports, require) {
const __filename = "src/handlers/tests.js"; const __dirname = "src/handlers";
// 2-bo'lim: Test ishlash (1–4-sinf, maxsus maktablar), variantlar
const { Markup } = require('telegraf');
const { db } = require('../db');
const cats = require('../categories');
const { BTN } = require('../keyboards');
const { esc, money, safeEdit, hasAccess, purchasedIds, purchase, itemLabel, getUser } = require('../utils');
const { startQuiz } = require('../quiz');
const { log } = require('../logger');

const catKb = () => Markup.inlineKeyboard([
  ...cats.list('test').map((c) => [Markup.button.callback(c.name, `tc:${c.code}`)]),
  [Markup.button.callback('📄 Testlarning elektron variantlari (PDF)', 'tp_home')],
]);
const pdfItem = (v) => ({ id: v.id, price: v.pdf_price, title: `${v.title} (PDF)` });
const CAT_TEXT = '📝 <b>Test ishlash</b>\n\nBo\'limni tanlang:';

async function showCategory(ctx, code) {
  const cat = cats.find('test', code);
  if (!cat || !cat.is_active) return safeEdit(ctx, "Bu bo'lim topilmadi.");
  const list = await db('variants').where({ category: code, is_active: 1 }).orderBy('id');
  const bought = await purchasedIds(ctx.from.id, 'variant');
  const rows = list.map((v) => [Markup.button.callback(itemLabel(v, bought), `tv:${v.id}`)]);
  rows.push([Markup.button.callback('⬅️ Orqaga', 'tc_back')]);
  const text = list.length
    ? `📝 <b>${cat.name}</b>\n\nVariantni tanlang:`
    : `📝 <b>${cat.name}</b>\n\nHozircha variantlar qo'shilmagan. Tez orada!`;
  return safeEdit(ctx, text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) });
}

async function showVariant(ctx, id) {
  const v = await db('variants').where({ id, is_active: 1 }).first();
  if (!v) return safeEdit(ctx, 'Variant topilmadi.', Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', 'tc_back')]]));
  const cat = cats.find('test', v.category);
  const [{ cnt }] = await db('questions').where({ owner_type: 'variant', owner_id: id }).count({ cnt: '*' });
  const access = await hasAccess(ctx.from.id, 'variant', v);
  const u = await getUser(ctx.from.id);
  let text = `📝 <b>${esc(v.title)}</b>\n📚 ${cat ? cat.name : ''}\n❓ Savollar soni: ${cnt}\n⏱ Vaqt: ${v.time_limit ? `${v.time_limit} daqiqa` : 'cheklanmagan'}\n💵 Narxi: ${v.price ? money(v.price) : 'bepul'}\n\n`;
  const rows = [];
  if (access) {
    text += '✅ Testni boshlashingiz mumkin.';
    rows.push([Markup.button.callback('▶️ Boshlash', `tstart:${id}`)]);
  } else {
    text += `🔒 Testni ishlash uchun uni sotib oling.\n💰 Balansingiz: ${money(u.balance)}`;
    rows.push([Markup.button.callback(`💳 Sotib olish — ${money(v.price)}`, `buy:variant:${id}`)]);
  }
  if (v.pdf_id) {
    const own = await hasAccess(ctx.from.id, 'pdf', pdfItem(v));
    rows.push([Markup.button.callback(own ? '📄 PDF variantini yuklab olish' : `📄 PDF variant — ${v.pdf_price ? money(v.pdf_price) : 'bepul'}`, `tpd:${id}`)]);
  }
  rows.push([Markup.button.callback('⬅️ Orqaga', `tc:${v.category}`)]);
  return safeEdit(ctx, text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) });
}

// ---------- 📄 Elektron variantlar (PDF) ----------
const PDF_TEXT = "📄 <b>Testlarning elektron variantlari</b>\n\nTestlarni PDF ko'rinishida sotib olib, chop etishingiz yoki telefoningizda saqlashingiz mumkin.\n\nBo'limni tanlang:";

async function pdfHome(ctx) {
  const rows = [];
  for (const c of cats.list('test')) {
    const [{ n }] = await db('variants').where({ category: c.code, is_active: 1 }).whereNotNull('pdf_id').count({ n: '*' });
    if (Number(n)) rows.push([Markup.button.callback(`${c.name} (${n})`, `tpc:${c.code}`)]);
  }
  if (!rows.length) rows.push([Markup.button.callback("Hozircha PDF variantlar yo'q", 'tc_back')]);
  rows.push([Markup.button.callback('⬅️ Orqaga', 'tc_back')]);
  return safeEdit(ctx, PDF_TEXT, { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) });
}

async function pdfCategory(ctx, code) {
  const cat = cats.find('test', code);
  const list = await db('variants').where({ category: code, is_active: 1 }).whereNotNull('pdf_id').orderBy('id');
  const bought = await purchasedIds(ctx.from.id, 'pdf');
  const rows = list.map((v) => [Markup.button.callback(
    !v.pdf_price ? `🆓 ${v.title}` : bought.has(v.id) ? `✅ ${v.title}` : `📄 ${v.title} — ${money(v.pdf_price)}`, `tpd:${v.id}`,
  )]);
  rows.push([Markup.button.callback('⬅️ Orqaga', 'tp_home')]);
  return safeEdit(ctx, `📄 <b>${esc(cat ? cat.name : '')}</b> — elektron variantlar:`, { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) });
}

async function pdfDetail(ctx, id) {
  const v = await db('variants').where({ id, is_active: 1 }).first();
  if (!v || !v.pdf_id) return safeEdit(ctx, 'PDF topilmadi.', Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', 'tp_home')]]));
  const own = await hasAccess(ctx.from.id, 'pdf', pdfItem(v));
  const u = await getUser(ctx.from.id);
  const cat = cats.find('test', v.category);
  let text = `📄 <b>${esc(v.title)}</b> — elektron variant (PDF)\n📚 ${esc(cat ? cat.name : '')}\n💵 Narxi: ${v.pdf_price ? money(v.pdf_price) : 'bepul'}\n\n`;
  const rows = [];
  if (own) {
    text += '✅ Sizda bor. Faylni istalgan vaqtda qayta yuklab olishingiz mumkin.';
    rows.push([Markup.button.callback('📥 PDFni yuklab olish', `tpget:${id}`)]);
  } else {
    text += `💰 Balansingiz: ${money(u.balance)}`;
    rows.push([Markup.button.callback(`💳 Sotib olish — ${money(v.pdf_price)}`, `buy:pdf:${id}`)]);
  }
  rows.push([Markup.button.callback('📝 Shu testni onlayn ishlash', `tv:${id}`)]);
  rows.push([Markup.button.callback('⬅️ Orqaga', `tpc:${v.category}`)]);
  return safeEdit(ctx, text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) });
}

// Sotib olingan fayl chatda qoladi (telegram.sendDocument — chat tozalagich o'chirmaydi)
async function sendPdf(ctx, v) {
  return ctx.telegram.sendDocument(ctx.chat.id, v.pdf_id, {
    caption: `📄 <b>${esc(v.title)}</b> — elektron variant`, parse_mode: 'HTML',
  });
}

function register({ bot, menu }) {
  menu(BTN.TESTS, (ctx) => ctx.reply(CAT_TEXT, { parse_mode: 'HTML', ...catKb() }));

  bot.action('tc_back', async (ctx) => {
    await ctx.answerCbQuery();
    return safeEdit(ctx, CAT_TEXT, { parse_mode: 'HTML', ...catKb() });
  });

  bot.action('tp_home', async (ctx) => {
    await ctx.answerCbQuery();
    return pdfHome(ctx);
  });

  bot.action(/^tpc:(\w+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return pdfCategory(ctx, ctx.match[1]);
  });

  bot.action(/^tpd:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return pdfDetail(ctx, Number(ctx.match[1]));
  });

  bot.action(/^buy:pdf:(\d+)$/, async (ctx) => {
    const v = await db('variants').where({ id: Number(ctx.match[1]), is_active: 1 }).first();
    if (!v || !v.pdf_id) return ctx.answerCbQuery('PDF topilmadi');
    const r = await purchase(ctx.from.id, 'pdf', pdfItem(v));
    if (r === 'nofunds') {
      return ctx.answerCbQuery(`Balansda mablag' yetarli emas. Kerak: ${money(v.pdf_price)}. «💰 Balans» bo'limidan to'ldiring.`, { show_alert: true });
    }
    if (r === 'ok') log(ctx.from.id, `🛒 PDF sotib oldi: ${esc(v.title)} — ${money(v.pdf_price)}`);
    await ctx.answerCbQuery(r === 'ok' ? '✅ Sotib olindi!' : 'Sizda bu PDF bor');
    await sendPdf(ctx, v);
    return pdfDetail(ctx, v.id);
  });

  bot.action(/^tpget:(\d+)$/, async (ctx) => {
    const v = await db('variants').where({ id: Number(ctx.match[1]), is_active: 1 }).first();
    if (!v || !v.pdf_id) return ctx.answerCbQuery('PDF topilmadi');
    if (!(await hasAccess(ctx.from.id, 'pdf', pdfItem(v)))) return ctx.answerCbQuery('Avval sotib oling', { show_alert: true });
    await ctx.answerCbQuery('📥 Yuborilmoqda...');
    log(ctx.from.id, `📥 PDF yuklab oldi: ${esc(v.title)}`);
    return sendPdf(ctx, v);
  });

  bot.action(/^tc:(\w+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return showCategory(ctx, ctx.match[1]);
  });

  bot.action(/^tv:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return showVariant(ctx, Number(ctx.match[1]));
  });

  bot.action(/^buy:variant:(\d+)$/, async (ctx) => {
    const v = await db('variants').where({ id: Number(ctx.match[1]), is_active: 1 }).first();
    if (!v) return ctx.answerCbQuery('Variant topilmadi');
    const r = await purchase(ctx.from.id, 'variant', v);
    if (r === 'nofunds') {
      return ctx.answerCbQuery(`Balansda mablag' yetarli emas. Kerak: ${money(v.price)}. «💰 Balans» bo'limidan to'ldiring.`, { show_alert: true });
    }
    if (r === 'ok') log(ctx.from.id, `🛒 Test sotib oldi: ${esc(v.title)} — ${money(v.price)}`);
    await ctx.answerCbQuery(r === 'ok' ? '✅ Sotib olindi!' : 'Sizda bu test bor');
    return showVariant(ctx, v.id);
  });

  bot.action(/^tstart:(\d+)$/, async (ctx) => {
    const v = await db('variants').where({ id: Number(ctx.match[1]), is_active: 1 }).first();
    if (!v) return ctx.answerCbQuery('Variant topilmadi');
    if (!(await hasAccess(ctx.from.id, 'variant', v))) return ctx.answerCbQuery('Avval testni sotib oling', { show_alert: true });
    await ctx.answerCbQuery();
    return startQuiz(ctx, 'variant', v.id, v.title, { timeLimit: v.time_limit });
  });
}

module.exports = { register };

};

// ===================== src/handlers/videos.js =====================
__modules["src/handlers/videos.js"] = function (module, exports, require) {
const __filename = "src/handlers/videos.js"; const __dirname = "src/handlers";
// 3-bo'lim: Videodarslar va mavzulashtirilgan testlar
const { Markup } = require('telegraf');
const { db } = require('../db');
const cats = require('../categories');
const { BTN } = require('../keyboards');
const { esc, money, safeEdit, hasAccess, purchasedIds, purchase, itemLabel, getUser } = require('../utils');
const { startQuiz } = require('../quiz');
const { log } = require('../logger');

const grpKb = () => Markup.inlineKeyboard(cats.list('video').map((g) => [Markup.button.callback(g.name, `vg:${g.code}`)]));
const GRP_TEXT = "🎬 <b>Videodarslar va mavzulashtirilgan testlar</b>\n\nBo'limni tanlang:";

async function showGroup(ctx, code) {
  const g = cats.find('video', code);
  if (!g || !g.is_active) return safeEdit(ctx, "Bu bo'lim topilmadi.");
  const list = await db('topics').where({ grp: code, is_active: 1 }).orderBy('id');
  const bought = await purchasedIds(ctx.from.id, 'topic');
  const rows = list.map((t) => [Markup.button.callback(itemLabel(t, bought), `vt:${t.id}`)]);
  rows.push([Markup.button.callback('⬅️ Orqaga', 'vg_back')]);
  const text = list.length ? `🎬 <b>${g.name}</b>\n\nMavzuni tanlang:` : `🎬 <b>${g.name}</b>\n\nHozircha mavzular qo'shilmagan.`;
  return safeEdit(ctx, text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) });
}

async function openTopic(ctx, id) {
  const t = await db('topics').where({ id, is_active: 1 }).first();
  if (!t) return ctx.reply('Mavzu topilmadi.');
  const [{ cnt }] = await db('questions').where({ owner_type: 'topic', owner_id: id }).count({ cnt: '*' });

  if (!(await hasAccess(ctx.from.id, 'topic', t))) {
    const u = await getUser(ctx.from.id);
    const text = `🎬 <b>${esc(t.title)}</b>\n\n${t.description ? esc(t.description) + '\n\n' : ''}` +
      `Ichida: 📺 video dars${Number(cnt) ? ` + 📝 ${cnt} ta savolli takrorlash testi` : ''}\n` +
      `💵 Narxi: ${money(t.price)}\n💰 Balansingiz: ${money(u.balance)}`;
    return safeEdit(ctx, text, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(`💳 Sotib olish — ${money(t.price)}`, `buy:topic:${id}`)],
        [Markup.button.callback('⬅️ Orqaga', `vg:${t.grp}`)],
      ]),
    });
  }

  // 1) Mavzuni tomosha qilish  2) Takrorlash uchun test
  const caption = `🎬 <b>${esc(t.title)}</b>${t.description ? `\n\n${esc(t.description)}` : ''}`.slice(0, 1000);
  const rows = [];
  if (Number(cnt)) rows.push([Markup.button.callback(`📝 Takrorlash uchun test (${cnt} savol${t.time_limit ? `, ${t.time_limit} daq.` : ''})`, `vq:${id}`)]);
  rows.push([Markup.button.callback('⬅️ Mavzular', `vg:${t.grp}`)]);
  const kb = Markup.inlineKeyboard(rows);
  // protect_content: pullik videoni boshqalarga uzatish/saqlashni cheklaydi
  const extra = { caption, parse_mode: 'HTML', protect_content: true, ...kb };
  if (t.video_type === 'video') return ctx.replyWithVideo(t.video_ref, extra);
  if (t.video_type === 'document') return ctx.replyWithDocument(t.video_ref, extra);
  const urlKb = Markup.inlineKeyboard([[Markup.button.url('▶️ Videoni ko\'rish', t.video_ref)], ...rows]);
  return ctx.reply(caption, { parse_mode: 'HTML', ...urlKb });
}

function register({ bot, menu }) {
  menu(BTN.VIDEOS, (ctx) => ctx.reply(GRP_TEXT, { parse_mode: 'HTML', ...grpKb() }));

  bot.action('vg_back', async (ctx) => {
    await ctx.answerCbQuery();
    return safeEdit(ctx, GRP_TEXT, { parse_mode: 'HTML', ...grpKb() });
  });

  bot.action(/^vg:(\w+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return showGroup(ctx, ctx.match[1]);
  });

  bot.action(/^vt:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return openTopic(ctx, Number(ctx.match[1]));
  });

  bot.action(/^buy:topic:(\d+)$/, async (ctx) => {
    const t = await db('topics').where({ id: Number(ctx.match[1]), is_active: 1 }).first();
    if (!t) return ctx.answerCbQuery('Mavzu topilmadi');
    const r = await purchase(ctx.from.id, 'topic', t);
    if (r === 'nofunds') {
      return ctx.answerCbQuery(`Balansda mablag' yetarli emas. Kerak: ${money(t.price)}. «💰 Balans» bo'limidan to'ldiring.`, { show_alert: true });
    }
    if (r === 'ok') log(ctx.from.id, `🛒 Video mavzu sotib oldi: ${esc(t.title)} — ${money(t.price)}`);
    await ctx.answerCbQuery(r === 'ok' ? '✅ Sotib olindi!' : 'Sizda bu mavzu bor');
    await ctx.deleteMessage().catch(() => {});
    return openTopic(ctx, t.id);
  });

  bot.action(/^vq:(\d+)$/, async (ctx) => {
    const t = await db('topics').where({ id: Number(ctx.match[1]), is_active: 1 }).first();
    if (!t) return ctx.answerCbQuery('Mavzu topilmadi');
    if (!(await hasAccess(ctx.from.id, 'topic', t))) return ctx.answerCbQuery('Avval mavzuni sotib oling', { show_alert: true });
    await ctx.answerCbQuery();
    return startQuiz(ctx, 'topic', t.id, `${t.title} — takrorlash testi`, { timeLimit: t.time_limit });
  });
}

module.exports = { register };

};

// ===================== src/index.js =====================
__modules["src/index.js"] = function (module, exports, require) {
const __filename = "src/index.js"; const __dirname = "src";
const config = require('./config');
const { db, migrate } = require('./db');
const { createBot } = require('./bot');
const logger = require('./logger');
const { startServer } = require('./server');

async function main() {
  if (!config.BOT_TOKEN) {
    console.error("BOT_TOKEN topilmadi. .env faylini to'ldiring (.env.example dan nusxa oling).");
    process.exit(1);
  }
  if (!config.ADMIN_IDS.length) console.warn("⚠️ ADMIN_IDS bo'sh — admin panel hech kimga ko'rinmaydi.");

  await migrate();
  await require('./categories').seed();
  console.log(`[db] ${config.DB_CLIENT} tayyor`);

  const bot = createBot(config.BOT_TOKEN);
  bot.botInfo = await bot.telegram.getMe();
  await require('./subscription').verifyChannel(bot.telegram, bot.botInfo.id);
  await bot.telegram.setMyCommands([{ command: 'start', description: 'Asosiy menyu' }]);

  logger.start(bot.telegram);

  // Mini ilova: server + chat pastidagi "menyu" tugmasi
  const server = startServer(bot);
  if (config.WEBAPP_URL) {
    await bot.telegram
      .callApi('setChatMenuButton', { menu_button: { type: 'web_app', text: '📱 Ilova', web_app: { url: config.WEBAPP_URL } } })
      .catch((e) => console.error('[webapp] menyu tugmasi:', e.message));
  } else {
    console.log("[webapp] WEBAPP_URL berilmagan — mini ilova tugmasi ko'rsatilmaydi");
  }

  bot.launch({ dropPendingUpdates: false });
  console.log(`🤖 Bot ishga tushdi: @${bot.botInfo.username}  (v${require('../package.json').version}, papka: ${process.cwd()})`);

  const stop = async (sig) => {
    bot.stop(sig);
    server.close();
    await db.destroy();
    process.exit(0);
  };
  process.once('SIGINT', () => stop('SIGINT'));
  process.once('SIGTERM', () => stop('SIGTERM'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

};

// ===================== src/keyboards.js =====================
__modules["src/keyboards.js"] = function (module, exports, require) {
const __filename = "src/keyboards.js"; const __dirname = "src";
const { Markup } = require('telegraf');
const config = require('./config');

const BTN = {
  TESTS: '📝 Test ishlash',
  VIDEOS: '🎬 Videodarslar va mavzulashtirilgan testlar',
  BALANCE: '💰 Balans',
  BOOKS: '📚 Kitoblar qidirish',
  CENTERS: "🏫 O'quv markaz va xususiy maktab qidirish",
  SUPPORT: "☎️ Admin bilan bog'lanish",
  TEACHER: "👨‍🏫 O'qituvchilar uchun",
  RATING: '🏆 Reyting',
  WEBAPP: '📱 Mini ilova',
  ADMIN: '🛠 Admin panel',

  CANCEL: '❌ Bekor qilish',
  SKIP: "⏭ O'tkazib yuborish",
  DONE: '✅ Tayyor',
  OPT_DONE: '✅ Variantlar tayyor',
  UNDO: "↩️ Oxirgi savolni o'chirish",
  HELP: "❓ Yo'riqnoma",

  A_STATS: '📊 Statistika',
  A_USERS: '👥 Foydalanuvchilar',
  A_TEST: '➕ Test varianti',
  A_VIDEO: '➕ Video mavzu',
  A_CONTENT: '🗂 Kontent',
  A_PRICES: '💵 Narxlar',
  A_FEATURES: "🎛 Bo'limlar",
  A_CATS: '📂 Sinflar',
  A_ADS: '📣 Reklama',
  A_LISTINGS: "📋 E'lonlar",
  A_BROADCAST: '📢 Xabar yuborish',
  A_EXIT: '⬅️ Asosiy menyu',
};

// Menyu tugmasi -> bo'lim kaliti (o'chirilgan bo'lim tugmasi ko'rinmaydi)
const BTN_FEATURE = {
  [BTN.TESTS]: 'tests',
  [BTN.VIDEOS]: 'videos',
  [BTN.BOOKS]: 'books',
  [BTN.CENTERS]: 'centers',
  [BTN.TEACHER]: 'teacher',
  [BTN.RATING]: 'rating',
  [BTN.SUPPORT]: 'support',
};

// on — { tests: true, ... }
const mainKb = (admin, on = {}) => {
  const show = (b) => admin || on[BTN_FEATURE[b]] !== false;
  const rows = [
    [BTN.TESTS],
    [BTN.VIDEOS],
    [BTN.BALANCE, BTN.BOOKS],
    [BTN.CENTERS],
    [BTN.TEACHER, BTN.RATING],
    [BTN.SUPPORT],
  ].map((r) => r.filter(show)).filter((r) => r.length);
  if (config.WEBAPP_URL && (admin || on.webapp !== false)) rows.unshift([Markup.button.webApp(BTN.WEBAPP, config.WEBAPP_URL)]);
  if (admin) rows.push([BTN.ADMIN]);
  return Markup.keyboard(rows).resize();
};

const adminKb = () =>
  Markup.keyboard([
    [BTN.A_STATS, BTN.A_USERS],
    [BTN.A_TEST, BTN.A_VIDEO],
    [BTN.A_CONTENT, BTN.A_CATS],
    [BTN.A_ADS, BTN.A_LISTINGS],
    [BTN.A_PRICES, BTN.A_FEATURES],
    [BTN.A_BROADCAST, BTN.A_EXIT],
  ]).resize();

const cancelKb = () => Markup.keyboard([[BTN.CANCEL]]).resize();
const skipKb = () => Markup.keyboard([[BTN.SKIP], [BTN.CANCEL]]).resize();
const doneKb = () => Markup.keyboard([[BTN.DONE], [BTN.CANCEL]]).resize();

const chunk = (arr, n = 2) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

module.exports = { BTN, BTN_FEATURE, mainKb, adminKb, cancelKb, skipKb, doneKb, chunk };

};

// ===================== src/listings.js =====================
__modules["src/listings.js"] = function (module, exports, require) {
const __filename = "src/listings.js"; const __dirname = "src";
// Pullik e'lonlar (kitob, o'quv markaz) uchun umumiy: "Mening e'lonlarim", uzaytirish, o'chirish
const { Markup } = require('telegraf');
const { db } = require('./db');
const { esc, money, fmtDate, now, DAY, getNum, charge, safeEdit, isAdmin } = require('./utils');

/**
 * opts: { table, p (callback prefiksi), priceKey, txType, title(row) }
 */
function registerMine(bot, opts) {
  const { table, p, priceKey, daysKey, txType, title, home } = opts;
  const priceFor = async (ctx) => (isAdmin(ctx.from.id) ? 0 : getNum(priceKey));
  const backHome = [Markup.button.callback('⬅️ Orqaga', home)];

  async function showList(ctx) {
    const rows = await db(table).where({ user_tg: ctx.from.id, is_active: 1 }).orderBy('id', 'desc').limit(30);
    if (!rows.length) return safeEdit(ctx, "🗂 Sizda hali e'lonlar yo'q.", Markup.inlineKeyboard([backHome]));
    const t = now();
    const kb = rows.map((r) => [
      Markup.button.callback(`${r.expires_at > t ? '🟢' : '🔴'} ${title(r)}`.slice(0, 60), `${p}_mine:${r.id}`),
    ]);
    return safeEdit(ctx, "🗂 <b>Mening e'lonlarim</b>\n🟢 faol, 🔴 muddati tugagan", { parse_mode: 'HTML', ...Markup.inlineKeyboard([...kb, backHome]) });
  }

  bot.action(`${p}_my`, async (ctx) => {
    await ctx.answerCbQuery();
    return showList(ctx);
  });

  bot.action(new RegExp(`^${p}_mine:(\\d+)$`), async (ctx) => {
    await ctx.answerCbQuery();
    const r = await db(table).where({ id: Number(ctx.match[1]), user_tg: ctx.from.id, is_active: 1 }).first();
    if (!r) return safeEdit(ctx, "E'lon topilmadi.", Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', `${p}_my`)]]));
    const price = await priceFor(ctx);
    const days = await getNum(daysKey);
    const status = r.expires_at > now() ? `🟢 Faol: ${fmtDate(r.expires_at)} gacha` : `🔴 Muddati tugagan (${fmtDate(r.expires_at)})`;
    return safeEdit(ctx, `<b>${esc(title(r))}</b>\n${status}`, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(`🔄 ${days} kunga uzaytirish — ${money(price)}`, `${p}_ext:${r.id}`)],
        [Markup.button.callback("🗑 O'chirish", `${p}_del:${r.id}`)],
        [Markup.button.callback('⬅️ Orqaga', `${p}_my`)],
      ]),
    });
  });

  bot.action(new RegExp(`^${p}_ext:(\\d+)$`), async (ctx) => {
    const r = await db(table).where({ id: Number(ctx.match[1]), user_tg: ctx.from.id, is_active: 1 }).first();
    if (!r) return ctx.answerCbQuery("E'lon topilmadi");
    const price = await priceFor(ctx);
    const days = await getNum(daysKey);
    const res = await charge(ctx.from.id, price, txType, `Uzaytirish #${r.id}: ${title(r)}`, async (trx) => {
      const base = Math.max(Number(r.expires_at), now());
      await trx(table).where({ id: r.id }).update({ expires_at: base + days * DAY });
    });
    if (res === 'nofunds') return ctx.answerCbQuery(`Balansda mablag' yetarli emas. Kerak: ${money(price)}`, { show_alert: true });
    await ctx.answerCbQuery(`✅ ${days} kunga uzaytirildi`);
    return showList(ctx);
  });

  bot.action(new RegExp(`^${p}_del:(\\d+)$`), async (ctx) => {
    await db(table).where({ id: Number(ctx.match[1]), user_tg: ctx.from.id }).update({ is_active: 0 });
    await ctx.answerCbQuery("🗑 O'chirildi");
    return showList(ctx);
  });
}

module.exports = { registerMine };

};

// ===================== src/logger.js =====================
__modules["src/logger.js"] = function (module, exports, require) {
const __filename = "src/logger.js"; const __dirname = "src";
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

};

// ===================== src/menu.js =====================
__modules["src/menu.js"] = function (module, exports, require) {
const __filename = "src/menu.js"; const __dirname = "src";
const { getUser, userHeader, isAdmin, isOn } = require('./utils');
const { mainKb } = require('./keyboards');
const { FEATURES } = require('./constants');

async function featureFlags() {
  const on = {};
  for (const k of Object.keys(FEATURES)) on[k] = await isOn(k);
  return on;
}

// 1-bo'lim: Asosiy menyu, tepasida foydalanuvchi ma'lumotlari
async function showMainMenu(ctx, prefix) {
  const u = await getUser(ctx.from.id);
  ctx.user = u;
  const text = (prefix ? `${prefix}\n\n` : '') + userHeader(u) + "\n\n👇 Kerakli bo'limni tanlang:";
  const res = await ctx.reply(text, { parse_mode: 'HTML', ...mainKb(isAdmin(ctx.from.id), await featureFlags()) });
  await require('./ads').maybeShow(ctx);
  return res;
}

module.exports = { showMainMenu, featureFlags };

};

// ===================== src/questionWizard.js =====================
__modules["src/questionWizard.js"] = function (module, exports, require) {
const __filename = "src/questionWizard.js"; const __dirname = "src";
/**
 * Savollarni bittalab kiritish (admin va o'qituvchilar uchun umumiy).
 * 4 qadam: 1) savol matni yoki rasm  2) javob variantlari  3) to'g'ri javob  4) video yechim (ixtiyoriy)
 * Har bir qadamda bot nima qilish kerakligini va misolini ko'rsatadi.
 * Saqlangach darhol keyingi savol so'raladi; «✅ Tayyor» — tugatish.
 */
const { Markup } = require('telegraf');
const { db } = require('./db');
const { BTN, cancelKb, skipKb } = require('./keyboards');
const { esc, now, textOf, isAdmin } = require('./utils');
const { log } = require('./logger');

const L = 'ABCDEF';
const MAX_OPTS = 6;
const onDone = {}; // back -> async (ctx, {type, id, count})

const GUIDE =
  "📘 <b>Savol kiritish tartibi</b>\n\n" +
  "Har bir savol <b>4 qadamda</b> kiritiladi, bot har qadamda nima yozishni aytib turadi:\n\n" +
  "<b>1️⃣ Savol matni</b>\nSavolni oddiy xabar qilib yozing.\n<i>Misol:</i> <code>5 + 3 = ?</code>\n" +
  "🖼 Rasmli savol: rasmni yuboring va izohiga (caption) savolni yozing.\n\n" +
  "<b>2️⃣ Javob variantlari</b>\nEng qulayi — hammasini <b>bitta xabarda</b>, har birini yangi qatordan yozing:\n" +
  "<code>7\n8\n9\n10</code>\n" +
  "Bot ularni o'zi A, B, C, D qilib belgilaydi. (Bittalab yuborsangiz ham bo'ladi.) 2 tadan 6 tagacha variant.\n\n" +
  "<b>3️⃣ To'g'ri javob</b>\nChiqqan A, B, C... tugmalardan to'g'risini bosing (yoki harfni yozing).\n\n" +
  "<b>4️⃣ Video yechim</b> (ixtiyoriy)\nVideo yoki havolani yuboring. Kerak bo'lmasa — «⏭ O'tkazib yuborish».\n\n" +
  `✅ Savol saqlanadi va keyingisi so'raladi.\n• Xato kiritsangiz — «${BTN.UNDO}»\n• Hammasi kiritilgach — «${BTN.DONE}»`;

const count = async (type, id) => Number((await db('questions').where({ owner_type: type, owner_id: id }).count({ c: '*' }))[0].c);

async function canEdit(ctx, type, id) {
  if (type === 'tt') {
    const t = await db('teacher_tests').where({ id }).first();
    return !!t && Number(t.teacher_tg) === ctx.from.id;
  }
  return isAdmin(ctx.from.id);
}

const bodyKb = (n) => Markup.keyboard([
  [BTN.DONE],
  ...(n ? [[BTN.UNDO]] : []),
  [BTN.HELP, BTN.CANCEL],
]).resize();

async function askBody(ctx, prefix = '') {
  const qw = ctx.session.qw;
  qw.d = { options: [] };
  ctx.session.state = 'qw_body';
  const saved = await count(qw.type, qw.id);
  return ctx.reply(
    `${prefix ? `${prefix}\n\n` : ''}❓ <b>${saved + 1}-savol</b> · qadam 1/4\n\n✏️ Savol matnini yozing.\n<i>Misol:</i> <code>12 - 5 = ?</code>\n🖼 Rasmli bo'lsa — rasmni izohi bilan yuboring.` +
    (saved ? `\n\nKiritilgan savollar: <b>${saved}</b>. Tugatish — «${BTN.DONE}».` : ''),
    { parse_mode: 'HTML', ...bodyKb(saved) },
  );
}

async function startWizard(ctx, { type, id, back }) {
  ctx.session.qw = { type, id, back, d: null };
  await ctx.reply(GUIDE, { parse_mode: 'HTML' });
  return askBody(ctx);
}

async function finish(ctx) {
  const qw = ctx.session.qw;
  ctx.session.state = null;
  ctx.session.qw = null;
  if (!qw) return null;
  const n = await count(qw.type, qw.id);
  return onDone[qw.back](ctx, { type: qw.type, id: qw.id, count: n });
}

const optPrompt = (d) => {
  if (!d.options.length) {
    return "❓ Qadam 2/4 — <b>javob variantlari</b>\n\nHammasini bitta xabarda, har birini <b>yangi qatordan</b> yozing:\n<code>Samarqand\nToshkent\nBuxoro</code>\n\n(yoki bittalab yuboring — avval A variantini)";
  }
  const list = d.options.map((o, i) => `<b>${L[i]})</b> ${esc(o)}`).join('\n');
  return `${list}\n\n${L[d.options.length]} variantini yozing` + (d.options.length >= 2 ? ` yoki «${BTN.OPT_DONE}» ni bosing.` : '.');
};
const optKb = (d) => (d.options.length >= 2 ? Markup.keyboard([[BTN.OPT_DONE], [BTN.CANCEL]]).resize() : cancelKb());

const preview = (d) =>
  `${d.photo ? '🖼 ' : ''}${esc(d.body || '(rasmdagi savol)')}\n\n` + d.options.map((o, i) => `<b>${L[i]})</b> ${esc(o)}`).join('\n');

async function askCorrect(ctx) {
  const d = ctx.session.qw.d;
  ctx.session.state = 'qw_correct';
  await ctx.reply('❓ Qadam 3/4 — <b>to\'g\'ri javob</b>', { parse_mode: 'HTML', ...cancelKb() });
  return ctx.reply(`${preview(d)}\n\n👇 To'g'ri javobni bosing:`, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([d.options.map((_, i) => Markup.button.callback(L[i], `qwc:${i}`))]),
  });
}

async function setCorrect(ctx, i) {
  const qw = ctx.session.qw;
  qw.d.correct = i;
  ctx.session.state = 'qw_sol';
  return ctx.reply(
    `✅ To'g'ri javob: <b>${L[i]}</b>\n\n❓ Qadam 4/4 — <b>video yechim</b> (ixtiyoriy)\n🎥 Shu savol yechimining videosini yoki havolasini yuboring.\nKerak bo'lmasa — «${BTN.SKIP}».`,
    { parse_mode: 'HTML', ...skipKb() },
  );
}

// "A) 7", "a. 7", "1) 7" kabi boshlanishlarni olib tashlash
const stripLabel = (s) => s.replace(/^\s*(?:[a-fA-F]|[1-6])\s*[).:-]\s+/, '').trim();

function register({ bot, states }) {
  states.qw_body = async (ctx) => {
    const qw = ctx.session.qw;
    if (!qw) return null;
    const t = textOf(ctx);
    if (t === BTN.DONE) return finish(ctx);
    if (t === BTN.HELP) {
      await ctx.reply(GUIDE, { parse_mode: 'HTML' });
      return askBody(ctx);
    }
    if (t === BTN.UNDO) {
      const last = await db('questions').where({ owner_type: qw.type, owner_id: qw.id }).orderBy('id', 'desc').first();
      if (!last || !(await canEdit(ctx, qw.type, qw.id))) return askBody(ctx, "O'chiradigan savol yo'q.");
      await db('questions').where({ id: last.id }).del();
      log(ctx.from.id, `↩️ Oxirgi savolni o'chirdi (${qw.type}#${qw.id})`);
      return askBody(ctx, `↩️ O'chirildi: «${esc((last.body || 'rasmli savol').slice(0, 60))}»`);
    }
    const m = ctx.message;
    if (m.photo && m.photo.length) {
      qw.d.photo = m.photo[m.photo.length - 1].file_id;
      qw.d.body = (m.caption || '').trim();
    } else if (t) {
      qw.d.body = t;
    } else {
      return ctx.reply("Savolni matn yoki rasm ko'rinishida yuboring.");
    }
    if (qw.d.body.length > 800) return ctx.reply('Savol juda uzun (800 belgigacha). Qisqartirib qayta yuboring.');
    ctx.session.state = 'qw_opt';
    return ctx.reply(optPrompt(qw.d), { parse_mode: 'HTML', ...optKb(qw.d) });
  };

  states.qw_opt = async (ctx) => {
    const qw = ctx.session.qw;
    if (!qw) return null;
    const t = textOf(ctx);
    if (!t) return ctx.reply("Variantni matn ko'rinishida yozing.");
    if (t === BTN.OPT_DONE) {
      if (qw.d.options.length < 2) return ctx.reply('Kamida 2 ta variant kerak.');
      return askCorrect(ctx);
    }
    const lines = t.split('\n').map(stripLabel).filter(Boolean);
    if (lines.some((x) => x.length > 200)) return ctx.reply('Variant juda uzun (200 belgigacha).');
    if (qw.d.options.length + lines.length > MAX_OPTS) {
      return ctx.reply(`Ko'pi bilan ${MAX_OPTS} ta variant bo'ladi. Hozir ${qw.d.options.length} ta kiritilgan.`);
    }
    qw.d.options.push(...lines);
    // Bir xabarda 2+ variant yuborilsa — darhol to'g'ri javobni so'raymiz
    if (lines.length >= 2 || qw.d.options.length >= MAX_OPTS) return askCorrect(ctx);
    return ctx.reply(optPrompt(qw.d), { parse_mode: 'HTML', ...optKb(qw.d) });
  };

  // To'g'ri javobni harf bilan yozsa ham qabul qilamiz
  states.qw_correct = async (ctx) => {
    const qw = ctx.session.qw;
    const t = (textOf(ctx) || '').trim().toUpperCase();
    const i = L.indexOf(t);
    if (qw && t.length === 1 && i >= 0 && i < qw.d.options.length) return setCorrect(ctx, i);
    return ctx.reply("Yuqoridagi A, B, C... tugmalardan birini bosing yoki harfni yozing.");
  };

  bot.action(/^qwc:(\d)$/, async (ctx) => {
    const qw = ctx.session.qw;
    if (!qw || ctx.session.state !== 'qw_correct') return ctx.answerCbQuery('Eskirgan');
    const i = Number(ctx.match[1]);
    if (i >= qw.d.options.length) return ctx.answerCbQuery();
    await ctx.answerCbQuery(`To'g'ri javob: ${L[i]}`);
    await ctx.editMessageText(`${preview(qw.d)}\n\n✅ To'g'ri javob: <b>${L[i]}</b>`, { parse_mode: 'HTML' }).catch(() => {});
    return setCorrect(ctx, i);
  });

  states.qw_sol = async (ctx) => {
    const qw = ctx.session.qw;
    if (!qw) return null;
    const m = ctx.message;
    const t = textOf(ctx);
    let sol = null;
    if (m.video) sol = { sol_type: 'video', sol_ref: m.video.file_id };
    else if (m.document) sol = { sol_type: 'document', sol_ref: m.document.file_id };
    else if (t && /^https?:\/\/\S+$/i.test(t)) sol = { sol_type: 'url', sol_ref: t };
    else if (t !== BTN.SKIP) return ctx.reply(`Video yoki havola yuboring, yoki «${BTN.SKIP}» ni bosing.`);

    if (!(await canEdit(ctx, qw.type, qw.id))) {
      ctx.session.state = null;
      ctx.session.qw = null;
      return ctx.reply("Ruxsat yo'q.");
    }
    const d = qw.d;
    await db('questions').insert({
      owner_type: qw.type, owner_id: qw.id, body: d.body || '', options: JSON.stringify(d.options), correct: d.correct,
      photo_id: d.photo || null, sol_type: sol ? sol.sol_type : null, sol_ref: sol ? sol.sol_ref : null, created_at: now(),
    });
    const n = await count(qw.type, qw.id);
    log(ctx.from.id, `➕ Savol qo'shdi (${qw.type}#${qw.id}), jami ${n}`);
    const saved = `✅ <b>${n}-savol saqlandi</b>${sol ? ' (🎥 video yechim bilan)' : ''}:\n${preview(d)}\nTo'g'ri javob: <b>${L[d.correct]}</b>`;
    return askBody(ctx, saved);
  };
}

module.exports = { register, startWizard, onDone, GUIDE };

};

// ===================== src/quiz.js =====================
__modules["src/quiz.js"] = function (module, exports, require) {
const __filename = "src/quiz.js"; const __dirname = "src";
// Botda test ishlash: vaqt cheklovi, rasmli savollar, video yechimlar
const { Markup } = require('telegraf');
const { db } = require('./db');
const { esc, now, mmss, isAdmin } = require('./utils');
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
  if (await solutionCount(q.ids)) rows.push([Markup.button.callback('🎥 Video yechimlar', `sol:${q.ownerType}:${q.ownerId}`)]);
  if (q.ownerType === 'tt') {
    text += "\nNatijangiz o'qituvchingizga yuborildi.";
    require('./handlers/teacher').notifyTeacher(q.telegram, q.tg, q.ownerId, q.correct, total).catch((e) => console.error('[tt]', e.message));
  } else {
    rows.push([Markup.button.callback('🔁 Qayta ishlash', q.ownerType === 'variant' ? `tstart:${q.ownerId}` : `vq:${q.ownerId}`)]);
    rows.push([Markup.button.callback('⬅️ Orqaga', q.ownerType === 'variant' ? `tv:${q.ownerId}` : `vt:${q.ownerId}`)]);
  }
  return q.telegram.sendMessage(q.chatId, text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) });
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
    const qs = await db('questions').where({ owner_type: type, owner_id: id }).orderBy('id').select('id', 'sol_ref');
    const btns = qs.map((r, i) => (r.sol_ref ? Markup.button.callback(`${i + 1}-savol`, `solq:${r.id}:${i + 1}`) : null)).filter(Boolean);
    await ctx.answerCbQuery();
    if (!btns.length) return ctx.reply("Bu testda video yechimlar yo'q.");
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

module.exports = { register, startQuiz, canSeeSolutions, sendSolution };

};

// ===================== src/server.js =====================
__modules["src/server.js"] = function (module, exports, require) {
const __filename = "src/server.js"; const __dirname = "src";
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
const REGIONS = require('./data/regions');
const { CENTER_KINDS, FEATURES } = require('./constants');
const cats = require('./categories');
const {
  now, esc, money, isAdmin, getUser, getNum, getSetting, isOn, hasAccess, purchasedIds, purchase,
} = require('./utils');
const { log } = require('./logger');
const { isSubscribed } = require('./subscription');
const { canSeeSolutions, sendSolution } = require('./quiz');
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

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 100 * 1024) {
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
    const type = body.type === 'topic' ? 'topic' : 'variant';
    await need(type === 'topic' ? 'videos' : 'tests', me);
    const item = await db(type === 'topic' ? 'topics' : 'variants').where({ id: Number(body.id), is_active: 1 }).first();
    if (!item) throw new ApiError(404, 'not_found', 'Topilmadi');
    if (!(await hasAccess(me.tg, type, item))) throw new ApiError(402, 'not_owned', 'Avval sotib oling');
    const qs = await db('questions').where({ owner_type: type, owner_id: item.id }).orderBy('id');
    if (!qs.length) throw new ApiError(400, 'empty', "Bu testga hali savollar qo'shilmagan");
    const t = now();
    const deadline = item.time_limit ? t + item.time_limit * 60000 : null;
    const [attempt] = await db('quiz_attempts').insert({ user_tg: me.tg, owner_type: type, owner_id: item.id, started_at: t, deadline });
    const title = type === 'topic' ? `${item.title} — takrorlash testi` : item.title;
    wlog(me.tg, `▶️ Testni boshladi: ${esc(title)}`);
    return {
      attempt, title, deadline, now: t,
      questions: qs.map((x) => ({ id: x.id, body: x.body, options: JSON.parse(x.options), photo: fileUrl(x.photo_id) })),
    };
  },

  'POST /api/quiz/submit': async (me, q, body) => {
    const a = await db('quiz_attempts').where({ id: Number(body.attempt), user_tg: me.tg }).first();
    if (!a) throw new ApiError(404, 'not_found');
    if (a.finished_at) throw new ApiError(409, 'finished', 'Bu test allaqachon topshirilgan');
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
    const pct = qs.length ? Math.round((correct / qs.length) * 100) : 0;
    wlog(me.tg, `🏁 Testni tugatdi (${a.owner_type}#${a.owner_id}): ${correct}/${qs.length} (${pct}%)${late ? ' ⏰ kechikdi' : ''}`);
    return { correct, total: qs.length, pct, late: !!late, details };
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
      if (req.method === 'GET' && url.pathname === '/api/file') return await serveFile(res, q);
      if (!url.pathname.startsWith('/api/')) return serveStatic(res, url.pathname);
      const handler = routes[`${req.method} ${url.pathname}`];
      if (!handler) return send(res, 404, { error: 'not_found' });
      const body = req.method === 'POST' ? await readBody(req) : {};
      const me = await auth(req);
      return send(res, 200, await handler(me, q, body));
    } catch (e) {
      if (e instanceof ApiError) return send(res, e.status, { error: e.message, code: e.code, ...(e.extra || {}) });
      console.error('[webapp]', e);
      return send(res, 500, { error: 'Server xatosi', code: 'server' });
    }
  });
  server.listen(config.PORT, () => console.log(`📱 Mini ilova serveri: http://localhost:${config.PORT}  (WEBAPP_URL=${config.WEBAPP_URL || 'berilmagan'})`));
  return server;
}

module.exports = { startServer, verifyInitData };

};

// ===================== src/subscription.js =====================
__modules["src/subscription.js"] = function (module, exports, require) {
const __filename = "src/subscription.js"; const __dirname = "src";
const { Markup } = require('telegraf');
const config = require('./config');
const { isAdmin } = require('./utils');

const cache = new Map(); // userId -> amal qilish muddati
const CACHE_MS = 5 * 60 * 1000;

// Kanal holati — ishga tushganda verifyChannel() tekshiradi
const channel = {
  ok: false, // kanal topildi va bot unda admin — obuna tekshiriladi
  url: '', // "Kanalga o'tish" tugmasi havolasi
  title: '',
  problem: '', // nima noto'g'ri (adminlarga ko'rsatiladi)
};

/**
 * Ishga tushganda kanalni tekshiradi: kanal bormi, bot unda adminmi, havolasi qanday.
 * Kanal noto'g'ri sozlangan bo'lsa obuna tekshiruvi VAQTINCHA O'CHADI (aks holda hech kim
 * botdan foydalana olmaydi) va adminlarga nima qilish kerakligi yoziladi.
 */
async function verifyChannel(telegram, botId) {
  if (!config.CHANNEL_ID) {
    channel.problem = '';
    console.log("[obuna] CHANNEL_ID berilmagan — majburiy obuna o'chiq");
    return channel;
  }
  try {
    const chat = await telegram.getChat(config.CHANNEL_ID);
    channel.title = chat.title || config.CHANNEL_ID;
    const me = await telegram.getChatMember(chat.id, botId);
    if (!['administrator', 'creator'].includes(me.status)) {
      channel.problem = `Bot «${channel.title}» kanalida admin emas. Botni kanalga admin qilib qo'shing.`;
    } else {
      channel.ok = true;
      channel.problem = '';
    }
    // Havola: .env dagi CHANNEL_URL > ochiq kanal username > yopiq kanal taklif havolasi
    const envUrl = (process.env.CHANNEL_URL || '').trim();
    channel.url = '';
    if (envUrl) channel.url = envUrl;
    else if (chat.username) channel.url = `https://t.me/${chat.username}`;
    else if (chat.invite_link) channel.url = chat.invite_link;
    else if (channel.ok) channel.url = await telegram.exportChatInviteLink(chat.id).catch(() => '');
  } catch (e) {
    channel.ok = false;
    channel.problem = `CHANNEL_ID=${config.CHANNEL_ID} kanali topilmadi (${e.message}). .env dagi CHANNEL_ID ni to'g'rilang: ochiq kanal uchun @username, yopiq kanal uchun -100... ID.`;
  }
  if (channel.ok) console.log(`[obuna] ✅ Majburiy obuna kanali: ${channel.title} (${channel.url || 'havola yo\'q'})`);
  else console.error(`[obuna] ⚠️ ${channel.problem}\n[obuna] Obuna tekshiruvi vaqtincha O'CHIRILDI, to'g'rilangach botni qayta ishga tushiring.`);
  return channel;
}

async function isSubscribed(telegram, userId) {
  if (!config.CHANNEL_ID || !channel.ok) return true; // kanal sozlanmagan bo'lsa hech kimni to'xtatmaymiz
  const until = cache.get(userId);
  if (until && until > Date.now()) return true;
  try {
    const m = await telegram.getChatMember(config.CHANNEL_ID, userId);
    const ok = ['creator', 'administrator', 'member'].includes(m.status) || (m.status === 'restricted' && m.is_member);
    if (ok) cache.set(userId, Date.now() + CACHE_MS);
    return ok;
  } catch (e) {
    console.error(`[obuna] getChatMember xatosi: ${e.message}`);
    return true; // Telegram xatosida foydalanuvchini to'xtatmaymiz
  }
}

const subscribeKb = () => {
  const rows = [];
  if (channel.url) rows.push([Markup.button.url("📢 Kanalga o'tish", channel.url)]);
  rows.push([Markup.button.callback("✅ Obuna bo'ldim", 'check_sub')]);
  return Markup.inlineKeyboard(rows);
};

module.exports = (bot) => {
  bot.use(async (ctx, next) => {
    if (!ctx.from) return next();
    // Adminga kanal muammosini bir marta eslatamiz
    if (isAdmin(ctx.from.id)) {
      if (channel.problem && ctx.message && !ctx.session.channelWarned) {
        ctx.session.channelWarned = true;
        await ctx.reply(`⚠️ <b>Majburiy obuna ishlamayapti</b>\n\n${channel.problem}\n\nHozircha foydalanuvchilar obunasiz kiryapti.`, { parse_mode: 'HTML' }).catch(() => {});
      }
      return next();
    }

    if (ctx.callbackQuery && ctx.callbackQuery.data === 'check_sub') {
      if (!(await isSubscribed(ctx.telegram, ctx.from.id))) {
        return ctx.answerCbQuery("❌ Siz hali kanalga obuna bo'lmagansiz", { show_alert: true });
      }
      await ctx.answerCbQuery('✅ Rahmat!');
      await ctx.deleteMessage().catch(() => {});
      const { beginRegistration } = require('./handlers/registration');
      const { showMainMenu } = require('./menu');
      if (!(ctx.user && ctx.user.is_registered)) return beginRegistration(ctx);
      if (await require('./handlers/teacher').openPending(ctx)) return null;
      return showMainMenu(ctx);
    }

    if (await isSubscribed(ctx.telegram, ctx.from.id)) return next();

    if (ctx.callbackQuery) return ctx.answerCbQuery("Avval kanalga obuna bo'ling", { show_alert: true }).catch(() => {});
    // Oldingi obuna xabarlari va /start ni o'chirib, bittasini qoldiramiz
    await require('./cleaner').cleanup(ctx);
    return ctx.reply(
      `👋 Botdan foydalanish va ro'yxatdan o'tish uchun avval kanalimizga obuna bo'ling${channel.title ? ` (<b>${channel.title.replace(/[<>&]/g, '')}</b>)` : ''}, so'ng «✅ Obuna bo'ldim» tugmasini bosing.`,
      { parse_mode: 'HTML', ...subscribeKb() },
    );
  });
};

module.exports.isSubscribed = isSubscribed;
module.exports.verifyChannel = verifyChannel;
module.exports.channel = channel;

};

// ===================== src/utils.js =====================
__modules["src/utils.js"] = function (module, exports, require) {
const __filename = "src/utils.js"; const __dirname = "src";
const { db } = require('./db');
const config = require('./config');
const { DEFAULT_SETTINGS } = require('./constants');

const DAY = 24 * 60 * 60 * 1000;
const now = () => Date.now();

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const money = (n) => `${String(Math.trunc(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so'm`;

const pad = (n) => String(n).padStart(2, '0');
const fmtDate = (ms) => {
  const d = new Date(Number(ms));
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};

const isAdmin = (id) => config.ADMIN_IDS.includes(Number(id));

const getUser = (tgId) => db('users').where({ tg_id: tgId }).first();

// "12 000", "12000 so'm" -> 12000 ; noto'g'ri bo'lsa null
const parseAmount = (text, { allowNegative = false } = {}) => {
  if (!text) return null;
  const clean = String(text).replace(/[\s,_]/g, '').replace(/so'?m$/i, '');
  if (!(allowNegative ? /^-?\d+$/ : /^\d+$/).test(clean)) return null;
  return parseInt(clean, 10);
};

// ---------- Sozlamalar ----------
// Har bir so'rovda bazaga murojaat qilmaslik uchun 5 soniyalik kesh
let cache = null;
let cacheAt = 0;
async function allSettings() {
  if (!cache || Date.now() - cacheAt > 5000) {
    const rows = await db('settings').select('name', 'value');
    cache = { ...DEFAULT_SETTINGS };
    for (const r of rows) cache[r.name] = r.value;
    cacheAt = Date.now();
  }
  return cache;
}
async function getSetting(name) {
  return (await allSettings())[name];
}
async function getNum(name) {
  return Number(await getSetting(name)) || 0;
}
async function setSetting(name, value) {
  const exists = await db('settings').where({ name }).first();
  if (exists) await db('settings').where({ name }).update({ value });
  else await db('settings').insert({ name, value });
  cache = null;
}
// Bo'lim yoqilganmi
async function isOn(feature) {
  return (await getSetting(`f_${feature}`)) !== '0';
}

// ---------- Balans ----------
async function addBalance(tgId, amount, type, note) {
  await db.transaction(async (trx) => {
    await trx('users').where({ tg_id: tgId }).increment('balance', amount);
    await trx('transactions').insert({ user_tg: tgId, amount, type, note: (note || '').slice(0, 250), created_at: now() });
  });
}

/**
 * Balansdan pul yechish (atomar). `extra(trx)` shu tranzaksiya ichida bajariladi
 * (masalan, e'lonni yozish). Natija: 'ok' | 'nofunds' | extra qaytargan qiymat.
 */
async function charge(tgId, amount, type, note, extra) {
  return db.transaction(async (trx) => {
    if (amount > 0) {
      const n = await trx('users').where('tg_id', tgId).andWhere('balance', '>=', amount).decrement('balance', amount);
      if (!n) return 'nofunds';
      await trx('transactions').insert({ user_tg: tgId, amount: -amount, type, note: (note || '').slice(0, 250), created_at: now() });
    }
    if (extra) {
      const r = await extra(trx);
      if (r) return r;
    }
    return 'ok';
  });
}

// ---------- Kontentga ruxsat ----------
const ITEM_TABLE = { variant: 'variants', topic: 'topics' };

async function hasAccess(tgId, type, item) {
  if (!item.price || isAdmin(tgId)) return true;
  const p = await db('purchases').where({ user_tg: tgId, item_type: type, item_id: item.id }).first();
  return !!p;
}

async function purchasedIds(tgId, type) {
  const rows = await db('purchases').where({ user_tg: tgId, item_type: type }).select('item_id');
  return new Set(rows.map((r) => r.item_id));
}

async function purchase(tgId, type, item) {
  if (await hasAccess(tgId, type, item)) return 'owned';
  try {
    return await charge(tgId, item.price, 'purchase', `${type}#${item.id}: ${item.title}`, async (trx) => {
      await trx('purchases').insert({ user_tg: tgId, item_type: type, item_id: item.id, amount: item.price, created_at: now() });
    });
  } catch (e) {
    // unique cheklovi: ikki marta bosilgan bo'lsa
    if (/unique|duplicate/i.test(e.message)) return 'owned';
    throw e;
  }
}

const itemLabel = (item, bought) => {
  if (!item.price) return `🆓 ${item.title}`;
  if (bought.has(item.id)) return `✅ ${item.title}`;
  return `🔒 ${item.title} — ${money(item.price)}`;
};

// ---------- Telegram yordamchilari ----------
async function safeEdit(ctx, text, extra = {}) {
  try {
    return await ctx.editMessageText(text, extra);
  } catch (e) {
    if (/message is not modified/.test(e.message)) return null;
    return ctx.reply(text, extra);
  }
}

const userHeader = (u) =>
  `👤 <b>${esc(u.first_name)} ${esc(u.last_name)}</b>\n` +
  `📞 ${esc(u.phone)}\n` +
  `🆔 <code>${u.tg_id}</code>\n` +
  `💰 Balans: <b>${money(u.balance)}</b>`;

const fmtTime = (ms) => {
  const d = new Date(Number(ms));
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
const mmss = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
};

const textOf = (ctx) => (ctx.message && typeof ctx.message.text === 'string' ? ctx.message.text.trim() : null);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = {
  DAY, now, esc, money, fmtDate, isAdmin, getUser, parseAmount,
  allSettings, getSetting, getNum, setSetting, isOn, addBalance, charge,
  ITEM_TABLE, hasAccess, purchasedIds, purchase, itemLabel,
  safeEdit, userHeader, textOf, sleep, fmtTime, mmss,
};

};

// ===================== ishga tushirish =====================
__require('bot.js')('./src/index.js');
