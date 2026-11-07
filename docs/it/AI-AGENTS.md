> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../in/AI-AGENTS.md) · Italiano · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# Pilotare VDBackup da un agente IA

VDBackup è costruito in modo che un assistente o un agente IA possa amministrare **ogni** contenuto e
azione del modulo senza interfaccia, allo stesso modo in cui una persona lo fa tramite la WebUI. La
WebUI è solo uno dei client di una piccola API JSON ; il tuo agente ne è un altro. Usa l'API,
non raschiare la WebUI.

## Il contratto

Tutto passa attraverso un unico punto di ingresso, eseguito come root sul dispositivo :

```
sh /data/adb/modules/vdbackup/scripts/helper.sh <verb> <base64(JSON-args)>
```

- Gli argomenti sono un singolo oggetto JSON, **codificato in base64**, passato come un unico token argv.
- Il comando stampa **un solo oggetto JSON** su stdout : `{"ok":true,...}` o
  `{"ok":false,"code":"ERR_...","message":"..."}`. Analizzalo ; non raschiare mai il testo.
- Le operazioni lunghe (`backup`, `restore`, `import`) restituiscono `{"ok":true,"opid":"..."}`
  immediatamente e vengono eseguite **staccate** (sopravvivono alla scomparsa del chiamante/della WebUI).
  Interroga il loro avanzamento ; non sono terminate quando la chiamata ritorna.
- `progress` e `cancel` prendono il **base64 della stringa opid grezza**, non un oggetto JSON.

Un piccolo helper per la tua shell :

```sh
b64() { printf '%s' "$1" | base64 -w0; }
H=/data/adb/modules/vdbackup/scripts/helper.sh
sh "$H" backup "$(b64 '{"package":"com.example.app","mode":"full"}')"
```

Per pilotarlo da una workstation, esegui quel comando tramite il tuo canale root abituale verso il dispositivo
(adb shell come root, o una configurazione SSH-verso-root). Il modulo include binari impacchettati, quindi
una volta installato non necessita di **alcun accesso a internet** per il backup/ripristino locale ; solo le
destinazioni cloud (`rclone`/`restic`/ssh) comunicano con la rete.

## Verbi

