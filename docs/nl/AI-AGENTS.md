> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../in/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · Nederlands · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# VDBackup aansturen vanuit een AI-agent

VDBackup is zo gebouwd dat een AI-assistent of -agent **elke** inhoud en actie van de
module headless kan beheren, net zoals een persoon dat doet via de WebUI. De WebUI is
slechts één client van een kleine JSON-API; jouw agent is een andere. Gebruik de API,
scrape de WebUI niet.

## Het contract

Alles verloopt via één enkel toegangspunt, als root uitgevoerd op het apparaat:

```
sh /data/adb/modules/vdbackup/scripts/helper.sh <verb> <base64(JSON-args)>
```

- Argumenten vormen één enkel JSON-object, **base64-gecodeerd**, doorgegeven als één argv-token.
- Het commando print **één JSON-object** op stdout: `{"ok":true,...}` of
  `{"ok":false,"code":"ERR_...","message":"..."}`. Parse dat; scrape nooit tekst.
- Langdurige operaties (`backup`, `restore`, `import`, `backup-batch`, `restore-batch`, `config-export`, `config-import`) geven onmiddellijk
  `{"ok":true,"opid":"..."}` terug en draaien **losgekoppeld** (ze overleven het verdwijnen
  van de aanroeper/WebUI). Pol hun voortgang; ze zijn niet klaar wanneer de aanroep terugkeert.
- `progress` en `cancel` nemen **base64 van de ruwe opid-tekenreeks**, geen JSON-object.

Een piepkleine helper voor je shell:

```sh
b64() { printf '%s' "$1" | base64 -w0; }
H=/data/adb/modules/vdbackup/scripts/helper.sh
sh "$H" backup "$(b64 '{"package":"com.example.app","mode":"full"}')"
```

Om het vanaf een werkstation aan te sturen, voer je dat uit over je gebruikelijke root-kanaal
naar het apparaat (adb shell als root, of een SSH-naar-root-opstelling). De module levert
gebundelde binaries mee, dus na installatie heeft het **geen internet** nodig voor lokale
backup/restore; alleen cloudbestemmingen (`rclone`/`restic`/ssh) praten met het netwerk.

## Verbs

