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
 *  New interface: fast start. The bridge runs one exec at a time, so the
 *  small calls the engine makes on load (config, version, users, overview,
 *  recent activity, running ops, destinations) are answered by ONE helper
 *  "bootstrap" exec. Lists (apps, backups, schedules) render at once from
 *  the last good copy in localStorage and are refreshed in the background;
 *  the screen is redrawn only when the fresh data differs.
 */
"use strict";

var NX_BOOT = (function () {
  var KEY = "vdb_nx_cache_v1", MAX = 512 * 1024;
  var BOOT = { "config-get": 1, "ping": 1, "list-users": 1, "overview": 1, "log-read": 1, "list-ops": 1, "dests-list": 1 };
  var CACHED = { "list-apps": 1, "list-backups": 1, "schedule-list": 1 };
  var cache = {}, served = {}, boot = null, real = window.helper;

  try { cache = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { cache = {}; }
  function store(verb, txt) {
    if (txt.length > MAX) { delete cache[verb]; } else cache[verb] = txt;
    try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) { cache = {}; try { localStorage.removeItem(KEY); } catch (x) {} }
  }
  // args the boot calls are made with; anything else goes to the real verb
  function plain(verb, args) {
    if (verb === "overview") return !args || (args.user | 0) === 0;
    if (verb === "log-read") return !!args && args.limit === 4;
    return args === undefined;
  }
  function bootstrap() {
    if (!boot) boot = real("bootstrap").then(function (r) {
      if (!r || !r.ok || !r["config-get"]) return null;
      store("bootstrap", JSON.stringify({ overview: r.overview, ping: r.ping }));
      return r;
    }, function () { return null; });
    return boot;
  }
  // what to redraw when a cached list turned out stale
  var APPLY = {
    "list-apps": function (r) {
      APPS = (r && r.apps) ? r.apps : [];
      buildTagChips(); renderApps($("#search").value); buildBlockPicker(); buildAppItemsPicker();
    },
    "list-backups": function (r) { renderBackups(r && r.backups ? r.backups : []); },
    "schedule-list": function (r) { renderJobs(r && r.jobs ? r.jobs : []); }
  };

  window.helper = function (verb, args, raw) {
    if (BOOT[verb] && !served[verb] && plain(verb, args)) {
      served[verb] = 1;
      return bootstrap().then(function (r) { return r ? r[verb] : real(verb, args, raw); });
    }
    if (CACHED[verb] && !served[verb] && (verb !== "list-apps" || (args && (args.user | 0) === 0))) {
      served[verb] = 1;
      var fresh = real(verb, args, raw);
      if (!cache[verb]) return fresh.then(function (r) { store(verb, JSON.stringify(r)); return r; });
      var old = cache[verb];
      fresh.then(function (r) {
        var txt = JSON.stringify(r);
        if (!r || r.ok === false || txt === old) return;
        store(verb, txt);
        setTimeout(function () { try { APPLY[verb](r); } catch (e) {} }, 0);
      });
      return Promise.resolve(JSON.parse(old));
    }
    if (CACHED[verb]) {
      return real(verb, args, raw).then(function (r) { if (r && r.ok !== false && (verb !== "list-apps" || (args && (args.user | 0) === 0))) store(verb, JSON.stringify(r)); return r; });
    }
    return real(verb, args, raw);
  };

  // first open ever: skeletons sized like the content until the data lands
  if (!cache["list-apps"]) document.documentElement.classList.add("nx-skel");
  function unskel() { document.documentElement.classList.remove("nx-skel"); }
  setTimeout(unskel, 15000);

  return {
    done: unskel,
    ready: function () { return bootstrap(); },
    last: function (verb) { try { return cache[verb] ? JSON.parse(cache[verb]) : null; } catch (e) { return null; } }
  };
})();

// config-set deep-merges onto the stored config, so a key the engine drops from a per-app map
// (the last tag of an app, a cleared note, items back to everything) came back on the next
// load. Such a key is sent as null, which the merge does store and every reader treats as unset.
(function () {
  var MAPS = ["app_items", "app_tags", "app_note"], stored = {}, real = window.helper;
  function keep(c) {
    MAPS.forEach(function (m) {
      if (!c || !c[m] || typeof c[m] !== "object") return;
      stored[m] = {};
      Object.keys(c[m]).forEach(function (k) { if (c[m][k] != null) stored[m][k] = 1; });
    });
  }
  window.helper = function (verb, args, raw) {
    if (verb === "config-get") return real(verb, args, raw).then(function (r) { keep(r); return r; });
    if (verb !== "config-set" || raw || !args || typeof args !== "object") return real(verb, args, raw);
    var out = {};
    Object.keys(args).forEach(function (k) { out[k] = args[k]; });
    MAPS.forEach(function (m) {
      var cur = args[m]; if (!cur || typeof cur !== "object" || !stored[m]) return;
      var o = {};
      Object.keys(cur).forEach(function (k) { o[k] = cur[k]; });
      Object.keys(stored[m]).forEach(function (k) { if (o[k] == null) o[k] = null; });
      out[m] = o;
    });
    return real(verb, out, raw).then(function (r) { if (r && r.ok !== false) keep(args); return r; });
  };
})();

// A tap on a button that starts an op at once (a remote row's Restore, System data's Back up)
// sent a second op when tapped twice before the first answer: the same op request while one
// is in flight now shares its answer, so both taps track the one op.
(function () {
  var OPS = /^(backup|backup-batch|restore|restore-batch|import|special-backup|special-restore|cloud-fetch|path-backup|path-restore|adb-backup|adb-restore|config-export|config-import|telegram-pull|rclone-pull|gdrive-pull)$/;
  var flying = {}, real = window.helper;
  window.helper = function (verb, args, raw) {
    if (!OPS.test(verb)) return real(verb, args, raw);
    var k = verb + " " + (raw ? String(args) : JSON.stringify(args));
    if (flying[k]) return flying[k];
    var p = flying[k] = real(verb, args, raw);
    var done = function () { delete flying[k]; };
    p.then(done, done);
    return p;
  };
})();
