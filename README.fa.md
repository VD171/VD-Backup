<!--
  VD BACKUP - full app & data backup and restore as root, from a WebUI.
  Copyright (C) 2026  VD171 - SPDX-License-Identifier: AGPL-3.0-or-later
-->

# VD Backup

<p align="center">
  <img src="module/webroot/assets/logo-wordmark.png" alt="VD Backup" width="320">
</p>

<p align="center">
  <a href="https://github.com/VD171/VD-Backup/releases/latest"><img src="https://img.shields.io/github/v/release/VD171/VD-Backup?label=release&color=0969da" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0--or--later-1a7f37" alt="License"></a>
  <a href="https://github.com/VD171/VD-Backup/releases"><img src="https://img.shields.io/github/downloads/VD171/VD-Backup/total?label=downloads&color=8250df" alt="Downloads"></a>
  <a href="https://github.com/VD171/VD-Backup/stargazers"><img src="https://img.shields.io/github/stars/VD171/VD-Backup?color=d29922" alt="Stars"></a>
</p>

<p align="center">
  <b>پشتیبان‌گیری و بازیابی کامل برنامه‌ها و داده‌ها با دسترسی روت, کاملاً از طریق یک WebUI اداره می‌شود.</b><br>
  ماژول KernelSU / APatch / Magisk. بدون درخواست "اعطای su"، بدون جابه‌جایی <code>sucompat</code>.
</p>

<p align="center">
  <a href="https://github.com/VD171/VD-Backup/releases">Releases</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki">Wiki</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/USER-GUIDE">User guide</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/AI-AGENTS">AI agents</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/ARCHITECTURE">Architecture</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/BINARIES">Bundled binaries</a> ·
  <a href="CHANGELOG.md">Changelog</a> ·
  <a href="https://xdaforums.com/t/VD-Backup.4807267/">XDA thread</a>
</p>

