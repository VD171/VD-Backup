> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · हिन्दी · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# आर्किटेक्चर

VDBackup एक root WebUI मॉड्यूल है। इसकी तीन परतें हैं: **WebUI** (जो आप देखते हैं),
**shell backend** (जो काम करता है, root के रूप में), और **बंडल किए गए बाइनरी**
(आर्काइवर और ट्रांसपोर्ट)। सब कुछ पहले-से-root चलता है, इसलिए कोई
अनुमति प्रॉम्प्ट नहीं और मुख्य फीचर्स के लिए कोई साथी ऐप नहीं।

```
   ┌──────────────────────────────────────────────────────────┐
   │  WebUI  (module/webroot, vanilla JS)                      │
   │    index.html · scripts.js · i18n.js · styles.css         │
   │    lang/en.js + 21 languages · config.json (CSP, no net)  │
   └───────────────┬──────────────────────────────────────────┘
                   │  ksu.exec("sh scripts/helper.sh <verb> <b64json>")
                   ▼
   ┌──────────────────────────────────────────────────────────┐
   │  scripts/helper.sh  (dispatcher, returns JSON)            │
   │    list-apps · config · dests · backup/restore/import ... │
   │    long ops -> setsid nohup scripts/worker.sh  (detached) │
   └───────────────┬───────────────────────────────┬──────────┘
                   │                               │ progress-<opid>.json (poll)
                   ▼                               ▼
   ┌────────────────────────────────────┐   ┌──────────────────────────┐
   │  scripts/worker.sh (root, detached)│   │  framework helper (opt.) │
   │   force-stop · tar|zstd|age        │   │  app_process + dex       │
   │   pm install · chown/chcon         │   │  perms/appops/ssaid/...  │
   │   transfer · notify                │   │  (dex primary, shell fb) │
   └───────────────┬────────────────────┘   └──────────────────────────┘
                   ▼
   ┌──────────────────────────────────────────────────────────┐
   │  bin/<abi>/  tar · zstd · lz4 · rclone · rsync · ssh · restic │
   └──────────────────────────────────────────────────────────┘
                   ▼
   Destinations: local · SFTP/SCP · SMB · WebDAV · FTP · S3 · 70+ (rclone)
                 rsync · restic repos · Google Drive (opt-in companion)
```

## मुख्य बिंदु

- **पहले-से root.** मॉड्यूल प्रोसेस root है, इसलिए इंजन सादा shell है। ~85% काम
  शुद्ध shell है (`tar`/`zstd`/`age`/`pm`/`am`/`chown`/`chcon`/`rclone`/...)।
- **पृथक निष्पादन.** बैकअप/रिस्टोर `setsid nohup` के ज़रिए एक स्वतंत्र root प्रोसेस के
  रूप में चलते हैं। WebUI बंद करने से वे बाधित नहीं होते; UI
  `logs/progress-<opid>.json` पढ़कर फिर से जुड़ जाता है।
- **Framework helper (~15%).** बारीक अनुमतियाँ, AppOps, SSAID, StorageStats,
  आइकन और विशेषाधिकार-प्राप्त Wi-Fi के लिए Android framework चाहिए। `app_process` के ज़रिए चलाया गया
  एक छोटा `dex` (कोई इंस्टॉल्ड ऐप नहीं) इन्हें संभालता है, shell fallback के साथ।
- **पोर्टेबिलिटी.** केवल मानक फ़ॉर्मैट; बैकअप इस मॉड्यूल के बिना PC पर खुल जाते हैं।
- **State** `/data/adb/vdbackup/` में रहता है (config, jobs, destinations, एन्क्रिप्टेड
  क्रेडेंशियल, logs, staging)। **बैकअप** उपयोगकर्ता-दृश्य, क्रेडेंशियल-एन्क्रिप्टेड स्टोरेज
  `/sdcard/VDBackup/` में लिखे जाते हैं (`/data/media/<user>/VDBackup`, प्रति उपयोगकर्ता),
  `/data/adb` में नहीं (जो डिवाइस-एन्क्रिप्टेड है और पहले अनलॉक से पहले पढ़ा जा सकता है)।

