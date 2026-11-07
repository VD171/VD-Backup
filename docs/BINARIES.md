> **Languages:** English · [العربية](ar/BINARIES.md) · [Čeština](cs/BINARIES.md) · [Deutsch](de/BINARIES.md) · [Español](es/BINARIES.md) · [فارسی](fa/BINARIES.md) · [Français](fr/BINARIES.md) · [हिन्दी](hi/BINARIES.md) · [Bahasa Indonesia](in/BINARIES.md) · [Italiano](it/BINARIES.md) · [日本語](ja/BINARIES.md) · [한국어](ko/BINARIES.md) · [Nederlands](nl/BINARIES.md) · [Polski](pl/BINARIES.md) · [Português](pt/BINARIES.md) · [Русский](ru/BINARIES.md) · [Svenska](sv/BINARIES.md) · [ไทย](th/BINARIES.md) · [Türkçe](tr/BINARIES.md) · [Tiếng Việt](vi/BINARIES.md) · [中文](zh/BINARIES.md)

---

# Bundled binaries: provenance and auditing

Privacy and security are not optional in VDBackup. A backup tool runs as root over
your most personal data, so you must be able to see exactly what ships inside it. This
page documents every prebuilt binary and library the module carries, where each comes
from, and how to verify that nothing opaque was slipped in.

## Principles

- **Nothing opaque.** Every shipped binary and library is traceable to a named, public
  upstream at a pinned version, with a recorded SHA-256. No blob is bundled without an
  entry you can check.
- **Fetched from upstream, never from a device.** Native tools come from the official
  Termux package repository (the signed `.deb` files at `packages.termux.dev/apt`), never
  copied out of a Termux installed on some phone. The build fails loudly, it never
  improvises.
- **Reproducible.** Re-run the build and you get the same files; re-fetch the pinned
  sources and the SHA-256 values match.
- **The audit trail ships with the module.** It is not just on the website - it travels
  inside the installed module, on your device, so you can audit offline.

## What ships, and from where

| Artifact | Source | How it is built |
|---|---|---|
| `bin/<abi>/` native tools (`tar`, `zstd`, `gzip`, `lz4`, `jq`, `rclone`, `restic`, `rsync`, `ssh`/`scp`/`sftp`, `age`, `age-keygen`, `script`, `sqlite3`) + their `lib/` closure | Official **Termux** apt repo (`packages.termux.dev/apt`), official `.deb` packages | `.github/scripts/build_bin.sh` downloads the `.deb` files + their transitive dependencies, extracts them, and copies the binaries plus only the shared libraries each one needs |
| `bin/<abi>/abx2xml`, `bin/<abi>/xml2abx` (ABX converter fallback) | **rhythmcache/android-xml-converter** GitHub release (`ABX_RELEASE`, static ELF) | downloaded from the pinned release by `build_bin.sh` |
| `companion.apk` (optional Google Drive companion) | **This repository**, `companion/` (Gradle/Kotlin) | built from source by CI and signed with the project key (`VD_Key`); not a prebuilt blob |
| `vdbhelper.dex` (framework helper) | **This repository**, `dex/src/` (Java) | compiled from source by CI with `javac` + `d8` |

Only the first two rows are prebuilt third-party binaries; the last two are built from
source that lives in this repository and can be read and rebuilt.

> **Full vs lite editions.** The lite editions omit only `rclone` and `restic` (the
> two largest binaries) to stay small and fetch them on demand (SHA-256-verified) the
> first time you use a cloud destination or snapshot mode; `rsync` and `ssh`/`scp`/`sftp`
> are still present, and every other binary listed above is present too. The full editions
> ship `rclone` (cloud providers) and `restic` (snapshots) embedded, so nothing is ever
> downloaded.

## The on-device manifest: `PROVENANCE.json`

`build_bin.sh` writes one `bin/<abi>/PROVENANCE.json` per ABI. On install the module
keeps only your device's ABI, so that file stays on the device at
`/data/adb/modules/vdbackup/bin/<abi>/PROVENANCE.json`. It records:

- `sources`: every upstream `.deb` (package, version, full URL, SHA-256 of the `.deb`) and
  the ABX release (URL, SHA-256 of the archive).
- `files`: every file actually shipped under `bin/<abi>/` (path, size, SHA-256).

You can read it in the WebUI (the **About** tab links to it) or over the agent API:

```sh
sh /data/adb/modules/vdbackup/helper.sh provenance '' | jq .
```

## How to verify (step by step)

1. **Check the shipped files.** Hash each file under `bin/<abi>/` on your device and
   compare to the `files[].sha256` in `PROVENANCE.json`:
   ```sh
   cd /data/adb/modules/vdbackup/bin/<abi>
   sha256sum tar zstd jq rclone ... lib/*
   ```
2. **Check the files against upstream.** For each `sources[]` entry, download the pinned
   `.deb` from its URL, confirm its SHA-256 matches `deb_sha256`, extract it, and confirm
   the binaries/libraries it contains hash to the same values shipped. The `.deb` files in
   the Termux repo are themselves served from Termux's signed apt repository.
3. **Rebuild from scratch.** Run `.github/scripts/build_bin.sh` yourself (needs only
   `curl`, `ar`, `tar`, `xz`, `zstd`, `readelf`) and compare the output to what shipped.
4. **Companion and dex.** Rebuild `companion/` and `dex/` from source; the companion's
   signature is the project key `VD_Key` (SHA-256
   `F3:F8:2B:B9:2F:2C:69:A1:75:90:1D:40:BD:65:DD:A6:8F:2B:B5:88:69:77:F5:EA:8B:BA:AA:51:40:E5:25:2B`).

## Reporting

If any shipped file does not match its recorded source, treat it as a security issue and
report it (see [SECURITY.md](../SECURITY.md)). This is exactly the kind of discrepancy this
manifest exists to make visible.

*This documentation was generated with Claude (Anthropic) and is maintained by VD171. Corrections and improvements are welcome - see [CONTRIBUTING.md](../CONTRIBUTING.md).*
