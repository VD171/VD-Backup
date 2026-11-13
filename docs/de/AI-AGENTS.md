> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · Deutsch · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../in/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Українська](../uk/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# VDBackup von einem KI-Agenten aus steuern

VDBackup ist so gebaut, dass ein KI-Assistent oder -Agent **jeden** Inhalt und
jede Aktion des Moduls kopflos verwalten kann, genauso wie ein Mensch es über die
WebUI tut. Die WebUI ist nur ein Client einer kleinen JSON-API; dein Agent ist ein
weiterer. Nutze die API, scrape nicht die WebUI.

## Der Vertrag

Alles läuft über einen einzigen Einstiegspunkt, als root auf dem Gerät ausgeführt:

```
sh /data/adb/modules/vdbackup/scripts/helper.sh <verb> <base64(JSON-args)>
```

- Argumente sind ein einzelnes JSON-Objekt, **base64-kodiert**, als ein argv-Token übergeben.
- Der Befehl gibt **ein JSON-Objekt** auf stdout aus: `{"ok":true,...}` oder
  `{"ok":false,"code":"ERR_...","message":"..."}`. Parse das; scrape niemals Text.
- Lange Operationen (`backup`, `restore`, `import`, `backup-batch`, `restore-batch`, `config-export`, `config-import`) geben sofort `{"ok":true,"opid":"..."}`
  zurück und laufen **abgekoppelt** (sie überleben es, wenn der Aufrufer/die WebUI verschwindet).
  Frage ihren Fortschritt per Polling ab; sie sind nicht fertig, wenn der Aufruf zurückkehrt.
- `progress` und `cancel` nehmen **base64 der rohen opid-Zeichenkette**, kein JSON-Objekt.

Ein winziger Helfer für deine Shell:

```sh
b64() { printf '%s' "$1" | base64 -w0; }
H=/data/adb/modules/vdbackup/scripts/helper.sh
sh "$H" backup "$(b64 '{"package":"com.example.app","mode":"full"}')"
```

Um es von einer Workstation aus zu steuern, führe das über deinen üblichen root-Kanal
zum Gerät aus (adb shell als root oder ein SSH-zu-root-Setup). Das Modul liefert gebündelte
Binärdateien mit, sodass es nach der Installation **kein Internet** für lokales
Backup/Restore benötigt; nur Cloud-Ziele (`rclone`/`restic`/ssh) sprechen mit dem Netzwerk.

## Verben

| Verb | Args (JSON) | Gibt zurück |
|------|-------------|---------|
| `ping` | `{}` | `{ok,version,abi}` |
| `overview` | `{user?}` | `{ok:true,apps,instances,path_backups,jobs,backups_size,free,total}` Zählungen (Größen in Bytes): Apps mit Backups, Gesamtzahl der Backup-Instanzen, eigenständige Pfad-Backups, geplante Aufträge, Gesamtgröße der Backups und frei/gesamt des Backup-Dateisystems. Nicht abgekoppelt, kehrt sofort zurück; von der WebUI-Startübersicht verwendet. |
| `config-get` | `{}` | `{ok,config}` |
| `config-set` | das config-Objekt (oder `{key,value}`) | `{ok}` |
| `keygen` | `{}` | erzeugt das `age`-Schlüsselpaar für die Verschlüsselung |
| `list-apps` | `{user?}` | `{ok,apps:[{package,label,system,versionCode}]}` (dex, Shell-Fallback) |
| `label` | `{package,user?}` | `{ok,label}` (echter lokalisierter App-Name, kontextfrei) |
| `icon` | `{package,user?,vc?}` | `{ok,package,icon}` (base64-PNG; pro package+`vc` zwischengespeichert) |
| `backup` | siehe unten | `{ok,opid}` (abgekoppelt) |
| `restore` | siehe unten | `{ok,opid}` (abgekoppelt) |
| `import` | `{from,ref,password,ssaid,user}` | `{ok,opid}` (abgekoppelt) |
| `import-scan` | `{from,path}` | `{ok,backups:[...]}` |
| `progress` | base64(opid) | das Live-`progress-<opid>.json` |
| `cancel` | base64(opid) | `{ok,cancelled}` |
| `list-ops` | `{}` | `{ok,ops:[...]}` (nach dem Wiederverbinden erneut anhängen) |
| `list-apps`/`icons` | `{user?}` / `{user?,items:[{package,vc}]}` | App-Liste / base64-Icons im Batch |
| `list-backups` | `{package?}` | `{ok,backups:[{ref,package,label,versionName,versionCode,created_at,mode,items}]}` |
| `list-users` | `{}` | `{ok,users:[{id,name}]}` Android-Benutzer des Geräts (Mehrbenutzer). |
| `list-dirs` | `{path}` | `{ok,path,parent,dirs:[...]}` Unterverzeichnisse eines Pfads (Ordnerauswahl). |
| `path-list` | `{user?}` | `{ok,backups:[...]}` eigenständige Ordner-/Datei-Backups. |
| `provenance` | `{}` | Audit-Manifest der mitgelieferten Binärdateien (`PROVENANCE.json`). |
| `backup-info` | `{ref}` | `{ok,...}` alle Details eines Backups (Version, Installationsquelle, Status, Datum, Modus, Größe, Elemente, Berechtigungszählungen, Gerät) |
| `backup-icon` | `{ref}` | `{ok,icon}` base64-PNG aus dem Manifest (funktioniert, wenn die App deinstalliert ist) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref muss unter dem backups-Verzeichnis liegen) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` die neuesten N eines Pakets behalten |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` Audit-Protokoll, das Neueste zuerst |
| `log-export` | `{user?}` | `{ok:true,path}` (absoluter Pfad einer geschriebenen `.txt` im Backup-Verzeichnis) oder `{ok:false,code:"ERR_LOG_EXPORT"}`. Schreibt das Aktivitätsprotokoll (`audit.jsonl`) plus einen kurzen Build-/Geräte-Header in eine einzelne, für den Benutzer sichtbare Textdatei, sodass sie an einen Fehlerbericht angehängt werden kann. Nicht abgekoppelt, kehrt sofort zurück. |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth/calendar/wallpaper/dns/system_settings) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` systemweites Backup (abgekoppelt) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (Neustart erforderlich; `confirm` schaltet es frei) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `path-backup` | `{path,compression?,password?}` | `{ok,opid}` sichert einen beliebigen absoluten Pfad als `tar.zst`+`manifest.json` unter `.paths/` (abgekoppelt) |
| `path-restore` | `{ref,confirm:true,password?}` | `{ok,opid}` stellt ein Pfad-Backup an seinem ursprünglichen Ort wieder her (`confirm` schaltet es frei; abgekoppelt) |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | eine installierte App als System-App einhängen (systemloses Submodul; live über NoMount, sonst beim nächsten Start) |
| `companion-status` / `companion-install` | `{}` | Status des Google-Drive-Begleiters / Installation bei Bedarf |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | Zielverwaltung |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | rclone-Remote-Verwaltung (erstellt den `rclone.conf`-Eintrag, auf den ein `type:"rclone"`-Ziel zeigt); `backend` kann jedes rclone-Backend sein, keine Whitelist |
| `remote-authorize` | `{backend}` | `{ok:true,url}` (die Engine hat den Telefon-Browser bereits über einen Android-VIEW-Intent auf dieser Zustimmungs-URL geöffnet) oder `{ok:false,code:"ERR_AUTHORIZE"}`. Führt `rclone authorize <backend>` auf einem lokalen Callback-Server (`127.0.0.1:53682`) für On-Device-OAuth aus. |
| `remote-authorize-poll` | `{}` | `{ok:true,done:false,url}` während des Wartens, `{ok:true,done:true,token}` sobald der Nutzer zugestimmt hat (der `token`, der an `remote-add` zu übergeben ist), oder `{ok:false,code:"ERR_AUTHORIZE"}`. |
| `remote-authorize-cancel` | `{}` | `{ok:true,cancelled:true}`; stoppt eine ausstehende Autorisierung. |
| `cloud-status` | `{}` | `{ok,rclone,restic,fetchable,size}` (ob die Binärdateien `rclone`/`restic` vorhanden sind, ob diese `lite`-Edition sie holen kann, Download-Größe in Bytes) |
| `cloud-fetch` | `{}` | `{ok,opid}` (abgekoppelt) holt+verifiziert+installiert das `rclone`/`restic`-Addon in einer `lite`-Edition |
| `schedule-set` / `schedule-list` / `schedule-delete` | siehe unten | geplante Aufträge (ein Backup oder eine Wiederherstellung; zielt auf eine App, einen Satz oder alle Apps) |
| `scheduler-tick` | `{}` | führt fällige Aufträge aus + wendet Aufbewahrung an + den Auto-Backup-Beobachter (der Boot-Heartbeat ruft das auf) |
| `update-check` | `{}` | `{ok,current_version,current_code,latest_version,latest_code,update_available,zipUrl,changelog,notes}` (nicht abgekoppelt; kehrt sofort zurück; `ERR_UPDATE_CHECK` bei Fehlschlag, siehe unten) |
| `backup-batch` | `{packages:[...], ...backup args}` | `{ok,opid}` (detached) sichert viele Apps in einem abgekoppelten Vorgang; der Fortschritt führt `n`/`of`. Ein Fehler pro App stoppt den Stapel nicht. |
| `restore-batch` | `{refs:[...], ...restore args}` | `{ok,opid}` (detached) stellt viele Backups in einem abgekoppelten Vorgang wieder her; der Fortschritt führt `n`/`of`. Ein Fehler pro App stoppt den Stapel nicht. |
| `list-volumes` | `{}` | `{ok,volumes:[{path,removable,id?}]}` Speichervolumes für die Ordnerauswahl: intern plus wechselbare SD-Karte / USB. |
| `config-export` | `{password}` | `{ok,opid}` (detached) exportiert Konfig, Jobs, Ziele, Zugangsdaten und Schlüssel in eine einzige passphrase-verschlüsselte Datei im Backup-Verzeichnis. |
| `config-import` | `{ref,password}` | `{ok,opid}` (detached) führt eine exportierte Konfigdatei wieder in dieses Gerät ein (überschreibt nie blind). |
| `config-exports` | `{}` | `{ok,exports:[{ref,name,size}]}` listet die verschlüsselten Konfigdateien auf, die zum Import verfügbar sind. |
| `wipe-credentials` | `{}` | `{ok,wiped}` entfernt gespeicherte Remote-Passwörter und den Geräteverschlüsselungsschlüssel; Ziele, Jobs und Backups bleiben. |
| `log-prune` | `{}` | `{ok}` beschneidet längst beendete Vorgangsprotokolle, begrenzt das Audit-Protokoll und entfernt veraltete Icons (der Boot-Dienst ruft dies auf). |

### `progress`-Felder

Das Abfragen von `progress` gibt das Live-`progress-<opid>.json` der Operation zurück. Diese
Felder sind **immer vorhanden**:

| Feld | Typ | Bedeutung |
|------|-----|-----------|
| `opid` | string | die Operations-ID |
| `percent` | int | Fortschritt 0-100 |
| `phase` | string | Bezeichnung der aktuellen Phase |
| `item` | string | aktuell verarbeiteter Elementtyp |
| `done` | bool | true bei einem finalen Schreibvorgang (finish / dry-run / restore-test) |

Eine laufende Operation kann außerdem diese **optionalen** Live-Felder tragen. Sie fehlen oder
sind leer, wenn unbekannt, und werden **bei finalen Schreibvorgängen weggelassen** (finish /
dry-run / restore-test):

| Feld | Typ | Bedeutung |
|------|-----|-----------|
| `rate` | string | Übertragungsgeschwindigkeit, z. B. `"4.2 MiB/s"` (leer = unbekannt) |
| `eta` | string | geschätzte Restzeit, z. B. `"1m12s"` (leer = unbekannt) |
| `n` | int | aktueller Elementindex (0 = unbekannt) |
| `of` | int | Gesamtzahl der Elemente (0 = unbekannt) |
| `cur` | string | Name des aktuellen Elements (leer = keines) |

Cloud-Transfers füllen `rate`/`eta` (der percent-Wert kommt von rclone); lokale Full-Backups
füllen `n`/`of`/`cur`. Phasenbezeichnungen umfassen die Prüfsummen-Versiegelungsphase
**`verified`** und, für Cloud-Transfers, **`transfer`** und **`mirror <item>`**.

### `backup`-Args

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

`restore`/`import` nehmen `{ref}` (ein Backup-Verzeichnis / Scan-ref). `restore` akzeptiert
außerdem: `"items"` (eine Teilmenge der Elementtypen des Backups zum Wiederherstellen; weglassen
für alle), `"test": true` (in ein temporäres Verzeichnis extrahieren und verifizieren, ohne die
Live-App zu berühren), `"mode"` für snapshot/mirror, `"password"` für ein verschlüsseltes Backup,
`"ssaid"` (opt-in) und die Installationsquellen-Optionen `"spoof_installer"` (Standard aus der
Konfiguration, setzt den Installer zur Installationszeit auf den Play Store) und
`"deep_spoof": true` (erweitertes Opt-in; fälscht zusätzlich das initiierende Paket und die
Paketquelle durch Bearbeiten der Paketdatenbank, wirkt nach einem Neustart). `import` nimmt
`"from": "neo" | "databackup"` und, für ein verschlüsseltes Neo-Backup, `"password"`.

### `schedule-set`-Args

Ein geplanter Auftrag wählt **ein** Ziel und eine **Aktion**:

```json
{
  "id": "nightly-games",
  "action": "backup",             // "backup" (Standard) | "restore"
  "package": "com.example.app",   // eine App   - ODER -
  "packages": ["com.a","com.b"],  // ein Satz von Apps   - ODER -
  "all": true,                    // alle Apps, abzüglich der Liste ausgeschlossener Apps
  "cron": "daily",                // hourly | daily | weekly
  "at": "02:30",                  // HH:MM
  "mode": "full",
  "dest": "local",
  "keep": 5,
  "items": ["apk","data"],
  "require_wifi": false,          // Gate: nur im WLAN ausführen
  "require_charging": false,      // Gate: nur während des Ladens ausführen
  "min_battery": 0,               // Gate: nur ab diesem Akkustand % ausführen (0-100)
  "days": [1,2,3,4,5]             // Gate: nur an diesen Wochentagen ausführen (0=Sonntag)
}
```

Gib als Ziel genau **eines** von `package`, `packages` oder `all` an. Ein `backup`-Auftrag
behält die üblichen `mode`/`dest`/`keep`/`items`. Ein `restore`-Auftrag (`action: "restore"`)
stellt das **neueste** Backup jeder Ziel-App wieder her (oder eine explizite `ref`) und
**überschreibt bei jedem Lauf die aktuellen Daten der App**: das ist beabsichtigt und opt-in,
setze es also nur auf direkte Anforderung des Nutzers.

### Scheduler-Gating

Ein geplanter Auftrag kann **optionale Gate-Bedingungen** tragen. Wenn das Gate eines fälligen
Auftrags nicht erfüllt ist, wird er **übersprungen und beim nächsten Tick erneut versucht, ohne
seinen Zeitplan voranzutreiben** (seine `last_run` wird nicht gestempelt, sodass er feuert,
sobald die Bedingung erfüllt ist):

| Feld | Typ | Gate |
|------|-----|------|
| `require_wifi` | bool | nur im WLAN ausführen |
| `require_charging` | bool | nur während des Ladens ausführen |
| `min_battery` | int (0-100) | nur ab diesem Akkustand ausführen |
| `days` | array of int (0-6, 0=Sonntag) | nur an diesen Wochentagen ausführen |

Zusätzlich wird eine minimale **thermische Sicherheitsprüfung** immer angewendet: eine geplante
Operation wird übersprungen, während das Gerät kritisch heiß ist. Jedes Gate-Überspringen wird
als `op:"scheduler-gated"` mit einem `reason` von `wifi` / `charging` / `battery` / `days` /
`thermal` in den Audit-Trail geschrieben.

### `remote-add`-Args

Ein Cloud-Ziel ist ein `type:"rclone"`-Ziel, das ein `rclone`-Remote benennt; erstelle
dieses Remote zuerst mit `remote-add`. Das `backend` kann **jedes rclone-Backend** sein -
es gibt keine Whitelist. `remote-add` akzeptiert jeden Backend-Namen (`dropbox`, `onedrive`,
`box`, `pcloud`, `mega`, `b2`, `s3`, `sftp`, `smb`, `webdav`, `ftp`, `drive` und die ~70
anderen, die rclone unterstützt), und die `params` werden direkt als `key=value`-Paare an
die `rclone`-Konfiguration durchgereicht. Passwort-Felder werden verschleiert gespeichert,
nie im Klartext. Gängige Backends und ihre `params`:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

**On-Device-OAuth (kein PC).** Backends, die eine Browser-Anmeldung brauchen (Google Drive,
Dropbox, OneDrive, Box, pCloud), benötigen keinen Desktop und keinen manuell eingefügten
Token. Rufe `remote-authorize` mit `{backend}` auf: die Engine führt `rclone authorize <backend>`
gegen einen lokalen Callback-Server (`127.0.0.1:53682`) aus und öffnet den Browser des Telefons
selbst über einen Android-VIEW-Intent auf der Zustimmungsseite des Anbieters und gibt
`{ok:true,url}` zurück (oder `{ok:false,code:"ERR_AUTHORIZE"}`). Frage `remote-authorize-poll`
(`{}`) ab: es gibt `{ok:true,done:false,url}` während des Wartens und `{ok:true,done:true,token}`
zurück, sobald der Nutzer zustimmt, übergib diesen `token` an `remote-add`.
`remote-authorize-cancel` (`{}`) stoppt eine ausstehende Autorisierung (`{ok:true,cancelled:true}`).
Das manuelle Einfügen der Ausgabe von `rclone authorize "<backend>"` von einem beliebigen
Computer wird weiterhin als Fallback unterstützt.

Google Drive hat zwei Wege: dieses `drive`-Remote (kein Google-Cloud-Projekt nötig, nutzt
rclones eigenes OAuth, autorisiere On-Device mit `remote-authorize`, oder führe
`rclone authorize "drive"` einmal auf einem beliebigen Computer aus und übergib den Token)
oder die optionale Begleit-App (deine eigene OAuth-Client-ID). Beide enden als gewöhnliche Ziele.

### Netzwerkrichtlinie

Das config-Feld `network_policy` steuert, welche Verbindung Cloud-Transfers nutzen dürfen:
`any` (Standard), `wifi` oder `mobile`. Setze es mit `config-set`. Wenn es `wifi` oder
`mobile` ist, prüft jeder Cloud-Transfer (Full-`rclone`/Drive-Upload, Mirror-Sync,
`restic`-Remote-Snapshot-Backup/-Restore, Mirror-Restore) zuerst den aktiven Transport und
bricht mit `ERR_NET_POLICY` ab, wenn er nicht passt, sowohl für manuelle als auch für geplante
Aufträge. Lokale Ziele werden nie eingeschränkt.

### Cloud-Integrität und Kontingent

- **Prüfsummen-Versiegelung (Cloud).** Nach einem erfolgreichen Cloud-Kopiervorgang führt die
  Engine eine Remote-Prüfsummenprüfung (`rclone check`) durch; eine Abweichung lässt die
  Operation mit `ERR_VERIFY` fehlschlagen. Backends, die keinen gemeinsamen Hash mit der lokalen
  Seite teilen, werden übersprungen (kein Fehlschlag).
- **Kontingentprüfung (Cloud, Full-Modus).** Vor einem Upload im Full-Modus zu einem
  `rclone`-Remote fragt die Engine den freien Speicher des Remotes ab (`rclone about --json`) und
  verweigert mit `ERR_QUOTA`, wenn das Backup nicht passen würde. Remotes, die keine
  Kontingentinformationen melden, werden übersprungen. Der Mirror-Modus ist ein Delta-Sync und
  ist ausgenommen.

### Cloud-Binärdateien (`lite`-Edition)

Eine `full`-Edition bündelt alle Binärdateien und braucht nie das Netzwerk. Die `lite`-Edition
lässt die zwei größten weg, `rclone` und `restic`, und holt sie bei Bedarf beim ersten Mal, wenn
du eine Cloud- oder Snapshot-Aktion ausführst. `cloud-status` meldet, ob sie bereits vorhanden
sind, ob diese Edition sie holen kann, und die Download-Größe in Bytes. `cloud-fetch` läuft
**abgekoppelt** (frage `progress` mit seiner `opid` per Polling ab): es lädt das
architekturspezifische `rclone`+`restic`-Addon herunter, verifiziert es gegen die im Modul
eingebackene SHA-256 und installiert es in den Runtime-Cache. Seine Fortschrittsphasen sind
`downloading`, `verifying` und `installing`; der finale Code ist `ERR_NONE` bei Erfolg oder
`ERR_FETCH` (Download fehlgeschlagen) / `ERR_FETCH_VERIFY` (Prüfsumme stimmt nicht, verworfen)
bei Fehlschlag. In einer `full`-Edition ist es überflüssig. Ein `backup`/`restore` zu einem
Cloud- oder Snapshot-Ziel in der `lite`-Edition schlägt, bevor die Binärdateien vorhanden sind,
mit `ERR_CLOUD_FETCHABLE` fehl; der Client sollte anbieten, `cloud-fetch` auszuführen, und es
dann erneut versuchen.

### Spezial-Backup-Kategorien

`special-categories` meldet, welche systemweiten Kategorien ein Gerät hat; `special-backup`
erfasst die, die du in `categories` übergibst, und `special-restore` wendet sie erneut an. Die
Kategorien sind:

| Kategorie | Was es ist | Restore-Semantik |
|----------|-----------|-------------------|
| `messages` | SMS/MMS | Provider-Ersetzung (löschen + extrahieren) |
| `contacts` | Kontakte und Anrufliste | Provider-Ersetzung (löschen + extrahieren) |
| `wifi` | gespeicherte WLAN-Netzwerke | Provider-Ersetzung (löschen + extrahieren) |
| `bluetooth` | Bluetooth-Kopplungen | Provider-Ersetzung (löschen + extrahieren) |
| `calendar` | der Kalender-Provider (`com.android.providers.calendar`, App + Daten); außerdem portabel nach `calendar.json` exportiert | Provider-Ersetzung (löschen + extrahieren) |
| `wallpaper` | Start- und Sperrbildschirm-Hintergrund samt `wallpaper_info.xml`, roh (binär) gespeichert | Dateien ersetzt |
| `dns` | der private DNS-Modus und -Spezifizierer, aus den Einstellungen gelesen | idempotentes `settings put` |
| `system_settings` | der vollständige Dump der system-/global-/secure-Einstellungen | **Opt-in**, idempotentes `settings put`, überschreibt Geräteeinstellungen |

**`system_settings` ist strikt Opt-in und bei der Wiederherstellung destruktiv.** Wie `ssaid`
überschreibt es beim Wiederherstellen geräteweite Einstellungen, daher ist es hinter einer
ausdrücklichen Nutzereinwilligung abgesichert und wird in den Audit-Trail geschrieben. Wähle es nie
standardmäßig aus; nur auf eine direkte, bewusste Nutzeranfrage hin.

### Eigenständiges Pfad-Backup

`path-backup` / `path-restore` sichern und stellen **jeden absoluten Pfad** wieder her, einen Ordner
oder eine einzelne Datei, auf dem geteilten Speicher oder unter `/data`, außerhalb des
App-bezogenen Modells. Das Archiv wird als `tar.zst` plus eine `manifest.json` in VDBackups eigenem
Format geschrieben (SHA-256-versiegelt, mit einem RECOVERY-Kit, wenn verschlüsselt) unter `.paths/`
im Backup-Verzeichnis.

```json
// path-backup
{ "path": "/sdcard/DCIM/Camera", "compression": "zstd:10", "password": "..." }
// path-restore
{ "ref": "<.paths ref>", "confirm": true, "password": "..." }
```

- Der Quellpfad muss **absolut** sein und unter einem der erlaubten Roots liegen:
  `/storage/emulated`, `/data/media`, `/sdcard`, `/data`. Ein Pfad, der nicht existiert, schlägt mit
  `ERR_NO_PATH` fehl; ein Pfad außerhalb der erlaubten Roots oder einer, der `..` enthält, schlägt mit
  `ERR_BAD_PATH` fehl.
- `path-restore` schreibt an den ursprünglichen Ort zurück, ist also destruktiv und erfordert
  `"confirm": true`, eine reibungsstarke Sperre, wie `special-restore`. Ein `ref`, das kein gültiges
  Pfad-Backup ist, schlägt mit `ERR_BAD_REF` fehl.
- Beide laufen **abgekoppelt**; frage `progress` mit der zurückgegebenen `opid` per Polling ab.

### `update-check`

`update-check` meldet, ob eine neuere Version des Moduls veröffentlicht wurde, damit ein Agent
(oder die WebUI) sie anzeigen kann. Es ist ein **Lese-Verb, das sofort zurückkehrt**: es ist
**nicht** abgekoppelt, es gibt also keine `opid` zum Abfragen. Nur durch eine ausdrückliche
Benutzeraktion ausgelöst, ruft es das veröffentlichte Update-Manifest des Moduls ab (die
`updateJson`-URL aus `module.prop`) mit dem mitgelieferten `curl` über eine root-seitige
HTTP-Anfrage, das läuft außerhalb des WebView und unterliegt daher nicht der CSP der WebUI, und
vergleicht den veröffentlichten `versionCode` mit dem installierten. Es nimmt **keine Argumente**.

Bei Erfolg gibt es zurück:

| Feld | Typ | Bedeutung |
|------|-----|-----------|
| `ok` | bool | `true` |
| `current_version` | string | der installierte versionName |
| `current_code` | int | der installierte versionCode |
| `latest_version` | string | der veröffentlichte versionName |
| `latest_code` | int | der veröffentlichte versionCode |
| `update_available` | bool | `true`, wenn `latest_code` größer als `current_code` ist |
| `zipUrl` | string | die URL des veröffentlichten Zips |
| `changelog` | string | die URL des veröffentlichten Changelogs |
| `notes` | string | die Release-Notes |

Wenn es keine `updateJson`-URL gibt, die Netzwerkanfrage fehlschlägt oder das Manifest nicht
geparst werden kann, gibt es `{"ok":false,"code":"ERR_UPDATE_CHECK"}` zurück.

`update-check` **meldet** nur die Verfügbarkeit und die Release-Notes; das Update selbst wird von
deinem Root-Manager (KernelSU / APatch / Magisk) über das `updateJson` des Moduls durchgeführt, nie
von diesem Verb.

## Sicherheitsleitplanken, die dein Agent beachten muss

- **`ssaid` ist strikt Opt-in (standardmäßig aus).** Es sichert / stellt die ANDROID_ID des
  Geräts wieder her, indem es eine Systemdatei umschreibt; eine Wiederherstellung greift erst
  nach einem Neustart, und die vorherige Datei wird für ein Rollback immer zuerst gesichert.
  Sende `"ssaid": true` nur auf eine direkte, bewusste Benutzeranfrage hin, niemals standardmäßig.
- **Mutierende Aktionen (restore, delete, import) sind destruktiv** und werden in einem lokalen
  Audit-Protokoll (`logs/audit.jsonl`) festgehalten. Restore ist originalgetreu
  (löschen-dann-extrahieren), sodass die App auf den exakten Zustand des Backups zurückgesetzt
  wird. Bestätige die Absicht, bevor du sie aufrufst.
- **`system_settings` ist Opt-in und destruktiv, genau wie `ssaid`.** Das Wiederherstellen
  überschreibt geräteweite Einstellungen, sende es also nur auf eine direkte Nutzeranfrage hin; es ist
  durch ausdrückliche Einwilligung abgesichert und wird im Audit-Trail festgehalten.
- **Restore ist idempotent.** Rohe Provider-Restores (messages/contacts/wifi/bluetooth/calendar)
  **ersetzen** statt zusammenzuführen, die Provider-Daten werden gelöscht und das Archiv wird darüber
  extrahiert, sodass ein erneutes Wiederherstellen desselben Backups keine Zeilen duplizieren kann.
  `dns` und `system_settings` werden mit idempotentem `settings put` erneut angewendet.
- **Die Archiv-Extraktion ist gegen Path-Traversal abgesichert.** Restore läuft als root, daher wird
  jedes Archiv (restore, import, special-restore, path-restore) vor jedem Schreibvorgang geprüft: eines,
  dessen Mitglieder absolute Pfade verwenden oder `..` enthalten, wird vorab mit `ERR_UNSAFE_ARCHIVE`
  abgelehnt, bevor ein einziger destruktiver Schreibvorgang geschieht (GNU tar läuft außerdem mit
  `--no-absolute-names`). Ein manipuliertes Archiv kann nie aus seinem Zielverzeichnis ausbrechen.
- **Schwäche niemals** die Bewahrung ab (SELinux/uid/gid/Modi/xattr) oder die APK-Regel (APKs
  werden immer komprimiert, nie verschlüsselt, es sei denn, `encrypt_apk` ist gesetzt).
- Behandle die JSON-Ausgabe als Quelle der Wahrheit; prüfe `ok`/`code`, frage `progress` per
  Polling ab und gib `ERR_*`-Codes aus, statt zu raten.

Siehe [ARCHITECTURE.md](ARCHITECTURE.md) und
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) für die Interna.

<!-- doc-footer -->

---

> _Diese Dokumentation wurde mit Claude (Anthropic) erstellt und wird von VD171 gepflegt. Korrekturen und Verbesserungen sind willkommen; siehe [CONTRIBUTING.md](CONTRIBUTING.md)._
