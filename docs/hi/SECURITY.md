> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · हिन्दी · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Українська](../uk/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# सुरक्षा नीति

VDBackup root के रूप में चलता है और आपके data और (वैकल्पिक रूप से) आपके credentials और
encryption passphrases को संभालता है। हम सुरक्षा को गंभीरता से लेते हैं।

## किसी भेद्यता की रिपोर्ट करना

- **Site:** https://vd171.ru
- **Site:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/VD-Backup/issues
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **XDA thread:** https://xdaforums.com/t/VD-Backup.4807267/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Channel:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-mail:** vd.priv8@pm.me

एक स्पष्ट विवरण शामिल करें और, यदि संभव हो, तो पुन: उत्पन्न करने के चरण। हम जितनी जल्दी
हो सके जवाब देंगे और अगर आप चाहें तो आपको श्रेय देंगे।

## Scope नोट्स

- Credentials और passphrases rest पर encrypted संग्रहीत होते हैं और कभी clear text में नहीं
  लिखे जाते। Backups कभी device-bound hardware keys से बंधे नहीं होते (ताकि वे portable
  रहें), जिसका यह भी मतलब है कि passphrase ही है जो एक encrypted backup की रक्षा करता है -
  एक मजबूत चुनें।
- ये क्रेडेंशियल्स क्रेडेंशियल-एन्क्रिप्टेड संग्रहण (`/data/misc_ce`) में रहते हैं, जो रीबूट के बाद पहले अनलॉक तक लॉक रहता है, इसलिए `/data/adb` के विपरीत उस अनलॉक से पहले कभी पढ़े नहीं जा सकते। मॉड्यूल अपडेट पुरानी प्रतियों को वहाँ स्थायी रूप से ले जाता है (मूल हटाने से पहले हर एक को सत्यापित करके), और वे पुनर्स्थापनाओं के बीच बनी रहती हैं।
- एक स्थानीय बैकअप गंतव्य स्वयं विश्राम अवस्था में एन्क्रिप्टेड रहना चाहिए: केवल आंतरिक और हटाने योग्य उपयोगकर्ता संग्रहण की अनुमति है, कभी `/data/adb`, `/data/system` या पहले अनलॉक से पहले पढ़े जा सकने वाले अन्य पथ नहीं, और कभी `..` ट्रैवर्सल नहीं। हटाने योग्य SD/USB विश्राम में बिल्कुल एन्क्रिप्टेड नहीं होता, इसलिए आपको उसके लिए बैकअप एन्क्रिप्शन चालू करने की चेतावनी दी जाती है (रोका नहीं जाता)।
- वैकल्पिक Google Drive companion app को हमेशा [HMA-OSS](https://github.com/frknkrc44/HMA-OSS) के साथ छिपाया जाना चाहिए ताकि
  यह root या एक unlocked bootloader को प्रकट न करे।
- Restore root के रूप में चलता है, इसलिए कुछ भी लिखे जाने से पहले हर archive की जाँच होती है:
  ऐसा कोई भी backup जिसकी सामग्री अपने target से बाहर की ओर इंगित करती है (एक absolute path
  या एक `..` component) अस्वीकार कर दिया जाता है, और जब तक पूरा archive पास नहीं हो जाता तब
  तक कोई file extract नहीं की जाती।
- हर prebuilt binary और library एक pinned public upstream तक पता लगाने योग्य है जिसका SHA-256 दर्ज है,
  और manifest डिवाइस पर ही भेजा जाता है, ताकि bundled payload का audit और पुनरुत्पादन किया जा सके।
  देखें [BINARIES.md](BINARIES.md)।

<!-- doc-footer -->

---

> _यह दस्तावेज़ Claude (Anthropic) से तैयार किया गया है और इसे VD171 द्वारा अनुरक्षित किया जाता है। सुधार और संशोधन का स्वागत है; देखें [CONTRIBUTING.md](CONTRIBUTING.md)।_
