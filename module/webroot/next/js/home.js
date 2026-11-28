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
 *  New interface Home: storage summary (filled by the engine's overview)
 *  and the latest activity-log entries (read-only, helper "log-read").
 */
"use strict";

var NX_HOME = (function () {
  var last = 0;
  var SVG = "http://www.w3.org/2000/svg";

  function icon(id) {
    var s = document.createElementNS(SVG, "svg"); s.setAttribute("class", "i");
    var u = document.createElementNS(SVG, "use"); u.setAttribute("href", "#" + id);
    s.appendChild(u); return s;
  }
  function kind(op) {
    op = String(op || "");
    if (/delete|prune|wipe|clear|reset/.test(op)) return ["del", "i-archive"];
    if (/restore|import|pull/.test(op)) return ["rs", "i-restore"];
    if (/backup|scheduler/.test(op)) return ["ok", "i-up"];
    return ["", "i-list"];
  }

  var lastEntries = null;
  function renderRecent(entries) {
    lastEntries = entries;
    var ul = document.getElementById("nx-recent"), empty = document.getElementById("nx-recent-empty");
    if (!ul) return;
    ul.innerHTML = "";
    entries.forEach(function (e) {
      var li = el("li", "row tappable"), k = kind(e.op);
      var dot = el("span", "nx-dot " + k[0]); dot.appendChild(icon(k[1]));
      var grow = el("div", "grow");
      grow.appendChild(el("div", "name", logLabel(e)));
      var detail = e.detail || e.ref || e.id || e.package || "";
      if (detail) grow.appendChild(el("div", "pkg", detail));
      li.appendChild(dot); li.appendChild(grow); li.appendChild(el("span", "when", shortDate(e.ts)));
      li.onclick = function () { navTab("log"); };
      ul.appendChild(li);
    });
    if (empty) empty.hidden = entries.length > 0;
  }

  function refresh(force) {
    var now = Date.now();
    if (!force && now - last < 15000) return;
    last = now;
    helper("log-read", { limit: 4 }).then(function (r) {
      renderRecent((r && r.entries) ? r.entries.slice(0, 4) : []);
    }).catch(function () {});
  }

  // the engine draws the bar and the line; Home adds the large figure and counts every source
  if (typeof renderStorage === "function") {
    var draw = renderStorage;
    window.renderStorage = function (used, free, total) {
      draw(used, free, total);
      if (window.NX_BOOT) NX_BOOT.done();
      if (window.NX_SRC) NX_SRC.setLocalSize(used);
      else { var n = document.getElementById("nx-used"); if (n) n.textContent = fmtSize(Number(used) || 0); }
    };
  }

  // counters and "where" rows from every source: local numbers at once, remote ones as they arrive
  function sources() {
    var st = NX_SRC.stats(), loc = st.per.local, total = 0, remote = false;
    Object.keys(st.per).forEach(function (id) { total += st.per[id].size || 0; if (id !== "local") remote = true; });
    var n = document.getElementById("nx-used"); if (n && (loc || remote)) n.textContent = fmtSize(total);
    if (loc && loc.state === "ok") {
      document.getElementById("ov-apps").textContent = st.apps;
      document.getElementById("ov-backups").textContent = st.backups;
    }
    document.querySelectorAll(".nx-stat").forEach(function (b, i) { b.classList.toggle("nx-loading", i < 2 && st.loading); });
    var ul = document.getElementById("nx-where"); if (!ul) return;
    ul.innerHTML = ""; ul.hidden = !remote;
    NX_SRC.list().forEach(function (s) {
      var p = st.per[s.id], li = el("li", "nx-where-r");
      li.appendChild(el("span", "nx-where-n", s.id === "local" ? I18N.t("nx_src_local") : s.name));
      var v = el("span", "nx-where-v");
      if (s.state === "loading" && !p.n) v.appendChild(el("span", "spinner nx-chip-spin"));
      else if (s.state === "err") { var w = el("span", "nx-chip-warn"); w.appendChild(icon("i-warn")); v.appendChild(w); }
      else [I18N.t("ui_tg_n_backups", { n: p.n }), p.size ? fmtSize(p.size) : ""].filter(Boolean).forEach(function (t, i) {
        if (i) v.appendChild(document.createTextNode(" \u00b7 ")); v.appendChild(el("bdi", null, t));
      });
      li.appendChild(v);
      li.onclick = function () { NX.go("backups:apps"); NX_RS.show(s.id); };
      ul.appendChild(li);
    });
  }
  if (window.NX_SRC) NX_SRC.on(sources);

  // the counters need the local list once; remote sources load lazily after it
  var localAsked = false;
  function loadSources() {
    if (!window.NX_SRC) return;
    if (!localAsked) {
      localAsked = true;
      helper("list-backups").then(function (r) { renderBackups(r && r.backups ? r.backups : []); NX_SRC.load(false); });
    } else NX_SRC.load(false);
  }

  // last known numbers on the first frame (language-neutral); the bootstrap answer replaces them
  function paintLast(b) {
    b = b || (window.NX_BOOT && NX_BOOT.last("bootstrap"));
    var o = b && b.overview, box = document.getElementById("overview");
    if (!o || o.ok === false || !box) return;
    document.getElementById("ov-apps").textContent = o.apps | 0;
    document.getElementById("ov-backups").textContent = o.instances | 0;
    document.getElementById("ov-folders").textContent = o.path_backups | 0;
    document.getElementById("ov-scheduled").textContent = o.jobs | 0;
    renderStorage(o.backups_size, o.free, o.total);
    if (b.ping && b.ping.version) document.getElementById("ver").textContent = b.ping.version;
    box.hidden = false;
  }

  document.addEventListener("DOMContentLoaded", function () {
    paintLast();
    if (window.NX_BOOT) NX_BOOT.ready().then(function (r) { if (r) paintLast(r); });
    // queued behind the boot calls (the bridge runs one exec at a time)
    setTimeout(function () { refresh(true); }, 0);
    setTimeout(loadSources, 1200);
  });

  return { show: function () { if (typeof loadOverview === "function") loadOverview(); refresh(false); loadSources(); },
    refresh: refresh, sources: loadSources,
    relabel: function () { if (lastEntries) renderRecent(lastEntries); if (window.NX_SRC) sources(); } };
})();
