# Railway'ga joylash (MySQL bilan)

Railway'da fayllar har yangilanishda o'chadi, shuning uchun **SQLite emas, MySQL** ishlatiladi.
Bot MySQL'ni o'zi topadi, jadvallarni o'zi yaratadi — kodga tegish shart emas.

## 1. Loyihani yuklash

Railway → **New Project**:
- **GitHub repo** orqali (tavsiya): loyiha papkasini GitHub'ga yuklang va repo'ni tanlang;
- yoki kompyuterdan: `npm i -g @railway/cli`, so'ng papkada `railway login` → `railway init` → `railway up`.

`railway.json` fayli bor — ishga tushirish buyrug'i (`npm start`), holat tekshiruvi (`/health`)
va xatoda qayta ishga tushirish o'zi sozlanadi.

> `.env` va `data/` papkasini GitHub'ga YUKLAMANG (`.gitignore` da bor). Sozlamalar Railway'da kiritiladi.

## 2. MySQL qo'shish

Loyiha ichida: **+ New → Database → MySQL**. Railway MySQL xizmatini yaratadi.

## 3. Bot xizmatiga o'zgaruvchilar (Variables)

Bot xizmatini oching → **Variables** → quyidagilarni qo'shing:

| O'zgaruvchi | Qiymat |
|-------------|--------|
| `MYSQL_URL` | `${{MySQL.MYSQL_URL}}` ← reference (MySQL xizmati nomi boshqacha bo'lsa, o'shani yozing) |
| `BOT_TOKEN` | @BotFather tokeni |
| `ADMIN_IDS` | adminlar ID si, vergul bilan |
| `CHANNEL_ID` | majburiy obuna kanali (`@kanal` yoki `-100...`) |
| `LOG_CHANNEL_ID` | log kanali (`-100...`) |
| `ADMIN_USERNAME` | ixtiyoriy |
| `TZ` | `Asia/Tashkent` |

`PORT` va `WEBAPP_URL` ni **yozmang** — Railway portni o'zi beradi, mini ilova manzili domendan olinadi.

## 4. Domen (Mini ilova uchun)

Bot xizmati → **Settings → Networking → Generate Domain**. Port so'ralsa — bo'sh qoldiring yoki
`PORT` qiymatini yozing. Domen paydo bo'lgach botni qayta deploy qiling — «📱 Mini ilova» tugmasi chiqadi.

## 5. Tekshirish

**Deployments → View logs** da shular bo'lishi kerak:

```
[db] mysql tayyor (mysql.railway.internal:3306/railway)
[obuna] ✅ Majburiy obuna kanali: ...
[webapp] Mini ilova: https://....up.railway.app
🤖 Bot ishga tushdi: @baraxolka_uzb_bot (v2.8.0, baza: mysql, ...)
```

- `baza: sqlite` va «⚠️ Railway'da SQLite ishlatilmoqda» chiqsa — `MYSQL_URL` ulanmagan (3-qadam).
- `[db] ulanib bo'lmadi` — MySQL xizmati hali ishga tushmoqda, bot 1 daqiqagacha qayta urinadi.
- `409 Conflict` — bot boshqa joyda (kompyuteringizda) ham ishlayapti. Uni to'xtating.
  **Bitta bot bir vaqtda faqat bitta joyda ishlashi kerak.**

## 6. Eski ma'lumotlarni (SQLite) ko'chirish

Kompyuteringizdagi `data/bot.sqlite` dagi foydalanuvchilar, testlar, balanslarni MySQL'ga o'tkazish (bir marta):

1. Railway → MySQL xizmati → **Variables** → `MYSQL_PUBLIC_URL` qiymatini nusxalang.
2. Kompyuterda, bot papkasidagi `.env` ga vaqtincha qo'shing:
   ```
   MYSQL_URL=mysql://root:...@....proxy.rlwy.net:12345/railway
   ```
3. Kompyuterdagi botni to'xtating va bot papkasida:
   ```
   node bot.js migrate-sqlite data/bot.sqlite
   ```
   
4. «🎉 Tayyor! Jami ... ta yozuv ko'chirildi» chiqsa — `.env` dan `MYSQL_URL` qatorini olib tashlang
   (aks holda kompyuterdagi bot ham Railway bazasiga ulanadi).
5. Railway'dagi botni qayta deploy qiling.

Agar bot Railway'da ko'chirishdan oldin ishga tushgan bo'lsa, MySQL'da boshlang'ich ma'lumotlar bo'ladi va buyruq
to'xtaydi. Ustidan yozish uchun: `node bot.js migrate-sqlite data/bot.sqlite --force`.

## Eslatmalar

- **Replicas = 1** qoldiring (Settings → Scaling). Bir nechta nusxa bitta botni ishlata olmaydi.
- MySQL zaxira nusxasi: MySQL xizmati → **Backups** (yoki `mysqldump` + `MYSQL_PUBLIC_URL`).
- Sertifikat rasmlari uchun `@napi-rs/canvas` Railway'da tayyor holda o'rnatiladi.
