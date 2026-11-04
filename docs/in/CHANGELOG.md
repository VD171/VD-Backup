> **Languages:** [English](../../CHANGELOG.md) · [العربية](../ar/CHANGELOG.md) · [Čeština](../cs/CHANGELOG.md) · [Deutsch](../de/CHANGELOG.md) · [Español](../es/CHANGELOG.md) · [فارسی](../fa/CHANGELOG.md) · [Français](../fr/CHANGELOG.md) · [हिन्दी](../hi/CHANGELOG.md) · Bahasa Indonesia · [Italiano](../it/CHANGELOG.md) · [日本語](../ja/CHANGELOG.md) · [한국어](../ko/CHANGELOG.md) · [Nederlands](../nl/CHANGELOG.md) · [Polski](../pl/CHANGELOG.md) · [Português](../pt/CHANGELOG.md) · [Русский](../ru/CHANGELOG.md) · [Svenska](../sv/CHANGELOG.md) · [ไทย](../th/CHANGELOG.md) · [Türkçe](../tr/CHANGELOG.md) · [Tiếng Việt](../vi/CHANGELOG.md) · [中文](../zh/CHANGELOG.md)

---

# Changelog

Semua perubahan penting pada VDBackup didokumentasikan di sini. Hanya dalam bahasa Inggris.

## v1.01

Rilis publik pertama. Modul WebUI KernelSU/APatch/Magisk yang mencadangkan dan memulihkan
aplikasi beserta datanya sepenuhnya sebagai root, tanpa prompt pemberian izin.

Mesin dan format:

- Mesin backup/restore berjalan sebagai proses root yang terlepas (`setsid`): ia tetap hidup saat
  WebUI atau pengelola root ditutup, dan UI menyambung kembali ke progres langsung melalui `opid`.
- Tiga mode backup: Full (tar.zst, lokal atau remote), Snapshot (repo restic, terenkripsi
  dan terdeduplikasi), dan Mirror (sinkronisasi rclone/rsync 1:1). APK selalu dikompresi,
  bahkan dalam mode mirror.
- Item per aplikasi: APK (base + splits), `data`, `data_de`, `obb`, eksternal dan media.
  Konteks SELinux, uid/gid, mode dan xattr/caps dipertahankan; restore menggunakan sesi
  `pm install` dan memetakan ulang kepemilikan/konteks ke uid aktif.
- Sadar per-pengguna (multi-pengguna) di seluruh bagian. Backup disimpan di bawah `/sdcard/VDBackup`
  (per pengguna), di luar `/data/adb`, sehingga tidak dapat dibaca sebelum unlock pertama; setiap
  tujuan diberi namespace di bawah `<path>/vdbackup`.
- Kompresi: none, lz4, zstd (level), atau gzip ("mode kompatibilitas"). Manifest JSON
  mencatat perangkat, paket (termasuk label aplikasi), item dan izin.
- Enkripsi portabel dengan `age` (keygen), ditambah panduan PC RECOVERY yang disertakan di dalam setiap
  backup terenkripsi sehingga dapat didekripsi dan diekstrak di mana saja, tanpa modul.

Tujuan dan cloud:

- Tujuan: add/list/test/delete (lokal, remote rclone, repo restic, dan pendamping
  Google Drive yang bersifat opt-in); kredensial disimpan dalam bentuk tersamar, tidak pernah polos.
- Buat remote rclone dari UI/API (`remote-add`/`remote-list`/`remote-del`), sehingga setiap
  backend cloud (SFTP, SMB, WebDAV, FTP, S3, Google Drive, dan lainnya) dapat dijangkau tanpa
  menyunting `rclone.conf` secara manual.
- Google Drive dengan dua cara: melalui rclone (tanpa akun Google Cloud) atau aplikasi pendamping
  headless yang bersifat opt-in (`ru.vd171.vdbackup`), yang memuat pemberitahuan wajib untuk menyembunyikan dengan HMA-OSS.
- Kebijakan jaringan: pilih apakah transfer cloud boleh menggunakan koneksi apa pun, hanya Wi-Fi, atau
  hanya data seluler; diberlakukan untuk job manual dan terjadwal. Tujuan lokal dikecualikan.

Migrasi masuk:

- Impor dari Neo-Backup, termasuk backup terenkripsi dengan kata sandi (AES-256-GCM didekripsi oleh
  helper dex; WebUI meminta kata sandi).
- Impor dari Android-DataBackup (pasang APK, ekstrak arsip user/user_de/data, petakan ulang).
- Keduanya divalidasi terhadap backup nyata di berbagai perangkat.

Integritas dan keamanan:

- Restore wipe-lalu-ekstrak yang setia; verifikasi sha256 per-arsip (default aktif untuk Full,
  dan pemeriksaan integritas repo untuk Snapshot), dry-run, dan restore-test. Arsip dibaca kembali
  untuk kelengkapan; arsip yang rusak atau nama paket yang tidak valid tidak akan pernah memicu
  restore yang merusak, dan kegagalan transfer-remote dilaporkan, tidak pernah senyap.
- Pemulihan selektif: pulihkan subset mana pun dari item yang dimuat sebuah backup (APK, data, data
  terlindungi, OBB, eksternal, media), semuanya dipilih secara default.
- Hapus backup dari UI/API (`delete-backup`) dan retensi keep-last-N untuk backup manual
  (`prune`); setiap delete, restore, prune, dan jalankan terjadwal ditulis ke log audit JSON
  lokal yang dapat Anda lihat di dalam aplikasi.
- Izin runtime dan AppOps ditangkap ke dalam manifest dan diterapkan kembali saat restore. Sumber
  pemasangan (installerPackageName) dan keadaan enabled/disabled juga ditangkap dan diterapkan kembali saat restore.
