/*
 * ======================================================================
 *  VD BACKUP  ::  root backup & restore, no grant prompt
 *  Full app/data backup & restore as root - KernelSU/APatch/Magisk WebUI.
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
 *  XDA-Thread     : https://xdaforums.com/t/VD-Backup.4807267/
 *  Telegram       : @VD_Priv8 https://t.me/VD_Priv8
 *  Telegram       : @Priv8_VD https://t.me/Priv8_VD
 *  Discord        : @VD.Priv8 https://discord.com/users/1296831918989639721
 *  E-mail         : vd.priv8@pm.me
 * ======================================================================
 */
"use strict";

var MOD = "/data/adb/modules/vdbackup";
var COMPANION_PKG = "ru.vd171.vdbackup";
var HMA_OSS_PKG = "org.frknkrc44.hma_oss";
var DRIVE_CONSENT_CODES = ["ERR_DRIVE_CONSENT", "ERR_NO_CONSENT", "ERR_CONSENT_REQUIRED", "ERR_CONSENT_DENIED"];

// --- shell / root bridge ------------------------------------------------
function shq(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'"; }
function b64(s) { return btoa(unescape(encodeURIComponent(String(s)))); }

function execCommand(cmd) {
  return new Promise(function (resolve, reject) {
    try {
      var cb = "__vdb_cb_" + Math.random().toString(36).slice(2);
      window[cb] = function (errno, stdout, stderr) {
        delete window[cb];
        resolve({ errno: errno, stdout: stdout || "", stderr: stderr || "" });
      };
      if (window.ksu && typeof ksu.exec === "function") ksu.exec(cmd, "{}", cb);
      else reject(new Error("ksu.exec unavailable"));
    } catch (e) { reject(e); }
  });
}

// raw=true sends base64 of the plain string (the contract for progress/cancel,
// which take the raw opid, not a JSON object); otherwise args is JSON-encoded.
function helper(verb, args, raw) {
  var arg = (args === undefined) ? "''"
          : shq(b64(raw ? String(args) : JSON.stringify(args)));
  var cmd = "sh " + MOD + "/scripts/helper.sh " + verb + " " + arg;
  return execCommand(cmd).then(function (r) {
    try { return JSON.parse(r.stdout); }
    catch (e) { return { ok: false, code: "ERR_PARSE", raw: r.stdout, stderr: r.stderr }; }
  });
}

function errMsg(r) {
  var code = r && r.code;
  if (code && code !== "ERR_NONE") {
    var key = "msg_err_" + String(code).replace(/^ERR_/, "").toLowerCase();
    var s = I18N.t(key);
    if (s !== key) return s;
  }
  if (r && r.message) return r.message;
  return I18N.t("msg_err_generic");
}

// --- UI helpers ---------------------------------------------------------
function $(sel, root) { return (root || document).querySelector(sel); }
function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

// pill badge on the semantic status scale (ok/info/warn/err, or accent when none)
function statusBadge(kind, text) { return el("span", "badge" + (kind ? " " + kind : ""), text); }

// brief, non-blocking confirmation toast (reused by tap-to-copy)
function showToast(msg) {
  var t = $("#copy-toast");
  if (!t) { t = el("div", "copy-toast"); t.id = "copy-toast"; document.body.appendChild(t); }
  t.textContent = msg;
  void t.offsetWidth;   // restart the transition if a toast is already showing
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(function () { t.classList.remove("show"); }, 1600);
}
// clipboard write with a graceful fallback: the KSU/APatch/Magisk webview may not
// expose the async Clipboard API, so fall back to a hidden textarea + execCommand.
// Never throws; a failed copy simply shows no toast.
function fallbackCopy(str) {
  try {
    var ta = document.createElement("textarea");
    ta.value = str; ta.setAttribute("readonly", "");
    ta.style.position = "fixed"; ta.style.top = "-1000px"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.focus(); ta.select();
    var ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  } catch (e) { return false; }
}
function copyText(str) {
  str = String(str == null ? "" : str);
  var done = function () { showToast(I18N.t("ui_copied")); };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(str).then(done, function () { if (fallbackCopy(str)) done(); });
      return;
    }
  } catch (e) {}
  if (fallbackCopy(str)) done();
}
function copyIcon() {
  var span = el("span", "cp-ic");
  span.setAttribute("aria-hidden", "true");
  span.innerHTML = '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
  return span;
}
// tap-to-copy InfoRow: monospace value + copy affordance, keyboard-accessible
function copyRow(k, v) {
  var row = el("div", "kv copyable");
  row.tabIndex = 0; row.setAttribute("role", "button");
  row.setAttribute("aria-label", k + ": " + v);
  row.setAttribute("title", I18N.t("ui_copy"));
  row.appendChild(el("span", "k", k));
  var val = el("span", "v");
  val.appendChild(el("span", "ct", String(v)));
  val.appendChild(copyIcon());
  row.appendChild(val);
  row.onclick = function () { copyText(v); };
  row.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); copyText(v); } };
  return row;
}

function switchTab(name) {
  if (name !== "dests") resetAuthorizeUI();   // leaving Destinations ends any pending authorize poll
  document.querySelectorAll(".tab").forEach(function (t) { t.classList.toggle("active", t.dataset.tab === name); });
  document.querySelectorAll(".panel").forEach(function (p) { p.classList.toggle("active", p.id === name); });
  if (name === "apps") loadOverview();
  if (name === "backups") { loadBackups(); loadSpecial(); }
  if (name === "dests") loadDests();
  if (name === "settings") loadSettings();
  if (name === "schedule") loadSchedule();
  if (name === "log") openLog();
}

// Back-button navigation: a back press closes an open dialog, else returns to the
// previous tab, and only closes the WebUI from the Apps tab with nothing open. A
// re-armed sentinel history entry intercepts back; a tab stack tracks order. Dialogs
// are tracked by open/closed state, not history, so closing one never desyncs the stack.
var _tabStack = ["apps"];
function curTabId() { var p = document.querySelector(".panel.active"); return p ? p.id : "apps"; }
function openModalEl() {
  var ms = document.querySelectorAll(".modal");
  for (var i = ms.length - 1; i >= 0; i--) if (!ms[i].hidden) return ms[i];
  return null;
}
function navTab(name) {   // forward tab navigation (nav bar + swipe)
  if (!name || name === curTabId()) return;
  _tabStack.push(name);
  switchTab(name);
}
function setupBackNav() {
  history.pushState({ vdb: 1 }, "");   // sentinel
  window.addEventListener("popstate", function () {
    var m = openModalEl();
    if (m) { m.hidden = true; history.pushState({ vdb: 1 }, ""); return; }   // close dialog, re-arm
    if (_tabStack.length > 1) {
      _tabStack.pop();
      switchTab(_tabStack[_tabStack.length - 1]);                            // previous tab
      history.pushState({ vdb: 1 }, "");                                     // re-arm
      return;
    }
    history.back();   // Apps tab, nothing open -> let the WebUI close
  });
}

// --- users --------------------------------------------------------------
var USERS = [];
var activeUser = 0;
function loadUsers() {
  helper("list-users").then(function (r) {
    USERS = (r && r.users) ? r.users : [];
    var sel = $("#user-sel"), field = $("#user-field");
    if (sel) {
      sel.innerHTML = "";
      USERS.forEach(function (u) {
        var o = document.createElement("option");
        o.value = u.id;
        o.textContent = u.name + " (" + u.id + ")";
        sel.appendChild(o);
      });
      if (!USERS.some(function (u) { return (u.id | 0) === activeUser; })) activeUser = 0;
      sel.value = activeUser;
      if (field) field.hidden = USERS.length <= 1;
    }
    loadApps();
  });
}

// --- apps ---------------------------------------------------------------
var APPS = [];
// lazy app icons: row renders immediately with a letter placeholder; the real
// icon loads on scroll into view, is cached in localStorage, and fills in async.
var iconObserver = ("IntersectionObserver" in window) ? new IntersectionObserver(function (entries, obs) {
  entries.forEach(function (e) { if (e.isIntersecting) { obs.unobserve(e.target); loadIcon(e.target); } });
}, { rootMargin: "200px" }) : null;
function setIcon(ic, b64) {
  ic.style.backgroundImage = "url(data:image/png;base64," + b64 + ")";
  ic.style.backgroundSize = "cover"; ic.textContent = "";
}
function iconKey(pkg, vc) { return "vdb_ic:" + pkg + ":" + vc; }
function cacheIcon(pkg, vc, b64) {
  try {
    var prefix = "vdb_ic:" + pkg + ":", key = prefix + vc;
    for (var i = localStorage.length - 1; i >= 0; i--) {   // evict stale versions of this app
      var k = localStorage.key(i);
      if (k && k.indexOf(prefix) === 0 && k !== key) localStorage.removeItem(k);
    }
    localStorage.setItem(key, b64);
  } catch (e) {}
}
// Icon loading is batched: many icons render in ONE helper call (one app_process)
// instead of one process per icon. Cache hits are instant.
var _iconQ = [], _iconTimer = null, ICON_BATCH = 40;
function loadIcon(ic) {
  var pkg = ic.dataset.pkg; if (!pkg) return;
  var vc = ic.dataset.vc || "0", cached = null;
  try { cached = localStorage.getItem(iconKey(pkg, vc)); } catch (e) {}
  if (cached) { setIcon(ic, cached); return; }
  _iconQ.push({ ic: ic, pkg: pkg, vc: vc });
  if (_iconQ.length >= ICON_BATCH) flushIcons();
  else if (!_iconTimer) _iconTimer = setTimeout(flushIcons, 120);
}
function flushIcons() {
  if (_iconTimer) { clearTimeout(_iconTimer); _iconTimer = null; }
  if (!_iconQ.length) return;
  var batch = _iconQ.splice(0, ICON_BATCH);
  var items = batch.map(function (e) { return { package: e.pkg, vc: e.vc }; });
  helper("icons", { user: activeUser, items: items }).then(function (r) {
    var map = (r && r.icons) ? r.icons : {};
    batch.forEach(function (e) {
      var b64 = map[e.pkg];
      if (b64) { cacheIcon(e.pkg, e.vc, b64); setIcon(e.ic, b64); }
    });
  });
  if (_iconQ.length) _iconTimer = setTimeout(flushIcons, 0);   // drain remaining
}
var selectMode = false;
var selected = {};   // package -> {package,label} while in select mode
function appFilter() { var e = $("#app-filter"); return e ? e.value : "user"; }
function appSort() { var e = $("#app-sort"); return e ? e.value : "name"; }
function visibleApps(filter, ignoreTag) {
  var q = (filter || "").toLowerCase(), f = appFilter();
  var list = APPS.filter(function (a) {
    if (f === "user" && a.system) return false;
    if (f === "system" && !a.system) return false;
    if (!ignoreTag && tagFilter && appTags(a.package).indexOf(tagFilter) < 0) return false;
    return !q || a.package.toLowerCase().indexOf(q) >= 0 || (a.label || "").toLowerCase().indexOf(q) >= 0;
  });
  var byName = appSort() === "name";
  list.sort(function (x, y) {
    var a = byName ? (x.label || x.package) : x.package, b = byName ? (y.label || y.package) : y.package;
    return a.toLowerCase().localeCompare(b.toLowerCase());
  });
  return list;
}
function renderApps(filter) {
  var ul = $("#applist"); ul.innerHTML = "";
  _iconQ = [];   // drop icon requests for the previous (now-removed) rows
  if (iconObserver) iconObserver.disconnect();   // drop the now-detached rows before re-observing
  var frag = document.createDocumentFragment();
  visibleApps(filter).forEach(function (a) {
    var li = el("li", "row");
    var ic = el("div", "app-ic", (a.label || a.package).charAt(0).toUpperCase());
    ic.dataset.pkg = a.package;
    ic.dataset.vc = (a.versionCode != null) ? String(a.versionCode) : "0";
    var grow = el("div", "grow");
    grow.appendChild(el("div", "name", a.label || a.package));
    grow.appendChild(el("div", "pkg", a.package));
    var _ts = appTags(a.package);
    if (_ts.length) { var tb = el("div", "tags"); _ts.forEach(function (t) { tb.appendChild(tagChip(t)); }); grow.appendChild(tb); }
    if (selectMode) {
      var cb = el("input", "selbox"); cb.type = "checkbox"; cb.checked = !!selected[a.package];
      cb.onclick = function (e) { e.stopPropagation(); toggleSel(a, cb.checked); li.classList.toggle("sel", cb.checked); };
      li.appendChild(cb); li.appendChild(ic); li.appendChild(grow);
      li.classList.add("tappable"); if (selected[a.package]) li.classList.add("sel");
      li.onclick = function () { cb.checked = !cb.checked; toggleSel(a, cb.checked); li.classList.toggle("sel", cb.checked); };
    } else {
      var btn = el("button", "btn go small", I18N.t("backup"));
      btn.onclick = function (e) { e.stopPropagation(); startBackup(a.package, a.label); };
      li.appendChild(ic); li.appendChild(grow); li.appendChild(btn);
      li.classList.add("tappable");
      li.onclick = function () { openAppBackups(a.package, a.label || a.package); };
    }
    frag.appendChild(li);
    if (iconObserver) iconObserver.observe(ic); else loadIcon(ic);
  });
  ul.appendChild(frag);
  // "Back up tag" is offered only when a tag is active, we are not in select mode, and the
  // tag actually matches apps in the current (user/system) view - so it never dead-ends.
  var tb = $("#app-backuptag");
  if (tb) tb.hidden = !(tagFilter && !selectMode && tagFilterApps().length);
}
function toggleSel(a, on) {
  if (on) selected[a.package] = { package: a.package, label: a.label };
  else delete selected[a.package];
  updateSelCount();
}
function updateSelCount() {
  var n = Object.keys(selected).length;
  $("#app-selcount").textContent = I18N.t("ui_selected_n", { n: n });
  $("#app-backupsel").disabled = n === 0;
}
function setSelectMode(on) {
  selectMode = on; selected = {};
  $("#app-batchbar").hidden = !on;
  $("#app-select").textContent = I18N.t(on ? "ui_cancel" : "ui_select");
  updateSelCount();
  renderApps($("#search").value);
}

var APPS_CACHE_PREFIX = "vdb_apps_cache_v2_";
function appsSig(list) {
  if (!list || !list.length) return "";
  return list.length + ":" + list.map(function (a) { return a.package + "@" + (a.versionCode || 0); }).join(",");
}

function loadApps(forceRefresh) {
  var user = (activeUser != null) ? (activeUser | 0) : 0;
  var key = APPS_CACHE_PREFIX + user;
  var hadCache = false;

  if (!forceRefresh && (!APPS || !APPS.length)) {
    try {
      var raw = localStorage.getItem(key);
      if (raw) {
        var cached = JSON.parse(raw);
        if (Array.isArray(cached) && cached.length) {
          APPS = cached;
          hadCache = true;
          fillTagFilter();
          renderApps($("#search") ? $("#search").value : "");
          setTimeout(function () {
            buildBlockPicker();
            buildAppItemsPicker();
          }, 100);
        }
      }
    } catch (e) {}
  }

  if (!hadCache && (!APPS || !APPS.length)) {
    $("#applist").innerHTML = "<li class='muted'>" + I18N.t("apps_loading") + "</li>";
  }

  return helper("list-apps", { user: user }).then(function (r) {
    if ((activeUser | 0) !== user) return;
    if (r && Array.isArray(r.apps)) {
      var fresh = r.apps;
      var changed = !hadCache || appsSig(fresh) !== appsSig(APPS);
      APPS = fresh;
      try {
        localStorage.setItem(key, JSON.stringify(fresh));
      } catch (e) {}
      if (changed || forceRefresh || !hadCache) {
        fillTagFilter();
        renderApps($("#search") ? $("#search").value : "");
        setTimeout(function () {
          buildBlockPicker();
          buildAppItemsPicker();
        }, 80);
      }
    }
  });
}

