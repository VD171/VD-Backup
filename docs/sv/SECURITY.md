> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · Svenska · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Українська](../uk/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# Säkerhetspolicy

VDBackup körs som root och hanterar dina data och (valfritt) dina inloggningsuppgifter och
krypteringslösenfraser. Vi tar säkerheten på allvar.

## Rapportera en sårbarhet

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

Inkludera en tydlig beskrivning och, om möjligt, steg för att återskapa. Vi svarar så
snart vi kan och ger dig erkännande om du vill.

## Noteringar om omfattning

- Inloggningsuppgifter och lösenfraser lagras krypterade i vila och skrivs aldrig i
  klartext. Säkerhetskopior binds aldrig till enhetsbundna hårdvarunycklar (så att de förblir
  portabla), vilket också betyder att lösenfrasen är det som skyddar en krypterad säkerhetskopia -
  välj en stark. 
- Dessa inloggningsuppgifter finns på autentiseringskrypterad lagring (`/data/misc_ce`), låst till den första upplåsningen efter en omstart, så aldrig läsbara före den, till skillnad från `/data/adb`. En moduluppdatering flyttar dit gamla kopior permanent (varje verifieras innan originalet tas bort) och de består över ominstallationer.
- En lokal säkerhetskopieringsdestination måste själv förbli krypterad i vila: endast intern och flyttbar användarlagring tillåts, aldrig `/data/adb`, `/data/system` eller andra sökvägar som är läsbara före första upplåsningen, och aldrig en `..`-traversering. Flyttbara SD/USB är inte krypterade i vila, så du varnas (blockeras inte) att slå på säkerhetskopieringskryptering för dem.
- Den valfria Google Drive-följeslagar-appen bör alltid döljas med [HMA-OSS](https://github.com/frknkrc44/HMA-OSS) så att den
  inte avslöjar root eller en upplåst bootloader.
- Återställning körs som root, så varje arkiv kontrolleras innan något skrivs: en
  säkerhetskopia vars innehåll pekar utanför sitt mål (en absolut sökväg eller en `..`-komponent)
  avvisas, och ingen fil packas upp förrän hela arkivet har godkänts.
- Varje förkompilerad binär och bibliotek kan spåras till en fastnålad offentlig uppström med en
  registrerad SHA-256, och manifestet levereras på enheten, så att den medföljande nyttolasten kan
  granskas och reproduceras. Se [BINARIES.md](BINARIES.md).

<!-- doc-footer -->

---

> _Denna dokumentation genererades med Claude (Anthropic) och underhålls av VD171. Rättelser och förbättringar välkomnas; se [CONTRIBUTING.md](CONTRIBUTING.md)._
