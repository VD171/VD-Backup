#!/system/bin/sh
# ======================================================================
#  VD BACKUP  ::  root backup & restore, no grant prompt
#  Telegram Storage shell wrapper (invokes native telegram-vdb binary)
#
#  Copyright (C) 2026  VD171
#  SPDX-License-Identifier: AGPL-3.0-or-later
# ======================================================================

set -eu

d="${0%/*}"; [ "$d" = "$0" ] && d="."; MODDIR="$(cd "$d/.." 2>/dev/null && pwd || echo "${d%/*}")"
STATE=/data/adb/vdbackup

abi="$(getprop ro.product.cpu.abi 2>/dev/null || uname -m 2>/dev/null || echo arm64-v8a)"
case "$abi" in
  arm64*|aarch64*) BINABI=arm64-v8a ;;
  arm*|armeabi*)   BINABI=armeabi-v7a ;;
  x86_64*|amd64*)  BINABI=x86_64 ;;
  i*86|x86*)       BINABI=x86 ;;
  *)               BINABI=arm64-v8a ;;
esac

BIN="$MODDIR/bin/$BINABI"
CLOUD="$STATE/bin"
export VDBACKUP_STATE="$STATE"
export PATH="$BIN:$CLOUD:$PATH"

if [ -x "$BIN/telegram-vdb" ]; then
  EXEC="$BIN/telegram-vdb"
elif [ -x "$CLOUD/telegram-vdb" ]; then
  EXEC="$CLOUD/telegram-vdb"
elif command -v telegram-vdb >/dev/null 2>&1; then
  EXEC="$(command -v telegram-vdb)"
else
  printf '{"ok":false,"code":"ERR_NO_BIN","message":"telegram-vdb binary not found for %s"}\n' "$BINABI"
  exit 1
fi

verb="${1:-}"
case "$verb" in
  upload)
    shift
    if [ "$#" -ge 2 ] && [ "${1#--}" = "$1" ] && [ "${1#-dest}" = "$1" ]; then
      dest="$1"; dir="$2"; opid="${3:-}"
      set -- upload --dest "$dest" --dir "$dir" --opid "$opid"
    else
      set -- upload "$@"
    fi ;;
  download)
    shift
    if [ "$#" -ge 3 ] && [ "${1#--}" = "$1" ] && [ "${1#-dest}" = "$1" ]; then
      dest="$1"; ref="$2"; out="$3"; opid="${4:-}"
      set -- download --dest "$dest" --ref "$ref" --out "$out" --opid "$opid"
    else
      set -- download "$@"
    fi ;;
  list-remote|list-backups)
    shift
    if [ "$#" -ge 1 ] && [ "${1#--}" = "$1" ] && [ "${1#-dest}" = "$1" ]; then
      dest="$1"
      set -- list-remote --dest "$dest"
    else
      set -- list-remote "$@"
    fi ;;
esac

exec "$EXEC" "$@"
