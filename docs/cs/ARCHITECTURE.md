> **Languages:** [English](../../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · Čeština · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# Architektura

VDBackup je rootovací modul WebUI. Má tři vrstvy: **WebUI** (to, co vidíte),
**shellový backend** (to, co odvádí práci, jako root) a **přibalené binárky**
(archivátory a přenosové nástroje). Vše běží už jako root, takže neexistuje žádná
výzva k udělení oprávnění ani žádná doprovodná aplikace pro hlavní funkce.

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

## Klíčové body

- **Už root.** Proces modulu je root, takže engine je prostý shell. ~85 % práce
  je čistý shell (`tar`/`zstd`/`age`/`pm`/`am`/`chown`/`chcon`/`rclone`/...).
- **Odpojené spuštění.** Zálohování/obnova běží přes `setsid nohup` jako nezávislý rootovský
  proces. Zavření WebUI je nepřeruší; UI se znovu připojí čtením
  `logs/progress-<opid>.json`.
- **Pomocník frameworku (~15 %).** Jemnozrnná oprávnění, AppOps, SSAID, StorageStats,
  ikony a privilegované Wi-Fi vyžadují framework Androidu. Malý běh `dex` přes
  `app_process` (žádná nainstalovaná aplikace) je obsluhuje, se záložním řešením v shellu.
- **Přenositelnost.** Pouze standardní formáty; zálohy se otevírají na PC bez tohoto modulu.
- **Stav** žije v `/data/adb/vdbackup/` (konfigurace, úlohy, cíle, šifrované
  přihlašovací údaje, logy, staging). **Zálohy** se zapisují do uživatelsky viditelného úložiště
  šifrovaného přihlašovacími údaji na `/sdcard/VDBackup/` (`/data/media/<user>/VDBackup`, pro každého uživatele),
  nikoli do `/data/adb` (které je šifrováno zařízením a čitelné před prvním odemčením).

## Záruka kompatibility

Záloha musí zůstat obnovitelná navždy. Toto je tvrdé pravidlo, nikoli snaha o nejlepší výsledek.

**Rozsah.** Záruka se vztahuje na zálohy zapsané od **verze v1.01** (první oficiálně
zveřejněné vydání) a pouze oficiálně zveřejněnými, vydanými verzemi. v1.00 byla pouze testovací
sestavení a je výslovně mimo rozsah; předběžná a vývojová sestavení nejsou kryta. Od prvního
veřejného vydání dále je příslib níže absolutní:

- **Pouze standardní formáty.** Každý archiv je prostý `tar` komprimovaný pomocí `zstd`,
  `gzip` nebo `lz4`, volitelně zabalený pomocí `age`. Neexistuje žádný proprietární kontejner, takže
  zálohu lze otevřít na jakémkoli PC běžnými nástroji i bez tohoto modulu (viz
  `etc/RECOVERY.md`). Formát, kterého se nemůžeme vzdát.
- **Pouze přidávaná metadata.** `manifest.json` nese `format_version`. Schéma vždy jen
  roste: pole lze *přidávat*, nikdy neodebírat, přejmenovávat ani přeúčelovat. Obnova čte
  každé pole defenzivně (chybějící volitelná pole se vrátí k výchozí hodnotě) a instaluje
  APK a rozbaluje archivy podle jejich názvu souboru a přípony, nikoli předpokládáním pevného
  tvaru manifestu.
- **Dopředně kompatibilní obnova.** Obnova nikdy neodmítne zálohu kvůli jejímu stáří a
  starší VDBackup tiše přeskočí typy položek, které nezná, místo aby selhal. Novější
  VDBackup proto obnoví jakoukoli starší zálohu a archivy ve standardním formátu zůstávají
  obnovitelné ručně tak jako tak.

Stručně řečeno: cokoli, co VDBackup kdy zapsal, dokáže každý budoucí VDBackup (a prostý PC)
stále obnovit. Změna formátu způsobem, který poškodí předchozí zálohu, není
povolena; nové schopnosti se přidávají za `format_version` a nová, přidávaná pole.

Pro úplný technický návrh (formát archivu, schéma metadat, pipeline, kryptografie,
cíle, importéry) udržují správci podrobné návrhové poznámky; tento soubor je přehled
určený přispěvatelům.
