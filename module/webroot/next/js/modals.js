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
 *  New interface: one stack for every dialog and sheet. The engine opens a
 *  dialog by un-hiding its .modal; whichever opens last is drawn on top with
 *  its own backdrop, takes focus (kept inside it), and is the only one that
 *  Back, Escape or a backdrop tap closes - through its own Cancel / Close
 *  button, so the engine's promise for it settles. Page scroll is locked
 *  while any is open and focus returns where it was on close.
 */
"use strict";

var NX_MODALS = (function () {
  var stack = [], BASE = 60;

  function top() { return stack[stack.length - 1] || null; }
  function visible(b) { return b && !b.disabled && b.offsetParent !== null; }
  function focusables(m) {
    return Array.prototype.filter.call(m.querySelectorAll("button, input, select, textarea, a[href], [tabindex]"),
      function (e) { return visible(e) && e.tabIndex >= 0; });
  }

  function sync(m) {
    var i = stack.indexOf(m);
    if (!m.hidden && i < 0) {
      m._nxFocus = document.activeElement;
      stack.push(m);
      m.style.zIndex = String(BASE + stack.length * 2);
      var card = m.querySelector(".modal-card") || m;
      if (!card.hasAttribute("tabindex")) card.setAttribute("tabindex", "-1");
      try { card.focus({ preventScroll: true }); } catch (e) {}
    } else if (m.hidden && i >= 0) {
      stack.splice(i, 1);
      m.style.zIndex = "";
      var f = m._nxFocus; m._nxFocus = null;
      if (f && f.focus && document.contains(f)) { try { f.focus({ preventScroll: true }); } catch (e) {} }
    }
    document.documentElement.classList.toggle("nx-modal-open", stack.length > 0);
  }

  // close the top dialog the way its own buttons do; a busy dialog (disabled buttons) stays
  function closeTop() {
    var m = top(); if (!m) return false;
    var acts = m.querySelectorAll(".modal-actions button, .modal-card > button");
    var btn = Array.prototype.filter.call(acts, function (b) { return /-(cancel|close)$/.test(b.id) && b.offsetParent !== null; })[0];
    if (!btn && m.id === "msg-modal") btn = document.getElementById("msg-ok");
    if (btn) { if (!btn.disabled) btn.click(); return true; }
    if (!m.querySelector(".modal-actions button:disabled")) m.hidden = true;
    return true;
  }

  function init() {
    var mo = new MutationObserver(function (recs) {
      recs.forEach(function (r) { if (r.target.classList && r.target.classList.contains("modal")) sync(r.target); });
    });
    document.querySelectorAll(".modal").forEach(function (m) {
      mo.observe(m, { attributes: true, attributeFilter: ["hidden"] });
      m.addEventListener("click", function (e) { if (e.target === m && m === top()) closeTop(); });
      if (!m.hidden) sync(m);
    });
    // the keyboard shrinks the viewport after a field takes focus: bring that field back into view
    window.addEventListener("resize", function () {
      var a = document.activeElement, m = top();
      if (m && a && m.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) a.scrollIntoView({ block: "center" });
    });
    document.addEventListener("keydown", function (e) {
      var m = top(); if (!m) return;
      if (e.key === "Escape") { e.preventDefault(); closeTop(); return; }
      if (e.key !== "Tab") return;
      var f = focusables(m); if (!f.length) { e.preventDefault(); return; }
      var first = f[0], last = f[f.length - 1], a = document.activeElement;
      if (!m.contains(a)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
  return { top: top, closeTop: closeTop, depth: function () { return stack.length; } };
})();
