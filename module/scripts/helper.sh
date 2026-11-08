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
#  Command dispatcher called by the WebUI as:
#     ksu.exec("sh $MODDIR/scripts/helper.sh <verb> <base64-json-args>")
#  Prints a single JSON object on stdout. Long operations (backup/restore)
#  are detached (setsid) so closing the WebUI never interrupts them.

d="${0%/*}"; [ "$d" = "$0" ] && d="."; MODDIR="$(cd "$d/.." 2>/dev/null && pwd || echo "${d%/*}")"
STATE=/data/adb/vdbackup
bdir() { case "$1" in ''|*[!0-9]*) set -- 0 ;; esac; printf '/data/media/%s/VDBackup' "$1"; }  # /sdcard/VDBackup per Android user (credential-encrypted)
export RCLONE_CONFIG="$STATE/rclone.conf"
LOGS="$STATE/logs"

# --- resolve ABI and bundled-binary PATH --------------------------------
abi="$(getprop ro.product.cpu.abi)"
case "$abi" in
  arm64-v8a)   BINABI=arm64-v8a   ;;
  armeabi-v7a) BINABI=armeabi-v7a ;;
  x86_64)      BINABI=x86_64      ;;
  x86)         BINABI=x86         ;;
  *)           BINABI=arm64-v8a   ;;
esac
BIN="$MODDIR/bin/$BINABI"
export PATH="$BIN:$PATH"
export LD_LIBRARY_PATH="$BIN/lib:${LD_LIBRARY_PATH:-}"

HELPER_DEX="$MODDIR/etc/vdbackup_helper.dex"
[ -f "$HELPER_DEX" ] || HELPER_DEX="$MODDIR/vdbhelper.dex"
COMPANION_APK="$MODDIR/etc/companion.apk"
[ -f "$COMPANION_APK" ] || COMPANION_APK="$MODDIR/companion.apk"

mkdir -p "$LOGS"

# --- tiny JSON helpers (no jq dependency) -------------------------------
jstr() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/\t/\\t/g'; }
ok()   { printf '{"ok":true,%s}\n'  "$1"; }
err()  { printf '{"ok":false,"code":"%s","message":"%s"}\n' "$1" "$(jstr "$2")"; }

new_opid() { printf 'op-%s-%s' "$(date +%s)" "$$"; }

# --- detach a long operation (survives WebUI close) ---------------------
detach() {               # detach <opid> <worker-verb> <b64args>
  opid="$1"; wverb="$2"; wargs="$3"
  # seed a concrete progress state so the UI shows "starting" instantly instead of
  # an empty file (the worker overwrites it with the first real phase right away).
  printf '{"opid":"%s","percent":0,"phase":"starting","item":"","done":false}\n' "$opid" > "$LOGS/progress-$opid.json"
  setsid nohup "$MODDIR/scripts/worker.sh" "$wverb" "$opid" "$wargs" \
      >"$LOGS/$opid.out" 2>&1 </dev/null &
  echo "$!" > "$LOGS/$opid.pid"
}

# --- scheduling helpers -------------------------------------------------
# Schedule format stored as jobs/<id>.json: a "cron" keyword giving the base
# period plus an optional "at" wall-clock time "HH:MM".
#   hourly           every hour (interval only)
#   daily            every 24h, or once/day at "at" when set
#   weekly           every 7d,  or once/week at "at" when set
#   "HH:MM" as cron  shorthand for daily at that time
# Without "at": DUE when now-last_run >= period. With "at": DUE when the wall
# clock has reached HH:MM today AND at least half a period passed since
# last_run (blocks a double-fire, still lets the next period fire on its day).
strip0() { _v="$1"; while [ -n "$_v" ] && [ "${_v#0}" != "$_v" ]; do _v="${_v#0}"; done; [ -n "$_v" ] || _v=0; printf '%s' "$_v"; }

is_due() {
  _cron="$1"; _at="$2"; _last="$3"; _now="$4"
  case "$_cron" in [0-9][0-9]:[0-9][0-9]) _at="$_cron"; _cron=daily ;; esac
  case "$_cron" in
    hourly) [ $(( _now - _last )) -ge 3600 ]; return $? ;;
    weekly) _period=604800 ;;
    *)      _period=86400 ;;
  esac
  if [ -n "$_at" ] && [ "$_at" != null ]; then
    _h="$(strip0 "${_at%%:*}")"; _m="$(strip0 "${_at#*:}")"
    _secs=$(( $(strip0 "$(date +%H)") * 3600 + $(strip0 "$(date +%M)") * 60 + $(strip0 "$(date +%S)") ))
    _sched=$(( _now - _secs + _h * 3600 + _m * 60 ))
    [ "$_now" -ge "$_sched" ] && [ $(( _now - _last )) -ge $(( _period / 2 )) ]
    return $?
  fi
  [ $(( _now - _last )) -ge "$_period" ]
}

# Retention: keep the newest <keep> backups under backups/<pkg>, delete the
# rest. Backup dir names are UTC timestamps, so reverse lexical sort is
# newest-first. Only ever removes paths under the backups dir (delete-backup
# guard). Echoes one "pkg/dir" line per pruned backup.
prune_pkg() {                                    # <user> <pkg> <keep>
  _bk="$(bdir "$1")"; shift
  case "$1" in ''|*..*|*/*) return 0 ;; esac    # never let a crafted package name escape the backups dir
  _d="$_bk/$1"; [ -d "$_d" ] || return 0
  _keep="$2"; case "$_keep" in ''|*[!0-9]*) _keep=5 ;; esac
  _n=0
  for _sub in $(ls -1 "$_d" 2>/dev/null | sort -r); do
    [ -d "$_d/$_sub" ] || continue
    _n=$(( _n + 1 ))
    [ "$_n" -gt "$_keep" ] || continue
    case "$_d/$_sub" in
      "$_bk/"*) rm -rf "$_d/$_sub" && printf '%s/%s\n' "$1" "$_sub" ;;
    esac
  done
}

