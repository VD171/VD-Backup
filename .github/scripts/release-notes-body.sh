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
#  Print the GitHub release-notes body for a version: the CHANGELOG section
#  for that version, then the @Priv8_VD channel banner as the last line. The
#  body stays lean by design (owner, 28/11) - no contacts, no see also, no
#  downloads legend and no checksums block (per-file .sha256 companions inside
#  each zip are the integrity gate; the body is just the changelog + banner).
#  The same generator feeds the release step and the notes-refresh workflow,
#  so a build and a later refresh of the same version emit identical notes.
#
#  Usage: release-notes-body.sh <version>   (a "## <version>" section in CHANGELOG.md)
set -eu

VER=${1:?usage: release-notes-body.sh <version>}
[ -f CHANGELOG.md ] || { echo "release-notes-body: CHANGELOG.md not found (run from repo root)" >&2; exit 2; }

# CHANGELOG section for this version, verbatim (same extractor as COPG-VD.yml).
notes=$(awk -v v="## $VER" '$0==v{f=1;next} f&&/^## /{exit} f{print}' CHANGELOG.md | sed -e '1{/^$/d}')
if [ -z "$(printf '%s' "$notes" | tr -d '[:space:]')" ]; then
	notes="See the commit history for the changes in this version."
fi

cat <<EOF
$notes

---
📣 **Join the channel for updates:** @Priv8_VD https://t.me/Priv8_VD
EOF
