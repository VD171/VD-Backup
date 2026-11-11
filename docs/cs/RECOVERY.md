> **Languages:** [English](../../module/etc/RECOVERY.md) · [العربية](../ar/RECOVERY.md) · Čeština · [Deutsch](../de/RECOVERY.md) · [Español](../es/RECOVERY.md) · [فارسی](../fa/RECOVERY.md) · [Français](../fr/RECOVERY.md) · [हिन्दी](../hi/RECOVERY.md) · [Bahasa Indonesia](../in/RECOVERY.md) · [Italiano](../it/RECOVERY.md) · [日本語](../ja/RECOVERY.md) · [한국어](../ko/RECOVERY.md) · [Nederlands](../nl/RECOVERY.md) · [Polski](../pl/RECOVERY.md) · [Português](../pt/RECOVERY.md) · [Русский](../ru/RECOVERY.md) · [Svenska](../sv/RECOVERY.md) · [ไทย](../th/RECOVERY.md) · [Türkçe](../tr/RECOVERY.md) · [Tiếng Việt](../vi/RECOVERY.md) · [中文](../zh/RECOVERY.md)

---

# VDBackup, obnova zálohy na PC (Windows / macOS / Linux)

Vaše zálohy VDBackup používají **standardní formáty**, takže je můžete otevřít kdekoli,
bez tohoto modulu. Složka zálohy obsahuje `manifest.json`, APK
(`*.apk.zst`) a datové archivy (`<item>.tar.zst`, `.tar.gz` nebo `.tar.lz4`),
volitelně šifrované s koncovou `.age`.

## Nástroje, které můžete potřebovat

- **zstd**: https://github.com/facebook/zstd/releases  (macOS: `brew install zstd`; Linux: `apt install zstd`)
- **age** (jen pro soubory `.age`): https://github.com/FiloSottile/age/releases
- `tar` je zabudován v macOS, Linuxu a moderních Windows 10/11.
- `gzip` je zabudován všude; pro `.tar.gz` nepotřebujete nic navíc.

## 1. Dešifrování (jen pokud soubor končí na `.age`)

Keyfile (doporučeno):

```
age -d -i age.key -o data.tar.zst  data.tar.zst.age
```

Heslová fráze:

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

Totéž proveďte pro každý soubor `*.age` (APK a datové archivy).

## 2. Dekomprese + rozbalení

`.tar.zst`:

```
zstd -d data.tar.zst            # -> data.tar
tar  -xf data.tar               # extracts the files
```

`.tar.gz`:

```
tar -xzf data.tar.gz
```

`.tar.lz4` (zstd čte lz4):

```
zstd -d --format=lz4 data.tar.lz4 -o data.tar
tar  -xf data.tar
```

APK jsou jen zstd-komprimované soubory APK (ZIP):

```
zstd -d base.apk.zst            # -> base.apk  (a normal installable APK)
```

## Poznámky

- Rozbalené soubory si uchovávají své relativní cesty; SELinux kontext, uid/gid a režimy
  jsou uvnitř taru (a znovu se správně aplikují jen při obnově na Androidu).
- `manifest.json` popisuje přesně, co je každý soubor, verzi aplikace a
  původního vlastníka/kontext. Je to zdroj pravdy.
- Nic zde není vázáno na konkrétní zařízení: tatáž heslová fráze/keyfile funguje na jakémkoli
  počítači.
