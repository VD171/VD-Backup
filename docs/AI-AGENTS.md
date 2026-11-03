# Driving VDBackup from an AI agent

VDBackup is built so an AI assistant or agent can administer **every** content and
action of the module headlessly, the same way a person does through the WebUI. The
WebUI is just one client of a small JSON API; your agent is another. Use the API,
do not scrape the WebUI.

## The contract

Everything goes through one entry point, run as root on the device:

```
sh /data/adb/modules/vdbackup/helper.sh <verb> <base64(JSON-args)>
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
H=/data/adb/modules/vdbackup/helper.sh
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
| `list-apps` | `{}` | `{ok,apps:[{package,label,system}]}` (dex, shell fallback) |
| `backup` | see below | `{ok,opid}` (detached) |
| `restore` | `{ref,mode,test,ssaid}` | `{ok,opid}` (detached) |
| `import` | `{from,ref,password,ssaid,user}` | `{ok,opid}` (detached) |
| `import-scan` | `{from,path}` | `{ok,backups:[...]}` |
| `progress` | base64(opid) | the live `progress-<opid>.json` |
| `cancel` | base64(opid) | `{ok,cancelled}` |
| `list-ops` | `{}` | `{ok,ops:[...]}` (reattach after reconnecting) |
| `list-backups` | `{package?}` | `{ok,backups:[...]}` |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref must be under the backups dir) |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | destination management |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | rclone remote management (creates the `rclone.conf` entry a `type:"rclone"` dest points to) |
| `schedule-set` / `schedule-list` / `schedule-delete` | `{id,package,mode,dest,cron,at,keep,items}` | scheduled jobs |
| `scheduler-tick` | `{}` | runs due jobs + applies retention (the boot heartbeat calls this) |

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

`restore`/`import` take `{ref}` (a backup dir / scan ref). `restore` also accepts
`"test": true` (extract to a temp dir and verify, without touching the live app) and
`"mode"` for snapshot/mirror. `import` takes `"from": "neo" | "databackup"` and, for
an encrypted Neo backup, `"password"`.

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
