# VDBackup Drive companion (`ru.vd171.vdbackup`)

Headless, optional, on-demand Google Drive companion for the **VDBackup** root module.

> SCAFFOLD NOTICE: this project is structurally complete but has **not** been built or tested
> in this environment. It needs a real Google Cloud OAuth client id and an on-device consent
> test before it is production-ready. Do not treat it as shipped. No Gradle run has happened here.

## What it is

The VDBackup module does **all** backup/restore work already-root from its WebUI. Google Drive is
just another file destination (tar.zst files uploaded as ordinary Drive files). Android reserves the
OAuth consent screen for a real, foreground Activity owned by an installed app, so that one step
cannot be driven from a root shell. This companion exists only to cover it:

- a single **consent Activity** (the unavoidable first-run Google sign-in for the Drive scope), and
- a headless **command Service** the module's root engine drives (upload / download / list / delete /
  consent check) with **no UI**.

The module's WebUI stays the only user interface. The companion has **no launcher icon** (no
`MAIN`/`LAUNCHER` intent filter): it is started only by the root engine or by the WebUI launching the
consent Activity on first use.

## Optional / on-demand lifecycle

- The module embeds this APK and installs it with `pm install` **only** when the user explicitly
  picks the Google Drive destination. Never by default.
- It is removed when the user disables the Google Drive destination.
- The module stores the embedded APK's `versionCode` and **(re)installs only when embedded > installed**,
  so a module bump does not reinstall the companion needlessly.
- Alternative with no APK at all: Drive via the embedded `rclone` (see module docs). This companion is
  the native-OAuth path.

## Independent versioning (owner rule, 01/11)

The companion version is **independent of the module version**. It carries its own `versionCode` /
`versionName` in `app/build.gradle.kts` (starts at `versionCode = 1`, `versionName = "1.0"`). Do not
sync it to the module's `module.prop`. Bump it only when the companion itself changes.

## Mandatory HMA-OSS hide step

