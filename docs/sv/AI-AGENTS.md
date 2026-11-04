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
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` systemomfattande säkerhetskopia (frikopplat) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (kräver omstart; `confirm` skyddar den) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | montera en installerad app som en systemapp (systemlös undermodul; live via NoMount annars nästa uppstart) |
| `companion-status` / `companion-install` | `{}` | status för Google Drive-companion / installation på begäran |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | destinationshantering |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | hantering av rclone-fjärrplatser (skapar `rclone.conf`-posten som en `type:"rclone"`-destination pekar på) |
| `schedule-set` / `schedule-list` / `schedule-delete` | `{id,package,mode,dest,cron,at,keep,items}` | schemalagda jobb |
| `scheduler-tick` | `{}` | kör förfallna jobb + tillämpar kvarhållning + auto-backup-observatören (boot-hjärtslaget anropar detta) |

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

### `remote-add`-args

En molndestination är en `type:"rclone"`-destination som namnger en `rclone`-fjärrplats; skapa
den fjärrplatsen först med `remote-add`. Lösenordsfält lagras dolda, aldrig i
klartext. Stödda `backend`-värden och deras `params`:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

Google Drive har två vägar: denna `drive`-fjärrplats (inget Google Cloud-projekt behövs, använder
rclones egen OAuth - kör `rclone authorize "drive"` en gång på valfri dator och skicka in
token) eller den valbara följeslagarappen (ditt eget OAuth-klient-id). Båda hamnar som vanliga
destinationer.

### Nätverkspolicy

Konfigurationsfältet `network_policy` styr vilken anslutning molnöverföringar får använda:
`any` (standard), `wifi` eller `mobile`. Ställ in det med `config-set`. När det är `wifi` eller
`mobile` kontrollerar varje molnöverföring (Full `rclone`/Drive-uppladdning, Mirror-synk, fjärr-
`restic`-snapshotbackup/återställning, Mirror-återställning) den aktiva transporten först och
avbryter med `ERR_NET_POLICY` om den inte matchar - för både manuella och schemalagda jobb.
Lokala destinationer är aldrig begränsade.

## Säkerhetsräcken som din agent måste respektera

- **`ssaid` är strikt opt-in (standard av).** Det säkerhetskopierar / återställer enhetens
  ANDROID_ID genom att skriva om en systemfil; en återställning tillämpas först efter en omstart, och
  den tidigare filen sparas alltid först för återställning. Skicka endast `"ssaid": true`
  på en direkt, avsiktlig användarbegäran - aldrig som standard.
- **Muterande åtgärder (restore, delete, import) är destruktiva** och loggas till ett
  lokalt granskningsspår (`logs/audit.jsonl`). Återställning är trogen (radera-sedan-extrahera), så
  den återför appen till säkerhetskopians exakta tillstånd. Bekräfta avsikten innan du anropar dem.
- **Försvaga aldrig** bevarandet (SELinux/uid/gid/lägen/xattr) eller APK-regeln (APK:er
  komprimeras alltid, krypteras aldrig om inte `encrypt_apk` är satt).
- Behandla JSON-utdata som sanningskällan; kontrollera `ok`/`code`, polla `progress`,
  och lyft fram `ERR_*`-koder i stället för att gissa.

Se [ARCHITECTURE.md](ARCHITECTURE.md) och
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) för interna detaljer.

---

*Denna dokumentation genererades med Claude (Anthropic) och underhålls av VD171. Rättelser och förbättringar är välkomna - se [CONTRIBUTING.md](CONTRIBUTING.md).*
