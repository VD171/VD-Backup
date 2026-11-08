#!/system/bin/sh
# ======================================================================
#  VD BACKUP  ::  root backup & restore, no grant prompt
#  Telegram Storage shell wrapper (invokes Telegram MTProto engine)
#
#  Copyright (C) 2026  VD171
#  SPDX-License-Identifier: AGPL-3.0-or-later
# ======================================================================

set -u

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
export LD_LIBRARY_PATH="$BIN/lib:$CLOUD/lib:${LD_LIBRARY_PATH:-}"

find_python() {
  if [ -x "$BIN/python3" ]; then echo "$BIN/python3"; return; fi
  if [ -x "$STATE/bin/python3" ]; then echo "$STATE/bin/python3"; return; fi
  if command -v python3 >/dev/null 2>&1; then command -v python3; return; fi
  for p in /data/user/0/com.agy/files/usr/bin/python3 \
           /data/data/com.termux/files/usr/bin/python3 \
           /data/adb/modules/*/system/bin/python3 \
           /data/adb/modules/*/bin/python3 \
           /system/bin/python3 \
           /system/xbin/python3; do
    if [ -x "$p" ]; then echo "$p"; return; fi
  done
  echo "python3"
}
PYTHON="$(find_python)"
if [ -x "$PYTHON" ]; then
  p_dir="${PYTHON%/*}"
  p_lib="${p_dir%/*}/lib"
  [ -d "$p_lib" ] && export LD_LIBRARY_PATH="$p_lib:${LD_LIBRARY_PATH:-}"
fi
CLI="$MODDIR/scripts/telegram_cli.py"

export PYTHONPATH="$MODDIR/scripts/lib:${PYTHONPATH:-}"

case "${1:-}" in
  send-code)
    shift; "$PYTHON" "$CLI" send-code --phone "${1:-}" ;;
  sign-in)
    shift; phone="${1:-}"; code="${2:-}"; pw="${3:-}"
    if [ -n "$pw" ] && [ "$pw" != null ]; then
      "$PYTHON" "$CLI" sign-in --phone "$phone" --code "$code" --password "$pw"
    else
      "$PYTHON" "$CLI" sign-in --phone "$phone" --code "$code"
    fi ;;
  init-storage)
    shift; title="${1:-}"
    if [ -n "$title" ] && [ "$title" != null ]; then
      "$PYTHON" "$CLI" init-storage --title "$title"
    else
      "$PYTHON" "$CLI" init-storage
    fi ;;
  check-auth|status)
    "$PYTHON" "$CLI" check-auth ;;
  upload)
    shift; dest="${1:-}"; dir="${2:-}"; opid="${3:-}"
    "$PYTHON" "$CLI" upload --dest "$dest" --dir "$dir" ${opid:+--opid "$opid"} ;;
  list-remote)
    shift; dest="${1:-}"
    "$PYTHON" "$CLI" list-backups --dest "$dest" ;;
  download)
    shift; dest="${1:-}"; ref="${2:-}"; out="${3:-}"; opid="${4:-}"
    "$PYTHON" "$CLI" download --dest "$dest" --ref "$ref" --out "$out" ${opid:+--opid "$opid"} ;;
  logout)
    "$PYTHON" "$CLI" logout
    rm -f "$STATE/dests/telegram.json" "$STATE/staging/tg_auth.json" "$STATE/telegram_index.json" "$STATE/creds/session"* 2>/dev/null ;;
  *)
    printf '{"ok":false,"code":"ERR_UNKNOWN_VERB","message":"Unknown verb for telegram.sh"}\n' ;;
esac
