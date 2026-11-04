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
- Langdurige operaties (`backup`, `restore`, `import`) geven onmiddellijk
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
| `backup-info` | `{ref}` | `{ok,...}` alle details van één backup (versie, installatiebron, staat, datum, modus, grootte, items, machtigingstellingen, apparaat) |
| `backup-icon` | `{ref}` | `{ok,icon}` base64-PNG uit het manifest (werkt wanneer de app is verwijderd) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref moet onder de backups-map liggen) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` bewaar nieuwste N van een pakket |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` auditlogboek, nieuwste eerst |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` systeembrede back-up (losgekoppeld) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (herstart vereist; `confirm` schermt het af) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | koppel een geïnstalleerde app als system-app aan (systemless submodule; live via NoMount anders volgende boot) |
| `companion-status` / `companion-install` | `{}` | status / on-demand-installatie van de Google Drive-begeleider |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | bestemmingsbeheer |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | rclone-remote-beheer (maakt het `rclone.conf`-item waarnaar een `type:"rclone"`-bestemming verwijst) |
| `schedule-set` / `schedule-list` / `schedule-delete` | `{id,package,mode,dest,cron,at,keep,items}` | geplande taken |
| `scheduler-tick` | `{}` | voert vervallen taken uit + past retentie toe + de auto-backup-observer (de boot-heartbeat roept dit aan) |

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
  "ssaid": false                  // OPT-IN, see below
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

### `remote-add`-args

Een cloudbestemming is een `type:"rclone"`-bestemming die een `rclone`-remote benoemt; maak
die remote eerst aan met `remote-add`. Wachtwoordvelden worden versluierd opgeslagen, nooit
in klare tekst. Ondersteunde `backend`-waarden en hun `params`:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

Google Drive heeft twee paden: deze `drive`-remote (geen Google Cloud-project nodig, gebruikt
rclones eigen OAuth - draai `rclone authorize "drive"` eenmaal op een willekeurige computer en
geef de token door) of de opt-in-begeleidingsapp (je eigen OAuth-client-id). Beide eindigen
als gewone bestemmingen.

### Netwerkbeleid

Het config-veld `network_policy` bepaalt welke verbinding cloudoverdrachten mogen gebruiken:
`any` (standaard), `wifi` of `mobile`. Stel het in met `config-set`. Wanneer het `wifi` of
`mobile` is, controleert elke cloudoverdracht (Full-`rclone`/Drive-upload, Mirror-sync,
`restic`-remote-snapshot-backup/-restore, Mirror-restore) eerst het actieve transport en
breekt af met `ERR_NET_POLICY` als het niet overeenkomt - voor zowel handmatige als geplande
taken. Lokale bestemmingen worden nooit beperkt.

## Veiligheidsrails die je agent moet respecteren

- **`ssaid` is strikt opt-in (standaard uit).** Het maakt een back-up van / herstelt de
  ANDROID_ID van het apparaat door een systeembestand te herschrijven; een herstel wordt pas
  na een herstart toegepast, en het vorige bestand wordt altijd eerst opgeslagen voor rollback.
  Stuur `"ssaid": true` alleen op een directe, bewuste gebruikersaanvraag - nooit standaard.
- **Muterende acties (restore, delete, import) zijn destructief** en worden vastgelegd in een
  lokaal auditspoor (`logs/audit.jsonl`). Restore is getrouw (wissen-dan-uitpakken), dus het
  zet de app terug naar de exacte staat van de backup. Bevestig de intentie voordat je ze aanroept.
- **Verzwak nooit** het behoud (SELinux/uid/gid/modi/xattr) of de APK-regel (APK's worden
  altijd gecomprimeerd, nooit versleuteld tenzij `encrypt_apk` is ingesteld).
- Behandel de JSON-uitvoer als de bron van waarheid; controleer `ok`/`code`, pol `progress` en
  toon `ERR_*`-codes in plaats van te gokken.

Zie [ARCHITECTURE.md](ARCHITECTURE.md) en
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) voor de interne werking.

---

*Deze documentatie is gegenereerd met Claude (Anthropic) en wordt onderhouden door VD171. Correcties en verbeteringen zijn welkom - zie [CONTRIBUTING.md](CONTRIBUTING.md).*
