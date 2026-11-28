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
 *  New interface: Restore > Apps shows every backup from every source in one
 *  list with filter chips. The engine still renders the local rows (select,
 *  info, restore); this file adds the remote rows, source badges, filters and
 *  sorting, and restores a remote backup with the engine's own verbs.
 */
"use strict";

var NX_RS = (function () {
  var F = { src: "all", type: "", enc: false, pin: false, tag: "", sort: "new" };
  var SVG = "http://www.w3.org/2000/svg";

  function $id(i) { return document.getElementById(i); }
  function icon(id) {
    var s = document.createElementNS(SVG, "svg"); s.setAttribute("class", "i");
    var u = document.createElementNS(SVG, "use"); u.setAttribute("href", "#" + id);
    s.appendChild(u); return s;
  }
  function srcName(id) {
    var s = NX_SRC.get(id);
    return id === "local" ? I18N.t("nx_src_local") : (s ? s.name : id);
  }
  function modeName(m) { return I18N.t(m === "snapshot" ? "nx_f_snapshot" : m === "mirror" ? "nx_f_mirror" : "nx_f_full"); }
  function dateOf(ms) { return ms ? shortDate(new Date(ms).toISOString()) : ""; }
  function keyOf(b) {
    var p = String(b.ref || "").split("/");
    return b.mode === "mirror" ? "m:local:" + b.package : b.package + "/" + (p.length > 1 ? p[p.length - 1] : "");
  }

  // ---- filter chips ----
  function chip(text, on, fn, extra) {
    var b = el("button", "nx-fchip" + (on ? " on" : ""));
    b.type = "button"; b.setAttribute("aria-pressed", on ? "true" : "false");
    b.appendChild(el("bdi", null, text));
    if (extra) b.appendChild(extra);
    b.onclick = fn; return b;
  }
  function set(k, v) { F[k] = v; draw(); }
  function drawChips(items) {
    var row = $id("nx-rs-src"), flt = $id("nx-rs-flt"); if (!row || !flt) return;
    row.innerHTML = ""; flt.innerHTML = "";
    var srcs = NX_SRC.list();
    row.hidden = srcs.length < 2;
    row.appendChild(chip(I18N.t("nx_src_all"), F.src === "all", function () { set("src", "all"); }));
    srcs.forEach(function (s) {
      var n = items.filter(function (x) { return x.in.indexOf(s.id) >= 0; }).length, ex = null;
      if (s.state === "loading") ex = el("span", "spinner nx-chip-spin");
      else if (s.state === "err") { ex = el("span", "nx-chip-warn"); ex.appendChild(icon("i-warn")); }
      else ex = el("span", "nx-cnt", String(n));
      row.appendChild(chip(srcName(s.id), F.src === s.id, function () { set("src", F.src === s.id ? "all" : s.id); }, ex));
    });
    var has = {}, tags = {};
    items.forEach(function (x) {
      has[x.e.mode] = 1; if (x.e.enc) has.enc = 1; if (x.e.pinned) has.pin = 1;
      ((x.e.b && x.e.b.tags) || []).forEach(function (t) { tags[t] = 1; });
    });
    ["full", "snapshot", "mirror"].forEach(function (m) {
      if (has[m] || F.type === m) flt.appendChild(chip(modeName(m), F.type === m, function () { set("type", F.type === m ? "" : m); }));
    });
    if (has.enc || F.enc) flt.appendChild(chip(I18N.t("info_encrypted"), F.enc, function () { set("enc", !F.enc); }));
    if (has.pin || F.pin) flt.appendChild(chip(I18N.t("nx_f_pinned"), F.pin, function () { set("pin", !F.pin); }));
    Object.keys(tags).sort().forEach(function (t) {
      flt.appendChild(chip("#" + t, F.tag === t, function () { set("tag", F.tag === t ? "" : t); }));
    });
    var sel = el("select", "nx-fsel"); sel.setAttribute("aria-label", I18N.t("opt_sort_name"));
    [["new", "nx_sort_new"], ["old", "nx_sort_old"], ["name", "opt_sort_name"], ["size", "nx_sort_size"]].forEach(function (o) {
      var op = document.createElement("option"); op.value = o[0]; op.textContent = I18N.t(o[1]); sel.appendChild(op);
    });
    sel.value = F.sort; sel.onchange = function () { set("sort", sel.value); };
    flt.appendChild(sel);
  }
  function drawStatus() {
    var box = $id("nx-rs-status"); if (!box) return;
    box.innerHTML = "";
    NX_SRC.list().forEach(function (s) {
      if (s.state !== "err" || (F.src !== "all" && F.src !== s.id)) return;
      var n = el("div", "notice nx-srcerr"), t = el("span", "grow");
      if (s.err === "login") t.textContent = I18N.t("nx_src_login");
      else { t.appendChild(el("bdi", null, srcName(s.id))); t.appendChild(document.createTextNode(": " + s.err)); }
      var b = el("button", "btn small", I18N.t(s.err === "login" ? "nx_src_signin" : "nx_retry")); b.type = "button";
      b.onclick = s.err === "login"
        ? function () { openTelegramLogin().then(function (ok) { if (ok) NX_SRC.reload(s.id); }); }
        : function () { NX_SRC.reload(s.id); };
      n.appendChild(t); n.appendChild(b); box.appendChild(n);
    });
  }

  // ---- rows ----
  function badges(x) {
    var row = el("div", "nx-srcs");
    x.in.forEach(function (id) { row.appendChild(el("span", "badge" + (id === "local" ? "" : " info"), srcName(id))); });
    if (x.e.mode !== "full") row.appendChild(el("span", "badge warn", modeName(x.e.mode)));
    return row;
  }
  function remoteRow(x) {
    var e = x.e, li = el("li", "row tappable nx-remote");
    if (!e.label) e.label = NX_SRC.label(e.package);
    var name = e.label || e.package;
    var ic = el("div", "app-ic", name.charAt(0).toUpperCase());
    var app = APPS.filter(function (a) { return a.package === e.package; })[0];
    if (app) { ic.dataset.pkg = e.package; ic.dataset.vc = app.versionCode != null ? String(app.versionCode) : "0"; loadIcon(ic); }
    var g = el("div", "grow");
    var nm = el("div", "name", name); nm.dir = "auto"; g.appendChild(nm);
    if (e.label) g.appendChild(el("div", "pkg", e.package));
    var bits = [dateOf(e.when)], sub = el("div", "sub");
    if (x.size) bits.push(fmtSize(x.size));
    if (e.vc && e.vc !== "0") bits.push("v" + e.vc);
    bits.filter(Boolean).forEach(function (t, i) { if (i) sub.appendChild(document.createTextNode(" \u00b7 ")); sub.appendChild(el("bdi", null, t)); });
    g.appendChild(sub);
    g.appendChild(badges(x));
    li.appendChild(ic); li.appendChild(g);
    if (!bkSelectMode) {
      var btn = el("button", "btn go", I18N.t("restore")); btn.type = "button";
      btn.onclick = function (ev) { ev.stopPropagation(); restore(e); };
      li.appendChild(btn);
    }
    li.onclick = function () { sheet(x); };
    return li;
  }

  function match(x) {
    var e = x.e;
    if (F.src !== "all" && x.in.indexOf(F.src) < 0) return false;
    if (F.type && e.mode !== F.type) return false;
    if (F.enc && !e.enc) return false;
    if (F.pin && !e.pinned) return false;
    if (F.tag && ((e.b && e.b.tags) || []).indexOf(F.tag) < 0) return false;
    return true;
  }
  function cmp(a, b) {
    if (F.sort === "old") return (a.e.when || 0) - (b.e.when || 0);
    if (F.sort === "name") return (a.e.label || a.e.package).localeCompare(b.e.label || b.e.package);
    if (F.sort === "size") return (b.size || 0) - (a.size || 0);
    return (b.e.when || 0) - (a.e.when || 0);
  }

  // the engine just rendered the local rows: remember which backup each row is
  function adopt() {
    var ul = $id("backuplist"); if (!ul) return;
    var q = (bkQuery || "").toLowerCase().trim();
    var shown = q ? BACKUPS.filter(function (b) { return bkMatch(b, q); }) : BACKUPS;
    var i = 0;
    Array.prototype.forEach.call(ul.children, function (li) { if (!li.classList.contains("nx-remote") && !li._nxb) li._nxb = shown[i++]; });
  }

  function draw() {
    var ul = $id("backuplist"); if (!ul) return;
    var q = (bkQuery || "").toLowerCase().trim();
    var all = NX_SRC.all(), byKey = {};
    all.forEach(function (x) { byKey[x.e.key] = x; });
    Array.prototype.slice.call(ul.querySelectorAll(".nx-remote")).forEach(function (r) { ul.removeChild(r); });
    var rows = [];
    Array.prototype.forEach.call(ul.children, function (li) {
      var b = li._nxb; if (!b) return;
      var x = byKey[keyOf(b)] || { e: { mode: b.mode || "full", package: b.package, label: b.label, when: NX_SRC.when(b.created_at), b: b }, in: ["local"], size: 0 };
      var g = li.querySelector(".grow"), old = g && g.querySelector(".nx-srcs");
      if (old) g.removeChild(old);
      if (g) g.appendChild(badges(x));
      rows.push({ li: li, x: x });
    });
    all.forEach(function (x) {
      if (x.in[0] === "local" || bkSelectMode) return;   // batch restore / delete take local backups only
      if (q && !bkMatch({ package: x.e.package, label: x.e.label }, q)) return;
      rows.push({ li: remoteRow(x), x: x });
    });
    drawChips(rows.map(function (r) { return r.x; }));
    drawStatus();
    rows.sort(function (a, b) { return cmp(a.x, b.x); });
    var vis = 0;
    rows.forEach(function (r) { var on = match(r.x); r.li.hidden = !on; if (on) vis++; ul.appendChild(r.li); });
    var loading = NX_SRC.list().some(function (s) { return s.state === "loading"; });
    var empty = $id("backups-empty"), none = $id("nx-rs-nomatch");
    if (empty) empty.style.display = (rows.length || loading || q) ? "none" : "";
    if (none) none.hidden = !(rows.length && !vis);
  }

  // ---- remote actions ----
  function pull(e, thenRestore) {
    var req = e.kind === "telegram" ? helper("telegram-pull", { message_id: e.raw.message_id, name: e.raw.name })
      : e.kind === "gdrive" ? helper("gdrive-pull", { dest: e.src, rref: e.raw.rref, folder: e.raw.folder })
      : helper("rclone-pull", { dest: e.src, rref: e.raw.rref });
    req.then(function (op) {
      if (!op || !op.opid) { modalAlert(errMsg(op)); return; }
      trackOp(op.opid, { retry: function () { pull(e, thenRestore); }, onDone: function (p) {
        if (!p.ok) return;
        helper("list-backups").then(function (r) {
          renderBackups(r && r.backups ? r.backups : []);
          if (!thenRestore) { modalAlert(I18N.t(e.kind === "telegram" ? "msg_tg_pulled" : "msg_rc_pulled")); return; }
          var b = BACKUPS.filter(function (x) { return x.package === e.package && keyOf(x) === e.key; })[0];
          if (b) startRestore(b.ref, b.package, b.items, b.mode, b.dest);
        });
      } });
    }).catch(function () { modalAlert(errMsg()); });
  }
  function restore(e) {
    if (e.mode === "mirror") { startRestore("", e.package, null, "mirror", e.src); return; }
    if (e.kind !== "restic") { pull(e, true); return; }
    openOpModal({ overwriteAck: true, allowTest: true, allowSpoof: true, titleKey: "restore", confirmKey: "restore",
                  msg: I18N.t("confirm_restore", { name: e.label || e.package }) }).then(function (res) {
      if (res == null) return;
      var args = { mode: "snapshot", dest: e.src, package: e.package, snapshot: e.id, ssaid: res.ssaid, netpolicy: res.netpolicy,
                   test: res.test, spoof_installer: res.spoof_installer, deep_spoof: res.deep_spoof };
      var ctx = { restorePkg: e.package };
      ctx.retry = function () { helper("restore", args).then(function (r) { if (r && r.opid) trackOp(r.opid, ctx); else modalAlert(errMsg(r)); }).catch(function () { modalAlert(errMsg()); }); };
      ctx.retry();
    });
  }
  function del(e, done) {
    var tg = e.kind === "telegram";
    modalConfirmAction(I18N.t(tg ? "msg_tg_delete_confirm" : "msg_rc_delete_confirm"), I18N.t("delete"), function () {
      return tg ? helper("telegram-delete", { message_id: e.raw.message_id })
        : e.kind === "gdrive" ? helper("gdrive-delete", { dest: e.src, folder: e.raw.folder })
        : helper("rclone-delete", { dest: e.src, rref: e.raw.rref });
    }).then(function (r) {
      if (r === null) return;
      if (r && r.ok) { done(); NX_SRC.reload(e.src); } else modalAlert(errMsg(r));
    });
  }
  function sheet(x) {
    var m = $id("nx-rs-modal"), e = x.e; if (!m) return;
    $id("nx-rs-title").textContent = e.label || e.package;
    var body = $id("nx-rs-body"); body.innerHTML = "";
    [[I18N.t("nx_rs_where"), x.in.map(srcName).join(", ")], [I18N.t("info_mode"), modeName(e.mode)],
     [I18N.t("info_date"), dateOf(e.when)], [I18N.t("info_size"), x.size ? fmtSize(x.size) : ""],
     [I18N.t("info_version"), e.vc && e.vc !== "0" ? e.vc : ""], [I18N.t("info_package"), e.package]].forEach(function (kv) {
      if (!kv[1]) return;
      var r = el("div", "kv"); r.appendChild(el("span", "k", kv[0])); r.appendChild(el("span", "v", kv[1])); body.appendChild(r);
    });
    var close = function () { m.hidden = true; };
    $id("nx-rs-close").onclick = close;
    $id("nx-rs-restore").onclick = function () { close(); restore(e); };
    var dl = $id("nx-rs-pull"), rm = $id("nx-rs-delete"), full = e.mode === "full" && e.kind !== "restic";
    dl.hidden = !full; dl.onclick = function () { close(); pull(e, false); };
    rm.hidden = !full; rm.onclick = function () { del(e, close); };
    m.hidden = false;
  }

  function show(src) { F.src = src || "all"; F.type = ""; F.enc = false; F.pin = false; F.tag = ""; draw(); }

  if (typeof renderBackups === "function") {
    var render = renderBackups;
    window.renderBackups = function (list) {
      render(list);
      adopt();
      NX_SRC.setLocal(BACKUPS);
    };
  }
  // each source reports loading, then its list: redraw once per frame, not once per report
  var queued = false;
  NX_SRC.on(function () {
    if (queued) return; queued = true;
    requestAnimationFrame(function () { queued = false; draw(); });
  });

  // an op card leaves the bar when its op ends: backups may have changed on any source, so
  // reload now when Restore is on screen (any other visit reloads through switchTab)
  var opsBox = $id("ops");
  if (opsBox) new MutationObserver(function (recs) {
    if (!recs.some(function (r) { return r.removedNodes.length; })) return;
    NX_SRC.stale();
    var p = $id("backups");
    if (p && p.classList.contains("active")) { loadBackups(); NX_SRC.load(false); }
  }).observe(opsBox, { childList: true });

  // Select > All takes the rows on screen: the engine's version also picked backups the
  // filter chips hide, which a batch delete would then remove unseen
  document.addEventListener("DOMContentLoaded", function () {
    var all = $id("bk-selall"); if (!all) return;
    all.onclick = function () {
      Array.prototype.forEach.call($id("backuplist").children, function (li) {
        var b = li._nxb;
        if (b && !li.hidden && b.mode !== "mirror") bkSelected[b.ref] = { ref: b.ref, package: b.package, items: b.items };
      });
      updateBkSelCount(); renderBackups(BACKUPS);
    };
  });
  return { draw: draw, show: show };
})();
