<!--
  VD BACKUP - full app & data backup and restore as root, from a WebUI.
  Copyright (C) 2026  VD171 - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<p align="center">
  <img src="module/webroot/assets/logo-wordmark.png" alt="VDBackup" width="320">
</p>

<p align="center">
  <b>Sauvegarde et restauration complètes des applis et des données en root - pilotées entièrement depuis une WebUI.</b><br>
  Module KernelSU / APatch / Magisk. Aucune invite "accorder su", aucun basculement de <code>sucompat</code>.
</p>

<p align="center">
  <a href="https://github.com/VD171/VD-Backup/releases">Versions</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki">Wiki</a> ·
  <a href="docs/USER-GUIDE.md">Guide de l'utilisateur</a> ·
  <a href="docs/AI-AGENTS.md">Agents d'IA</a> ·
  <a href="CONTRIBUTING.md">Comment contribuer</a> ·
  <a href="https://xdaforums.com/t/VD-Backup.4807267/">Fil XDA</a>
</p>

> **Languages:** [English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

---

## Ce que c'est

VDBackup est un **module WebUI** root qui sauvegarde et restaure vos applis et leurs
données **sans appli compagnon pour les fonctions principales** - parce que le module est
déjà root, il n'y a rien à "autoriser". Il vise à couvrir tout ce que font les applis de
sauvegarde populaires, au même endroit, avec une WebUI épurée.

Il se veut le **successeur** ouvert et root-natif de **Swift Backup, Neo-Backup et
Android-DataBackup** : l'union de ce qu'ils font, sous AGPLv3, et il peut même
importer les sauvegardes existantes de Neo-Backup et d'Android-DataBackup pour que vous puissiez migrer.

## Fonctionnalités

- **Applis :** APK (base + splits), données de l'appli (`/data/data`), données protégées par l'appareil
  (`/data/user_de`), données externes (`Android/data`), OBB, médias.
- **Données système/spéciales :** permissions, AppOps et (en option) SSAID, là où le root l'autorise.
- **Modes de sauvegarde :** **Full** (`tar.zst` portable), **Snapshot** (incrémental +
  versionné, via `restic`) et **Mirror** (synchronisation 1:1, via `rclone`/`rsync`).
- **Préservation fidèle :** contextes SELinux, uid/gid, modes, xattr et capabilities.
- **Compression :** aucune / lz4 / zstd / gzip (gzip = "mode compatibilité", s'ouvre partout).
- **Chiffrement :** optionnel et portable (`age` + phrase secrète, ou zip AES-256) - jamais
  lié au matériel de l'appareil, de sorte qu'une sauvegarde se restaure sur un autre appareil ou s'ouvre sur un PC.
- **Destinations :** local, SFTP, SCP, SMB, WebDAV, FTP, S3 et plus de 70 (`rclone`),
  ainsi que les dépôts `rsync` et `restic`. Google Drive en option via un petit compagnon opt-in.
- **Intégrité :** chaque archive est vérifiée par rapport au manifeste ; dry-run et
  restore-test vous permettent de contrôler une sauvegarde sans rien toucher.
- **Planification + rétention :** tâches récurrentes avec élagage keep-N.
- **En arrière-plan :** backup/restore s'exécutent détachés et survivent à la fermeture de la WebUI, avec
  des notifications de début/fin.
- **Migrer vers ici :** importe les sauvegardes existantes de Neo-Backup et d'Android-DataBackup,
  y compris celles protégées par mot de passe.

## Installation

1. Téléchargez le `VD-Backup-vX.Y.zip` le plus récent depuis [Versions](https://github.com/VD171/VD-Backup/releases).
2. Installez-le dans le gestionnaire KernelSU / APatch / Magisk - utilisable immédiatement, sans redémarrage.
3. Ouvrez la **WebUI** du module pour configurer et lancer les sauvegardes. C'est tout.

Nouveau ici ? Le [Guide de l'utilisateur](docs/USER-GUIDE.md) vous accompagne de l'installation à la restauration.

## Portabilité

Vos sauvegardes **ne sont pas enfermées dans ce module**. Tout utilise des formats standard
(`tar`, `gzip`, `zstd`, `age`, `zip`, `restic`) qui s'ouvrent sous Windows, macOS et
Linux avec des outils courants ou des gestionnaires de fichiers. Chaque sauvegarde chiffrée est livrée avec une
note **RECOVERY** contenant les commandes exactes pour déchiffrer et extraire sur un PC.

## Build

Le module, c'est du shell + WebUI plus des binaires statiques par ABI (`tar`, `zstd`, `lz4`,
`rclone`, `rsync`, ssh, `restic`) compilés pour `armeabi-v7a`, `arm64-v8a`, `x86`,
`x86_64`. Voir [CONTRIBUTING.md](CONTRIBUTING.md) et les workflows de CI.

## Documentation

- **[Wiki](https://github.com/VD171/VD-Backup/wiki)** - la documentation, consultable en ligne.
- **[Guide de l'utilisateur](docs/USER-GUIDE.md)** - de bout en bout, de l'installation à la restauration.
- **[Agents d'IA](docs/AI-AGENTS.md)** - pilotez chaque action sans interface via l'API JSON.
- **[Architecture](ARCHITECTURE.md)** et **[Structure des fichiers](docs/FILE-STRUCTURE.md)** - comment ça marche.
- **[Comment contribuer](CONTRIBUTING.md)** et **[Sécurité](SECURITY.md)**.

## Convivial pour l'IA

VDBackup est conçu pour accueillir les assistants et agents d'IA, pas seulement les personnes.
Le engine parle JSON (chaque verbe de `helper.sh` renvoie un seul objet JSON), le
code, la documentation et la structure des fichiers sont agencés pour la lecture par machine, et
les contributions assistées par IA sont examinées et acceptées comme toute autre. Un agent peut administrer
**chaque** action du module sans interface via la même API que celle qu'utilise la WebUI -
voir **[docs/AI-AGENTS.md](docs/AI-AGENTS.md)** pour la surface de contrôle complète, et
[CONTRIBUTING.md](CONTRIBUTING.md#ai-contributors-welcome) pour contribuer.

## Contacts

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Channel:** @Priv8_VD https://t.me/Priv8_VD
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171

## Voir aussi

Projets frères du même auteur :

- **[VDInfos](https://github.com/VD171/VD-Infos)** - un débogueur de méthodes de l'appareil : il lit chaque élément par toutes les méthodes qui peuvent le lire et les compare côte à côte.
- **[VDGoogle](https://github.com/VD171/VD-Google)** - vos services Google (RCS, Wallet, attestations Play Integrity), lus sur votre appareil sans internet.
- **[COPG-VD](https://github.com/VD171/COPG-VD)** - un spoofer d'appareil qui transforme une empreinte neuve en un profil cohérent et consistant.

## Licence

[GNU AGPL-3.0-or-later](LICENSE). Copyleft réseau : si vous exécutez une version modifiée,
même en tant que service, vous devez en proposer le code source.

---

`android` `backup` `restore` `app-data` `migration` `neo-backup` `databackup` `kernelsu` `apatch` `magisk` `webui` `root` `tar` `zstd` `restic` `rclone` `age` `encryption` `ssaid` `appops` `on-device` `agpl` `ai-friendly` `vdbackup`