When the module installs this companion, the WebUI **must** show a mandatory alert: the companion must
**always be hidden with [HMA-OSS](https://github.com/frknkrc44/HMA-OSS)** so it does not expose root / an unlocked bootloader to apps that
enumerate installed packages. Wording is always positive: [HMA-OSS](https://github.com/frknkrc44/HMA-OSS) is the **solution**, never a
"failure". The WebUI offers to add `ru.vd171.vdbackup` to the [HMA-OSS](https://github.com/frknkrc44/HMA-OSS) hide list (strings `companion_hma_*`,
owned by the module WebUI, not by this project).

## Shell <-> app command interface

The root engine drives the companion with `am`. Because the engine runs as **uid 0 (root)**, it
bypasses the export/permission gate; the `signature`-level `ru.vd171.vdbackup.permission.DRIVE_COMMAND`
on the Service blocks any **non-root** app from invoking it.

Every data op is a single `am start-foreground-service` call. The result is **not** on stdout (the
service returns immediately); it is written to the file path given in `result`. The engine waits for a
sibling marker file `<result>.done` to appear, then reads `<result>` as JSON.

### Consent check and first-run consent

```sh
# 1) ask whether consent already exists (writes JSON to /data/adb/vdbackup/drive/check.json)
am start-foreground-service \
  -n ru.vd171.vdbackup/.DriveCommandService \
  -e op check \
  -e result /data/adb/vdbackup/drive/check.json
#    then wait for /data/adb/vdbackup/drive/check.json.done and read check.json
#    ok=false, code=ERR_NO_CONSENT  -> run the consent Activity below

# 2) first-run consent (VISIBLE Activity, the one unavoidable UI step)
am start \
  -n ru.vd171.vdbackup/.ConsentActivity \
  -e result /data/adb/vdbackup/drive/consent.json
#    user signs in; result JSON: ok=true code=ERR_NONE, or ok=false code=ERR_CONSENT_DENIED
```

### Data ops (headless)

```sh
# upload a local file; remote name defaults to the basename of src if name is omitted
am start-foreground-service -n ru.vd171.vdbackup/.DriveCommandService \
  -e op upload -e src /data/adb/vdbackup/out/app.tar.zst \
  -e name app.tar.zst \
  -e result /data/adb/vdbackup/drive/r.json

# list (name optional: omit to list all non-trashed app-created files)
am start-foreground-service -n ru.vd171.vdbackup/.DriveCommandService \
  -e op list -e name app.tar.zst \
  -e result /data/adb/vdbackup/drive/r.json

# download by Drive file id to a local path
am start-foreground-service -n ru.vd171.vdbackup/.DriveCommandService \
  -e op download -e id <driveFileId> -e dst /data/adb/vdbackup/in/app.tar.zst \
  -e result /data/adb/vdbackup/drive/r.json

# delete by Drive file id
am start-foreground-service -n ru.vd171.vdbackup/.DriveCommandService \
  -e op delete -e id <driveFileId> \
  -e result /data/adb/vdbackup/drive/r.json
```

### Extras

| extra    | meaning                                                              |
|----------|---------------------------------------------------------------------|
| `op`     | `check` \| `upload` \| `download` \| `list` \| `delete`             |
| `src`    | local source path (upload)                                          |
| `dst`    | local destination path (download)                                   |
| `id`     | Drive file id (download, delete)                                    |
| `name`   | remote file name (upload) or name filter (list)                     |
| `result` | absolute path the app writes the result JSON to                     |

### Result JSON

```json
{ "ok": true, "op": "upload", "code": "ERR_NONE", "data": { "id": "...", "name": "...", "size": "..." }, "message": "upload ok" }
```

`data` is the raw Drive REST payload for `list`/`upload`, or a small object for
`download`/`delete`. On failure, `ok` is `false` and `code` is one of:

Notes on the Drive REST behaviour behind these ops:

- `upload` is a **resumable** upload (initiate session, then stream the file in 8 MiB chunks with
  `Content-Range`), so a multi-GB `tar.zst` is never buffered in memory. `data` is the file resource
  `{ id, name, size, mimeType }`.
- `list` requests `pageSize=1000` over `spaces=drive` and returns the raw page payload
  `{ files:[...], nextPageToken?, incompleteSearch }`. With the `drive.file` scope only this app's own
  files are ever visible.
- The access token is fetched fresh before every op; on an HTTP `401` the client invalidates the cached
  token, refreshes once, and retries. A `401` that survives the refresh becomes `ERR_CONSENT_REQUIRED`.

| code                 | meaning                                         |
|----------------------|-------------------------------------------------|
| `ERR_NONE`           | success                                         |
| `ERR_NO_CONSENT`     | no linked account; run the consent Activity     |
| `ERR_CONSENT_REQUIRED` | token revoked/expired; re-run consent         |
| `ERR_CONSENT_DENIED` | user cancelled the consent screen               |
| `ERR_TOKEN`          | token fetch failed                              |
| `ERR_SRC`            | upload source file missing                      |
| `ERR_UPLOAD` / `ERR_DOWNLOAD` / `ERR_LIST` / `ERR_DELETE` | Drive REST error (HTTP) |
| `ERR_UNKNOWN_OP`     | unrecognized `op`                               |
| `ERR_INTERNAL`       | unexpected failure                              |

**Consent is validated before every Drive op**: the client fetches a fresh access token first, and any
missing/revoked/expired token aborts the op with a clear `code` the module surfaces (localized, 21
languages) telling the user to re-authorize. Never a silent failure.

## Google Cloud OAuth client setup (required before anything works)

1. Create a project at <https://console.cloud.google.com/>.
2. Enable the **Google Drive API**.
3. Configure the OAuth consent screen; add the scope `https://www.googleapis.com/auth/drive.file`
   (enough for app-created files).
4. Create an **Android OAuth client** bound to package `ru.vd171.vdbackup` + the release signing
   SHA-1, and a **Web OAuth client** for the id token.
5. Paste the **Web client id** into `app/src/main/res/values/oauth.xml`
   (`<string name="oauth_client_id">...</string>`), replacing
   `TODO_SET_YOUR_GOOGLE_CLOUD_OAUTH_CLIENT_ID.apps.googleusercontent.com`.
   **Never commit a real client id to a public repository.**

## Build

Release only, never debug (house rule):

```sh
cd companion
# provide the SDK path in local.properties (sdk.dir=...) or via ANDROID_SDK_ROOT
# provide release signing via env: VDB_COMPANION_KEYSTORE, VDB_COMPANION_STORE_PASS,
#   VDB_COMPANION_KEY_ALIAS, VDB_COMPANION_KEY_PASS
gradle :app:assembleRelease
```

The signed APK (`app/build/outputs/apk/release/app-release.apk`) is what the module embeds.

- `applicationId` / namespace: `ru.vd171.vdbackup`
- `minSdk` 26, `targetSdk` 35, `compileSdk` 35 (consistent with the module)
- Kotlin, AndroidX, `play-services-auth` for the consent flow + `GoogleAuthUtil` for Drive tokens;
  Drive REST over `HttpURLConnection` (no heavy Drive client library).

## File layout

```
companion/
├── README.md
├── settings.gradle.kts
├── build.gradle.kts
├── gradle.properties
└── app/
    ├── build.gradle.kts
    ├── proguard-rules.pro
    └── src/main/
        ├── AndroidManifest.xml
        ├── res/values/
        │   ├── strings.xml
        │   └── oauth.xml          # OAuth client id placeholder lives here
        └── kotlin/ru/vd171/vdbackup/
            ├── DriveConfig.kt      # scopes + Drive REST endpoints
            ├── TokenStore.kt       # linked account persistence
            ├── CommandResult.kt    # writes <result>.json + <result>.done
            ├── DriveClient.kt      # token + resumable upload/download/list/delete REST
            ├── ConsentActivity.kt  # first-run Google consent screen
            └── DriveCommandService.kt  # headless entry the root engine drives
```

## See also

- **[VDBackup](https://github.com/VD171/VD-Backup)** - the root backup/restore module this companion serves.
- **[VDInfos](https://github.com/VD171/VD-Infos)** - a device method debugger: reads each item through every method that can read it and compares them side by side.
- **[VDGoogle](https://github.com/VD171/VD-Google)** - your Google services (RCS, Wallet, Play Integrity attestations), read on your device with no internet.
- **[COPG-VD](https://github.com/VD171/COPG-VD)** - a device spoofer that turns a fresh fingerprint into a coherent, consistent profile.
