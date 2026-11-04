#!/usr/bin/env bash
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
#  Assemble module/bin/<abi>/ by FETCHING prebuilt binaries from the Termux
#  package REPOSITORY (packages.termux.dev/apt) - the official .debs, never from a
#  Termux installed on some Android device. Validated on device (Android 16/KSU):
#  Termux's GNU tar preserves user.*/security.* xattrs + SELinux labels, and
#  the binaries run standalone once their Termux libs are shipped alongside
#  (the engine sets LD_LIBRARY_PATH=$BIN/lib; Termux uses versioned sonames,
#  so there is no clash with the Android framework's libs).
#
#  For each ABI: resolve the tool packages + their transitive Depends from the
#  Termux Packages index, download and extract the .debs into a merged prefix,
#  copy the wanted binaries, then copy ONLY the shared-library closure each
#  binary needs (resolved with readelf) into bin/<abi>/lib.
#
#  Requirements (CI/ubuntu): curl, ar (binutils), tar, xz, zstd, readelf.
#  Runs unprivileged; no NDK, no toolchain.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT_BASE="$ROOT/module/bin"
WORK="${WORK:-$(mktemp -d)}"
REPO="${TERMUX_REPO:-https://packages.termux.dev/apt/termux-main}"

# ABI -> Termux arch
termux_arch() { case "$1" in
  arm64-v8a) echo aarch64 ;; armeabi-v7a) echo arm ;; x86) echo i686 ;; x86_64) echo x86_64 ;;
esac; }

ABIS="arm64-v8a armeabi-v7a x86 x86_64"
TOOL_PKGS="tar zstd gzip jq rclone restic rsync openssh age util-linux sqlite"
WANT_BINS="tar zstd gzip jq rclone restic rsync ssh sftp age age-keygen script sqlite3"
# libs always provided by Android (never bundle these)
BIONIC="libc.so libm.so libdl.so liblog.so libandroid.so libz.so libselinux.so libc++.so libc++_shared.so libstdc++.so libEGL.so libnativehelper.so libbinder.so"

# field from a Packages stanza for a given package
pkgfield() { awk -v p="$1" -v f="$2" '
    $1=="Package:" {cur=$2}
    cur==p && $1==f":" {$1=""; sub(/^ /,""); print; exit}' "$3"; }

# sha256 of a file (empty if missing); never aborts under set -e/pipefail
sha() { { sha256sum "$1" 2>/dev/null || true; } | cut -d' ' -f1; }

# Supply-chain provenance (privacy/security HARD rule): record where EVERY shipped
# binary and library came from (official upstream, version, URL, sha256) plus the
# sha256 of every file actually shipped, so the prebuilt payload can be audited and
# reproduced - nothing opaque is bundled. Writes bin/<abi>/PROVENANCE.json, which
# survives the on-device ABI prune, so the audit trail ships with the module itself.
write_provenance() {
  local abi="$1" out="$OUT_BASE/$abi" w="$WORK/$abi" prov f rel first=1
  {
    printf '{\n'
    printf '  "abi": "%s",\n' "$abi"
    printf '  "generated_utc": "%s",\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf '  "policy": "All files are fetched at build time from the official upstream listed below, never from a device. Audit: re-fetch the pinned sources, extract, and compare the file sha256 values.",\n'
    printf '  "sources": [\n'
    [ -s "$w/src.jsonl" ] && sed -e 's/^/    /' -e '$!s/$/,/' "$w/src.jsonl"
    printf '  ],\n'
    printf '  "files": [\n'
    for f in "$out"/* "$out"/lib/*; do
      [ -f "$f" ] || continue
      case "$f" in */.gitkeep|*/PROVENANCE.json) continue ;; esac
      rel="${f#"$out"/}"
      [ "$first" = 1 ] || printf ',\n'; first=0
      printf '    {"path": "%s", "bytes": %s, "sha256": "%s"}' "$rel" "$(stat -c%s "$f")" "$(sha "$f")"
    done
    printf '\n  ]\n}\n'
  } > "$out/PROVENANCE.json"
  prov="$out/PROVENANCE.json"
  echo "  provenance: $prov ($(grep -c '"sha256"' "$prov") files, $(grep -c '"version"' "$prov") source packages)"
}

