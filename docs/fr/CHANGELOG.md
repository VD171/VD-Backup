> **Languages:** [English](../../CHANGELOG.md) · [العربية](../ar/CHANGELOG.md) · [Čeština](../cs/CHANGELOG.md) · [Deutsch](../de/CHANGELOG.md) · [Español](../es/CHANGELOG.md) · [فارسی](../fa/CHANGELOG.md) · Français · [हिन्दी](../hi/CHANGELOG.md) · [Bahasa Indonesia](../in/CHANGELOG.md) · [Italiano](../it/CHANGELOG.md) · [日本語](../ja/CHANGELOG.md) · [한국어](../ko/CHANGELOG.md) · [Nederlands](../nl/CHANGELOG.md) · [Polski](../pl/CHANGELOG.md) · [Português](../pt/CHANGELOG.md) · [Русский](../ru/CHANGELOG.md) · [Svenska](../sv/CHANGELOG.md) · [ไทย](../th/CHANGELOG.md) · [Türkçe](../tr/CHANGELOG.md) · [Tiếng Việt](../vi/CHANGELOG.md) · [中文](../zh/CHANGELOG.md)

---

# Changelog

Toutes les modifications notables de VDBackup sont documentées ici. En anglais uniquement.

## v1.01

Première version publique. Un module WebUI pour KernelSU/APatch/Magisk qui sauvegarde et restaure
les apps et leurs données entièrement en root, sans invite d'autorisation.

Moteur et formats :

- Moteur de sauvegarde/restauration exécuté comme un processus root détaché (`setsid`) : il survit à la fermeture
  de la WebUI ou du gestionnaire de root, et l'interface se rattache à la progression en direct via `opid`.
- Trois modes de sauvegarde : Full (tar.zst, local ou distant), Snapshot (dépôt restic, chiffré
  et dédupliqué) et Mirror (synchronisation 1:1 rclone/rsync). Les APK sont toujours compressés,
  même dans un mirror.
- Éléments par app : APK (base + splits), `data`, `data_de`, `obb`, externe et médias.
  Le contexte SELinux, uid/gid, les modes et xattr/caps sont préservés ; la restauration utilise une
  session `pm install` et réaffecte le propriétaire/contexte à l'uid actif.
- Consciente du multi-utilisateur (multi-user) de bout en bout. Les sauvegardes sont stockées sous `/sdcard/VDBackup`
  (par utilisateur), hors de `/data/adb`, de sorte qu'elles ne sont pas lisibles avant le premier déverrouillage ; chaque
  destination est cloisonnée sous `<path>/vdbackup`.
- Compression : aucune, lz4, zstd (niveaux) ou gzip ("mode de compatibilité"). Un manifeste JSON
  enregistre l'appareil, le paquet (y compris le libellé de l'app), les éléments et les permissions.
- Chiffrement portable avec `age` (keygen), plus un guide de RÉCUPÉRATION sur PC inclus dans chaque
  sauvegarde chiffrée, afin qu'elle puisse être déchiffrée et extraite partout, sans le module.

Destinations et cloud :

- Destinations : ajouter/lister/tester/supprimer (local, distant rclone, dépôt restic et un companion
  optionnel Google Drive) ; les identifiants sont stockés obscurcis, jamais en clair.
- Créer des remotes rclone depuis l'interface/l'API (`remote-add`/`remote-list`/`remote-del`), de sorte que tout
  backend cloud (SFTP, SMB, WebDAV, FTP, S3, Google Drive et plus) soit accessible sans
  éditer `rclone.conf` à la main.
- Google Drive de deux façons : via rclone (sans compte Google Cloud) ou via l'app companion headless
  optionnelle (`ru.vd171.vdbackup`), qui porte un avis obligatoire de masquage avec HMA-OSS.
- Politique réseau : choisir si les transferts cloud peuvent utiliser n'importe quelle connexion, le Wi-Fi uniquement ou
  les données mobiles uniquement ; appliquée aux tâches manuelles et planifiées. Les destinations locales sont exemptées.

Importation (migration) :

- Importer depuis Neo-Backup, y compris les sauvegardes chiffrées par mot de passe (AES-256-GCM déchiffré par
  le helper dex ; la WebUI demande le mot de passe).
- Importer depuis Android-DataBackup (installer les APK, extraire les archives user/user_de/data, réaffecter).
- Les deux validés contre des sauvegardes réelles sur plusieurs appareils.

Intégrité et sûreté :

- Restauration fidèle de type effacer-puis-extraire ; vérification sha256 par archive (activée par défaut pour Full,
  et un contrôle d'intégrité du dépôt pour Snapshot), dry-run et restore-test. Les archives sont relues pour en
  vérifier l'exhaustivité ; une archive corrompue ou un nom de paquet invalide ne peuvent jamais déclencher une
  restauration destructrice, et les échecs de transfert distant sont signalés, jamais silencieux.
- Restauration sélective : restaurez n'importe quel sous-ensemble des éléments que contient une sauvegarde (APK,
  data, données protégées, OBB, externe, médias), tous sélectionnés par défaut.
- Supprimez des sauvegardes depuis l'interface/l'API (`delete-backup`) et rétention des N dernières pour les
  sauvegardes manuelles (`prune`) ; chaque suppression, restauration, élagage et exécution planifiée est écrit dans
  un journal d'audit JSON local consultable dans l'app.
