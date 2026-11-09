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
