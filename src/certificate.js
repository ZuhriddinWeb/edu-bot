/**
 * Sertifikat (rasm) yaratish.
 * Shablon: assets/certificate_template.jpg (1600x1280). Shrift: Lora (assets/, SIL OFL).
 * Rasm @napi-rs/canvas bilan chiziladi (oldindan yig'ilgan, kompilyatsiya talab qilmaydi).
 *
 * draw() funksiyasi brauzer canvas'ida ham ishlaydi — joylashuvni sinash uchun.
 */
const path = require('path');
const fs = require('fs');

const NAVY = '#1c2b4b';
const GOLD = '#9a7a35';
const W = 1600;

// Matnni kenglikka sig'diradi: shrift o'lchamini kichraytiradi
function fitFont(ctx, text, weightFamily, maxSize, minSize, maxWidth) {
  let size = maxSize;
  for (; size > minSize; size -= 2) {
    ctx.font = `${weightFamily.replace('{size}', size)}`;
    if (ctx.measureText(text).width <= maxWidth) return size;
  }
  ctx.font = `${weightFamily.replace('{size}', minSize)}`;
  return minSize;
}

// Uzun matnni 2 qatorga bo'lish
function splitTwo(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  let best = [text];
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i += 1) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const wa = ctx.measureText(a).width;
    const wb = ctx.measureText(b).width;
    if (wa <= maxWidth && wb <= maxWidth && Math.abs(wa - wb) < bestDiff) {
      best = [a, b];
      bestDiff = Math.abs(wa - wb);
    }
  }
  return best;
}

function ellipsize(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t.trim()}…`;
}

/**
 * ctx — 1600x1280 canvas konteksti, bg — shablon rasmi
 * d: { name, topic, correct, total, date, signer, fonts: { bold, medium, italic } }
 */
function draw(ctx, bg, d) {
  const F = d.fonts || { bold: 'CertBold', medium: 'CertMedium', italic: 'CertItalic' };
  ctx.drawImage(bg, 0, 0, W, 1280);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = NAVY;

  // 1) Ism familiya — yuqori chiziq ustida
  const name = d.name.trim() || "O'quvchi";
  fitFont(ctx, name, `{size}px "${F.bold}"`, 66, 34, 920);
  ctx.fillText(ellipsize(ctx, name, 920), W / 2, 528);

  // 2) Mavzu nomi — bezak va pastki chiziq orasida (kerak bo'lsa 2 qator)
  const topic = d.topic.trim();
  const size = fitFont(ctx, topic, `{size}px "${F.bold}"`, 52, 38, 1040);
  ctx.font = `${size}px "${F.bold}"`;
  if (ctx.measureText(topic).width <= 1040) {
    ctx.fillText(topic, W / 2, 712);
  } else {
    ctx.font = `36px "${F.bold}"`;
    const [a, b] = splitTwo(ctx, topic, 1040);
    if (b) {
      ctx.fillText(ellipsize(ctx, a, 1040), W / 2, 682);
      ctx.fillText(ellipsize(ctx, b, 1040), W / 2, 726);
    } else {
      ctx.fillText(ellipsize(ctx, a, 1040), W / 2, 712);
    }
  }

  // 3) Natija — ramka ichida foiz, ostida nechta to'g'ri
  const pct = d.total ? Math.round((d.correct / d.total) * 100) : 0;
  ctx.fillStyle = GOLD;
  fitFont(ctx, `${pct}%`, `{size}px "${F.bold}"`, 46, 28, 140);
  ctx.fillText(`${pct}%`, 860, 944);
  ctx.fillStyle = NAVY;
  ctx.font = `22px "${F.italic}"`;
  ctx.fillText(`(${d.total} ta savoldan ${d.correct} tasi to'g'ri)`, 860, 996);

  // 4) Sana va imzo — pastki chiziqlar ustida
  ctx.font = `30px "${F.medium}"`;
  ctx.fillText(d.date, 364, 1170);
  const signer = d.signer || '';
  fitFont(ctx, signer, `{size}px "${F.italic}"`, 34, 20, 215);
  ctx.fillText(signer, 1142, 1168);
}

// ---------------- Node (bot) tomoni ----------------
let canvasLib = null;
let bgImage = null;

function assetPath(file) {
  return path.join(__dirname, '..', 'assets', file);
}

// Bitta faylli versiyada (bot.js) fayllar ichiga joylangan
function assetBuffer(file) {
  const emb = global.__EMBEDDED_ASSETS && global.__EMBEDDED_ASSETS[file];
  if (emb) return Buffer.from(emb, 'base64');
  return fs.readFileSync(assetPath(file));
}

async function init() {
  if (canvasLib) return canvasLib;
  try {
    canvasLib = require('@napi-rs/canvas');
  } catch (e) {
    throw new Error("Sertifikat uchun @napi-rs/canvas kutubxonasi o'rnatilmagan: npm install");
  }
  const { GlobalFonts, loadImage } = canvasLib;
  GlobalFonts.register(assetBuffer('Lora-Bold.ttf'), 'CertBold');
  GlobalFonts.register(assetBuffer('Lora-Medium.ttf'), 'CertMedium');
  GlobalFonts.register(assetBuffer('Lora-Italic.ttf'), 'CertItalic');
  bgImage = await loadImage(assetBuffer('certificate_template.jpg'));
  return canvasLib;
}

/** Sertifikat rasmini (JPEG Buffer) qaytaradi */
async function render(data) {
  const { createCanvas } = await init();
  const canvas = createCanvas(W, 1280);
  draw(canvas.getContext('2d'), bgImage, data);
  return canvas.encode('jpeg', 92);
}

module.exports = { draw, render };
