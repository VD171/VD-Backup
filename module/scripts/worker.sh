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
#
#  Detached engine (setsid by helper.sh). Runs the backup/restore
#  pipeline as an independent root process and reports progress to
#  logs/progress-<opid>.json. Closing the WebUI does NOT stop it.
#
#  Modes: Full (tar.zst), Snapshot (restic), Mirror (rclone/rsync). Items:
#  apk + data + data_de + obb + external + media, with SELinux/uid-gid/xattr/
#  mode preservation. Encryption via age. Destinations: local, rclone, restic,
#  Google Drive companion. Runtime permissions, AppOps and (opt-in) SSAID are
#  restored; verify, dry-run and restore-test are supported.

d="${0%/*}"; [ "$d" = "$0" ] && d="."; MODDIR="$(cd "$d/.." 2>/dev/null && pwd || echo "${d%/*}")"
STATE=/data/adb/vdbackup
# restic shells out to rclone for rclone: repos; point it at the module config.
export RCLONE_CONFIG="$STATE/rclone.conf"
LOGS="$STATE/logs"
# Backups live on credential-encrypted, user-visible storage (/sdcard/VDBackup,
# per Android user), NOT in /data/adb (device-encrypted, readable before first
# unlock). BACKUPS is resolved per operation from the target user $U (see backup()).
backups_dir() { printf '/data/media/%s/VDBackup' "${1:-0}"; }

abi="$(getprop ro.product.cpu.abi)"
case "$abi" in
  arm64-v8a) BINABI=arm64-v8a ;; armeabi-v7a) BINABI=armeabi-v7a ;;
  x86_64) BINABI=x86_64 ;; x86) BINABI=x86 ;; *) BINABI=arm64-v8a ;;
esac
BIN="$MODDIR/bin/$BINABI"
export PATH="$BIN:$PATH"
# bundled binaries sourced from Termux link against Termux libs shipped in bin/<abi>/lib.
# Termux uses versioned sonames (.so.1/.so.3) so this never shadows the framework's libs.
export LD_LIBRARY_PATH="$BIN/lib:${LD_LIBRARY_PATH:-}"

# the state dirs must exist for every op: a missing staging dir would make the
# dumpsys redirect (and metadata: versionName/Code, perms) silently fail.
mkdir -p "$STATE/staging" "$STATE/logs" 2>/dev/null

is_abx() { [ "$(head -c3 "$1" 2>/dev/null)" = ABX ]; }
# Primary: the device's AOSP abx2xml/xml2abx (app_process wrappers, so clear
# LD_LIBRARY_PATH or the bundled Termux libs shadow ART's libz). Fallback: a
# bundled standalone converter (bin/<abi>/abx2xml|xml2abx, no app_process) for
# devices that lack the system tools (pre-A12). Same arg form: input output.
abx_to_xml() {
  if [ -x /system/bin/abx2xml ] && LD_LIBRARY_PATH= /system/bin/abx2xml "$1" "$2" 2>/dev/null && [ -s "$2" ]; then return 0; fi
  [ -x "$BIN/abx2xml" ] && "$BIN/abx2xml" "$1" "$2" 2>/dev/null && [ -s "$2" ]; }
xml_to_abx() {
  if [ -x /system/bin/xml2abx ] && LD_LIBRARY_PATH= /system/bin/xml2abx "$1" "$2" 2>/dev/null && [ -s "$2" ]; then return 0; fi
  [ -x "$BIN/xml2abx" ] && "$BIN/xml2abx" "$1" "$2" 2>/dev/null && [ -s "$2" ]; }

ssaid_restore() {
  _p="$1"; _u="$2"; _val="$3"
  _f="/data/system/users/$_u/settings_ssaid.xml"; [ -f "$_f" ] || { audit "ssaid no file $_p"; return 0; }
  _abx=no; is_abx "$_f" && _abx=yes
  if [ "$_abx" = yes ]; then { [ -x /system/bin/abx2xml ] || [ -x "$BIN/abx2xml" ]; } || { audit "ssaid no abx tool $_p"; return 0; }; fi
  _x="$STATE/staging/ssaid.$OPID.xml"; _o="$STATE/staging/ssaid.$OPID.out"
  _c="$STATE/staging/ssaid.$OPID.chk"; _bd="$STATE/staging/ssaid.$OPID.body"
  if [ "$_abx" = yes ]; then abx_to_xml "$_f" "$_x" || { audit "ssaid decode failed $_p"; return 0; }
  else cp "$_f" "$_x"; fi
  [ -s "$_x" ] || { rm -f "$_x"; audit "ssaid empty decode $_p"; return 0; }
  # normalize to one <setting/> per line (the standalone converter may emit a single line),
  # so the per-package edit can never touch a neighbouring entry's value.
  _stag="$(grep -o '<settings[^>]*>' "$_x" | head -1)"; [ -n "$_stag" ] || _stag='<settings version="-1">'
  grep -o '<setting [^>]*>' "$_x" | sed -E 's@ */?>$@ />@' > "$_bd"
  _old="$(grep "package=\"$_p\"" "$_bd" | grep -o 'value="[0-9a-fA-F]*"' | head -1 | sed 's/value="//;s/"//')"
  if grep -q "package=\"$_p\"" "$_bd"; then
    sed -i -E "/package=\"$_p\"/ s/value=\"[0-9a-fA-F]+\"/value=\"$_val\"/" "$_bd"
  else
    _uid="$(stat -c %u "/data/user/$_u/$_p" 2>/dev/null)"; case "$_uid" in ''|*[!0-9]*) rm -f "$_x" "$_bd"; audit "ssaid no uid $_p"; return 0 ;; esac
    _nid="$(grep -o 'id="[0-9]*"' "$_bd" | grep -o '[0-9]*' | sort -n | tail -1)"; _nid=$(( ${_nid:-0} + 1 ))
    printf '<setting id="%s" name="%s" value="%s" package="%s" defaultValue="%s" defaultSysSet="true" tag="null" />\n' \
      "$_nid" "$_uid" "$_val" "$_p" "$_val" >> "$_bd"
  fi
  { printf "<?xml version='1.0' encoding='UTF-8' standalone='yes' ?>\n%s\n" "$_stag"; cat "$_bd"; printf '</settings>\n'; } > "$_x"
  rm -f "$_bd"
  if [ "$_abx" = yes ]; then xml_to_abx "$_x" "$_o" || { rm -f "$_x" "$_o"; audit "ssaid encode failed $_p"; return 0; }
  else cp "$_x" "$_o"; fi
  if [ "$_abx" = yes ]; then abx_to_xml "$_o" "$_c" 2>/dev/null; else cp "$_o" "$_c"; fi
  if ! grep -o '<setting [^>]*>' "$_c" 2>/dev/null | grep "package=\"$_p\"" | grep -q "value=\"$_val\""; then
    rm -f "$_x" "$_o" "$_c"; audit "ssaid verify failed live untouched $_p"; return 0; fi
  # ALWAYS back up the live file byte-exact before overwriting, so a mistaken or
  # accidental change can be rolled back (cp the .bak back over the file + reboot).
  _bk="$STATE/ssaid_backups"; mkdir -p "$_bk"; chmod 700 "$_bk" 2>/dev/null
  _ts="$(date -u +%Y%m%dT%H%M%SZ)"; _bkf="$_bk/user${_u}_${_ts}.bak"
  cp "$_f" "$_bkf" 2>/dev/null || { rm -f "$_x" "$_o" "$_c"; audit "ssaid backup failed, live untouched $_p"; return 0; }
  cat "$_o" > "$_f"
  rm -f "$_x" "$_o" "$_c"
  audit "ssaid restored $_p old=${_old:-none} new=$_val backup=$_bkf (applies after reboot)"
}

# enter the init mount namespace (correct view under Magisk)
# NOTE the `--`: toybox nsenter permutes options and would otherwise swallow the
# target command's flags (e.g. tar --acls, tar -t, pm --user) as its own. `--`
# ends nsenter's option parsing so everything after is the command verbatim.
if command -v nsenter >/dev/null 2>&1; then exec_ns() { nsenter --mount=/proc/1/ns/mnt -- "$@"; }
else exec_ns() { "$@"; }; fi

# prefer bundled binaries, fall back to whatever the ROM provides
bin_or() { if [ -x "$BIN/$1" ]; then echo "$BIN/$1"; else echo "$1"; fi; }
TAR="$(bin_or tar)"; ZSTD="$(bin_or zstd)"; AGE="$(bin_or age)"; JQ="$(bin_or jq)"
GZIP="$(bin_or gzip)"; RCLONE="$(bin_or rclone)"; RSYNC="$(bin_or rsync)"; RESTIC="$(bin_or restic)"
SQLITE="$(bin_or sqlite3)"

# pick tar flags by implementation: GNU tar does xattr/acl/caps + selinux; toybox
# tar does modes/owner + --selinux (labels) but not per-file xattr/caps.
TARHELP="$("$TAR" --help 2>&1)"
if   echo "$TARHELP" | grep -q -- '--xattrs';  then TARC="--acls --xattrs --selinux -p"   # GNU tar (captures user.*/security.* + selinux)
elif echo "$TARHELP" | grep -q -- '--selinux'; then TARC="--selinux"                                          # toybox tar
else TARC="-p"; fi

VERB="$1"; OPID="$2"; ARGS_B64="$3"
PROG="$LOGS/progress-$OPID.json"
ARGS="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"

cleanup() { verifier_restore; rm -f "$LOGS/$OPID.pid"; }
trap cleanup EXIT

jstr() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'; }
prog() {  # prog <percent> <phase> <item>
  printf '{"opid":"%s","percent":%s,"phase":"%s","item":"%s","done":false}\n' \
    "$OPID" "$1" "$(jstr "$2")" "$(jstr "$3")" > "$PROG"; }
finish() { # finish <ok> <code>
  printf '{"opid":"%s","percent":100,"phase":"finished","done":true,"ok":%s,"code":"%s"}\n' \
    "$OPID" "$1" "$2" > "$PROG"; }
audit() { printf '{"ts":"%s","op":"%s","opid":"%s","detail":"%s"}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$VERB" "$OPID" "$(jstr "$1")" >> "$LOGS/audit.jsonl"; }

# localized notification strings (21 languages); English is the fallback.
[ -f "$MODDIR/etc/notify.sh" ] && . "$MODDIR/etc/notify.sh"

# Android notification from root (no companion). notify <key> <name>; key is one of
# backup_start|backup_done|restore_start|restore_done. Language from cfg .language.
notify() {
  _nl="$(cfg .language)"; case "$_nl" in ""|null|auto) _nl=en ;; esac
  if command -v vdb_notify_msg >/dev/null 2>&1; then _nm="$(vdb_notify_msg "$_nl" "$1" "$2")"; else _nm="$2"; fi
  cmd notification post -t "VDBackup" "vdbackup_$OPID" "$_nm" >/dev/null 2>&1 && return 0
  [ -f "$MODDIR/vdbhelper.dex" ] && LD_LIBRARY_PATH= app_process -Djava.class.path="$MODDIR/vdbhelper.dex" \
      /system/bin ru.vd171.vdbackup.Helper notify "VDBackup" "$_nm" >/dev/null 2>&1; }

jget() { printf '%s' "$1" | "$JQ" -r "$2" 2>/dev/null; }
cfg() { "$JQ" -r "$1 // empty" "$STATE/config.json" 2>/dev/null; }

# active network transport: wifi | mobile | other | unknown. Layered detection so
# it works across ROMs: dumpsys active default network, legacy NetworkInfo, then
# the default route interface.
net_transport() {
  _d="$(exec_ns dumpsys connectivity 2>/dev/null)"
  _id="$(printf '%s' "$_d" | sed -n 's/.*[Aa]ctive default network[^0-9]*\([0-9][0-9]*\).*/\1/p' | head -1)"
  if [ -n "$_id" ]; then
    case "$(printf '%s' "$_d" | grep -m1 "network{$_id}")" in
      *TRANSPORT_WIFI*)     echo wifi;   return ;;
      *TRANSPORT_CELLULAR*) echo mobile; return ;;
    esac
  fi
  case "$(printf '%s' "$_d" | grep -iE 'type: (WIFI|MOBILE).*CONNECTED' | head -1)" in
    *WIFI*)   echo wifi;   return ;;
    *MOBILE*) echo mobile; return ;;
  esac
  case "$(exec_ns ip route show default 2>/dev/null | sed -n 's/.* dev \([^ ]*\).*/\1/p' | head -1)" in
    wlan*)                       echo wifi ;;
    rmnet*|ccmni*|v4-rmnet*|pdp*) echo mobile ;;
    "")                          echo unknown ;;
    *)                           echo other ;;
  esac
}
# net_guard: enforce the user's network_policy before a cloud transfer. On a
# violation it finishes the op with ERR_NET_POLICY and returns 1 (caller: || return).
net_guard() {
  _pol="$(cfg .network_policy)"; case "$_pol" in wifi|mobile) ;; *) return 0 ;; esac
  _tr="$(net_transport)"
  [ "$_tr" = "$_pol" ] && return 0
  audit "network policy block need=$_pol have=$_tr $PKG"
  finish false ERR_NET_POLICY
  return 1
}

