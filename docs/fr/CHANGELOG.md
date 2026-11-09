> **Languages:** [English](../../CHANGELOG.md) · [العربية](../ar/CHANGELOG.md) · [Čeština](../cs/CHANGELOG.md) · [Deutsch](../de/CHANGELOG.md) · [Español](../es/CHANGELOG.md) · [فارسی](../fa/CHANGELOG.md) · Français · [हिन्दी](../hi/CHANGELOG.md) · [Bahasa Indonesia](../in/CHANGELOG.md) · [Italiano](../it/CHANGELOG.md) · [日本語](../ja/CHANGELOG.md) · [한국어](../ko/CHANGELOG.md) · [Nederlands](../nl/CHANGELOG.md) · [Polski](../pl/CHANGELOG.md) · [Português](../pt/CHANGELOG.md) · [Русский](../ru/CHANGELOG.md) · [Svenska](../sv/CHANGELOG.md) · [ไทย](../th/CHANGELOG.md) · [Türkçe](../tr/CHANGELOG.md) · [Tiếng Việt](../vi/CHANGELOG.md) · [中文](../zh/CHANGELOG.md)

---

# Changelog

Toutes les modifications notables de VDBackup sont documentées ici. En anglais uniquement.

## v1.04

Corrections:

- Les dossiers de sauvegarde restent désormais ouvrables par un gestionnaire de fichiers automatiquement : leurs permissions sont réappliquées à l'installation, à chaque démarrage et à chaque ouverture de la WebUI, de sorte qu'un dossier resté réservé au propriétaire (par exemple une sauvegarde faite avant v1.03.2) se répare tout seul sans aucune étape manuelle.

Confidentialité:

- Lorsque vous avez des sauvegardes locales, l'onglet Sauvegardes vous rappelle désormais de masquer le dossier de sauvegarde avec SUSFS, comme l'app compagnon : sa présence peut sinon révéler le root ou un bootloader déverrouillé. C'est SUSFS qui masque ; le rappel ne fait que vous orienter.

Sauvegardes:

- Vous pouvez maintenant définir quels éléments chaque app sauvegarde - par exemple APK seul, ou APK + OBB - appliqué dans les sauvegardes en masse, automatiques et planifiées. Une sauvegarde manuelle individuelle vous laisse toujours choisir sur le moment, pré-rempli depuis l'ensemble de l'app. Réglez-le dans les Réglages, à côté de la liste des apps exclues.

- Préréglages de sauvegarde : enregistrez des ensembles nommés de ce qu'il faut inclure et appliquez-les d'un choix dans la boîte de sauvegarde.
- Multi-utilisateur : les sauvegardes d'apps, les sauvegardes spéciales et les restaurations suivent désormais l'utilisateur Android choisi.
- Les apps reviennent plus prêtes et complètes : leurs profils de compilation ART et leurs autorisations d'écoute des notifications, d'accessibilité et d'exemption de batterie Doze sont sauvegardés et restaurés.
- Restaurations plus fiables : la propriété des fichiers et le contexte SELinux sont redérivés sur l'appareil cible, donc une restauration fonctionne entre appareils et utilisateurs.
- Restaurations plus sûres : Play Protect et le vérificateur d'installation ne sont désactivés que pendant l'installation puis restaurés à l'identique ; le gestionnaire root n'est jamais sauvegardé ni restauré ; et la source d'installation est vérifiée et journalisée.
- Étiquettes d'applications : donnez aux applications des libellés libres comme games ou work, filtrez la liste par une étiquette et sauvegardez tout un groupe étiqueté d'un coup.

## v1.03.2

Corrections:

- La page de connexion au cloud sur l'appareil affichait toujours "Sign-in failed", même quand la
  connexion avait réussi. Elle affiche maintenant le vrai résultat.
- Les sauvegardes enregistrées s'ouvrent maintenant avec un gestionnaire de fichiers : les
  dossiers de sauvegarde par app n'étaient accessibles qu'au propriétaire, donc même un
  gestionnaire root n'y entrait pas ; ils sont désormais accessibles comme le reste de
  /sdcard/VDBackup.

Destinations cloud:

- L'app compagnon facultative Google Drive est maintenant compilée et incluse, donc Google
  Drive fonctionne via le compagnon sur l'appareil (le compte de l'appareil, sans coller de
  jeton à la main) en plus de rclone.

Interface:

- La boîte de dialogue de sauvegarde a un sélecteur de destination, donc une sauvegarde peut aller
  vers une destination cloud ou distante choisie sans d'abord changer la destination par défaut.