| Verbo | Args (JSON) | Restituisce |
|------|-------------|---------|
| `ping` | `{}` | `{ok,version,abi}` |
| `overview` | `{user?}` | `{ok:true,apps,instances,path_backups,jobs,backups_size,free,total}` conteggi (dimensioni in byte) : app con backup, totale delle istanze di backup, backup di percorso autonomi, lavori pianificati, dimensione totale dei backup, e lo spazio libero/totale del filesystem dei backup. Non staccata, ritorna immediatamente ; usata dalla panoramica iniziale della WebUI. |
| `config-get` | `{}` | `{ok,config}` |
| `config-set` | l'oggetto di configurazione (o `{key,value}`) | `{ok}` |
| `keygen` | `{}` | genera la coppia di chiavi `age` per la cifratura |
| `list-apps` | `{user?}` | `{ok,apps:[{package,label,system,versionCode}]}` (dex, ripiego shell) |
| `label` | `{package,user?}` | `{ok,label}` (vero nome localizzato dell'app, senza contesto) |
| `icon` | `{package,user?,vc?}` | `{ok,package,icon}` (PNG base64 ; in cache per package+`vc`) |
| `backup` | vedi sotto | `{ok,opid}` (staccato) |
| `restore` | vedi sotto | `{ok,opid}` (staccato) |
| `import` | `{from,ref,password,ssaid,user}` | `{ok,opid}` (staccato) |
| `import-scan` | `{from,path}` | `{ok,backups:[...]}` |
| `progress` | base64(opid) | il `progress-<opid>.json` in tempo reale |
| `cancel` | base64(opid) | `{ok,cancelled}` |
| `list-ops` | `{}` | `{ok,ops:[...]}` (si riaggancia dopo la riconnessione) |
| `list-apps`/`icons` | `{user?}` / `{user?,items:[{package,vc}]}` | elenco app / icone base64 in batch |
| `list-backups` | `{package?}` | `{ok,backups:[{ref,package,label,versionName,versionCode,created_at,mode,items}]}` |
| `backup-info` | `{ref}` | `{ok,...}` tutti i dettagli di un backup (versione, origine di installazione, stato, data, modalità, dimensione, items, conteggi di permessi, dispositivo) |
| `backup-icon` | `{ref}` | `{ok,icon}` PNG base64 dal manifest (funziona quando l'app è disinstallata) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref deve essere sotto la directory dei backup) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` mantiene gli N più recenti di un package |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` log di audit, dal più recente |
| `log-export` | `{user?}` | `{ok:true,path}` (percorso assoluto di un `.txt` scritto sotto la directory dei backup) o `{ok:false,code:"ERR_LOG_EXPORT"}`. Scrive il log delle attività (`audit.jsonl`) più una breve intestazione build/dispositivo in un singolo file di testo visibile all'utente così da poterlo allegare a una segnalazione di bug. Non staccata, ritorna immediatamente. |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth/calendar/wallpaper/dns/system_settings) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` backup a livello di sistema (staccato) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (richiede riavvio ; `confirm` lo abilita) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `path-backup` | `{path,compression?,password?}` | `{ok,opid}` esegue il backup di qualsiasi percorso assoluto come `tar.zst`+`manifest.json` sotto `.paths/` (staccato) |
| `path-restore` | `{ref,confirm:true,password?}` | `{ok,opid}` ripristina un backup di percorso nella sua posizione originale (`confirm` lo abilita; staccato) |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | monta un'app installata come app di sistema (sottomodulo systemless ; a caldo tramite NoMount altrimenti al boot successivo) |
| `companion-status` / `companion-install` | `{}` | stato del companion Google Drive / installazione su richiesta |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | gestione delle destinazioni |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | gestione dei remote rclone (crea la voce `rclone.conf` a cui punta una destinazione `type:"rclone"`); il `backend` può essere qualsiasi backend rclone, nessuna whitelist |
| `remote-authorize` | `{backend}` | `{ok:true,url}` (il motore ha già aperto il browser del telefono su quella URL di consenso tramite un intent VIEW di Android) oppure `{ok:false,code:"ERR_AUTHORIZE"}`. Esegue `rclone authorize <backend>` su un server di callback locale (`127.0.0.1:53682`) per l'OAuth sul dispositivo. |
| `remote-authorize-poll` | `{}` | `{ok:true,done:false,url}` durante l'attesa, `{ok:true,done:true,token}` una volta che l'utente ha dato il consenso (il `token` da passare a `remote-add`), oppure `{ok:false,code:"ERR_AUTHORIZE"}`. |
| `remote-authorize-cancel` | `{}` | `{ok:true,cancelled:true}`; interrompe un'autorizzazione in sospeso. |
| `cloud-status` | `{}` | `{ok,rclone,restic,fetchable,size}` (se i binari `rclone`/`restic` sono presenti, se questa edizione `lite` può scaricarli, dimensione del download in byte) |
| `cloud-fetch` | `{}` | `{ok,opid}` (staccato) scarica+verifica+installa l'addon `rclone`/`restic` su un'edizione `lite` |
| `schedule-set` / `schedule-list` / `schedule-delete` | vedi sotto | lavori pianificati (un backup o un ripristino ; con bersaglio una singola app, un insieme, o tutte le app) |
| `scheduler-tick` | `{}` | esegue i lavori dovuti + applica la ritenzione + l'osservatore di backup automatico (il battito all'avvio chiama questo) |
| `update-check` | `{}` | `{ok,current_version,current_code,latest_version,latest_code,update_available,zipUrl,changelog,notes}` (non distaccato; ritorna subito; `ERR_UPDATE_CHECK` in caso di errore - vedi sotto) |

### Campi di `progress`

Interrogare `progress` restituisce il `progress-<opid>.json` in tempo reale dell'operazione. Questi
campi sono **sempre presenti** :

| Campo | Tipo | Significato |
|-------|------|-------------|
| `opid` | string | l'id dell'operazione |
| `percent` | int | avanzamento da 0 a 100 |
| `phase` | string | l'etichetta della fase corrente |
| `item` | string | il tipo di item attualmente in elaborazione |
| `done` | bool | true in una scrittura terminale (finish / dry-run / restore-test) |

Un'operazione in corso può anche portare questi campi in tempo reale **opzionali**. Sono assenti o
vuoti quando sconosciuti, e vengono **omessi nelle scritture terminali** (finish / dry-run /
restore-test) :

| Campo | Tipo | Significato |
|-------|------|-------------|
| `rate` | string | velocità di trasferimento, es. `"4.2 MiB/s"` (vuoto = sconosciuto) |
| `eta` | string | tempo rimanente stimato, es. `"1m12s"` (vuoto = sconosciuto) |
| `n` | int | indice dell'item corrente (0 = sconosciuto) |
| `of` | int | numero totale di item (0 = sconosciuto) |
| `cur` | string | nome dell'item corrente (vuoto = nessuno) |

I trasferimenti cloud riempiono `rate`/`eta` (il percent viene da rclone) ; i backup Full locali
riempiono `n`/`of`/`cur`. Le etichette di fase includono la fase di sigillo checksum **`verified`**
e, per i trasferimenti cloud, **`transfer`** e **`mirror <item>`**.

### Args di `backup`

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
  "verify": true,                 // ri-calcola l'hash di ogni archivio vs il manifesto (attivo per default per Full)
  "dry_run": false,               // true = riporta un piano di dimensioni, non scrive nulla
  "ssaid": false                  // OPT-IN, vedi sotto
}
```

`restore`/`import` prendono `{ref}` (una directory di backup / ref di scansione). `restore` accetta anche :
`"items"` (un sottoinsieme dei tipi di item del backup da ripristinare ; omettilo per tutti), `"test": true`
(estrarre in una directory temporanea e verificare, senza toccare l'app in uso), `"mode"` per
snapshot/mirror, `"password"` per un backup cifrato, `"ssaid"` (opt-in), e le opzioni di
origine di installazione `"spoof_installer"` (predefinito dalla config, imposta l'installer sul
Play Store al momento dell'installazione) e `"deep_spoof": true` (opt-in avanzato ; forgia anche il
pacchetto e l'origine iniziatori modificando il database dei pacchetti, si applica dopo un riavvio).
`import` prende `"from": "neo" | "databackup"` e, per un backup Neo cifrato, `"password"`.

### Args di `schedule-set`

Un lavoro pianificato sceglie **un** bersaglio e un'**action** :

```json
{
  "id": "nightly-games",
  "action": "backup",             // "backup" (predefinita) | "restore"
  "package": "com.example.app",   // una app   - OPPURE -
  "packages": ["com.a","com.b"],  // un insieme di app   - OPPURE -
  "all": true,                    // tutte le app, meno la lista delle app escluse
  "cron": "daily",                // hourly | daily | weekly
  "at": "02:30",                  // HH:MM
  "mode": "full",
  "dest": "local",
  "keep": 5,
  "items": ["apk","data"],
  "require_wifi": false,          // gate: esegue solo in Wi-Fi
  "require_charging": false,      // gate: esegue solo mentre è in carica
  "min_battery": 0,               // gate: esegue solo con batteria >= questo % (0-100)
  "days": [1,2,3,4,5]             // gate: esegue solo in questi giorni (0=domenica)
}
```

Fornisci esattamente **uno** tra `package`, `packages` o `all` per il bersaglio. Un lavoro `backup` mantiene i
soliti `mode`/`dest`/`keep`/`items`. Un lavoro `restore` (`action: "restore"`) ripristina il backup **più
recente** di ogni app bersaglio (o una `ref` esplicita) e **sovrascrive i dati attuali dell'app a ogni
esecuzione** - è deliberato e opt-in, quindi impostalo solo su richiesta diretta dell'utente.

### Gating dello scheduler

Un lavoro pianificato può portare **condizioni di gate opzionali**. Quando il gate di un lavoro
dovuto non è soddisfatto, viene **saltato e riprovato al tick successivo, senza far avanzare la sua
pianificazione** (il suo `last_run` non viene marcato, quindi scatta non appena la condizione è
soddisfatta) :

| Campo | Tipo | Gate |
|-------|------|------|
| `require_wifi` | bool | esegue solo mentre è in Wi-Fi |
| `require_charging` | bool | esegue solo mentre è in carica |
| `min_battery` | int (0-100) | esegue solo con la batteria a questo livello o superiore |
| `days` | array di int (0-6, 0=domenica) | esegue solo in questi giorni della settimana |

Un controllo minimo di **sicurezza termica** è sempre applicato oltre a questi : una op pianificata
viene saltata mentre il dispositivo è criticamente caldo. Ogni salto di gate viene scritto nella
traccia di audit come `op:"scheduler-gated"` con un `reason` tra `wifi` / `charging` / `battery` /
`days` / `thermal`.

### Args di `remote-add`

Una destinazione cloud è una destinazione `type:"rclone"` che nomina un remote `rclone`; crea
prima quel remote con `remote-add`. Il `backend` può essere **qualsiasi backend rclone** - non
c'è nessuna whitelist. `remote-add` accetta qualsiasi nome di backend (`dropbox`, `onedrive`,
`box`, `pcloud`, `mega`, `b2`, `s3`, `sftp`, `smb`, `webdav`, `ftp`, `drive` e gli altri ~70
supportati da rclone), e i `params` vengono passati direttamente alla configurazione di `rclone`
come coppie `key=value`. I campi di password sono memorizzati offuscati, mai in chiaro. Backend
comuni e i loro `params`:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output di `rclone authorize "drive"`)
```

