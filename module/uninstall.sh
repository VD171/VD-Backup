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

# Keep the user's data: config, jobs, destinations and the audit trail (under /data/adb),
# the credentials, age keypair and rclone config (under credential-encrypted
# /data/misc_ce/0/vdbackup) and the backups themselves are NOT removed on uninstall, so a
# reinstall finds the same setup. The CE secrets are left untouched on purpose (permanent).
# Remove only transient runtime state (staging, per-op logs, icon cache).
STATE_DIR=/data/adb/vdbackup
# stop the detached scheduler heartbeat first, so it does not keep spinning every 900s
# against a helper.sh that uninstall is about to remove (harmless but noisy until reboot).
_lp="$(cat "$STATE_DIR/logs/scheduler.loop.pid" 2>/dev/null)"
# only signal the pid when it was recorded in this boot (scheduler.loop.boot == boot_id): the pid file
# survives a reboot and Android reuses pids, so a stale pid could belong to an unrelated process.
_lb="$(cat "$STATE_DIR/logs/scheduler.loop.boot" 2>/dev/null)"
_bid="$(cat /proc/sys/kernel/random/boot_id 2>/dev/null)"
case "$_lp" in ''|*[!0-9]*) : ;; *) [ "$_lb" = "$_bid" ] && kill "$_lp" 2>/dev/null ;; esac
rm -rf "$STATE_DIR/staging" "$STATE_DIR/iconcache" 2>/dev/null
rm -f "$STATE_DIR/logs"/*.pid "$STATE_DIR/logs"/scheduler.loop.boot "$STATE_DIR/logs"/*.out "$STATE_DIR/logs"/progress-*.json 2>/dev/null
exit 0
