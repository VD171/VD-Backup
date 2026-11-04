> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · हिन्दी · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# सुरक्षा नीति

VDBackup root के रूप में चलता है और आपके data और (वैकल्पिक रूप से) आपके credentials और
encryption passphrases को संभालता है। हम सुरक्षा को गंभीरता से लेते हैं।

## किसी भेद्यता की रिपोर्ट करना

- **Site:** https://vd171.ru
- **Site:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/VD-Backup/issues (केवल non-security reports)
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **XDA thread:** https://xdaforums.com/t/VD-Backup.4807267/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-mail:** vd.priv8@pm.me

एक स्पष्ट विवरण शामिल करें और, यदि संभव हो, तो पुन: उत्पन्न करने के चरण। हम जितनी जल्दी
हो सके जवाब देंगे और अगर आप चाहें तो आपको श्रेय देंगे।

## Scope नोट्स

- Credentials और passphrases rest पर encrypted संग्रहीत होते हैं और कभी clear text में नहीं
  लिखे जाते। Backups कभी device-bound hardware keys से बंधे नहीं होते (ताकि वे portable
  रहें), जिसका यह भी मतलब है कि passphrase ही है जो एक encrypted backup की रक्षा करता है -
  एक मजबूत चुनें।
- वैकल्पिक Google Drive companion app को हमेशा HMA-OSS के साथ छिपाया जाना चाहिए ताकि
  यह root या एक unlocked bootloader को प्रकट न करे।
