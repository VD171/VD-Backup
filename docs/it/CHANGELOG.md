> **Languages:** [English](../../CHANGELOG.md) · [العربية](../ar/CHANGELOG.md) · [Čeština](../cs/CHANGELOG.md) · [Deutsch](../de/CHANGELOG.md) · [Español](../es/CHANGELOG.md) · [فارسی](../fa/CHANGELOG.md) · [Français](../fr/CHANGELOG.md) · [हिन्दी](../hi/CHANGELOG.md) · [Bahasa Indonesia](../in/CHANGELOG.md) · Italiano · [日本語](../ja/CHANGELOG.md) · [한국어](../ko/CHANGELOG.md) · [Nederlands](../nl/CHANGELOG.md) · [Polski](../pl/CHANGELOG.md) · [Português](../pt/CHANGELOG.md) · [Русский](../ru/CHANGELOG.md) · [Svenska](../sv/CHANGELOG.md) · [ไทย](../th/CHANGELOG.md) · [Türkçe](../tr/CHANGELOG.md) · [Tiếng Việt](../vi/CHANGELOG.md) · [中文](../zh/CHANGELOG.md)

---

# Changelog

Tutte le modifiche rilevanti di VDBackup sono documentate qui. Solo in inglese.

## v1.05

Affidabilità:

- I backup in blocco non si interrompono più a metà quando esci dall'app. Un'intera selezione, un gruppo di tag o un'esecuzione pianificata è ora gestita da un unico processo root distaccato che continua a WebUI chiusa ed è protetto dall'essere terminato sotto pressione di memoria. L'avanzamento si riaggancia quando torni.

Impostazioni:

- Backup delle impostazioni: esporta destinazioni, pianificazioni, preimpostazioni e credenziali salvate in un unico file cifrato e importalo su un altro dispositivo o dopo un'installazione pulita. Il file chiede sempre una passphrase perché contiene password remote, e l'importazione si unisce al dispositivo senza rimuovere ciò che è già presente.
- Ora puoi cancellare le credenziali remote salvate e la chiave di cifratura del dispositivo dalle impostazioni in un solo passaggio, mantenendo destinazioni, pianificazioni e backup.

Sicurezza:

- I backup possono essere archiviati solo dove restano cifrati a riposo. Le destinazioni sotto percorsi leggibili prima del primo sblocco, come /data/adb o /data/system, vengono rifiutate.
- Le credenziali salvate, il rclone.conf e la chiave age ora risiedono su archiviazione cifrata per credenziale, bloccata fino al primo sblocco, invece di un percorso prima leggibile; un aggiornamento del modulo le sposta lì in modo permanente.
- I backup ora controllano lo spazio libero prima di iniziare e si fermano con un messaggio chiaro invece di fallire a metà.

Ripristino:

- Il ripristino di un'app non più installata ora reinstalla prima il suo APK, e la finestra di ripristino offre l'opzione APK ogni volta che il backup ne contiene uno. Un ripristino che non riesce a installare l'app segnala l'errore invece di fingere successo.
- Le operazioni di app, permessi e impostazioni ora vengono eseguite in un ambiente pulito, correggendo gli errori "Failed transaction" che bloccavano ripristino, app-ops e impostazioni su alcune ROM.

Destinazioni:

- Puoi eseguire il backup su scheda SD o unità USB: il selettore di cartelle mostra una scorciatoia a ogni volume di archiviazione e accetta percorsi su supporti rimovibili.

## v1.04

Correzioni:

- Le cartelle dei backup ora restano apribili da un gestore file in automatico: i loro permessi vengono riapplicati all'installazione, a ogni avvio e ogni volta che si apre la WebUI, così una cartella rimasta solo per il proprietario (per esempio un backup fatto prima della v1.03.2) si ripara da sola senza alcun passaggio manuale.

Privacy:

- Quando hai backup locali, la scheda Backup ora ti ricorda di nascondere la cartella dei backup con SUSFS, proprio come l'app companion: la sua presenza può altrimenti rivelare il root o un bootloader sbloccato. È SUSFS a nascondere; il promemoria ti indica solo dove.

