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
