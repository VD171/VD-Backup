> **Languages:** [English](../../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · Nederlands · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# Architectuur

VDBackup is een root-WebUI-module. Het heeft drie lagen: de **WebUI** (wat je ziet),
de **shell-backend** (die het werk doet, als root) en de **meegeleverde binaries**
(de archiveerders en transporten). Alles draait al als root, dus er is geen
toestemmingsvraag en geen begeleidende app voor de kernfuncties.

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

## Kernpunten

- **Al root.** Het moduleproces is root, dus de engine is gewone shell. ~85% van
  het werk is pure shell (`tar`/`zstd`/`age`/`pm`/`am`/`chown`/`chcon`/`rclone`/...).
- **Losgekoppelde uitvoering.** Backup/restore draaien via `setsid nohup`, als een onafhankelijk root-
  proces. Het sluiten van de WebUI onderbreekt ze niet; de UI koppelt zich opnieuw door
  `logs/progress-<opid>.json` te lezen.
- **Framework-helper (~15%).** Fijnmazige rechten, AppOps, SSAID, StorageStats,
  pictogrammen en geprivilegieerde wifi hebben het Android-framework nodig. Een kleine `dex`-run via
  `app_process` (geen geïnstalleerde app) handelt deze af, met een shell-fallback.
- **Portabiliteit.** Alleen standaardformaten; backups openen op een pc zonder deze module.
- **De staat** leeft in `/data/adb/vdbackup/` (configuratie, jobs, bestemmingen, versleutelde
  inloggegevens, logs, staging). **Backups** worden geschreven naar voor de gebruiker zichtbare, met
  inloggegevens versleutelde opslag op `/sdcard/VDBackup/` (`/data/media/<user>/VDBackup`, per gebruiker),
  niet in `/data/adb` (dat apparaatversleuteld en leesbaar is vóór de eerste ontgrendeling).

## Compatibiliteitsgarantie

Een backup moet voor altijd herstelbaar blijven. Dit is een harde regel, geen loze inspanning:

**Reikwijdte.** De garantie dekt backups geschreven door **v1.01 en later** (de eerste officieel
gepubliceerde release) en alleen door officieel gepubliceerde, uitgebrachte versies. v1.00 was een
alleen-voor-tests-build en valt uitdrukkelijk buiten de reikwijdte; pre-release- en
ontwikkelingsbuilds vallen er niet onder. Vanaf de eerste publieke release is de onderstaande
belofte absoluut:

- **Alleen standaardformaten.** Elk archief is een gewone `tar`, gecomprimeerd met `zstd`,
  `gzip` of `lz4`, optioneel omhuld met `age`. Er is geen propriëtaire container, dus
  een backup kan op elke pc met gewone hulpmiddelen worden geopend, zelfs zonder deze module (zie
  `etc/RECOVERY.md`). Een formaat dat we niet kunnen laten vallen.
- **Alleen-toevoegende metadata.** `manifest.json` draagt `format_version`. Het schema groeit altijd
  alleen maar: velden mogen worden *toegevoegd*, nooit verwijderd, hernoemd of hergebruikt. Restore leest
  elk veld defensief (ontbrekende optionele velden vallen terug op een standaard) en installeert
  APK's en pakt archieven uit op basis van hun bestandsnaam en extensie, niet door een vaste
  manifestvorm aan te nemen.
- **Voorwaarts compatibel herstel.** Restore weigert een backup nooit omdat deze oud is, en een
  ouder VDBackup slaat stilletjes itemtypen over die het niet kent in plaats van te falen. Een nieuwer
  VDBackup herstelt daarom elk ouder backup, en de standaardformaat-archieven blijven hoe dan ook
  met de hand herstelbaar.

Kortom: alles wat VDBackup ooit heeft geschreven, kan elk toekomstig VDBackup (en een gewone pc)
nog steeds herstellen. Het formaat wijzigen op een manier die een eerdere backup breekt, is niet
toegestaan; nieuwe mogelijkheden worden toegevoegd achter `format_version` en nieuwe, toevoegende velden.

Voor het volledige technische ontwerp (archiefformaat, metadataschema, pijplijnen, crypto,
bestemmingen, importeurs) houden de maintainers gedetailleerde ontwerpnotities bij; dit bestand is het
overzicht gericht op bijdragers.
