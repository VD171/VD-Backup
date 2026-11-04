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
| `backup-info` | `{ref}` | `{ok,...}` detail lengkap satu backup (versi, sumber pemasangan, keadaan, tanggal, mode, ukuran, item, jumlah izin, perangkat) |
| `backup-icon` | `{ref}` | `{ok,icon}` PNG base64 dari manifest (berfungsi saat aplikasi sudah dicopot) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref harus berada di bawah direktori backups) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` simpan N terbaru dari sebuah paket |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` log audit, terbaru lebih dahulu |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` backup sistem-wide (terlepas) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (butuh-reboot; `confirm` membatasinya) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | pasang aplikasi terpasang sebagai aplikasi sistem (sub-modul systemless; live via NoMount jika tidak maka boot berikutnya) |
| `companion-status` / `companion-install` | `{}` | status pendamping Google Drive / pemasangan sesuai permintaan |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | pengelolaan tujuan |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | pengelolaan remote rclone (membuat entri `rclone.conf` yang ditunjuk oleh dest `type:"rclone"`) |
| `schedule-set` / `schedule-list` / `schedule-delete` | `{id,package,mode,dest,cron,at,keep,items}` | pekerjaan terjadwal |
| `scheduler-tick` | `{}` | menjalankan pekerjaan yang jatuh tempo + menerapkan retensi + observer pencadangan otomatis (heartbeat boot memanggil ini) |

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
  "ssaid": false                  // OPT-IN, see below
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

### Args `remote-add`

Tujuan cloud adalah dest `type:"rclone"` yang menamai sebuah remote `rclone`; buat
remote itu terlebih dahulu dengan `remote-add`. Field kata sandi disimpan dalam keadaan tersamar, tidak pernah
polos. Nilai `backend` yang didukung dan `params`-nya:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

Google Drive memiliki dua jalur: remote `drive` ini (tidak butuh proyek Google Cloud, memakai
OAuth milik rclone sendiri - jalankan `rclone authorize "drive"` satu kali di komputer mana pun dan teruskan
tokennya) atau aplikasi pendamping opt-in (client id OAuth Anda sendiri). Keduanya berakhir sebagai
tujuan biasa.

### Kebijakan jaringan

Field config `network_policy` mengontrol koneksi mana yang boleh dipakai transfer cloud:
`any` (default), `wifi`, atau `mobile`. Setel dengan `config-set`. Ketika bernilai `wifi` atau
`mobile`, setiap transfer cloud (unggah `rclone`/Drive Full, sinkronisasi Mirror, backup/restore
snapshot `restic` remote, restore Mirror) memeriksa transport aktif terlebih dahulu dan
berhenti dengan `ERR_NET_POLICY` jika tidak cocok - baik untuk pekerjaan manual maupun terjadwal.
Tujuan lokal tidak pernah dibatasi.

## Pengaman yang harus dipatuhi agen Anda

- **`ssaid` ketat bersifat opt-in (default mati).** Ia membackup / merestore ANDROID_ID
  perangkat dengan menulis ulang file sistem; sebuah restore berlaku hanya setelah reboot, dan
  file sebelumnya selalu disimpan lebih dulu untuk rollback. Kirim `"ssaid": true`
  hanya atas permintaan pengguna yang langsung dan disengaja - jangan pernah secara default.
- **Tindakan yang mengubah (restore, delete, import) bersifat merusak** dan dicatat ke
  jejak audit lokal (`logs/audit.jsonl`). Restore bersifat setia (wipe-lalu-ekstrak), jadi
  ia mengembalikan aplikasi ke keadaan persis dari backup. Konfirmasi niat sebelum memanggilnya.
- **Jangan pernah melemahkan** pelestarian (SELinux/uid/gid/mode/xattr) atau aturan APK (APK
  selalu dikompresi, tidak pernah dienkripsi kecuali `encrypt_apk` disetel).
- Perlakukan output JSON sebagai sumber kebenaran; periksa `ok`/`code`, poll `progress`,
  dan tampilkan kode `ERR_*` alih-alih menebak.

Lihat [ARCHITECTURE.md](../ARCHITECTURE.md) dan
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) untuk internalnya.

---

*Dokumentasi ini dihasilkan dengan Claude (Anthropic) dan dikelola oleh VD171. Koreksi dan perbaikan dipersilakan - lihat [CONTRIBUTING.md](../CONTRIBUTING.md).*
