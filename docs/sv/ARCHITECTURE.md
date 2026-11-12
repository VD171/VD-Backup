> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · Svenska · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# Arkitektur

VDBackup är en WebUI-modul med root. Den har tre lager: **WebUI** (det du ser),
**shell-backenden** (det som utför arbetet, som root) och de **medföljande binärerna**
(arkiverarna och transporterna). Allt körs redan som root, så det finns ingen
behörighetsfråga och ingen följeslagarapp för kärnfunktionerna.

```
   ┌──────────────────────────────────────────────────────────┐
   │  WebUI  (module/webroot, vanilla JS)                      │
   │    index.html · scripts.js · i18n.js · styles.css         │
   │    lang/en.js + 21 languages · config.json (CSP, no net)  │
   └───────────────┬──────────────────────────────────────────┘
                   │  ksu.exec("sh scripts/helper.sh <verb> <b64json>")
                   ▼
   ┌──────────────────────────────────────────────────────────┐
   │  scripts/helper.sh  (dispatcher, returns JSON)            │
   │    list-apps · config · dests · backup/restore/import ... │
   │    long ops -> setsid nohup scripts/worker.sh  (detached) │
   └───────────────┬───────────────────────────────┬──────────┘
                   │                               │ progress-<opid>.json (poll)
                   ▼                               ▼
   ┌────────────────────────────────────┐   ┌──────────────────────────┐
   │  scripts/worker.sh (root, detached)│   │  framework helper (opt.) │
   │   force-stop · tar|zstd|age        │   │  app_process + dex       │
   │   pm install · chown/chcon         │   │  perms/appops/ssaid/...  │
   │   transfer · notify                │   │  (dex primary, shell fb) │
   └───────────────┬────────────────────┘   └──────────────────────────┘
                   ▼
   ┌──────────────────────────────────────────────────────────┐
   │  bin/<abi>/  tar · zstd · lz4 · rclone · rsync · ssh · restic │
   └──────────────────────────────────────────────────────────┘
                   ▼
   Destinations: local · SFTP/SCP · SMB · WebDAV · FTP · S3 · 70+ (rclone)
                 rsync · restic repos · Google Drive (opt-in companion)
```

## Viktiga punkter

- **Redan root.** Modulprocessen är root, så motorn är rent shell. ~85 % av
  arbetet är rent shell (`tar`/`zstd`/`age`/`pm`/`am`/`chown`/`chcon`/`rclone`/...).
- **Frånkopplad exekvering.** Backup/återställning körs via `setsid nohup`, som en fristående
  root-process. Att stänga WebUI avbryter dem inte; gränssnittet återansluter genom att läsa
  `logs/progress-<opid>.json`.
- **Framework-hjälpare (~15 %).** Finkorniga behörigheter, AppOps, SSAID, StorageStats,
  ikoner och privilegierat Wi-Fi behöver Android-ramverket. En liten `dex` körd via
  `app_process` (ingen installerad app) hanterar dessa, med en shell-reserv.
- **Portabilitet.** Endast standardformat; säkerhetskopior öppnas på en PC utan denna modul.
- **Tillstånd** ligger i `/data/adb/vdbackup/` (konfiguration, jobb, destinationer, krypterade
  autentiseringsuppgifter, loggar, staging). **Säkerhetskopior** skrivs till användarsynlig,
  autentiseringskrypterad lagring på `/sdcard/VDBackup/` (`/data/media/<user>/VDBackup`, per användare),
  inte i `/data/adb` (som är enhetskrypterad och läsbar före första upplåsningen).

## Kompatibilitetsgaranti

En säkerhetskopia måste förbli återställbar för alltid. Detta är en hård regel, inte en bästa strävan.

**Omfattning.** Garantin täcker säkerhetskopior skrivna av **v1.01 och framåt** (den första
officiellt publicerade utgåvan) och endast av officiellt publicerade, släppta versioner. v1.00 var en
build endast för test och är uttryckligen utanför omfattningen; förhandsutgåvor och
utvecklingsbyggen täcks inte. Från den första offentliga utgåvan och framåt är löftet nedan absolut:

- **Endast standardformat.** Varje arkiv är en vanlig `tar` komprimerad med `zstd`,
  `gzip` eller `lz4`, valfritt inkapslad med `age`. Det finns ingen proprietär behållare, så
  en säkerhetskopia kan öppnas på vilken PC som helst med vanliga verktyg även utan denna modul (se
  `etc/RECOVERY.md`). Ett format vi inte kan överge.
- **Metadata som bara läggs till.** `manifest.json` bär `format_version`. Schemat bara
  växer: fält får *läggas till*, aldrig tas bort, byta namn eller ändra syfte. Återställningen läser
  varje fält defensivt (saknade valfria fält faller tillbaka till ett standardvärde) och installerar
  APK:er och extraherar arkiv efter deras filnamn och filändelse, inte genom att anta en fast
  manifestform.
- **Framåtkompatibel återställning.** Återställningen avvisar aldrig en säkerhetskopia för att den är gammal, och en
  äldre VDBackup hoppar tyst över objekttyper den inte känner till i stället för att misslyckas. En nyare
  VDBackup återställer därför vilken äldre säkerhetskopia som helst, och arkiven i standardformat förblir
  återställbara för hand oavsett.

Kort sagt: allt VDBackup någonsin har skrivit kan varje framtida VDBackup (och en vanlig PC)
fortfarande återställa. Att ändra formatet på ett sätt som bryter en tidigare säkerhetskopia är inte
tillåtet; nya funktioner läggs till bakom `format_version` och nya, tillkommande fält.

För den fullständiga tekniska designen (arkivformat, metadataschema, pipelines, krypto,
destinationer, importerare) håller underhållarna detaljerade designanteckningar; denna fil är den
bidragsgivarvända översikten.

<!-- doc-footer -->

---

> _Denna dokumentation genererades med Claude (Anthropic) och underhålls av VD171. Rättelser och förbättringar välkomnas; se [CONTRIBUTING.md](CONTRIBUTING.md)._
