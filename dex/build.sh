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
#  XDA-Thread     : https://xdaforums.com/t/VD-Backup.4807267/
#  Telegram       : @VD_Priv8 https://t.me/VD_Priv8
#  Telegram       : @Priv8_VD https://t.me/Priv8_VD
#  Discord        : @VD.Priv8 https://discord.com/users/1296831918989639721
#  E-mail         : vd.priv8@pm.me
# ======================================================================
#
#  Build the framework helper dex (javac + d8). Arch-independent: one
#  vdbhelper.dex serves every ABI. Output -> module/vdbhelper.dex.
#  Requires an Android SDK (platform android.jar + build-tools/d8) and a JDK.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SDK="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Android/Sdk}}"
AJ="$(ls -d "$SDK"/platforms/android-*/android.jar 2>/dev/null | sort -V | tail -1)"
D8="$(ls -d "$SDK"/build-tools/*/d8 2>/dev/null | sort -V | tail -1)"
[ -f "$AJ" ] || { echo "android.jar not found under $SDK/platforms" >&2; exit 1; }
[ -x "$D8" ] || { echo "d8 not found under $SDK/build-tools" >&2; exit 1; }

OUT="$ROOT/dex/out"; rm -rf "$OUT"; mkdir -p "$OUT"
# shellcheck disable=SC2046
javac --release 11 -cp "$AJ" -d "$OUT" $(find "$ROOT/dex/src" -name '*.java')
# shellcheck disable=SC2046
"$D8" --min-api 26 --lib "$AJ" --output "$ROOT/dex" $(find "$OUT" -name '*.class')
mv "$ROOT/dex/classes.dex" "$ROOT/module/vdbhelper.dex"
rm -rf "$OUT"
echo "built module/vdbhelper.dex ($(wc -c < "$ROOT/module/vdbhelper.dex") bytes)"