**OAuth sul dispositivo (nessun PC).** I backend che richiedono un accesso dal browser (Google
Drive, Dropbox, OneDrive, Box, pCloud) non richiedono un desktop né un token incollato a mano.
Chiama `remote-authorize` con `{backend}`: il motore esegue `rclone authorize <backend>` su un
server di callback locale (`127.0.0.1:53682`) e apre il browser del telefono sulla pagina di
consenso del provider tramite un intent VIEW di Android, restituendo `{ok:true,url}` (oppure
`{ok:false,code:"ERR_AUTHORIZE"}`). Interroga `remote-authorize-poll` (`{}`): restituisce
`{ok:true,done:false,url}` durante l'attesa e `{ok:true,done:true,token}` una volta che l'utente
approva - passa quel `token` a `remote-add`. `remote-authorize-cancel` (`{}`) interrompe
un'autorizzazione in sospeso (`{ok:true,cancelled:true}`). Incollare a mano l'output di
`rclone authorize "<backend>"` da qualsiasi computer è ancora supportato come fallback.

Google Drive ha due vie: questo remote `drive` (nessun progetto Google Cloud necessario, usa
l'OAuth proprio di rclone - autorizza sul dispositivo con `remote-authorize`, oppure esegui
`rclone authorize "drive"` una volta su qualsiasi computer e passa il token) o l'app compagna
opzionale (il tuo id client OAuth). Entrambe finiscono come destinazioni ordinarie.