// --- backups ------------------------------------------------------------
var BACKUPS = [];
var SUSFS_DISMISSED = false;
var bkSelectMode = false, bkSelected = {};   // ref -> {ref,package,items} while selecting
function renderBackups(list) {
  var ul = $("#backuplist"); ul.innerHTML = "";
  BACKUPS = list || [];
  $("#backups-empty").style.display = (list && list.length) ? "none" : "";
  if (list && list.length) showSusfsNotice(); else { var sb = $("#susfs-notice"); if (sb) sb.hidden = true; }
  (list || []).forEach(function (b) {
    var li = el("li", "row tappable");
    var ic = el("div", "app-ic", (b.label || b.package).charAt(0).toUpperCase());
    var grow = el("div", "grow");
    grow.appendChild(el("div", "name", b.label || b.package));
    grow.appendChild(el("div", "pkg", b.package));
    grow.appendChild(el("div", "sub", shortDate(b.created_at)));
    if (bkSelectMode) {
      var cb = el("input", "selbox"); cb.type = "checkbox"; cb.checked = !!bkSelected[b.ref];
      cb.onclick = function (e) { e.stopPropagation(); toggleBkSel(b, cb.checked); li.classList.toggle("sel", cb.checked); };
      li.appendChild(cb); li.appendChild(ic); li.appendChild(grow);
      if (bkSelected[b.ref]) li.classList.add("sel");
      li.onclick = function () { cb.checked = !cb.checked; toggleBkSel(b, cb.checked); li.classList.toggle("sel", cb.checked); };
    } else {
      var btn = el("button", "btn go", I18N.t("restore"));
      btn.onclick = function (e) { e.stopPropagation(); startRestore(b.ref, b.package, b.items); };
      li.appendChild(ic); li.appendChild(grow); li.appendChild(btn);
      li.onclick = function () { openBackupInfo(b); };
    }
    ul.appendChild(li);
    loadBackupIcon(ic, b.ref);   // icon comes from the manifest, not the live app
  });
}
function toggleBkSel(b, on) {
  if (on) bkSelected[b.ref] = { ref: b.ref, package: b.package, items: b.items };
  else delete bkSelected[b.ref];
  updateBkSelCount();
}
function updateBkSelCount() {
  var n = Object.keys(bkSelected).length;
  $("#bk-selcount").textContent = I18N.t("ui_selected_n", { n: n });
  $("#bk-restoresel").disabled = n === 0;
}
function setBkSelectMode(on) {
  bkSelectMode = on; bkSelected = {};
  $("#bk-batchbar").hidden = !on;
  $("#bk-select").textContent = I18N.t(on ? "ui_cancel" : "ui_select");
  updateBkSelCount();
  renderBackups(BACKUPS);
}
// batch restore: one options modal (applies to all), then restore each in turn.
function startBatchRestore() {
  var refs = Object.keys(bkSelected); if (!refs.length) return;
  openOpModal({ needPassword: false, overwriteAck: true, allowTest: true, allowSpoof: true,
                titleKey: "restore", confirmKey: "restore",
                msg: I18N.t("confirm_restore_n", { n: refs.length }) }).then(function (res) {
    if (res == null) return;
    setBkSelectMode(false);
    // ONE detached op restores the whole list server-side (survives the WebUI closing).
    var args = { refs: refs, ssaid: res.ssaid, test: res.test, spoof_installer: res.spoof_installer, deep_spoof: res.deep_spoof };
    var run = function () { helper("restore-batch", args).then(function (r) { if (r && r.opid) trackOp(r.opid, { batch: true, retry: run }); }); };
    run();
  });
}
// Backup-list icon: read the icon stored in the manifest, so it shows even when
// the app is uninstalled. Cached per backup ref; "0" marks a backup with no icon.
function loadBackupIcon(ic, ref) {
  if (!ref) return;
  var key = "vdb_bic:" + ref, cached = null;
  try { cached = localStorage.getItem(key); } catch (e) {}
  if (cached) { if (cached !== "0") setIcon(ic, cached); return; }
  helper("backup-icon", { ref: ref }).then(function (r) {
    if (r && r.ok && r.icon) { try { localStorage.setItem(key, r.icon); } catch (e) {} setIcon(ic, r.icon); }
    else { try { localStorage.setItem(key, "0"); } catch (e) {} }
  });
}
// backup details (tap a backup entry)
function openBackupInfo(b) {
  var m = $("#info-modal"), body = $("#info-body");
  $("#info-title").textContent = b.label || b.package;
  body.innerHTML = "<div class='muted'>" + I18N.t("apps_loading") + "</div>";
  m.hidden = false;
  $("#info-close").onclick = function () { m.hidden = true; };
  $("#info-restore").onclick = function () { m.hidden = true; startRestore(b.ref, b.package, b.items); };
  $("#info-delete").onclick = function () { deleteBackup(b.ref, function () { m.hidden = true; loadBackups(); }); };
  helper("backup-info", { ref: b.ref }).then(function (r) {
    if (!r || !r.ok) { body.textContent = errMsg(r); return; }
    var rows = [
      [I18N.t("info_package"), r.package && r.package.name],
      [I18N.t("info_version"), (r.package && (r.package.versionName || "")) + " (" + (r.package && r.package.versionCode || "") + ")"],
      [I18N.t("info_installer"), r.package && (r.package.installer || I18N.t("info_sideloaded"))],
      [I18N.t("info_enabled"), r.package ? I18N.t((r.package.enabled === 2 || r.package.enabled === 3) ? "info_disabled" : "info_enabled_yes") : ""],
      [I18N.t("info_date"), r.created_at],
      [I18N.t("info_user"), r.user_id],
      [I18N.t("info_size"), fmtSize(r.size)],
      [I18N.t("info_items"), (r.items || []).map(function (it) { return it.type; }).join(", ")],
      [I18N.t("info_perms"), (r.permissions ? (r.permissions.granted + "/" + r.permissions.runtime) : "")],
      [I18N.t("info_appops"), r.permissions && r.permissions.appops],
      ["SDK / ABI", (r.device && r.device.sdk) + " / " + (r.device && r.device.abi)],
      ["SELinux / root", (r.device && r.device.selinux) + " / " + (r.device && r.device.root)]
    ];
    body.innerHTML = "";
    // scannable summary: mode + (opt-in) SSAID state as status badges
    var badges = el("div", "badge-row");
    var modeLabel = I18N.t("opt_mode_" + r.mode);
    if (modeLabel === "opt_mode_" + r.mode) modeLabel = r.mode;
    if (modeLabel) badges.appendChild(statusBadge("info", modeLabel));
    if (r.permissions && r.permissions.ssaid) badges.appendChild(statusBadge("warn", I18N.t("info_ssaid")));
    if (badges.children.length) body.appendChild(badges);
    rows.forEach(function (kv) {
      if (kv[1] == null || kv[1] === "") return;
      var row = el("div", "kv");
      row.appendChild(el("span", "k", kv[0]));
      row.appendChild(el("span", "v", String(kv[1])));
      body.appendChild(row);
    });
    // device fingerprint: a long technical value -> tap-to-copy
    if (r.device && r.device.fingerprint) body.appendChild(copyRow(I18N.t("info_device"), r.device.fingerprint));
    // per-item SHA-256 checksums: tap-to-copy for verification on a PC
    var sums = (r.items || []).filter(function (it) { return it && it.sha256; });
    if (sums.length) {
      body.appendChild(el("div", "kv-head", I18N.t("info_checksums")));
      sums.forEach(function (it) {
        var label = I18N.t("item_" + it.type);
        if (label === "item_" + it.type) label = it.type;
        body.appendChild(copyRow(label, it.sha256));
      });
    }
  });
}
function shortDate(s) {
  if (!s) return "";
  var d = new Date(s); if (isNaN(d.getTime())) return s;
  function p(n) { return (n < 10 ? "0" : "") + n; }
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
}
function fmtSize(n) {
  n = Number(n) || 0;
  var u = ["B", "KB", "MB", "GB", "TB"], i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return (i === 0 ? n : n.toFixed(1)) + " " + u[i];
}
function loadBackups() {
  helper("list-backups").then(function (r) { renderBackups(r && r.backups ? r.backups : []); });
}

// --- home overview (bento stats + storage bar) --------------------------
// Reads the read-only "overview" verb and fills the bento tiles + segmented
// storage bar at the top of the home view. On any failure the whole bento is
// hidden, so a broken or empty state never shows.
function loadOverview() {
  var box = $("#overview"); if (!box) return;
  helper("overview", { user: activeUser }).then(function (r) {
    if (!r || r.ok === false) { box.hidden = true; return; }
    $("#ov-apps").textContent = r.apps | 0;
    $("#ov-backups").textContent = r.instances | 0;
    $("#ov-folders").textContent = r.path_backups | 0;
    $("#ov-scheduled").textContent = r.jobs | 0;
    renderStorage(r.backups_size, r.free, r.total);
    box.hidden = false;
  }).catch(function () { box.hidden = true; });
}
function renderStorage(used, free, total) {
  var wrap = $("#ov-storage"); if (!wrap) return;
  used = Number(used) || 0; free = Number(free) || 0; total = Number(total) || 0;
  if (total <= 0) { wrap.hidden = true; return; }
  var pct = Math.max(0, Math.min(100, used / total * 100));
  $("#ov-bar-used").style.width = pct.toFixed(1) + "%";
  $("#ov-storage-line").textContent = I18N.t("ui_storage_line",
    { used: fmtSize(used), free: fmtSize(free), total: fmtSize(total) });
  wrap.hidden = false;
}
function startRestore(ref, pkg, items) {
  openOpModal({
    needPassword: false,
    overwriteAck: true,
    allowTest: true,
    allowSpoof: true,
    items: items,
    titleKey: "restore",
    confirmKey: "restore",
    msg: I18N.t("confirm_restore", { name: pkg })
  }).then(function (res) {
    if (res == null) return;
    var args = { ref: ref, ssaid: res.ssaid, test: res.test, spoof_installer: res.spoof_installer, deep_spoof: res.deep_spoof };
    if (res.items) args.items = res.items;
    var ctx = { restoreRef: ref, restorePkg: pkg, ssaid: res.ssaid, items: res.items, test: res.test, spoof_installer: res.spoof_installer, deep_spoof: res.deep_spoof };
    ctx.retry = function () { helper("restore", args).then(function (r) { if (r && r.opid) trackOp(r.opid, ctx); }); };
    ctx.retry();
  });
}
function deleteBackup(ref, onGone) {
  modalConfirm(I18N.t("confirm_delete_backup"), I18N.t("delete")).then(function (ok) {
    if (!ok) return;
    helper("delete-backup", { ref: ref }).then(function (r) {
      if (r && r.ok) { clearBackupIconCache(ref); if (onGone) onGone(); }
      else modalAlert(errMsg(r));
    });
  });
}
function clearBackupIconCache(ref) { try { localStorage.removeItem("vdb_bic:" + ref); } catch (e) {} }

// --- import (migrate from Neo Backup / DataBackup) ----------------------
function renderImports(from, list) {
  var ul = $("#importlist"); ul.innerHTML = "";
  $("#import-empty").hidden = !!(list && list.length);
  (list || []).forEach(function (b) {
    var li = el("li", "row");
    var grow = el("div", "grow");
    grow.appendChild(el("div", "name", (b.label || b.package) + (b.versionName ? " (" + b.versionName + ")" : "")));
    grow.appendChild(el("div", "pkg", b.package || ""));
    if (b.encrypted) grow.appendChild(statusBadge("info", I18N.t("ui_import_encrypted")));
    var btn = el("button", "btn go", I18N.t("ui_import_do"));
    btn.onclick = function () { startImport(from, b, false); };
    li.appendChild(grow); li.appendChild(btn);
    ul.appendChild(li);
  });
}
function scanImports() {
  var from = $("#import-from").value;
  $("#importlist").innerHTML = "<li class='muted'>" + I18N.t("apps_loading") + "</li>";
  $("#import-empty").hidden = true;
  helper("import-scan", { from: from }).then(function (r) {
    renderImports(from, r && r.backups ? r.backups : []);
  });
}
function startImport(from, entry, retry) {
  var needPw = !!entry.encrypted || !!retry;
  openOpModal({
    needPassword: needPw,
    retry: retry,
    overwriteAck: true,
    titleKey: needPw ? "ui_import_password" : "ui_import_do",
    confirmKey: "ui_import_do",
    msg: needPw ? I18N.t("msg_import_password", { name: entry.label || entry.package }) : ""
  }).then(function (res) {
    if (res == null) return;
    runImport(from, entry, res.password, res.ssaid);
  });
}
function runImport(from, entry, password, ssaid) {
  var args = { from: from, ref: entry.ref, package: entry.package, user: activeUser, ssaid: !!ssaid };
  if (password != null) args.password = password;
  helper("import", args).then(function (r) {
    args.password = ""; password = "";
    if (r && r.opid) trackOp(r.opid, { from: from, entry: entry });
  });
}
function openOpModal(o) {
  return new Promise(function (resolve) {
    var modal = $("#pw-modal"), input = $("#pw-input"), errBox = $("#pw-err"), ssaid = $("#pw-ssaid");
    var okBtn = $("#pw-ok"), ackRow = $("#pw-overwrite-row"), ack = $("#pw-overwrite");
    var ssaidRow = $("#pw-ssaid-row"); ssaidRow.hidden = (o.allowSsaid === false);   // hide for flows where SSAID is irrelevant (e.g. settings backup)
    input.value = ""; ssaid.checked = false; input.hidden = !o.needPassword;
    errBox.textContent = (o.needPassword && o.retry) ? I18N.t("msg_import_password_wrong") : "";
    $("#pw-title").textContent = I18N.t(o.titleKey || "ui_import_password");
    $("#pw-msg").textContent = o.msg || "";
    okBtn.textContent = I18N.t(o.confirmKey || "ui_import_do");
    // overwrite friction: on restore/import, the confirm button stays disabled until
    // the user acknowledges the current app data will be overwritten.
    ack.checked = false; ackRow.hidden = !o.overwriteAck;
    // test-restore toggle: extract to staging without touching the live app. When it
    // is ticked the overwrite acknowledgement is not needed (nothing is overwritten).
    var testRow = $("#pw-test-row"), test = $("#pw-test");
    test.checked = false; testRow.hidden = !o.allowTest;
    var spoofRow = $("#pw-spoof-row"), spoof = $("#pw-spoof");
    spoof.checked = (CFG.spoof_installer !== false); spoofRow.hidden = !o.allowSpoof;
    var deepRow = $("#pw-deep-row"), deep = $("#pw-deep");
    deep.checked = false; deepRow.hidden = !o.allowSpoof;   // advanced; always starts off (explicit choice)
    // deep spoof only makes sense with the installer spoof on; follow it.
    spoof.onchange = function () { if (!spoof.checked) deep.checked = false; deep.disabled = !spoof.checked; };
    deep.disabled = !spoof.checked;
    function syncOk() { okBtn.disabled = (o.overwriteAck && !ack.checked && !(o.allowTest && test.checked)); }
    ack.onchange = syncOk; test.onchange = function () { ackRow.hidden = o.overwriteAck && test.checked; syncOk(); };
    syncOk();
    // selective restore: a checkbox per item the backup holds (all ticked by default)
    var itemsBox = $("#pw-items"); itemsBox.innerHTML = ""; itemsBox.hidden = !(o.items && o.items.length);
    (o.items || []).forEach(function (t) {
      var lab = document.createElement("label"), cb = document.createElement("input");
      cb.type = "checkbox"; cb.checked = true; cb.dataset.it = t;
      var sp = document.createElement("span"); sp.textContent = I18N.t("item_" + t);
      if (sp.textContent === "item_" + t) sp.textContent = t;
      lab.appendChild(cb); lab.appendChild(sp); itemsBox.appendChild(lab);
    });
    modal.hidden = false;
    if (o.needPassword) setTimeout(function () { input.focus(); }, 0);
    function cleanup() {
      input.value = ""; errBox.textContent = ""; modal.hidden = true; input.hidden = false;
      okBtn.disabled = false; ackRow.hidden = true; ack.onchange = null; itemsBox.hidden = true; itemsBox.innerHTML = ""; ssaidRow.hidden = false;
      testRow.hidden = true; test.onchange = null; spoofRow.hidden = true;
      deepRow.hidden = true; deep.disabled = false; spoof.onchange = null;
      okBtn.onclick = null; $("#pw-cancel").onclick = null; input.onkeydown = null;
    }
    function submit() {
      if (okBtn.disabled) return;
      var r = { password: o.needPassword ? input.value : null, ssaid: ssaid.checked };
      if (o.allowTest) r.test = test.checked;
      if (o.allowSpoof) { r.spoof_installer = spoof.checked; r.deep_spoof = deep.checked; }
      if (o.items && o.items.length) {
        r.items = Array.prototype.map.call(itemsBox.querySelectorAll("input:checked"), function (c) { return c.dataset.it; });
      }
      cleanup(); resolve(r);
    }
    function cancel() { cleanup(); resolve(null); }
    $("#pw-ok").onclick = submit;
    $("#pw-cancel").onclick = cancel;
    input.onkeydown = function (e) {
      if (e.key === "Enter") submit();
      else if (e.key === "Escape") cancel();
    };
  });
}

// modern confirm/alert (replaces the native dialogs). Returns a Promise<boolean>.
function openMsg(o) {
  return new Promise(function (resolve) {
    var m = $("#msg-modal"), ok = $("#msg-ok"), cancel = $("#msg-cancel");
    $("#msg-title").textContent = o.title || "";
    $("#msg-body").textContent = o.body || "";
    cancel.style.display = o.confirm ? "" : "none";
    m.hidden = false;
    function done(v) { m.hidden = true; ok.onclick = null; cancel.onclick = null; resolve(v); }
    ok.onclick = function () { done(true); };
    cancel.onclick = function () { done(false); };
  });
}
function modalAlert(body, title) { return openMsg({ body: body, title: title || "", confirm: false }); }
function modalConfirm(body, title) { return openMsg({ body: body, title: title || "", confirm: true }); }

