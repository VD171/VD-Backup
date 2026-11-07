> **Languages:** [English](../BINARIES.md) · [العربية](../ar/BINARIES.md) · [Čeština](../cs/BINARIES.md) · [Deutsch](../de/BINARIES.md) · [Español](../es/BINARIES.md) · [فارسی](../fa/BINARIES.md) · [Français](../fr/BINARIES.md) · [हिन्दी](../hi/BINARIES.md) · [Bahasa Indonesia](../in/BINARIES.md) · [Italiano](../it/BINARIES.md) · [日本語](../ja/BINARIES.md) · [한국어](../ko/BINARIES.md) · [Nederlands](../nl/BINARIES.md) · [Polski](../pl/BINARIES.md) · [Português](../pt/BINARIES.md) · [Русский](../ru/BINARIES.md) · Svenska · [ไทย](../th/BINARIES.md) · [Türkçe](../tr/BINARIES.md) · [Tiếng Việt](../vi/BINARIES.md) · [中文](../zh/BINARIES.md)

---

# Medföljande binärer: ursprung och granskning

Integritet och säkerhet är inte valfria i VDBackup. Ett säkerhetskopieringsverktyg körs som root över
dina mest personliga data, så du måste kunna se exakt vad som ingår i det. Den här
sidan dokumenterar varje förbyggd binär och bibliotek som modulen bär med sig, varifrån var och en kommer,
och hur du verifierar att inget ogenomskinligt har smugits in.

## Principer

- **Inget ogenomskinligt.** Varje levererad binär och bibliotek kan spåras till en namngiven, publik
  uppström på en fastnålad version, med en registrerad SHA-256. Ingen blob medföljer utan en
  post som du kan kontrollera.
- **Hämtas från uppströms, aldrig från en enhet.** Nativa verktyg kommer från Termux officiella
  paketförråd (de signerade `.deb`-filerna på `packages.termux.dev/apt`), aldrig
  kopierade ur en Termux installerad på någon telefon. Bygget misslyckas högljutt, det improviserar
  aldrig.
- **Reproducerbart.** Kör bygget igen och du får samma filer; hämta de fastnålade
  källorna på nytt och SHA-256-värdena stämmer.
- **Granskningsspåret följer med modulen.** Det finns inte bara på webbplatsen - det följer
  med inuti den installerade modulen, på din enhet, så att du kan granska offline.

## Vad som levereras, och varifrån

| Artefakt | Källa | Hur det byggs |
|---|---|---|
| nativa verktyg i `bin/<abi>/` (`tar`, `zstd`, `gzip`, `lz4`, `jq`, `rclone`, `restic`, `rsync`, `ssh`/`scp`/`sftp`, `age`, `age-keygen`, `script`, `sqlite3`) + deras `lib/`-slutenhet | **Termux** officiella apt-förråd (`packages.termux.dev/apt`), officiella `.deb`-paket | `.github/scripts/build_bin.sh` laddar ner `.deb`-filerna + deras transitiva beroenden, extraherar dem och kopierar binärerna plus endast de delade bibliotek som var och en behöver |
| `bin/<abi>/abx2xml`, `bin/<abi>/xml2abx` (ABX-konverterare, reserv) | **rhythmcache/android-xml-converter** GitHub-utgåva (`ABX_RELEASE`, statisk ELF) | laddas ner från den fastnålade utgåvan av `build_bin.sh` |
| `companion.apk` (valfri Google Drive-companion) | **Detta repository**, `companion/` (Gradle/Kotlin) | byggd från källkod av CI och signerad med projektnyckeln (`VD_Key`); inte en förbyggd blob |
| `vdbhelper.dex` (framework-hjälpare) | **Detta repository**, `dex/src/` (Java) | kompilerad från källkod av CI med `javac` + `d8` |

Endast de två första raderna är förbyggda tredjepartsbinärer; de två sista byggs från
källkod som finns i detta repository och kan läsas och byggas om.

> **Full- kontra lite-utgåvor.** lite-utgåvorna utelämnar endast `rclone` och `restic` (de två
> största binärerna) för att hålla sig små och hämtar dem vid behov (verifierat med SHA-256)
> första gången du använder en molndestination eller ögonblicksbildsläge; `rsync` och
> `ssh`/`scp`/`sftp` finns fortfarande med, och alla andra binärer som listas ovan finns också
> med. Full-utgåvorna levererar `rclone` (molnleverantörer) och `restic` (ögonblicksbilder)
> inbäddade, så ingenting laddas någonsin ner.

## Manifestet på enheten: `PROVENANCE.json`

`build_bin.sh` skriver en `bin/<abi>/PROVENANCE.json` per ABI. Vid installation behåller modulen
endast din enhets ABI, så att filen stannar på enheten på
`/data/adb/modules/vdbackup/bin/<abi>/PROVENANCE.json`. Den registrerar:

- `sources`: varje uppströms `.deb` (paket, version, fullständig URL, SHA-256 för `.deb`-filen) och
  ABX-utgåvan (URL, SHA-256 för arkivet).
- `files`: varje fil som faktiskt levereras under `bin/<abi>/` (sökväg, storlek, SHA-256).

Du kan läsa den i WebUI (fliken **Om** länkar till den) eller via agent-API:et:

```sh
sh /data/adb/modules/vdbackup/helper.sh provenance '' | jq .
```

## Hur du verifierar (steg för steg)

1. **Kontrollera de levererade filerna.** Hasha varje fil under `bin/<abi>/` på din enhet och
   jämför med `files[].sha256` i `PROVENANCE.json`:
   ```sh
   cd /data/adb/modules/vdbackup/bin/<abi>
   sha256sum tar zstd jq rclone ... lib/*
   ```
2. **Kontrollera filerna mot uppströms.** För varje `sources[]`-post, ladda ner den fastnålade
   `.deb`-filen från dess URL, bekräfta att dess SHA-256 matchar `deb_sha256`, extrahera den och bekräfta
   att binärerna/biblioteken den innehåller hashas till samma värden som levererades. `.deb`-filerna i
   Termux-förrådet serveras själva från Termux signerade apt-förråd.
3. **Bygg om från grunden.** Kör `.github/scripts/build_bin.sh` själv (behöver bara
   `curl`, `ar`, `tar`, `xz`, `zstd`, `readelf`) och jämför utdata med det som levererades.
4. **Companion och dex.** Bygg om `companion/` och `dex/` från källkod; companionens
   signatur är projektnyckeln `VD_Key` (SHA-256
   `F3:F8:2B:B9:2F:2C:69:A1:75:90:1D:40:BD:65:DD:A6:8F:2B:B5:88:69:77:F5:EA:8B:BA:AA:51:40:E5:25:2B`).

## Rapportering

Om någon levererad fil inte matchar sin registrerade källa, behandla det som ett säkerhetsproblem och
rapportera det (se [SECURITY.md](SECURITY.md)). Det är precis den sorts avvikelse som detta
manifest finns till för att göra synlig.

*Denna dokumentation genererades med Claude (Anthropic) och underhålls av VD171. Rättelser och förbättringar är välkomna - se [CONTRIBUTING.md](CONTRIBUTING.md).*
