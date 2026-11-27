> **Languages:** [English](../../module/etc/RECOVERY.md) · [العربية](../ar/RECOVERY.md) · Čeština · [Deutsch](../de/RECOVERY.md) · [Español](../es/RECOVERY.md) · [فارسی](../fa/RECOVERY.md) · [Français](../fr/RECOVERY.md) · [हिन्दी](../hi/RECOVERY.md) · [Bahasa Indonesia](../id/RECOVERY.md) · [Italiano](../it/RECOVERY.md) · [日本語](../ja/RECOVERY.md) · [한국어](../ko/RECOVERY.md) · [Nederlands](../nl/RECOVERY.md) · [Polski](../pl/RECOVERY.md) · [Português](../pt/RECOVERY.md) · [Русский](../ru/RECOVERY.md) · [Svenska](../sv/RECOVERY.md) · [ไทย](../th/RECOVERY.md) · [Türkçe](../tr/RECOVERY.md) · [Українська](../uk/RECOVERY.md) · [Tiếng Việt](../vi/RECOVERY.md) · [中文](../zh/RECOVERY.md)

---

# VDBackup, obnova zálohy na PC (Windows / macOS / Linux)

Vaše zálohy VDBackup používají **standardní formáty**, takže je můžete otevřít kdekoli,
bez tohoto modulu. Složka zálohy obsahuje `manifest.json`, APK
(`*.apk.zst`) a datové archivy (`<item>.tar.zst`, `.tar.gz` nebo `.tar.lz4`),
volitelně šifrované s koncovou `.age`.

**Pokud jsou data šifrovaná**, jsou šifrovaná i metadata, takže z nich nic neunikne nikomu, kdo má jen soubory. Složka pak obsahuje také `manifest.full.age` (úplný manifest) a dva malé soubory `stub.*.age`. `manifest.json` je v tom případě jen drobný necitlivý ukazatel; skutečné podrobnosti jsou v `manifest.full.age`. Vše přenositelné (datové archivy a `manifest.full.age`) se dešifruje jen vaší **heslovou frází** - viz krok 1. Soubory `stub.dev.age` / `stub.pass.age` jsou jen vyrovnávací paměť modulu pro výpis v zařízení; na PC je můžete ignorovat.

## Nástroje, které můžete potřebovat

- **zstd**: https://github.com/facebook/zstd/releases  (macOS: `brew install zstd`, Linux: `apt install zstd`)
- **age** (jen pro soubory `.age`): https://github.com/FiloSottile/age/releases
- `tar` je zabudován v macOS, Linuxu a moderních Windows 10/11.
- `gzip` je zabudován všude, pro `.tar.gz` nepotřebujete nic navíc.

## 1. Dešifrování (jen pokud soubor končí na `.age`)

Heslová fráze (přenositelný způsob - funguje na jakémkoli PC jen s vaší heslovou frází):

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

Totéž proveďte pro každý soubor `*.age` (APK a datové archivy). Pokud je záloha šifrovaná, stejným způsobem dešifrujte `manifest.full.age`, abyste si přečetli úplný manifest:

```
age -d -o manifest.json  manifest.full.age    # the full, readable manifest
```

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

- Rozbalené soubory si uchovávají své relativní cesty, SELinux kontext, uid/gid a režimy
  jsou uvnitř taru (a znovu se správně aplikují jen při obnově na Androidu).
- `manifest.json` popisuje přesně, co je každý soubor, verzi aplikace a
  původního vlastníka/kontext. Je to zdroj pravdy. U šifrované zálohy je úplný
  manifest `manifest.full.age` (dešifrujte jej jako v kroku 1); čitelný `manifest.json`
  je jen malý ukazatel a neobsahuje žádná citlivá data.
- Nic zde není vázáno na konkrétní zařízení: tatáž heslová fráze funguje na jakémkoli
  počítači.

<!-- doc-footer -->

---

> _Tato dokumentace byla vytvořena pomocí Claude (Anthropic) a spravuje ji VD171. Opravy a vylepšení jsou vítány, viz [CONTRIBUTING.md](CONTRIBUTING.md)._
