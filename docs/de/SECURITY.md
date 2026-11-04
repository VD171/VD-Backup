> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · Deutsch · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# Sicherheitsrichtlinie

VDBackup läuft als Root und verarbeitet deine Daten und (optional) deine Zugangsdaten und
Verschlüsselungspassphrasen. Wir nehmen Sicherheit ernst.

## Eine Schwachstelle melden

- **Site:** https://vd171.ru
- **Site:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/VD-Backup/issues (nur Nicht-Sicherheitsmeldungen)
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **XDA-Thread:** https://xdaforums.com/t/VD-Backup.4807267/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-Mail:** vd.priv8@pm.me

Füge eine klare Beschreibung und, wenn möglich, Schritte zur Reproduktion bei. Wir antworten so
schnell wir können und nennen dich, wenn du möchtest.

## Hinweise zum Geltungsbereich

- Zugangsdaten und Passphrasen werden im Ruhezustand verschlüsselt gespeichert und niemals im
  Klartext geschrieben. Backups sind niemals an geräteabhängige Hardware-Schlüssel gebunden (damit sie
  portabel bleiben), was auch bedeutet, dass die Passphrase das ist, was ein verschlüsseltes Backup schützt -
  wähle eine starke.
- Die optionale Google-Drive-Begleit-App sollte immer mit HMA-OSS versteckt werden, damit sie
  weder Root noch einen entsperrten Bootloader verrät.
