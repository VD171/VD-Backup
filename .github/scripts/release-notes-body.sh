#!/usr/bin/env sh
# ======================================================================
#  VD BACKUP  ::  root backup & restore, no grant prompt
#  Full app/data backup & restore as root: KernelSU/APatch/Magisk WebUI.
#
#  Copyright (C) 2026  VD171
#  SPDX-License-Identifier: AGPL-3.0-or-later
#
#  Free software under the GNU AGPL v3 or later. NETWORK COPYLEFT: run a
#  modified version, even as a service, and you MUST offer its source.
#
#  Site           : https://vd171.ru
#  Site           : https://vd.priv8.ru
#  Source         : https://github.com/VD171/VD-Backup
#  GitHub         : @VD171 https://github.com/VD171
#  XDA-Developers : @VD171 https://xdaforums.com/m/vd171.4699873/
#  XDA thread     : https://xdaforums.com/t/VD-Backup.4807267/
#  Telegram       : @VD_Priv8 https://t.me/VD_Priv8
#  Channel        : @Priv8_VD https://t.me/Priv8_VD
#  Discord        : @VD.Priv8 https://discord.com/users/1296831918989639721
#  E-mail         : vd.priv8@pm.me
# ======================================================================
#
#  Print the canonical GitHub release-notes body for a version from the
#  CHANGELOG plus a prebuilt SHA256SUMS.txt, so the release step and the
#  notes-refresh workflow emit byte-identical text (STANDARDS 22; mirrors
#  the COPG-VD release body that passes).
#
# Usage: release-notes-body.sh <version> <sha256sums-file>
#   <version>         release tag, e.g. v1.19 (a "## <version>" section in CHANGELOG.md)
#   <sha256sums-file>  the full SHA256SUMS.txt (one "<sha256>  <name>" line per shipped
#                      file: the published .zip/.tar.zst assets plus every bin/<abi>/*).
#
# The body order is fixed (STANDARDS 22, COPG-proven subset): CHANGELOG section ->
# Downloads and install -> Checksums (the download assets inline, the per-binary list
# referenced in the attached SHA256SUMS.txt) -> See also -> the @Priv8_VD footer as the
# byte-exact last line. The full contact chain lives in source headers, not the release
# body, which carries only the channel footer (matches the COPG-VD release that passes).
set -eu

VER=${1:?usage: release-notes-body.sh <version> <sha256sums-file>}
SUMS=${2:?usage: release-notes-body.sh <version> <sha256sums-file>}
[ -f CHANGELOG.md ] || { echo "release-notes-body: CHANGELOG.md not found (run from repo root)" >&2; exit 2; }
[ -f "$SUMS" ] || { echo "release-notes-body: no such SHA256SUMS file: $SUMS" >&2; exit 2; }

# CHANGELOG section for this version, verbatim (same extractor as COPG-VD.yml).
notes=$(awk -v v="## $VER" '$0==v{f=1;next} f&&/^## /{exit} f{print}' CHANGELOG.md | sed -e '1{/^$/d}')
if [ -z "$(printf '%s' "$notes" | tr -d '[:space:]')" ]; then
	notes="See the commit history for the changes in this version."
fi

# The download assets (.zip + .tar.zst) go inline; the per-binary lines stay in the
# attached SHA256SUMS.txt so the body stays short (release_sha_zip_binarios_only: never a
# per-file listing of the zip contents in the body).
assets=$(grep -E '\.(zip|tar\.zst)$' "$SUMS" | sort -k2)

cat <<EOF
$notes

### Downloads and install

- \`VD-Backup-$VER-universal-full.zip\` - every architecture, every binary (incl. rclone for cloud providers and restic for snapshots). Works on any device.
- \`VD-Backup-$VER-universal-lite.zip\` - every architecture, without the two largest binaries (rclone, restic). Smallest; local, SSH/SFTP and rsync backups.
- \`VD-Backup-$VER-<abi>-full.zip\` - a single architecture, every binary (smaller than universal-full).

full = every binary, including rclone (cloud providers) and restic (snapshots).
lite = without the two largest binaries (rclone, restic); it fetches them on demand (verified by SHA-256) the first time you use a cloud or snapshot feature. Local, SSH/SFTP and rsync work without any download.
universal = every architecture; per-ABI = pick your device (arm64-v8a, armeabi-v7a, x86, x86_64).

The \`assets-<abi>.tar.zst\` files are the on-demand rclone+restic addons the lite edition downloads on first cloud use; they are not flashable builds, do not flash them.

Flash \`VD-Backup-$VER-universal-full.zip\` in the KernelSU / APatch / Magisk manager (or \`ksud module install\` / \`apd module install\`), then reboot. The installer keeps only your device's ABI and runs the mandatory \`.sha256\` integrity gate.

Also available in MMRL from the VD-Modules repository, with flashless incremental self-update (VDLiveUpdate) once installed.

### Checksums (sha256)

The published assets:

\`\`\`
$assets
\`\`\`

Every shipped binary (\`bin/<abi>/*\`) is listed in the attached \`SHA256SUMS.txt\`, and each zip carries a \`.sha256\` companion next to every file that the on-device install gate verifies.

### See also

- [COPG-VD](https://github.com/VD171/COPG-VD)
- [VD-dropbear](https://github.com/VD171/VD-dropbear)
- [VD-Google](https://github.com/VD171/VD-Google)
- [VD-Installer](https://github.com/VD171/VD-Installer)
- [VD-Infos](https://github.com/VD171/VD-Infos)
- [VDLiveUpdate](https://github.com/VD171/VDLiveUpdate)
- [VD-Modules](https://github.com/VD171/VD-Modules)
- [build.prop](https://github.com/VictorGabriel7Dev/build.prop)
- [mtproto-store](https://github.com/VictorGabriel7Dev/mtproto-store)

---
📣 **Join the channel for updates:** @Priv8_VD https://t.me/Priv8_VD
EOF
