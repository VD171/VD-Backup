> **Languages:** [English](../../CHANGELOG.md) · [العربية](../ar/CHANGELOG.md) · [Čeština](../cs/CHANGELOG.md) · [Deutsch](../de/CHANGELOG.md) · [Español](../es/CHANGELOG.md) · [فارسی](../fa/CHANGELOG.md) · [Français](../fr/CHANGELOG.md) · [हिन्दी](../hi/CHANGELOG.md) · Bahasa Indonesia · [Italiano](../it/CHANGELOG.md) · [日本語](../ja/CHANGELOG.md) · [한국어](../ko/CHANGELOG.md) · [Nederlands](../nl/CHANGELOG.md) · [Polski](../pl/CHANGELOG.md) · [Português](../pt/CHANGELOG.md) · [Русский](../ru/CHANGELOG.md) · [Svenska](../sv/CHANGELOG.md) · [ไทย](../th/CHANGELOG.md) · [Türkçe](../tr/CHANGELOG.md) · [Tiếng Việt](../vi/CHANGELOG.md) · [中文](../zh/CHANGELOG.md)

---

# Changelog

Semua perubahan penting pada VDBackup didokumentasikan di sini. Hanya dalam bahasa Inggris.

## v1.03

Cakupan backup baru:

- Kategori backup khusus baru: kalender (penyedia kalender, plus ekspor portabel
  `calendar.json`), wallpaper (wallpaper layar beranda dan layar kunci), DNS privat (mode dan
  penentu) dan pengaturan sistem (dump lengkap pengaturan system/global/secure). Pengaturan
  sistem bersifat opt-in dan menimpa pengaturan seluruh perangkat saat direstore, jadi ia
  dipagari seperti SSAID, dengan persetujuan eksplisit dan entri audit lengkap.
- Backup folder dan berkas mandiri: backup sembarang path absolut (penyimpanan bersama atau
  data aplikasi) sebagai arsip terkompresi yang disegel manifest, dan restore ke path yang
  sama. Restore memerlukan konfirmasi eksplisit.

Restore yang lebih aman:

- Setiap arsip diperiksa sebelum apa pun ditulis: backup yang isinya menunjuk ke luar
  targetnya (sebuah path absolut atau komponen `..`) ditolak, sehingga restore yang berjalan
  sebagai root tidak bisa ditipu untuk menulis di luar tujuan.

Kemajuan dan penjadwalan:

- Kemajuan live kini menampilkan kecepatan transfer, ETA dan penghitung item selama backup,
  plus langkah terverifikasi checksum untuk unggahan cloud dan pracek "ruang tidak cukup".
- Pekerjaan terjadwal dapat dikondisikan: hanya berjalan di Wi-Fi, hanya saat mengisi daya,
  hanya di atas level baterai, atau hanya pada hari-hari yang dipilih; pekerjaan terjadwal
  juga dilewati saat perangkat sangat panas. Pekerjaan yang dilewati dicoba lagi pada tick
  berikutnya.

Tujuan cloud:

- Hubungkan backend rclone apa pun dari UI: menu tarik-turun remote cloud menawarkan penyedia
  populer (Google Drive, Dropbox, OneDrive, Box, pCloud, Mega, Backblaze B2, S3, SFTP, WebDAV,
  FTP, SMB) ditambah opsi "Custom (advanced)" tempat Anda mengetik nama backend rclone lain
  mana pun dan parameter `key=value`-nya, sehingga semua backend rclone dapat dijangkau.
- Masuk di perangkat (tanpa PC): penyedia yang memerlukan masuk lewat peramban (Google Drive,
  Dropbox, OneDrive, Box, pCloud) memiliki tombol "Authorize in browser" yang membuka peramban
  ponsel itu sendiri ke halaman persetujuan penyedia; setelah Anda menyetujui, Anda kembali ke
  aplikasi dan remote disimpan otomatis, dengan token ditangkap di perangkat. Menempel token
  secara manual tetap tersedia sebagai cadangan.

Antarmuka:

- Skala antarmuka yang dapat disesuaikan (penggeser yang dapat diseret) mengubah skala
  seluruh antarmuka, agar pas pada layar dengan kepadatan piksel berbeda; 100% adalah default
  dan tidak berubah.
- Antarmuka kini ditampilkan dari kanan ke kiri untuk bahasa Arab dan Persia.
- Ringkasan beranda dengan jumlah backup dan bilah penyimpanan, lencana status, salin hash
  dan path ke papan klip, sakelar bergaya Android, serta aksi "Check for updates".
- Log aktivitas adalah layar penuh yang terbuka seketika, dengan aksi "Export logs" yang
  menyimpan berkas log yang bisa Anda lampirkan ke laporan.

Perbaikan:

- Restore dan impor tidak lagi gagal pada perangkat yang `tar` bawaannya tidak menerima opsi
  `--no-absolute-names`; pemeriksaan keamanan arsip tidak bergantung pada opsi itu.
- "Check for updates" berfungsi bahkan di tempat yang tidak membundel klien HTTP, dengan
  beralih ke rclone bawaan; dan log aktivitas tidak lagi lama untuk terbuka.

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

*Dokumentasi ini dihasilkan dengan Claude (Anthropic) dan dikelola oleh VD171. Koreksi dan perbaikan dipersilakan - lihat [CONTRIBUTING.md](CONTRIBUTING.md).*
