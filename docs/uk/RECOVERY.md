> **Languages:** [English](../../module/etc/RECOVERY.md) · [العربية](../ar/RECOVERY.md) · [Čeština](../cs/RECOVERY.md) · [Deutsch](../de/RECOVERY.md) · [Español](../es/RECOVERY.md) · [فارسی](../fa/RECOVERY.md) · [Français](../fr/RECOVERY.md) · [हिन्दी](../hi/RECOVERY.md) · [Bahasa Indonesia](../in/RECOVERY.md) · [Italiano](../it/RECOVERY.md) · [日本語](../ja/RECOVERY.md) · [한국어](../ko/RECOVERY.md) · [Nederlands](../nl/RECOVERY.md) · [Polski](../pl/RECOVERY.md) · [Português](../pt/RECOVERY.md) · [Русский](../ru/RECOVERY.md) · [Svenska](../sv/RECOVERY.md) · [ไทย](../th/RECOVERY.md) · [Türkçe](../tr/RECOVERY.md) · Українська · [Tiếng Việt](../vi/RECOVERY.md) · [中文](../zh/RECOVERY.md)

---

# VDBackup: відновлення резервної копії на ПК (Windows / macOS / Linux)

Ваші резервні копії VDBackup використовують **стандартні формати**, тож ви можете відкрити їх будь-де,
без цього модуля. Тека резервної копії містить `manifest.json`, APK
(`*.apk.zst`) та архіви даних (`<item>.tar.zst`, `.tar.gz` або `.tar.lz4`),
за бажанням зашифровані кінцевим `.age`.

## Інструменти, які можуть знадобитися

- **zstd**: https://github.com/facebook/zstd/releases  (macOS: `brew install zstd`; Linux: `apt install zstd`)
- **age** (лише для файлів `.age`): https://github.com/FiloSottile/age/releases
- `tar` вбудовано в macOS, Linux і сучасні Windows 10/11.
- `gzip` вбудовано скрізь; для `.tar.gz` вам не потрібно нічого додаткового.

## 1. Розшифрування (лише якщо файл закінчується на `.age`)

Файл ключа (рекомендовано):

```
age -d -i age.key -o data.tar.zst  data.tar.zst.age
```

Парольна фраза:

```
age -d -o data.tar.zst  data.tar.zst.age      # age запитає парольну фразу
```

Зробіть те саме для кожного файлу `*.age` (APK та архівів даних).

## 2. Розпакування + видобування

`.tar.zst`:

```
zstd -d data.tar.zst            # -> data.tar
tar  -xf data.tar               # видобуває файли
```

`.tar.gz`:

```
tar -xzf data.tar.gz
```

`.tar.lz4` (zstd читає lz4):

```
zstd -d --format=lz4 data.tar.lz4 -o data.tar
tar  -xf data.tar
```

APK: це просто стиснені zstd файли APK (ZIP):

```
zstd -d base.apk.zst            # -> base.apk  (звичайний встановлюваний APK)
```

## Нотатки

- Видобуті файли зберігають свої відносні шляхи; контекст SELinux, uid/gid та режими
  містяться всередині tar (і правильно застосовуються лише коли ви відновлюєте на Android).
- `manifest.json` описує точно, чим є кожен файл, версію застосунку та
  початкового власника/контекст. Це джерело істини.
- Ніщо тут не прив'язане до конкретного пристрою: та сама парольна фраза/файл ключа працює на будь-якій
  машині.

<!-- doc-footer -->

---

> _Ця документація створена за допомогою Claude (Anthropic) і підтримується VD171. Виправлення та покращення вітаються; див. [CONTRIBUTING.md](CONTRIBUTING.md)._
