> **Languages:** [English](../../module/etc/RECOVERY.md) · [العربية](../ar/RECOVERY.md) · [Čeština](../cs/RECOVERY.md) · [Deutsch](../de/RECOVERY.md) · [Español](../es/RECOVERY.md) · [فارسی](../fa/RECOVERY.md) · [Français](../fr/RECOVERY.md) · [हिन्दी](../hi/RECOVERY.md) · [Bahasa Indonesia](../id/RECOVERY.md) · [Italiano](../it/RECOVERY.md) · [日本語](../ja/RECOVERY.md) · [한국어](../ko/RECOVERY.md) · [Nederlands](../nl/RECOVERY.md) · Polski · [Português](../pt/RECOVERY.md) · [Русский](../ru/RECOVERY.md) · [Svenska](../sv/RECOVERY.md) · [ไทย](../th/RECOVERY.md) · [Türkçe](../tr/RECOVERY.md) · [Українська](../uk/RECOVERY.md) · [Tiếng Việt](../vi/RECOVERY.md) · [中文](../zh/RECOVERY.md)

---

# VDBackup, odzyskiwanie kopii zapasowej na komputerze (Windows / macOS / Linux)

Twoje kopie zapasowe VDBackup używają **standardowych formatów**, więc możesz otworzyć je gdziekolwiek,
bez tego modułu. Folder kopii zapasowej zawiera `manifest.json`, pliki APK
(`*.apk.zst`) oraz archiwa danych (`<item>.tar.zst`, `.tar.gz` lub `.tar.lz4`),
opcjonalnie zaszyfrowane z końcowym `.age`.

**Jeśli dane są zaszyfrowane**, metadane również są zaszyfrowane, więc nic z nich nie wycieka do
nikogo, kto ma tylko pliki. Folder zawiera wtedy także `manifest.full.age` (pełny manifest) oraz
dwa małe pliki `stub.*.age`. `manifest.json` jest w takim przypadku jedynie drobnym, niewrażliwym
znacznikiem; prawdziwe szczegóły znajdują się w `manifest.full.age`. Wszystko, co przenośne
(archiwa danych i `manifest.full.age`), odszyfrujesz samym swoim **hasłem** - zobacz krok 1. Pliki
`stub.dev.age` / `stub.pass.age` to tylko podręczna pamięć listowania modułu na urządzeniu; na
komputerze możesz je zignorować.

## Narzędzia, których możesz potrzebować

- **zstd**: https://github.com/facebook/zstd/releases  (macOS: `brew install zstd`, Linux: `apt install zstd`)
- **age** (tylko dla plików `.age`): https://github.com/FiloSottile/age/releases
- `tar` jest wbudowany w macOS, Linux oraz nowoczesny Windows 10/11.
- `gzip` jest wbudowany wszędzie, dla `.tar.gz` nie potrzebujesz niczego dodatkowego.

## 1. Odszyfruj (tylko jeśli plik kończy się na `.age`)

Hasło (sposób przenośny - działa na każdym komputerze przy użyciu samego hasła):

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

Zrób to samo dla każdego pliku `*.age` (APK i archiwa danych). Jeśli kopia jest zaszyfrowana,
odszyfruj `manifest.full.age` w ten sam sposób, aby odczytać pełny manifest:

```
age -d -o manifest.json  manifest.full.age    # the full, readable manifest
```

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

- Rozpakowane pliki zachowują swoje ścieżki względne, kontekst SELinux, uid/gid i tryby
  są wewnątrz tar (i są poprawnie ponownie stosowane dopiero, gdy przywracasz na Androidzie).
- `manifest.json` opisuje dokładnie, czym jest każdy plik, wersję aplikacji oraz
  oryginalnego właściciela/kontekst. To źródło prawdy. W przypadku zaszyfrowanej kopii pełnym
  manifestem jest `manifest.full.age` (odszyfruj go jak w kroku 1); jawny `manifest.json` jest
  tylko drobnym znacznikiem i nie zawiera żadnych danych wrażliwych.
- Nic tutaj nie jest powiązane z konkretnym urządzeniem: to samo hasło działa na dowolnej
  maszynie.

<!-- doc-footer -->

---

> _Ta dokumentacja została wygenerowana za pomocą Claude (Anthropic) i jest utrzymywana przez VD171. Poprawki i ulepszenia są mile widziane, zobacz [CONTRIBUTING.md](CONTRIBUTING.md)._
