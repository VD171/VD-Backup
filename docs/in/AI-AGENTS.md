> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · Bahasa Indonesia · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# Mengendalikan VDBackup dari agen AI

VDBackup dibangun agar asisten atau agen AI dapat mengelola **setiap** konten dan
tindakan modul secara headless, dengan cara yang sama seperti orang melakukannya melalui WebUI.
WebUI hanyalah salah satu klien dari sebuah JSON API kecil; agen Anda adalah klien lainnya. Gunakan API,
jangan scrape WebUI.

## Kontrak

Semuanya melewati satu titik masuk, dijalankan sebagai root di perangkat:

```
sh /data/adb/modules/vdbackup/scripts/helper.sh <verb> <base64(JSON-args)>
```

- Argumen berupa satu objek JSON, **base64-encoded**, diteruskan sebagai satu token argv.
- Perintah mencetak **satu objek JSON** di stdout: `{"ok":true,...}` atau
  `{"ok":false,"code":"ERR_...","message":"..."}`. Parse itu; jangan pernah scrape teks.
- Operasi panjang (`backup`, `restore`, `import`) mengembalikan `{"ok":true,"opid":"..."}`
  seketika dan berjalan **terlepas** (tetap bertahan meski pemanggil/WebUI menghilang). Poll
  kemajuannya; mereka belum selesai saat panggilan kembali.
- `progress` dan `cancel` menerima **base64 dari string opid mentah**, bukan objek JSON.

Sebuah helper kecil untuk shell Anda:

```sh
b64() { printf '%s' "$1" | base64 -w0; }
H=/data/adb/modules/vdbackup/scripts/helper.sh
sh "$H" backup "$(b64 '{"package":"com.example.app","mode":"full"}')"
```

Untuk mengendalikannya dari workstation, jalankan itu melalui saluran root biasa Anda ke perangkat
(adb shell sebagai root, atau setup SSH-ke-root). Modul ini menyertakan biner yang dibundel, jadi
setelah terpasang ia **tidak butuh internet** untuk backup/restore lokal; hanya tujuan
cloud (`rclone`/`restic`/ssh) yang berkomunikasi dengan jaringan.

## Verb

