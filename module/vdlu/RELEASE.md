# VDLU release step - VD-Backup

VD-Backup carries the vendored [VDLiveUpdate](https://github.com/VD171/VDLiveUpdate) (VDLU) engine (`module/vdlu/`, profile `hardened`). Besides the usual
flashable `.zip` assets, each release also publishes a content-addressed feed (`manifest.json` + `blobs/`)
so installed devices update **flashlessly and incrementally**, fetching only the files that changed,
applying the live ones without a reboot. The `.zip` stays the first-install and fallback path, VDLU is
additive and never replaces it.

**Why this also matters: flavor-preserving updates (owner's standing concern).** A static zip update
(`update.json` for the root manager, the MMRL feed) can only point at ONE `zipUrl`, and the device sends
no ABI/flavor in the request, so it cannot serve the installed flavor: the manager ends up on
universal-full (232 MB, but it does keep the full flavor and `customize.sh` prunes the ABI), and MMRL is
forced to universal-lite by its 50 MB cap (a full install drops to lite until rclone/restic are re-fetched
on demand, not catastrophic, but not what the user picked). VDLU sidesteps all of it: it diffs the
**installed** tree (whatever ABI/flavor) against the feed and fetches only the deltas, so arm64-full stays
arm64-full and lite stays lite, no forced flavor, no 232 MB, no 50 MB cap. So "serve the matching flavor
wherever possible" is, concretely, "keep the VDLU feed live", the per-flavor zips remain first-install only.

The feed is produced by the canonical tools in `VD/Sources/VDLiveUpdate/producer/` and consumed by the
vendored engine here. The private signing key stays with the release operator, never in the repo or on a
device (`VDLiveUpdate/keys/vd-2026.pem`, gitignored), only the public key is embarked, as the RAW
32-byte `vd-2026.pub` in `module/vdlu/keyring/`. On-device signature verification uses the embedded
`ed25519-mini` (per-ABI under `module/vdlu/verify/`, pruned to the device ABI by `customize.sh`), not
openssl, blobs are gzip (`enc:"gz"`) and the manifest is `engine_min:3`. Contract:
`VDLiveUpdate/INTERFACES.md` §3/§6; architecture:
`MODULO_VDLU.md` §12/§13 (the VDLU design doc).

## Prerequisites

- `python3` and `openssl` (3.x) on the build host (the producer tools, not the device).
- The private key `VD/Sources/VDLiveUpdate/keys/vd-2026.pem`. Its public half is already embarked at
  `module/vdlu/keyring/vd-2026.pub` and its `key_id` is `vd-2026`.
- The final module tree the `.zip` ships, the same tree assembled in CI after the binaries are built and
  `README.md`/`LICENSE` are staged (`.github/workflows/VD-Backup.yml`), i.e. `module/` post-packaging. The
  feed must be packed from that exact tree so every published blob reverifies against what users flash.

## Steps (per release, after the `.zip` assets are built)

```sh
VDLU=../VDLiveUpdate                 # VD/Sources/VDLiveUpdate
OUT=./vdlu-feed                      # manifest.json + blobs/ land here
VER=10800                            # module.prop versionCode (monotonic; hardened blocks downgrade)
NAME=v1.08                           # module.prop versionName

# 0. stage the SHIPPED tree. The CI zips module/ with `-x 'bin/*/.gitkeep'`, so the feed must be
#    packed from a copy with those placeholders stripped: otherwise the manifest lists the
#    `bin/<abi>/.gitkeep` files the installed module does NOT have, and the engine sees a phantom
#    diff on them. (Verified locally: pack of module/ lists 4 `.gitkeep`; pack of the stripped tree
#    lists 0.) This is the only CI zip-exclusion for VD-Backup; everything else in module/ ships.
rm -rf _shipped && cp -a module _shipped && rm -f _shipped/bin/*/.gitkeep
TREE=_shipped                        # == exactly what every device flashes

# 1. pack the tree into a content-addressed feed (dedup; --prev computes delete[]).
#    Blobs are gzip (enc:"gz"); the manifest carries engine_min:3 (the slim engine).
"$VDLU/producer/vdlu-pack" "$TREE" "$OUT" vdbackup "$VER" --version-name "$NAME" --channel stable \
    [--prev ./prev-feed/manifest.json]

# 2. sign the manifest in place (ed25519; key_id must match the embarked pubkey).
"$VDLU/producer/vdlu-sign" "$OUT/manifest.json" "$VDLU/keys/vd-2026.pem" vd-2026

# The install "from:0" seed (vdlu/baseline.json) is NOT produced here. The github CI already stamps a
# keyless, per-variant baseline into every .zip (.github/workflows/VD-Backup.yml -> seed_baseline),
# so a fresh install is born "current" without the private key ever touching CI. Nothing to copy.
```

> **Baseline is automatic and keyless, no open decision.** Each `.zip` already ships `vdlu/baseline.json`,
> the content-addressed manifest of exactly what *that* variant installs (universal-full, lite without
> rclone/restic, or a single ABI), stamped by the CI with the vendored keyless `vdlu-pack`
> (`.github/scripts/vdlu-pack`, hash + gzip only, never signs). The engine seeds its local `current.json`
> from it: it is trusted install-local state (it rode in the flashed zip), not a fetched blob, so it is
> never signature-verified, only the FETCHED feed manifest is (`vdlu-verify`). So the private key stays
> entirely off the CI and signs only the feed above. `baseline.json` is per-release and gitignored, the CI
> regenerates it every build, matching each variant's installed tree, so the first self-update per install
> is an incremental diff instead of a from:0 full re-fetch.

- `module` is `id=vdbackup`, so the `vdlu-pack` module id is `vdbackup`, the feed is published under the
  `source` the config seeds (`https://vd171.github.io/VD-Modules/VD-Backup`), a path that keeps the repo
  name. `version` is the numeric `versionCode`, the engine compares it monotonically and, under
  `profile=hardened`, refuses a manifest older than the installed one.
- VD-Backup packs a single feed from the universal tree, the per-ABI pruning that produces the `-full` /
  `-lite` `.zip` variants does not fork the feed. The `bin/<abi>/` the live device keeps is already on
  disk, so unchanged binaries are never refetched (content-addressed dedup), and no blob is `reboot`-class
  (VD-Backup is self-contained: no `zygisk/`, no `system/`, no real `sepolicy.rule`), so every update
  applies live.

## Retention (prune orphan blobs)

Blobs are content-addressed and immutable: the packer dedups by sha256 and only ever ADDS, so `blobs/`
grows every release. Keep the feed (and the Pages site) small with `vdlu-gc`, which removes blobs that NO
retained manifest references. Archive each signed manifest first so the GC has version history, then prune
(dry-run by default, `--apply` to delete):

```sh
FEED=<the feed dir produced above>              # manifest.json + blobs/
VDLU=../../VDLiveUpdate                          # canonical producer
mkdir -p "$FEED/manifests"
cp "$FEED/manifest.json" "$FEED/manifests/<versionCode>.json"   # archive the SIGNED manifest
"$VDLU/producer/vdlu-gc" "$FEED" --keep-last 3                  # dry-run: lists orphans
"$VDLU/producer/vdlu-gc" "$FEED" --keep-last 3 --apply          # delete them
```

Retention is by REFERENCE, not age: GC keeps the union of sha256 over the current manifest plus the last 3
archived versions, and never removes a blob a retained release still needs (fail-safe: it refuses to run
with no retained manifest). Deleting a blob frees the Pages site but not git history, keep the public feed
on a dedicated, squashable/orphan branch, blobs are reproducible from the tagged commit by `vdlu-pack`, so
resetting the feed branch loses nothing.

## Publish

Push `vdlu-feed/{manifest.json,blobs/}` to the Pages tree of `VD-Modules` under `VD-Backup/`, in one
spaced batch (never file-by-file live, the GitHub write rules, `MODULO_VDLU.md` §2/§13). Keep the
previous release's feed around to pass as `--prev` next time so `delete[]` prunes removed paths.

## Key rotation

Add the new `vd-<year>.pub` to `module/vdlu/keyring/` **alongside** the old one and sign with the new
`key_id`, the engine accepts any pubkey in the keyring whose id matches the manifest's `key_id`, so a
rotated key never bricks an older install. Drop a retired pubkey only once no reachable device still runs
a manifest signed by it.

---
generated with Claude
