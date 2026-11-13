> **Languages:** English · [العربية](ar/AI-AGENTS.md) · [Čeština](cs/AI-AGENTS.md) · [Deutsch](de/AI-AGENTS.md) · [Español](es/AI-AGENTS.md) · [فارسی](fa/AI-AGENTS.md) · [Français](fr/AI-AGENTS.md) · [हिन्दी](hi/AI-AGENTS.md) · [Bahasa Indonesia](in/AI-AGENTS.md) · [Italiano](it/AI-AGENTS.md) · [日本語](ja/AI-AGENTS.md) · [한국어](ko/AI-AGENTS.md) · [Nederlands](nl/AI-AGENTS.md) · [Polski](pl/AI-AGENTS.md) · [Português](pt/AI-AGENTS.md) · [Русский](ru/AI-AGENTS.md) · [Svenska](sv/AI-AGENTS.md) · [ไทย](th/AI-AGENTS.md) · [Türkçe](tr/AI-AGENTS.md) · [Українська](uk/AI-AGENTS.md) · [Tiếng Việt](vi/AI-AGENTS.md) · [中文](zh/AI-AGENTS.md)

---

# Driving VDBackup from an AI agent

VDBackup is built so an AI assistant or agent can administer **every** content and
action of the module headlessly, the same way a person does through the WebUI. The
WebUI is just one client of a small JSON API; your agent is another. Use the API,
do not scrape the WebUI.

## The contract

Everything goes through one entry point, run as root on the device:

```
sh /data/adb/modules/vdbackup/scripts/helper.sh <verb> <base64(JSON-args)>
```

- Arguments are a single JSON object, **base64-encoded**, passed as one argv token.
- The command prints **one JSON object** on stdout: `{"ok":true,...}` or
  `{"ok":false,"code":"ERR_...","message":"..."}`. Parse that; never scrape text.
- Long operations (`backup`, `restore`, `import`, `backup-batch`, `restore-batch`,
  `config-export`, `config-import`) return `{"ok":true,"opid":"..."}` immediately and run
  **detached** (they survive the caller/WebUI going away). Poll their progress; they are
  not finished when the call returns.
- `progress` and `cancel` take **base64 of the raw opid string**, not a JSON object.

A tiny helper for your shell:

```sh
b64() { printf '%s' "$1" | base64 -w0; }
H=/data/adb/modules/vdbackup/scripts/helper.sh
sh "$H" backup "$(b64 '{"package":"com.example.app","mode":"full"}')"
```

To drive it from a workstation, run that over your usual root channel to the device
(adb shell as root, or an SSH-to-root setup). The module ships bundled binaries, so
once installed it needs **no internet** for local backup/restore; only cloud
destinations (`rclone`/`restic`/ssh) talk to the network.

## Verbs

