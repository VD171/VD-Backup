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
#
#  Command dispatcher called by the WebUI as:
#     ksu.exec("sh $MODDIR/scripts/helper.sh <verb> <base64-json-args>")
#  Prints a single JSON object on stdout. Long operations (backup/restore)
#  are detached (setsid) so closing the WebUI never interrupts them.

d="${0%/*}"; [ "$d" = "$0" ] && d="."; MODDIR="$(cd "$d/.." 2>/dev/null && pwd || echo "${d%/*}")"
STATE=/data/adb/vdbackup
valid_pkg() { case "$1" in ''|null|.*|*[!A-Za-z0-9._]*) return 1 ;; esac; }   # same rule as worker.sh
bdir() { case "$1" in ''|*[!0-9]*) set -- 0 ;; esac; printf '/data/media/%s/VDBackup' "$1"; }  # /sdcard/VDBackup per Android user (credential-encrypted)
# A backup sent to a local destination lives at that destination, not duplicated in the internal
# store (destination-authoritative): the user picks a local dest to keep the backup OFF
# internal storage, so keeping an internal copy would defeat that and waste the space. list/restore/
# delete therefore look in every backup root. local_dest_roots echoes each configured local
# destination root ($path/vdbackup); backup_roots prepends the internal store for a user. Dest paths
# are validated storage locations (safe_local_dest in worker.sh), no spaces.
local_dest_roots() {
  _ldj="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
  for _ldf in "$STATE/dests"/*.json; do
    [ -f "$_ldf" ] || continue
    [ "$("$_ldj" -r '.type // "local"' "$_ldf" 2>/dev/null)" = local ] || continue
    _ldp="$("$_ldj" -r '.path // empty' "$_ldf" 2>/dev/null)"
    case "$_ldp" in ''|null|*..*) continue ;; esac
    printf '%s/vdbackup\n' "$_ldp"
  done
}
backup_roots() { printf '%s\n' "$(bdir "$1")"; local_dest_roots; }   # <user>; one backup root per line
# Echo the backup root a ref sits under - the internal store or a configured local destination -
# or nothing if the ref is under no known root. `..` is refused first, so a ref can never traverse
# out of its root. Used to scope delete and to validate backup-info. Space-safe (read -r).
ref_root() {   # <ref>
  case "$1" in
    *..*) return 0 ;;
    /data/media/*/VDBackup/*) printf '%s' "$1" | sed -E 's#(/data/media/[0-9]+/VDBackup)/.*#\1#'; return 0 ;;
  esac
  while IFS= read -r _rr; do
    [ -n "$_rr" ] || continue
    case "$1" in "$_rr"/*) printf '%s' "$_rr"; return 0 ;; esac
  done <<EOF
$(local_dest_roots)
EOF
}
# Secrets (remote credentials, the age keypair, the rclone config) live on CREDENTIAL-
# ENCRYPTED storage, locked until the user's first unlock (BFU), NOT in /data/adb which is
# device-encrypted and readable before first unlock. Scheduled backups never need them
# earlier: app data (/data/data, /data/app) is itself CE-locked before first unlock, so a
# pre-unlock backup could read nothing anyway. secrets_init MOVES any legacy secrets out of
# the DE tree permanently (historical installs kept them in /data/adb). See docs/SECURITY.md.
SECRETS=/data/misc_ce/0/vdbackup
ce_ready() { [ "$(getprop sys.user.0.ce_available)" = true ]; }
secrets_init() {
  [ -f "$SECRETS/.init" ] && return 0
  ce_ready || return 1
  mkdir -p "$SECRETS/creds" "$SECRETS/keys" 2>/dev/null || return 1
  for _s in creds keys; do
    _o="/data/adb/vdbackup/$_s"; [ -d "$_o" ] || continue
    if [ -n "$(ls -A "$_o" 2>/dev/null)" ]; then
      cp -a "$_o/." "$SECRETS/$_s/" 2>/dev/null || continue        # copy failed: keep the source
      _ok=1; for _g in "$_o"/*; do [ -e "$_g" ] && { [ -e "$SECRETS/$_s/$(basename "$_g")" ] || _ok=0; }; done
      [ "$_ok" = 1 ] && rm -rf "$_o"                               # only drop the source once every file landed
    else rm -rf "$_o"; fi
  done
  if [ -f /data/adb/vdbackup/rclone.conf ]; then
    cp -a /data/adb/vdbackup/rclone.conf "$SECRETS/rclone.conf" 2>/dev/null && [ -f "$SECRETS/rclone.conf" ] && rm -f /data/adb/vdbackup/rclone.conf
  fi
  chmod 700 "$SECRETS" "$SECRETS/creds" "$SECRETS/keys" 2>/dev/null
  for _f in "$SECRETS/creds"/* "$SECRETS/keys"/* "$SECRETS/rclone.conf"; do [ -f "$_f" ] && chmod 600 "$_f" 2>/dev/null; done
  restorecon -R "$SECRETS" 2>/dev/null
  : > "$SECRETS/.init"
}
secrets_init 2>/dev/null
export RCLONE_CONFIG="$SECRETS/rclone.conf"
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
[ -f "$MODDIR/etc/curl-ca.sh" ] && . "$MODDIR/etc/curl-ca.sh"

# pm/dumpsys are app_process based: run them with a CLEAN env, or the bundled Termux
# libs on LD_LIBRARY_PATH shadow ART's and binder marshalling fails on some ROMs
# ("Failure calling service package: Failed transaction"). These wrappers shadow the
# bare calls below; the bundled binaries keep LD_LIBRARY_PATH via their full $BIN path.
pm()      { /system/bin/env -u LD_LIBRARY_PATH -u LD_PRELOAD PATH=/system/bin:/system_ext/bin:/vendor/bin:/product/bin /system/bin/pm "$@"; }
dumpsys() { /system/bin/env -u LD_LIBRARY_PATH -u LD_PRELOAD PATH=/system/bin:/system_ext/bin:/vendor/bin:/product/bin /system/bin/dumpsys "$@"; }

JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"

# Listing fields for a backup dir. A plaintext backup exposes them in manifest.json; an
# encrypted one keeps the real manifest sealed in manifest.full.age (passphrase) and the few
# listing fields in a device-key stub, so the WebUI lists fast WITHOUT the passphrase while an
# attacker holding only the files sees neither. If the device key cannot open the stub (a backup
# moved here from another device), fall back to a "locked" shape: the package from the path (the one
# residual), no label/icon - it still restores with the passphrase. Echoes one compact JSON object:
# {package,label,icon,versionName,versionCode,created_at,mode,types,encrypted,locked}.
backup_listing() {
  _bl_ref="$1"; _bl_m="$_bl_ref/manifest.json"
  if [ -f "$_bl_ref/manifest.full.age" ]; then
    _bl_s="$("$BIN/age" -d -i "$SECRETS/keys/age.key" "$_bl_ref/stub.dev.age" 2>/dev/null)"
    if [ -n "$_bl_s" ]; then
      printf '%s' "$_bl_s" | "$JQ" -c '{package:.package.name, label:(.package.label // .package.name),
        icon:(.package.icon // ""), versionName:(.package.versionName // ""), versionCode:(.package.versionCode // 0),
        created_at:.created_at, mode:.mode, types:(.types // []), encrypted:true, locked:false}' 2>/dev/null
    else
      _bl_pkg="$(basename "$(dirname "$_bl_ref")")"
      "$JQ" -c -n --arg pkg "$_bl_pkg" --slurpfile mm "$_bl_m" \
        '{package:$pkg, label:$pkg, icon:"", versionName:"", versionCode:0,
          created_at:($mm[0].created_at // null), mode:($mm[0].mode // "full"), types:[], encrypted:true, locked:true}' 2>/dev/null
    fi
  else
    "$JQ" -c '{package:.package.name, label:(.package.label // .package.name),
      icon:(.package.icon // ""), versionName:.package.versionName, versionCode:.package.versionCode,
      created_at:.created_at, mode:.mode, types:[.items[].type], size:([.items[].size // 0] | add // 0), encrypted:false, locked:false}' "$_bl_m" 2>/dev/null
  fi
}

# Reveal: decrypt the full manifest of an encrypted backup with the passphrase, so the info
# panel can show the sealed details (permissions/items/device) on demand WITHOUT restoring. age reads
# the passphrase from a controlling terminal, so it runs under a pty (`script`), like worker.sh.
# Decrypts to a FILE (not a command substitution, which strips the trailing newline and breaks the
# sha check against the recorded one); echoes the temp path, empty on wrong passphrase/failure.
SCRIPTB="$(command -v "$BIN/script" 2>/dev/null || command -v script || echo script)"
dec_mani_pw() {   # <passphrase> <age-file> ; decrypts to a temp file, echoes its path (empty on failure)
  _dpw="$STATE/staging/reveal.$$"; mkdir -p "$STATE/staging" 2>/dev/null
  printf '%s\n' "$1" | AGE_BIN="$BIN/age" AGE_IN="$2" AGE_OUT="$_dpw" "$SCRIPTB" -qec 'exec "$AGE_BIN" -d -o "$AGE_OUT" "$AGE_IN"' /dev/null >/dev/null 2>&1
  [ -s "$_dpw" ] && printf '%s' "$_dpw" || { rm -f "$_dpw"; return 1; }
}
# Listing metadata for a special/path/adb backup dir (like backup_listing, but generic - these
# have no app label/icon). Plaintext -> the manifest; encrypted -> the device-key stub (fast, no
# passphrase); moved here from another device -> the thin marker + locked:true (fields stay hidden).
read_meta() {
  _rm="$1"
  if [ -f "$_rm/manifest.full.age" ]; then
    _rs="$("$BIN/age" -d -i "$SECRETS/keys/age.key" "$_rm/stub.dev.age" 2>/dev/null)"
    if [ -n "$_rs" ]; then printf '%s' "$_rs" | "$JQ" -c '. + {encrypted:true, locked:false}' 2>/dev/null
    else "$JQ" -c '{created_at, kind, mode} + {encrypted:true, locked:true}' "$_rm/manifest.json" 2>/dev/null; fi
  else
    "$JQ" -c '. + {encrypted:false, locked:false}' "$_rm/manifest.json" 2>/dev/null
  fi
}

mkdir -p "$LOGS"

# --- tiny JSON helpers (no jq dependency) -------------------------------
jstr() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/\t/\\t/g'; }
ok()   { printf '{"ok":true,%s}\n'  "$1"; }
err()  { printf '{"ok":false,"code":"%s","message":"%s"}\n' "$1" "$(jstr "$2")"; }

new_opid() { printf 'op-%s-%s' "$(date +%s)" "$$"; }

# --- detach a long operation (survives WebUI close) ---------------------
detach() {               # detach <opid> <worker-verb> <b64args>
  opid="$1"; wverb="$2"; wargs="$3"
  # never spawn on an empty or garbage opid: it would write progress-.json and orphan a
  # worker the UI can never track. opids come from new_opid() (op-<epoch>-<pid>).
  case "$opid" in ''|*[!A-Za-z0-9._-]*) return 1 ;; esac
  # seed a concrete progress state so the UI shows "starting" instantly instead of
  # an empty file (the worker overwrites it with the first real phase right away).
  printf '{"opid":"%s","percent":0,"phase":"starting","item":"","done":false}\n' "$opid" > "$LOGS/progress-$opid.json"
  setsid nohup "$MODDIR/scripts/worker.sh" "$wverb" "$opid" "$wargs" \
      >"$LOGS/$opid.out" 2>&1 </dev/null &
  echo "$!" > "$LOGS/$opid.pid"
  : > "$STATE/apply.busy"   # VDLU apply-busy: defer the updater's file-swap while this op runs; worker cleanup() drops it
}

# call the Drive companion synchronously (list/delete/check are quick): drive_hcmd <op> [-e k v...]
# -> prints the companion's result JSON, or a failure JSON on timeout/missing companion. The companion
# runs as its own app uid and writes the result into its own sandbox, which root reads back.
drive_hcmd() {
  _dop="$1"; shift
  _dcp="ru.vd171.vdbackup"
  pm path "$_dcp" >/dev/null 2>&1 || { printf '{"ok":false,"code":"ERR_COMPANION"}\n'; return 1; }
  _ddrv="/data/data/$_dcp/files"; _dau="$(stat -c %u "/data/data/$_dcp" 2>/dev/null)"
  mkdir -p "$_ddrv" 2>/dev/null
  case "$_dau" in ''|*[!0-9]*) : ;; *) chown "$_dau:$_dau" "$_ddrv" 2>/dev/null ;; esac
  restorecon "$_ddrv" 2>/dev/null
  _dres="$_ddrv/h.$$.$_dop"; rm -f "$_dres" "$_dres.done"
  env -u LD_LIBRARY_PATH -u LD_PRELOAD /system/bin/am start-foreground-service \
    -n "$_dcp/.DriveCommandService" -e op "$_dop" "$@" -e result "$_dres" >/dev/null 2>&1
  _di=0; while [ ! -f "$_dres.done" ] && [ "$_di" -lt 120 ]; do sleep 1; _di=$((_di+1)); done
  if [ -f "$_dres.done" ]; then cat "$_dres"; rm -f "$_dres" "$_dres.done"
  else rm -f "$_dres" "$_dres.done"; printf '{"ok":false,"code":"ERR_DRIVE_TIMEOUT"}\n'; fi
}

# Keep the state dir from growing without bound: drop long-finished per-op files, cap the
# audit trail, and evict stale icons. Safe to call anytime (boot, periodically); never
# touches config/jobs/dests/creds/keys or the backups themselves.
log_prune() {
  find "$LOGS" -maxdepth 1 -type f \( -name 'progress-*.json' -o -name '*.out' -o -name '*.pid' \) \
       -mtime +7 -exec rm -f {} + 2>/dev/null
  if [ -f "$LOGS/audit.jsonl" ]; then
    _al="$(wc -l < "$LOGS/audit.jsonl" 2>/dev/null)"; case "$_al" in ''|*[!0-9]*) _al=0 ;; esac
    [ "$_al" -gt 5000 ] && { tail -n 5000 "$LOGS/audit.jsonl" > "$LOGS/audit.jsonl.tmp" 2>/dev/null \
        && mv "$LOGS/audit.jsonl.tmp" "$LOGS/audit.jsonl"; }
  fi
  find "$STATE/iconcache" -maxdepth 1 -type f -name '*.png' -mtime +30 -exec rm -f {} + 2>/dev/null
  rm -f "$STATE/staging/authorize.pgid" 2>/dev/null
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
  # only finished backups count and get pruned: a dir without manifest.json is a backup still
  # being written (or one that failed), and must neither push a good one out nor be deleted.
  for _sub in $(ls -1 "$_d" 2>/dev/null | sort -r); do
    [ -f "$_d/$_sub/manifest.json" ] || continue
    # a pinned backup is exempt from retention: it never counts toward <keep> nor is deleted, so a
    # user can keep a known-good backup forever while newer ones still rotate (a `.pinned` marker
    # file in the backup dir, set via pin-set; it travels with the backup on export/import).
    [ -f "$_d/$_sub/.pinned" ] && continue
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
# write the current non-system user apps as {pkg:versionCode} JSON to <outfile> (dex gives the
# real versionCode; the pm fallback gives 0). Shared by the auto-backup scan and its seed.
autobackup_snapshot() {   # <jq> <user> <outfile>
  if [ -f "$MODDIR/etc/vdbackup_helper.dex" ]; then
    LD_LIBRARY_PATH= app_process -Djava.class.path="$MODDIR/etc/vdbackup_helper.dex" /system/bin \
      ru.vd171.vdbackup.Helper list-apps "$2" 2>/dev/null \
      | "$1" -c '[.apps[]? | select(.system|not) | {(.package): (.versionCode // 0)}] | add // {}' > "$3" 2>/dev/null
  else
    pm list packages -3 --user "$2" 2>/dev/null | sed 's/^package://' \
      | "$1" -R -s 'split("\n")|map(select(length>0))|map({(.):0})|add // {}' > "$3" 2>/dev/null
  fi
}
# seed the auto-backup baseline from the apps installed right now, if not already seeded. The
# scan only seeds on its first tick (up to one INTERVAL after the toggle), so an app installed in
# that window was baked into the baseline and never backed up; config-set calls this the moment
# auto-backup is enabled so the baseline is the state at enable-time and later installs are caught.
seed_autobackup() {   # <jq> <user>
  _sseen="$STATE/autobackup_seen.json"; [ -f "$_sseen" ] && return 0
  _scur="$STATE/staging/abseed.$$.json"; mkdir -p "$STATE/staging"
  autobackup_snapshot "$1" "${2:-0}" "$_scur"
  [ -s "$_scur" ] && { cp "$_scur" "$_sseen"; chmod 600 "$_sseen"; }; rm -f "$_scur"
}
auto_backup_scan() {                              # <jq> <now>; echoes the detached opid
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
  autobackup_snapshot "$_jq" "$_u" "$_cur"
  [ -s "$_cur" ] || { rm -f "$_cur"; return 0; }
  if [ ! -f "$_seen" ]; then cp "$_cur" "$_seen"; chmod 600 "$_seen"; rm -f "$_cur"; return 0; fi   # seed only
  # packages whose vc is new or changed vs the snapshot, minus the blocklist
  _changed="$("$_jq" -r --slurpfile seen "$_seen" '
      ($seen[0] // {}) as $s | to_entries
      | map(select(($s[.key] // null) != .value)) | .[].key' "$_cur" 2>/dev/null)"
  # one backup-batch op for all of them (one worker, apps in sequence, as backup-batch was built
  # for); the worker prunes each app to <keep> after its backup succeeds.
  _opid="$(new_opid)-auto"; _pkgs=""
  for _pkg in $_changed; do
    valid_pkg "$_pkg" || continue
    "$_jq" -e --arg p "$_pkg" '((.blocklist // []) | index($p)) != null' "$STATE/config.json" >/dev/null 2>&1 && continue
    _pkgs="$_pkgs$_pkg
"
    printf '{"ts":"%s","op":"auto-backup","opid":"%s","package":"%s"}\n' \
      "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(jstr "$_opid")" "$(jstr "$_pkg")" >> "$LOGS/audit.jsonl"
  done
  if [ -n "$_pkgs" ]; then
    _j="$(printf '%s' "$_pkgs" | "$_jq" -R -s -c --argjson u "$_u" --arg m "$_mode" --arg d "$_dest" --argjson k "$_keep" \
        '{packages:(split("\n")|map(select(length>0))),user:$u,mode:$m,dest:$d,items:["apk","data","data_de","obb","external","media"],auto:true,keep:$k}')"
    detach "$_opid" backup-batch "$(printf '%s' "$_j" | base64 | tr -d '\n')"
    printf '%s\n' "$_opid"
  fi
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
    # Ignore bogus sensors: a connector/USB NTC idles at a ~125C sentinel (not real heat), and
    # nothing below 60C is an overheat however low its own trip sits.
    { [ "$_tzv" -ge 120000 ] || [ "$_tzv" -lt 60000 ]; } && continue
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
JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"   # global default; some verbs still redefine it locally

case "$verb" in

  ping)
    # crypto_ok: passphrase encryption needs the bundled `age` AND a pty helper (`script`).
    # A stale/partial install missing `script` cannot encrypt or decrypt; surface that at
    # load so the UI can warn before the user tries, instead of a late generic failure.
    _cok=false
    { [ -x "$BIN/age" ] || command -v age >/dev/null 2>&1; } \
      && { [ -x "$BIN/script" ] || command -v script >/dev/null 2>&1; } && _cok=true
    ok "\"version\":\"$(sed -n 's/^version=//p' "$MODDIR/module.prop")\",\"abi\":\"$abi\",\"crypto_ok\":$_cok" ;;

  log-prune)
    log_prune; ok '"pruned":true' ;;

  sanitize)
    # Re-assert backup-folder visibility across every Android user. A raw root copy
    # (or a backup made before v1.03.2) can leave 0700 dirs that a file manager cannot
    # open under /sdcard/VDBackup; restore the media owner/context and grant the group
    # access. Metadata-only chmod, so it is cheap even over many backups. Called on
    # install, on boot, and once per WebUI load.
    _n=0
    for _bd in /data/media/*/VDBackup; do
      [ -d "$_bd" ] || continue
      _u="${_bd#/data/media/}"; _u="${_u%/VDBackup}"
      _mo="$(stat -c '%u:%g' "/data/media/$_u" 2>/dev/null)"
      case "$_mo" in *[0-9]:*[0-9]) chown -R "$_mo" "$_bd" 2>/dev/null ;; esac
      restorecon -R "$_bd" 2>/dev/null
      chmod -R ug+rwX "$_bd" 2>/dev/null
      _n=$(( _n + 1 ))
    done
    ok "\"sanitized\":$_n" ;;

  boot-sweep)
    # Reap backup leftovers from an UNCATCHABLE kill (watchdog kill -9 / LMK / OOM),
    # which no in-process EXIT trap can clean. BOOT-ONLY (called from service.sh), so it never
    # races a detached backup in progress - unlike sanitize, which also runs on WebUI load. Drops
    # the remote-only build staging wholesale, then reaps partial op dirs: a completed backup
    # always has manifest.json, and the op-dir name is VDBackup's own <TS>_<VC> (never a user dir).
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    _sd="$("$JQ" -r '.staging_dir // empty' "$STATE/config.json" 2>/dev/null)"; case "$_sd" in /*) : ;; *) _sd=/data/local/tmp ;; esac
    rm -rf "$_sd/.vdstage" /data/local/tmp/.vdstage 2>/dev/null
    rm -f "$STATE/apply.busy" 2>/dev/null   # VDLU apply-busy: a -9'd op can leave this; clear at boot so the boot update is not wrongly deferred
    # A -9 kill during install/restore skips verifier_restore, leaving the device package
    # verifier disabled for good. A surviving snapshot means no clean restore ran; put the user's
    # ORIGINAL verifier settings back (exactly, leaving absent when they were absent) and drop it.
    if [ -f "$STATE/verifier.snap" ]; then
      _vq="$(sed -n 1p "$STATE/verifier.snap" 2>/dev/null)"; _vp="$(sed -n 2p "$STATE/verifier.snap" 2>/dev/null)"
      case "$_vq" in ""|null|"null") : ;; *) env -u LD_LIBRARY_PATH /system/bin/settings put global verifier_verify_adb_installs "$_vq" 2>/dev/null ;; esac
      case "$_vp" in ""|null|"null") : ;; *) env -u LD_LIBRARY_PATH /system/bin/settings put global package_verifier_enable "$_vp" 2>/dev/null ;; esac
      rm -f "$STATE/verifier.snap" 2>/dev/null
    fi
    _r=0
    for _d in /data/media/*/VDBackup/*/[0-9]*Z_[0-9]*; do
      [ -d "$_d" ] || continue
      [ -f "$_d/manifest.json" ] && continue
      rm -rf "$_d" 2>/dev/null && _r=$(( _r + 1 ))
    done
    ok "\"reaped\":$_r" ;;

  update-check)
    # fetch the published update manifest (module.prop updateJson) and compare its
    # versionCode with the installed one. Runs outside the webview (no CSP), on explicit
    # user action only. The actual update is done by the root manager. Fetch prefers the
    # bundled curl; if curl is absent (e.g. a build without it) it falls back to the
    # bundled rclone's on-the-fly http backend (no remote config needed), so the check
    # works on any device with network, not only where curl is shipped.
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    # network timeout (seconds). The auto-check on load passes a short one so a slow or
    # unreachable connection never holds the manager's serial exec queue (which would freeze
    # the app list, icons and navigation); a manual check omits it and gets the longer 20s.
    _ut="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | "$JQ" -r '.timeout // empty' 2>/dev/null)"; case "$_ut" in ''|*[!0-9]*|0) _ut=20 ;; esac
    cur_ver="$(sed -n 's/^version=//p' "$MODDIR/module.prop")"
    cur_code="$(sed -n 's/^versionCode=//p' "$MODDIR/module.prop")"; case "$cur_code" in ''|*[!0-9]*) cur_code=0 ;; esac
    url="$(sed -n 's/^updateJson=//p' "$MODDIR/module.prop")"
    [ -n "$url" ] || { err ERR_UPDATE_CHECK "no updateJson url"; exit 0; }
    j=""
    if [ -x "$BIN/curl" ] || [ -x "$STATE/bin/curl" ] || command -v curl >/dev/null 2>&1; then
      _curl="$(command -v "$BIN/curl" 2>/dev/null || command -v "$STATE/bin/curl" 2>/dev/null || echo curl)"
      j="$("$_curl" -fsSL --max-time "$_ut" "$url" 2>/dev/null)"
    fi
    if [ -z "$j" ]; then
      _rcl="$(command -v "$BIN/rclone" 2>/dev/null || command -v "$STATE/bin/rclone" 2>/dev/null || echo rclone)"
      j="$("$_rcl" cat ":http:${url##*/}" --http-url "${url%/*}" --timeout "${_ut}s" 2>/dev/null)"
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
    # MERGE the incoming config onto the stored one (never a blind overwrite): the WebUI may
    # omit keys it does not manage (new defaults, format_version), and a full overwrite once
    # reduced config.json to a {"blocklist":[]} stub. Always stamp format_version so a future
    # schema migration has an anchor. jq `*` deep-merges; arrays (blocklist/presets/app_tags)
    # are UI-authoritative and replace, which is what we want.
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    [ -s "$STATE/config.json" ] || printf '{}\n' > "$STATE/config.json"   # slurpfile needs a file
    _cfgnew="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"
    _cfgmerged="$(printf '%s' "$_cfgnew" | "$JQ" -c --slurpfile cur "$STATE/config.json" \
       '(($cur[0] // {}) * .) | .format_version = (.format_version // $cur[0].format_version // 1)' 2>/dev/null)"
    if [ -n "$_cfgmerged" ]; then
      printf '%s\n' "$_cfgmerged" > "$STATE/config.json" && chmod 600 "$STATE/config.json" \
        && { if [ "$("$JQ" -r '.auto_backup // false' "$STATE/config.json")" = true ]; then seed_autobackup "$JQ" "$("$JQ" -r '.user // 0' "$STATE/config.json")"; else rm -f "$STATE/autobackup_seen.json"; fi; ok '"saved":true'; } \
        || err ERR_CONFIG_WRITE "could not write config"
    else
      err ERR_CONFIG_WRITE "config merge failed (invalid JSON?)"
    fi ;;

  keygen)
    # device age keypair for unattended (recipient) encryption; private key stays local
    KG="$(command -v "$BIN/age-keygen" 2>/dev/null || echo age-keygen)"
    mkdir -p "$SECRETS/keys"; chmod 700 "$SECRETS/keys"
    if [ -f "$SECRETS/keys/age.key" ]; then
      ok "\"exists\":true,\"public\":\"$(sed -n 's/^# public key: //p' "$SECRETS/keys/age.key" | head -1)\""
    else
      "$KG" -o "$SECRETS/keys/age.key" 2>/dev/null \
        && sed -n 's/^# public key: //p' "$SECRETS/keys/age.key" | head -1 > "$SECRETS/keys/age.pub" \
        && chmod 600 "$SECRETS/keys/age.key" "$SECRETS/keys/age.pub" \
        && ok "\"created\":true,\"public\":\"$(cat "$SECRETS/keys/age.pub")\"" \
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
    if [ -f "$MODDIR/etc/vdbackup_helper.dex" ]; then
      LD_LIBRARY_PATH= app_process -Djava.class.path="$MODDIR/etc/vdbackup_helper.dex" /system/bin \
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
    valid_pkg "$pkg" || { err ERR_ICON "invalid package"; exit 0; }
    mkdir -p "$STATE/iconcache" 2>/dev/null
    # cache key includes versionCode so the icon refreshes when the app updates;
    # drop any stale entry cached under an older versionCode for this package.
    png="$STATE/iconcache/$pkg-$vc.png"
    if [ ! -s "$png" ]; then
      for old in "$STATE/iconcache/$pkg-"*.png; do
        [ -e "$old" ] && [ "$old" != "$png" ] && rm -f "$old"
      done
    fi
    if [ ! -s "$png" ] && [ -f "$MODDIR/etc/vdbackup_helper.dex" ]; then
      LD_LIBRARY_PATH= app_process -Djava.class.path="$MODDIR/etc/vdbackup_helper.dex" /system/bin \
        ru.vd171.vdbackup.Helper icon "$pkg" "$png" "$u" >/dev/null 2>&1
    fi
    if [ -s "$png" ]; then ok "\"package\":\"$(jstr "$pkg")\",\"icon\":\"$(base64 < "$png" | tr -d '\n')\""
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
      valid_pkg "$pkg" || continue
      case "$vc" in ''|*[!0-9]*) vc=0 ;; esac
      png="$STATE/iconcache/$pkg-$vc.png"
      if [ ! -s "$png" ]; then
        for old in "$STATE/iconcache/$pkg-"*.png; do [ -e "$old" ] && [ "$old" != "$png" ] && rm -f "$old"; done
        printf '%s\t%s\n' "$pkg" "$png" >> "$lst"
      fi
    done
    if [ -s "$lst" ] && [ -f "$MODDIR/etc/vdbackup_helper.dex" ]; then
      LD_LIBRARY_PATH= app_process -Djava.class.path="$MODDIR/etc/vdbackup_helper.dex" /system/bin \
        ru.vd171.vdbackup.Helper icons "$u" "$lst" >/dev/null 2>&1
    fi
    rm -f "$lst"
    printf '{"ok":true,"icons":{'
    first=1
    printf '%s' "$j" | "$JQ" -r '.items[]? | "\(.package // "")\t\(.vc // 0)"' 2>/dev/null | while IFS="$TAB" read -r pkg vc; do
      valid_pkg "$pkg" || continue
      case "$vc" in ''|*[!0-9]*) vc=0 ;; esac
      png="$STATE/iconcache/$pkg-$vc.png"; [ -s "$png" ] || continue
      [ "$first" = 1 ] || printf ','; first=0
      printf '"%s":"%s"' "$(jstr "$pkg")" "$(base64 < "$png" | tr -d '\n')"
    done
    printf '}}\n' ;;

  backup|backup-batch|restore|restore-batch|import|special-backup|special-restore|cloud-fetch|path-backup|path-restore|adb-backup|adb-restore|config-export|config-import|telegram-pull|rclone-pull|gdrive-pull)
    opid="$(new_opid)"
    detach "$opid" "$verb" "$ARGS_B64"
    ok "\"opid\":\"$opid\"" ;;

  telegram-list)
    # list backups stored in the Telegram channel (the authoritative offsite index). Pass the
    # engine's list-remote JSON through; the WebUI parses the self-describing <pkg>__<ts>_<vc>.vdb.tar names.
    _tgb="$(command -v "$BIN/mtproto-store" 2>/dev/null || command -v "$STATE/bin/mtproto-store" 2>/dev/null || echo mtproto-store)"
    _o="$(MTPROTO_STORE_TAG=VDB MTPROTO_STORE_STATE="$SECRETS/telegram" "$_tgb" list-remote 2>/dev/null)"
    [ -n "$_o" ] && printf '%s\n' "$_o" || err ERR_TG_LIST "could not list the Telegram channel" ;;

  rclone-list)
    # list Full backups stored remote-only on an rclone destination: walk <remote>:<pfx>/<pkg>/<ts_vc>/
    # and emit one entry per manifest.json. The WebUI merges these (tagged by dest id), like telegram.
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    id="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | "$JQ" -r '.dest // empty' 2>/dev/null)"
    f="$STATE/dests/$id.json"
    { [ -n "$id" ] && [ -f "$f" ] && [ "$("$JQ" -r '.type // empty' "$f")" = rclone ]; } || { err ERR_DEST_NONE "no such rclone destination"; exit 0; }
    rem="$("$JQ" -r '.remote // empty' "$f")"; dp="$("$JQ" -r '.path // empty' "$f")"; pfx="${dp:+$dp/}vdbackup"
    _rc="$(command -v "$BIN/rclone" 2>/dev/null || command -v "$STATE/bin/rclone" 2>/dev/null || echo rclone)"
    _mf="$("$_rc" --config "$SECRETS/rclone.conf" lsf -R --files-only --include manifest.json "$rem:$pfx/" 2>/dev/null)"
    printf '{"ok":true,"dest":"%s","backups":[' "$(jstr "$id")"
    printf '%s\n' "$_mf" | { _first=1; while IFS= read -r _p; do
      case "$_p" in */*/manifest.json) : ;; *) continue ;; esac
      _rref="${_p%/manifest.json}"; _pkg="${_rref%%/*}"; _tsvc="${_rref#*/}"
      case "$_tsvc" in */*) continue ;; esac
      [ "$_first" = 1 ] || printf ','; _first=0
      printf '{"dest":"%s","rref":"%s","package":"%s","tsvc":"%s"}' "$(jstr "$id")" "$(jstr "$_rref")" "$(jstr "$_pkg")" "$(jstr "$_tsvc")"
    done
    # mirrors:true also lists Mirror copies (<pfx>/<pkg>/meta.json, one live copy per app, no <ts_vc>)
    if [ "$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | "$JQ" -r '.mirrors // false' 2>/dev/null)" = true ]; then
      "$_rc" --config "$SECRETS/rclone.conf" lsf -R --max-depth 2 --files-only --format tp --include meta.json "$rem:$pfx/" 2>/dev/null \
        | while IFS= read -r _l; do
          _p="${_l#*;}"; _pkg="${_p%/meta.json}"
          case "$_pkg" in ''|*/*) continue ;; esac
          [ "$_first" = 1 ] || printf ','; _first=0
          printf '{"dest":"%s","rref":"%s","package":"%s","tsvc":"","mode":"mirror","mtime":"%s"}' "$(jstr "$id")" "$(jstr "$_pkg")" "$(jstr "$_pkg")" "$(jstr "${_l%%;*}")"
        done
    fi; }
    printf ']}\n' ;;

  restic-list)
    # list the Snapshot-mode snapshots of a restic destination (tagged vdbackup,<pkg>), newest first.
    # Restore takes one by id through restore {mode:"snapshot",dest,package,snapshot}.
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    id="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | "$JQ" -r '.dest // empty' 2>/dev/null)"
    f="$STATE/dests/$id.json"
    { [ -n "$id" ] && [ -f "$f" ] && [ "$("$JQ" -r '.type // empty' "$f")" = restic ]; } || { err ERR_DEST_NONE "no such restic destination"; exit 0; }
    repo="$("$JQ" -r '.repo // empty' "$f")"
    _rs="$(command -v "$BIN/restic" 2>/dev/null || command -v "$STATE/bin/restic" 2>/dev/null || echo restic)"
    _o="$(RCLONE_CONFIG="$SECRETS/rclone.conf" RESTIC_PASSWORD_FILE="$SECRETS/creds/$id.pass" "$_rs" -r "$repo" snapshots --json --tag vdbackup 2>/dev/null)"
    [ -n "$_o" ] || { err ERR_RESTIC "could not list the restic snapshots"; exit 0; }
    printf '%s' "$_o" | "$JQ" -c --arg d "$id" '{ok:true, dest:$d, backups:([.[]? | {dest:$d, id:.id, short_id:.short_id, time:.time,
        package:(((.tags // []) | map(select(. != "vdbackup")))[0] // ""), size:(.summary.total_bytes_processed // 0)}] | sort_by(.time) | reverse)}' 2>/dev/null \
      || err ERR_RESTIC "could not list the restic snapshots" ;;

  gdrive-list)
    # list Full backups stored on a Google Drive destination (via the companion, which walks the
    # vdbackup/<pkg>/<ts_vc>/ Drive folders). Same entry shape as rclone-list plus a Drive `folder` id
    # that gdrive-pull/-delete use. The WebUI merges these with the rclone ones.
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    id="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | "$JQ" -r '.dest // empty' 2>/dev/null)"
    f="$STATE/dests/$id.json"
    { [ -n "$id" ] && [ -f "$f" ] && [ "$("$JQ" -r '.type // empty' "$f")" = gdrive ]; } || { err ERR_DEST_NONE "no such gdrive destination"; exit 0; }
    dp="$("$JQ" -r '.path // empty' "$f")"; pfx="${dp:+$dp/}vdbackup"
    _o="$(drive_hcmd backups -e name "$pfx")"
    printf '%s' "$_o" | "$JQ" --arg d "$id" '
      if .ok==true then {ok:true,dest:$d,backups:[(.data.backups[]? | {dest:$d,rref:(.package+"/"+.tsvc),package:.package,tsvc:.tsvc,folder:.folder})]}
      else {ok:false,code:(.code//"ERR_DRIVE"),message:"could not list the Drive backups"} end' 2>/dev/null \
      || err ERR_DRIVE "could not list the Drive backups" ;;

  # ---- Telegram login flow (the session lands in CE $SECRETS/telegram) ----
  # Each passes the engine's JSON straight through so the WebUI can read user/channel/code.
  telegram-check)
    _tgb="$(command -v "$BIN/mtproto-store" 2>/dev/null || command -v "$STATE/bin/mtproto-store" 2>/dev/null || echo mtproto-store)"
    _o="$(MTPROTO_STORE_TAG=VDB MTPROTO_STORE_STATE="$SECRETS/telegram" "$_tgb" check-auth 2>/dev/null)"
    [ -n "$_o" ] && printf '%s\n' "$_o" || err ERR_TG_BIN "telegram binary missing" ;;

  telegram-send-code)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    _tgb="$(command -v "$BIN/mtproto-store" 2>/dev/null || command -v "$STATE/bin/mtproto-store" 2>/dev/null || echo mtproto-store)"
    _ph="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | "$JQ" -r '.phone // empty' 2>/dev/null)"
    [ -n "$_ph" ] || { err ERR_INVALID_PHONE "no phone"; exit 0; }
    _o="$(MTPROTO_STORE_TAG=VDB MTPROTO_STORE_STATE="$SECRETS/telegram" "$_tgb" send-code --phone "$_ph" 2>/dev/null)"
    [ -n "$_o" ] && printf '%s\n' "$_o" || err ERR_SEND_CODE "send-code failed" ;;

  telegram-sign-in)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    _tgb="$(command -v "$BIN/mtproto-store" 2>/dev/null || command -v "$STATE/bin/mtproto-store" 2>/dev/null || echo mtproto-store)"
    _a="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"
    _ph="$(printf '%s' "$_a" | "$JQ" -r '.phone // empty' 2>/dev/null)"
    _cd="$(printf '%s' "$_a" | "$JQ" -r '.code // empty' 2>/dev/null)"
    _pw="$(printf '%s' "$_a" | "$JQ" -r '.password // empty' 2>/dev/null)"
    { [ -n "$_ph" ] && [ -n "$_cd" ]; } || { err ERR_INVALID_ARGS "phone and code required"; exit 0; }
    # --password (2FA) is on argv: acceptable here (root-local; only root reads /proc/pid/cmdline).
    if [ -n "$_pw" ]; then
      _o="$(MTPROTO_STORE_TAG=VDB MTPROTO_STORE_STATE="$SECRETS/telegram" "$_tgb" sign-in --phone "$_ph" --code "$_cd" --password "$_pw" 2>/dev/null)"
    else
      _o="$(MTPROTO_STORE_TAG=VDB MTPROTO_STORE_STATE="$SECRETS/telegram" "$_tgb" sign-in --phone "$_ph" --code "$_cd" 2>/dev/null)"
    fi
    [ -n "$_o" ] && printf '%s\n' "$_o" || err ERR_SIGN_IN "sign-in failed" ;;

  telegram-logout)
    _tgb="$(command -v "$BIN/mtproto-store" 2>/dev/null || command -v "$STATE/bin/mtproto-store" 2>/dev/null || echo mtproto-store)"
    MTPROTO_STORE_TAG=VDB MTPROTO_STORE_STATE="$SECRETS/telegram" "$_tgb" logout 2>/dev/null
    ok "\"loggedout\":true" ;;

  telegram-delete)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    _tgb="$(command -v "$BIN/mtproto-store" 2>/dev/null || command -v "$STATE/bin/mtproto-store" 2>/dev/null || echo mtproto-store)"
    _mid="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | "$JQ" -r '.message_id // empty' 2>/dev/null)"
    case "$_mid" in ''|*[!0-9,]*) err ERR_INVALID_REF "invalid message_id"; exit 0 ;; esac   # digits (+ comma for batch); it feeds --ref
    _o="$(MTPROTO_STORE_TAG=VDB MTPROTO_STORE_STATE="$SECRETS/telegram" "$_tgb" delete --ref "$_mid" 2>/dev/null)"
    [ -n "$_o" ] && printf '%s\n' "$_o" || err ERR_TG_DELETE "delete failed" ;;

  rclone-delete)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    _a="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"
    id="$(printf '%s' "$_a" | "$JQ" -r '.dest // empty' 2>/dev/null)"
    rref="$(printf '%s' "$_a" | "$JQ" -r '.rref // empty' 2>/dev/null)"
    f="$STATE/dests/$id.json"
    { [ -n "$id" ] && [ -f "$f" ] && [ "$("$JQ" -r '.type // empty' "$f")" = rclone ]; } || { err ERR_DEST_NONE "no such rclone destination"; exit 0; }
    case "$rref" in ''|/*|*..*) err ERR_INVALID_REF "invalid rref"; exit 0 ;; esac
    case "$rref" in */*) : ;; *) err ERR_INVALID_REF "invalid rref"; exit 0 ;; esac   # must be <pkg>/<ts_vc>
    case "${rref#*/}" in */*) err ERR_INVALID_REF "invalid rref"; exit 0 ;; esac      # exactly two components, never a whole-package or root purge
    rem="$("$JQ" -r '.remote // empty' "$f")"; dp="$("$JQ" -r '.path // empty' "$f")"; pfx="${dp:+$dp/}vdbackup"
    _rc="$(command -v "$BIN/rclone" 2>/dev/null || command -v "$STATE/bin/rclone" 2>/dev/null || echo rclone)"
    if "$_rc" --config "$SECRETS/rclone.conf" purge "$rem:$pfx/$rref" >/dev/null 2>&1; then
      printf '{"ts":"%s","op":"rclone-delete","dest":"%s","rref":"%s"}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(jstr "$id")" "$(jstr "$rref")" >> "$LOGS/audit.jsonl"
      ok "\"deleted\":\"$(jstr "$rref")\""
    else err ERR_DELETE "could not delete the remote backup"; fi ;;

  gdrive-delete)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    _a="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"
    id="$(printf '%s' "$_a" | "$JQ" -r '.dest // empty' 2>/dev/null)"
    fld="$(printf '%s' "$_a" | "$JQ" -r '.folder // empty' 2>/dev/null)"
    f="$STATE/dests/$id.json"
    { [ -n "$id" ] && [ -f "$f" ] && [ "$("$JQ" -r '.type // empty' "$f")" = gdrive ]; } || { err ERR_DEST_NONE "no such gdrive destination"; exit 0; }
    case "$fld" in ''|*[!A-Za-z0-9_-]*) err ERR_INVALID_REF "invalid folder id"; exit 0 ;; esac
    _o="$(drive_hcmd delete -e id "$fld")"
    if printf '%s' "$_o" | "$JQ" -e '.ok==true' >/dev/null 2>&1; then
      printf '{"ts":"%s","op":"gdrive-delete","dest":"%s","folder":"%s"}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(jstr "$id")" "$(jstr "$fld")" >> "$LOGS/audit.jsonl"
      ok "\"deleted\":\"$(jstr "$fld")\""
    else err ERR_DELETE "could not delete the Drive backup"; fi ;;

  config-exports)
    # list the encrypted config bundles available to import (newest first).
    printf '{"ok":true,"exports":['
    first=1
    for f in $(ls -t /data/media/0/VDBackup/.export/vdbackup-config-*.tar.zst.age 2>/dev/null); do
      [ -f "$f" ] || continue
      sz="$(stat -c %s "$f" 2>/dev/null || echo 0)"
      [ "$first" = 1 ] || printf ','; first=0
      printf '{"ref":"%s","name":"%s","size":%s}' "$(jstr "$f")" "$(jstr "$(basename "$f")")" "$sz"
    done
    printf ']}\n' ;;

  wipe-credentials)
    # remove stored remote credentials and the device encryption key. Destinations and
    # jobs stay, but they will need their passwords re-entered; backups are untouched.
    rm -f "$SECRETS/creds"/* "$SECRETS/keys"/* 2>/dev/null
    ok '"wiped":true' ;;

  reset-data)
    # Scoped self-reset to start fresh. DESTRUCTIVE - the WebUI gates it behind an explicit
    # confirm. Only ever touches this module's own state ($STATE), its credentials ($SECRETS) and
    # the backup roots (each guarded to a */VDBackup or */vdbackup path) - never anything else and
    # never a cloud remote. ARGS: {config:bool, backups:bool}; either/both.
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    _j="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"
    _rc="$(printf '%s' "$_j" | "$JQ" -r '.config // false' 2>/dev/null)"
    _rb="$(printf '%s' "$_j" | "$JQ" -r '.backups // false' 2>/dev/null)"
    _did=""
    if [ "$_rb" = true ]; then
      # collect every backup root FIRST (local_dest_roots reads $STATE/dests, which a config reset
      # below would remove), then delete each - guarded so only a VDBackup/vdbackup dir is ever hit.
      { for _u in $(ls -d /data/media/[0-9]* 2>/dev/null | sed 's|.*/||'); do bdir "$_u"; done; local_dest_roots; } \
        | while IFS= read -r _r; do
            [ -n "$_r" ] || continue
            case "$_r" in */VDBackup|*/vdbackup) [ -d "$_r" ] && rm -rf "$_r" 2>/dev/null ;; esac
          done
      _did="backups"
    fi
    if [ "$_rc" = true ]; then
      printf '{}\n' > "$STATE/config.json" 2>/dev/null; chmod 600 "$STATE/config.json" 2>/dev/null
      rm -rf "$STATE/dests" "$STATE/jobs" "$STATE/iconcache" "$STATE/staging" 2>/dev/null
      rm -f "$SECRETS/creds"/* "$SECRETS/keys"/* 2>/dev/null; rm -rf "$SECRETS/telegram" 2>/dev/null
      _did="${_did:+$_did,}config"
    fi
    printf '{"ts":"%s","op":"reset-data","scope":"%s"}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$_did" >> "$LOGS/audit.jsonl" 2>/dev/null
    ok "\"reset\":\"$_did\"" ;;

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
    u="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | \
         "$(command -v "$BIN/jq" 2>/dev/null || echo jq)" -r '.user // 0' 2>/dev/null)"
    case "$u" in ''|*[!0-9]*) u=0 ;; esac
    avail() { for p in "$@"; do [ -e "$p" ] && { echo true; return; }; done; echo false; }
    m="$(avail "/data/user/$u/com.android.providers.telephony" "/data/user_de/$u/com.android.providers.telephony")"
    rcs="$(avail "/data/user/$u/com.google.android.apps.messaging" "/data/user_de/$u/com.google.android.apps.messaging")"
    c="$(avail "/data/user/$u/com.android.providers.contacts" "/data/user_de/$u/com.android.providers.contacts")"
    w="$(avail /data/misc/wifi /data/misc/apexdata/com.android.wifi)"
    b="$(avail /data/misc/bluedroid /data/misc/bluetooth "/data/user/$u/com.android.bluetooth")"
    cal="$(avail "/data/user/$u/com.android.providers.calendar" "/data/user_de/$u/com.android.providers.calendar")"
    wp="$(avail "/data/system/users/$u/wallpaper" "/data/system/users/$u/wallpaper_lock" "/data/system/users/$u/wallpaper_info.xml")"
    dnsmode="$(env -u LD_LIBRARY_PATH /system/bin/settings get global private_dns_mode 2>/dev/null)"
    dns=false; case "$dnsmode" in ''|null) ;; *) dns=true ;; esac
    printf '{"ok":true,"categories":[{"id":"messages","available":%s},{"id":"rcs","available":%s},{"id":"contacts","available":%s},{"id":"wifi","available":%s},{"id":"bluetooth","available":%s},{"id":"calendar","available":%s},{"id":"wallpaper","available":%s},{"id":"dns","available":%s},{"id":"system_settings","available":true,"opt_in":true}]}\n' "$m" "$rcs" "$c" "$w" "$b" "$cal" "$wp" "$dns" ;;

  special-list)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    u="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | "$JQ" -r '.user // 0' 2>/dev/null)"
    case "$u" in ''|*[!0-9]*) u=0 ;; esac
    _bk="$(bdir "$u")/.special"
    printf '{"ok":true,"backups":['
    first=1
    for m in "$_bk"/*/manifest.json; do
      [ -f "$m" ] || continue
      [ "$first" = 1 ] || printf ','; first=0
      ref="$(dirname "$m")"
      printf '%s' "$(read_meta "$ref")" | "$JQ" -c --arg ref "$ref" '{ref:$ref, created_at:.created_at, categories:(.categories // null), encrypted:.encrypted, locked:.locked}' 2>/dev/null
    done
    printf ']}\n' ;;

  adb-list)
    # Lazy one-level listing of the /data/adb tree for the filesystem-backup picker. Returns each
    # child's name/type/size/has_children. Confined to /data/adb; file size is exact, dir size is
    # deferred (0) and fetched on demand (adb-du) so the listing stays snappy on large subtrees.
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    p="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | "$JQ" -r '.path // "/data/adb"' 2>/dev/null)"
    case "$p" in /data/adb|/data/adb/*) : ;; *) err ERR_BAD_PATH "outside /data/adb"; exit 0 ;; esac
    case "$p" in *..*) err ERR_BAD_PATH "traversal"; exit 0 ;; esac
    [ -d "$p" ] || { err ERR_NO_PATH "not a directory"; exit 0; }
    printf '{"ok":true,"path":"%s","entries":[' "$(jstr "$p")"
    first=1
    for e in "$p"/* "$p"/.*; do
      { [ -e "$e" ] || [ -L "$e" ]; } || continue
      nm="${e##*/}"; case "$nm" in .|..) continue ;; esac
      if [ -L "$e" ]; then ty=link; sz=0; hc=false
      elif [ -d "$e" ]; then
        ty=dir; sz=0; hc=false
        for _c in "$e"/* "$e"/.*; do case "${_c##*/}" in .|..) ;; *) { [ -e "$_c" ] || [ -L "$_c" ]; } && { hc=true; break; } ;; esac; done
      else ty=file; sz="$(stat -c %s "$e" 2>/dev/null || echo 0)"; case "$sz" in ''|*[!0-9]*) sz=0 ;; esac; hc=false
      fi
      [ "$first" = 1 ] || printf ','; first=0
      printf '{"name":"%s","type":"%s","size":%s,"has_children":%s}' "$(jstr "$nm")" "$ty" "$sz" "$hc"
    done
    printf ']}\n' ;;

  adb-du)
    # On-demand recursive size of one /data/adb subtree (bytes), for the picker to annotate a dir.
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    p="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | "$JQ" -r '.path // empty' 2>/dev/null)"
    case "$p" in /data/adb|/data/adb/*) : ;; *) err ERR_BAD_PATH "outside /data/adb"; exit 0 ;; esac
    case "$p" in *..*) err ERR_BAD_PATH "traversal"; exit 0 ;; esac
    [ -e "$p" ] || { err ERR_NO_PATH "no path"; exit 0; }
    sz="$(du -sk "$p" 2>/dev/null | cut -f1)"; case "$sz" in ''|*[!0-9]*) sz=0 ;; esac   # toybox du: -k (KiB), no -B
    ok "\"path\":\"$(jstr "$p")\",\"size\":$("$JQ" -n "${sz:-0} * 1024")" ;;

  adb-backups)
    # list the /data/adb filesystem backups (local .adb store, like path-list)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    _bk="$(bdir 0)/.adb"
    printf '{"ok":true,"backups":['
    first=1
    for m in "$_bk"/*/manifest.json; do
      [ -f "$m" ] || continue
      [ "$first" = 1 ] || printf ','; first=0
      _r="$(dirname "$m")"
      printf '%s' "$(read_meta "$_r")" | "$JQ" -c --arg ref "$_r" '{ref:$ref, created_at:.created_at, mode:.mode, paths:(.paths // null), encryption:(.encryption // (if .encrypted then "age" else "none" end)), encrypted:.encrypted, locked:.locked}' 2>/dev/null
    done
    printf ']}\n' ;;

  adb-index)
    # the stored verbose file listing of one /data/adb backup, for the restore tree picker
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    ref="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | "$JQ" -r '.ref // empty' 2>/dev/null)"
    case "$ref" in /data/media/*/VDBackup/.adb/*) : ;; *) err ERR_BAD_REF "bad ref"; exit 0 ;; esac
    case "$ref" in *..*) err ERR_BAD_REF "traversal"; exit 0 ;; esac
    _bipw="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | "$JQ" -r '.password // empty' 2>/dev/null)"
    # An encrypted /data/adb backup seals its file index too; the tree picker needs the passphrase.
    if [ -f "$ref/index.txt.gz.age" ]; then
      [ -n "$_bipw" ] || { err ERR_CRYPTO_PASS "passphrase required"; exit 0; }
      _ix="$(dec_mani_pw "$_bipw" "$ref/index.txt.gz.age")" || { err ERR_CRYPTO_PASS "wrong passphrase"; exit 0; }
      gzip -dc "$_ix" 2>/dev/null | "$JQ" -R -s -c '{ok:true,lines:(split("\n")|map(select(length>0)))}'; rm -f "$_ix"
    elif [ -f "$ref/index.txt.gz" ]; then
      gzip -dc "$ref/index.txt.gz" 2>/dev/null | "$JQ" -R -s -c '{ok:true,lines:(split("\n")|map(select(length>0)))}'
    else err ERR_NO_BACKUP "no index"; exit 0; fi ;;

  progress)
    opid="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"
    case "$opid" in ''|*[!A-Za-z0-9._-]*) err ERR_BAD_OPID "invalid opid"; exit 0 ;; esac   # same charset guard as detach(): opid feeds a path
    f="$LOGS/progress-$opid.json"
    if [ -s "$f" ]; then cat "$f"; else ok "\"opid\":\"$(jstr "$opid")\",\"percent\":0,\"phase\":\"starting\""; fi ;;

  cancel)
    opid="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"
    case "$opid" in ''|*[!A-Za-z0-9._-]*) err ERR_BAD_OPID "invalid opid"; exit 0 ;; esac   # opid feeds a path
    pid="$(cat "$LOGS/$opid.pid" 2>/dev/null)"
    case "$pid" in ''|*[!0-9]*) pid="" ;; esac   # a non-numeric pid would make kill -"$pid" target a signal/arbitrary group
    if [ -n "$pid" ]; then kill -TERM -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null; fi
    ok "\"cancelled\":\"$(jstr "$opid")\"" ;;

  list-ops)
    # active operations, so the UI can reattach after being reopened
    printf '{"ok":true,"ops":['
    first=1
    for p in "$LOGS"/*.pid; do
      [ -e "$p" ] || continue
      id="$(basename "$p" .pid)"
      _lp="$(cat "$p" 2>/dev/null)"; case "$_lp" in ''|*[!0-9]*) : ;; *) kill -0 "$_lp" 2>/dev/null || continue ;; esac   # skip ops whose worker died (SIGKILL leaves a stale .pid) so the UI does not reattach to a dead op
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
    _u="$(printf '%s' "$_a" | "$JQ" -r '.user // 0' 2>/dev/null)"
    printf '{"ok":true,"backups":['
    first=1
    while IFS= read -r _bk; do
    [ -n "$_bk" ] || continue
    for m in "$_bk"/${pkg:-*}/*/manifest.json; do
      [ -f "$m" ] || continue
      [ "$first" = 1 ] || printf ','; first=0
      ref="$(dirname "$m")"
      # the APK is stored as base*.apk.zst (recorded under package.apk.files), not as a
      # manifest items[] entry, so surface it as a selectable "apk" item when present -
      # otherwise the restore dialog can never offer it and an uninstalled app is never
      # reinstalled. Detect by disk so imported (Neo/DataBackup) backups count too.
      _hasapk=false; ls "$ref"/base*.apk.zst* >/dev/null 2>&1 && _hasapk=true
      # user-set name + tags live in a sidecar note.json in the backup dir, so they travel with
      # the backup on export/import and never touch the immutable manifest. Default when absent.
      _nt="$("$JQ" -c '{note:(.note//""),tags:((.tags//[])|map(select(type=="string")))}' "$ref/note.json" 2>/dev/null)"; case "$_nt" in '') _nt='{"note":"","tags":[]}' ;; esac
      _pin=false; [ -f "$ref/.pinned" ] && _pin=true   # pinned backups are exempt from retention (#pin)
      # Pull the listing fields from the plaintext manifest OR, for an encrypted backup, from
      # the device-key stub (fast, no passphrase); locked:true marks one whose stub this device
      # cannot open (moved from elsewhere) - still restorable with the passphrase.
      printf '%s' "$(backup_listing "$ref")" | "$JQ" -c --arg ref "$ref" --argjson hasapk "$_hasapk" --argjson nt "$_nt" --argjson pin "$_pin" \
        '{ref:$ref, package:.package, label:.label, versionName:.versionName,
          versionCode:.versionCode, created_at:.created_at, mode:.mode,
          note:$nt.note, tags:$nt.tags, pinned:$pin, encrypted:.encrypted, locked:.locked, size:(.size // 0),
          items:((if $hasapk then ["apk"] else [] end) + .types)}' 2>/dev/null
    done
    done <<EOF
