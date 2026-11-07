> **Languages:** [English](../../SECURITY.md) · العربية · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# سياسة الأمان

يعمل VDBackup بصلاحية الجذر ويتعامل مع بياناتك و(اختياريا) بيانات اعتمادك
وعبارات مرور التشفير. نحن نأخذ الأمان على محمل الجد.

## الإبلاغ عن ثغرة

- **الموقع:** https://vd171.ru
- **الموقع:** https://vd.priv8.ru
- **المسائل:** https://github.com/VD171/VD-Backup/issues (بلاغات غير أمنية فقط)
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **موضوع XDA:** https://xdaforums.com/t/VD-Backup.4807267/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **البريد الإلكتروني:** vd.priv8@pm.me

أرفق وصفا واضحا، وإن أمكن، خطوات إعادة الإنتاج. سنرد في
أقرب وقت ممكن وننسب الفضل إليك إن رغبت.

## ملاحظات النطاق

- تُخزَّن بيانات الاعتماد وعبارات المرور مشفرة أثناء السكون ولا تُكتب أبدا بنص
  صريح. لا تُربط النسخ الاحتياطية أبدا بمفاتيح أجهزة مقيدة بالعتاد (فتبقى
  قابلة للنقل)، وهذا يعني أيضا أن عبارة المرور هي ما يحمي النسخة الاحتياطية المشفرة -
  فاختر عبارة قوية.
- تطبيق Google Drive المرافق الاختياري يجب أن يُخفى دائما باستخدام HMA-OSS حتى لا
  يكشف عن الجذر أو أداة إقلاع مفتوحة القفل.
- تعمل الاستعادة بصلاحيات الجذر، لذا يُفحص كل أرشيف قبل كتابة أي شيء: فأي نسخة
  احتياطية تشير محتوياتها إلى خارج هدفها (مسار مطلق أو مكوّن `..`) تُرفض، ولا
  يُستخرج أي ملف حتى يجتاز الأرشيف كاملا الفحص.
- كل ملف ثنائي ومكتبة مبنيان مسبقا يمكن تتبعهما إلى مصدر أعلى عام مثبّت مع SHA-256 مسجّل، والبيان
  مرفق على الجهاز، بحيث يمكن تدقيق الحمولة المرفقة وإعادة إنتاجها. انظر [BINARIES.md](BINARIES.md).

*أُنشئت هذه الوثائق بمساعدة Claude (Anthropic) ويتولى صيانتها VD171. التصحيحات والتحسينات مرحب بها - انظر [CONTRIBUTING.md](CONTRIBUTING.md).*
