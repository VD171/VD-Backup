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

SKIPUNZIP=0
STATE_DIR=/data/adb/vdbackup

ui_print ""
ui_print "  VD BACKUP  -  root backup & restore"
ui_print "  https://github.com/VD171/VD-Backup"
ui_print ""

# --- environment guards -------------------------------------------------
if [ "$BOOTMODE" != "true" ]; then
  ui_print "! Install from KernelSU / APatch / Magisk manager (not recovery)."
  abort   "! Aborting."
fi

API="$(getprop ro.build.version.sdk)"
if [ "$API" -lt 26 ]; then
  ui_print "! Android 8.0 (API 26) or newer is required (found API $API)."
  abort   "! Aborting."
fi

case "$ARCH" in
  arm64) ABIDIR=arm64-v8a ;;
  arm)   ABIDIR=armeabi-v7a ;;
  x86)   ABIDIR=x86 ;;
  x64)   ABIDIR=x86_64 ;;
  *) ui_print "! Unsupported architecture: $ARCH" ; abort "! Aborting." ;;
esac
ui_print "- Architecture: $ARCH ($ABIDIR)"

# --- keep only this device's ABI (frees ~470M of unused binaries) -------
if [ -d "$MODPATH/bin" ]; then
  for d in "$MODPATH"/bin/*/; do
    [ -d "$d" ] || continue
    [ "$(basename "$d")" = "$ABIDIR" ] || rm -rf "$d"
  done
  ui_print "- Keeping binaries for $ABIDIR only"
fi

# --- seed persistent state (only if absent) -----------------------------
if [ ! -f "$STATE_DIR/config.json" ]; then
  ui_print "- Seeding default configuration"
  mkdir -p "$STATE_DIR" "$STATE_DIR/jobs" "$STATE_DIR/dests" "$STATE_DIR/creds" \
           "$STATE_DIR/keys" "$STATE_DIR/logs" "$STATE_DIR/staging" "$STATE_DIR/backups"
  cat > "$STATE_DIR/config.json" <<'EOF'
{
  "format_version": 1,
  "default_mode": "full",
  "compression": "zstd:10",
  "encrypt_data": false,
  "encrypt_apk": false,
  "preserve": { "selinux": true, "uid_gid": true, "xattr": true, "caps": true, "modes": true },
  "default_dest": "local",
  "network_policy": "any",
  "include_cache": false,
  "auto_backup": false,
  "auto_backup_keep": 5,
  "blocklist": [],
  "spoof_installer": true,
  "spoof_installer_pkg": "com.android.vending",
  "language": "auto"
}
EOF
  chmod 600 "$STATE_DIR/config.json"
else
  ui_print "- Keeping existing configuration"
fi
chmod 700 "$STATE_DIR"

# --- permissions --------------------------------------------------------
ui_print "- Setting permissions"
set_perm_recursive "$MODPATH" 0 0 0755 0644
set_perm_recursive "$MODPATH/bin" 0 0 0755 0755
set_perm "$MODPATH/scripts/helper.sh" 0 0 0755
set_perm "$MODPATH/scripts/worker.sh" 0 0 0755
set_perm "$MODPATH/service.sh" 0 0 0755
[ -f "$MODPATH/uninstall.sh" ] && set_perm "$MODPATH/uninstall.sh" 0 0 0755

# --- ready without a reboot --------------------------------------------
# VDBackup is self-contained (WebUI + helper + bundled binaries live under the
# module dir); it needs no magic mount, Zygisk or sepolicy. Managers stage modules
# under modules_update/ and only activate them on reboot - but since we have nothing
# to mount, copy ourselves into the active modules/ dir so the WebUI works NOW.
MID="${MODID:-vdbackup}"
ACTIVE="/data/adb/modules/$MID"
if [ "$BOOTMODE" = "true" ] && [ "$MODPATH" != "$ACTIVE" ]; then
  ui_print "- Activating without reboot"
  mkdir -p "$ACTIVE"
  cp -afT "$MODPATH" "$ACTIVE" 2>/dev/null || cp -af "$MODPATH"/. "$ACTIVE"/ 2>/dev/null
  chmod 0755 "$ACTIVE"/*.sh "$ACTIVE"/scripts/*.sh "$ACTIVE"/bin/*/* 2>/dev/null
  # the manager writes an "update" marker AFTER customize.sh returns; clear it (and
  # kick the scheduler) from a detached job so the module shows as active, not pending.
  setsid sh -c "sleep 4; rm -f '$ACTIVE/update' '$ACTIVE/remove' '$ACTIVE/disable'; '$ACTIVE/scripts/helper.sh' sanitize; '$ACTIVE/scripts/helper.sh' scheduler-tick" >/dev/null 2>&1 &
else
  # reboot-flashed (no reboot-free activation): heal existing backup perms now.
  "$MODPATH/scripts/helper.sh" sanitize >/dev/null 2>&1
fi

ui_print ""
ui_print "- Ready to use NOW - no reboot needed."
ui_print "  Open the VDBackup WebUI from your root manager to run backups."
ui_print ""