| Verb | Args (JSON) | Returns |
|------|-------------|---------|
| `ping` | `{}` | `{ok,version,abi}` |
| `overview` | `{user?}` | `{ok:true,apps,instances,path_backups,jobs,backups_size,free,total}` jumlah (ukuran dalam byte): aplikasi yang punya backup, total instansi backup, backup path mandiri, pekerjaan terjadwal, total ukuran backup, dan ruang bebas/total dari sistem berkas backup. Tidak terlepas, langsung kembali; dipakai oleh ringkasan beranda WebUI. |
| `config-get` | `{}` | `{ok,config}` |
| `config-set` | objek config (atau `{key,value}`) | `{ok}` |
| `keygen` | `{}` | membuat keypair `age` untuk enkripsi |
| `list-apps` | `{user?}` | `{ok,apps:[{package,label,system,versionCode}]}` (dex, fallback shell) |
| `label` | `{package,user?}` | `{ok,label}` (nama aplikasi terlokalisasi asli, bebas konteks) |
| `icon` | `{package,user?,vc?}` | `{ok,package,icon}` (PNG base64; di-cache per package+`vc`) |
| `backup` | lihat di bawah | `{ok,opid}` (terlepas) |
| `restore` | lihat di bawah | `{ok,opid}` (terlepas) |
| `import` | `{from,ref,password,ssaid,user}` | `{ok,opid}` (terlepas) |
| `import-scan` | `{from,path}` | `{ok,backups:[...]}` |
| `progress` | base64(opid) | `progress-<opid>.json` yang live |
| `cancel` | base64(opid) | `{ok,cancelled}` |
| `list-ops` | `{}` | `{ok,ops:[...]}` (reattach setelah tersambung kembali) |
| `list-apps`/`icons` | `{user?}` / `{user?,items:[{package,vc}]}` | daftar aplikasi / ikon base64 batch |
| `list-backups` | `{package?}` | `{ok,backups:[{ref,package,label,versionName,versionCode,created_at,mode,items}]}` |
| `list-users` | `{}` | `{ok,users:[{id,name}]}` pengguna Android perangkat (multi-pengguna). |
| `list-dirs` | `{path}` | `{ok,path,parent,dirs:[...]}` subdirektori dari sebuah path (pemilih folder). |
| `path-list` | `{user?}` | `{ok,backups:[...]}` cadangan folder/berkas mandiri. |
| `provenance` | `{}` | manifes audit biner bawaan (`PROVENANCE.json`). |
| `backup-info` | `{ref}` | `{ok,...}` detail lengkap satu backup (versi, sumber pemasangan, keadaan, tanggal, mode, ukuran, item, jumlah izin, perangkat) |
| `backup-icon` | `{ref}` | `{ok,icon}` PNG base64 dari manifest (berfungsi saat aplikasi sudah dicopot) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref harus berada di bawah direktori backups) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` simpan N terbaru dari sebuah paket |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` log audit, terbaru lebih dahulu |
| `log-export` | `{user?}` | `{ok:true,path}` (path absolut dari `.txt` yang ditulis di bawah direktori backup) atau `{ok:false,code:"ERR_LOG_EXPORT"}`. Menulis log aktivitas (`audit.jsonl`) ditambah header build/perangkat singkat ke satu berkas teks yang terlihat pengguna sehingga bisa dilampirkan ke laporan bug. Tidak terlepas, langsung kembali. |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth/calendar/wallpaper/dns/system_settings) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` backup sistem-wide (terlepas) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (butuh-reboot; `confirm` membatasinya) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `path-backup` | `{path,compression?,password?}` | `{ok,opid}` membackup sembarang path absolut sebagai `tar.zst`+`manifest.json` di bawah `.paths/` (terlepas) |
| `path-restore` | `{ref,confirm:true,password?}` | `{ok,opid}` merestore sebuah backup path ke lokasi aslinya (`confirm` membatasinya; terlepas) |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | pasang aplikasi terpasang sebagai aplikasi sistem (sub-modul systemless; live via NoMount jika tidak maka boot berikutnya) |
| `companion-status` / `companion-install` | `{}` | status pendamping Google Drive / pemasangan sesuai permintaan |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | pengelolaan tujuan |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | pengelolaan remote rclone (membuat entri `rclone.conf` yang ditunjuk oleh dest `type:"rclone"`); `backend` bisa berupa backend rclone apa pun, tanpa daftar putih |
| `remote-authorize` | `{backend}` | `{ok:true,url}` (mesin sudah membuka browser ponsel ke URL persetujuan itu lewat Android VIEW intent) atau `{ok:false,code:"ERR_AUTHORIZE"}`. Menjalankan `rclone authorize <backend>` pada server callback lokal (`127.0.0.1:53682`) untuk OAuth di perangkat. |
| `remote-authorize-poll` | `{}` | `{ok:true,done:false,url}` selama menunggu, `{ok:true,done:true,token}` setelah pengguna menyetujui (`token` yang diteruskan ke `remote-add`), atau `{ok:false,code:"ERR_AUTHORIZE"}`. |
| `remote-authorize-cancel` | `{}` | `{ok:true,cancelled:true}`; menghentikan otorisasi yang tertunda. |
| `cloud-status` | `{}` | `{ok,rclone,restic,fetchable,size}` (apakah biner `rclone`/`restic` tersedia, apakah edisi `lite` ini bisa mengambilnya, ukuran unduhan dalam byte) |
| `cloud-fetch` | `{}` | `{ok,opid}` (terlepas) mengunduh+memverifikasi+memasang addon `rclone`/`restic` pada edisi `lite` |
| `schedule-set` / `schedule-list` / `schedule-delete` | lihat di bawah | pekerjaan terjadwal (sebuah backup atau sebuah restore; menargetkan satu aplikasi, sekumpulan, atau semua aplikasi) |
| `scheduler-tick` | `{}` | menjalankan pekerjaan yang jatuh tempo + menerapkan retensi + observer pencadangan otomatis (heartbeat boot memanggil ini) |
| `update-check` | `{}` | `{ok,current_version,current_code,latest_version,latest_code,update_available,zipUrl,changelog,notes}` (tidak terlepas; langsung kembali; `ERR_UPDATE_CHECK` saat gagal - lihat di bawah) |

### Field `progress`

Mem-poll `progress` mengembalikan `progress-<opid>.json` live untuk operasi tersebut. Field-field
ini **selalu ada**:

| Field | Tipe | Arti |
|-------|------|---------|
| `opid` | string | id operasi |
| `percent` | int | penyelesaian 0-100 |
| `phase` | string | label fase saat ini |
| `item` | string | tipe item yang sedang diproses saat ini |
| `done` | bool | true pada penulisan terminal (finish / dry-run / restore-test) |

Sebuah operasi yang sedang berjalan juga dapat membawa field live **opsional** ini. Field tersebut
absen atau kosong saat tidak diketahui, dan **dihilangkan pada penulisan terminal** (finish /
dry-run / restore-test):

| Field | Tipe | Arti |
|-------|------|---------|
| `rate` | string | kecepatan transfer, mis. `"4.2 MiB/s"` (kosong = tidak diketahui) |
| `eta` | string | perkiraan waktu tersisa, mis. `"1m12s"` (kosong = tidak diketahui) |
| `n` | int | indeks item saat ini (0 = tidak diketahui) |
| `of` | int | jumlah total item (0 = tidak diketahui) |
| `cur` | string | nama item saat ini (kosong = tidak ada) |

Transfer cloud mengisi `rate`/`eta` (percent berasal dari rclone); backup Full lokal mengisi
`n`/`of`/`cur`. Label fase mencakup fase segel checksum **`verified`** dan, untuk transfer cloud,
**`transfer`** serta **`mirror <item>`**.

### Args `backup`

```json
{
  "package": "com.example.app",
  "user": 0,
  "mode": "full",                 // full | snapshot | mirror
  "compression": "zstd:10",       // none | lz4 | zstd[:N] | gzip
  "items": ["apk","data","data_de","obb","external","media"],
  "encrypt_data": false,
  "encrypt_apk": false,
  "dest": "local",                // local | <destination id>
  "verify": true,                 // re-hash each archive vs the manifest (default on for Full)
  "dry_run": false,               // true = report a size plan, write nothing
  "ssaid": false,                 // OPT-IN, see below
  "manual": false                 // true = single interactive backup, keeps these exact items;
                                  // omit/false lets config.app_items (a per-app item map) override
                                  // the set on bulk, auto and scheduled runs
}
```

`restore`/`import` menerima `{ref}` (direktori backup / ref scan). `restore` juga menerima:
`"items"` (subset dari tipe item backup yang akan direstore; hilangkan untuk semua), `"test": true`
(ekstrak ke direktori temp dan verifikasi, tanpa menyentuh aplikasi yang live), `"mode"` untuk
snapshot/mirror, `"password"` untuk backup terenkripsi, `"ssaid"` (opt-in), dan opsi sumber-pemasangan
`"spoof_installer"` (default dari config, menyetel installer ke Play Store saat pemasangan) serta
`"deep_spoof": true` (opt-in tingkat lanjut; juga memalsukan paket penginisiasi dan sumber paket dengan
mengedit basis data paket, berlaku setelah reboot). `import` menerima `"from": "neo" | "databackup"` dan,
untuk backup Neo terenkripsi, `"password"`.

### Args `schedule-set`

Sebuah pekerjaan terjadwal memilih **satu** target dan sebuah **action**:

```json
{
  "id": "nightly-games",
  "action": "backup",             // "backup" (default) | "restore"
  "package": "com.example.app",   // satu aplikasi   - ATAU -
  "packages": ["com.a","com.b"],  // sekumpulan aplikasi   - ATAU -
  "all": true,                    // semua aplikasi, dikurangi daftar aplikasi-yang-dikecualikan
  "cron": "daily",                // hourly | daily | weekly
  "at": "02:30",                  // HH:MM
  "mode": "full",
  "dest": "local",
  "keep": 5,
  "items": ["apk","data"],
  "require_wifi": false,          // gerbang: jalankan hanya di Wi-Fi
  "require_charging": false,      // gerbang: jalankan hanya saat mengisi daya
  "min_battery": 0,               // gerbang: jalankan hanya pada level baterai ini atau lebih % (0-100)
  "days": [1,2,3,4,5]             // gerbang: jalankan hanya pada hari-hari ini (0=Minggu)
}
```

Berikan tepat **satu** dari `package`, `packages` atau `all` untuk target. Sebuah pekerjaan `backup`
mempertahankan `mode`/`dest`/`keep`/`items` seperti biasa. Sebuah pekerjaan `restore` (`action: "restore"`)
merestore backup **terbaru** dari setiap aplikasi target (atau sebuah `ref` eksplisit) dan **menimpa data
aplikasi saat ini pada setiap jalannya** - ini disengaja dan opt-in, jadi setel hanya atas permintaan langsung
pengguna.

### Penggerbangan penjadwal

Sebuah pekerjaan terjadwal dapat membawa **kondisi gerbang opsional**. Ketika gerbang sebuah
pekerjaan yang jatuh tempo tidak terpenuhi, pekerjaan itu **dilewati dan dicoba lagi pada tick
berikutnya, tanpa memajukan jadwalnya** (`last_run`-nya tidak dicap, sehingga pekerjaan itu jalan
begitu kondisinya terpenuhi):

| Field | Tipe | Gerbang |
|-------|------|------|
| `require_wifi` | bool | jalankan hanya saat terhubung Wi-Fi |
| `require_charging` | bool | jalankan hanya saat mengisi daya |
| `min_battery` | int (0-100) | jalankan hanya pada level baterai ini atau lebih |
| `days` | array of int (0-6, 0=Minggu) | jalankan hanya pada hari-hari ini |

Di atas semua itu, sebuah pemeriksaan **keamanan termal** minimal selalu diterapkan: sebuah operasi
terjadwal dilewati selama perangkat panas secara kritis. Setiap pelewatan gerbang ditulis ke audit
trail sebagai `op:"scheduler-gated"` dengan `reason` berupa `wifi` / `charging` / `battery` / `days`
/ `thermal`.

### Args `remote-add`

Tujuan cloud adalah dest `type:"rclone"` yang menamai sebuah remote `rclone`; buat
remote itu terlebih dahulu dengan `remote-add`. `backend` bisa berupa **backend rclone apa pun** -
tidak ada daftar putih. `remote-add` menerima nama backend apa pun (`dropbox`, `onedrive`, `box`,
`pcloud`, `mega`, `b2`, `s3`, `sftp`, `smb`, `webdav`, `ftp`, `drive` dan ~70 lainnya yang didukung
rclone), dan `params` diteruskan langsung ke konfigurasi `rclone` sebagai pasangan `key=value`. Field
kata sandi disimpan dalam keadaan tersamar, tidak pernah polos. Backend umum dan `params`-nya:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

**OAuth di perangkat (tanpa PC).** Backend yang perlu masuk lewat browser (Google Drive, Dropbox,
OneDrive, Box, pCloud) tidak memerlukan desktop maupun token yang ditempel manual. Panggil
`remote-authorize` dengan `{backend}`: mesin menjalankan `rclone authorize <backend>` terhadap server
callback lokal (`127.0.0.1:53682`) dan membuka browser ponsel sendiri di halaman persetujuan penyedia
lewat Android VIEW intent, mengembalikan `{ok:true,url}` (atau `{ok:false,code:"ERR_AUTHORIZE"}`).
Poll `remote-authorize-poll` (`{}`): ia mengembalikan `{ok:true,done:false,url}` selama menunggu dan
`{ok:true,done:true,token}` setelah pengguna menyetujui - teruskan `token` itu ke `remote-add`.
`remote-authorize-cancel` (`{}`) menghentikan otorisasi yang tertunda (`{ok:true,cancelled:true}`).
Menempel keluaran `rclone authorize "<backend>"` secara manual dari komputer mana pun tetap didukung
sebagai cadangan.

Google Drive memiliki dua jalur: remote `drive` ini (tidak butuh proyek Google Cloud, memakai
OAuth milik rclone sendiri - otorisasi di perangkat dengan `remote-authorize`, atau jalankan
`rclone authorize "drive"` satu kali di komputer mana pun dan teruskan tokennya) atau aplikasi
pendamping opt-in (client id OAuth Anda sendiri). Keduanya berakhir sebagai tujuan biasa.

### Kebijakan jaringan

Field config `network_policy` mengontrol koneksi mana yang boleh dipakai transfer cloud:
`any` (default), `wifi`, atau `mobile`. Setel dengan `config-set`. Ketika bernilai `wifi` atau
`mobile`, setiap transfer cloud (unggah `rclone`/Drive Full, sinkronisasi Mirror, backup/restore
snapshot `restic` remote, restore Mirror) memeriksa transport aktif terlebih dahulu dan
berhenti dengan `ERR_NET_POLICY` jika tidak cocok - baik untuk pekerjaan manual maupun terjadwal.
Tujuan lokal tidak pernah dibatasi.

### Integritas dan kuota cloud

- **Segel checksum (cloud).** Setelah penyalinan cloud berhasil, engine menjalankan pemeriksaan
  checksum remote (`rclone check`); ketidakcocokan menggagalkan operasi dengan `ERR_VERIFY`. Backend
  yang tidak berbagi hash umum dengan sisi lokal dilewati (bukan kegagalan).
- **Pemeriksaan kuota (cloud, mode Full).** Sebelum unggahan mode Full ke remote `rclone`, engine
  menanyakan ruang bebas remote (`rclone about --json`) dan menolak dengan `ERR_QUOTA` jika backup
  tidak akan muat. Remote yang tidak melaporkan informasi kuota dilewati. Mode Mirror adalah sinkronisasi
  delta dan dikecualikan.

### Biner cloud (edisi `lite`)

Edisi `full` membundel semua biner dan tidak pernah membutuhkan jaringan. Edisi `lite`
menghilangkan dua yang terbesar, `rclone` dan `restic`, dan mengambilnya sesuai permintaan saat
pertama kali Anda menjalankan aksi cloud atau snapshot. `cloud-status` melaporkan apakah keduanya
sudah tersedia, apakah edisi ini bisa mengambilnya, dan ukuran unduhan dalam byte. `cloud-fetch`
berjalan **terlepas** (poll `progress` dengan `opid`-nya): ia mengunduh addon `rclone`+`restic`
per-arsitektur, memverifikasinya terhadap SHA-256 yang dipanggang ke dalam modul, dan memasangnya
ke cache runtime. Fase progresnya adalah `downloading`, `verifying`, dan `installing`; kode
akhirnya adalah `ERR_NONE` jika berhasil, atau `ERR_FETCH` (unduhan gagal) / `ERR_FETCH_VERIFY`
(checksum tidak cocok, dibuang) jika gagal. Pada edisi `full` ia tidak diperlukan. Sebuah
`backup`/`restore` ke tujuan cloud atau snapshot pada edisi `lite`, sebelum biner tersedia, gagal
dengan `ERR_CLOUD_FETCHABLE`; klien sebaiknya menawarkan untuk menjalankan `cloud-fetch`, lalu
mencoba lagi.

### Kategori backup khusus

`special-categories` melaporkan kategori sistem-wide mana yang dimiliki sebuah perangkat;
`special-backup` menangkap kategori yang Anda berikan di `categories` dan `special-restore`
menerapkannya kembali. Kategorinya adalah:

| Kategori | Apa itu | Semantik restore |
|----------|-----------|-------------------|
| `messages` | SMS/MMS | penggantian provider (hapus + ekstrak) |
| `contacts` | kontak dan log panggilan | penggantian provider (hapus + ekstrak) |
| `wifi` | jaringan Wi-Fi tersimpan | penggantian provider (hapus + ekstrak) |
| `bluetooth` | pemasangan Bluetooth | penggantian provider (hapus + ekstrak) |
| `calendar` | provider kalender (`com.android.providers.calendar`, app + data); juga diekspor secara portabel ke `calendar.json` | penggantian provider (hapus + ekstrak) |
| `wallpaper` | wallpaper beranda dan kunci plus `wallpaper_info.xml`, disimpan mentah (biner) | file diganti |
| `dns` | mode DNS privat dan penentunya, dibaca dari settings | `settings put` idempoten |
| `system_settings` | dump lengkap settings system/global/secure | **opt-in**, `settings put` idempoten, menimpa settings perangkat |

**`system_settings` ketat bersifat opt-in dan merusak saat restore.** Seperti `ssaid`, ia
menimpa settings di seluruh perangkat saat direstore, jadi ia dibatasi di balik persetujuan
eksplisit pengguna dan ditulis ke jejak audit. Jangan pernah memilihnya secara default; hanya atas
permintaan pengguna yang langsung dan disengaja.

### Backup path mandiri

`path-backup` / `path-restore` membackup dan merestore **sembarang path absolut** - sebuah folder
atau satu file - di penyimpanan bersama atau di bawah `/data`, di luar model per-app. Arsip ditulis
sebagai `tar.zst` plus sebuah `manifest.json` dalam format milik VDBackup sendiri (disegel SHA-256,
dengan kit RECOVERY saat terenkripsi) di bawah `.paths/` di direktori backups.

```json
// path-backup
{ "path": "/sdcard/DCIM/Camera", "compression": "zstd:10", "password": "..." }
// path-restore
{ "ref": "<.paths ref>", "confirm": true, "password": "..." }
```

- Path sumber harus **absolut** dan di bawah salah satu root yang diizinkan:
  `/storage/emulated`, `/data/media`, `/sdcard`, `/data`. Path yang tidak ada gagal dengan
  `ERR_NO_PATH`; path di luar root yang diizinkan, atau yang mengandung `..`, gagal dengan
  `ERR_BAD_PATH`.
- `path-restore` menulis kembali ke lokasi asli, jadi ia merusak dan membutuhkan
  `"confirm": true` - sebuah gate berfriksi tinggi, seperti `special-restore`. Sebuah `ref` yang
  bukan backup path yang valid gagal dengan `ERR_BAD_REF`.
- Keduanya berjalan **terlepas**; poll `progress` dengan `opid` yang dikembalikan.

### `update-check`

`update-check` melaporkan apakah versi modul yang lebih baru telah dirilis, agar agen (atau WebUI)
dapat menampilkannya. Ini adalah **verba baca yang langsung kembali** - **tidak** terlepas,
sehingga tidak ada `opid` untuk di-poll. Dipicu hanya oleh tindakan eksplisit pengguna, ia
mengambil manifest pembaruan modul yang dirilis (URL `updateJson` dari `module.prop`) dengan `curl`
yang dibundel melalui permintaan HTTP di sisi root - ini berjalan di luar WebView, jadi tidak tunduk
pada CSP WebUI - dan membandingkan `versionCode` yang dirilis dengan yang terpasang. Ia tidak
menerima **argumen apa pun**.

Saat berhasil ia mengembalikan:

| Field | Tipe | Arti |
|-------|------|------|
| `ok` | bool | `true` |
| `current_version` | string | versionName yang terpasang |
| `current_code` | int | versionCode yang terpasang |
| `latest_version` | string | versionName yang dirilis |
| `latest_code` | int | versionCode yang dirilis |
| `update_available` | bool | `true` ketika `latest_code` lebih besar dari `current_code` |
| `zipUrl` | string | URL zip yang dirilis |
| `changelog` | string | URL changelog yang dirilis |
| `notes` | string | catatan rilis |

Jika tidak ada URL `updateJson`, permintaan jaringan gagal, atau manifest tidak dapat diparse, ia
mengembalikan `{"ok":false,"code":"ERR_UPDATE_CHECK"}`.

`update-check` hanya **melaporkan** ketersediaan dan catatan rilis; pembaruan itu sendiri dilakukan
oleh manajer root Anda (KernelSU / APatch / Magisk) melalui `updateJson` modul, tidak pernah oleh
verba ini.

## Pengaman yang harus dipatuhi agen Anda

- **`ssaid` ketat bersifat opt-in (default mati).** Ia membackup / merestore ANDROID_ID
  perangkat dengan menulis ulang file sistem; sebuah restore berlaku hanya setelah reboot, dan
  file sebelumnya selalu disimpan lebih dulu untuk rollback. Kirim `"ssaid": true`
  hanya atas permintaan pengguna yang langsung dan disengaja - jangan pernah secara default.
- **Tindakan yang mengubah (restore, delete, import) bersifat merusak** dan dicatat ke
  jejak audit lokal (`logs/audit.jsonl`). Restore bersifat setia (wipe-lalu-ekstrak), jadi
  ia mengembalikan aplikasi ke keadaan persis dari backup. Konfirmasi niat sebelum memanggilnya.
- **`system_settings` bersifat opt-in dan merusak, persis seperti `ssaid`.** Merestorenya
  menimpa settings di seluruh perangkat, jadi kirim hanya atas permintaan langsung pengguna; ia
  dibatasi oleh persetujuan eksplisit dan dicatat di jejak audit.
- **Restore bersifat idempoten.** Restore provider mentah (messages/contacts/wifi/bluetooth/
  calendar) **mengganti** alih-alih menggabungkan - data provider dihapus dan arsip diekstrak di
  atasnya - jadi merestore ulang backup yang sama tidak bisa menduplikasi baris. `dns` dan
  `system_settings` diterapkan ulang dengan `settings put` yang idempoten.
- **Ekstraksi arsip dijaga terhadap path traversal.** Restore berjalan sebagai root, jadi setiap
  arsip (restore, import, special-restore, path-restore) diperiksa sebelum penulisan apa pun: arsip
  yang anggotanya memakai path absolut atau mengandung `..` ditolak di depan dengan
  `ERR_UNSAFE_ARCHIVE`, sebelum satu pun penulisan merusak terjadi (GNU tar juga berjalan dengan
  `--no-absolute-names`). Arsip yang dirusak tidak akan pernah bisa lolos dari direktori targetnya.
- **Jangan pernah melemahkan** pelestarian (SELinux/uid/gid/mode/xattr) atau aturan APK (APK
  selalu dikompresi, tidak pernah dienkripsi kecuali `encrypt_apk` disetel).
- Perlakukan output JSON sebagai sumber kebenaran; periksa `ok`/`code`, poll `progress`,
  dan tampilkan kode `ERR_*` alih-alih menebak.

Lihat [ARCHITECTURE.md](ARCHITECTURE.md) dan
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) untuk internalnya.

---

*Dokumentasi ini dihasilkan dengan Claude (Anthropic) dan dikelola oleh VD171. Koreksi dan perbaikan dipersilakan - lihat [CONTRIBUTING.md](CONTRIBUTING.md).*