# Auto-backup observer: when enabled in config, each scheduler tick compares the
# installed user apps (package + versionCode) against the last-seen snapshot and
# backs up any app that is new or whose versionCode changed. The first run only
# seeds the snapshot (never mass-backs-up an existing device). Honors the blocklist.
# Framework-free degradation: without the dex helper only new installs are seen
# (no versionCode), so updates are missed but installs still trigger.
auto_backup_scan() {                              # <jq> <now>; echoes detached opids
  _jq="$1"; _now="$2"
  [ -f "$STATE/config.json" ] || return 0
  _on="$("$_jq" -r '.auto_backup // false' "$STATE/config.json" 2>/dev/null)"
  [ "$_on" = true ] || return 0
  _mode="$("$_jq" -r '.auto_backup_mode // .default_mode // "full"' "$STATE/config.json")"
  _dest="$("$_jq" -r '.auto_backup_dest // .default_dest // "local"' "$STATE/config.json")"
  _keep="$("$_jq" -r '.auto_backup_keep // 5' "$STATE/config.json")"; case "$_keep" in ''|*[!0-9]*) _keep=5 ;; esac
  _u="$("$_jq" -r '.user // 0' "$STATE/config.json")"; case "$_u" in ''|*[!0-9]*) _u=0 ;; esac
  _seen="$STATE/autobackup_seen.json"
  _cur="$STATE/staging/autobackup_cur.$$.json"; mkdir -p "$STATE/staging"
  # current user apps as {pkg:vc}; dex gives versionCode, pm fallback gives vc=0
  if [ -f "$HELPER_DEX" ]; then
    LD_LIBRARY_PATH= app_process -Djava.class.path="$HELPER_DEX" /system/bin \
      ru.vd171.vdbackup.Helper list-apps "$_u" 2>/dev/null \
      | "$_jq" -c '[.apps[]? | select(.system|not) | {(.package): (.versionCode // 0)}] | add // {}' > "$_cur" 2>/dev/null
  else
    pm list packages -3 --user "$_u" 2>/dev/null | sed 's/^package://' \
      | "$_jq" -R -s 'split("\n")|map(select(length>0))|map({(.):0})|add // {}' > "$_cur" 2>/dev/null
  fi
  [ -s "$_cur" ] || { rm -f "$_cur"; return 0; }
  if [ ! -f "$_seen" ]; then cp "$_cur" "$_seen"; chmod 600 "$_seen"; rm -f "$_cur"; return 0; fi   # seed only
  # packages whose vc is new or changed vs the snapshot, minus the blocklist
  _changed="$("$_jq" -r --slurpfile seen "$_seen" '
      ($seen[0] // {}) as $s | to_entries
      | map(select(($s[.key] // null) != .value)) | .[].key' "$_cur" 2>/dev/null)"
  _n=0
  for _pkg in $_changed; do
    case "$_pkg" in ''|*..*|*/*|*' '*) continue ;; esac
    "$_jq" -e --arg p "$_pkg" '((.blocklist // []) | index($p)) != null' "$STATE/config.json" >/dev/null 2>&1 && continue
    _j="$("$_jq" -nc --arg p "$_pkg" --argjson u "$_u" --arg m "$_mode" --arg d "$_dest" \
        '{package:$p,user:$u,mode:$m,dest:$d,items:["apk","data","data_de","obb","external","media"],auto:true}')"
    _b64="$(printf '%s' "$_j" | base64 | tr -d '\n')"
    _n=$(( _n + 1 )); _opid="$(new_opid)-auto$_n"
    detach "$_opid" backup "$_b64"
    printf '{"ts":"%s","op":"auto-backup","opid":"%s","package":"%s"}\n' \
      "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(jstr "$_opid")" "$(jstr "$_pkg")" >> "$LOGS/audit.jsonl"
    for _r in $(prune_pkg "$_u" "$_pkg" "$_keep"); do :; done
    printf '%s\n' "$_opid"
  done
  cp "$_cur" "$_seen"; chmod 600 "$_seen"; rm -f "$_cur"
}

# resolve a schedule job's target packages: explicit list (.packages), single (.package),
# or every user-3 app (.all), always minus the blocklist. Echoes one package per line.
job_targets() {                                   # <jq> <jobfile>
  _jq="$1"; _jf="$2"
  _ju="$("$_jq" -r '.user // 0' "$_jf" 2>/dev/null)"; case "$_ju" in ''|*[!0-9]*) _ju=0 ;; esac
  if [ "$("$_jq" -r '.all // false' "$_jf" 2>/dev/null)" = true ]; then
    pm list packages -3 --user "$_ju" 2>/dev/null | sed 's/^package://'
  else
    "$_jq" -r '([(.package // empty)] + (.packages // [])) | .[] | select(. != "")' "$_jf" 2>/dev/null
  fi | while IFS= read -r _p; do
    case "$_p" in ''|*..*|*/*|*' '*) continue ;; esac
    "$_jq" -e --arg p "$_p" '((.blocklist // []) | index($p)) != null' "$STATE/config.json" >/dev/null 2>&1 && continue
    printf '%s\n' "$_p"
  done
}
# newest backup ref (dir holding manifest.json) for a package, for restore jobs
latest_ref() {                                    # <user> <pkg>
  _ld="$(bdir "$1")/$2"; [ -d "$_ld" ] || return 0
  for _c in $(ls -1 "$_ld" 2>/dev/null | sort -r); do
    [ -f "$_ld/$_c/manifest.json" ] && { printf '%s\n' "$_ld/$_c"; return 0; }
  done
}

# --- scheduler gate probes (used by scheduler-tick; scheduler-launched ops only) ----
# active transport is wifi? dumpsys connectivity, else the default-route interface.
sched_is_wifi() {
  _sd="$(dumpsys connectivity 2>/dev/null)"
  _sid="$(printf '%s' "$_sd" | sed -n 's/.*[Aa]ctive default network[^0-9]*\([0-9][0-9]*\).*/\1/p' | head -1)"
  if [ -n "$_sid" ]; then
    case "$(printf '%s' "$_sd" | grep -m1 "network{$_sid}")" in
      *TRANSPORT_WIFI*)     return 0 ;;
      *TRANSPORT_CELLULAR*) return 1 ;;
    esac
  fi
  case "$(printf '%s' "$_sd" | grep -iE 'type: WIFI.*CONNECTED' | head -1)" in *WIFI*) return 0 ;; esac
  case "$(ip route show default 2>/dev/null | sed -n 's/.* dev \([^ ]*\).*/\1/p' | head -1)" in wlan*) return 0 ;; esac
  return 1
}
# charging now? dumpsys battery: any power source, or status charging(2)/full(5).
sched_charging() {
  _sb="$(dumpsys battery 2>/dev/null)"
  case "$_sb" in
    *"AC powered: true"*|*"USB powered: true"*|*"Wireless powered: true"*|*"Dock powered: true"*) return 0 ;;
  esac
  case "$(printf '%s' "$_sb" | sed -n 's/.*status: \([0-9][0-9]*\).*/\1/p' | head -1)" in 2|5) return 0 ;; esac
  return 1
}
# battery level 0-100; an unknown reading returns 100 so it never blocks.
sched_batt_level() {
  _sl="$(dumpsys battery 2>/dev/null | sed -n 's/.*level: \([0-9][0-9]*\).*/\1/p' | head -1)"
  case "$_sl" in ''|*[!0-9]*) printf '100' ;; *) printf '%s' "$_sl" ;; esac
}
# any thermal zone at/above its own critical/hot trip (or an 85C fallback)? Robust
# across ROMs: unreadable/non-numeric zones are no constraint.
sched_too_hot() {
  for _tz in /sys/class/thermal/thermal_zone*/temp; do
    [ -r "$_tz" ] || continue
    _tzv="$(cat "$_tz" 2>/dev/null)"; case "$_tzv" in ''|*[!0-9]*) continue ;; esac
    _tzc=85000; _tzd="${_tz%/temp}"
    for _tp in "$_tzd"/trip_point_*_type; do
      [ -r "$_tp" ] || continue
      case "$(cat "$_tp" 2>/dev/null)" in
        critical|hot)
          _tpv="$(cat "${_tp%_type}_temp" 2>/dev/null)"
          case "$_tpv" in ''|*[!0-9]*) ;; *) _tzc="$_tpv"; break ;; esac ;;
      esac
    done
    [ "$_tzv" -ge "$_tzc" ] && return 0
  done
  return 1
}

verb="$1"; ARGS_B64="$2"

