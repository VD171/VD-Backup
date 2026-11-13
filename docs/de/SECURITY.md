> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · Deutsch · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Українська](../uk/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# Sicherheitsrichtlinie

VDBackup läuft als Root und verarbeitet deine Daten und (optional) deine Zugangsdaten und
Verschlüsselungspassphrasen. Wir nehmen Sicherheit ernst.

## Eine Schwachstelle melden

- **Site:** https://vd171.ru
- **Site:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/VD-Backup/issues
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
- Diese Zugangsdaten liegen auf credential-verschlüsseltem Speicher (`/data/misc_ce`), gesperrt bis zur ersten Entsperrung nach einem Neustart, also vor dieser Entsperrung nie lesbar, anders als `/data/adb`. Ein Modul-Update verschiebt Altkopien dauerhaft dorthin (jede wird vor dem Entfernen des Originals geprüft), und sie bleiben über Neuinstallationen erhalten.
- Ein lokales Backup-Ziel muss selbst im Ruhezustand verschlüsselt bleiben: erlaubt sind nur interner und wechselbarer Nutzerspeicher, nie `/data/adb`, `/data/system` oder andere vor der ersten Entsperrung lesbare Pfade und nie ein `..`-Durchlauf. Wechselmedien (SD/USB) sind im Ruhezustand nicht verschlüsselt, daher werden Sie gewarnt (nicht blockiert), die Backup-Verschlüsselung dafür zu aktivieren.
- Die optionale Google-Drive-Begleit-App sollte immer mit [HMA-OSS](https://github.com/frknkrc44/HMA-OSS) versteckt werden, damit sie
  weder Root noch einen entsperrten Bootloader verrät.
- Die Wiederherstellung läuft als Root, daher wird jedes Archiv geprüft, bevor irgendetwas
  geschrieben wird: ein Backup, dessen Inhalte außerhalb ihres Ziels zeigen (ein absoluter
  Pfad oder eine `..`-Komponente), wird abgelehnt, und keine Datei wird entpackt, bis das
  gesamte Archiv freigegeben ist.
- Jede vorkompilierte Binärdatei und Bibliothek ist auf einen fixierten öffentlichen Upstream mit
  einem festgehaltenen SHA-256 zurückverfolgbar, und das Manifest wird auf dem Gerät mitgeliefert,
  sodass die gebündelte Nutzlast geprüft und reproduziert werden kann. Siehe [BINARIES.md](BINARIES.md).

<!-- doc-footer -->

---

> _Diese Dokumentation wurde mit Claude (Anthropic) erstellt und wird von VD171 gepflegt. Korrekturen und Verbesserungen sind willkommen; siehe [CONTRIBUTING.md](CONTRIBUTING.md)._