$(backup_roots "$_u")
EOF
    # Mirror backups: a Mirror keeps ONE live copy per app under
    # <backups_dir>/.mirror/vdbackup/<pkg>/{component,meta.json} - no <TS_VC> level and no
    # manifest.json, so the loop above (keyed on manifest.json) never lists them. Surface each as
    # a single mode:"mirror" entry. Restore resolves a mirror by dest+package (do_restore_mirror),
    # not by ref, so dest is the default local store. A mirror's meta.json is framework state,
    # not a manifest, so there is no versionCode/label - the UI falls back to the package name;
    # created_at is the dir mtime (ms, so the frontend's shortDate parses it like a full backup).
    _mroot="$(bdir "$_u")/.mirror/vdbackup"
    for _md in "$_mroot"/${pkg:-*}/.; do
      _mp="${_md%/.}"; [ -d "$_mp" ] || continue
      _mpkg="${_mp##*/}"; case "$_mpkg" in ''|'*') continue ;; esac
      _mit=""; for _c in data data_de external obb media apk; do [ -d "$_mp/$_c" ] && _mit="$_mit\"$_c\","; done
      [ -n "$_mit" ] || continue   # a dir with no restorable component is not a backup
      _mts="$(stat -c %Y "$_mp" 2>/dev/null || echo 0)"; case "$_mts" in ''|*[!0-9]*) _mts=0 ;; esac
      _mnt="$("$JQ" -c '{note:(.note//""),tags:((.tags//[])|map(select(type=="string")))}' "$_mp/note.json" 2>/dev/null)"; case "$_mnt" in '') _mnt='{"note":"","tags":[]}' ;; esac
      [ "$first" = 1 ] || printf ','; first=0
      printf '{"ref":"%s","package":"%s","label":"%s","mode":"mirror","dest":"local","versionName":"","versionCode":0,"created_at":%s000,"note":%s,"tags":%s,"items":[%s]}' \
        "$(jstr "$_mp")" "$(jstr "$_mpkg")" "$(jstr "$_mpkg")" "$_mts" \
        "$(printf '%s' "$_mnt" | "$JQ" -c '.note')" "$(printf '%s' "$_mnt" | "$JQ" -c '.tags')" "${_mit%,}"
    done
    printf ']}\n' ;;

  note-set)
    # set or clear a backup's user name + tags (sidecar note.json in the backup dir, so it
    # travels with the backup on export/import). ref must be inside a VDBackup store; no traversal.
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    _a="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"
    ref="$(printf '%s' "$_a" | "$JQ" -r '.ref // empty' 2>/dev/null)"
    case "$ref" in /data/media/*/VDBackup/*) : ;; *) err ERR_BAD_REF "bad ref"; exit 0 ;; esac
    case "$ref" in *..*) err ERR_BAD_REF "traversal"; exit 0 ;; esac
    [ -d "$ref" ] || { err ERR_NO_BACKUP "no backup"; exit 0; }
    _nt="$(printf '%s' "$_a" | "$JQ" -c '{note:((.note//"")|tostring|.[0:200]),tags:((.tags//[])|map(select(type=="string")|.[0:40])|map(select(length>0))|unique|.[0:32])}' 2>/dev/null)"
    case "$_nt" in '') _nt='{"note":"","tags":[]}' ;; esac
    if [ "$(printf '%s' "$_nt" | "$JQ" -r '(.note=="" and (.tags|length)==0)' 2>/dev/null)" = true ]; then
      rm -f "$ref/note.json"
    else
      printf '%s\n' "$_nt" > "$ref/note.json"
    fi
    printf '{"ok":true}\n' ;;

  pin-set)
    # pin/unpin a backup so retention (prune_pkg) never deletes it. A `.pinned` marker file in the
    # backup dir: its presence = pinned. It lives in the backup dir, so it travels on export/import.
    # Same ref guards as note-set (must be under a VDBackup store, no traversal).
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    _a="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"
    ref="$(printf '%s' "$_a" | "$JQ" -r '.ref // empty' 2>/dev/null)"
    case "$ref" in /data/media/*/VDBackup/*) : ;; *) err ERR_BAD_REF "bad ref"; exit 0 ;; esac
    case "$ref" in *..*) err ERR_BAD_REF "traversal"; exit 0 ;; esac
    [ -d "$ref" ] || { err ERR_NO_BACKUP "no backup"; exit 0; }
    _pin="$(printf '%s' "$_a" | "$JQ" -r '.pinned // false' 2>/dev/null)"
    if [ "$_pin" = true ]; then : > "$ref/.pinned"; else rm -f "$ref/.pinned"; _pin=false; fi
    printf '{"ok":true,"pinned":%s}\n' "$_pin" ;;

  pass-set-global)
    # Store or clear the global default passphrase (root-only, CE, 0600). Write-only - the value
    # is never returned; the UI only learns whether one is set.
    _pw="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | "$JQ" -r '.password // ""' 2>/dev/null)"
    secrets_init 2>/dev/null; mkdir -p "$SECRETS/creds" 2>/dev/null
    if [ -z "$_pw" ]; then rm -f "$SECRETS/creds/pass.global"
    else ( umask 077; printf '%s' "$_pw" > "$SECRETS/creds/pass.global" ); chmod 600 "$SECRETS/creds/pass.global" 2>/dev/null; fi
    ok "\"set\":$([ -f "$SECRETS/creds/pass.global" ] && echo true || echo false)" ;;
  pass-set-app)
    _a="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"
    _pk="$(printf '%s' "$_a" | "$JQ" -r '.package // ""' 2>/dev/null)"
    case "$_pk" in ''|*/*|*' '*|*..*) err ERR_NO_PACKAGE "bad package"; exit 0 ;; esac
    _pw="$(printf '%s' "$_a" | "$JQ" -r '.password // ""' 2>/dev/null)"
    secrets_init 2>/dev/null; mkdir -p "$SECRETS/creds" 2>/dev/null
    if [ -z "$_pw" ]; then rm -f "$SECRETS/creds/pass.app.$_pk"
    else ( umask 077; printf '%s' "$_pw" > "$SECRETS/creds/pass.app.$_pk" ); chmod 600 "$SECRETS/creds/pass.app.$_pk" 2>/dev/null; fi
    ok "\"set\":$([ -f "$SECRETS/creds/pass.app.$_pk" ] && echo true || echo false)" ;;
  pass-status)
    _pk="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | "$JQ" -r '.package // ""' 2>/dev/null)"
    _ap=false; case "$_pk" in ''|*/*|*' '*|*..*) : ;; *) [ -f "$SECRETS/creds/pass.app.$_pk" ] && _ap=true ;; esac
    ok "\"global\":$([ -f "$SECRETS/creds/pass.global" ] && echo true || echo false),\"app\":$_ap" ;;

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
      _r="$(dirname "$m")"
      printf '%s' "$(read_meta "$_r")" | "$JQ" -c --arg ref "$_r" \
        '{ref:$ref, source:(.source // ""), created_at:(.created_at // ""),
          encryption:(.encryption // (if .encrypted then "age" else "none" end)), compression:(.compression // ""),
          encrypted:.encrypted, locked:.locked}' 2>/dev/null
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
    # Count across EVERY backup root (internal store + each configured local destination), exactly
    # like list-backups: a backup sent to a local dest lives there, not in the internal store, so
    # counting only bdir reported 0 for a user whose backups sit on an SD/USB local dest.
    # apps is de-duplicated by package (an app backed up to two roots is one app, N instances).
    apps=0; insts=0; paths=0; size=0
    _ovapps="$STATE/staging/overview.$$.apps"; mkdir -p "$STATE/staging"; : > "$_ovapps"
    for _r in $(backup_roots "$u"); do          # roots are validated, newline-separated, no spaces
      [ -d "$_r" ] || continue
      for d in "$_r"/*/; do
        [ -d "$d" ] || continue
        case "$d" in "$_r"/.paths/) continue ;; esac
        _c=0; for s in "$d"*/; do [ -d "$s" ] && _c=$(( _c + 1 )); done
        [ "$_c" -gt 0 ] || continue
        insts=$(( insts + _c )); _b="${d%/}"; printf '%s\n' "${_b##*/}" >> "$_ovapps"
      done
      for d in "$_r"/.paths/*/; do [ -d "$d" ] && paths=$(( paths + 1 )); done
      _sk="$(du -sk "$_r" 2>/dev/null | cut -f1)"; case "$_sk" in ''|*[!0-9]*) _sk=0 ;; esac
      size="$("$JQ" -n "${size:-0} + ${_sk:-0} * 1024")"   # toybox du: -k (KiB), never -B
    done
    apps="$(sort -u "$_ovapps" 2>/dev/null | grep -c .)"; case "$apps" in ''|*[!0-9]*) apps=0 ;; esac
    rm -f "$_ovapps"
    jobs=0; for f in "$STATE/jobs"/*.json; do [ -f "$f" ] && jobs=$(( jobs + 1 )); done
    _dfp="$bk"; [ -d "$_dfp" ] || _dfp="/data/media/$u"; [ -d "$_dfp" ] || _dfp=/data
    free=0; total=0
    set -- $(df -kP "$_dfp" 2>/dev/null | tail -1)
    case "${2:-}" in *[0-9]*) total="$("$JQ" -n "${2:-0} * 1024")" ;; esac
    case "${4:-}" in *[0-9]*) free="$("$JQ" -n "${4:-0} * 1024")" ;; esac
    "$JQ" -nc --argjson apps "$apps" --argjson instances "$insts" --argjson paths "$paths" \
      --argjson jobs "$jobs" --argjson size "$size" --argjson free "$free" --argjson total "$total" \
      '{ok:true, apps:$apps, instances:$instances, path_backups:$paths, jobs:$jobs,
        backups_size:$size, free:$free, total:$total}' ;;

  backup-info)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    _bi="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"
    ref="$(printf '%s' "$_bi" | "$JQ" -r '.ref // empty' 2>/dev/null)"
    _bipw="$(printf '%s' "$_bi" | "$JQ" -r '.password // empty' 2>/dev/null)"
    [ -n "$(ref_root "$ref")" ] || { err ERR_BAD_REF "invalid ref"; exit 0; }
    m="$ref/manifest.json"; [ -f "$m" ] || { err ERR_NO_BACKUP "manifest not found"; exit 0; }
    size="$(du -sk "$ref" 2>/dev/null | cut -f1)"; case "$size" in ''|*[!0-9]*) size=0 ;; esac; size="$("$JQ" -n "${size:-0} * 1024")"
    # jq filter for a plaintext manifest -> the full info shape. Reused for an unencrypted backup and
    # for an encrypted one once the caller supplies the passphrase and we decrypt manifest.full.age.
    _bi_full='{ok:true, ref:(.ref // $ref), created_at:.created_at, mode:.mode, user_id:(.user_id // 0),
        size:$size, package:(.package|del(.icon)), device:.device,
        items:[.items[]|{type, archive, sha256, size}],
        permissions:{runtime:((.permissions.runtime|length)//0),
                     granted:([.permissions.runtime[]?|select(.granted)]|length),
                     appops:((.permissions.appops|length)//0),
                     ssaid:((.permissions.ssaid|length)>0)}, encrypted:$enc, locked:false, unlocked:true}'
    # An encrypted backup keeps its device/items/permissions sealed in manifest.full.age. Without
    # the passphrase the panel shows only the stub-level fields and marks it encrypted (locked); WITH
    # the passphrase (the "show details" button) we decrypt the full manifest and reveal everything,
    # on demand, without restoring anything.
    if [ -f "$ref/manifest.full.age" ]; then
      if [ -n "$_bipw" ]; then
        _fm="$(dec_mani_pw "$_bipw" "$ref/manifest.full.age")" || { err ERR_CRYPTO_PASS "wrong passphrase"; exit 0; }
        if [ -f "$ref/manifest.full.age.sha256" ] && [ "$(sha256sum "$_fm" | cut -d' ' -f1)" != "$(cat "$ref/manifest.full.age.sha256")" ]; then
          rm -f "$_fm"; err ERR_MANIFEST_SHA "integrity check failed"; exit 0; fi
        "$JQ" -c --argjson size "${size:-0}" --arg ref "$ref" --argjson enc true "$_bi_full" "$_fm" 2>/dev/null
        rm -f "$_fm"
      else
        printf '%s' "$(backup_listing "$ref")" | "$JQ" -c --argjson size "${size:-0}" --arg ref "$ref" \
          '{ok:true, ref:$ref, created_at:.created_at, mode:.mode, user_id:0, size:$size,
            package:{name:.package, label:.label, versionName:.versionName, versionCode:.versionCode},
            device:null, items:null, permissions:null, encrypted:true, locked:.locked, unlocked:false}' 2>/dev/null
      fi
    else
      "$JQ" -c --argjson size "${size:-0}" --arg ref "$ref" --argjson enc false "$_bi_full" "$m" 2>/dev/null
    fi ;;

  backup-icon)
    # the app icon (base64 PNG) stored in the backup manifest, so the Backups list
    # shows it even when the app is no longer installed. No live app/APK needed.
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    ref="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | "$JQ" -r '.ref // empty' 2>/dev/null)"
    [ -n "$(ref_root "$ref")" ] || { err ERR_BAD_REF "invalid ref"; exit 0; }
    m="$ref/manifest.json"; [ -f "$m" ] || { err ERR_NO_BACKUP "manifest not found"; exit 0; }
    if [ -f "$ref/manifest.full.age" ]; then ic="$(backup_listing "$ref" | "$JQ" -r '.icon // empty' 2>/dev/null)"
    else ic="$("$JQ" -r '.package.icon // empty' "$m" 2>/dev/null)"; fi
    if [ -n "$ic" ]; then ok "\"icon\":\"$ic\""; else err ERR_ICON "no icon in manifest"; fi ;;

  backup-icons)
    # batched backup-icon: {refs:[...]} -> {ok:true,icons:{<ref>:<b64 or "">}}, "" = the backup
    # has no icon. Invalid refs and refs without a manifest are left out of the map.
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | "$JQ" -r '.refs[]? | strings' 2>/dev/null \
      | while IFS= read -r ref; do
          [ -n "$(ref_root "$ref")" ] || continue
          [ -f "$ref/manifest.json" ] || continue
          if [ -f "$ref/manifest.full.age" ]; then
            "$JQ" -c -n --arg r "$ref" --arg ic "$(backup_listing "$ref" | "$JQ" -r '.icon // ""' 2>/dev/null)" '{($r): $ic}'
          else
            "$JQ" -c --arg r "$ref" '{($r): (.package.icon // "")}' "$ref/manifest.json" 2>/dev/null
          fi
        done | "$JQ" -s -c '{ok:true, icons:(add // {})}' ;;

  delete-backup)
    ref="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | \
           "$(command -v "$BIN/jq" 2>/dev/null || echo jq)" -r '.ref // empty' 2>/dev/null)"
    # A backup lives under the internal store OR a configured local destination.
    # Resolve which root this ref sits under, so the delete and the empty-parent cleanup are
    # scoped to a known backups dir, never an arbitrary path. `..` is rejected first (it matches
    # no root), so no ref can traverse out of its root.
    _root="$(ref_root "$ref")"
    if [ -z "$_root" ]; then err ERR_BAD_REF "ref must be under a backups dir"
    elif rm -rf "$ref"; then
      # Remove now-empty parent dirs up to (not including) the root, so a deleted backup leaves
      # no empty app folder behind. rmdir only removes empty dirs; stop at the root.
      _dd="$(dirname "$ref")"
      while case "$_dd" in "$_root"/?*) : ;; *) false ;; esac && rmdir "$_dd" 2>/dev/null; do
        _dd="$(dirname "$_dd")"
      done
      printf '{"ts":"%s","op":"delete-backup","ref":"%s"}\n' \
        "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(jstr "$ref")" >> "$LOGS/audit.jsonl"
      ok "\"deleted\":\"$(jstr "$ref")\""
    else err ERR_DELETE "could not delete"; fi ;;

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
    # A local destination must stay encrypted at rest before first unlock (BFU). Allowlist
    # (deny by default): only credential-encrypted internal storage (/sdcard, /data/media)
    # and removable media (/storage, /mnt/media_rw) are allowed; EVERY other path is refused,
    # so the device-encrypted / system trees readable in the BFU state (/data/adb,
    # /data/system, /data/misc, /data/user_de, /data/local, /metadata, /cache, /persist, ...)
    # can never be a destination. `..` is rejected first so /data/media/../adb and similar
    # traversals cannot escape the allowlist into a pre-BFU tree.
    _dt="$(printf '%s' "$j" | "$JQ" -r '.type // "local"' 2>/dev/null)"
    _dp="$(printf '%s' "$j" | "$JQ" -r '.path // empty' 2>/dev/null)"
    if [ "$_dt" = local ] && [ -n "$_dp" ]; then
      case "$_dp" in *..*) err ERR_DEST_UNSAFE "refusing a backup destination with '..' (path traversal); use an absolute path under user storage"; exit 0 ;; esac
      case "$_dp" in
        /data/media/*|/storage/*|/mnt/media_rw/*|/sdcard/*|/sdcard) : ;;
        *) err ERR_DEST_UNSAFE "refusing a backup destination outside user storage: only internal storage (/sdcard, /data/media) and removable SD/USB (/storage, /mnt/media_rw) stay encrypted before first unlock; system / pre-BFU paths like /data/adb or /data/system are not allowed"; exit 0 ;;
      esac
    fi
    # removable media (SD card / USB) is portable storage: plaintext at rest, not encrypted
    # at all (not just before BFU). Flag it so the UI can warn that a backup there is only
    # protected if the backup itself is encrypted. Internal /storage/emulated is CE, not this.
    _rem=false
    if [ "$_dt" = local ]; then case "$_dp" in
        /mnt/media_rw/*) _rem=true ;;
        /storage/emulated/*|/storage/self/*) : ;;
        /storage/*) _rem=true ;;
      esac; fi
    mkdir -p "$STATE/dests" "$SECRETS/creds"
    printf '%s' "$j" | "$JQ" 'del(.password)' > "$STATE/dests/$id.json" && chmod 600 "$STATE/dests/$id.json"
    pw="$(printf '%s' "$j" | "$JQ" -r '.password // empty' 2>/dev/null)"
    [ -n "$pw" ] && { printf '%s' "$pw" > "$SECRETS/creds/$id.pass"; chmod 600 "$SECRETS/creds/$id.pass"; }
    ok "\"saved\":\"$(jstr "$id")\",\"removable\":$_rem" ;;

  dest-del)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    _a="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null)"
    id="$(printf '%s' "$_a" | "$JQ" -r '.id // empty' 2>/dev/null)"
    _force="$(printf '%s' "$_a" | "$JQ" -r '.force // false' 2>/dev/null)"
    case "$id" in ""|*/*) err ERR_DEST_ID "invalid id" ;; *)
      # A local dest is authoritative for its backups: deleting its config would orphan
      # any app backup living under it - it drops out of list/restore/delete and no internal copy is
      # left. Refuse while such backups exist, unless force:true, so the user moves/deletes them
      # first. (Path backups keep an internal copy, and `*` skips the dotted .paths dir, so they do
      # not count.)
      _dj="$STATE/dests/$id.json"; _dcnt=0
      if [ "$_force" != true ] && [ -f "$_dj" ] && [ "$("$JQ" -r '.type // "local"' "$_dj" 2>/dev/null)" = local ]; then
        _dp="$("$JQ" -r '.path // empty' "$_dj" 2>/dev/null)"
        case "$_dp" in ''|null|*..*) : ;; *)
          for _m in "$_dp"/vdbackup/*/*/manifest.json; do [ -f "$_m" ] && _dcnt=$(( _dcnt + 1 )); done ;;
        esac
      fi
      if [ "$_dcnt" -gt 0 ]; then err ERR_DEST_HAS_BACKUPS "destination still holds $_dcnt app backup(s); move or delete them first, or pass force"
      else rm -f "$_dj" "$SECRETS/creds/$id.pass"; ok "\"deleted\":\"$(jstr "$id")\""; fi ;;
    esac ;;

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
    "$BIN/rclone" --config "$SECRETS/rclone.conf" config create "$name" "$be" "$@" $OBS --non-interactive >/dev/null 2>&1
    if "$BIN/rclone" --config "$SECRETS/rclone.conf" listremotes 2>/dev/null | grep -qx "$name:"; then
      chmod 600 "$SECRETS/rclone.conf" 2>/dev/null; ok "\"name\":\"$(jstr "$name")\",\"backend\":\"$(jstr "$be")\""
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
    "$BIN/rclone" --config "$SECRETS/rclone.conf" listremotes --long 2>/dev/null | while IFS= read -r line; do
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
      "$BIN/rclone" --config "$SECRETS/rclone.conf" config delete "$name" >/dev/null 2>&1
      ok "\"deleted\":\"$(jstr "$name")\"" ;; esac ;;

  dest-test)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    id="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | "$JQ" -r '.id // empty' 2>/dev/null)"
    f="$STATE/dests/$id.json"; [ -f "$f" ] || { err ERR_DEST_NONE "no such destination"; exit 0; }
    t="$("$JQ" -r '.type // "local"' "$f")"
    case "$t" in
      local)  p="$("$JQ" -r '.path // empty' "$f")"; [ -d "${p:-$(bdir 0)}" ] && ok '"reachable":true' || err ERR_DEST_UNREACH "path not found" ;;
      rclone) rem="$("$JQ" -r '.remote // empty' "$f")"; "$BIN/rclone" --config "$SECRETS/rclone.conf" lsd "$rem:" >/dev/null 2>&1 && ok '"reachable":true' || err ERR_DEST_AUTH "rclone remote unreachable" ;;
      restic) repo="$("$JQ" -r '.repo // empty' "$f")"; RESTIC_PASSWORD_FILE="$SECRETS/creds/$id.pass" "$BIN/restic" -r "$repo" snapshots >/dev/null 2>&1 && ok '"reachable":true' || err ERR_DEST_AUTH "restic repo unreachable" ;;
      gdrive) cp="ru.vd171.vdbackup"; pm path "$cp" >/dev/null 2>&1 || { err ERR_COMPANION "Google Drive companion not installed"; exit 0; }
        drv="/data/data/$cp/files"; au="$(stat -c %u "/data/data/$cp" 2>/dev/null)"; mkdir -p "$drv" 2>/dev/null
        case "$au" in ''|*[!0-9]*) : ;; *) chown "$au:$au" "$drv" 2>/dev/null ;; esac; restorecon "$drv" 2>/dev/null
        res="$drv/test.$$"; rm -f "$res" "$res.done"
        env -u LD_LIBRARY_PATH -u LD_PRELOAD /system/bin/am start-foreground-service -n "$cp/.DriveCommandService" -e op check -e result "$res" >/dev/null 2>&1
        i=0; while [ ! -f "$res.done" ] && [ "$i" -lt 30 ]; do sleep 1; i=$((i+1)); done
        if [ -f "$res.done" ] && "$JQ" -e '.ok==true' "$res" >/dev/null 2>&1; then rm -f "$res" "$res.done"; ok '"reachable":true'
        else c="$("$JQ" -r '.code // "ERR_DRIVE_TIMEOUT"' "$res" 2>/dev/null)"; rm -f "$res" "$res.done"; err "${c:-ERR_DRIVE}" "Drive not reachable - authorize consent"; fi ;;
      telegram) _tgb="$(command -v "$BIN/mtproto-store" 2>/dev/null || command -v "$STATE/bin/mtproto-store" 2>/dev/null || echo mtproto-store)"
        _o="$(MTPROTO_STORE_TAG=VDB MTPROTO_STORE_STATE="$SECRETS/telegram" "$_tgb" check-auth 2>/dev/null)"
        { [ -n "$_o" ] && printf '%s' "$_o" | "$JQ" -e '.is_auth==true' >/dev/null 2>&1; } && ok '"reachable":true' \
          || err ERR_DEST_AUTH "Telegram not signed in - open the Telegram login and sign in first" ;;
      *) err ERR_DEST_TYPE "unknown type" ;;
    esac ;;

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
    # before the first unlock, remote credentials (CE storage) AND app data (/data/data,
    # CE) are both locked: a scheduled backup could neither authenticate nor read anything,
    # so skip the whole tick until the user has unlocked once.
    ce_ready || { printf '{"ok":true,"skipped":"ce_locked"}\n'; exit 0; }
    mkdir -p "$STATE/jobs"
    RAN=""; checked=0; launchn=0
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
      fired=0; items=""
      # resolve this job's target packages (single / list / all, minus blocklist) and launch ONE
      # detached batch op for the job: backup-batch of the packages, or restore-batch of each
      # one's latest backup. The worker runs them in sequence and prunes each app to <keep>
      # after its backup succeeds.
      launchn=$(( launchn + 1 )); opid="$(new_opid)-$launchn"
      for pkg in $(job_targets "$JQ" "$f"); do
        if [ "$action" = restore ]; then
          ref="$jref"; [ -n "$ref" ] || ref="$(latest_ref "$juser" "$pkg")"
          [ -n "$ref" ] || continue   # nothing to restore for this pkg
          printf '%s' "$items" | grep -qxF -- "$ref" && continue   # a pinned .ref is restored once
          items="$items$ref