# pm install-create flags: -r replace, -t allow test, -d allow downgrade, and
# --bypass-low-target-sdk-block where the platform supports it - so restoring an
# older or old-targetSdk build succeeds where a plain install would fail.
# force-stop the target app for a consistent snapshot, but NEVER the Drive
# companion (could be mid-upload) or the framework itself.
freeze() {
  case "$1" in ru.vd171.vdbackup|android|system|"") return 0 ;; esac
  exec_ns env -u LD_LIBRARY_PATH -u LD_PRELOAD /system/bin/am force-stop "$1" 2>/dev/null
}
PM_FLAGS=""
pm_install_flags() {
  if [ -z "$PM_FLAGS" ]; then
    PM_FLAGS="-r -t -d"
    exec_ns pm install-create --help 2>&1 | grep -q 'bypass-low-target-sdk-block' \
      && PM_FLAGS="$PM_FLAGS --bypass-low-target-sdk-block"
  fi
  printf '%s' "$PM_FLAGS"
}
# Install-source attribution for a (re)installed APK, applied AT INSTALL TIME via
# install-create -i (pm set-installer is rejected for uid 0, so it must be the session
# installer). Default spoofs the source to the Play Store, because most apps and
# attestation read installerPackageName and a restored app otherwise looks sideloaded.
# Toggle: per-op arg .spoof_installer overrides cfg .spoof_installer (default true).
# When spoofing is off, fall back to the captured installer ($1) for fidelity; when that
# is empty too, no -i (honest sideload). NOTE: initiatingPackageName (the session creator,
# always the shell here) and originatingPackageName are NOT forgeable through pm.
installer_flag() {   # <captured-installer>; echoes "-i <pkg>" or nothing
  _sp="$(jget "$ARGS" '.spoof_installer')"
  case "$_sp" in true|false) ;; *) _sp="$(cfg .spoof_installer)"; case "$_sp" in true|false) ;; *) _sp=true ;; esac ;; esac
  if [ "$_sp" = true ]; then
    _ip="$(cfg .spoof_installer_pkg)"; { [ -z "$_ip" ] || [ "$_ip" = null ]; } && _ip=com.android.vending
    printf -- '-i %s' "$_ip"; return
  fi
  case "$1" in ''|null) ;; *) printf -- '-i %s' "$1" ;; esac
}
# Deep install-source spoof (OPT-IN, explicit per-op): pm cannot set
# initiatingPackageName / packageSource (only installerPackageName via -i), so a
# fully Play-looking source needs editing /data/system/packages.xml. Mirrors the
# ssaid-edit safety pattern: decode (ABX) -> edit ONLY the target package's opening
# tag -> re-encode -> round-trip validate (same package count + values applied) ->
# byte-exact backup (never auto-removed) -> atomic swap preserving owner/mode/context.
# Applies after the next reboot (PM caches packages.xml). Any failure leaves the live
# file untouched. Returns 0 only when the live file was actually swapped.
deep_spoof_installer() {   # <pkg> <installer-pkg>
  _p="$1"; _ip="$2"; _f=/data/system/packages.xml
  [ -f "$_f" ] || { audit "deep-spoof no packages.xml $_p"; return 1; }
  if is_abx "$_f"; then { [ -x /system/bin/abx2xml ] && [ -x /system/bin/xml2abx ]; } || { [ -x "$BIN/abx2xml" ] && [ -x "$BIN/xml2abx" ]; } || { audit "deep-spoof no abx tool $_p"; return 1; }; fi
  _x="$STATE/staging/pkx.$OPID.xml"; _o="$STATE/staging/pkx.$OPID.out"
  _enc="$STATE/staging/pkx.$OPID.abx"; _c="$STATE/staging/pkx.$OPID.chk"
  rm -f "$_x" "$_o" "$_enc" "$_c"
  if is_abx "$_f"; then abx_to_xml "$_f" "$_x" || { audit "deep-spoof decode failed $_p"; return 1; }
  else cp "$_f" "$_x"; fi
  [ -s "$_x" ] || { rm -f "$_x"; audit "deep-spoof empty decode $_p"; return 1; }
  grep -q "<package name=\"$_p\" " "$_x" || { rm -f "$_x"; audit "deep-spoof pkg not in packages.xml $_p"; return 1; }
  _cb="$(grep -c '<package name=' "$_x")"
  sed "/<package name=\"$_p\" /{s/ installInitiator=\"[^\"]*\"/ installInitiator=\"$_ip\"/; s/ packageSource=\"[^\"]*\"/ packageSource=\"0\"/;}" "$_x" > "$_o" 2>/dev/null
  [ -s "$_o" ] || { rm -f "$_x" "$_o"; audit "deep-spoof edit failed $_p"; return 1; }
  if is_abx "$_f"; then xml_to_abx "$_o" "$_enc" || { rm -f "$_x" "$_o" "$_enc"; audit "deep-spoof encode failed $_p"; return 1; }
  else cp "$_o" "$_enc"; fi
  if is_abx "$_f"; then abx_to_xml "$_enc" "$_c" || { rm -f "$_x" "$_o" "$_enc" "$_c"; audit "deep-spoof verify-decode failed $_p"; return 1; }
  else cp "$_enc" "$_c"; fi
  _ca="$(grep -c '<package name=' "$_c" 2>/dev/null)"
  if [ "$_cb" != "$_ca" ] \
     || ! grep "<package name=\"$_p\" " "$_c" | grep -q "installInitiator=\"$_ip\"" \
     || ! grep "<package name=\"$_p\" " "$_c" | grep -q 'packageSource="0"'; then
    rm -f "$_x" "$_o" "$_enc" "$_c"; audit "deep-spoof validation failed, live untouched $_p"; return 1; fi
  _bk="$STATE/pkgxml_backups"; mkdir -p "$_bk"; chmod 700 "$_bk" 2>/dev/null
  _bkf="$_bk/packages_$(date -u +%Y%m%dT%H%M%SZ)_$OPID.bak"
  cp "$_f" "$_bkf" 2>/dev/null || { rm -f "$_x" "$_o" "$_enc" "$_c"; audit "deep-spoof backup failed, live untouched $_p"; return 1; }
  _own="$(stat -c '%u:%g' "$_f" 2>/dev/null)"; _mode="$(stat -c '%a' "$_f" 2>/dev/null)"
  _tmp="/data/system/.pkx.$OPID"
  cp "$_enc" "$_tmp" 2>/dev/null || { rm -f "$_x" "$_o" "$_enc" "$_c" "$_tmp"; audit "deep-spoof stage failed $_p"; return 1; }
  case "$_own" in *[0-9]:*[0-9]) chown "$_own" "$_tmp" 2>/dev/null ;; esac
  [ -n "$_mode" ] && chmod "$_mode" "$_tmp" 2>/dev/null
  if mv -f "$_tmp" "$_f" 2>/dev/null; then
    restorecon "$_f" 2>/dev/null
    rm -f "$_x" "$_o" "$_enc" "$_c"
    printf '{"ts":"%s","op":"deep-spoof","opid":"%s","detail":"%s"}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$OPID" \
      "$(jstr "$_p installInitiator=$_ip packageSource=0 backup=$_bkf (applies after reboot)")" >> "$LOGS/audit.jsonl"
    return 0
  fi
  rm -f "$_x" "$_o" "$_enc" "$_c" "$_tmp"; audit "deep-spoof swap failed, live untouched $_p"; return 1
}
# the APK install verifier can hang or prompt on pm install-commit; disable it for
# the restore and put the previous value back afterwards (both upstreams do this).
VERIFIER_OLD=""
verifier_off() {
  VERIFIER_OLD="$(exec_ns settings get global verifier_verify_adb_installs 2>/dev/null)"
  exec_ns settings put global verifier_verify_adb_installs 0 2>/dev/null
}
verifier_restore() {
  case "$VERIFIER_OLD" in ""|null|"null") : ;; *) exec_ns settings put global verifier_verify_adb_installs "$VERIFIER_OLD" 2>/dev/null ;; esac
  VERIFIER_OLD=""
}
# wait for the freshly installed app's data dir to exist before chown (it may lag
# a moment after install-commit; without this the chown is silently skipped).
wait_datadir() { _w=0; while [ "$_w" -lt 25 ]; do [ -d "$1" ] && return 0; exec_ns sleep 0.2 2>/dev/null; _w=$((_w+1)); done; }

# Encryption: age with a scrypt passphrase ($PW), so a backup decrypts on any PC
# with just the passphrase (`age -d`) - no device keyfile needed. age reads the
# passphrase from a controlling terminal, which a detached root process lacks, so it
# runs under a pty (util-linux `script`). The data goes via a staged file, never
# through the pty (a pty would corrupt binary). Produces standard scrypt-stanza files.
SCRIPT="$(bin_or script)"
enc_age() { # <outfile> ; reads plaintext on stdin, writes an age scrypt file
  _ep="$STATE/staging/enc.$OPID.$$"; cat > "$_ep"
  printf '%s\n%s\n' "$PW" "$PW" | "$SCRIPT" -qec "$AGE -p -o \"$1\" \"$_ep\"" /dev/null >/dev/null 2>&1
  _er=$?; rm -f "$_ep"; return $_er
}
dec_age() { # <infile> ; writes the decrypted plaintext of an age scrypt file to stdout
  _dp="$STATE/staging/dec.$OPID.$$"
  printf '%s\n' "$PW" | "$SCRIPT" -qec "$AGE -d -o \"$_dp\" \"$1\"" /dev/null >/dev/null 2>&1
  cat "$_dp" 2>/dev/null; rm -f "$_dp"
}

# compression (write): none | zstd[:N] | gzip | lz4. gzip is the universal
# "compatibility mode"; lz4 (via zstd) is offered too. reads stdin, writes stdout.
comp() { case "$1" in
  none) cat ;; gzip) "$GZIP" -c ;; lz4) "$ZSTD" -q --format=lz4 ;;
  zstd:*) "$ZSTD" -q "-${1#zstd:}" ;; *) "$ZSTD" -q -10 ;; esac; }
comp_ext() { case "$1" in none) echo tar ;; gzip) echo tar.gz ;; lz4) echo tar.lz4 ;; *) echo tar.zst ;; esac; }
# decompress by filename (lz4 via zstd, so DataBackup imports also work).
decomp() { case "$1" in
  *.tar.gz*) "$GZIP" -dc "$1" ;; *.tar.lz4*) "$ZSTD" -dq --format=lz4 -c "$1" ;;
  *.tar.zst*) "$ZSTD" -dqc "$1" ;; *.tar*) cat "$1" ;; *) "$ZSTD" -dqc "$1" ;; esac; }

# media_own [-R] <path>: create <path> and give it the ownership + SELinux context
# of /sdcard content, so backups written as root are visible to the user and the
# file managers under /storage/emulated/0/VDBackup.
media_own() {
  _r=""; [ "$1" = "-R" ] && { _r="-R"; shift; }
  _mo="$(exec_ns stat -c '%u:%g' "/data/media/${U:-0}" 2>/dev/null)"
  exec_ns mkdir -p "$1" 2>/dev/null
  case "$_mo" in *[0-9]:*[0-9]) exec_ns chown $_r "$_mo" "$1" 2>/dev/null ;; esac
  exec_ns restorecon $_r "$1" 2>/dev/null
}

