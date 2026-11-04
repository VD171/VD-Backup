> **Languages:** [English](../../module/RECOVERY.md) · العربية · [Čeština](../cs/RECOVERY.md) · [Deutsch](../de/RECOVERY.md) · [Español](../es/RECOVERY.md) · [فارسی](../fa/RECOVERY.md) · [Français](../fr/RECOVERY.md) · [हिन्दी](../hi/RECOVERY.md) · [Bahasa Indonesia](../in/RECOVERY.md) · [Italiano](../it/RECOVERY.md) · [日本語](../ja/RECOVERY.md) · [한국어](../ko/RECOVERY.md) · [Nederlands](../nl/RECOVERY.md) · [Polski](../pl/RECOVERY.md) · [Português](../pt/RECOVERY.md) · [Русский](../ru/RECOVERY.md) · [Svenska](../sv/RECOVERY.md) · [ไทย](../th/RECOVERY.md) · [Türkçe](../tr/RECOVERY.md) · [Tiếng Việt](../vi/RECOVERY.md) · [中文](../zh/RECOVERY.md)

---

# VDBackup - استرداد نسخة احتياطية على حاسوب شخصي (Windows / macOS / Linux)

تستخدم نسخك الاحتياطية من VDBackup **صيغا قياسية**، فيمكنك فتحها في أي مكان،
دون هذه الوحدة. يحتوي مجلد النسخة الاحتياطية على `manifest.json`، وملفات APK
(`*.apk.zst`) وأرشيفات البيانات (`<item>.tar.zst`، `.tar.gz` أو `.tar.lz4`)،
مشفرة اختياريا بـ `.age` لاحقة.

## أدوات قد تحتاجها

- **zstd**: https://github.com/facebook/zstd/releases  (macOS: `brew install zstd`؛ Linux: `apt install zstd`)
- **age** (فقط لملفات `.age`): https://github.com/FiloSottile/age/releases
- `tar` مدمج في macOS وLinux وWindows 10/11 الحديثة.
- `gzip` مدمج في كل مكان؛ لـ `.tar.gz` لا تحتاج شيئا إضافيا.

## 1. فك التشفير (فقط إن انتهى الملف بـ `.age`)

ملف المفتاح (موصى به):

```
age -d -i age.key -o data.tar.zst  data.tar.zst.age
```

عبارة المرور:

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

افعل الشيء ذاته لكل ملف `*.age` (ملفات APK وأرشيفات البيانات).

## 2. فك الضغط + الاستخراج

`.tar.zst`:

```
zstd -d data.tar.zst            # -> data.tar
tar  -xf data.tar               # extracts the files
```

`.tar.gz`:

```
tar -xzf data.tar.gz
```

`.tar.lz4` (يقرأ zstd صيغة lz4):

```
zstd -d --format=lz4 data.tar.lz4 -o data.tar
tar  -xf data.tar
```

ملفات APK مجرد ملفات APK (ZIP) مضغوطة بـ zstd:

```
zstd -d base.apk.zst            # -> base.apk  (a normal installable APK)
```

## ملاحظات

- تحتفظ الملفات المستخرجة بمساراتها النسبية؛ سياق SELinux وuid/gid والأوضاع
  موجودة داخل tar (وتُعاد تطبيقها بشكل صحيح فقط عند استعادتك على أندرويد).
- يصف `manifest.json` بدقة ما هو كل ملف وإصدار التطبيق و
  المالك/السياق الأصلي. إنه مصدر الحقيقة.
- لا شيء هنا مرتبط بجهاز محدد: عبارة المرور/ملف المفتاح ذاتها تعمل على أي
  آلة.
