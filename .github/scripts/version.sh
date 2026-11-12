#!/usr/bin/env bash
# ======================================================================
#  VD BACKUP  ::  root backup & restore, no grant prompt
#  Full app/data backup & restore as root - KernelSU/APatch/Magisk WebUI.
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
#  VDBackup version scheme (owner-defined):
#     versionName  = v<major>.<counter>[.<patch>]   e.g. v1.0, v1.01, v1.01.1, v1.02, v2.0
#     versionCode  = major*10000 + counter*100 + patch
#                    v1.0=10000, v1.01=10100, v1.01.1=10101, v1.01.10=10110, v1.02=10200, v2.0=20000
#  The .patch level is for the scheduled binary refresh (fresh upstream tools) between
#  feature releases; a feature release bumps the counter and resets patch to 0.
#
#  Usage: version.sh read | bump | major | patch
#    read   print current version/versionCode
#    bump   counter + 1, patch -> 0 (rolls over to the next major at 100)
#    major  major + 1, counter and patch -> 0
#    patch  patch + 1 (binary-refresh bump: v1.01 -> v1.01.1 -> v1.01.2 ...)
#
#  Rewrites module/module.prop and module/update.json.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PROP="$ROOT/module/module.prop"
UJSON="$ROOT/module/update.json"
REPO="VD171/VD-Backup"

cur_name="${cur_name:-$(sed -n 's/^version=//p' "$PROP")}"
rest="${cur_name#v}"                      # major.counter[.patch]
major="${rest%%.*}"                       # major
rest="${rest#*.}"                         # counter[.patch]
counter="${rest%%.*}"                     # counter
case "$rest" in *.*) patch="${rest#*.}" ;; *) patch=0 ;; esac
major="$((10#$major))"; counter="$((10#$counter))"; patch="$((10#$patch))"

fmt() {  # fmt <major> <counter> <patch>
  if [ "$2" -eq 0 ]; then set -- "$1" "0.0" "$3"; _base="v$1.0"; else _base="$(printf 'v%s.%02d' "$1" "$2")"; fi
  if [ "$3" -gt 0 ]; then printf '%s.%d' "$_base" "$3"; else printf '%s' "$_base"; fi
}
code() { printf '%d' "$(( $1*10000 + $2*100 + $3 ))"; }

case "${1:-read}" in
  read)  echo "version=$(fmt "$major" "$counter" "$patch") versionCode=$(code "$major" "$counter" "$patch")"; exit 0 ;;
  bump)  counter=$((counter+1)); patch=0; if [ "$counter" -ge 100 ]; then major=$((major+1)); counter=0; fi ;;
  major) major=$((major+1)); counter=0; patch=0 ;;
  patch) patch=$((patch+1)) ;;
  *) echo "usage: version.sh read|bump|major|patch" >&2; exit 2 ;;
esac

NAME="$(fmt "$major" "$counter" "$patch")"
CODE="$(code "$major" "$counter" "$patch")"
ZIP="VD-Backup-${NAME}.zip"

sed -i "s/^version=.*/version=${NAME}/"       "$PROP"
sed -i "s/^versionCode=.*/versionCode=${CODE}/" "$PROP"

# update manifest. size/sha256/notes are filled by the release workflow once the
# universal-full zip exists (version.sh runs before the build); the in-app
# update-check verb reads these so the WebUI can show what a new version brings.
cat > "$UJSON" <<EOF
{
  "version": "${NAME}",
  "versionCode": ${CODE},
  "zipUrl": "https://github.com/${REPO}/releases/download/${NAME}/VD-Backup-${NAME}-universal-full.zip",
  "changelog": "https://raw.githubusercontent.com/${REPO}/main/CHANGELOG.md",
  "notes": "",
  "size": 0,
  "sha256": ""
}
EOF

echo "version=${NAME} versionCode=${CODE} zip=${ZIP}"
