<!--
  VD BACKUP - full app & data backup and restore as root, from a WebUI.
  Copyright (C) 2026  VD171 - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<p align="center">
  <img src="module/webroot/assets/logo-wordmark.png" alt="VDBackup" width="320">
</p>

<p align="center">
  <b>پشتیبان‌گیری و بازیابی کامل برنامه‌ها و داده‌ها با دسترسی روت - کاملاً از طریق یک WebUI اداره می‌شود.</b><br>
  ماژول KernelSU / APatch / Magisk. بدون درخواست "اعطای su"، بدون جابه‌جایی <code>sucompat</code>.
</p>

<p align="center">
  <a href="https://github.com/VD171/VD-Backup/releases">نسخه‌ها</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki">ویکی</a> ·
  <a href="docs/USER-GUIDE.md">راهنمای کاربر</a> ·
  <a href="docs/AI-AGENTS.md">عامل‌های هوش مصنوعی</a> ·
  <a href="CONTRIBUTING.md">مشارکت</a> ·
  <a href="https://xdaforums.com/t/VD-Backup.4807267/">رشتهٔ XDA</a>
</p>

> **Languages:** [English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

---

## این چیست

VDBackup یک **ماژول WebUI** روت‌شده است که از برنامه‌ها و داده‌هایشان پشتیبان می‌گیرد و آن‌ها را
بازیابی می‌کند، **بدون برنامهٔ همراه برای قابلیت‌های اصلی** - چون خودِ ماژول روت است، چیزی برای
"اجازه دادن" وجود ندارد. هدفش پوشش هر کاری است که برنامه‌های محبوب پشتیبان‌گیری انجام می‌دهند،
در یک جا، با یک WebUI تمیز.

این برنامه به‌عنوان جانشینِ باز و روت‌بومیِ **Swift Backup، Neo-Backup و
Android-DataBackup** طراحی شده است: اجتماعِ کاری که آن‌ها می‌کنند، تحت مجوز AGPLv3، و حتی
می‌تواند پشتیبان‌های موجودِ Neo-Backup و Android-DataBackup را وارد کند تا بتوانید کوچ کنید.

## قابلیت‌ها

- **برنامه‌ها:** APK (پایه + split‌ها)، دادهٔ برنامه (`/data/data`)، دادهٔ محافظت‌شده با دستگاه
  (`/data/user_de`)، دادهٔ خارجی (`Android/data`)، OBB، رسانه.
- **دادهٔ سیستمی/ویژه:** مجوزها، AppOps و (با انتخاب صریح) SSAID، هر جا که روت اجازه دهد.
- **حالت‌های پشتیبان‌گیری:** **کامل** (`tar.zst` قابل حمل)، **عکس فوری (Snapshot)** (افزایشی +
  نسخه‌بندی‌شده، از طریق `restic`) و **آینه (Mirror)** (همگام‌سازی ۱:۱، از طریق `rclone`/`rsync`).
- **حفظ وفادارانه:** زمینه‌های SELinux، uid/gid، حالت‌ها، xattr و قابلیت‌ها (capabilities).
- **فشرده‌سازی:** هیچ / lz4 / zstd / gzip (gzip = "حالت سازگاری"، همه‌جا باز می‌شود).
- **رمزنگاری:** اختیاری و قابل حمل (`age` + عبارت عبور، یا zip با AES-256) - هرگز به سخت‌افزار
  دستگاه گره نمی‌خورد، پس پشتیبان روی دستگاهی دیگر بازیابی می‌شود یا روی رایانه باز می‌شود.
- **مقصدها:** محلی، SFTP، SCP، SMB، WebDAV، FTP، S3 و ۷۰+ مورد دیگر (`rclone`)،
  به‌علاوهٔ مخزن‌های `rsync` و `restic`. Google Drive اختیاری از طریق یک همراهِ کوچک با انتخاب صریح.
- **یکپارچگی:** هر بایگانی در برابر مانیفست بررسی می‌شود؛ اجرای آزمایشی (dry-run) و آزمون بازیابی
  اجازه می‌دهند یک پشتیبان را بدون دست‌زدن به هیچ‌چیز وارسی کنید.
- **زمان‌بندی + نگه‌داری:** کارهای تکرارشونده با هرس keep-N.
- **پس‌زمینه:** پشتیبان‌گیری/بازیابی جدا اجرا می‌شود و پس از بستن WebUI باقی می‌ماند، با اعلان‌های
  شروع/پایان.
- **ورود (کوچ):** پشتیبان‌های موجودِ Neo-Backup و Android-DataBackup را وارد می‌کند،
  از جمله موارد رمزنگاری‌شده با گذرواژه.

## نصب

1. آخرین `VD-Backup-vX.Y.zip` را از [نسخه‌ها](https://github.com/VD171/VD-Backup/releases) دانلود کنید.
2. آن را در مدیرِ KernelSU / APatch / Magisk فلش کنید - بی‌درنگ قابل استفاده، بدون نیاز به راه‌اندازی مجدد.
3. **WebUI** ماژول را باز کنید تا پشتیبان‌ها را پیکربندی و اجرا کنید. همین.

تازه‌واردید؟ [راهنمای کاربر](docs/USER-GUIDE.md) شما را از نصب تا بازیابی همراهی می‌کند.

## قابلیت حمل

پشتیبان‌های شما **در این ماژول حبس نیستند**. همه‌چیز از قالب‌های استاندارد
(`tar`، `gzip`، `zstd`، `age`، `zip`، `restic`) استفاده می‌کند که روی Windows، macOS و Linux
با ابزارهای رایج یا مدیرهای فایل باز می‌شوند. هر پشتیبانِ رمزنگاری‌شده با یادداشتِ **RECOVERY**
همراه است که فرمان‌های دقیقِ رمزگشایی و استخراج روی رایانه را در بر دارد.

## ساخت

ماژول عبارت است از shell + WebUI به‌علاوهٔ باینری‌های ایستای هر ABI (`tar`، `zstd`، `lz4`،
`rclone`، `rsync`، ssh، `restic`) که برای `armeabi-v7a`، `arm64-v8a`، `x86`،
`x86_64` ساخته شده‌اند. به [CONTRIBUTING.md](CONTRIBUTING.md) و گردش‌کارهای CI نگاه کنید.

## مستندات

- **[ویکی](https://github.com/VD171/VD-Backup/wiki)** - مستندات، قابل مرور به‌صورت آنلاین.
- **[راهنمای کاربر](docs/USER-GUIDE.md)** - سرتاسری، از نصب تا بازیابی.
- **[عامل‌های هوش مصنوعی](docs/AI-AGENTS.md)** - هر عمل را بدون رابط از طریق API مبتنی بر JSON هدایت کنید.
- **[معماری](ARCHITECTURE.md)** و **[ساختار فایل](docs/FILE-STRUCTURE.md)** - چگونه کار می‌کند.
- **[مشارکت](CONTRIBUTING.md)** و **[امنیت](SECURITY.md)**.

## سازگار با هوش مصنوعی

VDBackup طوری ساخته شده که نه‌فقط برای مردم، بلکه برای دستیارها و عامل‌های هوش مصنوعی نیز
پذیرا باشد. موتور JSON صحبت می‌کند (هر فعلِ `helper.sh` یک شیء JSON واحد برمی‌گرداند)، و کد،
مستندات و ساختار فایل برای خواندنِ ماشینی چیده شده‌اند، و مشارکت‌های یاری‌شده با هوش مصنوعی مانند
هر مشارکت دیگری بازبینی و پذیرفته می‌شوند. یک عامل می‌تواند **هر** عملِ ماژول را بدون رابط از طریق
همان APIای که WebUI به کار می‌برد اداره کند - برای سطح کنترل کامل به
**[docs/AI-AGENTS.md](docs/AI-AGENTS.md)** و برای مشارکت به
[CONTRIBUTING.md](CONTRIBUTING.md#ai-contributors-welcome) نگاه کنید.

## تماس

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Channel:** @Priv8_VD https://t.me/Priv8_VD
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171

## همچنین ببینید

پروژه‌های خواهرِ همین نویسنده:

- **[VDInfos](https://github.com/VD171/VD-Infos)** - یک اشکال‌زدای روش‌های دستگاه: هر مورد را از طریق هر روشی که می‌تواند آن را بخواند می‌خواند و آن‌ها را کنار هم مقایسه می‌کند.
- **[VDGoogle](https://github.com/VD171/VD-Google)** - سرویس‌های Google شما (RCS، Wallet، گواهی‌های Play Integrity)، روی دستگاهتان و بدون اینترنت خوانده می‌شوند.
- **[COPG-VD](https://github.com/VD171/COPG-VD)** - یک جاعلِ دستگاه که یک اثرانگشت تازه را به یک پروفایلِ منسجم و یکدست تبدیل می‌کند.

## مجوز

[GNU AGPL-3.0-or-later](LICENSE). کپی‌لفتِ شبکه‌ای: اگر نسخه‌ای تغییریافته را اجرا کنید،
حتی به‌صورت یک سرویس، باید منبع آن را عرضه کنید.

---

`android` `backup` `restore` `app-data` `migration` `neo-backup` `databackup` `kernelsu` `apatch` `magisk` `webui` `root` `tar` `zstd` `restic` `rclone` `age` `encryption` `ssaid` `appops` `on-device` `agpl` `ai-friendly` `vdbackup`