| Verb | Args (JSON) | Geeft terug |
|------|-------------|---------|
| `ping` | `{}` | `{ok,version,abi}` |
| `overview` | `{user?}` | `{ok:true,apps,instances,path_backups,jobs,backups_size,free,total}` aantallen (groottes in bytes): apps met backups, totaal aantal backup-instanties, losstaande pad-backups, geplande taken, totale backupgrootte, en vrij/totaal van het backup-bestandssysteem. Niet losgekoppeld, keert meteen terug; gebruikt door het startoverzicht van de WebUI. |
| `config-get` | `{}` | `{ok,config}` |
| `config-set` | het config-object (of `{key,value}`) | `{ok}` |
| `keygen` | `{}` | genereert het `age`-sleutelpaar voor versleuteling |
| `list-apps` | `{user?}` | `{ok,apps:[{package,label,system,versionCode}]}` (dex, shell-fallback) |
| `label` | `{package,user?}` | `{ok,label}` (echte gelokaliseerde app-naam, contextvrij) |
| `icon` | `{package,user?,vc?}` | `{ok,package,icon}` (base64-PNG; gecachet per package+`vc`) |
| `backup` | zie hieronder | `{ok,opid}` (losgekoppeld) |
| `restore` | zie hieronder | `{ok,opid}` (losgekoppeld) |
| `import` | `{from,ref,password,ssaid,user}` | `{ok,opid}` (losgekoppeld) |
| `import-scan` | `{from,path}` | `{ok,backups:[...]}` |
| `progress` | base64(opid) | de live `progress-<opid>.json` |
| `cancel` | base64(opid) | `{ok,cancelled}` |
| `list-ops` | `{}` | `{ok,ops:[...]}` (opnieuw aanhaken na herverbinden) |
| `list-apps`/`icons` | `{user?}` / `{user?,items:[{package,vc}]}` | app-lijst / batch base64-pictogrammen |
| `list-backups` | `{package?}` | `{ok,backups:[{ref,package,label,versionName,versionCode,created_at,mode,items}]}` |
| `list-users` | `{}` | `{ok,users:[{id,name}]}` Android-gebruikers van het apparaat (multi-user). |
| `list-dirs` | `{path}` | `{ok,path,parent,dirs:[...]}` submappen van een pad (mapkiezer). |
| `path-list` | `{user?}` | `{ok,backups:[...]}` losse map-/bestandsback-ups. |
| `provenance` | `{}` | audit-manifest van de meegeleverde binaries (`PROVENANCE.json`). |
| `backup-info` | `{ref}` | `{ok,...}` alle details van één backup (versie, installatiebron, staat, datum, modus, grootte, items, machtigingstellingen, apparaat) |
| `backup-icon` | `{ref}` | `{ok,icon}` base64-PNG uit het manifest (werkt wanneer de app is verwijderd) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref moet onder de backups-map liggen) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` bewaar nieuwste N van een pakket |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` auditlogboek, nieuwste eerst |
| `log-export` | `{user?}` | `{ok:true,path}` (absoluut pad van een weggeschreven `.txt` onder de backupmap) of `{ok:false,code:"ERR_LOG_EXPORT"}`. Schrijft het activiteitenlogboek (`audit.jsonl`) plus een korte build/apparaat-header naar een enkel voor de gebruiker zichtbaar tekstbestand, zodat het aan een bugrapport kan worden toegevoegd. Niet losgekoppeld, keert meteen terug. |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth/calendar/wallpaper/dns/system_settings) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` systeembrede back-up (losgekoppeld) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (herstart vereist; `confirm` schermt het af) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `path-backup` | `{path,compression?,password?}` | `{ok,opid}` maak een back-up van elk absoluut pad als `tar.zst`+`manifest.json` onder `.paths/` (losgekoppeld) |
| `path-restore` | `{ref,confirm:true,password?}` | `{ok,opid}` herstel een pad-back-up naar zijn oorspronkelijke locatie (`confirm` schermt het af; losgekoppeld) |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | koppel een geïnstalleerde app als system-app aan (systemless submodule; live via NoMount anders volgende boot) |
| `companion-status` / `companion-install` | `{}` | status / on-demand-installatie van de Google Drive-begeleider |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | bestemmingsbeheer |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | rclone-remote-beheer (maakt het `rclone.conf`-item waarnaar een `type:"rclone"`-bestemming verwijst); `backend` mag elke rclone-backend zijn, geen whitelist |
| `remote-authorize` | `{backend}` | `{ok:true,url}` (de engine heeft de browser van de telefoon al via een Android-VIEW-intent op die toestemmings-URL geopend) of `{ok:false,code:"ERR_AUTHORIZE"}`. Draait `rclone authorize <backend>` op een lokale callbackserver (`127.0.0.1:53682`) voor OAuth op het apparaat. |
| `remote-authorize-poll` | `{}` | `{ok:true,done:false,url}` tijdens het wachten, `{ok:true,done:true,token}` zodra de gebruiker toestemming heeft gegeven (de `token` om aan `remote-add` door te geven), of `{ok:false,code:"ERR_AUTHORIZE"}`. |
| `remote-authorize-cancel` | `{}` | `{ok:true,cancelled:true}`; stopt een lopende autorisatie. |
| `cloud-status` | `{}` | `{ok,rclone,restic,fetchable,size}` (of de binaries `rclone`/`restic` aanwezig zijn, of deze `lite`-editie ze kan ophalen, downloadgrootte in bytes) |
| `cloud-fetch` | `{}` | `{ok,opid}` (losgekoppeld) downloadt+verifieert+installeert de `rclone`/`restic`-addon op een `lite`-editie |
| `schedule-set` / `schedule-list` / `schedule-delete` | zie hieronder | geplande taken (een backup of een herstel; gericht op een app, een set, of alle apps) |
| `scheduler-tick` | `{}` | voert vervallen taken uit + past retentie toe + de auto-backup-observer (de boot-heartbeat roept dit aan) |
| `update-check` | `{}` | `{ok,current_version,current_code,latest_version,latest_code,update_available,zipUrl,changelog,notes}` (niet losgekoppeld; keert meteen terug; `ERR_UPDATE_CHECK` bij mislukking, zie hieronder) |
| `backup-batch` | `{packages:[...], ...backup args}` | `{ok,opid}` (detached) maakt een back-up van veel apps in één losgekoppelde op; voortgang bevat `n`/`of`. Een fout per app stopt de batch niet. |
| `restore-batch` | `{refs:[...], ...restore args}` | `{ok,opid}` (detached) herstelt veel back-ups in één losgekoppelde op; voortgang bevat `n`/`of`. Een fout per app stopt de batch niet. |
| `list-volumes` | `{}` | `{ok,volumes:[{path,removable,id?}]}` opslagvolumes voor de mappenkiezer: intern plus verwisselbare SD-kaart / USB. |
| `config-export` | `{password}` | `{ok,opid}` (detached) exporteert config, taken, bestemmingen, inloggegevens en sleutels naar één met wachtwoordzin versleuteld bestand in de back-upmap. |
| `config-import` | `{ref,password}` | `{ok,opid}` (detached) voegt een geëxporteerd configbestand terug samen in dit apparaat (overschrijft nooit blind). |
| `config-exports` | `{}` | `{ok,exports:[{ref,name,size}]}` somt de versleutelde configbestanden op die beschikbaar zijn om te importeren. |
| `wipe-credentials` | `{}` | `{ok,wiped}` verwijdert opgeslagen externe wachtwoorden en de versleutelingssleutel van het apparaat; bestemmingen, taken en back-ups blijven. |
| `log-prune` | `{}` | `{ok}` snoeit allang voltooide op-logs, beperkt het auditspoor en verwijdert verouderde iconen (de opstartservice roept dit aan). |

### `progress`-velden

Het pollen van `progress` geeft de live `progress-<opid>.json` van de operatie terug. Deze velden
zijn **altijd aanwezig**:

| Veld | Type | Betekenis |
|------|------|-----------|
| `opid` | string | de operatie-id |
| `percent` | int | voltooiing 0-100 |
| `phase` | string | label van de huidige fase |
| `item` | string | het itemtype dat momenteel wordt verwerkt |
| `done` | bool | true bij een afsluitende schrijfactie (finish / dry-run / restore-test) |

Een lopende operatie kan ook deze **optionele** live velden dragen. Ze ontbreken of zijn leeg
wanneer onbekend, en worden **weggelaten bij afsluitende schrijfacties** (finish / dry-run /
restore-test):

| Veld | Type | Betekenis |
|------|------|-----------|
| `rate` | string | overdrachtssnelheid, bv. `"4.2 MiB/s"` (leeg = onbekend) |
| `eta` | string | geschatte resterende tijd, bv. `"1m12s"` (leeg = onbekend) |
| `n` | int | huidige itemindex (0 = onbekend) |
| `of` | int | totaal aantal items (0 = onbekend) |
| `cur` | string | naam van het huidige item (leeg = geen) |

Cloud-overdrachten vullen `rate`/`eta` (de percent-waarde komt van rclone); lokale Full-backups
vullen `n`/`of`/`cur`. Faselabels omvatten de checksum-verzegelfase **`verified`** en, voor
cloud-overdrachten, **`transfer`** en **`mirror <item>`**.

### `backup`-args

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
  "verify": true,                 // re-hash each archive vs the manifest (default on for Full)
  "dry_run": false,               // true = report a size plan, write nothing
  "ssaid": false,                 // OPT-IN, see below
  "manual": false                 // true = single interactive backup, keeps these exact items;
                                  // omit/false lets config.app_items (a per-app item map) override
                                  // the set on bulk, auto and scheduled runs
}
```

