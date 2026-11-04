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

function switchTab(name) {
  document.querySelectorAll(".tab").forEach(function (t) { t.classList.toggle("active", t.dataset.tab === name); });
  document.querySelectorAll(".panel").forEach(function (p) { p.classList.toggle("active", p.id === name); });
  if (name === "backups") { loadBackups(); loadSpecial(); }
  if (name === "dests") loadDests();
  if (name === "settings") loadSettings();
  if (name === "schedule") loadSchedule();
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
function visibleApps(filter) {
  var q = (filter || "").toLowerCase(), f = appFilter();
  var list = APPS.filter(function (a) {
    if (f === "user" && a.system) return false;
    if (f === "system" && !a.system) return false;
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
    renderApps($("#search").value);
  });
}

// --- backups ------------------------------------------------------------
function renderBackups(list) {
  var ul = $("#backuplist"); ul.innerHTML = "";
  $("#backups-empty").style.display = (list && list.length) ? "none" : "";
  (list || []).forEach(function (b) {
    var li = el("li", "row tappable");
    var ic = el("div", "app-ic", (b.label || b.package).charAt(0).toUpperCase());
    var grow = el("div", "grow");
    grow.appendChild(el("div", "name", b.label || b.package));
    grow.appendChild(el("div", "pkg", b.package));
    grow.appendChild(el("div", "sub", shortDate(b.created_at)));
    var btn = el("button", "btn go", I18N.t("restore"));
    btn.onclick = function (e) { e.stopPropagation(); startRestore(b.ref, b.package, b.items); };
    li.appendChild(ic); li.appendChild(grow); li.appendChild(btn);
    li.onclick = function () { openBackupInfo(b); };
    ul.appendChild(li);
    loadBackupIcon(ic, b.ref);   // icon comes from the manifest, not the live app
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
      [I18N.t("info_mode"), r.mode],
      [I18N.t("info_user"), r.user_id],
      [I18N.t("info_size"), fmtSize(r.size)],
      [I18N.t("info_items"), (r.items || []).map(function (it) { return it.type; }).join(", ")],
      [I18N.t("info_perms"), (r.permissions ? (r.permissions.granted + "/" + r.permissions.runtime) : "")],
      [I18N.t("info_appops"), r.permissions && r.permissions.appops],
      [I18N.t("info_ssaid"), I18N.t(r.permissions && r.permissions.ssaid ? "info_yes" : "info_no")],
      [I18N.t("info_device"), r.device && r.device.fingerprint],
      ["SDK / ABI", (r.device && r.device.sdk) + " / " + (r.device && r.device.abi)],
      ["SELinux / root", (r.device && r.device.selinux) + " / " + (r.device && r.device.root)]
    ];
    body.innerHTML = "";
    rows.forEach(function (kv) {
      if (kv[1] == null || kv[1] === "") return;
      var row = el("div", "kv");
      row.appendChild(el("span", "k", kv[0]));
      row.appendChild(el("span", "v", String(kv[1])));
      body.appendChild(row);
    });
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
  var u = ["B", "KB", "MB", "GB"], i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return (i === 0 ? n : n.toFixed(1)) + " " + u[i];
}
function loadBackups() {
  helper("list-backups").then(function (r) { renderBackups(r && r.backups ? r.backups : []); });
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
    helper("restore", args).then(function (r) {
      if (r && r.opid) trackOp(r.opid, { restoreRef: ref, restorePkg: pkg, ssaid: res.ssaid, items: res.items, test: res.test, spoof_installer: res.spoof_installer, deep_spoof: res.deep_spoof });
    });
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
    var sub = (b.package || "") + (b.encrypted ? "  -  " + I18N.t("ui_import_encrypted") : "");
    grow.appendChild(el("div", "pkg", sub));
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
      okBtn.disabled = false; ackRow.hidden = true; ack.onchange = null; itemsBox.hidden = true; itemsBox.innerHTML = "";
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
function syncRemoteFields() {
  var be = $("#r-backend").value;
  var set = function (sel, on) { var e = $(sel); if (e) e.style.display = on ? "" : "none"; };
  var hostlike = (be === "sftp" || be === "smb" || be === "ftp");
  set("#r-host", hostlike);
  set("#r-port", hostlike);
  set("#r-url", be === "webdav");
  set("#r-vendor", be === "webdav");
  set("#r-user", hostlike || be === "webdav");
  set("#r-pass", hostlike || be === "webdav");
  set("#r-akey", be === "s3");
  set("#r-skey", be === "s3");
  set("#r-endpoint", be === "s3");
  set("#r-region", be === "s3");
  set("#r-token", be === "drive");
  set("#r-drive-hint", be === "drive");
}
function addRemote() {
  var name = $("#r-name").value.trim();
  var be = $("#r-backend").value;
  if (!name) return;
  var p = {};
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
  } else if (be === "drive") {
    p.scope = "drive"; p.token = $("#r-token").value.trim();
  }
  helper("remote-add", { name: name, backend: be, params: p }).then(function (r) {
    if (r && r.ok) {
      $("#r-name").value = ""; $("#r-pass").value = ""; $("#r-skey").value = ""; $("#r-token").value = "";
      loadRemotes();
    } else { modalAlert(errMsg(r)); }
  });
}
function delRemote(name) {
  modalConfirm(I18N.t("confirm_delete", { name: name })).then(function (ok) {
    if (!ok) return;
    helper("remote-del", { name: name }).then(loadRemotes);
  });
}
function fillDestSelect() {
  var sel = $("#set-dest"); if (!sel) return; sel.innerHTML = "";
  var o0 = document.createElement("option"); o0.value = "local"; o0.textContent = "local"; sel.appendChild(o0);
  DESTS.forEach(function (d) {
    if (d.id === "local") return;
    var o = document.createElement("option"); o.value = d.id; o.textContent = d.id; sel.appendChild(o);
  });
  sel.value = CFG.default_dest || "local";
}
function syncDestFields() {
  var type = $("#d-type").value;
  var set = function (sel, on) { var e = $(sel); if (e) e.style.display = on ? "" : "none"; };
  set("#d-remote", type === "rclone");
  set("#d-repo", type === "restic");
  set("#d-pass", type === "restic");
  set("#d-path", type !== "restic");
  set("#d-browse", type === "local");   // folder browser only makes sense for a local path
  set("#remote-box", type === "rclone");
}
// folder browser for a local destination path (confined to shared storage)
var _dirCur = "/storage/emulated/0";
function openDirPicker() {
  var m = $("#dir-modal"); m.hidden = false;
  var start = $("#d-path").value;
  loadDir((start && start.charAt(0) === "/") ? start : "/storage/emulated/0");
  $("#dir-cancel").onclick = function () { m.hidden = true; };
  $("#dir-use").onclick = function () { $("#d-path").value = _dirCur; m.hidden = true; };
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
  helper("dest-add", d).then(function () {
    $("#d-id").value = ""; $("#d-pass").value = ""; loadDests();
    if (type === "gdrive") setupGdrive(d.id);
  });
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
      done({ items: items, password: enc ? pass.value : null,
             verify: $("#bi-verify").checked, dry_run: $("#bi-dryrun").checked });
    };
    $("#backup-cancel").onclick = function () { done(null); };
  });
}
function backupArgs(pkg, res) {
  var args = {
    package: pkg, user: activeUser,
    mode: CFG.default_mode || "full", dest: CFG.default_dest || "local",
    items: res.items, ssaid: !!CFG.ssaid, verify: res.verify, dry_run: res.dry_run
  };
  if (res.password) args.password = res.password;
  return args;
}
function startBackup(pkg, label) {
  openBackupModal(pkg, label).then(function (res) {
    if (!res) return;
    var args = backupArgs(pkg, res);
    helper("backup", args).then(function (r) {
      args.password = "";
      if (r && r.opid) trackOp(r.opid);
    });
  });
}
// batch: one modal (items/verify/pass apply to all), then back up each in turn.
function startBatchBackup() {
  var pkgs = Object.keys(selected);
  if (!pkgs.length) return;
  openBackupModal(I18N.t("ui_selected_n", { n: pkgs.length }), "").then(function (res) {
    if (!res) return;
    setSelectMode(false);
    runBatch(pkgs.slice(), res);
  });
}
function runBatch(queue, res) {
  if (!queue.length) return;
  var pkg = queue.shift();
  var args = backupArgs(pkg, res);
  helper("backup", args).then(function (r) {
    args.password = "";
    if (r && r.opid) trackOp(r.opid, { onDone: function () { runBatch(queue, res); } });
    else runBatch(queue, res);
  });
}
function phaseLabel(ph) {
  if (!ph) return "";
  var key = "phase_" + String(ph).replace(/-/g, "_");
  var tr = I18N.t(key);
  return tr === key ? ph : tr;   // fall back to the raw phase if untranslated
}
function trackOp(opid, ctx) {
  var box = $("#ops"); box.hidden = false;
  box.innerHTML = "";
  var label = el("div", null, I18N.t("op_running"));
  var bar = el("div", "bar"); var fill = el("i"); bar.appendChild(fill);
  box.appendChild(label); box.appendChild(bar);
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
            helper("special-restore", { ref: ctx.specialRef, confirm: true, categories: ctx.specialCats, password: res.password }).then(function (r) {
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
        label.textContent = p.ok ? I18N.t("op_done") : errMsg(p);
        if (ctx && ctx.onDone) ctx.onDone();   // chain the next batch item
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
function loadSchedule() {
  // build the (potentially large) app picker once, off-DOM, and only when the app
  // set changes - rebuilding hundreds of <option>s on every tab open janked the UI.
  var app = $("#job-app"), key = activeUser + ":" + APPS.length;
  if (app && app._key !== key) {
    app._key = key;
    var frag = document.createDocumentFragment();
    visibleApps("").forEach(function (a) {
      var o = document.createElement("option"); o.value = a.package;
      o.textContent = (a.label || a.package) + " (" + a.package + ")"; frag.appendChild(o);
    });
    app.innerHTML = ""; app.appendChild(frag);
  }
  var dest = $("#job-dest");
  if (dest) {
    dest.innerHTML = "";
    var o0 = document.createElement("option"); o0.value = "local"; o0.textContent = "local"; dest.appendChild(o0);
    DESTS.forEach(function (d) { if (d.id === "local") return; var o = document.createElement("option"); o.value = d.id; o.textContent = d.id; dest.appendChild(o); });
  }
  helper("schedule-list").then(function (r) { renderJobs(r && r.jobs ? r.jobs : []); });
}
function renderJobs(jobs) {
  var ul = $("#joblist"); ul.innerHTML = "";
  $("#jobs-empty").hidden = !!(jobs && jobs.length);
  (jobs || []).forEach(function (j) {
    var li = el("li", "row"), grow = el("div", "grow");
    grow.appendChild(el("div", "name", j.package));
    var when = j.cron + (j.at ? " " + j.at : "");
    var last = j.last_run ? shortDate(new Date(j.last_run * 1000).toISOString()) : I18N.t("job_never");
    grow.appendChild(el("div", "sub", when + " - " + j.mode + " - " + I18N.t("job_keep_n", { n: j.keep }) + " - " + I18N.t("job_last", { when: last })));
    var del = el("button", "btn danger small", I18N.t("delete"));
    del.onclick = function () { delJob(j.id); };
    li.appendChild(grow); li.appendChild(del); ul.appendChild(li);
  });
}
function saveJob() {
  var pkg = $("#job-app").value;
  if (!pkg) { $("#job-status").textContent = I18N.t("job_need_app"); return; }
  var job = {
    id: "job-" + pkg, package: pkg, user: activeUser,
    cron: $("#job-cron").value, at: $("#job-at").value || null,
    mode: $("#job-mode").value, dest: $("#job-dest").value,
    keep: parseInt($("#job-keep").value, 10) || 5,
    items: ["apk", "data", "data_de", "obb", "external", "media"]
  };
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

// --- activity log (audit trail) -----------------------------------------
function openLog() {
  var m = $("#log-modal"), ul = $("#log-list");
  ul.innerHTML = "<li class='muted'>" + I18N.t("apps_loading") + "</li>";
  $("#log-empty").hidden = true;
  m.hidden = false;
  $("#log-close").onclick = function () { m.hidden = true; };
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
function loadSettings() {
  var sel = $("#set-lang");
  if (sel && !sel.options.length) {
    ["auto"].concat(I18N.AVAILABLE).forEach(function (c) {
      var o = document.createElement("option"); o.value = c; o.textContent = c; sel.appendChild(o);
    });
  }
  if ($("#set-comp"))     $("#set-comp").value = CFG.compression || "zstd:10";
  if ($("#set-enc-data")) $("#set-enc-data").checked = !!CFG.encrypt_data;
  if ($("#set-enc-apk"))  $("#set-enc-apk").checked = !!CFG.encrypt_apk;
  if ($("#set-ssaid"))    $("#set-ssaid").checked = !!CFG.ssaid;
  if ($("#set-mode"))     $("#set-mode").value = CFG.default_mode || "full";
  if ($("#set-netpolicy")) $("#set-netpolicy").value = CFG.network_policy || "any";
  if ($("#set-auto"))     $("#set-auto").checked = !!CFG.auto_backup;
  if ($("#set-auto-keep")) $("#set-auto-keep").value = CFG.auto_backup_keep || 5;
  if ($("#set-spoof"))    $("#set-spoof").checked = (CFG.spoof_installer !== false);
  renderBlocklist();
  fillDestSelect();
  if (sel)                sel.value = CFG.language || "auto";
  if ($("#set-theme"))    $("#set-theme").value = getTheme();
  buildAccentSwatches();
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
    I18N.init(CFG.language || "auto").then(function () { I18N.apply(); });
  });
}

// --- blocklist (apps excluded from auto/scheduled backups) ---------------
function renderBlocklist() {
  var ul = $("#blocklist"); if (!ul) return; ul.innerHTML = "";
  var bl = CFG.blocklist || [];
  bl.forEach(function (pkg) {
    var li = el("li", "row"), grow = el("div", "grow");
    var a = APPS.filter(function (x) { return x.package === pkg; })[0];
    grow.appendChild(el("div", "name", (a && a.label) || pkg));
    grow.appendChild(el("div", "pkg", pkg));
    var x = el("button", "btn danger small", I18N.t("ui_block_remove"));
    x.onclick = function () { removeBlock(pkg); };
    li.appendChild(grow); li.appendChild(x); ul.appendChild(li);
  });
  var sel = $("#block-app"); if (sel) {
    sel.innerHTML = "";
    visibleApps("").filter(function (a) { return bl.indexOf(a.package) < 0; }).forEach(function (a) {
      var o = document.createElement("option"); o.value = a.package;
      o.textContent = (a.label || a.package) + " (" + a.package + ")"; sel.appendChild(o);
    });
  }
}
function persistBlocklist() { helper("config-set", CFG).then(function () {}); }
function addBlock() {
  var pkg = $("#block-app").value; if (!pkg) return;
  CFG.blocklist = CFG.blocklist || [];
  if (CFG.blocklist.indexOf(pkg) < 0) { CFG.blocklist.push(pkg); persistBlocklist(); renderBlocklist(); }
}
function removeBlock(pkg) {
  CFG.blocklist = (CFG.blocklist || []).filter(function (p) { return p !== pkg; });
  persistBlocklist(); renderBlocklist();
}

// --- special (system-wide) backups --------------------------------------
var SPECIAL_CATS = [];
function loadSpecial() {
  helper("special-categories").then(function (r) {
    SPECIAL_CATS = (r && r.categories) ? r.categories : [];
    var box = $("#special-cats"); box.innerHTML = "";
    SPECIAL_CATS.forEach(function (c) {
      var lab = document.createElement("label"), cb = document.createElement("input");
      cb.type = "checkbox"; cb.dataset.cat = c.id; cb.checked = !!c.available; cb.disabled = !c.available;
      var sp = el("span", null, I18N.t("special_cat_" + c.id));
      if (sp.textContent === "special_cat_" + c.id) sp.textContent = c.id;
      lab.appendChild(cb); lab.appendChild(sp); box.appendChild(lab);
    });
  });
  helper("special-list").then(function (r) { renderSpecialList(r && r.backups ? r.backups : []); });
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
  if (!cats.length) return;
  var args = { categories: cats, mode: "full", dest: "local", portable: $("#special-portable").checked };
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
  (bk.categories || []).forEach(function (c) {
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
    var args = { ref: bk.ref, confirm: true, categories: cats };
    if (pass.value) args.password = pass.value;
    m.hidden = true;
    helper("special-restore", args).then(function (r) {
      if (r && r.opid) trackOp(r.opid, { specialRef: bk.ref, specialCats: cats });
    });
  };
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
  ACCENTS.forEach(function (c) {
    var b = el("button", "swatch"); b.style.background = c; b.title = c; b.type = "button";
    b.onclick = function () { applyAccent(c); };
    box.appendChild(b);
  });
  var custom = document.createElement("input"); custom.type = "color"; custom.className = "swatch swatch-custom";
  custom.value = getAccent() || "#38bdf8";
  custom.oninput = function () { applyAccent(this.value); };
  box.appendChild(custom);
  var reset = el("button", "swatch swatch-reset", "×"); reset.type = "button";
  reset.title = "Default"; reset.onclick = function () { applyAccent(""); };
  box.appendChild(reset);
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

// --- boot ---------------------------------------------------------------
function boot() {
  applyTheme(getTheme());
  applyAccent(getAccent());
  document.querySelectorAll(".tab").forEach(function (t) {
    t.onclick = function () { navTab(t.dataset.tab); };
  });
  $("#refresh").onclick = loadApps;
  $("#search").oninput = function () { renderApps(this.value); };
  $("#app-filter").onchange = function () { renderApps($("#search").value); };
  $("#app-sort").onchange = function () { renderApps($("#search").value); };
  $("#app-select").onclick = function () { setSelectMode(!selectMode); };
  $("#app-selall").onclick = function () { visibleApps($("#search").value).forEach(function (a) { selected[a.package] = { package: a.package, label: a.label }; }); updateSelCount(); renderApps($("#search").value); };
  $("#app-selnone").onclick = function () { selected = {}; updateSelCount(); renderApps($("#search").value); };
  $("#app-backupsel").onclick = startBatchBackup;
  $("#job-save").onclick = saveJob;
  $("#log-open").onclick = openLog;
  $("#block-add").onclick = addBlock;
  $("#special-backup").onclick = startSpecialBackup;
  if ($("#prov-open")) $("#prov-open").onclick = openProvenance;
  $("#user-sel").onchange = function () { activeUser = this.value | 0; CFG.user = activeUser; loadApps(); };
  $("#set-save").onclick = saveSettings;
  $("#d-save").onclick = addDest;
  $("#d-type").onchange = syncDestFields;
  $("#d-browse").onclick = openDirPicker;
  $("#r-save").onclick = addRemote;
  $("#r-backend").onchange = syncRemoteFields;
  syncDestFields();
  syncRemoteFields();
  $("#companion-hma-add").onclick = openHmaList;
  $("#companion-hma-dismiss").onclick = function () { $("#companion-hma").hidden = true; };
  $("#import-scan").onclick = scanImports;
  $("#theme-btn").onclick = function () {
    applyTheme(effectiveTheme() === "light" ? "dark" : "light");
    if ($("#set-theme")) $("#set-theme").value = getTheme();
  };
  if ($("#set-theme")) $("#set-theme").onchange = function () { applyTheme(this.value); };
  setupSwipe();
  setupBackNav();

  helper("config-get").then(function (c) { CFG = c || {}; activeUser = (CFG.user != null) ? (CFG.user | 0) : 0; return I18N.init(CFG.language || "auto"); })
    .then(function () { I18N.apply(); loadDests(); loadSettings(); loadUsers(); reattachOps(); });

  helper("ping").then(function (r) {
    if (r && r.version) { $("#ver").textContent = r.version; if ($("#about-ver")) $("#about-ver").textContent = r.version + " - " + (r.abi || ""); }
  });
}
document.addEventListener("DOMContentLoaded", boot);
