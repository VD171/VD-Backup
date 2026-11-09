> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · فارسی · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../in/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# راندن VDBackup از یک عامل هوش مصنوعی

‫VDBackup چنان ساخته شده که یک دستیار یا عامل هوش مصنوعی بتواند **همه** محتوا و
کنش ماژول را بدون رابط گرافیکی مدیریت کند، درست همان‌گونه که یک انسان از طریق
WebUI انجام می‌دهد. ‫WebUI تنها یکی از کلاینت‌های یک API کوچک JSON است؛ عامل شما
کلاینتی دیگر است. از API استفاده کنید، WebUI را خراش ندهید.

## قرارداد

همه چیز از یک نقطه ورود واحد می‌گذرد که با دسترسی root روی دستگاه اجرا می‌شود:

```
sh /data/adb/modules/vdbackup/scripts/helper.sh <verb> <base64(JSON-args)>
```

- آرگومان‌ها یک شیء JSON واحد هستند که **با base64 رمزگذاری شده** و به‌صورت یک
  توکن argv پاس داده می‌شوند.
- فرمان **یک شیء JSON واحد** روی stdout چاپ می‌کند: `{"ok":true,...}` یا
  `{"ok":false,"code":"ERR_...","message":"..."}`. آن را تجزیه کنید؛ هرگز متن را
  خراش ندهید.
- عملیات طولانی (`backup` و `restore` و `import`) بی‌درنگ
  `{"ok":true,"opid":"..."}` برمی‌گردانند و **جدا** اجرا می‌شوند (حتی اگر
  فراخواننده یا WebUI از میان برود، زنده می‌مانند). پیشرفت آن‌ها را پرس‌وجو کنید؛
  وقتی فراخوان بازمی‌گردد هنوز تمام نشده‌اند.
- ‫`progress` و `cancel` مقدار **base64 رشته خام opid** را می‌گیرند، نه یک شیء
  JSON.

یک کمک‌کننده کوچک برای پوسته شما:

```sh
b64() { printf '%s' "$1" | base64 -w0; }
H=/data/adb/modules/vdbackup/scripts/helper.sh
sh "$H" backup "$(b64 '{"package":"com.example.app","mode":"full"}')"
```

برای راندن آن از یک ایستگاه کاری، آن را از طریق کانال root معمول خود به دستگاه
اجرا کنید (adb shell با دسترسی root، یا یک پیکربندی SSH به root). ماژول با
فایل‌های اجرایی بسته‌بندی‌شده عرضه می‌شود، پس پس از نصب برای پشتیبان‌گیری و
بازیابی محلی به **هیچ اینترنتی** نیاز ندارد؛ تنها مقصدهای ابری
(`rclone`/`restic`/ssh) با شبکه گفت‌وگو می‌کنند.

## فعل‌ها

