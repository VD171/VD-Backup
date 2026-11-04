> **Languages:** [English](../AI-AGENTS.md) · العربية · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../in/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# تشغيل VDBackup من وكيل ذكاء اصطناعي

صُمم VDBackup بحيث يستطيع مساعد أو وكيل ذكاء اصطناعي إدارة **كل** محتوى
وإجراء في الوحدة دون واجهة رسومية، تماما مثلما يفعل الإنسان عبر الـ WebUI. إن
الـ WebUI ليس إلا أحد عملاء واجهة JSON صغيرة؛ ووكيلك عميل آخر. استخدم الواجهة،
ولا تكشط الـ WebUI.

## العقد

كل شيء يمر عبر نقطة دخول واحدة، تُشغَّل بصلاحية الجذر على الجهاز:

```
sh /data/adb/modules/vdbackup/scripts/helper.sh <verb> <base64(JSON-args)>
```

- الوسائط كائن JSON واحد، **مُرمَّز بـ base64**، يُمرَّر كرمز argv واحد.
- يطبع الأمر **كائن JSON واحدا** على stdout: `{"ok":true,...}` أو
  `{"ok":false,"code":"ERR_...","message":"..."}`. حلّل ذلك؛ ولا تكشط النص أبدا.
- العمليات الطويلة (`backup` و`restore` و`import`) تُرجع `{"ok":true,"opid":"..."}`
  فورا وتعمل **منفصلة** (تبقى حية حتى لو اختفى المستدعي أو الـ WebUI). استطلع
  تقدمها؛ فهي لم تنتهِ عندما يعود النداء.
- يأخذ `progress` و`cancel` قيمة **base64 لسلسلة opid الخام**، لا كائن JSON.

مساعد صغير لصدفتك:

```sh
b64() { printf '%s' "$1" | base64 -w0; }
H=/data/adb/modules/vdbackup/scripts/helper.sh
sh "$H" backup "$(b64 '{"package":"com.example.app","mode":"full"}')"
```

لتشغيله من محطة عمل، نفّذ ذلك عبر قناة الجذر المعتادة إلى الجهاز
(adb shell بصلاحية الجذر، أو إعداد SSH إلى الجذر). تُرفق الوحدة بملفات ثنائية
مُضمَّنة، لذا لا تحتاج بعد التثبيت إلى **أي إنترنت** للنسخ الاحتياطي والاستعادة
المحليين؛ وحدها وجهات السحابة (`rclone`/`restic`/ssh) تتصل بالشبكة.

## الأفعال