`restore`/`import` nemen `{ref}` (een backup-map / scan-ref). `restore` accepteert ook:
`"items"` (een deelverzameling van de itemtypen van de backup om te herstellen; weglaten voor
alle), `"test": true` (uitpakken naar een tijdelijke map en verifiëren, zonder de live-app aan te
raken), `"mode"` voor snapshot/mirror, `"password"` voor een versleutelde backup, `"ssaid"`
(opt-in) en de installatiebron-opties `"spoof_installer"` (standaard uit config, zet het
installatieprogramma bij installatie op de Play Store) en `"deep_spoof": true` (geavanceerd
opt-in; vervalst ook het initiërende pakket en de pakketbron door de pakketdatabase te bewerken,
wordt na een herstart toegepast). `import` neemt `"from": "neo" | "databackup"` en, voor een
versleutelde Neo-backup, `"password"`.

### `schedule-set`-args

Een geplande taak kiest **één** doel en een **actie**:

```json
{
  "id": "nightly-games",
  "action": "backup",             // "backup" (standaard) | "restore"
  "package": "com.example.app",   // één app   - OF -
  "packages": ["com.a","com.b"],  // een set apps   - OF -
  "all": true,                    // alle apps, minus de uitgesloten-apps-lijst
  "cron": "daily",                // hourly | daily | weekly
  "at": "02:30",                  // HH:MM
  "mode": "full",
  "dest": "local",
  "keep": 5,
  "items": ["apk","data"],
  "require_wifi": false,          // gate: alleen uitvoeren op wifi
  "require_charging": false,      // gate: alleen uitvoeren tijdens opladen
  "min_battery": 0,               // gate: alleen uitvoeren op/boven dit accuniveau % (0-100)
  "days": [1,2,3,4,5]             // gate: alleen op deze weekdagen (0=zondag)
}
```

