> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · Français · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../id/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Українська](../uk/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# Piloter VDBackup depuis un agent IA

VDBackup est conçu pour qu'un assistant ou un agent IA puisse administrer **tout** le contenu et
toutes les actions du module sans interface, de la même manière qu'une personne le fait via la WebUI. La
WebUI n'est qu'un client d'une petite API JSON, votre agent en est un autre. Utilisez l'API,
ne grattez pas la WebUI.

## Le contrat

Tout passe par un point d'entrée unique, exécuté en root sur l'appareil :

```
sh /data/adb/modules/vdbackup/scripts/helper.sh <verb> <base64(JSON-args)>
```

- Les arguments forment un seul objet JSON, **encodé en base64**, passé comme un unique jeton argv.
- La commande affiche **un seul objet JSON** sur stdout : `{"ok":true,...}` ou
  `{"ok":false,"code":"ERR_...","message":"..."}`. Analysez-le, ne grattez jamais le texte.
- Les opérations longues (`backup`, `restore`, `import`, `backup-batch`, `restore-batch`, `config-export`, `config-import`) renvoient `{"ok":true,"opid":"..."}`
  immédiatement et s'exécutent **détachées** (elles survivent à la disparition de l'appelant/de la WebUI).
  Interrogez leur progression, elles ne sont pas terminées quand l'appel revient.
- `progress` et `cancel` prennent le **base64 de la chaîne opid brute**, pas un objet JSON.

Un petit utilitaire pour votre shell :

```sh
b64() { printf '%s' "$1" | base64 -w0; }
H=/data/adb/modules/vdbackup/scripts/helper.sh
sh "$H" backup "$(b64 '{"package":"com.example.app","mode":"full"}')"
```

Pour le piloter depuis un poste de travail, exécutez cela via votre canal root habituel vers l'appareil
(adb shell en root, ou une configuration SSH-vers-root). Le module livre des binaires empaquetés, donc
une fois installé il n'a besoin d'**aucun accès internet** pour la sauvegarde/restauration locale, seules les
destinations cloud (`rclone`/`restic`/ssh) communiquent avec le réseau.

## Verbes

