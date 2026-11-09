# Ta'lim Telegram boti + Mini ilova (Node.js)

Testlar, videodarslar, balans, kitoblar, o'quv markazlar, o'qituvchilar bo'limi, reyting va Mini ilova.
Lokalda **SQLite**, serverda **MySQL** (kod bir xil, faqat `.env` o'zgaradi).
Admin qismi botda, foydalanuvchilar bot yoki Mini ilovadan foydalanadi.

## Ishga tushirish (lokal)

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
# .env: BOT_TOKEN, ADMIN_IDS, CHANNEL_ID, LOG_CHANNEL_ID ni to'ldiring
npm start
```

Node.js 18+ kerak. Jadvallar va yangi ustunlar ishga tushganda avtomatik yaratiladi (eski bazani o'chirish shart emas).

**Bot admin bo'lishi kerak bo'lgan kanallar:**
1. `CHANNEL_ID` — majburiy obuna kanali (obunani tekshirish uchun).
2. `LOG_CHANNEL_ID` — maxfiy log kanali (xabar yozish va tahrirlash uchun).

## Bo'limlar

| Bo'lim | Nima qiladi |
|--------|-------------|
| Asosiy menyu | Tepada ism-familiya, telefon, ID, balans |
| 📝 Test ishlash | «📄 Elektron variantlar (PDF)» — testlarning PDF faylini alohida sotib olish. Sinf bo'limlari (standart: 1, 2, 3, 4, 5-sinf, 6-7-sinf, maxsus maktablar) → variantlar → vaqtli test → natija + 🎥 video yechimlar |
| 🎬 Videodarslar (onlayn dars) | Sinf bo'limlari (standart: 1-2, 3-4, 5-7-sinf, maxsus maktablar) → mavzu → video → takrorlash testi |
| 💰 Balans | Balans, do'st taklif qilish (bonus), chek orqali to'ldirish, tarix |
| 📚 Kitoblar | Qidiruv, sotuvdagilar, kitob qo'shish (pullik, 1 oy) |
| 🏫 O'quv markaz / maktab | Viloyat → tuman → ro'yxat (nomi, tel, lokatsiya); qo'shish pullik, 1 oy |
| 👨‍🏫 O'qituvchilar uchun | Test tuzish (bittalab) → havola → o'quvchilar yechadi → natijalar o'qituvchiga |
| 🏆 Reyting | Eng faol o'quvchilar: hafta / oy / umumiy |
| ☎️ Admin bilan bog'lanish | Xabar adminga, admin javob qaytaradi |
| 📱 Mini ilova | Yuqoridagilarning foydalanuvchi qismi chiroyli ilovada |

## Admin panel (botda: «🛠 Admin panel» yoki /admin)

- **📊 Statistika** — foydalanuvchilar, faollik, kontent, to'lovlar.
- **👥 Foydalanuvchilar** — ID, telefon yoki ism bo'yicha qidirish; kartochkada: balansni o'zgartirish, xabar yozish, amallar tarixi, test natijalari, **🚫 bloklash / blokdan chiqarish**.
- **➕ Test varianti** — bo'lim → nom → narx → **vaqt (daqiqa)** → **PDF (elektron variant) va uning narxi** (ixtiyoriy) → savollarni bittalab kiritish.
  PDFni keyin «🗂 Kontent» dan yuklash, almashtirish, narxini o'zgartirish yoki olib tashlash mumkin.
- **➕ Video mavzu** — bo'lim → nom → tavsif → narx → takrorlash testi vaqti → video → takrorlash testi savollari.
- **📂 Sinflar** — testlar va onlayn darslar uchun sinf bo'limlarini boshqarish: yangi bo'lim qo'shish
  (alohida — «5-sinf», birgalikda — «6-7-sinf»), nomini o'zgartirish, tartibini o'zgartirish (⬆️⬇️), yashirish, o'chirish
  (bo'sh bo'lsa). Test yoki mavzu qo'shganda shu bo'limlardan biri tanlanadi.
- **🗂 Kontent** — «📂 Bo'limini o'zgartirish» bilan test/mavzuni boshqa sinf bo'limiga ko'chirish; har bir test/mavzu uchun: savol qo'shish, savollar ro'yxati (bittalab o'chirish), narx, vaqt, videoni almashtirish, yashirish/ko'rsatish, o'chirish.
- **📣 Reklama** — matn / rasm / video + ixtiyoriy tugma (`Matn | https://havola`), muddati (kun). Muddat tugagach o'zi to'xtaydi.
  Har bir reklama: ko'rib chiqish, muddatni o'zgartirish, to'xtatish/yoqish, «📢 hozir hammaga yuborish», o'chirish, necha marta ko'rsatilgani.
  Foydalanuvchiga menyu ochganda ko'rsatiladi — bir odamga `ad_interval_hours` soatda bir martadan ko'p emas. Mini ilova bosh sahifasida banner.
- **📋 E'lonlar** — foydalanuvchilar joylagan kitob va markaz e'lonlari (faol / muddati tugagan): muddatni o'zgartirish, o'chirish.
  Admin o'zi joylagan e'lonlar bepul.
- **💵 Narxlar** — barcha narxlar va muddatlar tugma bilan o'zgaradi.
- **🎛 Bo'limlar** — har bir bo'limni yoqish/o'chirish (o'chirilgani foydalanuvchilarga ko'rinmaydi). «🤖 Bot» o'chirilsa — texnik ishlar rejimi (faqat adminlar ishlata oladi).
- **📢 Xabar yuborish** — barcha foydalanuvchilarga.

### Savolni kiritish (admin va o'qituvchi)

Boshida bot yo'riqnomani misollar bilan ko'rsatadi, har qadamda nima yozish kerakligini aytadi («❓ Yo'riqnoma» — qayta ko'rish):

1. **Savol matni** — yoki **rasm + izoh** (rasmli savol).
2. **Variantlar** — eng qulayi bitta xabarda, har birini yangi qatordan (bot o'zi A, B, C... qiladi). Bittalab ham bo'ladi.
3. **To'g'ri javob** — tugmani bosish yoki harfni yozish.
4. **🎥 Video yechim** — video yoki havola (ixtiyoriy).
5. Saqlangach keyingi savol so'raladi. Xato bo'lsa — «↩️ Oxirgi savolni o'chirish». Tugatish — «✅ Tayyor».

Video yechimlar o'quvchiga test **tugagandan keyin** «🎥 Video yechimlar» tugmasi orqali ko'rinadi.

### Standart narxlar (admin o'zgartiradi)

| Sozlama | Standart |
|---------|----------|
| Test varianti | 5 000 so'm (har variantga alohida narx qo'yiladi) |
| Video mavzu | 5 000 so'm |
| Kitob e'loni | 30 000 so'm / 30 kun (narx va muddat alohida) |
| O'quv markaz/maktab e'loni | 30 000 so'm / 30 kun (narx va muddat alohida) |
| Testning PDF varianti | 5 000 so'm (har biriga alohida narx) |
| Start bonusi (to'liq ro'yxatdan o'tgach, bir marta) | 10 000 so'm (0 — berilmaydi) |
| Reklama ko'rsatish oralig'i | 12 soat |
| Do'st taklif bonusi | 5 000 so'm (do'st kanalga a'zo bo'lib ro'yxatdan o'tgach) |
| O'qituvchi test tuzishi | 0 (bepul) |

## Chatni tozalash

Foydalanuvchi yangi menyu tugmasini bosganda oldingi menyu xabarlari, bosilgan tugma xabari va forma
davomida yozilgan javoblar avtomatik o'chiriladi — chatda faqat joriy bo'lim qoladi.
O'chmaydi: test savollari va natijalari, video darslar, video yechimlar, admin yuborgan bildirishnomalar.
Telegram 48 soatdan eski xabarlarni o'chirishga ruxsat bermaydi. Admin «🎛 Bo'limlar» → «🧹 Chatni tozalash» orqali o'chirib qo'yishi mumkin.

## Loglar (maxfiy kanal)

Har bir foydalanuvchining **bitta sessiyasi kanalda bitta xabar**: sarlavhada ism, telefon, ID; pastida
vaqt bilan ketma-ket harakatlar (qaysi tugmani bosdi, nima yozdi, nima sotib oldi, test natijasi,
mini ilovada nima qildi...). Yangi harakat bo'lganda xabar **tahrirlanib** to'ldiriladi.
30 daqiqa (`LOG_SESSION_MINUTES`) harakatsizlikdan keyin yangi xabar boshlanadi.

Telegram kanalga daqiqasiga ~20 ta xabar/tahrir cheklovi qo'yadi. Shuning uchun yozuvlar navbatga yig'iladi
va har 3 soniyada (`LOG_INTERVAL_MS`) bitta xabar yangilanadi — foydalanuvchilar ko'p bo'lsa loglar
biroz kechikib chiqadi, lekin yo'qolmaydi.

## Mini ilova

Mini ilova shu botning o'zida ishlaydi (`PORT` da HTTP server). Telegram mini ilovalari faqat **HTTPS** manzil bilan ochiladi:

**Serverda (domen bilan):**
1. Domen (masalan `bot.example.uz`) serverga yo'naltiriladi.
2. Nginx + bepul SSL (certbot):
   ```nginx
   server {
     server_name bot.example.uz;
     location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; }
   }
   ```
   `sudo certbot --nginx -d bot.example.uz`
3. `.env`: `WEBAPP_URL=https://bot.example.uz`
4. Bot qayta ishga tushganda menyuda «📱 Mini ilova» tugmasi va chat pastida «📱 Ilova» tugmasi paydo bo'ladi.

**Lokalda sinash uchun:** `ngrok http 3000` → bergan https manzilni `WEBAPP_URL` ga yozing.

Mini ilovada: profil va balans, testlar (vaqt hisoblagich bilan), videodarslar, natija va video yechimlar,
reyting, balans/taklif havolasi, kitoblar, o'quv markazlar. Rasm/video yuklash talab qiladigan amallar
(kitob/markaz qo'shish, chek yuborish, o'qituvchi testi tuzish) botga yo'naltiriladi.
Telegram videolari bot orqali chatga yuboriladi (himoyalangan holda).

Xavfsizlik: har bir so'rov Telegram `initData` imzosi bilan tekshiriladi; bloklangan, ro'yxatdan o'tmagan
yoki kanalga obuna bo'lmaganlar kira olmaydi; test vaqti server tomonda nazorat qilinadi.

## Serverga (MySQL) o'tkazish

1. `CREATE DATABASE edu_bot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
2. `.env`: `DB_CLIENT=mysql` va `MYSQL_*`.
3. Doimiy ishlashi uchun: `npm i -g pm2 && pm2 start src/index.js --name edu-bot && pm2 save`

## Tuzilma

```
src/
  index.js            ishga tushirish (bot + mini ilova serveri + loglar)
  bot.js              middleware'lar: foydalanuvchi, log, blok, obuna, bo'lim to'siqlari
  server.js           mini ilova API (initData tekshiruvi)
  logger.js           log kanali (sessiya = bitta tahrirlanadigan xabar)
  quiz.js             botda test ishlash (vaqt, rasmli savol, video yechim)
  questionWizard.js   savollarni bittalab kiritish
  listings.js         pullik e'lonlar: uzaytirish/o'chirish
  handlers/           har bir bo'lim alohida faylda
webapp/index.html     mini ilova interfeysi
```

## Eslatmalar

- Botdagi chala formalar va davom etayotgan testlar xotirada saqlanadi — bot qayta ishga tushsa ular boshidan boshlanadi. Ma'lumotlar (natijalar, balans, kontent) bazada saqlanadi.
- Bitta testni qayta yechish mumkin; reytingda faqat eng yaxshi natija hisoblanadi. O'qituvchi testlari esa bir marta yechiladi va javoblar ko'rsatilmaydi.
