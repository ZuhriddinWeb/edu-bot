/**
 * Test sertifikati (test variantlari uchun) — mavzu sertifikatidan farqli, zamonaviy dizayn.
 * Shablon rasmi kerak emas: hammasi kod bilan chiziladi (1600x1131, A4 nisbati).
 * Shriftlar: Inter (sarlavha/matn), Lora Italic (imzo) — assets/ papkasida, SIL OFL.
 *
 * drawTest() brauzer canvas'ida ham ishlaydi — dizaynni sinash uchun.
 */
const W = 1600;
const H = 1131;
const INK = '#1b1640';
const VIOLET = '#5b4bdb';
const DEEP = '#231a63';
const STAR = '#ffc93c';
const MUTED = '#6e6a8a';

function level(pct) {
  if (pct >= 86) return { t: "A'LO", c: '#22c55e' };
  if (pct >= 71) return { t: 'YAXSHI', c: '#38bdf8' };
  return { t: 'QONIQARLI', c: '#f59e0b' };
}

function fit(ctx, text, font, max, min, width) {
  let s = max;
  for (; s > min; s -= 2) {
    ctx.font = font.replace('{s}', s);
    if (ctx.measureText(text).width <= width) return s;
  }
  ctx.font = font.replace('{s}', min);
  return min;
}

function clip(ctx, text, width) {
  if (ctx.measureText(text).width <= width) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > width) t = t.slice(0, -1);
  return `${t.trim()}…`;
}

