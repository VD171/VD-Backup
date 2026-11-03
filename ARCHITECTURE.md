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
                   │  ksu.exec("sh helper.sh <verb> <b64json>")
                   ▼
   ┌──────────────────────────────────────────────────────────┐
   │  helper.sh  (dispatcher, returns JSON)                    │
   │    list-apps · config · dests · backup/restore/import ... │
   │    long ops -> setsid nohup worker.sh  (detached)         │
   └───────────────┬───────────────────────────┬──────────────┘
                   │                           │ progress-<opid>.json (poll)
                   ▼                           ▼
   ┌───────────────────────────┐   ┌──────────────────────────┐
   │  worker.sh (root, detached)│   │  framework helper (opt.) │
   │   force-stop · tar|zstd|age│   │  app_process + dex       │
   │   pm install · chown/chcon │   │  perms/appops/ssaid/...  │
   │   transfer · notify        │   │  (dex primary, shell fb) │
   └───────────────┬───────────┘   └──────────────────────────┘
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
  credentials, logs, staging, local backups).

For the full technical design (archive format, metadata schema, pipelines, crypto,
destinations, importers) the maintainers keep detailed design notes; this file is the
contributor-facing overview.
