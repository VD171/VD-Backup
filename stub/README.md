# VD-Backup MMRL stub

The MMRL client app refuses to install a module whose zip is over ~50 MB. Every v1.11 VD-Backup
variant is larger than that (universal-lite is 62 MB, the smallest per-ABI is 56 MB), so MMRL
users cannot install VD-Backup directly.

The **stub** solves this permanently. It is a minimal module - just the [VDLiveUpdate](https://github.com/VD171/VDLiveUpdate) (VDLU) flashless updater
engine, a static `curl`, the signature verifier and the install scaffolding - that fits well under
the 50 MB cap (a few MB). It installs as `vdbackup`, and on the first boot its `service.sh` runs
the VDLU engine, which fetches the full module from the signed feed and applies it in place,
flashless. After that the module is the real VD-Backup and its own `service.sh` takes over.

Because the real payload never travels in the zip, the stub stays tiny no matter how large the
module grows - the MMRL size cap is decoupled from the module size for good.

## What ships in the stub

Assembled by CI (`Assemble release zips` -> the `mmrl-stub` target):

- `module.prop` (the real v1.11 id/version, so the manager shows it correctly)
- `vdlu/` (the engine, config.default, keyring, per-ABI ed25519-mini verifier) - reused as-is
- `vdlu/baseline.json` - a **from:0** baseline (`version:0, files:[]`). Critical: without it the
  engine reads the stub's `module.prop` (the real v1.11 versionCode) as the current version,
  decides it is already up to date, and never fetches. The from:0 baseline makes it see nothing
  installed and pull the whole tree. (Validated on-device; not signature-checked - copied straight
  to `current.json`.)
- `bin/<abi>/curl` (+ its `lib/`) - the only bundled binary, so the engine can fetch
- `customize.sh`, `service.sh` (the stub-specific minimal versions here)
- `META-INF/` (the installer)

`customize.sh` prunes `bin/` and `vdlu/verify/` to the device ABI (like the full module) and seeds
the VDLU config. `service.sh` waits for boot, then triggers `vdlu/update.sh boot` detached.

## Feed

v1 points at the existing universal-full feed (`vdlu/config.default` unchanged), so the first-boot
fetch pulls the universal-full tree (~245 MB). **Optimization (future):** publish a lite (or
per-ABI) feed manifest and point the stub's config at it, so the first-boot fetch is ~62 MB (lite)
or ~the device ABI only. Tracked in the backlog; the stub mechanism does not change, only the
`source=` line in its `config.default`.

## Deploy

1. CI builds `VD-Backup-<ver>-mmrl-stub.zip` as a release asset.
2. VD-Modules `modules.json` / the MMRL track points `vdbackup` at the stub zip (it is < 50 MB, so
   the MMRL client installs it) instead of the universal-lite.
3. The signed VDLU feed must be live (it already is) so the first-boot fetch succeeds.

## e2e validation

**Validated on-device (arm64, edge, 2026-11-18):** the arm64 stub (15 MB) was installed as the
module; on the boot trigger the engine fetched the manifest, verified the ed25519 signature
(`canon 355e4f21`), fetched all 272 files from the signed feed (from:0), and applied them in place
- the module dir filled with the full tree (webroot + scripts + bin, 678 MB, versionCode 11100)
with no second flash. `reboot_pending` is set for the shared `.so`s (a reboot finalizes those).
The from:0 baseline was the one fix needed (see above).

**Live:** the CI builds the universal `mmrl-stub.zip` (every ABI's `curl` + the VDLU engine, asserted
< 50 MB), `update-mmrl.json` points at it, and the VD-Modules `vdbackup` track serves it (~25 MB, well
under the 50 MB cap - the original >50 MB pain is gone). Remaining optional optimization: a lite or
per-ABI feed so the first-boot fetch is not the full ~245 MB universal-full tree.
