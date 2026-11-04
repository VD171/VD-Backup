<!--
  VD BACKUP - full app & data backup and restore as root, from a WebUI.
  Copyright (C) 2026  VD171 - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<p align="center">
  <img src="module/webroot/assets/logo-wordmark.png" alt="VDBackup" width="320">
</p>

<p align="center">
  <b>रूट के रूप में पूर्ण ऐप और डेटा बैकअप तथा पुनर्स्थापना - पूरी तरह एक WebUI से संचालित।</b><br>
  KernelSU / APatch / Magisk मॉड्यूल। कोई "grant su" संकेत नहीं, कोई <code>sucompat</code> टॉगल नहीं।
</p>

<p align="center">
  <a href="https://github.com/VD171/VD-Backup/releases">रिलीज़</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki">विकी</a> ·
  <a href="docs/USER-GUIDE.md">उपयोक्ता मार्गदर्शिका</a> ·
  <a href="docs/AI-AGENTS.md">एआई एजेंट</a> ·
  <a href="CONTRIBUTING.md">योगदान</a> ·
  <a href="https://xdaforums.com/t/VD-Backup.4807267/">XDA थ्रेड</a>
</p>

> **Languages:** [English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

---

## यह क्या है

VDBackup एक रूट **WebUI मॉड्यूल** है जो आपके ऐप्स और उनके डेटा का बैकअप लेता और पुनर्स्थापित करता है,
**मुख्य सुविधाओं के लिए किसी साथी ऐप के बिना** - क्योंकि मॉड्यूल पहले से ही रूट है, इसलिए "अनुमति देने"
जैसा कुछ नहीं है। इसका लक्ष्य है कि लोकप्रिय बैकअप ऐप्स जो कुछ करते हैं वह सब एक ही जगह, एक साफ-सुथरी
WebUI के साथ उपलब्ध हो।

इसे **Swift Backup, Neo-Backup और Android-DataBackup** के खुले, रूट-मूल **उत्तराधिकारी** के रूप में
बनाया गया है: उन सबके कामों का मेल, AGPLv3 के तहत, और यह मौजूदा Neo-Backup तथा Android-DataBackup
बैकअप तक आयात कर सकता है ताकि आप आसानी से स्थानांतरित हो सकें।

## सुविधाएँ

- **ऐप्स:** APK (बेस + स्प्लिट्स), ऐप डेटा (`/data/data`), डिवाइस-सुरक्षित डेटा
  (`/data/user_de`), बाहरी डेटा (`Android/data`), OBB, मीडिया।
- **सिस्टम/विशेष डेटा:** अनुमतियाँ, AppOps, और (ऑप्ट-इन) SSAID, जहाँ रूट अनुमति देता है।
- **बैकअप मोड:** **Full** (पोर्टेबल `tar.zst`), **Snapshot** (वृद्धिशील +
  संस्करणित, `restic` के ज़रिए) और **Mirror** (1:1 सिंक, `rclone`/`rsync` के ज़रिए)।
- **निष्ठापूर्ण संरक्षण:** SELinux संदर्भ, uid/gid, मोड, xattr और क्षमताएँ (capabilities)।
- **संपीड़न:** कोई नहीं / lz4 / zstd / gzip (gzip = "संगतता मोड", कहीं भी खुलता है)।
- **एन्क्रिप्शन:** वैकल्पिक और पोर्टेबल (`age` + पासफ़्रेज़, या AES-256 zip) - कभी भी डिवाइस हार्डवेयर
  से बँधा नहीं, इसलिए बैकअप किसी दूसरे डिवाइस पर पुनर्स्थापित होता है या किसी PC पर खुलता है।
- **गंतव्य:** लोकल, SFTP, SCP, SMB, WebDAV, FTP, S3 और 70+ और (`rclone`),
  साथ ही `rsync` और `restic` रिपॉज़िटरी। एक छोटे, ऑप्ट-इन साथी के ज़रिए वैकल्पिक Google Drive।
- **अखंडता:** हर आर्काइव को मैनिफ़ेस्ट के विरुद्ध सत्यापित किया जाता है; dry-run और restore-test आपको
  किसी बैकअप को बिना कुछ छुए जाँचने देते हैं।
- **चयनात्मक पुनर्स्थापना:** किसी बैकअप के आइटम का कोई भी उपसमुच्चय पुनर्स्थापित करें; बैकअप हटाएँ और हर
  विध्वंसक क्रिया का एक गतिविधि/ऑडिट लॉग रखें।
- **विशेष बैकअप:** संदेश (SMS/MMS), संपर्क और कॉल लॉग, Wi-Fi और Bluetooth, एक वैकल्पिक पोर्टेबल JSON
  निर्यात के साथ जिसे आप किसी PC पर खोल सकते हैं।
- **शेड्यूलिंग + ऑटोमेशन:** keep-N छँटाई के साथ दोहराए जाने वाले कार्य, साथ ही इंस्टॉल/अपडेट पर ऑप्ट-इन
  स्वचालित बैकअप और एक बहिष्कृत-ऐप्स सूची।
- **इंस्टॉल स्रोत:** पुनर्स्थापित ऐप्स डिफ़ॉल्ट रूप से अपने इंस्टॉल स्रोत के रूप में Play Store बताते हैं
  (टॉगल करने योग्य); एक उन्नत ऑप्ट-इन आरंभकर्ता पैकेज और स्रोत को भी गढ़ देता है।
- **सिस्टम-ऐप माउंटिंग:** असली `/system` विभाजन को छुए बिना किसी इंस्टॉल्ड ऐप को सिस्टम ऐप के रूप में
  माउंट करें (systemless ओवरले उप-मॉड्यूल, NoMount-सजग)।
- **पृष्ठभूमि:** बैकअप/पुनर्स्थापना अलग से चलती है और WebUI बंद करने पर भी चलती रहती है, आरंभ/समाप्ति
  सूचनाओं के साथ।
- **आयात:** मौजूदा Neo-Backup और Android-DataBackup बैकअप आयात करता है, जिनमें पासवर्ड-एन्क्रिप्टेड
  भी शामिल हैं।

## स्थापना

1. नवीनतम `VD-Backup-vX.Y.zip` को [रिलीज़](https://github.com/VD171/VD-Backup/releases) से डाउनलोड करें।
2. इसे KernelSU / APatch / Magisk प्रबंधक में फ़्लैश करें - तुरंत उपयोग योग्य, रीबूट की आवश्यकता नहीं।
3. बैकअप को कॉन्फ़िगर करने और चलाने के लिए मॉड्यूल की **WebUI** खोलें। बस इतना ही।

**संस्करण।** हर रिलीज़ छह zips के रूप में आती है। `universal-full` - हर आर्किटेक्चर और हर binary (cloud प्रदाताओं के लिए `rclone` और snapshots के लिए `restic` सहित), कोई भी डिवाइस, सबसे बड़ा। `universal-lite` - हर आर्किटेक्चर, पर दो सबसे बड़ी binaries (`rclone`, `restic`) हटाकर, सबसे छोटा, और अब भी local, SSH/SFTP और `rsync` बैकअप करता है। `<abi>-full` (`arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`) - एक ही आर्किटेक्चर, हर binary के साथ, `universal-full` से छोटा। अपना आर्किटेक्चर जानते हैं -> `<abi>-full` चुनें; सबसे छोटा या बिना cloud के बड़े binaries चाहिए -> `universal-lite`; हर डिवाइस पर सब कुछ -> `universal-full`। [रिलीज़](https://github.com/VD171/VD-Backup/releases) देखें।

यहाँ नए हैं? [उपयोक्ता मार्गदर्शिका](docs/USER-GUIDE.md) आपको स्थापना से पुनर्स्थापना तक ले जाती है।

## पोर्टेबिलिटी

आपके बैकअप **इस मॉड्यूल में बंद नहीं हैं**। सब कुछ मानक प्रारूपों
(`tar`, `gzip`, `zstd`, `age`, `zip`, `restic`) का उपयोग करता है जो Windows, macOS और Linux पर
सामान्य उपकरणों या फ़ाइल प्रबंधकों से खुलते हैं। हर एन्क्रिप्टेड बैकअप के साथ एक **RECOVERY** नोट आता है
जिसमें किसी PC पर डिक्रिप्ट और एक्सट्रैक्ट करने के ठीक-ठीक कमांड होते हैं।

## बिल्ड

मॉड्यूल shell + WebUI के साथ-साथ प्रति-ABI स्थिर बाइनरियाँ (`tar`, `zstd`, `lz4`,
`rclone`, `rsync`, ssh, `restic`) है, जो `armeabi-v7a`, `arm64-v8a`, `x86`,
`x86_64` के लिए बनाई गई हैं। [CONTRIBUTING.md](CONTRIBUTING.md) और CI वर्कफ़्लो देखें।

## दस्तावेज़ीकरण

- **[विकी](https://github.com/VD171/VD-Backup/wiki)** - दस्तावेज़, ऑनलाइन ब्राउज़ करने योग्य।
- **[उपयोक्ता मार्गदर्शिका](docs/USER-GUIDE.md)** - आद्योपांत, स्थापना से पुनर्स्थापना तक।
- **[एआई एजेंट](docs/AI-AGENTS.md)** - JSON API के ज़रिए हर क्रिया को बिना इंटरफ़ेस के चलाएँ।
- **[आर्किटेक्चर](ARCHITECTURE.md)** और **[फ़ाइल संरचना](docs/FILE-STRUCTURE.md)** - यह कैसे काम करता है।
- **[साथ दी गई बाइनरी](docs/BINARIES.md)** - हर पूर्व-संकलित बाइनरी का स्रोत और SHA-256, पूर्ण ऑडिट के लिए।
- **[रिकवरी](module/etc/RECOVERY.md)** - मॉड्यूल के बिना PC पर बैकअप खोलें और डिक्रिप्ट करें।
- **[योगदान](CONTRIBUTING.md)** और **[सुरक्षा](SECURITY.md)**।
- **[बदलाव सूची](CHANGELOG.md)** और **[आचार संहिता](CODE_OF_CONDUCT.md)**।

## एआई-अनुकूल

VDBackup को केवल लोगों के लिए ही नहीं, बल्कि एआई सहायकों और एजेंटों के लिए भी स्वागतयोग्य बनाया
गया है। इंजन JSON बोलता है (हर `helper.sh` क्रिया एक एकल JSON ऑब्जेक्ट लौटाती है), कोड, दस्तावेज़ और
फ़ाइल संरचना मशीन-पठन के लिए व्यवस्थित हैं, और एआई-सहायित योगदानों की समीक्षा और स्वीकृति किसी भी अन्य
की तरह होती है। एक एजेंट उसी API के ज़रिए, जिसे WebUI उपयोग करती है, मॉड्यूल की **हर** क्रिया को बिना
इंटरफ़ेस के संचालित कर सकता है - पूर्ण नियंत्रण सतह के लिए
**[docs/AI-AGENTS.md](docs/AI-AGENTS.md)** देखें, और योगदान के लिए
[CONTRIBUTING.md](CONTRIBUTING.md#ai-contributors-welcome) देखें।

## संपर्क

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Channel:** @Priv8_VD https://t.me/Priv8_VD
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171

## यह भी देखें

उसी लेखक की सहोदर परियोजनाएँ:

- **[VDInfos](https://github.com/VD171/VD-Infos)** - एक डिवाइस मेथड डिबगर: हर आइटम को उस हर मेथड से पढ़ता है जो उसे पढ़ सकता है और उनकी साथ-साथ तुलना करता है।
- **[VDGoogle](https://github.com/VD171/VD-Google)** - आपकी Google सेवाएँ (RCS, Wallet, Play Integrity प्रमाणन), बिना इंटरनेट के आपके डिवाइस पर पढ़ी जाती हैं।
- **[COPG-VD](https://github.com/VD171/COPG-VD)** - एक डिवाइस स्पूफ़र जो एक ताज़ा फ़िंगरप्रिंट को एक सुसंगत, संगत प्रोफ़ाइल में बदल देता है।

## लाइसेंस

[GNU AGPL-3.0-or-later](LICENSE)। नेटवर्क कॉपीलेफ़्ट: यदि आप एक संशोधित संस्करण चलाते हैं,
चाहे एक सेवा के रूप में ही क्यों न हो, तो आपको उसका स्रोत उपलब्ध कराना होगा।

---

`android` `backup` `restore` `app-data` `migration` `neo-backup` `databackup` `kernelsu` `apatch` `magisk` `webui` `root` `tar` `zstd` `restic` `rclone` `age` `encryption` `ssaid` `appops` `on-device` `agpl` `ai-friendly` `vdbackup`
