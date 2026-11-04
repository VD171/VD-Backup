> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · Italiano · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# Contribuire a VDBackup

Grazie per l'aiuto! VDBackup è pensato per essere facile a cui contribuire. Questa guida ti dice
dove si trovano le cose e le poche convenzioni che seguiamo.

## Il progetto in breve

VDBackup è un **modulo WebUI per KernelSU/APatch/Magisk**: script shell + una
WebUI in vanilla JS + binari statici per ABI. Nessuna app è richiesta per le funzionalità principali. Vedi
[ARCHITECTURE.md](ARCHITECTURE.md) e [docs/FILE-STRUCTURE.md](docs/FILE-STRUCTURE.md).

È il **successore** aperto e root-native di **Swift Backup, Neo-Backup e
Android-DataBackup** - l'unione delle loro funzionalità sotto AGPLv3, con l'importazione dei backup
esistenti di Neo-Backup e Android-DataBackup così che le persone possano migrare.

## Contributori IA benvenuti

Gli assistenti e gli agenti IA sono qui contributori di prima classe, non un ripensamento.

- Il progetto è costruito per essere leggibile dalle macchine: ogni verbo di `helper.sh` stampa un singolo
  oggetto JSON, il motore è pura shell POSIX e la disposizione dei file è documentata in
  [docs/FILE-STRUCTURE.md](docs/FILE-STRUCTURE.md).
- Un agente può amministrare **ogni** contenuto e azione del modulo in modo headless attraverso
  quell'API JSON - l'intera superficie di controllo, i verbi e le protezioni di sicurezza sono in
  [docs/AI-AGENTS.md](docs/AI-AGENTS.md).
- Le patch assistite da IA vengono riviste e accettate alle stesse condizioni di qualsiasi altra - per
  correttezza, chiarezza e le convenzioni qui sotto, non per chi (o cosa) le ha scritte.
- Se guidi VDBackup da un agente, usa l'output JSON di `helper.sh` come
  contratto; non fare scraping della WebUI.
- Stesso standard per tutti: le funzionalità reali non vengono mai indebolite, i segreti e i dati del dispositivo
  non finiscono mai nel repository (vedi il rigoroso [.gitignore](.gitignore)), e le azioni che
  modificano lo stato restano confermate e tracciate.

## Setup di sviluppo

- Serve un dispositivo/emulatore con root (KernelSU, APatch o Magisk) per testare.
- Costruisci lo zip flashabile: `cd module && zip -r9 ../VD-Backup-dev.zip .` poi flashalo.
- La WebUI è `module/webroot/` (aprila dal gestore root). Il backend è
  `module/helper.sh` (dispatcher) e `module/worker.sh` (motore distaccato).
- I binari nativi risiedono in `module/bin/<abi>/` e sono prodotti dalla CI
  (`.github/scripts/build_bin.sh`); normalmente non li ricompili a mano.

## Convenzioni

- **Ogni file sorgente** (`.sh`, `.js`, `.css`, `.html`, `.svg`, `.yml`) inizia con
  l'intestazione banner del progetto (copiala da qualsiasi file esistente). Nessuna eccezione.
- **Codice e commenti in inglese.** Mantieni i commenti al minimo e solo dove necessario.
- **Nessun em-dash o en-dash**; usa sempre un semplice trattino `-`.
- La WebUI è in **vanilla JS** (un solo `scripts.js`); nessun framework. Comunica con root solo attraverso
  il wrapper `helper(verb, args)`, ed effettua l'escape di ogni valore interpolato.
- **Non indebolire mai** una funzionalità reale (ad es. la preservazione di SELinux/uid/gid/modi).
- Le azioni che modificano lo stato (ripristino, eliminazione) devono chiedere conferma e scrivere un log di audit.

## Internazionalizzazione (i18n)

- Le stringhe dell'interfaccia risiedono in `module/webroot/lang/`. L'inglese è il fallback canonico
  (`en.js` + `en.json`); le altre 20 lingue sono `<code>.json`.
- Per aggiungere o modificare una stringa: modifica `en.js` **e** `en.json`, poi aggiorna ogni
  `<code>.json`. Toccare un'etichetta visibile significa aggiornare **tutti** i file di lingua e
  **tutti** i `README.<code>.md`.
- Le traduzioni sono semplice JSON - un ottimo primo contributo. Vedi l'elenco delle lingue in
  `module/webroot/i18n.js`.

## Commit e PR

- Mantieni le PR focalizzate. Descrivi cosa e perché.
- Firma i tuoi commit (DCO): `git commit -s` (aggiunge `Signed-off-by:`).
- La CI deve restare verde. Sii gentile nelle revisioni - vedi [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Buone prime issue

Cerca le etichette `good first issue` e `help wanted`. Traduzioni, documentazione, nuovi
preset di destinazione `rclone` e rifiniture della WebUI sono tutti ottimi punti di partenza.