| فعل | آرگومان‌ها (JSON) | بازگشتی |
|------|-------------|---------|
| `ping` | `{}` | `{ok,version,abi}` |
| `overview` | `{user?}` | `{ok:true,apps,instances,path_backups,jobs,backups_size,free,total}` شمارها (اندازه‌ها به بایت): برنامه‌های دارای پشتیبان، کل نمونه‌های پشتیبان، پشتیبان‌های مسیر مستقل، کارهای زمان‌بندی‌شده، اندازهٔ کل پشتیبان‌ها، و آزاد/کل سیستم‌فایل پشتیبان‌ها. غیرمنفصل، فورا بازمی‌گردد؛ توسط نمای کلی خانهٔ WebUI استفاده می‌شود. |
| `config-get` | `{}` | `{ok,config}` |
| `config-set` | شیء پیکربندی (یا `{key,value}`) | `{ok}` |
| `keygen` | `{}` | جفت‌کلید `age` را برای رمزگذاری تولید می‌کند |
| `list-apps` | `{user?}` | `{ok,apps:[{package,label,system,versionCode}]}` (dex، با بازگشت به پوسته) |
| `label` | `{package,user?}` | `{ok,label}` (نام محلی‌شده واقعی برنامه، بدون زمینه) |
| `icon` | `{package,user?,vc?}` | `{ok,package,icon}` (base64 PNG؛ برای هر package+`vc` کَش می‌شود) |
| `backup` | پایین را ببینید | `{ok,opid}` (جدا) |
| `restore` | پایین را ببینید | `{ok,opid}` (جدا) |
| `import` | `{from,ref,password,ssaid,user}` | `{ok,opid}` (جدا) |
| `import-scan` | `{from,path}` | `{ok,backups:[...]}` |
| `progress` | base64(opid) | فایل زنده `progress-<opid>.json` |
| `cancel` | base64(opid) | `{ok,cancelled}` |
| `list-ops` | `{}` | `{ok,ops:[...]}` (پیوند دوباره پس از اتصال مجدد) |
| `list-apps`/`icons` | `{user?}` / `{user?,items:[{package,vc}]}` | فهرست برنامه‌ها / آیکون‌های base64 به‌صورت دسته‌ای |
| `list-backups` | `{package?}` | `{ok,backups:[{ref,package,label,versionName,versionCode,created_at,mode,items}]}` |
| `list-users` | `{}` | `{ok,users:[{id,name}]}` کاربران اندروید دستگاه (چندکاربره). |
| `list-dirs` | `{path}` | `{ok,path,parent,dirs:[...]}` زیرشاخه‌های یک مسیر (انتخابگر پوشه). |
| `path-list` | `{user?}` | `{ok,backups:[...]}` پشتیبان‌های مستقل پوشه/فایل. |
| `provenance` | `{}` | مانیفست حسابرسی باینری‌های همراه (`PROVENANCE.json`). |
| `backup-info` | `{ref}` | `{ok,...}` جزئیات کامل یک پشتیبان (نسخه، منبع نصب، وضعیت، تاریخ، حالت، اندازه، اقلام، شمار مجوزها، دستگاه) |
| `backup-icon` | `{ref}` | `{ok,icon}` ‏base64 PNG از مانیفست (حتی وقتی برنامه حذف نصب شده کار می‌کند) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref باید زیر دایرکتوری پشتیبان‌ها باشد) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` ‏N تای جدیدترینِ یک بسته را نگه می‌دارد |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` گزارش ممیزی، جدیدترین نخست |
| `log-export` | `{user?}` | `{ok:true,path}` (مسیر مطلق یک فایل `.txt` نوشته‌شده در فهرست پشتیبان‌ها) یا `{ok:false,code:"ERR_LOG_EXPORT"}`. گزارش فعالیت (`audit.jsonl`) به‌علاوهٔ یک سرایند کوتاه ساخت/دستگاه را در یک فایل متنی واحد قابل‌مشاهده برای کاربر می‌نویسد تا بتوان آن را به گزارش اشکال پیوست کرد. غیرمنفصل، فورا بازمی‌گردد. |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth/calendar/wallpaper/dns/system_settings) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` پشتیبان سیستم‌گستر (جدا) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (نیازمند راه‌اندازی مجدد؛ `confirm` آن را مهار می‌کند) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `path-backup` | `{path,compression?,password?}` | `{ok,opid}` پشتیبان‌گیری از هر مسیر مطلق به‌صورت `tar.zst`+`manifest.json` زیر `.paths/` (جدا) |
| `path-restore` | `{ref,confirm:true,password?}` | `{ok,opid}` بازگرداندن یک پشتیبان مسیر به مکان اصلی‌اش (`confirm` آن را مهار می‌کند؛ جدا) |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | سوار کردن یک برنامه نصب‌شده به‌عنوان برنامه سیستمی (زیرماژول بدون‌سیستم؛ زنده از طریق NoMount وگرنه در راه‌اندازی بعدی) |
| `companion-status` / `companion-install` | `{}` | وضعیت همراه Google Drive / نصب درخواستی |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | مدیریت مقصد |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | مدیریت ریموت rclone (ورودی `rclone.conf` را می‌سازد که مقصدی از نوع `type:"rclone"` به آن اشاره می‌کند)؛ `backend` می‌تواند هر backendِ rclone باشد، بدون فهرست سفید |
| `remote-authorize` | `{backend}` | `{ok:true,url}` (موتور همین حالا مرورگر گوشی را از طریق یک Intent از نوع VIEW در اندروید روی آن URLِ رضایت باز کرده است) یا `{ok:false,code:"ERR_AUTHORIZE"}`. برای OAuthِ روی‌دستگاه، `rclone authorize <backend>` را روی یک سرور callback محلی (`127.0.0.1:53682`) اجرا می‌کند. |
| `remote-authorize-poll` | `{}` | در حال انتظار `{ok:true,done:false,url}`، پس از آنکه کاربر رضایت داد `{ok:true,done:true,token}` (همان `token` که باید به `remote-add` پاس داده شود)، یا `{ok:false,code:"ERR_AUTHORIZE"}`. |
| `remote-authorize-cancel` | `{}` | `{ok:true,cancelled:true}`؛ یک مجوزدهی در حال انتظار را متوقف می‌کند. |
| `cloud-status` | `{}` | `{ok,rclone,restic,fetchable,size}` (آیا فایل‌های اجرایی `rclone`/`restic` موجودند، آیا این نسخه `lite` می‌تواند آن‌ها را بیاورد، و حجم دانلود به بایت) |
| `cloud-fetch` | `{}` | `{ok,opid}` (جدا) دانلود+راستی‌آزمایی+نصب افزونه `rclone`/`restic` روی نسخه `lite` |
| `schedule-set` / `schedule-list` / `schedule-delete` | پایین را ببینید | کارهای زمان‌بندی‌شده (یک پشتیبان یا یک بازیابی؛ هدف‌گیری یک برنامه، یک مجموعه، یا همهٔ برنامه‌ها) |
| `scheduler-tick` | `{}` | کارهای سررسیده را اجرا می‌کند + نگه‌داشت را اعمال می‌کند + ناظر پشتیبان‌گیری خودکار را اجرا می‌کند (ضربان راه‌اندازی این را فرا می‌خواند) |
| `update-check` | `{}` | `{ok,current_version,current_code,latest_version,latest_code,update_available,zipUrl,changelog,notes}` (جدا نیست؛ بی‌درنگ برمی‌گردد؛ در صورت شکست `ERR_UPDATE_CHECK` - پایین را ببینید) |

### میدان‌های `progress`

پرس‌وجوی `progress` فایل زنده `progress-<opid>.json` عملیات را برمی‌گرداند. این میدان‌ها
**همیشه موجودند**:

| میدان | نوع | معنا |
|-------|------|---------|
| `opid` | string | شناسه عملیات |
| `percent` | int | پیشرفت ۰ تا ۱۰۰ |
| `phase` | string | برچسب فاز کنونی |
| `item` | string | نوع موردی که در حال پردازش است |
| `done` | bool | در یک نوشتن پایانی (finish / dry-run / restore-test) برابر true می‌شود |

یک عملیات در حال اجرا ممکن است این میدان‌های زنده **اختیاری** را نیز داشته باشد. هنگام
نامعلوم‌بودن غایب یا خالی‌اند و **در نوشتن‌های پایانی حذف می‌شوند** (finish / dry-run /
restore-test):

| میدان | نوع | معنا |
|-------|------|---------|
| `rate` | string | سرعت انتقال، مثلا `"4.2 MiB/s"` (خالی = نامعلوم) |
| `eta` | string | زمان تخمینی باقی‌مانده، مثلا `"1m12s"` (خالی = نامعلوم) |
| `n` | int | نمایه مورد کنونی (۰ = نامعلوم) |
| `of` | int | شمار کل اقلام (۰ = نامعلوم) |
| `cur` | string | نام مورد کنونی (خالی = هیچ) |

انتقال‌های ابری `rate`/`eta` را پر می‌کنند (درصد از rclone می‌آید)؛ پشتیبان‌های Full محلی
`n`/`of`/`cur` را پر می‌کنند. برچسب‌های فاز شامل فاز مهر جمع کنترلی **`verified`** و، برای
انتقال‌های ابری، **`transfer`** و **`mirror <item>`** هستند.

### آرگومان‌های `backup`

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

‫`restore`/`import` مقدار `{ref}` (یک دایرکتوری پشتیبان / مرجع اسکن) را می‌گیرند.
‫`restore` همچنین این‌ها را می‌پذیرد: `"items"` (زیرمجموعه‌ای از انواع موردهای پشتیبان برای
بازیابی؛ برای همه آن را حذف کنید)، `"test": true` (استخراج به یک دایرکتوری موقت و راستی‌آزمایی،
بدون دست‌زدن به برنامه زنده)، `"mode"` برای snapshot/mirror، `"password"` برای یک پشتیبان
رمزگذاری‌شده، `"ssaid"` (با انتخاب صریح)، و گزینه‌های منبع نصب `"spoof_installer"` (پیش‌فرض از
پیکربندی، نصب‌کننده را هنگام نصب روی Play Store تنظیم می‌کند) و `"deep_spoof": true` (پیشرفته و با
انتخاب صریح؛ افزون بر آن با ویرایش پایگاه‌دادهٔ بسته‌ها بستهٔ آغازگر و منبع بسته را جعل می‌کند و پس از
یک راه‌اندازی مجدد اعمال می‌شود). ‫`import` مقدار `"from": "neo" | "databackup"` و، برای یک پشتیبان
Neo رمزگذاری‌شده، مقدار `"password"` را می‌گیرد.

### آرگومان‌های `schedule-set`

یک کار زمان‌بندی‌شده **یک** هدف و یک **کنش** برمی‌گزیند:

```json
{
  "id": "nightly-games",
  "action": "backup",             // "backup" (پیش‌فرض) | "restore"
  "package": "com.example.app",   // یک برنامه   - یا -
  "packages": ["com.a","com.b"],  // یک مجموعه برنامه   - یا -
  "all": true,                    // همهٔ برنامه‌ها، منهای فهرست برنامه‌های مستثنا
  "cron": "daily",                // hourly | daily | weekly
  "at": "02:30",                  // HH:MM
  "mode": "full",
  "dest": "local",
  "keep": 5,
  "items": ["apk","data"],
  "require_wifi": false,          // دروازه: اجرا تنها روی Wi-Fi
  "require_charging": false,      // دروازه: اجرا تنها هنگام شارژ
  "min_battery": 0,               // دروازه: اجرا تنها در این سطح باتری یا بالاتر % (0-100)
  "days": [1,2,3,4,5]             // دروازه: اجرا تنها در این روزهای هفته (0=یکشنبه)
}
```

برای هدف دقیقا **یکی** از `package` یا `packages` یا `all` را بدهید. یک کار `backup` همان
`mode`/`dest`/`keep`/`items` همیشگی را نگه می‌دارد. یک کار `restore` (‏`action: "restore"`)
**تازه‌ترین** پشتیبان هر برنامهٔ هدف (یا یک `ref` صریح) را بازمی‌گرداند و **در هر اجرا داده‌های
کنونی برنامه را بازنویسی می‌کند** - عمدی و با انتخاب صریح است، پس تنها بنا بر درخواست مستقیم
کاربر آن را تنظیم کنید.

### مهار زمان‌بند

یک کار زمان‌بندی‌شده ممکن است **شرط‌های دروازه اختیاری** داشته باشد. وقتی دروازه یک کار
سررسیده برآورده نشود، کار **رد می‌شود و در تیک بعدی بدون پیش‌بردن زمان‌بندی‌اش دوباره تلاش
می‌شود** (`last_run` آن مهر نمی‌شود، پس به‌محض برقراری شرط اجرا می‌شود):

| میدان | نوع | دروازه |
|-------|------|------|
| `require_wifi` | bool | اجرا تنها هنگام اتصال به Wi-Fi |
| `require_charging` | bool | اجرا تنها هنگام شارژ |
| `min_battery` | int (0-100) | اجرا تنها در این سطح باتری یا بالاتر |
| `days` | array of int (0-6, 0=یکشنبه) | اجرا تنها در این روزهای هفته |

افزون بر این‌ها همواره یک بررسی کمینه **ایمنی حرارتی** اعمال می‌شود: یک عملیات زمان‌بندی‌شده
تا وقتی دستگاه به‌طور بحرانی داغ است رد می‌شود. هر رد دروازه در رد پای حسابرسی به‌صورت
`op:"scheduler-gated"` با `reason` ای از `wifi` / `charging` / `battery` / `days` /
`thermal` نوشته می‌شود.

### آرگومان‌های `remote-add`

یک مقصد ابری مقصدی از نوع `type:"rclone"` است که یک ریموت `rclone` را نام می‌برد؛
آن ریموت را نخست با `remote-add` بسازید. `backend` می‌تواند **هر backendِ rclone** باشد -
هیچ فهرست سفیدی وجود ندارد. `remote-add` هر نام backend ای را می‌پذیرد (`dropbox`، `onedrive`،
`box`، `pcloud`، `mega`، `b2`، `s3`، `sftp`، `smb`، `webdav`، `ftp`، `drive` و حدود ۷۰ مورد
دیگری که rclone پشتیبانی می‌کند)، و `params` مستقیماً به‌صورت جفت‌های `key=value` به پیکربندی
`rclone` منتقل می‌شوند. میدان‌های گذرواژه مبهم‌شده ذخیره می‌شوند، هرگز به‌صورت صریح. backendهای
رایج و `params` آن‌ها:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

**OAuthِ روی‌دستگاه (بدون رایانه).** backendهایی که به ورود از طریق مرورگر نیاز دارند
(Google Drive، Dropbox، OneDrive، Box، pCloud) به رایانه یا توکنِ دستی‌چسبانده نیاز ندارند.
`remote-authorize` را با `{backend}` فراخوانی کنید: موتور `rclone authorize <backend>` را
روی یک سرور callback محلی (`127.0.0.1:53682`) اجرا می‌کند و مرورگر خودِ گوشی را از طریق یک
Intent از نوع VIEW در اندروید روی صفحه رضایتِ ارائه‌دهنده باز می‌کند و `{ok:true,url}`
برمی‌گرداند (یا `{ok:false,code:"ERR_AUTHORIZE"}`). `remote-authorize-poll` (`{}`) را poll
کنید: در حال انتظار `{ok:true,done:false,url}` و پس از تأیید کاربر `{ok:true,done:true,token}`
برمی‌گرداند - آن `token` را به `remote-add` پاس دهید. `remote-authorize-cancel` (`{}`) یک
مجوزدهی در حال انتظار را متوقف می‌کند (`{ok:true,cancelled:true}`). چسباندن دستیِ خروجی
`rclone authorize "<backend>"` از هر رایانه‌ای همچنان به‌عنوان راه‌حل پشتیبان پشتیبانی می‌شود.

‫Google Drive دو مسیر دارد: همین ریموت `drive` (به پروژه Google Cloud نیاز ندارد،
از OAuth خودِ rclone استفاده می‌کند - روی‌دستگاه با `remote-authorize` مجوز دهید، یا یک‌بار
`rclone authorize "drive"` را روی هر رایانه‌ای اجرا کنید و توکن را پاس دهید) یا برنامه همراه
اختیاری (شناسه کلاینت OAuth خودتان). هر دو به‌صورت مقصدهای عادی پایان می‌یابند.

### سیاست شبکه

میدان پیکربندی `network_policy` کنترل می‌کند که انتقال‌های ابری از کدام اتصال
می‌توانند استفاده کنند: `any` (پیش‌فرض)، یا `wifi`، یا `mobile`. آن را با
`config-set` تنظیم کنید. وقتی `wifi` یا `mobile` باشد، هر انتقال ابری (بارگذاری
Full با `rclone`/Drive، همگام‌سازی Mirror، پشتیبان/بازیابی snapshot ریموت
`restic`، بازیابی Mirror) نخست حامل فعال را بررسی می‌کند و اگر همخوان نباشد با
`ERR_NET_POLICY` سقط می‌شود - هم برای کارهای دستی و هم زمان‌بندی‌شده. مقصدهای محلی
هرگز محدود نمی‌شوند.

### یکپارچگی و سهمیه ابری

- **مهر جمع کنترلی (ابری).** پس از یک کپی ابری موفق، موتور یک بررسی جمع کنترلی ریموت
  (`rclone check`) اجرا می‌کند؛ ناسازگاری عملیات را با `ERR_VERIFY` ناموفق می‌کند. بک‌اندهایی
  که هیچ هش مشترکی با سمت محلی ندارند رد می‌شوند (شکست نیست).
- **بررسی سهمیه (ابری، حالت Full).** پیش از یک بارگذاری در حالت Full به یک ریموت `rclone`،
  موتور فضای آزاد ریموت (`rclone about --json`) را پرس‌وجو می‌کند و اگر پشتیبان جا نشود با
  `ERR_QUOTA` رد می‌کند. ریموت‌هایی که اطلاعات سهمیه گزارش نمی‌کنند رد می‌شوند. حالت Mirror یک
  همگام‌سازی دلتاست و مستثناست.

### فایل‌های اجرایی ابری (نسخه `lite`)

نسخه `full` همه فایل‌های اجرایی را بسته‌بندی‌شده دارد و هرگز به شبکه نیاز ندارد. نسخه `lite` دو
فایل بزرگ‌تر، `rclone` و `restic`، را حذف می‌کند و آن‌ها را هنگام نیاز در نخستین باری که یک کنش
ابری یا snapshot اجرا می‌کنید می‌آورد. `cloud-status` گزارش می‌دهد که آیا از پیش موجودند، آیا این
نسخه می‌تواند آن‌ها را بیاورد، و حجم دانلود به بایت. `cloud-fetch` **جدا** اجرا می‌شود (`progress`
را با `opid` آن پرس‌وجو کنید): افزونه `rclone`+`restic` مخصوص هر معماری را دانلود می‌کند، آن را در
برابر SHA-256 پخته‌شده در ماژول راستی‌آزمایی می‌کند، و آن را در کش زمان اجرا نصب می‌کند. فازهای
پیشرفت آن `downloading` و `verifying` و `installing` هستند؛ کد نهایی در صورت موفقیت `ERR_NONE` است،
و در صورت شکست `ERR_FETCH` (دانلود ناموفق) / `ERR_FETCH_VERIFY` (ناسازگاری جمع کنترلی، دور انداخته
شد). روی نسخه `full` غیرضروری است. یک `backup`/`restore` به مقصد ابری یا snapshot روی نسخه `lite`،
پیش از آنکه فایل‌های اجرایی موجود باشند، با `ERR_CLOUD_FETCHABLE` شکست می‌خورد؛ کلاینت باید اجرای
`cloud-fetch` را پیشنهاد دهد و سپس دوباره تلاش کند.

### دسته‌های پشتیبان ویژه

‫`special-categories` گزارش می‌دهد که یک دستگاه چه دسته‌های سیستم‌گستری دارد؛ `special-backup`
آن‌هایی را که در `categories` پاس می‌دهید می‌گیرد و `special-restore` دوباره آن‌ها را اعمال می‌کند.
دسته‌ها این‌هایند:

| دسته | چیست | معنای بازیابی |
|----------|-----------|-------------------|
| `messages` | SMS/MMS | جایگزینی ارائه‌دهنده (پاک‌سازی + استخراج) |
| `contacts` | مخاطبان و گزارش تماس | جایگزینی ارائه‌دهنده (پاک‌سازی + استخراج) |
| `wifi` | شبکه‌های Wi-Fi ذخیره‌شده | جایگزینی ارائه‌دهنده (پاک‌سازی + استخراج) |
| `bluetooth` | جفت‌شدن‌های Bluetooth | جایگزینی ارائه‌دهنده (پاک‌سازی + استخراج) |
| `calendar` | ارائه‌دهنده تقویم (`com.android.providers.calendar`، برنامه + داده)؛ همچنین به‌صورت قابل‌حمل به `calendar.json` صادر می‌شود | جایگزینی ارائه‌دهنده (پاک‌سازی + استخراج) |
| `wallpaper` | کاغذدیواری صفحه خانه و قفل به‌علاوه `wallpaper_info.xml`، خام (دودویی) ذخیره‌شده | فایل‌ها جایگزین می‌شوند |
| `dns` | حالت و مشخص‌گر DNS خصوصی، خوانده‌شده از تنظیمات | `settings put` خنثی‌پذیر |
| `system_settings` | تخلیه کامل تنظیمات system/global/secure | **انتخابی**، `settings put` خنثی‌پذیر، تنظیمات دستگاه را بازنویسی می‌کند |

**`system_settings` به‌شدت انتخابی و در بازیابی ویرانگر است.** مانند `ssaid`، هنگام بازیابی تنظیمات
سراسر دستگاه را بازنویسی می‌کند، پس پشت رضایت صریح کاربر مهار شده و در رد پای حسابرسی نوشته می‌شود.
هرگز آن را به‌صورت پیش‌فرض برنگزینید؛ تنها بنا بر درخواست مستقیم و عامدانه کاربر.

### پشتیبان مستقل مسیر

‫`path-backup` / `path-restore` از **هر مسیر مطلق** - یک پوشه یا یک فایل تنها - روی ذخیره مشترک یا
زیر `/data`، بیرون از مدل هر-برنامه، پشتیبان می‌گیرند و آن را بازمی‌گردانند. بایگانی به‌صورت
`tar.zst` به‌علاوه یک `manifest.json` با قالب خودِ VDBackup نوشته می‌شود (مهر‌و‌موم‌شده با SHA-256، با
یک کیت RECOVERY هنگام رمزگذاری) زیر `.paths/` در دایرکتوری پشتیبان‌ها.

```json
// path-backup
{ "path": "/sdcard/DCIM/Camera", "compression": "zstd:10", "password": "..." }
// path-restore
{ "ref": "<.paths ref>", "confirm": true, "password": "..." }
```

- مسیر منبع باید **مطلق** باشد و زیر یکی از ریشه‌های مجاز: `/storage/emulated`، `/data/media`،
  `/sdcard`، `/data`. مسیری که وجود ندارد با `ERR_NO_PATH` شکست می‌خورد؛ مسیری بیرون از ریشه‌های
  مجاز، یا مسیری که `..` دارد، با `ERR_BAD_PATH` شکست می‌خورد.
- ‫`path-restore` به مکان اصلی بازمی‌نویسد، پس ویرانگر است و `"confirm": true` را می‌طلبد - یک مهار
  پراصطکاک، مانند `special-restore`. یک `ref` که پشتیبان مسیر معتبری نیست با `ERR_BAD_REF` شکست
  می‌خورد.
- هر دو **جدا** اجرا می‌شوند؛ `progress` را با `opid` بازگشتی پرس‌وجو کنید.

### `update-check`

`update-check` گزارش می‌دهد که آیا نسخهٔ جدیدتری از ماژول منتشر شده است یا نه، تا یک عامل
(یا WebUI) بتواند آن را نمایش دهد. این یک **فعل خواندنی است که بی‌درنگ برمی‌گردد** - **جدا نیست**،
پس هیچ `opid` برای poll کردن وجود ندارد. تنها با یک کنش صریح کاربر فعال می‌شود و بیانیهٔ (manifest)
به‌روزرسانی منتشرشدهٔ ماژول (نشانی `updateJson` از `module.prop`) را با `curl` همراه از طریق یک
درخواست HTTP سمت روت می‌گیرد - این بیرون از WebView اجرا می‌شود، پس مشمول CSP وب‌یو‌آی نیست - و
`versionCode` منتشرشده را با نسخهٔ نصب‌شده مقایسه می‌کند. **هیچ آرگومانی** نمی‌گیرد.

در صورت موفقیت برمی‌گرداند:

| فیلد | نوع | معنا |
|------|-----|------|
| `ok` | bool | `true` |
| `current_version` | string | versionName نصب‌شده |
| `current_code` | int | versionCode نصب‌شده |
| `latest_version` | string | versionName منتشرشده |
| `latest_code` | int | versionCode منتشرشده |
| `update_available` | bool | `true` وقتی `latest_code` بزرگ‌تر از `current_code` باشد |
| `zipUrl` | string | نشانی zip منتشرشده |
| `changelog` | string | نشانی changelog منتشرشده |
| `notes` | string | یادداشت‌های انتشار |

اگر نشانی `updateJson` وجود نداشته باشد، درخواست شبکه شکست بخورد، یا بیانیه قابل تجزیه نباشد،
`{"ok":false,"code":"ERR_UPDATE_CHECK"}` برمی‌گرداند.

`update-check` فقط در دسترس بودن و یادداشت‌های انتشار را **گزارش** می‌کند؛ خودِ به‌روزرسانی را مدیر
روت شما (KernelSU / APatch / Magisk) از طریق `updateJson` ماژول انجام می‌دهد، نه این فعل.

## نرده‌های ایمنی که عامل شما باید رعایت کند

- **‫`ssaid` به‌شدت انتخابی است (پیش‌فرض خاموش).** از ANDROID_ID دستگاه با بازنویسی
  یک فایل سیستمی پشتیبان می‌گیرد / آن را بازمی‌گرداند؛ بازیابی تنها پس از یک
  راه‌اندازی مجدد اعمال می‌شود، و فایل پیشین همواره نخست برای بازگشت ذخیره
  می‌شود. ‫`"ssaid": true` را تنها بر پایه درخواست مستقیم و عامدانه کاربر بفرستید -
  هرگز به‌صورت پیش‌فرض.
- **کنش‌های دگرگون‌کننده (بازیابی، حذف، ورود) ویرانگرند** و در یک رد پای حسابرسی
  محلی (`logs/audit.jsonl`) ثبت می‌شوند. بازیابی وفادار است (پاک‌سازی سپس
  استخراج)، پس برنامه را به حالت دقیق پشتیبان بازمی‌گرداند. پیش از فراخواندن آن‌ها
  از نیت مطمئن شوید.
- **`system_settings` انتخابی و ویرانگر است، درست مانند `ssaid`.** بازیابی آن تنظیمات سراسر دستگاه
  را بازنویسی می‌کند، پس تنها بنا بر درخواست مستقیم کاربر آن را بفرستید؛ پشت رضایت صریح مهار شده و در
  رد پای حسابرسی ثبت می‌شود.
- **بازیابی خنثی‌پذیر است.** بازیابی‌های خام ارائه‌دهنده (messages/contacts/wifi/bluetooth/calendar)
  به‌جای ادغام **جایگزین** می‌کنند - داده ارائه‌دهنده پاک می‌شود و بایگانی روی آن استخراج می‌شود - پس
  بازیابی دوباره همان پشتیبان نمی‌تواند ردیف‌ها را دوبرابر کند. `dns` و `system_settings` با
  `settings put` خنثی‌پذیر دوباره اعمال می‌شوند.
- **استخراج بایگانی در برابر پیمایش مسیر مهار شده است.** بازیابی با دسترسی root اجرا می‌شود، پس هر
  بایگانی (restore، import، special-restore، path-restore) پیش از هر نوشتنی بررسی می‌شود: بایگانی‌ای که
  اعضایش مسیرهای مطلق به کار می‌برند یا `..` دارند پیشاپیش با `ERR_UNSAFE_ARCHIVE` رد می‌شود، پیش از
  آنکه حتی یک نوشتن ویرانگر رخ دهد (‫GNU tar نیز با `--no-absolute-names` اجرا می‌شود). یک بایگانی
  دست‌کاری‌شده هرگز نمی‌تواند از دایرکتوری هدف خود بگریزد.
- **هرگز سست نکنید** حفظ (SELinux/uid/gid/حالت‌ها/xattr) یا قاعده APK را (فایل‌های
  APK همواره فشرده می‌شوند، و هرگز رمزگذاری نمی‌شوند مگر `encrypt_apk` تنظیم شده
  باشد).
- خروجی JSON را سرچشمه حقیقت بدانید؛ `ok`/`code` را بررسی کنید، `progress` را
  پرس‌وجو کنید، و به‌جای حدس‌زدن کدهای `ERR_*` را نمایان کنید.

برای درون‌مایه‌ها [ARCHITECTURE.md](ARCHITECTURE.md) و
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) را ببینید.

---

*این مستندات با Claude (Anthropic) تولید شده و توسط VD171 نگه‌داری می‌شود. تصحیح‌ها و بهبودها خوشامد است - [CONTRIBUTING.md](CONTRIBUTING.md) را ببینید.*
