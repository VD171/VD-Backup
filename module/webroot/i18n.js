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
window.I18N = (function () {
  var AVAILABLE = ["en","ar","cs","de","es","fa","fr","hi","in","it","ja",
                   "ko","nl","pl","pt","ru","sv","th","tr","vi","zh"];
  var EN = window.__I18N_EN || {};
  var strings = Object.assign({}, EN);

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
      strings = Object.assign({}, EN); setDir("en"); apply(); return Promise.resolve();
    }
    return fetch("lang/" + code + ".json")
      .then(function (r) { return r.json(); })
      .then(function (j) { strings = Object.assign({}, EN, j); setDir(code); apply(); })
      .catch(function () { strings = Object.assign({}, EN); setDir("en"); apply(); });
  }
  function detect() {
    var l = (navigator.language || "en").toLowerCase().slice(0, 2);
    if (l === "id") l = "in";           // Android uses "in" for Indonesian
    return AVAILABLE.indexOf(l) >= 0 ? l : "en";
  }
  function init(code) { return set(code && code !== "auto" ? code : detect()); }

  return { AVAILABLE: AVAILABLE, t: t, apply: apply, set: set, init: init };
})();
