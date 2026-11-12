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

# --- one-time migration (old layout) -----------------------------------
# Backups used to live under $STATE_DIR/backups; the engine now writes to
# /data/media/<user>/VDBackup. Move any leftovers there and drop the old dir.
OLD_BK="$STATE_DIR/backups"
if [ -d "$OLD_BK" ]; then
  if [ -n "$(ls -A "$OLD_BK" 2>/dev/null)" ]; then
    ui_print "- Migrating old backups to /data/media/0/VDBackup"
    mkdir -p /data/media/0/VDBackup
    cp -a "$OLD_BK"/. /data/media/0/VDBackup/ 2>/dev/null
    restorecon -R /data/media/0/VDBackup 2>/dev/null   # sanitize (below) heals ownership
  fi
  rm -rf "$OLD_BK"
fi

# --- secrets to credential-encrypted storage (one-time, permanent) ------
# Credentials, the age keypair and the rclone config used to live under /data/adb
# (device-encrypted, readable before first unlock). Move them, permanently, to
# credential-encrypted storage, which stays locked until the user unlocks once. Needs CE
# unlocked: flashing from the root manager (screen on) is unlocked; a recovery flash is
# not, and then the module migrates them at runtime on the first unlock (secrets_init).
SECRETS_DIR=/data/misc_ce/0/vdbackup
if [ "$(getprop sys.user.0.ce_available)" = true ]; then
  mkdir -p "$SECRETS_DIR/creds" "$SECRETS_DIR/keys"
  for _s in creds keys; do
    [ -d "$STATE_DIR/$_s" ] || continue
    if [ -n "$(ls -A "$STATE_DIR/$_s" 2>/dev/null)" ]; then
      ui_print "- Moving $_s to credential-encrypted storage"
      cp -a "$STATE_DIR/$_s/." "$SECRETS_DIR/$_s/" 2>/dev/null || continue   # copy failed: keep source
      _ok=1; for _g in "$STATE_DIR/$_s"/*; do [ -e "$_g" ] && { [ -e "$SECRETS_DIR/$_s/$(basename "$_g")" ] || _ok=0; }; done
      [ "$_ok" = 1 ] && rm -rf "$STATE_DIR/$_s"
    else rm -rf "$STATE_DIR/$_s"; fi
  done
  if [ -f "$STATE_DIR/rclone.conf" ]; then
    cp -a "$STATE_DIR/rclone.conf" "$SECRETS_DIR/rclone.conf" 2>/dev/null && [ -f "$SECRETS_DIR/rclone.conf" ] && rm -f "$STATE_DIR/rclone.conf"
  fi
  chmod 700 "$SECRETS_DIR" "$SECRETS_DIR/creds" "$SECRETS_DIR/keys"
  for _f in "$SECRETS_DIR/creds"/* "$SECRETS_DIR/keys"/* "$SECRETS_DIR/rclone.conf"; do [ -f "$_f" ] && chmod 600 "$_f" 2>/dev/null; done
  restorecon -R "$SECRETS_DIR" 2>/dev/null
  : > "$SECRETS_DIR/.init"
fi

# --- seed persistent state (only if absent) -----------------------------
STATE_SUBDIRS="jobs dests logs staging"
if [ ! -f "$STATE_DIR/config.json" ]; then
  ui_print "- Seeding default configuration"
  mkdir -p "$STATE_DIR"
  for _d in $STATE_SUBDIRS; do mkdir -p "$STATE_DIR/$_d"; done
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
  for _d in $STATE_SUBDIRS; do mkdir -p "$STATE_DIR/$_d"; done
fi
rm -f "$STATE_DIR/staging/authorize.pgid"   # stale transient from a previous run
# Lock the state tree: dests/jobs must never be world-readable (the KSU boot umask can
# otherwise leave freshly created dirs 0777). Secrets are chmod-ed under SECRETS_DIR above.
chmod 700 "$STATE_DIR"
for _d in $STATE_SUBDIRS; do chmod 700 "$STATE_DIR/$_d" 2>/dev/null; done

# --- permissions --------------------------------------------------------
ui_print "- Setting permissions"
set_perm_recursive "$MODPATH" 0 0 0755 0644
set_perm_recursive "$MODPATH/bin" 0 0 0755 0755
set_perm "$MODPATH/scripts/helper.sh" 0 0 0755
set_perm "$MODPATH/scripts/worker.sh" 0 0 0755
set_perm "$MODPATH/scripts/telegram.sh" 0 0 0755
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