### Politica di rete

Il campo di configurazione `network_policy` controlla quale connessione i trasferimenti cloud possono usare :
`any` (predefinito), `wifi`, o `mobile`. Impostalo con `config-set`. Quando è `wifi` o
`mobile`, ogni trasferimento cloud (caricamento Full `rclone`/Drive, sincronizzazione Mirror, backup/ripristino di
snapshot `restic` remoto, ripristino Mirror) verifica prima il trasporto attivo e
si interrompe con `ERR_NET_POLICY` se non corrisponde - sia per i lavori manuali che pianificati.
Le destinazioni locali non sono mai soggette a questo controllo.

### Integrità e quota cloud

- **Sigillo checksum (cloud).** Dopo una copia cloud riuscita, l'engine esegue un controllo di
  checksum remoto (`rclone check`) ; una discordanza fa fallire la op con `ERR_VERIFY`. I backend
  che non condividono alcun hash in comune con il lato locale vengono saltati (non è un errore).
- **Controllo di quota (cloud, modalità Full).** Prima di un caricamento in modalità Full verso un
  remote `rclone`, l'engine interroga lo spazio libero del remote (`rclone about --json`) e rifiuta
  con `ERR_QUOTA` se il backup non ci sta. I remote che non riportano informazioni di quota vengono
  saltati. La modalità Mirror è un delta sync ed è esente.

### Binari cloud (edizione `lite`)

