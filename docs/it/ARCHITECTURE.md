> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · Italiano · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# Architettura

VDBackup è un modulo WebUI root. Ha tre livelli: la **WebUI** (ciò che vedi),
il **backend shell** (ciò che fa il lavoro, come root) e i **binari inclusi**
(gli archiviatori e i trasporti). Tutto gira già-root, quindi non c'è
prompt di permesso né app companion per le funzioni centrali.

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

## Punti chiave

- **Già root.** Il processo del modulo è root, quindi il motore è shell puro. ~85% del
  lavoro è shell puro (`tar`/`zstd`/`age`/`pm`/`am`/`chown`/`chcon`/`rclone`/...).
- **Esecuzione staccata.** Backup/ripristino girano via `setsid nohup`, come processo root
  indipendente. Chiudere la WebUI non li interrompe; la UI si riaggancia leggendo
  `logs/progress-<opid>.json`.
- **Helper di framework (~15%).** Permessi granulari, AppOps, SSAID, StorageStats,
  icone e Wi-Fi privilegiato richiedono il framework Android. Una piccola esecuzione `dex` via
  `app_process` (senza app installata) se ne occupa, con fallback in shell.
- **Portabilità.** Solo formati standard; i backup si aprono su un PC senza questo modulo.
- **Lo stato** risiede in `/data/adb/vdbackup/` (config, job, destinazioni, credenziali
  cifrate, log, staging). **I backup** vengono scritti in uno storage visibile all'utente e cifrato
  per credenziali in `/sdcard/VDBackup/` (`/data/media/<user>/VDBackup`, per utente),
  non in `/data/adb` (che è cifrato dal dispositivo e leggibile prima del primo sblocco).

## Garanzia di compatibilità

Un backup deve restare ripristinabile per sempre. Questa è una regola rigida, non un impegno al meglio.

**Ambito.** La garanzia copre i backup scritti da **v1.01 in poi** (la prima release pubblicata
ufficialmente) e solo da versioni ufficialmente pubblicate e rilasciate. v1.00 era una build solo di
test ed è esplicitamente fuori ambito; le build pre-release e di sviluppo non sono coperte. Dalla prima
release pubblica in poi, la promessa qui sotto è assoluta:

- **Solo formati standard.** Ogni archive è un semplice `tar` compresso con `zstd`,
  `gzip` o `lz4`, eventualmente avvolto con `age`. Non c'è alcun container proprietario, quindi
  un backup può essere aperto su qualsiasi PC con strumenti comuni anche senza questo modulo (vedi
  `etc/RECOVERY.md`). Un formato che non possiamo abbandonare.
- **Metadati append-only.** `manifest.json` porta `format_version`. Lo schema non fa che
  crescere: i campi possono essere *aggiunti*, mai rimossi, rinominati o riutilizzati. Il ripristino legge
  ogni campo in modo difensivo (i campi opzionali mancanti ricadono su un valore di default) e installa
  gli APK ed estrae gli archive per nome ed estensione del file, senza assumere una forma fissa di
  manifest.
- **Ripristino compatibile in avanti.** Il ripristino non rifiuta mai un backup perché vecchio, e un
  VDBackup più vecchio salta silenziosamente i tipi di elemento che non conosce invece di fallire. Un VDBackup più nuovo
  quindi ripristina qualsiasi backup più vecchio, e gli archive in formato standard restano
  ripristinabili a mano in ogni caso.

In breve: tutto ciò che VDBackup ha mai scritto, ogni VDBackup futuro (e un PC comune)
può ancora ripristinarlo. Cambiare il formato in un modo che rompe un backup precedente non è
consentito; le nuove capacità vengono aggiunte dietro `format_version` e nuovi campi additivi.

Per il design tecnico completo (formato di archive, schema dei metadati, pipeline, crypto,
destinazioni, importatori) i manutentori tengono note di design dettagliate; questo file è la
panoramica rivolta ai contributori.

*Questa documentazione è stata generata con Claude (Anthropic) ed è mantenuta da VD171. Correzioni e miglioramenti sono benvenuti, vedi [CONTRIBUTING.md](CONTRIBUTING.md).*
