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
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` backup a livello di sistema (staccato) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (richiede riavvio ; `confirm` lo abilita) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | monta un'app installata come app di sistema (sottomodulo systemless ; a caldo tramite NoMount altrimenti al boot successivo) |
| `companion-status` / `companion-install` | `{}` | stato del companion Google Drive / installazione su richiesta |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | gestione delle destinazioni |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | gestione dei remote rclone (crea la voce `rclone.conf` a cui punta una destinazione `type:"rclone"`) |
| `schedule-set` / `schedule-list` / `schedule-delete` | `{id,package,mode,dest,cron,at,keep,items}` | lavori pianificati |
| `scheduler-tick` | `{}` | esegue i lavori dovuti + applica la ritenzione + l'osservatore di backup automatico (il battito all'avvio chiama questo) |

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

### Args di `remote-add`

Una destinazione cloud è una destinazione `type:"rclone"` che nomina un remote `rclone` ; crea
prima quel remote con `remote-add`. I campi di password sono memorizzati offuscati, mai in
chiaro. Valori di `backend` supportati e i loro `params` :

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output di `rclone authorize "drive"`)
```

Google Drive ha due vie : questo remote `drive` (nessun progetto Google Cloud necessario, usa
l'OAuth proprio di rclone - esegui `rclone authorize "drive"` una volta su qualsiasi computer e passa il
token) o l'app compagna opzionale (il tuo id client OAuth). Entrambe finiscono come destinazioni
ordinarie.

### Politica di rete

Il campo di configurazione `network_policy` controlla quale connessione i trasferimenti cloud possono usare :
`any` (predefinito), `wifi`, o `mobile`. Impostalo con `config-set`. Quando è `wifi` o
`mobile`, ogni trasferimento cloud (caricamento Full `rclone`/Drive, sincronizzazione Mirror, backup/ripristino di
snapshot `restic` remoto, ripristino Mirror) verifica prima il trasporto attivo e
si interrompe con `ERR_NET_POLICY` se non corrisponde - sia per i lavori manuali che pianificati.
Le destinazioni locali non sono mai soggette a questo controllo.

## Protezioni che il tuo agente deve rispettare

- **`ssaid` è rigorosamente opt-in (disattivato per default).** Esegue il backup / il ripristino dell'ANDROID_ID
  del dispositivo riscrivendo un file di sistema ; un ripristino si applica solo dopo un riavvio, e
  il file precedente viene sempre salvato prima per consentire il rollback. Invia `"ssaid": true`
  solo su una richiesta diretta e deliberata dell'utente - mai per default.
- **Le azioni mutanti (restore, delete, import) sono distruttive** e vengono registrate in una
  traccia di audit locale (`logs/audit.jsonl`). Il ripristino è fedele (cancella-poi-estrai), quindi
  riporta l'app allo stato esatto del backup. Conferma l'intenzione prima di chiamarle.
- **Non indebolire mai** la preservazione (SELinux/uid/gid/modi/xattr) né la regola APK (gli APK
  sono sempre compressi, mai cifrati a meno che `encrypt_apk` non sia impostato).
- Tratta l'output JSON come la fonte di verità ; controlla `ok`/`code`, interroga `progress`,
  e fai emergere i codici `ERR_*` invece di tirare a indovinare.

Vedi [ARCHITECTURE.md](../ARCHITECTURE.md) e
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) per i dettagli interni.

---

*Questa documentazione è stata generata con Claude (Anthropic) ed è mantenuta da VD171. Correzioni e miglioramenti sono benvenuti - vedi [CONTRIBUTING.md](../CONTRIBUTING.md).*
