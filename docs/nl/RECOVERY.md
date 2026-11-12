> **Languages:** [English](../../module/etc/RECOVERY.md) · [العربية](../ar/RECOVERY.md) · [Čeština](../cs/RECOVERY.md) · [Deutsch](../de/RECOVERY.md) · [Español](../es/RECOVERY.md) · [فارسی](../fa/RECOVERY.md) · [Français](../fr/RECOVERY.md) · [हिन्दी](../hi/RECOVERY.md) · [Bahasa Indonesia](../in/RECOVERY.md) · [Italiano](../it/RECOVERY.md) · [日本語](../ja/RECOVERY.md) · [한국어](../ko/RECOVERY.md) · Nederlands · [Polski](../pl/RECOVERY.md) · [Português](../pt/RECOVERY.md) · [Русский](../ru/RECOVERY.md) · [Svenska](../sv/RECOVERY.md) · [ไทย](../th/RECOVERY.md) · [Türkçe](../tr/RECOVERY.md) · [Tiếng Việt](../vi/RECOVERY.md) · [中文](../zh/RECOVERY.md)

---

# VDBackup, een backup herstellen op een pc (Windows / macOS / Linux)

Je VDBackup-backups gebruiken **standaardformaten**, zodat je ze overal kunt openen,
zonder deze module. Een backupmap bevat een `manifest.json`, de APK's
(`*.apk.zst`) en de data-archieven (`<item>.tar.zst`, `.tar.gz` of `.tar.lz4`),
optioneel versleuteld met een achterliggende `.age`.

## Tools die je nodig kunt hebben

- **zstd**: https://github.com/facebook/zstd/releases  (macOS: `brew install zstd`; Linux: `apt install zstd`)
- **age** (alleen voor `.age`-bestanden): https://github.com/FiloSottile/age/releases
- `tar` is ingebouwd in macOS, Linux en modern Windows 10/11.
- `gzip` is overal ingebouwd; voor `.tar.gz` heb je niets extra's nodig.

## 1. Ontsleutelen (alleen als het bestand eindigt op `.age`)

Keyfile (aanbevolen):

```
age -d -i age.key -o data.tar.zst  data.tar.zst.age
```

Wachtwoordzin:

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

Doe hetzelfde voor elk `*.age`-bestand (APK's en data-archieven).

## 2. Decomprimeren + uitpakken

`.tar.zst`:

```
zstd -d data.tar.zst            # -> data.tar
tar  -xf data.tar               # extracts the files
```

`.tar.gz`:

```
tar -xzf data.tar.gz
```

`.tar.lz4` (zstd leest lz4):

```
zstd -d --format=lz4 data.tar.lz4 -o data.tar
tar  -xf data.tar
```

APK's zijn gewoon zstd-gecomprimeerde APK- (ZIP-)bestanden:

```
zstd -d base.apk.zst            # -> base.apk  (a normal installable APK)
```

## Notities

- Uitgepakte bestanden behouden hun relatieve paden; de SELinux-context, uid/gid en modes
  zitten binnen de tar (en worden alleen goed opnieuw toegepast wanneer je op Android terugzet).
- `manifest.json` beschrijft precies wat elk bestand is, de app-versie en de
  oorspronkelijke eigenaar/context. Het is de bron van de waarheid.
- Niets hier is gebonden aan een specifiek apparaat: dezelfde wachtwoordzin/keyfile werkt op elke
  machine.

<!-- doc-footer -->

---

> _Deze documentatie is gegenereerd met Claude (Anthropic) en wordt onderhouden door VD171. Correcties en verbeteringen zijn welkom; zie [CONTRIBUTING.md](CONTRIBUTING.md)._
