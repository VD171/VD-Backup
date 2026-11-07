> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../in/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · Svenska · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# Styra VDBackup från en AI-agent

VDBackup är byggt så att en AI-assistent eller agent kan administrera **varje** innehåll och
åtgärd i modulen utan gränssnitt, på samma sätt som en person gör via WebUI. WebUI
är bara en klient till ett litet JSON-API; din agent är en annan. Använd API:et,
skrapa inte WebUI.

## Kontraktet

Allt går genom en enda ingångspunkt, körd som root på enheten:

```
sh /data/adb/modules/vdbackup/scripts/helper.sh <verb> <base64(JSON-args)>
```

- Argumenten är ett enda JSON-objekt, **base64-kodat**, skickat som en argv-token.
- Kommandot skriver **ett JSON-objekt** till stdout: `{"ok":true,...}` eller
  `{"ok":false,"code":"ERR_...","message":"..."}`. Tolka det; skrapa aldrig text.
- Långa operationer (`backup`, `restore`, `import`) returnerar `{"ok":true,"opid":"..."}`
  omedelbart och körs **frikopplat** (de överlever att anroparen/WebUI försvinner). Polla
  deras förlopp; de är inte klara när anropet returnerar.
- `progress` och `cancel` tar **base64 av den råa opid-strängen**, inte ett JSON-objekt.

En liten hjälpfunktion för ditt skal:

```sh
b64() { printf '%s' "$1" | base64 -w0; }
H=/data/adb/modules/vdbackup/scripts/helper.sh
sh "$H" backup "$(b64 '{"package":"com.example.app","mode":"full"}')"
```

För att styra det från en arbetsstation, kör det över din vanliga root-kanal till enheten
(adb shell som root, eller en SSH-till-root-uppsättning). Modulen levereras med medföljande binärer, så
när den väl är installerad behöver den **inget internet** för lokal backup/återställning; endast moln-
destinationer (`rclone`/`restic`/ssh) kommunicerar med nätverket.

## Verb

