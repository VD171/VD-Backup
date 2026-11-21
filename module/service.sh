#!/system/bin/sh
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

d="${0%/*}"; [ "$d" = "$0" ] && d="."; MODDIR="$(cd "$d" 2>/dev/null && pwd || echo "$d")"
STATE_DIR=/data/adb/vdbackup
LOGS="$STATE_DIR/logs"
LOOPPID="$LOGS/scheduler.loop.pid"
LOOPBOOT="$LOGS/scheduler.loop.boot"
BOOTID="$(cat /proc/sys/kernel/random/boot_id 2>/dev/null)"
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

# issue #5: reap backup leftovers from an uncatchable kill (watchdog/LMK) - boot-only, so it
# never races a running backup. The in-process EXIT trap covers every catchable failure/cancel.
"$MODDIR/scripts/helper.sh" boot-sweep >/dev/null 2>&1

# honour the skip flag
[ -f "$MODDIR/.scheduler.skip" ] && exit 0

# single-instance guard: bail out if a scheduler loop is already alive. The pid file survives a
# reboot and Android reuses pids quickly, so a bare kill -0 can match an unrelated process and make
# this script exit before the scheduler and the VDLU boot update; only trust a pid recorded in the
# current boot (boot_id).
if [ -f "$LOOPPID" ] && [ "$(cat "$LOOPBOOT" 2>/dev/null)" = "$BOOTID" ] && kill -0 "$(cat "$LOOPPID" 2>/dev/null)" 2>/dev/null; then exit 0; fi

# recurring, detached heartbeat (survives boot, never blocks it): the loop
# records its own pid for the guard, then runs scheduler-tick every INTERVAL.
echo "$BOOTID" > "$LOOPBOOT"
setsid nohup sh -c '
  echo "$$" > "$1"
  while :; do
    "$2" scheduler-tick >/dev/null 2>&1
    sleep "$3"
  done
' sh "$LOOPPID" "$MODDIR/scripts/helper.sh" "$INTERVAL" >/dev/null 2>&1 &

# VDLU flashless update on boot (opt-in, detached, no-op without a reachable feed).
# VDBackup is self-contained (no Zygisk .so, no system overlay, no real sepolicy rule), so
# the update applies live with nothing to swap and needs no pre-zygote window; late_start is
# fine. Fail-safe: seed the config if missing, bail unless auto_on_reboot=1, run detached so a
# slow or unreachable source never blocks boot. The engine reaches its bundled curl/zstd via
# the per-ABI bin dir; an unpublished or 404 feed just makes the engine a no-op.
VDLU_DIR="$STATE_DIR/vdlu"
if [ -f "$MODDIR/vdlu/update.sh" ]; then
  if [ ! -f "$VDLU_DIR/config" ] && [ -f "$MODDIR/vdlu/config.default" ]; then
    mkdir -p "$VDLU_DIR"; cp -f "$MODDIR/vdlu/config.default" "$VDLU_DIR/config"; chmod 600 "$VDLU_DIR/config"
  fi
  if grep -q '^auto_on_reboot=1' "$VDLU_DIR/config" 2>/dev/null; then
    case "$(getprop ro.product.cpu.abi)" in
      arm64-v8a) VBINABI=arm64-v8a ;; armeabi-v7a) VBINABI=armeabi-v7a ;;
      x86_64) VBINABI=x86_64 ;; x86) VBINABI=x86 ;; *) VBINABI=arm64-v8a ;;
    esac
    setsid nohup sh -c '
      BA="$3"
      export PATH="$1/bin/$BA:/system/bin:/system/xbin:$PATH"
      export LD_LIBRARY_PATH="$1/bin/$BA/lib:${LD_LIBRARY_PATH:-}"
      export VDLU_DIR="$2" MODULE_DIR="$1" MODID=vdbackup
      sh "$1/vdlu/update.sh" boot
    ' sh "$MODDIR" "$VDLU_DIR" "$VBINABI" >>"$VDLU_DIR/boot.log" 2>&1 &
  fi
fi

exit 0
