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
# Sourced by the module scripts before any curl use. The bundled curl is a Termux build with a
# baked-in default CA bundle path (/data/data/com.termux/.../cert.pem) that is absent on real
# devices, so https fails with rc 77. Build a bundle from the device trust store and export
# CURL_CA_BUNDLE, which overrides that default. Cached under the state dir; no-op if already set
# or if no trust store is found (curl then keeps its own default - no regression).
if [ -z "${CURL_CA_BUNDLE:-}" ]; then
  _vdcab="${STATE:-/data/adb/vdbackup}/.ca-bundle.pem"
  if [ ! -s "$_vdcab" ]; then
    for _vdd in /apex/com.android.conscrypt/cacerts /system/etc/security/cacerts /etc/security/cacerts; do
      [ -d "$_vdd" ] && cat "$_vdd"/* 2>/dev/null
    done > "$_vdcab" 2>/dev/null
  fi
  if [ -s "$_vdcab" ]; then export CURL_CA_BUNDLE="$_vdcab"; else rm -f "$_vdcab" 2>/dev/null; fi
  unset _vdcab _vdd
fi