| Verb | Args (JSON) | Returnerar |
|------|-------------|---------|
| `ping` | `{}` | `{ok,version,abi}` |
| `overview` | `{user?}` | `{ok:true,apps,instances,path_backups,jobs,backups_size,free,total}` antal (storlekar i byte): appar med säkerhetskopior, totalt antal säkerhetskopieinstanser, fristående sökvägssäkerhetskopior, schemalagda jobb, total säkerhetskopiestorlek, och ledigt/totalt för säkerhetskopiornas filsystem. Inte frikopplad, returnerar omedelbart; används av WebUI:s startöversikt. |
| `config-get` | `{}` | `{ok,config}` |
| `config-set` | konfigurationsobjektet (eller `{key,value}`) | `{ok}` |
| `keygen` | `{}` | genererar `age`-nyckelparet för kryptering |
| `list-apps` | `{user?}` | `{ok,apps:[{package,label,system,versionCode}]}` (dex, shell-reserv) |
| `label` | `{package,user?}` | `{ok,label}` (verkligt lokaliserat appnamn, kontextfritt) |
| `icon` | `{package,user?,vc?}` | `{ok,package,icon}` (base64 PNG; cachad per paket+`vc`) |
| `backup` | se nedan | `{ok,opid}` (frikopplat) |
| `restore` | se nedan | `{ok,opid}` (frikopplat) |
| `import` | `{from,ref,password,ssaid,user}` | `{ok,opid}` (frikopplat) |
| `import-scan` | `{from,path}` | `{ok,backups:[...]}` |
| `progress` | base64(opid) | det aktuella `progress-<opid>.json` |
| `cancel` | base64(opid) | `{ok,cancelled}` |
| `list-ops` | `{}` | `{ok,ops:[...]}` (återanslut efter återanslutning) |
| `list-apps`/`icons` | `{user?}` / `{user?,items:[{package,vc}]}` | applista / base64-ikoner i batch |
| `list-backups` | `{package?}` | `{ok,backups:[{ref,package,label,versionName,versionCode,created_at,mode,items}]}` |
| `backup-info` | `{ref}` | `{ok,...}` en säkerhetskopias fullständiga detaljer (version, installationskälla, tillstånd, datum, läge, storlek, objekt, behörighetsantal, enhet) |
| `backup-icon` | `{ref}` | `{ok,icon}` base64 PNG från manifestet (fungerar när appen är avinstallerad) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref måste ligga under backup-katalogen) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` behåller de N senaste av ett paket |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` revisionslogg, nyast först |
| `log-export` | `{user?}` | `{ok:true,path}` (absolut sökväg till en skriven `.txt` under säkerhetskopiekatalogen) eller `{ok:false,code:"ERR_LOG_EXPORT"}`. Skriver aktivitetsloggen (`audit.jsonl`) plus ett kort bygg-/enhetshuvud till en enda användarsynlig textfil så att den kan bifogas en felrapport. Inte frikopplad, returnerar omedelbart. |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth/calendar/wallpaper/dns/system_settings) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` systemomfattande säkerhetskopia (frikopplat) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (kräver omstart; `confirm` skyddar den) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `path-backup` | `{path,compression?,password?}` | `{ok,opid}` säkerhetskopiera valfri absolut sökväg som `tar.zst`+`manifest.json` under `.paths/` (frikopplat) |
| `path-restore` | `{ref,confirm:true,password?}` | `{ok,opid}` återställ en sökvägs-säkerhetskopia till dess ursprungliga plats (`confirm` skyddar den; frikopplat) |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | montera en installerad app som en systemapp (systemlös undermodul; live via NoMount annars nästa uppstart) |
| `companion-status` / `companion-install` | `{}` | status för Google Drive-companion / installation på begäran |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | destinationshantering |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | hantering av rclone-fjärrplatser (skapar `rclone.conf`-posten som en `type:"rclone"`-destination pekar på); `backend` kan vara vilken rclone-backend som helst, ingen vitlista |
| `remote-authorize` | `{backend}` | `{ok:true,url}` (motorn har redan öppnat telefonens webbläsare på den samtyckes-URL:en via en Android VIEW-intent) eller `{ok:false,code:"ERR_AUTHORIZE"}`. Kör `rclone authorize <backend>` på en lokal callback-server (`127.0.0.1:53682`) för OAuth på enheten. |
| `remote-authorize-poll` | `{}` | `{ok:true,done:false,url}` medan den väntar, `{ok:true,done:true,token}` när användaren har samtyckt (`token` att skicka till `remote-add`), eller `{ok:false,code:"ERR_AUTHORIZE"}`. |
| `remote-authorize-cancel` | `{}` | `{ok:true,cancelled:true}`; stoppar en väntande auktorisering. |
| `cloud-status` | `{}` | `{ok,rclone,restic,fetchable,size}` (om binärerna `rclone`/`restic` finns, om denna `lite`-utgåva kan hämta dem, nedladdningsstorlek i byte) |
| `cloud-fetch` | `{}` | `{ok,opid}` (frikopplat) hämtar+verifierar+installerar `rclone`/`restic`-tillägget i en `lite`-utgåva |
| `schedule-set` / `schedule-list` / `schedule-delete` | se nedan | schemalagda jobb (en säkerhetskopiering eller en återställning; mot en app, en uppsättning, eller alla appar) |
| `scheduler-tick` | `{}` | kör förfallna jobb + tillämpar kvarhållning + auto-backup-observatören (boot-hjärtslaget anropar detta) |
| `update-check` | `{}` | `{ok,current_version,current_code,latest_version,latest_code,update_available,zipUrl,changelog,notes}` (inte frikopplat; returnerar direkt; `ERR_UPDATE_CHECK` vid fel - se nedan) |

### `progress`-fält

Att polla `progress` returnerar den live `progress-<opid>.json` för operationen. Dessa fält är
**alltid närvarande**:

| Fält | Typ | Betydelse |
|------|-----|-----------|
| `opid` | string | operationens id |
| `percent` | int | slutförande 0-100 |
| `phase` | string | etikett för aktuell fas |
| `item` | string | objekttypen som bearbetas just nu |
| `done` | bool | true vid en avslutande skrivning (finish / dry-run / restore-test) |

En pågående operation kan också bära dessa **valfria** live-fält. De saknas eller är tomma när de
är okända, och **utelämnas vid avslutande skrivningar** (finish / dry-run / restore-test):

| Fält | Typ | Betydelse |
|------|-----|-----------|
| `rate` | string | överföringshastighet, t.ex. `"4.2 MiB/s"` (tom = okänd) |
| `eta` | string | uppskattad återstående tid, t.ex. `"1m12s"` (tom = okänd) |
| `n` | int | aktuellt objektindex (0 = okänt) |
| `of` | int | totalt antal objekt (0 = okänt) |
| `cur` | string | namn på aktuellt objekt (tom = inget) |

Molnöverföringar fyller `rate`/`eta` (percent-värdet kommer från rclone); lokala Full-säkerhetskopior
fyller `n`/`of`/`cur`. Fasetiketter inkluderar kontrollsummeförseglingsfasen **`verified`** och, för
molnöverföringar, **`transfer`** och **`mirror <item>`**.

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

`restore`/`import` tar `{ref}` (en backup-katalog / skanningsreferens). `restore` accepterar också:
`"items"` (en delmängd av säkerhetskopians objekttyper att återställa; utelämna för alla), `"test": true`
(extrahera till en tillfällig katalog och verifiera, utan att röra den aktiva appen), `"mode"` för
snapshot/mirror, `"password"` för en krypterad säkerhetskopia, `"ssaid"` (tillval), och
installationskälle-alternativen `"spoof_installer"` (standard från config, sätter installeraren till
Play Store vid installationstillfället) och `"deep_spoof": true` (avancerat tillval; förfalskar även det
initierande paketet och paketkällan genom att redigera paketdatabasen, tillämpas efter en omstart).
`import` tar `"from": "neo" | "databackup"` och, för en krypterad Neo-backup, `"password"`.

### `schedule-set`-args

Ett schemajobb väljer **ett** mål och en **åtgärd**:

```json
{
  "id": "nightly-games",
  "action": "backup",             // "backup" (standard) | "restore"
  "package": "com.example.app",   // en app   - ELLER -
  "packages": ["com.a","com.b"],  // en uppsättning appar   - ELLER -
  "all": true,                    // alla appar, minus listan över uteslutna appar
  "cron": "daily",                // hourly | daily | weekly
  "at": "02:30",                  // HH:MM
  "mode": "full",
  "dest": "local",
  "keep": 5,
  "items": ["apk","data"],
  "require_wifi": false,          // gate: kör bara på Wi-Fi
  "require_charging": false,      // gate: kör bara under laddning
  "min_battery": 0,               // gate: kör bara vid/över denna batterinivå % (0-100)
  "days": [1,2,3,4,5]             // gate: kör bara dessa veckodagar (0=söndag)
}
```

Ange exakt **ett** av `package`, `packages` eller `all` för målet. Ett `backup`-jobb behåller de
vanliga `mode`/`dest`/`keep`/`items`. Ett `restore`-jobb (`action: "restore"`) återställer varje
målapps **senaste** säkerhetskopia (eller en uttrycklig `ref`) och **skriver över appens nuvarande data
vid varje körning** - det är avsiktligt och ett tillval, så ställ in det bara på en direkt begäran från
användaren.

### Schemaläggningsgrindar

Ett schemalagt jobb kan bära **valfria grindvillkor**. När grinden för ett förfallet jobb inte är
uppfylld **hoppas det över och försöks igen vid nästa tick, utan att dess schema flyttas fram**
(dess `last_run` stämplas inte, så det utlöses så snart villkoret är uppfyllt):

| Fält | Typ | Grind |
|------|-----|-------|
| `require_wifi` | bool | kör bara på Wi-Fi |
| `require_charging` | bool | kör bara under laddning |
| `min_battery` | int (0-100) | kör bara vid eller över denna batterinivå |
| `days` | array of int (0-6, 0=söndag) | kör bara dessa veckodagar |

Utöver detta tillämpas alltid en minimal **termisk säkerhetskontroll**: en schemalagd operation
hoppas över medan enheten är kritiskt varm. Varje grindöverhoppning skrivs till granskningsspåret
som `op:"scheduler-gated"` med ett `reason` av `wifi` / `charging` / `battery` / `days` /
`thermal`.

### `remote-add`-args

En molndestination är en `type:"rclone"`-destination som namnger en `rclone`-fjärrplats; skapa
den fjärrplatsen först med `remote-add`. `backend` kan vara **vilken rclone-backend som helst** -
det finns ingen vitlista. `remote-add` accepterar vilket backend-namn som helst (`dropbox`,
`onedrive`, `box`, `pcloud`, `mega`, `b2`, `s3`, `sftp`, `smb`, `webdav`, `ftp`, `drive` och de
~70 andra som rclone stöder), och `params` skickas rakt igenom till `rclone`-konfigurationen som
`key=value`-par. Lösenordsfält lagras dolda, aldrig i klartext. Vanliga backends och deras
`params`:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

**OAuth på enheten (ingen PC).** Backends som behöver en webbläsarinloggning (Google Drive,
Dropbox, OneDrive, Box, pCloud) kräver ingen dator eller ett manuellt inklistrat token. Anropa
`remote-authorize` med `{backend}`: motorn kör `rclone authorize <backend>` mot en lokal
callback-server (`127.0.0.1:53682`) och öppnar telefonens egen webbläsare på leverantörens
samtyckessida via en Android VIEW-intent, och returnerar `{ok:true,url}` (eller
`{ok:false,code:"ERR_AUTHORIZE"}`). Polla `remote-authorize-poll` (`{}`): den returnerar
`{ok:true,done:false,url}` medan den väntar och `{ok:true,done:true,token}` när användaren
godkänner - skicka det `token`:et till `remote-add`. `remote-authorize-cancel` (`{}`) stoppar en
väntande auktorisering (`{ok:true,cancelled:true}`). Att manuellt klistra in utdata från
`rclone authorize "<backend>"` från valfri dator stöds fortfarande som reservlösning.

Google Drive har två vägar: denna `drive`-fjärrplats (inget Google Cloud-projekt behövs, använder
rclones egen OAuth - auktorisera på enheten med `remote-authorize`, eller kör
`rclone authorize "drive"` en gång på valfri dator och skicka in token) eller den valbara
följeslagarappen (ditt eget OAuth-klient-id). Båda hamnar som vanliga destinationer.

### Nätverkspolicy

Konfigurationsfältet `network_policy` styr vilken anslutning molnöverföringar får använda:
`any` (standard), `wifi` eller `mobile`. Ställ in det med `config-set`. När det är `wifi` eller
`mobile` kontrollerar varje molnöverföring (Full `rclone`/Drive-uppladdning, Mirror-synk, fjärr-
`restic`-snapshotbackup/återställning, Mirror-återställning) den aktiva transporten först och
avbryter med `ERR_NET_POLICY` om den inte matchar - för både manuella och schemalagda jobb.
Lokala destinationer är aldrig begränsade.

### Molnintegritet och kvot

- **Kontrollsummeförsegling (moln).** Efter en lyckad molnkopiering kör motorn en
  fjärrkontrollsummekontroll (`rclone check`); en avvikelse får operationen att misslyckas med
  `ERR_VERIFY`. Backends som inte delar någon gemensam hash med den lokala sidan hoppas över
  (inte ett misslyckande).
- **Kvotkontroll (moln, Full-läge).** Före en uppladdning i Full-läge till en `rclone`-fjärr
  frågar motorn efter fjärrens lediga utrymme (`rclone about --json`) och vägrar med `ERR_QUOTA`
  om säkerhetskopian inte skulle få plats. Fjärrar som inte rapporterar någon kvotinformation
  hoppas över. Mirror-läge är en delta-synk och är undantaget.

### Molnbinärer (`lite`-utgåva)

En `full`-utgåva buntar alla binärer och behöver aldrig nätverket. `lite`-utgåvan utelämnar de två
största, `rclone` och `restic`, och hämtar dem på begäran första gången du kör en moln- eller
snapshot-åtgärd. `cloud-status` rapporterar om de redan finns, om denna utgåva kan hämta dem, och
nedladdningsstorleken i byte. `cloud-fetch` körs **frikopplat** (polla `progress` med dess
`opid`): den laddar ner `rclone`+`restic`-tillägget per arkitektur, verifierar det mot den SHA-256
som är inbränd i modulen, och installerar det i runtime-cachen. Dess förloppsfaser är
`downloading`, `verifying` och `installing`; slutkoden är `ERR_NONE` vid framgång, eller
`ERR_FETCH` (nedladdningen misslyckades) / `ERR_FETCH_VERIFY` (checksumman stämmer inte, förkastad)
vid fel. På en `full`-utgåva är den onödig. En `backup`/`restore` till en moln- eller
snapshot-destination i `lite`-utgåvan misslyckas, innan binärerna finns, med
`ERR_CLOUD_FETCHABLE`; klienten bör erbjuda att köra `cloud-fetch` och sedan försöka igen.

### Särskilda backup-kategorier

`special-categories` rapporterar vilka systemomfattande kategorier en enhet har; `special-backup`
fångar dem du skickar i `categories` och `special-restore` återapplicerar dem. Kategorierna är:

| Kategori | Vad det är | Återställningssemantik |
|----------|-----------|-------------------|
| `messages` | SMS/MMS | ersättning via provider (radera + extrahera) |
| `contacts` | kontakter och samtalslogg | ersättning via provider (radera + extrahera) |
| `wifi` | sparade Wi-Fi-nätverk | ersättning via provider (radera + extrahera) |
| `bluetooth` | Bluetooth-parkopplingar | ersättning via provider (radera + extrahera) |
| `calendar` | kalender-providern (`com.android.providers.calendar`, app + data); exporteras även portabelt till `calendar.json` | ersättning via provider (radera + extrahera) |
| `wallpaper` | hem- och låsskärmsbakgrund plus `wallpaper_info.xml`, lagrad rå (binär) | filer ersätts |
| `dns` | privat DNS-läge och specificerare, läst från inställningarna | idempotent `settings put` |
| `system_settings` | den fullständiga dumpen av system/global/secure-inställningar | **opt-in**, idempotent `settings put`, skriver över enhetens inställningar |

**`system_settings` är strikt opt-in och destruktiv vid återställning.** Liksom `ssaid` skriver den
över enhetsomfattande inställningar när den återställs, så den skyddas bakom uttryckligt
användarsamtycke och skrivs till granskningsspåret. Välj den aldrig som standard; endast på en
direkt, avsiktlig användarbegäran.

### Fristående sökvägs-säkerhetskopia

`path-backup` / `path-restore` säkerhetskopierar och återställer **valfri absolut sökväg** - en mapp
eller en enskild fil - på delad lagring eller under `/data`, utanför per-app-modellen. Arkivet skrivs
som `tar.zst` plus en `manifest.json` i VDBackups eget format (SHA-256-förseglat, med ett
RECOVERY-kit när det är krypterat) under `.paths/` i backup-katalogen.

```json
// path-backup
{ "path": "/sdcard/DCIM/Camera", "compression": "zstd:10", "password": "..." }
// path-restore
{ "ref": "<.paths ref>", "confirm": true, "password": "..." }
```

- Källsökvägen måste vara **absolut** och under en av de tillåtna rötterna: `/storage/emulated`,
  `/data/media`, `/sdcard`, `/data`. En sökväg som inte finns misslyckas med `ERR_NO_PATH`; en sökväg
  utanför de tillåtna rötterna, eller en som innehåller `..`, misslyckas med `ERR_BAD_PATH`.
- `path-restore` skriver tillbaka till den ursprungliga platsen, så den är destruktiv och kräver
  `"confirm": true` - en spärr med hög friktion, likt `special-restore`. En `ref` som inte är en
  giltig sökvägs-säkerhetskopia misslyckas med `ERR_BAD_REF`.
- Båda körs **frikopplat**; polla `progress` med det returnerade `opid`.

### `update-check`

`update-check` rapporterar om en nyare version av modulen har publicerats, så att en agent
(eller WebUI:t) kan visa den. Det är ett **läsverb som returnerar direkt** - det är **inte**
frikopplat, så det finns ingen `opid` att polla. Det utlöses endast av en uttrycklig
användaråtgärd och hämtar modulens publicerade uppdateringsmanifest (`updateJson`-URL:en från
`module.prop`) med den medföljande `curl` via en root-sidig HTTP-begäran - detta körs utanför
WebView och omfattas därför inte av WebUI:ts CSP - och jämför den publicerade `versionCode` med
den installerade. Det tar **inga argument**.

Vid framgång returnerar det:

| Fält | Typ | Betydelse |
|------|-----|-----------|
| `ok` | bool | `true` |
| `current_version` | string | den installerade versionName |
| `current_code` | int | den installerade versionCode |
| `latest_version` | string | den publicerade versionName |
| `latest_code` | int | den publicerade versionCode |
| `update_available` | bool | `true` när `latest_code` är större än `current_code` |
| `zipUrl` | string | URL:en till den publicerade zip-filen |
| `changelog` | string | URL:en till den publicerade changelog-filen |
| `notes` | string | versionsanteckningarna |

Om det inte finns någon `updateJson`-URL, om nätverksbegäran misslyckas, eller om manifestet inte
kan parsas, returnerar det `{"ok":false,"code":"ERR_UPDATE_CHECK"}`.

`update-check` **rapporterar** bara tillgänglighet och versionsanteckningar; själva uppdateringen
utförs av din root-hanterare (KernelSU / APatch / Magisk) via modulens `updateJson`, aldrig av
detta verb.

## Säkerhetsräcken som din agent måste respektera

- **`ssaid` är strikt opt-in (standard av).** Det säkerhetskopierar / återställer enhetens
  ANDROID_ID genom att skriva om en systemfil; en återställning tillämpas först efter en omstart, och
  den tidigare filen sparas alltid först för återställning. Skicka endast `"ssaid": true`
  på en direkt, avsiktlig användarbegäran - aldrig som standard.
- **Muterande åtgärder (restore, delete, import) är destruktiva** och loggas till ett
  lokalt granskningsspår (`logs/audit.jsonl`). Återställning är trogen (radera-sedan-extrahera), så
  den återför appen till säkerhetskopians exakta tillstånd. Bekräfta avsikten innan du anropar dem.
- **`system_settings` är opt-in och destruktiv, precis som `ssaid`.** Att återställa den skriver över
  enhetsomfattande inställningar, så skicka den endast på en direkt användarbegäran; den skyddas av
  uttryckligt samtycke och registreras i granskningsspåret.
- **Återställning är idempotent.** Råa provider-återställningar (messages/contacts/wifi/bluetooth/
  calendar) **ersätter** i stället för att slå samman - provider-datan raderas och arkivet extraheras
  över den - så att återställa samma säkerhetskopia igen kan inte duplicera rader. `dns` och
  `system_settings` återappliceras med idempotent `settings put`.
- **Arkivextraktion är skyddad mot sökvägstraversering.** Återställning körs som root, så varje arkiv
  (restore, import, special-restore, path-restore) kontrolleras före någon skrivning: ett vars
  medlemmar använder absoluta sökvägar eller innehåller `..` avvisas i förväg med `ERR_UNSAFE_ARCHIVE`,
  innan en enda destruktiv skrivning sker (GNU tar körs också med `--no-absolute-names`). Ett
  manipulerat arkiv kan aldrig ta sig ut ur sin målkatalog.
- **Försvaga aldrig** bevarandet (SELinux/uid/gid/lägen/xattr) eller APK-regeln (APK:er
  komprimeras alltid, krypteras aldrig om inte `encrypt_apk` är satt).
- Behandla JSON-utdata som sanningskällan; kontrollera `ok`/`code`, polla `progress`,
  och lyft fram `ERR_*`-koder i stället för att gissa.

Se [ARCHITECTURE.md](ARCHITECTURE.md) och
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) för interna detaljer.

---

*Denna dokumentation genererades med Claude (Anthropic) och underhålls av VD171. Rättelser och förbättringar är välkomna - se [CONTRIBUTING.md](CONTRIBUTING.md).*
