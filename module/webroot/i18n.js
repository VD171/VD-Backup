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
window.I18N = (function () {
  var AVAILABLE = ["en","ar","cs","de","es","fa","fr","hi","id","it","ja",
                   "ko","nl","pl","pt","ru","sv","th","tr","uk","vi","zh"];
  var EN = window.__I18N_EN || {};
  var strings = Object.assign({}, EN);
  // localStorage cache (guarded: some WebViews disable it). Lets the last-used language paint on
  // the first frame instead of flashing English until the (slow, root) config-get + fetch resolve.
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function t(key, vars) {
    var s = strings[key] != null ? strings[key] : (EN[key] != null ? EN[key] : key);
    if (vars) for (var k in vars) s = s.split("${" + k + "}").join(vars[k]);
    return s;
  }
  function apply(root) {
    root = root || document;
    root.querySelectorAll("[data-i18n]").forEach(function (e) {
      e.textContent = t(e.getAttribute("data-i18n"));
    });
    root.querySelectorAll("[data-i18n-ph]").forEach(function (e) {
      e.setAttribute("placeholder", t(e.getAttribute("data-i18n-ph")));
    });
  }
  var RTL = { ar: 1, fa: 1 };
  // set the document language + writing direction so Arabic/Persian render right
  // to left (the CSS mirrors under dir=rtl); every other language stays ltr.
  function setDir(code) {
    var el = document.documentElement;
    el.setAttribute("lang", code);
    el.setAttribute("dir", RTL[code] ? "rtl" : "ltr");
  }
  function set(code) {
    if (code === "en" || AVAILABLE.indexOf(code) < 0) {
      strings = Object.assign({}, EN); setDir("en"); lsSet("vdb_i18n_last", "en"); apply(); return Promise.resolve();
    }
    // paint instantly from the cached copy if we have one (no English flash), then refresh from disk.
    var cached = lsGet("vdb_i18n_" + code);
    if (cached) { try { strings = Object.assign({}, EN, JSON.parse(cached)); setDir(code); apply(); } catch (e) {} }
    return fetch("lang/" + code + ".json")
      .then(function (r) { return r.json(); })
      .then(function (j) { strings = Object.assign({}, EN, j); setDir(code); lsSet("vdb_i18n_" + code, JSON.stringify(j)); lsSet("vdb_i18n_last", code); apply(); })
      .catch(function () { if (!cached) { strings = Object.assign({}, EN); setDir("en"); apply(); } });
  }
  function detect() {
    var l = (navigator.language || "en").toLowerCase().slice(0, 2);
    if (l === "in") l = "id";           // Android reports legacy "in"; normalize to ISO "id"
    return AVAILABLE.indexOf(l) >= 0 ? l : "en";
  }
  function init(code) { return set(code && code !== "auto" ? code : detect()); }
  // apply the last-used language synchronously from cache, before any async config-get, so the
  // first visible frame is already translated. No-op on the first ever run (nothing cached yet).
  function primeFromCache() {
    var last = lsGet("vdb_i18n_last");
    if (!last || last === "en" || AVAILABLE.indexOf(last) < 0) return;
    var cached = lsGet("vdb_i18n_" + last);
    if (cached) { try { strings = Object.assign({}, EN, JSON.parse(cached)); setDir(last); apply(); } catch (e) {} }
  }

  return { AVAILABLE: AVAILABLE, t: t, apply: apply, set: set, init: init, primeFromCache: primeFromCache };
})();