| Verb | Args (JSON) | Returns |
|------|-------------|---------|
| `ping` | `{}` | `{ok,version,abi}` |
| `overview` | `{user?}` | `{ok:true,apps,instances,path_backups,jobs,backups_size,free,total}` counts (sizes in bytes): apps with backups, total backup instances, standalone path backups, scheduled jobs, total backups size, and the backups filesystem free/total. Non-detached, returns immediately; used by the WebUI home overview. |
| `config-get` | `{}` | `{ok,config}` |
| `config-set` | the config object (or `{key,value}`) | `{ok}` |
| `keygen` | `{}` | generates the `age` keypair for encryption |
| `list-apps` | `{user?}` | `{ok,apps:[{package,label,system,versionCode}]}` (dex, shell fallback) |
| `label` | `{package,user?}` | `{ok,label}` (real localized app name, context-free) |
| `icon` | `{package,user?,vc?}` | `{ok,package,icon}` (base64 PNG; cached per package+`vc`) |
| `backup` | see below | `{ok,opid}` (detached) |
| `restore` | see below | `{ok,opid}` (detached) |
| `import` | `{from,ref,password,ssaid,user}` | `{ok,opid}` (detached) |
| `import-scan` | `{from,path}` | `{ok,backups:[...]}` |
| `progress` | base64(opid) | the live `progress-<opid>.json` |
| `cancel` | base64(opid) | `{ok,cancelled}` |
| `list-ops` | `{}` | `{ok,ops:[...]}` (reattach after reconnecting) |
| `list-apps`/`icons` | `{user?}` / `{user?,items:[{package,vc}]}` | app list / batch base64 icons |
| `list-backups` | `{package?}` | `{ok,backups:[{ref,package,label,versionName,versionCode,created_at,mode,items}]}` |
| `list-users` | `{}` | `{ok,users:[{id,name}]}` the device's Android users (multi-user). |
| `list-dirs` | `{path}` | `{ok,path,parent,dirs:[...]}` sub-directories of a path (the folder picker). |
| `path-list` | `{user?}` | `{ok,backups:[...]}` standalone folder/file backups. |
| `provenance` | `{}` | the bundled-binary audit manifest (`PROVENANCE.json`). |
| `backup-info` | `{ref}` | `{ok,...}` one backup's full details (version, install source, state, date, mode, size, items, permission counts, device) |
| `backup-icon` | `{ref}` | `{ok,icon}` base64 PNG from the manifest (works when the app is uninstalled) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref must be under the backups dir) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` keep newest N of a package |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` audit log, newest first |
| `log-export` | `{user?}` | `{ok:true,path}` (absolute path of a written `.txt` under the backups dir) or `{ok:false,code:"ERR_LOG_EXPORT"}`. Writes the activity log (`audit.jsonl`) plus a short build/device header to a single user-visible text file so it can be attached to a bug report. Non-detached, returns immediately. |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth/calendar/wallpaper/dns/system_settings) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` system-wide backup (detached) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (reboot-required; `confirm` gates it) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `path-backup` | `{path,compression?,password?}` | `{ok,opid}` back up any absolute path as `tar.zst`+`manifest.json` under `.paths/` (detached) |
| `path-restore` | `{ref,confirm:true,password?}` | `{ok,opid}` restore a path backup to its original location (`confirm` gates it; detached) |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | mount an installed app as a system app (systemless sub-module; live via NoMount else next boot) |
| `companion-status` / `companion-install` | `{}` | Google Drive companion status / on-demand install |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | destination management |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | rclone remote management (creates the `rclone.conf` entry a `type:"rclone"` dest points to); `backend` may be any rclone backend, no whitelist |
| `remote-authorize` | `{backend}` | `{ok:true,url}` (the engine already opened the phone browser to that consent URL via an Android VIEW intent) or `{ok:false,code:"ERR_AUTHORIZE"}`. Runs `rclone authorize <backend>` on a local callback server (`127.0.0.1:53682`) for on-device OAuth. |
| `remote-authorize-poll` | `{}` | `{ok:true,done:false,url}` while waiting, `{ok:true,done:true,token}` once the user consented (the `token` to pass to `remote-add`), or `{ok:false,code:"ERR_AUTHORIZE"}`. |
| `remote-authorize-cancel` | `{}` | `{ok:true,cancelled:true}`; stops a pending authorization. |
| `cloud-status` | `{}` | `{ok,rclone,restic,fetchable,size}` (are the `rclone`/`restic` binaries present, can this `lite` edition fetch them, download size in bytes) |
| `cloud-fetch` | `{}` | `{ok,opid}` (detached) fetch+verify+install the `rclone`/`restic` addon on a `lite` edition |
| `schedule-set` / `schedule-list` / `schedule-delete` | see below | scheduled jobs (a backup or a restore; targeting one app, a set, or all apps) |
| `scheduler-tick` | `{}` | runs due jobs + applies retention + the auto-backup observer (the boot heartbeat calls this) |
| `update-check` | `{}` | `{ok,current_version,current_code,latest_version,latest_code,update_available,zipUrl,changelog,notes}` (not detached; returns immediately; `ERR_UPDATE_CHECK` on failure, see below) |
| `backup-batch` | `{packages:[...], ...backup args}` | `{ok,opid}` (detached) backs up many apps in one detached op; progress carries `n`/`of`. A per-app failure does not stop the batch. |
| `restore-batch` | `{refs:[...], ...restore args}` | `{ok,opid}` (detached) restores many backups in one detached op; progress carries `n`/`of`. A per-app failure does not stop the batch. |
| `list-volumes` | `{}` | `{ok,volumes:[{path,removable,id?}]}` storage volumes for the folder picker: internal plus removable SD card / USB. |
| `config-export` | `{password}` | `{ok,opid}` (detached) exports config, jobs, destinations, credentials and keys to one passphrase-encrypted file under the backups dir. |
| `config-import` | `{ref,password}` | `{ok,opid}` (detached) merges an exported config file back into this device (never blind-overwrites). |
| `config-exports` | `{}` | `{ok,exports:[{ref,name,size}]}` lists the encrypted config files available to import. |
| `wipe-credentials` | `{}` | `{ok,wiped}` removes stored remote passwords and the device encryption key; destinations, jobs and backups stay. |
| `log-prune` | `{}` | `{ok}` prunes long-finished op logs, caps the audit trail and evicts stale icons (the boot service calls this). |

### `progress` fields

Polling `progress` returns the live `progress-<opid>.json` for the operation. These fields
are **always present**:

| Field | Type | Meaning |
|-------|------|---------|
| `opid` | string | the operation id |
| `percent` | int | 0-100 completion |
| `phase` | string | current phase label |
| `item` | string | current item type being processed |
| `done` | bool | true on a terminal write (finish / dry-run / restore-test) |

A running operation may also carry these **optional** live fields. They are absent or empty
when unknown, and are **omitted on terminal writes** (finish / dry-run / restore-test):

| Field | Type | Meaning |
|-------|------|---------|
| `rate` | string | transfer speed, e.g. `"4.2 MiB/s"` (empty = unknown) |
| `eta` | string | estimated time remaining, e.g. `"1m12s"` (empty = unknown) |
| `n` | int | current item index (0 = unknown) |
| `of` | int | total item count (0 = unknown) |
| `cur` | string | current item name (empty = none) |

Cloud transfers populate `rate`/`eta` (the percent comes from rclone); local Full backups
populate `n`/`of`/`cur`. Phase labels include the checksum-seal phase **`verified`** and,
for cloud transfers, **`transfer`** and **`mirror <item>`**.

### `backup` args

```json
{
  "package": "com.example.app",
  "user": 0,
  "mode": "full",                 // full | snapshot | mirror
  "compression": "zstd:10",       // none | lz4 | zstd[:N] | gzip
  "items": ["apk","data","data_de","obb","external","media"],
  "encrypt_data": false,
  "encrypt_apk": false,
  "dest": "local",                // local | <destination id>
  "verify": true,                 // re-hash each archive vs the manifest (default on for Full)
  "dry_run": false,               // true = report a size plan, write nothing
  "ssaid": false,                 // OPT-IN, see below
  "manual": false                 // true = single interactive backup, keeps these exact items;
                                  // omit/false lets config.app_items (a per-app item map) override
                                  // the set on bulk, auto and scheduled runs
}
```

`restore`/`import` take `{ref}` (a backup dir / scan ref). `restore` also accepts:
`"items"` (a subset of the backup's item types to restore; omit for all), `"test": true`
(extract to a temp dir and verify, without touching the live app), `"mode"` for
snapshot/mirror, `"password"` for an encrypted backup, `"ssaid"` (opt-in), and the
install-source options `"spoof_installer"` (default from config, sets the installer to the
Play Store at install time) and `"deep_spoof": true` (advanced opt-in; also forges the
initiating package and package source by editing the package database, applies after a
reboot). `import` takes `"from": "neo" | "databackup"` and, for an encrypted Neo backup,
`"password"`.

### `schedule-set` args

A schedule job picks **one** target and an **action**:

```json
{
  "id": "nightly-games",
  "action": "backup",             // "backup" (default) | "restore"
  "package": "com.example.app",   // one app   - OR -
  "packages": ["com.a","com.b"],  // a set of apps   - OR -
  "all": true,                    // all apps, minus the excluded-apps list
  "cron": "daily",                // hourly | daily | weekly
  "at": "02:30",                  // HH:MM
  "mode": "full",
  "dest": "local",
  "keep": 5,
  "items": ["apk","data"],
  "require_wifi": false,          // gate: only run on Wi-Fi
  "require_charging": false,      // gate: only run while charging
  "min_battery": 0,               // gate: only run at/above this battery % (0-100)
  "days": [1,2,3,4,5]             // gate: only run on these weekdays (0=Sunday)
}
```

Give exactly **one** of `package`, `packages` or `all` for the target. A `backup` job
keeps the usual `mode`/`dest`/`keep`/`items`. A `restore` job (`action: "restore"`)
restores each target app's **latest** backup (or an explicit `ref`) and **overwrites the
app's current data on every run**: it is deliberate and opt-in, so set it only on a
direct user request.

### Scheduler gating

A scheduled job may carry **optional gate conditions**. When a due job's gate is not met it
is **skipped and retried on the next tick, without advancing its schedule** (its `last_run`
is not stamped, so it fires as soon as the condition holds):

| Field | Type | Gate |
|-------|------|------|
| `require_wifi` | bool | only run while on Wi-Fi |
| `require_charging` | bool | only run while charging |
| `min_battery` | int (0-100) | only run at or above this battery level |
| `days` | array of int (0-6, 0=Sunday) | only run on these weekdays |

A minimal **thermal safety** check is always applied on top of these: a scheduled op is
skipped while the device is critically hot. Every gate skip is written to the audit trail as
`op:"scheduler-gated"` with a `reason` of `wifi` / `charging` / `battery` / `days` /
`thermal`.

### `remote-add` args

A cloud destination is a `type:"rclone"` dest that names an `rclone` remote; create
that remote first with `remote-add`. The `backend` may be **any rclone backend**: there
is no whitelist. `remote-add` accepts any backend name (`dropbox`, `onedrive`, `box`,
`pcloud`, `mega`, `b2`, `s3`, `sftp`, `smb`, `webdav`, `ftp`, `drive` and the ~70 others
rclone supports), and the `params` are passed straight through to the `rclone` config as
`key=value` pairs. Password fields are stored obscured, never in clear. Common backends
and their `params`:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

**On-device OAuth (no PC).** Backends that need a browser sign-in (Google Drive, Dropbox,
OneDrive, Box, pCloud) do not require a desktop or a manually pasted token. Call
`remote-authorize` with `{backend}`: the engine runs `rclone authorize <backend>` against a
local callback server (`127.0.0.1:53682`) and opens the phone's own browser at the provider
consent page via an Android VIEW intent, returning `{ok:true,url}` (or
`{ok:false,code:"ERR_AUTHORIZE"}`). Poll `remote-authorize-poll` (`{}`): it returns
`{ok:true,done:false,url}` while waiting and `{ok:true,done:true,token}` once the user
approves, pass that `token` to `remote-add`. `remote-authorize-cancel` (`{}`) stops a
pending authorization (`{ok:true,cancelled:true}`). Manually pasting the output of
`rclone authorize "<backend>"` from any computer is still supported as a fallback.

Google Drive has two paths: this `drive` remote (no Google Cloud project needed, uses
rclone's own OAuth, authorize on-device with `remote-authorize`, or run
`rclone authorize "drive"` once on any computer and pass the token) or the opt-in companion
app (your own OAuth client id). Both end up as ordinary destinations.

### Network policy

The config field `network_policy` controls which connection cloud transfers may use:
`any` (default), `wifi`, or `mobile`. Set it with `config-set`. When it is `wifi` or
`mobile`, every cloud transfer (Full `rclone`/Drive upload, Mirror sync, remote
`restic` snapshot backup/restore, Mirror restore) checks the active transport first and
aborts with `ERR_NET_POLICY` if it does not match, for both manual and scheduled jobs.
Local destinations are never gated.

### Cloud integrity and quota

- **Checksum seal (cloud).** After a successful cloud copy the engine runs a remote checksum
  check (`rclone check`); a mismatch fails the op with `ERR_VERIFY`. Backends that share no
  common hash with the local side are skipped (not a failure).
- **Quota check (cloud, Full mode).** Before a Full-mode upload to an `rclone` remote the
  engine queries the remote's free space (`rclone about --json`) and refuses with
  `ERR_QUOTA` if the backup would not fit. Remotes that report no quota information are
  skipped. Mirror mode is a delta sync and is exempt.

### Cloud binaries (`lite` edition)

A `full` edition bundles every binary and never needs the network. The `lite` edition omits
the two largest, `rclone` and `restic`, and fetches them on demand the first time you run a
cloud or snapshot action. `cloud-status` reports whether they are already present, whether this
edition can fetch them, and the download size in bytes. `cloud-fetch` runs **detached** (poll
`progress` with its `opid`): it downloads the per-architecture `rclone`+`restic` addon, verifies
it against the SHA-256 baked into the module, and installs it into the runtime cache. Its
progress phases are `downloading`, `verifying`, and `installing`; the final code is `ERR_NONE`
on success, or `ERR_FETCH` (download failed) / `ERR_FETCH_VERIFY` (checksum mismatch, discarded)
on failure. On a `full` edition it is unnecessary. A `backup`/`restore` to a cloud or snapshot
destination on the `lite` edition, before the binaries are present, fails with
`ERR_CLOUD_FETCHABLE`; the client should offer to run `cloud-fetch`, then retry.

### Special backup categories

`special-categories` reports which system-wide categories a device has; `special-backup`
captures the ones you pass in `categories` and `special-restore` re-applies them. The
categories are:

| Category | What it is | Restore semantics |
|----------|-----------|-------------------|
| `messages` | SMS/MMS | provider replace (wipe + extract) |
| `contacts` | contacts and call log | provider replace (wipe + extract) |
| `wifi` | saved Wi-Fi networks | provider replace (wipe + extract) |
| `bluetooth` | Bluetooth pairings | provider replace (wipe + extract) |
| `calendar` | the calendar provider (`com.android.providers.calendar`, app + data); also exported portably to `calendar.json` | provider replace (wipe + extract) |
| `wallpaper` | home and lock wallpaper plus `wallpaper_info.xml`, stored raw (binary) | files replaced |
| `dns` | the private DNS mode and specifier, read from settings | idempotent `settings put` |
| `system_settings` | the full system/global/secure settings dump | **opt-in**, idempotent `settings put`, overwrites device settings |

**`system_settings` is strictly opt-in and destructive on restore.** Like `ssaid`, it
overwrites device-wide settings when it is restored, so it is gated behind explicit user
consent and written to the audit trail. Never select it by default; only on a direct,
deliberate user request.

### Standalone path backup

`path-backup` / `path-restore` back up and restore **any absolute path**: a folder or a
single file, on shared storage or under `/data`, outside the per-app model. The archive
is written as `tar.zst` plus a `manifest.json` in VDBackup's own format (SHA-256 sealed,
with a RECOVERY kit when encrypted) under `.paths/` in the backups directory.

```json
// path-backup
{ "path": "/sdcard/DCIM/Camera", "compression": "zstd:10", "password": "..." }
// path-restore
{ "ref": "<.paths ref>", "confirm": true, "password": "..." }
```

- The source path must be **absolute** and under one of the allowed roots:
  `/storage/emulated`, `/data/media`, `/sdcard`, `/data`. A path that does not exist fails
  with `ERR_NO_PATH`; a path outside the allowed roots, or one containing `..`, fails with
  `ERR_BAD_PATH`.
- `path-restore` writes back to the original location, so it is destructive and requires
  `"confirm": true`, a heavy-friction gate, like `special-restore`. A `ref` that is not a
  valid path backup fails with `ERR_BAD_REF`.
- Both run **detached**; poll `progress` with the returned `opid`.

### `update-check`

`update-check` reports whether a newer version of the module has been published, so an agent
(or the WebUI) can surface it. It is a **read verb that returns immediately**: it is **not**
detached, so there is no `opid` to poll. Triggered only by an explicit user action, it fetches
the module's published update manifest (the `updateJson` URL from `module.prop`) with the bundled
`curl` over a root-side HTTP request, this runs outside the WebView, so it is not subject to the
WebUI CSP, and compares the published `versionCode` with the installed one. It takes **no
arguments**.

On success it returns:

| Field | Type | Meaning |
|-------|------|---------|
| `ok` | bool | `true` |
| `current_version` | string | the installed versionName |
| `current_code` | int | the installed versionCode |
| `latest_version` | string | the published versionName |
| `latest_code` | int | the published versionCode |
| `update_available` | bool | `true` when `latest_code` is greater than `current_code` |
| `zipUrl` | string | the published zip URL |
| `changelog` | string | the published changelog URL |
| `notes` | string | the release notes |

If there is no `updateJson` URL, the network request fails, or the manifest cannot be parsed, it
returns `{"ok":false,"code":"ERR_UPDATE_CHECK"}`.

`update-check` only **reports** availability and release notes; the update itself is performed by
your root manager (KernelSU / APatch / Magisk) through the module's `updateJson`, never by this
verb.

## Safety rails your agent must respect

- **`ssaid` is strictly opt-in (default off).** It backs up / restores the device
  ANDROID_ID by rewriting a system file; a restore applies only after a reboot, and
  the previous file is always saved first for rollback. Only send `"ssaid": true`
  on a direct, deliberate user request, never by default.
- **Mutating actions (restore, delete, import) are destructive** and are logged to a
  local audit trail (`logs/audit.jsonl`). Restore is faithful (wipe-then-extract), so
  it reverts the app to the backup's exact state. Confirm intent before you call them.
- **`system_settings` is opt-in and destructive, exactly like `ssaid`.** Restoring it
  overwrites device-wide settings, so send it only on a direct user request; it is gated
  by explicit consent and recorded in the audit trail.
- **Restore is idempotent.** Raw provider restores (messages/contacts/wifi/bluetooth/
  calendar) **replace** rather than merge, the provider data is wiped and the archive is
  extracted over it, so re-restoring the same backup cannot duplicate rows. `dns` and
  `system_settings` are re-applied with idempotent `settings put`.
- **Archive extraction is guarded against path traversal.** Restore runs as root, so
  every archive (restore, import, special-restore, path-restore) is checked before any
  write: one whose members use absolute paths or contain `..` is rejected up front with
  `ERR_UNSAFE_ARCHIVE`, before a single destructive write happens (GNU tar also runs with
  `--no-absolute-names`). A tampered archive can never escape its target directory.
- **Never weaken** preservation (SELinux/uid/gid/modes/xattr) or the APK rule (APKs
  are always compressed, never encrypted unless `encrypt_apk` is set).
- Treat the JSON output as the source of truth; check `ok`/`code`, poll `progress`,
  and surface `ERR_*` codes rather than guessing.

See [ARCHITECTURE.md](../ARCHITECTURE.md) and
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) for the internals.

<!-- doc-footer -->

---

> _This documentation was generated with Claude (Anthropic) and is maintained by VD171. Corrections and improvements are welcome; see [CONTRIBUTING.md](../CONTRIBUTING.md)._
