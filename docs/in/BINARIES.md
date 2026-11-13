> **Languages:** [English](../BINARIES.md) · [العربية](../ar/BINARIES.md) · [Čeština](../cs/BINARIES.md) · [Deutsch](../de/BINARIES.md) · [Español](../es/BINARIES.md) · [فارسی](../fa/BINARIES.md) · [Français](../fr/BINARIES.md) · [हिन्दी](../hi/BINARIES.md) · Bahasa Indonesia · [Italiano](../it/BINARIES.md) · [日本語](../ja/BINARIES.md) · [한국어](../ko/BINARIES.md) · [Nederlands](../nl/BINARIES.md) · [Polski](../pl/BINARIES.md) · [Português](../pt/BINARIES.md) · [Русский](../ru/BINARIES.md) · [Svenska](../sv/BINARIES.md) · [ไทย](../th/BINARIES.md) · [Türkçe](../tr/BINARIES.md) · [Українська](../uk/BINARIES.md) · [Tiếng Việt](../vi/BINARIES.md) · [中文](../zh/BINARIES.md)

---

# Biner terpaket: asal-usul dan audit

Privasi dan keamanan bukan hal opsional di VDBackup. Alat pencadangan berjalan sebagai
root atas data paling pribadi Anda, jadi Anda harus bisa melihat persis apa yang dikirim
di dalamnya. Halaman ini mendokumentasikan setiap biner dan pustaka prabangun yang dibawa
modul, dari mana masing-masing berasal, dan bagaimana memverifikasi bahwa tidak ada hal
buram yang diselipkan.

## Prinsip

- **Tidak ada yang buram.** Setiap biner dan pustaka yang dikirim dapat dilacak ke sebuah
   upstream publik bernama pada versi yang disematkan, dengan SHA-256 yang tercatat. Tidak
  ada blob yang dipaketkan tanpa entri yang dapat Anda periksa.
- **Diambil dari upstream, tidak pernah dari sebuah perangkat.** Alat native berasal dari
  repositori paket Termux resmi (berkas `.deb` bertanda tangan di `packages.termux.dev/apt`),
  tidak pernah disalin dari sebuah Termux yang terpasang di suatu ponsel. Build gagal dengan
  lantang, ia tidak pernah berimprovisasi.
- **Dapat direproduksi.** Jalankan ulang build dan Anda mendapatkan berkas yang sama; ambil
   ulang sumber yang disematkan dan nilai SHA-256 cocok.
- **Jejak audit dikirim bersama modul.** Bukan hanya di situs web, ia ikut bepergian di
  dalam modul yang terpasang, di perangkat Anda, sehingga Anda bisa mengaudit secara luring.

## Apa yang dikirim, dan dari mana

| Artefak | Sumber | Bagaimana ia dibangun |
|---|---|---|
| `bin/<abi>/` alat native (`tar`, `zstd`, `gzip`, `lz4`, `jq`, `rclone`, `restic`, `rsync`, `ssh`/`scp`/`sftp`, `age`, `age-keygen`, `script`, `sqlite3`) + penutupan `lib/` miliknya | Repo apt **Termux** resmi (`packages.termux.dev/apt`), paket `.deb` resmi | `.github/scripts/build_bin.sh` mengunduh berkas `.deb` + dependensi transitifnya, mengekstraknya, dan menyalin biner beserta hanya pustaka bersama yang dibutuhkan masing-masing |
| `bin/<abi>/abx2xml`, `bin/<abi>/xml2abx` (fallback konverter ABX) | Rilis GitHub **rhythmcache/android-xml-converter** (`ABX_RELEASE`, ELF statis) | diunduh dari rilis yang disematkan oleh `build_bin.sh` |
| `companion.apk` (pendamping Google Drive opsional) | **Repositori ini**, `companion/` (Gradle/Kotlin) | dibangun dari sumber oleh CI dan ditandatangani dengan kunci proyek; bukan blob prabangun |
| `vdbackup_helper.dex` (helper framework) | **Repositori ini**, `dex/src/` (Java) | dikompilasi dari sumber oleh CI dengan `javac` + `d8` |

