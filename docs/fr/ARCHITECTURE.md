> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · Français · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Українська](../uk/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# Architecture

VDBackup est un module WebUI root. Il comporte trois couches : la **WebUI** (ce que vous voyez),
le **backend shell** (ce qui fait le travail, en tant que root) et les **binaires embarqués**
(les archiveurs et les transports). Tout s'exécute déjà-root, donc il n'y a pas de
prompt de permission ni d'application compagnon pour les fonctions centrales.

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

## Points clés

- **Déjà root.** Le processus du module est root, donc le moteur est du shell pur. ~85% du
  travail est du shell pur (`tar`/`zstd`/`age`/`pm`/`am`/`chown`/`chcon`/`rclone`/...).
- **Exécution détachée.** Les sauvegardes/restaurations s'exécutent via `setsid nohup`, en tant que processus root
  indépendant. Fermer la WebUI ne les interrompt pas ; l'UI se rattache en lisant
  `logs/progress-<opid>.json`.
- **Helper de framework (~15%).** Les permissions fines, AppOps, SSAID, StorageStats,
  les icônes et le Wi-Fi privilégié nécessitent le framework Android. Une petite exécution `dex` via
  `app_process` (sans application installée) s'en charge, avec un fallback en shell.
- **Portabilité.** Uniquement des formats standard ; les sauvegardes s'ouvrent sur un PC sans ce module.
- **L'état** réside dans `/data/adb/vdbackup/` (config, jobs, destinations, identifiants
  chiffrés, logs, staging). **Les sauvegardes** sont écrites dans un stockage visible par l'utilisateur et chiffré
  par identifiants dans `/sdcard/VDBackup/` (`/data/media/<user>/VDBackup`, par utilisateur),
  pas dans `/data/adb` (qui est chiffré par l'appareil et lisible avant le premier déverrouillage).

## Garantie de compatibilité

Une sauvegarde doit rester restaurable pour toujours. Ceci est une règle stricte, pas un effort au mieux.

**Portée.** La garantie couvre les sauvegardes écrites par **v1.01 et au-delà** (la première version
publiée officiellement) et uniquement par des versions officiellement publiées et releasées. v1.00 était une
build de test uniquement et est explicitement hors de portée ; les builds pré-release et de développement ne
sont pas couvertes. À partir de la première version publique, la promesse ci-dessous est absolue :

- **Formats standard uniquement.** Chaque archive est un simple `tar` compressé avec `zstd`,
  `gzip` ou `lz4`, éventuellement enveloppé avec `age`. Il n'y a aucun conteneur propriétaire, donc
  une sauvegarde peut être ouverte sur n'importe quel PC avec des outils ordinaires même sans ce module (voir
  `etc/RECOVERY.md`). Un format que nous ne pouvons pas abandonner.
- **Métadonnées en ajout seul.** `manifest.json` porte `format_version`. Le schéma ne fait
  jamais que grandir : des champs peuvent être *ajoutés*, jamais supprimés, renommés ni réaffectés. La restauration lit
  chaque champ de manière défensive (les champs optionnels manquants retombent sur une valeur par défaut) et installe
  les APK et extrait les archives par leur nom et extension de fichier, sans supposer une forme fixe de
  manifest.
- **Restauration compatible en avant.** La restauration ne rejette jamais une sauvegarde parce qu'elle est ancienne, et un
  VDBackup plus ancien ignore silencieusement les types d'élément qu'il ne connaît pas plutôt que d'échouer. Un VDBackup plus récent
  restaure donc n'importe quelle sauvegarde plus ancienne, et les archives au format standard restent
  restaurables à la main de toute façon.

En bref : tout ce que VDBackup a jamais écrit, tout VDBackup futur (et un PC ordinaire)
peut encore le restaurer. Changer le format d'une manière qui casse une sauvegarde antérieure n'est pas
autorisé ; les nouvelles capacités sont ajoutées derrière `format_version` et de nouveaux champs additifs.

Pour la conception technique complète (format d'archive, schéma de métadonnées, pipelines, crypto,
destinations, importateurs) les mainteneurs tiennent des notes de conception détaillées ; ce fichier est la
vue d'ensemble destinée aux contributeurs.

<!-- doc-footer -->

---

> _Cette documentation a été générée avec Claude (Anthropic) et est maintenue par VD171. Les corrections et améliorations sont les bienvenues ; voir [CONTRIBUTING.md](CONTRIBUTING.md)._
