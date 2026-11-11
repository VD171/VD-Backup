> **Languages:** [English](../../module/etc/RECOVERY.md) · [العربية](../ar/RECOVERY.md) · [Čeština](../cs/RECOVERY.md) · [Deutsch](../de/RECOVERY.md) · [Español](../es/RECOVERY.md) · [فارسی](../fa/RECOVERY.md) · [Français](../fr/RECOVERY.md) · [हिन्दी](../hi/RECOVERY.md) · [Bahasa Indonesia](../in/RECOVERY.md) · [Italiano](../it/RECOVERY.md) · [日本語](../ja/RECOVERY.md) · [한국어](../ko/RECOVERY.md) · [Nederlands](../nl/RECOVERY.md) · Polski · [Português](../pt/RECOVERY.md) · [Русский](../ru/RECOVERY.md) · [Svenska](../sv/RECOVERY.md) · [ไทย](../th/RECOVERY.md) · [Türkçe](../tr/RECOVERY.md) · [Tiếng Việt](../vi/RECOVERY.md) · [中文](../zh/RECOVERY.md)

---

# VDBackup, odzyskiwanie kopii zapasowej na komputerze (Windows / macOS / Linux)

Twoje kopie zapasowe VDBackup używają **standardowych formatów**, więc możesz otworzyć je gdziekolwiek,
bez tego modułu. Folder kopii zapasowej zawiera `manifest.json`, pliki APK
(`*.apk.zst`) oraz archiwa danych (`<item>.tar.zst`, `.tar.gz` lub `.tar.lz4`),
opcjonalnie zaszyfrowane z końcowym `.age`.

## Narzędzia, których możesz potrzebować

- **zstd**: https://github.com/facebook/zstd/releases  (macOS: `brew install zstd`; Linux: `apt install zstd`)
- **age** (tylko dla plików `.age`): https://github.com/FiloSottile/age/releases
- `tar` jest wbudowany w macOS, Linux oraz nowoczesny Windows 10/11.
- `gzip` jest wbudowany wszędzie; dla `.tar.gz` nie potrzebujesz niczego dodatkowego.

## 1. Odszyfruj (tylko jeśli plik kończy się na `.age`)

Plik klucza (zalecane):

```
age -d -i age.key -o data.tar.zst  data.tar.zst.age
```

Hasło:

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

Zrób to samo dla każdego pliku `*.age` (APK i archiwa danych).

## 2. Zdekompresuj + rozpakuj

`.tar.zst`:

```
zstd -d data.tar.zst            # -> data.tar
tar  -xf data.tar               # extracts the files
```

`.tar.gz`:

```
tar -xzf data.tar.gz
```

`.tar.lz4` (zstd odczytuje lz4):

```
zstd -d --format=lz4 data.tar.lz4 -o data.tar
tar  -xf data.tar
```

APK to po prostu skompresowane zstd pliki APK (ZIP):

```
zstd -d base.apk.zst            # -> base.apk  (a normal installable APK)
```

## Uwagi

- Rozpakowane pliki zachowują swoje ścieżki względne; kontekst SELinux, uid/gid i tryby
  są wewnątrz tar (i są poprawnie ponownie stosowane dopiero, gdy przywracasz na Androidzie).
- `manifest.json` opisuje dokładnie, czym jest każdy plik, wersję aplikacji oraz
  oryginalnego właściciela/kontekst. To źródło prawdy.
- Nic tutaj nie jest powiązane z konkretnym urządzeniem: to samo hasło/plik klucza działa na dowolnej
  maszynie.