Un'edizione `full` include tutti i binari e non ha mai bisogno della rete. L'edizione `lite`
omette i due più grandi, `rclone` e `restic`, e li scarica su richiesta la prima volta che esegui
un'azione cloud o snapshot. `cloud-status` riporta se sono già presenti, se questa edizione può
scaricarli, e la dimensione del download in byte. `cloud-fetch` gira **staccato** (interroga
`progress` con il suo `opid`): scarica l'addon `rclone`+`restic` specifico per architettura, lo
verifica rispetto allo SHA-256 impresso nel modulo, e lo installa nella cache di runtime. Le sue
fasi di progresso sono `downloading`, `verifying` e `installing`; il codice finale è `ERR_NONE` in
caso di successo, oppure `ERR_FETCH` (download fallito) / `ERR_FETCH_VERIFY` (checksum non
corrispondente, scartato) in caso di errore. Su un'edizione `full` è superfluo. Un
`backup`/`restore` verso una destinazione cloud o snapshot sull'edizione `lite`, prima che i
binari siano presenti, fallisce con `ERR_CLOUD_FETCHABLE`; il client dovrebbe proporre di eseguire
`cloud-fetch`, poi riprovare.

### Categorie di backup speciale

`special-categories` riporta quali categorie a livello di sistema un dispositivo possiede ;
`special-backup` cattura quelle che passi in `categories` e `special-restore` le riapplica. Le
categorie sono :

| Categoria | Cos'è | Semantica di ripristino |
|----------|-----------|-------------------|
| `messages` | SMS/MMS | sostituzione del provider (cancella + estrai) |
| `contacts` | contatti e registro chiamate | sostituzione del provider (cancella + estrai) |
| `wifi` | reti Wi-Fi salvate | sostituzione del provider (cancella + estrai) |
| `bluetooth` | abbinamenti Bluetooth | sostituzione del provider (cancella + estrai) |
| `calendar` | il provider del calendario (`com.android.providers.calendar`, app + dati) ; esportato anche in modo portabile in `calendar.json` | sostituzione del provider (cancella + estrai) |
| `wallpaper` | sfondo della home e di blocco più `wallpaper_info.xml`, memorizzati grezzi (binario) | file sostituiti |
| `dns` | la modalità DNS privata e il suo specificatore, letti dalle impostazioni | `settings put` idempotente |
| `system_settings` | il dump completo delle impostazioni system/global/secure | **opt-in**, `settings put` idempotente, sovrascrive le impostazioni del dispositivo |

**`system_settings` è rigorosamente opt-in e distruttivo al ripristino.** Come `ssaid`, esso
sovrascrive le impostazioni a livello di dispositivo quando viene ripristinato, quindi è protetto dal
consenso esplicito dell'utente e scritto nella traccia di audit. Non selezionarlo mai per default ;
solo su una richiesta diretta e deliberata dell'utente.

### Backup di percorso autonomo

`path-backup` / `path-restore` eseguono il backup e il ripristino di **qualsiasi percorso assoluto** -
una cartella o un singolo file - sull'archiviazione condivisa o sotto `/data`, al di fuori del modello
per-app. L'archivio è scritto come `tar.zst` più un `manifest.json` nel formato proprio di VDBackup
(sigillato in SHA-256, con un kit RECOVERY quando cifrato) sotto `.paths/` nella directory dei backup.

```json
// path-backup
{ "path": "/sdcard/DCIM/Camera", "compression": "zstd:10", "password": "..." }
// path-restore
{ "ref": "<.paths ref>", "confirm": true, "password": "..." }
```

- Il percorso sorgente deve essere **assoluto** e sotto una delle radici consentite :
  `/storage/emulated`, `/data/media`, `/sdcard`, `/data`. Un percorso che non esiste fallisce con
  `ERR_NO_PATH` ; un percorso al di fuori delle radici consentite, o che contiene `..`, fallisce con
  `ERR_BAD_PATH`.
- `path-restore` riscrive nella posizione originale, quindi è distruttivo e richiede
  `"confirm": true` - un gate ad alto attrito, come `special-restore`. Una `ref` che non è un backup
  di percorso valido fallisce con `ERR_BAD_REF`.
- Entrambi vengono eseguiti **staccati** ; interroga `progress` con l'`opid` restituito.

### `update-check`