case "$verb" in

  ping)
    ok "\"version\":\"$(sed -n 's/^version=//p' "$MODDIR/module.prop")\",\"abi\":\"$abi\"" ;;

  update-check)
    # fetch the published update manifest (module.prop updateJson) and compare its
    # versionCode with the installed one. Runs outside the webview (no CSP), on explicit
    # user action only. The actual update is done by the root manager. Fetch prefers the
    # bundled curl; if curl is absent (e.g. a build without it) it falls back to the
    # bundled rclone's on-the-fly http backend (no remote config needed), so the check
    # works on any device with network, not only where curl is shipped.
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    cur_ver="$(sed -n 's/^version=//p' "$MODDIR/module.prop")"
    cur_code="$(sed -n 's/^versionCode=//p' "$MODDIR/module.prop")"; case "$cur_code" in ''|*[!0-9]*) cur_code=0 ;; esac
    url="$(sed -n 's/^updateJson=//p' "$MODDIR/module.prop")"
    [ -n "$url" ] || { err ERR_UPDATE_CHECK "no updateJson url"; exit 0; }
    j=""
    if [ -x "$BIN/curl" ] || [ -x "$STATE/bin/curl" ] || command -v curl >/dev/null 2>&1; then
      _curl="$(command -v "$BIN/curl" 2>/dev/null || command -v "$STATE/bin/curl" 2>/dev/null || echo curl)"
      j="$("$_curl" -fsSL --max-time 20 "$url" 2>/dev/null)"
    fi
    if [ -z "$j" ]; then
      _rcl="$(command -v "$BIN/rclone" 2>/dev/null || command -v "$STATE/bin/rclone" 2>/dev/null || echo rclone)"
      j="$("$_rcl" cat ":http:${url##*/}" --http-url "${url%/*}" --timeout 20s 2>/dev/null)"
    fi
    [ -n "$j" ] || { err ERR_UPDATE_CHECK "could not fetch the update manifest"; exit 0; }
    lv="$(printf '%s' "$j" | "$JQ" -r '.version // empty' 2>/dev/null)"
    lc="$(printf '%s' "$j" | "$JQ" -r '.versionCode // 0' 2>/dev/null)"; case "$lc" in ''|*[!0-9]*) lc=0 ;; esac
    { [ -n "$lv" ] && [ "$lc" -gt 0 ]; } || { err ERR_UPDATE_CHECK "invalid update manifest"; exit 0; }
    zu="$(printf '%s' "$j" | "$JQ" -r '.zipUrl // empty' 2>/dev/null)"
    cl="$(printf '%s' "$j" | "$JQ" -r '.changelog // empty' 2>/dev/null)"
    nt="$(printf '%s' "$j" | "$JQ" -r '.notes // empty' 2>/dev/null)"
    upd=false; [ "$lc" -gt "$cur_code" ] && upd=true
    "$JQ" -nc --arg cv "$cur_ver" --argjson cc "$cur_code" --arg lv "$lv" --argjson lc "$lc" \
      --argjson ua "$upd" --arg zu "$zu" --arg cl "$cl" --arg nt "$nt" \
      '{ok:true, current_version:$cv, current_code:$cc, latest_version:$lv, latest_code:$lc,
        update_available:$ua, zipUrl:$zu, changelog:$cl, notes:$nt}' ;;

  config-get)
    if [ -f "$STATE/config.json" ]; then cat "$STATE/config.json"; else echo '{}'; fi ;;

  config-set)
    printf '%s' "$ARGS_B64" | base64 -d > "$STATE/config.json" && chmod 600 "$STATE/config.json" \
      && ok '"saved":true' || err ERR_CONFIG_WRITE "could not write config" ;;

  keygen)
    # device age keypair for unattended (recipient) encryption; private key stays local
    KG="$(command -v "$BIN/age-keygen" 2>/dev/null || echo age-keygen)"
    mkdir -p "$STATE/keys"; chmod 700 "$STATE/keys"
    if [ -f "$STATE/keys/age.key" ]; then
      ok "\"exists\":true,\"public\":\"$(sed -n 's/^# public key: //p' "$STATE/keys/age.key" | head -1)\""
    else
      "$KG" -o "$STATE/keys/age.key" 2>/dev/null \
        && sed -n 's/^# public key: //p' "$STATE/keys/age.key" | head -1 > "$STATE/keys/age.pub" \
        && chmod 600 "$STATE/keys/age.key" "$STATE/keys/age.pub" \
        && ok "\"created\":true,\"public\":\"$(cat "$STATE/keys/age.pub")\"" \
        || err ERR_KEYGEN "age-keygen failed (is the age binary bundled?)"
    fi ;;

  list-users)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    printf '{"ok":true,"users":['
    first=1
    pm list users 2>/dev/null | sed -n 's/.*UserInfo{\([0-9][0-9]*\):\([^:]*\):.*/\1\t\2/p' | while IFS="$(printf '\t')" read -r uid uname; do
      [ "$first" = 1 ] || printf ','; first=0
      printf '{"id":%s,"name":"%s"}' "$uid" "$(jstr "$uname")"
    done
    printf ']}\n' ;;

  list-apps)
    u="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | \
         "$(command -v "$BIN/jq" 2>/dev/null || echo jq)" -r '.user // 0' 2>/dev/null)"
    case "$u" in ''|*[!0-9]*) u=0 ;; esac
    # delegates to the dex framework helper when available, else pm fallback
    if [ -f "$HELPER_DEX" ]; then
      LD_LIBRARY_PATH= app_process -Djava.class.path="$HELPER_DEX" /system/bin \
        ru.vd171.vdbackup.Helper list-apps "$u" 2>/dev/null && exit 0
    fi
    # shell fallback: package name + apk path
    printf '{"ok":true,"source":"shell","apps":['
    first=1
    pm list packages -f --user "$u" 2>/dev/null | sed 's/^package://' | while IFS= read -r line; do
      path="${line%=*}"; pkg="${line##*=}"
      [ "$first" = 1 ] || printf ','; first=0
      printf '{"package":"%s","base":"%s"}' "$(jstr "$pkg")" "$(jstr "$path")"
    done
    printf ']}\n' ;;

  icon)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    j="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"
    pkg="$(printf '%s' "$j" | "$JQ" -r '.package // empty' 2>/dev/null)"
    u="$(printf '%s' "$j" | "$JQ" -r '.user // 0' 2>/dev/null)"; case "$u" in ''|*[!0-9]*) u=0 ;; esac
    vc="$(printf '%s' "$j" | "$JQ" -r '.vc // 0' 2>/dev/null)"; case "$vc" in ''|*[!0-9]*) vc=0 ;; esac
    case "$pkg" in ''|*/*|*..*|*' '*) err ERR_ICON "invalid package"; exit 0 ;; esac
    mkdir -p "$STATE/iconcache" 2>/dev/null
    # cache key includes versionCode so the icon refreshes when the app updates;
    # drop any stale entry cached under an older versionCode for this package.
    png="$STATE/iconcache/$pkg-$vc.png"
    if [ ! -s "$png" ]; then
      for old in "$STATE/iconcache/$pkg-"*.png; do
        [ -e "$old" ] && [ "$old" != "$png" ] && rm -f "$old"
      done
    fi
    if [ ! -s "$png" ] && [ -f "$HELPER_DEX" ]; then
      LD_LIBRARY_PATH= app_process -Djava.class.path="$HELPER_DEX" /system/bin \
        ru.vd171.vdbackup.Helper icon "$pkg" "$png" "$u" >/dev/null 2>&1
    fi
    if [ -s "$png" ]; then ok "\"package\":\"$(jstr "$pkg")\",\"icon\":\"$(base64 -w0 < "$png")\""
    else err ERR_ICON "no icon"; fi ;;

  icons)
    # batch icons: render every missing one in ONE app_process, then return a
    # {package:base64} map. Amortizes the JVM startup that made per-icon loads slow.
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    j="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"
    u="$(printf '%s' "$j" | "$JQ" -r '.user // 0' 2>/dev/null)"; case "$u" in ''|*[!0-9]*) u=0 ;; esac
    mkdir -p "$STATE/iconcache" "$STATE/staging" 2>/dev/null
    TAB="$(printf '\t')"
    lst="$STATE/staging/icons.$$.lst"; : > "$lst"
    printf '%s' "$j" | "$JQ" -r '.items[]? | "\(.package // "")\t\(.vc // 0)"' 2>/dev/null | while IFS="$TAB" read -r pkg vc; do
      case "$pkg" in ''|*/*|*..*|*' '*) continue ;; esac
      case "$vc" in ''|*[!0-9]*) vc=0 ;; esac
      png="$STATE/iconcache/$pkg-$vc.png"
      if [ ! -s "$png" ]; then
        for old in "$STATE/iconcache/$pkg-"*.png; do [ -e "$old" ] && [ "$old" != "$png" ] && rm -f "$old"; done
        printf '%s\t%s\n' "$pkg" "$png" >> "$lst"
      fi
    done
    if [ -s "$lst" ] && [ -f "$HELPER_DEX" ]; then
      LD_LIBRARY_PATH= app_process -Djava.class.path="$HELPER_DEX" /system/bin \
        ru.vd171.vdbackup.Helper icons "$u" "$lst" >/dev/null 2>&1
    fi
    rm -f "$lst"
    printf '{"ok":true,"icons":{'
    first=1
    printf '%s' "$j" | "$JQ" -r '.items[]? | "\(.package // "")\t\(.vc // 0)"' 2>/dev/null | while IFS="$TAB" read -r pkg vc; do
      case "$pkg" in ''|*/*|*..*|*' '*) continue ;; esac
      case "$vc" in ''|*[!0-9]*) vc=0 ;; esac
      png="$STATE/iconcache/$pkg-$vc.png"; [ -s "$png" ] || continue
      [ "$first" = 1 ] || printf ','; first=0
      printf '"%s":"%s"' "$(jstr "$pkg")" "$(base64 -w0 < "$png")"
    done
    printf '}}\n' ;;

  backup|restore|import|special-backup|special-restore|cloud-fetch|path-backup|path-restore|telegram-download)
    opid="$(new_opid)"
    detach "$opid" "$verb" "$ARGS_B64"
    ok "\"opid\":\"$opid\"" ;;

  cloud-status)
    # what cloud binaries are available (embedded in bin/ or fetched into $STATE/bin),
    # and whether this (lite) build can fetch them on demand + the download size.
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    has_r=false; { [ -x "$BIN/rclone" ] || [ -x "$STATE/bin/rclone" ]; } && has_r=true
    has_s=false; { [ -x "$BIN/restic" ] || [ -x "$STATE/bin/restic" ]; } && has_s=true
    fetchable=false; size=0
    if [ -f "$MODDIR/etc/cloud_addons.json" ]; then
      url="$("$JQ" -r --arg a "$BINABI" '.[$a].url // empty' "$MODDIR/etc/cloud_addons.json" 2>/dev/null)"
      [ -n "$url" ] && fetchable=true
      size="$("$JQ" -r --arg a "$BINABI" '.[$a].size // 0' "$MODDIR/etc/cloud_addons.json" 2>/dev/null)"
      case "$size" in ''|*[!0-9]*) size=0 ;; esac
    fi
    "$JQ" -nc --argjson r "$has_r" --argjson s "$has_s" --argjson f "$fetchable" --argjson sz "$size" \
      '{ok:true,rclone:$r,restic:$s,fetchable:$f,size:$sz}' ;;

  special-categories)
    # available special-backup categories + whether each has data on this device.
    # dns/system_settings are settings-based (not path-based); system_settings is
    # opt-in (it overwrites device settings on restore, gated by .system_settings).
    avail() { for p in "$@"; do [ -e "$p" ] && { echo true; return; }; done; echo false; }
    m="$(avail /data/data/com.android.providers.telephony /data/user_de/0/com.android.providers.telephony)"
    c="$(avail /data/data/com.android.providers.contacts /data/user_de/0/com.android.providers.contacts)"
    w="$(avail /data/misc/wifi /data/misc/apexdata/com.android.wifi)"
    b="$(avail /data/misc/bluedroid /data/misc/bluetooth /data/data/com.android.bluetooth)"
    cal="$(avail /data/data/com.android.providers.calendar /data/user_de/0/com.android.providers.calendar)"
    wp="$(avail /data/system/users/0/wallpaper /data/system/users/0/wallpaper_lock /data/system/users/0/wallpaper_info.xml)"
    dnsmode="$(env -u LD_LIBRARY_PATH /system/bin/settings get global private_dns_mode 2>/dev/null)"
    dns=false; case "$dnsmode" in ''|null) ;; *) dns=true ;; esac
    printf '{"ok":true,"categories":[{"id":"messages","available":%s},{"id":"contacts","available":%s},{"id":"wifi","available":%s},{"id":"bluetooth","available":%s},{"id":"calendar","available":%s},{"id":"wallpaper","available":%s},{"id":"dns","available":%s},{"id":"system_settings","available":true,"opt_in":true}]}\n' "$m" "$c" "$w" "$b" "$cal" "$wp" "$dns" ;;

  special-list)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    _bk="$(bdir 0)/.special"
    printf '{"ok":true,"backups":['
    first=1
    for m in "$_bk"/*/manifest.json; do
      [ -f "$m" ] || continue
      [ "$first" = 1 ] || printf ','; first=0
      ref="$(dirname "$m")"
      "$JQ" -c --arg ref "$ref" '{ref:$ref, created_at:.created_at, categories:.categories}' "$m" 2>/dev/null
    done
    printf ']}\n' ;;

  progress)
    opid="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"
    f="$LOGS/progress-$opid.json"
    if [ -s "$f" ]; then cat "$f"; else ok "\"opid\":\"$(jstr "$opid")\",\"percent\":0,\"phase\":\"starting\""; fi ;;

  cancel)
    opid="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"
    pid="$(cat "$LOGS/$opid.pid" 2>/dev/null)"
    if [ -n "$pid" ]; then kill -TERM -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null; fi
    ok "\"cancelled\":\"$(jstr "$opid")\"" ;;

  list-ops)
    # active operations, so the UI can reattach after being reopened
    printf '{"ok":true,"ops":['
    first=1
    for p in "$LOGS"/*.pid; do
      [ -e "$p" ] || continue
      id="$(basename "$p" .pid)"
      [ "$first" = 1 ] || printf ','; first=0
      printf '{"opid":"%s","progress":%s}' "$(jstr "$id")" "$(cat "$LOGS/progress-$id.json" 2>/dev/null || echo '{}')"
    done
    printf ']}\n' ;;

  import-scan)
    # list importable backups from another app (read-only). from=neo|databackup
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    a="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"
    from="$(printf '%s' "$a" | "$JQ" -r '.from // "neo"')"
    path="$(printf '%s' "$a" | "$JQ" -r '.path // empty')"
    case "$from" in
      neo)
        [ -n "$path" ] || path=/storage/emulated/0/NeoBackup
        printf '{"ok":true,"from":"neo","backups":['
        first=1
        for prop in "$path"/*/*.properties; do
          [ -f "$prop" ] || continue
          dir="${prop%.properties}"
          # encryption is the per-file .enc suffix, not metadata cipherType/iv
          enc=false; ls "$dir"/*.enc >/dev/null 2>&1 && enc=true
          [ "$first" = 1 ] || printf ','; first=0
          "$JQ" -c --arg dir "$dir" --argjson enc "$enc" \
            '{source:"neo", ref:$dir, package:.packageName, label:.packageLabel,
              versionName:.versionName, versionCode:.versionCode,
              encrypted:$enc, compression:.compressionType,
              hasApk:(.hasApk // (.sourceDir!=null)), hasData:(.hasAppData // false), date:.backupDate}' "$prop" 2>/dev/null
        done
        printf ']}\n' ;;
      databackup)
        [ -n "$path" ] || path=/storage/emulated/0/DataBackup
        printf '{"ok":true,"from":"databackup","backups":['
        first=1
        for cfg in "$path"/apps/*/*/package_restore_config.json; do
          [ -f "$cfg" ] || continue
          dir="${cfg%/package_restore_config.json}"; pkg="$(basename "$(dirname "$dir")")"
          [ "$first" = 1 ] || printf ','; first=0
          "$JQ" -c --arg dir "$dir" --arg pkg "$pkg" \
            '{source:"databackup", ref:$dir, package:($pkg),
              versionName:(.versionName // .packageInfo.versionName // null),
              versionCode:(.versionCode // .packageInfo.versionCode // null),
              encrypted:false, compression:"zstd"}' "$cfg" 2>/dev/null \
            || printf '{"source":"databackup","ref":"%s","package":"%s","encrypted":false}' "$dir" "$pkg"
        done
        printf ']}\n' ;;
      *) err ERR_IMPORT_FROM "unknown import source: $from" ;;
    esac ;;

  list-backups)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    _a="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"
    pkg="$(printf '%s' "$_a" | "$JQ" -r '.package // empty' 2>/dev/null)"
    _bk="$(bdir "$(printf '%s' "$_a" | "$JQ" -r '.user // 0' 2>/dev/null)")"
    printf '{"ok":true,"backups":['
    first=1
    for m in "$_bk"/${pkg:-*}/*/manifest.json; do
      [ -f "$m" ] || continue
      [ "$first" = 1 ] || printf ','; first=0
      ref="$(dirname "$m")"
      "$JQ" -c --arg ref "$ref" \
        '{ref:$ref, package:.package.name, label:(.package.label // .package.name),
          versionName:.package.versionName,
          versionCode:.package.versionCode, created_at:.created_at, mode:.mode,
          items:[.items[].type]}' "$m" 2>/dev/null
    done
    printf ']}\n' ;;

  path-list)
    # standalone folder/file backups (kind:"path") live under .paths/ in the backups
    # dir and are not app backups, so list-backups skips them. Same manifest shape.
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    _a="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"
    _bk="$(bdir "$(printf '%s' "$_a" | "$JQ" -r '.user // 0' 2>/dev/null)")"
    printf '{"ok":true,"backups":['
    first=1
    for m in "$_bk"/.paths/*/manifest.json; do
      [ -f "$m" ] || continue
      [ "$("$JQ" -r '.kind // empty' "$m" 2>/dev/null)" = path ] || continue
      [ "$first" = 1 ] || printf ','; first=0
      "$JQ" -c --arg ref "$(dirname "$m")" \
        '{ref:$ref, source:(.source // ""), created_at:(.created_at // ""),
          encryption:(.encryption // "none"), compression:(.compression // "")}' "$m" 2>/dev/null
    done
    printf ']}\n' ;;

  overview)
    # aggregate stats for the home/overview UI: app-backup counts, standalone path
    # backups, scheduled jobs, total backups size and the filesystem free/total.
    # Read-only; returns immediately. du is cheap on this tree.
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    _a="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"
    u="$(printf '%s' "$_a" | "$JQ" -r '.user // 0' 2>/dev/null)"; case "$u" in ''|*[!0-9]*) u=0 ;; esac
    bk="$(bdir "$u")"
    apps=0; insts=0
    for d in "$bk"/*/; do
      [ -d "$d" ] || continue
      case "$d" in "$bk"/.paths/) continue ;; esac
      _c=0; for s in "$d"*/; do [ -d "$s" ] && _c=$(( _c + 1 )); done
      [ "$_c" -gt 0 ] || continue
      apps=$(( apps + 1 )); insts=$(( insts + _c ))
    done
    paths=0; for d in "$bk"/.paths/*/; do [ -d "$d" ] && paths=$(( paths + 1 )); done
    jobs=0; for f in "$STATE/jobs"/*.json; do [ -f "$f" ] && jobs=$(( jobs + 1 )); done
    size=0; if [ -d "$bk" ]; then size="$(du -s -B1 "$bk" 2>/dev/null | cut -f1)"; case "$size" in ''|*[!0-9]*) size=0 ;; esac; fi
    _dfp="$bk"; [ -d "$_dfp" ] || _dfp="/data/media/$u"; [ -d "$_dfp" ] || _dfp=/data
    free=0; total=0
    set -- $(df -kP "$_dfp" 2>/dev/null | tail -1)
    case "${2:-}" in *[0-9]*) total=$(( $2 * 1024 )) ;; esac
    case "${4:-}" in *[0-9]*) free=$(( $4 * 1024 )) ;; esac
    "$JQ" -nc --argjson apps "$apps" --argjson instances "$insts" --argjson paths "$paths" \
      --argjson jobs "$jobs" --argjson size "$size" --argjson free "$free" --argjson total "$total" \
      '{ok:true, apps:$apps, instances:$instances, path_backups:$paths, jobs:$jobs,
        backups_size:$size, free:$free, total:$total}' ;;

  backup-info)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    ref="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | "$JQ" -r '.ref // empty' 2>/dev/null)"
    case "$ref" in /data/media/*/VDBackup/*) : ;; *) err ERR_BAD_REF "invalid ref"; exit 0 ;; esac
    m="$ref/manifest.json"; [ -f "$m" ] || { err ERR_NO_BACKUP "manifest not found"; exit 0; }
    size="$(du -sk "$ref" 2>/dev/null | cut -f1)"; size="$((${size:-0} * 1024))"
    "$JQ" -c --argjson size "${size:-0}" \
      '{ok:true, ref:(.ref // ""), created_at:.created_at, mode:.mode, user_id:.user_id,
        size:$size, package:(.package|del(.icon)), device:.device,
        items:[.items[]|{type, archive, sha256, size}],
        permissions:{runtime:((.permissions.runtime|length)//0),
                     granted:([.permissions.runtime[]?|select(.granted)]|length),
                     appops:((.permissions.appops|length)//0),
                     ssaid:((.permissions.ssaid|length)>0)}}' "$m" 2>/dev/null ;;

  backup-icon)
    # the app icon (base64 PNG) stored in the backup manifest, so the Backups list
    # shows it even when the app is no longer installed. No live app/APK needed.
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    ref="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | "$JQ" -r '.ref // empty' 2>/dev/null)"
    case "$ref" in /data/media/*/VDBackup/*) : ;; *) err ERR_BAD_REF "invalid ref"; exit 0 ;; esac
    m="$ref/manifest.json"; [ -f "$m" ] || { err ERR_NO_BACKUP "manifest not found"; exit 0; }
    ic="$("$JQ" -r '.package.icon // empty' "$m" 2>/dev/null)"
    if [ -n "$ic" ]; then ok "\"icon\":\"$ic\""; else err ERR_ICON "no icon in manifest"; fi ;;

  delete-backup)
    ref="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | \
           "$(command -v "$BIN/jq" 2>/dev/null || echo jq)" -r '.ref // empty' 2>/dev/null)"
    case "$ref" in
      *..*) err ERR_BAD_REF "ref must not contain .." ;;
      /data/media/*/VDBackup/*)
        rm -rf "$ref" && { printf '{"ts":"%s","op":"delete-backup","ref":"%s"}\n' \
          "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(jstr "$ref")" >> "$LOGS/audit.jsonl"; ok "\"deleted\":\"$(jstr "$ref")\""; } \
          || err ERR_DELETE "could not delete" ;;
      *) err ERR_BAD_REF "ref must be under the backups dir" ;;
    esac ;;

  dests-list)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    printf '{"ok":true,"dests":['
    first=1
    for f in "$STATE/dests"/*.json; do
      [ -f "$f" ] || continue
      [ "$first" = 1 ] || printf ','; first=0
      "$JQ" -c '.' "$f" 2>/dev/null
    done
    printf ']}\n' ;;

  dest-add)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    j="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"
    id="$(printf '%s' "$j" | "$JQ" -r '.id // empty' 2>/dev/null)"
    case "$id" in ""|*/*|*' '*) err ERR_DEST_ID "invalid or missing dest id"; exit 0 ;; esac
    mkdir -p "$STATE/dests" "$STATE/creds"
    printf '%s' "$j" | "$JQ" 'del(.password)' > "$STATE/dests/$id.json" && chmod 600 "$STATE/dests/$id.json"
    pw="$(printf '%s' "$j" | "$JQ" -r '.password // empty' 2>/dev/null)"
    [ -n "$pw" ] && { printf '%s' "$pw" > "$STATE/creds/$id.pass"; chmod 600 "$STATE/creds/$id.pass"; }
    ok "\"saved\":\"$(jstr "$id")\"" ;;

  dest-del)
    id="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | \
          "$(command -v "$BIN/jq" 2>/dev/null || echo jq)" -r '.id // empty' 2>/dev/null)"
    case "$id" in ""|*/*) err ERR_DEST_ID "invalid id" ;; *)
      rm -f "$STATE/dests/$id.json" "$STATE/creds/$id.pass"; ok "\"deleted\":\"$(jstr "$id")\"" ;; esac ;;

  remote-add)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    j="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"
    name="$(printf '%s' "$j" | "$JQ" -r '.name // empty' 2>/dev/null)"
    be="$(printf '%s' "$j" | "$JQ" -r '.backend // empty' 2>/dev/null)"
    case "$name" in ''|*/*|*' '*|*:*|'['*|*']'*) err ERR_REMOTE_NAME "invalid or missing remote name"; exit 0 ;; esac
    # accept any rclone backend (dropbox, onedrive, box, pcloud, mega, b2, ... all ~70):
    # the name must be a plain rclone backend token; rclone itself rejects an unknown one
    # (-> ERR_REMOTE_ADD). Params are passed as separate argv, so there is no injection.
    case "$be" in ''|*[!a-z0-9]*) err ERR_REMOTE_BACKEND "invalid backend"; exit 0 ;; esac
    set --; OBS=
    for kv in $(printf '%s' "$j" | "$JQ" -r '.params // {} | to_entries[] | "\(.key)=\(.value|@base64)"' 2>/dev/null); do
      k="${kv%%=*}"; v="$(printf '%s' "${kv#*=}" | base64 -d 2>/dev/null)"
      case "$k" in pass|password) OBS=--obscure; k=pass ;; esac
      set -- "$@" "$k=$v"
    done
    "$BIN/rclone" --config "$STATE/rclone.conf" config create "$name" "$be" "$@" $OBS --non-interactive >/dev/null 2>&1
    if "$BIN/rclone" --config "$STATE/rclone.conf" listremotes 2>/dev/null | grep -qx "$name:"; then
      chmod 600 "$STATE/rclone.conf" 2>/dev/null; ok "\"name\":\"$(jstr "$name")\",\"backend\":\"$(jstr "$be")\""
    else err ERR_REMOTE_ADD "could not create the rclone remote"; fi ;;

  remote-authorize)
    # on-device OAuth for backends that need a browser (dropbox/onedrive/box/pcloud/...).
    # `rclone authorize <backend>` starts a local callback server on 127.0.0.1:53682 and
    # prints a consent URL; we open that URL in the phone browser (am VIEW) so the user
    # consents right here, the redirect returns to localhost and rclone captures the
    # token. The WebUI polls remote-authorize-poll for the token, then calls remote-add.
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    be="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | "$JQ" -r '.backend // empty' 2>/dev/null)"
    case "$be" in ''|*[!a-z0-9]*) err ERR_REMOTE_BACKEND "invalid backend"; exit 0 ;; esac
    mkdir -p "$STATE/staging" 2>/dev/null
    if [ -f "$STATE/staging/authorize.pgid" ]; then kill -- "-$(cat "$STATE/staging/authorize.pgid" 2>/dev/null)" 2>/dev/null; fi
    out="$STATE/staging/authorize.out"; : > "$out"
    RB="$BIN/rclone"; export RB be out
    # a branded success/failure page in the device browser (path has no spaces).
    TPL="$MODDIR/etc/authorize-landing.html"; [ -f "$TPL" ] || TPL=""; export TPL
    setsid sh -c '"$RB" authorize "$be" ${TPL:+--template $TPL} > "$out" 2>&1; echo __AUTHDONE__ >> "$out"' &
    echo "$!" > "$STATE/staging/authorize.pgid"
    url=""; i=0
    while [ "$i" -lt 10 ]; do
      url="$(sed -n 's#.*following link: \(http://127\.0\.0\.1:53682/[^ ]*\).*#\1#p' "$out" 2>/dev/null | head -1)"
      [ -n "$url" ] && break
      sleep 1; i=$((i+1))
    done
    [ -n "$url" ] && env -u LD_LIBRARY_PATH /system/bin/am start -a android.intent.action.VIEW -d "$url" >/dev/null 2>&1
    if [ -n "$url" ]; then ok "\"url\":\"$(jstr "$url")\""; else err ERR_AUTHORIZE "no consent URL from rclone (is the device online?)"; fi ;;

  remote-authorize-poll)
    # poll the authorize output: {done:false,url} while waiting, {done:true,token} once
    # the user has consented, or ERR_AUTHORIZE if it finished without a token.
    out="$STATE/staging/authorize.out"
    [ -f "$out" ] || { err ERR_AUTHORIZE "no authorization in progress"; exit 0; }
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    tok="$(sed -n '/Paste the following into your remote machine/,/End paste/p' "$out" 2>/dev/null | grep -m1 '^{.*}$')"
    if [ -n "$tok" ]; then "$JQ" -nc --arg t "$tok" '{ok:true,done:true,token:$t}'
    elif grep -q '__AUTHDONE__' "$out" 2>/dev/null; then err ERR_AUTHORIZE "authorization finished without a token (cancelled or denied)"
    else
      url="$(sed -n 's#.*following link: \(http://127\.0\.0\.1:53682/[^ ]*\).*#\1#p' "$out" 2>/dev/null | head -1)"
      "$JQ" -nc --arg u "$url" '{ok:true,done:false,url:$u}'
    fi ;;

  remote-authorize-cancel)
    if [ -f "$STATE/staging/authorize.pgid" ]; then kill -- "-$(cat "$STATE/staging/authorize.pgid" 2>/dev/null)" 2>/dev/null; fi
    rm -f "$STATE/staging/authorize.out" "$STATE/staging/authorize.pgid"
    ok '"cancelled":true' ;;

  remote-list)
    printf '{"ok":true,"remotes":['
    first=1
    "$BIN/rclone" --config "$STATE/rclone.conf" listremotes --long 2>/dev/null | while IFS= read -r line; do
      nm="${line%%:*}"; ty="$(printf '%s' "${line#*:}" | sed 's/^ *//; s/ *$//')"
      [ -n "$nm" ] || continue
      [ "$first" = 1 ] || printf ','; first=0
      printf '{"name":"%s","type":"%s"}' "$(jstr "$nm")" "$(jstr "$ty")"
    done
    printf ']}\n' ;;

  remote-del)
    name="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | \
            "$(command -v "$BIN/jq" 2>/dev/null || echo jq)" -r '.name // empty' 2>/dev/null)"
    case "$name" in ''|*/*|*' '*|*:*) err ERR_REMOTE_NAME "invalid name" ;; *)
      "$BIN/rclone" --config "$STATE/rclone.conf" config delete "$name" >/dev/null 2>&1
      ok "\"deleted\":\"$(jstr "$name")\"" ;; esac ;;

  dest-test)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    id="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | "$JQ" -r '.id // empty' 2>/dev/null)"
    f="$STATE/dests/$id.json"; [ -f "$f" ] || { err ERR_DEST_NONE "no such destination"; exit 0; }
    t="$("$JQ" -r '.type // "local"' "$f")"
    case "$t" in
      local)  p="$("$JQ" -r '.path // empty' "$f")"; [ -d "${p:-$(bdir 0)}" ] && ok '"reachable":true' || err ERR_DEST_UNREACH "path not found" ;;
      rclone) rem="$("$JQ" -r '.remote // empty' "$f")"; "$BIN/rclone" --config "$STATE/rclone.conf" lsd "$rem:" >/dev/null 2>&1 && ok '"reachable":true' || err ERR_DEST_AUTH "rclone remote unreachable" ;;
      restic) repo="$("$JQ" -r '.repo // empty' "$f")"; RESTIC_PASSWORD_FILE="$STATE/creds/$id.pass" "$BIN/restic" -r "$repo" snapshots >/dev/null 2>&1 && ok '"reachable":true' || err ERR_DEST_AUTH "restic repo unreachable" ;;
      gdrive) cp="ru.vd171.vdbackup"; pm path "$cp" >/dev/null 2>&1 || { err ERR_COMPANION "Google Drive companion not installed"; exit 0; }
        drv="/data/data/$cp/files"; au="$(stat -c %u "/data/data/$cp" 2>/dev/null)"; mkdir -p "$drv" 2>/dev/null
        case "$au" in ''|*[!0-9]*) : ;; *) chown "$au:$au" "$drv" 2>/dev/null ;; esac; restorecon "$drv" 2>/dev/null
        res="$drv/test.$$"; rm -f "$res" "$res.done"
        env -u LD_LIBRARY_PATH -u LD_PRELOAD /system/bin/am start-foreground-service -n "$cp/.DriveCommandService" -e op check -e result "$res" >/dev/null 2>&1
        i=0; while [ ! -f "$res.done" ] && [ "$i" -lt 30 ]; do sleep 1; i=$((i+1)); done
        if [ -f "$res.done" ] && "$JQ" -e '.ok==true' "$res" >/dev/null 2>&1; then rm -f "$res" "$res.done"; ok '"reachable":true'
        else c="$("$JQ" -r '.code // "ERR_DRIVE_TIMEOUT"' "$res" 2>/dev/null)"; rm -f "$res" "$res.done"; err "${c:-ERR_DRIVE}" "Drive not reachable - authorize consent"; fi ;;
      telegram)
        st="$("$MODDIR/scripts/telegram.sh" check-auth 2>/dev/null)"
        if printf '%s' "$st" | "$JQ" -e '.authorized == true' >/dev/null 2>&1; then
          ok '"reachable":true'
        else
          err ERR_DEST_AUTH "Telegram not connected. Please link your Telegram account."
        fi ;;
      *) err ERR_DEST_TYPE "unknown type" ;;
    esac ;;

  telegram-status)
    "$MODDIR/scripts/telegram.sh" check-auth ;;

  telegram-send-code)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    j="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"
    phone="$(printf '%s' "$j" | "$JQ" -r '.phone // empty' 2>/dev/null)"
    [ -n "$phone" ] || { err ERR_TG_PHONE "Phone number is required"; exit 0; }
    "$MODDIR/scripts/telegram.sh" send-code "$phone" ;;

  telegram-sign-in)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    j="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"
    phone="$(printf '%s' "$j" | "$JQ" -r '.phone // empty' 2>/dev/null)"
    code="$(printf '%s' "$j" | "$JQ" -r '.code // empty' 2>/dev/null)"
    pw="$(printf '%s' "$j" | "$JQ" -r '.password // empty' 2>/dev/null)"
    [ -n "$phone" ] && [ -n "$code" ] || { err ERR_TG_CODE "Phone and verification code are required"; exit 0; }
    "$MODDIR/scripts/telegram.sh" sign-in "$phone" "$code" "$pw" ;;

  telegram-init-storage)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    j="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"
    title="$(printf '%s' "$j" | "$JQ" -r '.title // empty' 2>/dev/null)"
    "$MODDIR/scripts/telegram.sh" init-storage "$title" ;;

  telegram-list-remote)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    j="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"
    cid="$(printf '%s' "$j" | "$JQ" -r '.channel_id // empty' 2>/dev/null)"
    if [ -z "$cid" ] && [ -f "$STATE/dests/telegram.json" ]; then
      cid="$("$JQ" -r '.channel_id // empty' "$STATE/dests/telegram.json" 2>/dev/null)"
    fi
    [ -n "$cid" ] || { err ERR_TG_NO_CHANNEL "No storage channel configured"; exit 0; }
    "$MODDIR/scripts/telegram.sh" list-remote "$cid" ;;

  telegram-logout)
    "$MODDIR/scripts/telegram.sh" logout ;;

  schedule-set)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    j="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"
    id="$(printf '%s' "$j" | "$JQ" -r '.id // empty' 2>/dev/null)"
    case "$id" in ""|*/*|*' '*) err ERR_JOB_ID "invalid or missing job id"; exit 0 ;; esac
    # target: a single .package, an explicit .packages[], or .all (every user app)
    has_t="$(printf '%s' "$j" | "$JQ" -r '((.package // "") != "") or (((.packages // []) | length) > 0) or (.all == true)' 2>/dev/null)"
    [ "$has_t" = true ] || { err ERR_JOB_PKG "job needs a package, packages[] or all:true"; exit 0; }
    bad="$(printf '%s' "$j" | "$JQ" -r '([(.package // empty)] + (.packages // [])) | .[] | select((test("[/ ]")) or (test("\\.\\.")))' 2>/dev/null)"
    [ -z "$bad" ] || { err ERR_JOB_PKG "invalid package name in job"; exit 0; }
    action="$(printf '%s' "$j" | "$JQ" -r '.action // "backup"' 2>/dev/null)"
    case "$action" in backup|restore) : ;; *) err ERR_JOB_ACTION "action must be backup or restore"; exit 0 ;; esac
    mkdir -p "$STATE/jobs"; chmod 700 "$STATE/jobs" 2>/dev/null
    old_last=0
    [ -f "$STATE/jobs/$id.json" ] && old_last="$("$JQ" -r '.last_run // 0' "$STATE/jobs/$id.json" 2>/dev/null)"
    case "$old_last" in ''|*[!0-9]*) old_last=0 ;; esac
    tmp="$STATE/jobs/.$id.tmp"
    # optional gate fields (require_wifi/require_charging/min_battery/days) pass through
    # when present and are left unset when absent (no forced defaults); types normalized.
    printf '%s' "$j" | "$JQ" --argjson old_last "$old_last" '
        .keep = (.keep // 5) | .cron = (.cron // "daily")
      | .mode = (.mode // "full") | .dest = (.dest // "local")
      | .action = (.action // "backup")
      | .last_run = (.last_run // $old_last)
      | (if has("require_wifi")     then .require_wifi     = (.require_wifi == true)     else . end)
      | (if has("require_charging") then .require_charging = (.require_charging == true) else . end)
      | (if (has("min_battery") and ((.min_battery|type) == "string")) then .min_battery = ((.min_battery|tonumber?) // .min_battery) else . end)
      | (if has("days") then .days = ((.days // []) | map(if type == "string" then (tonumber? // empty) else . end)) else . end)' > "$tmp" 2>/dev/null \
      && mv "$tmp" "$STATE/jobs/$id.json" && chmod 600 "$STATE/jobs/$id.json" \
      && "$JQ" -c '{ok:true,job:.}' "$STATE/jobs/$id.json" \
      || { rm -f "$tmp"; err ERR_JOB_WRITE "could not store job"; } ;;

  schedule-list)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    printf '{"ok":true,"jobs":['
    first=1
    for f in "$STATE/jobs"/*.json; do
      [ -f "$f" ] || continue
      [ "$first" = 1 ] || printf ','; first=0
      "$JQ" -c '.' "$f" 2>/dev/null
    done
    printf ']}\n' ;;

  schedule-delete)
    id="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | \
          "$(command -v "$BIN/jq" 2>/dev/null || echo jq)" -r '.id // empty' 2>/dev/null)"
    case "$id" in
      ""|*/*|*' '*) err ERR_JOB_ID "invalid id" ;;
      *) rm -f "$STATE/jobs/$id.json"
         printf '{"ts":"%s","op":"schedule-delete","id":"%s"}\n' \
           "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(jstr "$id")" >> "$LOGS/audit.jsonl"
         ok "\"deleted\":\"$(jstr "$id")\"" ;;
    esac ;;

  scheduler-tick)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    now="$(date +%s)"
    mkdir -p "$STATE/jobs"
    RAN=""; PRUNED=""; checked=0; launchn=0
    # a transient gate skips the job WITHOUT stamping last_run (retries next tick) + audits
    gate_skip() { printf '{"ts":"%s","op":"scheduler-gated","id":"%s","reason":"%s"}\n' \
      "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(jstr "$id")" "$(jstr "$1")" >> "$LOGS/audit.jsonl"; }
    for f in "$STATE/jobs"/*.json; do
      [ -f "$f" ] || continue
      checked=$(( checked + 1 ))
      id="$("$JQ" -r '.id // empty' "$f" 2>/dev/null)"; [ -n "$id" ] || id="$(basename "$f" .json)"
      cron="$("$JQ" -r '.cron // "daily"' "$f" 2>/dev/null)"
      at="$("$JQ" -r '.at // empty' "$f" 2>/dev/null)"
      last="$("$JQ" -r '.last_run // 0' "$f" 2>/dev/null)"; case "$last" in ''|*[!0-9]*) last=0 ;; esac
      keep="$("$JQ" -r '.keep // 5' "$f" 2>/dev/null)"; case "$keep" in ''|*[!0-9]*) keep=5 ;; esac
      is_due "$cron" "$at" "$last" "$now" || continue
      # optional per-job gates (all absent = no constraint). A failed gate skips the job
      # WITHOUT stamping last_run, so it retries on the next heartbeat tick.
      if [ "$("$JQ" -r '.require_wifi // false' "$f" 2>/dev/null)" = true ] && ! sched_is_wifi; then gate_skip wifi; continue; fi
      if [ "$("$JQ" -r '.require_charging // false' "$f" 2>/dev/null)" = true ] && ! sched_charging; then gate_skip charging; continue; fi
      minb="$("$JQ" -r '.min_battery // empty' "$f" 2>/dev/null)"
      case "$minb" in ''|*[!0-9]*) : ;; *) [ "$(sched_batt_level)" -ge "$minb" ] || { gate_skip battery; continue; } ;; esac
      if [ "$("$JQ" -r '((.days // []) | length) > 0' "$f" 2>/dev/null)" = true ]; then
        today="$(date +%w)"
        "$JQ" -e --argjson d "$today" --arg ds "$today" '(.days // []) | (index($d) != null) or (index($ds) != null)' "$f" >/dev/null 2>&1 \
          || { gate_skip days; continue; }
      fi
      # minimal thermal safety: never launch a scheduled op while critically hot
      if sched_too_hot; then gate_skip thermal; continue; fi
      action="$("$JQ" -r '.action // "backup"' "$f" 2>/dev/null)"
      juser="$("$JQ" -r '.user // 0' "$f" 2>/dev/null)"; case "$juser" in ''|*[!0-9]*) juser=0 ;; esac
      jmode="$("$JQ" -r '.mode // "full"' "$f" 2>/dev/null)"
      jdest="$("$JQ" -r '.dest // "local"' "$f" 2>/dev/null)"
      jref="$("$JQ" -r '.ref // empty' "$f" 2>/dev/null)"
      fired=0
      # resolve this job's target packages (single / list / all, minus blocklist) and
      # launch one detached op per target: a backup, or a restore of its latest backup.
      for pkg in $(job_targets "$JQ" "$f"); do
        launchn=$(( launchn + 1 )); fired=1
        opid="$(new_opid)-$launchn"
        if [ "$action" = restore ]; then
          ref="$jref"; [ -n "$ref" ] || ref="$(latest_ref "$juser" "$pkg")"
          [ -n "$ref" ] || { launchn=$(( launchn - 1 )); continue; }   # nothing to restore for this pkg
          argj="$("$JQ" -nc --arg ref "$ref" '{ref:$ref}')"
          detach "$opid" restore "$(printf '%s' "$argj" | base64 | tr -d '\n')"
        else
          argj="$("$JQ" -nc --arg p "$pkg" --argjson u "$juser" --arg m "$jmode" --arg d "$jdest" \
            '{package:$p,user:$u,mode:$m,dest:$d,items:["apk","data","data_de","obb","external","media"],sched:true}')"
          detach "$opid" backup "$(printf '%s' "$argj" | base64 | tr -d '\n')"
          for r in $(prune_pkg "$juser" "$pkg" "$keep"); do PRUNED="$PRUNED$("$JQ" -cn --arg r "$r" '$r'),"; done
        fi
        RAN="$RAN$("$JQ" -cn --arg id "$id" --arg opid "$opid" --arg pkg "$pkg" --arg a "$action" '{id:$id,opid:$opid,package:$pkg,action:$a}'),"
        printf '{"ts":"%s","op":"scheduler-run","id":"%s","opid":"%s","package":"%s","action":"%s"}\n' \
          "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(jstr "$id")" "$(jstr "$opid")" "$(jstr "$pkg")" "$(jstr "$action")" >> "$LOGS/audit.jsonl"
      done
      [ "$fired" = 1 ] || continue   # due but no target resolved: do not stamp, retry next tick
      tmp="$STATE/jobs/.$id.tmp"
      "$JQ" --argjson now "$now" '.last_run=$now' "$f" > "$tmp" 2>/dev/null && mv "$tmp" "$f" && chmod 600 "$f"
    done
    AUTO=""
    for _ao in $(auto_backup_scan "$JQ" "$now"); do AUTO="$AUTO\"$(jstr "$_ao")\","; done
    RAN="${RAN%,}"; PRUNED="${PRUNED%,}"; AUTO="${AUTO%,}"
    printf '{"ok":true,"now":%s,"checked":%s,"ran":[%s],"pruned":[%s],"auto":[%s]}\n' "$now" "$checked" "$RAN" "$PRUNED" "$AUTO" ;;

  companion-status)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    inst=false; pm path ru.vd171.vdbackup >/dev/null 2>&1 && inst=true
    bundled=false; [ -f "$COMPANION_APK" ] && bundled=true
    vc="$(dumpsys package ru.vd171.vdbackup 2>/dev/null | sed -n 's/.*versionCode=\([0-9]*\).*/\1/p' | head -1)"
    "$JQ" -nc --argjson installed "$inst" --argjson bundled "$bundled" --arg vc "${vc:-}" \
      '{ok:true,installed:$installed,bundled:$bundled,versionCode:$vc}' ;;

  companion-install)
    # optional + on-demand: only ever called when the user picks Google Drive.
    [ -f "$COMPANION_APK" ] || { err ERR_COMPANION "companion APK not bundled in this build"; exit 0; }
    # system_server cannot read /data/adb (adb_data_file); stage under /data/local/tmp
    capk=/data/local/tmp/vdbackup-companion.apk; cp "$COMPANION_APK" "$capk"; chmod 644 "$capk"
    if pm install -r "$capk" >/dev/null 2>&1; then rm -f "$capk"; ok '"installed":true,"hma":true'
    else rm -f "$capk"; err ERR_COMPANION_INSTALL "could not install companion"; fi ;;

  list-dirs)
    # folder browser for the local-destination picker. Confined to shared storage
    # (/storage/emulated/<u> and its /data/media/<u> twin); lists sub-folders only.
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    p="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | "$JQ" -r '.path // empty' 2>/dev/null)"
    case "$p" in ""|null) p=/storage/emulated/0 ;; esac
    case "$p" in *..*) err ERR_BAD_PATH "invalid path"; exit 0 ;; esac
    case "$p" in /storage/emulated/*|/data/media/*) : ;; *) err ERR_BAD_PATH "outside shared storage"; exit 0 ;; esac
    [ -d "$p" ] || { err ERR_NO_DIR "no such folder"; exit 0; }
    # parent, unless already at a storage root
    parent=""
    case "$p" in /storage/emulated/*/?*|/data/media/*/?*) parent="${p%/*}" ;; esac
    printf '{"ok":true,"path":"%s","parent":"%s","dirs":[' "$(jstr "$p")" "$(jstr "$parent")"
    first=1
    for d in "$p"/*/; do
      [ -d "$d" ] || continue
      name="$(basename "$d")"
      case "$name" in .*) continue ;; esac   # skip dotfolders
      [ "$first" = 1 ] || printf ','; first=0
      printf '"%s"' "$(jstr "$name")"
    done
    printf ']}\n' ;;

  sysmount-status)
    # is a module mounter that can inject a system app present? NoMount is preferred
    # (live nm rule on KSU), but any manager's overlay/magic mount also mounts our
    # sub-module tree at next boot, so mounting never depends on NoMount being installed.
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    nomount=false; [ -d /data/adb/modules/nomount ] && nomount=true
    nm=false; command -v nm >/dev/null 2>&1 && nm=true
    ksu=false; { [ -e /data/adb/ksud ] || [ -d /data/adb/ksu ]; } && ksu=true
    live=false; [ "$nm" = true ] && [ "$ksu" = true ] && live=true
    "$JQ" -nc --argjson nomount "$nomount" --argjson nm "$nm" --argjson ksu "$ksu" --argjson live "$live" \
      '{ok:true,nomount:$nomount,nm:$nm,ksu:$ksu,live_capable:$live}' ;;

  sysmount-add)
    # mount an installed app's APK(s) as a system app via a VDBackup-owned overlay
    # sub-module (never touches the real /system partition). Copies from the live
    # install path (pm path), so no re-extraction. Live via nm rule when possible,
    # else applied at next reboot by the active mounter.
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    j="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"
    pkg="$(printf '%s' "$j" | "$JQ" -r '.package // empty' 2>/dev/null)"
    priv="$(printf '%s' "$j" | "$JQ" -r '.priv // false' 2>/dev/null)"
    case "$pkg" in ''|*..*|*/*|*' '*) err ERR_BAD_PKG "invalid package"; exit 0 ;; esac
    sub=app; [ "$priv" = true ] && sub=priv-app
    base="$(pm path "$pkg" 2>/dev/null | sed -n 's/^package://p' | grep '/base\.apk$' | head -1)"
    [ -n "$base" ] || base="$(pm path "$pkg" 2>/dev/null | sed -n 's/^package://p' | head -1)"
    [ -n "$base" ] || { err ERR_NO_APK "app not installed or no apk path"; exit 0; }
    MM=/data/adb/modules/vdbackup_sysmount
    dir="$MM/system/$sub/$pkg"
    mkdir -p "$dir"
    if [ ! -f "$MM/module.prop" ]; then
      ver="$(sed -n 's/^version=//p' "$MODDIR/module.prop")"; vc="$(sed -n 's/^versionCode=//p' "$MODDIR/module.prop")"
      { printf 'id=vdbackup_sysmount\nname=VDBackup system-app mounts\n'
        printf 'version=%s\nversionCode=%s\nauthor=VD171\n' "${ver:-v1.01}" "${vc:-101}"
        printf 'description=System-app mounts created by VDBackup (systemless; never changes the /system partition).\n'; } > "$MM/module.prop"
      : > "$MM/skip_mount" 2>/dev/null; rm -f "$MM/skip_mount"   # ensure it is NOT skip_mount
    fi
    cp -f "$base" "$dir/$pkg.apk" || { err ERR_SYSMOUNT "could not stage apk"; exit 0; }
    # splits alongside (best effort; most system apps are single-apk)
    pm path "$pkg" 2>/dev/null | sed -n 's/^package://p' | grep '/split_' | while IFS= read -r sp; do
      [ -f "$sp" ] && cp -f "$sp" "$dir/$(basename "$sp")" 2>/dev/null
    done
    chmod 0755 "$MM" "$MM/system" "$MM/system/$sub" "$dir" 2>/dev/null
    chmod 0644 "$dir"/*.apk 2>/dev/null
    find "$MM" -exec chown 0:0 {} + 2>/dev/null; restorecon -R "$MM" 2>/dev/null
    # live inject via NoMount on KSU (no reboot); otherwise next boot by the mounter
    live=false
    if command -v nm >/dev/null 2>&1 && { [ -e /data/adb/ksud ] || [ -d /data/adb/ksu ]; }; then
      ok=1
      for apk in "$dir"/*.apk; do [ -f "$apk" ] || continue
        nm rule add "/system/$sub/$pkg/$(basename "$apk")" "$apk" >/dev/null 2>&1 || ok=0
      done
      [ "$ok" = 1 ] && live=true
    fi
    printf '{"ts":"%s","op":"sysmount-add","package":"%s","priv":%s,"live":%s}\n' \
      "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(jstr "$pkg")" "$priv" "$live" >> "$LOGS/audit.jsonl"
    "$JQ" -nc --arg pkg "$pkg" --arg sub "$sub" --argjson live "$live" \
      '{ok:true,package:$pkg,location:("/system/"+$sub+"/"+$pkg),live:$live,reboot_needed:($live|not)}' ;;

  sysmount-list)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    MM=/data/adb/modules/vdbackup_sysmount
    printf '{"ok":true,"mounts":['
    first=1
    for d in "$MM"/system/app/* "$MM"/system/priv-app/*; do
      [ -d "$d" ] || continue
      p="$(basename "$d")"; s="$(basename "$(dirname "$d")")"
      [ "$first" = 1 ] || printf ','; first=0
      "$JQ" -nc --arg pkg "$p" --arg sub "$s" '{package:$pkg,sub:$sub}'
    done
    printf ']}\n' ;;

  sysmount-del)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    pkg="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | "$JQ" -r '.package // empty' 2>/dev/null)"
    case "$pkg" in ''|*..*|*/*|*' '*) err ERR_BAD_PKG "invalid package"; exit 0 ;; esac
    MM=/data/adb/modules/vdbackup_sysmount
    for sub in app priv-app; do
      d="$MM/system/$sub/$pkg"; [ -d "$d" ] || continue
      if command -v nm >/dev/null 2>&1; then
        for apk in "$d"/*.apk; do [ -f "$apk" ] && nm rule del "/system/$sub/$pkg/$(basename "$apk")" >/dev/null 2>&1; done
      fi
      rm -rf "$d"
    done
    printf '{"ts":"%s","op":"sysmount-del","package":"%s"}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(jstr "$pkg")" >> "$LOGS/audit.jsonl"
    ok "\"removed\":\"$(jstr "$pkg")\"" ;;

  provenance)
    # supply-chain audit trail: the PROVENANCE.json built alongside the binaries
    # (source + sha256 of every bundled binary/library). Shipped on-device.
    f="$BIN/PROVENANCE.json"
    if [ -f "$f" ]; then cat "$f"
    else err ERR_NO_PROVENANCE "no provenance manifest in this build"; fi ;;

  log-read)
    # the newest audit entries (delete/restore/schedule/prune), newest first, for the
    # in-UI activity log. Each audit.jsonl line is already one JSON object.
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    n="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | "$JQ" -r '.limit // 200' 2>/dev/null)"
    case "$n" in ''|*[!0-9]*) n=200 ;; esac
    printf '{"ok":true,"entries":['
    if [ -f "$LOGS/audit.jsonl" ]; then
      first=1
      # audit lines are already one valid JSON object each (our own writer), so a cheap
      # shape check beats spawning jq per line (that made the log slow to open).
      tail -n "$n" "$LOGS/audit.jsonl" 2>/dev/null | sed '1!G;h;$!d' | while IFS= read -r line; do
        case "$line" in '{'*'}') ;; *) continue ;; esac
        [ "$first" = 1 ] || printf ','; first=0
        printf '%s' "$line"
      done
    fi
    printf ']}\n' ;;

  log-export)
    # bundle the activity log plus a short build/device header into one user-visible
    # text file under the backups dir, so a user can attach it to a bug report. The
    # path is returned for the UI to show. No secrets: audit.jsonl holds op metadata.
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    u="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | "$JQ" -r '.user // 0' 2>/dev/null)"
    case "$u" in ''|*[!0-9]*) u=0 ;; esac
    _bk="$(bdir "$u")"; mkdir -p "$_bk" 2>/dev/null
    out="$_bk/vdbackup-log-$(date -u +%Y%m%dT%H%M%SZ).txt"
    {
      echo "VDBackup activity log export"
      echo "version:     $(sed -n 's/^version=//p' "$MODDIR/module.prop")"
      echo "device:      $(getprop ro.product.device) / Android $(getprop ro.build.version.release) (sdk $(getprop ro.build.version.sdk)) / $(getprop ro.product.cpu.abi)"
      echo "fingerprint: $(getprop ro.build.fingerprint)"
      echo "exported:    $(date -u +%Y-%m-%dT%H:%M:%SZ)"
      echo "-------------------- audit.jsonl --------------------"
      [ -f "$LOGS/audit.jsonl" ] && cat "$LOGS/audit.jsonl"
    } > "$out" 2>/dev/null
    _mo="$(stat -c '%u:%g' "/data/media/$u" 2>/dev/null)"
    case "$_mo" in *[0-9]:*[0-9]) chown "$_mo" "$out" 2>/dev/null ;; esac
    restorecon "$out" 2>/dev/null
    if [ -s "$out" ]; then ok "\"path\":\"$(jstr "$out")\""; else err ERR_LOG_EXPORT "could not write the log export"; fi ;;

  prune)
    # manual retention: keep the newest <keep> backups of a package, delete the rest.
    # Same guard as delete-backup (only ever touches paths under the backups dir).
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    j="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"
    pkg="$(printf '%s' "$j" | "$JQ" -r '.package // empty' 2>/dev/null)"
    u="$(printf '%s' "$j" | "$JQ" -r '.user // 0' 2>/dev/null)"; case "$u" in ''|*[!0-9]*) u=0 ;; esac
    keep="$(printf '%s' "$j" | "$JQ" -r '.keep // 5' 2>/dev/null)"; case "$keep" in ''|*[!0-9]*) keep=5 ;; esac
    case "$pkg" in ''|*..*|*/*|*' '*) err ERR_BAD_REF "invalid package"; exit 0 ;; esac
    printf '{"ok":true,"pruned":['
    first=1
    for r in $(prune_pkg "$u" "$pkg" "$keep"); do
      [ "$first" = 1 ] || printf ','; first=0
      printf '"%s"' "$(jstr "$r")"
      printf '{"ts":"%s","op":"prune","ref":"%s"}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(jstr "$r")" >> "$LOGS/audit.jsonl"
    done
    printf ']}\n' ;;

  *)
    err ERR_UNKNOWN_VERB "unknown verb: $verb" ;;

esac
