> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · Čeština · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../in/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

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
- Dlouhé operace (`backup`, `restore`, `import`) vracejí `{"ok":true,"opid":"..."}`
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
| `backup-info` | `{ref}` | `{ok,...}` úplné detaily jedné zálohy (verze, zdroj instalace, stav, datum, režim, velikost, položky, počty oprávnění, zařízení) |
| `backup-icon` | `{ref}` | `{ok,icon}` base64 PNG z manifestu (funguje, když je aplikace odinstalována) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref musí být pod adresářem záloh) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` ponechá N nejnovějších záloh balíčku |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` auditní log, od nejnovějších |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` celosystémová záloha (oddělené) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (vyžaduje restart; `confirm` to chrání) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | připojí nainstalovanou aplikaci jako systémovou (bezsystémový podmodul; živě přes NoMount, jinak při příštím bootu) |
| `companion-status` / `companion-install` | `{}` | stav společníka Google Drive / instalace na vyžádání |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | správa cílů |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | správa rclone remotů (vytvoří záznam v `rclone.conf`, na který cíl `type:"rclone"` ukazuje) |
| `schedule-set` / `schedule-list` / `schedule-delete` | `{id,package,mode,dest,cron,at,keep,items}` | naplánované úlohy |
| `scheduler-tick` | `{}` | spustí splatné úlohy + aplikuje retenci + pozorovatel automatické zálohy (volá to bootovací heartbeat) |

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
  "ssaid": false                  // OPT-IN, see below
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

### Argumenty `remote-add`

Cloudový cíl je `type:"rclone"` cíl, který pojmenovává `rclone` remote; vytvořte
ten remote nejprve pomocí `remote-add`. Pole s heslem jsou uložena zatemněná, nikdy
v čistém textu. Podporované hodnoty `backend` a jejich `params`:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

Google Drive má dvě cesty: tento `drive` remote (nepotřebuje projekt Google Cloud, používá
vlastní OAuth rclone - spusťte `rclone authorize "drive"` jednou na libovolném počítači a předejte
token) nebo volitelná doprovodná aplikace (vlastní OAuth client id). Oba skončí jako obyčejné
cíle.

### Síťová politika

Konfigurační pole `network_policy` řídí, které připojení smějí cloudové přenosy použít:
`any` (výchozí), `wifi`, nebo `mobile`. Nastavte ji pomocí `config-set`. Když je `wifi` nebo
`mobile`, každý cloudový přenos (Full `rclone`/Drive upload, Mirror sync, vzdálená
`restic` snapshot záloha/obnova, Mirror obnova) nejprve zkontroluje aktivní transport a
přeruší s `ERR_NET_POLICY`, pokud neodpovídá - jak pro manuální, tak pro naplánované úlohy.
Lokální cíle nejsou nikdy omezeny.

## Bezpečnostní zábrany, které váš agent musí respektovat

- **`ssaid` je striktně opt-in (výchozí vypnuto).** Zálohuje / obnovuje
  ANDROID_ID zařízení přepsáním systémového souboru; obnova se uplatní až po restartu, a
  předchozí soubor je vždy nejprve uložen pro rollback. Posílejte `"ssaid": true`
  pouze na přímý, záměrný požadavek uživatele - nikdy ve výchozím stavu.
- **Mutující akce (restore, delete, import) jsou destruktivní** a jsou zalogovány do
  lokální auditní stopy (`logs/audit.jsonl`). Obnova je věrná (wipe-then-extract), takže
  vrátí aplikaci do přesného stavu zálohy. Potvrďte záměr, než je zavoláte.
- **Nikdy neoslabujte** zachování (SELinux/uid/gid/režimy/xattr) ani pravidlo APK (APK
  jsou vždy komprimované, nikdy šifrované, pokud není nastaveno `encrypt_apk`).
- Považujte JSON výstup za zdroj pravdy; kontrolujte `ok`/`code`, dotazujte se na `progress`,
  a vynášejte `ERR_*` kódy místo hádání.

Viz [ARCHITECTURE.md](../ARCHITECTURE.md) a
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) pro vnitřnosti.

---

*Tato dokumentace byla vygenerována pomocí Claude (Anthropic) a je spravována VD171. Opravy a vylepšení jsou vítány - viz [CONTRIBUTING.md](../CONTRIBUTING.md).*
