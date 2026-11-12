<!--
  VD BACKUP - full app & data backup and restore as root, from a WebUI.
  Copyright (C) 2026  VD171 - SPDX-License-Identifier: AGPL-3.0-or-later
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
  <b>Volledige back-up en herstel van apps en gegevens als root, volledig aangestuurd vanuit een WebUI.</b><br>
  KernelSU- / APatch- / Magisk-module. Geen "su verlenen"-prompt, geen omschakelen van <code>sucompat</code>.
</p>

<p align="center">
  <a href="https://github.com/VD171/VD-Backup/releases">Releases</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki">Wiki</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/USER-GUIDE">User guide</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/AI-AGENTS">AI agents</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/ARCHITECTURE">Architecture</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/BINARIES">Bundled binaries</a> ·
  <a href="CHANGELOG.md">Changelog</a> ·
  <a href="https://xdaforums.com/t/VD-Backup.4807267/">XDA thread</a>
</p>

> **Languages:** [English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

| Home | Apps | Schedule |
|:---:|:---:|:---:|
| ![Home](docs/screenshots/en/home-dark.png) | ![Apps](docs/screenshots/en/apps-dark.png) | ![Schedule](docs/screenshots/en/schedule-dark.png) |
| **Destinations** | **Settings** | **Activity log** |
| ![Destinations](docs/screenshots/en/destinations-dark.png) | ![Settings](docs/screenshots/en/settings-dark.png) | ![Activity log](docs/screenshots/en/activitylog-dark.png) |

---

## Wat het is

VDBackup is een root-**WebUI-module** die je apps en hun gegevens back-upt en herstelt
**zonder begeleidende app voor de kernfuncties**: omdat de module al root is, valt er
niets te "toestaan". Het doel is om alles te dekken wat de populaire back-upapps doen, op
één plek, met een overzichtelijke WebUI.

Het is bedoeld als de open, root-native **opvolger van Swift Backup, Neo-Backup en
Android-DataBackup**: de vereniging van wat zij doen, onder AGPLv3, en het kan zelfs
bestaande back-ups van Neo-Backup en Android-DataBackup importeren zodat je kunt overstappen.

## Functies

- **Apps:** APK (basis + splits), app-gegevens (`/data/data`), apparaatbeveiligde gegevens
  (`/data/user_de`), externe gegevens (`Android/data`), OBB, media.
- **Systeem-/speciale gegevens:** machtigingen, AppOps en (optioneel) SSAID, waar root dit toelaat.
- **Back-upmodi:** **Full** (draagbare `tar.zst`), **Snapshot** (incrementeel +
  geversioneerd, via `restic`) en **Mirror** (1:1-synchronisatie, via `rclone`/`rsync`).
- **Getrouw behoud:** SELinux-contexten, uid/gid, modi, xattr en capabilities.
- **Compressie:** geen / lz4 / zstd / gzip (gzip = "compatibiliteitsmodus", opent overal).
- **Versleuteling:** optioneel en draagbaar (`age` + wachtwoordzin of AES-256-zip), nooit
  gebonden aan de apparaathardware, zodat een back-up op een ander apparaat wordt hersteld of op een pc wordt geopend.
- **Bestemmingen:** lokaal, SFTP, SCP, SMB, WebDAV, FTP, S3 en 70+ meer (`rclone`),
  plus `rsync`- en `restic`-repository's. Optioneel Google Drive via een piepkleine optionele begeleider.
- **Integriteit:** elk archief wordt geverifieerd tegen het manifest; droogloop (dry-run)
  en hersteltest laten je een back-up controleren zonder iets aan te raken.
- **Selectief herstel en herstel in batch:** herstel een willekeurige deelverzameling van de items van
  een back-up, of selecteer meerdere back-ups en herstel ze allemaal tegelijk; verwijder back-ups en
  houd een activiteiten-/auditlogboek bij van elke destructieve actie.
- **Speciale back-ups:** berichten (SMS/MMS), contacten en belgeschiedenis, Wi-Fi en Bluetooth,
  met een optionele draagbare JSON-export die je op een pc kunt openen.
- **Planning + automatisering:** terugkerende **back-up- of hersteltaken** gericht op een app, een set,
  of alle apps, met keep-N-opschoning, plus optionele automatische back-up bij installatie/update en een
  lijst met uitgesloten apps.
- **Installatiebron:** herstelde apps melden standaard de Play Store als hun installatiebron
  (in/uit te schakelen); een geavanceerde optionele instelling vervalst ook het initiërende pakket en de bron.
- **System-app-aankoppeling:** koppel een geïnstalleerde app als system-app aan zonder de echte
  `/system`-partitie aan te raken (systemless overlay-submodule, NoMount-bewust).
- **Achtergrond:** back-up/herstel draaien losgekoppeld en overleven het sluiten van de
  WebUI, met meldingen bij start/voltooiing.
- **Migreren:** importeert bestaande back-ups van Neo-Backup en Android-DataBackup,
  inclusief met wachtwoord versleutelde.

## Installatie

1. Download de nieuwste `VD-Backup-vX.Y.zip` van [Releases](https://github.com/VD171/VD-Backup/releases).
2. Flash het in de KernelSU- / APatch- / Magisk-manager, meteen bruikbaar, geen herstart nodig.
3. Open de **WebUI** van de module om back-ups te configureren en uit te voeren. Dat is alles.

**Edities.** Zes zips per release. `universal-full`, elke architectuur en elke binary
ingebouwd (incl. `rclone` voor cloud-providers, `restic` voor snapshots), volledig offline,
er wordt nooit iets gedownload, elk apparaat, grootst. `universal-lite`, elke architectuur
zonder de twee grootste binaries (`rclone`, `restic`), kleinst; doet nog steeds lokale,
SSH/SFTP- en `rsync`-back-ups zonder download, en de eerste keer dat je een cloud-bestemming
(`rclone`) of snapshot-modus (`restic`) gebruikt, biedt het aan die kleine
architectuurspecifieke add-on eenmalig te downloaden (geverifieerd met SHA-256) en te
cachen, zodat die functies ook werken. `<abi>-full` (`arm64-v8a`, `armeabi-v7a`, `x86`,
`x86_64`), één architectuur met elke binary ingebouwd, kleiner dan `universal-full`. Ken je
je architectuur -> kies `<abi>-full`; wil je de kleinste en vind je een eenmalige download
voor cloud of snapshots geen bezwaar -> `universal-lite`; wil je alles ingebouwd zonder
downloads (offline / herstel) -> een full-editie. Zie
[Releases](https://github.com/VD171/VD-Backup/releases).

Nieuw hier? De [Gebruikershandleiding](docs/USER-GUIDE.md) leidt je van installatie tot herstel.

## Overdraagbaarheid

Je back-ups zitten **niet vast aan deze module**. Alles gebruikt standaardformaten
(`tar`, `gzip`, `zstd`, `age`, `zip`, `restic`) die op Windows, macOS en Linux openen met
gangbare hulpmiddelen of bestandsbeheerders. Elke versleutelde back-up wordt geleverd met
een **RECOVERY**-notitie met de exacte opdrachten om op een pc te ontsleutelen en uit te pakken.

## Bouwen

De module is shell + WebUI plus statische binaries per ABI (`tar`, `zstd`, `lz4`,
`rclone`, `rsync`, ssh, `restic`) gebouwd voor `armeabi-v7a`, `arm64-v8a`, `x86`,
`x86_64`. Zie [CONTRIBUTING.md](CONTRIBUTING.md) en de CI-workflows.

## AI-vriendelijk

VDBackup is gebouwd om AI-assistenten en -agenten welkom te heten, niet alleen mensen.
De engine spreekt JSON (elk `helper.sh`-werkwoord geeft één JSON-object terug), de code,
documentatie en bestandsstructuur zijn ingericht voor machinaal lezen, en bijdragen met
AI-hulp worden net als alle andere beoordeeld en geaccepteerd. Een agent kan **elke**
actie van de module headless beheren via dezelfde API die de WebUI gebruikt, zie
**[docs/AI-AGENTS.md](docs/AI-AGENTS.md)** voor het volledige besturingsoppervlak, en
[CONTRIBUTING.md](CONTRIBUTING.md#ai-contributors-welcome) om bij te dragen.

## Documentatie

- **[Wiki](https://github.com/VD171/VD-Backup/wiki)**: de documentatie, online te doorbladeren.
- **[Gebruikershandleiding](https://github.com/VD171/VD-Backup/wiki/USER-GUIDE)**: van begin tot eind, van installatie tot herstel.
- **[AI-agenten](https://github.com/VD171/VD-Backup/wiki/AI-AGENTS)**: stuur elke actie headless aan via de JSON-API.
- **[Architectuur](https://github.com/VD171/VD-Backup/wiki/ARCHITECTURE)** en **[Bestandsstructuur](https://github.com/VD171/VD-Backup/wiki/FILE-STRUCTURE)**: hoe het werkt.
- **[Meegeleverde binaries](https://github.com/VD171/VD-Backup/wiki/BINARIES)**: herkomst en SHA-256 van elke voorgecompileerde binary, voor een volledige audit.
- **[Herstel](https://github.com/VD171/VD-Backup/wiki/RECOVERY)**: een backup op een pc openen en ontsleutelen, zonder de module.
- **[Bijdragen](https://github.com/VD171/VD-Backup/wiki/CONTRIBUTING)** en **[Beveiliging](https://github.com/VD171/VD-Backup/wiki/SECURITY)**.
- **[Changelog](https://github.com/VD171/VD-Backup/wiki/CHANGELOG)** en **[Gedragscode](https://github.com/VD171/VD-Backup/wiki/CODE_OF_CONDUCT)**.

<!-- /vd-docs -->

## Zie ook

Zusterprojecten van dezelfde auteur:

- **[VDInfos](https://github.com/VD171/VD-Infos)**: een debugger voor apparaatmethoden: leest elk item via elke methode die het kan lezen en vergelijkt ze naast elkaar.
- **[VDGoogle](https://github.com/VD171/VD-Google)**: je Google-diensten (RCS, Wallet, Play Integrity-attestaties), op je apparaat gelezen zonder internet.
- **[COPG-VD](https://github.com/VD171/COPG-VD)**: een apparaatspoofer die een verse fingerprint omzet in een coherent, consistent profiel.

## Contacten

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Channel:** @Priv8_VD https://t.me/Priv8_VD
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **XDA thread:** https://xdaforums.com/t/VD-Backup.4807267/
* **GitHub:** @VD171 https://github.com/VD171

## Licentie

[GNU AGPL-3.0-or-later](LICENSE). Netwerk-copyleft: als je een gewijzigde versie draait,
ook als dienst, moet je de broncode ervan aanbieden.

## Handelsmerken

VD Backup is een onafhankelijk, onofficieel project. Het is niet verbonden met, onderschreven door of gesponsord door Google LLC of enige andere leverancier. "Google Drive", "Android" en verwante namen en logo's zijn handelsmerken van hun respectieve eigenaren. VD Backup draait op je apparaat en uploadt alleen naar de bestemmingen die je instelt.

## Tags

`android` `backup` `restore` `app-data` `migration` `neo-backup` `databackup` `kernelsu` `apatch` `magisk` `webui` `root` `tar` `zstd` `restic` `rclone` `age` `encryption` `ssaid` `appops` `on-device` `agpl` `ai-friendly` `vdbackup`
