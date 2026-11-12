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
  <b>Full app &amp; data backup and restore as root, driven entirely from a WebUI.</b><br>
  KernelSU / APatch / Magisk module. No "grant su" prompt, no toggling <code>sucompat</code>.
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

## What it is

VDBackup is a root **WebUI module** that backs up and restores your apps and their
data **without a companion app for the core features**, because the module is
already root, there is nothing to "allow". It aims to cover everything the popular
backup apps do, in one place, with a clean WebUI.

It is meant as the open, root-native **successor to Swift Backup, Neo-Backup and
Android-DataBackup**: the union of what they do, under AGPLv3, and it can even
import existing Neo-Backup and Android-DataBackup backups so you can move over.

## Features

- **Apps:** APK (base + splits), app data (`/data/data`), device-protected data
  (`/data/user_de`), external data (`Android/data`), OBB, media.
- **System/special data:** permissions, AppOps, and (opt-in) SSAID, where root allows.
- **Backup modes:** **Full** (portable `tar.zst`), **Snapshot** (incremental +
  versioned, via `restic`) and **Mirror** (1:1 sync, via `rclone`/`rsync`).
- **Faithful preservation:** SELinux contexts, uid/gid, modes, xattr and capabilities.
- **Compression:** none / lz4 / zstd / gzip (gzip = "compatibility mode", opens anywhere).
- **Encryption:** optional and portable (`age` + passphrase, or AES-256 zip), never
  tied to device hardware, so a backup restores on another device or opens on a PC.
- **Destinations:** local, SFTP, SCP, SMB, WebDAV, FTP, S3 and 70+ more (`rclone`),
  plus `rsync` and `restic` repos. Optional Google Drive via a tiny opt-in companion.
- **Integrity:** every archive is verified against the manifest; dry-run and
  restore-test let you check a backup without touching anything.
- **Selective & batch restore:** restore any subset of a backup's items, or multi-select
  several backups and restore them all at once; delete backups and keep an activity/audit
  log of every destructive action.
- **Special backups:** messages (SMS/MMS), contacts and call log, Wi-Fi and Bluetooth,
  with an optional portable JSON export you can open on a PC.
- **Scheduling + automation:** recurring **backup or restore** jobs targeting one app, a
  set, or all apps, with keep-N pruning, plus opt-in auto-backup on install/update and an
  excluded-apps list.
- **Install source:** restored apps report the Play Store as their install source by
  default (toggleable); an advanced opt-in also forges the initiating package and source.
- **System-app mounting:** mount an installed app as a system app without touching the
  real `/system` partition (systemless overlay sub-module, NoMount-aware).
- **Background:** backup/restore run detached and survive closing the WebUI, with
  start/finish notifications.
- **Migrate in:** imports existing Neo-Backup and Android-DataBackup backups,
  including password-encrypted ones.

## Install

1. Download the latest `VD-Backup-vX.Y.zip` from [Releases](https://github.com/VD171/VD-Backup/releases).
2. Flash it in the KernelSU / APatch / Magisk manager, usable immediately, no reboot needed.
3. Open the module's **WebUI** to configure and run backups. That's it.

**Editions.** Six zips per release. `universal-full`: every architecture and
every binary embedded (incl. `rclone` for cloud providers, `restic` for
snapshots), fully offline, nothing ever downloaded, any device, largest.
`universal-lite`: every architecture without the two biggest binaries
(`rclone`, `restic`), smallest; still does local, SSH/SFTP and `rsync` with no
download, and the first time you use a cloud destination (`rclone`) or snapshot
mode (`restic`) it offers to download that small per-architecture addon once
(verified by SHA-256) and caches it, so those features work too. `<abi>-full`
(`arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`): a single architecture with every
binary embedded, smaller than `universal-full`. Know your arch -> pick
`<abi>-full`; want the smallest and do not mind a one-time download for cloud or
snapshots -> `universal-lite`; want everything embedded with zero downloads
(offline / recovery) -> a full edition. See [Releases](https://github.com/VD171/VD-Backup/releases).

New here? The [User guide](docs/USER-GUIDE.md) walks you from install to restore.

## Portability

Your backups are **not locked into this module**. Everything uses standard formats
(`tar`, `gzip`, `zstd`, `age`, `zip`, `restic`) that open on Windows, macOS and
Linux with common tools or file managers. Every encrypted backup ships with a
**RECOVERY** note containing the exact commands to decrypt and extract on a PC.

## Build

The module is shell + WebUI plus per-ABI static binaries (`tar`, `zstd`, `lz4`,
`rclone`, `rsync`, ssh, `restic`) built for `armeabi-v7a`, `arm64-v8a`, `x86`,
`x86_64`. See [CONTRIBUTING.md](CONTRIBUTING.md) and the CI workflows.

## AI-friendly

VDBackup is built to be welcoming to AI assistants and agents, not just people.
The engine speaks JSON (every `helper.sh` verb returns a single JSON object), the
code, docs and file structure are laid out for machine reading, and AI-assisted
contributions are reviewed and accepted like any other. An agent can administer
**every** action of the module headlessly through the same API the WebUI uses -
see **[docs/AI-AGENTS.md](docs/AI-AGENTS.md)** for the full control surface, and
[CONTRIBUTING.md](CONTRIBUTING.md#ai-contributors-welcome) to contribute.

## See also

Sibling projects by the same author:

- **[VDInfos](https://github.com/VD171/VD-Infos)**: a device method debugger that reads each item through every method that can read it and compares them side by side.
- **[VDGoogle](https://github.com/VD171/VD-Google)**: your Google services (RCS, Wallet, Play Integrity attestations), read on your device with no internet.
- **[COPG-VD](https://github.com/VD171/COPG-VD)**: a device spoofer that turns a fresh fingerprint into a coherent, consistent profile.

## Contacts

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Channel:** @Priv8_VD https://t.me/Priv8_VD
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **XDA thread:** https://xdaforums.com/t/VD-Backup.4807267/
* **GitHub:** @VD171 https://github.com/VD171

## License

[GNU AGPL-3.0-or-later](LICENSE). Network copyleft: if you run a modified version,
even as a service, you must offer its source.

## Trademarks

VD Backup is an independent, unofficial project. It is not affiliated with, endorsed by, or sponsored by Google LLC or any other vendor. "Google Drive", "Android" and related names and logos are trademarks of their respective owners. VD Backup runs on your device and uploads only to the destinations you configure.

## Tags

`android` `backup` `restore` `app-data` `migration` `neo-backup` `databackup` `kernelsu` `apatch` `magisk` `webui` `root` `tar` `zstd` `restic` `rclone` `age` `encryption` `ssaid` `appops` `on-device` `agpl` `ai-friendly` `vdbackup`
