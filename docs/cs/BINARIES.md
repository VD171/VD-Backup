> **Languages:** [English](../BINARIES.md) · [العربية](../ar/BINARIES.md) · Čeština · [Deutsch](../de/BINARIES.md) · [Español](../es/BINARIES.md) · [فارسی](../fa/BINARIES.md) · [Français](../fr/BINARIES.md) · [हिन्दी](../hi/BINARIES.md) · [Bahasa Indonesia](../in/BINARIES.md) · [Italiano](../it/BINARIES.md) · [日本語](../ja/BINARIES.md) · [한국어](../ko/BINARIES.md) · [Nederlands](../nl/BINARIES.md) · [Polski](../pl/BINARIES.md) · [Português](../pt/BINARIES.md) · [Русский](../ru/BINARIES.md) · [Svenska](../sv/BINARIES.md) · [ไทย](../th/BINARIES.md) · [Türkçe](../tr/BINARIES.md) · [Tiếng Việt](../vi/BINARIES.md) · [中文](../zh/BINARIES.md)

---

# Přibalené binární soubory: původ a audit

Soukromí a bezpečnost nejsou ve VDBackup volitelné. Nástroj pro zálohování běží jako root nad
vašimi nejosobnějšími daty, takže musíte být schopni přesně vidět, co je uvnitř něj. Tato
stránka dokumentuje každý předkompilovaný binární soubor a knihovnu, které modul nese, odkud každý pochází,
a jak ověřit, že nebylo nic neprůhledného podstrčeno.

## Zásady

- **Nic neprůhledného.** Každý dodávaný binární soubor a knihovna je dohledatelný k pojmenovanému, veřejnému
   upstreamu na připnuté verzi, se zaznamenaným SHA-256. Žádný blob není přibalen bez
  záznamu, který si můžete zkontrolovat.
- **Stahováno z upstreamu, nikdy ze zařízení.** Nativní nástroje pocházejí z oficiálního
  repozitáře balíčků Termux (podepsané soubory `.deb` na `packages.termux.dev/apt`), nikdy
  nejsou zkopírovány z Termuxu nainstalovaného na nějakém telefonu. Build selže hlasitě, nikdy
  neimprovizuje.
- **Reprodukovatelné.** Spusťte build znovu a dostanete stejné soubory; znovu stáhněte připnuté
   zdroje a hodnoty SHA-256 budou souhlasit.
- **Auditní stopa se dodává s modulem.** Není jen na webu, cestuje
  uvnitř nainstalovaného modulu, na vašem zařízení, takže můžete auditovat offline.

## Co se dodává a odkud

| Artefakt | Zdroj | Jak je sestaven |
|---|---|---|
| nativní nástroje v `bin/<abi>/` (`tar`, `zstd`, `gzip`, `lz4`, `jq`, `rclone`, `restic`, `rsync`, `ssh`/`scp`/`sftp`, `age`, `age-keygen`, `script`, `sqlite3`) + jejich uzávěr `lib/` | Oficiální apt repozitář **Termux** (`packages.termux.dev/apt`), oficiální balíčky `.deb` | `.github/scripts/build_bin.sh` stáhne soubory `.deb` + jejich tranzitivní závislosti, rozbalí je a zkopíruje binární soubory plus pouze ty sdílené knihovny, které každý z nich potřebuje |
| `bin/<abi>/abx2xml`, `bin/<abi>/xml2abx` (záložní převodník ABX) | Vydání na GitHubu **rhythmcache/android-xml-converter** (`ABX_RELEASE`, statický ELF) | staženo z připnutého vydání skriptem `build_bin.sh` |
| `companion.apk` (volitelný companion pro Google Drive) | **Tento repozitář**, `companion/` (Gradle/Kotlin) | sestaven ze zdroje v CI a podepsán klíčem projektu; není to předkompilovaný blob |
| `vdbackup_helper.dex` (framework helper) | **Tento repozitář**, `dex/src/` (Java) | zkompilován ze zdroje v CI pomocí `javac` + `d8` |

Pouze první dva řádky jsou předkompilované binární soubory třetích stran; poslední dva jsou sestaveny ze
zdroje, který se nachází v tomto repozitáři a lze jej číst a znovu sestavit.

> **Edice Full vs lite.** Edice lite vynechávají pouze `rclone` a `restic` (dva největší binární soubory), aby zůstaly malé, a stahují je na vyžádání (ověřené přes SHA-256) při prvním použití cloudového cíle nebo režimu snímků; `rsync` a `ssh`/`scp`/`sftp` jsou stále přítomné a každý další binární soubor uvedený výše je přítomen také. Edice Full dodávají `rclone` (poskytovatelé cloudu) a `restic` (snímky) zabudované, takže se nikdy nic nestahuje.

## Manifest na zařízení: `PROVENANCE.json`

`build_bin.sh` zapisuje jeden `bin/<abi>/PROVENANCE.json` na každou ABI. Při instalaci modul
ponechá pouze ABI vašeho zařízení, takže tento soubor zůstává na zařízení na
`/data/adb/modules/vdbackup/bin/<abi>/PROVENANCE.json`. Zaznamenává:

- `sources`: každý upstreamový `.deb` (balíček, verze, úplná URL, SHA-256 souboru `.deb`) a
   vydání ABX (URL, SHA-256 archivu).
- `files`: každý soubor skutečně dodaný pod `bin/<abi>/` (cesta, velikost, SHA-256).

Můžete jej přečíst ve WebUI (karta **O aplikaci** na něj odkazuje) nebo přes API agenta:

```sh
sh /data/adb/modules/vdbackup/helper.sh provenance '' | jq .
```

## Jak ověřit (krok za krokem)

1. **Zkontrolujte dodané soubory.** Spočítejte hash každého souboru pod `bin/<abi>/` na vašem
   zařízení a porovnejte s `files[].sha256` v `PROVENANCE.json`:
   ```sh
   cd /data/adb/modules/vdbackup/bin/<abi>
   sha256sum tar zstd jq rclone ... lib/*
   ```
2. **Zkontrolujte soubory proti upstreamu.** Pro každý záznam `sources[]` stáhněte připnutý
   `.deb` z jeho URL, potvrďte, že jeho SHA-256 odpovídá `deb_sha256`, rozbalte jej a potvrďte,
   že binární soubory/knihovny, které obsahuje, mají stejné hodnoty hash jako dodané. Soubory `.deb` v
   repozitáři Termux jsou samy servírovány z podepsaného apt repozitáře Termuxu.
3. **Sestavte od začátku.** Spusťte si sami `.github/scripts/build_bin.sh` (potřebuje pouze
   `curl`, `ar`, `tar`, `xz`, `zstd`, `readelf`) a porovnejte výstup s tím, co bylo dodáno.
4. **Companion a dex.** Znovu sestavte `companion/` a `dex/` ze zdroje; podpisem
   companion je klíč projektu (SHA-256
   `F3:F8:2B:B9:2F:2C:69:A1:75:90:1D:40:BD:65:DD:A6:8F:2B:B5:88:69:77:F5:EA:8B:BA:AA:51:40:E5:25:2B`).

## Hlášení

Pokud některý dodaný soubor neodpovídá svému zaznamenanému zdroji, považujte to za bezpečnostní
problém a nahlaste jej (viz [SECURITY.md](SECURITY.md)). To je přesně ten druh nesrovnalosti, který tento
manifest existuje proto, aby jej učinil viditelným.

*Tato dokumentace byla vygenerována pomocí Claude (Anthropic) a je spravována VD171. Opravy a vylepšení jsou vítány, viz [CONTRIBUTING.md](CONTRIBUTING.md).*
