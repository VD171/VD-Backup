> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · हिन्दी · [Bahasa Indonesia](../in/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

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
- लंबी कार्रवाइयाँ (`backup`, `restore`, `import`) तुरंत `{"ok":true,"opid":"..."}` लौटाती हैं
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
| `backup-info` | `{ref}` | `{ok,...}` एक backup का पूरा विवरण (संस्करण, इंस्टॉल स्रोत, स्थिति, तिथि, mode, आकार, items, अनुमति गणना, डिवाइस) |
| `backup-icon` | `{ref}` | `{ok,icon}` manifest से base64 PNG (ऐप अनइंस्टॉल होने पर भी काम करता है) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref का backups निर्देशिका के अंतर्गत होना आवश्यक) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` किसी पैकेज के नवीनतम N रखें |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` ऑडिट लॉग, नवीनतम पहले |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` सिस्टम-व्यापी backup (detached) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (रिबूट आवश्यक; `confirm` इसे गेट करता है) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | किसी इंस्टॉल्ड ऐप को सिस्टम ऐप के रूप में माउंट करें (systemless उप-मॉड्यूल; NoMount के ज़रिए live अन्यथा अगले बूट पर) |
| `companion-status` / `companion-install` | `{}` | Google Drive साथी स्थिति / ऑन-डिमांड इंस्टॉल |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | गंतव्य प्रबंधन |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | rclone remote प्रबंधन (वह `rclone.conf` प्रविष्टि बनाता है जिसकी ओर `type:"rclone"` dest इशारा करता है) |
| `schedule-set` / `schedule-list` / `schedule-delete` | `{id,package,mode,dest,cron,at,keep,items}` | निर्धारित कार्य |
| `scheduler-tick` | `{}` | देय कार्य चलाता है + धारण लागू करता है + ऑटो-बैकअप ऑब्ज़र्वर (boot heartbeat इसे कॉल करता है) |

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
  "ssaid": false                  // OPT-IN, see below
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

### `remote-add` के args

एक क्लाउड गंतव्य एक `type:"rclone"` dest है जो किसी `rclone` remote का नाम देता है; उस
remote को पहले `remote-add` से बनाएँ। पासवर्ड फ़ील्ड अस्पष्ट रूप में संग्रहीत होते हैं, कभी भी
स्पष्ट रूप में नहीं। समर्थित `backend` मान और उनके `params`:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

Google Drive के दो रास्ते हैं: यह `drive` remote (किसी Google Cloud प्रोजेक्ट की ज़रूरत नहीं, rclone के
अपने OAuth का उपयोग करता है - किसी भी कंप्यूटर पर एक बार `rclone authorize "drive"` चलाएँ और
token भेजें) या opt-in साथी ऐप (आपका अपना OAuth client id)। दोनों अंततः सामान्य
गंतव्य बन जाते हैं।

### नेटवर्क नीति

config फ़ील्ड `network_policy` नियंत्रित करता है कि क्लाउड ट्रांसफर कौन-सा कनेक्शन उपयोग कर सकते हैं:
`any` (default), `wifi`, या `mobile`। इसे `config-set` से सेट करें। जब यह `wifi` या
`mobile` हो, तो हर क्लाउड ट्रांसफर (Full `rclone`/Drive अपलोड, Mirror sync, remote
`restic` snapshot backup/restore, Mirror restore) पहले सक्रिय ट्रांसपोर्ट जाँचता है और
मेल न खाने पर `ERR_NET_POLICY` के साथ रुक जाता है - मैनुअल और निर्धारित दोनों कार्यों के लिए।
स्थानीय गंतव्यों पर कभी रोक नहीं लगती।

## सुरक्षा रेलिंग जिनका आपके एजेंट को पालन करना चाहिए

- **`ssaid` कड़ाई से opt-in है (default बंद)।** यह एक सिस्टम फ़ाइल को फिर से लिखकर डिवाइस के
  ANDROID_ID का backup / restore करता है; कोई restore केवल एक reboot के बाद लागू होता है, और
  पिछली फ़ाइल rollback के लिए हमेशा पहले सहेजी जाती है। `"ssaid": true` केवल किसी सीधे,
  जानबूझकर किए गए उपयोगकर्ता अनुरोध पर भेजें - कभी भी default रूप से नहीं।
- **परिवर्तनकारी क्रियाएँ (restore, delete, import) विनाशकारी हैं** और एक स्थानीय ऑडिट
  ट्रेल (`logs/audit.jsonl`) में लॉग की जाती हैं। Restore विश्वासयोग्य है (wipe-फिर-निकालें), इसलिए
  यह ऐप को backup की ठीक-ठीक स्थिति में वापस कर देता है। उन्हें कॉल करने से पहले इरादे की पुष्टि करें।
- संरक्षण (SELinux/uid/gid/modes/xattr) या APK नियम (APK हमेशा संपीड़ित होते हैं,
  कभी एन्क्रिप्ट नहीं जब तक `encrypt_apk` सेट न हो) को **कभी कमज़ोर न करें**।
- JSON आउटपुट को सत्य के स्रोत के रूप में लें; `ok`/`code` जाँचें, `progress` poll करें,
  और अनुमान लगाने के बजाय `ERR_*` कोड सामने लाएँ।

आंतरिक विवरण के लिए [ARCHITECTURE.md](ARCHITECTURE.md) और
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) देखें।

---

*यह दस्तावेज़ीकरण Claude (Anthropic) के साथ तैयार किया गया था और इसे VD171 द्वारा अनुरक्षित किया जाता है। सुधार और बेहतरी का स्वागत है - [CONTRIBUTING.md](CONTRIBUTING.md) देखें।*
