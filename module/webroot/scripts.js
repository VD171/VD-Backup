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
function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

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

// --- VDLU flashless updater bridge --------------------------------------
// Adapts execCommand to the contract the vendored vdlu.js widget expects (resolve
// stdout on rc 0, reject otherwise) and drives the engine in MOD/vdlu via the
// Tier-2 state dir /data/adb/vdbackup/vdlu. The widget renders its own toast,
// reboot banner and the "Updates" panel; it is a no-op if the build omits vdlu.js.
var VDLU_STATE_DIR = "/data/adb/vdbackup/vdlu";
var _vdluReady = false, _vdluPanelMounted = false;
function vdluExec(cmd) {
  return execCommand(cmd).then(function (r) {
    if (r.errno === 0) return r.stdout;
    throw new Error(r.stderr || r.stdout || ("rc=" + r.errno));
  });
}
// VDLU panel translations: the active language's dict is loaded on demand from
// vdlu-i18n/<lang>.js (sets window.VDLU_I18N_<UPPER>), passed to VDLU.init({i18n}).
// English is the widget's built-in default; a missing/failed file falls back to it.
function loadVdluI18n(lang) {
  return new Promise(function (resolve) {
    if (!lang || lang === "en") return resolve(null);
    var file = (lang === "pt") ? "pt-BR" : lang;
    var g = "VDLU_I18N_" + file.toUpperCase().replace(/-/g, "_");
    if (typeof window[g] !== "undefined") return resolve(window[g]);
    var s = document.createElement("script");
    s.src = "vdlu-i18n/" + file + ".js";
    s.onload = function () { resolve((typeof window[g] !== "undefined") ? window[g] : null); };
    s.onerror = function () { resolve(null); };
    document.head.appendChild(s);
  });
}
function initVdlu() {
  if (_vdluReady || !window.VDLU) return;
  _vdluReady = true;
  loadVdluI18n(currentUiLang()).then(function (dict) {
    var opts = { exec: vdluExec, moduleDir: MOD, vdluDir: VDLU_STATE_DIR, modid: "vdbackup", module: "VDBackup" };
    if (dict) opts.i18n = dict;
    VDLU.init(opts);
    VDLU.onWebUIOpen().catch(function () {});
  });
}
function openUpdatesPanel() {
  if (!window.VDLU) return;
  initVdlu();
  if (!_vdluPanelMounted) { _vdluPanelMounted = true; VDLU.mountUpdatesPanel("vdlu-updates"); }
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
  if (name === "updates") openUpdatesPanel();
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
  var pkg = ic.dataset.pkg;
  if (!pkg) { if (ic.dataset.bref) loadBackupIcon(ic, ic.dataset.bref); return; }
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
    if (!ignoreTag && tagFilters.length && !appTags(a.package).some(function (t) { return tagFilters.indexOf(t) >= 0; })) return false;
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
    var _nt = appNote(a.package);
    if (_nt) grow.appendChild(el("div", "app-note", _nt));
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
    ul.appendChild(li);
    if (iconObserver) iconObserver.observe(ic); else loadIcon(ic);
  });
  // "Back up tag" is offered only when a tag is active, we are not in select mode, and the
  // tag actually matches apps in the current (user/system) view, so it never dead-ends.
  var tb = $("#app-backuptag");
  if (tb) tb.hidden = !(tagFilters.length && !selectMode && tagFilterApps().length);
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
function loadApps() {
  $("#applist").innerHTML = "<li class='muted'>" + I18N.t("apps_loading") + "</li>";
  helper("list-apps", { user: activeUser }).then(function (r) {
    APPS = (r && r.apps) ? r.apps : [];
    buildTagChips();
    renderApps($("#search").value);
    buildBlockPicker();   // keep the Settings "Excluded apps" picker in sync with APPS
    buildAppItemsPicker(); // and the "Per-app items and tags" picker
  });
}