Geef precies **één** van `package`, `packages` of `all` op voor het doel. Een `backup`-taak behoudt
de gebruikelijke `mode`/`dest`/`keep`/`items`. Een `restore`-taak (`action: "restore"`) herstelt de
**meest recente** backup van elke doel-app (of een expliciete `ref`) en **overschrijft bij elke run de
huidige gegevens van de app**: het is bewust en opt-in, dus stel het alleen in op een direct verzoek
van de gebruiker.

### Scheduler-gating

Een geplande taak kan **optionele gate-voorwaarden** dragen. Wanneer de gate van een vervallen taak
niet is voldaan, wordt deze **overgeslagen en bij de volgende tick opnieuw geprobeerd, zonder zijn
schema vooruit te zetten** (zijn `last_run` wordt niet gestempeld, zodat hij afgaat zodra de
voorwaarde geldt):

| Veld | Type | Gate |
|------|------|------|
| `require_wifi` | bool | alleen uitvoeren op wifi |
| `require_charging` | bool | alleen uitvoeren tijdens opladen |
| `min_battery` | int (0-100) | alleen uitvoeren op of boven dit accuniveau |
| `days` | array of int (0-6, 0=zondag) | alleen op deze weekdagen |

Daarbovenop wordt altijd een minimale **thermische veiligheidscontrole** toegepast: een geplande
operatie wordt overgeslagen terwijl het apparaat kritiek heet is. Elke gate-overslag wordt naar het
auditspoor geschreven als `op:"scheduler-gated"` met een `reason` van `wifi` / `charging` /
`battery` / `days` / `thermal`.

### `remote-add`-args

Een cloudbestemming is een `type:"rclone"`-bestemming die een `rclone`-remote benoemt; maak
die remote eerst aan met `remote-add`. De `backend` mag **elke rclone-backend** zijn, er is
geen whitelist. `remote-add` accepteert elke backendnaam (`dropbox`, `onedrive`, `box`,
`pcloud`, `mega`, `b2`, `s3`, `sftp`, `smb`, `webdav`, `ftp`, `drive` en de ~70 andere die
rclone ondersteunt), en de `params` worden rechtstreeks als `key=value`-paren aan de
`rclone`-configuratie doorgegeven. Wachtwoordvelden worden versluierd opgeslagen, nooit in
klare tekst. Veelgebruikte backends en hun `params`:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

