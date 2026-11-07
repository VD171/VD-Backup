#!/usr/bin/env python3
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
#  WebUI screenshot harness. Renders the real module/webroot WebUI in a
#  headless Chrome under a mocked `ksu.exec` bridge that answers every
#  helper.sh verb with fictional, privacy-safe fixtures (NEVER real device
#  data), then captures the six documented screens in each of the 21
#  languages (dark theme, 412x915 @ 3x). Output: docs/screenshots/<lang>/.
#
#  Durability (why this lives in the repo, not a scratch dir):
#   - the version badge, the app list, every label and the RTL mirroring
#     come from the live webroot + lang/*.json, so a UI or string change is
#     reflected on the next run with no edit here;
#   - the shown version is read from module/module.prop, so a release bump
#     needs no change here either;
#   - fixtures are declared once in FIXTURES below; add a verb there when the
#     UI starts calling a new one.
#
#  Usage:
#     python3 tools/screenshots/shoot.py            # all 21 languages
#     python3 tools/screenshots/shoot.py pt en ar   # only the given codes
#  Requires: python3-playwright + a system Google Chrome/Chromium.
# ======================================================================

import json
import os
import re
import socketserver
import sys
import threading
from http.server import SimpleHTTPRequestHandler

from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
WEBROOT = os.path.join(ROOT, "module", "webroot")
OUTDIR = os.path.join(ROOT, "docs", "screenshots")
LANGS = ["ar", "cs", "de", "en", "es", "fa", "fr", "hi", "in", "it", "ja",
         "ko", "nl", "pl", "pt", "ru", "sv", "th", "tr", "vi", "zh"]
# (tab to switch to, scroll target, output basename)
SCREENS = [
    ("apps", "top", "home"),
    ("apps", "list", "apps"),
    ("schedule", "top", "schedule"),
    ("dests", "top", "destinations"),
    ("settings", "top", "settings"),
    ("log", "top", "activitylog"),
]
VIEWPORT = {"width": 412, "height": 915}
SCALE = 3


def module_version():
    try:
        with open(os.path.join(ROOT, "module", "module.prop"), encoding="utf-8") as f:
            for line in f:
                if line.startswith("version="):
                    return line.split("=", 1)[1].strip()
    except OSError:
        pass
    return "v1.0"


def ts(day, hh, mm):
    return "2026-11-%02dT%02d:%02d:00" % (day, hh, mm)


GB = 1024 ** 3


def build_fixtures(version):
    # Fictional, privacy-safe sample set: well-known FOSS apps, invented
    # counts. NEVER derived from a real device.
    apps = [
        ("Aurora Store", "com.aurora.store", False, 51),
        ("Bitwarden", "com.x8bit.bitwarden", False, 2024),
        ("F-Droid", "org.fdroid.fdroid", False, 1021),
        ("Firefox", "org.mozilla.firefox", False, 2460),
        ("Joplin", "net.cozic.joplin", False, 308),
        ("KeePassDX", "com.kunzisoft.keepass.libre", False, 1360),
        ("K-9 Mail", "com.fsck.k9", False, 39012),
        ("NewPipe", "org.schabi.newpipe", False, 994),
        ("Nextcloud", "com.nextcloud.client", False, 30250),
        ("Organic Maps", "app.organicmaps", False, 25061),
        ("Signal", "org.thoughtcrime.securesms", False, 1472),
        ("Syncthing", "com.nutomic.syncthingandroid", False, 4120),
        ("VLC", "org.videolan.vlc", False, 13050700),
        ("Android System", "android", True, 36),
        ("System UI", "com.android.systemui", True, 36),
    ]
    app_rows = [{"package": p, "label": l, "system": s, "versionCode": vc}
                for (l, p, s, vc) in apps]
    return {
        "ping": {"version": version, "abi": "arm64-v8a"},
        "config-get": {
            "user": 0, "compression": "zstd:10", "default_mode": "full",
            "default_dest": "local", "network_policy": "any",
            "encrypt_data": False, "encrypt_apk": False, "ssaid": False,
            "spoof_installer": True, "auto_backup": True, "auto_backup_keep": 7,
            "blocklist": ["com.android.systemui"],
        },
        "list-users": {"users": [{"id": 0, "name": "Owner"}]},
        "list-apps": {"apps": app_rows},
        "icons": {"icons": {}},
        "overview": {
            "apps": 142, "instances": 38, "path_backups": 5, "jobs": 2,
            "backups_size": int(6.2 * GB), "free": int(81.4 * GB),
            "total": int(128 * GB),
        },
        "dests-list": {"dests": [
            {"id": "local", "type": "local", "path": "/sdcard/VDBackup"},
            {"id": "nas", "type": "rclone", "remote": "nas:phone-backups"},
            {"id": "snapshots", "type": "restic", "repo": "/sdcard/restic-repo"},
        ]},
        "remote-list": {"remotes": [
            {"name": "gdrive", "type": "drive"},
            {"name": "dropbox", "type": "dropbox"},
            {"name": "nas", "type": "sftp"},
        ]},
        "schedule-list": {"jobs": [
            {"id": "job-backup-all", "action": "backup", "all": True,
             "cron": "daily", "at": "03:00", "mode": "full", "keep": 7,
             "last_run": 1762489800, "require_wifi": True, "require_charging": True},
            {"id": "job-backup-set", "action": "backup",
             "packages": ["org.mozilla.firefox", "org.thoughtcrime.securesms",
                          "com.nextcloud.client"],
             "cron": "weekly", "at": "04:30", "mode": "snapshot", "keep": 4,
             "min_battery": 40, "days": [1, 3, 5], "last_run": None},
        ]},
        "special-categories": {"categories": [
            {"id": "messages", "available": True},
            {"id": "contacts", "available": True},
            {"id": "calllog", "available": True},
            {"id": "wifi", "available": True},
            {"id": "bluetooth", "available": True},
            {"id": "calendar", "available": True},
            {"id": "wallpaper", "available": True},
            {"id": "dns", "available": True},
            {"id": "system_settings", "available": True, "opt_in": True},
        ]},
        "special-list": {"backups": []},
        "path-list": {"backups": []},
        "list-backups": {"backups": []},
        "list-ops": {"ops": []},
        "sysmount-status": {"live_capable": True, "nomount": True},
        "companion-status": {"installed": False},
        "cloud-status": {"needed": False},
        "log-read": {"entries": [
            {"op": "backup", "ts": ts(7, 3, 0), "detail": "all apps - full - 142 apps"},
            {"op": "scheduler-run", "ts": ts(7, 3, 0), "detail": "job-backup-all"},
            {"op": "restore", "ts": ts(6, 21, 14), "detail": "org.mozilla.firefox"},
            {"op": "prune", "ts": ts(6, 3, 2), "detail": "kept last 7"},
            {"op": "import", "ts": ts(5, 12, 8), "detail": "Neo Backup - 3 apps"},
            {"op": "delete-backup", "ts": ts(4, 18, 40), "detail": "org.fdroid.fdroid"},
        ]},
    }