Backup:

- Ora puoi definire quali elementi salva ogni app, per esempio solo APK, o APK + OBB, applicato nei backup di massa, automatici e pianificati. Un singolo backup manuale ti lascia comunque scegliere sul momento, precompilato dal set dell'app. Impostalo nelle Impostazioni, accanto all'elenco delle app escluse.

- Preset di backup: salva insiemi con nome di cosa includere e applicali con una scelta nel dialogo di backup.
- Multiutente: backup delle app, backup speciali e ripristini ora seguono tutti l'utente Android selezionato.
- Le app tornano più pronte e complete: i loro profili di compilazione ART e i permessi di ascolto notifiche, accessibilità ed esenzione batteria Doze vengono salvati e ripristinati.
- Ripristini più affidabili: proprietà dei file e contesto SELinux vengono riderivati sul dispositivo di destinazione, così il ripristino funziona tra dispositivi e utenti.
- Ripristini più sicuri: Play Protect e il verificatore di installazione vengono silenziati solo durante l'installazione e ripristinati esattamente; il gestore root non viene mai salvato né ripristinato; e la fonte di installazione viene verificata e registrata.
- Tag delle app: assegna alle app etichette libere come games o work, filtra l'elenco delle app per tag e salva un intero gruppo con tag in una volta.

## v1.03.2

Correzioni:

- La pagina di accesso al cloud sul dispositivo mostrava sempre "Sign-in failed", anche quando
  l'accesso era riuscito. Ora mostra il risultato reale.
- I backup salvati ora si possono aprire con un file manager: le cartelle di backup per app
  erano riservate al proprietario, quindi nemmeno un file manager root vi entrava; ora sono
  accessibili come il resto di /sdcard/VDBackup.

Destinazioni cloud:

- L'app companion opzionale di Google Drive ora viene compilata e inclusa, così Google Drive
  funziona tramite il companion sul dispositivo (l'account del dispositivo, senza incollare
  token a mano) oltre a rclone.

Interfaccia:

- La finestra di backup ha un selettore di destinazione, così un backup può andare a una
  destinazione cloud o remota scelta senza prima cambiare la destinazione predefinita.
- L'app controlla se c'è una versione più recente all'apertura (al massimo una volta all'ora) e
  mostra il banner di aggiornamento solo quando c'è; resta in silenzio se aggiornata o offline.

## v1.03.1

Nuovo ambito di backup :

- Nuove categorie di backup speciale : calendario (il provider del calendario, più
  un'esportazione portatile `calendar.json`), sfondo (sfondo della schermata Home e di
  blocco), DNS privato (modalità e specificatore) e impostazioni di sistema (il dump completo
  delle impostazioni system/global/secure). Le impostazioni di sistema sono opt-in e
  sovrascrivono le impostazioni dell'intero dispositivo al ripristino, quindi sono protette
  come SSAID, con consenso esplicito e una voce di audit completa.