# Google Drive companion (optional, on-demand). The companion runs as its OWN app
# uid, which cannot reach /data/adb (root-only, SELinux). So the result file must
# live in the companion's own sandbox (/data/data/<pkg>/files): the app writes it
# there natively and root reads it back. Nothing here needs the network but the app.
COMPANION_PKG=ru.vd171.vdbackup
companion_installed() { exec_ns pm path "$COMPANION_PKG" >/dev/null 2>&1; }
companion_ensure() {
  companion_installed && return 0
  [ -f "$MODDIR/companion.apk" ] || return 1
  # system_server cannot read /data/adb (adb_data_file); stage the APK in a
  # location the installer can read, then install from there.
  _capk=/data/local/tmp/vdb-companion.apk; cp "$MODDIR/companion.apk" "$_capk"; chmod 644 "$_capk"
  exec_ns pm install -r "$_capk" >/dev/null 2>&1
  rm -f "$_capk"
  companion_installed
}
companion_resdir() {                        # echo an app-writable result dir (its own sandbox)
  _d="/data/data/$COMPANION_PKG/files"
  _au="$(stat -c %u "/data/data/$COMPANION_PKG" 2>/dev/null)"
  exec_ns mkdir -p "$_d" 2>/dev/null
  case "$_au" in ''|*[!0-9]*) : ;; *) exec_ns chown "$_au:$_au" "$_d" 2>/dev/null; esac
  exec_ns restorecon "$_d" 2>/dev/null
  printf '%s' "$_d"
}
drive_cmd() {                               # drive_cmd <op> [extra -e args...] -> prints result JSON
  _op="$1"; shift
  _drv="$(companion_resdir)"; _res="$_drv/res.$OPID.$$"
  exec_ns rm -f "$_res" "$_res.done" 2>/dev/null
  exec_ns env -u LD_LIBRARY_PATH -u LD_PRELOAD /system/bin/am start-foreground-service -n "$COMPANION_PKG/.DriveCommandService" \
    -e op "$_op" "$@" -e result "$_res" >/dev/null 2>&1
  _i=0; while ! exec_ns test -f "$_res.done" && [ "$_i" -lt 600 ]; do sleep 1; _i=$((_i+1)); done
  if exec_ns test -f "$_res.done"; then exec_ns cat "$_res"; exec_ns rm -f "$_res" "$_res.done" 2>/dev/null
  else exec_ns rm -f "$_res" "$_res.done" 2>/dev/null; printf '{"ok":false,"code":"ERR_DRIVE_TIMEOUT"}\n'; fi
}
drive_ok() { printf '%s' "$1" | "$JQ" -e '.ok==true' >/dev/null 2>&1; }

# resolve the destination (from dests/<id>.json) into DTYPE/DREMOTE/DPATH/DREPO
resolve_dest() {
  DESTID="$(jget "$ARGS" '.dest')"; { [ -z "$DESTID" ] || [ "$DESTID" = null ]; } && DESTID=local
  DJSON="$STATE/dests/$DESTID.json"
  DTYPE=local; DREMOTE=""; DPATH=""; DREPO=""
  if [ -f "$DJSON" ]; then
    DTYPE="$("$JQ" -r '.type // "local"' "$DJSON")"
    DREMOTE="$("$JQ" -r '.remote // empty' "$DJSON")"
    DPATH="$("$JQ" -r '.path // empty'   "$DJSON")"
    DREPO="$("$JQ" -r '.repo // empty'   "$DJSON")"
  fi
}

# Offline edition omits the cloud transport binaries (rclone/restic/rsync/ssh/sftp)
# from bin/<abi>/. A cloud/remote destination needs one of them; abort clearly so the
# WebUI can tell the user to flash the full edition instead of failing obscurely.
need_cloud_bin() { # <tool>...; finish ERR_NO_CLOUD and return 1 if any is missing
  for _t in "$@"; do
    [ -x "$BIN/$_t" ] || { audit "cloud transport missing: $_t (offline edition)"; finish false ERR_NO_CLOUD; return 1; }
  done
  return 0
}
# gate an operation by the transport its resolved destination needs (uses DTYPE/DREPO)
transport_guard() { # <mode>
  case "$1" in
    snapshot) need_cloud_bin restic || return 1 ;;
    mirror)   case "$DTYPE" in rclone) need_cloud_bin rclone || return 1 ;; local) need_cloud_bin rsync || return 1 ;; esac ;;
    *)        case "$DTYPE" in rclone) need_cloud_bin rclone || return 1 ;; esac ;;
  esac
  return 0
}

# live paths of the selected items (for snapshot/mirror which work on live data)
item_paths() {
  P=""
  echo " $ITEMS " | grep -q ' data '     && P="$P /data/user/$U/$PKG"
  echo " $ITEMS " | grep -q ' data_de '  && P="$P /data/user_de/$U/$PKG"
  echo " $ITEMS " | grep -q ' external ' && P="$P /data/media/$U/Android/data/$PKG"
  echo " $ITEMS " | grep -q ' obb '      && P="$P /data/media/$U/Android/obb/$PKG"
  echo " $ITEMS " | grep -q ' media '    && P="$P /data/media/$U/Android/media/$PKG"
  echo "$P"
}

# every backend namespaces its data under <path>/vdbackup so our files never
# collide with the user's other files at the chosen destination path.
remote_pfx() { printf '%s' "${DPATH:+$DPATH/}vdbackup"; }

