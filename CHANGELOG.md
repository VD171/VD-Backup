> **Languages:** English · [العربية](docs/ar/CHANGELOG.md) · [Čeština](docs/cs/CHANGELOG.md) · [Deutsch](docs/de/CHANGELOG.md) · [Español](docs/es/CHANGELOG.md) · [فارسی](docs/fa/CHANGELOG.md) · [Français](docs/fr/CHANGELOG.md) · [हिन्दी](docs/hi/CHANGELOG.md) · [Bahasa Indonesia](docs/id/CHANGELOG.md) · [Italiano](docs/it/CHANGELOG.md) · [日本語](docs/ja/CHANGELOG.md) · [한국어](docs/ko/CHANGELOG.md) · [Nederlands](docs/nl/CHANGELOG.md) · [Polski](docs/pl/CHANGELOG.md) · [Português](docs/pt/CHANGELOG.md) · [Русский](docs/ru/CHANGELOG.md) · [Svenska](docs/sv/CHANGELOG.md) · [ไทย](docs/th/CHANGELOG.md) · [Türkçe](docs/tr/CHANGELOG.md) · [Українська](docs/uk/CHANGELOG.md) · [Tiếng Việt](docs/vi/CHANGELOG.md) · [中文](docs/zh/CHANGELOG.md)

---

# Changelog

All notable changes to VDBackup are documented here. English only.

## v1.16

Fixes:

