> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · فارسی · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# مشارکت در VDBackup

ممنون که کمک می‌کنید! VDBackup طوری طراحی شده که مشارکت در آن آسان باشد. این راهنما به شما می‌گوید
چیزها کجا قرار دارند و معدود قراردادهایی که رعایت می‌کنیم.

## نگاهی کلی به پروژه

VDBackup یک **ماژول WebUI برای KernelSU/APatch/Magisk** است: اسکریپت‌های شل + یک WebUI با
vanilla-JS + باینری‌های استاتیک به ازای هر ABI. برای قابلیت‌های اصلی هیچ اپی لازم نیست. ببینید
[ARCHITECTURE.md](ARCHITECTURE.md) و [docs/FILE-STRUCTURE.md](FILE-STRUCTURE.md).

این **جانشین** باز و روت-بومی **Swift Backup، Neo-Backup و
Android-DataBackup** است, اجتماع قابلیت‌های آن‌ها زیر AGPLv3، با قابلیت وارد‌کردن
بکاپ‌های موجود Neo-Backup و Android-DataBackup تا مردم بتوانند مهاجرت کنند.

## مشارکت‌کنندگان هوش مصنوعی پذیرفته می‌شوند

دستیارها و عامل‌های هوش مصنوعی در اینجا مشارکت‌کنندگان درجه‌یک هستند، نه یک فکر ثانوی.

- این پروژه طوری ساخته شده که ماشین‌خوانا باشد: هر فعل `helper.sh` یک شیء
  JSON یکتا چاپ می‌کند، موتور شل POSIX ساده است، و چیدمان فایل‌ها در
  [docs/FILE-STRUCTURE.md](FILE-STRUCTURE.md) مستند شده است.
- یک عامل می‌تواند **هر** محتوا و کنش ماژول را به‌صورت headless از طریق
  آن API با JSON مدیریت کند, تمام سطح کنترل، فعل‌ها و حفاظ‌های ایمنی در
  [docs/AI-AGENTS.md](AI-AGENTS.md) هستند.
- وصله‌های کمک‌گرفته از هوش مصنوعی با همان شرایطی که هر وصله دیگری بررسی و پذیرفته می‌شود, بر اساس
  درستی، شفافیت و قراردادهای زیر، نه بر اساس اینکه چه کسی (یا چه چیزی) آن را نوشته است.
- اگر VDBackup را از یک عامل اجرا می‌کنید، خروجی JSON `helper.sh` را به عنوان
  قرارداد به کار ببرید؛ WebUI را اسکرپ نکنید.
- یک معیار برای همه: قابلیت‌های واقعی هرگز تضعیف نمی‌شوند، اسرار و داده دستگاه
  هرگز وارد مخزن نمی‌شوند (ببینید [.gitignore](.gitignore) سخت‌گیرانه)، و کنش‌های
  تغییردهنده تأییدشده و ممیزی‌شده باقی می‌مانند.

## راه‌اندازی توسعه

- برای تست به یک دستگاه/شبیه‌ساز روت‌شده (KernelSU، APatch یا Magisk) نیاز دارید.
- زیپ قابل‌فلش را بسازید: `cd module && zip -r9 ../VD-Backup-dev.zip .` سپس آن را فلش کنید.
- WebUI در `module/webroot/` است (آن را از مدیر روت باز کنید). بک‌اند
  `module/helper.sh` (دیسپچر) و `module/worker.sh` (موتور جداشده) است.
- باینری‌های بومی در `module/bin/<abi>/` قرار دارند و توسط CI
  (`.github/scripts/build_bin.sh`) تولید می‌شوند؛ معمولاً آن‌ها را دستی بازسازی نمی‌کنید.

## قراردادها

- **هر فایل منبع** (`.sh`، `.js`، `.css`، `.html`، `.svg`، `.yml`) با سربرگ
  بنر پروژه آغاز می‌شود (آن را از هر فایل موجود کپی کنید). بدون استثنا.
- **کد و کامنت‌ها به انگلیسی.** کامنت‌ها را کمینه و فقط جایی که لازم است نگه دارید.
- **بدون em-dash یا en-dash**؛ همیشه از خط‌تیره ساده `-` استفاده کنید.
- WebUI با **vanilla JS** است (یک `scripts.js`)؛ بدون فریم‌ورک. فقط از طریق
  رپر `helper(verb, args)` با روت صحبت کنید، و هر مقدار درج‌شده را escape کنید.
- **هرگز تضعیف نکنید** یک قابلیت واقعی را (مثلاً حفظ SELinux/uid/gid/modes).
- کنش‌های تغییردهنده (بازیابی، حذف) باید درخواست تأیید کنند و یک لاگ ممیزی بنویسند.

## بین‌المللی‌سازی (i18n)

- رشته‌های رابط کاربری در `module/webroot/lang/` قرار دارند. انگلیسی جایگزین متعارف است
  (`en.js` + `en.json`)؛ ۲۰ زبان دیگر `<code>.json` هستند.
- برای افزودن یا تغییر یک رشته: `en.js` **و** `en.json` را ویرایش کنید، سپس هر
  `<code>.json` را به‌روز کنید. دست‌زدن به یک برچسب قابل‌دیدن یعنی به‌روزرسانی **تمام** فایل‌های زبان و
  **تمام** `README.<code>.md`.
- ترجمه‌ها JSON ساده هستند, یک مشارکت نخست عالی. فهرست زبان‌ها را در
  `module/webroot/i18n.js` ببینید.

## کامیت‌ها و PR‌ها

- PR‌ها را متمرکز نگه دارید. چه و چرا را توصیف کنید.
- کامیت‌هایتان را امضا کنید (DCO): `git commit -s` (افزودن `Signed-off-by:`).
- CI باید سبز بماند. در بررسی‌ها مهربان باشید, ببینید [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## ایشوهای خوب برای شروع

به دنبال برچسب‌های `good first issue` و `help wanted` بگردید. ترجمه‌ها، مستندات، پیش‌تنظیم‌های
مقصد جدید `rclone` و صیقل‌دادن WebUI همگی نقاط شروع عالی هستند.

*این مستندات با Claude (Anthropic) تولید شده و توسط VD171 نگه‌داری می‌شود. تصحیح‌ها و بهبودها خوشامد است, [CONTRIBUTING.md](CONTRIBUTING.md) را ببینید.*