- Pemalsuan sumber-pemasangan: secara default aplikasi yang direstore melaporkan Play Store sebagai
  sumber pemasangannya (disetel saat pemasangan via sesi install, karena aplikasi yang direstore jika
  tidak akan tampak sideload); dapat dialihkan secara global dan per restore, dan saat mati sumber yang
  ditangkap dipertahankan. Mode "deep" opt-in tingkat lanjut selain itu memalsukan paket penginisiasi
  dan sumber paket dengan mengedit basis data paket sistem (backup byte-exact terlebih dahulu, berlaku
  setelah reboot) sehingga aplikasi tampak sepenuhnya terpasang-dari-toko.
- SSAID (ANDROID_ID perangkat): bersifat opt-in ketat dan ditandai menonjol; sadar-ABX; berkas aktif
  selalu dicadangkan byte-exact sebelum penimpaan apa pun untuk rollback; berlaku setelah
  reboot.
- Restore dan impor memerlukan pengakuan eksplisit "ini menimpa data aplikasi saat ini"
  sebelum dilanjutkan.

Penjadwalan dan otomasi:

- Backup terjadwal dengan retensi keep-N, dikelola dari tab Schedule (per aplikasi, harian/
  per jam/mingguan dengan waktu, mode, dan tujuan opsional).
- Pencadangan otomatis saat pemasangan atau pembaruan: observer opt-in menumpang heartbeat penjadwal,
  membackup aplikasi yang baru atau diperbarui di latar belakang, dan hanya menanam benih pada jalankan
  pertama sehingga mengaktifkannya tidak pernah membackup semuanya sekaligus. Menghormati pengaturan
  aplikasi-yang-dikecualikan (blocklist).

Backup khusus (sistem-wide):

- Backup pesan (SMS/MMS), kontak dan log panggilan, Wi-Fi dan Bluetooth sebagai data sistem mentah
  yang diarsipkan secara setia (pelestarian SELinux/xattr yang sama dan enkripsi age opsional seperti
  backup aplikasi). Restore bersifat setia untuk perangkat-sama/ROM-sama, butuh-reboot, dan dibatasi di
  balik pengakuan timpa-dan-reboot yang menonjol.
- Ekspor portabel opsional di samping arsip mentah: pesan, log panggilan, dan kontak juga ditulis
  sebagai JSON yang dapat dibuka (dibaca dengan sqlite3 bawaan langsung dari basis data provider,
  sehingga isi pesan dengan koma atau baris baru tetap utuh), memberi salinan lintas-perangkat yang
  tidak butuh modul. Salinan portabel juga dienkripsi saat backup dienkripsi, sehingga tidak pernah
  membocorkan apa yang dilindungi arsip.

Integrasi sistem:

- Pasang aplikasi terpasang sebagai aplikasi sistem tanpa menyentuh partisi /system yang asli:
  VDBackup menempatkan APK aplikasi ke dalam sub-modul overlay-nya sendiri, yang dipasang oleh manajer
  root. Dengan NoMount pada KernelSU ia disuntikkan live (tanpa reboot); jika tidak ia berlaku pada boot
  berikutnya, sehingga tidak pernah bergantung pada NoMount terpasang. Pilih penempatan reguler atau
  berhak-istimewa.

WebUI:

- Daftar aplikasi menampilkan nama aplikasi terlokalisasi yang sebenarnya (diselesaikan dari APK, sehingga tetap ada setelah
  pencopotan) bersama nama paket, dengan ikon yang dimuat lazy dan di-cache, dirender sebagai ubin
  membulat yang sadar-adaptif.
- Ketuk sebuah aplikasi untuk membuka riwayat backup-nya dan memulihkan backup sebelumnya mana pun; tab Backups
  menampilkan nama dan paket pada baris terpisah dan membuka lembar detail per backup (versi,
  sumber pemasangan, keadaan, tanggal, ukuran, item, jumlah izin, perangkat).
- Filter daftar aplikasi berdasarkan pengguna/sistem/semua dan urutkan berdasarkan nama atau paket; pilih
  beberapa aplikasi dan backup dalam satu batch; kecualikan aplikasi dari backup otomatis dan terjadwal.
- Pilih apa yang disertakan dan alihkan verify atau dry-run per backup; pilih restore khusus-tes yang
  mengekstrak ke staging tanpa menyentuh aplikasi yang live.
- Tema terang/gelap, pemilih warna aksen, pemilih bahasa, tab About (dengan proyek saudara
  dan manifest audit biner yang dibundel), pemilih folder untuk tujuan lokal, progres operasi
  terlokalisasi dengan umpan balik instan, dan dialog in-app modern (tanpa pop-up alert/confirm
  sistem).
- Navigasi tombol-kembali mengembalikan ke tab sebelumnya dan menutup dialog terlebih dahulu; dialog
  mengambang dan aplikasi bertahan saat dibuka kembali dengan menyambung ulang ke operasi yang live.

Ramah-AI dan i18n:

- Permukaan kontrol JSON yang terdokumentasi sehingga agen dapat mengelola setiap tindakan secara headless
  (`docs/AI-AGENTS.md`); WebUI hanyalah salah satu klien dari API tersebut.
- README dan semua dokumentasi proyek diterjemahkan ke dalam 21 bahasa standar
  (`docs/<lang>/`), dengan dokumentasi dicerminkan ke wiki.
- Daftar aplikasi yang kaya dan dekripsi Neo berjalan melalui helper dex yang dijalankan sebagai root
  (`IPackageManager` via ServiceManager), sehingga berfungsi di tempat ActivityThread menggantung.