**OAuth op het apparaat (geen pc).** Backends die een browseraanmelding vereisen (Google Drive,
Dropbox, OneDrive, Box, pCloud) hebben geen desktop of handmatig geplakte token nodig. Roep
`remote-authorize` aan met `{backend}`: de engine draait `rclone authorize <backend>` tegen een
lokale callbackserver (`127.0.0.1:53682`) en opent de eigen browser van de telefoon op de
toestemmingspagina van de provider via een Android-VIEW-intent, en geeft `{ok:true,url}` terug
(of `{ok:false,code:"ERR_AUTHORIZE"}`). Pol `remote-authorize-poll` (`{}`): die geeft
`{ok:true,done:false,url}` tijdens het wachten en `{ok:true,done:true,token}` zodra de gebruiker
goedkeurt, geef die `token` door aan `remote-add`. `remote-authorize-cancel` (`{}`) stopt een
lopende autorisatie (`{ok:true,cancelled:true}`). De uitvoer van `rclone authorize "<backend>"`
vanaf een willekeurige computer handmatig plakken wordt nog steeds als fallback ondersteund.

Google Drive heeft twee paden: deze `drive`-remote (geen Google Cloud-project nodig, gebruikt
rclones eigen OAuth, autoriseer op het apparaat met `remote-authorize`, of draai
`rclone authorize "drive"` eenmaal op een willekeurige computer en geef de token door) of de
opt-in-begeleidingsapp (je eigen OAuth-client-id). Beide eindigen als gewone bestemmingen.

### Netwerkbeleid

Het config-veld `network_policy` bepaalt welke verbinding cloudoverdrachten mogen gebruiken:
`any` (standaard), `wifi` of `mobile`. Stel het in met `config-set`. Wanneer het `wifi` of
`mobile` is, controleert elke cloudoverdracht (Full-`rclone`/Drive-upload, Mirror-sync,
`restic`-remote-snapshot-backup/-restore, Mirror-restore) eerst het actieve transport en
breekt af met `ERR_NET_POLICY` als het niet overeenkomt, voor zowel handmatige als geplande
taken. Lokale bestemmingen worden nooit beperkt.

### Cloud-integriteit en quota

- **Checksum-verzegeling (cloud).** Na een geslaagde cloud-kopie voert de engine een
  remote-checksumcontrole (`rclone check`) uit; een verschil laat de operatie mislukken met
  `ERR_VERIFY`. Backends die geen gemeenschappelijke hash met de lokale kant delen, worden
  overgeslagen (geen mislukking).
- **Quotacontrole (cloud, Full-modus).** Voor een upload in Full-modus naar een `rclone`-remote
  vraagt de engine de vrije ruimte van de remote op (`rclone about --json`) en weigert met
  `ERR_QUOTA` als de backup niet zou passen. Remotes die geen quota-informatie melden, worden
  overgeslagen. Mirror-modus is een delta-sync en is vrijgesteld.

### Cloud-binaries (`lite`-editie)

Een `full`-editie bundelt alle binaries en heeft nooit het netwerk nodig. De `lite`-editie laat
de twee grootste weg, `rclone` en `restic`, en haalt ze op aanvraag op de eerste keer dat je een
cloud- of snapshot-actie uitvoert. `cloud-status` meldt of ze al aanwezig zijn, of deze editie ze
kan ophalen, en de downloadgrootte in bytes. `cloud-fetch` draait **losgekoppeld** (poll
`progress` met zijn `opid`): het downloadt de per-architectuur `rclone`+`restic`-addon, verifieert
die tegen de in de module gebakken SHA-256, en installeert die in de runtime-cache. De
voortgangsfasen zijn `downloading`, `verifying` en `installing`; de eindcode is `ERR_NONE` bij
succes, of `ERR_FETCH` (download mislukt) / `ERR_FETCH_VERIFY` (checksum komt niet overeen,
weggegooid) bij mislukking. Op een `full`-editie is het overbodig. Een `backup`/`restore` naar een
cloud- of snapshot-bestemming op de `lite`-editie mislukt, voordat de binaries aanwezig zijn, met
`ERR_CLOUD_FETCHABLE`; de client zou moeten aanbieden om `cloud-fetch` uit te voeren, en het dan
opnieuw proberen.

