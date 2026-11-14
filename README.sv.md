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
  <b>Fullständig säkerhetskopiering och återställning av appar och data som root, helt styrd från ett WebUI.</b><br>
  KernelSU- / APatch- / Magisk-modul. Ingen "bevilja su"-fråga, ingen växling av <code>sucompat</code>.
</p>

<p align="center">
  <a href="https://github.com/VD171/VD-Backup/releases">Releases</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/sv-Home">Wiki</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/sv-USER-GUIDE">Användarguide</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/sv-AI-AGENTS">AI-agenter</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/sv-ARCHITECTURE">Arkitektur</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/sv-BINARIES">Medföljande binärer</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/sv-CHANGELOG">Ändringslogg</a> ·
  <a href="https://xdaforums.com/t/VD-Backup.4807267/">XDA thread</a>
</p>

> **Languages:** [English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

| Home | Apps | Schedule |
|:---:|:---:|:---:|
| ![Home](docs/screenshots/en/home-dark.png) | ![Apps](docs/screenshots/en/apps-dark.png) | ![Schedule](docs/screenshots/en/schedule-dark.png) |
| **Destinations** | **Settings** | **Activity log** |
| ![Destinations](docs/screenshots/en/destinations-dark.png) | ![Settings](docs/screenshots/en/settings-dark.png) | ![Activity log](docs/screenshots/en/activitylog-dark.png) |

---

## Vad det är

VDBackup är en root-**WebUI-modul** som säkerhetskopierar och återställer dina appar och
deras data **utan en följeslagarapp för kärnfunktionerna**: eftersom modulen redan är
root finns det inget att "tillåta". Målet är att täcka allt som de populära
säkerhetskopieringsapparna gör, på ett ställe, med ett rent WebUI.

Den är tänkt som den öppna, root-nativa **efterföljaren till Swift Backup, Neo-Backup och
Android-DataBackup**: föreningen av vad de gör, under AGPLv3, och den kan till och med
importera befintliga säkerhetskopior från Neo-Backup och Android-DataBackup så att du kan flytta över.

## Funktioner

- **Appar:** APK (bas + splits), appdata (`/data/data`), enhetsskyddad data
  (`/data/user_de`), extern data (`Android/data`), OBB, media.
- **System-/specialdata:** behörigheter, AppOps och (valfritt) SSAID, där root tillåter.
- **Säkerhetskopieringslägen:** **Full** (portabel `tar.zst`), **Snapshot** (inkrementell +
  versionshanterad, via `restic`) och **Mirror** (1:1-synkronisering, via `rclone`/`rsync`).
- **Troget bevarande:** SELinux-kontexter, uid/gid, lägen, xattr och capabilities.
- **Komprimering:** ingen / lz4 / zstd / gzip (gzip = "kompatibilitetsläge", öppnas överallt).
- **Kryptering:** valfri och portabel (`age` + lösenfras eller AES-256-zip), aldrig bunden
  till enhetens hårdvara, så att en säkerhetskopia återställs på en annan enhet eller öppnas på en dator.
- **Destinationer:** lokalt, SFTP, SCP, SMB, WebDAV, FTP, S3 och 70+ till (`rclone`),
  plus `rsync`- och `restic`-förråd. Valfritt Google Drive via en pytteliten valfri följeslagare.
- **Integritet:** varje arkiv verifieras mot manifestet; torrkörning (dry-run) och
  återställningstest låter dig kontrollera en säkerhetskopia utan att röra något.
- **Selektiv återställning och batchåterställning:** återställ valfri delmängd av en säkerhetskopias
  objekt, eller markera flera säkerhetskopior och återställ dem alla på en gång; radera säkerhetskopior
  och för en aktivitets-/revisionslogg över varje destruktiv åtgärd.
- **Särskilda säkerhetskopior:** meddelanden (SMS/MMS), kontakter och samtalslogg, Wi-Fi och
  Bluetooth, med en valfri portabel JSON-export som du kan öppna på en PC.
- **Schemaläggning + automatisering:** återkommande jobb för **säkerhetskopiering eller återställning**
  mot en app, en uppsättning, eller alla appar, med keep-N-gallring, plus valfri auto-säkerhetskopiering
  vid installation/uppdatering och en lista över uteslutna appar.
- **Installationskälla:** återställda appar anger som standard Play Store som sin
  installationskälla (växlingsbart); ett avancerat tillval förfalskar även det initierande paketet och källan.
- **Montering som systemapp:** montera en installerad app som en systemapp utan att röra den
  riktiga `/system`-partitionen (systemlöst overlay-undermodul, NoMount-medvetet).
- **Bakgrund:** säkerhetskopiering/återställning körs frikopplat och överlever att WebUI
  stängs, med aviseringar vid start/slut.
- **Migrera in:** importerar befintliga säkerhetskopior från Neo-Backup och
  Android-DataBackup, inklusive lösenordskrypterade.

## Installation

1. Ladda ner den senaste `VD-Backup-vX.Y.zip` från [Utgåvor](https://github.com/VD171/VD-Backup/releases).
2. Flasha den i KernelSU- / APatch- / Magisk-hanteraren, användbar direkt, ingen omstart behövs.
3. Öppna modulens **WebUI** för att konfigurera och köra säkerhetskopior. Det är allt.

**Utgåvor.** Sex zip-filer per release. `universal-full`, alla arkitekturer och alla
binärer inbäddade (inkl. `rclone` för molnleverantörer, `restic` för ögonblicksbilder),
helt offline, inget laddas någonsin ner, alla enheter, störst. `universal-lite`, alla
arkitekturer utan de två största binärerna (`rclone`, `restic`), minst; klarar fortfarande
lokala, SSH/SFTP och `rsync` utan nedladdning, och första gången du använder en
molndestination (`rclone`) eller ögonblicksbildsläge (`restic`) erbjuder den sig att ladda
ner det lilla arkitekturspecifika tillägget en gång (verifierat med SHA-256) och cachar det,
så att även de funktionerna fungerar. `<abi>-full` (`arm64-v8a`, `armeabi-v7a`, `x86`,
`x86_64`), en enda arkitektur med alla binärer inbäddade, mindre än `universal-full`. Vet
du din arkitektur -> välj `<abi>-full`; vill du ha minst och har inget emot en
engångsnedladdning för moln eller ögonblicksbilder -> `universal-lite`; vill du ha allt
inbäddat utan några nedladdningar (offline / återställning) -> en full-utgåva. Se
[Utgåvor](https://github.com/VD171/VD-Backup/releases).

Ny här? [Användarguiden](docs/USER-GUIDE.md) tar dig från installation till återställning.

## Portabilitet

Dina säkerhetskopior **är inte låsta till den här modulen**. Allt använder standardformat
(`tar`, `gzip`, `zstd`, `age`, `zip`, `restic`) som öppnas på Windows, macOS och Linux med
vanliga verktyg eller filhanterare. Varje krypterad säkerhetskopia levereras med en
**RECOVERY**-anteckning som innehåller de exakta kommandona för att dekryptera och packa upp på en dator.

## Bygga

Modulen är shell + WebUI plus statiska binärer per ABI (`tar`, `zstd`, `lz4`,
`rclone`, `rsync`, ssh, `restic`) byggda för `armeabi-v7a`, `arm64-v8a`, `x86`,
`x86_64`. Se [CONTRIBUTING.md](CONTRIBUTING.md) och CI-arbetsflödena.

## AI-vänligt

VDBackup är byggt för att välkomna AI-assistenter och -agenter, inte bara människor.
Motorn talar JSON (varje `helper.sh`-verb returnerar ett enda JSON-objekt), koden,
dokumentationen och filstrukturen är upplagda för maskinläsning, och AI-stödda bidrag
granskas och accepteras som alla andra. En agent kan administrera **varje** åtgärd i
modulen huvudlöst via samma API som WebUI använder, se
**[docs/AI-AGENTS.md](docs/AI-AGENTS.md)** för hela styrytan, och
[CONTRIBUTING.md](CONTRIBUTING.md#ai-contributors-welcome) för att bidra.

## Dokumentation

- **[Wiki](https://github.com/VD171/VD-Backup/wiki/sv-Home)**: dokumentationen, att bläddra i online.
- **[Användarguide](https://github.com/VD171/VD-Backup/wiki/sv-USER-GUIDE)**: från början till slut, från installation till återställning.
- **[AI-agenter](https://github.com/VD171/VD-Backup/wiki/sv-AI-AGENTS)**: styr varje åtgärd huvudlöst via JSON-API:et.
- **[Arkitektur](https://github.com/VD171/VD-Backup/wiki/sv-ARCHITECTURE)** och **[Filstruktur](https://github.com/VD171/VD-Backup/wiki/sv-FILE-STRUCTURE)**: hur det fungerar.
- **[Medföljande binärer](https://github.com/VD171/VD-Backup/wiki/sv-BINARIES)**: ursprung och SHA-256 för varje förkompilerad binär, för en fullständig granskning.
- **[Återställning](https://github.com/VD171/VD-Backup/wiki/sv-RECOVERY)**: öppna och dekryptera en säkerhetskopia på en dator, utan modulen.
- **[Bidra](https://github.com/VD171/VD-Backup/wiki/sv-CONTRIBUTING)** och **[Säkerhet](https://github.com/VD171/VD-Backup/wiki/sv-SECURITY)**.
- **[Ändringslogg](https://github.com/VD171/VD-Backup/wiki/sv-CHANGELOG)** och **[Uppförandekod](https://github.com/VD171/VD-Backup/wiki/sv-CODE_OF_CONDUCT)**.

<!-- /vd-docs -->

## Se även

Systerprojekt av samma författare:

- **[VDInfos](https://github.com/VD171/VD-Infos)**: en felsökare för enhetsmetoder: läser varje objekt genom varje metod som kan läsa det och jämför dem sida vid sida.
- **[VDGoogle](https://github.com/VD171/VD-Google)**: dina Google-tjänster (RCS, Wallet, Play Integrity-attesteringar), lästa på din enhet utan internet.
- **[COPG-VD](https://github.com/VD171/COPG-VD)**: en enhetsspoofer som förvandlar ett färskt fingerprint till en sammanhängande, konsekvent profil.
- **[VD-dropbear](https://github.com/VD171/VD-dropbear)**: en fristående rootad SSH-daemon (Dropbear).

## Kontakter

- https://vd171.ru
- https://vd.priv8.ru
- *Telegram:* @VD_Priv8 https://t.me/VD_Priv8
- *Channel:* @Priv8_VD https://t.me/Priv8_VD
- *Discord:* @VD.Priv8 https://discord.com/users/1296831918989639721
- *E-mail:* vd.priv8@pm.me
- *XDA-Developers:* @VD171 https://xdaforums.com/m/vd171.4699873/
- *XDA thread:* https://xdaforums.com/t/VD-Backup.4807267/
- *GitHub:* @VD171 https://github.com/VD171

## Licens

[GNU AGPL-3.0-or-later](LICENSE). Nätverkscopyleft: om du kör en modifierad version,
även som en tjänst, måste du erbjuda dess källkod.

## Varumärken

VD Backup är ett oberoende, inofficiellt projekt. Det är inte anslutet till, rekommenderat av eller sponsrat av Google LLC eller någon annan leverantör. "Google Drive", "Android" och relaterade namn och logotyper är varumärken som tillhör sina respektive ägare. VD Backup körs på din enhet och laddar bara upp till de destinationer du konfigurerar.

## Tags

`android` `backup` `restore` `app-data` `migration` `neo-backup` `databackup` `kernelsu` `apatch` `magisk` `webui` `root` `tar` `zstd` `restic` `rclone` `age` `encryption` `ssaid` `appops` `on-device` `agpl` `ai-friendly` `vdbackup`
