> **Languages:** English · [العربية](../../docs/ar/RECOVERY.md) · [Čeština](../../docs/cs/RECOVERY.md) · [Deutsch](../../docs/de/RECOVERY.md) · [Español](../../docs/es/RECOVERY.md) · [فارسی](../../docs/fa/RECOVERY.md) · [Français](../../docs/fr/RECOVERY.md) · [हिन्दी](../../docs/hi/RECOVERY.md) · [Bahasa Indonesia](../../docs/in/RECOVERY.md) · [Italiano](../../docs/it/RECOVERY.md) · [日本語](../../docs/ja/RECOVERY.md) · [한국어](../../docs/ko/RECOVERY.md) · [Nederlands](../../docs/nl/RECOVERY.md) · [Polski](../../docs/pl/RECOVERY.md) · [Português](../../docs/pt/RECOVERY.md) · [Русский](../../docs/ru/RECOVERY.md) · [Svenska](../../docs/sv/RECOVERY.md) · [ไทย](../../docs/th/RECOVERY.md) · [Türkçe](../../docs/tr/RECOVERY.md) · [Tiếng Việt](../../docs/vi/RECOVERY.md) · [中文](../../docs/zh/RECOVERY.md)

---

# VDBackup - recover a backup on a PC (Windows / macOS / Linux)

Your VDBackup backups use **standard formats**, so you can open them anywhere,
without this module. A backup folder contains a `manifest.json`, the APKs
(`*.apk.zst`) and the data archives (`<item>.tar.zst`, `.tar.gz` or `.tar.lz4`),
optionally encrypted with a trailing `.age`.

## Tools you may need

- **zstd**: https://github.com/facebook/zstd/releases  (macOS: `brew install zstd`; Linux: `apt install zstd`)
- **age** (only for `.age` files): https://github.com/FiloSottile/age/releases
- `tar` is built into macOS, Linux and modern Windows 10/11.
- `gzip` is built in everywhere; for `.tar.gz` you need nothing extra.

## 1. Decrypt (only if the file ends with `.age`)

Keyfile (recommended):

```
age -d -i age.key -o data.tar.zst  data.tar.zst.age
```

Passphrase:

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

Do the same for each `*.age` file (APKs and data archives).

## 2. Decompress + extract

`.tar.zst`:

```
zstd -d data.tar.zst            # -> data.tar
tar  -xf data.tar               # extracts the files
```

`.tar.gz`:

```
tar -xzf data.tar.gz
```

`.tar.lz4` (zstd reads lz4):

```
zstd -d --format=lz4 data.tar.lz4 -o data.tar
tar  -xf data.tar
```

APKs are just zstd-compressed APK (ZIP) files:

```
zstd -d base.apk.zst            # -> base.apk  (a normal installable APK)
```

## Notes

- Extracted files keep their relative paths; the SELinux context, uid/gid and modes
  are inside the tar (and are reapplied properly only when you restore on Android).
- `manifest.json` describes exactly what each file is, the app version and the
  original owner/context. It is the source of truth.
- Nothing here is tied to a specific device: the same passphrase/keyfile works on any
  machine.
