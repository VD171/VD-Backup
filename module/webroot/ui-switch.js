/*
 * ======================================================================
 *  VD BACKUP  ::  root backup & restore, no grant prompt
 *  Full app/data backup & restore as root: KernelSU/APatch/Magisk WebUI.
 *
 *  Copyright (C) 2026  VD171
 *  SPDX-License-Identifier: AGPL-3.0-or-later
 *
 *  Free software under the GNU AGPL v3 or later. NETWORK COPYLEFT: run a
 *  modified version, even as a service, and you MUST offer its source.
 *
 *  Site           : https://vd171.ru
 *  Site           : https://vd.priv8.ru
 *  Source         : https://github.com/VD171/VD-Backup
 *  GitHub         : @VD171 https://github.com/VD171
 *  XDA-Developers : @VD171 https://xdaforums.com/m/vd171.4699873/
 *  XDA thread     : https://xdaforums.com/t/VD-Backup.4807267/
 *  Telegram       : @VD_Priv8 https://t.me/VD_Priv8
 *  Channel        : @Priv8_VD https://t.me/Priv8_VD
 *  Discord        : @VD.Priv8 https://discord.com/users/1296831918989639721
 *  E-mail         : vd.priv8@pm.me
 * ======================================================================
 *
 *  Interface switch: Classic (index.html, the default) or New (next/).
 *  Shared by both interfaces. The choice is stored as `ui` in the module
 *  config (config-set merges it) and mirrored in localStorage so the
 *  right interface opens on the first frame, before the async config-get.
 *  `?ui=classic` or `?ui=next` on the URL forces a choice (escape hatch).
 */
"use strict";

window.VDB_UI = (function () {
  var KEY = "vdb_ui";
  var page = document.documentElement.getAttribute("data-ui") === "next" ? "next" : "classic";
  function norm(v) { return v === "next" ? "next" : "classic"; }
  function lsGet() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function lsSet(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  // both pages resolve relative URLs from the webroot (next/index.html sets <base href="../">)
  function go(mode, carry) {
    if (mode === page) return false;
    var u = (mode === "next" ? "next/index.html" : "index.html") + (carry ? "?ui=" + mode : "");
    location.replace(new URL(u, document.baseURI).href);
    return true;
  }
  var forced = (/[?&]ui=(classic|next)\b/.exec(location.search) || [])[1] || null;
  if (forced) lsSet(forced);
  // early redirect from the mirrored choice (no flash of the other interface)
  var early = forced || (lsGet() ? norm(lsGet()) : page);
  var leaving = go(early, !!forced);

  // called once the module config is known: the config is the source of truth
  // (it survives a WebView data wipe and travels with a settings export).
  function sync(cfg) {
    if (leaving) return;
    if (forced) { if (cfg && norm(cfg.ui) !== forced) save(forced); bind(); return; }
    var want = norm(cfg && cfg.ui);
    lsSet(want);
    if (!go(want)) bind();
  }
  function save(mode) {
    if (typeof helper !== "function") return Promise.resolve({ ok: false });
    if (typeof CFG === "object" && CFG) CFG.ui = mode;
    return helper("config-set", { ui: mode });
  }
  function set(mode) {
    mode = norm(mode);
    return save(mode).then(function (r) {
      if (r && r.ok === false) { if (typeof modalAlert === "function") modalAlert(errMsg(r)); return; }
      lsSet(mode); go(mode);
    });
  }
  function bind() {
    var sel = document.getElementById("ui-mode-sel");
    if (sel && !sel._uiBound) {
      sel._uiBound = true;
      sel.value = page;
      sel.addEventListener("change", function () { set(sel.value); });
    }
    document.querySelectorAll("[data-ui-switch]").forEach(function (a) {
      if (a._uiBound) return; a._uiBound = true;
      a.addEventListener("click", function (e) { e.preventDefault(); set(a.getAttribute("data-ui-switch")); });
    });
  }
  document.addEventListener("DOMContentLoaded", function () { if (!leaving) bind(); });
  return { page: page, sync: sync, set: set };
})();
