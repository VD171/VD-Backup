> **Languages:** [English](../../module/etc/RECOVERY.md) · [العربية](../ar/RECOVERY.md) · [Čeština](../cs/RECOVERY.md) · [Deutsch](../de/RECOVERY.md) · [Español](../es/RECOVERY.md) · [فارسی](../fa/RECOVERY.md) · [Français](../fr/RECOVERY.md) · [हिन्दी](../hi/RECOVERY.md) · [Bahasa Indonesia](../in/RECOVERY.md) · [Italiano](../it/RECOVERY.md) · [日本語](../ja/RECOVERY.md) · [한국어](../ko/RECOVERY.md) · [Nederlands](../nl/RECOVERY.md) · [Polski](../pl/RECOVERY.md) · [Português](../pt/RECOVERY.md) · Русский · [Svenska](../sv/RECOVERY.md) · [ไทย](../th/RECOVERY.md) · [Türkçe](../tr/RECOVERY.md) · [Tiếng Việt](../vi/RECOVERY.md) · [中文](../zh/RECOVERY.md)

---

# VDBackup, восстановление резервной копии на ПК (Windows / macOS / Linux)

Ваши резервные копии VDBackup используют **стандартные форматы**, поэтому вы можете открыть их где угодно,
без этого модуля. Папка резервной копии содержит `manifest.json`, APK
(`*.apk.zst`) и архивы данных (`<item>.tar.zst`, `.tar.gz` или `.tar.lz4`),
опционально зашифрованные с завершающим `.age`.

## Инструменты, которые вам могут понадобиться

- **zstd**: https://github.com/facebook/zstd/releases  (macOS: `brew install zstd`; Linux: `apt install zstd`)
- **age** (только для файлов `.age`): https://github.com/FiloSottile/age/releases
- `tar` встроен в macOS, Linux и современные Windows 10/11.
- `gzip` встроен везде; для `.tar.gz` вам ничего дополнительно не нужно.

## 1. Расшифровка (только если файл заканчивается на `.age`)

Keyfile (рекомендуется):

```
age -d -i age.key -o data.tar.zst  data.tar.zst.age
```

Парольная фраза:

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

Сделайте то же самое для каждого файла `*.age` (APK и архивы данных).

## 2. Разжатие + извлечение

`.tar.zst`:

```
zstd -d data.tar.zst            # -> data.tar
tar  -xf data.tar               # extracts the files
```

`.tar.gz`:

```
tar -xzf data.tar.gz
```

`.tar.lz4` (zstd читает lz4):

```
zstd -d --format=lz4 data.tar.lz4 -o data.tar
tar  -xf data.tar
```

APK, это просто сжатые zstd файлы APK (ZIP):

```
zstd -d base.apk.zst            # -> base.apk  (a normal installable APK)
```

## Замечания

- Извлечённые файлы сохраняют свои относительные пути; контекст SELinux, uid/gid и режимы
  находятся внутри tar (и повторно применяются должным образом только при восстановлении на Android).
- `manifest.json` описывает точно, что собой представляет каждый файл, версию приложения и
  исходного владельца/контекст. Это источник истины.
- Ничего здесь не привязано к конкретному устройству: та же парольная фраза/keyfile работает на любой
  машине.