// per-app backup history: tap an app to see its backups and restore one
function openAppBackups(pkg, label) {
  var m = $("#appbk-modal"), ul = $("#appbk-list");
  $("#appbk-title").textContent = label || pkg;
  ul.innerHTML = "<li class='muted'>" + I18N.t("apps_loading") + "</li>";
  $("#appbk-empty").hidden = true;
  m.hidden = false;
  $("#appbk-close").onclick = function () { m.hidden = true; };
  $("#appbk-backup").onclick = function () { m.hidden = true; startBackup(pkg, label); };
  $("#appbk-items").onclick = function () { m.hidden = true; openAppItemsModal(pkg, label); };
  $("#appbk-sysmount").onclick = function () { m.hidden = true; openSysmount(pkg, label); };
  helper("list-backups").then(function (r) {
    var all = (r && r.backups) ? r.backups : [];
    var mine = all.filter(function (b) { return b.package === pkg; });
    ul.innerHTML = "";
    $("#appbk-empty").hidden = mine.length > 0;
    mine.forEach(function (b) {
      var li = el("li", "row");
      var grow = el("div", "grow");
      grow.appendChild(el("div", "name", (b.versionName || b.versionCode || "") + ""));
      grow.appendChild(el("div", "pkg", (b.created_at || "") + " - " + (b.items || []).join(", ")));
      var btn = el("button", "btn go small", I18N.t("restore"));
      btn.onclick = function () { m.hidden = true; startRestore(b.ref, b.package, b.items); };
      var del = el("button", "btn danger small", I18N.t("delete"));
      del.onclick = function () { deleteBackup(b.ref, function () { openAppBackups(pkg, label); }); };
      li.appendChild(grow); li.appendChild(btn); li.appendChild(del);
      ul.appendChild(li);
    });
  });
}

// --- destinations -------------------------------------------------------
var DESTS = [];
var REMOTES = [];
function renderDests(list) {
  var ul = $("#destlist"); ul.innerHTML = "";
  (list || []).forEach(function (d) {
    var li = el("li", "row"), grow = el("div", "grow");
    grow.appendChild(el("div", "name", d.id + "  (" + d.type + ")"));
    grow.appendChild(el("div", "pkg", d.remote || d.repo || d.path || ""));
    var t = el("button", "btn", I18N.t("test")); t.onclick = function () { testDest(d.id); };
    var x = el("button", "btn", I18N.t("delete")); x.onclick = function () { delDest(d.id); };
    li.appendChild(grow); li.appendChild(t); li.appendChild(x); ul.appendChild(li);
  });
  fillDestSelect();
}
function loadDests() {
  helper("dests-list").then(function (r) { DESTS = (r && r.dests) ? r.dests : []; renderDests(DESTS); });
  loadRemotes();
  syncDestFields();
  checkTelegramStatus();
}
function loadRemotes() {
  helper("remote-list").then(function (r) {
    REMOTES = (r && r.remotes) ? r.remotes : [];
    renderRemotes();
    fillRemoteSelect();
  });
}
function renderRemotes() {
  var ul = $("#remotelist"); if (!ul) return; ul.innerHTML = "";
  REMOTES.forEach(function (rm) {
    var li = el("li", "row");
    li.appendChild(el("span", "grow", rm.name + "  (" + rm.type + ")"));
    var del = el("button", "btn small", I18N.t("delete"));
    del.onclick = function () { delRemote(rm.name); };
    li.appendChild(del);
    ul.appendChild(li);
  });
}
function fillRemoteSelect() {
  var sel = $("#d-remote"); if (!sel) return;
  var prev = sel.value; sel.innerHTML = "";
  if (!REMOTES.length) {
    var o = document.createElement("option"); o.value = ""; o.textContent = I18N.t("remote_none"); sel.appendChild(o);
  }
  REMOTES.forEach(function (rm) {
    var o = document.createElement("option"); o.value = rm.name; o.textContent = rm.name + " (" + rm.type + ")"; sel.appendChild(o);
  });
  if (prev) sel.value = prev;
}
// backends whose only stored credential is an rclone OAuth token: on-device
// authorize flow (helper remote-authorize/-poll/-cancel) or a manually pasted token.
var OAUTH_BACKENDS = ["drive", "dropbox", "onedrive", "box", "pcloud"];
function isOauthBackend(be) { return OAUTH_BACKENDS.indexOf(be) >= 0; }
function syncRemoteFields() {
  var be = $("#r-backend").value;
  var set = function (sel, on) { var e = $(sel); if (e) e.style.display = on ? "" : "none"; };
  var hostlike = (be === "sftp" || be === "smb" || be === "ftp");
  var oauth = isOauthBackend(be);
  set("#r-host", hostlike);
  set("#r-port", hostlike);
  set("#r-url", be === "webdav");
  set("#r-vendor", be === "webdav");
  set("#r-user", hostlike || be === "webdav" || be === "mega");
  set("#r-pass", hostlike || be === "webdav" || be === "mega");
  set("#r-akey", be === "s3");
  set("#r-skey", be === "s3");
  set("#r-endpoint", be === "s3");
  set("#r-region", be === "s3");
  set("#r-account", be === "b2");
  set("#r-key", be === "b2");
  set("#r-authorize-box", oauth);
  set("#r-token", oauth);
  set("#r-drive-hint", be === "drive");
  set("#r-custom-box", be === "custom");
  resetAuthorizeUI();           // switching backend ends any pending authorize UI
}
function addRemote() {
  var name = $("#r-name").value.trim();
  var be = $("#r-backend").value;
  if (!name) { modalAlert(I18N.t("ui_r_name_needed")); return; }
  var p = {}, backend = be;
  var v = function (sel) { var e = $(sel); return e ? e.value.trim() : ""; };
  if (be === "sftp" || be === "smb" || be === "ftp") {
    p.host = v("#r-host"); if (v("#r-port")) p.port = v("#r-port");
    p.user = v("#r-user"); p.pass = $("#r-pass").value;
  } else if (be === "webdav") {
    p.url = v("#r-url"); if (v("#r-vendor")) p.vendor = v("#r-vendor");
    p.user = v("#r-user"); p.pass = $("#r-pass").value;
  } else if (be === "s3") {
    p.provider = v("#r-endpoint") ? "Other" : "AWS";
    p.access_key_id = v("#r-akey"); p.secret_access_key = $("#r-skey").value;
    if (v("#r-endpoint")) p.endpoint = v("#r-endpoint");
    if (v("#r-region")) p.region = v("#r-region");
  } else if (be === "mega") {
    p.user = v("#r-user"); p.pass = $("#r-pass").value;
  } else if (be === "b2") {
    p.account = v("#r-account"); p.key = $("#r-key").value;
  } else if (isOauthBackend(be)) {
    var tok = $("#r-token").value.trim() || _authorizedToken || "";
    if (!tok) { modalAlert(I18N.t("ui_r_auth_needed")); return; }
    if (be === "drive") p.scope = "drive";
    p.token = tok;
  } else if (be === "custom") {
    backend = v("#r-custom-backend").toLowerCase();
    if (!/^[a-z0-9]+$/.test(backend)) { modalAlert(I18N.t("ui_r_custom_invalid")); return; }
    collectParamRows(p);
  }
  helper("remote-add", { name: name, backend: backend, params: p }).then(function (r) {
    if (r && r.ok) {
      $("#r-name").value = ""; $("#r-pass").value = ""; $("#r-skey").value = "";
      $("#r-key").value = ""; $("#r-token").value = ""; $("#r-custom-backend").value = "";
      $("#r-params").innerHTML = ""; _authorizedToken = "";
      resetAuthorizeUI();
      loadRemotes();
    } else { modalAlert(errMsg(r)); }
  });
}
// --- custom backend: repeatable key=value parameter rows ------------------
function addParamRow() {
  var box = $("#r-params"); if (!box) return;
  var row = el("div", "param-row");
  var k = el("input", "param-key"); k.type = "text"; k.placeholder = I18N.t("ui_r_key");
  var val = el("input", "param-value"); val.type = "text"; val.placeholder = I18N.t("ui_r_value");
  var del = el("button", "btn small param-del", "×"); del.type = "button";
  del.onclick = function () { box.removeChild(row); };
  row.appendChild(k); row.appendChild(val); row.appendChild(del);
  box.appendChild(row);
}
function collectParamRows(p) {
  var rows = $("#r-params").querySelectorAll(".param-row");
  Array.prototype.forEach.call(rows, function (row) {
    var k = row.querySelector(".param-key").value.trim();
    var v = row.querySelector(".param-value").value;
    if (k) p[k] = v;
  });
}
// --- on-device OAuth (authorize in the phone browser, poll for the token) -
// Only one poll runs at a time; the handle is cleared on cancel/done/timeout/
// tab-switch. The engine opens the consent page via an Android VIEW intent.
var _authTimer = null, _authDeadline = 0, _authorizedToken = "", _authActive = false;
var AUTH_TIMEOUT_MS = 300000, AUTH_POLL_MS = 2000;
function stopAuthorizePoll() { if (_authTimer) { clearInterval(_authTimer); _authTimer = null; } }
// opening the consent page backgrounds the webview, which throttles/stops the poll.
// When the app comes back to the foreground, resume: the token is already captured
// by rclone, so one poll completes the remote automatically - the user just returns.
function onAuthForeground() {
  if (!_authActive || document.visibilityState !== "visible") return;
  _authDeadline = Date.now() + AUTH_TIMEOUT_MS;   // do not count time spent in the browser
  if (!_authTimer) _authTimer = setInterval(pollAuthorize, AUTH_POLL_MS);
  pollAuthorize();                                 // check right away on return
}
document.addEventListener("visibilitychange", onAuthForeground);
window.addEventListener("focus", onAuthForeground);
function resetAuthorizeUI() {
  _authActive = false;
  stopAuthorizePoll();
  var status = $("#r-auth-status"), link = $("#r-auth-link"), errBox = $("#r-auth-err");
  var cancel = $("#r-auth-cancel"), authBtn = $("#r-authorize");
  if (status) { status.hidden = true; var sp = status.querySelector(".spinner"); if (sp) sp.style.display = ""; }
  if (link) { link.hidden = true; link.removeAttribute("href"); }
  if (errBox) errBox.textContent = "";
  if (cancel) cancel.hidden = true;
  if (authBtn) authBtn.disabled = false;
}
function authMsg(key) { var m = $("#r-auth-msg"); if (m) m.textContent = I18N.t(key); }
function startAuthorize() {
  var name = $("#r-name").value.trim();
  if (!name) { modalAlert(I18N.t("ui_r_name_needed")); return; }
  var be = $("#r-backend").value;
  if (!isOauthBackend(be)) return;
  resetAuthorizeUI();
  _authorizedToken = "";
  $("#r-authorize").disabled = true;
  $("#r-auth-status").hidden = false;
  $("#r-auth-cancel").hidden = false;
  authMsg("ui_r_authorizing");
  helper("remote-authorize", { backend: be }).then(function (r) {
    if (!r || !r.ok) { resetAuthorizeUI(); $("#r-auth-err").textContent = errMsg(r); return; }
    if (r.url) {
      var link = $("#r-auth-link");
      link.href = r.url; link.hidden = false;
    }
    _authActive = true;
    // persist the pending remote so we can finish it even if the webview is fully
    // reloaded while backgrounded (recoverPendingAuth() at boot picks it up).
    try { localStorage.setItem("vdb_pending_auth", JSON.stringify({ name: name, backend: be })); } catch (e) {}
    _authDeadline = Date.now() + AUTH_TIMEOUT_MS;
    _authTimer = setInterval(pollAuthorize, AUTH_POLL_MS);
  });
}
function clearPendingAuth() { try { localStorage.removeItem("vdb_pending_auth"); } catch (e) {} }
// at boot, if an authorization was pending when the app last closed, poll once: the
// token is already captured by rclone, so the remote is created without re-consenting.
function recoverPendingAuth() {
  var p; try { p = JSON.parse(localStorage.getItem("vdb_pending_auth") || "null"); } catch (e) {}
  if (!p || !p.name || !p.backend) return;
  helper("remote-authorize-poll").then(function (r) {
    if (r && r.ok && r.done && r.token) {
      helper("remote-add", { name: p.name, backend: p.backend, params: { token: r.token } }).then(function (res) {
        clearPendingAuth();
        if (res && res.ok) { if (typeof loadRemotes === "function") loadRemotes(); showToast(I18N.t("ui_r_authorized")); }
      });
    } else { clearPendingAuth(); }   // nothing captured: drop the stale marker
  });
}
function pollAuthorize() {
  if (Date.now() > _authDeadline) {
    cancelAuthorize();
    $("#r-auth-err").textContent = I18N.t("ui_r_auth_timeout");
    return;
  }
  helper("remote-authorize-poll").then(function (r) {
    if (!r || !r.ok) {
      stopAuthorizePoll(); resetAuthorizeUI();
      $("#r-auth-err").textContent = errMsg(r || { code: "ERR_AUTHORIZE" });
      return;
    }
    if (r.done) {
      _authActive = false;
      stopAuthorizePoll();
      _authorizedToken = r.token || "";
      $("#r-auth-cancel").hidden = true;
      $("#r-auth-status").querySelector(".spinner").style.display = "none";
      authMsg("ui_r_authorized");
      $("#r-authorize").disabled = false;
      clearPendingAuth();
      addRemote();   // store the remote with the freshly obtained token
    }
  });
}
function cancelAuthorize() {
  _authActive = false;
  clearPendingAuth();
  stopAuthorizePoll();
  helper("remote-authorize-cancel").then(function () {});
  resetAuthorizeUI();
}
function delRemote(name) {
  modalConfirm(I18N.t("confirm_delete", { name: name })).then(function (ok) {
    if (!ok) return;
    helper("remote-del", { name: name }).then(loadRemotes);
  });
}
// Populate a <select> with every destination (local + configured) and preselect
// `value`. Shared by the Settings default-destination and the per-backup picker.
function fillDestOptions(sel, value) {
  if (!sel) return; sel.innerHTML = "";
  var o0 = document.createElement("option"); o0.value = "local"; o0.textContent = "local"; sel.appendChild(o0);
  DESTS.forEach(function (d) {
    if (d.id === "local") return;
    var o = document.createElement("option"); o.value = d.id; o.textContent = d.id + " (" + d.type + ")"; sel.appendChild(o);
  });
  sel.value = value || "local";
}
function fillDestSelect() { fillDestOptions($("#set-dest"), CFG.default_dest); }
function syncDestFields() {
  var type = $("#d-type").value;
  var set = function (sel, on) { var e = $(sel); if (e) e.style.display = on ? "" : "none"; };
  set("#d-remote", type === "rclone");
  set("#d-repo", type === "restic");
  set("#d-pass", type === "restic");
  set("#d-path", type !== "restic" && type !== "telegram" && type !== "gdrive");
  set("#d-browse", type === "local");   // folder browser only makes sense for a local path
  set("#remote-box", type === "rclone");
  var hint = $("#d-rclone-hint"); if (hint) hint.hidden = (type !== "rclone");
  var tgHint = $("#d-telegram-hint");
  if (tgHint) {
    if (type !== "telegram") tgHint.hidden = true;
    else {
      var isAuth = TG_STATE && (TG_STATE.authorized || TG_STATE.is_auth);
      tgHint.hidden = !!isAuth;
    }
  }
}
// jump to the Add-cloud-remote section and briefly highlight it, so choosing the
// rclone destination type makes clear that a remote is required and where to add it.
function focusAddRemote() {
  var box = $("#remote-box"); if (!box) return;
  box.style.display = "";
  var head = $("#remote-head") || box;
  if (head.scrollIntoView) head.scrollIntoView({ behavior: "smooth", block: "start" });
  box.classList.remove("flash-target"); void box.offsetWidth;
  box.classList.add("flash-target");
  setTimeout(function () { box.classList.remove("flash-target"); }, 1700);
}
// folder browser for a local destination path (confined to shared storage)
var _dirCur = "/storage/emulated/0";
function openDirPicker(targetSel) {
  targetSel = targetSel || "#d-path";
  var m = $("#dir-modal"); m.hidden = false;
  var start = $(targetSel).value;
  loadDir((start && start.charAt(0) === "/") ? start : "/storage/emulated/0");
  loadVolumes();
  $("#dir-cancel").onclick = function () { m.hidden = true; };
  $("#dir-use").onclick = function () { $(targetSel).value = _dirCur; m.hidden = true; };
}
// quick-jump chips for each storage volume (internal + any SD card / USB), so a
// destination on removable media is one tap away instead of climbing to /storage.
function loadVolumes() {
  var box = $("#dir-vols"); if (!box) return;
  box.innerHTML = "";
  helper("list-volumes").then(function (r) {
    var vols = (r && r.volumes) ? r.volumes : [];
    if (vols.length < 2) return;   // only internal: no shortcut worth showing
    vols.forEach(function (v) {
      var label = v.removable ? (I18N.t("ui_vol_sd") + (v.id ? " · " + v.id : "")) : I18N.t("ui_vol_internal");
      var c = el("button", "vol-chip", label);
      c.title = v.path;
      c.onclick = function () { loadDir(v.path); };
      box.appendChild(c);
    });
  });
}
function loadDir(path) {
  var ul = $("#dir-list"); ul.innerHTML = "<li class='muted'>" + I18N.t("apps_loading") + "</li>";
  helper("list-dirs", { path: path }).then(function (r) {
    if (!r || !r.ok) { ul.innerHTML = ""; $("#dir-path").textContent = errMsg(r); return; }
    _dirCur = r.path; $("#dir-path").textContent = r.path; ul.innerHTML = "";
    if (r.parent) {
      var up = el("li", "row tappable"); up.appendChild(el("div", "grow", ".."));
      up.onclick = function () { loadDir(r.parent); }; ul.appendChild(up);
    }
    (r.dirs || []).forEach(function (name) {
      var li = el("li", "row tappable"); li.appendChild(el("div", "grow", name));
      li.onclick = function () { loadDir(r.path + "/" + name); }; ul.appendChild(li);
    });
  });
}
function destById(id) {
  for (var i = 0; i < DESTS.length; i++) if (DESTS[i].id === id) return DESTS[i];
  return null;
}
function addDest() {
  var type = $("#d-type").value;
  var d = {
    id: $("#d-id").value.trim(), type: type,
    remote: $("#d-remote").value.trim(), path: $("#d-path").value.trim(),
    repo: $("#d-repo").value.trim(), password: $("#d-pass").value
  };
  if (!d.id) return;
  if (type === "telegram") {
    checkTelegramStatus().then(function (st) {
      var isAuth = st && (st.authorized || st.is_auth);
      if (!isAuth) openTelegramModal();
    });
  }
  helper("dest-add", d).then(function (r) {
    $("#d-id").value = ""; $("#d-pass").value = ""; loadDests();
    if (type === "gdrive") setupGdrive(d.id);
    // removable media (SD/USB) is plaintext at rest; warn (do not block) when the backup
    // itself is not encrypted, so an unencrypted backup on a card is an informed choice.
    if (r && r.removable && !CFG.encrypt_data) modalAlert(I18N.t("msg_removable_unencrypted"), I18N.t("ui_removable_title"));
  });
}
function testDest(id) {
  var d = destById(id);
  if (d && d.type === "gdrive") { setupGdrive(id); return; }
  if (d && d.type === "telegram") {
    checkTelegramStatus().then(function (st) {
      var isAuth = st && (st.authorized || st.is_auth);
      if (isAuth) {
        modalAlert(id + ": " + I18N.t("dest_ok"));
      } else {
        openTelegramModal();
      }
    });
    return;
  }
  helper("dest-test", { id: id }).then(function (r) {
    modalAlert(id + ": " + ((r && r.reachable) ? I18N.t("dest_ok") : errMsg(r)));
  });
}
function delDest(id) {
  modalConfirm(I18N.t("confirm_delete", { name: id })).then(function (ok) {
    if (!ok) return;
    helper("dest-del", { id: id }).then(loadDests);
  });
}

