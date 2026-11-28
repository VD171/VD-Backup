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
 *  New interface shell: navigation, app bar, Backups sections. The engine
 *  (../scripts.js) is shared with the classic interface and does all the
 *  work through helper(verb, args); this file only arranges the screens.
 */
"use strict";

var NX = (function () {
  var SUB = { dests: 1, settings: 1, updates: 1, about: 1, log: 1 };
  var TITLE = { apps: "nx_tab_backup", backups: "restore", schedule: "tab_schedule", more: "nx_more",
                dests: "tab_dests", settings: "tab_settings", updates: "tab_updates", about: "tab_about", log: "ui_log_title" };
  var specials = false;

  function updateBar(name) {
    var t = document.getElementById("nx-title");
    if (t) t.textContent = TITLE[name] ? I18N.t(TITLE[name]) : "VDBackup";
    document.body.classList.toggle("nx-in-sub", !!SUB[name]);
    document.querySelectorAll(".nx-nav .tab").forEach(function (b) {
      b.classList.toggle("nx-parent", !!SUB[name] && b.dataset.tab === "more");
      b.setAttribute("aria-selected", b.classList.contains("active") ? "true" : "false");
    });
  }

  // section chips of the Backup (#apps) and Restore (#backups) tabs
  function setSeg(name, sec) {
    var root = document.getElementById(sec || "backups");
    if (!name || !root) return;
    root.querySelectorAll(".nx-seg-b").forEach(function (b) {
      var on = b.dataset.seg === name;
      b.classList.toggle("on", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
      if (on && b.scrollIntoView) b.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
    root.querySelectorAll(".nx-pane").forEach(function (p) { p.hidden = p.dataset.pane !== name; });
    if (name !== "apps") endSelect(root.id);
    // the System data / Files / adb backup forms need the engine's special-categories list
    if (root.id === "apps" && name !== "apps" && !specials && typeof loadSpecial === "function") { specials = true; loadSpecial(); }
  }

  // "tab" or "tab:section"
  function go(target) {
    var p = String(target || "").split(":");
    if (typeof navTab === "function") navTab(p[0]);
    if (p[1]) setSeg(p[1], p[0]);
  }

  // destination kinds as cards: icon, title, and the "(...)" part of the label as subtitle
  var KIND_IC = { local: "i-phone", rclone: "i-cloud", restic: "i-db", gdrive: "i-cloud", telegram: "i-send" };
  function kindCards() {
    var sel = document.getElementById("d-type"), g = sel && sel.nextElementSibling;
    if (!g || !g.classList.contains("segmented")) return;
    g.classList.add("nx-kinds");
    Array.prototype.forEach.call(g.querySelectorAll(".segment"), function (b) {
      var o = sel.querySelector('option[value="' + b.dataset.val + '"]'); if (!o) return;
      var key = o.getAttribute("data-i18n"), txt = key ? I18N.t(key) : o.textContent;
      var m = /^(.*?)\s*[(\uff08](.*)[)\uff09]\s*$/.exec(txt);
      b.removeAttribute("data-i18n");
      b.textContent = "";
      var ic = el("span", "nx-kind-ic"), t = el("span", "nx-kind-t");
      var sv = document.createElementNS("http://www.w3.org/2000/svg", "svg"), u = document.createElementNS("http://www.w3.org/2000/svg", "use");
      sv.setAttribute("class", "i"); u.setAttribute("href", "#" + (KIND_IC[b.dataset.val] || "i-cloud")); sv.appendChild(u); ic.appendChild(sv);
      t.appendChild(el("b", null, m ? m[1] : txt));
      if (m) t.appendChild(el("small", null, m[2]));
      b.appendChild(ic); b.appendChild(t);
    });
  }

  // running operations: one-line bar above the nav. A tap opens the sheet only when the bar
  // cannot show everything: several ops at once, or a finished batch with its skipped/failed list.
  var ops = null;
  function opsOpen() { return !!ops && ops.classList.contains("nx-open"); }
  function showOps(on) {
    var scrim = document.getElementById("nx-ops-scrim");
    ops.classList.toggle("nx-open", on); if (scrim) scrim.hidden = !on;
  }
  function opsBar() {
    ops = document.getElementById("ops");
    var scrim = document.getElementById("nx-ops-scrim");
    if (!ops || !scrim) { ops = null; return; }
    ops.addEventListener("click", function (e) {
      if (e.target.closest("button")) return;
      if (opsOpen()) { showOps(false); return; }
      if (ops.querySelectorAll(".op-card").length > 1 || ops.querySelector(".op-failed, .op-skipped")) showOps(true);
    });
    scrim.onclick = function () { showOps(false); };
    new MutationObserver(function () { if (ops.hidden) showOps(false); }).observe(ops, { attributes: true, attributeFilter: ["hidden"] });
  }

  // Android back. Every level the user opened (a tab after the first, a dialog, the ops sheet)
  // gets one history entry, pushed from the tap that opened it: WebView skips entries a page
  // adds without a user gesture, so a sentinel re-armed after each Back let Back close the
  // whole WebUI. Back pops one entry and closes one level; a level closed by its own button
  // drops its entry again, so the count never drifts.
  var depth = 0, skip = 0;
  // select mode of the tab on screen is a level too: Back ends it before it leaves the tab
  function selecting() {
    var tab = curTabId();
    return (tab === "apps" && selectMode) || (tab === "backups" && bkSelectMode);
  }
  function endSelect(tab) {
    tab = tab || curTabId();
    if (tab === "apps" && selectMode) setSelectMode(false);
    if (tab === "backups" && bkSelectMode) setBkSelectMode(false);
  }
  function levels() {
    return (typeof _tabStack !== "undefined" ? _tabStack.length - 1 : 0) + NX_MODALS.depth() + (opsOpen() ? 1 : 0) + (selecting() ? 1 : 0);
  }
  function syncHistory(gesture) {
    var want = levels();
    if (want < depth) { skip++; history.go(want - depth); depth = want; return; }
    while (gesture && depth < want) { history.pushState({ vdb: 1 }, ""); depth++; }
  }
  function backNav() {
    window.addEventListener("popstate", function (e) {
      e.stopImmediatePropagation();   // the engine's handler re-arms a sentinel; this one replaces it
      if (skip) { skip--; return; }
      if (depth) depth--;
      if (NX_MODALS.closeTop()) return;
      if (opsOpen()) showOps(false);
      else if (selecting()) endSelect();
      else if (_tabStack.length > 1) { _tabStack.pop(); switchTab(_tabStack[_tabStack.length - 1]); }
    }, true);
    ["click", "keydown", "touchend"].forEach(function (t) {
      document.addEventListener(t, function () { setTimeout(function () { syncHistory(true); }, 0); }, true);
    });
  }

  function wrapEngine() {
    if (typeof _tabStack !== "undefined" && _tabStack.length === 1) _tabStack[0] = "home";
    var orig = window.switchTab;
    window.switchTab = function (name) {
      var from = curTabId();
      if (from !== name) endSelect(from);   // a selection is not left behind on a tab out of sight
      orig(name);
      updateBar(name);
      window.scrollTo(0, 0);
      if (name === "home" && window.NX_HOME) NX_HOME.show();
      if (name === "backups" && window.NX_SRC) NX_SRC.load(false);
    };
    // a main tab sits right above Home, a sub page above the screen it was opened from: Back from
    // any main tab goes Home instead of through every tab visited before it
    var nav = window.navTab;
    window.navTab = function (name) {
      if (!name || name === curTabId()) return;
      if (!SUB[name]) _tabStack.length = 1;
      if (name === "home") switchTab(name); else nav(name);
    };
    // Backup > Apps: say so when the search or a filter leaves no app, instead of a blank screen
    var apps = window.renderApps;
    window.renderApps = function (q) {
      apps(q);
      var none = document.getElementById("nx-apps-nomatch");
      if (none) none.hidden = !APPS.length || !!document.querySelector("#applist > li");
    };
    var apply = I18N.apply;
    I18N.apply = function (root) {
      apply(root);
      kindCards();
      if (window.NX_HOME && NX_HOME.relabel) NX_HOME.relabel();
      // a language change: the Restore lists are built with the old words and are not
      // reloaded on the next visit, so draw them again (the engine only redraws Apps)
      if (window.NX_SRC && NX_SRC.get("local")) renderBackups(BACKUPS);
      if (typeof PATH_BACKUPS !== "undefined" && PATH_BACKUPS.length) renderPathBackups(PATH_BACKUPS);
      var cur = document.querySelector(".panel.active");
      updateBar(cur ? cur.id : "home");
    };
  }

  function bind() {
    document.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest("[data-go]");
      if (t) { e.preventDefault(); go(t.getAttribute("data-go")); return; }
      var s = e.target.closest && e.target.closest(".nx-seg-b");
      if (s) setSeg(s.dataset.seg, s.closest("section").id);
    });
    var back = document.getElementById("nx-back");
    if (back) back.onclick = function () { history.back(); };
    var gear = document.getElementById("nx-settings-btn");
    if (gear) {
      gear.setAttribute("aria-label", I18N.t("tab_settings"));
      gear.onclick = function () { navTab("settings"); };
    }
    var bar = document.querySelector(".nx-top"), ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () { ticking = false; bar.classList.toggle("scrolled", window.scrollY > 4); });
    }, { passive: true });
    kindCards();
    opsBar();
    kbWatch();
    updateBar("home");
  }

  // the keyboard shrinks the viewport (same width, a text field focused): hide the bars under it
  function kbWatch() {
    var w = window.innerWidth, full = window.innerHeight;
    window.addEventListener("resize", function () {
      if (window.innerWidth !== w) { w = window.innerWidth; full = window.innerHeight; }
      else if (window.innerHeight > full) full = window.innerHeight;
      var a = document.activeElement;
      var typing = !!a && (a.tagName === "TEXTAREA" || (a.tagName === "INPUT" && !/^(checkbox|radio|range|color|button)$/.test(a.type)));
      document.documentElement.classList.toggle("nx-kb", typing && window.innerHeight < full * 0.8);
    });
  }

  // escape hatch: if the engine fails to come up, offer the classic interface
  var errs = 0;
  window.addEventListener("error", function () { errs++; });
  function watchBoot() {
    setTimeout(function () {
      var cfgEmpty = typeof CFG !== "object" || !CFG || !Object.keys(CFG).length;
      var noApps = !document.querySelector("#applist li");
      if (errs && (cfgEmpty || noApps)) { var b = document.getElementById("nx-boot-err"); if (b) b.hidden = false; }
    }, 8000);
  }

  wrapEngine();
  backNav();   // before the engine's own popstate handler, which it must pre-empt
  document.addEventListener("DOMContentLoaded", function () { bind(); watchBoot(); });
  return { go: go, setSeg: setSeg };
})();
