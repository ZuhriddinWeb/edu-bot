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
};

// Narxlar va sozlamalar (admin paneldagi «💵 Narxlar» orqali o'zgaradi)
const DEFAULT_SETTINGS = {
  default_test_price: '5000',
  default_video_price: '5000',
  book_price: '30000',
  center_price: '30000',
  listing_days: '30',
  referral_bonus: '5000',
  teacher_test_price: '0',
  payment_info: "💳 Karta: 8600 0000 0000 0000\n👤 Ism Familiya\n\nTo'lov qilgach, chek rasmini shu yerga yuboring.",
};
for (const k of Object.keys(FEATURES)) DEFAULT_SETTINGS[`f_${k}`] = '1';

const SETTING_HELP = {
  default_test_price: "Test varianti standart narxi (har bir variantga alohida ham qo'yiladi)",
  default_video_price: 'Video mavzu standart narxi',
  book_price: "Kitob e'loni narxi (1 muddat)",
  center_price: "O'quv markaz/maktab e'loni narxi (1 muddat)",
  listing_days: "E'lon muddati (kun)",
  referral_bonus: "Taklif qilingan do'st kanalga a'zo bo'lib ro'yxatdan o'tganda beriladigan bonus",
  teacher_test_price: "O'qituvchi test tuzishi narxi (0 — bepul)",
  payment_info: "Balansni to'ldirish uchun to'lov ma'lumoti (matn)",
};

module.exports = { TEST_CATEGORIES, VIDEO_GROUPS, CENTER_KINDS, FEATURES, DEFAULT_SETTINGS, SETTING_HELP };
