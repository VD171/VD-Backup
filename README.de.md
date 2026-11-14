<!--
  VD BACKUP: full app & data backup and restore as root, from a WebUI.
  Copyright (C) 2026  VD171. SPDX-License-Identifier: AGPL-3.0-or-later
-->

# VD Backup

<p align="center">
  <img src="module/webroot/assets/logo-wordmark.png" alt="VD Backup" width="320">
</p>

<p align="center">
  <a href="https://github.com/VD171/VD-Backup/releases/latest"><img src="https://img.shields.io/github/v/release/VD171/VD-Backup?label=release&color=0969da" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0--or--later-1a7f37" alt="License"></a>
  <a href="https://github.com/VD171/VD-Backup/releases"><img src="https://img.shields.io/github/downloads/VD171/VD-Backup/total?label=downloads&color=8250df" alt="Downloads"></a>
  <a href="https://github.com/VD171/VD-Backup/stargazers"><img src="https://img.shields.io/github/stars/VD171/VD-Backup?color=d29922" alt="Stars"></a>
</p>

<p align="center">
  <b>Vollständiges Sichern und Wiederherstellen von Apps und Daten als root, komplett über eine WebUI gesteuert.</b><br>
  KernelSU- / APatch- / Magisk-Modul. Keine "su gewähren"-Abfrage, kein Umschalten von <code>sucompat</code>.
</p>

<p align="center">
  <a href="https://github.com/VD171/VD-Backup/releases">Releases</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/de-Home">Wiki</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/de-USER-GUIDE">Benutzerhandbuch</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/de-AI-AGENTS">KI-Agenten</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/de-ARCHITECTURE">Architektur</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/de-BINARIES">Mitgelieferte Binaries</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/de-CHANGELOG">Änderungsprotokoll</a> ·
  <a href="https://xdaforums.com/t/VD-Backup.4807267/">XDA thread</a>
</p>

