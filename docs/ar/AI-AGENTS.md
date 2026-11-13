> **Languages:** [English](../AI-AGENTS.md) · العربية · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../in/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Українська](../uk/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

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
| `overview` | `{user?}` | `{ok:true,apps,instances,path_backups,jobs,backups_size,free,total}` أعداد (الأحجام بالبايت): التطبيقات التي لها نسخ احتياطية، وإجمالي نسخ النسخ الاحتياطية، ونسخ المسارات المستقلة، والمهام المجدولة، وإجمالي حجم النسخ الاحتياطية، والمتاح/الإجمالي لنظام ملفات النسخ الاحتياطية. غير منفصلة، تعود فورا؛ تستخدمها النظرة العامة للصفحة الرئيسية في الـ WebUI. |
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
| `list-users` | `{}` | `{ok,users:[{id,name}]}` مستخدمو أندرويد في الجهاز (متعدد المستخدمين). |
| `list-dirs` | `{path}` | `{ok,path,parent,dirs:[...]}` المجلدات الفرعية لمسار (منتقي المجلدات). |
| `path-list` | `{user?}` | `{ok,backups:[...]}` نسخ احتياطية مستقلة لمجلد/ملف. |
| `provenance` | `{}` | بيان تدقيق الثنائيات المضمَّنة (`PROVENANCE.json`). |
| `backup-info` | `{ref}` | `{ok,...}` تفاصيل نسخة احتياطية واحدة كاملة (الإصدار، مصدر التثبيت، الحالة، التاريخ، الوضع، الحجم، العناصر، أعداد الأذونات، الجهاز) |
| `backup-icon` | `{ref}` | `{ok,icon}` base64 PNG من البيان (يعمل عندما يكون التطبيق غير مثبّت) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (يجب أن يكون ref ضمن دليل النسخ الاحتياطية) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` الاحتفاظ بأحدث N من حزمة |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` سجل التدقيق، الأحدث أولا |
| `log-export` | `{user?}` | `{ok:true,path}` (المسار المطلق لملف `.txt` مكتوب داخل دليل النسخ الاحتياطية) أو `{ok:false,code:"ERR_LOG_EXPORT"}`. يكتب سجل النشاط (`audit.jsonl`) بالإضافة إلى ترويسة قصيرة للبناء/الجهاز في ملف نصي واحد مرئي للمستخدم بحيث يمكن إرفاقه بتقرير خطأ. غير منفصلة، تعود فورا. |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth/calendar/wallpaper/dns/system_settings) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` نسخ احتياطي على مستوى النظام (منفصل) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (يتطلب إعادة تشغيل؛ `confirm` يفعّله) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `path-backup` | `{path,compression?,password?}` | `{ok,opid}` نسخ احتياطي لأي مسار مطلق بصيغة `tar.zst`+`manifest.json` تحت `.paths/` (منفصل) |
| `path-restore` | `{ref,confirm:true,password?}` | `{ok,opid}` استعادة نسخة مسار إلى موقعها الأصلي (`confirm` يفعّلها؛ منفصل) |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | تركيب تطبيق مثبّت كتطبيق نظام (وحدة فرعية بلا نظام؛ حي عبر NoMount وإلا في الإقلاع التالي) |
| `companion-status` / `companion-install` | `{}` | حالة مرافق Google Drive / التثبيت عند الطلب |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | إدارة الوجهات |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | إدارة أجهزة rclone البعيدة (تنشئ إدخال `rclone.conf` الذي تشير إليه وجهة من نوع `type:"rclone"`)؛ قد يكون `backend` أي backend من rclone، بلا قائمة سماح |
| `remote-authorize` | `{backend}` | `{ok:true,url}` (فتح المحرك بالفعل متصفح الهاتف على عنوان الموافقة ذاك عبر نية Android VIEW) أو `{ok:false,code:"ERR_AUTHORIZE"}`. يشغّل `rclone authorize <backend>` على خادم رد نداء محلي (`127.0.0.1:53682`) من أجل OAuth على الجهاز. |
| `remote-authorize-poll` | `{}` | `{ok:true,done:false,url}` أثناء الانتظار، و`{ok:true,done:true,token}` بمجرد موافقة المستخدم (الـ `token` الذي يُمرَّر إلى `remote-add`)، أو `{ok:false,code:"ERR_AUTHORIZE"}`. |
| `remote-authorize-cancel` | `{}` | `{ok:true,cancelled:true}`؛ يوقف عملية تفويض معلّقة. |
| `cloud-status` | `{}` | `{ok,rclone,restic,fetchable,size}` (هل الملفان الثنائيان `rclone`/`restic` موجودان، هل تستطيع هذه النسخة `lite` جلبهما، وحجم التنزيل بالبايت) |
| `cloud-fetch` | `{}` | `{ok,opid}` (منفصل) تنزيل+تحقق+تثبيت إضافة `rclone`/`restic` على نسخة `lite` |
| `schedule-set` / `schedule-list` / `schedule-delete` | انظر أدناه | مهام مجدولة (نسخ احتياطي أو استعادة؛ تستهدف تطبيقا واحدا أو مجموعة أو كل التطبيقات) |
| `scheduler-tick` | `{}` | يشغّل المهام المستحقة + يطبّق الاستبقاء + مراقب النسخ التلقائي (نبضة الإقلاع تستدعي هذا) |
| `update-check` | `{}` | `{ok,current_version,current_code,latest_version,latest_code,update_available,zipUrl,changelog,notes}` (غير منفصل؛ يعود فورًا؛ `ERR_UPDATE_CHECK` عند الفشل, انظر أدناه) |
| `backup-batch` | `{packages:[...], ...backup args}` | `{ok,opid}` (detached) ينسخ احتياطيًا تطبيقات كثيرة في عملية منفصلة واحدة؛ يحمل التقدم `n`/`of`. فشل تطبيق واحد لا يوقف الدفعة. |
| `restore-batch` | `{refs:[...], ...restore args}` | `{ok,opid}` (detached) يستعيد نسخًا كثيرة في عملية منفصلة واحدة؛ يحمل التقدم `n`/`of`. فشل تطبيق واحد لا يوقف الدفعة. |
| `list-volumes` | `{}` | `{ok,volumes:[{path,removable,id?}]}` وحدات التخزين لمنتقي المجلدات: الداخلي بالإضافة إلى بطاقة SD / USB القابلة للإزالة. |
| `config-export` | `{password}` | `{ok,opid}` (detached) يصدّر الإعدادات والمهام والوجهات وبيانات الاعتماد والمفاتيح إلى ملف واحد مشفَّر بعبارة مرور، ضمن مجلد النسخ. |
| `config-import` | `{ref,password}` | `{ok,opid}` (detached) يدمج ملف إعدادات مُصدَّرًا في هذا الجهاز (لا يكتب فوقه أبدًا بشكل أعمى). |
| `config-exports` | `{}` | `{ok,exports:[{ref,name,size}]}` يسرد ملفات الإعدادات المشفَّرة المتاحة للاستيراد. |
| `wipe-credentials` | `{}` | `{ok,wiped}` يزيل كلمات المرور البعيدة المحفوظة ومفتاح تشفير الجهاز؛ تبقى الوجهات والمهام والنسخ. |
| `log-prune` | `{}` | `{ok}` يقلّم سجلات العمليات المنتهية منذ زمن، ويحدّ من سجل التدقيق، ويزيل الأيقونات القديمة (تستدعيه خدمة الإقلاع). |

### حقول `progress`

استطلاع `progress` يُرجع ملف `progress-<opid>.json` الحي للعملية. هذه الحقول **موجودة دائما**:

| الحقل | النوع | المعنى |
|-------|------|---------|
| `opid` | string | معرّف العملية |
| `percent` | int | نسبة الإنجاز 0-100 |
| `phase` | string | تسمية الطور الحالي |
| `item` | string | نوع العنصر الجاري معالجته |
| `done` | bool | يصير true عند كتابة نهائية (finish / dry-run / restore-test) |

قد تحمل العملية الجارية أيضا هذه الحقول الحية **الاختيارية**. تكون غائبة أو فارغة عند عدم
المعرفة، و**تُحذَف في الكتابات النهائية** (finish / dry-run / restore-test):

| الحقل | النوع | المعنى |
|-------|------|---------|
| `rate` | string | سرعة النقل، مثل `"4.2 MiB/s"` (فارغ = غير معروف) |
| `eta` | string | الوقت المتبقي المقدَّر، مثل `"1m12s"` (فارغ = غير معروف) |
| `n` | int | فهرس العنصر الحالي (0 = غير معروف) |
| `of` | int | إجمالي عدد العناصر (0 = غير معروف) |
| `cur` | string | اسم العنصر الحالي (فارغ = لا شيء) |

تملأ عمليات النقل السحابي `rate`/`eta` (تأتي النسبة من rclone)؛ وتملأ نسخ Full المحلية
`n`/`of`/`cur`. وتشمل تسميات الأطوار طور ختم المجموع الاختباري **`verified`**، ولعمليات
النقل السحابي **`transfer`** و**`mirror <item>`**.

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
  "ssaid": false,                 // OPT-IN, see below
  "manual": false                 // true = single interactive backup, keeps these exact items;
                                  // omit/false lets config.app_items (a per-app item map) override
                                  // the set on bulk, auto and scheduled runs
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

### وسائط `schedule-set`

تختار المهمة المجدولة **هدفا واحدا** و**إجراء** واحدا:

```json
{
  "id": "nightly-games",
  "action": "backup",             // "backup" (الافتراضي) | "restore"
  "package": "com.example.app",   // تطبيق واحد   (أو)
  "packages": ["com.a","com.b"],  // مجموعة تطبيقات   (أو)
  "all": true,                    // كل التطبيقات، ما عدا قائمة التطبيقات المستبعَدة
  "cron": "daily",                // hourly | daily | weekly
  "at": "02:30",                  // HH:MM
  "mode": "full",
  "dest": "local",
  "keep": 5,
  "items": ["apk","data"],
  "require_wifi": false,          // بوابة: التشغيل فقط على Wi-Fi
  "require_charging": false,      // بوابة: التشغيل فقط أثناء الشحن
  "min_battery": 0,               // بوابة: التشغيل فقط عند هذا المستوى من البطارية أو أعلى % (0-100)
  "days": [1,2,3,4,5]             // بوابة: التشغيل فقط في أيام الأسبوع هذه (0=الأحد)
}
```

مرّر واحدا **فقط** من `package` أو `packages` أو `all` للهدف. مهمة `backup` تُبقي المعتاد
`mode`/`dest`/`keep`/`items`. أما مهمة `restore` (‏`action: "restore"`) فتستعيد **أحدث**
نسخة احتياطية لكل تطبيق هدف (أو `ref` صريحا) و**تكتب فوق البيانات الحالية للتطبيق في كل
تشغيل**: وهي متعمَّدة وباختيار صريح، فاضبطها فقط بناء على طلب مباشر من المستخدم.

### تقييد المجدول

قد تحمل المهمة المجدولة **شروط بوابة اختيارية**. وعندما لا تتحقق بوابة مهمة مستحقة، تُتخطّى
**ويُعاد محاولتها في النبضة التالية، دون تقديم جدولها** (لا يُختَم `last_run` الخاص بها، فتنطلق
حالما يتحقق الشرط):

| الحقل | النوع | البوابة |
|-------|------|------|
| `require_wifi` | bool | التشغيل فقط أثناء الاتصال بـ Wi-Fi |
| `require_charging` | bool | التشغيل فقط أثناء الشحن |
| `min_battery` | int (0-100) | التشغيل فقط عند هذا المستوى من البطارية أو أعلى |
| `days` | array of int (0-6, 0=الأحد) | التشغيل فقط في أيام الأسبوع هذه |

يُطبَّق فوق ذلك فحص **سلامة حرارية** أدنى دائما: تُتخطّى العملية المجدولة بينما يكون الجهاز
ساخنا بشكل حرج. ويُكتَب كل تخطٍّ للبوابة في سجل التدقيق بوصفه `op:"scheduler-gated"` مع
`reason` من `wifi` / `charging` / `battery` / `days` / `thermal`.

### وسائط `remote-add`

وجهة السحابة هي وجهة من نوع `type:"rclone"` تسمّي جهاز `rclone` بعيدا؛ أنشئ ذلك
الجهاز البعيد أولا بـ `remote-add`. يمكن أن يكون `backend` **أي backend من rclone**: لا
توجد قائمة سماح. يقبل `remote-add` أي اسم backend (`dropbox`، `onedrive`، `box`،
`pcloud`، `mega`، `b2`، `s3`، `sftp`، `smb`، `webdav`، `ftp`، `drive` وحوالي 70 آخرين
يدعمهم rclone)، وتُمرَّر `params` مباشرة إلى إعداد `rclone` بصيغة أزواج `key=value`.
تُخزَّن حقول كلمات المرور مُعتَّمة، لا بنص صريح أبدا. الواجهات الخلفية الشائعة
ومعاملاتها `params`:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

**OAuth على الجهاز (بلا حاسوب).** الواجهات الخلفية التي تحتاج تسجيل دخول عبر المتصفح
(Google Drive، Dropbox، OneDrive، Box، pCloud) لا تحتاج حاسوبا مكتبيا ولا رمزا يُلصق
يدويا. استدعِ `remote-authorize` مع `{backend}`: يشغّل المحرك `rclone authorize <backend>`
مقابل خادم رد نداء محلي (`127.0.0.1:53682`) ويفتح متصفح الهاتف نفسه على صفحة موافقة
المزوّد عبر نية Android VIEW، ويعيد `{ok:true,url}` (أو `{ok:false,code:"ERR_AUTHORIZE"}`).
استطلع `remote-authorize-poll` (`{}`): يعيد `{ok:true,done:false,url}` أثناء الانتظار
و`{ok:true,done:true,token}` بمجرد موافقة المستخدم, مرّر ذلك الـ `token` إلى `remote-add`.
يوقف `remote-authorize-cancel` (`{}`) عملية تفويض معلّقة (`{ok:true,cancelled:true}`).
ولا يزال لصق مخرجات `rclone authorize "<backend>"` يدويا من أي حاسوب مدعوما كحل بديل.

لـ Google Drive مساران: جهاز `drive` البعيد هذا (لا يحتاج مشروع Google Cloud،
يستخدم نظام OAuth الخاص بـ rclone, فوّض على الجهاز بـ `remote-authorize`، أو شغّل
`rclone authorize "drive"` مرة واحدة على أي حاسوب ومرّر الرمز) أو التطبيق المرافق
الاختياري (معرّف عميل OAuth الخاص بك). كلاهما ينتهي بوصفه وجهات عادية.

### سياسة الشبكة

يتحكم حقل الإعداد `network_policy` في نوع الاتصال الذي يجوز لعمليات نقل السحابة
استخدامه: `any` (الافتراضي)، أو `wifi`، أو `mobile`. اضبطه بـ `config-set`. وعندما
يكون `wifi` أو `mobile`، يفحص كل نقل سحابي (رفع Full عبر `rclone`/Drive، مزامنة
Mirror، نسخ/استعادة لقطة `restic` البعيدة، استعادة Mirror) وسيلة النقل النشطة أولا
ويُجهَض بـ `ERR_NET_POLICY` إن لم تتطابق, وذلك للمهام اليدوية والمجدولة معا.
الوجهات المحلية لا تخضع لهذا القيد أبدا.

### سلامة السحابة والحصة

- **ختم المجموع الاختباري (السحابة).** بعد نسخ سحابي ناجح يشغّل المحرك فحص مجموع اختباري
  بعيد (`rclone check`)؛ وعدم التطابق يُفشِل العملية بـ `ERR_VERIFY`. وتُتخطّى الخلفيات التي
  لا تشترك في أي تجزئة مشتركة مع الجانب المحلي (ليس فشلا).
- **فحص الحصة (السحابة، وضع Full).** قبل رفع بوضع Full إلى جهاز `rclone` بعيد يستعلم المحرك
  عن المساحة الحرة للجهاز البعيد (`rclone about --json`) ويرفض بـ `ERR_QUOTA` إن لم تتّسع
  النسخة الاحتياطية. وتُتخطّى الأجهزة البعيدة التي لا تبلّغ عن معلومات الحصة. ووضع Mirror
  مزامنة فرقية ومستثنى.

### ثنائيات السحابة (نسخة `lite`)

تحتوي النسخة `full` على كل الملفات الثنائية مُضمَّنة ولا تحتاج الشبكة أبدا. أما النسخة `lite`
فتحذف الأكبر حجما، `rclone` و`restic`، وتجلبهما عند الطلب في أول مرة تُشغِّل فيها إجراء سحابة أو
لقطة. يبلّغ `cloud-status` عما إذا كانا موجودين بالفعل، وعما إذا كانت هذه النسخة تستطيع جلبهما،
وحجم التنزيل بالبايت. يعمل `cloud-fetch` **منفصلا** (استطلع `progress` بـ `opid` الخاص به): يُنزّل
إضافة `rclone`+`restic` لكل معمارية، ويتحقق منها مقابل الـ SHA-256 المحفور في الوحدة، ويثبّتها في
ذاكرة التخزين المؤقت للتشغيل. أطوار تقدمه هي `downloading` و`verifying` و`installing`؛ والرمز
النهائي هو `ERR_NONE` عند النجاح، أو `ERR_FETCH` (فشل التنزيل) / `ERR_FETCH_VERIFY` (عدم تطابق
المجموع الاختباري، يُتجاهَل) عند الفشل. وعلى النسخة `full` فهو غير ضروري. وأي `backup`/`restore`
إلى وجهة سحابة أو لقطة على النسخة `lite`، قبل وجود الملفين الثنائيين، يفشل بـ
`ERR_CLOUD_FETCHABLE`؛ وينبغي للعميل أن يعرض تشغيل `cloud-fetch`، ثم يعيد المحاولة.

### فئات النسخ الاحتياطية الخاصة

يبلّغ `special-categories` عن الفئات على مستوى النظام التي يمتلكها الجهاز؛ ويلتقط
`special-backup` ما تمرّره في `categories` ويعيد `special-restore` تطبيقها. الفئات هي:

| الفئة | ما هي | دلالة الاستعادة |
|----------|-----------|-------------------|
| `messages` | SMS/MMS | استبدال المزوّد (مسح + استخراج) |
| `contacts` | جهات الاتصال وسجل المكالمات | استبدال المزوّد (مسح + استخراج) |
| `wifi` | شبكات Wi-Fi المحفوظة | استبدال المزوّد (مسح + استخراج) |
| `bluetooth` | اقترانات Bluetooth | استبدال المزوّد (مسح + استخراج) |
| `calendar` | مزوّد التقويم (`com.android.providers.calendar`، التطبيق + البيانات)؛ ويُصدَّر أيضا بشكل محمول إلى `calendar.json` | استبدال المزوّد (مسح + استخراج) |
| `wallpaper` | خلفية الشاشة الرئيسية وشاشة القفل بالإضافة إلى `wallpaper_info.xml`، مخزَّنة خاما (ثنائية) | استبدال الملفات |
| `dns` | وضع DNS الخاص ومحدِّده، مقروءين من الإعدادات | `settings put` عديم التأثير المتكرر |
| `system_settings` | التفريغ الكامل لإعدادات system/global/secure | **اختياري**، `settings put` عديم التأثير المتكرر، يكتب فوق إعدادات الجهاز |

**`system_settings` اختياري بصرامة ومدمّر عند الاستعادة.** مثل `ssaid`، يكتب فوق إعدادات
الجهاز بأكملها حين يُستعاد، فيُحجَب خلف موافقة صريحة من المستخدم ويُكتَب في سجل التدقيق. لا
تختره افتراضيا أبدا؛ فقط بناء على طلب مباشر ومتعمَّد من المستخدم.

### نسخ احتياطي مستقل لمسار

ينسخ `path-backup` / `path-restore` احتياطيا ويستعيد **أي مسار مطلق**: مجلدا أو ملفا واحدا -
على التخزين المشترك أو تحت `/data`، خارج نموذج كل-تطبيق. يُكتَب الأرشيف بصيغة `tar.zst` بالإضافة
إلى `manifest.json` بتنسيق VDBackup الخاص (مختوم بـ SHA-256، مع عدة RECOVERY عند التشفير) تحت
`.paths/` في دليل النسخ الاحتياطية.

```json
// path-backup
{ "path": "/sdcard/DCIM/Camera", "compression": "zstd:10", "password": "..." }
// path-restore
{ "ref": "<.paths ref>", "confirm": true, "password": "..." }
```

- يجب أن يكون مسار المصدر **مطلقا** وتحت أحد الجذور المسموح بها: `/storage/emulated` و`/data/media`
  و`/sdcard` و`/data`. المسار غير الموجود يفشل بـ `ERR_NO_PATH`؛ والمسار خارج الجذور المسموح بها، أو
  الذي يحتوي على `..`، يفشل بـ `ERR_BAD_PATH`.
- يكتب `path-restore` عائدا إلى الموقع الأصلي، فهو مدمّر ويتطلب `"confirm": true`, حاجز احتكاك
  عالٍ، مثل `special-restore`. و`ref` الذي ليس نسخة مسار صالحة يفشل بـ `ERR_BAD_REF`.
- كلاهما يعمل **منفصلا**؛ استطلع `progress` بـ `opid` المُرجَع.

### `update-check`

يُبلّغ `update-check` عمّا إذا كان قد نُشر إصدار أحدث من الوحدة، كي يتمكّن وكيل (أو WebUI) من
عرضه. إنه **فعل قراءة يعود فورًا**: وهو **ليس** منفصلًا، لذا لا يوجد `opid` لاستطلاعه. يُشغَّل
فقط بإجراء صريح من المستخدم، ويجلب بيان التحديث المنشور للوحدة (رابط `updateJson` من `module.prop`)
باستخدام `curl` المرفق عبر طلب HTTP من جهة الجذر, يعمل هذا خارج الـ WebView، فلا يخضع لسياسة CSP
الخاصة بالـ WebUI, ويقارن `versionCode` المنشور بالمثبَّت. لا يأخذ **أي وسائط**.

عند النجاح يُعيد:

| الحقل | النوع | المعنى |
|-------|-------|--------|
| `ok` | bool | `true` |
| `current_version` | string | الـ versionName المثبَّت |
| `current_code` | int | الـ versionCode المثبَّت |
| `latest_version` | string | الـ versionName المنشور |
| `latest_code` | int | الـ versionCode المنشور |
| `update_available` | bool | `true` عندما يكون `latest_code` أكبر من `current_code` |
| `zipUrl` | string | رابط ملف الـ zip المنشور |
| `changelog` | string | رابط الـ changelog المنشور |
| `notes` | string | ملاحظات الإصدار |

إذا لم يكن هناك رابط `updateJson`، أو فشل طلب الشبكة، أو تعذّر تحليل البيان، فإنه يُعيد
`{"ok":false,"code":"ERR_UPDATE_CHECK"}`.

يكتفي `update-check` بـ**الإبلاغ** عن التوفّر وملاحظات الإصدار؛ أما التحديث نفسه فيقوم به مدير
الجذر لديك (KernelSU / APatch / Magisk) عبر `updateJson` الخاص بالوحدة، ولا يقوم به هذا الفعل أبدًا.

## حواجز الأمان التي يجب أن يحترمها وكيلك

- **`ssaid` اختياري بصرامة (مُعطَّل افتراضيا).** يأخذ نسخة احتياطية من / يستعيد
  مُعرّف ANDROID_ID للجهاز بإعادة كتابة ملف نظام؛ ولا تُطبَّق الاستعادة إلا بعد
  إعادة التشغيل، والملف السابق يُحفظ دائما أولا من أجل التراجع. أرسل
  `"ssaid": true` فقط بناء على طلب مباشر ومتعمَّد من المستخدم, لا تلقائيا أبدا.
- **الإجراءات المُغيِّرة (الاستعادة، الحذف، الاستيراد) مدمّرة** وتُسجَّل في سجل
  تدقيق محلي (`logs/audit.jsonl`). الاستعادة أمينة (مسح ثم استخراج)، فتعيد التطبيق
  إلى حالته المطابقة تماما في النسخة الاحتياطية. تأكد من النية قبل استدعائها.
- **`system_settings` اختياري ومدمّر، تماما مثل `ssaid`.** استعادته تكتب فوق إعدادات الجهاز
  بأكملها، فأرسله فقط بناء على طلب مباشر من المستخدم؛ وهو محجوب بموافقة صريحة ومُسجَّل في سجل
  التدقيق.
- **الاستعادة عديمة التأثير المتكرر.** استعادات المزوّد الخام (messages/contacts/wifi/bluetooth/
  calendar) **تستبدل** بدلا من الدمج, تُمسَح بيانات المزوّد ويُستخرَج الأرشيف فوقها, فإعادة استعادة
  النسخة نفسها لا يمكن أن تكرّر الصفوف. ويُعاد تطبيق `dns` و`system_settings` بـ `settings put` عديم
  التأثير المتكرر.
- **استخراج الأرشيف محمي من اجتياز المسار.** تعمل الاستعادة بصلاحية الجذر، فيُفحَص كل أرشيف (restore
  وimport وspecial-restore وpath-restore) قبل أي كتابة: أي أرشيف يستخدم أعضاؤه مسارات مطلقة أو يحتوي
  على `..` يُرفَض مقدما بـ `ERR_UNSAFE_ARCHIVE`، قبل حدوث أي كتابة مدمّرة واحدة (كما يعمل GNU tar بـ
  `--no-absolute-names`). ولا يمكن لأرشيف مُلاعَب أن يفلت من دليله الهدف أبدا.
- **لا تُضعِف أبدا** الحفظ (SELinux/uid/gid/الأنماط/xattr) ولا قاعدة ملف APK (تُضغط
  ملفات APK دائما، ولا تُشفَّر أبدا ما لم يُضبَط `encrypt_apk`).
- عامِل مخرجات JSON بوصفها مصدر الحقيقة؛ افحص `ok`/`code`، واستطلع `progress`،
  واعرض رموز `ERR_*` بدلا من التخمين.

انظر [ARCHITECTURE.md](ARCHITECTURE.md) و
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) للاطلاع على التفاصيل الداخلية.

<!-- doc-footer -->

---

> _تم إنشاء هذا التوثيق باستخدام Claude (Anthropic) ويتولى صيانته VD171. التصحيحات والتحسينات مرحّب بها؛ راجع [CONTRIBUTING.md](CONTRIBUTING.md)._