- L'app vérifie s'il y a une version plus récente à l'ouverture (au plus une fois par heure) et
  affiche la bannière de mise à jour seulement s'il y en a une ; silencieuse si à jour ou hors ligne.

## v1.03.1

Nouvelle portée de sauvegarde :

- Nouvelles catégories de sauvegarde spéciale : calendrier (le fournisseur de calendrier,
  plus un export portable `calendar.json`), fond d'écran (fond d'écran d'accueil et de
  verrouillage), DNS privé (mode et spécificateur) et paramètres système (le vidage complet
  des paramètres system/global/secure). Les paramètres système sont opt-in et écrasent les
  paramètres de tout l'appareil à la restauration, ils sont donc encadrés comme le SSAID,
  avec un consentement explicite et une entrée d'audit complète.
- Sauvegarde autonome de dossier et de fichier : sauvegardez n'importe quel chemin absolu
  (stockage partagé ou données d'app) sous forme d'archive compressée et scellée par
  manifeste, et restaurez-la au même chemin. La restauration nécessite une confirmation
  explicite.

Restauration plus sûre :

- Chaque archive est vérifiée avant toute écriture : une sauvegarde dont le contenu pointe
  hors de sa cible (un chemin absolu ou un composant `..`) est refusée, de sorte qu'une
  restauration tournant en root ne peut pas être piégée pour écrire hors de la destination.

Progression et planification :

- La progression en direct montre désormais la vitesse de transfert, l'ETA et un compteur
  d'éléments pendant les sauvegardes, plus une étape vérifiée par checksum pour les envois
  vers le cloud et une pré-vérification « espace insuffisant ».
- Les tâches planifiées peuvent être conditionnées : ne s'exécuter qu'en Wi-Fi, qu'en
  charge, qu'au-dessus d'un niveau de batterie, ou que certains jours de la semaine ; une
  tâche planifiée est aussi ignorée pendant que l'appareil est en surchauffe critique. Une
  tâche ignorée est réessayée au tick suivant.

Destinations cloud :

- Connectez n'importe quel backend rclone depuis l'interface : la liste déroulante de remote
  cloud propose les fournisseurs populaires (Google Drive, Dropbox, OneDrive, Box, pCloud,
  Mega, Backblaze B2, S3, SFTP, WebDAV, FTP, SMB) plus une option "Custom (advanced)" où vous
  tapez le nom de n'importe quel autre backend rclone et ses paramètres `key=value`, de sorte
  que tous les backends de rclone sont accessibles.
- Connexion sur l'appareil (sans PC) : les fournisseurs qui nécessitent une connexion par
  navigateur (Google Drive, Dropbox, OneDrive, Box, pCloud) disposent d'un bouton
  "Authorize in browser" qui ouvre le navigateur du téléphone lui-même sur la page de
  consentement du fournisseur ; après votre approbation, vous revenez à l'app et le remote
  est enregistré automatiquement, le token étant capturé sur l'appareil. Un collage manuel du
  token reste disponible comme solution de repli.

Interface :

- Une échelle d'interface ajustable (un curseur que l'on fait glisser) redimensionne toute
  l'interface, afin qu'elle convienne aux écrans de différentes densités de pixels ; 100 %
  est la valeur par défaut et reste inchangée.
- L'interface s'affiche désormais de droite à gauche pour l'arabe et le persan.
- Un aperçu d'accueil avec des comptes de sauvegarde et une barre de stockage, des badges de
  statut, copier les hachages et les chemins dans le presse-papiers, des interrupteurs à
  bascule de style Android, et une action « Check for updates ».
- Le journal d'activité est un écran complet qui s'ouvre instantanément, avec une action
  « Export logs » qui enregistre un fichier journal que vous pouvez joindre à un rapport.

Corrections :

- La restauration et l'import n'échouent plus sur les appareils dont le `tar` embarqué
  n'accepte pas l'option `--no-absolute-names` ; la vérification de sécurité de l'archive est
  indépendante de cette option.
- « Check for updates » fonctionne même là où aucun client HTTP n'est embarqué, en se
  repliant sur le rclone embarqué ; et le journal d'activité ne met plus longtemps à s'ouvrir.

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
  optionnelle (`ru.vd171.vdbackup`), qui porte un avis obligatoire de masquage avec [HMA-OSS](https://github.com/frknkrc44/HMA-OSS).
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

*Cette documentation a été générée avec Claude (Anthropic) et est maintenue par VD171. Les corrections et améliorations sont les bienvenues - voir [CONTRIBUTING.md](CONTRIBUTING.md).*
