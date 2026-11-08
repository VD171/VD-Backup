> **Languages:** [English](../BINARIES.md) · [العربية](../ar/BINARIES.md) · [Čeština](../cs/BINARIES.md) · Deutsch · [Español](../es/BINARIES.md) · [فارسی](../fa/BINARIES.md) · [Français](../fr/BINARIES.md) · [हिन्दी](../hi/BINARIES.md) · [Bahasa Indonesia](../in/BINARIES.md) · [Italiano](../it/BINARIES.md) · [日本語](../ja/BINARIES.md) · [한국어](../ko/BINARIES.md) · [Nederlands](../nl/BINARIES.md) · [Polski](../pl/BINARIES.md) · [Português](../pt/BINARIES.md) · [Русский](../ru/BINARIES.md) · [Svenska](../sv/BINARIES.md) · [ไทย](../th/BINARIES.md) · [Türkçe](../tr/BINARIES.md) · [Tiếng Việt](../vi/BINARIES.md) · [中文](../zh/BINARIES.md)

---

# Mitgelieferte Binärdateien: Herkunft und Prüfung

Datenschutz und Sicherheit sind in VDBackup nicht optional. Ein Backup-Tool läuft als root
über Ihre persönlichsten Daten, daher müssen Sie genau sehen können, was darin mitgeliefert
wird. Diese Seite dokumentiert jede vorgebaute Binärdatei und Bibliothek, die das Modul
mitbringt, woher jede stammt und wie Sie überprüfen, dass nichts Undurchsichtiges
eingeschleust wurde.

## Grundsätze

- **Nichts Undurchsichtiges.** Jede mitgelieferte Binärdatei und Bibliothek ist auf einen
  benannten, öffentlichen Upstream mit fixierter Version zurückführbar, mit einer erfassten
  SHA-256. Kein Blob wird ohne einen Eintrag mitgeliefert, den Sie prüfen können.
- **Vom Upstream geholt, nie von einem Gerät.** Native Werkzeuge stammen aus dem offiziellen
  Termux-Paket-Repository (die signierten `.deb`-Dateien unter `packages.termux.dev/apt`), nie
  aus einem auf irgendeinem Telefon installierten Termux kopiert. Der Build schlägt laut fehl,
  er improvisiert nie.
- **Reproduzierbar.** Führen Sie den Build erneut aus und Sie erhalten dieselben Dateien; holen
  Sie die fixierten Quellen erneut und die SHA-256-Werte stimmen überein.
- **Der Prüfpfad wird mit dem Modul mitgeliefert.** Er steht nicht nur auf der Website - er
  reist im installierten Modul mit, auf Ihrem Gerät, sodass Sie offline prüfen können.

## Was mitgeliefert wird und woher

| Artefakt | Quelle | Wie es gebaut wird |
|---|---|---|
| `bin/<abi>/` native Werkzeuge (`tar`, `zstd`, `gzip`, `lz4`, `jq`, `rclone`, `restic`, `rsync`, `ssh`/`scp`/`sftp`, `age`, `age-keygen`, `script`, `sqlite3`) + ihre `lib/`-Closure | Offizielles **Termux**-apt-Repo (`packages.termux.dev/apt`), offizielle `.deb`-Pakete | `.github/scripts/build_bin.sh` lädt die `.deb`-Dateien + ihre transitiven Abhängigkeiten herunter, extrahiert sie und kopiert die Binärdateien sowie nur die gemeinsam genutzten Bibliotheken, die jede benötigt |
| `bin/<abi>/abx2xml`, `bin/<abi>/xml2abx` (ABX-Konverter-Fallback) | **rhythmcache/android-xml-converter** GitHub-Release (`ABX_RELEASE`, statisches ELF) | von `build_bin.sh` aus dem fixierten Release heruntergeladen |
| `companion.apk` (optionaler Google-Drive-Begleiter) | **Dieses Repository**, `companion/` (Gradle/Kotlin) | von der CI aus dem Quellcode gebaut und mit dem Projektschlüssel (`VD_Key`) signiert; kein vorgebauter Blob |
| `vdbackup_helper.dex` (Framework-Helfer) | **Dieses Repository**, `dex/src/` (Java) | von der CI aus dem Quellcode mit `javac` + `d8` kompiliert |

