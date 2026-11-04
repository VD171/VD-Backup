> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · Italiano · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# Politica di sicurezza

VDBackup gira come root e gestisce i tuoi dati e (opzionalmente) le tue credenziali e
le passphrase di cifratura. Prendiamo la sicurezza sul serio.

## Segnalare una vulnerabilità

- **Site:** https://vd171.ru
- **Site:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/VD-Backup/issues (solo segnalazioni non di sicurezza)
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **XDA thread:** https://xdaforums.com/t/VD-Backup.4807267/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-mail:** vd.priv8@pm.me

Includi una descrizione chiara e, se possibile, i passaggi per riprodurre il problema. Risponderemo il
prima possibile e ti daremo credito se lo desideri.

## Note sull'ambito

- Le credenziali e le passphrase sono memorizzate cifrate a riposo e non vengono mai scritte in
  chiaro. I backup non sono mai legati a chiavi hardware vincolate al dispositivo (così da restare
  portabili), il che significa anche che la passphrase è ciò che protegge un backup cifrato -
  scegline una robusta.
- L'app companion opzionale per Google Drive dovrebbe sempre essere nascosta con HMA-OSS così da non
  rivelare il root o un bootloader sbloccato.