| الفعل | الوسائط (JSON) | المُرجَع |
|------|-------------|---------|
| `ping` | `{}` | `{ok,version,abi}` |
| `config-get` | `{}` | `{ok,config}` |
| `config-set` | كائن الإعداد (أو `{key,value}`) | `{ok}` |
| `keygen` | `{}` | يولّد زوج مفاتيح `age` للتشفير |
| `list-apps` | `{user?}` | `{ok,apps:[{package,label,system,versionCode}]}` (dex، مع ارتداد إلى الصدفة) |
| `label` | `{package,user?}` | `{ok,label}` (اسم التطبيق المحلي الحقيقي، بلا سياق) |
| `icon` | `{package,user?,vc?}` | `{ok,package,icon}` (base64 PNG؛ مُخزَّن مؤقتا لكل package+`vc`) |
| `backup` | انظر أدناه | `{ok,opid}` (منفصل) |
| `restore` | انظر أدناه | `{ok,opid}` (منفصل) |
| `import` | `{from,ref,password,ssaid,user}` | `{ok,opid}` (منفصل) |
| `import-scan` | `{from,path}` | `{ok,backups:[...]}` |
| `progress` | base64(opid) | ملف `progress-<opid>.json` الحي |
| `cancel` | base64(opid) | `{ok,cancelled}` |
| `list-ops` | `{}` | `{ok,ops:[...]}` (إعادة الارتباط بعد إعادة الاتصال) |
| `list-apps`/`icons` | `{user?}` / `{user?,items:[{package,vc}]}` | قائمة التطبيقات / أيقونات base64 بالدفعة |
| `list-backups` | `{package?}` | `{ok,backups:[{ref,package,label,versionName,versionCode,created_at,mode,items}]}` |
| `backup-info` | `{ref}` | `{ok,...}` تفاصيل نسخة احتياطية واحدة كاملة (الإصدار، مصدر التثبيت، الحالة، التاريخ، الوضع، الحجم، العناصر، أعداد الأذونات، الجهاز) |
| `backup-icon` | `{ref}` | `{ok,icon}` base64 PNG من البيان (يعمل عندما يكون التطبيق غير مثبّت) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (يجب أن يكون ref ضمن دليل النسخ الاحتياطية) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` الاحتفاظ بأحدث N من حزمة |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` سجل التدقيق، الأحدث أولا |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` نسخ احتياطي على مستوى النظام (منفصل) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (يتطلب إعادة تشغيل؛ `confirm` يفعّله) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | تركيب تطبيق مثبّت كتطبيق نظام (وحدة فرعية بلا نظام؛ حي عبر NoMount وإلا في الإقلاع التالي) |
| `companion-status` / `companion-install` | `{}` | حالة مرافق Google Drive / التثبيت عند الطلب |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | إدارة الوجهات |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | إدارة أجهزة rclone البعيدة (تنشئ إدخال `rclone.conf` الذي تشير إليه وجهة من نوع `type:"rclone"`) |
| `schedule-set` / `schedule-list` / `schedule-delete` | `{id,package,mode,dest,cron,at,keep,items}` | المهام المجدولة |
| `scheduler-tick` | `{}` | يشغّل المهام المستحقة + يطبّق الاستبقاء + مراقب النسخ التلقائي (نبضة الإقلاع تستدعي هذا) |

### وسائط `backup`

```json
{
  "package": "com.example.app",
  "user": 0,
  "mode": "full",                 // full | snapshot | mirror
  "compression": "zstd:10",       // none | lz4 | zstd[:N] | gzip
  "items": ["apk","data","data_de","obb","external","media"],
  "encrypt_data": false,
  "encrypt_apk": false,
  "dest": "local",                // local | <destination id>
  "verify": true,                 // re-hash each archive vs the manifest (default on for Full)
  "dry_run": false,               // true = report a size plan, write nothing
  "ssaid": false                  // OPT-IN, see below
}
```

يأخذ `restore`/`import` قيمة `{ref}` (دليل نسخة احتياطية / مرجع مسح). كما يقبل
`restore`: `"items"` (مجموعة فرعية من أنواع عناصر النسخة الاحتياطية المراد استعادتها؛
احذفه للكل)، و`"test": true` (يستخرج إلى دليل مؤقت ويتحقق، دون المساس بالتطبيق الحي)،
و`"mode"` للقطة snapshot أو المرآة mirror، و`"password"` لنسخة احتياطية مشفرة،
و`"ssaid"` (باختيار صريح)، وخياري مصدر التثبيت `"spoof_installer"` (افتراضيه من الإعداد،
يضبط المثبّت على متجر Play وقت التثبيت) و`"deep_spoof": true` (متقدم باختيار صريح؛ يزيّف
أيضا الحزمة المُبادِرة ومصدر الحزمة بتحرير قاعدة بيانات الحزم، ويُطبَّق بعد إعادة التشغيل).
ويأخذ `import` القيمة `"from": "neo" | "databackup"`، ومن أجل نسخة Neo مشفرة، القيمة
`"password"`.

### وسائط `remote-add`

وجهة السحابة هي وجهة من نوع `type:"rclone"` تسمّي جهاز `rclone` بعيدا؛ أنشئ ذلك
الجهاز البعيد أولا بـ `remote-add`. تُخزَّن حقول كلمات المرور مُعتَّمة، لا بنص
صريح أبدا. قيم `backend` المدعومة ومعاملاتها `params`:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

لـ Google Drive مساران: جهاز `drive` البعيد هذا (لا يحتاج مشروع Google Cloud،
يستخدم نظام OAuth الخاص بـ rclone - شغّل `rclone authorize "drive"` مرة واحدة على
أي حاسوب ومرّر الرمز) أو التطبيق المرافق الاختياري (معرّف عميل OAuth الخاص بك).
كلاهما ينتهي بوصفه وجهات عادية.

### سياسة الشبكة

يتحكم حقل الإعداد `network_policy` في نوع الاتصال الذي يجوز لعمليات نقل السحابة
استخدامه: `any` (الافتراضي)، أو `wifi`، أو `mobile`. اضبطه بـ `config-set`. وعندما
يكون `wifi` أو `mobile`، يفحص كل نقل سحابي (رفع Full عبر `rclone`/Drive، مزامنة
Mirror، نسخ/استعادة لقطة `restic` البعيدة، استعادة Mirror) وسيلة النقل النشطة أولا
ويُجهَض بـ `ERR_NET_POLICY` إن لم تتطابق - وذلك للمهام اليدوية والمجدولة معا.
الوجهات المحلية لا تخضع لهذا القيد أبدا.

## حواجز الأمان التي يجب أن يحترمها وكيلك

- **`ssaid` اختياري بصرامة (مُعطَّل افتراضيا).** يأخذ نسخة احتياطية من / يستعيد
  مُعرّف ANDROID_ID للجهاز بإعادة كتابة ملف نظام؛ ولا تُطبَّق الاستعادة إلا بعد
  إعادة التشغيل، والملف السابق يُحفظ دائما أولا من أجل التراجع. أرسل
  `"ssaid": true` فقط بناء على طلب مباشر ومتعمَّد من المستخدم - لا تلقائيا أبدا.
- **الإجراءات المُغيِّرة (الاستعادة، الحذف، الاستيراد) مدمّرة** وتُسجَّل في سجل
  تدقيق محلي (`logs/audit.jsonl`). الاستعادة أمينة (مسح ثم استخراج)، فتعيد التطبيق
  إلى حالته المطابقة تماما في النسخة الاحتياطية. تأكد من النية قبل استدعائها.
- **لا تُضعِف أبدا** الحفظ (SELinux/uid/gid/الأنماط/xattr) ولا قاعدة ملف APK (تُضغط
  ملفات APK دائما، ولا تُشفَّر أبدا ما لم يُضبَط `encrypt_apk`).
- عامِل مخرجات JSON بوصفها مصدر الحقيقة؛ افحص `ok`/`code`، واستطلع `progress`،
  واعرض رموز `ERR_*` بدلا من التخمين.

انظر [ARCHITECTURE.md](ARCHITECTURE.md) و
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) للاطلاع على التفاصيل الداخلية.

---

*أُنشئت هذه الوثائق بمساعدة Claude (Anthropic) ويتولى صيانتها VD171. التصحيحات والتحسينات مرحب بها - انظر [CONTRIBUTING.md](CONTRIBUTING.md).*
