<!--
  VD BACKUP - full app & data backup and restore as root, from a WebUI.
  Copyright (C) 2026  VD171 - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<p align="center">
  <img src="module/webroot/assets/logo-wordmark.png" alt="VDBackup" width="320">
</p>

<p align="center">
  <b>Fullständig säkerhetskopiering och återställning av appar och data som root - helt styrd från ett WebUI.</b><br>
  KernelSU- / APatch- / Magisk-modul. Ingen "bevilja su"-fråga, ingen växling av <code>sucompat</code>.
</p>

<p align="center">
  <a href="https://github.com/VD171/VD-Backup/releases">Utgåvor</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki">Wiki</a> ·
  <a href="docs/USER-GUIDE.md">Användarguide</a> ·
  <a href="docs/AI-AGENTS.md">AI-agenter</a> ·
  <a href="CONTRIBUTING.md">Bidra</a> ·
  <a href="https://xdaforums.com/t/VD-Backup.4807267/">XDA-tråd</a>
</p>

> **Languages:** [English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

---

## Vad det är

VDBackup är en root-**WebUI-modul** som säkerhetskopierar och återställer dina appar och
deras data **utan en följeslagarapp för kärnfunktionerna** - eftersom modulen redan är
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
- **Kryptering:** valfri och portabel (`age` + lösenfras eller AES-256-zip) - aldrig bunden
  till enhetens hårdvara, så att en säkerhetskopia återställs på en annan enhet eller öppnas på en dator.
- **Destinationer:** lokalt, SFTP, SCP, SMB, WebDAV, FTP, S3 och 70+ till (`rclone`),
  plus `rsync`- och `restic`-förråd. Valfritt Google Drive via en pytteliten valfri följeslagare.
- **Integritet:** varje arkiv verifieras mot manifestet; torrkörning (dry-run) och
  återställningstest låter dig kontrollera en säkerhetskopia utan att röra något.
- **Schemaläggning + kvarhållning:** återkommande jobb med keep-N-gallring.
- **Bakgrund:** säkerhetskopiering/återställning körs frikopplat och överlever att WebUI
  stängs, med aviseringar vid start/slut.
- **Migrera in:** importerar befintliga säkerhetskopior från Neo-Backup och
  Android-DataBackup, inklusive lösenordskrypterade.

## Installation

1. Ladda ner den senaste `VD-Backup-vX.Y.zip` från [Utgåvor](https://github.com/VD171/VD-Backup/releases).
2. Flasha den i KernelSU- / APatch- / Magisk-hanteraren - användbar direkt, ingen omstart behövs.
3. Öppna modulens **WebUI** för att konfigurera och köra säkerhetskopior. Det är allt.

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

## Dokumentation

- **[Wiki](https://github.com/VD171/VD-Backup/wiki)** - dokumentationen, att bläddra i online.
- **[Användarguide](docs/USER-GUIDE.md)** - från början till slut, från installation till återställning.
- **[AI-agenter](docs/AI-AGENTS.md)** - styr varje åtgärd huvudlöst via JSON-API:et.
- **[Arkitektur](ARCHITECTURE.md)** och **[Filstruktur](docs/FILE-STRUCTURE.md)** - hur det fungerar.
- **[Bidra](CONTRIBUTING.md)** och **[Säkerhet](SECURITY.md)**.

## AI-vänligt

VDBackup är byggt för att välkomna AI-assistenter och -agenter, inte bara människor.
Motorn talar JSON (varje `helper.sh`-verb returnerar ett enda JSON-objekt), koden,
dokumentationen och filstrukturen är upplagda för maskinläsning, och AI-stödda bidrag
granskas och accepteras som alla andra. En agent kan administrera **varje** åtgärd i
modulen huvudlöst via samma API som WebUI använder - se
**[docs/AI-AGENTS.md](docs/AI-AGENTS.md)** för hela styrytan, och
[CONTRIBUTING.md](CONTRIBUTING.md#ai-contributors-welcome) för att bidra.

## Kontakter

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Channel:** @Priv8_VD https://t.me/Priv8_VD
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171

## Se även

Systerprojekt av samma författare:

- **[VDInfos](https://github.com/VD171/VD-Infos)** - en felsökare för enhetsmetoder: läser varje objekt genom varje metod som kan läsa det och jämför dem sida vid sida.
- **[VDGoogle](https://github.com/VD171/VD-Google)** - dina Google-tjänster (RCS, Wallet, Play Integrity-attesteringar), lästa på din enhet utan internet.
- **[COPG-VD](https://github.com/VD171/COPG-VD)** - en enhetsspoofer som förvandlar ett färskt fingerprint till en sammanhängande, konsekvent profil.

## Licens

[GNU AGPL-3.0-or-later](LICENSE). Nätverkscopyleft: om du kör en modifierad version,
även som en tjänst, måste du erbjuda dess källkod.

---

`android` `backup` `restore` `app-data` `migration` `neo-backup` `databackup` `kernelsu` `apatch` `magisk` `webui` `root` `tar` `zstd` `restic` `rclone` `age` `encryption` `ssaid` `appops` `on-device` `agpl` `ai-friendly` `vdbackup`