# Full mode: ship the just-built local backup dir to a remote destination
transfer_full() {
  case "$DTYPE" in rclone|gdrive) net_guard || return 1 ;; esac
  case "$DTYPE" in
    rclone) [ -n "$DREMOTE" ] || { audit "rclone dest without remote $PKG"; finish false ERR_NO_DEST; return 1; }
            exec_ns "$RCLONE" --config "$STATE/rclone.conf" copy "$DEST" "$DREMOTE:$(remote_pfx)/$PKG/${TS}_${VC}" >/dev/null 2>&1 \
              || { audit "rclone transfer failed $PKG"; finish false ERR_TRANSFER; return 1; } ;;
    gdrive) companion_ensure || { audit "gdrive companion missing $PKG"; finish false ERR_COMPANION; return 1; }
            drive_ok "$(drive_cmd check)" || { audit "gdrive no consent $PKG"; finish false ERR_DRIVE_CONSENT; return 1; }
            _pfx="$(remote_pfx)/$PKG/${TS}_${VC}"
            # the companion runs as its own app uid and cannot read /data/adb; stage
            # each archive into its sandbox (app-readable), upload, then remove it.
            _stg="$(companion_resdir)/up.$OPID"; exec_ns mkdir -p "$_stg"
            _cau="$(stat -c %u "/data/data/$COMPANION_PKG" 2>/dev/null)"
            for _f in "$DEST"/*; do [ -f "$_f" ] || continue
              _b="$(basename "$_f")"; _sf="$_stg/$_b"
              exec_ns cp "$_f" "$_sf" || { exec_ns rm -rf "$_stg"; finish false ERR_DRIVE_UPLOAD; return 1; }
              case "$_cau" in ''|*[!0-9]*) : ;; *) exec_ns chown "$_cau:$_cau" "$_sf" 2>/dev/null ;; esac
              exec_ns chmod 0644 "$_sf" 2>/dev/null; exec_ns restorecon "$_sf" 2>/dev/null
              drive_ok "$(drive_cmd upload -e src "$_sf" -e name "$_pfx/$_b")" \
                || { exec_ns rm -rf "$_stg"; audit "gdrive upload failed $_b"; finish false ERR_DRIVE_UPLOAD; return 1; }
              exec_ns rm -f "$_sf"
            done
            exec_ns rm -rf "$_stg" ;;
    local)  if [ -n "$DPATH" ] && [ "$DPATH" != "$BACKUPS" ]; then
              mkdir -p "$(remote_pfx)/$PKG" && cp -a "$DEST" "$(remote_pfx)/$PKG/" \
                || { audit "local transfer failed $PKG"; finish false ERR_TRANSFER; return 1; }; fi ;;
  esac
}

# Snapshot mode: restic repo (incremental + dedup + encrypted; restore via restic)
do_snapshot() {
  [ -n "$DREPO" ] || { finish false ERR_NO_REPO; return; }
  case "$DREPO" in /*) : ;; *) net_guard || return ;; esac   # remote restic repo
  prog 5 freezing "$PKG"; notify backup_start "$PKG"
  freeze "$PKG"
  PATHS="$(item_paths)"
  for a in $(exec_ns pm path --all "$PKG" 2>/dev/null | sed 's/^package://'); do PATHS="$PATHS $a"; done
  prog 20 snapshot-init "$PKG"
  export RESTIC_PASSWORD_FILE="$STATE/creds/$DESTID.pass"
  # initialize the repo on first use
  exec_ns "$RESTIC" -r "$DREPO" snapshots >/dev/null 2>&1 || exec_ns "$RESTIC" -r "$DREPO" init >/dev/null 2>&1
  prog 45 snapshot "$PKG"
  exec_ns "$RESTIC" -r "$DREPO" backup --tag "vdbackup,$PKG" $PATHS >/dev/null 2>&1
  rc=$?
  prog 98 verify "$PKG"
  # integrity check of the repo (structure + a sample of the data), unless turned off
  VERIFY="$(jget "$ARGS" '.verify')"; { [ -z "$VERIFY" ] || [ "$VERIFY" = null ]; } && VERIFY="$(cfg .verify)"
  if [ $rc -eq 0 ] && [ "$VERIFY" != false ]; then
    exec_ns "$RESTIC" -r "$DREPO" check --read-data-subset=5% >/dev/null 2>&1 || { finish false ERR_VERIFY; return; }
  fi
  if [ $rc -eq 0 ]; then audit "snapshot $PKG -> $DREPO"; notify backup_done "$PKG"; finish true ERR_NONE
  else finish false ERR_RESTIC; fi
}

# Mirror mode: 1:1 live sync to the destination (rclone sync / rsync --delete)
do_mirror() {
  [ -n "$DREMOTE" ] || [ "$DTYPE" = local ] || { finish false ERR_NO_DEST; return; }
  [ "$DTYPE" = local ] || net_guard || return
  prog 5 freezing "$PKG"; notify backup_start "$PKG"
  freeze "$PKG"
  # APK: always compressed, never raw (even in a mirror)
  if echo " $ITEMS " | grep -q ' apk '; then
    prog 18 mirror apk
    apkdir="$STATE/staging/mapk.$OPID"; rm -rf "$apkdir"; mkdir -p "$apkdir"
    for p in $(exec_ns pm path --all "$PKG" 2>/dev/null | sed 's/^package://'); do
      "$ZSTD" -q -10 -c "$p" > "$apkdir/$(basename "$p").zst"; done
    case "$DTYPE" in
      local)  mkdir -p "$(remote_pfx)/$PKG/apk" && exec_ns "$RSYNC" -a --delete "$apkdir/" "$(remote_pfx)/$PKG/apk/" >/dev/null 2>&1 ;;
      rclone) exec_ns "$RCLONE" --config "$STATE/rclone.conf" sync "$apkdir" "$DREMOTE:$(remote_pfx)/$PKG/apk" >/dev/null 2>&1 ;;
    esac
    rm -rf "$apkdir"
  fi
  sync_one() { # <label> <src>
    [ -e "$2" ] || return 0
    case "$DTYPE" in
      rclone) exec_ns "$RCLONE" --config "$STATE/rclone.conf" sync "$2" "$DREMOTE:$(remote_pfx)/$PKG/$1" >/dev/null 2>&1 ;;
      local)  mkdir -p "$(remote_pfx)/$PKG/$1" && exec_ns "$RSYNC" -a --delete "$2/" "$(remote_pfx)/$PKG/$1/" >/dev/null 2>&1 ;;
    esac
  }
  prog 30 mirror data;     echo " $ITEMS " | grep -q ' data '     && sync_one data     "/data/user/$U/$PKG"
  prog 50 mirror data_de;  echo " $ITEMS " | grep -q ' data_de '  && sync_one data_de  "/data/user_de/$U/$PKG"
  prog 65 mirror external; echo " $ITEMS " | grep -q ' external ' && sync_one external "/data/media/$U/Android/data/$PKG"
  prog 78 mirror obb;      echo " $ITEMS " | grep -q ' obb '      && sync_one obb      "/data/media/$U/Android/obb/$PKG"
  prog 88 mirror media;    echo " $ITEMS " | grep -q ' media '    && sync_one media    "/data/media/$U/Android/media/$PKG"
  prog 98 verify "$PKG"; audit "mirror $PKG -> ${DREMOTE:-$DPATH}"; notify backup_done "$PKG"; finish true ERR_NONE
}

# ----------------------------------------------------------------------
backup() {
  PKG="$(jget "$ARGS" '.package')"
  case "$PKG" in ''|null|*/*|*' '*) finish false ERR_NO_PACKAGE; return ;; esac
  U="$(jget "$ARGS" '.user // 0')"; case "$U" in ""|*[!0-9]*) U=0 ;; esac
  BACKUPS="$(backups_dir "$U")"
  if ! exec_ns pm path --user "$U" "$PKG" >/dev/null 2>&1 \
     && [ ! -d "/data/user/$U/$PKG" ] && [ ! -d "/data/user_de/$U/$PKG" ]; then
    audit "backup package not installed: $PKG (user $U)"; finish false ERR_PKG_NOT_FOUND; return
  fi
  COMP="$(jget "$ARGS" '.compression')"; { [ -z "$COMP" ] || [ "$COMP" = "null" ]; } && COMP="$(cfg .compression)"; [ -n "$COMP" ] || COMP="zstd:10"
  ENCDATA="$(jget "$ARGS" '.encrypt_data')"; [ "$ENCDATA" = "null" ] && ENCDATA="$(cfg .encrypt_data)"
  ENCAPK="$(jget "$ARGS" '.encrypt_apk')";  [ "$ENCAPK"  = "null" ] && ENCAPK="$(cfg .encrypt_apk)"
  PW="$(jget "$ARGS" '.password')"; [ "$PW" = null ] && PW=""
  # encryption requested but no passphrase would silently yield a PLAINTEXT backup;
  # refuse instead so the user never thinks data is encrypted when it is not.
  if { [ "$ENCDATA" = true ] || [ "$ENCAPK" = true ]; } && [ -z "$PW" ]; then
    finish false ERR_CRYPTO_PASS; return; fi
  ITEMS="$(jget "$ARGS" '.items | join(" ")')"; { [ -z "$ITEMS" ] || [ "$ITEMS" = "null" ]; } && ITEMS="apk data data_de obb external media"
  APKLEVEL=10
  use_data_age() { [ "$ENCDATA" = "true" ] && [ -n "$PW" ]; }
  use_apk_age()  { [ "$ENCAPK"  = "true" ] && [ -n "$PW" ]; }
  VERIFY="$(jget "$ARGS" '.verify')"; { [ -z "$VERIFY" ] || [ "$VERIFY" = null ]; } && VERIFY="$(cfg .verify)"
  case "$VERIFY" in true|false) ;; *) VERIFY=true ;; esac

  # dry-run: compute the plan (item types + on-disk sizes) and report it. Writes and
  # modifies nothing (no force-stop, no archives), returns ok with a plan object.
  DRY="$(jget "$ARGS" '.dry_run')"
  if [ "$DRY" = true ]; then
    prog 10 planning "$PKG"; audit "dry-run $PKG"
    PLAN='[]'
    add_plan() { [ -e "$2" ] || return 0
      sz="$(du -s -B1 "$2" 2>/dev/null | cut -f1)"; sz="${sz:-0}"
      PLAN="$(printf '%s' "$PLAN" | "$JQ" --arg t "$1" --arg p "$2" --argjson b "$sz" '. + [{type:$t,path:$p,bytes:$b}]')"; }
    if echo " $ITEMS " | grep -q ' apk '; then
      asz=0; for p in $(exec_ns pm path --all "$PKG" 2>/dev/null | sed 's/^package://'); do
        s="$(stat -c %s "$p" 2>/dev/null || echo 0)"; asz=$((asz+s)); done
      PLAN="$(printf '%s' "$PLAN" | "$JQ" --argjson b "$asz" '. + [{type:"apk",path:"(installed base + splits)",bytes:$b}]')"
    fi
    echo " $ITEMS " | grep -q ' data '     && add_plan data     "/data/user/$U/$PKG"
    echo " $ITEMS " | grep -q ' data_de '  && add_plan data_de  "/data/user_de/$U/$PKG"
    echo " $ITEMS " | grep -q ' external ' && add_plan external "/data/media/$U/Android/data/$PKG"
    echo " $ITEMS " | grep -q ' obb '      && add_plan obb      "/data/media/$U/Android/obb/$PKG"
    echo " $ITEMS " | grep -q ' media '    && add_plan media    "/data/media/$U/Android/media/$PKG"
    TOTAL="$(printf '%s' "$PLAN" | "$JQ" '[.[].bytes] | add // 0')"
    "$JQ" -n --arg opid "$OPID" --arg pkg "$PKG" --argjson plan "$PLAN" --argjson total "$TOTAL" \
      '{opid:$opid,percent:100,phase:"finished",done:true,ok:true,code:"ERR_NONE",dry_run:true,
        plan:{package:$pkg,items:$plan,total_bytes:$total}}' > "$PROG"
    return
  fi

  MODE="$(jget "$ARGS" '.mode')"; { [ -z "$MODE" ] || [ "$MODE" = null ]; } && MODE=full
  resolve_dest
  transport_guard "$MODE" || return
  [ "$MODE" = snapshot ] && { do_snapshot; return; }
  [ "$MODE" = mirror ]   && { do_mirror;   return; }

  prog 2 preparing "$PKG"; audit "backup start $PKG"; notify backup_start "$PKG"

  # metadata (shell)
  # dumpsys output is huge; write to a file and parse the file (mksh has no printf
  # builtin, so `printf '%s' "$HUGE"` would hit the external printf's ARG_MAX limit).
  DUMPF="$STATE/staging/dump.$OPID"; exec_ns dumpsys package "$PKG" > "$DUMPF" 2>/dev/null
  VN="$(sed -n 's/.*versionName=\([^ ]*\).*/\1/p' "$DUMPF" | head -1)"
  VC="$(sed -n 's/.*versionCode=\([0-9]*\).*/\1/p' "$DUMPF" | head -1)"; VC="${VC:-0}"
  ISSYS=false; grep -q 'pkgFlags=\[.*SYSTEM' "$DUMPF" && ISSYS=true
  # install-source and enabled-state fidelity (both Neo-Backup and DataBackup keep these):
  # installerPackageName so a restored app keeps its store attribution; the per-user
  # enabled value so an app disabled before backup is disabled again on restore.
  INSTALLER="$(sed -n 's/.*installerPackageName=\([^ ]*\).*/\1/p' "$DUMPF" | head -1)"
  case "$INSTALLER" in null|"") INSTALLER="" ;; esac
  ENABLED="$(sed -n "/^ *User $U:/s/.*enabled=\([0-9]*\).*/\1/p" "$DUMPF" | head -1)"
  case "$ENABLED" in ''|*[!0-9]*) ENABLED=0 ;; esac
  # app label (localized), stored in the manifest so the UI can show the real name
  # even after the app is uninstalled; falls back to the package name.
  LABEL=""
  [ -f "$MODDIR/vdbhelper.dex" ] && LABEL="$(LD_LIBRARY_PATH= app_process -Djava.class.path="$MODDIR/vdbhelper.dex" \
      /system/bin ru.vd171.vdbackup.Helper label "$PKG" "$U" 2>/dev/null | "$JQ" -r '.label // empty' 2>/dev/null)"
  [ -n "$LABEL" ] || LABEL="$PKG"
  # app icon (base64 PNG) stored in the manifest too, so the Backups list shows the
  # icon even when the app is no longer installed.
  ICON_B64=""
  if [ -f "$MODDIR/vdbhelper.dex" ]; then
    _ic="$STATE/staging/ic.$OPID.png"
    LD_LIBRARY_PATH= app_process -Djava.class.path="$MODDIR/vdbhelper.dex" /system/bin \
      ru.vd171.vdbackup.Helper icon "$PKG" "$_ic" "$U" >/dev/null 2>&1
    [ -s "$_ic" ] && ICON_B64="$(base64 -w0 < "$_ic")"
    rm -f "$_ic"
  fi

  TS="$(date -u +%Y%m%dT%H%M%SZ)"
  DEST="$BACKUPS/$PKG/${TS}_${VC}"
  media_own "$BACKUPS"; media_own "$BACKUPS/$PKG"
  mkdir -p "$DEST"
  IFILE="$DEST/.items.jsonl"; : > "$IFILE"

  emit_item() { # type archive comp enc orig stored sha ctx uid gid
    "$JQ" -n --arg type "$1" --arg archive "$2" --arg compression "$3" --arg encryption "$4" \
      --argjson orig "${5:-0}" --argjson stored "${6:-0}" --arg sha "$7" --arg ctx "$8" \
      --argjson uid "${9:-0}" --argjson gid "${10:-0}" \
      '{type:$type,archive:$archive,compression:$compression,encryption:$encryption,orig_bytes:$orig,stored_bytes:$stored,sha256:$sha,root_context:$ctx,owner_uid:$uid,owner_gid:$gid}' >> "$IFILE"; }

  archive_dir() { # type srcpath
    typ="$1"; src="$2"; [ -e "$src" ] || return 0
    parent="$(dirname "$src")"; base="$(basename "$src")"
    ctx="$(ls -Zd "$src" 2>/dev/null | cut -d' ' -f1)"
    uid="$(stat -c %u "$src" 2>/dev/null || echo 0)"; gid="$(stat -c %g "$src" 2>/dev/null || echo 0)"
    orig="$(du -s -B1 "$src" 2>/dev/null | cut -f1)"; orig="${orig:-0}"
    ext="$(comp_ext "$COMP")"; out="$DEST/${typ}.${ext}"; enc=none
    # internal app data holds regenerable/unsafe dirs: cache & code_cache are
    # throwaway, no_backup is the app's "do not back this up" marker, and lib is a
    # symlink to the APK-extracted native libs (restoring it can break the app).
    # Exclude them from data/data_de unless the user opts to keep cache.
    EXCL=""
    case "$typ" in
      data|data_de)
        EXCL="--exclude=$base/lib --exclude=$base/no_backup"
        [ "$(cfg .include_cache)" = true ] || EXCL="$EXCL --exclude=$base/cache --exclude=$base/code_cache" ;;
    esac
    if use_data_age; then out="$out.age"; enc=age
      exec_ns "$TAR" $TARC $EXCL -C "$parent" -c "$base" 2>/dev/null | comp "$COMP" | enc_age "$out"
    else
      exec_ns "$TAR" $TARC $EXCL -C "$parent" -c "$base" 2>/dev/null | comp "$COMP" > "$out"
    fi
    # completeness check: GNU tar may exit 1 on live data (file changed) which is
    # fine, so we cannot trust the pipeline rc; instead confirm the written archive
    # reads back as a complete tar (catches a truncated write: disk full, interrupt).
    if [ "$enc" = age ]; then
      dec_age "$out" 2>/dev/null | { case "$COMP" in gzip) "$GZIP" -dc ;; lz4) "$ZSTD" -dq --format=lz4 -c ;; none) cat ;; *) "$ZSTD" -dqc ;; esac; } | exec_ns "$TAR" -t >/dev/null 2>&1 \
        || { audit "backup archive incomplete $typ $PKG"; finish false ERR_BACKUP; return 1; }
    else
      decomp "$out" | exec_ns "$TAR" -t >/dev/null 2>&1 \
        || { audit "backup archive incomplete $typ $PKG"; finish false ERR_BACKUP; return 1; }
    fi
    stored="$(stat -c %s "$out" 2>/dev/null || echo 0)"
    sha="$(sha256sum "$out" 2>/dev/null | cut -d' ' -f1)"
    emit_item "$typ" "$(basename "$out")" "$COMP" "$enc" "$orig" "$stored" "$sha" "${ctx:-}" "$uid" "$gid"
  }

  # APK: always compressed, never raw; crypto only if encrypt_apk
  APKS='[]'
  if echo " $ITEMS " | grep -q ' apk '; then
    prog 15 apk "$PKG"
    for p in $(exec_ns pm path --all "$PKG" 2>/dev/null | sed 's/^package://'); do
      name="$(basename "$p")"
      if use_apk_age; then
        "$ZSTD" -q "-$APKLEVEL" -c "$p" | enc_age "$DEST/${name}.zst.age"; an="${name}.zst.age"
      else
        "$ZSTD" -q "-$APKLEVEL" -c "$p" > "$DEST/${name}.zst"; an="${name}.zst"
      fi
      APKS="$(printf '%s' "$APKS" | "$JQ" --arg a "$an" '. + [$a]')"
    done
  fi

  # freeze app, then archive each data item
  prog 30 freezing "$PKG"; freeze "$PKG"
  echo " $ITEMS " | grep -q ' data '     && { prog 40 data     "$PKG"; archive_dir data     "/data/user/$U/$PKG" || return; }
  echo " $ITEMS " | grep -q ' data_de '  && { prog 55 data_de  "$PKG"; archive_dir data_de  "/data/user_de/$U/$PKG" || return; }
  echo " $ITEMS " | grep -q ' external ' && { prog 65 external "$PKG"; archive_dir external "/data/media/$U/Android/data/$PKG" || return; }
  echo " $ITEMS " | grep -q ' obb '      && { prog 72 obb      "$PKG"; archive_dir obb      "/data/media/$U/Android/obb/$PKG" || return; }
  echo " $ITEMS " | grep -q ' media '    && { prog 80 media    "$PKG"; archive_dir media    "/data/media/$U/Android/media/$PKG" || return; }

  # framework state (shell)
  prog 86 framework "$PKG"
  # runtime permissions (no awk: toybox lacks it). Slice the runtime section with
  # sed, keep granted= lines, emit "<perm>\t<true|false>", then build JSON via jq.
  # scope to this user's block first (dumpsys lists runtime permissions per "User N:")
  PERMS_TSV="$(sed -n "/User $U:/,/^ *User [0-9]/p" "$DUMPF" | sed -n '/runtime permissions:/,/^$/p' | grep 'granted=' | while IFS= read -r ln; do
      nm="${ln%%:*}"; nm="$(printf '%s' "$nm" | tr -d ' \t')"
      case "$ln" in *granted=true*) g=true ;; *) g=false ;; esac
      [ -n "$nm" ] && printf '%s\t%s\n' "$nm" "$g"
    done)"
  PERMS_JSON="$(printf '%s\n' "$PERMS_TSV" | "$JQ" -R -s 'split("\n")|map(select(length>0)|split("\t")|{name:.[0],granted:(.[1]=="true")})')"
  [ -n "$PERMS_JSON" ] || PERMS_JSON='[]'
  # app ops (per user)
  APPOPS_JSON="$(exec_ns cmd appops get --user "$U" "$PKG" 2>/dev/null | "$JQ" -R -s '
      split("\n")|map(select(test(": "))
        |{op:(.|sub("^ +";"")|split(":")[0]), mode:(.|split(": ")[1]|split(";")[0])}
        |select(.op|test("^[A-Z][A-Z0-9_]*$")))')"
  [ -n "$APPOPS_JSON" ] || APPOPS_JSON='[]'
  # ssaid: OPT-IN only (.ssaid arg). The device ANDROID_ID is sensitive and its
  # restore rewrites a system file, so we never capture it unless asked.
  SSAID=""; SSF="/data/system/users/$U/settings_ssaid.xml"
  if [ "$(jget "$ARGS" '.ssaid')" = true ] && [ -f "$SSF" ]; then
    if is_abx "$SSF"; then SSTMP="$STATE/staging/ssaid-cap.$OPID.xml"; abx_to_xml "$SSF" "$SSTMP"; SSX="$(cat "$SSTMP" 2>/dev/null)"; rm -f "$SSTMP"
    else SSX="$(cat "$SSF" 2>/dev/null)"; fi
    SSAID="$(printf '%s' "$SSX" | tr '>' '\n' | grep "package=\"$PKG\"" | grep -o 'value="[0-9a-fA-F]*"' | head -1 | sed 's/value="//;s/"//')"
  fi

  # manifest
  prog 90 manifest "$PKG"
  FP="$(getprop ro.build.fingerprint)"; SDK="$(getprop ro.build.version.sdk)"
  SEL="$(getenforce 2>/dev/null | tr 'A-Z' 'a-z')"
  ROOTSOL=unknown
  if   [ -d /data/adb/ap ]; then ROOTSOL=APatch
  elif [ -e /data/adb/ksud ] || [ -d /data/adb/ksu ]; then ROOTSOL=KernelSU
  elif [ -d /data/adb/magisk ]; then ROOTSOL=Magisk
  fi
  # manifest: APPEND-ONLY and forever restorable (see ARCHITECTURE.md). format_version
  # gates any change; fields may be added but never removed/renamed/repurposed, and
  # restore reads every field defensively so old backups never stop restoring.
  "$JQ" -n \
    --arg producer "VDBackup $(sed -n 's/^version=//p' "$MODDIR/module.prop")" \
    --arg root "$ROOTSOL" \
    --arg created "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --argjson epoch "$(date +%s)" \
    --arg fp "$FP" --argjson sdk "${SDK:-0}" --arg abi "$abi" --arg sel "${SEL:-unknown}" \
    --argjson user "$U" --arg pkg "$PKG" --arg label "$LABEL" --arg icon "$ICON_B64" --arg vn "${VN:-}" --argjson vc "${VC:-0}" \
    --argjson issys "$ISSYS" --argjson apks "$APKS" --slurpfile items "$IFILE" \
    --argjson perms "$PERMS_JSON" --argjson appops "$APPOPS_JSON" --arg ssaid "$SSAID" \
    --arg installer "$INSTALLER" --argjson enabled "$ENABLED" \
    '{format_version:1, producer:$producer, created_at:$created, created_epoch:$epoch, mode:"full",
      device:{fingerprint:$fp, sdk:$sdk, abi:$abi, selinux:$sel, root:$root},
      user_id:$user,
      package:{name:$pkg, label:$label, icon:$icon, versionName:$vn, versionCode:$vc, isSystem:$issys,
               installer:$installer, enabled:$enabled, apk:{files:$apks}},
      preserve:{selinux:true, uid_gid:true, xattr:true, caps:true, modes:true},
      permissions:{runtime:$perms, appops:$appops, ssaid:$ssaid},
      items:$items}' > "$DEST/manifest.json"
  rm -f "$IFILE"
  sha256sum "$DEST/manifest.json" | cut -d' ' -f1 > "$DEST/manifest.json.sha256"
  media_own -R "$DEST"   # make the finished backup visible under /sdcard/VDBackup

  rm -f "$DUMPF"

  # real verify: re-read each written archive from disk and re-hash it, comparing to
  # the sha256 the manifest recorded at write time (catches truncation / full disk /
  # silent corruption). Gated by .verify arg or cfg .verify, default on for Full.
  if [ "$VERIFY" = true ]; then
    prog 92 verify "$PKG"
    vn="$("$JQ" '.items | length' "$DEST/manifest.json")"; vi=0; VERR=""
    while [ "$vi" -lt "${vn:-0}" ]; do
      varc="$("$JQ" -r ".items[$vi].archive // empty" "$DEST/manifest.json")"
      vwant="$("$JQ" -r ".items[$vi].sha256 // empty" "$DEST/manifest.json")"
      vi=$((vi+1))
      { [ -z "$varc" ] || [ -z "$vwant" ]; } && continue
      vgot="$(sha256sum "$DEST/$varc" 2>/dev/null | cut -d' ' -f1)"
      [ "$vgot" = "$vwant" ] || VERR="$VERR $varc"
    done
    if [ -n "$VERR" ]; then audit "verify FAILED $PKG:$VERR"; finish false ERR_VERIFY; return; fi
    audit "verify ok $PKG"
  fi

  # ship the PC recovery guide inside every encrypted backup (openability)
  if use_data_age || use_apk_age; then cp "$MODDIR/etc/RECOVERY.md" "$DEST/RECOVERY.md" 2>/dev/null; fi

  # transfer the built backup to a remote destination when configured.
  # transfer_full already calls finish false + returns non-zero on failure;
  # do not overwrite that with success.
  prog 95 transfer "$PKG"; transfer_full || return
  audit "backup done $PKG -> $DEST"; notify backup_done "$PKG"
  finish true ERR_NONE
}

