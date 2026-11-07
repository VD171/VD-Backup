> **Languages:** English · [العربية](ar/ARCHITECTURE.md) · [Čeština](cs/ARCHITECTURE.md) · [Deutsch](de/ARCHITECTURE.md) · [Español](es/ARCHITECTURE.md) · [فارسی](fa/ARCHITECTURE.md) · [Français](fr/ARCHITECTURE.md) · [हिन्दी](hi/ARCHITECTURE.md) · [Bahasa Indonesia](in/ARCHITECTURE.md) · [Italiano](it/ARCHITECTURE.md) · [日本語](ja/ARCHITECTURE.md) · [한국어](ko/ARCHITECTURE.md) · [Nederlands](nl/ARCHITECTURE.md) · [Polski](pl/ARCHITECTURE.md) · [Português](pt/ARCHITECTURE.md) · [Русский](ru/ARCHITECTURE.md) · [Svenska](sv/ARCHITECTURE.md) · [ไทย](th/ARCHITECTURE.md) · [Türkçe](tr/ARCHITECTURE.md) · [Tiếng Việt](vi/ARCHITECTURE.md) · [中文](zh/ARCHITECTURE.md)

---

# Architecture

VDBackup is a root WebUI module. It has three layers: the **WebUI** (what you see),
the **shell backend** (what does the work, as root), and the **bundled binaries**
(the archivers and transports). Everything runs already-root, so there is no
permission prompt and no companion app for the core features.

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

## Key points

- **Already root.** The module process is root, so the engine is plain shell. ~85% of
  the work is pure shell (`tar`/`zstd`/`age`/`pm`/`am`/`chown`/`chcon`/`rclone`/...).
- **Detached execution.** Backup/restore run via `setsid nohup`, as an independent root
  process. Closing the WebUI does not interrupt them; the UI reattaches by reading
  `logs/progress-<opid>.json`.
- **Framework helper (~15%).** Fine-grained permissions, AppOps, SSAID, StorageStats,
  icons and privileged Wi-Fi need the Android framework. A small `dex` run via
  `app_process` (no installed app) handles these, with a shell fallback.
- **Portability.** Only standard formats; backups open on a PC without this module.
- **State** lives in `/data/adb/vdbackup/` (config, jobs, destinations, encrypted
  credentials, logs, staging). **Backups** are written to user-visible, credential-
  encrypted storage at `/sdcard/VDBackup/` (`/data/media/<user>/VDBackup`, per user),
  not in `/data/adb` (which is device-encrypted and readable before first unlock).

## Compatibility guarantee

A backup must stay restorable forever. This is a hard rule, not a best effort.

**Scope.** The guarantee covers backups written by **v1.01 onward** (the first officially
published release) and only by officially published, released versions. v1.00 was a
test-only build and is explicitly out of scope; pre-release and development builds are not
covered. From the first public release forward, the promise below is absolute:

- **Standard formats only.** Every archive is a plain `tar` compressed with `zstd`,
  `gzip` or `lz4`, optionally wrapped with `age`. There is no proprietary container, so
  a backup can be opened on any PC with ordinary tools even without this module (see
  `etc/RECOVERY.md`). A format we cannot drop.
- **Append-only metadata.** `manifest.json` carries `format_version`. The schema only
  ever grows: fields may be *added*, never removed, renamed or repurposed. Restore reads
  every field defensively (missing optional fields fall back to a default) and installs
  APKs and extracts archives by their file name and extension, not by assuming a fixed
  manifest shape.
- **Forward compatible restore.** Restore never rejects a backup for being old, and an
  older VDBackup silently skips item types it does not know rather than failing. A newer
  VDBackup therefore restores any older backup, and the standard-format archives remain
  restorable by hand regardless.

In short: anything VDBackup has ever written, every future VDBackup (and a plain PC)
can still restore. Changing the format in a way that breaks a prior backup is not
allowed; new capabilities are added behind `format_version` and new, additive fields.

For the full technical design (archive format, metadata schema, pipelines, crypto,
destinations, importers) the maintainers keep detailed design notes; this file is the
contributor-facing overview.

*This documentation was generated with Claude (Anthropic) and is maintained by VD171. Corrections and improvements are welcome - see [CONTRIBUTING.md](../CONTRIBUTING.md).*
