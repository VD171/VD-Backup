> **Languages:** [English](../../module/etc/RECOVERY.md) · [العربية](../ar/RECOVERY.md) · [Čeština](../cs/RECOVERY.md) · [Deutsch](../de/RECOVERY.md) · [Español](../es/RECOVERY.md) · [فارسی](../fa/RECOVERY.md) · [Français](../fr/RECOVERY.md) · [हिन्दी](../hi/RECOVERY.md) · Bahasa Indonesia · [Italiano](../it/RECOVERY.md) · [日本語](../ja/RECOVERY.md) · [한국어](../ko/RECOVERY.md) · [Nederlands](../nl/RECOVERY.md) · [Polski](../pl/RECOVERY.md) · [Português](../pt/RECOVERY.md) · [Русский](../ru/RECOVERY.md) · [Svenska](../sv/RECOVERY.md) · [ไทย](../th/RECOVERY.md) · [Türkçe](../tr/RECOVERY.md) · [Tiếng Việt](../vi/RECOVERY.md) · [中文](../zh/RECOVERY.md)

---

# VDBackup, memulihkan backup di PC (Windows / macOS / Linux)

Backup VDBackup Anda menggunakan **format standar**, jadi Anda dapat membukanya di mana saja,
tanpa modul ini. Folder backup berisi `manifest.json`, APK
(`*.apk.zst`) dan arsip data (`<item>.tar.zst`, `.tar.gz` atau `.tar.lz4`),
secara opsional terenkripsi dengan `.age` di akhir.

## Alat yang mungkin Anda perlukan

- **zstd**: https://github.com/facebook/zstd/releases  (macOS: `brew install zstd`; Linux: `apt install zstd`)
- **age** (hanya untuk berkas `.age`): https://github.com/FiloSottile/age/releases
- `tar` sudah terpasang di macOS, Linux dan Windows 10/11 modern.
- `gzip` sudah terpasang di mana saja; untuk `.tar.gz` Anda tidak butuh tambahan apa pun.

## 1. Dekripsi (hanya jika berkas berakhir dengan `.age`)

Keyfile (direkomendasikan):

```
age -d -i age.key -o data.tar.zst  data.tar.zst.age
```

Frasa-sandi:

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

Lakukan hal yang sama untuk setiap berkas `*.age` (APK dan arsip data).

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

- Berkas yang diekstrak mempertahankan path relatifnya; konteks SELinux, uid/gid dan modes
  ada di dalam tar (dan diterapkan ulang dengan benar hanya ketika Anda memulihkan di Android).
- `manifest.json` mendeskripsikan persis apa setiap berkas itu, versi aplikasi dan
  pemilik/konteks asli. Ia adalah sumber kebenaran.
- Tidak ada di sini yang terikat ke perangkat spesifik: frasa-sandi/keyfile yang sama bekerja di mesin
  mana pun.