Hanya dua baris pertama yang merupakan biner pihak ketiga prabangun; dua terakhir dibangun
dari sumber yang berada di repositori ini dan dapat dibaca serta dibangun ulang.

> **Edisi Full vs lite.** Edisi lite hanya menghilangkan `rclone` dan `restic` (dua biner terbesar) agar tetap kecil dan mengambilnya sesuai permintaan (diverifikasi dengan SHA-256) saat pertama kali Anda memakai tujuan cloud atau mode snapshot; `rsync` dan `ssh`/`scp`/`sftp` tetap disertakan, dan setiap biner lain yang tercantum di atas juga hadir. Edisi Full menyertakan `rclone` (penyedia cloud) dan `restic` (snapshot) secara tertanam, sehingga tidak pernah ada yang diunduh.

## Manifes di perangkat: `PROVENANCE.json`

`build_bin.sh` menulis satu `bin/<abi>/PROVENANCE.json` per ABI. Saat pemasangan, modul
hanya menyimpan ABI perangkat Anda, jadi berkas itu tetap ada di perangkat pada
`/data/adb/modules/vdbackup/bin/<abi>/PROVENANCE.json`. Ia mencatat:

- `sources`: setiap `.deb` upstream (paket, versi, URL lengkap, SHA-256 dari `.deb`) dan
   rilis ABX (URL, SHA-256 dari arsip).
- `files`: setiap berkas yang benar-benar dikirim di bawah `bin/<abi>/` (jalur, ukuran,
  SHA-256).

Anda dapat membacanya di WebUI (tab **About** menautkannya) atau melalui API agen:

```sh
sh /data/adb/modules/vdbackup/helper.sh provenance '' | jq .
```

## Cara memverifikasi (langkah demi langkah)

1. **Periksa berkas yang dikirim.** Hash setiap berkas di bawah `bin/<abi>/` pada perangkat
   Anda dan bandingkan dengan `files[].sha256` di `PROVENANCE.json`:
   ```sh
   cd /data/adb/modules/vdbackup/bin/<abi>
   sha256sum tar zstd jq rclone ... lib/*
   ```
2. **Periksa berkas terhadap upstream.** Untuk setiap entri `sources[]`, unduh `.deb` yang
   disematkan dari URL-nya, pastikan SHA-256-nya cocok dengan `deb_sha256`, ekstrak, dan
   pastikan biner/pustaka yang dikandungnya menghasilkan hash dengan nilai yang sama dengan
   yang dikirim. Berkas `.deb` di repo Termux sendiri disajikan dari repositori apt Termux
   yang bertanda tangan.
3. **Bangun ulang dari awal.** Jalankan sendiri `.github/scripts/build_bin.sh` (hanya butuh
   `curl`, `ar`, `tar`, `xz`, `zstd`, `readelf`) dan bandingkan keluarannya dengan yang
   dikirim.
4. **Pendamping dan dex.** Bangun ulang `companion/` dan `dex/` dari sumber; tanda tangan
   pendamping adalah kunci proyek (SHA-256
   `F3:F8:2B:B9:2F:2C:69:A1:75:90:1D:40:BD:65:DD:A6:8F:2B:B5:88:69:77:F5:EA:8B:BA:AA:51:40:E5:25:2B`).

## Pelaporan

Jika ada berkas yang dikirim tidak cocok dengan sumber tercatatnya, perlakukan sebagai
masalah keamanan dan laporkan (lihat [SECURITY.md](SECURITY.md)). Ini persis jenis
ketidaksesuaian yang karenanya manifes ini ada untuk membuatnya terlihat.

<!-- doc-footer -->

---

> _Dokumentasi ini dibuat dengan Claude (Anthropic) dan dikelola oleh VD171. Koreksi dan perbaikan dipersilakan; lihat [CONTRIBUTING.md](CONTRIBUTING.md)._
