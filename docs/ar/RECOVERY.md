> **Languages:** [English](../../module/etc/RECOVERY.md) · العربية · [Čeština](../cs/RECOVERY.md) · [Deutsch](../de/RECOVERY.md) · [Español](../es/RECOVERY.md) · [فارسی](../fa/RECOVERY.md) · [Français](../fr/RECOVERY.md) · [हिन्दी](../hi/RECOVERY.md) · [Bahasa Indonesia](../id/RECOVERY.md) · [Italiano](../it/RECOVERY.md) · [日本語](../ja/RECOVERY.md) · [한국어](../ko/RECOVERY.md) · [Nederlands](../nl/RECOVERY.md) · [Polski](../pl/RECOVERY.md) · [Português](../pt/RECOVERY.md) · [Русский](../ru/RECOVERY.md) · [Svenska](../sv/RECOVERY.md) · [ไทย](../th/RECOVERY.md) · [Türkçe](../tr/RECOVERY.md) · [Українська](../uk/RECOVERY.md) · [Tiếng Việt](../vi/RECOVERY.md) · [中文](../zh/RECOVERY.md)

---

# VDBackup, استرداد نسخة احتياطية على حاسوب شخصي (Windows / macOS / Linux)

تستخدم نسخك الاحتياطية من VDBackup **صيغا قياسية**، فيمكنك فتحها في أي مكان،
دون هذه الوحدة. يحتوي مجلد النسخة الاحتياطية على `manifest.json`، وملفات APK
(`*.apk.zst`) وأرشيفات البيانات (`<item>.tar.zst`، `.tar.gz` أو `.tar.lz4`)،
مشفرة اختياريا بـ `.age` لاحقة.

**إن كانت البيانات مشفرة**، فإن البيانات الوصفية مشفرة أيضا، فلا يتسرب منها شيء إلى
من يملك الملفات فقط. عندئذ يحتوي المجلد أيضا على `manifest.full.age` (البيان الكامل)
وملفين صغيرين `stub.*.age`. في تلك الحالة لا يكون `manifest.json` سوى علامة صغيرة غير
حساسة؛ أما التفاصيل الحقيقية فتوجد في `manifest.full.age`. كل ما هو قابل للنقل (أرشيفات
البيانات و`manifest.full.age`) يُفك تشفيره بـ**عبارة المرور** وحدها - راجع الخطوة 1. أما
ملفا `stub.dev.age` / `stub.pass.age` فليسا سوى ذاكرة التخزين المؤقتة للقوائم على الجهاز
الخاصة بالوحدة؛ ويمكنك تجاهلهما على الحاسوب.

## أدوات قد تحتاجها

- **zstd**: https://github.com/facebook/zstd/releases  (macOS: `brew install zstd`؛ Linux: `apt install zstd`)
- **age** (فقط لملفات `.age`): https://github.com/FiloSottile/age/releases
- `tar` مدمج في macOS وLinux وWindows 10/11 الحديثة.
- `gzip` مدمج في كل مكان؛ لـ `.tar.gz` لا تحتاج شيئا إضافيا.

## 1. فك التشفير (فقط إن انتهى الملف بـ `.age`)

عبارة المرور (الطريقة القابلة للنقل - تعمل على أي حاسوب بعبارة المرور وحدها):

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

افعل الشيء ذاته لكل ملف `*.age` (ملفات APK وأرشيفات البيانات). إن كانت النسخة الاحتياطية
مشفرة، ففك تشفير `manifest.full.age` بالطريقة ذاتها لقراءة البيان الكامل:

```
age -d -o manifest.json  manifest.full.age    # the full, readable manifest
```

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
  المالك/السياق الأصلي. إنه مصدر الحقيقة. في النسخة الاحتياطية المشفرة يكون البيان
  الكامل هو `manifest.full.age` (فك تشفيره كما في الخطوة 1)؛ أما `manifest.json` بنصه
  الصريح فليس سوى علامة صغيرة ولا يحمل أي بيانات حساسة.
- لا شيء هنا مرتبط بجهاز محدد: عبارة المرور ذاتها تعمل على أي آلة.

<!-- doc-footer -->

---

> _تم إنشاء هذا التوثيق باستخدام Claude (Anthropic) ويتولى صيانته VD171. التصحيحات والتحسينات مرحّب بها؛ راجع [CONTRIBUTING.md](CONTRIBUTING.md)._
