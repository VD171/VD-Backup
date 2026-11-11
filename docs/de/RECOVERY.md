> **Languages:** [English](../../module/etc/RECOVERY.md) · [العربية](../ar/RECOVERY.md) · [Čeština](../cs/RECOVERY.md) · Deutsch · [Español](../es/RECOVERY.md) · [فارسی](../fa/RECOVERY.md) · [Français](../fr/RECOVERY.md) · [हिन्दी](../hi/RECOVERY.md) · [Bahasa Indonesia](../in/RECOVERY.md) · [Italiano](../it/RECOVERY.md) · [日本語](../ja/RECOVERY.md) · [한국어](../ko/RECOVERY.md) · [Nederlands](../nl/RECOVERY.md) · [Polski](../pl/RECOVERY.md) · [Português](../pt/RECOVERY.md) · [Русский](../ru/RECOVERY.md) · [Svenska](../sv/RECOVERY.md) · [ไทย](../th/RECOVERY.md) · [Türkçe](../tr/RECOVERY.md) · [Tiếng Việt](../vi/RECOVERY.md) · [中文](../zh/RECOVERY.md)

---

# VDBackup, ein Backup auf einem PC wiederherstellen (Windows / macOS / Linux)

Deine VDBackup-Backups verwenden **Standardformate**, sodass du sie überall öffnen kannst,
ohne dieses Modul. Ein Backup-Ordner enthält eine `manifest.json`, die APKs
(`*.apk.zst`) und die Datenarchive (`<item>.tar.zst`, `.tar.gz` oder `.tar.lz4`),
optional verschlüsselt mit einem nachgestellten `.age`.

## Werkzeuge, die du brauchen könntest

- **zstd**: https://github.com/facebook/zstd/releases  (macOS: `brew install zstd`; Linux: `apt install zstd`)
- **age** (nur für `.age`-Dateien): https://github.com/FiloSottile/age/releases
- `tar` ist in macOS, Linux und modernem Windows 10/11 eingebaut.
- `gzip` ist überall eingebaut; für `.tar.gz` brauchst du nichts Zusätzliches.

## 1. Entschlüsseln (nur wenn die Datei auf `.age` endet)

Schlüsseldatei (empfohlen):

```
age -d -i age.key -o data.tar.zst  data.tar.zst.age
```

Passphrase:

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

Mach dasselbe für jede `*.age`-Datei (APKs und Datenarchive).

## 2. Dekomprimieren + extrahieren

`.tar.zst`:

```
zstd -d data.tar.zst            # -> data.tar
tar  -xf data.tar               # extracts the files
```

`.tar.gz`:

```
tar -xzf data.tar.gz
```

`.tar.lz4` (zstd liest lz4):

```
zstd -d --format=lz4 data.tar.lz4 -o data.tar
tar  -xf data.tar
```

APKs sind einfach zstd-komprimierte APK-(ZIP-)Dateien:

```
zstd -d base.apk.zst            # -> base.apk  (a normal installable APK)
```

## Hinweise

- Extrahierte Dateien behalten ihre relativen Pfade; der SELinux-Kontext, uid/gid und Modi
  sind im tar (und werden erst korrekt erneut angewendet, wenn du auf Android wiederherstellst).
- `manifest.json` beschreibt genau, was jede Datei ist, die App-Version und den
  ursprünglichen Eigentümer/Kontext. Es ist die Quelle der Wahrheit.
- Nichts hier ist an ein bestimmtes Gerät gebunden: dieselbe Passphrase/Schlüsseldatei funktioniert auf jeder
  Maschine.
