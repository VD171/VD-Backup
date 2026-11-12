> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · Nederlands · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# Beveiligingsbeleid

VDBackup draait als root en verwerkt je gegevens en (optioneel) je inloggegevens en
versleutelingswachtwoordzinnen. We nemen beveiliging serieus.

## Een kwetsbaarheid melden

- **Site:** https://vd171.ru
- **Site:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/VD-Backup/issues
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
- Die inloggegevens staan op credential-versleutelde opslag (`/data/misc_ce`), vergrendeld tot de eerste ontgrendeling na een herstart, dus daarvoor nooit leesbaar, anders dan `/data/adb`. Een module-update verplaatst oude kopieën er permanent heen (elk gecontroleerd voordat het origineel wordt verwijderd) en ze blijven behouden over herinstallaties.
- Een lokale back-upbestemming moet zelf in rust versleuteld blijven: alleen interne en verwisselbare gebruikersopslag is toegestaan, nooit `/data/adb`, `/data/system` of andere paden die vóór de eerste ontgrendeling leesbaar zijn, en nooit een `..`-traversal. Verwisselbare SD/USB is in rust niet versleuteld, dus word je gewaarschuwd (niet geblokkeerd) om er back-upversleuteling voor in te schakelen.
- De optionele Google Drive-begeleidende app moet altijd verborgen worden met [HMA-OSS](https://github.com/frknkrc44/HMA-OSS) zodat hij
  geen root of een ontgrendelde bootloader onthult.
- Herstel draait als root, dus elk archief wordt gecontroleerd voordat er iets wordt geschreven:
  een backup waarvan de inhoud buiten het doel wijst (een absoluut pad of een `..`-component)
  wordt geweigerd, en er wordt geen bestand uitgepakt totdat het hele archief is goedgekeurd.
- Elk voorgecompileerd binair bestand en elke bibliotheek is te herleiden tot een vastgezette publieke
  upstream met een vastgelegde SHA-256, en het manifest wordt op het apparaat meegeleverd, zodat de
  gebundelde payload gecontroleerd en gereproduceerd kan worden. Zie [BINARIES.md](BINARIES.md).

<!-- doc-footer -->

---

> _Deze documentatie is gegenereerd met Claude (Anthropic) en wordt onderhouden door VD171. Correcties en verbeteringen zijn welkom; zie [CONTRIBUTING.md](CONTRIBUTING.md)._