> **Languages:** [English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

| Home | Apps | Schedule |
|:---:|:---:|:---:|
| ![Home](docs/screenshots/en/home-dark.png) | ![Apps](docs/screenshots/en/apps-dark.png) | ![Schedule](docs/screenshots/en/schedule-dark.png) |
| **Destinations** | **Settings** | **Activity log** |
| ![Destinations](docs/screenshots/en/destinations-dark.png) | ![Settings](docs/screenshots/en/settings-dark.png) | ![Activity log](docs/screenshots/en/activitylog-dark.png) |

---

## Was es ist

VDBackup ist ein root-**WebUI-Modul**, das deine Apps und deren Daten sichert und
wiederherstellt, **ohne Begleit-App für die Kernfunktionen**, denn weil das Modul
bereits root ist, gibt es nichts zu "erlauben". Es will alles abdecken, was die beliebten
Backup-Apps leisten, an einem Ort, mit einer aufgeräumten WebUI.

Es ist als offener, root-nativer **Nachfolger von Swift Backup, Neo-Backup und
Android-DataBackup** gedacht: die Vereinigung dessen, was sie tun, unter AGPLv3, und es kann sogar
vorhandene Backups von Neo-Backup und Android-DataBackup importieren, damit du umsteigen kannst.

## Funktionen

- **Apps:** APK (Basis + Splits), App-Daten (`/data/data`), gerätegeschützte Daten
  (`/data/user_de`), externe Daten (`Android/data`), OBB, Medien.
- **System-/Spezialdaten:** Berechtigungen, AppOps und (opt-in) SSAID, wo root es erlaubt.
- **Backup-Modi:** **Full** (portables `tar.zst`), **Snapshot** (inkrementell +
  versioniert, über `restic`) und **Mirror** (1:1-Synchronisierung, über `rclone`/`rsync`).
- **Originalgetreue Bewahrung:** SELinux-Kontexte, uid/gid, modes, xattr und capabilities.
- **Komprimierung:** keine / lz4 / zstd / gzip (gzip = "Kompatibilitätsmodus", öffnet sich überall).
- **Verschlüsselung:** optional und portabel (`age` + Passphrase oder AES-256-Zip), nie
  an die Geräte-Hardware gebunden, sodass ein Backup sich auf einem anderen Gerät wiederherstellen oder auf einem PC öffnen lässt.
- **Ziele:** lokal, SFTP, SCP, SMB, WebDAV, FTP, S3 und 70+ weitere (`rclone`),
  dazu `rsync`- und `restic`-Repos. Google Drive optional über einen winzigen opt-in-Begleiter.
- **Integrität:** jedes Archiv wird gegen das Manifest geprüft; Dry-Run und
  Restore-Test lassen dich ein Backup kontrollieren, ohne etwas anzufassen.
- **Selektive & stapelweise Wiederherstellung:** stelle eine beliebige Teilmenge der Elemente
  eines Backups wieder her oder wähle mehrere Backups aus und stelle sie alle auf einmal wieder
  her; lösche Backups und führe ein Aktivitäts-/Audit-Protokoll jeder destruktiven Aktion.
- **Spezial-Backups:** Nachrichten (SMS/MMS), Kontakte und Anrufliste, WLAN und Bluetooth,
  mit einem optionalen portablen JSON-Export, den du auf einem PC öffnen kannst.
- **Zeitplanung + Automatisierung:** wiederkehrende **Backup- oder Wiederherstellungs**-Jobs,
  die auf eine App, einen Satz oder alle Apps zielen, mit keep-N-Bereinigung, dazu
  opt-in-Auto-Backup bei Installation/Update und eine Liste ausgeschlossener Apps.
- **Installationsquelle:** wiederhergestellte Apps melden standardmäßig den Play Store als ihre
  Installationsquelle (umschaltbar); ein erweitertes Opt-in fälscht zusätzlich das initiierende
  Paket und die Quelle.
- **System-App-Einhängung:** hänge eine installierte App als System-App ein, ohne die echte
  `/system`-Partition anzufassen (systemloses Overlay-Submodul, NoMount-fähig).
- **Im Hintergrund:** Backup/Restore laufen losgelöst und überleben das Schließen der WebUI, mit
  Start-/Ende-Benachrichtigungen.
- **Hierher migrieren:** importiert vorhandene Backups von Neo-Backup und Android-DataBackup,
  einschließlich passwortverschlüsselter.

## Installation

1. Lade das neueste `VD-Backup-vX.Y.zip` von [Versionen](https://github.com/VD171/VD-Backup/releases) herunter.
2. Flashe es im KernelSU- / APatch- / Magisk-Manager, sofort nutzbar, kein Neustart nötig.
3. Öffne die **WebUI** des Moduls, um Backups zu konfigurieren und auszuführen. Das war's.

**Editionen.** Jedes Release wird als sechs Zips ausgeliefert. `universal-full`, jede Architektur und jede Binärdatei eingebettet (inkl. `rclone` für Cloud-Anbieter, `restic` für Snapshots), vollständig offline, nie wird etwas heruntergeladen, jedes Gerät, am größten. `universal-lite`, jede Architektur ohne die zwei größten Binärdateien (`rclone`, `restic`), am kleinsten; macht weiterhin lokale, SSH/SFTP- und `rsync`-Backups ohne jeden Download, und beim ersten Mal, wenn du ein Cloud-Ziel (`rclone`) oder den Snapshot-Modus (`restic`) nutzt, bietet es an, dieses kleine, architekturspezifische Add-on einmalig herunterzuladen (per SHA-256 verifiziert) und zwischenzuspeichern, sodass auch diese Funktionen laufen. `<abi>-full` (`arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`), eine einzelne Architektur mit jeder Binärdatei eingebettet, kleiner als `universal-full`. Kennst du deine Architektur -> nimm `<abi>-full`; willst du das kleinste und hast nichts gegen einen einmaligen Download für Cloud oder Snapshots -> `universal-lite`; willst du alles eingebettet ohne jeden Download (offline / Wiederherstellung) -> eine full-Edition. Siehe [Versionen](https://github.com/VD171/VD-Backup/releases).

Neu hier? Das [Benutzerhandbuch](docs/USER-GUIDE.md) begleitet dich von der Installation bis zur Wiederherstellung.

## Portabilität

Deine Backups **sind nicht an dieses Modul gebunden**. Alles nutzt Standardformate
(`tar`, `gzip`, `zstd`, `age`, `zip`, `restic`), die sich unter Windows, macOS und
Linux mit gängigen Werkzeugen oder Dateimanagern öffnen lassen. Jedes verschlüsselte Backup bringt eine
**RECOVERY**-Notiz mit den genauen Befehlen zum Entschlüsseln und Entpacken auf einem PC mit.

## Build

Das Modul besteht aus Shell + WebUI plus statischen Binaries pro ABI (`tar`, `zstd`, `lz4`,
`rclone`, `rsync`, ssh, `restic`), gebaut für `armeabi-v7a`, `arm64-v8a`, `x86`,
`x86_64`. Siehe [CONTRIBUTING.md](CONTRIBUTING.md) und die CI-Workflows.

## KI-freundlich

VDBackup ist so gebaut, dass es KI-Assistenten und -Agenten willkommen heißt, nicht nur Menschen.
Der Engine spricht JSON (jedes Verb von `helper.sh` gibt ein einzelnes JSON-Objekt zurück), der
Code, die Dokumentation und die Dateistruktur sind auf maschinelles Lesen ausgelegt, und
KI-unterstützte Beiträge werden wie alle anderen geprüft und angenommen. Ein Agent kann
**jede** Aktion des Moduls kopflos über dieselbe API verwalten, die die WebUI nutzt -
siehe **[docs/AI-AGENTS.md](docs/AI-AGENTS.md)** für die vollständige Steuerungsfläche, und
[CONTRIBUTING.md](CONTRIBUTING.md#ai-contributors-welcome) zum Mitwirken.

## Dokumentation

- **[Wiki](https://github.com/VD171/VD-Backup/wiki/de-Home)**: die Dokumentation, online durchsuchbar.
- **[Benutzerhandbuch](https://github.com/VD171/VD-Backup/wiki/de-USER-GUIDE)**: von Anfang bis Ende, von der Installation bis zur Wiederherstellung.
- **[KI-Agenten](https://github.com/VD171/VD-Backup/wiki/de-AI-AGENTS)**: steuere jede Aktion kopflos über die JSON-API.
- **[Architektur](https://github.com/VD171/VD-Backup/wiki/de-ARCHITECTURE)** und **[Dateistruktur](https://github.com/VD171/VD-Backup/wiki/de-FILE-STRUCTURE)**: wie es funktioniert.
- **[Mitgelieferte Binaries](https://github.com/VD171/VD-Backup/wiki/de-BINARIES)**: Herkunft und SHA-256 jeder vorkompilierten Binärdatei, für eine vollständige Prüfung.
- **[Wiederherstellung](https://github.com/VD171/VD-Backup/wiki/de-RECOVERY)**: ein Backup auf einem PC öffnen und entschlüsseln, ohne das Modul.
- **[Mitwirken](https://github.com/VD171/VD-Backup/wiki/de-CONTRIBUTING)** und **[Sicherheit](https://github.com/VD171/VD-Backup/wiki/de-SECURITY)**.
- **[Änderungsprotokoll](https://github.com/VD171/VD-Backup/wiki/de-CHANGELOG)** und **[Verhaltenskodex](https://github.com/VD171/VD-Backup/wiki/de-CODE_OF_CONDUCT)**.

<!-- /vd-docs -->

## Siehe auch

Schwesterprojekte desselben Autors:

- **[VDInfos](https://github.com/VD171/VD-Infos)**: ein Geräte-Methoden-Debugger: liest jedes Element über jede Methode, die es lesen kann, und vergleicht sie nebeneinander.
- **[VDGoogle](https://github.com/VD171/VD-Google)**: deine Google-Dienste (RCS, Wallet, Play-Integrity-Attestierungen), auf deinem Gerät ohne Internet gelesen.
- **[COPG-VD](https://github.com/VD171/COPG-VD)**: ein Geräte-Spoofer, der einen frischen Fingerprint in ein kohärentes, konsistentes Profil verwandelt.
- **[VD-dropbear](https://github.com/VD171/VD-dropbear)**: ein eigenständiger gerooteter SSH-Daemon (Dropbear).

## Kontakte

- https://vd171.ru
- https://vd.priv8.ru
- *Telegram:* @VD_Priv8 https://t.me/VD_Priv8
- *Channel:* @Priv8_VD https://t.me/Priv8_VD
- *Discord:* @VD.Priv8 https://discord.com/users/1296831918989639721
- *E-mail:* vd.priv8@pm.me
- *XDA-Developers:* @VD171 https://xdaforums.com/m/vd171.4699873/
- *XDA thread:* https://xdaforums.com/t/VD-Backup.4807267/
- *GitHub:* @VD171 https://github.com/VD171

## Lizenz

[GNU AGPL-3.0-or-later](LICENSE). Netzwerk-Copyleft: Wenn du eine modifizierte Version betreibst,
auch als Dienst, musst du deren Quellcode anbieten.

## Markenzeichen

VD Backup ist ein unabhängiges, inoffizielles Projekt. Es ist weder mit Google LLC noch mit einem anderen Anbieter verbunden, noch wird es von diesen unterstützt oder gesponsert. "Google Drive", "Android" und zugehörige Namen und Logos sind Marken ihrer jeweiligen Eigentümer. VD Backup läuft auf deinem Gerät und lädt nur zu den von dir konfigurierten Zielen hoch.

## Tags

`android` `backup` `restore` `app-data` `migration` `neo-backup` `databackup` `kernelsu` `apatch` `magisk` `webui` `root` `tar` `zstd` `restic` `rclone` `age` `encryption` `ssaid` `appops` `on-device` `agpl` `ai-friendly` `vdbackup`
