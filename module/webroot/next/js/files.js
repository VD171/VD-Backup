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
 *  Files backups in the new interface: several folders in one backup
 *  (path-backup .paths), scheduled Files jobs (schedule-set kind "files"),
 *  folder backups stored on Telegram in the Restore > Files list (pulled
 *  with telegram-pull, then restored with the engine's path restore), and
 *  the Telegram parallel transfers setting (.tg_parallel).
 */
"use strict";

var NX_FILES = (function () {
  function $id(i) { return document.getElementById(i); }

  // a list of folders fed by a path field: Add (or Enter, or a folder picked with Browse)
  // appends the field's path, each row has its own Remove
  function folderList(inputId, addId, browseId, listId) {
    var paths = [], input = $id(inputId), ul = $id(listId), picking = false;
    function draw() {
      ul.innerHTML = ""; ul.hidden = !paths.length;
      paths.forEach(function (p, i) {
        var li = el("li", "row"), name = el("div", "grow nx-fpath", p), rm = el("button", "btn small", I18N.t("nx_pb_remove"));
        name.dir = "ltr"; rm.type = "button";
        rm.onclick = function () { paths.splice(i, 1); draw(); };
        li.appendChild(name); li.appendChild(rm); ul.appendChild(li);
      });
    }
    function add() {
      var p = (input.value || "").trim().replace(/\/+$/, "");
      if (!p) return true;
      if (p.charAt(0) !== "/") { modalAlert(I18N.t("ui_pathbk_need_path")); return false; }
      if (paths.indexOf(p) < 0) paths.push(p);
      input.value = ""; draw(); return true;
    }
    $id(addId).onclick = add;
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); add(); } });
    $id(browseId).addEventListener("click", function () { picking = true; });
    document.addEventListener("click", function (e) {
      if (!picking || !e.target.closest) return;
      if (e.target.closest("#dir-use")) { picking = false; add(); }
      else if (e.target.closest("#dir-cancel")) picking = false;
    });
    return {
      get: function () { return add() ? paths.slice() : null; },   // a path still in the field counts
      set: function (l) { paths = (l || []).slice(); input.value = ""; draw(); }
    };
  }

  // ---- Backup > Files: one backup of every listed folder ----
  var pb = null;
  window.openPathBackup = function () {
    var paths = pb.get(); if (!paths) return;
    if (!paths.length) { modalAlert(I18N.t("ui_pathbk_need_path")); return; }
    var m = $id("pathbk-modal"), comp = $id("pb-comp"), enc = $id("pb-enc"), pass = $id("pb-pass");
    $id("pathbk-sub").textContent = paths.join("\n");
    comp.value = CFG.compression || "zstd:10";
    enc.checked = !!CFG.encrypt_data; pass.value = ""; pass.hidden = !enc.checked;
    enc.onchange = function () { pass.hidden = !enc.checked; };
    m.hidden = false;
    $id("pb-cancel").onclick = function () { m.hidden = true; enc.onchange = null; };
    $id("pb-ok").onclick = function () {
      if (enc.checked && !pass.value) { pass.focus(); return; }
      // path keeps a worker without paths[] support taking the first folder
      var args = { path: paths[0], paths: paths, dest: CFG.default_dest || "local", user: activeUser,
                   compression: comp.value, encrypt_data: enc.checked };
      if (enc.checked) args.password = pass.value;
      m.hidden = true; enc.onchange = null;
      var run = function () {
        helper("path-backup", args).then(function (r) {
          if (r && r.opid) { pb.set([]); trackOp(r.opid, { retry: run, onDone: loadPathBackups }); }
          else modalAlert(errMsg(r));
        });
      };
      run();
    };
  };

  // ---- Restore > Files: folder backups on Telegram (<dir>.vdbf.tar) ----
  function tgFiles() { var s = NX_SRC.get("telegram"); return (s && s.files) || []; }
  function pullRestore(f) {
    var run = function () {
      helper("telegram-pull", { message_id: f.raw.message_id, name: f.raw.name, user: activeUser | 0 }).then(function (op) {
        if (!op || !op.opid) { modalAlert(errMsg(op)); return; }
        trackOp(op.opid, { retry: run, onDone: function (p) {
          if (!p.ok) return;
          helper("path-list", { user: activeUser | 0 }).then(function (r) {
            var list = r && r.backups ? r.backups : [];
            renderPathBackups(list);
            var bk = list.filter(function (b) { return String(b.ref).split("/").pop() === f.dir; })[0];
            if (bk) startPathRestore(bk);
          });
        } });
      }).catch(function () { modalAlert(errMsg()); });
    };
    run();
  }
  function remoteRow(f) {
    var li = el("li", "row nx-remote"), grow = el("div", "grow");
    grow.appendChild(el("div", "badge info", "Telegram"));
    var nm = el("div", "name", f.label || f.dir); nm.dir = "auto"; grow.appendChild(nm);
    var bits = [f.when ? shortDate(new Date(f.when).toISOString()) : "", f.size ? fmtSize(f.size) : ""].filter(Boolean);
    if (bits.length) grow.appendChild(el("div", "sub", bits.join(" \u00b7 ")));
    var btn = el("button", "btn go small", I18N.t("restore")); btn.type = "button";
    btn.onclick = function () { pullRestore(f); };
    var del = el("button", "btn danger small", I18N.t("delete")); del.type = "button";
    del.onclick = function () {
      modalConfirmAction(I18N.t("msg_tg_delete_confirm"), I18N.t("delete"), function () {
        return helper("telegram-delete", { message_id: f.raw.message_id });
      }).then(function (r) {
        if (r === null) return;
        if (r && r.ok) NX_SRC.reload("telegram"); else modalAlert(errMsg(r));
      });
    };
    li.appendChild(grow); li.appendChild(btn); li.appendChild(del);
    return li;
  }
  function drawRemote() {
    var ul = $id("pathbk-list"); if (!ul) return;
    Array.prototype.slice.call(ul.querySelectorAll(".nx-remote")).forEach(function (r) { ul.removeChild(r); });
    var local = {};
    (typeof PATH_BACKUPS !== "undefined" ? PATH_BACKUPS : []).forEach(function (b) { local[String(b.ref).split("/").pop()] = 1; });
    var n = 0;
    tgFiles().slice().sort(function (a, b) { return (b.when || 0) - (a.when || 0); }).forEach(function (f) {
      if (local[f.dir]) return;   // a local copy is restored from its own row
      ul.appendChild(remoteRow(f)); n++;
    });
    var empty = $id("pathbk-empty");
    if (empty && n) empty.hidden = true;
  }
  if (typeof renderPathBackups === "function") {
    var renderPB = renderPathBackups;
    window.renderPathBackups = function (list) { renderPB(list); drawRemote(); };
  }

  // ---- Schedule: a Files job backs up its folders as one folder backup ----
  var jf = null;
  function filesJob() { var k = $id("nx-job-kind"); return !!k && k.value === "files"; }
  if (typeof updateJobForm === "function") {
    var updJob = updateJobForm;
    window.updateJobForm = function () {
      var files = filesJob();
      if (files) $id("job-action").value = "backup";
      updJob();
      $id("job-action").closest(".field").hidden = files;
      $id("job-all").closest("label").hidden = files;
      $id("job-mode").closest(".field").hidden = files;
      $id("nx-job-paths").hidden = !files;
      if (files) $id("job-app-field").style.display = "none";
    };
  }
  if (typeof saveJob === "function") {
    var saveApps = saveJob;
    window.saveJob = function () {
      if (!filesJob()) { saveApps(); return; }
      var paths = jf.get(); if (!paths) return;
      if (!paths.length) { $id("job-status").textContent = I18N.t("nx_job_need_folder"); return; }
      var job = { kind: "files", action: "backup", paths: paths, user: activeUser, cron: $id("job-cron").value,
                  at: $id("job-at").value || null, dest: $id("job-dest").value, keep: parseInt($id("job-keep").value, 10) || 5 };
      if ($id("job-wifi").checked) job.require_wifi = true;
      if ($id("job-charging").checked) job.require_charging = true;
      var minbat = parseInt($id("job-minbat").value, 10) || 0;
      if (minbat > 0) job.min_battery = minbat;
      var days = selectedDays();
      if (days.length) job.days = days;
      job.id = "job-files-" + hashStr(paths.slice().sort().join("\n"));
      helper("schedule-set", job).then(function (r) {
        $id("job-status").textContent = (r && r.ok) ? I18N.t("saved") : errMsg(r);
        if (r && r.ok) jf.set([]);
        loadSchedule();
      });
    };
  }
  if (typeof jobTargetLabel === "function") {
    var jobLabel = jobTargetLabel;
    window.jobTargetLabel = function (j) {
      if (j.kind !== "files") return jobLabel(j);
      var p = j.paths || [];
      return p.length === 1 ? p[0] : I18N.t("nx_n_folders", { n: p.length });
    };
  }

  // ---- Settings: how many Telegram parts move at once ----
  if (typeof loadSettings === "function") {
    var loadSet = loadSettings;
    window.loadSettings = function () {
      loadSet();
      var s = $id("set-tg-parallel"); if (s) s.value = String(CFG.tg_parallel || 3);
    };
  }
  if (typeof saveSettings === "function") {
    var saveSet = saveSettings;
    window.saveSettings = function () {
      var s = $id("set-tg-parallel"); if (s) CFG.tg_parallel = parseInt(s.value, 10) || 3;
      saveSet();
    };
  }

  document.addEventListener("DOMContentLoaded", function () {
    if ($id("nx-pb-add")) pb = folderList("pb-path", "nx-pb-add", "pb-browse", "nx-pb-list");
    if ($id("nx-job-path-add")) {
      jf = folderList("nx-job-path", "nx-job-path-add", "nx-job-path-browse", "nx-job-path-list");
      $id("nx-job-path-browse").onclick = function () { openDirPicker("#nx-job-path"); };
      $id("nx-job-kind").onchange = function () { updateJobForm(); };
    }
    if (window.NX_SRC) NX_SRC.on(drawRemote);
  });
  return { draw: drawRemote };
})();
