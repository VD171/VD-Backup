> **Languages:** English · [العربية](ar/AI-AGENTS.md) · [Čeština](cs/AI-AGENTS.md) · [Deutsch](de/AI-AGENTS.md) · [Español](es/AI-AGENTS.md) · [فارسی](fa/AI-AGENTS.md) · [Français](fr/AI-AGENTS.md) · [हिन्दी](hi/AI-AGENTS.md) · [Bahasa Indonesia](in/AI-AGENTS.md) · [Italiano](it/AI-AGENTS.md) · [日本語](ja/AI-AGENTS.md) · [한국어](ko/AI-AGENTS.md) · [Nederlands](nl/AI-AGENTS.md) · [Polski](pl/AI-AGENTS.md) · [Português](pt/AI-AGENTS.md) · [Русский](ru/AI-AGENTS.md) · [Svenska](sv/AI-AGENTS.md) · [ไทย](th/AI-AGENTS.md) · [Türkçe](tr/AI-AGENTS.md) · [Tiếng Việt](vi/AI-AGENTS.md) · [中文](zh/AI-AGENTS.md)

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
- Long operations (`backup`, `restore`, `import`) return `{"ok":true,"opid":"..."}`
  immediately and run **detached** (they survive the caller/WebUI going away). Poll
  their progress; they are not finished when the call returns.
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
| `backup-info` | `{ref}` | `{ok,...}` one backup's full details (version, install source, state, date, mode, size, items, permission counts, device) |
| `backup-icon` | `{ref}` | `{ok,icon}` base64 PNG from the manifest (works when the app is uninstalled) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref must be under the backups dir) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` keep newest N of a package |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` audit log, newest first |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` system-wide backup (detached) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (reboot-required; `confirm` gates it) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | mount an installed app as a system app (systemless sub-module; live via NoMount else next boot) |
| `companion-status` / `companion-install` | `{}` | Google Drive companion status / on-demand install |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | destination management |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | rclone remote management (creates the `rclone.conf` entry a `type:"rclone"` dest points to) |
| `schedule-set` / `schedule-list` / `schedule-delete` | `{id,package,mode,dest,cron,at,keep,items}` | scheduled jobs |
| `scheduler-tick` | `{}` | runs due jobs + applies retention + the auto-backup observer (the boot heartbeat calls this) |

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
  "ssaid": false                  // OPT-IN, see below
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

### `remote-add` args

A cloud destination is a `type:"rclone"` dest that names an `rclone` remote; create
that remote first with `remote-add`. Password fields are stored obscured, never in
clear. Supported `backend` values and their `params`:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

Google Drive has two paths: this `drive` remote (no Google Cloud project needed, uses
rclone's own OAuth - run `rclone authorize "drive"` once on any computer and pass the
token) or the opt-in companion app (your own OAuth client id). Both end up as ordinary
destinations.

### Network policy

The config field `network_policy` controls which connection cloud transfers may use:
`any` (default), `wifi`, or `mobile`. Set it with `config-set`. When it is `wifi` or
`mobile`, every cloud transfer (Full `rclone`/Drive upload, Mirror sync, remote
`restic` snapshot backup/restore, Mirror restore) checks the active transport first and
aborts with `ERR_NET_POLICY` if it does not match - for both manual and scheduled jobs.
Local destinations are never gated.

## Safety rails your agent must respect

- **`ssaid` is strictly opt-in (default off).** It backs up / restores the device
  ANDROID_ID by rewriting a system file; a restore applies only after a reboot, and
  the previous file is always saved first for rollback. Only send `"ssaid": true`
  on a direct, deliberate user request - never by default.
- **Mutating actions (restore, delete, import) are destructive** and are logged to a
  local audit trail (`logs/audit.jsonl`). Restore is faithful (wipe-then-extract), so
  it reverts the app to the backup's exact state. Confirm intent before you call them.
- **Never weaken** preservation (SELinux/uid/gid/modes/xattr) or the APK rule (APKs
  are always compressed, never encrypted unless `encrypt_apk` is set).
- Treat the JSON output as the source of truth; check `ok`/`code`, poll `progress`,
  and surface `ERR_*` codes rather than guessing.

See [ARCHITECTURE.md](../ARCHITECTURE.md) and
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) for the internals.

---

*This documentation was generated with Claude (Anthropic) and is maintained by VD171. Corrections and improvements are welcome - see [CONTRIBUTING.md](../CONTRIBUTING.md).*
