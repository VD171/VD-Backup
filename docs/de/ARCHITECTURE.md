> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · Deutsch · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# Architektur

VDBackup ist ein Root-WebUI-Modul. Es besteht aus drei Schichten: der **WebUI** (was Sie sehen),
dem **Shell-Backend** (was die Arbeit erledigt, als Root) und den **mitgelieferten Binaries**
(die Archivierer und Transporte). Alles läuft bereits als Root, sodass es keine
Berechtigungsabfrage und keine Begleit-App für die Kernfunktionen gibt.

```
   ┌──────────────────────────────────────────────────────────┐
   │  WebUI  (module/webroot, vanilla JS)                      │
   │    index.html · scripts.js · i18n.js · styles.css         │
   │    lang/en.js + 21 languages · config.json (CSP, no net)  │
   └───────────────┬──────────────────────────────────────────┘
                   │  ksu.exec("sh scripts/helper.sh <verb> <b64json>")
                   ▼
   ┌──────────────────────────────────────────────────────────┐
   │  scripts/helper.sh  (dispatcher, returns JSON)            │
   │    list-apps · config · dests · backup/restore/import ... │
   │    long ops -> setsid nohup scripts/worker.sh  (detached) │
   └───────────────┬───────────────────────────────┬──────────┘
                   │                               │ progress-<opid>.json (poll)
                   ▼                               ▼
   ┌────────────────────────────────────┐   ┌──────────────────────────┐
   │  scripts/worker.sh (root, detached)│   │  framework helper (opt.) │
   │   force-stop · tar|zstd|age        │   │  app_process + dex       │
   │   pm install · chown/chcon         │   │  perms/appops/ssaid/...  │
   │   transfer · notify                │   │  (dex primary, shell fb) │
   └───────────────┬────────────────────┘   └──────────────────────────┘
                   ▼
   ┌──────────────────────────────────────────────────────────┐
   │  bin/<abi>/  tar · zstd · lz4 · rclone · rsync · ssh · restic │
   └──────────────────────────────────────────────────────────┘
                   ▼
   Destinations: local · SFTP/SCP · SMB · WebDAV · FTP · S3 · 70+ (rclone)
                 rsync · restic repos · Google Drive (opt-in companion)
```

## Kernpunkte

- **Bereits Root.** Der Modulprozess läuft als Root, daher ist die Engine reine Shell. ~85% der
  Arbeit ist reine Shell (`tar`/`zstd`/`age`/`pm`/`am`/`chown`/`chcon`/`rclone`/...).
- **Losgelöste Ausführung.** Backup/Restore laufen über `setsid nohup` als eigenständiger Root-
  Prozess. Das Schließen der WebUI unterbricht sie nicht; die UI klinkt sich wieder ein, indem sie
  `logs/progress-<opid>.json` liest.
- **Framework-Helfer (~15%).** Feingranulare Berechtigungen, AppOps, SSAID, StorageStats,
  Icons und privilegiertes Wi-Fi benötigen das Android-Framework. Ein kleiner `dex`-Lauf über
  `app_process` (keine installierte App) erledigt diese, mit einem Shell-Fallback.
- **Portabilität.** Nur Standardformate; Backups lassen sich auf einem PC ohne dieses Modul öffnen.
- **Der Zustand** liegt in `/data/adb/vdbackup/` (Konfiguration, Jobs, Ziele, verschlüsselte
  Anmeldedaten, Logs, Staging). **Backups** werden in nutzersichtbaren, zugangsdaten-
  verschlüsselten Speicher unter `/sdcard/VDBackup/` geschrieben (`/data/media/<user>/VDBackup`, pro Nutzer),
  nicht in `/data/adb` (das geräteverschlüsselt und vor dem ersten Entsperren lesbar ist).

## Kompatibilitätsgarantie

Ein Backup muss für immer wiederherstellbar bleiben. Dies ist eine harte Regel, kein bloßes Bemühen.

**Geltungsbereich.** Die Garantie gilt für Backups, die von **v1.01 an** (die erste offiziell
veröffentlichte Version) und nur von offiziell veröffentlichten, freigegebenen Versionen
geschrieben wurden. v1.00 war ein reiner Test-Build und ist ausdrücklich ausgenommen; Vorab- und
Entwicklungs-Builds sind nicht abgedeckt. Ab der ersten öffentlichen Veröffentlichung ist das
untenstehende Versprechen absolut:

- **Nur Standardformate.** Jedes Archiv ist ein einfaches `tar`, komprimiert mit `zstd`,
  `gzip` oder `lz4`, optional mit `age` umhüllt. Es gibt keinen proprietären Container, sodass
  ein Backup auf jedem PC mit gewöhnlichen Werkzeugen auch ohne dieses Modul geöffnet werden kann (siehe
  `etc/RECOVERY.md`). Ein Format, das wir nicht fallen lassen können.
- **Nur anhängende Metadaten.** `manifest.json` trägt `format_version`. Das Schema wächst nur
  jemals: Felder dürfen *hinzugefügt*, aber niemals entfernt, umbenannt oder umgewidmet werden. Restore liest
  jedes Feld defensiv (fehlende optionale Felder fallen auf einen Standard zurück) und installiert
  APKs und entpackt Archive anhand ihres Dateinamens und ihrer Erweiterung, nicht durch die Annahme einer festen
  Manifest-Form.
- **Vorwärtskompatible Wiederherstellung.** Restore lehnt ein Backup nie wegen seines Alters ab, und ein
  älteres VDBackup überspringt stillschweigend Elementtypen, die es nicht kennt, statt zu scheitern. Ein neueres
  VDBackup stellt daher jedes ältere Backup wieder her, und die Standardformat-Archive bleiben ohnehin
  von Hand wiederherstellbar.

Kurz gesagt: Alles, was VDBackup je geschrieben hat, kann jedes zukünftige VDBackup (und ein einfacher PC)
weiterhin wiederherstellen. Das Format auf eine Weise zu ändern, die ein früheres Backup unbrauchbar macht, ist nicht
erlaubt; neue Fähigkeiten werden hinter `format_version` und neuen, hinzufügenden Feldern ergänzt.

Für das vollständige technische Design (Archivformat, Metadatenschema, Pipelines, Krypto,
Ziele, Importeure) führen die Maintainer detaillierte Designnotizen; diese Datei ist der
an Mitwirkende gerichtete Überblick.

*Diese Dokumentation wurde mit Claude (Anthropic) erstellt und wird von VD171 gepflegt. Korrekturen und Verbesserungen sind willkommen - siehe [CONTRIBUTING.md](CONTRIBUTING.md).*