> **Languages:** [English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

| Home | Apps | Schedule |
|:---:|:---:|:---:|
| ![Home](docs/screenshots/en/home-dark.png) | ![Apps](docs/screenshots/en/apps-dark.png) | ![Schedule](docs/screenshots/en/schedule-dark.png) |
| **Destinations** | **Settings** | **Activity log** |
| ![Destinations](docs/screenshots/en/destinations-dark.png) | ![Settings](docs/screenshots/en/settings-dark.png) | ![Activity log](docs/screenshots/en/activitylog-dark.png) |

---

## این چیست

VDBackup یک **ماژول WebUI** روت‌شده است که از برنامه‌ها و داده‌هایشان پشتیبان می‌گیرد و آن‌ها را
بازیابی می‌کند، **بدون برنامهٔ همراه برای قابلیت‌های اصلی**: چون خودِ ماژول روت است، چیزی برای
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
- **رمزنگاری:** اختیاری و قابل حمل (`age` + عبارت عبور، یا zip با AES-256), هرگز به سخت‌افزار
  دستگاه گره نمی‌خورد، پس پشتیبان روی دستگاهی دیگر بازیابی می‌شود یا روی رایانه باز می‌شود.
- **مقصدها:** محلی، SFTP، SCP، SMB، WebDAV، FTP، S3 و ۷۰+ مورد دیگر (`rclone`)،
  به‌علاوهٔ مخزن‌های `rsync` و `restic`. Google Drive اختیاری از طریق یک همراهِ کوچک با انتخاب صریح.
- **یکپارچگی:** هر بایگانی در برابر مانیفست بررسی می‌شود؛ اجرای آزمایشی (dry-run) و آزمون بازیابی
  اجازه می‌دهند یک پشتیبان را بدون دست‌زدن به هیچ‌چیز وارسی کنید.
- **بازیابی گزینشی و دسته‌ای:** هر زیرمجموعه‌ای از موردهای یک پشتیبان را بازیابی کنید، یا چند
  پشتیبان را برگزینید و همه را یکجا بازگردانید؛ پشتیبان‌ها را حذف کنید و یک گزارش فعالیت/ممیزی از
  هر اقدام ویرانگر نگه دارید.
- **پشتیبان‌های ویژه:** پیام‌ها (SMS/MMS)، مخاطبان و گزارش تماس، Wi-Fi و Bluetooth، همراه با یک
  خروجی قابل حملِ JSON اختیاری که می‌توانید روی رایانه بازش کنید.
- **زمان‌بندی + خودکارسازی:** کارهای تکرارشوندهٔ **پشتیبان‌گیری یا بازیابی** که یک برنامه، یک
  مجموعه، یا همهٔ برنامه‌ها را هدف می‌گیرند، با هرس keep-N، به‌علاوهٔ پشتیبان‌گیری خودکارِ با انتخاب
  صریح هنگام نصب/به‌روزرسانی و یک فهرست برنامه‌های مستثنا.
- **منبع نصب:** برنامه‌های بازیابی‌شده به‌طور پیش‌فرض Play Store را به‌عنوان منبع نصب خود گزارش می‌دهند
  (قابل تغییر)؛ یک گزینهٔ پیشرفتهٔ با انتخاب صریح نیز بستهٔ آغازگر و منبع را جعل می‌کند.
- **نصب برنامه به‌عنوان سیستمی:** یک برنامهٔ نصب‌شده را بدون دست‌زدن به پارتیشن واقعی `/system` به‌عنوان
  برنامهٔ سیستمی سوار کنید (زیرماژول روکشِ بدون‌سیستم، آگاه از NoMount).
- **پس‌زمینه:** پشتیبان‌گیری/بازیابی جدا اجرا می‌شود و پس از بستن WebUI باقی می‌ماند، با اعلان‌های
  شروع/پایان.
- **ورود (کوچ):** پشتیبان‌های موجودِ Neo-Backup و Android-DataBackup را وارد می‌کند،
  از جمله موارد رمزنگاری‌شده با گذرواژه.

## نصب

1. آخرین `VD-Backup-vX.Y.zip` را از [نسخه‌ها](https://github.com/VD171/VD-Backup/releases) دانلود کنید.
2. آن را در مدیرِ KernelSU / APatch / Magisk فلش کنید, بی‌درنگ قابل استفاده، بدون نیاز به راه‌اندازی مجدد.
3. **WebUI** ماژول را باز کنید تا پشتیبان‌ها را پیکربندی و اجرا کنید. همین.

**نسخه‌ها.** هر انتشار شامل شش فایل zip است. `universal-full`, همهٔ معماری‌ها و همهٔ باینری‌ها به‌صورت تعبیه‌شده (شامل `rclone` برای ارائه‌دهندگان ابری و `restic` برای عکس‌های فوری)، کاملاً آفلاین و هرگز چیزی دانلود نمی‌شود، روی هر دستگاهی کار می‌کند، بزرگ‌ترین. `universal-lite`, همهٔ معماری‌ها بدون دو باینری بزرگ‌تر (`rclone`، `restic`)، کوچک‌ترین؛ همچنان پشتیبان‌گیری محلی، SSH/SFTP و `rsync` را بدون هیچ دانلودی انجام می‌دهد، و نخستین باری که از یک مقصد ابری (`rclone`) یا حالت عکس فوری (`restic`) استفاده کنید، پیشنهاد می‌دهد آن افزونهٔ کوچکِ مخصوص معماری را یک بار دانلود کند (تأییدشده با SHA-256) و آن را کَش می‌کند، تا آن قابلیت‌ها نیز کار کنند. `<abi>-full` (`arm64-v8a`، `armeabi-v7a`، `x86`، `x86_64`), یک معماری واحد با همهٔ باینری‌ها به‌صورت تعبیه‌شده، کوچک‌تر از `universal-full`. معماری خود را می‌دانید؟ `<abi>-full` را انتخاب کنید؛ کوچک‌ترین را می‌خواهید و با یک دانلود یک‌باره برای ابر یا عکس‌های فوری مشکلی ندارید؟ `universal-lite`؛ همه‌چیز را تعبیه‌شده و بدون هیچ دانلودی می‌خواهید (آفلاین / بازیابی)؟ یک نسخهٔ full. [نسخه‌ها](https://github.com/VD171/VD-Backup/releases) را ببینید.

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

## سازگار با هوش مصنوعی

VDBackup طوری ساخته شده که نه‌فقط برای مردم، بلکه برای دستیارها و عامل‌های هوش مصنوعی نیز
پذیرا باشد. موتور JSON صحبت می‌کند (هر فعلِ `helper.sh` یک شیء JSON واحد برمی‌گرداند)، و کد،
مستندات و ساختار فایل برای خواندنِ ماشینی چیده شده‌اند، و مشارکت‌های یاری‌شده با هوش مصنوعی مانند
هر مشارکت دیگری بازبینی و پذیرفته می‌شوند. یک عامل می‌تواند **هر** عملِ ماژول را بدون رابط از طریق
همان APIای که WebUI به کار می‌برد اداره کند, برای سطح کنترل کامل به
**[docs/AI-AGENTS.md](docs/AI-AGENTS.md)** و برای مشارکت به
[CONTRIBUTING.md](CONTRIBUTING.md#ai-contributors-welcome) نگاه کنید.

## مستندات

- **[ویکی](https://github.com/VD171/VD-Backup/wiki)**: مستندات، قابل مرور به‌صورت آنلاین.
- **[راهنمای کاربر](https://github.com/VD171/VD-Backup/wiki/USER-GUIDE)**: سرتاسری، از نصب تا بازیابی.
- **[عامل‌های هوش مصنوعی](https://github.com/VD171/VD-Backup/wiki/AI-AGENTS)**: هر عمل را بدون رابط از طریق API مبتنی بر JSON هدایت کنید.
- **[معماری](https://github.com/VD171/VD-Backup/wiki/ARCHITECTURE)** و **[ساختار فایل](https://github.com/VD171/VD-Backup/wiki/FILE-STRUCTURE)**: چگونه کار می‌کند.
- **[باینری‌های همراه](https://github.com/VD171/VD-Backup/wiki/BINARIES)**: منشأ و SHA-256 هر باینری از پیش‌کامپایل‌شده، برای حسابرسی کامل.
- **[بازیابی](https://github.com/VD171/VD-Backup/wiki/RECOVERY)**: یک پشتیبان را روی رایانه و بدون ماژول باز و رمزگشایی کنید.
- **[مشارکت](https://github.com/VD171/VD-Backup/wiki/CONTRIBUTING)** و **[امنیت](https://github.com/VD171/VD-Backup/wiki/SECURITY)**.
- **[تغییرات](https://github.com/VD171/VD-Backup/wiki/CHANGELOG)** و **[مرامنامه](https://github.com/VD171/VD-Backup/wiki/CODE_OF_CONDUCT)**.

<!-- /vd-docs -->

## همچنین ببینید

پروژه‌های خواهرِ همین نویسنده:

- **[VDInfos](https://github.com/VD171/VD-Infos)**: یک اشکال‌زدای روش‌های دستگاه: هر مورد را از طریق هر روشی که می‌تواند آن را بخواند می‌خواند و آن‌ها را کنار هم مقایسه می‌کند.
- **[VDGoogle](https://github.com/VD171/VD-Google)**: سرویس‌های Google شما (RCS، Wallet، گواهی‌های Play Integrity)، روی دستگاهتان و بدون اینترنت خوانده می‌شوند.
- **[COPG-VD](https://github.com/VD171/COPG-VD)**: یک جاعلِ دستگاه که یک اثرانگشت تازه را به یک پروفایلِ منسجم و یکدست تبدیل می‌کند.

## تماس

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Channel:** @Priv8_VD https://t.me/Priv8_VD
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **XDA thread:** https://xdaforums.com/t/VD-Backup.4807267/
* **GitHub:** @VD171 https://github.com/VD171

## مجوز

[GNU AGPL-3.0-or-later](LICENSE). کپی‌لفتِ شبکه‌ای: اگر نسخه‌ای تغییریافته را اجرا کنید،
حتی به‌صورت یک سرویس، باید منبع آن را عرضه کنید.

## علائم تجاری

VD Backup یک پروژهٔ مستقل و غیررسمی است. این پروژه به Google LLC یا هیچ فروشندهٔ دیگری وابسته نیست و مورد تأیید یا پشتیبانی مالی آن‌ها نیز قرار ندارد. "Google Drive"، "Android" و نام‌ها و نشان‌های مرتبط، علامت‌های تجاری صاحبان مربوط به خود هستند. VD Backup روی دستگاه شما اجرا می‌شود و فقط در مقصدهایی که پیکربندی می‌کنید بارگذاری می‌کند.

## Tags

`android` `backup` `restore` `app-data` `migration` `neo-backup` `databackup` `kernelsu` `apatch` `magisk` `webui` `root` `tar` `zstd` `restic` `rclone` `age` `encryption` `ssaid` `appops` `on-device` `agpl` `ai-friendly` `vdbackup`