# Restore from a restic snapshot: restic restore -> staging, pm install the APKs,
# move the data dirs into place and remap ownership/context.
do_restore_snapshot() {
  DESTID="$(jget "$ARGS" '.dest')"; SNAP="$(jget "$ARGS" '.snapshot')"
  PKG="$(jget "$ARGS" '.package')"; U="$(jget "$ARGS" '.user // 0')"; case "$U" in ""|*[!0-9]*) U=0 ;; esac
  { [ -z "$SNAP" ] || [ "$SNAP" = null ]; } && SNAP=latest
  resolve_dest
  [ -n "$DREPO" ] || { finish false ERR_NO_REPO; return; }
  transport_guard snapshot || return
  case "$DREPO" in /*) : ;; *) net_guard || return ;; esac   # remote restic repo
  export RESTIC_PASSWORD_FILE="$STATE/creds/$DESTID.pass"
  prog 5 fetching "$PKG"; audit "restore-snapshot start $PKG"; notify restore_start "$PKG"
  freeze "$PKG"
  ST="$STATE/staging/restore.$OPID"; rm -rf "$ST"; mkdir -p "$ST"
  prog 30 restoring "$PKG"
  exec_ns "$RESTIC" -r "$DREPO" restore "$SNAP" --target "$ST" \
    --include "/data/user/$U/$PKG" --include "/data/user_de/$U/$PKG" \
    --include "/data/media/$U/Android/data/$PKG" --include "/data/media/$U/Android/obb/$PKG" \
    --include "/data/media/$U/Android/media/$PKG" --include "/data/app" >/dev/null 2>&1
  # install APKs found in the restored tree
  prog 55 installing "$PKG"
  verifier_off
  SESSION="$(exec_ns pm install-create $(pm_install_flags) $(installer_flag "") --user "$U" 2>/dev/null | sed -n 's/.*\[\([0-9]*\)\].*/\1/p')"
  if [ -n "$SESSION" ]; then
    find "$ST/data/app" -name '*.apk' 2>/dev/null | while IFS= read -r apk; do
      exec_ns pm install-write "$SESSION" "$(basename "$apk" .apk)" "$apk" >/dev/null 2>&1
    done
    exec_ns pm install-commit "$SESSION" >/dev/null 2>&1
  fi
  wait_datadir "/data/user/$U/$PKG"
  LIVEU="$(stat -c %u "/data/user/$U/$PKG" 2>/dev/null || echo 0)"; LIVEG="$(stat -c %g "/data/user/$U/$PKG" 2>/dev/null || echo 0)"
  prog 75 extracting "$PKG"
  for rel in "data/user/$U/$PKG" "data/user_de/$U/$PKG" "data/media/$U/Android/data/$PKG" \
             "data/media/$U/Android/obb/$PKG" "data/media/$U/Android/media/$PKG"; do
    src="$ST/$rel"; dst="/$rel"; [ -d "$src" ] || continue
    rm -rf "$dst"; mkdir -p "$(dirname "$dst")"; cp -a "$src" "$dst"
    case "$rel" in data/user/*|data/user_de/*) [ "$LIVEU" != 0 ] && exec_ns chown -hR "$LIVEU:$LIVEG" "$dst" 2>/dev/null ;; esac
    exec_ns restorecon -R "$dst" 2>/dev/null
  done
  rm -rf "$ST"
  prog 97 framework "$PKG"; audit "restore-snapshot done $PKG"; notify restore_done "$PKG"
  finish true ERR_NONE
}

# Restore from a Mirror: pm install the mirrored APKs, rsync the data dirs back, remap.
do_restore_mirror() {
  DESTID="$(jget "$ARGS" '.dest')"; PKG="$(jget "$ARGS" '.package')"; U="$(jget "$ARGS" '.user // 0')"; case "$U" in ""|*[!0-9]*) U=0 ;; esac
  resolve_dest
  transport_guard mirror || return
  [ "$DTYPE" = local ] || net_guard || return
  prog 5 fetching "$PKG"; audit "restore-mirror start $PKG"; notify restore_start "$PKG"
  if [ "$DTYPE" = local ]; then SRC="$(remote_pfx)/$PKG"
  else SRC="$STATE/staging/mrestore.$OPID"; rm -rf "$SRC"; mkdir -p "$SRC"
       exec_ns "$RCLONE" --config "$STATE/rclone.conf" copy "$DREMOTE:$(remote_pfx)/$PKG" "$SRC" >/dev/null 2>&1; fi
  [ -d "$SRC" ] || { finish false ERR_NO_BACKUP; return; }
  freeze "$PKG"
  prog 35 installing "$PKG"
  verifier_off
  SESSION="$(exec_ns pm install-create $(pm_install_flags) $(installer_flag "") --user "$U" 2>/dev/null | sed -n 's/.*\[\([0-9]*\)\].*/\1/p')"
  if [ -n "$SESSION" ] && [ -d "$SRC/apk" ]; then
    TMP="$STATE/staging/mapk-r.$OPID"; rm -rf "$TMP"; mkdir -p "$TMP"
    for af in "$SRC"/apk/*.zst; do [ -e "$af" ] || continue
      bn="$(basename "$af" .zst)"; "$ZSTD" -dqc "$af" > "$TMP/$bn"
      exec_ns pm install-write "$SESSION" "${bn%.apk}" "$TMP/$bn" >/dev/null 2>&1; done
    exec_ns pm install-commit "$SESSION" >/dev/null 2>&1; rm -rf "$TMP"
  fi
  wait_datadir "/data/user/$U/$PKG"
  LIVEU="$(stat -c %u "/data/user/$U/$PKG" 2>/dev/null || echo 0)"; LIVEG="$(stat -c %g "/data/user/$U/$PKG" 2>/dev/null || echo 0)"
  prog 70 extracting "$PKG"
  restore_one() { # <label> <dst>
    [ -d "$SRC/$1" ] || return 0
    mkdir -p "$2"; exec_ns "$RSYNC" -a --delete "$SRC/$1/" "$2/" >/dev/null 2>&1
    case "$1" in data|data_de) [ "$LIVEU" != 0 ] && exec_ns chown -hR "$LIVEU:$LIVEG" "$2" 2>/dev/null ;; esac
    exec_ns restorecon -R "$2" 2>/dev/null
  }
  restore_one data     "/data/user/$U/$PKG"
  restore_one data_de  "/data/user_de/$U/$PKG"
  restore_one external "/data/media/$U/Android/data/$PKG"
  restore_one obb      "/data/media/$U/Android/obb/$PKG"
  restore_one media    "/data/media/$U/Android/media/$PKG"
  [ "$DTYPE" = local ] || rm -rf "$SRC"
  prog 97 framework "$PKG"; audit "restore-mirror done $PKG"; notify restore_done "$PKG"
  finish true ERR_NONE
}

# ----------------------------------------------------------------------
restore() {
  [ "$(jget "$ARGS" '.mode')" = snapshot ] && { do_restore_snapshot; return; }
  [ "$(jget "$ARGS" '.mode')" = mirror ]   && { do_restore_mirror;   return; }
  REF="$(jget "$ARGS" '.ref')"
  [ -n "$REF" ] && [ -d "$REF" ] || { finish false ERR_NO_BACKUP; return; }
  M="$REF/manifest.json"
  [ -f "$M" ] || { finish false ERR_NO_MANIFEST; return; }
  PW="$(jget "$ARGS" '.password')"; [ "$PW" = null ] && PW=""
  # an encrypted backup needs the passphrase; tell the UI to prompt for it
  if ls "$REF"/*.age >/dev/null 2>&1 && [ -z "$PW" ]; then finish false ERR_CRYPTO_PASS; return; fi
  # selective restore: .items limits what is restored (empty/absent = everything)
  RITEMS="$(jget "$ARGS" '.items | join(" ")')"; [ "$RITEMS" = null ] && RITEMS=""
  want_item() { [ -z "$RITEMS" ] && return 0; case " $RITEMS " in *" $1 "*) return 0 ;; *) return 1 ;; esac; }
  # integrity
  if [ -f "$M.sha256" ]; then
    want="$(cat "$M.sha256")"; got="$(sha256sum "$M" | cut -d' ' -f1)"
    [ "$want" = "$got" ] || { finish false ERR_MANIFEST_SHA; return; }
  fi
  PKG="$("$JQ" -r '.package.name' "$M")"; U="$("$JQ" -r '.user_id // 0' "$M")"
  case "$U" in ""|*[!0-9]*) U=0 ;; esac
  case "$PKG" in ''|null|*/*|*' '*) finish false ERR_NO_PACKAGE; return ;; esac

  # restore-test: extract every archive into a temp dir under the state dir and report
  # whether each extracts cleanly and its sha256 matches the manifest. Touches no live
  # app dir (/data/data, /data/user_de, ...), no install, no force-stop. Temp removed.
  if [ "$(jget "$ARGS" '.test')" = true ]; then
    prog 5 testing "$PKG"; audit "restore-test start $PKG"
    TDIR="$STATE/staging/rtest.$OPID"; rm -rf "$TDIR"; mkdir -p "$TDIR"
    TERR=""; TTOTAL=0; TFAIL=0
    n="$("$JQ" '.items | length' "$M")"; i=0
    while [ "$i" -lt "${n:-0}" ]; do
      arc="$("$JQ" -r ".items[$i].archive // empty" "$M")"
      want="$("$JQ" -r ".items[$i].sha256 // empty" "$M")"
      i=$((i+1))
      [ -n "$arc" ] || continue
      TTOTAL=$((TTOTAL+1)); af="$REF/$arc"
      [ -s "$af" ] || { TFAIL=$((TFAIL+1)); TERR="$TERR missing:$arc"; continue; }
      if [ -n "$want" ]; then
        got="$(sha256sum "$af" 2>/dev/null | cut -d' ' -f1)"
        [ "$got" = "$want" ] || { TFAIL=$((TFAIL+1)); TERR="$TERR sha:$arc"; continue; }
      fi
      sub="$TDIR/item$i"; mkdir -p "$sub"
      if echo "$arc" | grep -q '\.age$'; then
        if [ -z "$PW" ]; then TFAIL=$((TFAIL+1)); TERR="$TERR nopass:$arc"; continue; fi
        dec_age "$af" | { case "$arc" in
            *.tar.gz*) "$GZIP" -dc ;; *.tar.lz4*) "$ZSTD" -dq --format=lz4 -c ;;
            *.tar.zst*) "$ZSTD" -dqc ;; *) cat ;; esac; } | exec_ns "$TAR" -x -C "$sub" 2>/dev/null \
          || { TFAIL=$((TFAIL+1)); TERR="$TERR extract:$arc"; }
      else
        decomp "$af" | exec_ns "$TAR" -x -C "$sub" 2>/dev/null || { TFAIL=$((TFAIL+1)); TERR="$TERR extract:$arc"; }
      fi
    done
    rm -rf "$TDIR"
    TERR="$(printf '%s' "$TERR" | sed 's/^ *//')"
    "$JQ" -n --arg opid "$OPID" --arg pkg "$PKG" --argjson total "$TTOTAL" --argjson failed "$TFAIL" --arg errs "$TERR" \
      '{opid:$opid,percent:100,phase:"finished",done:true, ok:($failed==0),
        code:(if $failed==0 then "ERR_NONE" else "ERR_RESTORE_TEST" end),
        restore_test:true, package:$pkg, archives:$total, failed:$failed,
        errors:($errs|split(" ")|map(select(length>0)))}' > "$PROG"
    audit "restore-test done $PKG ok=$([ "$TFAIL" = 0 ] && echo true || echo false) failed=$TFAIL"
    return
  fi

  prog 3 fetching "$PKG"; audit "restore start $PKG"; notify restore_start "$PKG"

  freeze "$PKG"

  # install APKs (decompress to /data/local/tmp, never leave raw behind)
  prog 25 installing "$PKG"
  TMP=/data/local/tmp/vdb.$$; mkdir -p "$TMP"
  verifier_off
  RINST="$("$JQ" -r '.package.installer // empty' "$M" 2>/dev/null)"
  SESSION=""; want_item apk && SESSION="$(exec_ns pm install-create $(pm_install_flags) $(installer_flag "$RINST") --user "$U" 2>/dev/null | sed -n 's/.*\[\([0-9]*\)\].*/\1/p')"
  if [ -n "$SESSION" ]; then
    for af in "$REF"/base*.apk.zst* "$REF"/split_*.apk.zst*; do
      [ -e "$af" ] || continue
      outname="$(basename "$af" | sed 's/\.zst\(\.age\)\{0,1\}$//')"
      if echo "$af" | grep -q '\.age$'; then
        [ -n "$PW" ] || { finish false ERR_CRYPTO_PASS; rm -rf "$TMP"; return; }
        dec_age "$af" | "$ZSTD" -dqc > "$TMP/$outname"
      else
        "$ZSTD" -dqc "$af" > "$TMP/$outname"
      fi
      exec_ns pm install-write "$SESSION" "${outname%.apk}" "$TMP/$outname" >/dev/null 2>&1
    done
    exec_ns pm install-commit "$SESSION" >/dev/null 2>&1
  fi
  rm -rf "$TMP"

  # live owner of the freshly installed data dir (uid differs per device)
  wait_datadir "/data/user/$U/$PKG"
  LIVEU="$(stat -c %u "/data/user/$U/$PKG" 2>/dev/null || echo 0)"
  LIVEG="$(stat -c %g "/data/user/$U/$PKG" 2>/dev/null || echo 0)"

  # restore each data item + remap ownership/context
  prog 55 extracting "$PKG"
  n="$("$JQ" '.items | length' "$M")"; i=0
  while [ "$i" -lt "${n:-0}" ]; do
    typ="$("$JQ" -r ".items[$i].type" "$M")"
    want_item "$typ" || { i=$((i+1)); continue; }   # selective restore
    arc="$("$JQ" -r ".items[$i].archive" "$M")"
    ctx="$("$JQ" -r ".items[$i].root_context // empty" "$M")"
    case "$typ" in
      data)     parent="/data/user/$U";                 target="/data/user/$U/$PKG" ;;
      data_de)  parent="/data/user_de/$U";            target="/data/user_de/$U/$PKG" ;;
      external) parent="/data/media/$U/Android/data"; target="/data/media/$U/Android/data/$PKG" ;;
      obb)      parent="/data/media/$U/Android/obb";  target="/data/media/$U/Android/obb/$PKG" ;;
      media)    parent="/data/media/$U/Android/media";target="/data/media/$U/Android/media/$PKG" ;;
      *) i=$((i+1)); continue ;;
    esac
    mkdir -p "$parent"
    af="$REF/$arc"
    [ -s "$af" ] || { i=$((i+1)); continue; }
    # integrity FIRST: verify the archive against the manifest sha BEFORE the
    # destructive wipe, so a corrupt/truncated archive never costs the live data.
    want="$("$JQ" -r ".items[$i].sha256 // empty" "$M")"
    if [ -n "$want" ]; then
      got="$(sha256sum "$af" 2>/dev/null | cut -d' ' -f1)"
      [ "$want" = "$got" ] || { audit "restore sha mismatch $arc"; finish false ERR_VERIFY; return; }
    fi
    # faithful restore: reproduce the backed-up state exactly (wipe then extract),
    # so files created after the backup do not linger. Extraction is checked; a
    # failure after the wipe is reported (never a silent success).
    exec_ns rm -rf "$target" 2>/dev/null
    if echo "$arc" | grep -q '\.age$'; then
      [ -n "$PW" ] || { finish false ERR_CRYPTO_PASS; return; }
      dec_age "$af" | { case "$arc" in
          *.tar.gz*) "$GZIP" -dc ;; *.tar.lz4*) "$ZSTD" -dq --format=lz4 -c ;;
          *.tar.zst*) "$ZSTD" -dqc ;; *) cat ;; esac; } | exec_ns "$TAR" $TARC -x -C "$parent" 2>/dev/null
    else
      decomp "$af" | exec_ns "$TAR" $TARC -x -C "$parent" 2>/dev/null
    fi
    [ $? -eq 0 ] || { audit "restore extract failed $arc"; finish false ERR_RESTORE; return; }
    # remap: app data dirs follow the live uid; media dirs just relabel
    case "$typ" in
      data|data_de)
        [ "$LIVEU" != 0 ] && exec_ns chown -hR "$LIVEU:$LIVEG" "$target" 2>/dev/null
        if [ -n "$ctx" ]; then exec_ns chcon -hR "$ctx" "$target" 2>/dev/null || exec_ns restorecon -R "$target" 2>/dev/null
        else exec_ns restorecon -R "$target" 2>/dev/null; fi ;;
      *) exec_ns restorecon -R "$target" 2>/dev/null ;;
    esac
    i=$((i+1))
  done

  # restore runtime permissions / appops / ssaid (shell; dex helper for richer cases)
  prog 90 framework "$PKG"
  "$JQ" -c '.permissions.runtime[]?' "$M" 2>/dev/null | while IFS= read -r row; do
    name="$(printf '%s' "$row" | "$JQ" -r '.name')"; g="$(printf '%s' "$row" | "$JQ" -r '.granted')"
    [ -n "$name" ] && [ "$name" != null ] || continue
    if [ "$g" = "true" ]; then exec_ns pm grant  --user "$U" "$PKG" "$name" 2>/dev/null
    else                        exec_ns pm revoke --user "$U" "$PKG" "$name" 2>/dev/null; fi
  done
  exec_ns cmd appops reset --user "$U" "$PKG" 2>/dev/null
  "$JQ" -c '.permissions.appops[]?' "$M" 2>/dev/null | while IFS= read -r row; do
    op="$(printf '%s' "$row" | "$JQ" -r '.op')"; mode="$(printf '%s' "$row" | "$JQ" -r '.mode')"
    [ -n "$op" ] && [ "$op" != null ] && [ -n "$mode" ] || continue
    exec_ns cmd appops set --user "$U" "$PKG" "$op" "$mode" 2>/dev/null
  done
  # install-source attribution is applied at install time via install-create -i (see
  # installer_flag); pm set-installer is rejected for uid 0, so nothing to do here.
  # enabled-state fidelity: an app disabled when it was backed up is disabled again.
  # enabled codes: 2=disabled, 3=disabled-by-user (re-disable); others stay enabled.
  REN="$("$JQ" -r '.package.enabled // 0' "$M" 2>/dev/null)"
  case "$REN" in 2|3) exec_ns pm disable-user --user "$U" "$PKG" 2>/dev/null ;; esac
  # deep install-source spoof (OPT-IN per-op): also forge initiatingPackageName +
  # packageSource in packages.xml so the app looks fully Play-installed. Reboot required.
  if want_item apk && [ "$(jget "$ARGS" '.deep_spoof')" = true ]; then
    DSP="$(cfg .spoof_installer_pkg)"; { [ -z "$DSP" ] || [ "$DSP" = null ]; } && DSP=com.android.vending
    deep_spoof_installer "$PKG" "$DSP" || true
  fi
  # ssaid: OPT-IN only (.ssaid arg). Rewrites the device ANDROID_ID file; applies
  # after the next reboot (the settings provider caches it). Edit is validated by a
  # decode round-trip before the live file is overwritten; any failure leaves it untouched.
  SS="$("$JQ" -r '.permissions.ssaid // empty' "$M" 2>/dev/null)"
  if [ "$(jget "$ARGS" '.ssaid')" = true ]; then
    case "$SS" in ''|null|*[!0-9a-fA-F]*) : ;; *) ssaid_restore "$PKG" "$U" "$SS" ;; esac
  elif [ -n "$SS" ] && [ "$SS" != null ]; then
    audit "ssaid present in backup but not opted in $PKG"
  fi
  prog 97 framework "$PKG"
  audit "restore done $PKG"; notify restore_done "$PKG"
  finish true ERR_NONE
}

