> **Languages:** [English](../BINARIES.md) · [العربية](../ar/BINARIES.md) · [Čeština](../cs/BINARIES.md) · [Deutsch](../de/BINARIES.md) · [Español](../es/BINARIES.md) · [فارسی](../fa/BINARIES.md) · [Français](../fr/BINARIES.md) · [हिन्दी](../hi/BINARIES.md) · [Bahasa Indonesia](../in/BINARIES.md) · [Italiano](../it/BINARIES.md) · [日本語](../ja/BINARIES.md) · [한국어](../ko/BINARIES.md) · Nederlands · [Polski](../pl/BINARIES.md) · [Português](../pt/BINARIES.md) · [Русский](../ru/BINARIES.md) · [Svenska](../sv/BINARIES.md) · [ไทย](../th/BINARIES.md) · [Türkçe](../tr/BINARIES.md) · [Tiếng Việt](../vi/BINARIES.md) · [中文](../zh/BINARIES.md)

---

# Meegeleverde binaries: herkomst en audit

Privacy en beveiliging zijn niet optioneel in VDBackup. Een back-uptool draait als root over je
meest persoonlijke gegevens, dus je moet precies kunnen zien wat erin wordt meegeleverd. Deze
pagina documenteert elke voorgebouwde binary en bibliotheek die de module meedraagt, waar elke
vandaan komt en hoe je kunt verifiëren dat er niets ondoorzichtigs is binnengeslopen.

## Principes

- **Niets ondoorzichtigs.** Elke meegeleverde binary en bibliotheek is te herleiden tot een
   benoemde, publieke upstream op een vastgezette versie, met een vastgelegde SHA-256. Geen enkele
  blob wordt meegeleverd zonder een vermelding die je kunt controleren.
- **Opgehaald van de upstream, nooit van een apparaat.** Native tools komen uit het officiële
  Termux-pakketrepository (de ondertekende `.deb`-bestanden op `packages.termux.dev/apt`), nooit
  gekopieerd uit een Termux die op een of andere telefoon is geïnstalleerd. De build faalt
  luidruchtig, hij improviseert nooit.
- **Reproduceerbaar.** Voer de build opnieuw uit en je krijgt dezelfde bestanden; haal de
   vastgezette bronnen opnieuw op en de SHA-256-waarden komen overeen.
- **Het auditspoor wordt met de module meegeleverd.** Het staat niet alleen op de website - het
  reist mee binnen de geïnstalleerde module, op je apparaat, zodat je offline kunt auditen.

## Wat wordt meegeleverd, en vanwaar

| Artefact | Bron | Hoe het wordt gebouwd |
|---|---|---|
| `bin/<abi>/` native tools (`tar`, `zstd`, `gzip`, `lz4`, `jq`, `rclone`, `restic`, `rsync`, `ssh`/`scp`/`sftp`, `age`, `age-keygen`, `script`, `sqlite3`) + hun `lib/`-closure | Officiële **Termux** apt-repo (`packages.termux.dev/apt`), officiële `.deb`-pakketten | `.github/scripts/build_bin.sh` downloadt de `.deb`-bestanden + hun transitieve afhankelijkheden, pakt ze uit en kopieert de binaries plus alleen de gedeelde bibliotheken die elk nodig heeft |
| `bin/<abi>/abx2xml`, `bin/<abi>/xml2abx` (ABX-converter-terugval) | GitHub-release van **rhythmcache/android-xml-converter** (`ABX_RELEASE`, statische ELF) | gedownload van de vastgezette release door `build_bin.sh` |
| `companion.apk` (optionele Google Drive-metgezel) | **Deze repository**, `companion/` (Gradle/Kotlin) | gebouwd vanuit de bron door de CI en ondertekend met de projectsleutel; geen voorgebouwde blob |
| `vdbackup_helper.dex` (framework-helper) | **Deze repository**, `dex/src/` (Java) | gecompileerd vanuit de bron door de CI met `javac` + `d8` |

Alleen de eerste twee rijen zijn voorgebouwde binaries van derden; de laatste twee worden gebouwd
vanuit broncode die in deze repository leeft en gelezen en herbouwd kan worden.

> **Full- versus lite-edities.** De lite-edities laten alleen `rclone` en `restic` (de twee
> grootste binaries) weg om klein te blijven en halen ze op aanvraag op (geverifieerd met
> SHA-256) de eerste keer dat je een cloud-bestemming of snapshot-modus gebruikt; `rsync` en
> `ssh`/`scp`/`sftp` zijn nog steeds aanwezig, en elke andere hierboven genoemde binary is er
> ook. De Full-edities leveren `rclone` (cloudproviders) en `restic` (snapshots) ingebouwd, dus
> er wordt nooit iets gedownload.

## Het manifest op het apparaat: `PROVENANCE.json`

`build_bin.sh` schrijft één `bin/<abi>/PROVENANCE.json` per ABI. Bij installatie houdt de module
alleen de ABI van je apparaat, zodat dat bestand op het apparaat blijft op
`/data/adb/modules/vdbackup/bin/<abi>/PROVENANCE.json`. Het legt vast:

- `sources`: elke upstream-`.deb` (pakket, versie, volledige URL, SHA-256 van de `.deb`) en de
   ABX-release (URL, SHA-256 van het archief).
- `files`: elk bestand dat daadwerkelijk onder `bin/<abi>/` wordt meegeleverd (pad, grootte, SHA-256).

Je kunt het lezen in de WebUI (het tabblad **Over** linkt ernaar) of via de agent-API:

```sh
sh /data/adb/modules/vdbackup/helper.sh provenance '' | jq .
```

## Hoe te verifiëren (stap voor stap)

1. **Controleer de meegeleverde bestanden.** Hash elk bestand onder `bin/<abi>/` op je apparaat en
   vergelijk met `files[].sha256` in `PROVENANCE.json`:
   ```sh
   cd /data/adb/modules/vdbackup/bin/<abi>
   sha256sum tar zstd jq rclone ... lib/*
   ```
2. **Controleer de bestanden tegen de upstream.** Download voor elke `sources[]`-vermelding de
   vastgezette `.deb` van zijn URL, bevestig dat de SHA-256 overeenkomt met `deb_sha256`, pak hem uit
   en bevestig dat de binaries/bibliotheken die hij bevat naar dezelfde meegeleverde waarden hashen.
   De `.deb`-bestanden in de Termux-repo worden zelf geserveerd vanuit Termux' ondertekende
   apt-repository.
3. **Herbouw vanaf nul.** Voer zelf `.github/scripts/build_bin.sh` uit (heeft alleen `curl`, `ar`,
   `tar`, `xz`, `zstd`, `readelf` nodig) en vergelijk de uitvoer met wat is meegeleverd.
4. **Metgezel en dex.** Herbouw `companion/` en `dex/` vanuit de bron; de handtekening van de
   metgezel is de projectsleutel (SHA-256
   `F3:F8:2B:B9:2F:2C:69:A1:75:90:1D:40:BD:65:DD:A6:8F:2B:B5:88:69:77:F5:EA:8B:BA:AA:51:40:E5:25:2B`).

## Melden

Als een meegeleverd bestand niet overeenkomt met de vastgelegde bron, behandel het dan als een
beveiligingsprobleem en meld het (zie [SECURITY.md](SECURITY.md)). Dit is precies het soort
discrepantie dat dit manifest bestaat om zichtbaar te maken.

*Deze documentatie is gegenereerd met Claude (Anthropic) en wordt onderhouden door VD171. Correcties en verbeteringen zijn welkom - zie [CONTRIBUTING.md](CONTRIBUTING.md).*