- A Google Drive backup that fails now records the real Drive error (the HTTP code and Drive's message) in the activity log, instead of a generic "try again", so a failed upload can be diagnosed. (#24)
- The live-progress panel floats in a fixed spot again, the same on every tab, instead of being pinned inline at the bottom of the page. (#24)
- A partial batch backup now names which apps failed and why, in the activity log and in an on-screen list at the end of the run, not just how many. (#5)
- A bulk restore can take one optional shared password (with a tick) for backups whose saved password does not open them; it is tried for an app only after its own passphrase fails, so a mixed batch finishes without asking app by app. (#17)

## v1.15

New:

- Set a default passphrase once and encrypted backups use it automatically: the backup screen no longer asks for it every time, and shows a small note that the backup is encrypted. (#17)
- Setting a passphrase (the global default, or an app's own) now has a Confirm field and only saves when both match, so a typo can no longer silently lock your backups. (#17)
- Every file in a flashable zip now ships a .sha256 companion that the installer verifies at flash: a corrupt or truncated download is refused instead of installed.
- Telegram restore is now a full screen: your Telegram backups are listed grouped by app, with names and a search box, so you can find and restore one quickly. (#18)
- When several backups or restores run at once, the progress area stacks them like a download manager: the newest is expanded, the others collapse to a line with their progress and a close button, with a running count.
- A new "Reopen apps after a backup" setting brings an app back to the foreground if it was open when its backup started. (#27)
- You can select several backups and delete them in one go. (#28)
- Settings has a "Reset / start fresh" option (a guarded danger zone) to wipe the app's own config and/or its backups. (#26)
- The app list gained a "Show excluded" toggle, and the activity log a "Clear log" button. (#31)

Fixes:

- Restoring an encrypted backup now tries your saved passphrase first and only asks if it does not fit (for example an older backup made with a different password), instead of prompting every time. (#17)
- The out-of-space message now points you to a remote (Telegram, an rclone cloud, or SFTP/SMB) so only one app needs room at a time. (#5)
- Large storage is measured correctly: free-space and quota checks no longer overflow on volumes or backups larger than 2 GB. (#33)
- A snapshot (restic) backup that could not read a few files is no longer reported as failed; the snapshot is still saved, with a note, instead of an error. (#32)
- Excluding an app now hides it from the list immediately, and clearing the activity log actually empties the on-screen list. (#31)
- Confirm buttons show a spinner while the action runs instead of a silent pause, and the WebUI boots and scrolls faster with no flash of English before your language loads. (#23)
- Clearer messages when an operation fails, and more complete translations across all 22 languages. (#22)
- Self-update is safer: an update can no longer replace the module's own updater or signing keys, and it waits for a running backup to finish before applying.

## v1.14

New:

- You can now cancel a running backup or restore from the progress card. The Cancel button stops the operation; a cancelled backup removes its partial copy, and cancelling a restore warns you first that the app may be left partially restored.
- Filtering apps by label is easier. Your labels now show as tap-to-toggle chips above the app list, instead of a dropdown, and you can combine several at once: an app shows if it carries any of the labels you pick.

Fixes:

- Testing a Telegram destination no longer reports "That destination type is not supported." The Test button now checks that you are signed in to Telegram, and tells you to sign in first if you are not.

## v1.13

New:

- You can set a default encryption passphrase in Settings, and override it per app, so encrypted backups no longer ask for a password every time. (#17)
- A backup sent to a remote (Telegram or an rclone cloud remote) can now be remote-only: it uploads and keeps no local copy, which saves space and leaves no local trace, with a Settings switch to keep a local copy instead. You can also browse and restore your backups straight from an rclone remote. (#16)
- A new Staging folder setting lets you choose where a backup is temporarily assembled when it goes to a remote or to external storage; a root-only folder keeps backup data off shared storage.

Fixes:

- Checking for and installing updates now works on every device. The bundled downloader could not validate secure (https) connections unless a specific developer app was installed, so the self-update, the Updates panel and the one-tap install from the MMRL app failed on most devices. It now uses the device's own trust store and works everywhere.
- The size next to each item in the /data/adb file picker now always keeps one decimal (for example 15.6 KB, 184.3 MB), instead of dropping it on larger values.
- Turning an installed app into a system app now actually takes effect. The app was placed into the system image, but the system refused to read it, so it never became a system app; it is now set up correctly and is picked up on the next boot.
- A backup that fails or is interrupted no longer leaves a partial, unusable copy behind that could slowly use up storage over many retries. Leftovers from an abrupt kill, or from a backup stopped before it even starts, are cleared too, and once more on the next reboot.
- Importing a Neo-Backup or Android-DataBackup backup now restores each app with the correct security labels, so a restored app no longer crashes or loses access to its own data.
- Backup and restore notifications now show the app's name instead of its package id.
- The system files (/data/adb) backup now goes to the destination you choose, instead of always staying in internal storage.
- After restoring a system-files (/data/adb) backup, VDBackup reminds you to reboot so the restored modules take effect, and long folder names in the file picker now scroll instead of being clipped.
- The app list and backup search now respond smoothly as you type.

Improvements:

- The last screens that were still in English (the default passphrase, remote-only backups, backup notes, the staging folder, and system-files restore) are now translated in all 21 languages.

## v1.12

Reliability:

- A batch saved to this device now makes sure there is room for everything before it starts. If there is not, it stops right away and tells you how much space it needs and how much is free, instead of failing partway through a long run. A new switch in Settings turns this pre-check off.

Fixes:

- The free-space safeguards now work on every device. The checks that stop a backup before it fills the disk relied on a size measurement that stock Android quietly ignored, so on many devices they never triggered and a long backup could fill internal storage. They now measure space reliably everywhere. (#5)

New:

- You can now name and tag your backups. Give any backup a custom name and free-form tags - like "v1", "first", or "january" - then search your backups by name, tag or app. The name and tags travel with a backup when you export or import it.

## v1.11

Reliability:

- A long batch no longer stalls on a single app. If one app takes too long to back up or restore, VDBackup records why and moves on, so one stuck app can no longer freeze the whole run.
- When a batch cannot finish everything, the result now says why: how many apps succeeded, the reason the others failed (for example, the storage filled up), and how much room is left, instead of ending without explanation.
- An app that is running an active VPN is now backed up while it keeps running, instead of being force-stopped, so your connection is not dropped mid-backup.
- Long backups no longer overheat the device. Between apps, VDBackup pauses briefly to let it cool when it runs hot, and resumes on its own; a new switch in Settings turns this off. A cool device with a quirky temperature sensor is never paused by mistake.

Fixes:

- A backup saved to the sdcard no longer also keeps a copy in internal storage, and deleting it now removes the real file in the location you chose.
- Updating from your root manager now keeps the edition you installed (lite, full, or your device's architecture) instead of always replacing it with the full edition.
- A blocked app comes back blocked after a restore even on ROMs that keep the block only in memory. VDBackup now reads the per-app network-access policy straight from the system when backing up, so it is captured even when the ROM has not written it to disk yet. (#9)
- Text in the "Updates" panel is now readable in the light theme.
- Notifications now appear correctly in Indonesian and Ukrainian.

New:

- You can now back up /data/adb itself - the root environment (modules, their data and configs) - all of it or a subtree you pick from a file tree, and restore it the same way. Each file is written back with its original owner and SELinux context, so root keeps working. It is advanced, and only what you choose is ever included.

Interface:

- Long screens are easier to scan. The heaviest sections across Settings, Destinations, Backups and Schedule are now collapsible groups you open only when you need them, each shown as a clearly tappable card, while your existing backups and jobs stay in view.
- Settings save the moment you change them; there is no separate Save step to forget.
- "Check for updates" and the update notice moved to the Updates tab, where you would look for them.

## v1.10

Interface:

- Opening the WebUI over a slow or unreachable connection no longer freezes it. The background check for a newer version used to run while the app list and icons were still loading, over the same channel the interface uses to reach the module, so a stalled network held the whole screen up and you could not navigate. It now runs only once the interface is idle and gives up quickly, so the app stays responsive and you can move around right away, even while icons load.

- Starting a restore no longer does nothing without explaining why. If you have not yet ticked the confirmation that the current data will be replaced, the button now says so and highlights the box, instead of silently not starting.

Reliability:

- Restores and backups are safer: an operation that cannot finish now reports the error instead of quietly ending as if it had worked, so the app never tells you a restore succeeded when the data was not fully written.
- Restoring a per-app network-access policy on custom ROMs now verifies the policy actually applied before reporting success, so a ROM that silently ignores the request is no longer mistaken for a completed restore.

New:
- Backups can now be sent to Telegram as an unlimited cloud destination. VDBackup signs in to your account and keeps each backup in a private channel over Telegram's own protocol - back up, restore and delete, all from the WebUI. You can name or pin the channel, and the channel is the index, so your backups stay reachable from any device.

- RCS chats (Google Messages) can now be backed up as a special backup - a raw copy that restores on the same device, plus a readable export of the conversations that opens on any computer. Migrating RCS between devices is not guaranteed (it re-registers per device), so same-device is the reliable case.

## v1.09

Reliability:

- Backing up a large app list now finishes reliably. The step that quiesces each app before backing it up used to go through Android's ActivityManager, which past about 120 apps exhausted the system's transaction limit and stalled the rest of the run; it now stops the app's own processes directly, so a backup of any number of apps completes. A finished or interrupted backup also reliably releases its wake lock, so repeated backups no longer keep the device awake.

## v1.08

Updates:

- VDBackup can now update itself without reflashing. Between releases it fetches only the files that changed (content-addressed, with a signed manifest) instead of re-downloading the whole package. Every update must carry a valid signature, downgrades are refused, and the full package stays available as a fallback.
- A new Updates panel in the WebUI shows update progress, lets you cancel, and checks for updates on demand. Updates apply on the next boot, with a metered-connection guard.

Reliability:

- Backing up a large number of apps at once no longer stalls partway through. VDBackup now stops only the apps that are actually running before it backs them up, instead of signalling every app; on long lists that flood of requests could exhaust Android's transaction limit and hang the run. A cancelled or interrupted backup now always releases its wake lock.

Restore:

- Restoring an app's saved network-access policy on custom ROMs now takes effect immediately and sticks. VDBackup asks the system's network-policy service to apply it, rather than editing the policy file underneath the running service, which the service could overwrite.

Fixes:

- The per-app "Back up" button now changes language together with the rest of the interface, instead of keeping its previous language until the app list is rebuilt.
- Deleting a backup now removes it reliably and cleans up the empty folders it leaves behind.

## v1.07

Reliability:

- A running backup now moves itself out of the app's process group, so Android's app freezer and phantom-process killer cannot pause or kill it when you background or close the app. Unattended and scheduled backups finish reliably, building on the detached-process work from v1.05.

Restore:

- Restoring an app's permissions now works on custom ROMs. Revoked runtime permissions are reapplied by UID, not only by package, so LineageOS-style per-UID permission modes come back correctly. A restored app's saved network-access policy (its mobile-data and Wi-Fi allowance) is reapplied too, across both the nested and flat netpolicy.xml layouts seen on Android 16 and 17.

Settings:

- You can now opt in, per app, to also back up and restore its network-access policy.
- Exporting settings, and any encrypted backup, now fails with a clear, specific message when encryption cannot run on this device, instead of a generic transfer error. The app also reports encryption availability when it loads.

Interface:

- Dragging the interface-scale slider in Settings no longer switches to another tab.

Languages:

- Added Ukrainian, bringing the interface and documentation to 22 languages.

## v1.06

Restore:

- Restoring an app over a fresh install now relabels its data for that install. Files restored to internal storage are given the new install's SELinux categories, fixing a crash where the app was denied access to its own data. Files restored to external storage (Android/data, Android/obb, Android/media) are re-owned to the new app so it can read them again instead of hanging on startup. Applies to full, snapshot and mirror restores.

## v1.05

Reliability:

- Batch backups no longer stop partway when you leave the app. A whole selection, a tag group or a scheduled run is now driven by one detached root process that keeps going when the WebUI is closed, and it is protected from being killed under memory pressure. The progress view reattaches when you come back.

Settings:

- Settings backup: export your destinations, schedules, presets and stored credentials to a single encrypted file, then import it onto another device or after a clean install. The file always asks for a passphrase because it carries remote passwords, and importing merges into the device without removing what is already there.
- You can now wipe stored remote credentials and the device encryption key from Settings in one step, leaving your destinations, schedules and backups in place.

Safety:

- Backups can only be stored where they stay encrypted at rest. Destinations under paths that are readable before the first unlock, such as /data/adb or /data/system, are refused.
- Saved credentials, the rclone config and the age key now live on credential-encrypted storage, locked until the first unlock, instead of a location that was readable before it; a module update moves them there permanently.
- Backups now check for free space before they start and stop with a clear message instead of failing midway.

Restore:

- Restoring an app that is no longer installed now reinstalls its APK first, and the restore dialog offers the APK option whenever the backup has one. A restore that cannot install the app reports the failure instead of claiming success.
- App, permission and setting operations now run in a clean environment, fixing "Failed transaction" errors that blocked restore, app-ops and settings on some ROMs.

Destinations:

- You can back up to an SD card or USB drive: the folder picker shows a shortcut to each storage volume and accepts removable-media paths.

## v1.04

Fixes:

- Backup folders now stay openable by a file manager automatically: their permissions are re-asserted on install, on every boot, and each time the WebUI opens, so a folder left owner-only (for example a backup made before v1.03.2) heals itself with no manual step.

Privacy:

- When you have local backups, the Backups tab now reminds you to hide the backup folder with SUSFS, just like the companion app: its presence can otherwise reveal root or an unlocked bootloader. SUSFS does the hiding; the reminder only points you there.

Backups:

- You can now set which items each app backs up, for example APK only or APK + OBB, applied in bulk, automatic and scheduled backups. A single manual backup still lets you pick at the time, pre-filled from the app's set. Set it in Settings, next to the excluded-apps list.

- Backup presets: save named sets of what to include and apply them with one pick in the backup dialog.
- Multi-user: app backups, special backups and restores now all follow the Android user you select.
- Apps come back warmer and more complete: their ART compilation profiles, and their notification-listener, accessibility and Doze battery-exemption grants, are backed up and restored.
- More reliable restores: file ownership and SELinux context are re-derived on the target device, so a restore works correctly across devices and users.
- Safer restores: Play Protect and the install verifier are silenced only during the install and restored exactly; the root manager is never backed up or restored; and the install source is verified and logged.
- App tags: give apps free labels like games or work, filter the app list by a tag, and back up a whole tagged group at once.

## v1.03.2

Fixes:

- The on-device cloud sign-in page always showed "Sign-in failed", even when the sign-in had
  actually succeeded. It now shows the real result.
- Saved backups can now be opened with a file manager: the per-app backup folders were left
  owner-only, so even a root file manager could not enter them; they are now accessible like
  the rest of /sdcard/VDBackup.

Cloud destinations:

- The optional Google Drive companion app is now built and bundled, so Google Drive works
  through the on-device companion (your device account, no manual token paste) in addition
  to rclone.

Interface:

- The backup dialog has a destination picker, so a backup can go to a chosen cloud or remote
  destination without changing the default destination in Settings first.
- The app checks for a newer version when it opens (at most once an hour) and shows the update
  banner only when one is available; it stays silent when up to date or offline.

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
  companion app (`ru.vd171.vdbackup`), which carries a mandatory [HMA-OSS](https://github.com/frknkrc44/HMA-OSS) hide notice.
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

<!-- doc-footer -->

---

> _This documentation was generated with Claude (Anthropic) and is maintained by VD171. Corrections and improvements are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md)._
