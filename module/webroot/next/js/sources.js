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
 *  New interface: every place backups live, as one normalized list. Local
 *  backups come from the engine's list-backups; each remote destination is
 *  listed lazily with the same verbs the Telegram / cloud restore dialogs use
 *  (telegram-list, rclone-list, gdrive-list) plus restic-list. Results are
 *  cached (memory + localStorage) so Home and Restore show them at once.
 */
"use strict";

var NX_SRC = (function () {
  var TTL = 5 * 60 * 1000, CACHE = "vdb_nx_src";
  var src = {}, order = [], subs = [], destsAt = 0, localSize = null;

  function emit() { subs.forEach(function (f) { try { f(); } catch (e) {} }); }

  // "20261107T030000Z" (UTC) or an ISO / "YYYY-MM-DD hh:mm:ss" time -> ms
  function when(ts) {
    if (ts == null || ts === "") return 0;
    if (typeof ts === "number") return ts < 1e12 ? ts * 1000 : ts;
    var m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(ts);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
    var d = new Date(String(ts).replace(" ", "T"));
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }
  function tsvc(s) {   // "<ts>_<vc>" -> { ts, vc }
    var i = String(s || "").lastIndexOf("_");
    return i > 0 ? { ts: s.slice(0, i), vc: s.slice(i + 1) } : { ts: s || "", vc: "" };
  }
  function label(pkg) {
    var a = (typeof APPS !== "undefined" ? APPS : []).filter(function (x) { return x.package === pkg; })[0];
    if (a && a.label) return a.label;
    var b = (typeof BACKUPS !== "undefined" ? BACKUPS : []).filter(function (x) { return x.package === pkg && x.label; })[0];
    return b ? b.label : "";
  }

  function entry(s, o) {
    o.src = s.id; o.kind = s.kind;
    if (!o.label) o.label = label(o.package);
    o.key = o.mode === "mirror" ? "m:" + s.id + ":" + o.package : (o.tsvc ? o.package + "/" + o.tsvc : s.id + ":" + (o.id || o.name));
    return o;
  }
  function norm(s, r) {
    var list = (r && r.backups) ? r.backups : [];
    if (s.kind === "telegram") {
      // folder backups (<dir>.vdbf.tar, dir ending in its _<ts>) are listed by the Files restore pane
      s.files = list.filter(function (b) { return /\.vdbf\.tar$/.test(b.name || ""); }).map(function (b) {
        var dir = b.name.replace(/\.vdbf\.tar$/, ""), m = /_(\d{8}T\d{6}Z)$/.exec(dir);
        return { dir: dir, label: (b.meta && b.meta.label) || "", when: (m && when(m[1])) || when(b.date), size: Number(b.size) || 0, raw: b };
      });
      return list.filter(function (b) { return /\.vdb\.tar$/.test(b.name || ""); }).map(function (b) {
        var m = /^(.+)__(.+)\.vdb\.tar$/.exec(b.name), t = tsvc(m ? m[2] : "");
        return entry(s, { mode: "full", package: m ? m[1] : b.name, label: (b.meta && b.meta.label) || "", tsvc: m ? m[2] : "",
          when: when(t.ts) || when(b.date), size: Number(b.size) || 0, vc: t.vc, raw: b });
      });
    }
    if (s.kind === "restic") {
      return list.map(function (b) {
        return entry(s, { mode: "snapshot", package: b.package, id: b.id, when: when(b.time), size: Number(b.size) || 0, vc: "", raw: b });
      });
    }
    return list.map(function (b) {   // rclone / gdrive
      var mir = b.mode === "mirror", t = tsvc(b.tsvc);
      return entry(s, { mode: mir ? "mirror" : "full", package: b.package, tsvc: mir ? "" : b.tsvc,
        when: mir ? when(b.mtime) : when(t.ts), size: 0, vc: mir ? "" : t.vc, raw: b });
    });
  }

  function save() {
    var out = {};
    order.forEach(function (id) { var s = src[id]; if (s.kind !== "local" && s.state === "ok") out[id] = { at: s.at, items: s.items.concat(s.files || []).map(function (e) { return e.raw; }) }; });
    try { localStorage.setItem(CACHE, JSON.stringify(out)); } catch (e) {}
  }
  function restore(s) {
    var c = null;
    try { c = JSON.parse(localStorage.getItem(CACHE) || "{}")[s.id]; } catch (e) {}
    if (!c || !c.items) return;
    s.items = norm(s, { backups: c.items }); s.state = "ok"; s.at = 0;   // shown at once, refreshed in the background
  }

  function add(id, kind, name) {
    if (!src[id]) { src[id] = { id: id, kind: kind, name: name, state: "idle", items: [], err: "", at: 0 }; order.push(id); restore(src[id]); }
    src[id].keep = true;
  }
  function setDests(ds) {
    order.forEach(function (id) { src[id].keep = id === "local"; });
    add("local", "local", "");
    if (ds.some(function (d) { return d.type === "telegram"; })) add("telegram", "telegram", "Telegram");
    ds.forEach(function (d) { if (/^(rclone|gdrive|restic)$/.test(d.type)) add(d.id, d.type, d.id); });
    order = order.filter(function (id) { if (src[id].keep) return true; delete src[id]; return false; });
    destsAt = Date.now(); emit();
  }
  function loadDests() {
    return helper("dests-list").then(function (r) { setDests((r && r.dests) ? r.dests : []); });
  }
  // the engine reloads the destinations after an add or a delete: follow it at once, so Restore
  // neither keeps a deleted one (its rows and errors) nor misses a new one for minutes
  if (typeof renderDests === "function") {
    var drawDests = renderDests;
    window.renderDests = function (list) { drawDests(list); if (destsAt) setDests(list || []); };
  }

  function fetchOne(s) {
    s.state = "loading"; s.err = ""; emit();
    var p;
    if (s.kind === "telegram") p = helper("telegram-list");
    else if (s.kind === "restic") p = helper("restic-list", { dest: s.id });
    else p = helper(s.kind === "gdrive" ? "gdrive-list" : "rclone-list", { dest: s.id, mirrors: true });
    return p.then(function (r) {
      if (r && r.ok !== false) { s.items = norm(s, r); s.state = "ok"; s.at = Date.now(); save(); emit(); return; }
      if (s.kind !== "telegram") { fail(s, r); return; }
      return helper("telegram-check").then(function (c) { fail(s, (c && c.ok && c.is_auth) ? r : { code: "login" }); }, function () { fail(s, r); });
    }, function () { fail(s, null); });
  }
  function fail(s, r) { s.state = "err"; s.err = (r && r.code === "login") ? "login" : errMsg(r); s.at = Date.now(); emit(); }

  // load every remote source that is stale; force reloads all of them
  function load(force) {
    var p = (force || !destsAt || Date.now() - destsAt > TTL) ? loadDests() : Promise.resolve();
    return p.then(function () {
      var chain = Promise.resolve();
      order.forEach(function (id) {
        var s = src[id];
        if (s.kind === "local" || s.state === "loading") return;
        if (!force && s.at && Date.now() - s.at < TTL) return;
        chain = chain.then(function () { return fetchOne(s); });   // the bridge runs one exec at a time
      });
      return chain;
    }).catch(function () {});
  }
  function stale() { order.forEach(function (id) { src[id].at = 0; }); }   // reload each on its next load()
  function reload(id) { var s = src[id]; return s ? fetchOne(s) : Promise.resolve(); }

  // the engine's list-backups result (called from its renderBackups)
  function setLocal(list) {
    add("local", "local", "");
    var s = src.local;
    s.items = (list || []).map(function (b) {
      var parts = String(b.ref || "").split("/"), tv = parts.length > 1 ? parts.slice(-1)[0] : "";
      return { src: "local", kind: "local", mode: b.mode || "full", package: b.package, label: b.label || "",
        tsvc: b.mode === "mirror" ? "" : tv, key: b.mode === "mirror" ? "m:local:" + b.package : b.package + "/" + tv,
        when: when(b.created_at), size: Number(b.size) || 0, enc: !!b.encrypted, pinned: !!b.pinned, b: b };
    });
    s.state = "ok"; s.at = Date.now(); emit();
  }
  function setLocalSize(n) { localSize = Number(n) || 0; emit(); }

  // every backup once: a remote copy of a local backup (same package + timestamp) is
  // folded into the local entry's "in" list instead of counting twice
  function all() {
    var byKey = {}, out = [];
    order.forEach(function (id) {
      src[id].items.forEach(function (e) {
        var k = byKey[e.key];
        if (k) { if (k.in.indexOf(e.src) < 0) k.in.push(e.src); if (!k.size && e.size) k.size = e.size; return; }
        k = byKey[e.key] = { e: e, in: [e.src], size: e.size };
        out.push(k);
      });
    });
    return out;
  }
  function stats() {
    var list = all(), pk = {}, per = {};
    list.forEach(function (x) { pk[x.e.package] = 1; });
    order.forEach(function (id) {
      var s = src[id], size = 0;
      s.items.forEach(function (e) { size += e.size || 0; });
      per[id] = { n: s.items.length, size: id === "local" && localSize != null ? localSize : size, state: s.state };
    });
    return { backups: list.length, apps: Object.keys(pk).length, per: per,
      loading: order.some(function (id) { return src[id].state === "loading"; }) };
  }

  return {
    on: function (f) { subs.push(f); }, load: load, reload: reload, stale: stale, setLocal: setLocal, setLocalSize: setLocalSize,
    all: all, stats: stats, when: when,
    list: function () { return order.map(function (id) { return src[id]; }); },
    get: function (id) { return src[id]; },
    label: label
  };
})();