// --- Telegram Cloud Storage (Native MTProto) -----------------------------
var TG_STATE = null;
var _tgLoadedBackups = [];
var _tgPendingPhone = "";

function checkTelegramStatus() {
  return helper("telegram-status").then(function (r) {
    TG_STATE = (r && r.ok) ? r : null;
    updateTelegramUI();
    return TG_STATE;
  }).catch(function () {
    TG_STATE = null;
    updateTelegramUI();
  });
}

function updateTelegramUI() {
  var isAuth = TG_STATE && (TG_STATE.authorized || TG_STATE.is_auth);
  var tgHint = $("#d-telegram-hint");
  if (tgHint) {
    var type = $("#d-type") ? $("#d-type").value : "";
    tgHint.hidden = (type !== "telegram") || !!isAuth;
  }
}

function showTgStep(step) {
  var steps = ["phone", "code", "notice", "active"];
  steps.forEach(function (s) {
    var el = $("#tg-step-" + s);
    if (el) el.hidden = (s !== step);
  });
  var errs = ["phone", "code", "create"];
  errs.forEach(function (e) {
    var errEl = $("#tg-" + e + "-err");
    if (errEl) { errEl.textContent = ""; errEl.hidden = true; }
  });

  // Dynamic Stepper State Update
  var stepper = $("#tg-stepper");
  if (stepper) stepper.hidden = (step === "active");

  var node1 = $("#tg-node-1"), node2 = $("#tg-node-2"), node3 = $("#tg-node-3");
  var line1 = $("#tg-line-1"), line2 = $("#tg-line-2");
  if (node1 && node2 && node3) {
    node1.className = "tg-step-node" + (step === "phone" ? " active" : " completed");
    node2.className = "tg-step-node" + (step === "code" ? " active" : (step === "notice" || step === "active" ? " completed" : ""));
    node3.className = "tg-step-node" + (step === "notice" ? " active" : (step === "active" ? " completed" : ""));
    if (line1) line1.className = "tg-step-line" + (step !== "phone" ? " active" : "");
    if (line2) line2.className = "tg-step-line" + (step === "notice" || step === "active" ? " active" : "");
  }
}

function setupTelegramInteractiveInputs() {
  var codeInp = $("#tg-code-input");
  if (codeInp && !codeInp._bound) {
    codeInp._bound = true;
    codeInp.addEventListener("input", function () {
      this.value = this.value.replace(/[^0-9]/g, "");
      if (this.value.length === 5 && $("#tg-pw-box").hidden) {
        var verifyBtn = $("#tg-code-verify");
        if (verifyBtn) verifyBtn.focus();
      }
    });
    codeInp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") submitTelegramCode();
    });
  }

  var pwInp = $("#tg-pw-input");
  if (pwInp && !pwInp._bound) {
    pwInp._bound = true;
    pwInp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") submitTelegramCode();
    });
  }

  var phoneInp = $("#tg-phone-input");
  if (phoneInp && !phoneInp._bound) {
    phoneInp._bound = true;
    phoneInp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") submitTelegramPhone();
    });
  }

  var searchInp = $("#tg-bk-search");
  if (searchInp && !searchInp._bound) {
    searchInp._bound = true;
    searchInp.addEventListener("input", function () {
      renderTelegramBackups(this.value);
    });
  }
}

function openTelegramModal() {
  var m = $("#tg-modal"); if (!m) return;
  m.hidden = false;
  setupTelegramInteractiveInputs();

  checkTelegramStatus().then(function (st) {
    var isAuth = st && (st.authorized || st.is_auth);
    if (isAuth) {
      showTgStep("active");
      var u = (st.user && (st.user.first_name || st.user.username || st.user.phone)) || "User";
      var fullName = (st.user && [st.user.first_name, st.user.last_name].filter(Boolean).join(" ")) || u;
      var phoneTxt = (st.user && st.user.phone ? ("+" + st.user.phone.replace("+", "")) : "") +
                     (st.user && st.user.username ? (" (@" + st.user.username + ")") : "");
      var ch = (st.channel && st.channel.title) || (st.dest && st.dest.channel_title) || "VD_Backup";
      var chId = (st.channel && st.channel.id) || (st.dest && st.dest.channel_id) ? String((st.channel && st.channel.id) || st.dest.channel_id) : "";

      if ($("#tg-active-user")) $("#tg-active-user").textContent = fullName;
      if ($("#tg-active-phone")) $("#tg-active-phone").textContent = phoneTxt || "MTProto Session";
      if ($("#tg-active-channel")) $("#tg-active-channel").textContent = ch;
      if ($("#tg-active-chid")) $("#tg-active-chid").textContent = chId || "-";

      var initial = (u.replace(/[^a-zA-Z0-9]/g, "")[0] || "T").toUpperCase();
      if ($("#tg-avatar-initial")) $("#tg-avatar-initial").textContent = initial;

      var copyBtn = $("#tg-copy-ch-btn");
      if (copyBtn && chId) {
        copyBtn.onclick = function () {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(chId).then(function () {
              var txt = $("#tg-copy-ch-txt");
              if (txt) txt.textContent = I18N.t("tg_copied") || "Copied!";
              copyBtn.style.borderColor = "var(--ok)";
              copyBtn.style.color = "var(--ok)";
              setTimeout(function () {
                if (txt) txt.textContent = I18N.t("tg_copy") || "Copy";
                copyBtn.style.borderColor = "";
                copyBtn.style.color = "";
              }, 1800);
            });
          }
        };
      }
    } else {
      showTgStep("phone");
      var inp = $("#tg-phone-input");
      if (inp) { inp.value = ""; inp.focus(); }
    }
  });
}

function submitTelegramPhone() {
  var raw = ($("#tg-phone-input").value || "").trim();
  var errEl = $("#tg-phone-err");
  if (!raw) {
    errEl.textContent = I18N.t("tg_err_phone_required");
    errEl.hidden = false;
    return;
  }
  var digits = raw.replace(/^00/, "").replace(/\D/g, "");
  if (!digits) {
    errEl.textContent = I18N.t("tg_err_phone_required");
    errEl.hidden = false;
    return;
  }
  var phone = "+" + digits;
  errEl.hidden = true;
  var btn = $("#tg-phone-next");
  btn.disabled = true;
  var origContent = btn.innerHTML;
  btn.innerHTML = "<span class='spinner'></span> <span>" + I18N.t("ui_loading") + "</span>";

  helper("telegram-send-code", { phone: phone }).then(function (r) {
    btn.disabled = false;
    btn.innerHTML = origContent;
    if (r && r.ok) {
      _tgPendingPhone = phone;
      showTgStep("code");
      var codeInp = $("#tg-code-input");
      if (codeInp) { codeInp.value = ""; codeInp.focus(); }
      $("#tg-pw-box").hidden = true;
      $("#tg-pw-input").value = "";
    } else {
      errEl.textContent = errMsg(r);
      errEl.hidden = false;
    }
  }).catch(function (e) {
    btn.disabled = false;
    btn.innerHTML = origContent;
    errEl.textContent = String(e);
    errEl.hidden = false;
  });
}

function submitTelegramCode() {
  var rawCode = ($("#tg-code-input").value || "").trim();
  var code = rawCode.replace(/\D/g, "");
  var pw = ($("#tg-pw-input").value || "").trim();
  var errEl = $("#tg-code-err");

  if (!code) {
    errEl.textContent = I18N.t("tg_err_code_required");
    errEl.hidden = false;
    return;
  }
  errEl.hidden = true;
  var btn = $("#tg-code-verify");
  btn.disabled = true;
  var origText = btn.textContent;
  btn.innerHTML = "<span class='spinner'></span> <span>" + I18N.t("ui_loading") + "</span>";

  helper("telegram-sign-in", { phone: _tgPendingPhone, code: code, password: pw }).then(function (r) {
    btn.disabled = false;
    btn.textContent = origText;

    if (r && (r.need_password || r.code === "2FA_REQUIRED")) {
      $("#tg-pw-box").hidden = false;
      errEl.textContent = r.message || I18N.t("tg_need_password");
      errEl.hidden = false;
      var pwi = $("#tg-pw-input");
      if (pwi) pwi.focus();
      return;
    }

    if (r && r.ok) {
      checkTelegramStatus().then(function (st) {
        var hasChannel = st && ((st.channel && st.channel.id) || (st.dest && st.dest.channel_id));
        if (hasChannel) {
          showTgStep("active");
          loadDests();
        } else {
          showTgStep("notice");
        }
      });
    } else {
      errEl.textContent = errMsg(r);
      errEl.hidden = false;
    }
  }).catch(function (e) {
    btn.disabled = false;
    btn.textContent = origText;
    errEl.textContent = String(e);
    errEl.hidden = false;
  });
}

function createTelegramChannel() {
  var btn = $("#tg-create-channel-btn");
  var errEl = $("#tg-create-err");
  btn.disabled = true;
  var origText = btn.textContent;
  btn.innerHTML = "<span class='spinner'></span> <span>" + I18N.t("ui_loading") + "</span>";
  errEl.hidden = true;

  helper("telegram-init-storage", {}).then(function (r) {
    btn.disabled = false;
    btn.textContent = origText;
    if (r && r.ok) {
      checkTelegramStatus().then(function () {
        showTgStep("active");
        loadDests();
      });
    } else {
      errEl.textContent = errMsg(r);
      errEl.hidden = false;
    }
  }).catch(function (e) {
    btn.disabled = false;
    btn.textContent = origText;
    errEl.textContent = String(e);
    errEl.hidden = false;
  });
}

function logoutTelegram() {
  modalConfirm(I18N.t("tg_confirm_logout")).then(function (ok) {
    if (!ok) return;
    helper("telegram-logout").then(function () {
      TG_STATE = null;
      updateTelegramUI();
      checkTelegramStatus();
      loadDests();
      $("#tg-modal").hidden = true;
    });
  });
}



// --- Google Drive companion (opt-in, on-demand) -------------------------
function showCompanionHma() {
  var box = $("#companion-hma"); if (!box) return;
  var pkg = $("#companion-hma-pkg");
  if (pkg) pkg.textContent = I18N.t("companion_hma_pkg", { pkg: COMPANION_PKG });
  box.hidden = false;
  if (box.scrollIntoView) box.scrollIntoView({ block: "center" });
}
// SUSFS reminder: shown on the Backups tab when local backups exist, nudging the
// user to hide the backup folder with SUSFS (its presence can reveal root, just like
// the companion app). SUSFS does the hiding; this only points there. Session dismiss.
function showSusfsNotice() {
  var box = $("#susfs-notice"); if (!box || SUSFS_DISMISSED) return;
  var p = $("#susfs-notice-path");
  if (p) p.textContent = I18N.t("susfs_notice_path", { path: "/sdcard/VDBackup" });
  box.hidden = false;
}
function openHmaList() {
  var cmd = "monkey -p " + shq(HMA_OSS_PKG) + " -c android.intent.category.LAUNCHER 1";
  execCommand(cmd).then(function (r) {
    if (!r || r.errno !== 0) modalAlert(I18N.t("companion_hma_open_fail"));
  }).catch(function () { modalAlert(I18N.t("companion_hma_open_fail")); });
}
function launchConsent() {
  var res = "/data/data/" + COMPANION_PKG + "/files/consent." + Date.now();
  return execCommand("env -u LD_LIBRARY_PATH -u LD_PRELOAD /system/bin/am start -n " + COMPANION_PKG + "/.ConsentActivity -e result " + shq(res));
}
function driveTest(id) {
  return helper("dest-test", { id: id }).then(function (r) {
    if (r && r.ok) { modalAlert(I18N.t("msg_dest_drive_ready")); return true; }
    var code = r && r.code;
    if (code === "ERR_COMPANION") return setupGdrive(id);
    if (DRIVE_CONSENT_CODES.indexOf(code) >= 0) {
      return modalConfirm(I18N.t("msg_dest_consent_prompt")).then(function (ok) {
        if (!ok) return false;
        return launchConsent().then(function (x) {
          modalAlert(I18N.t((x && x.errno === 0) ? "msg_dest_consent_launched" : "msg_dest_consent_failed"));
          return false;
        });
      });
    }
    modalAlert(id + ": " + errMsg(r));
    return false;
  });
}
function setupGdrive(id) {
  return helper("companion-status").then(function (s) {
    if (s && s.installed) return driveTest(id);
    modalAlert(I18N.t("msg_dest_companion_installing"));
    return helper("companion-install").then(function (r) {
      if (r && r.code === "ERR_COMPANION") { modalAlert(I18N.t("msg_dest_companion_unavailable")); return false; }
      if (r && r.ok && r.hma) showCompanionHma();
      return driveTest(id);
    });
  });
}

