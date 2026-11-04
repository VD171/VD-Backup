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
| `backup-info` | `{ref}` | `{ok,...}` جزئیات کامل یک پشتیبان (نسخه، منبع نصب، وضعیت، تاریخ، حالت، اندازه، اقلام، شمار مجوزها، دستگاه) |
| `backup-icon` | `{ref}` | `{ok,icon}` ‏base64 PNG از مانیفست (حتی وقتی برنامه حذف نصب شده کار می‌کند) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref باید زیر دایرکتوری پشتیبان‌ها باشد) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` ‏N تای جدیدترینِ یک بسته را نگه می‌دارد |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` گزارش ممیزی، جدیدترین نخست |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` پشتیبان سیستم‌گستر (جدا) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (نیازمند راه‌اندازی مجدد؛ `confirm` آن را مهار می‌کند) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | سوار کردن یک برنامه نصب‌شده به‌عنوان برنامه سیستمی (زیرماژول بدون‌سیستم؛ زنده از طریق NoMount وگرنه در راه‌اندازی بعدی) |
| `companion-status` / `companion-install` | `{}` | وضعیت همراه Google Drive / نصب درخواستی |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | مدیریت مقصد |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | مدیریت ریموت rclone (ورودی `rclone.conf` را می‌سازد که مقصدی از نوع `type:"rclone"` به آن اشاره می‌کند) |
| `schedule-set` / `schedule-list` / `schedule-delete` | `{id,package,mode,dest,cron,at,keep,items}` | کارهای زمان‌بندی‌شده |
| `scheduler-tick` | `{}` | کارهای سررسیده را اجرا می‌کند + نگه‌داشت را اعمال می‌کند + ناظر پشتیبان‌گیری خودکار را اجرا می‌کند (ضربان راه‌اندازی این را فرا می‌خواند) |

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
  "ssaid": false                  // OPT-IN, see below
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

### آرگومان‌های `remote-add`

یک مقصد ابری مقصدی از نوع `type:"rclone"` است که یک ریموت `rclone` را نام می‌برد؛
آن ریموت را نخست با `remote-add` بسازید. میدان‌های گذرواژه مبهم‌شده ذخیره می‌شوند،
هرگز به‌صورت صریح. مقادیر `backend` پشتیبانی‌شده و `params` آن‌ها:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

‫Google Drive دو مسیر دارد: همین ریموت `drive` (به پروژه Google Cloud نیاز ندارد،
از OAuth خودِ rclone استفاده می‌کند - یک‌بار `rclone authorize "drive"` را روی هر
رایانه‌ای اجرا کنید و توکن را پاس دهید) یا برنامه همراه اختیاری (شناسه کلاینت OAuth
خودتان). هر دو به‌صورت مقصدهای عادی پایان می‌یابند.

### سیاست شبکه

میدان پیکربندی `network_policy` کنترل می‌کند که انتقال‌های ابری از کدام اتصال
می‌توانند استفاده کنند: `any` (پیش‌فرض)، یا `wifi`، یا `mobile`. آن را با
`config-set` تنظیم کنید. وقتی `wifi` یا `mobile` باشد، هر انتقال ابری (بارگذاری
Full با `rclone`/Drive، همگام‌سازی Mirror، پشتیبان/بازیابی snapshot ریموت
`restic`، بازیابی Mirror) نخست حامل فعال را بررسی می‌کند و اگر همخوان نباشد با
`ERR_NET_POLICY` سقط می‌شود - هم برای کارهای دستی و هم زمان‌بندی‌شده. مقصدهای محلی
هرگز محدود نمی‌شوند.

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
- **هرگز سست نکنید** حفظ (SELinux/uid/gid/حالت‌ها/xattr) یا قاعده APK را (فایل‌های
  APK همواره فشرده می‌شوند، و هرگز رمزگذاری نمی‌شوند مگر `encrypt_apk` تنظیم شده
  باشد).
- خروجی JSON را سرچشمه حقیقت بدانید؛ `ok`/`code` را بررسی کنید، `progress` را
  پرس‌وجو کنید، و به‌جای حدس‌زدن کدهای `ERR_*` را نمایان کنید.

برای درون‌مایه‌ها [ARCHITECTURE.md](ARCHITECTURE.md) و
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) را ببینید.

---

*این مستندات با Claude (Anthropic) تولید شده و توسط VD171 نگه‌داری می‌شود. تصحیح‌ها و بهبودها خوشامد است - [CONTRIBUTING.md](CONTRIBUTING.md) را ببینید.*