# Import a backup from another app (Neo-Backup / DataBackup) and restore it through our pipeline.
do_import() {
  FROM="$(jget "$ARGS" '.from')"; REF="$(jget "$ARGS" '.ref')"; U="$(jget "$ARGS" '.user // 0')"; case "$U" in ""|*[!0-9]*) U=0 ;; esac
  case "$FROM" in neo) do_import_neo ;; databackup) do_import_databackup ;; *) finish false ERR_IMPORT_FROM ;; esac
}

# DataBackup (XayahSuSuSu) layout: <ref=apps/<pkg>/user_N>/ with apk.tar.zst (./base.apk,
# ./split_*.apk), user.tar.zst (data, entries <pkg>/...), user_de.tar.zst, data.tar.zst
# (external), obb/media.tar.zst, and package_restore_config.json. No encryption.
do_import_databackup() {
  PKG="$(basename "$(dirname "$REF")")"
  [ -d "$REF" ] || { finish false ERR_NO_BACKUP; return; }
  case "$PKG" in ''|.|null|*/*|*' '*) finish false ERR_NO_PACKAGE; return ;; esac
  prog 5 fetching "$PKG"; audit "import-db start $PKG"; notify restore_start "$PKG"
  freeze "$PKG"
  prog 30 installing "$PKG"
  if [ -f "$REF/apk.tar.zst" ]; then
    TMP="$STATE/staging/dbimp.$OPID"; rm -rf "$TMP"; mkdir -p "$TMP"
    "$ZSTD" -dqc "$REF/apk.tar.zst" | exec_ns "$TAR" -x -C "$TMP" 2>/dev/null
    verifier_off
    SESSION="$(exec_ns pm install-create $(pm_install_flags) $(installer_flag "") --user "$U" 2>/dev/null | sed -n 's/.*\[\([0-9]*\)\].*/\1/p')"
    if [ -n "$SESSION" ]; then
      for apk in "$TMP"/*.apk; do [ -e "$apk" ] || continue
        exec_ns pm install-write "$SESSION" "$(basename "$apk" .apk)" "$apk" >/dev/null 2>&1; done
      exec_ns pm install-commit "$SESSION" >/dev/null 2>&1
    fi
    rm -rf "$TMP"
  fi
  wait_datadir "/data/user/$U/$PKG"
  LIVEU="$(stat -c %u "/data/user/$U/$PKG" 2>/dev/null || echo 0)"; LIVEG="$(stat -c %g "/data/user/$U/$PKG" 2>/dev/null || echo 0)"
  prog 60 extracting "$PKG"
  db_item() { # <archive> <parent> <target>
    f="$REF/$1"; [ -f "$f" ] || return 0
    exec_ns rm -rf "$3" 2>/dev/null                   # faithful: wipe then extract (migration)
    mkdir -p "$2"; decomp "$f" | exec_ns "$TAR" $TARC -x -C "$2" 2>/dev/null
    [ $? -eq 0 ] || { audit "import-db extract failed $1 $PKG"; finish false ERR_RESTORE; return 1; }
    [ "$LIVEU" != 0 ] && exec_ns chown -hR "$LIVEU:$LIVEG" "$3" 2>/dev/null
    exec_ns restorecon -R "$3" 2>/dev/null
  }
  db_item user.tar.zst    "/data/user/$U"                 "/data/user/$U/$PKG"              || return
  db_item user_de.tar.zst "/data/user_de/$U"            "/data/user_de/$U/$PKG"        || return
  db_item data.tar.zst    "/data/media/$U/Android/data" "/data/media/$U/Android/data/$PKG" || return
  db_item obb.tar.zst     "/data/media/$U/Android/obb"  "/data/media/$U/Android/obb/$PKG"  || return
  db_item media.tar.zst   "/data/media/$U/Android/media" "/data/media/$U/Android/media/$PKG" || return
  # runtime permissions + appops from package_restore_config.json
  prog 90 framework "$PKG"
  CFG="$REF/package_restore_config.json"
  if [ -f "$CFG" ]; then
    # recursive descent so it works regardless of where DataBackup nests the array
    "$JQ" -r '[.. | objects | select(.isGranted==true and (.name!=null))] | .[].name' "$CFG" 2>/dev/null | while IFS= read -r perm; do
      [ -n "$perm" ] && exec_ns pm grant --user "$U" "$PKG" "$perm" 2>/dev/null
    done
    # appops: mode int (0 allow,1 ignore,2 deny,3 default) -> name; op may be a name or code
    exec_ns cmd appops reset --user "$U" "$PKG" 2>/dev/null
    "$JQ" -r '[.. | objects | select(.op!=null and .mode!=null)] | .[] | "\(.op)\t\(.mode)"' "$CFG" 2>/dev/null | while IFS="$(printf '\t')" read -r op mode; do
      case "$mode" in 0) m=allow ;; 1) m=ignore ;; 2) m=deny ;; 3) m=default ;; *) continue ;; esac
      [ -n "$op" ] && exec_ns cmd appops set --user "$U" "$PKG" "$op" "$m" 2>/dev/null
    done
  fi
  prog 97 framework "$PKG"; audit "import-db done $PKG"; notify restore_done "$PKG"
  finish true ERR_NONE
}

# Neo-Backup layout: <ref>.properties (JSON) + <ref>/ (data folder with base.apk/split_*.apk
# and <item>.tar.<zst|gz> where item = data|device_protected_files|external_files|obb_files|media_files).
do_import_neo() {
  PROP="$REF.properties"; [ -f "$PROP" ] || { finish false ERR_NO_MANIFEST; return; }
  PKG="$("$JQ" -r '.packageName' "$PROP")"
  case "$PKG" in ''|null|*/*|*' '*) finish false ERR_NO_PACKAGE; return ;; esac
  # The real encryption signal is the per-file .enc suffix, NOT metadata cipherType/iv:
  # recent Neo writes cipherType/iv even when a given backup's archives are left plain.
  ENC=no; ls "$REF"/*.enc >/dev/null 2>&1 && ENC=yes
  COMP="$("$JQ" -r '.compressionType // "zst"' "$PROP")"
  prog 5 fetching "$PKG"; audit "import-neo start $PKG"; notify restore_start "$PKG"
  # Neo AES-256-GCM (PBKDF2-HmacSHA256 iter 2020). Decryption is a real Java Cipher,
  # done by the dex helper (openssl enc has no proper GCM). Password via env (not argv).
  if [ "$ENC" = yes ]; then
    PASS="$(jget "$ARGS" '.password')"; [ "$PASS" = null ] && PASS=""
    SALT="$(jget "$ARGS" '.salt')"; { [ -z "$SALT" ] || [ "$SALT" = null ]; } && SALT="oandbackupx"
    IV="$("$JQ" -c '.iv' "$PROP" 2>/dev/null)"
    { [ -n "$PASS" ] && [ -f "$MODDIR/vdbhelper.dex" ] && [ -n "$IV" ]; } \
      || { finish false ERR_IMPORT_ENCRYPTED; return; }
  fi
  # decrypt a Neo .enc archive to stdout-equivalent temp (plaintext = compressed tar)
  neo_decrypt_to() { # <enc-file> <out-file>  -> 0 on success
    VDB_NEO_PASS="$PASS" LD_LIBRARY_PATH= app_process -Djava.class.path="$MODDIR/vdbhelper.dex" \
      /system/bin ru.vd171.vdbackup.Helper neo-decrypt "$1" "$2" - "$SALT" "$IV" 2>/dev/null \
      | grep -q '"ok":true'
  }
  freeze "$PKG"
  # install APKs if the backup carries them (data-only Neo backups have none)
  prog 30 installing "$PKG"
  APKTMP="$STATE/staging/neo-apk.$OPID"
  if ls "$REF"/base*.apk "$REF"/base*.apk.enc >/dev/null 2>&1; then
    verifier_off
    SESSION="$(exec_ns pm install-create $(pm_install_flags) $(installer_flag "") --user "$U" 2>/dev/null | sed -n 's/.*\[\([0-9]*\)\].*/\1/p')"
    if [ -n "$SESSION" ]; then
      mkdir -p "$APKTMP"
      for apk in "$REF"/base*.apk "$REF"/split_*.apk "$REF"/base*.apk.enc "$REF"/split_*.apk.enc; do
        [ -e "$apk" ] || continue
        src="$apk"
        case "$apk" in
          *.enc) [ "$ENC" = yes ] || continue
                 src="$APKTMP/$(basename "${apk%.enc}")"; neo_decrypt_to "$apk" "$src" || { rm -f "$src"; continue; } ;;
        esac
        exec_ns pm install-write "$SESSION" "$(basename "${src%.apk}")" "$src" >/dev/null 2>&1
      done
      exec_ns pm install-commit "$SESSION" >/dev/null 2>&1
    fi
  fi
  rm -rf "$APKTMP"
  wait_datadir "/data/user/$U/$PKG"
  LIVEU="$(stat -c %u "/data/user/$U/$PKG" 2>/dev/null || echo 0)"; LIVEG="$(stat -c %g "/data/user/$U/$PKG" 2>/dev/null || echo 0)"
  prog 60 extracting "$PKG"
  neo_item() { # <neo-archive-base> <dest-data-dir>
    for ext in "tar.$COMP" tar.zst tar.gz tar; do
      f="$REF/$1.$ext"; src="$f"
      if [ -f "$f.enc" ]; then                       # encrypted archive: decrypt via dex
        src="$STATE/staging/neo.$OPID.$1"; neo_decrypt_to "$f.enc" "$src" || { rm -f "$src"; continue; }
      elif [ -f "$f" ]; then :                        # plain archive
      else continue; fi
      exec_ns rm -rf "$2" 2>/dev/null                 # faithful: wipe then extract (migration)
      mkdir -p "$2"                                    # Neo archives are ./-relative (dir contents)
      { case "$ext" in *.zst) "$ZSTD" -dqc "$src" ;; *.gz) "$GZIP" -dc "$src" ;; *) cat "$src" ;; esac; } \
        | exec_ns "$TAR" $TARC -x -C "$2" 2>/dev/null
      _erc=$?
      [ "$src" != "$f" ] && rm -f "$src"
      [ "$_erc" -eq 0 ] || { audit "import-neo extract failed $1 $PKG"; finish false ERR_RESTORE; return 1; }
      [ "$LIVEU" != 0 ] && exec_ns chown -hR "$LIVEU:$LIVEG" "$2" 2>/dev/null
      exec_ns restorecon -R "$2" 2>/dev/null
      return 0
    done
  }
  neo_item data                   "/data/user/$U/$PKG"                   || return
  neo_item device_protected_files "/data/user_de/$U/$PKG"             || return
  neo_item external_files         "/data/media/$U/Android/data/$PKG"  || return
  neo_item obb_files              "/data/media/$U/Android/obb/$PKG"   || return
  neo_item media_files            "/data/media/$U/Android/media/$PKG" || return
  # runtime permissions from Neo's properties (array of permission name strings)
  prog 90 framework "$PKG"
  "$JQ" -r '(.permissions // [])[]' "$PROP" 2>/dev/null | while IFS= read -r perm; do
    perm="$(printf '%s' "$perm" | tr -d ' ')"
    case "$perm" in android.permission.*|*.permission.*) exec_ns pm grant --user "$U" "$PKG" "$perm" 2>/dev/null ;; esac
  done
  prog 97 framework "$PKG"; audit "import-neo done $PKG"; notify restore_done "$PKG"
  finish true ERR_NONE
}

