> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · Français · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# Contribuer à VDBackup

Merci de votre aide ! VDBackup se veut facile à enrichir. Ce guide vous indique
où se trouvent les choses et les quelques conventions que nous suivons.

## Le projet en un coup d'œil

VDBackup est un **module WebUI KernelSU/APatch/Magisk** : scripts shell + une
WebUI en vanilla-JS + binaires statiques par ABI. Aucune application n'est requise pour les fonctionnalités principales. Voir
[ARCHITECTURE.md](ARCHITECTURE.md) et [docs/FILE-STRUCTURE.md](FILE-STRUCTURE.md).

C'est le **successeur** ouvert et root-natif de **Swift Backup, Neo-Backup et
Android-DataBackup** - l'union de leurs fonctionnalités sous AGPLv3, avec l'import des
backups Neo-Backup et Android-DataBackup existants pour permettre la migration.

## Contributeurs IA bienvenus

Les assistants et agents IA sont des contributeurs de premier plan ici, pas une réflexion après coup.

- Le projet est conçu pour être lisible par les machines : chaque verbe de `helper.sh` affiche un seul
  objet JSON, le moteur est du pur shell POSIX, et l'organisation des fichiers est documentée dans
  [docs/FILE-STRUCTURE.md](FILE-STRUCTURE.md).
- Un agent peut administrer **chaque** contenu et action du module sans interface via
  cette API JSON - la surface de contrôle complète, les verbes et les garde-fous sont dans
  [docs/AI-AGENTS.md](AI-AGENTS.md).
- Les patches assistés par IA sont examinés et acceptés aux mêmes conditions que les autres - selon
  l'exactitude, la clarté et les conventions ci-dessous, et non selon qui (ou quoi) les a écrits.
- Si vous pilotez VDBackup depuis un agent, utilisez la sortie JSON de `helper.sh` comme
  contrat ; ne scrapez pas la WebUI.
- Même exigence pour tous : les fonctionnalités réelles ne sont jamais affaiblies, les secrets et les données
  de l'appareil n'atterrissent jamais dans le dépôt (voir le [.gitignore](.gitignore) strict), et les
  actions mutantes restent confirmées et auditées.

## Mise en place dev

- Vous avez besoin d'un appareil/émulateur rooté (KernelSU, APatch ou Magisk) pour tester.
- Construisez le zip flashable : `cd module && zip -r9 ../VD-Backup-dev.zip .` puis flashez-le.
- La WebUI est `module/webroot/` (ouvrez-la depuis le gestionnaire root). Le backend est
  `module/helper.sh` (dispatcher) et `module/worker.sh` (moteur détaché).
- Les binaires natifs résident dans `module/bin/<abi>/` et sont produits par la CI
  (`.github/scripts/build_bin.sh`) ; normalement vous ne les reconstruisez pas à la main.

## Conventions

- **Chaque fichier source** (`.sh`, `.js`, `.css`, `.html`, `.svg`, `.yml`) commence par l'en-tête
  bannière du projet (copiez-le depuis n'importe quel fichier existant). Aucune exception.
- **Code et commentaires en anglais.** Gardez les commentaires minimaux et seulement là où c'est nécessaire.
- **Pas de tiret cadratin ni demi-cadratin** ; utilisez toujours un simple trait d'union `-`.
- La WebUI est en **vanilla JS** (un seul `scripts.js`) ; pas de frameworks. Communiquez avec root uniquement via
  le wrapper `helper(verb, args)`, et échappez chaque valeur interpolée.
- **N'affaiblissez jamais** une fonctionnalité réelle (par exemple la préservation des SELinux/uid/gid/modes).
- Les actions mutantes (restore, delete) doivent demander une confirmation et écrire un log d'audit.

## Internationalisation (i18n)

- Les chaînes de l'UI résident dans `module/webroot/lang/`. L'anglais est le repli canonique
  (`en.js` + `en.json`) ; les 20 autres langues sont `<code>.json`.
- Pour ajouter ou modifier une chaîne : éditez `en.js` **et** `en.json`, puis mettez à jour chaque
  `<code>.json`. Toucher un libellé visible implique de mettre à jour **tous** les fichiers de langue et
  **tous** les `README.<code>.md`.
- Les traductions sont du JSON simple - une excellente première contribution. Voir la liste des langues dans
  `module/webroot/i18n.js`.

## Commits et PR

- Gardez les PR ciblées. Décrivez quoi et pourquoi.
- Signez vos commits (DCO) : `git commit -s` (ajoute `Signed-off-by:`).
- La CI doit rester verte. Soyez bienveillant dans les revues - voir [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Bonnes premières issues

Cherchez les labels `good first issue` et `help wanted`. Les traductions, la documentation, les nouveaux
presets de destination `rclone` et les finitions de la WebUI sont tous d'excellents points de départ.