### Speciale back-upcategorieën

`special-categories` meldt welke systeembrede categorieën een apparaat heeft; `special-backup`
legt die vast die je in `categories` doorgeeft en `special-restore` past ze opnieuw toe. De
categorieën zijn:

| Categorie | Wat het is | Herstelsemantiek |
|-----------|-----------|------------------|
| `messages` | SMS/MMS | provider vervangen (wissen + uitpakken) |
| `contacts` | contacten en belgeschiedenis | provider vervangen (wissen + uitpakken) |
| `wifi` | opgeslagen Wi-Fi-netwerken | provider vervangen (wissen + uitpakken) |
| `bluetooth` | Bluetooth-koppelingen | provider vervangen (wissen + uitpakken) |
| `calendar` | de agenda-provider (`com.android.providers.calendar`, app + gegevens); ook overdraagbaar geëxporteerd naar `calendar.json` | provider vervangen (wissen + uitpakken) |
| `wallpaper` | start- en vergrendelscherm-achtergrond plus `wallpaper_info.xml`, ruw (binair) opgeslagen | bestanden vervangen |
| `dns` | de private DNS-modus en -specificatie, gelezen uit settings | idempotente `settings put` |
| `system_settings` | de volledige system/global/secure settings-dump | **opt-in**, idempotente `settings put`, overschrijft apparaatinstellingen |

**`system_settings` is strikt opt-in en destructief bij herstel.** Net als `ssaid`
overschrijft het bij herstel apparaatbrede instellingen, dus het is afgeschermd achter
expliciete gebruikerstoestemming en wordt naar het auditspoor geschreven. Selecteer het nooit
standaard; alleen op een direct, bewust gebruikersverzoek.

### Zelfstandige pad-back-up

`path-backup` / `path-restore` maken een back-up van en herstellen **elk absoluut pad**: een
map of een enkel bestand, op gedeelde opslag of onder `/data`, buiten het per-app-model. Het
archief wordt geschreven als `tar.zst` plus een `manifest.json` in VDBackups eigen formaat
(SHA-256-verzegeld, met een RECOVERY-kit bij versleuteling) onder `.paths/` in de backups-map.

```json
// path-backup
{ "path": "/sdcard/DCIM/Camera", "compression": "zstd:10", "password": "..." }
// path-restore
{ "ref": "<.paths ref>", "confirm": true, "password": "..." }
```

- Het bronpad moet **absoluut** zijn en onder een van de toegestane roots liggen:
  `/storage/emulated`, `/data/media`, `/sdcard`, `/data`. Een pad dat niet bestaat mislukt met
  `ERR_NO_PATH`; een pad buiten de toegestane roots, of een dat `..` bevat, mislukt met
  `ERR_BAD_PATH`.
- `path-restore` schrijft terug naar de oorspronkelijke locatie, dus het is destructief en
  vereist `"confirm": true`, een zware-frictie-afscherming, zoals `special-restore`. Een `ref`
  die geen geldige pad-back-up is mislukt met `ERR_BAD_REF`.
- Beide draaien **losgekoppeld**; pol `progress` met de teruggegeven `opid`.

### `update-check`

`update-check` meldt of er een nieuwere versie van de module is gepubliceerd, zodat een agent
(of de WebUI) die kan tonen. Het is een **leeswerkwoord dat meteen terugkeert**: het is
**niet** losgekoppeld, dus er is geen `opid` om te pollen. Alleen door een expliciete
gebruikersactie geactiveerd, haalt het het gepubliceerde update-manifest van de module op (de
`updateJson`-URL uit `module.prop`) met de meegeleverde `curl` via een root-zijdig HTTP-verzoek -
dit draait buiten de WebView en valt dus niet onder de CSP van de WebUI, en vergelijkt de
gepubliceerde `versionCode` met de geïnstalleerde. Het neemt **geen argumenten**.

