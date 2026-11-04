> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · Nederlands · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# Beveiligingsbeleid

VDBackup draait als root en verwerkt je gegevens en (optioneel) je inloggegevens en
versleutelingswachtwoordzinnen. We nemen beveiliging serieus.

## Een kwetsbaarheid melden

- **Site:** https://vd171.ru
- **Site:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/VD-Backup/issues (alleen niet-beveiligingsmeldingen)
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **XDA-thread:** https://xdaforums.com/t/VD-Backup.4807267/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-mail:** vd.priv8@pm.me

Voeg een duidelijke beschrijving toe en, indien mogelijk, stappen om te reproduceren. We reageren zo
snel als we kunnen en vermelden je als je dat wilt.

## Scope-notities

- Inloggegevens en wachtwoordzinnen worden versleuteld opgeslagen in rust en worden nooit in
  platte tekst geschreven. Backups worden nooit gekoppeld aan apparaatgebonden hardwaresleutels (zodat ze
  draagbaar blijven), wat ook betekent dat de wachtwoordzin is wat een versleutelde backup beschermt -
  kies een sterke.
- De optionele Google Drive-begeleidende app moet altijd verborgen worden met HMA-OSS zodat hij
  geen root of een ontgrendelde bootloader onthult.
