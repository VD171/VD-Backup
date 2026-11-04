> **Languages:** [English](../../module/RECOVERY.md) · [العربية](../ar/RECOVERY.md) · [Čeština](../cs/RECOVERY.md) · [Deutsch](../de/RECOVERY.md) · [Español](../es/RECOVERY.md) · فارسی · [Français](../fr/RECOVERY.md) · [हिन्दी](../hi/RECOVERY.md) · [Bahasa Indonesia](../in/RECOVERY.md) · [Italiano](../it/RECOVERY.md) · [日本語](../ja/RECOVERY.md) · [한국어](../ko/RECOVERY.md) · [Nederlands](../nl/RECOVERY.md) · [Polski](../pl/RECOVERY.md) · [Português](../pt/RECOVERY.md) · [Русский](../ru/RECOVERY.md) · [Svenska](../sv/RECOVERY.md) · [ไทย](../th/RECOVERY.md) · [Türkçe](../tr/RECOVERY.md) · [Tiếng Việt](../vi/RECOVERY.md) · [中文](../zh/RECOVERY.md)

---

# VDBackup - بازیابی یک بکاپ روی یک کامپیوتر (ویندوز / مک‌او‌اس / لینوکس)

بکاپ‌های VDBackup شما از **فرمت‌های استاندارد** استفاده می‌کنند، پس می‌توانید آن‌ها را هر جا،
بدون این ماژول، باز کنید. یک پوشه بکاپ شامل یک `manifest.json`، APK‌ها
(`*.apk.zst`) و آرشیوهای داده (`<item>.tar.zst`، `.tar.gz` یا `.tar.lz4`) است،
به‌صورت اختیاری رمزنگاری‌شده با یک `.age` دنباله‌ای.

## ابزارهایی که ممکن است نیاز داشته باشید

- **zstd**: https://github.com/facebook/zstd/releases  (مک‌او‌اس: `brew install zstd`؛ لینوکس: `apt install zstd`)
- **age** (فقط برای فایل‌های `.age`): https://github.com/FiloSottile/age/releases
- `tar` در مک‌او‌اس، لینوکس و ویندوز ۱۰/۱۱ مدرن توکار است.
- `gzip` همه جا توکار است؛ برای `.tar.gz` به چیز اضافی نیاز ندارید.

## 1. رمزگشایی (فقط اگر فایل به `.age` ختم شود)

فایل کلید (توصیه‌شده):

```
age -d -i age.key -o data.tar.zst  data.tar.zst.age
```

عبارت‌عبور:

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

همین کار را برای هر فایل `*.age` انجام دهید (APK‌ها و آرشیوهای داده).

## 2. فشرده‌گشایی + استخراج

`.tar.zst`:

```
zstd -d data.tar.zst            # -> data.tar
tar  -xf data.tar               # extracts the files
```

`.tar.gz`:

```
tar -xzf data.tar.gz
```

`.tar.lz4` (zstd فرمت lz4 را می‌خواند):

```
zstd -d --format=lz4 data.tar.lz4 -o data.tar
tar  -xf data.tar
```

APK‌ها فقط فایل‌های APK (ZIP) فشرده‌شده با zstd هستند:

```
zstd -d base.apk.zst            # -> base.apk  (a normal installable APK)
```

## نکات

- فایل‌های استخراج‌شده مسیرهای نسبی‌شان را نگه می‌دارند؛ کانتکست SELinux، uid/gid و modes
  درون tar هستند (و فقط زمانی که روی اندروید بازیابی می‌کنید به‌درستی دوباره اعمال می‌شوند).
- `manifest.json` دقیقاً توصیف می‌کند که هر فایل چیست، نسخه اپ و
  مالک/کانتکست اصلی. منبع حقیقت است.
- هیچ چیز اینجا به یک دستگاه خاص گره نخورده است: همان عبارت‌عبور/فایل کلید روی هر
  ماشینی کار می‌کند.
