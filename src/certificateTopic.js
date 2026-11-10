/**
 * Mavzu sertifikati (videodars + takrorlash testi) — zamonaviy "dark glass" dizayn.
 * To'q zumrad fon, yorug' gradient dog'lar, shaffof (glass) kartochkalar, nurlanuvchi play-orb.
 * Shablon rasmi kerak emas: hammasi kod bilan chiziladi (1600x1131, A4 nisbati).
 *
 * drawTopic() brauzer canvas'ida ham ishlaydi — dizaynni sinash uchun.
 */
const TW = 1600;
const TH = 1131;
const T_MINT = '#6ee7b7';
const T_MINT2 = '#a7f3d0';
const T_CYAN = '#22d3ee';
const T_SOFT = 'rgba(220,252,240,0.62)';

function tFit(ctx, text, font, max, min, width) {
  let s = max;
  for (; s > min; s -= 2) {
    ctx.font = font.replace('{s}', s);
    if (ctx.measureText(text).width <= width) return s;
  }
  ctx.font = font.replace('{s}', min);
  return min;
}

function tClip(ctx, text, width) {
  if (ctx.measureText(text).width <= width) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > width) t = t.slice(0, -1);
  return `${t.trim()}…`;
}

function tLines(ctx, text, width) {
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
  return best ? [best[0], tClip(ctx, best[1], width)] : [tClip(ctx, text, width)];
}

function tRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function tSpacing(ctx, px) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`;
}

function blob(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

// Shaffof "glass" kartochka
function glass(ctx, x, y, w, h, r) {
  tRect(ctx, x, y, w, h, r);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, 'rgba(255,255,255,0.11)');
  g.addColorStop(1, 'rgba(255,255,255,0.04)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function label(ctx, text, x, y, F, color) {
  ctx.fillStyle = color || T_SOFT;
  ctx.font = `17px "${F.semi}"`;
  tSpacing(ctx, 3.5);
  ctx.fillText(text, x, y);
  tSpacing(ctx, 0);
}

/**
 * d: { name, topic, correct, total, date, signer, no, fonts: { heavy, semi, italic } }
 */
function drawTopic(ctx, d) {
  const F = d.fonts || { heavy: 'TcHeavy', semi: 'TcSemi', italic: 'TcItalic' };
  const pct = d.total ? Math.round((d.correct / d.total) * 100) : 0;
  const X = 110;
  ctx.textAlign = 'left';

  // --- Fon: to'q zumrad + yorug' dog'lar + to'r
  const bg = ctx.createLinearGradient(0, 0, TW, TH);
  bg.addColorStop(0, '#032b26');
  bg.addColorStop(0.6, '#021a18');
  bg.addColorStop(1, '#03141c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, TW, TH);
  blob(ctx, 120, 60, 620, 'rgba(16,185,129,0.42)');
  blob(ctx, 1500, 1100, 700, 'rgba(34,211,238,0.30)');
  blob(ctx, 1320, 300, 360, 'rgba(110,231,183,0.22)');
  blob(ctx, 700, 1150, 380, 'rgba(250,204,21,0.10)');
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= TW; x += 64) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, TH); ctx.stroke(); }
  for (let y = 0; y <= TH; y += 64) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(TW, y + 0.5); ctx.stroke(); }

  // Katta konturli foiz (fon belgisi)
  ctx.save();
  ctx.textAlign = 'right';
  ctx.font = `400px "${F.heavy}"`;
  ctx.strokeStyle = 'rgba(167,243,208,0.07)';
  ctx.lineWidth = 3;
  ctx.strokeText(`${pct}%`, TW + 30, 1010);
  ctx.restore();

  // Ichki nozik ramka
  tRect(ctx, 36, 36, TW - 72, TH - 72, 30);
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // --- Play-orb (o'ng yuqori)
  const ox = 1350;
  const oy = 270;
  for (let i = 0; i < 4; i += 1) {
    ctx.strokeStyle = `rgba(110,231,183,${0.28 - i * 0.06})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(ox, oy, 96 + i * 34, 0, Math.PI * 2); ctx.stroke();
  }
  // orbitadagi nuqtalar
  ctx.fillStyle = T_MINT;
  ctx.beginPath(); ctx.arc(ox + Math.cos(-0.6) * 130, oy + Math.sin(-0.6) * 130, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = T_CYAN;
  ctx.beginPath(); ctx.arc(ox + Math.cos(2.3) * 164, oy + Math.sin(2.3) * 164, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#facc15';
  ctx.beginPath(); ctx.arc(ox + Math.cos(3.9) * 198, oy + Math.sin(3.9) * 198, 4, 0, Math.PI * 2); ctx.fill();
  blob(ctx, ox, oy, 150, 'rgba(52,211,153,0.45)');
  const og = ctx.createLinearGradient(ox - 80, oy - 80, ox + 80, oy + 80);
  og.addColorStop(0, '#a7f3d0');
  og.addColorStop(0.5, '#34d399');
  og.addColorStop(1, '#0891b2');
  ctx.fillStyle = og;
  ctx.beginPath(); ctx.arc(ox, oy, 78, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.ellipse(ox - 22, oy - 34, 40, 18, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(ox - 20, oy - 32); ctx.lineTo(ox + 36, oy); ctx.lineTo(ox - 20, oy + 32); ctx.closePath(); ctx.fill();

  // --- Yuqori chip
  ctx.font = `18px "${F.heavy}"`;
  tSpacing(ctx, 4);
  const chipT = 'VIDEODARS  ·  MAVZU SERTIFIKATI';
  const cw = ctx.measureText(chipT).width + 82;
  tSpacing(ctx, 0);
  glass(ctx, X, 104, cw, 50, 25);
  ctx.fillStyle = T_MINT;
  ctx.beginPath(); ctx.arc(X + 28, 129, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#032b26';
  ctx.beginPath(); ctx.moveTo(X + 25, 124); ctx.lineTo(X + 33, 129); ctx.lineTo(X + 25, 134); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ecfdf5';
  ctx.font = `18px "${F.heavy}"`;
  tSpacing(ctx, 4);
  ctx.fillText(chipT, X + 52, 136);
  tSpacing(ctx, 0);

  // --- Sarlavha
  ctx.fillStyle = '#ffffff';
  ctx.font = `118px "${F.heavy}"`;
  tSpacing(ctx, -2);
  ctx.fillText('Sertifikat', X - 6, 300);
  tSpacing(ctx, 0);
  ctx.fillStyle = T_SOFT;
  ctx.font = `28px "${F.semi}"`;
  ctx.fillText('Ushbu sertifikat bilan taqdirlanadi', X, 362);

  // --- Ism (gradient matn)
  const name = (d.name || '').trim() || "O'quvchi";
  tFit(ctx, name, `{s}px "${F.heavy}"`, 82, 38, 1020);
  const nw = Math.min(1020, ctx.measureText(name).width);
  const ng = ctx.createLinearGradient(X, 0, X + nw, 0);
  ng.addColorStop(0, '#ffffff');
  ng.addColorStop(0.55, T_MINT2);
  ng.addColorStop(1, T_MINT);
  ctx.fillStyle = ng;
  ctx.fillText(tClip(ctx, name, 1020), X, 478);
  const ul = ctx.createLinearGradient(X, 0, X + 560, 0);
  ul.addColorStop(0, T_MINT);
  ul.addColorStop(1, 'rgba(34,211,238,0)');
  ctx.fillStyle = ul;
  tRect(ctx, X, 508, 560, 6, 3);
  ctx.fill();

  // --- Mavzu (glass kartochka)
  ctx.fillStyle = T_SOFT;
  ctx.font = `26px "${F.semi}"`;
  ctx.fillText("quyidagi mavzuni muvaffaqiyatli o'zlashtirgani uchun:", X, 580);
  ctx.font = `40px "${F.heavy}"`;
  let tl = tLines(ctx, (d.topic || '').trim(), 1240);
  if (tl.length > 1) { ctx.font = `36px "${F.heavy}"`; tl = tLines(ctx, (d.topic || '').trim(), 1240); }
  const th = tl.length > 1 ? 136 : 96;
  glass(ctx, X, 608, TW - 2 * X, th, 22);
  const ab = ctx.createLinearGradient(0, 608, 0, 608 + th);
  ab.addColorStop(0, T_MINT);
  ab.addColorStop(1, T_CYAN);
  ctx.fillStyle = ab;
  tRect(ctx, X + 22, 608 + 22, 6, th - 44, 3);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  tl.forEach((t, i) => ctx.fillText(t, X + 54, 608 + (tl.length > 1 ? 56 + i * 46 : 62)));

  // --- Pastki qator: statistik plitkalar
  const ty = 820;
  const tH = 150;
  const tW = 300;
  const gap = 24;
  // 1) Natija + progress chiziq
  glass(ctx, X, ty, tW, tH, 22);
  label(ctx, 'NATIJA', X + 28, ty + 42, F);
  ctx.fillStyle = '#ffffff';
  ctx.font = `56px "${F.heavy}"`;
  ctx.fillText(`${pct}%`, X + 26, ty + 104);
  tRect(ctx, X + 28, ty + 122, tW - 56, 8, 4);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();
  const pg = ctx.createLinearGradient(X + 28, 0, X + tW - 28, 0);
  pg.addColorStop(0, T_MINT);
  pg.addColorStop(1, T_CYAN);
  ctx.fillStyle = pg;
  tRect(ctx, X + 28, ty + 122, Math.max(8, (tW - 56) * Math.min(1, pct / 100)), 8, 4);
  ctx.fill();
  // 2) To'g'ri javoblar
  const x2 = X + tW + gap;
  glass(ctx, x2, ty, tW, tH, 22);
  label(ctx, "TO'G'RI JAVOB", x2 + 28, ty + 42, F);
  ctx.fillStyle = '#ffffff';
  ctx.font = `56px "${F.heavy}"`;
  ctx.fillText(String(d.correct), x2 + 26, ty + 104);
  const cwid = ctx.measureText(String(d.correct)).width;
  ctx.fillStyle = T_SOFT;
  ctx.font = `34px "${F.semi}"`;
  ctx.fillText(` / ${d.total}`, x2 + 26 + cwid, ty + 104);
  // 3) Sana
  const x3 = x2 + tW + gap;
  glass(ctx, x3, ty, tW, tH, 22);
  label(ctx, 'SANA', x3 + 28, ty + 42, F);
  ctx.fillStyle = '#ffffff';
  tFit(ctx, d.date || '', `{s}px "${F.heavy}"`, 44, 26, tW - 56);
  ctx.fillText(d.date || '', x3 + 26, ty + 100);

  // --- Imzo (o'ng pastda)
  const sx = TW - X;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  tFit(ctx, d.signer || '', `{s}px "${F.italic}"`, 46, 24, 360);
  ctx.fillText(d.signer || '', sx, ty + 86);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(sx - 360, ty + 108); ctx.lineTo(sx, ty + 108); ctx.stroke();
  label(ctx, 'IMZO', sx, ty + 142, F);

  // Raqam va shior
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(220,252,240,0.4)';
  ctx.font = `18px "${F.semi}"`;
  ctx.fillText(d.no ? `№ ${d.no}` : '', X, TH - 66);
  ctx.textAlign = 'right';
  ctx.font = `22px "${F.italic}"`;
  ctx.fillText("Har bir dars — kelajak sari yana bir qadam", TW - X, TH - 66);
  ctx.textAlign = 'left';
}

// ---------------- Node (bot) tomoni ----------------
async function renderTopic(data) {
  const { createCanvas } = await require('./certificateTest').initFonts();
  const canvas = createCanvas(TW, TH);
  drawTopic(canvas.getContext('2d'), data);
  return canvas.encode('jpeg', 92);
}

module.exports = { drawTopic, renderTopic };
