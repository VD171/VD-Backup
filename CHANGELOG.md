> **Languages:** English · [العربية](docs/ar/CHANGELOG.md) · [Čeština](docs/cs/CHANGELOG.md) · [Deutsch](docs/de/CHANGELOG.md) · [Español](docs/es/CHANGELOG.md) · [فارسی](docs/fa/CHANGELOG.md) · [Français](docs/fr/CHANGELOG.md) · [हिन्दी](docs/hi/CHANGELOG.md) · [Bahasa Indonesia](docs/in/CHANGELOG.md) · [Italiano](docs/it/CHANGELOG.md) · [日本語](docs/ja/CHANGELOG.md) · [한국어](docs/ko/CHANGELOG.md) · [Nederlands](docs/nl/CHANGELOG.md) · [Polski](docs/pl/CHANGELOG.md) · [Português](docs/pt/CHANGELOG.md) · [Русский](docs/ru/CHANGELOG.md) · [Svenska](docs/sv/CHANGELOG.md) · [ไทย](docs/th/CHANGELOG.md) · [Türkçe](docs/tr/CHANGELOG.md) · [Tiếng Việt](docs/vi/CHANGELOG.md) · [中文](docs/zh/CHANGELOG.md)

---

# Changelog

All notable changes to VDBackup are documented here. English only.

## v1.03.1

New backup scope:

- New special-backup categories: calendar (the calendar provider, plus a portable
  `calendar.json` export), wallpaper (home and lock wallpaper), private DNS (mode and
  specifier), and system settings (the full system/global/secure settings dump). System
  settings is opt-in and overwrites device-wide settings on restore, so it is gated like
  SSAID with explicit consent and a full audit entry.
- Standalone folder and file backup: back up any absolute path (shared storage or app
  data) as a compressed, manifest-sealed archive, and restore it to the same path. Restore
  needs an explicit confirmation.

Safer restore:

- Every archive is checked before anything is written: a backup whose contents point
  outside their target (an absolute path or a `..` component) is refused, so a restore
  running as root cannot be tricked into writing outside the destination.

Progress and scheduling:

- Live progress now shows transfer speed, ETA and an item counter during backups, plus a
  checksum-verified step for cloud uploads and a "not enough space" pre-check.
- Scheduled jobs can be gated: run only on Wi-Fi, only while charging, only above a
  battery level, or only on chosen weekdays; a scheduled job is also skipped while the
  device is critically hot. A skipped job retries on the next tick.

Cloud destinations:

- Connect any rclone backend from the UI: the cloud-remote dropdown offers the popular
  providers (Google Drive, Dropbox, OneDrive, Box, pCloud, Mega, Backblaze B2, S3, SFTP,
  WebDAV, FTP, SMB) plus a "Custom (advanced)" option where you type any other rclone
  backend name and its `key=value` parameters, so all of rclone's backends are reachable.
- On-device sign-in (no PC): providers that need a browser sign-in (Google Drive, Dropbox,
  OneDrive, Box, pCloud) have an "Authorize in browser" button that opens the phone's own
  browser to the provider's consent page; after you approve, you return to the app and the
  remote is saved automatically, with the token captured on the device. A manual token
  paste stays available as a fallback.

Interface:

- An adjustable interface scale (a draggable slider) rescales the whole interface, so it
  fits screens of different pixel densities; 100% is the default and is unchanged.
- The interface now renders right-to-left for Arabic and Persian.
- A home overview with backup counts and a storage bar, status badges, copy-to-clipboard
  for hashes and paths, Android-style toggle switches, and a "Check for updates" action.
- The activity log is a full screen that opens instantly, with an "Export logs" action
  that saves a log file you can attach to a report.

Fixes:

- Restore and import no longer fail on devices whose bundled `tar` does not accept the
  `--no-absolute-names` option; the archive safety check is independent of that option.
- "Check for updates" works even where no HTTP client is bundled, by falling back to the
  bundled rclone; and the activity log no longer takes a long time to open.

## v1.01

First public release. A KernelSU/APatch/Magisk WebUI module that backs up and restores
apps and their data entirely as root, no grant prompt.

Engine and formats:

- Backup/restore engine run as a detached root process (`setsid`): it survives closing
  the WebUI or the root manager, and the UI reattaches to live progress by `opid`.
- Three backup modes: Full (tar.zst, local or remote), Snapshot (restic repo, encrypted
  and de-duplicated), and Mirror (rclone/rsync 1:1 sync). APKs are always compressed,
  even in a mirror.
- Items per app: APK (base + splits), `data`, `data_de`, `obb`, external and media.
  SELinux context, uid/gid, modes and xattr/caps are preserved; restore uses a
  `pm install` session and remaps ownership/context to the live uid.
- Per-user (multi-user) aware throughout. Backups are stored under `/sdcard/VDBackup`
  (per user), out of `/data/adb`, so they are not readable before first unlock; every
  destination is namespaced under `<path>/vdbackup`.
- Compression: none, lz4, zstd (levels), or gzip ("compatibility mode"). A JSON manifest
  records the device, package (including the app label), items and permissions.
- Portable encryption with `age` (keygen), plus a PC RECOVERY guide shipped inside every
  encrypted backup so it can be decrypted and extracted anywhere, without the module.

Destinations and cloud:

- Destinations: add/list/test/delete (local, rclone remote, restic repo, and an opt-in
  Google Drive companion); credentials are stored obscured, never in the clear.
