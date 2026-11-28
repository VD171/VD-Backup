#!/usr/bin/env python3
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
#  Side-by-side screenshots of the Classic and the New ("next") WebUI.
#  Reuses the fixtures, the mocked ksu.exec bridge and the loopback server
#  of shoot.py, adds a few richer fixtures (backups, special, folder and
#  /data/adb backups) and captures every main screen of both interfaces in
#  the given languages and themes. Output: docs/ui-next-screenshots/.
#
#  Usage:
#     python3 tools/screenshots/shoot_ui_next.py                 # en+ar, dark+light
#     python3 tools/screenshots/shoot_ui_next.py --langs en --themes dark
#  Requires: python3-playwright + Chrome/Chromium (bundled Playwright
#  Chromium is used when no system Chrome is installed).
# ======================================================================

import argparse
import json
import os
import sys

from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import shoot  # noqa: E402

OUTDIR = os.path.join(shoot.ROOT, "docs", "ui-next-screenshots")

# (classic tab, next tab, scroll, output basename)
SCREENS = [
    ("apps", "home", "top", "home"),
    ("apps", "apps", "list", "apps"),
    ("backups", "backups", "top", "backups"),
    ("schedule", "schedule", "top", "schedule"),
    ("dests", "dests", "top", "destinations"),
    ("settings", "settings", "top", "settings"),
    ("log", "log", "top", "activitylog"),
    ("about", "more", "top", "more"),
]

DIALOG_JS = r"""
(function (what) {
  if (what === 'backup') { startBackup('org.mozilla.firefox', 'Firefox'); return; }
  if (what === 'appbk') { openAppBackups('org.mozilla.firefox', 'Firefox'); return; }
})
"""


def extra_fixtures(fix, ui):
    def bk(pkg, label, day, hh, extra=None):
        b = {"ref": "/sdcard/VDBackup/%s/2026-11-%02d_%02d-00-00_1" % (pkg, day, hh),
             "package": pkg, "label": label, "versionName": "1.0", "versionCode": 1,
             "created_at": shoot.ts(day, hh, 0), "mode": "full", "note": "", "tags": [],
             "encrypted": False, "locked": False, "items": ["apk", "data", "data_de"]}
        b.update(extra or {})
        return b
    fix = dict(fix)
    fix["list-backups"] = {"backups": [
        bk("org.mozilla.firefox", "Firefox", 7, 3, {"note": "Before update", "tags": ["browser"], "pinned": True}),
        bk("org.thoughtcrime.securesms", "Signal", 7, 3, {"encrypted": True}),
        bk("com.nextcloud.client", "Nextcloud", 6, 3),
        bk("com.x8bit.bitwarden", "Bitwarden", 5, 21, {"encrypted": True, "tags": ["security"]}),
        bk("org.fdroid.fdroid", "F-Droid", 4, 18),
        bk("app.organicmaps", "Organic Maps", 3, 9),
    ]}
    fix["special-list"] = {"backups": [
        {"ref": "/sdcard/VDBackup/.special/1", "created_at": shoot.ts(6, 22, 10),
         "categories": ["messages", "contacts", "wifi"]}]}
    fix["path-list"] = {"backups": [
        {"ref": "/sdcard/VDBackup/.paths/1", "source": "/storage/emulated/0/DCIM/Camera",
         "created_at": shoot.ts(5, 20, 0)}]}
    fix["adb-backups"] = {"backups": [
        {"ref": "/sdcard/VDBackup/.adb/1", "created_at": shoot.ts(4, 11, 30), "mode": "total"}]}
    fix["dests-list"] = {"dests": list(fix["dests-list"]["dests"]) + [{"id": "telegram", "type": "telegram"}]}
    fix["telegram-list"] = {"ok": True, "backups": [
        {"message_id": 21, "name": "org.telegram.messenger__20261107T201500Z_54321.vdb.tar", "size": 187000000},
        {"message_id": 22, "name": "com.whatsapp__20261106T081000Z_231.vdb.tar", "size": 412000000}]}
    fix["rclone-list"] = {"ok": True, "dest": "nas", "backups": [
        {"dest": "nas", "rref": "com.nextcloud.client/20261105T030000Z_310", "package": "com.nextcloud.client", "tsvc": "20261105T030000Z_310"}]}
    fix["restic-list"] = {"ok": True, "dest": "snapshots", "backups": []}
    cfg = dict(fix["config-get"])
    cfg["ui"] = ui
    fix["config-get"] = cfg
    return fix


def launch(pw):
    try:
        return pw.chromium.launch(channel="chrome", headless=True, args=["--force-color-profile=srgb"])
    except Exception:
        return pw.chromium.launch(headless=True, args=["--force-color-profile=srgb"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--langs", default="en,ar")
    ap.add_argument("--themes", default="dark,light")
    ap.add_argument("--uis", default="classic,next")
    ap.add_argument("--dialogs", action="store_true", help="also capture the backup and app dialogs")
    a = ap.parse_args()
    version = shoot.module_version()
    base_fix = shoot.build_fixtures(version)
    httpd, port = shoot.serve(shoot.WEBROOT)
    os.makedirs(OUTDIR, exist_ok=True)
    n = 0
    with sync_playwright() as pw:
        browser = launch(pw)
        try:
            for ui in a.uis.split(","):
                fix_json = json.dumps(extra_fixtures(base_fix, ui), ensure_ascii=False)
                url = "http://127.0.0.1:%d/%s" % (port, "next/index.html" if ui == "next" else "index.html")
                for lang in a.langs.split(","):
                    for theme in a.themes.split(","):
                        ctx = browser.new_context(viewport=shoot.VIEWPORT, device_scale_factor=shoot.SCALE, locale=lang)
                        page = ctx.new_page()
                        errs = []
                        page.on("pageerror", lambda e: errs.append(str(e)))
                        page.add_init_script(shoot.MOCK_JS % (fix_json, lang))
                        page.add_init_script("try{localStorage.setItem('vdb_theme','%s');localStorage.setItem('vdb_ui','%s')}catch(e){}" % (theme, ui))
                        page.goto(url, wait_until="networkidle")
                        page.wait_for_timeout(2500 if ui == "next" else 900)
                        for ctab, ntab, scroll, name in SCREENS:
                            tab = ntab if ui == "next" else ctab
                            page.evaluate("(t) => navTab(t)", tab)
                            page.wait_for_timeout(450)
                            page.evaluate(shoot.SCROLL_JS, scroll)
                            page.wait_for_timeout(200)
                            page.screenshot(path=os.path.join(OUTDIR, "%s-%s-%s-%s.png" % (ui, lang, theme, name)))
                            n += 1
                        if a.dialogs:
                            for d in ("backup", "appbk"):
                                page.evaluate("(t) => navTab(t)", "apps")
                                page.evaluate(DIALOG_JS, d)
                                page.wait_for_timeout(500)
                                page.screenshot(path=os.path.join(OUTDIR, "%s-%s-%s-dlg-%s.png" % (ui, lang, theme, d)))
                                page.evaluate("() => document.querySelectorAll('.modal').forEach(function (m) { m.hidden = true; })")
                                n += 1
                        if errs:
                            print("  page errors (%s/%s/%s): %s" % (ui, lang, theme, errs[:3]))
                        ctx.close()
                        print("  %s %s %s" % (ui, lang, theme))
        finally:
            browser.close()
    httpd.shutdown()
    print("done: %d PNGs -> %s" % (n, OUTDIR))


if __name__ == "__main__":
    main()