build_abi() {
  local abi="$1" arch; arch="$(termux_arch "$abi")"
  local out="$OUT_BASE/$abi"; local w="$WORK/$abi"; local prefix="$w/prefix"
  mkdir -p "$out/lib" "$w/deb" "$prefix"
  echo "== $abi ($arch) =="

  local idx="$w/Packages"
  curl -fsSL "$REPO/dists/stable/main/binary-$arch/Packages" -o "$idx"

  # BFS transitive Depends from the tool packages
  local seen="" queue="$TOOL_PKGS" pkg dep deps
  while [ -n "$queue" ]; do
    pkg="${queue%% *}"; queue="${queue#"$pkg"}"; queue="${queue# }"
    case " $seen " in *" $pkg "*) continue ;; esac; seen="$seen $pkg"
    deps="$(pkgfield "$pkg" Depends "$idx" | tr ',' ' ' | sed 's/([^)]*)//g')"
    for dep in $deps; do queue="$queue $dep"; done
  done

  # download + extract every resolved package (recording provenance for each .deb)
  : > "$w/src.jsonl"
  for pkg in $seen; do
    local fn ver; fn="$(pkgfield "$pkg" Filename "$idx")"; [ -n "$fn" ] || continue
    curl -fsSL "$REPO/$fn" -o "$w/deb/$pkg.deb"
    ver="$(pkgfield "$pkg" Version "$idx")"
    printf '{"type": "termux-deb", "package": "%s", "version": "%s", "url": "%s", "deb_sha256": "%s"}\n' \
      "$pkg" "$ver" "$REPO/$fn" "$(sha "$w/deb/$pkg.deb")" >> "$w/src.jsonl"
    ( cd "$w/deb" && ar p "$pkg.deb" data.tar.xz 2>/dev/null | tar -xJ -C "$prefix" 2>/dev/null \
      || ar p "$pkg.deb" data.tar.gz 2>/dev/null | tar -xz -C "$prefix" 2>/dev/null \
      || ar p "$pkg.deb" data.tar.zst 2>/dev/null | tar --zstd -x -C "$prefix" 2>/dev/null ) || true
  done
  local U="$prefix/data/data/com.termux/files/usr"

  # copy wanted binaries (follow symlinks; warn - do not silently skip)
  local missing=""
  for b in $WANT_BINS; do
    if [ -e "$U/bin/$b" ]; then cp -Lf "$U/bin/$b" "$out/$b"
    else missing="$missing $b"; fi
  done
  [ -n "$missing" ] && echo "  WARN missing bins:$missing"

  # shared-library closure (skip Go static tools with no NEEDED; skip bionic libs)
  local lqueue="" seenlib=""
  for b in $WANT_BINS; do [ -f "$out/$b" ] && lqueue="$lqueue $out/$b"; done
  while [ -n "$lqueue" ]; do
    f="${lqueue%% *}"; lqueue="${lqueue#"$f"}"; lqueue="${lqueue# }"
    for n in $(readelf -d "$f" 2>/dev/null | sed -n 's/.*(NEEDED).*\[\(.*\)\]/\1/p'); do
      case " $BIONIC " in *" $n "*) continue ;; esac
      case " $seenlib " in *" $n "*) continue ;; esac
      [ -f "$U/lib/$n" ] || continue
      seenlib="$seenlib $n"; cp "$U/lib/$n" "$out/lib/$n"; lqueue="$lqueue $out/lib/$n"
    done
  done

  : > "$out/.gitkeep"
  echo "  bins: $(ls "$out" | grep -v '^\.' | grep -v '^lib$' | tr '\n' ' ')"
  echo "  libs: $(ls "$out/lib" | wc -l) ($(du -sh "$out/lib" | cut -f1))"
}

# Fallback ABX converter (static, no app_process): used only where the device lacks
# /system/bin/abx2xml (pre-A12). From rhythmcache/android-xml-converter releases.
ABX_RELEASE="${ABX_RELEASE:-build-11}"
abx_arch() { case "$1" in
  arm64-v8a) echo aarch64 ;; armeabi-v7a) echo armv7a ;; x86) echo i686 ;; x86_64) echo x86_64 ;;
esac; }
fetch_abx() {
  local abi="$1" aarch out tgz url
  aarch="$(abx_arch "$abi")"; out="$OUT_BASE/$abi"
  tgz="$WORK/$abi/abx.tgz"
  url="https://github.com/rhythmcache/android-xml-converter/releases/download/$ABX_RELEASE/abx-tools-android-$aarch.tar.gz"
  if curl -fsSL "$url" -o "$tgz" 2>/dev/null; then
    printf '{"type": "abx-tool", "project": "rhythmcache/android-xml-converter", "release": "%s", "url": "%s", "archive_sha256": "%s"}\n' \
      "$ABX_RELEASE" "$url" "$(sha "$tgz")" >> "$WORK/$abi/src.jsonl"
    tar -xzf "$tgz" -C "$WORK/$abi" 2>/dev/null || return 0
    for b in abx2xml xml2abx; do [ -f "$WORK/$abi/$b" ] && { cp "$WORK/$abi/$b" "$out/$b"; chmod 0755 "$out/$b"; }; done
    echo "  abx fallback: $(ls "$out"/abx2xml "$out"/xml2abx 2>/dev/null | wc -l)/2"
  else
    echo "  abx fallback: skipped (download failed)"
  fi
}

for abi in $ABIS; do build_abi "$abi"; fetch_abx "$abi"; write_provenance "$abi"; done
echo "done. binaries + libs under $OUT_BASE/<abi>/ (engine sets LD_LIBRARY_PATH=bin/<abi>/lib)"
echo "each bin/<abi>/ carries PROVENANCE.json (source + sha256 of every shipped file)"
