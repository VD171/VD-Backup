> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · हिन्दी · [Bahasa Indonesia](../in/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Українська](../uk/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# किसी AI एजेंट से VDBackup चलाना

VDBackup इस तरह बनाया गया है कि कोई AI असिस्टेंट या एजेंट मॉड्यूल की **हर** सामग्री और
क्रिया को headless रूप से प्रशासित कर सके, ठीक उसी तरह जैसे कोई व्यक्ति WebUI के माध्यम से करता है।
WebUI तो बस एक छोटे JSON API का एक क्लाइंट है; आपका एजेंट दूसरा क्लाइंट है। API का उपयोग करें,
WebUI को scrape न करें।

## अनुबंध

सब कुछ एक ही प्रवेश बिंदु से होकर गुजरता है, जो डिवाइस पर root के रूप में चलता है:

```
sh /data/adb/modules/vdbackup/scripts/helper.sh <verb> <base64(JSON-args)>
```

- आर्गुमेंट एक ही JSON ऑब्जेक्ट होते हैं, **base64-encoded**, जो एक argv टोकन के रूप में भेजे जाते हैं।
- कमांड stdout पर **एक JSON ऑब्जेक्ट** प्रिंट करता है: `{"ok":true,...}` या
  `{"ok":false,"code":"ERR_...","message":"..."}`. उसे parse करें; कभी भी टेक्स्ट scrape न करें।
- लंबी कार्रवाइयाँ (`backup`, `restore`, `import`, `backup-batch`, `restore-batch`, `config-export`, `config-import`) तुरंत `{"ok":true,"opid":"..."}` लौटाती हैं
  और **detached** चलती हैं (कॉल करने वाले/WebUI के चले जाने पर भी वे जीवित रहती हैं)। उनकी
  प्रगति को poll करें; जब कॉल लौटता है तब वे पूरी नहीं हुई होतीं।
- `progress` और `cancel` एक JSON ऑब्जेक्ट नहीं, बल्कि **कच्चे opid स्ट्रिंग का base64** लेते हैं।

आपके shell के लिए एक छोटा helper:

```sh
b64() { printf '%s' "$1" | base64 -w0; }
H=/data/adb/modules/vdbackup/scripts/helper.sh
sh "$H" backup "$(b64 '{"package":"com.example.app","mode":"full"}')"
```

इसे किसी वर्कस्टेशन से चलाने के लिए, इसे अपने सामान्य root चैनल के माध्यम से डिवाइस तक चलाएँ
(root के रूप में adb shell, या एक SSH-to-root सेटअप)। मॉड्यूल बंडल किए गए बाइनरी के साथ आता है, इसलिए
एक बार इंस्टॉल होने के बाद स्थानीय backup/restore के लिए इसे **इंटरनेट की ज़रूरत नहीं**; केवल क्लाउड
गंतव्य (`rclone`/`restic`/ssh) ही नेटवर्क से बात करते हैं।

## Verbs

| Verb | Args (JSON) | Returns |
|------|-------------|---------|
| `ping` | `{}` | `{ok,version,abi}` |
| `overview` | `{user?}` | `{ok:true,apps,instances,path_backups,jobs,backups_size,free,total}` गिनती (आकार bytes में): backups वाले ऐप्स, कुल backup इंस्टेंस, स्वतंत्र path backups, निर्धारित कार्य, कुल backups आकार, और backups फ़ाइल सिस्टम का खाली/कुल। non-detached, तुरंत लौटती है; WebUI होम ओवरव्यू द्वारा उपयोग की जाती है। |
| `config-get` | `{}` | `{ok,config}` |
| `config-set` | config ऑब्जेक्ट (या `{key,value}`) | `{ok}` |
| `keygen` | `{}` | एन्क्रिप्शन के लिए `age` keypair बनाता है |
| `list-apps` | `{user?}` | `{ok,apps:[{package,label,system,versionCode}]}` (dex, shell fallback) |
| `label` | `{package,user?}` | `{ok,label}` (असली स्थानीयकृत ऐप नाम, संदर्भ-मुक्त) |
| `icon` | `{package,user?,vc?}` | `{ok,package,icon}` (base64 PNG; प्रति package+`vc` कैश किया गया) |
| `backup` | नीचे देखें | `{ok,opid}` (detached) |
| `restore` | नीचे देखें | `{ok,opid}` (detached) |
| `import` | `{from,ref,password,ssaid,user}` | `{ok,opid}` (detached) |
| `import-scan` | `{from,path}` | `{ok,backups:[...]}` |
| `progress` | base64(opid) | live `progress-<opid>.json` |
| `cancel` | base64(opid) | `{ok,cancelled}` |
| `list-ops` | `{}` | `{ok,ops:[...]}` (पुनः कनेक्ट होने के बाद reattach) |
| `list-apps`/`icons` | `{user?}` / `{user?,items:[{package,vc}]}` | ऐप सूची / बैच base64 आइकन |
| `list-backups` | `{package?}` | `{ok,backups:[{ref,package,label,versionName,versionCode,created_at,mode,items}]}` |
| `list-users` | `{}` | `{ok,users:[{id,name}]}` डिवाइस के Android उपयोगकर्ता (मल्टी-यूज़र). |
| `list-dirs` | `{path}` | `{ok,path,parent,dirs:[...]}` किसी पथ की उप-निर्देशिकाएँ (फ़ोल्डर पिकर). |
| `path-list` | `{user?}` | `{ok,backups:[...]}` स्वतंत्र फ़ोल्डर/फ़ाइल बैकअप. |
| `provenance` | `{}` | बंडल बाइनरी का ऑडिट मैनिफ़ेस्ट (`PROVENANCE.json`). |
| `backup-info` | `{ref}` | `{ok,...}` एक backup का पूरा विवरण (संस्करण, इंस्टॉल स्रोत, स्थिति, तिथि, mode, आकार, items, अनुमति गणना, डिवाइस) |
| `backup-icon` | `{ref}` | `{ok,icon}` manifest से base64 PNG (ऐप अनइंस्टॉल होने पर भी काम करता है) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref का backups निर्देशिका के अंतर्गत होना आवश्यक) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` किसी पैकेज के नवीनतम N रखें |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` ऑडिट लॉग, नवीनतम पहले |
| `log-export` | `{user?}` | `{ok:true,path}` (backups डायरेक्टरी के अंदर लिखी गई `.txt` का पूर्ण path) या `{ok:false,code:"ERR_LOG_EXPORT"}`. गतिविधि लॉग (`audit.jsonl`) और एक छोटा build/डिवाइस हेडर एक ही उपयोगकर्ता-दृश्य टेक्स्ट फ़ाइल में लिखती है ताकि इसे bug रिपोर्ट से संलग्न किया जा सके। non-detached, तुरंत लौटती है। |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth/calendar/wallpaper/dns/system_settings) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` सिस्टम-व्यापी backup (detached) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (रिबूट आवश्यक; `confirm` इसे गेट करता है) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `path-backup` | `{path,compression?,password?}` | `{ok,opid}` किसी भी निरपेक्ष पथ का `tar.zst`+`manifest.json` के रूप में `.paths/` के अंतर्गत backup लेता है (detached) |
| `path-restore` | `{ref,confirm:true,password?}` | `{ok,opid}` किसी पथ backup को उसके मूल स्थान पर restore करता है (`confirm` इसे गेट करता है; detached) |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | किसी इंस्टॉल्ड ऐप को सिस्टम ऐप के रूप में माउंट करें (systemless उप-मॉड्यूल; NoMount के ज़रिए live अन्यथा अगले बूट पर) |
| `companion-status` / `companion-install` | `{}` | Google Drive साथी स्थिति / ऑन-डिमांड इंस्टॉल |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | गंतव्य प्रबंधन |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | rclone remote प्रबंधन (वह `rclone.conf` प्रविष्टि बनाता है जिसकी ओर `type:"rclone"` dest इशारा करता है); `backend` कोई भी rclone backend हो सकता है, कोई श्वेतसूची नहीं |
| `remote-authorize` | `{backend}` | `{ok:true,url}` (इंजन पहले ही Android VIEW intent के ज़रिए फ़ोन का ब्राउज़र उस सहमति URL पर खोल चुका है) या `{ok:false,code:"ERR_AUTHORIZE"}`। ऑन-डिवाइस OAuth के लिए एक स्थानीय callback सर्वर (`127.0.0.1:53682`) पर `rclone authorize <backend>` चलाता है। |
| `remote-authorize-poll` | `{}` | प्रतीक्षा के दौरान `{ok:true,done:false,url}`, उपयोगकर्ता की सहमति मिलने पर `{ok:true,done:true,token}` (वह `token` जो `remote-add` को भेजना है), या `{ok:false,code:"ERR_AUTHORIZE"}`। |
| `remote-authorize-cancel` | `{}` | `{ok:true,cancelled:true}`; किसी लंबित प्राधिकरण को रोकता है। |
| `cloud-status` | `{}` | `{ok,rclone,restic,fetchable,size}` (क्या `rclone`/`restic` बाइनरी मौजूद हैं, क्या यह `lite` संस्करण उन्हें ला सकता है, डाउनलोड आकार बाइट में) |
| `cloud-fetch` | `{}` | `{ok,opid}` (detached) `lite` संस्करण पर `rclone`/`restic` ऐडऑन डाउनलोड+सत्यापन+इंस्टॉल करता है |
| `schedule-set` / `schedule-list` / `schedule-delete` | नीचे देखें | निर्धारित कार्य (एक बैकअप या एक restore; एक अकेले ऐप, एक समूह, या सभी ऐप्स को लक्षित करते हुए) |
| `scheduler-tick` | `{}` | देय कार्य चलाता है + धारण लागू करता है + ऑटो-बैकअप ऑब्ज़र्वर (boot heartbeat इसे कॉल करता है) |
| `update-check` | `{}` | `{ok,current_version,current_code,latest_version,latest_code,update_available,zipUrl,changelog,notes}` (detached नहीं; तुरंत लौटता है; विफलता पर `ERR_UPDATE_CHECK`, नीचे देखें) |
| `backup-batch` | `{packages:[...], ...backup args}` | `{ok,opid}` (detached) कई ऐप्स का एक ही अलग ऑपरेशन में बैकअप लेता है; प्रगति में `n`/`of` रहता है। प्रति-ऐप विफलता बैच को नहीं रोकती। |
| `restore-batch` | `{refs:[...], ...restore args}` | `{ok,opid}` (detached) कई बैकअप को एक ही अलग ऑपरेशन में पुनर्स्थापित करता है; प्रगति में `n`/`of` रहता है। प्रति-ऐप विफलता बैच को नहीं रोकती। |
| `list-volumes` | `{}` | `{ok,volumes:[{path,removable,id?}]}` फ़ोल्डर चयनकर्ता के लिए स्टोरेज वॉल्यूम: आंतरिक और हटाने योग्य SD कार्ड / USB। |
| `config-export` | `{password}` | `{ok,opid}` (detached) कॉन्फ़िग, जॉब, गंतव्य, क्रेडेंशियल्स और कुंजियों को बैकअप फ़ोल्डर में एक पासफ़्रेज़-एन्क्रिप्टेड फ़ाइल में निर्यात करता है। |
| `config-import` | `{ref,password}` | `{ok,opid}` (detached) निर्यात की गई कॉन्फ़िग फ़ाइल को इस डिवाइस में वापस मर्ज करता है (कभी भी आँख मूँदकर अधिलेखित नहीं करता)। |
| `config-exports` | `{}` | `{ok,exports:[{ref,name,size}]}` आयात के लिए उपलब्ध एन्क्रिप्टेड कॉन्फ़िग फ़ाइलें सूचीबद्ध करता है। |
| `wipe-credentials` | `{}` | `{ok,wiped}` सहेजे गए रिमोट पासवर्ड और डिवाइस एन्क्रिप्शन कुंजी हटाता है; गंतव्य, जॉब और बैकअप बने रहते हैं। |
| `log-prune` | `{}` | `{ok}` बहुत पहले पूर्ण हो चुके ऑप लॉग छाँटता है, ऑडिट ट्रेल सीमित करता है और पुराने आइकन हटाता है (बूट सेवा इसे कॉल करती है)। |

### `progress` फ़ील्ड

`progress` को poll करने पर कार्रवाई का live `progress-<opid>.json` लौटता है। ये फ़ील्ड
**हमेशा मौजूद** रहते हैं:

| फ़ील्ड | प्रकार | अर्थ |
|-------|------|---------|
| `opid` | string | कार्रवाई id |
| `percent` | int | 0-100 पूर्णता |
| `phase` | string | वर्तमान चरण लेबल |
| `item` | string | संसाधित किया जा रहा वर्तमान आइटम प्रकार |
| `done` | bool | किसी टर्मिनल लेखन (finish / dry-run / restore-test) पर true |

एक चल रही कार्रवाई इन **वैकल्पिक** live फ़ील्ड को भी ले जा सकती है। अज्ञात होने पर ये
अनुपस्थित या खाली रहते हैं, और **टर्मिनल लेखनों पर हटा दिए जाते हैं** (finish / dry-run /
restore-test):

| फ़ील्ड | प्रकार | अर्थ |
|-------|------|---------|
| `rate` | string | स्थानांतरण गति, जैसे `"4.2 MiB/s"` (खाली = अज्ञात) |
| `eta` | string | अनुमानित शेष समय, जैसे `"1m12s"` (खाली = अज्ञात) |
| `n` | int | वर्तमान आइटम अनुक्रमणिका (0 = अज्ञात) |
| `of` | int | कुल आइटम गणना (0 = अज्ञात) |
| `cur` | string | वर्तमान आइटम नाम (खाली = कोई नहीं) |

क्लाउड ट्रांसफर `rate`/`eta` भरते हैं (percent rclone से आता है); स्थानीय Full backup
`n`/`of`/`cur` भरते हैं। चरण लेबल में चेकसम-सील चरण **`verified`** और, क्लाउड ट्रांसफर के लिए,
**`transfer`** तथा **`mirror <item>`** शामिल हैं।

### `backup` के args

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

`restore`/`import` `{ref}` लेते हैं (एक backup निर्देशिका / scan ref)। `restore` यह भी स्वीकार करता है:
`"items"` (बैकअप के आइटम प्रकारों का एक उपसमुच्चय जिसे पुनर्स्थापित करना है; सभी के लिए छोड़ दें), `"test": true`
(एक temp निर्देशिका में निकालकर सत्यापित करें, बिना live ऐप को छुए), snapshot/mirror के लिए `"mode"`,
किसी एन्क्रिप्टेड बैकअप के लिए `"password"`, `"ssaid"` (opt-in), और इंस्टॉल-स्रोत विकल्प
`"spoof_installer"` (config से डिफ़ॉल्ट, इंस्टॉल के समय installer को Play Store पर सेट करता है) तथा
`"deep_spoof": true` (उन्नत opt-in; पैकेज डेटाबेस संपादित करके आरंभकर्ता पैकेज और पैकेज स्रोत को भी गढ़ता
है, एक रिबूट के बाद लागू होता है)। `import` `"from": "neo" | "databackup"` लेता है और, किसी
एन्क्रिप्टेड Neo backup के लिए, `"password"`।

### `schedule-set` के args

एक निर्धारित कार्य **एक** लक्ष्य और एक **action** चुनता है:

```json
{
  "id": "nightly-games",
  "action": "backup",             // "backup" (default) | "restore"
  "package": "com.example.app",   // एक ऐप   (या)
  "packages": ["com.a","com.b"],  // ऐप्स का एक समूह   (या)
  "all": true,                    // सभी ऐप्स, बहिष्कृत-ऐप्स सूची को छोड़कर
  "cron": "daily",                // hourly | daily | weekly
  "at": "02:30",                  // HH:MM
  "mode": "full",
  "dest": "local",
  "keep": 5,
  "items": ["apk","data"],
  "require_wifi": false,          // गेट: केवल Wi-Fi पर चलाएँ
  "require_charging": false,      // गेट: केवल चार्ज होते समय चलाएँ
  "min_battery": 0,               // गेट: केवल इस बैटरी स्तर या उससे ऊपर चलाएँ % (0-100)
  "days": [1,2,3,4,5]             // गेट: केवल इन सप्ताह-दिनों पर चलाएँ (0=रविवार)
}
```

लक्ष्य के लिए `package`, `packages` या `all` में से ठीक **एक** दें। एक `backup` कार्य सामान्य
`mode`/`dest`/`keep`/`items` बनाए रखता है। एक `restore` कार्य (`action: "restore"`) हर लक्षित ऐप का **सबसे हाल
का** backup (या एक स्पष्ट `ref`) restore करता है और **हर रन पर ऐप के वर्तमान डेटा को अधिलेखित करता है**: यह
जानबूझकर और opt-in है, इसलिए इसे केवल उपयोगकर्ता के सीधे अनुरोध पर ही सेट करें।

### शेड्यूलर गेटिंग

एक निर्धारित कार्य **वैकल्पिक गेट शर्तें** ले जा सकता है। जब किसी देय कार्य की गेट पूरी न हो,
तो उसे **छोड़ दिया जाता है और अगले tick पर, उसके शेड्यूल को आगे बढ़ाए बिना, पुनः प्रयास किया
जाता है** (उसका `last_run` मुहर नहीं किया जाता, इसलिए शर्त पूरी होते ही वह चल पड़ता है):

| फ़ील्ड | प्रकार | गेट |
|-------|------|------|
| `require_wifi` | bool | केवल Wi-Fi पर होते हुए चलाएँ |
| `require_charging` | bool | केवल चार्ज होते समय चलाएँ |
| `min_battery` | int (0-100) | केवल इस बैटरी स्तर या उससे ऊपर चलाएँ |
| `days` | array of int (0-6, 0=रविवार) | केवल इन सप्ताह-दिनों पर चलाएँ |

इनके ऊपर हमेशा एक न्यूनतम **ऊष्मीय सुरक्षा** जाँच लागू होती है: जब तक डिवाइस गंभीर रूप से गर्म
है, एक निर्धारित कार्रवाई छोड़ दी जाती है। हर गेट स्किप audit trail में `op:"scheduler-gated"` के
रूप में `wifi` / `charging` / `battery` / `days` / `thermal` में से किसी `reason` के साथ लिखा
जाता है।

### `remote-add` के args

एक क्लाउड गंतव्य एक `type:"rclone"` dest है जो किसी `rclone` remote का नाम देता है; उस
remote को पहले `remote-add` से बनाएँ। `backend` **कोई भी rclone backend** हो सकता है, कोई
श्वेतसूची नहीं है। `remote-add` किसी भी backend नाम को स्वीकार करता है (`dropbox`, `onedrive`,
`box`, `pcloud`, `mega`, `b2`, `s3`, `sftp`, `smb`, `webdav`, `ftp`, `drive` और rclone द्वारा
समर्थित ~70 अन्य), और `params` सीधे `key=value` जोड़ियों के रूप में `rclone` config में भेज दिए
जाते हैं। पासवर्ड फ़ील्ड अस्पष्ट रूप में संग्रहीत होते हैं, कभी भी स्पष्ट रूप में नहीं। सामान्य backend और
उनके `params`:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

**ऑन-डिवाइस OAuth (बिना PC के)।** जिन backend को ब्राउज़र से साइन-इन चाहिए (Google Drive, Dropbox,
OneDrive, Box, pCloud) उन्हें किसी डेस्कटॉप या हाथ से चिपकाए गए token की ज़रूरत नहीं। `remote-authorize`
को `{backend}` के साथ कॉल करें: इंजन एक स्थानीय callback सर्वर (`127.0.0.1:53682`) पर
`rclone authorize <backend>` चलाता है और Android VIEW intent के ज़रिए फ़ोन का अपना ब्राउज़र प्रदाता के
सहमति पृष्ठ पर खोलता है, और `{ok:true,url}` लौटाता है (या `{ok:false,code:"ERR_AUTHORIZE"}`)।
`remote-authorize-poll` (`{}`) को poll करें: यह प्रतीक्षा के दौरान `{ok:true,done:false,url}` और
उपयोगकर्ता की मंज़ूरी मिलने पर `{ok:true,done:true,token}` लौटाता है, वह `token` `remote-add` को भेजें।
`remote-authorize-cancel` (`{}`) किसी लंबित प्राधिकरण को रोकता है (`{ok:true,cancelled:true}`)। किसी भी
कंप्यूटर से `rclone authorize "<backend>"` के आउटपुट को हाथ से चिपकाना अब भी फ़ॉलबैक के रूप में समर्थित है।

Google Drive के दो रास्ते हैं: यह `drive` remote (किसी Google Cloud प्रोजेक्ट की ज़रूरत नहीं, rclone के
अपने OAuth का उपयोग करता है, ऑन-डिवाइस `remote-authorize` से प्राधिकृत करें, या किसी भी कंप्यूटर पर एक
बार `rclone authorize "drive"` चलाएँ और token भेजें) या opt-in साथी ऐप (आपका अपना OAuth client id)।
दोनों अंततः सामान्य गंतव्य बन जाते हैं।

### नेटवर्क नीति

config फ़ील्ड `network_policy` नियंत्रित करता है कि क्लाउड ट्रांसफर कौन-सा कनेक्शन उपयोग कर सकते हैं:
`any` (default), `wifi`, या `mobile`। इसे `config-set` से सेट करें। जब यह `wifi` या
`mobile` हो, तो हर क्लाउड ट्रांसफर (Full `rclone`/Drive अपलोड, Mirror sync, remote
`restic` snapshot backup/restore, Mirror restore) पहले सक्रिय ट्रांसपोर्ट जाँचता है और
मेल न खाने पर `ERR_NET_POLICY` के साथ रुक जाता है, मैनुअल और निर्धारित दोनों कार्यों के लिए।
स्थानीय गंतव्यों पर कभी रोक नहीं लगती।

### क्लाउड अखंडता और कोटा

- **चेकसम सील (क्लाउड)।** किसी सफल क्लाउड कॉपी के बाद engine एक remote चेकसम जाँच
  (`rclone check`) चलाता है; मेल न खाने पर कार्रवाई `ERR_VERIFY` के साथ विफल होती है। जिन backend
  का स्थानीय पक्ष के साथ कोई साझा hash नहीं होता, उन्हें छोड़ दिया जाता है (यह विफलता नहीं है)।
- **कोटा जाँच (क्लाउड, Full mode)।** किसी `rclone` remote पर Full-mode अपलोड से पहले engine
  remote का खाली स्थान (`rclone about --json`) पूछता है और यदि backup फ़िट न हो तो `ERR_QUOTA` के
  साथ मना कर देता है। जो remote कोटा जानकारी नहीं बताते, उन्हें छोड़ दिया जाता है। Mirror mode एक
  delta sync है और इससे मुक्त है।

### क्लाउड बाइनरी (`lite` संस्करण)

`full` संस्करण सभी बाइनरी को बंडल करता है और कभी नेटवर्क की ज़रूरत नहीं होती। `lite` संस्करण दो
सबसे बड़ी, `rclone` और `restic`, को छोड़ देता है और जब आप पहली बार कोई क्लाउड या snapshot क्रिया
चलाते हैं तब उन्हें ऑन-डिमांड लाता है। `cloud-status` बताता है कि क्या वे पहले से मौजूद हैं, क्या यह
संस्करण उन्हें ला सकता है, और डाउनलोड आकार बाइट में। `cloud-fetch` **detached** चलता है (इसके
`opid` के साथ `progress` को पोल करें): यह प्रति-आर्किटेक्चर `rclone`+`restic` ऐडऑन डाउनलोड करता है,
मॉड्यूल में बेक किए गए SHA-256 के विरुद्ध उसे सत्यापित करता है, और उसे रनटाइम कैश में इंस्टॉल करता
है। इसके प्रगति चरण `downloading`, `verifying`, और `installing` हैं; अंतिम कोड सफलता पर `ERR_NONE`
है, या विफलता पर `ERR_FETCH` (डाउनलोड विफल) / `ERR_FETCH_VERIFY` (चेकसम मेल नहीं खाया, छोड़ दिया
गया)। `full` संस्करण पर यह अनावश्यक है। `lite` संस्करण पर किसी क्लाउड या snapshot गंतव्य के लिए
`backup`/`restore`, बाइनरी मौजूद होने से पहले, `ERR_CLOUD_FETCHABLE` के साथ विफल होता है; क्लाइंट
को `cloud-fetch` चलाने की पेशकश करनी चाहिए, फिर पुनः प्रयास करना चाहिए।

### विशेष backup श्रेणियाँ

`special-categories` बताता है कि किसी डिवाइस में कौन-सी सिस्टम-व्यापी श्रेणियाँ हैं; `special-backup`
उन श्रेणियों को कैप्चर करता है जो आप `categories` में पास करते हैं और `special-restore` उन्हें फिर से
लागू करता है। श्रेणियाँ हैं:

| श्रेणी | यह क्या है | restore शब्दार्थ |
|----------|-----------|-------------------|
| `messages` | SMS/MMS | provider प्रतिस्थापन (मिटाएँ + निकालें) |
| `contacts` | संपर्क और कॉल लॉग | provider प्रतिस्थापन (मिटाएँ + निकालें) |
| `wifi` | सहेजे गए Wi-Fi नेटवर्क | provider प्रतिस्थापन (मिटाएँ + निकालें) |
| `bluetooth` | Bluetooth जोड़ियाँ | provider प्रतिस्थापन (मिटाएँ + निकालें) |
| `calendar` | कैलेंडर provider (`com.android.providers.calendar`, app + डेटा); `calendar.json` में पोर्टेबल रूप से भी निर्यात | provider प्रतिस्थापन (मिटाएँ + निकालें) |
| `wallpaper` | होम और लॉक वॉलपेपर तथा `wallpaper_info.xml`, कच्चे (बाइनरी) रूप में संग्रहीत | फ़ाइलें प्रतिस्थापित |
| `dns` | निजी DNS mode और विनिर्देशक, settings से पढ़ा गया | idempotent `settings put` |
| `system_settings` | system/global/secure settings का पूरा dump | **opt-in**, idempotent `settings put`, डिवाइस settings को अधिलेखित करता है |

**`system_settings` कड़ाई से opt-in है और restore पर विनाशकारी है।** `ssaid` की तरह, यह restore
किए जाने पर डिवाइस-व्यापी settings को अधिलेखित करता है, इसलिए यह उपयोगकर्ता की स्पष्ट सहमति के पीछे
गेट किया गया है और audit trail में लिखा जाता है। इसे कभी default रूप से न चुनें; केवल किसी सीधे,
जानबूझकर किए गए उपयोगकर्ता अनुरोध पर।

### स्वतंत्र पथ backup

`path-backup` / `path-restore` साझा स्टोरेज पर या `/data` के अंतर्गत **किसी भी निरपेक्ष पथ**: एक
फ़ोल्डर या एक अकेली फ़ाइल, का backup और restore करते हैं, प्रति-app मॉडल से बाहर। संग्रह
VDBackup के अपने प्रारूप में `tar.zst` तथा एक `manifest.json` के रूप में लिखा जाता है (SHA-256
सीलबंद, एन्क्रिप्टेड होने पर एक RECOVERY kit के साथ), backups निर्देशिका में `.paths/` के अंतर्गत।

```json
// path-backup
{ "path": "/sdcard/DCIM/Camera", "compression": "zstd:10", "password": "..." }
// path-restore
{ "ref": "<.paths ref>", "confirm": true, "password": "..." }
```

- स्रोत पथ **निरपेक्ष** होना चाहिए और अनुमत रूट्स में से एक के अंतर्गत होना चाहिए:
  `/storage/emulated`, `/data/media`, `/sdcard`, `/data`. जो पथ मौजूद नहीं है वह `ERR_NO_PATH`
  के साथ विफल होता है; अनुमत रूट्स से बाहर का पथ, या `..` वाला पथ, `ERR_BAD_PATH` के साथ विफल होता है।
- `path-restore` मूल स्थान पर वापस लिखता है, इसलिए यह विनाशकारी है और `"confirm": true` की माँग
  करता है, `special-restore` की तरह एक भारी-घर्षण वाला गेट। एक `ref` जो वैध पथ backup नहीं है,
  `ERR_BAD_REF` के साथ विफल होता है।
- दोनों **detached** चलते हैं; लौटाए गए `opid` के साथ `progress` को poll करें।

### `update-check`

`update-check` बताता है कि मॉड्यूल का कोई नया संस्करण प्रकाशित हुआ है या नहीं, ताकि कोई एजेंट
(या WebUI) उसे दिखा सके। यह एक **तुरंत लौटने वाला read verb** है, यह **detached नहीं** है, इसलिए
poll करने के लिए कोई `opid` नहीं होता। केवल उपयोगकर्ता की स्पष्ट क्रिया से ट्रिगर होकर, यह बंडल किए
गए `curl` से root-साइड HTTP अनुरोध के ज़रिए मॉड्यूल का प्रकाशित अपडेट मैनिफ़ेस्ट (`module.prop` में से
`updateJson` URL) लाता है, यह WebView के बाहर चलता है, इसलिए WebUI की CSP के अधीन नहीं है, और
प्रकाशित `versionCode` की तुलना इंस्टॉल किए गए से करता है। यह **कोई आर्गुमेंट नहीं** लेता।

सफल होने पर यह लौटाता है:

| फ़ील्ड | प्रकार | अर्थ |
|--------|--------|------|
| `ok` | bool | `true` |
| `current_version` | string | इंस्टॉल किया गया versionName |
| `current_code` | int | इंस्टॉल किया गया versionCode |
| `latest_version` | string | प्रकाशित versionName |
| `latest_code` | int | प्रकाशित versionCode |
| `update_available` | bool | `true` जब `latest_code`, `current_code` से बड़ा हो |
| `zipUrl` | string | प्रकाशित zip का URL |
| `changelog` | string | प्रकाशित changelog का URL |
| `notes` | string | रिलीज़ नोट्स |

यदि कोई `updateJson` URL नहीं है, नेटवर्क अनुरोध विफल हो जाता है, या मैनिफ़ेस्ट पार्स नहीं हो पाता,
तो यह `{"ok":false,"code":"ERR_UPDATE_CHECK"}` लौटाता है।

`update-check` केवल उपलब्धता और रिलीज़ नोट्स की **रिपोर्ट** करता है; अपडेट स्वयं आपका root मैनेजर
(KernelSU / APatch / Magisk) मॉड्यूल के `updateJson` के ज़रिए करता है, कभी भी यह verb नहीं।

## सुरक्षा रेलिंग जिनका आपके एजेंट को पालन करना चाहिए

- **`ssaid` कड़ाई से opt-in है (default बंद)।** यह एक सिस्टम फ़ाइल को फिर से लिखकर डिवाइस के
  ANDROID_ID का backup / restore करता है; कोई restore केवल एक reboot के बाद लागू होता है, और
  पिछली फ़ाइल rollback के लिए हमेशा पहले सहेजी जाती है। `"ssaid": true` केवल किसी सीधे,
  जानबूझकर किए गए उपयोगकर्ता अनुरोध पर भेजें, कभी भी default रूप से नहीं।
- **परिवर्तनकारी क्रियाएँ (restore, delete, import) विनाशकारी हैं** और एक स्थानीय ऑडिट
  ट्रेल (`logs/audit.jsonl`) में लॉग की जाती हैं। Restore विश्वासयोग्य है (wipe-फिर-निकालें), इसलिए
  यह ऐप को backup की ठीक-ठीक स्थिति में वापस कर देता है। उन्हें कॉल करने से पहले इरादे की पुष्टि करें।
- **`system_settings` opt-in और विनाशकारी है, ठीक `ssaid` की तरह।** इसे restore करना
  डिवाइस-व्यापी settings को अधिलेखित करता है, इसलिए इसे केवल किसी सीधे उपयोगकर्ता अनुरोध पर भेजें; यह
  स्पष्ट सहमति द्वारा गेट किया गया है और audit trail में दर्ज होता है।
- **Restore idempotent है।** कच्चे provider restore (messages/contacts/wifi/bluetooth/calendar)
  विलय करने के बजाय **प्रतिस्थापित** करते हैं, provider डेटा मिटा दिया जाता है और संग्रह उसके ऊपर
  निकाला जाता है, इसलिए उसी backup को फिर से restore करने से पंक्तियाँ दोहराई नहीं जा सकतीं। `dns`
  और `system_settings` idempotent `settings put` से फिर से लागू किए जाते हैं।
- **संग्रह निष्कर्षण पथ-ट्रैवर्सल के विरुद्ध सुरक्षित है।** Restore root के रूप में चलता है, इसलिए हर
  संग्रह (restore, import, special-restore, path-restore) किसी भी लेखन से पहले जाँचा जाता है: वह संग्रह
  जिसके सदस्य निरपेक्ष पथ उपयोग करते हैं या `..` रखते हैं, एक भी विनाशकारी लेखन होने से पहले
  `ERR_UNSAFE_ARCHIVE` के साथ पहले ही अस्वीकार कर दिया जाता है (GNU tar भी `--no-absolute-names` के
  साथ चलता है)। एक छेड़छाड़ किया गया संग्रह कभी अपनी लक्ष्य निर्देशिका से बाहर नहीं निकल सकता।
- संरक्षण (SELinux/uid/gid/modes/xattr) या APK नियम (APK हमेशा संपीड़ित होते हैं,
  कभी एन्क्रिप्ट नहीं जब तक `encrypt_apk` सेट न हो) को **कभी कमज़ोर न करें**।
- JSON आउटपुट को सत्य के स्रोत के रूप में लें; `ok`/`code` जाँचें, `progress` poll करें,
  और अनुमान लगाने के बजाय `ERR_*` कोड सामने लाएँ।

आंतरिक विवरण के लिए [ARCHITECTURE.md](ARCHITECTURE.md) और
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) देखें।

<!-- doc-footer -->

---

> _यह दस्तावेज़ Claude (Anthropic) से तैयार किया गया है और इसे VD171 द्वारा अनुरक्षित किया जाता है। सुधार और संशोधन का स्वागत है; देखें [CONTRIBUTING.md](CONTRIBUTING.md)।_
