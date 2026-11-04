> **Languages:** [English](../../module/RECOVERY.md) · [العربية](../ar/RECOVERY.md) · [Čeština](../cs/RECOVERY.md) · [Deutsch](../de/RECOVERY.md) · [Español](../es/RECOVERY.md) · [فارسی](../fa/RECOVERY.md) · [Français](../fr/RECOVERY.md) · [हिन्दी](../hi/RECOVERY.md) · [Bahasa Indonesia](../in/RECOVERY.md) · Italiano · [日本語](../ja/RECOVERY.md) · [한국어](../ko/RECOVERY.md) · [Nederlands](../nl/RECOVERY.md) · [Polski](../pl/RECOVERY.md) · [Português](../pt/RECOVERY.md) · [Русский](../ru/RECOVERY.md) · [Svenska](../sv/RECOVERY.md) · [ไทย](../th/RECOVERY.md) · [Türkçe](../tr/RECOVERY.md) · [Tiếng Việt](../vi/RECOVERY.md) · [中文](../zh/RECOVERY.md)

---

# VDBackup - recuperare un backup su un PC (Windows / macOS / Linux)

I tuoi backup VDBackup usano **formati standard**, quindi puoi aprirli ovunque,
senza questo modulo. Una cartella di backup contiene un `manifest.json`, gli APK
(`*.apk.zst`) e gli archivi di dati (`<item>.tar.zst`, `.tar.gz` o `.tar.lz4`),
opzionalmente cifrati con un `.age` finale.

## Strumenti che potrebbero servirti

- **zstd**: https://github.com/facebook/zstd/releases  (macOS: `brew install zstd`; Linux: `apt install zstd`)
- **age** (solo per i file `.age`): https://github.com/FiloSottile/age/releases
- `tar` è integrato in macOS, Linux e nei moderni Windows 10/11.
- `gzip` è integrato ovunque; per `.tar.gz` non serve nulla di extra.

## 1. Decifrare (solo se il file termina con `.age`)

Keyfile (consigliato):

```
age -d -i age.key -o data.tar.zst  data.tar.zst.age
```

Passphrase:

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

Fai lo stesso per ogni file `*.age` (APK e archivi di dati).

## 2. Decomprimere + estrarre

`.tar.zst`:

```
zstd -d data.tar.zst            # -> data.tar
tar  -xf data.tar               # extracts the files
```

`.tar.gz`:

```
tar -xzf data.tar.gz
```

`.tar.lz4` (zstd legge lz4):

```
zstd -d --format=lz4 data.tar.lz4 -o data.tar
tar  -xf data.tar
```

Gli APK sono solo file APK (ZIP) compressi con zstd:

```
zstd -d base.apk.zst            # -> base.apk  (a normal installable APK)
```

## Note

- I file estratti mantengono i loro percorsi relativi; il contesto SELinux, uid/gid e i modi
  sono dentro il tar (e vengono riapplicati correttamente solo quando ripristini su Android).
- `manifest.json` descrive esattamente cos'è ogni file, la versione dell'app e il
  proprietario/contesto originale. È la fonte di verità.
- Nulla qui è legato a un dispositivo specifico: la stessa passphrase/keyfile funziona su qualsiasi
  macchina.
