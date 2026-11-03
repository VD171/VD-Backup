# Changelog

All notable changes to VDBackup are documented here. English only.

## v1.0

- Initial skeleton: KernelSU/APatch/Magisk WebUI module scaffold.
- WebUI shell (vanilla JS) with i18n engine and the 21 standard languages.
- `helper.sh` command dispatcher and detached `worker.sh` engine (backup/restore
  run in the background and survive closing the WebUI).
- Backup/restore start & finish notifications from root (`cmd notification`).
- Portable encryption groundwork: `age` keypair generation (`keygen`), and a PC
  RECOVERY guide shipped inside every encrypted backup (decrypt/extract anywhere).
- Project skeleton: install scripts, update.json, CI and release workflows,
  per-ABI `bin/` layout, contributor docs.
- Backup/restore engine (Full mode, local destination): APK (always compressed) +
  data/data_de/obb/external/media, with SELinux context, uid/gid, modes and xattr
  preserved; JSON manifest; restore via `pm install` session + ownership/context remap.
- Runtime permissions and AppOps captured into the manifest and reapplied on restore
  (`pm grant/revoke`, `cmd appops set`).
- SSAID (device ANDROID_ID): strictly opt-in and prominently flagged. ABX-aware (via
  the device `abx2xml`/`xml2abx`, with a bundled static converter as fallback); the
  live file is always backed up byte-exact before any overwrite, for rollback; applies
  after a reboot.
- `list-backups` and `delete-backup`; Backups tab in the WebUI with restore.
- Backup modes: Full (local/remote), Snapshot (restic repo) and Mirror (rclone/rsync
  1:1 sync); Full backups can be transferred to a remote destination.
- Destinations: add/list/test/delete (local, rclone remote, restic repo, and an opt-in
  Google Drive companion), credentials kept out of the stored config; Destinations tab
  and default mode/destination settings.
- Snapshot mode (restic) and Mirror mode (rsync 1:1) validated end-to-end on device;
  owner and SELinux context reapplied on restore. APKs are compressed even in a mirror.
- Android-DataBackup import: scan + restore (install APKs, extract user/user_de/data
  archives, remap), verified against real DataBackup backups on device.
- Neo-Backup import: `import-scan` + `import`, including password-encrypted backups
  (AES-256-GCM decrypted by the dex helper; the WebUI prompts for the password).
  Validated against the author's real backups across devices.
- Integrity and safety: faithful wipe-then-extract restore; per-archive sha256 verify
  (default on for Full), dry-run and restore-test; archives are read back for
  completeness; a corrupt archive or an invalid package name can never trigger a
  destructive restore; remote-transfer failures are reported, never silent.
- Scheduling with keep-N retention; verify/dry-run/restore-test options.
- Google Drive: opt-in headless companion app (`ru.vd171.vdbackup`, independent
  versioning) with a mandatory HMA-OSS hide notice; or Drive via rclone.
- Rich app list and the Neo decrypt run through a dex helper driven as root
  (`IPackageManager` via ServiceManager, so it works where ActivityThread hangs).
- AI-friendly: a documented JSON control surface so agents can administer every action
  headlessly (`docs/AI-AGENTS.md`), plus a full user guide and docs-to-wiki mirroring.
- Fully translated README in the 21 standard languages.
