> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · Čeština · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../in/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Українська](../uk/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# Ovládání VDBackup z AI agenta

VDBackup je navržen tak, aby AI asistent nebo agent mohl spravovat **veškerý** obsah a
akce modulu bezhlavě, stejně jako to člověk dělá přes WebUI. WebUI je jen jedním
klientem malého JSON API; váš agent je dalším. Používejte API,
nescrapujte WebUI.

## Kontrakt

Vše prochází jedním vstupním bodem, spuštěným jako root na zařízení:

```
sh /data/adb/modules/vdbackup/scripts/helper.sh <verb> <base64(JSON-args)>
```

- Argumenty jsou jeden JSON objekt, **zakódovaný v base64**, předaný jako jeden argv token.
- Příkaz vytiskne **jeden JSON objekt** na stdout: `{"ok":true,...}` nebo
  `{"ok":false,"code":"ERR_...","message":"..."}`. Ten parsujte; nikdy nescrapujte text.
- Dlouhé operace (`backup`, `restore`, `import`, `backup-batch`, `restore-batch`, `config-export`, `config-import`) vracejí `{"ok":true,"opid":"..."}`
  okamžitě a běží **oddělené** (přežijí odchod volajícího/WebUI). Dotazujte se
  na jejich průběh; nejsou dokončené, když se volání vrátí.
- `progress` a `cancel` berou **base64 surového řetězce opid**, ne JSON objekt.

Malý pomocník pro váš shell:

```sh
b64() { printf '%s' "$1" | base64 -w0; }
H=/data/adb/modules/vdbackup/scripts/helper.sh
sh "$H" backup "$(b64 '{"package":"com.example.app","mode":"full"}')"
```

Pro ovládání z pracovní stanice spusťte to přes svůj obvyklý root kanál na zařízení
(adb shell jako root, nebo nastavení SSH-to-root). Modul dodává přibalené binárky, takže
po instalaci nepotřebuje **žádný internet** pro lokální zálohu/obnovu; pouze cloudové
cíle (`rclone`/`restic`/ssh) komunikují se sítí.

## Verby

| Verb | Args (JSON) | Vrací |
|------|-------------|---------|
| `ping` | `{}` | `{ok,version,abi}` |
| `overview` | `{user?}` | `{ok:true,apps,instances,path_backups,jobs,backups_size,free,total}` počty (velikosti v bajtech): aplikace se zálohami, celkový počet instancí záloh, samostatné zálohy cest, naplánované úlohy, celková velikost záloh a volné/celkové místo souborového systému záloh. Neoddělená, vrací okamžitě; používaná úvodním přehledem WebUI. |
| `config-get` | `{}` | `{ok,config}` |
| `config-set` | konfigurační objekt (nebo `{key,value}`) | `{ok}` |
| `keygen` | `{}` | generuje `age` klíčový pár pro šifrování |
| `list-apps` | `{user?}` | `{ok,apps:[{package,label,system,versionCode}]}` (dex, shell fallback) |
| `label` | `{package,user?}` | `{ok,label}` (skutečné lokalizované jméno aplikace, bez kontextu) |
| `icon` | `{package,user?,vc?}` | `{ok,package,icon}` (base64 PNG; cachováno per package+`vc`) |
| `backup` | viz níže | `{ok,opid}` (oddělené) |
| `restore` | viz níže | `{ok,opid}` (oddělené) |
| `import` | `{from,ref,password,ssaid,user}` | `{ok,opid}` (oddělené) |
| `import-scan` | `{from,path}` | `{ok,backups:[...]}` |
| `progress` | base64(opid) | živý `progress-<opid>.json` |
| `cancel` | base64(opid) | `{ok,cancelled}` |
| `list-ops` | `{}` | `{ok,ops:[...]}` (znovupřipojení po opětovném připojení) |
| `list-apps`/`icons` | `{user?}` / `{user?,items:[{package,vc}]}` | seznam aplikací / dávkové base64 ikony |
| `list-backups` | `{package?}` | `{ok,backups:[{ref,package,label,versionName,versionCode,created_at,mode,items}]}` |
| `list-users` | `{}` | `{ok,users:[{id,name}]}` uživatelé Androidu v zařízení (více uživatelů). |
| `list-dirs` | `{path}` | `{ok,path,parent,dirs:[...]}` podadresáře cesty (výběr složky). |
| `path-list` | `{user?}` | `{ok,backups:[...]}` samostatné zálohy složky/souboru. |
| `provenance` | `{}` | auditní manifest přibalených binárek (`PROVENANCE.json`). |
| `backup-info` | `{ref}` | `{ok,...}` úplné detaily jedné zálohy (verze, zdroj instalace, stav, datum, režim, velikost, položky, počty oprávnění, zařízení) |
| `backup-icon` | `{ref}` | `{ok,icon}` base64 PNG z manifestu (funguje, když je aplikace odinstalována) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref musí být pod adresářem záloh) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` ponechá N nejnovějších záloh balíčku |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` auditní log, od nejnovějších |
| `log-export` | `{user?}` | `{ok:true,path}` (absolutní cesta k zapsanému souboru `.txt` v adresáři záloh) nebo `{ok:false,code:"ERR_LOG_EXPORT"}`. Zapíše protokol aktivity (`audit.jsonl`) plus krátkou hlavičku sestavení/zařízení do jediného uživatelsky viditelného textového souboru, aby jej bylo možné přiložit k hlášení chyby. Neoddělená, vrací okamžitě. |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth/calendar/wallpaper/dns/system_settings) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` celosystémová záloha (oddělené) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (vyžaduje restart; `confirm` to chrání) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `path-backup` | `{path,compression?,password?}` | `{ok,opid}` zálohuje libovolnou absolutní cestu jako `tar.zst`+`manifest.json` pod `.paths/` (oddělené) |
| `path-restore` | `{ref,confirm:true,password?}` | `{ok,opid}` obnoví zálohu cesty na její původní umístění (`confirm` to chrání; oddělené) |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | připojí nainstalovanou aplikaci jako systémovou (bezsystémový podmodul; živě přes NoMount, jinak při příštím bootu) |
| `companion-status` / `companion-install` | `{}` | stav společníka Google Drive / instalace na vyžádání |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | správa cílů |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | správa rclone remotů (vytvoří záznam v `rclone.conf`, na který cíl `type:"rclone"` ukazuje); `backend` může být libovolný rclone backend, bez whitelistu |
| `remote-authorize` | `{backend}` | `{ok:true,url}` (engine už otevřel prohlížeč telefonu na této URL souhlasu přes Android VIEW intent) nebo `{ok:false,code:"ERR_AUTHORIZE"}`. Spustí `rclone authorize <backend>` na místním callback serveru (`127.0.0.1:53682`) pro OAuth na zařízení. |
| `remote-authorize-poll` | `{}` | `{ok:true,done:false,url}` během čekání, `{ok:true,done:true,token}` jakmile uživatel udělí souhlas (`token` k předání do `remote-add`), nebo `{ok:false,code:"ERR_AUTHORIZE"}`. |
| `remote-authorize-cancel` | `{}` | `{ok:true,cancelled:true}`; zastaví probíhající autorizaci. |
| `cloud-status` | `{}` | `{ok,rclone,restic,fetchable,size}` (zda jsou binárky `rclone`/`restic` přítomny, zda je tato edice `lite` umí stáhnout, velikost stažení v bytech) |
| `cloud-fetch` | `{}` | `{ok,opid}` (oddělené) stáhne+ověří+nainstaluje `rclone`/`restic` doplněk v edici `lite` |
| `schedule-set` / `schedule-list` / `schedule-delete` | viz níže | naplánované úlohy (záloha nebo obnova; cílí na jednu aplikaci, sadu nebo všechny aplikace) |
| `scheduler-tick` | `{}` | spustí splatné úlohy + aplikuje retenci + pozorovatel automatické zálohy (volá to bootovací heartbeat) |
| `update-check` | `{}` | `{ok,current_version,current_code,latest_version,latest_code,update_available,zipUrl,changelog,notes}` (neoddělené; vrací se okamžitě; `ERR_UPDATE_CHECK` při selhání, viz níže) |
| `backup-batch` | `{packages:[...], ...backup args}` | `{ok,opid}` (detached) zálohuje mnoho aplikací v jedné oddělené operaci; průběh nese `n`/`of`. Selhání jedné aplikace dávku nezastaví. |
| `restore-batch` | `{refs:[...], ...restore args}` | `{ok,opid}` (detached) obnoví mnoho záloh v jedné oddělené operaci; průběh nese `n`/`of`. Selhání jedné aplikace dávku nezastaví. |
| `list-volumes` | `{}` | `{ok,volumes:[{path,removable,id?}]}` svazky úložiště pro výběr složky: vnitřní plus vyměnitelná SD karta / USB. |
| `config-export` | `{password}` | `{ok,opid}` (detached) exportuje konfiguraci, úlohy, cíle, přihlašovací údaje a klíče do jednoho souboru šifrovaného heslovou frází ve složce záloh. |
| `config-import` | `{ref,password}` | `{ok,opid}` (detached) sloučí exportovaný konfigurační soubor zpět do tohoto zařízení (nikdy slepě nepřepisuje). |
| `config-exports` | `{}` | `{ok,exports:[{ref,name,size}]}` vypíše šifrované konfigurační soubory dostupné k importu. |
| `wipe-credentials` | `{}` | `{ok,wiped}` odstraní uložená vzdálená hesla a šifrovací klíč zařízení; cíle, úlohy a zálohy zůstávají. |
| `log-prune` | `{}` | `{ok}` prořeže dávno dokončené protokoly operací, omezí auditní stopu a odstraní zastaralé ikony (volá to spouštěcí služba). |

### Pole `progress`

Dotazování `progress` vrací aktuální `progress-<opid>.json` operace. Tato pole jsou
**vždy přítomná**:

| Pole | Typ | Význam |
|------|-----|--------|
| `opid` | string | id operace |
| `percent` | int | dokončení 0-100 |
| `phase` | string | popisek aktuální fáze |
| `item` | string | typ aktuálně zpracovávané položky |
| `done` | bool | true při koncovém zápisu (finish / dry-run / restore-test) |

Běžící operace může nést také tato **volitelná** aktuální pole. Jsou nepřítomná nebo prázdná,
když nejsou známa, a jsou **vynechána u koncových zápisů** (finish / dry-run / restore-test):

| Pole | Typ | Význam |
|------|-----|--------|
| `rate` | string | rychlost přenosu, např. `"4.2 MiB/s"` (prázdné = neznámé) |
| `eta` | string | odhadovaný zbývající čas, např. `"1m12s"` (prázdné = neznámé) |
| `n` | int | index aktuální položky (0 = neznámé) |
| `of` | int | celkový počet položek (0 = neznámé) |
| `cur` | string | název aktuální položky (prázdné = žádná) |

Cloudové přenosy plní `rate`/`eta` (percent pochází z rclone); lokální zálohy Full plní
`n`/`of`/`cur`. Popisky fází zahrnují fázi zapečetění kontrolního součtu **`verified`** a,
u cloudových přenosů, **`transfer`** a **`mirror <item>`**.

### Argumenty `backup`

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

`restore`/`import` berou `{ref}` (adresář zálohy / scan ref). `restore` také přijímá:
`"items"` (podmnožinu typů položek zálohy k obnově; vynechte pro všechny), `"test": true`
(rozbalí do dočasného adresáře a ověří, bez dotknutí se živé aplikace), `"mode"` pro
snapshot/mirror, `"password"` pro šifrovanou zálohu, `"ssaid"` (opt-in), a volby zdroje
instalace `"spoof_installer"` (výchozí z config, nastaví instalátor na Play Store v době
instalace) a `"deep_spoof": true` (pokročilý opt-in; také zfalšuje iniciující balíček a
zdroj balíčku úpravou databáze balíčků, projeví se po restartu). `import` bere
`"from": "neo" | "databackup"` a, pro šifrovanou Neo zálohu, `"password"`.

### Argumenty `schedule-set`

Naplánovaná úloha volí **jeden** cíl a jednu **akci**:

```json
{
  "id": "nightly-games",
  "action": "backup",             // "backup" (výchozí) | "restore"
  "package": "com.example.app",   // jedna aplikace   (NEBO)
  "packages": ["com.a","com.b"],  // sada aplikací   (NEBO)
  "all": true,                    // všechny aplikace, bez seznamu vyloučených aplikací
  "cron": "daily",                // hourly | daily | weekly
  "at": "02:30",                  // HH:MM
  "mode": "full",
  "dest": "local",
  "keep": 5,
  "items": ["apk","data"],
  "require_wifi": false,          // brána: spouštět jen na Wi-Fi
  "require_charging": false,      // brána: spouštět jen během nabíjení
  "min_battery": 0,               // brána: spouštět jen při baterii >= toto % (0-100)
  "days": [1,2,3,4,5]             // brána: spouštět jen v tyto dny v týdnu (0=neděle)
}
```

Jako cíl zadejte přesně **jeden** z `package`, `packages` nebo `all`. Úloha `backup` si
ponechává obvyklé `mode`/`dest`/`keep`/`items`. Úloha `restore` (`action: "restore"`) obnoví
**nejnovější** zálohu každé cílové aplikace (nebo explicitní `ref`) a **přepíše aktuální data
aplikace při každém běhu**: je záměrná a volitelná, takže ji nastavte jen na přímou žádost
uživatele.

### Brány plánovače

Naplánovaná úloha může nést **volitelné podmínky bran**. Když brána splatné úlohy není
splněna, úloha se **přeskočí a zopakuje při dalším ticku, aniž by se posunul její rozvrh**
(její `last_run` se neorazítkuje, takže se spustí, jakmile je podmínka splněna):

| Pole | Typ | Brána |
|------|-----|-------|
| `require_wifi` | bool | spouštět jen při připojení k Wi-Fi |
| `require_charging` | bool | spouštět jen během nabíjení |
| `min_battery` | int (0-100) | spouštět jen při baterii na této úrovni nebo vyšší |
| `days` | array of int (0-6, 0=neděle) | spouštět jen v tyto dny v týdnu |

Nad rámec toho se vždy uplatní minimální kontrola **tepelné bezpečnosti**: naplánovaná operace
se přeskočí, dokud je zařízení kriticky horké. Každé přeskočení kvůli bráně se zapíše do
auditní stopy jako `op:"scheduler-gated"` s `reason` rovným `wifi` / `charging` / `battery` /
`days` / `thermal`.

### Argumenty `remote-add`

Cloudový cíl je `type:"rclone"` cíl, který pojmenovává `rclone` remote; vytvořte
ten remote nejprve pomocí `remote-add`. `backend` může být **libovolný rclone backend** -
žádný whitelist neexistuje. `remote-add` přijme libovolný název backendu (`dropbox`,
`onedrive`, `box`, `pcloud`, `mega`, `b2`, `s3`, `sftp`, `smb`, `webdav`, `ftp`, `drive`
a ~70 dalších, které rclone podporuje) a `params` se předávají přímo do konfigurace
`rclone` jako dvojice `key=value`. Pole s heslem jsou uložena zatemněná, nikdy v čistém
textu. Běžné backendy a jejich `params`:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

**OAuth na zařízení (bez PC).** Backendy, které vyžadují přihlášení přes prohlížeč
(Google Drive, Dropbox, OneDrive, Box, pCloud), nepotřebují desktop ani ručně vložený
token. Zavolejte `remote-authorize` s `{backend}`: engine spustí `rclone authorize <backend>`
proti místnímu callback serveru (`127.0.0.1:53682`) a otevře prohlížeč samotného telefonu
na stránce souhlasu poskytovatele přes Android VIEW intent, přičemž vrátí `{ok:true,url}`
(nebo `{ok:false,code:"ERR_AUTHORIZE"}`). Dotazujte `remote-authorize-poll` (`{}`): vrací
`{ok:true,done:false,url}` během čekání a `{ok:true,done:true,token}` jakmile uživatel
potvrdí, tento `token` předejte do `remote-add`. `remote-authorize-cancel` (`{}`) zastaví
probíhající autorizaci (`{ok:true,cancelled:true}`). Ruční vložení výstupu
`rclone authorize "<backend>"` z libovolného počítače je stále podporováno jako záložní řešení.

Google Drive má dvě cesty: tento `drive` remote (nepotřebuje projekt Google Cloud, používá
vlastní OAuth rclone, autorizujte na zařízení pomocí `remote-authorize`, nebo spusťte
`rclone authorize "drive"` jednou na libovolném počítači a předejte token) nebo volitelná
doprovodná aplikace (vlastní OAuth client id). Oba skončí jako obyčejné cíle.

### Síťová politika

Konfigurační pole `network_policy` řídí, které připojení smějí cloudové přenosy použít:
`any` (výchozí), `wifi`, nebo `mobile`. Nastavte ji pomocí `config-set`. Když je `wifi` nebo
`mobile`, každý cloudový přenos (Full `rclone`/Drive upload, Mirror sync, vzdálená
`restic` snapshot záloha/obnova, Mirror obnova) nejprve zkontroluje aktivní transport a
přeruší s `ERR_NET_POLICY`, pokud neodpovídá, jak pro manuální, tak pro naplánované úlohy.
Lokální cíle nejsou nikdy omezeny.

### Cloudová integrita a kvóta

- **Zapečetění kontrolním součtem (cloud).** Po úspěšném cloudovém kopírování engine provede
  vzdálenou kontrolu kontrolního součtu (`rclone check`); neshoda ukončí operaci s `ERR_VERIFY`.
  Backendy, které nesdílejí žádný společný hash s lokální stranou, se přeskočí (není to selhání).
- **Kontrola kvóty (cloud, režim Full).** Před nahráváním v režimu Full na remote `rclone`
  engine dotáže volné místo remotu (`rclone about --json`) a odmítne s `ERR_QUOTA`, pokud by se
  záloha nevešla. Remoty, které nehlásí informace o kvótě, se přeskočí. Režim Mirror je delta
  synchronizace a je výjimkou.

### Cloudové binárky (edice `lite`)

Edice `full` má všechny binárky přibalené a nikdy nepotřebuje síť. Edice `lite` vynechává dvě
největší, `rclone` a `restic`, a stáhne je na vyžádání při prvním spuštění cloudové nebo
snapshot akce. `cloud-status` hlásí, zda už jsou přítomny, zda je tato edice umí stáhnout, a
velikost stažení v bytech. `cloud-fetch` běží **odděleně** (dotazujte se na `progress` s jeho
`opid`): stáhne doplněk `rclone`+`restic` pro danou architekturu, ověří jej proti SHA-256
zapečenému v modulu, a nainstaluje jej do runtime cache. Jeho fáze průběhu jsou `downloading`,
`verifying` a `installing`; finální kód je `ERR_NONE` při úspěchu, nebo `ERR_FETCH` (stažení
selhalo) / `ERR_FETCH_VERIFY` (nesouhlasí kontrolní součet, zahozeno) při selhání. V edici
`full` je zbytečný. `backup`/`restore` na cloudový nebo snapshot cíl v edici `lite`, dříve než
jsou binárky přítomny, selže s `ERR_CLOUD_FETCHABLE`; klient by měl nabídnout spuštění
`cloud-fetch` a poté opakovat.

### Kategorie speciálních záloh

`special-categories` hlásí, které celosystémové kategorie zařízení má; `special-backup`
zachytí ty, které předáte v `categories`, a `special-restore` je znovu aplikuje. Kategorie
jsou:

| Kategorie | Co to je | Sémantika obnovy |
|----------|-----------|-------------------|
| `messages` | SMS/MMS | nahrazení provideru (vymazání + extrakce) |
| `contacts` | kontakty a seznam hovorů | nahrazení provideru (vymazání + extrakce) |
| `wifi` | uložené Wi-Fi sítě | nahrazení provideru (vymazání + extrakce) |
| `bluetooth` | Bluetooth párování | nahrazení provideru (vymazání + extrakce) |
| `calendar` | provider kalendáře (`com.android.providers.calendar`, aplikace + data); také přenositelně exportováno do `calendar.json` | nahrazení provideru (vymazání + extrakce) |
| `wallpaper` | tapeta domovské a zamykací obrazovky plus `wallpaper_info.xml`, uložená surová (binární) | soubory nahrazeny |
| `dns` | režim a specifikátor privátního DNS, načtený z nastavení | idempotentní `settings put` |
| `system_settings` | úplný dump system/global/secure nastavení | **opt-in**, idempotentní `settings put`, přepíše nastavení zařízení |

**`system_settings` je striktně opt-in a při obnově destruktivní.** Stejně jako `ssaid`
přepisuje při obnově celosystémová nastavení, takže je chráněn za výslovným souhlasem uživatele a
zapsán do auditní stopy. Nikdy jej nevybírejte ve výchozím stavu; pouze na přímou, záměrnou žádost
uživatele.

### Samostatná záloha cesty

`path-backup` / `path-restore` zálohují a obnovují **libovolnou absolutní cestu**: složku nebo
jeden soubor, na sdíleném úložišti nebo pod `/data`, mimo per-aplikační model. Archiv je zapsán
jako `tar.zst` plus `manifest.json` ve vlastním formátu VDBackup (zapečetěný SHA-256, s RECOVERY
sadou při šifrování) pod `.paths/` v adresáři záloh.

```json
// path-backup
{ "path": "/sdcard/DCIM/Camera", "compression": "zstd:10", "password": "..." }
// path-restore
{ "ref": "<.paths ref>", "confirm": true, "password": "..." }
```

- Zdrojová cesta musí být **absolutní** a pod jedním z povolených rootů:
  `/storage/emulated`, `/data/media`, `/sdcard`, `/data`. Cesta, která neexistuje, selže s
  `ERR_NO_PATH`; cesta mimo povolené rooty nebo cesta obsahující `..` selže s `ERR_BAD_PATH`.
- `path-restore` zapisuje zpět na původní umístění, je tedy destruktivní a vyžaduje
  `"confirm": true`, silně frikční zábrana, jako `special-restore`. `ref`, který není platná
  záloha cesty, selže s `ERR_BAD_REF`.
- Oba běží **oddělené**; dotazujte se na `progress` s vráceným `opid`.

### `update-check`

`update-check` hlásí, zda byla zveřejněna novější verze modulu, aby ji agent (nebo WebUI) mohl
zobrazit. Je to **čtecí sloveso, které se vrací okamžitě**: **není** oddělené, takže není žádné
`opid` k dotazování. Spouští se pouze výslovnou akcí uživatele a stahuje zveřejněný manifest
aktualizace modulu (URL `updateJson` z `module.prop`) pomocí přibaleného `curl` přes HTTP požadavek
na straně root, to běží mimo WebView, a nepodléhá tedy CSP WebUI, a porovnává zveřejněný
`versionCode` s nainstalovaným. Nepřijímá **žádné argumenty**.

Při úspěchu vrací:

| Pole | Typ | Význam |
|------|-----|--------|
| `ok` | bool | `true` |
| `current_version` | string | nainstalovaný versionName |
| `current_code` | int | nainstalovaný versionCode |
| `latest_version` | string | zveřejněný versionName |
| `latest_code` | int | zveřejněný versionCode |
| `update_available` | bool | `true`, když je `latest_code` větší než `current_code` |
| `zipUrl` | string | URL zveřejněného zipu |
| `changelog` | string | URL zveřejněného changelogu |
| `notes` | string | poznámky k vydání |

Pokud neexistuje URL `updateJson`, síťový požadavek selže, nebo manifest nelze naparsovat, vrací
`{"ok":false,"code":"ERR_UPDATE_CHECK"}`.

`update-check` pouze **hlásí** dostupnost a poznámky k vydání; samotnou aktualizaci provádí váš
root manažer (KernelSU / APatch / Magisk) přes `updateJson` modulu, nikdy toto sloveso.

## Bezpečnostní zábrany, které váš agent musí respektovat

- **`ssaid` je striktně opt-in (výchozí vypnuto).** Zálohuje / obnovuje
  ANDROID_ID zařízení přepsáním systémového souboru; obnova se uplatní až po restartu, a
  předchozí soubor je vždy nejprve uložen pro rollback. Posílejte `"ssaid": true`
  pouze na přímý, záměrný požadavek uživatele, nikdy ve výchozím stavu.
- **Mutující akce (restore, delete, import) jsou destruktivní** a jsou zalogovány do
  lokální auditní stopy (`logs/audit.jsonl`). Obnova je věrná (wipe-then-extract), takže
  vrátí aplikaci do přesného stavu zálohy. Potvrďte záměr, než je zavoláte.
- **`system_settings` je opt-in a destruktivní, přesně jako `ssaid`.** Jeho obnova
  přepíše celosystémová nastavení, takže jej posílejte jen na přímou žádost uživatele; je chráněn
  výslovným souhlasem a zaznamenán do auditní stopy.
- **Obnova je idempotentní.** Surové obnovy provideru (messages/contacts/wifi/bluetooth/calendar)
  data **nahrazují** místo slučování, data provideru jsou vymazána a archiv je přes ně extrahován -
  takže opakovaná obnova téže zálohy nemůže duplikovat řádky. `dns` a `system_settings` jsou znovu
  aplikovány idempotentním `settings put`.
- **Extrakce archivu je chráněna proti path traversal.** Obnova běží jako root, takže každý archiv
  (restore, import, special-restore, path-restore) je před jakýmkoli zápisem zkontrolován: archiv,
  jehož členové používají absolutní cesty nebo obsahují `..`, je předem odmítnut s `ERR_UNSAFE_ARCHIVE`,
  dříve než dojde k jedinému destruktivnímu zápisu (GNU tar navíc běží s `--no-absolute-names`).
  Manipulovaný archiv nikdy nemůže uniknout ze svého cílového adresáře.
- **Nikdy neoslabujte** zachování (SELinux/uid/gid/režimy/xattr) ani pravidlo APK (APK
  jsou vždy komprimované, nikdy šifrované, pokud není nastaveno `encrypt_apk`).
- Považujte JSON výstup za zdroj pravdy; kontrolujte `ok`/`code`, dotazujte se na `progress`,
  a vynášejte `ERR_*` kódy místo hádání.

Viz [ARCHITECTURE.md](ARCHITECTURE.md) a
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) pro vnitřnosti.

<!-- doc-footer -->

---

> _Tato dokumentace byla vytvořena pomocí Claude (Anthropic) a spravuje ji VD171. Opravy a vylepšení jsou vítány; viz [CONTRIBUTING.md](CONTRIBUTING.md)._
