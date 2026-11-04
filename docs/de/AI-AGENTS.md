> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · Deutsch · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../in/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

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
- Lange Operationen (`backup`, `restore`, `import`) geben sofort `{"ok":true,"opid":"..."}`
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
| `backup-info` | `{ref}` | `{ok,...}` alle Details eines Backups (Version, Installationsquelle, Status, Datum, Modus, Größe, Elemente, Berechtigungszählungen, Gerät) |
| `backup-icon` | `{ref}` | `{ok,icon}` base64-PNG aus dem Manifest (funktioniert, wenn die App deinstalliert ist) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref muss unter dem backups-Verzeichnis liegen) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` die neuesten N eines Pakets behalten |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` Audit-Protokoll, das Neueste zuerst |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` systemweites Backup (abgekoppelt) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (Neustart erforderlich; `confirm` schaltet es frei) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | eine installierte App als System-App einhängen (systemloses Submodul; live über NoMount, sonst beim nächsten Start) |
| `companion-status` / `companion-install` | `{}` | Status des Google-Drive-Begleiters / Installation bei Bedarf |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | Zielverwaltung |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | rclone-Remote-Verwaltung (erstellt den `rclone.conf`-Eintrag, auf den ein `type:"rclone"`-Ziel zeigt) |
| `schedule-set` / `schedule-list` / `schedule-delete` | `{id,package,mode,dest,cron,at,keep,items}` | geplante Aufträge |
| `scheduler-tick` | `{}` | führt fällige Aufträge aus + wendet Aufbewahrung an + den Auto-Backup-Beobachter (der Boot-Heartbeat ruft das auf) |

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
  "ssaid": false                  // OPT-IN, see below
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

### `remote-add`-Args

Ein Cloud-Ziel ist ein `type:"rclone"`-Ziel, das ein `rclone`-Remote benennt; erstelle
dieses Remote zuerst mit `remote-add`. Passwort-Felder werden verschleiert gespeichert, nie
im Klartext. Unterstützte `backend`-Werte und ihre `params`:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

Google Drive hat zwei Wege: dieses `drive`-Remote (kein Google-Cloud-Projekt nötig, nutzt
rclones eigenes OAuth - führe `rclone authorize "drive"` einmal auf einem beliebigen Computer
aus und übergib den Token) oder die optionale Begleit-App (deine eigene OAuth-Client-ID).
Beide enden als gewöhnliche Ziele.

### Netzwerkrichtlinie

Das config-Feld `network_policy` steuert, welche Verbindung Cloud-Transfers nutzen dürfen:
`any` (Standard), `wifi` oder `mobile`. Setze es mit `config-set`. Wenn es `wifi` oder
`mobile` ist, prüft jeder Cloud-Transfer (Full-`rclone`/Drive-Upload, Mirror-Sync,
`restic`-Remote-Snapshot-Backup/-Restore, Mirror-Restore) zuerst den aktiven Transport und
bricht mit `ERR_NET_POLICY` ab, wenn er nicht passt - sowohl für manuelle als auch für geplante
Aufträge. Lokale Ziele werden nie eingeschränkt.

## Sicherheitsleitplanken, die dein Agent beachten muss

- **`ssaid` ist strikt Opt-in (standardmäßig aus).** Es sichert / stellt die ANDROID_ID des
  Geräts wieder her, indem es eine Systemdatei umschreibt; eine Wiederherstellung greift erst
  nach einem Neustart, und die vorherige Datei wird für ein Rollback immer zuerst gesichert.
  Sende `"ssaid": true` nur auf eine direkte, bewusste Benutzeranfrage hin - niemals standardmäßig.
- **Mutierende Aktionen (restore, delete, import) sind destruktiv** und werden in einem lokalen
  Audit-Protokoll (`logs/audit.jsonl`) festgehalten. Restore ist originalgetreu
  (löschen-dann-extrahieren), sodass die App auf den exakten Zustand des Backups zurückgesetzt
  wird. Bestätige die Absicht, bevor du sie aufrufst.
- **Schwäche niemals** die Bewahrung ab (SELinux/uid/gid/Modi/xattr) oder die APK-Regel (APKs
  werden immer komprimiert, nie verschlüsselt, es sei denn, `encrypt_apk` ist gesetzt).
- Behandle die JSON-Ausgabe als Quelle der Wahrheit; prüfe `ok`/`code`, frage `progress` per
  Polling ab und gib `ERR_*`-Codes aus, statt zu raten.

Siehe [ARCHITECTURE.md](ARCHITECTURE.md) und
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) für die Interna.

---

*Diese Dokumentation wurde mit Claude (Anthropic) erstellt und wird von VD171 gepflegt. Korrekturen und Verbesserungen sind willkommen - siehe [CONTRIBUTING.md](CONTRIBUTING.md).*
