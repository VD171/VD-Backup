> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · Bahasa Indonesia · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# Arsitektur

VDBackup adalah modul WebUI root. Modul ini punya tiga lapisan: **WebUI** (yang Anda lihat),
**backend shell** (yang mengerjakan tugasnya, sebagai root), dan **biner bawaan**
(pengarsip dan transport). Semuanya berjalan sudah-root, jadi tidak ada
prompt izin dan tidak ada aplikasi pendamping untuk fitur inti.

```
   ┌──────────────────────────────────────────────────────────┐
   │  WebUI  (module/webroot, vanilla JS)                      │
   │    index.html · scripts.js · i18n.js · styles.css         │
   │    lang/en.js + 21 languages · config.json (CSP, no net)  │
   └───────────────┬──────────────────────────────────────────┘
                   │  ksu.exec("sh scripts/helper.sh <verb> <b64json>")
                   ▼
   ┌──────────────────────────────────────────────────────────┐
   │  scripts/helper.sh  (dispatcher, returns JSON)            │
   │    list-apps · config · dests · backup/restore/import ... │
   │    long ops -> setsid nohup scripts/worker.sh  (detached) │
   └───────────────┬───────────────────────────────┬──────────┘
                   │                               │ progress-<opid>.json (poll)
                   ▼                               ▼
   ┌────────────────────────────────────┐   ┌──────────────────────────┐
   │  scripts/worker.sh (root, detached)│   │  framework helper (opt.) │
   │   force-stop · tar|zstd|age        │   │  app_process + dex       │
   │   pm install · chown/chcon         │   │  perms/appops/ssaid/...  │
   │   transfer · notify                │   │  (dex primary, shell fb) │
   └───────────────┬────────────────────┘   └──────────────────────────┘
                   ▼
   ┌──────────────────────────────────────────────────────────┐
   │  bin/<abi>/  tar · zstd · lz4 · rclone · rsync · ssh · restic │
   └──────────────────────────────────────────────────────────┘
                   ▼
   Destinations: local · SFTP/SCP · SMB · WebDAV · FTP · S3 · 70+ (rclone)
                 rsync · restic repos · Google Drive (opt-in companion)
```

## Poin penting

- **Sudah root.** Proses modul adalah root, jadi mesinnya adalah shell biasa. ~85% dari
  pekerjaan adalah shell murni (`tar`/`zstd`/`age`/`pm`/`am`/`chown`/`chcon`/`rclone`/...).
- **Eksekusi terlepas.** Backup/restore berjalan via `setsid nohup`, sebagai proses root
  independen. Menutup WebUI tidak menghentikannya; UI menyambung kembali dengan membaca
  `logs/progress-<opid>.json`.
- **Framework helper (~15%).** Izin berbutir-halus, AppOps, SSAID, StorageStats,
  ikon dan Wi-Fi berhak-istimewa memerlukan framework Android. Satu `dex` kecil yang dijalankan via
  `app_process` (tanpa aplikasi terpasang) menangani ini, dengan fallback shell.
- **Portabilitas.** Hanya format standar; backup bisa dibuka di PC tanpa modul ini.
- **State** berada di `/data/adb/vdbackup/` (config, job, tujuan, kredensial
  terenkripsi, log, staging). **Backup** ditulis ke penyimpanan yang terlihat pengguna dan
  terenkripsi-kredensial di `/sdcard/VDBackup/` (`/data/media/<user>/VDBackup`, per pengguna),
  bukan di `/data/adb` (yang terenkripsi-perangkat dan bisa dibaca sebelum unlock pertama).

## Jaminan kompatibilitas

Sebuah backup harus tetap bisa direstore selamanya. Ini aturan keras, bukan sekadar upaya terbaik.

**Cakupan.** Jaminan ini mencakup backup yang ditulis oleh **v1.01 dan seterusnya** (rilis pertama
yang dipublikasikan secara resmi) dan hanya oleh versi yang dipublikasikan dan dirilis secara resmi.
v1.00 adalah build khusus-pengujian dan secara eksplisit berada di luar cakupan; build pra-rilis dan
pengembangan tidak tercakup. Sejak rilis publik pertama dan seterusnya, janji di bawah ini bersifat mutlak:

- **Hanya format standar.** Setiap arsip adalah `tar` biasa yang dikompresi dengan `zstd`,
  `gzip` atau `lz4`, opsional dibungkus dengan `age`. Tidak ada kontainer proprietary, jadi
  sebuah backup bisa dibuka di PC mana pun dengan alat biasa bahkan tanpa modul ini (lihat
  `etc/RECOVERY.md`). Sebuah format yang tidak boleh kami tinggalkan.
- **Metadata append-only.** `manifest.json` membawa `format_version`. Skema hanya
  pernah bertambah: field boleh *ditambah*, tidak pernah dihapus, diganti nama atau dialihfungsikan. Restore membaca
  setiap field secara defensif (field opsional yang hilang jatuh ke nilai default) dan memasang
  APK serta mengekstrak arsip berdasarkan nama dan ekstensi filenya, bukan dengan mengasumsikan bentuk
  manifest yang tetap.
- **Restore kompatibel-maju.** Restore tidak pernah menolak backup karena usianya tua, dan
  VDBackup yang lebih lama diam-diam melewati tipe item yang tidak dikenalnya alih-alih gagal. Sebuah VDBackup
  yang lebih baru karenanya merestore backup lama mana pun, dan arsip format-standar tetap
  bisa direstore secara manual terlepas dari apa pun.

Singkatnya: apa pun yang pernah ditulis VDBackup, setiap VDBackup masa depan (dan PC biasa)
masih bisa merestore. Mengubah format dengan cara yang merusak backup sebelumnya tidak
diperbolehkan; kemampuan baru ditambahkan di balik `format_version` dan field baru yang aditif.

Untuk desain teknis lengkap (format arsip, skema metadata, pipeline, kripto,
tujuan, importer) para maintainer menyimpan catatan desain terperinci; file ini adalah
ringkasan yang ditujukan untuk kontributor.

<!-- doc-footer -->

---

> _Dokumentasi ini dibuat dengan Claude (Anthropic) dan dikelola oleh VD171. Koreksi dan perbaikan dipersilakan; lihat [CONTRIBUTING.md](CONTRIBUTING.md)._
