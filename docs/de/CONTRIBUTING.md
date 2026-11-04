> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · Deutsch · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# Zu VDBackup beitragen

Danke fürs Mithelfen! VDBackup soll leicht sein, um dazu beizutragen. Dieser Leitfaden erklärt dir,
wo die Dinge liegen und die wenigen Konventionen, die wir befolgen.

## Das Projekt auf einen Blick

VDBackup ist ein **KernelSU/APatch/Magisk-WebUI-Modul**: Shell-Skripte + eine vanilla-JS-WebUI +
statische Binärdateien pro ABI. Für die Kernfunktionen ist keine App erforderlich. Siehe
[ARCHITECTURE.md](ARCHITECTURE.md) und [docs/FILE-STRUCTURE.md](docs/FILE-STRUCTURE.md).

Es ist der offene, root-native **Nachfolger von Swift Backup, Neo-Backup und
Android-DataBackup** - die Vereinigung ihrer Funktionen unter AGPLv3, mit Import vorhandener
Neo-Backup- und Android-DataBackup-Backups, damit Leute migrieren können.

## KI-Mitwirkende willkommen

KI-Assistenten und -Agenten sind hier erstklassige Mitwirkende, kein nachträglicher Einfall.

- Das Projekt ist maschinenlesbar aufgebaut: jedes `helper.sh`-Verb gibt ein einzelnes
  JSON-Objekt aus, die Engine ist reine POSIX-Shell, und das Dateilayout ist in
  [docs/FILE-STRUCTURE.md](docs/FILE-STRUCTURE.md) dokumentiert.
- Ein Agent kann **jeden** Inhalt und jede Aktion des Moduls headless über diese JSON-API
  verwalten - die vollständige Steuerungsfläche, Verben und Sicherheitsleitplanken stehen in
  [docs/AI-AGENTS.md](docs/AI-AGENTS.md).
- KI-unterstützte Patches werden zu denselben Bedingungen geprüft und akzeptiert wie alle anderen -
  nach Korrektheit, Klarheit und den Konventionen unten, nicht danach, wer (oder was) sie geschrieben hat.
- Wenn du VDBackup von einem Agenten aus steuerst, nutze die JSON-Ausgabe von `helper.sh` als
  Vertrag; scrape nicht die WebUI.
- Gleicher Maßstab für alle: echte Funktionen werden nie geschwächt, Geheimnisse und Gerätedaten
  landen nie im Repo (siehe die strikte [.gitignore](.gitignore)), und verändernde
  Aktionen bleiben bestätigt und protokolliert.

## Dev-Setup

- Du brauchst ein gerootetes Gerät/einen Emulator (KernelSU, APatch oder Magisk) zum Testen.
- Baue das flashbare Zip: `cd module && zip -r9 ../VD-Backup-dev.zip .` und flashe es dann.
- Die WebUI ist `module/webroot/` (öffne sie aus dem Root-Manager). Das Backend ist
  `module/helper.sh` (Dispatcher) und `module/worker.sh` (abgekoppelte Engine).
- Native Binärdateien liegen in `module/bin/<abi>/` und werden von der CI erzeugt
  (`.github/scripts/build_bin.sh`); normalerweise baust du sie nicht von Hand neu.

## Konventionen

- **Jede Quelldatei** (`.sh`, `.js`, `.css`, `.html`, `.svg`, `.yml`) beginnt mit dem
  Projekt-Banner-Header (kopiere ihn aus einer beliebigen vorhandenen Datei). Keine Ausnahmen.
- **Code und Kommentare auf Englisch.** Halte Kommentare minimal und nur dort, wo nötig.
- **Kein Geviert- oder Halbgeviertstrich**; verwende immer einen einfachen Bindestrich `-`.
- Die WebUI ist **vanilla JS** (ein `scripts.js`); keine Frameworks. Sprich mit Root nur über
  den `helper(verb, args)`-Wrapper und maskiere jeden interpolierten Wert.
- **Schwäche nie** eine echte Funktion (z.B. Erhalt von SELinux/uid/gid/Modi).
- Verändernde Aktionen (Restore, Delete) müssen eine Bestätigung verlangen und ein Audit-Log schreiben.

## Internationalisierung (i18n)

- UI-Strings liegen in `module/webroot/lang/`. Englisch ist der kanonische Fallback
  (`en.js` + `en.json`); die anderen 20 Sprachen sind `<code>.json`.
- Um einen String hinzuzufügen oder zu ändern: bearbeite `en.js` **und** `en.json`, dann aktualisiere jede
  `<code>.json`. Ein sichtbares Label zu berühren bedeutet, **alle** Sprachdateien und
  **alle** `README.<code>.md` zu aktualisieren.
- Übersetzungen sind reines JSON - ein großartiger erster Beitrag. Siehe die Sprachliste in
  `module/webroot/i18n.js`.

## Commits & PRs

- Halte PRs fokussiert. Beschreibe was und warum.
- Zeichne deine Commits ab (DCO): `git commit -s` (fügt `Signed-off-by:` hinzu).
- Die CI muss grün bleiben. Sei freundlich in Reviews - siehe [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Gute erste Issues

Halte Ausschau nach den Labels `good first issue` und `help wanted`. Übersetzungen, Docs, neue
`rclone`-Ziel-Presets und WebUI-Feinschliff sind alle großartige Ausgangspunkte.