// --- operations (detached; survive WebUI close) -------------------------
// ask which items to include before backing up
function openBackupModal(pkg, label) {
  return new Promise(function (resolve) {
    var m = $("#backup-modal"), pass = $("#backup-pass");
    var enc = !!(CFG.encrypt_data || CFG.encrypt_apk);   // encryption needs a passphrase
    $("#backup-title").textContent = label || pkg;
    pass.value = ""; pass.hidden = !enc;
    fillDestOptions($("#backup-dest"), CFG.default_dest);   // per-backup destination, defaults to the default
    // pre-fill the item ticks: a per-app override (set in Settings) is the default here;
    // a single backup stays editable. Reset to full, then apply the app's override if any.
    var _ov = (CFG.app_items || {})[pkg];
    ["apk", "data", "data_de", "obb", "external", "media"].forEach(function (k) {
      var e = $("#bi-" + k); if (e) e.checked = _ov ? (_ov.indexOf(k) >= 0) : true;
    });
    fillPresetSelect();   // preset picker (pre-fills the item ticks); hidden when no presets exist
    m.hidden = false;
    function done(res) {
      m.hidden = true; pass.value = ""; $("#backup-ok").onclick = null; $("#backup-cancel").onclick = null;
      resolve(res);
    }
    $("#backup-ok").onclick = function () {
      var items = ["apk", "data", "data_de", "obb", "external", "media"].filter(function (k) {
        var e = $("#bi-" + k); return e && e.checked;
      });
      if (!items.length) return done(null);          // nothing ticked = nothing to do
      if (enc && !pass.value) { pass.focus(); return; }   // encryption on, require a passphrase
      var destSel = $("#backup-dest");
      done({ items: items, password: enc ? pass.value : null, dest: destSel ? destSel.value : null,
             verify: $("#bi-verify").checked, dry_run: $("#bi-dryrun").checked });
    };
    $("#backup-cancel").onclick = function () { done(null); };
  });
}
function backupArgs(pkg, res, manual) {
  var args = {
    package: pkg, user: activeUser,
    mode: CFG.default_mode || "full", dest: res.dest || CFG.default_dest || "local",
    items: res.items, ssaid: !!CFG.ssaid, verify: res.verify, dry_run: res.dry_run
  };
  if (manual) args.manual = true;   // single interactive backup: keep the user's exact ticks (skip per-app override)
  if (res.password) args.password = res.password;
  return args;
}
function startBackup(pkg, label) {
  openBackupModal(pkg, label).then(function (res) {
    if (!res) return;
    var args = backupArgs(pkg, res, true);
    var run = function () { helper("backup", args).then(function (r) { if (r && r.opid) trackOp(r.opid, { retry: run }); }); };
    run();
  });
}
// batch: one modal (items/verify/pass apply to all), then ONE detached op backs up the
// whole list server-side, so closing the WebUI or the root manager never stops it (issue
// #5: the old per-app JS chain died with the webview and left bulk backups half-done).
function startBatchBackup() {
  var pkgs = Object.keys(selected);
  if (!pkgs.length) return;
  openBackupModal(I18N.t("ui_selected_n", { n: pkgs.length }), "").then(function (res) {
    if (!res) return;
    setSelectMode(false);
    runBatchBackup(pkgs, res);
  });
}
// ONE detached op backs up the whole list server-side (survives WebUI / manager close).
function runBatchBackup(pkgs, res) {
  var args = backupArgs(pkgs[0], res);   // shared settings (items/mode/dest/pass/verify/user)
  delete args.package; args.packages = pkgs;
  var run = function () { helper("backup-batch", args).then(function (r) { if (r && r.opid) trackOp(r.opid, { batch: true, retry: run }); }); };
  run();
}
function phaseLabel(ph) {
  if (!ph) return "";
  var key = "phase_" + String(ph).replace(/-/g, "_");
  var tr = I18N.t(key);
  return tr === key ? ph : tr;   // fall back to the raw phase if untranslated
}
// secondary progress line: current item + "N of M", and transfer rate + ETA. Every
// field is optional (terminal writes omit them); a missing/empty/0 piece is dropped,
// so the line never shows "0 of 0", "undefined" or a dangling dash.
function updateProgSub(sub, p) {
  var pieces = [];
  var cur = (p.cur != null) ? String(p.cur) : "";
  var n = p.n | 0, of = p.of | 0;
  var item = (n > 0 && of > 0) ? I18N.t("ui_prog_of", { n: n, of: of }) : "";
  if (cur) item = cur + (item ? " - " + item : "");
  if (item) pieces.push(item);
  var xfer = [];
  if (p.rate) xfer.push(String(p.rate));
  if (p.eta) xfer.push(I18N.t("ui_prog_eta", { eta: String(p.eta) }));
  if (xfer.length) pieces.push(xfer.join(" - "));
  sub.textContent = pieces.join(" - ");
  sub.hidden = !pieces.length;
}
// lite edition: the cloud binaries (rclone + restic) are not bundled. On the first
// cloud/snapshot action the engine returns ERR_CLOUD_FETCHABLE; ask the user, download
// the per-ABI addon once (verified by sha256 in the engine), then retry the action.
function fetchCloudThenRetry(retryFn) {
  helper("cloud-status").then(function (s) {
    var mb = (s && s.size) ? Math.round(s.size / 1048576) : 0;
    modalConfirm(I18N.t("cloud_fetch_prompt", { mb: mb }), I18N.t("cloud_fetch_title")).then(function (yes) {
      if (!yes) return;
      helper("cloud-fetch").then(function (r) {
        if (r && r.opid) trackOp(r.opid, { onDone: function (p) {
          if (p && p.ok) { if (retryFn) retryFn(); }
          else modalAlert(errMsg(p));
        } });
        else modalAlert(errMsg(r));
      });
    });
  });
}
function trackOp(opid, ctx) {
  var box = $("#ops"); box.hidden = false;
  box.innerHTML = "";
  var label = el("div", null, I18N.t("op_running"));
  var bar = el("div", "bar"); var fill = el("i"); bar.appendChild(fill);
  var sub = el("div", "op-sub"); sub.hidden = true;
  box.appendChild(label); box.appendChild(bar); box.appendChild(sub);
  var missing = 0, stuck = 0;
  var timer = setInterval(function () {
    helper("progress", opid, true).then(function (p) {
      if (!p || (!p.phase && !p.done)) {   // op vanished (finished + cleaned, or never started)
        if (++missing >= 3) { clearInterval(timer); box.hidden = true; }
        return;
      }
      missing = 0;
      fill.style.width = (p.percent || 0) + "%";
      label.textContent = I18N.t("op_phase", { phase: phaseLabel(p.phase) }) + " " + (p.percent || 0) + "%";
      updateProgSub(sub, p);
      if (p.done) {
        clearInterval(timer);
        if (!p.ok && ctx && ctx.entry && p.code === "ERR_IMPORT_ENCRYPTED") {
          box.hidden = true;
          startImport(ctx.from, ctx.entry, true);
          return;
        }
        if (!p.ok && ctx && ctx.specialRef && p.code === "ERR_CRYPTO_PASS") {
          box.hidden = true;
          openOpModal({ needPassword: true, titleKey: "restore", confirmKey: "restore",
                        msg: I18N.t("special_pass_msg") }).then(function (res) {
            if (res == null) return;
            var a = { ref: ctx.specialRef, confirm: true, categories: ctx.specialCats, password: res.password };
            if (ctx.specialSysset) a.system_settings = true;
            helper("special-restore", a).then(function (r) {
              if (r && r.opid) trackOp(r.opid, ctx);
            });
          });
          return;
        }
        if (!p.ok && ctx && ctx.pathRef && p.code === "ERR_CRYPTO_PASS") {
          box.hidden = true;   // encrypted folder backup: ask for the passphrase and retry
          openOpModal({ needPassword: true, titleKey: "ui_pathbk_restore_title", confirmKey: "restore",
                        msg: I18N.t("ui_pathbk_restore_confirm", { path: ctx.pathSource }) }).then(function (res) {
            if (res == null) return;
            helper("path-restore", { ref: ctx.pathRef, confirm: true, password: res.password }).then(function (r) {
              if (r && r.opid) trackOp(r.opid, ctx);
            });
          });
          return;
        }
        if (!p.ok && ctx && ctx.restoreRef && p.code === "ERR_CRYPTO_PASS") {
          box.hidden = true;   // encrypted backup: ask for the passphrase and retry
          openOpModal({ needPassword: true, titleKey: "restore", confirmKey: "restore",
                        msg: I18N.t("msg_restore_passphrase", { name: ctx.restorePkg }) }).then(function (res) {
            if (res == null) return;
            helper("restore", { ref: ctx.restoreRef, ssaid: ctx.ssaid, items: ctx.items, test: ctx.test, spoof_installer: ctx.spoof_installer, deep_spoof: ctx.deep_spoof, password: res.password }).then(function (r) {
              if (r && r.opid) trackOp(r.opid, ctx);
            });
          });
          return;
        }
        if (!p.ok && ctx && ctx.retry && p.code === "ERR_CLOUD_FETCHABLE") {
          box.hidden = true;        // lite edition: offer the one-time rclone+restic download, then retry
          fetchCloudThenRetry(ctx.retry);
          return;
        }
        if (ctx && ctx.batch && typeof p.of === "number" && p.of > 0) {
          label.textContent = I18N.t("msg_batch_done", { n: p.n || 0, of: p.of });   // e.g. "148 of 150 done"
        } else {
          label.textContent = p.ok ? I18N.t("op_done") : errMsg(p);
        }
        if (ctx && ctx.onDone) ctx.onDone(p);
        setTimeout(function () { box.hidden = true; }, 4000);
        return;
      }
      // a live op leaves "starting" within a second; if it is still stuck there
      // with no progress, its worker died at launch - drop the stale card.
      if (p.phase === "starting" && (p.percent || 0) === 0) {
        if (++stuck >= 15) { clearInterval(timer); box.hidden = true; }
      } else stuck = 0;
    }).catch(function () { if (++missing >= 3) { clearInterval(timer); box.hidden = true; } });
  }, 1000);
}
function reattachOps() {
  helper("list-ops").then(function (r) {
    if (!r || !r.ops) return;
    r.ops.forEach(function (o) {
      if (!o.opid || o.opid === "scheduler.loop") return;      // skip the scheduler heartbeat
      if (o.progress && o.progress.done) return;               // skip finished ops
      trackOp(o.opid);
    });
  });
}

// --- scheduled backups --------------------------------------------------
// selection persists in a Set-like map keyed by package, so filtering the picker
// never drops an earlier pick (a hidden/filtered-out row stays selected).
var jobSel = {}, _jobIcons = [];
function setJobSel(pkg, on) { if (on) jobSel[pkg] = true; else delete jobSel[pkg]; updateJobSelCount(); }
function updateJobSelCount() {
  $("#job-app-count").textContent = I18N.t("ui_selected_n", { n: Object.keys(jobSel).length });
}
// scrollable, searchable, tick-to-select app picker (same lazy icon loader as the
// Apps tab: iconObserver + loadIcon + the localStorage icon cache).
function buildJobPicker() {
  var ul = $("#job-applist"); if (!ul) return;
  if (iconObserver) _jobIcons.forEach(function (ic) { iconObserver.unobserve(ic); });
  _jobIcons = []; ul.innerHTML = "";
  visibleApps("", true).forEach(function (a) {
    var li = el("li", "row tappable");
    var ic = el("div", "app-ic", (a.label || a.package).charAt(0).toUpperCase());
    ic.dataset.pkg = a.package;
    ic.dataset.vc = (a.versionCode != null) ? String(a.versionCode) : "0";
    var grow = el("div", "grow");
    grow.appendChild(el("div", "name", a.label || a.package));
    grow.appendChild(el("div", "pkg", a.package));
    var cb = el("input", "selbox"); cb.type = "checkbox"; cb.checked = !!jobSel[a.package];
    cb.onclick = function (e) { e.stopPropagation(); setJobSel(a.package, cb.checked); li.classList.toggle("sel", cb.checked); };
    li.appendChild(cb); li.appendChild(ic); li.appendChild(grow);
    if (jobSel[a.package]) li.classList.add("sel");
    li.dataset.hay = ((a.label || "") + " " + a.package).toLowerCase();
    li.onclick = function () { cb.checked = !cb.checked; setJobSel(a.package, cb.checked); li.classList.toggle("sel", cb.checked); };
    ul.appendChild(li); _jobIcons.push(ic);
    if (iconObserver) iconObserver.observe(ic); else loadIcon(ic);
  });
  filterJobPicker($("#job-app-search") ? $("#job-app-search").value : "");
  updateJobSelCount();
}
function filterJobPicker(q) {
  q = (q || "").toLowerCase();
  var rows = $("#job-applist").children, shown = 0, i;
  for (i = 0; i < rows.length; i++) {
    var hit = !q || rows[i].dataset.hay.indexOf(q) >= 0;
    rows[i].hidden = !hit; if (hit) shown++;
  }
  $("#job-app-nomatch").hidden = shown > 0;
}
function loadSchedule() {
  jobSel = {};
  var sb = $("#job-app-search"); if (sb) sb.value = "";
  buildJobPicker();
  var dest = $("#job-dest");
  if (dest) {
    dest.innerHTML = "";
    var o0 = document.createElement("option"); o0.value = "local"; o0.textContent = "local"; dest.appendChild(o0);
    DESTS.forEach(function (d) { if (d.id === "local") return; var o = document.createElement("option"); o.value = d.id; o.textContent = d.id; dest.appendChild(o); });
  }
  buildDayToggles();
  helper("schedule-list").then(function (r) { renderJobs(r && r.jobs ? r.jobs : []); });
}
// weekday gate: 7 toggle buttons, 0=Sunday..6=Saturday (matches the engine). Built once;
// the data-i18n label keeps them localized across a language change.
var DAY_KEYS = ["ui_day_sun", "ui_day_mon", "ui_day_tue", "ui_day_wed", "ui_day_thu", "ui_day_fri", "ui_day_sat"];
function buildDayToggles() {
  var box = $("#job-days"); if (!box || box._built) return; box._built = true;
  DAY_KEYS.forEach(function (key, d) {
    var b = el("button", "daytoggle", I18N.t(key));
    b.type = "button"; b.dataset.day = d; b.setAttribute("data-i18n", key);
    b.onclick = function () { b.classList.toggle("on"); };
    box.appendChild(b);
  });
}
function selectedDays() {
  var box = $("#job-days"); if (!box) return [];
  return Array.prototype.map.call(box.querySelectorAll(".daytoggle.on"), function (b) { return b.dataset.day | 0; });
}
function daysLabel(days) {
  return days.slice().sort(function (a, b) { return a - b; }).map(function (d) { return I18N.t(DAY_KEYS[d]); }).join(",");
}
function jobTargetLabel(j) {
  if (j.all) return I18N.t("job_all_apps");
  if (j.packages && j.packages.length) return I18N.t("job_n_apps", { n: j.packages.length });
  return j.package || "";
}
function renderJobs(jobs) {
  var ul = $("#joblist"); ul.innerHTML = "";
  $("#jobs-empty").hidden = !!(jobs && jobs.length);
  (jobs || []).forEach(function (j) {
    var li = el("li", "row"), grow = el("div", "grow");
    var act = I18N.t((j.action === "restore") ? "opt_action_restore" : "opt_action_backup");
    grow.appendChild(el("div", "name", act + ": " + jobTargetLabel(j)));
    var when = j.cron + (j.at ? " " + j.at : "");
    var last = j.last_run ? shortDate(new Date(j.last_run * 1000).toISOString()) : I18N.t("job_never");
    var parts = [when];
    if ((j.action || "backup") === "backup") { parts.push(j.mode); parts.push(I18N.t("job_keep_n", { n: j.keep })); }
    parts.push(I18N.t("job_last", { when: last }));
    grow.appendChild(el("div", "sub", parts.join(" - ")));
    var badges = [];
    if (j.require_wifi) badges.push(I18N.t("ui_sched_badge_wifi"));
    if (j.require_charging) badges.push(I18N.t("ui_sched_badge_charging"));
    if (j.min_battery) badges.push(I18N.t("ui_sched_badge_battery", { n: j.min_battery }));
    if (j.days && j.days.length && j.days.length < 7) badges.push(daysLabel(j.days));
    if (badges.length) {
      var gbox = el("div", "gates");
      badges.forEach(function (b) { gbox.appendChild(el("span", "badge", b)); });
      grow.appendChild(gbox);
    }
    var del = el("button", "btn danger small", I18N.t("delete"));
    del.onclick = function () { delJob(j.id); };
    li.appendChild(grow); li.appendChild(del); ul.appendChild(li);
  });
}
function hashStr(s) { var h = 0, i; for (i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; } return (h >>> 0).toString(16); }
// show/hide the app picker (hidden when "all apps") and backup-only fields (hidden for restore)
function updateJobForm() {
  var all = $("#job-all").checked, restore = $("#job-action").value === "restore";
  $("#job-app-field").style.display = all ? "none" : "";
  $("#job-backup-only").style.display = restore ? "none" : "";
  $("#job-restore-warn").hidden = !restore;
}
function saveJob() {
  var action = $("#job-action").value;
  var all = $("#job-all").checked;
  var pkgs = all ? [] : Object.keys(jobSel);
  if (!all && !pkgs.length) { $("#job-status").textContent = I18N.t("job_need_app"); return; }
  var job = { action: action, user: activeUser, cron: $("#job-cron").value, at: $("#job-at").value || null };
  if (all) job.all = true;
  else if (pkgs.length === 1) job.package = pkgs[0];
  else job.packages = pkgs;
  if (action === "backup") {
    job.mode = $("#job-mode").value; job.dest = $("#job-dest").value;
    job.keep = parseInt($("#job-keep").value, 10) || 5;
    job.items = ["apk", "data", "data_de", "obb", "external", "media"];
  }
  // gates (optional): only sent when meaningfully set; absent/false = no constraint.
  if ($("#job-wifi").checked) job.require_wifi = true;
  if ($("#job-charging").checked) job.require_charging = true;
  var minbat = parseInt($("#job-minbat").value, 10) || 0;
  if (minbat > 0) job.min_battery = minbat;
  var days = selectedDays();
  if (days.length) job.days = days;
  var tgt = all ? "all" : (pkgs.length === 1 ? pkgs[0] : ("set-" + hashStr(pkgs.slice().sort().join(","))));
  job.id = "job-" + action + "-" + tgt;
  helper("schedule-set", job).then(function (r) {
    $("#job-status").textContent = (r && r.ok) ? I18N.t("saved") : errMsg(r);
    loadSchedule();
  });
}
function delJob(id) {
  modalConfirm(I18N.t("confirm_delete", { name: id })).then(function (ok) {
    if (!ok) return;
    helper("schedule-delete", { id: id }).then(loadSchedule);
  });
}