`update-check` segnala se è stata pubblicata una versione più recente del modulo, così che un
agente (o la WebUI) possa mostrarla. È un **verbo di lettura che ritorna subito** - **non** è
distaccato, quindi non c'è alcun `opid` da interrogare. Attivato solo da un'azione esplicita
dell'utente, recupera il manifesto di aggiornamento pubblicato del modulo (l'URL `updateJson` di
`module.prop`) con il `curl` impacchettato tramite una richiesta HTTP lato root - questo gira
fuori dal WebView, quindi non è soggetto alla CSP della WebUI - e confronta il `versionCode`
pubblicato con quello installato. Non accetta **alcun argomento**.

In caso di successo ritorna:

| Campo | Tipo | Significato |
|-------|------|-------------|
| `ok` | bool | `true` |
| `current_version` | string | il versionName installato |
| `current_code` | int | il versionCode installato |
| `latest_version` | string | il versionName pubblicato |
| `latest_code` | int | il versionCode pubblicato |
| `update_available` | bool | `true` quando `latest_code` è maggiore di `current_code` |
| `zipUrl` | string | l'URL dello zip pubblicato |
| `changelog` | string | l'URL del changelog pubblicato |
| `notes` | string | le note di rilascio |

Se non c'è una URL `updateJson`, se la richiesta di rete fallisce, o se il manifesto non può
essere analizzato, ritorna `{"ok":false,"code":"ERR_UPDATE_CHECK"}`.

`update-check` si limita a **segnalare** la disponibilità e le note di rilascio; l'aggiornamento
vero e proprio è eseguito dal tuo gestore root (KernelSU / APatch / Magisk) tramite l'`updateJson`
del modulo, mai da questo verbo.

## Protezioni che il tuo agente deve rispettare

- **`ssaid` è rigorosamente opt-in (disattivato per default).** Esegue il backup / il ripristino dell'ANDROID_ID
  del dispositivo riscrivendo un file di sistema ; un ripristino si applica solo dopo un riavvio, e
  il file precedente viene sempre salvato prima per consentire il rollback. Invia `"ssaid": true`
  solo su una richiesta diretta e deliberata dell'utente - mai per default.
- **Le azioni mutanti (restore, delete, import) sono distruttive** e vengono registrate in una
  traccia di audit locale (`logs/audit.jsonl`). Il ripristino è fedele (cancella-poi-estrai), quindi
  riporta l'app allo stato esatto del backup. Conferma l'intenzione prima di chiamarle.
- **`system_settings` è opt-in e distruttivo, esattamente come `ssaid`.** Il suo ripristino
  sovrascrive le impostazioni a livello di dispositivo, quindi invialo solo su una richiesta diretta
  dell'utente ; è protetto dal consenso esplicito e registrato nella traccia di audit.
- **Il ripristino è idempotente.** I ripristini grezzi di provider (messages/contacts/wifi/bluetooth/
  calendar) **sostituiscono** invece di fondere - i dati del provider vengono cancellati e l'archivio
  viene estratto sopra - così ripristinare lo stesso backup non può duplicare le righe. `dns` e
  `system_settings` vengono riapplicati con un `settings put` idempotente.
- **L'estrazione degli archivi è protetta contro il path traversal.** Il ripristino viene eseguito
  come root, quindi ogni archivio (restore, import, special-restore, path-restore) viene controllato
  prima di qualsiasi scrittura : uno i cui membri usano percorsi assoluti o contengono `..` viene
  rifiutato subito con `ERR_UNSAFE_ARCHIVE`, prima che avvenga una singola scrittura distruttiva (GNU
  tar viene eseguito anche con `--no-absolute-names`). Un archivio manomesso non può mai sfuggire alla
  sua directory di destinazione.
- **Non indebolire mai** la preservazione (SELinux/uid/gid/modi/xattr) né la regola APK (gli APK
  sono sempre compressi, mai cifrati a meno che `encrypt_apk` non sia impostato).
- Tratta l'output JSON come la fonte di verità ; controlla `ok`/`code`, interroga `progress`,
  e fai emergere i codici `ERR_*` invece di tirare a indovinare.

Vedi [ARCHITECTURE.md](ARCHITECTURE.md) e
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) per i dettagli interni.

---

*Questa documentazione è stata generata con Claude (Anthropic) ed è mantenuta da VD171. Correzioni e miglioramenti sono benvenuti - vedi [CONTRIBUTING.md](CONTRIBUTING.md).*
