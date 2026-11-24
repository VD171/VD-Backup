#!/usr/bin/env sh
# ======================================================================
#  VD-ModuleKit  ::  SELinux pm-install staging guardian  (STANDARDS 5/9)
#
#  `pm install-write` / `pm install` run as **system_server**, and SELinux
#  strict FORBIDS system_server from reading `/data/adb` (`adb_data_file`).
#  Installing an APK staged under `/data/adb/...` fails with
#    avc: denied { read } ... scontext=...system_server... tcontext=adb_data_file
#  and fails SILENTLY if the result is swallowed - the install just does not
#  happen, no visible error. Every session-install path MUST copy the APK to
#  `/data/local/tmp` (`shell_data_file`) BEFORE install-write, install from
#  there, and clean up.
#
#  This lint FAILS when a module feeds `pm install` an APK read straight from
#  `/data/adb` (literal path on the install line, or piped from a `/data/adb`
#  APK). Conservative: a cross-file variable that resolves to `/data/adb` is
#  NOT traced - this catches the common, re-introducible regression. Affects
#  APK-installing modules (VD-Installer, VD-Backup); others have no install
#  path and pass trivially.
#
#  Usage: selinux-pm-stage-lint.sh <module-root>
#  Exits 1 on a violation (so CI and the release ritual fail loud), 0 clean.
# ======================================================================
set -u
ROOT="${1:?usage: selinux-pm-stage-lint.sh <module-root>}"
[ -d "$ROOT" ] || { echo "not a directory: $ROOT" >&2; exit 2; }

hits=0
# Scripts that could run an install: shell + WebUI JS. Scan the module's RUNTIME scripts only
# (module/, webroot, root helpers); skip .git and CI tooling (.github/, tooling/) - those are
# build-time, and this guard's own vendored copy lives there and would self-match its examples.
files="$(find "$ROOT" -type f \( -name '*.sh' -o -name '*.js' \) ! -path '*/.git/*' ! -path '*/.github/*' ! -path '*/tooling/*' 2>/dev/null)"

for f in $files; do
	[ -f "$f" ] || continue
	# A line that BOTH invokes an install AND names a /data/adb APK source:
	#   - pm install-write ... /data/adb/foo.apk
	#   - cat /data/adb/foo.apk | pm install -S ... -
	#   - pm install -r /data/adb/foo.apk
	# Require the /data/adb path to end in an APK-ish extension so plain state
	# paths under /data/adb (config, baseline) never false-positive.
	matches="$(grep -nE 'install' "$f" 2>/dev/null \
		| grep -E '(pm|cmd[[:space:]]+package)[[:space:]]+install' \
		| grep -E '/data/adb/[^"'"'"' ]*\.(apk|apks|xapk|apkm|apex)')" || true
	[ -z "$matches" ] && continue
	printf '%s\n' "$matches" | while IFS= read -r m; do
		ln="${m%%:*}"
		echo "::error::$f:$ln pm install reads an APK from /data/adb - system_server cannot read adb_data_file under SELinux strict and the install aborts SILENTLY; stage the APK in /data/local/tmp first"
	done
	n="$(printf '%s\n' "$matches" | grep -c .)"
	hits=$((hits + n))
done

if [ "$hits" -gt 0 ]; then
	echo "FAIL: $hits pm-install path(s) read an APK from /data/adb (silent avc-denied abort on device)"
	exit 1
fi
echo "OK: no pm install reads an APK from /data/adb (staging in /data/local/tmp respected)"