// --- backups ------------------------------------------------------------
var BACKUPS = [];
var SUSFS_DISMISSED = false;
var bkSelectMode = false, bkSelected = {};   // ref -> {ref,package,items} while selecting
var bkQuery = "";
// a backup matches the search when the query is in its user name (note), its tags, the app
// label or the package. Pure client-side filter over the already-loaded list.
function bkMatch(b, q) {
  return ((b.note || "").toLowerCase().indexOf(q) >= 0)
    || ((b.label || "").toLowerCase().indexOf(q) >= 0)
    || ((b.package || "").toLowerCase().indexOf(q) >= 0)
    || ((b.tags || []).some(function (t) { return (t || "").toLowerCase().indexOf(q) >= 0; }));
}
var _bkIcons = [];
function renderBackups(list) {
  var ul = $("#backuplist"); ul.innerHTML = "";
  if (iconObserver) _bkIcons.forEach(function (ic) { iconObserver.unobserve(ic); });
  _bkIcons = [];
  BACKUPS = list || [];
  var q = (bkQuery || "").toLowerCase().trim();
  var shown = q ? BACKUPS.filter(function (b) { return bkMatch(b, q); }) : BACKUPS;
  // the empty message means "no backups", never "no search matches": hide it while the user has
  // backups but the filter just hides them (the search box itself shows what is going on).
  $("#backups-empty").style.display = BACKUPS.length ? "none" : "";
  if (BACKUPS.length) showSusfsNotice(); else { var sb = $("#susfs-notice"); if (sb) sb.hidden = true; }
  shown.forEach(function (b) {
    var li = el("li", "row tappable");
    var ic = el("div", "app-ic", (b.note || b.label || b.package).charAt(0).toUpperCase());
    var grow = el("div", "grow");
    grow.appendChild(el("div", "name", b.note || b.label || b.package));
    grow.appendChild(el("div", "pkg", b.note ? (b.label || b.package) : b.package));
    grow.appendChild(el("div", "sub", shortDate(b.created_at)));
    if ((b.tags || []).length) { var tb = el("div", "tags"); b.tags.forEach(function (t) { tb.appendChild(tagChip(t)); }); grow.appendChild(tb); }
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
    // icon comes from the manifest, not the live app; loaded lazily on scroll, like app icons
    ic.dataset.bref = b.ref || ""; _bkIcons.push(ic);
    if (iconObserver) iconObserver.observe(ic); else loadBackupIcon(ic, b.ref);
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
    var args = { refs: refs, ssaid: res.ssaid, netpolicy: res.netpolicy, test: res.test, spoof_installer: res.spoof_installer, deep_spoof: res.deep_spoof };
    var run = function () { helper("restore-batch", args).then(function (r) { if (r && r.opid) trackOp(r.opid, { batch: true, retry: run }); else modalAlert(errMsg(r)); }).catch(function () { modalAlert(errMsg()); }); };
    run();
  });
}
// Backup-list icon: read the icon stored in the manifest, so it shows even when
// the app is uninstalled. Cached per backup ref; "0" marks a backup with no icon.
// Batched like app icons (one helper call per ICON_BATCH refs), and a ref already
// being fetched is not asked for again: re-renders just add their icon to the wait list.
var _bicQ = [], _bicTimer = null, _bicPending = {};
function loadBackupIcon(ic, ref) {
  if (!ref) return;
  var cached = null;
  try { cached = localStorage.getItem("vdb_bic:" + ref); } catch (e) {}
  if (cached) { if (cached !== "0") setIcon(ic, cached); return; }
  if (_bicPending[ref]) { _bicPending[ref].push(ic); return; }
  _bicPending[ref] = [ic]; _bicQ.push(ref);
  if (_bicQ.length >= ICON_BATCH) flushBackupIcons();
  else if (!_bicTimer) _bicTimer = setTimeout(flushBackupIcons, 120);
}
function flushBackupIcons() {
  if (_bicTimer) { clearTimeout(_bicTimer); _bicTimer = null; }
  if (!_bicQ.length) return;
  var refs = _bicQ.splice(0, ICON_BATCH);
  var done = function (map) {
    refs.forEach(function (ref) {
      var ics = _bicPending[ref] || []; delete _bicPending[ref];
      // only an answered ref is cached ("" = no icon); a failed call is retried on a later render
      if (!map || !Object.prototype.hasOwnProperty.call(map, ref)) return;
      try { localStorage.setItem("vdb_bic:" + ref, map[ref] || "0"); } catch (e) {}
      if (map[ref]) ics.forEach(function (ic) { setIcon(ic, map[ref]); });
    });
  };
  helper("backup-icons", { refs: refs }).then(function (r) { done(r && r.ok && r.icons); }, function () { done(null); });
  if (_bicQ.length) _bicTimer = setTimeout(flushBackupIcons, 0);   // drain remaining
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
  // user name + tags editor: a custom name and free tags for this backup, stored in a sidecar
  // that travels with it (note-set). Searchable from the backups list. Reloads so the change shows.
  $("#info-note").value = b.note || "";
  $("#info-tags").value = (b.tags || []).join(", ");
  $("#info-note-status").textContent = "";
  $("#info-note-save").onclick = function () {
    var note = ($("#info-note").value || "").trim();
    var tags = ($("#info-tags").value || "").split(",").map(function (t) { return t.trim(); }).filter(function (t) { return t.length; });
    $("#info-note-save").disabled = true;
    helper("note-set", { ref: b.ref, note: note, tags: tags }).then(function (r) {
      $("#info-note-save").disabled = false;
      if (r && r.ok) { $("#info-note-status").textContent = I18N.t("saved"); b.note = note; b.tags = tags; loadBackups(); }
      else { $("#info-note-status").textContent = errMsg(r); }
    }).catch(function () { $("#info-note-save").disabled = false; $("#info-note-status").textContent = errMsg(); });
  };
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
    var args = { ref: ref, ssaid: res.ssaid, netpolicy: res.netpolicy, test: res.test, spoof_installer: res.spoof_installer, deep_spoof: res.deep_spoof };
    if (res.items) args.items = res.items;
    var ctx = { restoreRef: ref, restorePkg: pkg, ssaid: res.ssaid, netpolicy: res.netpolicy, items: res.items, test: res.test, spoof_installer: res.spoof_installer, deep_spoof: res.deep_spoof };
    ctx.retry = function () { helper("restore", args).then(function (r) { if (r && r.opid) trackOp(r.opid, ctx); else modalAlert(errMsg(r)); }).catch(function () { modalAlert(errMsg()); }); };
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
    else modalAlert(errMsg(r));
  }).catch(function () { modalAlert(errMsg()); });
}
function openOpModal(o) {
  return new Promise(function (resolve) {
    var modal = $("#pw-modal"), input = $("#pw-input"), errBox = $("#pw-err"), ssaid = $("#pw-ssaid");
    var appnet = $("#pw-app-netpolicy");
    var okBtn = $("#pw-ok"), ackRow = $("#pw-overwrite-row"), ack = $("#pw-overwrite");
    var ssaidRow = $("#pw-ssaid-row"); ssaidRow.hidden = (o.allowSsaid === false);   // hide for flows where SSAID is irrelevant (e.g. settings backup)
    var appnetRow = $("#pw-app-netpolicy-row"); appnetRow.hidden = (o.allowSsaid === false);   // same gating: system-file opt-ins are irrelevant for settings backup
    input.value = ""; ssaid.checked = false; appnet.checked = false; input.hidden = !o.needPassword;
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
    function ackOk() { return !o.overwriteAck || ack.checked || (o.allowTest && test.checked); }
    function syncOk() { if (ackOk()) { errBox.textContent = ""; ackRow.classList.remove("needsack"); } }
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
      okBtn.disabled = false; ackRow.hidden = true; ackRow.classList.remove("needsack"); ack.onchange = null; itemsBox.hidden = true; itemsBox.innerHTML = ""; ssaidRow.hidden = false; appnetRow.hidden = false;
      testRow.hidden = true; test.onchange = null; spoofRow.hidden = true;
      deepRow.hidden = true; deep.disabled = false; spoof.onchange = null;
      okBtn.onclick = null; $("#pw-cancel").onclick = null; input.onkeydown = null;
    }
    function submit() {
      if (!ackOk()) {   // data-loss confirmation required: tell the user instead of doing nothing
        errBox.textContent = I18N.t("msg_overwrite_ack_required");
        ackRow.classList.add("needsack");
        try { ack.focus(); } catch (e) {}
        return;
      }
      var r = { password: o.needPassword ? input.value : null, ssaid: ssaid.checked, netpolicy: appnet.checked };
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
// by rclone, so one poll completes the remote automatically. The user just returns.
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
  set("#d-path", type !== "restic");   // telegram reuses this field for the optional channel name/id
  var _dp = $("#d-path"); if (_dp) _dp.placeholder = I18N.t(type === "telegram" ? "ph_tg_channel" : "ph_dest_path");
  set("#d-browse", type === "local");   // folder browser only makes sense for a local path
  set("#remote-box", type === "rclone");
  var hint = $("#d-rclone-hint"); if (hint) hint.hidden = (type !== "rclone");
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
  helper("dest-add", d).then(function (r) {
    if (!r || r.ok === false) { modalAlert(errMsg(r)); return; }   // a failed add looked identical to success (form cleared, no row, no error)
    $("#d-id").value = ""; $("#d-pass").value = ""; loadDests();
    if (type === "gdrive") setupGdrive(d.id);
    if (type === "telegram") setupTelegram(d.id);
    // removable media (SD/USB) is plaintext at rest; warn (do not block) when the backup
    // itself is not encrypted, so an unencrypted backup on a card is an informed choice.
    if (r && r.removable && !CFG.encrypt_data) modalAlert(I18N.t("msg_removable_unencrypted"), I18N.t("ui_removable_title"));
  }).catch(function () { modalAlert(errMsg()); });
}
function testDest(id) {
  var d = destById(id);
  if (d && d.type === "gdrive") { setupGdrive(id); return; }
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
  return execCommand("env -u LD_LIBRARY_PATH -u LD_PRELOAD /system/bin/am start -n " + shq(COMPANION_PKG + "/.ConsentActivity") + " -e result " + shq(res));
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

// Telegram destination: after adding it, make sure the account is logged in (the session
// lives encrypted on-device); if not, drive the phone -> code -> 2FA login flow.
function setupTelegram(id) {
  return helper("telegram-check").then(function (r) {
    if (r && r.ok && r.is_auth) return true;   // check-auth reports .is_auth (bool), not a user field
    return openTelegramLogin();
  }).catch(function () { return openTelegramLogin(); });
}
function openTelegramLogin() {
  return new Promise(function (resolve) {
    var m = $("#tg-login"), phoneStep = $("#tg-step-phone"), codeStep = $("#tg-step-code");
    var phone = $("#tg-phone"), code = $("#tg-code"), tfa = $("#tg-2fa"), err = $("#tg-err"), next = $("#tg-next");
    var state = "phone", ph = "";
    phone.value = ""; code.value = ""; tfa.value = ""; tfa.hidden = true; err.textContent = "";
    phoneStep.hidden = false; codeStep.hidden = true; next.disabled = false;
    next.textContent = I18N.t("ui_tg_send_code");
    m.hidden = false; setTimeout(function () { phone.focus(); }, 0);
    function close(v) { m.hidden = true; next.onclick = null; $("#tg-cancel").onclick = null; resolve(v); }
    $("#tg-cancel").onclick = function () { close(false); };
    next.onclick = function () {
      err.textContent = "";
      if (state === "phone") {
        ph = phone.value.trim(); if (!ph) { err.textContent = I18N.t("msg_err_invalid_phone"); return; }
        next.disabled = true;
        helper("telegram-send-code", { phone: ph }).then(function (r) {
          next.disabled = false;
          if (!r || r.ok === false) { err.textContent = errMsg(r); return; }
          state = "code"; phoneStep.hidden = true; codeStep.hidden = false;
          next.textContent = I18N.t("ui_tg_sign_in"); setTimeout(function () { code.focus(); }, 0);
        }).catch(function () { next.disabled = false; err.textContent = errMsg(); });
      } else {
        var cd = code.value.trim(); if (!cd) { err.textContent = I18N.t("ph_tg_code"); return; }
        var args = { phone: ph, code: cd }; if (!tfa.hidden && tfa.value) args.password = tfa.value;
        next.disabled = true;
        helper("telegram-sign-in", args).then(function (r) {
          next.disabled = false;
          if (r && r.ok && r.user) { close(true); return; }
          if (r && r.code === "2FA_REQUIRED") { tfa.hidden = false; err.textContent = I18N.t("msg_tg_2fa_needed"); setTimeout(function () { tfa.focus(); }, 0); return; }
          err.textContent = errMsg(r);
        }).catch(function () { next.disabled = false; err.textContent = errMsg(); });
      }
    };
  });
}

// list the backups stored in the Telegram channel and let the user PULL one back to local
// storage (where the normal restore flow then handles it). Not logged in -> run the login first.
function openTelegramBackups() {
  var m = $("#tg-backups"), box = $("#tg-backups-list");
  box.innerHTML = "<li class='muted'>" + I18N.t("apps_loading") + "</li>"; m.hidden = false;
  $("#tg-backups-close").onclick = function () { m.hidden = true; };
  helper("telegram-check").then(function (c) {
    if (!c || !c.ok || !c.is_auth) { m.hidden = true; openTelegramLogin().then(function (ok) { if (ok) openTelegramBackups(); }); return; }
    helper("telegram-list").then(function (r) {
      box.innerHTML = "";
      var items = ((r && r.ok && r.backups) ? r.backups : []).filter(function (b) { return /\.vdb\.tar$/.test(b.name || ""); });
      if (!items.length) { box.innerHTML = "<li class='muted'>" + I18N.t("ui_tg_no_backups") + "</li>"; return; }
      items.forEach(function (b) {
        var mt = (b.name || "").match(/^(.+)__([^_]+)_(\d+)\.vdb\.tar$/);
        var li = el("li", "row");
        li.appendChild(el("div", "grow", (mt ? mt[1] : b.name)));
        var btn = el("button", "btn small go", I18N.t("ui_tg_pull"));
        btn.onclick = function () {
          m.hidden = true;
          helper("telegram-pull", { message_id: b.message_id, name: b.name }).then(function (op) {
            if (op && op.opid) trackOp(op.opid, { onDone: function (p) { if (p.ok) { loadBackups(); modalAlert(I18N.t("msg_tg_pulled")); } } });
            else modalAlert(errMsg(op));
          }).catch(function () { modalAlert(errMsg()); });
        };
        var del = el("button", "btn small danger", I18N.t("delete"));
        del.onclick = function () {
          modalConfirm(I18N.t("msg_tg_delete_confirm"), I18N.t("delete")).then(function (yes) {
            if (!yes) return;
            helper("telegram-delete", { message_id: b.message_id }).then(function (r) {
              if (r && r.ok) { modalAlert(I18N.t("msg_tg_deleted")); openTelegramBackups(); }
              else modalAlert(errMsg(r));
            }).catch(function () { modalAlert(errMsg()); });
          });
        };
        li.appendChild(del); li.appendChild(btn); box.appendChild(li);
      });
    }).catch(function () { box.innerHTML = "<li class='muted'>" + errMsg() + "</li>"; });
  }).catch(function () { box.innerHTML = "<li class='muted'>" + errMsg() + "</li>"; });
}

// list Full backups stored remote-only on the configured rclone destinations and let the user PULL
// one back to local storage (the normal restore flow then handles it) or DELETE it from the remote.
function openRcloneBackups() {
  var m = $("#rc-backups"), box = $("#rc-backups-list");
  box.innerHTML = "<li class='muted'>" + I18N.t("apps_loading") + "</li>"; m.hidden = false;
  $("#rc-backups-close").onclick = function () { m.hidden = true; };
  helper("dests-list").then(function (r) {
    var rdests = ((r && r.dests) ? r.dests : []).filter(function (d) { return d.type === "rclone" || d.type === "gdrive"; });
    if (!rdests.length) { box.innerHTML = "<li class='muted'>" + I18N.t("ui_rc_no_dests") + "</li>"; return; }
    var all = [], pending = rdests.length;
    rdests.forEach(function (d) {
      var verb = d.type === "gdrive" ? "gdrive-list" : "rclone-list";
      helper(verb, { dest: d.id }).then(function (res) {
        if (res && res.ok && res.backups) {
          res.backups.forEach(function (entry) { entry.dtype = d.type; });
          all = all.concat(res.backups);
        }
      }).catch(function () {}).then(function () {
        if (--pending === 0) renderRcloneBackups(box, m, all);
      });
    });
  }).catch(function () { box.innerHTML = "<li class='muted'>" + errMsg() + "</li>"; });
}
function renderRcloneBackups(box, m, items) {
  box.innerHTML = "";
  if (!items.length) { box.innerHTML = "<li class='muted'>" + I18N.t("ui_rc_no_backups") + "</li>"; return; }
  items.forEach(function (b) {
    var li = el("li", "row"), g = el("div", "grow");
    g.appendChild(el("div", "name", b.package || b.rref));
    g.appendChild(el("div", "pkg", b.dest + "  (" + (b.tsvc || "") + ")"));
    li.appendChild(g);
    var pull = el("button", "btn small go", I18N.t("ui_rc_pull"));
    pull.onclick = function () {
      m.hidden = true;
      var pullReq = b.dtype === "gdrive"
        ? helper("gdrive-pull", { dest: b.dest, rref: b.rref, folder: b.folder })
        : helper("rclone-pull", { dest: b.dest, rref: b.rref });
      pullReq.then(function (op) {
        if (op && op.opid) trackOp(op.opid, { onDone: function (p) { if (p.ok) { loadBackups(); modalAlert(I18N.t("msg_rc_pulled")); } } });
        else modalAlert(errMsg(op));
      }).catch(function () { modalAlert(errMsg()); });
    };
    var del = el("button", "btn small danger", I18N.t("delete"));
    del.onclick = function () {
      modalConfirm(I18N.t("msg_rc_delete_confirm"), I18N.t("delete")).then(function (yes) {
        if (!yes) return;
        var delReq = b.dtype === "gdrive"
          ? helper("gdrive-delete", { dest: b.dest, folder: b.folder })
          : helper("rclone-delete", { dest: b.dest, rref: b.rref });
        delReq.then(function (r) {
          if (r && r.ok) { modalAlert(I18N.t("msg_rc_deleted")); openRcloneBackups(); }
          else modalAlert(errMsg(r));
        }).catch(function () { modalAlert(errMsg()); });
      });
    };
    li.appendChild(del); li.appendChild(pull); box.appendChild(li);
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
    items: res.items, ssaid: !!CFG.ssaid, netpolicy: !!CFG.app_netpolicy, verify: res.verify, dry_run: res.dry_run
  };
  if (manual) args.manual = true;   // single interactive backup: keep the user's exact ticks (skip per-app override)
  if (res.password) args.password = res.password;
  return args;
}
function startBackup(pkg, label) {
  openBackupModal(pkg, label).then(function (res) {
    if (!res) return;
    var args = backupArgs(pkg, res, true);
    var run = function () { helper("backup", args).then(function (r) { if (r && r.opid) trackOp(r.opid, { retry: run }); else modalAlert(errMsg(r)); }).catch(function () { modalAlert(errMsg()); }); };
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
  var run = function () { helper("backup-batch", args).then(function (r) { if (r && r.opid) trackOp(r.opid, { batch: true, retry: run }); else modalAlert(errMsg(r)); }).catch(function () { modalAlert(errMsg()); }); };
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
  if (xfer.length) pieces.push(xfer.join(" · "));
  sub.textContent = pieces.join(" · ");
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
var _curOpId = null;   // the op the single #ops slot is showing; a newer trackOp supersedes it
function trackOp(opid, ctx) {
  _curOpId = opid;
  var box = $("#ops"); box.hidden = false;
  box.innerHTML = "";
  var label = el("div", null, I18N.t("op_running"));
  var bar = el("div", "bar"); var fill = el("i"); bar.appendChild(fill);
  var sub = el("div", "op-sub"); sub.hidden = true;
  box.appendChild(label); box.appendChild(bar); box.appendChild(sub);
  // Cancel the running op (kills the detached worker group via the cancel verb). Known-restore
  // ops warn about a possibly-partial app; a reattached op (no ctx) uses the generic message.
  var isRestore = !!(ctx && (ctx.restoreRef || ctx.pathRef || ctx.specialRef));
  var cancelBtn = el("button", "btn small op-cancel", I18N.t("ui_cancel"));
  cancelBtn.onclick = function () {
    modalConfirm(I18N.t(isRestore ? "msg_cancel_restore" : (ctx ? "msg_cancel_backup" : "msg_cancel_op"))).then(function (yes) {
      if (!yes) return;
      cancelBtn.disabled = true;
      helper("cancel", opid, true);   // the poller below sees the op vanish and hides the card
    });
  };
  box.appendChild(cancelBtn);
  var missing = 0, stuck = 0;
  var timer = setInterval(function () {
    if (_curOpId !== opid) { clearInterval(timer); return; }   // a newer op took the slot: stop this poller so it neither leaks nor hides the current op
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
        cancelBtn.style.display = "none";
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
              else modalAlert(errMsg(r));
            }).catch(function () { modalAlert(errMsg()); });
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
            helper("restore", { ref: ctx.restoreRef, ssaid: ctx.ssaid, netpolicy: ctx.netpolicy, items: ctx.items, test: ctx.test, spoof_installer: ctx.spoof_installer, deep_spoof: ctx.deep_spoof, password: res.password }).then(function (r) {
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
      // with no progress, its worker died at launch; drop the stale card.
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
    grow.appendChild(el("div", "sub", parts.join(" · ")));
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
    // a sideways-dragging control (the tab bar, the accent swatches, a range slider
    // like the interface scale) owns its own horizontal drag; it must not also flip tabs.
    if (e.target.closest && e.target.closest(".tabs, .swatches, input[type=range], [data-noswipe]")) { x0 = null; return; }
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
// map is the fallback (then only the native name is shown). Indonesian uses the ISO
// code "id"; Android reports the legacy "in", which is normalized on detection.
var LANG_ENDONYM = {
  ar: "العربية", cs: "Čeština", de: "Deutsch", en: "English", es: "Español",
  fa: "فارسی", fr: "Français", hi: "हिन्दी", id: "Bahasa Indonesia", it: "Italiano",
  ja: "日本語", ko: "한국어", nl: "Nederlands", pl: "Polski", pt: "Português",
  ru: "Русский", sv: "Svenska", th: "ไทย", tr: "Türkçe", uk: "Українська", vi: "Tiếng Việt", zh: "中文"
};
function currentUiLang() {
  var c = CFG.language;
  if (c && c !== "auto" && I18N.AVAILABLE.indexOf(c) >= 0) return c;
  var l = (navigator.language || "en").toLowerCase().slice(0, 2);
  if (l === "in") l = "id";
  return I18N.AVAILABLE.indexOf(l) >= 0 ? l : "en";
}
function capFirst(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function langDisplayName(code, inLocale) {
  try {
    if (typeof Intl !== "undefined" && Intl.DisplayNames) {
      var dnCode = code;
      var dnLocale = inLocale;
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
  if ($("#set-staging"))  $("#set-staging").value = CFG.staging_dir || "";
  if ($("#set-gpass")) {
    $("#set-gpass").value = "";
    helper("pass-status", {}).then(function (r) { var e = $("#set-gpass-state"); if (e) e.textContent = I18N.t((r && r.global) ? "settings_gpass_set" : "settings_gpass_unset"); }).catch(function () {});
    if ($("#set-gpass-clear")) $("#set-gpass-clear").onclick = function () { helper("pass-set-global", { password: "" }).then(function () { var e = $("#set-gpass-state"); if (e) e.textContent = I18N.t("settings_gpass_unset"); $("#set-gpass").value = ""; }); };
  }
  if ($("#set-enc-data")) $("#set-enc-data").checked = !!CFG.encrypt_data;
  if ($("#set-enc-apk"))  $("#set-enc-apk").checked = !!CFG.encrypt_apk;
  if ($("#set-ssaid"))    $("#set-ssaid").checked = !!CFG.ssaid;
  if ($("#set-app-netpolicy")) $("#set-app-netpolicy").checked = !!CFG.app_netpolicy;
  if ($("#set-mode"))     $("#set-mode").value = CFG.default_mode || "full";
  if ($("#set-netpolicy")) $("#set-netpolicy").value = CFG.network_policy || "any";
  if ($("#set-auto"))     $("#set-auto").checked = !!CFG.auto_backup;
  if ($("#set-auto-keep")) $("#set-auto-keep").value = CFG.auto_backup_keep || 5;
  if ($("#set-thermal"))  $("#set-thermal").checked = (CFG.thermal_throttle !== false);
  if ($("#set-space-preflight")) $("#set-space-preflight").checked = (CFG.space_preflight !== false);
  if ($("#set-local-copy")) $("#set-local-copy").checked = (CFG.local_copy === true);
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
  var _prevLang = CFG.language;
  CFG.compression = $("#set-comp").value;
  CFG.encrypt_data = $("#set-enc-data").checked;
  CFG.encrypt_apk = $("#set-enc-apk").checked;
  CFG.ssaid = $("#set-ssaid").checked;
  CFG.app_netpolicy = $("#set-app-netpolicy").checked;
  CFG.default_mode = $("#set-mode").value;
  CFG.default_dest = $("#set-dest").value;
  if ($("#set-staging")) CFG.staging_dir = $("#set-staging").value.trim();
  if ($("#set-gpass") && $("#set-gpass").value) { helper("pass-set-global", { password: $("#set-gpass").value }).then(function () { var e = $("#set-gpass-state"); if (e) e.textContent = I18N.t("settings_gpass_set"); }); $("#set-gpass").value = ""; }
  if ($("#set-netpolicy")) CFG.network_policy = $("#set-netpolicy").value;
  if ($("#set-auto")) CFG.auto_backup = $("#set-auto").checked;
  if ($("#set-auto-keep")) CFG.auto_backup_keep = parseInt($("#set-auto-keep").value, 10) || 5;
  if ($("#set-thermal")) CFG.thermal_throttle = $("#set-thermal").checked;
  if ($("#set-space-preflight")) CFG.space_preflight = $("#set-space-preflight").checked;
  if ($("#set-local-copy")) CFG.local_copy = $("#set-local-copy").checked;
  if ($("#set-spoof")) CFG.spoof_installer = $("#set-spoof").checked;
  CFG.language = $("#set-lang").value;
  helper("config-set", CFG).then(function (r) {
    $("#set-status").textContent = (r && r.ok !== false) ? I18N.t("saved") : errMsg(r);
    // Only re-init i18n when the language actually changed; auto-save fires on every field, and
    // re-rendering the whole UI on each toggle would be jarring (and lose focus).
    if (CFG.language !== _prevLang) {
      I18N.init(CFG.language || "auto").then(function () {
        I18N.apply(); buildLangOptions();
        // Re-render the app list so dynamically-built labels (e.g. the per-app "Back up"
        // button, created with I18N.t at render time) pick up the new language too (issue #12).
        if (typeof renderApps === "function") renderApps($("#search") ? $("#search").value : "");
      });
    }
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
  // importing a settings bundle overwrites config + jobs + destinations + saved credentials:
  // an explicit, dismissible confirmation before the (decryption) password step.
  modalConfirm(I18N.t("msg_config_import_confirm", { name: ex.name }), I18N.t("settings_config_import")).then(function (yes) {
    if (!yes) return;
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
// persist CFG; surface a failure instead of letting the in-memory toggle silently diverge from disk
function saveCfg() { helper("config-set", CFG).then(function (r) { if (r && r.ok === false) modalAlert(errMsg(r)); }).catch(function () { modalAlert(errMsg()); }); }
function persistBlocklist() { saveCfg(); }
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
  saveCfg();
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
  var ne = $("#ai-note"); if (ne) ne.value = appNote(pkg);
  if ($("#ai-pass")) {
    $("#ai-pass").value = "";
    helper("pass-status", { package: pkg }).then(function (r) { var e = $("#ai-pass-state"); if (e) e.textContent = I18N.t((r && r.app) ? "settings_gpass_set" : "settings_gpass_unset"); }).catch(function () {});
    if ($("#ai-pass-clear")) $("#ai-pass-clear").onclick = function () { helper("pass-set-app", { package: pkg, password: "" }).then(function () { var e = $("#ai-pass-state"); if (e) e.textContent = I18N.t("settings_gpass_unset"); $("#ai-pass").value = ""; }); };
  }
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
// Per-app free-text note (package -> string), like Neo-Backup's app Note. Client-side in CFG.
function appNote(pkg) { return (CFG.app_note || {})[pkg] || ""; }
function setAppNote(pkg, note) {
  CFG.app_note = CFG.app_note || {};
  note = (note || "").trim();
  if (!note) delete CFG.app_note[pkg]; else CFG.app_note[pkg] = note;
  saveCfg();
}
function allTags() {   // only tags carried by a currently-listed app, so uninstalled /
  var set = {};         // other-user packages never ghost into the filter dropdown
  APPS.forEach(function (a) { appTags(a.package).forEach(function (t) { set[t] = 1; }); });
  return Object.keys(set).sort(function (a, b) { return a.toLowerCase().localeCompare(b.toLowerCase()); });
}
function setAppTagList(pkg, tags) {
  CFG.app_tags = CFG.app_tags || {};
  if (!tags || !tags.length) delete CFG.app_tags[pkg]; else CFG.app_tags[pkg] = tags;
  saveCfg();
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
    box.appendChild(tagChip(t, function () { removeAppTag(pkg, t); buildAiTags(); buildTagChips(); renderApps($("#search").value); }));
  });
}
var tagFilters = [];
function tagActive(t) { return tagFilters.indexOf(t) >= 0; }
function toggleTagFilter(t) {
  var i = tagFilters.indexOf(t);
  if (i < 0) tagFilters.push(t); else tagFilters.splice(i, 1);
  buildTagChips(); renderApps($("#search").value);
}
function buildTagChips() {   // tap-to-toggle filter chips (multi-select, OR); renderApps owns the button
  var box = $("#app-tag-chips"); if (!box) return;
  var ts = allTags();
  tagFilters = tagFilters.filter(function (t) { return ts.indexOf(t) >= 0; });   // drop a filter whose tag is gone
  box.innerHTML = "";
  if (!ts.length) { box.hidden = true; return; }
  ts.forEach(function (t) {
    var c = el("button", "tag-filter-chip" + (tagActive(t) ? " on" : ""), t);
    c.type = "button"; c.onclick = function () { toggleTagFilter(t); };
    box.appendChild(c);
  });
  box.hidden = false;
}
// the apps a tag backup would act on: respects the user/system filter, ignores the search box
function tagFilterApps() { return tagFilters.length ? visibleApps("") : []; }
function startTagBackup() {
  var pkgs = tagFilterApps().map(function (a) { return a.package; });
  if (!pkgs.length) return;
  openBackupModal(I18N.t("ui_tag_backup_title", { tag: tagFilters.join(", "), n: pkgs.length }), "").then(function (res) {
    if (!res) return;
    setSelectMode(false);
    runBatchBackup(pkgs, res);
  });
}

// --- backup presets (named item-sets; create in Settings, apply in the backup dialog) --
// Store is CFG.presets = [{id,name,items[]}]. No worker change: a preset just pre-fills the
// item checkboxes of the backup dialog, which already drives the per-op items.
function persistPresets() { saveCfg(); }
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
  loadAdbBackups();
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
      else modalAlert(errMsg(r));
    }).catch(function () { modalAlert(errMsg()); });
  };
  if (enc) openOpModal({ needPassword: true, titleKey: "backup", confirmKey: "backup",
                         msg: I18N.t("special_pass_msg") }).then(function (res) { if (res != null) go(res.password); });
  else go(null);
}
function openSpecialRestore(bk) {
  var m = $("#special-modal"), ack = $("#special-ack"), ok = $("#special-ok"), pass = $("#special-pass");
  var err = $("#special-err"), ackRow = $("#special-ack-row");
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
  err.textContent = ""; ackRow.classList.remove("needsack");
  ack.onchange = function () { if (ack.checked) { err.textContent = ""; ackRow.classList.remove("needsack"); } };
  m.hidden = false;
  $("#special-cancel").onclick = function () { m.hidden = true; };
  $("#special-delete").onclick = function () {
    modalConfirm(I18N.t("confirm_delete_backup"), I18N.t("delete")).then(function (yes) {
      if (!yes) return;
      helper("delete-backup", { ref: bk.ref }).then(function () { m.hidden = true; loadSpecial(); });
    });
  };
  ok.onclick = function () {
    if (!ack.checked) {   // data-loss confirmation required: tell the user instead of doing nothing
      err.textContent = I18N.t("msg_overwrite_ack_required");
      ackRow.classList.add("needsack");
      try { ack.focus(); } catch (e) {}
      return;
    }
    var cats = Array.prototype.map.call(box.querySelectorAll("input:checked"), function (c) { return c.dataset.cat; });
    var ssOn = hasSS && ssCb.checked;
    if (ssOn) cats.push("system_settings");
    var args = { ref: bk.ref, confirm: true, categories: cats };
    if (ssOn) args.system_settings = true;   // opt-in: only sent when explicitly enabled
    if (pass.value) args.password = pass.value;
    m.hidden = true;
    helper("special-restore", args).then(function (r) {
      if (r && r.opid) trackOp(r.opid, { specialRef: bk.ref, specialCats: cats, specialSysset: ssOn });
      else modalAlert(errMsg(r));
    }).catch(function () { modalAlert(errMsg()); });
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

// --- /data/adb filesystem backup (lazy tree picker) ------------------------
// Pick a subtree of /data/adb to back up or restore. The tree is lazy: one level per expand, from
// adb-list for a backup or from the stored index for a restore. Selection is tri-state - a fully
// checked folder is sent as one path (tar recurses); unchecking a child turns its folder partial
// and we descend, so .paths alone expresses any selection and no exclude list is needed.
var ADB = null, _adbSeq = 0;
function adbFmtSize(b) {
  b = +b || 0; if (!b) return "";
  var u = ["B", "KB", "MB", "GB", "TB"], i = 0;
  while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
  return (i ? b.toFixed(1) : b) + u[i];   // 1 decimal (KB+), no space: 324B, 15.6KB, 184.3MB, 1.2GB
}
function adbIcon(t) { return t === "dir" ? "📁" : t === "link" ? "🔗" : "📄"; }
function adbMkNode(e, parent) {
  var pp = parent ? parent.path : "";
  return { name: e.name, path: (pp ? pp + "/" : "") + e.name, type: e.type, size: e.size || 0,
    hasKids: !!e.has_children, depth: parent ? parent.depth + 1 : 0, parent: parent || null,
    state: parent ? parent.state : 0, expanded: false, loaded: false, children: [],
    sizeKnown: e.type !== "dir" };
}
function adbShow() {
  var m = $("#adb-modal"); $("#adb-filter").value = ""; $("#adb-selinfo").textContent = "";
  $("#adb-tree").innerHTML = "<div class='adb-busy'>" + I18N.t("ui_adb_loading") + "</div>";
  $("#adb-total").checked = false; m.hidden = false;
}
function adbHide() { $("#adb-modal").hidden = true; ADB = null; }
function adbHelperList(path, cb) {
  helper("adb-list", { path: path }).then(function (r) {
    if (!r || r.ok === false) { modalAlert(errMsg(r)); cb([]); return; }
    cb(r.entries || []);
  }).catch(function () { cb([]); });
}
function adbOpenBackup() {
  ADB = { mode: "backup", nodes: [], seq: ++_adbSeq };
  $("#adb-title").textContent = I18N.t("ui_adb_opts_title");
  $("#adb-sub").textContent = I18N.t("ui_adb_pick");
  $("#adb-bkopts").hidden = false; $("#adb-restwarn").hidden = true;
  fillDestOptions($("#adb-dest"), CFG.default_dest);
  var enc = $("#adb-enc"); enc.checked = !!CFG.encrypt_data;
  $("#adb-comp").value = CFG.compression || "zstd:10";
  $("#adb-pass").hidden = !enc.checked; $("#adb-pass").value = "";
  enc.onchange = function () { $("#adb-pass").hidden = !enc.checked; };
  $("#adb-ok").textContent = I18N.t("ui_adb_do");
  adbShow();
  var _s = ADB.seq;
  adbHelperList("/data/adb", function (entries) {
    if (!ADB || ADB.seq !== _s) return;   // modal closed/reopened while loading
    ADB.nodes = entries.map(function (e) { return adbMkNode(e, null); });
    adbRender();
  });
}
function adbOpenRestore(bk) {
  ADB = { mode: "restore", nodes: [], ref: bk.ref, enc: !!(bk.encryption && bk.encryption !== "none"), idx: {}, seq: ++_adbSeq };
  $("#adb-title").textContent = I18N.t("ui_adb_restore_title");
  $("#adb-sub").textContent = I18N.t("ui_adb_restore_pick");
  $("#adb-bkopts").hidden = true; $("#adb-restwarn").hidden = false;
  $("#adb-pass").hidden = !ADB.enc; $("#adb-pass").value = "";
  $("#adb-ok").textContent = I18N.t("restore");
  adbShow();
  var _s = ADB.seq;
  helper("adb-index", { ref: bk.ref }).then(function (r) {
    if (!ADB || ADB.seq !== _s) return;   // a later open supersedes this one (never cross backups)
    if (!r || r.ok === false) { modalAlert(errMsg(r)); adbHide(); return; }
    var parsed = adbParseIndex(r.lines || []);
    ADB.idx = parsed.map; ADB.dirs = parsed.dirs;
    ADB.nodes = adbIdxLevel("", null);
    adbRender();
  });
}
function adbParseIndex(lines) {
  var map = Object.create(null), dirs = Object.create(null);   // null-proto: a file named "constructor"/"__proto__" must not collide
  lines.forEach(function (ln) {
    var m = ln.match(/^([dl-])\S*\s+\S+\s+(\d+)\s+\S+\s+\S+\s+(.*)$/);
    if (!m) return;
    var type = m[1] === "d" ? "dir" : m[1] === "l" ? "link" : "file";
    var p = m[3]; if (type === "link") p = p.replace(/ -> .*$/, "");
    p = p.replace(/\/+$/, "");
    // reject absolute + a real `..` SEGMENT (not a substring like foo..bar); the backend validates too
    if (!p || p.charAt(0) === "/" || ("/" + p + "/").indexOf("/../") >= 0) return;
    map[p] = { type: type, size: +m[2] || 0 };
    for (var i = p.indexOf("/"); i >= 0; i = p.indexOf("/", i + 1)) dirs[p.slice(0, i)] = true;   // every ancestor is a parent dir (O(1) hasKids)
  });
  return { map: map, dirs: dirs };
}
function adbIdxLevel(prefix, parent) {
  var pre = prefix ? prefix + "/" : "", seen = Object.create(null), out = [];
  Object.keys(ADB.idx).forEach(function (p) {
    if (pre && p.indexOf(pre) !== 0) return;
    var name = p.slice(pre.length).split("/")[0];
    if (!name || seen[name]) return; seen[name] = 1;
    var full = pre + name, info = ADB.idx[full] || { type: "dir", size: 0 };
    var hasKids = info.type === "dir" && !!ADB.dirs[full];
    out.push({ name: name, path: full, type: info.type, size: info.size, hasKids: hasKids,
      depth: parent ? parent.depth + 1 : 0, parent: parent || null,
      state: parent ? parent.state : 0, expanded: false, loaded: false, children: [], sizeKnown: true });
  });
  return out;
}
function adbLoadChildren(node, cb) {
  if (node.loaded) { cb(); return; }
  if (ADB.mode === "restore") {
    node.children = adbIdxLevel(node.path, node); node.loaded = true; cb();
  } else {
    var _s = ADB.seq;
    adbHelperList("/data/adb/" + node.path, function (entries) {
      if (!ADB || ADB.seq !== _s) return;   // stale: modal closed/reopened mid-load
      node.children = entries.map(function (e) { return adbMkNode(e, node); }); node.loaded = true; cb();
    });
  }
}
function adbMatch(n, f) {
  if (!f) return true;
  if (n.name.toLowerCase().indexOf(f) >= 0) return true;
  return n.loaded && n.children.some(function (c) { return adbMatch(c, f); });
}
function adbRender() {
  var box = $("#adb-tree"); box.innerHTML = "";
  var f = ($("#adb-filter").value || "").toLowerCase().trim();
  (function walk(nodes) {
    nodes.forEach(function (n) {
      if (!adbMatch(n, f)) return;
      box.appendChild(adbRowEl(n));
      // while filtering, descend into loaded children too, so a match in a collapsed-but-loaded
      // folder is actually revealed (not just its parent shown)
      if ((n.expanded || f) && n.children.length) walk(n.children);
    });
  })(ADB.nodes);
  if (!box.firstChild) box.innerHTML = "<div class='adb-busy'>" + I18N.t("ui_adb_nothing") + "</div>";
  adbUpdateSel();
}
function adbRowEl(n) {
  var row = el("div", "adb-row"); row.style.paddingLeft = (10 + n.depth * 16) + "px";
  var branch = n.type === "dir" && n.hasKids;
  var tw = el("span", "adb-twisty" + (branch ? "" : " leaf"), n.expanded ? "▾" : "▸");
  if (branch) tw.onclick = function (e) { e.stopPropagation(); adbToggle(n); };
  var cb = el("input", "adb-cb"); cb.type = "checkbox";
  cb.checked = n.state === 1; cb.indeterminate = n.state === 2;
  cb.onclick = function (e) { e.stopPropagation(); adbSet(n, cb.checked); };
  var nm = el("span", "adb-name", n.name); nm.title = n.name; if (branch) nm.onclick = function () { adbToggle(n); };
  var sz = el("span", "adb-size", n.sizeKnown ? adbFmtSize(n.size) : "");
  row.appendChild(tw); row.appendChild(cb); row.appendChild(el("span", "adb-ic", adbIcon(n.type)));
  row.appendChild(nm); row.appendChild(sz);
  if (n.type === "dir" && !n.sizeKnown && ADB.mode === "backup") {
    n.sizeKnown = true;
    helper("adb-du", { path: "/data/adb/" + n.path }).then(function (r) {
      if (r && r.size != null) { n.size = r.size; if (sz.isConnected) sz.textContent = adbFmtSize(r.size); }
    }).catch(function () {});
  }
  return row;
}
function adbToggle(n) {
  if (n.expanded) { n.expanded = false; adbRender(); return; }
  if (n.loaded) { n.expanded = true; adbRender(); return; }
  if (n.loading) return;   // a second tap before children arrive must not fire adb-list twice
  n.loading = true;
  adbLoadChildren(n, function () {
    n.loading = false;
    if (n.state === 1) n.children.forEach(function (c) { adbSetDown(c, 1); });
    n.expanded = true; adbRender();
  });
}
function adbSetDown(n, s) { n.state = s; if (n.loaded) n.children.forEach(function (c) { adbSetDown(c, s); }); }
function adbUp(n) {
  while (n) {
    var all = n.children.length > 0 && n.children.every(function (c) { return c.state === 1; });
    var none = n.children.every(function (c) { return c.state === 0; });
    n.state = all ? 1 : (none ? 0 : 2); n = n.parent;
  }
}
function adbSet(n, checked) {
  adbSetDown(n, checked ? 1 : 0); adbUp(n.parent);
  $("#adb-total").checked = ADB.nodes.length > 0 && ADB.nodes.every(function (x) { return x.state === 1; });
  adbRender();
}
function adbTotalToggle() {
  var on = $("#adb-total").checked;
  ADB.nodes.forEach(function (n) { adbSetDown(n, on ? 1 : 0); });
  adbRender();
}
function adbSelPaths() {
  var out = [];
  (function walk(nodes) {
    nodes.forEach(function (n) {
      if (n.state === 1) out.push(n.path);
      else if (n.state === 2 && n.loaded) walk(n.children);
    });
  })(ADB.nodes);
  return out;
}
function adbUpdateSel() {
  var total = $("#adb-total").checked, paths = total ? [] : adbSelPaths(), info = $("#adb-selinfo");
  info.textContent = total ? I18N.t("ui_adb_sel_all")
    : (paths.length ? I18N.t("ui_adb_sel_n", { n: paths.length }) : I18N.t("ui_adb_sel_none"));
  $("#adb-ok").disabled = !total && !paths.length;
}
function adbSubmit() {
  var total = $("#adb-total").checked, paths = total ? [] : adbSelPaths();
  if (!total && !paths.length) return;
  if (ADB.mode === "backup") {
    var enc = $("#adb-enc").checked, pass = $("#adb-pass").value;
    if (enc && !pass) { $("#adb-pass").focus(); return; }
    var a = { compression: $("#adb-comp").value, encrypt_data: enc };
    var _ds = $("#adb-dest"); if (_ds && _ds.value) a.dest = _ds.value;
    if (!total) a.paths = paths;
    if (enc) a.password = pass;
    adbHide(); $("#adb-pass").value = "";
    helper("adb-backup", a).then(function (r) {
      if (r && r.opid) trackOp(r.opid, { onDone: loadAdbBackups }); else modalAlert(errMsg(r));
    });
  } else {
    var p2 = ADB.enc ? $("#adb-pass").value : null;
    if (ADB.enc && !p2) { $("#adb-pass").focus(); return; }
    var a2 = { ref: ADB.ref, confirm: true };
    if (!total) a2.paths = paths;
    if (p2) a2.password = p2;
    adbHide(); $("#adb-pass").value = "";
    helper("adb-restore", a2).then(function (r) {
      a2.password = "";
      if (r && r.opid) trackOp(r.opid, { onDone: function () { loadAdbBackups(); modalAlert(I18N.t("ui_adb_restore_reboot")); } }); else modalAlert(errMsg(r));
    });
  }
}
function loadAdbBackups() {
  helper("adb-backups", {}).then(function (out) {
    renderAdbBackups(out && out.backups ? out.backups : []);
  }).catch(function () { renderAdbBackups([]); });
}
function renderAdbBackups(list) {
  var ul = $("#adbbk-list"); if (!ul) return; ul.innerHTML = "";
  $("#adbbk-empty").hidden = !!(list && list.length);
  (list || []).forEach(function (bk) {
    var li = el("li", "row"), grow = el("div", "grow");
    grow.appendChild(el("div", "badge", I18N.t("ui_adb_badge")));
    var what = bk.mode === "selective" && bk.paths && bk.paths.length ? bk.paths.join(", ") : I18N.t("ui_adb_sel_all");
    grow.appendChild(el("div", "name", what));
    grow.appendChild(el("div", "sub", shortDate(bk.created_at)));
    var btn = el("button", "btn go small", I18N.t("restore"));
    btn.onclick = function () { adbOpenRestore(bk); };
    var del = el("button", "btn danger small", I18N.t("delete"));
    del.onclick = function () { deleteBackup(bk.ref, loadAdbBackups); };
    li.appendChild(grow); li.appendChild(btn); li.appendChild(del);
    ul.appendChild(li);
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
// The update check is a NETWORK call (it fetches the published manifest). The root manager's
// exec bridge serializes shell calls, so running it inline on load let a slow or unreachable
// network hold the queue for the whole timeout and freeze the app list, icons and navigation
// (they all go through the same bridge). So it runs DEFERRED, once the UI is idle, and with a
// short timeout; a finished or failed check only ever raises the "update available" banner,
// never blocks. (issue: WebUI froze on bad internet while icons were loading.)
function deferredUpdateCheck() {
  if (window.requestIdleCallback) requestIdleCallback(autoCheckUpdates, { timeout: 6000 });
  else setTimeout(autoCheckUpdates, 4000);
}
function autoCheckUpdates() {
  var now = Date.now(), last = 0;
  try { last = parseInt(localStorage.getItem("vdb_update_last_check"), 10) || 0; } catch (e) {}
  if (now - last < UPDATE_CHECK_THROTTLE_MS) return;
  try { localStorage.setItem("vdb_update_last_check", String(now)); } catch (e) {}
  helper("update-check", { timeout: 8 }).then(function (r) {
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
  $("#search").oninput = debounce(function () { renderApps($("#search").value); }, 120);
  $("#app-filter").onchange = function () { renderApps($("#search").value); };
  $("#app-sort").onchange = function () { renderApps($("#search").value); };
  if ($("#app-backuptag")) $("#app-backuptag").onclick = startTagBackup;
  $("#app-select").onclick = function () { setSelectMode(!selectMode); };
  $("#app-selall").onclick = function () { visibleApps($("#search").value).forEach(function (a) { selected[a.package] = { package: a.package, label: a.label }; }); updateSelCount(); renderApps($("#search").value); };
  $("#app-selnone").onclick = function () { selected = {}; updateSelCount(); renderApps($("#search").value); };
  $("#app-backupsel").onclick = startBatchBackup;
  $("#bk-select").onclick = function () { setBkSelectMode(!bkSelectMode); };
  if ($("#bk-search")) $("#bk-search").oninput = debounce(function () { bkQuery = $("#bk-search").value; renderBackups(BACKUPS); }, 120);
  $("#bk-selall").onclick = function () { (BACKUPS || []).forEach(function (b) { bkSelected[b.ref] = { ref: b.ref, package: b.package, items: b.items }; }); updateBkSelCount(); renderBackups(BACKUPS); };
  $("#bk-selnone").onclick = function () { bkSelected = {}; updateBkSelCount(); renderBackups(BACKUPS); };
  $("#bk-restoresel").onclick = startBatchRestore;
  if ($("#tg-backups-open")) $("#tg-backups-open").onclick = openTelegramBackups;
  if ($("#rc-backups-open")) $("#rc-backups-open").onclick = openRcloneBackups;
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
    if ($("#ai-note")) setAppNote(_aiPkg, $("#ai-note").value);
    if ($("#ai-pass") && $("#ai-pass").value) { helper("pass-set-app", { package: _aiPkg, password: $("#ai-pass").value }); $("#ai-pass").value = ""; }
    setAppItems(_aiPkg, items); closeAppItemsModal(); buildAppItemsPicker(); renderApps($("#search") ? $("#search").value : "");
  };
  if ($("#appitems-clear")) $("#appitems-clear").onclick = function () {
    if (_aiPkg) setAppItems(_aiPkg, null);
    closeAppItemsModal(); buildAppItemsPicker();
  };
  if ($("#appitems-cancel")) $("#appitems-cancel").onclick = closeAppItemsModal;
  var _aiTagCommit = function () {
    var ti = $("#ai-tag-input"); if (!ti || !_aiPkg) return;
    addAppTag(_aiPkg, ti.value); ti.value = ""; ti.focus();
    buildAiTags(); buildTagChips(); renderApps($("#search").value);
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
  // Auto-save: persist every Settings control the moment it changes (the app-pickers already did),
  // removing the deferred-Save island where toggling a field and leaving silently lost it. Scoped to
  // the set-* controls (pickers self-save); debounced for fast-firing selects. The Save button stays
  // as a harmless manual trigger.
  if ($("#settings")) {
    var _setSaveT;
    $("#settings").addEventListener("change", function (e) {
      if (!e.target || !/^set-/.test(e.target.id || "")) return;
      clearTimeout(_setSaveT); _setSaveT = setTimeout(saveSettings, 250);
    });
  }
  if ($("#cfg-export")) $("#cfg-export").onclick = exportConfig;
  if ($("#cfg-import")) $("#cfg-import").onclick = importConfig;
  if ($("#cfg-wipe")) $("#cfg-wipe").onclick = wipeCredentials;
  $("#d-save").onclick = addDest;
  $("#d-type").onchange = syncDestFields;
  if ($("#d-add-remote")) $("#d-add-remote").onclick = focusAddRemote;
  $("#d-browse").onclick = function () { openDirPicker("#d-path"); };
  $("#pb-browse").onclick = function () { openDirPicker("#pb-path"); };
  $("#pb-backup").onclick = openPathBackup;
  if ($("#adb-backup-open")) {
    $("#adb-backup-open").onclick = adbOpenBackup;
    $("#adb-cancel").onclick = adbHide;
    $("#adb-ok").onclick = adbSubmit;
    $("#adb-total").onchange = adbTotalToggle;
    $("#adb-filter").oninput = function () { if (ADB) adbRender(); };
  }
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
  initVdlu();   // VDLU: evaluate reboot banner + auto_on_webui_open on load (panel mounts on tab open)

  helper("config-get").then(function (c) { CFG = c || {}; activeUser = (CFG.user != null) ? (CFG.user | 0) : 0; return I18N.init(CFG.language || "auto"); })
    .then(function () { I18N.apply(); loadDests(); loadSettings(); loadUsers(); loadOverview(); reattachOps(); recoverPendingAuth(); deferredUpdateCheck(); });

  helper("ping").then(function (r) {
    if (r && r.version) { $("#ver").textContent = r.version; if ($("#about-ver")) $("#about-ver").textContent = r.version + " - " + (r.abi || ""); }
  });

  // self-heal backup-folder perms once per load (fire-and-forget, never blocks the UI).
  helper("sanitize").catch(function () {});
}
document.addEventListener("DOMContentLoaded", boot);
