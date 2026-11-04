> **Languages:** [English](../BINARIES.md) · [العربية](../ar/BINARIES.md) · [Čeština](../cs/BINARIES.md) · [Deutsch](../de/BINARIES.md) · [Español](../es/BINARIES.md) · [فارسی](../fa/BINARIES.md) · [Français](../fr/BINARIES.md) · [हिन्दी](../hi/BINARIES.md) · [Bahasa Indonesia](../in/BINARIES.md) · Italiano · [日本語](../ja/BINARIES.md) · [한국어](../ko/BINARIES.md) · [Nederlands](../nl/BINARIES.md) · [Polski](../pl/BINARIES.md) · [Português](../pt/BINARIES.md) · [Русский](../ru/BINARIES.md) · [Svenska](../sv/BINARIES.md) · [ไทย](../th/BINARIES.md) · [Türkçe](../tr/BINARIES.md) · [Tiếng Việt](../vi/BINARIES.md) · [中文](../zh/BINARIES.md)

---

# Binari inclusi: provenienza e audit

La privacy e la sicurezza non sono opzionali in VDBackup. Uno strumento di backup viene
eseguito come root sui tuoi dati più personali, quindi devi poter vedere esattamente cosa viene
incluso al suo interno. Questa pagina documenta ogni binario e libreria precompilati che il
modulo trasporta, da dove proviene ciascuno e come verificare che non sia stato introdotto
nulla di opaco.

## Principi

- **Niente di opaco.** Ogni binario e libreria inclusi sono tracciabili fino a un upstream
  pubblico e nominato a una versione fissata, con una SHA-256 registrata. Nessun blob viene
  incluso senza una voce che puoi controllare.
- **Prelevato dall'upstream, mai da un dispositivo.** Gli strumenti nativi provengono dal
  repository di pacchetti ufficiale di Termux (i file `.deb` firmati su `packages.termux.dev/apt`),
  mai copiati da un Termux installato su un telefono. La build fallisce rumorosamente, non
  improvvisa mai.
- **Riproducibile.** Riesegui la build e ottieni gli stessi file; riscarica le sorgenti fissate e
  i valori SHA-256 corrispondono.
- **La traccia di audit viene inclusa con il modulo.** Non è solo sul sito web - viaggia
  all'interno del modulo installato, sul tuo dispositivo, così puoi fare audit offline.

## Cosa viene incluso, e da dove

| Artefatto | Sorgente | Come viene costruito |
|---|---|---|
| `bin/<abi>/` strumenti nativi (`tar`, `zstd`, `gzip`, `lz4`, `jq`, `rclone`, `restic`, `rsync`, `ssh`/`scp`/`sftp`, `age`, `age-keygen`, `script`, `sqlite3`) + la loro closure `lib/` | Repo apt **Termux** ufficiale (`packages.termux.dev/apt`), pacchetti `.deb` ufficiali | `.github/scripts/build_bin.sh` scarica i file `.deb` + le loro dipendenze transitive, li estrae e copia i binari più solo le librerie condivise di cui ciascuno ha bisogno |
| `bin/<abi>/abx2xml`, `bin/<abi>/xml2abx` (ripiego del convertitore ABX) | Release GitHub di **rhythmcache/android-xml-converter** (`ABX_RELEASE`, ELF statico) | scaricato dalla release fissata da `build_bin.sh` |
| `companion.apk` (companion Google Drive opzionale) | **Questo repository**, `companion/` (Gradle/Kotlin) | costruito dai sorgenti dalla CI e firmato con la chiave del progetto (`VD_Key`); non è un blob precompilato |
| `vdbhelper.dex` (helper framework) | **Questo repository**, `dex/src/` (Java) | compilato dai sorgenti dalla CI con `javac` + `d8` |

Solo le prime due righe sono binari di terze parti precompilati; le ultime due sono costruite da
sorgenti che vivono in questo repository e possono essere lette e ricostruite.

> **Edizioni Full vs lite.** Le edizioni lite omettono solo `rclone` e `restic` (i due binari più grandi) per restare piccole; `rsync` e `ssh`/`scp`/`sftp` sono ancora presenti, e ogni altro binario elencato sopra è presente anch'esso. Le edizioni Full aggiungono `rclone` (provider cloud) e `restic` (snapshot).

## Il manifest sul dispositivo: `PROVENANCE.json`

`build_bin.sh` scrive un `bin/<abi>/PROVENANCE.json` per ABI. All'installazione il modulo mantiene
solo l'ABI del tuo dispositivo, quindi quel file resta sul dispositivo in
`/data/adb/modules/vdbackup/bin/<abi>/PROVENANCE.json`. Registra:

- `sources`: ogni `.deb` di upstream (pacchetto, versione, URL completo, SHA-256 del `.deb`) e la
  release ABX (URL, SHA-256 dell'archivio).
- `files`: ogni file effettivamente incluso sotto `bin/<abi>/` (percorso, dimensione, SHA-256).

Puoi leggerlo nella WebUI (la scheda **Info** vi rimanda) o tramite l'API agente:

```sh
sh /data/adb/modules/vdbackup/helper.sh provenance '' | jq .
```

## Come verificare (passo per passo)

1. **Controlla i file inclusi.** Calcola l'hash di ogni file sotto `bin/<abi>/` sul tuo dispositivo
   e confrontalo con `files[].sha256` in `PROVENANCE.json`:
   ```sh
   cd /data/adb/modules/vdbackup/bin/<abi>
   sha256sum tar zstd jq rclone ... lib/*
   ```
2. **Controlla i file rispetto all'upstream.** Per ogni voce `sources[]`, scarica il `.deb` fissato
   dal suo URL, conferma che la sua SHA-256 corrisponda a `deb_sha256`, estrailo e conferma che i
   binari/librerie che contiene producano gli stessi valori inclusi. I file `.deb` nel repo di Termux
   sono a loro volta serviti dal repository apt firmato di Termux.
3. **Ricostruisci da zero.** Esegui tu stesso `.github/scripts/build_bin.sh` (richiede solo `curl`,
   `ar`, `tar`, `xz`, `zstd`, `readelf`) e confronta l'output con ciò che è stato incluso.
4. **Companion e dex.** Ricostruisci `companion/` e `dex/` dai sorgenti; la firma del companion è la
   chiave del progetto `VD_Key` (SHA-256
   `F3:F8:2B:B9:2F:2C:69:A1:75:90:1D:40:BD:65:DD:A6:8F:2B:B5:88:69:77:F5:EA:8B:BA:AA:51:40:E5:25:2B`).

## Segnalazione

Se un file incluso non corrisponde alla sua sorgente registrata, trattalo come un problema di
sicurezza e segnalalo (vedi [SECURITY.md](SECURITY.md)). Questo è esattamente il tipo di
discrepanza che questo manifest esiste per rendere visibile.