Bij succes geeft het terug:

| Veld | Type | Betekenis |
|------|------|-----------|
| `ok` | bool | `true` |
| `current_version` | string | de geïnstalleerde versionName |
| `current_code` | int | de geïnstalleerde versionCode |
| `latest_version` | string | de gepubliceerde versionName |
| `latest_code` | int | de gepubliceerde versionCode |
| `update_available` | bool | `true` wanneer `latest_code` groter is dan `current_code` |
| `zipUrl` | string | de URL van de gepubliceerde zip |
| `changelog` | string | de URL van de gepubliceerde changelog |
| `notes` | string | de release-notes |

Als er geen `updateJson`-URL is, het netwerkverzoek mislukt, of het manifest niet geparseerd kan
worden, geeft het `{"ok":false,"code":"ERR_UPDATE_CHECK"}` terug.

`update-check` **meldt** alleen de beschikbaarheid en de release-notes; de update zelf wordt
uitgevoerd door je root-manager (KernelSU / APatch / Magisk) via de `updateJson` van de module,
nooit door dit werkwoord.

## Veiligheidsrails die je agent moet respecteren

- **`ssaid` is strikt opt-in (standaard uit).** Het maakt een back-up van / herstelt de
  ANDROID_ID van het apparaat door een systeembestand te herschrijven; een herstel wordt pas
  na een herstart toegepast, en het vorige bestand wordt altijd eerst opgeslagen voor rollback.
  Stuur `"ssaid": true` alleen op een directe, bewuste gebruikersaanvraag, nooit standaard.
- **Muterende acties (restore, delete, import) zijn destructief** en worden vastgelegd in een
  lokaal auditspoor (`logs/audit.jsonl`). Restore is getrouw (wissen-dan-uitpakken), dus het
  zet de app terug naar de exacte staat van de backup. Bevestig de intentie voordat je ze aanroept.
- **`system_settings` is opt-in en destructief, net als `ssaid`.** Het herstellen ervan
  overschrijft apparaatbrede instellingen, dus stuur het alleen op een direct gebruikersverzoek;
  het is afgeschermd door expliciete toestemming en vastgelegd in het auditspoor.
- **Herstel is idempotent.** Ruwe provider-herstelbewerkingen (messages/contacts/wifi/bluetooth/
  calendar) **vervangen** in plaats van samen te voegen, de provider-gegevens worden gewist en
  het archief wordt eroverheen uitgepakt, zodat het opnieuw herstellen van dezelfde backup geen
  rijen kan dupliceren. `dns` en `system_settings` worden opnieuw toegepast met idempotente
  `settings put`.
- **Het uitpakken van archieven is beschermd tegen path traversal.** Herstel draait als root,
  dus elk archief (restore, import, special-restore, path-restore) wordt gecontroleerd vóór enige
  schrijfactie: een archief waarvan de leden absolute paden gebruiken of `..` bevatten wordt
  vooraf geweigerd met `ERR_UNSAFE_ARCHIVE`, voordat er ook maar één destructieve schrijfactie
  plaatsvindt (GNU tar draait ook met `--no-absolute-names`). Een gemanipuleerd archief kan nooit
  ontsnappen aan zijn doelmap.
- **Verzwak nooit** het behoud (SELinux/uid/gid/modi/xattr) of de APK-regel (APK's worden
  altijd gecomprimeerd, nooit versleuteld tenzij `encrypt_apk` is ingesteld).
- Behandel de JSON-uitvoer als de bron van waarheid; controleer `ok`/`code`, pol `progress` en
  toon `ERR_*`-codes in plaats van te gokken.

Zie [ARCHITECTURE.md](ARCHITECTURE.md) en
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) voor de interne werking.

---

*Deze documentatie is gegenereerd met Claude (Anthropic) en wordt onderhouden door VD171. Correcties en verbeteringen zijn welkom, zie [CONTRIBUTING.md](CONTRIBUTING.md).*
