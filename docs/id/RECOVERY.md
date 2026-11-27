> **Languages:** [English](../../module/etc/RECOVERY.md) · [العربية](../ar/RECOVERY.md) · [Čeština](../cs/RECOVERY.md) · [Deutsch](../de/RECOVERY.md) · [Español](../es/RECOVERY.md) · [فارسی](../fa/RECOVERY.md) · [Français](../fr/RECOVERY.md) · [हिन्दी](../hi/RECOVERY.md) · Bahasa Indonesia · [Italiano](../it/RECOVERY.md) · [日本語](../ja/RECOVERY.md) · [한국어](../ko/RECOVERY.md) · [Nederlands](../nl/RECOVERY.md) · [Polski](../pl/RECOVERY.md) · [Português](../pt/RECOVERY.md) · [Русский](../ru/RECOVERY.md) · [Svenska](../sv/RECOVERY.md) · [ไทย](../th/RECOVERY.md) · [Türkçe](../tr/RECOVERY.md) · [Українська](../uk/RECOVERY.md) · [Tiếng Việt](../vi/RECOVERY.md) · [中文](../zh/RECOVERY.md)

---

# VDBackup, memulihkan backup di PC (Windows / macOS / Linux)

Backup VDBackup Anda menggunakan **format standar**, jadi Anda dapat membukanya di mana saja,
tanpa modul ini. Folder backup berisi `manifest.json`, APK
(`*.apk.zst`) dan arsip data (`<item>.tar.zst`, `.tar.gz` atau `.tar.lz4`),
secara opsional terenkripsi dengan `.age` di akhir.

**Jika datanya terenkripsi**, metadata-nya juga terenkripsi, jadi tidak ada yang bocor
kepada siapa pun yang hanya memiliki berkasnya. Folder itu lalu juga berisi
`manifest.full.age` (manifest lengkap) dan dua berkas kecil `stub.*.age`. `manifest.json`
dalam kasus itu hanyalah penanda kecil yang tidak sensitif; detail sebenarnya ada di
`manifest.full.age`. Semua yang portabel (arsip data dan `manifest.full.age`) didekripsi
cukup dengan **frasa-sandi** Anda - lihat langkah 1. Berkas `stub.dev.age` / `stub.pass.age`
hanyalah cache daftar di-perangkat milik modul; Anda bisa mengabaikannya di PC.

## Alat yang mungkin Anda perlukan

- **zstd**: https://github.com/facebook/zstd/releases  (macOS: `brew install zstd`, Linux: `apt install zstd`)
- **age** (hanya untuk berkas `.age`): https://github.com/FiloSottile/age/releases
- `tar` sudah terpasang di macOS, Linux dan Windows 10/11 modern.
- `gzip` sudah terpasang di mana saja, untuk `.tar.gz` Anda tidak butuh tambahan apa pun.

## 1. Dekripsi (hanya jika berkas berakhir dengan `.age`)

Frasa-sandi (cara yang portabel - bekerja di PC mana pun cukup dengan frasa-sandi Anda):

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

Lakukan hal yang sama untuk setiap berkas `*.age` (APK dan arsip data). Jika backup
terenkripsi, dekripsi `manifest.full.age` dengan cara yang sama untuk membaca manifest
lengkap:

```
age -d -o manifest.json  manifest.full.age    # the full, readable manifest
```

## 2. Dekompresi + ekstrak

`.tar.zst`:

```
zstd -d data.tar.zst            # -> data.tar
tar  -xf data.tar               # extracts the files
```

`.tar.gz`:

```
tar -xzf data.tar.gz
```

`.tar.lz4` (zstd membaca lz4):

```
zstd -d --format=lz4 data.tar.lz4 -o data.tar
tar  -xf data.tar
```

APK hanyalah berkas APK (ZIP) yang terkompresi-zstd:

```
zstd -d base.apk.zst            # -> base.apk  (a normal installable APK)
```

## Catatan

- Berkas yang diekstrak mempertahankan path relatifnya, konteks SELinux, uid/gid dan modes
  ada di dalam tar (dan diterapkan ulang dengan benar hanya ketika Anda memulihkan di Android).
- `manifest.json` mendeskripsikan persis apa setiap berkas itu, versi aplikasi dan
  pemilik/konteks asli. Ia adalah sumber kebenaran. Untuk backup terenkripsi, manifest
  lengkapnya adalah `manifest.full.age` (dekripsi seperti pada langkah 1); `manifest.json`
  teks-biasa hanyalah penanda kecil dan tidak membawa data sensitif apa pun.
- Tidak ada di sini yang terikat ke perangkat spesifik: frasa-sandi yang sama bekerja di mesin
  mana pun.

<!-- doc-footer -->

---

> _Dokumentasi ini dibuat dengan Claude (Anthropic) dan dikelola oleh VD171. Koreksi dan perbaikan dipersilakan, lihat [CONTRIBUTING.md](CONTRIBUTING.md)._