- Backup autonomo di cartelle e file : fai il backup di qualsiasi percorso assoluto
  (archiviazione condivisa o dati dell'app) come archivio compresso e sigillato da manifesto,
  e ripristinalo nello stesso percorso. Il ripristino richiede una conferma esplicita.

Ripristino più sicuro :

- Ogni archivio viene controllato prima di scrivere qualsiasi cosa : un backup il cui
  contenuto punta fuori dal proprio bersaglio (un percorso assoluto o un componente `..`)
  viene rifiutato, così un ripristino eseguito come root non può essere ingannato a scrivere
  fuori dalla destinazione.

Avanzamento e pianificazione :

- L'avanzamento in tempo reale ora mostra la velocità di trasferimento, l'ETA e un contatore
  di elementi durante i backup, più un passo verificato tramite checksum per i caricamenti
  nel cloud e un controllo preventivo di "spazio insufficiente".
- I lavori pianificati possono essere condizionati : eseguiti solo in Wi-Fi, solo in carica,
  solo sopra un livello di batteria, o solo in giorni della settimana scelti ; un lavoro
  pianificato viene anche saltato mentre il dispositivo è criticamente caldo. Un lavoro
  saltato viene riprovato al tick successivo.

Destinazioni cloud :

- Collega qualsiasi backend rclone dall'interfaccia: il menu a tendina del remote cloud offre
  i provider popolari (Google Drive, Dropbox, OneDrive, Box, pCloud, Mega, Backblaze B2, S3,
  SFTP, WebDAV, FTP, SMB) più un'opzione "Custom (advanced)" dove digiti il nome di qualsiasi
  altro backend rclone e i suoi parametri `key=value`, così che tutti i backend di rclone
  siano raggiungibili.
- Accesso sul dispositivo (senza PC): i provider che richiedono un accesso tramite browser
  (Google Drive, Dropbox, OneDrive, Box, pCloud) hanno un pulsante "Authorize in browser" che
  apre il browser del telefono stesso sulla pagina di consenso del provider; dopo
  l'approvazione, torni all'app e il remote viene salvato automaticamente, con il token
  catturato sul dispositivo. Incollare un token a mano resta disponibile come ripiego.

Interfaccia :

- Una scala dell'interfaccia regolabile (un cursore trascinabile) ridimensiona l'intera
  interfaccia, in modo che si adatti a schermi di diverse densità di pixel ; 100% è il valore
  predefinito ed è invariato.
- L'interfaccia ora viene visualizzata da destra a sinistra per l'arabo e il persiano.
- Una panoramica iniziale con conteggi dei backup e una barra di archiviazione, badge di
  stato, copia negli appunti di hash e percorsi, interruttori in stile Android, e un'azione
  "Check for updates".
- Il log di attività è una schermata completa che si apre istantaneamente, con un'azione
  "Export logs" che salva un file di log che puoi allegare a una segnalazione.

Correzioni :

- Il ripristino e l'importazione non falliscono più sui dispositivi il cui `tar` incluso non
  accetta l'opzione `--no-absolute-names` ; il controllo di sicurezza dell'archivio è
  indipendente da quell'opzione.
- "Check for updates" funziona anche dove non è incluso alcun client HTTP, ripiegando sul
  rclone incluso ; e il log di attività non impiega più molto tempo ad aprirsi.

## v1.01

Prima versione pubblica. Un modulo WebUI per KernelSU/APatch/Magisk che esegue il backup e il ripristino di
app e dei loro dati interamente come root, senza richiesta di concessione.

Motore e formati:

- Motore di backup/ripristino eseguito come processo root distaccato (`setsid`): sopravvive alla chiusura
  della WebUI o del gestore di root, e l'interfaccia si riaggancia al progresso in tempo reale tramite `opid`.
- Tre modalità di backup: Full (tar.zst, locale o remoto), Snapshot (repository restic, cifrato
  e deduplicato) e Mirror (sincronizzazione 1:1 rclone/rsync). Gli APK sono sempre compressi,
  anche in un mirror.
- Elementi per app: APK (base + splits), `data`, `data_de`, `obb`, esterno e media.
  Il contesto SELinux, uid/gid, i modi e xattr/caps vengono preservati; il ripristino usa una
  sessione `pm install` e rimappa proprietario/contesto all'uid attivo.
- Consapevole del multi-utente (multi-user) in ogni fase. I backup sono archiviati sotto `/sdcard/VDBackup`
  (per utente), fuori da `/data/adb`, così da non essere leggibili prima del primo sblocco; ogni
  destinazione è isolata sotto `<path>/vdbackup`.
- Compressione: nessuna, lz4, zstd (livelli) o gzip ("modalità di compatibilità"). Un manifest JSON
  registra il dispositivo, il pacchetto (inclusa l'etichetta dell'app), gli elementi e i permessi.
- Cifratura portatile con `age` (keygen), oltre a una guida di RIPRISTINO su PC inclusa in ogni backup
  cifrato, così da poter essere decifrato ed estratto ovunque, senza il modulo.

Destinazioni e cloud:

- Destinazioni: aggiungi/elenca/prova/elimina (locale, remoto rclone, repository restic e un companion
  opzionale di Google Drive); le credenziali sono archiviate offuscate, mai in chiaro.
- Creare remote rclone dall'interfaccia/API (`remote-add`/`remote-list`/`remote-del`), così che qualsiasi
  backend cloud (SFTP, SMB, WebDAV, FTP, S3, Google Drive e altro) sia raggiungibile senza
  modificare `rclone.conf` a mano.
- Google Drive in due modi: via rclone (senza account Google Cloud) o tramite l'app companion headless
  opzionale (`ru.vd171.vdbackup`), che riporta un avviso obbligatorio di occultamento con [HMA-OSS](https://github.com/frknkrc44/HMA-OSS).
- Politica di rete: scegliere se i trasferimenti cloud possono usare qualsiasi connessione, solo Wi-Fi o
  solo dati mobili; applicata ai job manuali e pianificati. Le destinazioni locali sono esenti.

Importazione (migrazione):

- Importare da Neo-Backup, inclusi i backup cifrati con password (AES-256-GCM decifrato dall'
  helper dex; la WebUI richiede la password).
- Importare da Android-DataBackup (installare gli APK, estrarre gli archivi user/user_de/data, rimappare).
- Entrambi convalidati contro backup reali su più dispositivi.

Integrità e sicurezza:

- Ripristino fedele di tipo cancella-e-estrai; verifica sha256 per archivio (attiva per default su Full, e
  un controllo di integrità del repository per Snapshot), dry-run e restore-test. Gli archivi vengono riletti
  per verificarne la completezza; un archivio corrotto o un nome di pacchetto non valido non possono mai
  innescare un ripristino distruttivo, e i fallimenti di trasferimento remoto vengono segnalati, mai silenziosi.
- Ripristino selettivo: ripristina qualsiasi sottoinsieme degli elementi contenuti in un backup (APK, data, dati
  protetti, OBB, esterno, media), tutti selezionati per default.
- Elimina i backup dall'interfaccia/API (`delete-backup`) e ritenzione keep-last-N per i backup manuali
  (`prune`); ogni eliminazione, ripristino, potatura ed esecuzione pianificata viene scritta in un log di audit
  JSON locale consultabile nell'app.
- Permessi di runtime e AppOps catturati nel manifest e riapplicati al ripristino. Vengono catturati anche
  l'origine di installazione (installerPackageName) e lo stato abilitato/disabilitato, e riapplicati al ripristino.
- Spoofing dell'origine di installazione: per default un'app ripristinata riporta il Play Store come origine di
  installazione (impostata al momento dell'installazione tramite la sessione di installazione, poiché altrimenti
  un'app ripristinata sembra caricata lateralmente); commutabile globalmente e per singolo ripristino, e quando è
  disattivato viene mantenuta l'origine catturata. Una modalità "deep" avanzata opt-in forgia inoltre il pacchetto
  e l'origine iniziatori modificando il database dei pacchetti di sistema (prima un backup byte-esatto, si applica
  dopo un riavvio) così che l'app sembri completamente installata dallo store.
- SSAID (ANDROID_ID del dispositivo): strettamente opt-in e segnalato in modo evidente; consapevole di ABX; il
  file attivo viene sempre salvato byte per byte prima di qualsiasi sovrascrittura, per il rollback; si applica dopo un
  riavvio.
- Il ripristino e l'importazione richiedono un riconoscimento esplicito "questo sovrascrive i dati attuali dell'app"
  prima di procedere.

Pianificazione e automazione:

- Backup pianificati con ritenzione keep-N, gestiti da una scheda Schedule (per app, giornaliero/
  orario/settimanale con un orario opzionale, modalità e destinazione).
- Backup automatico all'installazione o all'aggiornamento: un osservatore opt-in cavalca il battito dello
  scheduler, esegue il backup delle app nuove o aggiornate in background, e si limita a inizializzare alla prima
  esecuzione così che abilitarlo non esegua mai il backup di tutto in una volta. Rispetta l'impostazione delle
  app escluse (blocklist).

Backup speciali (a livello di sistema):

- Esegue il backup di messaggi (SMS/MMS), contatti e registro chiamate, Wi-Fi e Bluetooth come dati di
  sistema grezzi e archiviati fedelmente (stessa conservazione SELinux/xattr e stessa cifratura age opzionale dei
  backup di app). Il ripristino è fedele sullo stesso dispositivo/stessa ROM, richiede un riavvio, ed è protetto
  da un riconoscimento prominente di sovrascrittura-e-riavvio.
- Esportazione portatile opzionale accanto all'archivio grezzo: messaggi, registro chiamate e contatti vengono
  scritti anche come JSON apribile (letto con il sqlite3 impacchettato direttamente dai database dei provider,
  così che i corpi dei messaggi con virgole o a capo sopravvivano intatti), fornendo una copia multi-dispositivo
  che non necessita del modulo. La copia portatile è cifrata anch'essa quando il backup è cifrato, così da non
  far mai trapelare ciò che l'archivio protegge.

Integrazione di sistema:

- Monta un'app installata come app di sistema senza toccare la partizione /system reale: VDBackup prepara
  l'APK (o gli APK) dell'app in un proprio sottomodulo overlay, che il gestore root monta. Con NoMount su KernelSU
  viene iniettato a caldo (senza riavvio); altrimenti si applica al boot successivo, così da non dipendere mai
  dall'avere NoMount installato. Scegli il posizionamento regolare o privilegiato.

WebUI:

- L'elenco delle app mostra il vero nome localizzato dell'app (risolto dall'APK, così da sopravvivere a una
  disinstallazione) accanto al pacchetto, con icone caricate su richiesta e in cache, rese come riquadri
  arrotondati e consapevoli delle icone adattive.
- Tocca un'app per aprirne la cronologia dei backup e ripristinare qualsiasi backup precedente; la scheda Backups
  mostra nome e pacchetto su righe separate e apre un foglio di dettagli per ogni backup (versione,
  origine di installazione, stato, data, dimensione, elementi, conteggio dei permessi, dispositivo).
- Filtra l'elenco delle app per utente/sistema/tutte e ordina per nome o pacchetto; seleziona più app e
  eseguine il backup in un unico batch; escludi app dai backup automatici e pianificati.
- Scegli cosa includere e attiva verify o dry-run per singolo backup; scegli un ripristino di solo test che
  estrae in staging senza toccare l'app in uso.
- Tema chiaro/scuro, un selettore del colore d'accento, selettore della lingua, una scheda Info (con i
  progetti fratelli e il manifesto di audit dei binari impacchettati), un selettore di cartelle per la
  destinazione locale, progresso dell'operazione localizzato con feedback istantaneo e dialoghi moderni
  nell'app (nessun pop-up di alert/confirm del sistema).
- La navigazione con il tasto Indietro torna alla scheda precedente e chiude prima i dialoghi; i dialoghi sono
  fluttuanti e l'app sopravvive alla riapertura riagganciandosi alle operazioni in tempo reale.

AI-friendly e i18n:

- Una superficie di controllo JSON documentata affinché gli agenti amministrino ogni azione in modo headless
  (`docs/AI-AGENTS.md`); la WebUI è solo uno dei client di quell'API.
- Il README e tutta la documentazione del progetto sono tradotti nelle 21 lingue standard
  (`docs/<lang>/`), con i docs rispecchiati sul wiki.
- L'elenco ricco delle app e la decifratura di Neo passano attraverso un helper dex pilotato come root
  (`IPackageManager` tramite ServiceManager), così che funzionino dove ActivityThread si blocca.

*Questa documentazione è stata generata con Claude (Anthropic) ed è mantenuta da VD171. Correzioni e miglioramenti sono benvenuti, vedi [CONTRIBUTING.md](CONTRIBUTING.md).*