# ----------------------------------------------------------------------
# Special (system-wide) backups: messages (SMS/MMS), contacts + call log, Wi-Fi,
# Bluetooth. Raw mode archives the owning data/misc paths faithfully (SELinux/xattr
# via $TARC) - restore is same-device/same-ROM faithful. A portable content:// export
# sidecar is produced separately by the dex helper. Restore is reboot-required and
# gated behind heavy UI friction (it overwrites live system state).
special_paths() {   # <category>; echoes each existing owned path, one per line
  case "$1" in
    messages)  set -- /data/data/com.android.providers.telephony /data/user_de/0/com.android.providers.telephony ;;
    contacts)  set -- /data/data/com.android.providers.contacts  /data/user_de/0/com.android.providers.contacts ;;
    wifi)      set -- /data/misc/wifi /data/misc/apexdata/com.android.wifi ;;
    bluetooth) set -- /data/misc/bluedroid /data/misc/bluetooth /data/data/com.android.bluetooth ;;
    *) return 1 ;;
  esac
  for _p in "$@"; do [ -e "$_p" ] && printf '%s\n' "$_p"; done
}

# Portable export sidecar for special backups: read the provider SQLite dbs with the
# bundled sqlite3 (-json, robust against commas/newlines in message bodies, unlike the
# `content` CLI, and no ActivityThread which hangs on A16) and write openable JSON next
# to the raw archives. Reads a COPY of each db so the live one is never locked. The raw
# archive stays the source of truth; this is the cross-device/openable layer.
special_export() {   # <category> <dest-dir>
  _cat="$1"; _ed="$2"
  command -v "$SQLITE" >/dev/null 2>&1 || { audit "portable export: no sqlite3"; return 0; }
  _stg="$STATE/staging/sqx.$OPID"; mkdir -p "$_stg"
  _copy() { exec_ns cp "$1" "$_stg/" 2>/dev/null; }   # copy db (rollback-journal mode: .db alone is consistent)
  _jexport() {  # <db> <sql> <outfile>
    [ -f "$1" ] || return 0
    "$SQLITE" -readonly -json "$1" "$2" > "$3" 2>/dev/null || { "$SQLITE" -json "$1" "$2" > "$3" 2>/dev/null; }
    [ -s "$3" ] || { rm -f "$3"; return 0; }
    # sidecars hold plaintext message bodies/contacts: encrypt them too when the
    # backup is encrypted, so the portable copy never leaks what the archive protects.
    # If encryption fails, DROP the plaintext (never leak) rather than leave it behind.
    if use_special_age; then
      if enc_age "$3.age" < "$3"; then rm -f "$3"
      else rm -f "$3" "$3.age"; audit "portable sidecar encryption failed, dropped ${3##*/}"; fi
    fi
  }
  case "$_cat" in
    messages)
      _db=/data/data/com.android.providers.telephony/databases/mmssms.db
      exec_ns test -f "$_db" && { _copy "$_db"; _jexport "$_stg/mmssms.db" \
        "SELECT _id,thread_id,address,person,date,date_sent,protocol,read,status,type,subject,body,service_center FROM sms ORDER BY date;" \
        "$_ed/sms.json"; } ;;
    contacts)
      _cl=/data/data/com.android.providers.contacts/databases/calllog.db
      exec_ns test -f "$_cl" && { _copy "$_cl"; _jexport "$_stg/calllog.db" \
        "SELECT _id,number,date,duration,type,name,countryiso,geocoded_location FROM calls ORDER BY date;" \
        "$_ed/calls.json"; }
      _cc=/data/data/com.android.providers.contacts/databases/contacts2.db
      exec_ns test -f "$_cc" && { _copy "$_cc"; _jexport "$_stg/contacts2.db" \
        "SELECT rc._id AS contact_id, (SELECT d1.data1 FROM data d1 WHERE d1.raw_contact_id=rc._id AND d1.mimetype_id=(SELECT _id FROM mimetypes WHERE mimetype='vnd.android.cursor.item/name') LIMIT 1) AS name, (SELECT group_concat(d2.data1,';') FROM data d2 WHERE d2.raw_contact_id=rc._id AND d2.mimetype_id=(SELECT _id FROM mimetypes WHERE mimetype='vnd.android.cursor.item/phone_v2')) AS phones, (SELECT group_concat(d3.data1,';') FROM data d3 WHERE d3.raw_contact_id=rc._id AND d3.mimetype_id=(SELECT _id FROM mimetypes WHERE mimetype='vnd.android.cursor.item/email_v2')) AS emails FROM raw_contacts rc WHERE rc.deleted=0;" \
        "$_ed/contacts.json"; } ;;
  esac
  exec_ns rm -rf "$_stg" 2>/dev/null
}