// --- mount an installed app as a system app (systemless sub-module) -------
function openSysmount(pkg, label) {
  var m = $("#sysmount-modal");
  $("#sysmount-sub").textContent = label || pkg;
  $("#sysmount-app").checked = true;
  var hint = $("#sysmount-hint"); hint.textContent = "";
  m.hidden = false;
  helper("sysmount-status").then(function (s) {
    hint.textContent = (s && s.live_capable) ? I18N.t("ui_sysmount_live")
      : (s && s.nomount) ? I18N.t("ui_sysmount_reboot") : I18N.t("ui_sysmount_nonomount");
  });
  $("#sysmount-cancel").onclick = function () { m.hidden = true; };
  $("#sysmount-ok").onclick = function () {
    var priv = $("#sysmount-priv").checked;
    m.hidden = true;
    helper("sysmount-add", { package: pkg, priv: priv }).then(function (r) {
      if (r && r.ok) modalAlert(I18N.t(r.live ? "msg_sysmount_live" : "msg_sysmount_reboot", { pkg: pkg }));
      else modalAlert(errMsg(r));
    });
  };
}

// --- bundled-binary provenance (supply-chain audit) ---------------------
function openProvenance() {
  var m = $("#prov-modal"), body = $("#prov-body");
  body.textContent = I18N.t("apps_loading");
  m.hidden = false;
  $("#prov-close").onclick = function () { m.hidden = true; };
  helper("provenance").then(function (r) {
    if (r && r.ok === false) { body.textContent = errMsg(r); return; }
    try { body.textContent = JSON.stringify(r, null, 2); }
    catch (e) { body.textContent = (r && r.raw) || String(r); }
  });
}

// --- activity log (audit trail; its own full-screen panel) --------------
// Opened by navigating to the #log panel (from the Schedule tab's button). The
// list fills the screen and scrolls with the page; log-read stays fast now.
function openLog() {
  var ul = $("#log-list"); if (!ul) return;
  // Show a centered spinner synchronously so the panel appears instantly on tap;
  // the (fast) log-read fetch runs after and replaces this with the entries.
  ul.innerHTML = "";
  var load = el("li", "log-loading");
  load.appendChild(el("span", "spinner"));
  load.appendChild(el("span", null, I18N.t("ui_loading")));
  ul.appendChild(load);
  $("#log-empty").hidden = true;
  var res = $("#log-export-result"); if (res) { res.hidden = true; res.innerHTML = ""; }
  helper("log-read", { limit: 200 }).then(function (r) {
    var entries = (r && r.entries) ? r.entries : [];
    ul.innerHTML = "";
    $("#log-empty").hidden = entries.length > 0;
    entries.forEach(function (e) {
      var li = el("li", "row");
      li.appendChild(el("div", "op", logLabel(e)));
      li.appendChild(el("div", "when", shortDate(e.ts)));
      var detail = e.detail || e.ref || e.id || e.package || "";
      if (detail) li.appendChild(el("div", "ref", detail));
      ul.appendChild(li);
    });
  });
}
// Export the log to a file under shared storage and show its path, tap-to-copy,
// so the user can find and attach it to a bug report. Maps ERR_LOG_EXPORT via errMsg.
function exportLogs() {
  var btn = $("#log-export"); if (btn) btn.disabled = true;
  var done = function () { if (btn) btn.disabled = false; };
  helper("log-export", { user: activeUser }).then(function (r) {
    done();
    if (!r || !r.ok || !r.path) { modalAlert(errMsg(r)); return; }
    var res = $("#log-export-result"); if (!res) { copyText(r.path); return; }
    res.innerHTML = "";
    res.appendChild(copyRow(I18N.t("ui_logs_exported"), r.path));
    res.hidden = false;
    if (res.scrollIntoView) res.scrollIntoView({ block: "nearest" });
  }).catch(function () { done(); modalAlert(errMsg(null)); });
}
function logLabel(e) {
  var key = "log_op_" + String(e.op || "").replace(/-/g, "_");
  var tr = I18N.t(key);
  return tr === key ? (e.op || "") : tr;
}

// --- swipe left/right between tabs --------------------------------------
function setupSwipe() {
  var x0 = null, y0 = null, t0 = 0, moved = false;
  function order() { return Array.prototype.map.call(document.querySelectorAll(".tab"), function (t) { return t.dataset.tab; }); }
  document.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) { x0 = null; return; }
    // a horizontally scrollable strip (the tab bar, the accent swatches) handles its own
    // sideways drag; starting a gesture there must not also flip tabs.
    if (e.target.closest && e.target.closest(".tabs, .swatches, [data-noswipe]")) { x0 = null; return; }
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); moved = false;
  }, { passive: true });
  document.addEventListener("touchmove", function () { moved = true; }, { passive: true });
  document.addEventListener("touchend", function (e) {
    if (x0 === null) return;
    var pw = $("#pw-modal"); if (pw && !pw.hidden) { x0 = null; return; }
    var c = e.changedTouches[0], dx = c.clientX - x0, dy = c.clientY - y0, dt = Date.now() - t0;
    x0 = null;
    if (!moved || dt > 700) return;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8) return;   // mostly-horizontal only
    var tabs = order(), cur = $(".panel.active"); if (!cur) return;
    var i = tabs.indexOf(cur.id); if (i < 0) return;
    var ni = dx < 0 ? i + 1 : i - 1;
    if (ni >= 0 && ni < tabs.length) navTab(tabs[ni]);
  }, { passive: true });
}

