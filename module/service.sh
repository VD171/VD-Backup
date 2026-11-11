#!/system/bin/sh
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

d="${0%/*}"; [ "$d" = "$0" ] && d="."; MODDIR="$(cd "$d" 2>/dev/null && pwd || echo "$d")"
STATE_DIR=/data/adb/vdbackup
LOGS="$STATE_DIR/logs"
LOOPPID="$LOGS/scheduler.loop.pid"
INTERVAL=900

# wait for boot to complete before touching the framework
until [ "$(getprop sys.boot_completed)" = "1" ]; do sleep 2; done
sleep 5

mkdir -p "$LOGS"

# self-heal backup-folder perms every boot (independent of the scheduler), so
# folders stay openable by a file manager under /sdcard/VDBackup.
"$MODDIR/scripts/helper.sh" sanitize >/dev/null 2>&1

# keep the state dir bounded: prune long-finished op logs, cap the audit trail, evict
# stale icons (never touches config/jobs/dests/creds/keys or the backups).
"$MODDIR/scripts/helper.sh" log-prune >/dev/null 2>&1

# honour the skip flag
[ -f "$MODDIR/.scheduler.skip" ] && exit 0

# single-instance guard: bail out if a scheduler loop is already alive
if [ -f "$LOOPPID" ] && kill -0 "$(cat "$LOOPPID" 2>/dev/null)" 2>/dev/null; then exit 0; fi

# recurring, detached heartbeat (survives boot, never blocks it): the loop
# records its own pid for the guard, then runs scheduler-tick every INTERVAL.
setsid nohup sh -c '
  echo "$$" > "$1"
  while :; do
    "$2" scheduler-tick >/dev/null 2>&1
    sleep "$3"
  done
' sh "$LOOPPID" "$MODDIR/scripts/helper.sh" "$INTERVAL" >/dev/null 2>&1 &

exit 0