- Permissions de runtime et AppOps capturées dans le manifeste et réappliquées à la restauration. La source
  d'installation (installerPackageName) et l'état activé/désactivé sont également capturés et réappliqués à la
  restauration.
- Usurpation de la source d'installation : par défaut une app restaurée indique le Play Store comme sa source
  d'installation (défini au moment de l'installation via la session d'installation, puisqu'une app restaurée
  aurait sinon l'air sideloadée) ; commutable globalement et par restauration, et quand c'est désactivé la source
  capturée est conservée. Un mode "deep" avancé et opt-in forge en plus le paquet et la source du paquet à
  l'origine de l'installation en modifiant la base de données système des paquets (sauvegarde octet-exacte
  d'abord, s'applique après un redémarrage) de sorte que l'app ait l'air entièrement installée depuis le store.
- SSAID (ANDROID_ID de l'appareil) : strictement opt-in et signalé de manière bien visible ; conscient d'ABX ; le
  fichier actif est toujours sauvegardé octet par octet avant toute réécriture, pour le rollback ; s'applique après un
  redémarrage.
- La restauration et l'importation requièrent une reconnaissance explicite « ceci écrase les données actuelles de l'app »
  avant de poursuivre.

Planification et automatisation :

- Sauvegardes planifiées avec rétention keep-N, gérées depuis un onglet Schedule (par app, quotidien/horaire/
  hebdomadaire avec une heure optionnelle, un mode et une destination).
- Sauvegarde automatique à l'installation ou à la mise à jour : un observateur opt-in profite du battement de cœur
  du planificateur, sauvegarde en arrière-plan les apps nouvelles ou mises à jour, et ne fait qu'amorcer à la
  première exécution de sorte que l'activer ne sauvegarde jamais tout d'un coup. Respecte le réglage d'apps
  exclues (liste de blocage).

Sauvegardes spéciales (à l'échelle du système) :

- Sauvegardez les messages (SMS/MMS), les contacts et le journal d'appels, le Wi-Fi et le Bluetooth en tant que
  données système brutes et fidèlement archivées (même préservation SELinux/xattr et même chiffrement age
  optionnel que les sauvegardes d'apps). La restauration est fidèle sur le même appareil/la même ROM, nécessite
  un redémarrage, et est protégée par une reconnaissance bien visible d'écrasement-et-redémarrage.
- Exportation portable optionnelle en plus de l'archive brute : les messages, le journal d'appels et les contacts
  sont aussi écrits en JSON ouvrable (lus avec le sqlite3 embarqué directement depuis les bases de données des
  providers, de sorte que les corps de message contenant des virgules ou des retours à la ligne survivent
  intacts), offrant une copie multi-appareils sans module. La copie portable est elle aussi chiffrée quand la
  sauvegarde est chiffrée, de sorte qu'elle ne divulgue jamais ce que l'archive protège.

Intégration système :

- Montez une app installée en tant qu'app système sans toucher à la vraie partition /system : VDBackup prépare
  le(s) APK de l'app dans son propre sous-module d'overlay, que le gestionnaire root monte. Avec NoMount sur
  KernelSU, elle est injectée en direct (sans redémarrage) ; sinon elle s'applique au prochain démarrage, de
  sorte qu'elle ne dépend jamais de l'installation de NoMount. Choisissez un placement normal ou privilégié.

WebUI :

- La liste des apps affiche le vrai nom localisé de l'app (résolu depuis l'APK, de sorte qu'il survit à une
  désinstallation) à côté du paquet, avec des icônes chargées à la demande et mises en cache, rendues comme des tuiles
  arrondies et conscientes des icônes adaptatives.
- Touchez une app pour ouvrir son historique de sauvegardes et restaurer n'importe quelle sauvegarde antérieure ; l'onglet Backups
  affiche le nom et le paquet sur des lignes séparées et ouvre une feuille de détails par sauvegarde (version,
  source d'installation, état, date, taille, éléments, nombre de permissions, appareil).
- Filtrez la liste des apps par utilisateur/système/toutes et triez par nom ou paquet ; sélectionnez plusieurs
  apps et sauvegardez-les en un seul lot ; excluez des apps des sauvegardes automatiques et planifiées.
- Choisissez ce qu'il faut inclure et basculez verify ou dry-run par sauvegarde ; choisissez une restauration en
  test seulement qui extrait vers la zone de préparation sans toucher à l'app en service.
- Thème clair/sombre, un sélecteur de couleur d'accent, sélecteur de langue, un onglet À propos (avec les
  projets frères et le manifeste d'audit des binaires empaquetés), un sélecteur de dossier pour la
  destination locale, progression d'opération localisée avec retour instantané, et des dialogues modernes
  dans l'app (pas de pop-ups alert/confirm du système).
- La navigation par le bouton retour revient à l'onglet précédent et ferme d'abord les dialogues ; les dialogues
  sont flottants et l'app survit à sa réouverture en se rattachant aux opérations en direct.

AI-friendly et i18n :

- Une surface de contrôle JSON documentée pour que les agents administrent chaque action de façon headless
  (`docs/AI-AGENTS.md`) ; la WebUI n'est qu'un client de cette API.
- Le README et toute la documentation du projet sont traduits dans les 21 langues standard
  (`docs/<lang>/`), avec les docs reflétés sur le wiki.
- Le listage riche des apps et le déchiffrement Neo passent par un helper dex piloté en root
  (`IPackageManager` via ServiceManager), de sorte qu'ils fonctionnent là où ActivityThread se bloque.