// --- settings -----------------------------------------------------------
var CFG = {};
// language option labels: each language shown in the current UI language AND in its
// own native name (e.g. "Ingles / English"); the chosen UI language shows once.
// Intl.DisplayNames localizes both when the webview supports it; a static endonym
// map is the fallback (then only the native name is shown). The app uses the Android
// code "in" for Indonesian, which Intl expects as "id".
var LANG_ENDONYM = {
  ar: "العربية", cs: "Čeština", de: "Deutsch", en: "English", es: "Español",
  fa: "فارسی", fr: "Français", hi: "हिन्दी", in: "Bahasa Indonesia", it: "Italiano",
  ja: "日本語", ko: "한국어", nl: "Nederlands", pl: "Polski", pt: "Português",
  ru: "Русский", sv: "Svenska", th: "ไทย", tr: "Türkçe", vi: "Tiếng Việt", zh: "中文"
};
function currentUiLang() {
  var c = CFG.language;
  if (c && c !== "auto" && I18N.AVAILABLE.indexOf(c) >= 0) return c;
  var l = (navigator.language || "en").toLowerCase().slice(0, 2);
  if (l === "id") l = "in";
  return I18N.AVAILABLE.indexOf(l) >= 0 ? l : "en";
}
function capFirst(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function langDisplayName(code, inLocale) {
  try {
    if (typeof Intl !== "undefined" && Intl.DisplayNames) {
      var dnCode = (code === "in") ? "id" : code;
      var dnLocale = (inLocale === "in") ? "id" : inLocale;
      var name = new Intl.DisplayNames([dnLocale], { type: "language" }).of(dnCode);
      if (name && name !== dnCode) return capFirst(name);
    }
  } catch (e) {}
  return null;
}
function langLabel(code, uiLang) {
  var native = langDisplayName(code, code) || LANG_ENDONYM[code] || code;
  var localized = langDisplayName(code, uiLang);
  if (localized == null) return native;   // Intl.DisplayNames unavailable: native only
  return localized === native ? native : localized + " / " + native;
}
function buildLangOptions() {
  var sel = $("#set-lang"); if (!sel) return;
  var prev = sel.value || CFG.language || "auto", uiLang = currentUiLang();
  sel.innerHTML = "";
  ["auto"].concat(I18N.AVAILABLE).forEach(function (c) {
    var o = document.createElement("option"); o.value = c;
    o.textContent = (c === "auto") ? "auto" : langLabel(c, uiLang);
    sel.appendChild(o);
  });
  sel.value = prev;
}
function loadSettings() {
  var sel = $("#set-lang");
  buildLangOptions();
  if ($("#set-comp"))     $("#set-comp").value = CFG.compression || "zstd:10";
  if ($("#set-enc-data")) $("#set-enc-data").checked = !!CFG.encrypt_data;
  if ($("#set-enc-apk"))  $("#set-enc-apk").checked = !!CFG.encrypt_apk;
  if ($("#set-ssaid"))    $("#set-ssaid").checked = !!CFG.ssaid;
  if ($("#set-mode"))     $("#set-mode").value = CFG.default_mode || "full";
  if ($("#set-netpolicy")) $("#set-netpolicy").value = CFG.network_policy || "any";
  if ($("#set-auto"))     $("#set-auto").checked = !!CFG.auto_backup;
  if ($("#set-auto-keep")) $("#set-auto-keep").value = CFG.auto_backup_keep || 5;
  if ($("#set-spoof"))    $("#set-spoof").checked = (CFG.spoof_installer !== false);
  var bs = $("#block-app-search"); if (bs) bs.value = "";
  var as = $("#ai-app-search"); if (as) as.value = "";
  buildBlockPicker();
  buildAppItemsPicker();
  buildPresetsList();
  fillDestSelect();
  if (sel)                sel.value = CFG.language || "auto";
  if ($("#set-theme"))    $("#set-theme").value = getTheme();
  var ds = $("#set-density");
  if (ds) { var pct = Math.round(getDensity() * 100); ds.value = pct; updateDensityLabel(pct); }
  buildAccentSwatches();
  syncSegments();
}
function saveSettings() {
  CFG.compression = $("#set-comp").value;
  CFG.encrypt_data = $("#set-enc-data").checked;
  CFG.encrypt_apk = $("#set-enc-apk").checked;
  CFG.ssaid = $("#set-ssaid").checked;
  CFG.default_mode = $("#set-mode").value;
  CFG.default_dest = $("#set-dest").value;
  if ($("#set-netpolicy")) CFG.network_policy = $("#set-netpolicy").value;
  if ($("#set-auto")) CFG.auto_backup = $("#set-auto").checked;
  if ($("#set-auto-keep")) CFG.auto_backup_keep = parseInt($("#set-auto-keep").value, 10) || 5;
  if ($("#set-spoof")) CFG.spoof_installer = $("#set-spoof").checked;
  CFG.language = $("#set-lang").value;
  helper("config-set", CFG).then(function (r) {
    $("#set-status").textContent = (r && r.ok !== false) ? I18N.t("saved") : errMsg(r);
    I18N.init(CFG.language || "auto").then(function () { I18N.apply(); buildLangOptions(); });
  });
}

// --- settings backup (export / import / wipe credentials) ----------------
// The bundle (config + jobs + dests + creds + keys) carries remote passwords, so a
// passphrase is always required; the detached worker writes it under VDBackup/.export.
function exportConfig() {
  openOpModal({ needPassword: true, allowSsaid: false, titleKey: "settings_config_export",
                msg: I18N.t("settings_config_pass_msg"), confirmKey: "settings_config_export" }).then(function (res) {
    if (res == null) return;
    $("#cfg-config-status").textContent = I18N.t("settings_config_exporting");
    helper("config-export", { password: res.password }).then(function (r) {
      if (r && r.opid) trackOp(r.opid, { config: true, onDone: function (p) {
        $("#cfg-config-status").textContent = p.ok
          ? I18N.t("settings_config_exported", { path: p.path || "" }) : errMsg(p);
      } });
      else $("#cfg-config-status").textContent = errMsg(r);
    });
  });
}
function importConfig() {
  helper("config-exports").then(function (r) {
    var list = (r && r.exports) ? r.exports : [];
    var m = $("#cfg-import-modal"), ul = $("#cfg-import-list");
    ul.innerHTML = "";
    $("#cfg-import-empty").hidden = list.length > 0;
    list.forEach(function (ex) {
      var li = el("li", "row");
      var grow = el("div", "grow");
      grow.appendChild(el("div", "name", ex.name || ""));
      grow.appendChild(el("div", "pkg", fmtSize(ex.size)));
      var btn = el("button", "btn go small", I18N.t("settings_config_import"));
      btn.onclick = function () { m.hidden = true; runConfigImport(ex); };
      li.appendChild(grow); li.appendChild(btn);
      ul.appendChild(li);
    });
    m.hidden = false;
    $("#cfg-import-close").onclick = function () { m.hidden = true; };
  });
}
function runConfigImport(ex) {
  openOpModal({ needPassword: true, allowSsaid: false, titleKey: "settings_config_import",
                msg: I18N.t("settings_config_import_msg", { name: ex.name }),
                confirmKey: "settings_config_import" }).then(function (res) {
    if (res == null) return;
    $("#cfg-config-status").textContent = I18N.t("settings_config_importing");
    helper("config-import", { ref: ex.ref, password: res.password }).then(function (r) {
      if (r && r.opid) trackOp(r.opid, { config: true, onDone: function (p) {
        $("#cfg-config-status").textContent = p.ok
          ? I18N.t("settings_config_imported") : errMsg(p);
        if (p.ok) helper("config-get").then(function (c) {
          CFG = c || {}; I18N.apply(); loadSettings(); loadDests();
        });
      } });
      else $("#cfg-config-status").textContent = errMsg(r);
    });
  });
}
function wipeCredentials() {
  modalConfirm(I18N.t("settings_wipe_credentials_confirm"), I18N.t("settings_wipe_credentials")).then(function (yes) {
    if (!yes) return;
    helper("wipe-credentials").then(function (r) {
      $("#cfg-config-status").textContent = (r && r.ok !== false) ? I18N.t("settings_wipe_credentials_done") : errMsg(r);
    });
  });
}

// --- blocklist (apps excluded from auto/scheduled backups) ---------------
// Same scrollable, searchable, tick-to-select picker as the Schedule tab (shared
// lazy icon loader: iconObserver + loadIcon + the localStorage icon cache). The
// selection store is CFG.blocklist itself (ticked = excluded), persisted on toggle.
var _blockIcons = [];
function isBlocked(pkg) { return (CFG.blocklist || []).indexOf(pkg) >= 0; }
function updateBlockCount() {
  var c = $("#block-app-count");
  if (c) c.textContent = I18N.t("ui_blocklist_count", { n: (CFG.blocklist || []).length });
}
function setBlock(pkg, on) {
  CFG.blocklist = CFG.blocklist || [];
  var i = CFG.blocklist.indexOf(pkg);
  if (on && i < 0) CFG.blocklist.push(pkg);
  else if (!on && i >= 0) CFG.blocklist.splice(i, 1);
  persistBlocklist(); updateBlockCount();
}
function persistBlocklist() { helper("config-set", CFG).then(function () {}); }
function buildBlockPicker() {
  var ul = $("#block-applist"); if (!ul) return;
  if (iconObserver) _blockIcons.forEach(function (ic) { iconObserver.unobserve(ic); });
  _blockIcons = []; ul.innerHTML = "";
  visibleApps("", true).forEach(function (a) {
    var li = el("li", "row tappable");
    var ic = el("div", "app-ic", (a.label || a.package).charAt(0).toUpperCase());
    ic.dataset.pkg = a.package;
    ic.dataset.vc = (a.versionCode != null) ? String(a.versionCode) : "0";
    var grow = el("div", "grow");
    grow.appendChild(el("div", "name", a.label || a.package));
    grow.appendChild(el("div", "pkg", a.package));
    var cb = el("input", "selbox"); cb.type = "checkbox"; cb.checked = isBlocked(a.package);
    cb.onclick = function (e) { e.stopPropagation(); setBlock(a.package, cb.checked); li.classList.toggle("sel", cb.checked); };
    li.appendChild(cb); li.appendChild(ic); li.appendChild(grow);
    if (isBlocked(a.package)) li.classList.add("sel");
    li.dataset.hay = ((a.label || "") + " " + a.package).toLowerCase();
    li.onclick = function () { cb.checked = !cb.checked; setBlock(a.package, cb.checked); li.classList.toggle("sel", cb.checked); };
    ul.appendChild(li); _blockIcons.push(ic);
    if (iconObserver) iconObserver.observe(ic); else loadIcon(ic);
  });
  filterBlockPicker($("#block-app-search") ? $("#block-app-search").value : "");
  updateBlockCount();
}
function filterBlockPicker(q) {
  q = (q || "").toLowerCase();
  var ul = $("#block-applist"); if (!ul) return;
  var rows = ul.children, shown = 0, i;
  for (i = 0; i < rows.length; i++) {
    var hit = !q || rows[i].dataset.hay.indexOf(q) >= 0;
    rows[i].hidden = !hit; if (hit) shown++;
  }
  var nm = $("#block-app-nomatch"); if (nm) nm.hidden = shown > 0;
}

// --- per-app backup item sets (an app's items for bulk/auto/scheduled backups) -------
// Store is CFG.app_items (package -> item list). Tapping an app opens a small modal to
// pick its items; no override (or all items) = the app backs up everything. The worker
// applies the set on bulk, auto and scheduled runs; a single manual backup keeps the
// user's modal choice (which is pre-filled from the set). Same searchable app picker.
var _aiIcons = [];
var AI_ITEMS = ["apk", "data", "data_de", "obb", "external", "media"];
var _aiPkg = null;
function hasAppItems(pkg) { var ov = (CFG.app_items || {})[pkg]; return !!(ov && ov.length && ov.length < AI_ITEMS.length); }
function appItemsSummary(pkg) {
  var ov = (CFG.app_items || {})[pkg];
  if (!hasAppItems(pkg)) return I18N.t("appitems_default");
  return ov.map(function (k) { return I18N.t("item_" + k); }).join(" + ");
}
function updateAiCount() {
  var n = 0, m = CFG.app_items || {};
  Object.keys(m).forEach(function (p) { if (hasAppItems(p)) n++; });
  var c = $("#ai-app-count"); if (c) c.textContent = I18N.t("ui_app_items_count", { n: n });
}
function setAppItems(pkg, items) {
  CFG.app_items = CFG.app_items || {};
  if (!items || !items.length || items.length === AI_ITEMS.length) delete CFG.app_items[pkg];
  else CFG.app_items[pkg] = items;
  helper("config-set", CFG).then(function () {});
  updateAiCount();
}
function openAppItemsModal(pkg, label) {
  _aiPkg = pkg;
  if ($("#appitems-title")) $("#appitems-title").textContent = label || pkg;
  var ov = (CFG.app_items || {})[pkg];
  AI_ITEMS.forEach(function (k) {
    var e = $("#ai-" + k);
    if (e) e.checked = (ov && ov.length) ? (ov.indexOf(k) >= 0) : true;   // default: everything ticked
  });
  buildAiTags();
  var ti = $("#ai-tag-input"); if (ti) ti.value = "";
  $("#appitems-modal").hidden = false;
}
function closeAppItemsModal() { $("#appitems-modal").hidden = true; _aiPkg = null; }
function buildAppItemsPicker() {
  var ul = $("#ai-applist"); if (!ul) return;
  if (iconObserver) _aiIcons.forEach(function (ic) { iconObserver.unobserve(ic); });
  _aiIcons = []; ul.innerHTML = "";
  visibleApps("", true).forEach(function (a) {
    var li = el("li", "row tappable");
    var ic = el("div", "app-ic", (a.label || a.package).charAt(0).toUpperCase());
    ic.dataset.pkg = a.package;
    ic.dataset.vc = (a.versionCode != null) ? String(a.versionCode) : "0";
    var grow = el("div", "grow");
    grow.appendChild(el("div", "name", a.label || a.package));
    grow.appendChild(el("div", "pkg", a.package));
    grow.appendChild(el("div", "sub", appItemsSummary(a.package)));
    li.appendChild(ic); li.appendChild(grow);
    if (hasAppItems(a.package)) li.classList.add("sel");
    li.dataset.hay = ((a.label || "") + " " + a.package).toLowerCase();
    li.onclick = function () { openAppItemsModal(a.package, a.label || a.package); };
    ul.appendChild(li); _aiIcons.push(ic);
    if (iconObserver) iconObserver.observe(ic); else loadIcon(ic);
  });
  filterAppItemsPicker($("#ai-app-search") ? $("#ai-app-search").value : "");
  updateAiCount();
}
function filterAppItemsPicker(q) {
  q = (q || "").toLowerCase();
  var ul = $("#ai-applist"); if (!ul) return;
  var rows = ul.children, shown = 0, i;
  for (i = 0; i < rows.length; i++) {
    var hit = !q || rows[i].dataset.hay.indexOf(q) >= 0;
    rows[i].hidden = !hit; if (hit) shown++;
  }
  var nm = $("#ai-app-nomatch"); if (nm) nm.hidden = shown > 0;
}

// --- app tags (free labels to group apps; filter the list + back up a whole group) -----
// Store is CFG.app_tags (package -> [labels]). Pure client-side organization: the batch
// path reuses the normal per-app backup, so the worker needs no change.
function appTags(pkg) { return (CFG.app_tags || {})[pkg] || []; }
function allTags() {   // only tags carried by a currently-listed app, so uninstalled /
  var set = {};         // other-user packages never ghost into the filter dropdown
  APPS.forEach(function (a) { appTags(a.package).forEach(function (t) { set[t] = 1; }); });
  return Object.keys(set).sort(function (a, b) { return a.toLowerCase().localeCompare(b.toLowerCase()); });
}
function setAppTagList(pkg, tags) {
  CFG.app_tags = CFG.app_tags || {};
  if (!tags || !tags.length) delete CFG.app_tags[pkg]; else CFG.app_tags[pkg] = tags;
  helper("config-set", CFG).then(function () {});
}
function addAppTag(pkg, t) {
  t = (t || "").trim(); if (!t || !pkg) return;
  var cur = appTags(pkg).slice(); if (cur.indexOf(t) < 0) { cur.push(t); setAppTagList(pkg, cur); }
}
function removeAppTag(pkg, t) { setAppTagList(pkg, appTags(pkg).filter(function (x) { return x !== t; })); }
function tagChip(text, onRemove) {
  var c = el("span", "tag-chip"); c.appendChild(el("span", null, text));
  if (onRemove) {
    var x = el("button", null, "×"); x.type = "button"; x.setAttribute("aria-label", "remove");
    x.onclick = function (e) { e.stopPropagation(); onRemove(); };
    c.appendChild(x);
  }
  return c;
}
function buildAiTags() {
  var box = $("#ai-tags"); if (!box) return;
  box.innerHTML = ""; var pkg = _aiPkg; if (!pkg) return;
  var ts = appTags(pkg);
  if (!ts.length) { box.appendChild(el("span", "muted", I18N.t("ui_tag_none"))); return; }
  ts.forEach(function (t) {
    box.appendChild(tagChip(t, function () { removeAppTag(pkg, t); buildAiTags(); fillTagFilter(); renderApps($("#search").value); }));
  });
}
var tagFilter = "";
function fillTagFilter() {   // (re)build the dropdown; renderApps owns the button visibility
  var sel = $("#app-tag"); if (!sel) return;
  var ts = allTags();
  if (!ts.length) { sel.hidden = true; tagFilter = ""; return; }
  if (ts.indexOf(tagFilter) < 0) tagFilter = "";
  sel.innerHTML = "";
  var o0 = document.createElement("option"); o0.value = ""; o0.textContent = I18N.t("ui_tag_filter_all"); sel.appendChild(o0);
  ts.forEach(function (t) { var o = document.createElement("option"); o.value = t; o.textContent = t; sel.appendChild(o); });
  sel.value = tagFilter; sel.hidden = false;
}
// the apps a tag backup would act on: respects the user/system filter, ignores the search box
function tagFilterApps() { return tagFilter ? visibleApps("") : []; }
function startTagBackup() {
  var pkgs = tagFilterApps().map(function (a) { return a.package; });
  if (!pkgs.length) return;
  openBackupModal(I18N.t("ui_tag_backup_title", { tag: tagFilter, n: pkgs.length }), "").then(function (res) {
    if (!res) return;
    setSelectMode(false);
    runBatchBackup(pkgs, res);
  });
}

// --- backup presets (named item-sets; create in Settings, apply in the backup dialog) --
// Store is CFG.presets = [{id,name,items[]}]. No worker change: a preset just pre-fills the
// item checkboxes of the backup dialog, which already drives the per-op items.
function persistPresets() { helper("config-set", CFG).then(function () {}); }
function presetById(id) { return (CFG.presets || []).filter(function (p) { return p.id === id; })[0]; }
function buildPresetsList() {
  var ul = $("#presets-list"); if (!ul) return;
  var ps = CFG.presets || []; ul.innerHTML = "";
  var em = $("#presets-empty"); if (em) em.style.display = ps.length ? "none" : "";
  ps.forEach(function (p) {
    var li = el("li", "row");
    var grow = el("div", "grow");
    grow.appendChild(el("div", "name", p.name));
    grow.appendChild(el("div", "sub", (p.items || []).map(function (k) { return I18N.t("item_" + k); }).join(" + ")));
    var del = el("button", "btn small", I18N.t("delete"));
    del.onclick = function () { CFG.presets = (CFG.presets || []).filter(function (x) { return x.id !== p.id; }); persistPresets(); buildPresetsList(); };
    li.appendChild(grow); li.appendChild(del);
    ul.appendChild(li);
  });
}
function addPreset() {
  var nm = $("#preset-name"); var name = ((nm && nm.value) || "").trim();
  if (!name) { if (nm) nm.focus(); return; }
  var items = ["apk", "data", "data_de", "obb", "external", "media"].filter(function (k) { var e = $("#pi-" + k); return e && e.checked; });
  if (!items.length) return;
  CFG.presets = CFG.presets || [];
  CFG.presets.push({ id: "p" + Date.now(), name: name, items: items });
  persistPresets();
  if (nm) nm.value = "";
  buildPresetsList();
}
function fillPresetSelect() {
  var sel = $("#backup-preset"), row = $("#backup-preset-row"); if (!sel || !row) return;
  var ps = CFG.presets || [];
  if (!ps.length) { row.hidden = true; return; }
  sel.innerHTML = "";
  var o0 = document.createElement("option"); o0.value = ""; o0.textContent = I18N.t("ui_preset_none"); sel.appendChild(o0);
  ps.forEach(function (p) { var o = document.createElement("option"); o.value = p.id; o.textContent = p.name; sel.appendChild(o); });
  sel.value = ""; row.hidden = false;
  sel.onchange = function () {
    var p = presetById(sel.value); if (!p) return;
    ["apk", "data", "data_de", "obb", "external", "media"].forEach(function (k) {
      var e = $("#bi-" + k); if (e) e.checked = p.items.indexOf(k) >= 0;
    });
  };
}

// --- special (system-wide) backups --------------------------------------
var SPECIAL_CATS = [];
function loadSpecial() {
  helper("special-categories", { user: activeUser }).then(function (r) {
    SPECIAL_CATS = (r && r.categories) ? r.categories : [];
    var box = $("#special-cats"); box.innerHTML = "";
    var ssNotice = $("#special-syssettings"), ssCb = $("#special-syssettings-cb");
    ssNotice.hidden = true; ssCb.checked = false;
    SPECIAL_CATS.forEach(function (c) {
      // opt-in categories (e.g. system_settings) overwrite device settings on restore,
      // so they get a prominent notice (off by default) instead of a plain checkbox.
      if (c.opt_in) {
        ssCb.dataset.cat = c.id; ssNotice.hidden = !c.available;
        return;
      }
      var lab = document.createElement("label"), cb = document.createElement("input");
      cb.type = "checkbox"; cb.dataset.cat = c.id; cb.checked = !!c.available; cb.disabled = !c.available;
      var sp = el("span", null, I18N.t("special_cat_" + c.id));
      if (sp.textContent === "special_cat_" + c.id) sp.textContent = c.id;
      lab.appendChild(cb); lab.appendChild(sp); box.appendChild(lab);
    });
  });
  helper("special-list", { user: activeUser }).then(function (r) { renderSpecialList(r && r.backups ? r.backups : []); });
  loadPathBackups();
}
function renderSpecialList(list) {
  var ul = $("#special-list"); ul.innerHTML = "";
  $("#special-empty").hidden = !!(list && list.length);
  (list || []).forEach(function (bk) {
    var li = el("li", "row tappable"), grow = el("div", "grow");
    grow.appendChild(el("div", "name", (bk.categories || []).map(function (c) {
      var t = I18N.t("special_cat_" + c); return t === "special_cat_" + c ? c : t; }).join(", ")));
    grow.appendChild(el("div", "sub", shortDate(bk.created_at)));
    li.appendChild(grow);
    li.onclick = function () { openSpecialRestore(bk); };
    ul.appendChild(li);
  });
}
function startSpecialBackup() {
  var cats = Array.prototype.map.call($("#special-cats").querySelectorAll("input:checked"), function (c) { return c.dataset.cat; });
  var ssCb = $("#special-syssettings-cb"), ssOn = !$("#special-syssettings").hidden && ssCb.checked;
  if (ssOn) cats.push(ssCb.dataset.cat || "system_settings");
  if (!cats.length) return;
  var args = { categories: cats, mode: "full", dest: "local", user: activeUser, portable: $("#special-portable").checked };
  if (ssOn) args.system_settings = true;   // opt-in: only sent when explicitly enabled
  var enc = !!CFG.encrypt_data;
  var go = function (pw) {
    if (pw) args.password = pw;
    helper("special-backup", args).then(function (r) {
      args.password = "";
      if (r && r.opid) trackOp(r.opid, { onDone: loadSpecial });
    });
  };
  if (enc) openOpModal({ needPassword: true, titleKey: "backup", confirmKey: "backup",
                         msg: I18N.t("special_pass_msg") }).then(function (res) { if (res != null) go(res.password); });
  else go(null);
}
function openSpecialRestore(bk) {
  var m = $("#special-modal"), ack = $("#special-ack"), ok = $("#special-ok"), pass = $("#special-pass");
  $("#special-modal-sub").textContent = (bk.categories || []).join(", ") + "  -  " + shortDate(bk.created_at);
  var box = $("#special-modal-cats"); box.innerHTML = "";
  var ssBox = $("#special-modal-syssettings"), ssCb = $("#special-modal-ss-cb");
  var hasSS = (bk.categories || []).indexOf("system_settings") >= 0;
  ssBox.hidden = !hasSS; ssCb.checked = false;
  (bk.categories || []).forEach(function (c) {
    if (c === "system_settings") return;   // opt-in: handled by the notice toggle below
    var lab = document.createElement("label"), cb = document.createElement("input");
    cb.type = "checkbox"; cb.checked = true; cb.dataset.cat = c;
    var sp = el("span", null, I18N.t("special_cat_" + c));
    if (sp.textContent === "special_cat_" + c) sp.textContent = c;
    lab.appendChild(cb); lab.appendChild(sp); box.appendChild(lab);
  });
  ack.checked = false; pass.value = ""; pass.hidden = true;
  ok.disabled = true; ack.onchange = function () { ok.disabled = !ack.checked; };
  m.hidden = false;
  $("#special-cancel").onclick = function () { m.hidden = true; };
  $("#special-delete").onclick = function () {
    modalConfirm(I18N.t("confirm_delete_backup"), I18N.t("delete")).then(function (yes) {
      if (!yes) return;
      helper("delete-backup", { ref: bk.ref }).then(function () { m.hidden = true; loadSpecial(); });
    });
  };
  ok.onclick = function () {
    if (ok.disabled) return;
    var cats = Array.prototype.map.call(box.querySelectorAll("input:checked"), function (c) { return c.dataset.cat; });
    var ssOn = hasSS && ssCb.checked;
    if (ssOn) cats.push("system_settings");
    var args = { ref: bk.ref, confirm: true, categories: cats };
    if (ssOn) args.system_settings = true;   // opt-in: only sent when explicitly enabled
    if (pass.value) args.password = pass.value;
    m.hidden = true;
    helper("special-restore", args).then(function (r) {
      if (r && r.opid) trackOp(r.opid, { specialRef: bk.ref, specialCats: cats, specialSysset: ssOn });
    });
  };
}

// --- folder / file backup (path-backup / path-restore) -------------------
// Path backups live under .paths/ in the backups dir and are not app backups, so
// they have their own engine verb (path-list), same contract as list-backups.
var PATH_BACKUPS = [];
function loadPathBackups() {
  helper("path-list", { user: activeUser | 0 }).then(function (out) {
    renderPathBackups(out && out.backups ? out.backups : []);
  }).catch(function () { renderPathBackups([]); });
}
function renderPathBackups(list) {
  PATH_BACKUPS = list || [];
  var ul = $("#pathbk-list"); ul.innerHTML = "";
  $("#pathbk-empty").hidden = !!(list && list.length);
  (list || []).forEach(function (bk) {
    var li = el("li", "row"), grow = el("div", "grow");
    grow.appendChild(el("div", "badge", I18N.t("ui_pathbk_badge")));
    grow.appendChild(el("div", "name", bk.source || bk.ref));
    grow.appendChild(el("div", "sub", shortDate(bk.created_at)));
    var btn = el("button", "btn go small", I18N.t("restore"));
    btn.onclick = function () { startPathRestore(bk); };
    var del = el("button", "btn danger small", I18N.t("delete"));
    del.onclick = function () { deleteBackup(bk.ref, loadPathBackups); };
    li.appendChild(grow); li.appendChild(btn); li.appendChild(del);
    ul.appendChild(li);
  });
}
function openPathBackup() {
  var p = ($("#pb-path").value || "").trim();
  if (!p || p.charAt(0) !== "/") { modalAlert(I18N.t("ui_pathbk_need_path")); return; }
  var m = $("#pathbk-modal");
  $("#pathbk-sub").textContent = p;
  var comp = $("#pb-comp"), enc = $("#pb-enc"), pass = $("#pb-pass");
  comp.value = CFG.compression || "zstd:10";
  enc.checked = !!CFG.encrypt_data; pass.value = ""; pass.hidden = !enc.checked;
  enc.onchange = function () { pass.hidden = !enc.checked; };
  m.hidden = false;
  $("#pb-cancel").onclick = function () { m.hidden = true; enc.onchange = null; };
  $("#pb-ok").onclick = function () {
    if (enc.checked && !pass.value) { pass.focus(); return; }
    var args = { path: p, dest: CFG.default_dest || "local", user: activeUser,
                 compression: comp.value, encrypt_data: enc.checked };
    if (enc.checked) args.password = pass.value;
    m.hidden = true; enc.onchange = null;
    var run = function () {
      helper("path-backup", args).then(function (r) {
        if (r && r.opid) trackOp(r.opid, { retry: run, onDone: loadPathBackups });
        else modalAlert(errMsg(r));
      });
    };
    run();
  };
}
function startPathRestore(bk) {
  var msg = I18N.t("ui_pathbk_restore_confirm", { path: bk.source || bk.ref });
  var encd = bk.encryption && bk.encryption !== "none";
  if (encd) {
    openOpModal({ needPassword: true, overwriteAck: true, titleKey: "ui_pathbk_restore_title",
                  confirmKey: "restore", msg: msg }).then(function (res) {
      if (res == null) return;
      runPathRestore(bk, res.password);
    });
  } else {
    modalConfirm(msg, I18N.t("ui_pathbk_restore_title")).then(function (ok) {
      if (!ok) return;
      runPathRestore(bk, null);
    });
  }
}
function runPathRestore(bk, password) {
  var args = { ref: bk.ref, confirm: true };
  if (password) args.password = password;
  var ctx = { pathRef: bk.ref, pathSource: bk.source || bk.ref, onDone: loadPathBackups };
  helper("path-restore", args).then(function (r) {
    args.password = "";
    if (r && r.opid) trackOp(r.opid, ctx);
    else modalAlert(errMsg(r));
  });
}

// --- accent colour (optional, remembered on the device) ------------------
// A custom accent overrides the theme's default --accent in both light and dark.
// Empty = use the theme default. Presets + a free colour picker + a reset swatch.
var ACCENTS = ["#38bdf8", "#22c55e", "#f43f5e", "#a855f7", "#f59e0b", "#14b8a6", "#e11d48", "#6366f1"];
function getAccent() { try { return localStorage.getItem("vdb_accent") || ""; } catch (e) { return ""; } }
function applyAccent(c) {
  if (c) document.documentElement.style.setProperty("--accent", c);
  else document.documentElement.style.removeProperty("--accent");
  try { if (c) localStorage.setItem("vdb_accent", c); else localStorage.removeItem("vdb_accent"); } catch (e) {}
}
function buildAccentSwatches() {
  var box = $("#accent-swatches"); if (!box || box._built) return; box._built = true;
  // reset first, then the preset swatches and the custom picker, in one non-wrapping
  // horizontal row that scrolls sideways (see .swatches in the CSS).
  var reset = el("button", "swatch swatch-reset", "×"); reset.type = "button";
  reset.title = "Default"; reset.onclick = function () { applyAccent(""); };
  box.appendChild(reset);
  ACCENTS.forEach(function (c) {
    var b = el("button", "swatch"); b.style.background = c; b.title = c; b.type = "button";
    b.onclick = function () { applyAccent(c); };
    box.appendChild(b);
  });
  var custom = document.createElement("input"); custom.type = "color"; custom.className = "swatch swatch-custom";
  custom.value = getAccent() || "#38bdf8";
  custom.oninput = function () { applyAccent(this.value); };
  box.appendChild(custom);
}

// --- theme (auto | dark | light), remembered on the device ---------------
function getTheme() { try { return localStorage.getItem("vdb_theme") || "dark"; } catch (e) { return "dark"; } }
function applyTheme(mode) {
  if (mode !== "auto" && mode !== "light" && mode !== "dark") mode = "dark";
  document.documentElement.setAttribute("data-theme", mode);
  try { localStorage.setItem("vdb_theme", mode); } catch (e) {}
}
function effectiveTheme() {
  var m = document.documentElement.getAttribute("data-theme");
  if (m === "auto") return (window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches) ? "light" : "dark";
  return m === "light" ? "light" : "dark";
}

// --- UI scale (continuous, draggable), remembered on the device ---------------
// A numeric factor (0.85-1.20) persisted in vdb_density and applied as --ui-scale
// on <html>; the CSS zooms the whole app (body { zoom }) by it. 1 = the current look.
// Old string values ("compact"/"default"/"large") are migrated to numbers on read
// so existing installs keep working. The range is conservative so the header and
// bottom nav stay proportional at the extremes.
function clampScale(n) { n = Number(n); if (isNaN(n)) return 1; return Math.max(0.85, Math.min(1.2, n)); }
function getDensity() {
  var v = null;
  try { v = localStorage.getItem("vdb_density"); } catch (e) {}
  if (v == null || v === "") return 1;
  if (v === "compact") return 0.85;
  if (v === "default") return 1;
  if (v === "large") return 1.15;
  return clampScale(v);
}
function applyDensity(scale) {
  scale = clampScale(scale);
  document.documentElement.style.setProperty("--ui-scale", String(scale));
  try { localStorage.setItem("vdb_density", String(scale)); } catch (e) {}
}
function updateDensityLabel(pct) { var e = $("#set-density-val"); if (e) e.textContent = Math.round(pct) + "%"; }

// --- segmented controls (small 2-3 option selects) ----------------------
// Render an inline Material segmented button group for a <select>, keeping the
// native element in the DOM (hidden) as the value source so every downstream
// .value read/write and .onchange handler keeps working. A segment click sets the
// select's value and dispatches "change"; syncSegments() reflects programmatic
// value changes back onto the buttons.
var SEGMENTED = ["#set-theme", "#set-mode", "#set-netpolicy", "#job-action", "#job-mode", "#import-from",
                 "#app-filter", "#app-sort", "#d-type", "#job-cron", "#job-minbat"];
function segmentize(sel) {
  if (!sel || sel._seg) return; sel._seg = true;
  var group = el("div", "segmented"); group.setAttribute("role", "radiogroup");
  var buttons = [];
  function setActive() {
    buttons.forEach(function (b) {
      var on = b.dataset.val === sel.value;
      b.classList.toggle("on", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
    });
  }
  Array.prototype.forEach.call(sel.options, function (o) {
    var b = el("button", "segment"); b.type = "button"; b.dataset.val = o.value;
    b.setAttribute("role", "radio");
    var key = o.getAttribute("data-i18n");
    if (key) { b.setAttribute("data-i18n", key); b.textContent = I18N.t(key); }
    else b.textContent = o.textContent;
    b.onclick = function () {
      if (sel.value === o.value) return;
      sel.value = o.value; setActive(); sel.dispatchEvent(new Event("change"));
    };
    b.onkeydown = function (e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      var i = buttons.indexOf(b), ni = i + (e.key === "ArrowRight" ? 1 : -1);
      if (ni < 0 || ni >= buttons.length) return;
      buttons[ni].focus(); buttons[ni].click();
    };
    group.appendChild(b); buttons.push(b);
  });
  sel.style.display = "none"; sel._segSync = setActive;
  sel.parentNode.insertBefore(group, sel.nextSibling);
  setActive();
}
function setupSegments() { SEGMENTED.forEach(function (s) { segmentize($(s)); }); }
function syncSegments() { SEGMENTED.forEach(function (s) { var e = $(s); if (e && e._segSync) e._segSync(); }); }

// --- update check (button-triggered; never auto-runs on load) ------------
// Fills and shows the dismissible update banner from an update-check result that
// reports an available update. Shared by the manual check and the auto-check.
function showUpdateBanner(r, scroll) {
  var banner = $("#update-banner");
  $("#update-banner-title").textContent = I18N.t("ui_update_available", { version: r.latest_version || "" });
  var msg = I18N.t("ui_update_via_manager");
  if (r.notes) msg = r.notes + "\n\n" + msg;
  $("#update-banner-msg").textContent = msg;
  if (banner) { banner.classList.add("show"); if (scroll && banner.scrollIntoView) banner.scrollIntoView({ block: "center" }); }
}

// Wires to the helper "update-check" verb. On an available update it shows the
// dismissible banner and points the user at their root manager (which performs the
// actual update via the module's updateJson); it never opens external URLs itself.
function checkForUpdates() {
  var btn = $("#update-check");
  if (btn) { btn.disabled = true; btn.textContent = I18N.t("ui_update_checking"); }
  var restore = function () { if (btn) { btn.disabled = false; btn.textContent = I18N.t("ui_check_updates"); } };
  helper("update-check").then(function (r) {
    restore();
    if (!r || r.ok === false) { modalAlert(errMsg(r)); return; }
    if (r.update_available) { showUpdateBanner(r, true); }
    else { var b = $("#update-banner"); if (b) b.classList.remove("show"); modalAlert(I18N.t("ui_update_latest")); }
  }).catch(function () { restore(); modalAlert(I18N.t("msg_err_update_check")); });
}

// Silent, throttled auto-check on open: at most once an hour (localStorage ts).
// Shows the banner only when a newer version exists; never alerts, never nags,
// and fails silently (offline shows nothing). The manual button is unaffected.
var UPDATE_CHECK_THROTTLE_MS = 3600000;
function autoCheckUpdates() {
  var now = Date.now(), last = 0;
  try { last = parseInt(localStorage.getItem("vdb_update_last_check"), 10) || 0; } catch (e) {}
  if (now - last < UPDATE_CHECK_THROTTLE_MS) return;
  try { localStorage.setItem("vdb_update_last_check", String(now)); } catch (e) {}
  helper("update-check").then(function (r) {
    if (r && r.ok !== false && r.update_available) showUpdateBanner(r, false);
  }).catch(function () {});
}

// --- boot ---------------------------------------------------------------
function boot() {
  applyTheme(getTheme());
  applyAccent(getAccent());
  applyDensity(getDensity());
  document.querySelectorAll(".tab").forEach(function (t) {
    t.onclick = function () { navTab(t.dataset.tab); };
  });
  $("#refresh").onclick = loadApps;
  $("#search").oninput = function () { renderApps(this.value); };
  $("#app-filter").onchange = function () { renderApps($("#search").value); };
  $("#app-sort").onchange = function () { renderApps($("#search").value); };
  if ($("#app-tag")) $("#app-tag").onchange = function () {
    tagFilter = this.value || "";
    renderApps($("#search").value);   // renderApps toggles the "Back up tag" button
  };
  if ($("#app-backuptag")) $("#app-backuptag").onclick = startTagBackup;
  $("#app-select").onclick = function () { setSelectMode(!selectMode); };
  $("#app-selall").onclick = function () { visibleApps($("#search").value).forEach(function (a) { selected[a.package] = { package: a.package, label: a.label }; }); updateSelCount(); renderApps($("#search").value); };
  $("#app-selnone").onclick = function () { selected = {}; updateSelCount(); renderApps($("#search").value); };
  $("#app-backupsel").onclick = startBatchBackup;
  $("#bk-select").onclick = function () { setBkSelectMode(!bkSelectMode); };
  $("#bk-selall").onclick = function () { (BACKUPS || []).forEach(function (b) { bkSelected[b.ref] = { ref: b.ref, package: b.package, items: b.items }; }); updateBkSelCount(); renderBackups(BACKUPS); };
  $("#bk-selnone").onclick = function () { bkSelected = {}; updateBkSelCount(); renderBackups(BACKUPS); };
  $("#bk-restoresel").onclick = startBatchRestore;
  $("#job-save").onclick = saveJob;
  $("#job-all").onchange = updateJobForm;
  $("#job-action").onchange = updateJobForm;
  $("#job-app-search").oninput = function () { filterJobPicker(this.value); };
  $("#log-open").onclick = function () { navTab("log"); };
  if ($("#log-export")) $("#log-export").onclick = exportLogs;
  $("#block-app-search").oninput = function () { filterBlockPicker(this.value); };
  if ($("#ai-app-search")) $("#ai-app-search").oninput = function () { filterAppItemsPicker(this.value); };
  if ($("#appitems-save")) $("#appitems-save").onclick = function () {
    if (!_aiPkg) return;
    var items = AI_ITEMS.filter(function (k) { var e = $("#ai-" + k); return e && e.checked; });
    setAppItems(_aiPkg, items); closeAppItemsModal(); buildAppItemsPicker();
  };
  if ($("#appitems-clear")) $("#appitems-clear").onclick = function () {
    if (_aiPkg) setAppItems(_aiPkg, null);
    closeAppItemsModal(); buildAppItemsPicker();
  };
  if ($("#appitems-cancel")) $("#appitems-cancel").onclick = closeAppItemsModal;
  var _aiTagCommit = function () {
    var ti = $("#ai-tag-input"); if (!ti || !_aiPkg) return;
    addAppTag(_aiPkg, ti.value); ti.value = ""; ti.focus();
    buildAiTags(); fillTagFilter(); renderApps($("#search").value);
  };
  if ($("#ai-tag-add")) $("#ai-tag-add").onclick = _aiTagCommit;
  if ($("#ai-tag-input")) $("#ai-tag-input").onkeydown = function (e) { if (e.key === "Enter") { e.preventDefault(); _aiTagCommit(); } };
  if ($("#preset-add")) $("#preset-add").onclick = addPreset;
  $("#special-backup").onclick = startSpecialBackup;
  if ($("#prov-open")) $("#prov-open").onclick = openProvenance;
  if ($("#update-check")) $("#update-check").onclick = checkForUpdates;
  if ($("#update-banner-x")) $("#update-banner-x").onclick = function () { $("#update-banner").classList.remove("show"); };
  $("#user-sel").onchange = function () { activeUser = this.value | 0; CFG.user = activeUser; loadApps(); loadOverview(); };
  $("#set-save").onclick = saveSettings;
  if ($("#cfg-export")) $("#cfg-export").onclick = exportConfig;
  if ($("#cfg-import")) $("#cfg-import").onclick = importConfig;
  if ($("#cfg-wipe")) $("#cfg-wipe").onclick = wipeCredentials;
  $("#d-save").onclick = addDest;
  $("#d-type").onchange = syncDestFields;
  if ($("#d-add-remote")) $("#d-add-remote").onclick = focusAddRemote;
  $("#d-browse").onclick = function () { openDirPicker("#d-path"); };
  $("#pb-browse").onclick = function () { openDirPicker("#pb-path"); };
  $("#pb-backup").onclick = openPathBackup;
  $("#r-save").onclick = addRemote;
  $("#r-backend").onchange = syncRemoteFields;
  $("#r-add-param").onclick = addParamRow;
  $("#r-authorize").onclick = startAuthorize;
  $("#r-auth-cancel").onclick = cancelAuthorize;
  syncDestFields();
  syncRemoteFields();
  $("#companion-hma-add").onclick = openHmaList;
  $("#companion-hma-dismiss").onclick = function () { $("#companion-hma").hidden = true; };
  if ($("#susfs-notice-dismiss")) $("#susfs-notice-dismiss").onclick = function () { SUSFS_DISMISSED = true; $("#susfs-notice").hidden = true; };
  $("#import-scan").onclick = scanImports;
  $("#theme-btn").onclick = function () {
    applyTheme(effectiveTheme() === "light" ? "dark" : "light");
    if ($("#set-theme")) { $("#set-theme").value = getTheme(); syncSegments(); }
  };
  if ($("#set-theme")) $("#set-theme").onchange = function () { applyTheme(this.value); };
  if ($("#set-density")) $("#set-density").oninput = function () {
    var pct = +this.value; applyDensity(pct / 100); updateDensityLabel(pct);
  };
  setupSegments();
  setupSwipe();
  setupBackNav();

  // Telegram Cloud Storage event listeners
  if ($("#d-tg-connect-btn")) $("#d-tg-connect-btn").onclick = openTelegramModal;
  if ($("#tg-modal-close-x")) $("#tg-modal-close-x").onclick = function () { $("#tg-modal").hidden = true; };
  if ($("#tg-phone-cancel")) $("#tg-phone-cancel").onclick = function () { $("#tg-modal").hidden = true; };
  if ($("#tg-notice-cancel")) $("#tg-notice-cancel").onclick = function () { $("#tg-modal").hidden = true; };
  if ($("#tg-active-close")) $("#tg-active-close").onclick = function () { $("#tg-modal").hidden = true; };
  if ($("#tg-phone-next")) $("#tg-phone-next").onclick = submitTelegramPhone;
  if ($("#tg-code-back")) $("#tg-code-back").onclick = function () { showTgStep("phone"); };
  if ($("#tg-code-verify")) $("#tg-code-verify").onclick = submitTelegramCode;
  if ($("#tg-create-channel-btn")) $("#tg-create-channel-btn").onclick = createTelegramChannel;
  if ($("#tg-logout-btn")) $("#tg-logout-btn").onclick = logoutTelegram;

  helper("config-get").then(function (c) { CFG = c || {}; activeUser = (CFG.user != null) ? (CFG.user | 0) : 0; return I18N.init(CFG.language || "auto"); })
    .then(function () { I18N.apply(); loadDests(); loadSettings(); loadUsers(); loadOverview(); reattachOps(); recoverPendingAuth(); autoCheckUpdates(); });

  helper("ping").then(function (r) {
    if (r && r.version) { $("#ver").textContent = r.version; if ($("#about-ver")) $("#about-ver").textContent = r.version + " - " + (r.abi || ""); }
  });

  // self-heal backup-folder perms once per load (fire-and-forget, never blocks the UI).
  helper("sanitize").catch(function () {});
}
document.addEventListener("DOMContentLoaded", boot);