Nur die ersten beiden Zeilen sind vorgebaute Drittanbieter-Binärdateien; die letzten beiden
werden aus Quellcode gebaut, der in diesem Repository liegt und gelesen und neu gebaut werden
kann.

> **Full- vs. lite-Editionen.** Die lite-Editionen lassen nur `rclone` und `restic` (die zwei größten Binärdateien) weg, um klein zu bleiben, und laden sie bei Bedarf (per SHA-256 verifiziert) beim ersten Nutzen eines Cloud-Ziels oder des Snapshot-Modus nach; `rsync` und `ssh`/`scp`/`sftp` sind weiterhin vorhanden, und jede andere oben aufgeführte Binärdatei ist ebenfalls vorhanden. Die Full-Editionen liefern `rclone` (Cloud-Anbieter) und `restic` (Snapshots) eingebettet, sodass nie etwas heruntergeladen wird.

## Das Manifest auf dem Gerät: `PROVENANCE.json`

`build_bin.sh` schreibt eine `bin/<abi>/PROVENANCE.json` pro ABI. Bei der Installation behält das
Modul nur die ABI Ihres Geräts, sodass diese Datei auf dem Gerät unter
`/data/adb/modules/vdbackup/bin/<abi>/PROVENANCE.json` verbleibt. Sie erfasst:

- `sources`: jedes Upstream-`.deb` (Paket, Version, vollständige URL, SHA-256 des `.deb`) und
  das ABX-Release (URL, SHA-256 des Archivs).
- `files`: jede tatsächlich unter `bin/<abi>/` mitgelieferte Datei (Pfad, Größe, SHA-256).

Sie können es in der WebUI lesen (der Tab **Über** verlinkt darauf) oder über die Agent-API:

```sh
sh /data/adb/modules/vdbackup/helper.sh provenance '' | jq .
```

## Wie man prüft (Schritt für Schritt)

1. **Prüfen Sie die mitgelieferten Dateien.** Hashen Sie jede Datei unter `bin/<abi>/` auf Ihrem
   Gerät und vergleichen Sie sie mit `files[].sha256` in `PROVENANCE.json`:
   ```sh
   cd /data/adb/modules/vdbackup/bin/<abi>
   sha256sum tar zstd jq rclone ... lib/*
   ```
2. **Prüfen Sie die Dateien gegen den Upstream.** Laden Sie für jeden `sources[]`-Eintrag das
   fixierte `.deb` von seiner URL herunter, bestätigen Sie, dass seine SHA-256 mit `deb_sha256`
   übereinstimmt, extrahieren Sie es und bestätigen Sie, dass die darin enthaltenen
   Binärdateien/Bibliotheken zu denselben mitgelieferten Werten hashen. Die `.deb`-Dateien im
   Termux-Repo werden selbst aus dem signierten apt-Repository von Termux ausgeliefert.
3. **Von Grund auf neu bauen.** Führen Sie `.github/scripts/build_bin.sh` selbst aus (benötigt nur
   `curl`, `ar`, `tar`, `xz`, `zstd`, `readelf`) und vergleichen Sie die Ausgabe mit dem, was
   mitgeliefert wurde.
4. **Begleiter und dex.** Bauen Sie `companion/` und `dex/` aus dem Quellcode neu; die Signatur des
   Begleiters ist der Projektschlüssel `VD_Key` (SHA-256
   `F3:F8:2B:B9:2F:2C:69:A1:75:90:1D:40:BD:65:DD:A6:8F:2B:B5:88:69:77:F5:EA:8B:BA:AA:51:40:E5:25:2B`).

## Melden

Wenn eine mitgelieferte Datei nicht zu ihrer erfassten Quelle passt, behandeln Sie es als
Sicherheitsproblem und melden Sie es (siehe [SECURITY.md](SECURITY.md)). Genau diese Art von
Abweichung soll dieses Manifest sichtbar machen.

*Diese Dokumentation wurde mit Claude (Anthropic) erstellt und wird von VD171 gepflegt. Korrekturen und Verbesserungen sind willkommen - siehe [CONTRIBUTING.md](CONTRIBUTING.md).*