| Verbe | Args (JSON) | Renvoie |
|------|-------------|---------|
| `ping` | `{}` | `{ok,version,abi}` |
| `overview` | `{user?}` | `{ok:true,apps,instances,path_backups,jobs,backups_size,free,total}` comptes (tailles en octets) : apps avec sauvegardes, total des instances de sauvegarde, sauvegardes de chemin autonomes, tâches planifiées, taille totale des sauvegardes, et l'espace libre/total du système de fichiers des sauvegardes. Non détachée, retourne immédiatement, utilisée par l'aperçu d'accueil de la WebUI. |
| `config-get` | `{}` | `{ok,config}` |
| `config-set` | l'objet de configuration (ou `{key,value}`) | `{ok}` |
| `keygen` | `{}` | génère la paire de clés `age` pour le chiffrement |
| `list-apps` | `{user?}` | `{ok,apps:[{package,label,system,versionCode}]}` (dex, repli shell) |
| `label` | `{package,user?}` | `{ok,label}` (vrai nom localisé de l'app, sans contexte) |
| `icon` | `{package,user?,vc?}` | `{ok,package,icon}` (PNG base64 ; en cache par package+`vc`) |
| `backup` | voir ci-dessous | `{ok,opid}` (détaché) |
| `restore` | voir ci-dessous | `{ok,opid}` (détaché) |
| `import` | `{from,ref,password,ssaid,user}` | `{ok,opid}` (détaché) |
| `import-scan` | `{from,path}` | `{ok,backups:[...]}` |
| `progress` | base64(opid) | le `progress-<opid>.json` en direct |
| `cancel` | base64(opid) | `{ok,cancelled}` |
| `list-ops` | `{}` | `{ok,ops:[...]}` (se rattache après reconnexion) |
| `list-apps`/`icons` | `{user?}` / `{user?,items:[{package,vc}]}` | liste d'apps / icônes base64 par lot |
| `list-backups` | `{package?}` | `{ok,backups:[{ref,package,label,versionName,versionCode,created_at,mode,note,tags,encrypted,locked,items}]}` (`encrypted` = les métadonnées sont scellées ; `locked` = chiffré et cet appareil ne peut même pas lire le stub de listage, p. ex. une sauvegarde venant d'un autre appareil - elle se restaure quand même avec la phrase de passe) |
| `note-set` | `{ref,note?,tags?}` | `{ok}` définit ou efface le nom personnalisé d'une sauvegarde (`note`) et les `tags` libres, stocké dans un fichier annexe qui voyage avec la sauvegarde, interrogeable depuis `list-backups`. |
| `list-users` | `{}` | `{ok,users:[{id,name}]}` utilisateurs Android de l'appareil (multi-utilisateur). |
| `list-dirs` | `{path}` | `{ok,path,parent,dirs:[...]}` sous-dossiers d'un chemin (sélecteur de dossier). |
| `path-list` | `{user?}` | `{ok,backups:[...]}` sauvegardes autonomes de dossier/fichier. |
| `provenance` | `{}` | manifeste d'audit des binaires fournis (`PROVENANCE.json`). |
| `backup-info` | `{ref}` | `{ok,...}` tous les détails d'une sauvegarde (version, source d'installation, état, date, mode, taille, items, nombres de permissions, appareil) ; pour une sauvegarde chiffrée, il renvoie `encrypted:true` avec seulement les champs de niveau stub (le détail complet est scellé et visible à la restauration, avec la phrase de passe) |
| `backup-icon` | `{ref}` | `{ok,icon}` PNG base64 depuis le manifeste (fonctionne quand l'app est désinstallée) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref doit être sous le répertoire des sauvegardes) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` garde les N plus récentes d'un package |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` journal d'audit, les plus récentes d'abord |
| `log-export` | `{user?}` | `{ok:true,path}` (chemin absolu d'un `.txt` écrit sous le répertoire des sauvegardes) ou `{ok:false,code:"ERR_LOG_EXPORT"}`. Écrit le journal d'activité (`audit.jsonl`) plus un court en-tête build/appareil dans un seul fichier texte visible par l'utilisateur afin qu'il puisse être joint à un rapport de bug. Non détachée, retourne immédiatement. |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth/calendar/wallpaper/dns/system_settings) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` sauvegarde à l'échelle du système (détaché) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (redémarrage requis, `confirm` le conditionne) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `path-backup` | `{path,compression?,password?}` | `{ok,opid}` sauvegarde n'importe quel chemin absolu en `tar.zst`+`manifest.json` sous `.paths/` (détaché) |
| `path-restore` | `{ref,confirm:true,password?}` | `{ok,opid}` restaure une sauvegarde de chemin vers son emplacement d'origine (`confirm` le conditionne, détaché) |
| `adb-list` | `{path?}` | `{ok,entries:[{name,type,size,has_children}]}` un niveau paresseux de l'arbre /data/adb (par défaut `/data/adb`), pour le sélecteur. |
| `adb-du` | `{path}` | `{ok,size}` taille récursive en octets d'un sous-arbre /data/adb, à la demande. |
| `adb-backup` | `{paths?,exclude?,compression?,encrypt_data?,password?}` | `{ok,opid}` sauvegarde /data/adb - complet (omettre `paths`) ou les sous-chemins choisis - avec une fidélité SELinux/propriétaire par fichier, sous `.adb/` (détaché) |
| `adb-restore` | `{ref,paths?,confirm:true,password?}` | `{ok,opid}` restaure une sauvegarde /data/adb PAR-DESSUS l'arbre vivant - complet ou sous-chemins choisis - en conservant le contexte de chaque fichier (jamais un chcon global), `confirm` le conditionne (détaché) |
| `adb-backups` | `{}` | `{ok,backups:[{ref,created_at,mode,paths,encryption}]}` les sauvegardes du système de fichiers /data/adb. |
| `adb-index` | `{ref}` | `{ok,lines:[...]}` la liste de fichiers détaillée stockée d'une sauvegarde, pour le sélecteur d'arbre de restauration. |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | monte une app installée en tant qu'app système (sous-module sans système, en direct via NoMount sinon au prochain démarrage) |
| `companion-status` / `companion-install` | `{}` | statut du compagnon Google Drive / installation à la demande |
| `telegram-check` | `{}` | état de la session Telegram (`user` null = non connecté) |
| `telegram-send-code` / `telegram-sign-in` | `{phone}` / `{phone,code,password?}` | connexion Telegram, `sign-in` renvoie `2FA_REQUIRED` si le compte a la 2FA et qu'il manque `password` |
| `telegram-logout` | `{}` | ferme la session Telegram |
| `telegram-list` | `{}` | sauvegardes dans le canal Telegram (noms `<pkg>__<ts>_<vc>.vdb.tar`) |
| `telegram-pull` | `{message_id,name}` | `{ok,opid}` télécharge une sauvegarde Telegram vers le stockage local (détaché), elle se restaure ensuite par le flux `restore` normal |
| `telegram-delete` | `{message_id}` | `{ok,deleted:[...]}` supprime une sauvegarde du canal Telegram par `message_id` (lot : séparés par des virgules) |
| `rclone-list` | `{dest}` | `{ok,dest,backups:[{dest,rref,package,tsvc}]}` sauvegardes Full stockées uniquement en remote sur une destination rclone (`dest` est l'id de la destination, `rref` est `<pkg>/<ts_vc>`) |
| `rclone-pull` | `{dest,rref}` | `{ok,opid}` télécharge une sauvegarde rclone stockée uniquement en remote vers le stockage local (détaché), elle se restaure ensuite par le flux `restore` normal |
| `rclone-delete` | `{dest,rref}` | `{ok,deleted}` supprime une sauvegarde d'un remote rclone, `rref` doit être exactement `<pkg>/<ts_vc>` |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | gestion des destinations |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | gestion des remotes rclone (crée l'entrée `rclone.conf` que pointe une destination `type:"rclone"`), `backend` peut être n'importe quel backend rclone, sans liste blanche |
| `remote-authorize` | `{backend}` | `{ok:true,url}` (le moteur a déjà ouvert le navigateur du téléphone sur cette URL de consentement via un intent VIEW Android) ou `{ok:false,code:"ERR_AUTHORIZE"}`. Lance `rclone authorize <backend>` sur un serveur de rappel local (`127.0.0.1:53682`) pour l'OAuth sur l'appareil. |
| `remote-authorize-poll` | `{}` | `{ok:true,done:false,url}` pendant l'attente, `{ok:true,done:true,token}` une fois que l'utilisateur a consenti (le `token` à passer à `remote-add`), ou `{ok:false,code:"ERR_AUTHORIZE"}`. |
| `remote-authorize-cancel` | `{}` | `{ok:true,cancelled:true}`, arrête une autorisation en attente. |
| `cloud-status` | `{}` | `{ok,rclone,restic,fetchable,size}` (si les binaires `rclone`/`restic` sont présents, si cette édition `lite` peut les récupérer, taille du téléchargement en octets) |
| `cloud-fetch` | `{}` | `{ok,opid}` (détaché) télécharge+vérifie+installe l'addon `rclone`/`restic` sur une édition `lite` |
| `schedule-set` / `schedule-list` / `schedule-delete` | voir ci-dessous | tâches planifiées (une sauvegarde ou une restauration, ciblant une seule app, un ensemble, ou toutes les apps) |
| `scheduler-tick` | `{}` | exécute les tâches dues + applique la rétention + l'observateur de sauvegarde automatique (le battement de cœur au démarrage appelle ceci) |
| `update-check` | `{}` | `{ok,current_version,current_code,latest_version,latest_code,update_available,zipUrl,changelog,notes}` (non détaché, retourne immédiatement, `ERR_UPDATE_CHECK` en cas d'échec, voir ci-dessous) |
| `backup-batch` | `{packages:[...], ...backup args}` | `{ok,opid}` (detached) sauvegarde plusieurs applis en une op détachée, la progression porte `n`/`of`. Un échec par appli n'arrête pas le lot. |
| `restore-batch` | `{refs:[...], ...restore args}` | `{ok,opid}` (detached) restaure plusieurs sauvegardes en une op détachée, la progression porte `n`/`of`. Un échec par appli n'arrête pas le lot. |
| `list-volumes` | `{}` | `{ok,volumes:[{path,removable,id?}]}` volumes de stockage pour le sélecteur de dossiers : interne plus carte SD / USB amovible. |
| `config-export` | `{password}` | `{ok,opid}` (detached) exporte config, tâches, destinations, identifiants et clés vers un seul fichier chiffré par phrase secrète, sous le dossier des sauvegardes. |
| `config-import` | `{ref,password}` | `{ok,opid}` (detached) fusionne un fichier de config exporté dans cet appareil (n'écrase jamais à l'aveugle). |
| `config-exports` | `{}` | `{ok,exports:[{ref,name,size}]}` liste les fichiers de config chiffrés disponibles à l'import. |
| `wipe-credentials` | `{}` | `{ok,wiped}` supprime les mots de passe distants enregistrés et la clé de chiffrement de l'appareil, destinations, tâches et sauvegardes restent. |
| `log-prune` | `{}` | `{ok}` élague les journaux d'ops terminées depuis longtemps, limite le journal d'audit et supprime les icônes obsolètes (le service de démarrage l'appelle). |
| `sanitize` | `{}` | `{ok}` réaffirme la visibilité (0755) des dossiers de sauvegarde pour chaque utilisateur Android, afin qu'un gestionnaire de fichiers puisse ouvrir des dossiers qu'une copie root brute ou une sauvegarde antérieure à v1.03.2 ont laissés accessibles au seul propriétaire. |
| `boot-sweep` | `{}` | `{ok,reaped}` récupère les restes d'une sauvegarde interrompue ou tuée de force (le service de démarrage l'appelle), une sauvegarde qui échoue ou est annulée est déjà nettoyée par son propre worker. |

### Champs de `progress`

Interroger `progress` renvoie le `progress-<opid>.json` en direct de l'opération. Ces champs sont
**toujours présents** :

| Champ | Type | Signification |
|-------|------|---------------|
| `opid` | string | l'id de l'opération |
| `percent` | int | avancement de 0 à 100 |
| `phase` | string | le libellé de la phase en cours |
| `item` | string | le type d'élément en cours de traitement |
| `done` | bool | true lors d'une écriture terminale (finish / dry-run / restore-test) |

Une opération en cours peut aussi porter ces champs en direct **optionnels**. Ils sont absents ou
vides quand ils sont inconnus, et sont **omis lors des écritures terminales** (finish / dry-run /
restore-test) :

| Champ | Type | Signification |
|-------|------|---------------|
| `rate` | string | débit de transfert, p. ex. `"4.2 MiB/s"` (vide = inconnu) |
| `eta` | string | temps restant estimé, p. ex. `"1m12s"` (vide = inconnu) |
| `n` | int | index de l'élément en cours (0 = inconnu) |
| `of` | int | nombre total d'éléments (0 = inconnu) |
| `cur` | string | nom de l'élément en cours (vide = aucun) |

Les transferts cloud remplissent `rate`/`eta` (le percent vient de rclone), les sauvegardes Full
locales remplissent `n`/`of`/`cur`. Les libellés de phase incluent la phase de scellement par
somme de contrôle **`verified`** et, pour les transferts cloud, **`transfer`** et
**`mirror <item>`**.

### Args de `backup`

```json
{
  "package": "com.example.app",
  "user": 0,
  "mode": "full",                 // full | snapshot | mirror
  "compression": "zstd:10",       // none | lz4 | zstd[:N] | gzip
  "items": ["apk","data","data_de","obb","external","media"],
  "encrypt_data": false,
  "encrypt_apk": false,
  "dest": "local",                // local | <destination id>
  "verify": true,                 // re-hache chaque archive vs le manifeste (activé par défaut pour Full)
  "dry_run": false,               // true = rapporte un plan de taille, n'écrit rien
  "ssaid": false,                  // OPT-IN, voir ci-dessous
  "manual": false                 // true = single interactive backup, keeps these exact items;
                                  // omit/false lets config.app_items (a per-app item map) override
                                  // the set on bulk, auto and scheduled runs
}
```

`restore`/`import` prennent `{ref}` (un répertoire de sauvegarde / ref de scan). `restore` accepte aussi :
`"items"` (un sous-ensemble des types d'élément de la sauvegarde à restaurer, à omettre pour tout),
`"test": true` (extraire vers un répertoire temporaire et vérifier, sans toucher à l'app en service), `"mode"`
pour snapshot/mirror, `"password"` pour une sauvegarde chiffrée, `"ssaid"` (opt-in), et les options de source
d'installation `"spoof_installer"` (par défaut depuis la config, définit l'installateur sur le Play Store au
moment de l'installation) et `"deep_spoof": true` (avancé, opt-in, forge aussi le paquet et la source du
paquet à l'origine de l'installation en modifiant la base de données des paquets, s'applique après un
redémarrage). `import` prend `"from": "neo" | "databackup"` et, pour une sauvegarde Neo chiffrée,
`"password"`.

### Args de `schedule-set`

Une tâche planifiée choisit **une** cible et une **action** :

```json
{
  "id": "nightly-games",
  "action": "backup",             // "backup" (par défaut) | "restore"
  "package": "com.example.app",   // une seule app   (OU)
  "packages": ["com.a","com.b"],  // un ensemble d'apps   (OU)
  "all": true,                    // toutes les apps, moins la liste des apps exclues
  "cron": "daily",                // hourly | daily | weekly
  "at": "02:30",                  // HH:MM
  "mode": "full",
  "dest": "local",
  "keep": 5,
  "items": ["apk","data"],
  "require_wifi": false,          // gate : ne s'exécute qu'en Wi-Fi
  "require_charging": false,      // gate : ne s'exécute qu'en charge
  "min_battery": 0,               // gate : ne s'exécute qu'à batterie >= ce % (0-100)
  "days": [1,2,3,4,5]             // gate : ne s'exécute que ces jours (0=dimanche)
}
```

Donnez exactement **un** parmi `package`, `packages` ou `all` pour la cible. Une tâche `backup` conserve les
habituels `mode`/`dest`/`keep`/`items`. Une tâche `restore` (`action: "restore"`) restaure la sauvegarde la
**plus récente** de chaque app ciblée (ou une `ref` explicite) et **écrase les données actuelles de l'app à
chaque exécution**: c'est délibéré et opt-in, ne la définissez donc que sur demande directe de l'utilisateur.

### Conditionnement du planificateur

Une tâche planifiée peut porter des **conditions de gate optionnelles**. Quand le gate d'une tâche
due n'est pas satisfait, elle est **ignorée et réessayée au prochain tick, sans faire avancer sa
planification** (son `last_run` n'est pas horodaté, elle se déclenche donc dès que la condition est
remplie) :

| Champ | Type | Gate |
|-------|------|------|
| `require_wifi` | bool | ne s'exécute qu'en Wi-Fi |
| `require_charging` | bool | ne s'exécute qu'en charge |
| `min_battery` | int (0-100) | ne s'exécute qu'à ce niveau de batterie ou au-dessus |
| `days` | array d'int (0-6, 0=dimanche) | ne s'exécute que ces jours de la semaine |

Une vérification minimale de **sécurité thermique** s'applique toujours en plus : une op planifiée
est ignorée tant que l'appareil est dangereusement chaud. Chaque saut de gate est écrit dans la
piste d'audit comme `op:"scheduler-gated"` avec un `reason` parmi `wifi` / `charging` / `battery` /
`days` / `thermal`.

### Fiabilité du lot

Un lot (`backup` avec `packages`, `restore` avec `refs`) exécute chaque application dans son propre sous-shell, afin qu'une application ne puisse pas casser les autres :

- **`batch_app_timeout`** (config, secondes, par défaut `1800`, `0` désactive) : si une application dépasse ce délai, son arbre de processus est arrêté, elle est enregistrée comme `ERR_TIMEOUT`, et le lot continue, afin qu'une application bloquée ne gèle jamais toute l'exécution.
- **Résultat partiel** : l'écriture finale porte `ok`, `n` sur `of`, un décompte `fails` `{code:count}` (p. ex. `{"ERR_NO_SPACE":24}`) et `free` (octets restants sur le système de fichiers des sauvegardes). Un lot partiel est `ERR_BATCH_PARTIAL`, jamais une erreur aveugle.
- **Régulation thermique** (config `thermal_throttle`, activée par défaut) : entre les applications, le worker fait une pause pour refroidir quand l'appareil est chaud, en émettant une phase de progression `cooling`, afin qu'une longue exécution ne surchauffe pas l'appareil.
- **Estimation de l'espace avant exécution** (config `space_preflight`, activée par défaut) : avant un lot vers une destination locale, la taille non compressée des applications sélectionnées est additionnée, si elle dépasse déjà l'espace libre de la destination, le lot s'arrête d'emblée avec `ERR_NO_SPACE` (plus un champ `need`) au lieu de remplir le disque à moitié. Ignoré pour les destinations distantes en flux.

### Args de `remote-add`

Une destination cloud est une destination `type:"rclone"` qui nomme un remote `rclone`, créez
ce remote d'abord avec `remote-add`. Le `backend` peut être **n'importe quel backend rclone**: il
n'y a pas de liste blanche. `remote-add` accepte n'importe quel nom de backend (`dropbox`,
`onedrive`, `box`, `pcloud`, `mega`, `b2`, `s3`, `sftp`, `smb`, `webdav`, `ftp`, `drive` et les
~70 autres pris en charge par rclone), et les `params` sont transmis directement à la configuration
`rclone` sous forme de paires `key=value`. Les champs de mot de passe sont stockés obscurcis, jamais
en clair. Backends courants et leurs `params` :

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = sortie de `rclone authorize "drive"`)
```

**OAuth sur l'appareil (sans PC).** Les backends qui nécessitent une connexion par navigateur
(Google Drive, Dropbox, OneDrive, Box, pCloud) n'ont besoin ni d'un ordinateur ni d'un token collé
à la main. Appelez `remote-authorize` avec `{backend}` : le moteur lance `rclone authorize <backend>`
contre un serveur de rappel local (`127.0.0.1:53682`) et ouvre le navigateur du téléphone sur la page
de consentement du fournisseur via un intent VIEW Android, en renvoyant `{ok:true,url}` (ou
`{ok:false,code:"ERR_AUTHORIZE"}`). Interrogez `remote-authorize-poll` (`{}`) : il renvoie
`{ok:true,done:false,url}` pendant l'attente et `{ok:true,done:true,token}` une fois que l'utilisateur
a approuvé, passez ce `token` à `remote-add`. `remote-authorize-cancel` (`{}`) arrête une autorisation
en attente (`{ok:true,cancelled:true}`). Coller à la main la sortie de `rclone authorize "<backend>"`
depuis n'importe quel ordinateur reste pris en charge comme solution de repli.

Google Drive a deux voies : ce remote `drive` (aucun projet Google Cloud requis, utilise
l'OAuth propre de rclone, autorisez sur l'appareil avec `remote-authorize`, ou lancez
`rclone authorize "drive"` une fois sur n'importe quel ordinateur et passez le token) ou l'application
compagnon optionnelle (votre propre id client OAuth). Les deux finissent comme des destinations
ordinaires.

### Politique réseau

Le champ de configuration `network_policy` contrôle quelle connexion les transferts cloud peuvent utiliser :
`any` (par défaut), `wifi`, ou `mobile`. Définissez-le avec `config-set`. Lorsqu'il est `wifi` ou
`mobile`, chaque transfert cloud (téléversement Full `rclone`/Drive, synchro Mirror, sauvegarde/restauration de
snapshot `restic` distant, restauration Mirror) vérifie d'abord le transport actif et
avorte avec `ERR_NET_POLICY` s'il ne correspond pas, pour les tâches manuelles comme planifiées.
Les destinations locales ne sont jamais soumises à cette règle.

### Intégrité et quota cloud

- **Scellement par somme de contrôle (cloud).** Après une copie cloud réussie, le moteur lance une
  vérification de somme de contrôle distante (`rclone check`), une non-concordance fait échouer
  l'op avec `ERR_VERIFY`. Les backends qui ne partagent aucun hash commun avec le côté local sont
  ignorés (ce n'est pas un échec).
- **Vérification de quota (cloud, mode Full).** Avant un téléversement en mode Full vers un remote
  `rclone`, le moteur interroge l'espace libre du remote (`rclone about --json`) et refuse avec
  `ERR_QUOTA` si la sauvegarde ne tient pas. Les remotes qui ne rapportent aucune information de
  quota sont ignorés. Le mode Mirror est une synchro delta et en est exempt.

### Binaires cloud (édition `lite`)

Une édition `full` embarque tous les binaires et n'a jamais besoin du réseau. L'édition `lite`
omet les deux plus gros, `rclone` et `restic`, et les récupère à la demande la première fois que
vous lancez une action cloud ou snapshot. `cloud-status` indique s'ils sont déjà présents, si
cette édition peut les récupérer, et la taille du téléchargement en octets. `cloud-fetch` tourne
**détaché** (interrogez `progress` avec son `opid`) : il télécharge l'addon `rclone`+`restic`
propre à l'architecture, le vérifie face au SHA-256 gravé dans le module, et l'installe dans le
cache d'exécution. Ses phases de progression sont `downloading`, `verifying` et `installing`, le
code final est `ERR_NONE` en cas de succès, ou `ERR_FETCH` (échec du téléchargement) /
`ERR_FETCH_VERIFY` (somme de contrôle non concordante, écartée) en cas d'échec. Sur une édition
`full`, il est inutile. Un `backup`/`restore` vers une destination cloud ou snapshot sur
l'édition `lite`, avant que les binaires soient présents, échoue avec `ERR_CLOUD_FETCHABLE`, le
client devrait proposer de lancer `cloud-fetch`, puis réessayer.

### Catégories de sauvegarde spéciale

`special-categories` indique quelles catégories à l'échelle du système un appareil possède ;
`special-backup` capture celles que vous passez dans `categories` et `special-restore` les
réapplique. Les catégories sont :

| Catégorie | Ce que c'est | Sémantique de restauration |
|----------|-----------|-------------------|
| `messages` | SMS/MMS | remplacement du fournisseur (effacement + extraction) |
| `rcs` | chat RCS (Google Messages, `bugle_db`), aussi exporté de façon portable vers `rcs.json` | remplacement des données de l'appli (efface + extrait), même appareil |
| `contacts` | contacts et journal d'appels | remplacement du fournisseur (effacement + extraction) |
| `wifi` | réseaux Wi-Fi enregistrés | remplacement du fournisseur (effacement + extraction) |
| `bluetooth` | appairages Bluetooth | remplacement du fournisseur (effacement + extraction) |
| `calendar` | le fournisseur de calendrier (`com.android.providers.calendar`, app + données), aussi exporté de façon portable vers `calendar.json` | remplacement du fournisseur (effacement + extraction) |
| `wallpaper` | fonds d'écran d'accueil et de verrouillage plus `wallpaper_info.xml`, stockés bruts (binaire) | fichiers remplacés |
| `dns` | le mode DNS privé et son spécificateur, lus depuis les réglages | `settings put` idempotent |
| `system_settings` | le dump complet des réglages système/global/secure | **opt-in**, `settings put` idempotent, écrase les réglages de l'appareil |

**`system_settings` est strictement opt-in et destructif à la restauration.** Comme `ssaid`, il
écrase les réglages à l'échelle de l'appareil quand il est restauré, il est donc protégé par le
consentement explicite de l'utilisateur et écrit dans la piste d'audit. Ne le sélectionnez jamais
par défaut, uniquement sur une demande directe et délibérée de l'utilisateur.

### Sauvegarde de chemin autonome

`path-backup` / `path-restore` sauvegardent et restaurent **n'importe quel chemin absolu**: un
dossier ou un seul fichier, sur le stockage partagé ou sous `/data`, en dehors du modèle par app.
L'archive est écrite en `tar.zst` plus un `manifest.json` au format propre de VDBackup (scellé en
SHA-256, avec un kit RECOVERY quand elle est chiffrée) sous `.paths/` dans le répertoire des
sauvegardes.

```json
// path-backup
{ "path": "/sdcard/DCIM/Camera", "compression": "zstd:10", "password": "..." }
// path-restore
{ "ref": "<.paths ref>", "confirm": true, "password": "..." }
```

- Le chemin source doit être **absolu** et sous l'une des racines autorisées :
  `/storage/emulated`, `/data/media`, `/sdcard`, `/data`. Un chemin qui n'existe pas échoue
  avec `ERR_NO_PATH`, un chemin hors des racines autorisées, ou contenant `..`, échoue avec
  `ERR_BAD_PATH`.
- `path-restore` réécrit vers l'emplacement d'origine, il est donc destructif et requiert
  `"confirm": true`, un garde-fou à forte friction, comme `special-restore`. Une `ref` qui n'est
  pas une sauvegarde de chemin valide échoue avec `ERR_BAD_REF`.
- Les deux s'exécutent **détachés**, interrogez `progress` avec l'`opid` renvoyé.

### Sauvegarde du système de fichiers /data/adb

`adb-backup` / `adb-restore` sauvegardent et restaurent l'environnement root sous /data/adb (modules,
leurs données et configs), pilotés par un sélecteur d'arbre paresseux (`adb-list` un niveau à la fois,
`adb-du` pour la taille d'un dossier à la demande).

- Complet ou sélectif aux deux bouts : omettez `paths` pour tout, ou passez les sous-chemins choisis
  (relatifs à /data/adb), la restauration prend les mêmes `paths`.
- **Fidélité par fichier :** l'archive conserve le contexte SELinux, le propriétaire et les xattrs de
  chaque fichier, et la restauration s'appuie dessus - elle n'applique JAMAIS un `chcon` global, qui
  aplatirait les contextes hétérogènes de /data/adb et casserait root. `adb-restore` extrait PAR-DESSUS
  l'arbre vivant, il ne l'efface jamais.
- Auto-référence : la sortie propre de la sauvegarde et le staging du module sont exclus, donc une
  sauvegarde ne se contient jamais elle-même.
- `adb-index` renvoie la liste de fichiers stockée d'une sauvegarde pour qu'une restauration puisse
  montrer son arbre, la sélection de l'UI est exprimée entièrement via `paths` (un dossier entièrement
  coché est un chemin, un dossier partiellement coché descend vers ses enfants cochés, donc aucune
  liste d'exclusion n'est nécessaire).
- `adb-restore` requiert `"confirm": true` (garde-fou à forte friction), les deux s'exécutent détachés, interrogez `progress`.

### `update-check`

`update-check` indique si une version plus récente du module a été publiée, afin qu'un agent
(ou la WebUI) puisse l'afficher. C'est un **verbe de lecture qui retourne immédiatement**: il
n'est **pas** détaché, il n'y a donc pas d'`opid` à interroger. Déclenché uniquement par une
action explicite de l'utilisateur, il récupère le manifeste de mise à jour publié du module
(l'URL `updateJson` de `module.prop`) avec le `curl` empaqueté via une requête HTTP côté root -
cela s'exécute hors du WebView, donc n'est pas soumis à la CSP de la WebUI, et compare le
`versionCode` publié avec celui installé. Il ne prend **aucun argument**.

En cas de succès, il retourne :

| Champ | Type | Signification |
|-------|------|---------------|
| `ok` | bool | `true` |
| `current_version` | string | le versionName installé |
| `current_code` | int | le versionCode installé |
| `latest_version` | string | le versionName publié |
| `latest_code` | int | le versionCode publié |
| `update_available` | bool | `true` quand `latest_code` est supérieur à `current_code` |
| `zipUrl` | string | l'URL du zip publié |
| `changelog` | string | l'URL du changelog publié |
| `notes` | string | les notes de version |

S'il n'y a pas d'URL `updateJson`, si la requête réseau échoue, ou si le manifeste ne peut pas
être analysé, il retourne `{"ok":false,"code":"ERR_UPDATE_CHECK"}`.

`update-check` ne fait que **signaler** la disponibilité et les notes de version, la mise à jour
elle-même est effectuée par votre gestionnaire root (KernelSU / APatch / Magisk) via le
`updateJson` du module, jamais par ce verbe.

## Garde-fous que votre agent doit respecter

- **`ssaid` est strictement opt-in (désactivé par défaut).** Il sauvegarde / restaure l'ANDROID_ID
  de l'appareil en réécrivant un fichier système, une restauration ne s'applique qu'après un redémarrage, et
  le fichier précédent est toujours enregistré d'abord pour permettre un retour en arrière. N'envoyez `"ssaid": true`
  que sur une demande directe et délibérée de l'utilisateur, jamais par défaut.
- **Les actions mutantes (restore, delete, import) sont destructrices** et sont consignées dans une
  piste d'audit locale (`logs/audit.jsonl`). La restauration est fidèle (effacement puis extraction), elle
  ramène donc l'app à l'état exact de la sauvegarde. Confirmez l'intention avant de les appeler.
- **`system_settings` est opt-in et destructif, exactement comme `ssaid`.** Sa restauration
  écrase les réglages à l'échelle de l'appareil, ne l'envoyez donc que sur une demande directe de
  l'utilisateur, il est protégé par le consentement explicite et consigné dans la piste d'audit.
- **La restauration est idempotente.** Les restaurations brutes de fournisseur (messages/contacts/
  wifi/bluetooth/calendar) **remplacent** au lieu de fusionner, les données du fournisseur sont
  effacées et l'archive est extraite par-dessus, de sorte que re-restaurer la même sauvegarde ne
  peut pas dupliquer de lignes. `dns` et `system_settings` sont réappliqués avec un `settings put`
  idempotent.
- **L'extraction d'archive est protégée contre la traversée de chemin.** La restauration s'exécute
  en root, donc chaque archive (restore, import, special-restore, path-restore) est vérifiée avant
  toute écriture : une archive dont les membres utilisent des chemins absolus ou contiennent `..`
  est rejetée d'emblée avec `ERR_UNSAFE_ARCHIVE`, avant la moindre écriture destructrice (GNU tar
  s'exécute aussi avec `--no-absolute-names`). Une archive altérée ne peut jamais s'échapper de son
  répertoire cible.
- **N'affaiblissez jamais** la préservation (SELinux/uid/gid/modes/xattr) ni la règle APK (les APK
  sont toujours compressés, jamais chiffrés sauf si `encrypt_apk` est défini).
- Traitez la sortie JSON comme la source de vérité, vérifiez `ok`/`code`, interrogez `progress`,
  et faites remonter les codes `ERR_*` plutôt que de deviner.

Voir [ARCHITECTURE.md](ARCHITECTURE.md) et
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) pour les détails internes.

<!-- doc-footer -->

---

> _Cette documentation a été générée avec Claude (Anthropic) et est maintenue par VD171. Les corrections et améliorations sont les bienvenues, voir [CONTRIBUTING.md](CONTRIBUTING.md)._
