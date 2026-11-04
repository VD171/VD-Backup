> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · Français · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../in/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# Piloter VDBackup depuis un agent IA

VDBackup est conçu pour qu'un assistant ou un agent IA puisse administrer **tout** le contenu et
toutes les actions du module sans interface, de la même manière qu'une personne le fait via la WebUI. La
WebUI n'est qu'un client d'une petite API JSON ; votre agent en est un autre. Utilisez l'API,
ne grattez pas la WebUI.

## Le contrat

Tout passe par un point d'entrée unique, exécuté en root sur l'appareil :

```
sh /data/adb/modules/vdbackup/scripts/helper.sh <verb> <base64(JSON-args)>
```

- Les arguments forment un seul objet JSON, **encodé en base64**, passé comme un unique jeton argv.
- La commande affiche **un seul objet JSON** sur stdout : `{"ok":true,...}` ou
  `{"ok":false,"code":"ERR_...","message":"..."}`. Analysez-le ; ne grattez jamais le texte.
- Les opérations longues (`backup`, `restore`, `import`) renvoient `{"ok":true,"opid":"..."}`
  immédiatement et s'exécutent **détachées** (elles survivent à la disparition de l'appelant/de la WebUI).
  Interrogez leur progression ; elles ne sont pas terminées quand l'appel revient.
- `progress` et `cancel` prennent le **base64 de la chaîne opid brute**, pas un objet JSON.

Un petit utilitaire pour votre shell :

```sh
b64() { printf '%s' "$1" | base64 -w0; }
H=/data/adb/modules/vdbackup/scripts/helper.sh
sh "$H" backup "$(b64 '{"package":"com.example.app","mode":"full"}')"
```

Pour le piloter depuis un poste de travail, exécutez cela via votre canal root habituel vers l'appareil
(adb shell en root, ou une configuration SSH-vers-root). Le module livre des binaires empaquetés, donc
une fois installé il n'a besoin d'**aucun accès internet** pour la sauvegarde/restauration locale ; seules les
destinations cloud (`rclone`/`restic`/ssh) communiquent avec le réseau.

## Verbes

| Verbe | Args (JSON) | Renvoie |
|------|-------------|---------|
| `ping` | `{}` | `{ok,version,abi}` |
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
| `list-backups` | `{package?}` | `{ok,backups:[{ref,package,label,versionName,versionCode,created_at,mode,items}]}` |
| `backup-info` | `{ref}` | `{ok,...}` tous les détails d'une sauvegarde (version, source d'installation, état, date, mode, taille, items, nombres de permissions, appareil) |
| `backup-icon` | `{ref}` | `{ok,icon}` PNG base64 depuis le manifeste (fonctionne quand l'app est désinstallée) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref doit être sous le répertoire des sauvegardes) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` garde les N plus récentes d'un package |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` journal d'audit, les plus récentes d'abord |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` sauvegarde à l'échelle du système (détaché) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (redémarrage requis ; `confirm` le conditionne) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | monte une app installée en tant qu'app système (sous-module sans système ; en direct via NoMount sinon au prochain démarrage) |
| `companion-status` / `companion-install` | `{}` | statut du compagnon Google Drive / installation à la demande |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | gestion des destinations |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | gestion des remotes rclone (crée l'entrée `rclone.conf` que pointe une destination `type:"rclone"`) |
| `schedule-set` / `schedule-list` / `schedule-delete` | `{id,package,mode,dest,cron,at,keep,items}` | tâches planifiées |
| `scheduler-tick` | `{}` | exécute les tâches dues + applique la rétention + l'observateur de sauvegarde automatique (le battement de cœur au démarrage appelle ceci) |

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
  "ssaid": false                  // OPT-IN, voir ci-dessous
}
```

`restore`/`import` prennent `{ref}` (un répertoire de sauvegarde / ref de scan). `restore` accepte aussi :
`"items"` (un sous-ensemble des types d'élément de la sauvegarde à restaurer ; à omettre pour tout),
`"test": true` (extraire vers un répertoire temporaire et vérifier, sans toucher à l'app en service), `"mode"`
pour snapshot/mirror, `"password"` pour une sauvegarde chiffrée, `"ssaid"` (opt-in), et les options de source
d'installation `"spoof_installer"` (par défaut depuis la config, définit l'installateur sur le Play Store au
moment de l'installation) et `"deep_spoof": true` (avancé, opt-in ; forge aussi le paquet et la source du
paquet à l'origine de l'installation en modifiant la base de données des paquets, s'applique après un
redémarrage). `import` prend `"from": "neo" | "databackup"` et, pour une sauvegarde Neo chiffrée,
`"password"`.

### Args de `remote-add`

Une destination cloud est une destination `type:"rclone"` qui nomme un remote `rclone` ; créez
ce remote d'abord avec `remote-add`. Les champs de mot de passe sont stockés obscurcis, jamais en
clair. Valeurs de `backend` supportées et leurs `params` :

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = sortie de `rclone authorize "drive"`)
```

Google Drive a deux voies : ce remote `drive` (aucun projet Google Cloud requis, utilise
l'OAuth propre de rclone - lancez `rclone authorize "drive"` une fois sur n'importe quel ordinateur et passez le
token) ou l'application compagnon optionnelle (votre propre id client OAuth). Les deux finissent comme des
destinations ordinaires.

### Politique réseau

Le champ de configuration `network_policy` contrôle quelle connexion les transferts cloud peuvent utiliser :
`any` (par défaut), `wifi`, ou `mobile`. Définissez-le avec `config-set`. Lorsqu'il est `wifi` ou
`mobile`, chaque transfert cloud (téléversement Full `rclone`/Drive, synchro Mirror, sauvegarde/restauration de
snapshot `restic` distant, restauration Mirror) vérifie d'abord le transport actif et
avorte avec `ERR_NET_POLICY` s'il ne correspond pas - pour les tâches manuelles comme planifiées.
Les destinations locales ne sont jamais soumises à cette règle.

## Garde-fous que votre agent doit respecter

- **`ssaid` est strictement opt-in (désactivé par défaut).** Il sauvegarde / restaure l'ANDROID_ID
  de l'appareil en réécrivant un fichier système ; une restauration ne s'applique qu'après un redémarrage, et
  le fichier précédent est toujours enregistré d'abord pour permettre un retour en arrière. N'envoyez `"ssaid": true`
  que sur une demande directe et délibérée de l'utilisateur - jamais par défaut.
- **Les actions mutantes (restore, delete, import) sont destructrices** et sont consignées dans une
  piste d'audit locale (`logs/audit.jsonl`). La restauration est fidèle (effacement puis extraction), elle
  ramène donc l'app à l'état exact de la sauvegarde. Confirmez l'intention avant de les appeler.
- **N'affaiblissez jamais** la préservation (SELinux/uid/gid/modes/xattr) ni la règle APK (les APK
  sont toujours compressés, jamais chiffrés sauf si `encrypt_apk` est défini).
- Traitez la sortie JSON comme la source de vérité ; vérifiez `ok`/`code`, interrogez `progress`,
  et faites remonter les codes `ERR_*` plutôt que de deviner.

Voir [ARCHITECTURE.md](../ARCHITECTURE.md) et
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) pour les détails internes.

---

*Cette documentation a été générée avec Claude (Anthropic) et est maintenue par VD171. Les corrections et améliorations sont les bienvenues - voir [CONTRIBUTING.md](../CONTRIBUTING.md).*