do_special_backup() {
  U=0
  CATS="$(jget "$ARGS" '.categories | join(" ")')"; { [ -z "$CATS" ] || [ "$CATS" = null ]; } && { finish false ERR_NO_CATEGORY; return; }
  COMP="$(jget "$ARGS" '.compression')"; { [ -z "$COMP" ] || [ "$COMP" = null ]; } && COMP="$(cfg .compression)"; [ -n "$COMP" ] || COMP="zstd:10"
  PW="$(jget "$ARGS" '.password')"; [ "$PW" = null ] && PW=""
  PORTABLE="$(jget "$ARGS" '.portable')"   # also emit openable JSON sidecars (default on)
  use_special_age() { [ -n "$PW" ]; }
  prog 2 preparing "special"; audit "special-backup start $CATS"; notify backup_start "special"
  BK="$(backups_dir 0)/.special"; TS="$(date -u +%Y%m%dT%H%M%SZ)"; DEST="$BK/$TS"
  media_own "$(backups_dir 0)"; media_own "$BK"; mkdir -p "$DEST"
  IFILE="$DEST/.items.jsonl"; : > "$IFILE"
  emit_special() {  # <cat> <archive> <srcpath> <ctx> <sha>
    "$JQ" -n --arg category "$1" --arg archive "$2" --arg path "$3" --arg ctx "$4" --arg sha "$5" \
      --arg enc "$(use_special_age && echo age-scrypt || echo none)" --arg comp "$COMP" \
      '{category:$category,archive:$archive,source_path:$path,root_context:$ctx,sha256:$sha,encryption:$enc,compression:$comp}' >> "$IFILE"; }
  pct=10; nc=0; for _c in $CATS; do nc=$((nc+1)); done; [ "$nc" -gt 0 ] || nc=1
  done_c=0
  for cat in $CATS; do
    idx=0
    special_paths "$cat" | while IFS= read -r src; do
      [ -e "$src" ] || continue
      idx=$((idx+1))
      parent="$(dirname "$src")"; base="$(basename "$src")"
      ctx="$(ls -Zd "$src" 2>/dev/null | cut -d' ' -f1)"
      ext="$(comp_ext "$COMP")"; arc="$cat.$idx.$ext"; use_special_age && arc="$arc.age"
      if use_special_age; then
        exec_ns "$TAR" $TARC -C "$parent" -c "$base" 2>/dev/null | comp "$COMP" | enc_age "$DEST/$arc" \
          || { audit "special archive failed $cat:$src"; continue; }
      else
        exec_ns "$TAR" $TARC -C "$parent" -c "$base" 2>/dev/null | comp "$COMP" > "$DEST/$arc" \
          || { audit "special archive failed $cat:$src"; continue; }
      fi
      sha="$(sha256sum "$DEST/$arc" 2>/dev/null | cut -d' ' -f1)"
      emit_special "$cat" "$arc" "$src" "$ctx" "$sha"
    done
    [ "$PORTABLE" != false ] && special_export "$cat" "$DEST"
    done_c=$((done_c+1)); prog $(( 10 + done_c * 80 / nc )) archiving "$cat"
  done
  prog 92 manifest "special"
  FP="$(getprop ro.build.fingerprint)"; SDK="$(getprop ro.build.version.sdk)"; SEL="$(getenforce 2>/dev/null | tr 'A-Z' 'a-z')"
  "$JQ" -n --arg producer "VDBackup $(sed -n 's/^version=//p' "$MODDIR/module.prop")" \
    --arg created "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --argjson epoch "$(date +%s)" \
    --arg fp "$FP" --argjson sdk "${SDK:-0}" --arg abi "$abi" --arg sel "${SEL:-unknown}" \
    --arg cats "$CATS" --slurpfile items "$IFILE" \
    '{format_version:1, kind:"special", producer:$producer, created_at:$created, created_epoch:$epoch,
      device:{fingerprint:$fp, sdk:$sdk, abi:$abi, selinux:$sel},
      categories:($cats|split(" ")), items:$items}' > "$DEST/manifest.json"
  rm -f "$IFILE"
  sha256sum "$DEST/manifest.json" | cut -d' ' -f1 > "$DEST/manifest.json.sha256"
  media_own -R "$DEST"
  [ -s "$DEST/manifest.json" ] || { finish false ERR_BACKUP; return; }
  audit "special-backup done $CATS -> $DEST"; notify backup_done "special"
  finish true ERR_NONE
}

do_special_restore() {
  REF="$(jget "$ARGS" '.ref')"
  case "$REF" in /data/media/*/VDBackup/.special/*) : ;; *) finish false ERR_BAD_REF; return ;; esac
  M="$REF/manifest.json"; [ -f "$M" ] || { finish false ERR_NO_BACKUP; return; }
  [ "$(jget "$ARGS" '.confirm')" = true ] || { finish false ERR_CONFIRM; return; }   # heavy-friction gate
  PW="$(jget "$ARGS" '.password')"; [ "$PW" = null ] && PW=""
  if "$JQ" -e '[.items[]?|select(.encryption=="age-scrypt")]|length>0' "$M" >/dev/null 2>&1 && [ -z "$PW" ]; then
    finish false ERR_CRYPTO_PASS; return; fi
  WANTC="$(jget "$ARGS" '.categories | join(" ")')"; [ "$WANTC" = null ] && WANTC=""
  want_cat() { [ -z "$WANTC" ] && return 0; case " $WANTC " in *" $1 "*) return 0 ;; *) return 1 ;; esac; }
  prog 5 preparing "special"; audit "special-restore start $REF"; notify restore_start "special"
  n="$("$JQ" '.items | length' "$M")"; i=0
  while [ "$i" -lt "${n:-0}" ]; do
    cat="$("$JQ" -r ".items[$i].category // empty" "$M")"
    arc="$("$JQ" -r ".items[$i].archive // empty" "$M")"
    src="$("$JQ" -r ".items[$i].source_path // empty" "$M")"
    enc="$("$JQ" -r ".items[$i].encryption // \"none\"" "$M")"
    i=$((i+1))
    { [ -z "$arc" ] || [ -z "$src" ]; } && continue
    want_cat "$cat" || continue
    case "$src" in /data/*) : ;; *) audit "special-restore skip unsafe path $src"; continue ;; esac
    parent="$(dirname "$src")"; base="$(basename "$src")"
    prog $(( 10 + i * 80 / (n>0?n:1) )) extracting "$cat"
    exec_ns rm -rf "$src" 2>/dev/null
    mkdir -p "$parent"
    if [ "$enc" = age-scrypt ]; then dec_age "$REF/$arc" | decomp "$arc" | exec_ns "$TAR" $TARC -x -C "$parent" 2>/dev/null
    else decomp "$REF/$arc" | exec_ns "$TAR" $TARC -x -C "$parent" 2>/dev/null; fi
    [ $? -eq 0 ] || { audit "special-restore extract failed $cat:$arc"; finish false ERR_RESTORE; return; }
    exec_ns restorecon -R "$src" 2>/dev/null
  done
  prog 97 framework "special"; audit "special-restore done $REF (reboot required)"; notify restore_done "special"
  finish true ERR_NONE
}

# mark the operation live immediately, before any (possibly slow) validation, so the
# UI never sits on a stale "starting" while the first guard/dumpsys runs.
case "$VERB" in backup|restore|import|special-backup|special-restore) prog 2 preparing "" ;; esac
case "$VERB" in
  backup)          backup ;;
  restore)         restore ;;
  import)          do_import ;;
  special-backup)  do_special_backup ;;
  special-restore) do_special_restore ;;
  *)               finish false ERR_UNKNOWN_VERB ;;
esac