## संगतता की गारंटी

एक बैकअप हमेशा रिस्टोर-योग्य रहना चाहिए। यह एक कठोर नियम है, कोई best-effort नहीं।

**दायरा.** यह गारंटी **v1.01 और उसके बाद** (पहली आधिकारिक रूप से प्रकाशित रिलीज़) द्वारा लिखे गए बैकअप
को, और केवल आधिकारिक रूप से प्रकाशित, जारी किए गए संस्करणों द्वारा लिखे गए बैकअप को कवर करती है। v1.00
केवल-परीक्षण वाला बिल्ड था और स्पष्ट रूप से दायरे से बाहर है; प्री-रिलीज़ और विकास बिल्ड कवर नहीं हैं।
पहली सार्वजनिक रिलीज़ से आगे, नीचे दिया गया वादा पूर्ण है:

- **केवल मानक फ़ॉर्मैट.** हर आर्काइव एक सादा `tar` है जो `zstd`,
  `gzip` या `lz4` से कंप्रेस किया गया है, वैकल्पिक रूप से `age` से लपेटा गया। कोई proprietary कंटेनर नहीं, इसलिए
  एक बैकअप इस मॉड्यूल के बिना भी किसी भी PC पर सामान्य टूल्स से खोला जा सकता है (देखें
  `etc/RECOVERY.md`)। एक फ़ॉर्मैट जिसे हम छोड़ नहीं सकते।
- **Append-only मेटाडेटा.** `manifest.json` `format_version` रखता है। स्कीमा केवल
  बढ़ता ही है: फ़ील्ड *जोड़े* जा सकते हैं, कभी हटाए, नाम बदले या पुनर्प्रयोजित नहीं होते। रिस्टोर हर फ़ील्ड को
  रक्षात्मक ढंग से पढ़ता है (गुम वैकल्पिक फ़ील्ड एक डिफ़ॉल्ट पर गिर जाते हैं) और APK को
  उनके फ़ाइल नाम और एक्सटेंशन से इंस्टॉल करता है व आर्काइव निकालता है, न कि एक निश्चित
  manifest आकार मान कर।
- **आगे-संगत रिस्टोर.** रिस्टोर किसी बैकअप को पुराना होने के कारण कभी अस्वीकार नहीं करता, और
  एक पुराना VDBackup जिन आइटम टाइप्स को नहीं जानता उन्हें फेल होने के बजाय चुपचाप छोड़ देता है। इसलिए एक नया
  VDBackup किसी भी पुराने बैकअप को रिस्टोर करता है, और मानक-फ़ॉर्मैट आर्काइव चाहे जो भी हो
  हाथ से रिस्टोर-योग्य बने रहते हैं।

संक्षेप में: VDBackup ने जो कुछ भी कभी लिखा है, हर भविष्य का VDBackup (और एक सादा PC)
उसे अभी भी रिस्टोर कर सकता है। फ़ॉर्मैट को इस तरह बदलना जो पहले के किसी बैकअप को तोड़े, अनुमत
नहीं है; नई क्षमताएँ `format_version` और नए, अतिरिक्त फ़ील्ड के पीछे जोड़ी जाती हैं।

पूर्ण तकनीकी डिज़ाइन (आर्काइव फ़ॉर्मैट, मेटाडेटा स्कीमा, पाइपलाइन, क्रिप्टो,
destinations, importers) के लिए मेंटेनर विस्तृत डिज़ाइन नोट्स रखते हैं; यह फ़ाइल
कंट्रिब्यूटर-मुखी अवलोकन है।

*यह दस्तावेज़ीकरण Claude (Anthropic) के साथ तैयार किया गया था और इसे VD171 द्वारा अनुरक्षित किया जाता है। सुधार और बेहतरी का स्वागत है - [CONTRIBUTING.md](CONTRIBUTING.md) देखें।*