- Create rclone remotes from the UI/API (`remote-add`/`remote-list`/`remote-del`), so any
  cloud backend (SFTP, SMB, WebDAV, FTP, S3, Google Drive, and more) is reachable without
  editing `rclone.conf` by hand.
- Google Drive two ways: via rclone (no Google Cloud account) or the opt-in headless
  companion app (`ru.vd171.vdbackup`), which carries a mandatory HMA-OSS hide notice.
- Network policy: choose whether cloud transfers may use any connection, Wi-Fi only, or
  mobile data only; enforced for manual and scheduled jobs. Local destinations are exempt.

Migration in:

- Import from Neo-Backup, including password-encrypted backups (AES-256-GCM decrypted by
  the dex helper; the WebUI prompts for the password).
- Import from Android-DataBackup (install APKs, extract user/user_de/data archives, remap).
- Both validated against real backups across devices.

Integrity and safety:

- Faithful wipe-then-extract restore; per-archive sha256 verify (default on for Full, and
  a repo integrity check for Snapshot), dry-run, and restore-test. Archives are read back
  for completeness; a corrupt archive or an invalid package name can never trigger a
  destructive restore, and remote-transfer failures are reported, never silent.
- Selective restore: restore any subset of the items a backup holds (APK, data, protected
  data, OBB, external, media), all selected by default.
- Delete backups from the UI/API (`delete-backup`) and keep-last-N retention for manual
  backups (`prune`); every delete, restore, prune and scheduled run is written to a local
  JSON audit log you can view in the app.
- Runtime permissions and AppOps captured into the manifest and reapplied on restore. The
  install source (installerPackageName) and the enabled/disabled state are captured too and
  reapplied on restore.
- Install-source spoofing: by default a restored app reports the Play Store as its install
  source (set at install time via the install session, since a restored app otherwise looks
  sideloaded); switchable globally and per restore, and when off the captured source is
  kept. An advanced, opt-in "deep" mode additionally forges the initiating package and
  package source by editing the system package database (byte-exact backup first, applies
  after a reboot) so the app looks fully store-installed.
- SSAID (device ANDROID_ID): strictly opt-in and prominently flagged; ABX-aware; the live
  file is always backed up byte-exact before any overwrite for rollback; applies after a
  reboot.
- Restore and import require an explicit "this overwrites the current app data"
  acknowledgment before proceeding.

Scheduling and automation:

- Scheduled backups with keep-N retention, managed from a Schedule tab (per app, daily/
  hourly/weekly with an optional time, mode and destination).
- Automatic backup on install or update: an opt-in observer rides the scheduler heartbeat,
  backs up new or updated apps in the background, and only seeds on first run so enabling
  it never backs up everything at once. Honors the excluded-apps (blocklist) setting.

Special (system-wide) backups:

- Back up messages (SMS/MMS), contacts and call log, Wi-Fi and Bluetooth as raw,
  faithfully-archived system data (same SELinux/xattr preservation and optional age
  encryption as app backups). Restore is same-device/same-ROM faithful, reboot-required,
  and gated behind a prominent overwrite-and-reboot acknowledgment.
- Optional portable export alongside the raw archive: messages, call log and contacts are
  also written as openable JSON (read with the bundled sqlite3 straight from the provider
  databases, so message bodies with commas or newlines survive intact), giving a
  cross-device, no-module-needed copy. The portable copy is encrypted too when the backup
  is encrypted, so it never leaks what the archive protects.

System integration:

- Mount an installed app as a system app without touching the real /system partition:
  VDBackup stages the app's APK(s) into its own overlay sub-module, which the root manager
  mounts. With NoMount on KernelSU it is injected live (no reboot); otherwise it applies at
  the next boot, so it never depends on NoMount being installed. Choose regular or
  privileged placement.

WebUI:

- App list shows the real localized app name (resolved from the APK, so it survives an
  uninstall) alongside the package, with lazy-loaded, cached icons rendered as rounded,
  adaptive-aware tiles.
- Tap an app to open its backup history and restore any previous backup; the Backups tab
  shows name and package on separate lines and opens a details sheet per backup (version,
  install source, state, date, size, items, permission counts, device).
- Filter the app list by user/system/all and sort by name or package; select several apps
  and back them up in one batch; exclude apps from automatic and scheduled backups.
- Choose what to include and toggle verify or dry-run per backup; choose a test-only
  restore that extracts to staging without touching the live app.
- Light/dark theme, an accent-colour picker, language selector, an About tab (with the
  sibling projects and the bundled-binary audit manifest), a folder picker for the local
  destination, localized operation progress with instant feedback, and modern in-app
  dialogs (no system alert/confirm pop-ups).
- Back-button navigation returns to the previous tab and closes dialogs first; dialogs are
  floating and the app survives reopening by reattaching to live operations.

AI-friendly and i18n:

- A documented JSON control surface so agents can administer every action headlessly
  (`docs/AI-AGENTS.md`); the WebUI is just one client of that API.
- The README and all project documentation are translated into the 21 standard languages
  (`docs/<lang>/`), with docs mirrored to the wiki.
- Rich app listing and Neo decryption run through a dex helper driven as root
  (`IPackageManager` via ServiceManager), so they work where ActivityThread hangs.

*This documentation was generated with Claude (Anthropic) and is maintained by VD171. Corrections and improvements are welcome - see [CONTRIBUTING.md](CONTRIBUTING.md).*
