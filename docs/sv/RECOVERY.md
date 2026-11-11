> **Languages:** [English](../../module/etc/RECOVERY.md) · [العربية](../ar/RECOVERY.md) · [Čeština](../cs/RECOVERY.md) · [Deutsch](../de/RECOVERY.md) · [Español](../es/RECOVERY.md) · [فارسی](../fa/RECOVERY.md) · [Français](../fr/RECOVERY.md) · [हिन्दी](../hi/RECOVERY.md) · [Bahasa Indonesia](../in/RECOVERY.md) · [Italiano](../it/RECOVERY.md) · [日本語](../ja/RECOVERY.md) · [한국어](../ko/RECOVERY.md) · [Nederlands](../nl/RECOVERY.md) · [Polski](../pl/RECOVERY.md) · [Português](../pt/RECOVERY.md) · [Русский](../ru/RECOVERY.md) · Svenska · [ไทย](../th/RECOVERY.md) · [Türkçe](../tr/RECOVERY.md) · [Tiếng Việt](../vi/RECOVERY.md) · [中文](../zh/RECOVERY.md)

---

# VDBackup, återskapa en säkerhetskopia på en PC (Windows / macOS / Linux)

Dina VDBackup-säkerhetskopior använder **standardformat**, så du kan öppna dem var som helst,
utan den här modulen. En säkerhetskopiemapp innehåller en `manifest.json`, APK:erna
(`*.apk.zst`) och data-arkiven (`<item>.tar.zst`, `.tar.gz` eller `.tar.lz4`),
valfritt krypterade med ett avslutande `.age`.

## Verktyg du kan behöva

- **zstd**: https://github.com/facebook/zstd/releases  (macOS: `brew install zstd`; Linux: `apt install zstd`)
- **age** (endast för `.age`-filer): https://github.com/FiloSottile/age/releases
- `tar` är inbyggt i macOS, Linux och moderna Windows 10/11.
- `gzip` är inbyggt överallt; för `.tar.gz` behöver du inget extra.

## 1. Dekryptera (endast om filen slutar med `.age`)

Nyckelfil (rekommenderas):

```
age -d -i age.key -o data.tar.zst  data.tar.zst.age
```

Lösenfras:

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

Gör samma sak för varje `*.age`-fil (APK:er och data-arkiv).

## 2. Dekomprimera + extrahera

`.tar.zst`:

```
zstd -d data.tar.zst            # -> data.tar
tar  -xf data.tar               # extracts the files
```

`.tar.gz`:

```
tar -xzf data.tar.gz
```

`.tar.lz4` (zstd läser lz4):

```
zstd -d --format=lz4 data.tar.lz4 -o data.tar
tar  -xf data.tar
```

APK:er är bara zstd-komprimerade APK- (ZIP-) filer:

```
zstd -d base.apk.zst            # -> base.apk  (a normal installable APK)
```

## Noteringar

- Extraherade filer behåller sina relativa sökvägar; SELinux-kontexten, uid/gid och modes
  finns inuti tar-filen (och återtillämpas ordentligt endast när du återställer på Android).
- `manifest.json` beskriver exakt vad varje fil är, app-versionen och den
  ursprungliga ägaren/kontexten. Det är sanningskällan.
- Inget här är bundet till en specifik enhet: samma lösenfras/nyckelfil fungerar på vilken
  maskin som helst.
