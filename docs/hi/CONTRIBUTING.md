> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · हिन्दी · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# VDBackup में योगदान

मदद करने के लिए धन्यवाद! VDBackup को योगदान देने में आसान बनाया गया है। यह गाइड आपको
बताती है कि चीजें कहाँ रहती हैं और हम जिन कुछ conventions का पालन करते हैं।

## एक नज़र में प्रोजेक्ट

VDBackup एक **KernelSU/APatch/Magisk WebUI मॉड्यूल** है: shell scripts + एक vanilla-JS
WebUI + per-ABI static binaries। Core features के लिए किसी app की जरूरत नहीं है। देखें
[ARCHITECTURE.md](ARCHITECTURE.md) और [docs/FILE-STRUCTURE.md](FILE-STRUCTURE.md)।

यह **Swift Backup, Neo-Backup और Android-DataBackup** का खुला, root-native **उत्तराधिकारी**
है - AGPLv3 के तहत उनकी features का संघ, मौजूदा Neo-Backup और Android-DataBackup backups
के import के साथ ताकि लोग migrate कर सकें।

## AI योगदानकर्ताओं का स्वागत है

AI assistants और agents यहाँ first-class योगदानकर्ता हैं, बाद में सोची गई बात नहीं।

- प्रोजेक्ट को machine-readable बनाया गया है: हर `helper.sh` verb एक single
  JSON object प्रिंट करता है, engine साधारण POSIX shell है, और file layout
  [docs/FILE-STRUCTURE.md](FILE-STRUCTURE.md) में documented है।
- एक agent उस JSON API के माध्यम से मॉड्यूल के **हर** content और action को headlessly
  administer कर सकता है - पूरा control surface, verbs और safety rails
  [docs/AI-AGENTS.md](AI-AGENTS.md) में हैं।
- AI-assisted patches की समीक्षा और स्वीकृति किसी भी अन्य की तरह उन्हीं शर्तों पर की जाती
  है - correctness, clarity और नीचे दी गई conventions से, न कि किसने (या किसने) इसे लिखा।
- अगर आप VDBackup को एक agent से चलाते हैं, तो contract के रूप में `helper.sh` के JSON
  output का उपयोग करें; WebUI को scrape न करें।
- सबके लिए समान मानक: real features कभी कमजोर नहीं की जातीं, secrets और device data
  कभी repo में नहीं आते (देखें strict [.gitignore](.gitignore)), और mutating
  actions confirmed और audited रहते हैं।

## Dev setup

- टेस्ट करने के लिए आपको एक rooted device/emulator (KernelSU, APatch या Magisk) चाहिए।
- Flashable zip बनाएं: `cd module && zip -r9 ../VD-Backup-dev.zip .` फिर इसे flash करें।
- WebUI `module/webroot/` है (इसे root manager से खोलें)। Backend
  `module/helper.sh` (dispatcher) और `module/worker.sh` (detached engine) है।
- Native binaries `module/bin/<abi>/` में रहते हैं और CI द्वारा produce किए जाते हैं
  (`.github/scripts/build_bin.sh`); आप आमतौर पर इन्हें हाथ से rebuild नहीं करते।

## Conventions

- **हर source file** (`.sh`, `.js`, `.css`, `.html`, `.svg`, `.yml`) project banner
  header से शुरू होती है (इसे किसी भी मौजूदा फाइल से कॉपी करें)। कोई अपवाद नहीं।
- **Code और comments अंग्रेजी में।** Comments कम से कम रखें और केवल जहाँ जरूरत हो।
- **कोई em-dash या en-dash नहीं**; हमेशा एक plain hyphen `-` का उपयोग करें।
- WebUI **vanilla JS** है (एक `scripts.js`); कोई frameworks नहीं। root से केवल
  `helper(verb, args)` wrapper के माध्यम से बात करें, और हर interpolated value को escape करें।
- किसी real feature को **कभी कमजोर न करें** (जैसे SELinux/uid/gid/modes का संरक्षण)।
- Mutating actions (restore, delete) को confirmation मांगनी चाहिए और एक audit log लिखना चाहिए।

## Internationalization (i18n)

- UI strings `module/webroot/lang/` में रहती हैं। अंग्रेजी canonical fallback है
  (`en.js` + `en.json`); बाकी 20 भाषाएं `<code>.json` हैं।
- एक string जोड़ने या बदलने के लिए: `en.js` **और** `en.json` संपादित करें, फिर हर
  `<code>.json` अपडेट करें। एक visible label को छूने का मतलब है **सभी** language files और
  **सभी** `README.<code>.md` अपडेट करना।
- Translations साधारण JSON हैं - एक शानदार पहला योगदान। `module/webroot/i18n.js` में
  language list देखें।

## Commits और PRs

- PRs को focused रखें। क्या और क्यों का वर्णन करें।
- अपने commits को sign off करें (DCO): `git commit -s` (`Signed-off-by:` जोड़ता है)।
- CI green रहना चाहिए। reviews में दयालु रहें - देखें [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)।

## अच्छे पहले issues

`good first issue` और `help wanted` labels देखें। Translations, docs, नए
`rclone` destination presets और WebUI polish सभी बेहतरीन शुरुआती बिंदु हैं।
