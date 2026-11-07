> **Languages:** [English](../../CONTRIBUTING.md) · العربية · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# المساهمة في VDBackup

شكرا على مساعدتك! صُمم VDBackup ليكون سهل المساهمة. يرشدك هذا الدليل
إلى مواضع الأشياء والأعراف القليلة التي نتبعها.

## المشروع في لمحة

VDBackup هو **وحدة WebUI لـ KernelSU/APatch/Magisk**: نصوص صدفية + واجهة
WebUI بـ vanilla-JS + ملفات تنفيذية ساكنة لكل ABI. لا حاجة إلى تطبيق للميزات الأساسية. انظر
[ARCHITECTURE.md](ARCHITECTURE.md) و[docs/FILE-STRUCTURE.md](FILE-STRUCTURE.md).

إنه **الخليفة** المفتوح والأصيل في صلاحية الجذر لـ **Swift Backup وNeo-Backup و
Android-DataBackup** - اتحاد ميزاتها تحت رخصة AGPLv3، مع استيراد
النسخ الاحتياطية الموجودة من Neo-Backup وAndroid-DataBackup حتى يتمكن الناس من الانتقال.

## المساهمون من الذكاء الاصطناعي موضع ترحيب

مساعدو الذكاء الاصطناعي ووكلاؤه مساهمون من الدرجة الأولى هنا، لا مجرد فكرة لاحقة.

- بُني المشروع ليكون قابلا للقراءة آليا: كل فعل في `helper.sh` يطبع كائن
  JSON واحدا، والمحرك صدفة POSIX خالصة، وتخطيط الملفات موثق في
  [docs/FILE-STRUCTURE.md](FILE-STRUCTURE.md).
- يستطيع الوكيل أن يدير **كل** محتوى وفعل في الوحدة بلا واجهة من خلال
  واجهة JSON تلك - سطح التحكم الكامل والأفعال وحواجز الأمان موجودة في
  [docs/AI-AGENTS.md](AI-AGENTS.md).
- تُراجع الرقع المدعومة بالذكاء الاصطناعي وتُقبل بالشروط ذاتها كأي رقعة أخرى - بحسب
  الصحة والوضوح والأعراف أدناه، لا بحسب من (أو ما) كتبها.
- إذا كنت تقود VDBackup من وكيل، فاستخدم مخرجات JSON لـ `helper.sh`
  بوصفها العقد؛ لا تكشط واجهة WebUI.
- المعيار ذاته للجميع: الميزات الحقيقية لا تُضعَف أبدا، والأسرار وبيانات الجهاز
  لا تدخل المستودع أبدا (انظر [.gitignore](.gitignore) الصارم)، وتبقى
  الأفعال المغيِّرة مؤكَّدة ومدققة.

## إعداد التطوير

- تحتاج إلى جهاز/محاكي مروَّت (KernelSU أو APatch أو Magisk) للاختبار.
- ابن الملف المضغوط القابل للفلاش: `cd module && zip -r9 ../VD-Backup-dev.zip .` ثم افلشه.
- واجهة WebUI موجودة في `module/webroot/` (افتحها من مدير الجذر). الخلفية هي
  `module/helper.sh` (الموزع) و`module/worker.sh` (المحرك المنفصل).
- الملفات التنفيذية الأصيلة تقيم في `module/bin/<abi>/` وتنتجها CI
  (`.github/scripts/build_bin.sh`)؛ لا تعيد بناءها يدويا في العادة.

## الأعراف

- **كل ملف مصدري** (`.sh`, `.js`, `.css`, `.html`, `.svg`, `.yml`) يبدأ بترويسة
  لافتة المشروع (انسخها من أي ملف موجود). لا استثناءات.
- **الشفرة والتعليقات بالإنجليزية.** أبق التعليقات في حدها الأدنى وحيث تلزم فقط.
- **لا شرطة em أو en**؛ استخدم دائما شرطة عادية `-`.
- واجهة WebUI هي **vanilla JS** (ملف `scripts.js` واحد)؛ بلا أطر عمل. تواصل مع الجذر فقط عبر
  غلاف `helper(verb, args)`، واهرب (escape) كل قيمة مُدمجة.
- **لا تُضعِف أبدا** ميزة حقيقية (مثل الحفاظ على SELinux/uid/gid/الأوضاع).
- الأفعال المغيِّرة (الاستعادة، الحذف) يجب أن تطلب التأكيد وتكتب سجل تدقيق.

## التدويل (i18n)

- سلاسل الواجهة تقيم في `module/webroot/lang/`. الإنجليزية هي الحل الاحتياطي المرجعي
  (`en.js` + `en.json`)؛ اللغات العشرون الأخرى هي `<code>.json`.
- لإضافة سلسلة أو تغييرها: عدّل `en.js` **و** `en.json`، ثم حدّث كل
  `<code>.json`. لمس أي عنوان مرئي يعني تحديث **كل** ملفات اللغة و
  **كل** `README.<code>.md`.
- الترجمات هي JSON بسيط - مساهمة أولى رائعة. انظر قائمة اللغات في
  `module/webroot/i18n.js`.

## الالتزامات وطلبات السحب

- أبقِ طلبات السحب مركزة. صِف ما ولماذا.
- وقّع التزاماتك (DCO): `git commit -s` (يضيف `Signed-off-by:`).
- يجب أن تبقى CI خضراء. كن لطيفا في المراجعات - انظر [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## مسائل أولى جيدة

ابحث عن وسمَي `good first issue` و`help wanted`. الترجمات، والتوثيق، والإعدادات
المسبقة الجديدة لوجهات `rclone`، وتحسين واجهة WebUI كلها نقاط انطلاق رائعة.

*أُنشئت هذه الوثائق بمساعدة Claude (Anthropic) ويتولى صيانتها VD171. التصحيحات والتحسينات مرحب بها - انظر [CONTRIBUTING.md](CONTRIBUTING.md).*