"
        else
          items="$items$pkg
"
        fi
        fired=1
        RAN="$RAN$("$JQ" -cn --arg id "$id" --arg opid "$opid" --arg pkg "$pkg" --arg a "$action" '{id:$id,opid:$opid,package:$pkg,action:$a}'),"
        printf '{"ts":"%s","op":"scheduler-run","id":"%s","opid":"%s","package":"%s","action":"%s"}\n' \
          "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(jstr "$id")" "$(jstr "$opid")" "$(jstr "$pkg")" "$(jstr "$action")" >> "$LOGS/audit.jsonl"
      done
      [ "$fired" = 1 ] || continue   # due but no target resolved: do not stamp, retry next tick
      if [ "$action" = restore ]; then
        argj="$(printf '%s' "$items" | "$JQ" -R -s -c '{refs:(split("\n")|map(select(length>0)))}')"
        detach "$opid" restore-batch "$(printf '%s' "$argj" | base64 | tr -d '\n')"
      else
        argj="$(printf '%s' "$items" | "$JQ" -R -s -c --argjson u "$juser" --arg m "$jmode" --arg d "$jdest" --argjson k "$keep" \
          '{packages:(split("\n")|map(select(length>0))),user:$u,mode:$m,dest:$d,items:["apk","data","data_de","obb","external","media"],sched:true,keep:$k}')"
        detach "$opid" backup-batch "$(printf '%s' "$argj" | base64 | tr -d '\n')"
      fi
      tmp="$STATE/jobs/.$id.tmp"
      "$JQ" --argjson now "$now" '.last_run=$now' "$f" > "$tmp" 2>/dev/null && mv "$tmp" "$f" && chmod 600 "$f"
    done
    AUTO=""
    for _ao in $(auto_backup_scan "$JQ" "$now"); do AUTO="$AUTO\"$(jstr "$_ao")\","; done
    RAN="${RAN%,}"; AUTO="${AUTO%,}"
    printf '{"ok":true,"now":%s,"checked":%s,"ran":[%s],"auto":[%s]}\n' "$now" "$checked" "$RAN" "$AUTO" ;;

  companion-status)
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    inst=false; pm path ru.vd171.vdbackup >/dev/null 2>&1 && inst=true
    bundled=false; [ -f "$MODDIR/etc/companion.apk" ] && bundled=true
    vc="$(dumpsys package ru.vd171.vdbackup 2>/dev/null | sed -n 's/.*versionCode=\([0-9]*\).*/\1/p' | head -1)"
    "$JQ" -nc --argjson installed "$inst" --argjson bundled "$bundled" --arg vc "${vc:-}" \
      '{ok:true,installed:$installed,bundled:$bundled,versionCode:$vc}' ;;

  companion-install)
    # optional + on-demand: only ever called when the user picks Google Drive.
    [ -f "$MODDIR/etc/companion.apk" ] || { err ERR_COMPANION "companion APK not bundled in this build"; exit 0; }
    # system_server cannot read /data/adb (adb_data_file); stage under /data/local/tmp
    capk=/data/local/tmp/vdbackup-companion.apk; cp "$MODDIR/etc/companion.apk" "$capk"; chmod 644 "$capk"
    if pm install -r "$capk" >/dev/null 2>&1; then rm -f "$capk"; ok '"installed":true,"hma":true'
    else rm -f "$capk"; err ERR_COMPANION_INSTALL "could not install companion"; fi ;;

  list-dirs)
    # folder browser for the local-destination picker. Confined to shared storage
    # (/storage/emulated/<u> and its /data/media/<u> twin); lists sub-folders only.
    JQ="$(command -v "$BIN/jq" 2>/dev/null || echo jq)"
    p="$(printf '%s' "$ARGS_B64" | base64 -d 2>/dev/null | "$JQ" -r '.path // empty' 2>/dev/null)"
    case "$p" in ""|null) p=/storage/emulated/0 ;; esac
    case "$p" in *..*) err ERR_BAD_PATH "invalid path"; exit 0 ;; esac
    # internal shared storage plus external removable volumes (SD card / USB), so a backup
    # destination can live on an SD card or USB stick. Never a system / pre-BFU path.
    case "$p" in /storage|/storage/*|/mnt/media_rw|/mnt/media_rw/*|/data/media/*) : ;; *) err ERR_BAD_PATH "outside storage"; exit 0 ;; esac
    [ -d "$p" ] || { err ERR_NO_DIR "no such folder"; exit 0; }
    # parent (up), clamped so it never climbs above a storage root (the volumes list)
    parent="${p%/*}"
    case "$p" in
      /storage|/mnt/media_rw) parent="" ;;
      /storage/emulated|/storage/emulated/0|/data/media/0) parent="/storage" ;;
    esac
    case "$parent" in /storage|/storage/*|/mnt/media_rw|/mnt/media_rw/*|/data/media/*) : ;; *) parent="" ;; esac
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

  list-volumes)
    # storage volumes a local destination can live on: internal shared storage plus any
    # mounted removable media (SD card / USB), so the picker can jump straight to the card.
    # A volume often appears under both /mnt/media_rw/<id> and /storage/<id>; /mnt/media_rw
    # is the root-writable mount, so prefer it and dedup by id. emulated/self are not volumes.
    printf '{"ok":true,"volumes":[{"path":"/storage/emulated/0","removable":false}'
    seen=" "
    for base in /mnt/media_rw /storage; do
      for v in "$base"/*; do
        [ -d "$v" ] || continue
        id="$(basename "$v")"
        case "$id" in emulated|self) continue ;; esac
        case "$seen" in *" $id "*) continue ;; esac
        seen="$seen$id "
        printf ',{"path":"%s","removable":true,"id":"%s"}' "$(jstr "$v")" "$(jstr "$id")"
      done
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
    valid_pkg "$pkg" || { err ERR_BAD_PKG "invalid package"; exit 0; }
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
    # system-app content must present system_file to PMS: the mounter preserves the
    # source context, and adb_data_file makes system_server avc-deny the scan (app
    # never installs). Relabel the mounted tree so it reads as a real system partition.
    chcon -R u:object_r:system_file:s0 "$MM/system" 2>/dev/null
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
    valid_pkg "$pkg" || { err ERR_BAD_PKG "invalid package"; exit 0; }
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

  log-clear)
    # wipe the activity log, keeping a single stamp that records it was cleared (and when), so the
    # clear is itself auditable. Only ever touches audit.jsonl under the logs dir.
    : > "$LOGS/audit.jsonl" 2>/dev/null
    printf '{"ts":"%s","op":"log-clear"}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$LOGS/audit.jsonl" 2>/dev/null
    chmod 600 "$LOGS/audit.jsonl" 2>/dev/null
    ok '"cleared":true' ;;

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
    valid_pkg "$pkg" || { err ERR_BAD_REF "invalid package"; exit 0; }
    printf '{"ok":true,"pruned":['
    first=1
    for r in $(prune_pkg "$u" "$pkg" "$keep"); do
      [ "$first" = 1 ] || printf ','; first=0
      printf '"%s"' "$(jstr "$r")"
      printf '{"ts":"%s","op":"prune","ref":"%s"}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(jstr "$r")" >> "$LOGS/audit.jsonl"
    done
    printf ']}\n' ;;

  bootstrap)
    # first-paint data in one exec (the WebUI bridge runs one exec at a time): the same JSON the
    # separate verbs print, keyed by verb. Every verb stays callable on its own.
    printf '{"ok":true'
    for _v in config-get ping list-users list-ops dests-list; do
      _o="$(sh "$0" "$_v" '')"; printf ',"%s":%s' "$_v" "${_o:-null}"
    done
    _o="$(sh "$0" overview "$(printf '{"user":0}' | base64)")"; printf ',"overview":%s' "${_o:-null}"
    _o="$(sh "$0" log-read "$(printf '{"limit":4}' | base64)")"; printf ',"log-read":%s' "${_o:-null}"
    printf '}\n' ;;

  *)
    err ERR_UNKNOWN_VERB "unknown verb: $verb" ;;

esac