function lines2(ctx, text, width) {
  if (ctx.measureText(text).width <= width) return [text];
  const w = text.split(/\s+/);
  let best = null;
  let diff = Infinity;
  for (let i = 1; i < w.length; i += 1) {
    const a = w.slice(0, i).join(' ');
    const b = w.slice(i).join(' ');
    const wa = ctx.measureText(a).width;
    const wb = ctx.measureText(b).width;
    if (wa <= width && Math.abs(wa - wb) < diff) { best = [a, b]; diff = Math.abs(wa - wb); }
  }
  return best ? [best[0], clip(ctx, best[1], width)] : [clip(ctx, text, width)];
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function star(ctx, cx, cy, r, color) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * d: { name, test, correct, total, date, signer, no, fonts: { heavy, semi, italic } }
 */
function drawTest(ctx, d) {
  const F = d.fonts || { heavy: 'TcHeavy', semi: 'TcSemi', italic: 'TcItalic' };
  const pct = d.total ? Math.round((d.correct / d.total) * 100) : 0;
  const lv = level(pct);
  const BAND = 520;

  // --- Qog'oz fon va nuqtali naqsh
  ctx.fillStyle = '#fbfaff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(91,75,219,0.07)';
  for (let y = 40; y < H; y += 34) for (let x = BAND + 30; x < W; x += 34) { ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill(); }
  // o'ng yuqori burchakdagi yumshoq doira
  const glow = ctx.createRadialGradient(W - 60, 40, 10, W - 60, 40, 420);
  glow.addColorStop(0, 'rgba(255,201,60,0.28)');
  glow.addColorStop(1, 'rgba(255,201,60,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(BAND, 0, W - BAND, H);

  // --- Chap to'q binafsha panel
  const g = ctx.createLinearGradient(0, 0, BAND, H);
  g.addColorStop(0, '#3b2fb0');
  g.addColorStop(0.55, DEEP);
  g.addColorStop(1, '#120c3a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, BAND, H);
  // diagonal chiziqlar
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, BAND, H); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 2;
  for (let i = -H; i < BAND; i += 28) { ctx.beginPath(); ctx.moveTo(i, H); ctx.lineTo(i + H, 0); ctx.stroke(); }
  // yulduzchalar
  const dots = [[70, 90, 2.4], [430, 70, 1.6], [120, 980, 2], [460, 1040, 2.6], [60, 560, 1.4], [480, 420, 1.8], [250, 1080, 1.4], [300, 50, 1.8]];
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (const [x, y, r] of dots) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  star(ctx, 438, 170, 9, STAR);
  star(ctx, 84, 870, 7, 'rgba(255,201,60,0.8)');
  ctx.restore();
  // panel chetidagi oltin chiziq
  ctx.fillStyle = STAR;
  ctx.fillRect(BAND - 8, 0, 8, H);

  // Panel: yuqori yozuv
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `22px "${F.semi}"`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
  ctx.fillText('NATIJA', BAND / 2, 250);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

  // --- Natija halqasi
  const cx = BAND / 2;
  const cy = 470;
  const R = 160;
  ctx.lineCap = 'round';
  ctx.lineWidth = 26;
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  const ring = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
  ring.addColorStop(0, '#ffe08a');
  ring.addColorStop(1, '#ffb020');
  ctx.strokeStyle = ring;
  const end = -Math.PI / 2 + Math.PI * 2 * Math.max(0.001, Math.min(1, pct / 100));
  ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, end); ctx.stroke();
  // uchidagi nuqta
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(cx + Math.cos(end) * R, cy + Math.sin(end) * R, 7, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = `112px "${F.heavy}"`;
  const pw = ctx.measureText(String(pct)).width;
  ctx.font = `52px "${F.heavy}"`;
  const sw = ctx.measureText('%').width;
  ctx.textAlign = 'left';
  ctx.font = `112px "${F.heavy}"`;
  ctx.fillText(String(pct), cx - (pw + sw + 4) / 2, cy + 38);
  ctx.font = `52px "${F.heavy}"`;
  ctx.fillStyle = STAR;
  ctx.fillText('%', cx - (pw + sw + 4) / 2 + pw + 4, cy + 36);
  ctx.textAlign = 'center';

  // Daraja belgisi
  ctx.font = `26px "${F.heavy}"`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
  const lw = ctx.measureText(lv.t).width + 64;
  rrect(ctx, cx - lw / 2, 690, lw, 56, 28);
  ctx.fillStyle = lv.c;
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(lv.t, cx + 2, 728);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

  // To'g'ri javoblar
  ctx.fillStyle = '#fff';
  ctx.font = `44px "${F.heavy}"`;
  ctx.fillText(`${d.correct} / ${d.total}`, cx, 850);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = `24px "${F.semi}"`;
  ctx.fillText("to'g'ri javob", cx, 888);

  // Sertifikat raqami
  if (d.no) {
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = `20px "${F.semi}"`;
    ctx.fillText(`№ ${d.no}`, cx, 1060);
  }

  // --- O'ng tomon: matnlar
  const L = BAND + 110;
  const RW = W - L - 110;
  ctx.textAlign = 'left';

  // Logo belgisi + sarlavha
  rrect(ctx, L, 120, 70, 70, 18);
  ctx.fillStyle = VIOLET;
  ctx.fill();
  star(ctx, L + 35, 157, 22, STAR);
  ctx.fillStyle = VIOLET;
  ctx.font = `24px "${F.heavy}"`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '7px';
  ctx.fillText('TEST', L + 96, 150);
  ctx.fillStyle = MUTED;
  ctx.font = `20px "${F.semi}"`;
  ctx.fillText('SERTIFIKATI', L + 96, 182);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

  ctx.fillStyle = INK;
  ctx.font = `86px "${F.heavy}"`;
  ctx.fillText('Sertifikat', L - 4, 330);
  ctx.fillStyle = MUTED;
  ctx.font = `28px "${F.semi}"`;
  ctx.fillText('Ushbu sertifikat bilan taqdirlanadi:', L, 400);

  // Ism
  const name = (d.name || '').trim() || "O'quvchi";
  ctx.fillStyle = INK;
  fit(ctx, name, `{s}px "${F.heavy}"`, 70, 36, RW);
  ctx.fillText(clip(ctx, name, RW), L, 500);
  // ism ostidagi gradient chiziq
  const ul = ctx.createLinearGradient(L, 0, L + RW, 0);
  ul.addColorStop(0, VIOLET);
  ul.addColorStop(0.6, STAR);
  ul.addColorStop(1, 'rgba(255,201,60,0)');
  ctx.fillStyle = ul;
  ctx.fillRect(L, 532, RW, 5);

  // Test nomi — kartochka ichida
  ctx.fillStyle = MUTED;
  ctx.font = `26px "${F.semi}"`;
  ctx.fillText('quyidagi testni muvaffaqiyatli topshirgani uchun:', L, 600);
  ctx.font = `38px "${F.heavy}"`;
  const tl = lines2(ctx, (d.test || '').trim(), RW - 80);
  const boxH = tl.length > 1 ? 150 : 100;
  rrect(ctx, L, 630, RW, boxH, 22);
  ctx.fillStyle = 'rgba(91,75,219,0.08)';
  ctx.fill();
  ctx.fillStyle = VIOLET;
  ctx.fillRect(L, 630 + 20, 6, boxH - 40);
  ctx.fillStyle = INK;
  tl.forEach((t, i) => ctx.fillText(t, L + 40, 630 + (tl.length > 1 ? 62 + i * 48 : 64)));

  // Motivatsion qator
  ctx.fillStyle = MUTED;
  ctx.font = `24px "${F.italic}"`;
  ctx.fillText("Bilim — eng katta boylik. Shu yo'lda davom eting!", L, 630 + boxH + 62);

  // --- Pastki qism: sana va imzo
  const by = 1010;
  ctx.strokeStyle = 'rgba(27,22,64,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(L, by); ctx.lineTo(L + 300, by); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(L + RW - 340, by); ctx.lineTo(L + RW, by); ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = `32px "${F.semi}"`;
  ctx.fillText(d.date || '', L, by - 18);
  ctx.textAlign = 'right';
  fit(ctx, d.signer || '', `{s}px "${F.italic}"`, 40, 22, 340);
  ctx.fillText(d.signer || '', L + RW, by - 16);
  ctx.fillStyle = MUTED;
  ctx.font = `20px "${F.semi}"`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
  ctx.fillText('IMZO', L + RW, by + 38);
  ctx.textAlign = 'left';
  ctx.fillText('SANA', L, by + 38);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

  // Muhr — oltin yulduzli doira
  const sx = L + RW / 2 - 10;
  const sy = by - 10;
  ctx.fillStyle = STAR;
  ctx.beginPath();
  for (let i = 0; i < 48; i += 1) {
    const a = (Math.PI * 2 * i) / 48;
    const r = i % 2 ? 62 : 70;
    ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(sx, sy, 52, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = VIOLET;
  ctx.beginPath(); ctx.arc(sx, sy, 46, 0, Math.PI * 2); ctx.fill();
  star(ctx, sx, sy - 6, 22, STAR);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = `14px "${F.heavy}"`;
  ctx.fillText(`${pct}%`, sx, sy + 34);
  ctx.textAlign = 'left';
}

// ---------------- Node (bot) tomoni ----------------
let lib = null;

async function init() {
  if (lib) return lib;
  const fs = require('fs');
  const path = require('path');
  const buf = (f) => {
    const emb = global.__EMBEDDED_ASSETS && global.__EMBEDDED_ASSETS[f];
    return emb ? Buffer.from(emb, 'base64') : fs.readFileSync(path.join(__dirname, '..', 'assets', f));
  };
  try {
    lib = require('@napi-rs/canvas');
  } catch (e) {
    throw new Error("Sertifikat uchun @napi-rs/canvas kutubxonasi o'rnatilmagan: npm install");
  }
  lib.GlobalFonts.register(buf('Inter-ExtraBold.otf'), 'TcHeavy');
  lib.GlobalFonts.register(buf('Inter-SemiBold.otf'), 'TcSemi');
  lib.GlobalFonts.register(buf('Lora-Italic.ttf'), 'TcItalic');
  return lib;
}

/** Test sertifikati rasmini (JPEG Buffer) qaytaradi */
async function renderTest(data) {
  const { createCanvas } = await init();
  const canvas = createCanvas(W, H);
  drawTest(canvas.getContext('2d'), data);
  return canvas.encode('jpeg', 92);
}

module.exports = { drawTest, renderTest, initFonts: init };
