> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · Bahasa Indonesia · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# Berkontribusi ke VDBackup

Terima kasih sudah membantu! VDBackup dibuat agar mudah untuk dikontribusikan. Panduan ini memberi tahu
Anda di mana segala sesuatu berada dan beberapa konvensi yang kami ikuti.

## Sekilas tentang proyek

VDBackup adalah **modul WebUI KernelSU/APatch/Magisk**: skrip shell + WebUI
vanilla-JS + biner statis per-ABI. Tidak ada aplikasi yang diperlukan untuk fitur inti. Lihat
[ARCHITECTURE.md](ARCHITECTURE.md) dan [docs/FILE-STRUCTURE.md](docs/FILE-STRUCTURE.md).

Ia adalah **penerus** terbuka dan root-native dari **Swift Backup, Neo-Backup, dan
Android-DataBackup** - gabungan fitur-fitur mereka di bawah AGPLv3, dengan impor backup
Neo-Backup dan Android-DataBackup yang sudah ada sehingga orang dapat bermigrasi.

## Kontributor AI disambut

Asisten dan agen AI adalah kontributor kelas satu di sini, bukan sekadar pelengkap.

- Proyek ini dibuat agar dapat dibaca mesin: setiap verb `helper.sh` mencetak satu
  objek JSON, mesinnya adalah shell POSIX biasa, dan tata letak berkas didokumentasikan di
  [docs/FILE-STRUCTURE.md](docs/FILE-STRUCTURE.md).
- Sebuah agen dapat mengelola **setiap** konten dan aksi modul secara headless melalui
  JSON API itu - permukaan kendali lengkap, verb dan pengaman keselamatan ada di
  [docs/AI-AGENTS.md](docs/AI-AGENTS.md).
- Patch dengan bantuan AI ditinjau dan diterima dengan syarat yang sama seperti lainnya - berdasarkan
  kebenaran, kejelasan dan konvensi di bawah ini, bukan berdasarkan siapa (atau apa) yang menulisnya.
- Jika Anda menjalankan VDBackup dari sebuah agen, gunakan keluaran JSON `helper.sh` sebagai
  kontrak; jangan scrape WebUI.
- Standar yang sama untuk semua: fitur nyata tidak pernah dilemahkan, rahasia dan data perangkat
  tidak pernah masuk ke repo (lihat [.gitignore](.gitignore) yang ketat), dan aksi yang
  mengubah tetap dikonfirmasi dan diaudit.

## Penyiapan dev

- Anda butuh perangkat/emulator yang di-root (KernelSU, APatch atau Magisk) untuk menguji.
- Build zip yang dapat di-flash: `cd module && zip -r9 ../VD-Backup-dev.zip .` lalu flash.
- WebUI ada di `module/webroot/` (buka dari root manager). Backend ada di
  `module/helper.sh` (dispatcher) dan `module/worker.sh` (mesin terlepas).
- Biner native berada di `module/bin/<abi>/` dan dihasilkan oleh CI
  (`.github/scripts/build_bin.sh`); Anda biasanya tidak membangunnya ulang secara manual.

## Konvensi

- **Setiap berkas sumber** (`.sh`, `.js`, `.css`, `.html`, `.svg`, `.yml`) diawali dengan
  header banner proyek (salin dari berkas mana pun yang sudah ada). Tanpa kecuali.
- **Kode dan komentar dalam bahasa Inggris.** Jaga komentar tetap minimal dan hanya di tempat yang diperlukan.
- **Tanpa em-dash atau en-dash**; selalu gunakan tanda hubung biasa `-`.
- WebUI adalah **vanilla JS** (satu `scripts.js`); tanpa framework. Berbicara ke root hanya melalui
  pembungkus `helper(verb, args)`, dan escape setiap nilai yang diinterpolasi.
- **Jangan pernah melemahkan** fitur nyata (mis. pelestarian SELinux/uid/gid/modes).
- Aksi yang mengubah (restore, delete) harus meminta konfirmasi dan menulis log audit.

## Internasionalisasi (i18n)

- String UI berada di `module/webroot/lang/`. Bahasa Inggris adalah fallback kanonis
  (`en.js` + `en.json`); 20 bahasa lainnya adalah `<code>.json`.
- Untuk menambah atau mengubah string: edit `en.js` **dan** `en.json`, lalu perbarui setiap
  `<code>.json`. Menyentuh label yang terlihat berarti memperbarui **semua** berkas bahasa dan
  **semua** `README.<code>.md`.
- Terjemahan adalah JSON biasa - kontribusi pertama yang bagus. Lihat daftar bahasa di
  `module/webroot/i18n.js`.

## Commit & PR

- Jaga PR tetap fokus. Jelaskan apa dan mengapa.
- Sign off commit Anda (DCO): `git commit -s` (menambahkan `Signed-off-by:`).
- CI harus tetap hijau. Bersikaplah baik dalam ulasan - lihat [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Good first issue

Cari label `good first issue` dan `help wanted`. Terjemahan, dokumentasi, preset destinasi
`rclone` baru dan pemolesan WebUI semuanya adalah titik awal yang bagus.