MOCK_JS = r"""
(function () {
  window.__VDB_FIX = %s;
  window.__VDB_LANG = "%s";
  window.ksu = {
    exec: function (cmd, opts, cbName) {
      var m = /helper\.sh\s+([a-z-]+)/.exec(String(cmd));
      var verb = m ? m[1] : "";
      var fix = window.__VDB_FIX, out;
      if (verb === "config-get") {
        out = {}; var src = fix["config-get"] || {};
        for (var k in src) out[k] = src[k];
        out.language = window.__VDB_LANG;
      } else if (Object.prototype.hasOwnProperty.call(fix, verb)) {
        out = fix[verb];
      } else {
        out = { ok: true };
      }
      var s = JSON.stringify(out);
      setTimeout(function () {
        try { if (typeof window[cbName] === "function") window[cbName](0, s, ""); } catch (e) {}
      }, 0);
    }
  };
})();
"""


SCROLL_JS = r"""
(function (what) {
  function scroller() {
    var p = document.querySelector('.panel.active');
    if (p && p.scrollHeight > p.clientHeight) return p;
    return document.scrollingElement || document.documentElement;
  }
  var s = scroller();
  if (what === 'list') {
    var ul = document.querySelector('#applist');
    var ov = document.querySelector('#overview');
    var y = ov && !ov.hidden ? ov.offsetHeight + 8 : 0;
    s.scrollTop = y || (ul ? ul.offsetTop : 0);
  } else {
    s.scrollTop = 0;
  }
})
"""


def serve(directory):
    handler = lambda *a, **k: SimpleHTTPRequestHandler(*a, directory=directory, **k)
    httpd = socketserver.ThreadingTCPServer(("127.0.0.1", 0), handler)
    httpd.daemon_threads = True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, httpd.server_address[1]


def main(argv):
    langs = [a for a in argv[1:] if a in LANGS] or LANGS
    version = module_version()
    fixtures = build_fixtures(version)
    fix_json = json.dumps(fixtures, ensure_ascii=False)
    httpd, port = serve(WEBROOT)
    base = "http://127.0.0.1:%d/index.html" % port
    total = 0
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome", headless=True,
                                     args=["--force-color-profile=srgb"])
        try:
            for lang in langs:
                ctx = browser.new_context(viewport=VIEWPORT, device_scale_factor=SCALE,
                                          locale=lang if lang != "in" else "id")
                page = ctx.new_page()
                page.add_init_script(MOCK_JS % (fix_json, lang))
                page.goto(base, wait_until="networkidle")
                page.wait_for_timeout(600)   # let boot() + helper microtasks settle
                outlang = os.path.join(OUTDIR, lang)
                os.makedirs(outlang, exist_ok=True)
                for tab, scroll, name in SCREENS:
                    page.evaluate("(t) => { if (typeof navTab === 'function') navTab(t); "
                                  "else if (typeof switchTab === 'function') switchTab(t); }", tab)
                    page.wait_for_timeout(450)
                    page.evaluate(SCROLL_JS, scroll)
                    page.wait_for_timeout(150)
                    out = os.path.join(outlang, "%s-dark.png" % name)
                    page.screenshot(path=out)
                    total += 1
                ctx.close()
                print("  %s: 6 screens" % lang)
        finally:
            browser.close()
    httpd.shutdown()
    print("done: %d PNGs (%d langs) at version %s -> %s" %
          (total, len(langs), version, OUTDIR))


if __name__ == "__main__":
    main(sys.argv)
