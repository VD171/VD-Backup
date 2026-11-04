> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · Nederlands · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# Bijdragen aan VDBackup

Bedankt voor je hulp! VDBackup is bedoeld om er makkelijk aan bij te dragen. Deze gids vertelt
je waar dingen staan en de paar conventies die we volgen.

## Het project in een oogopslag

VDBackup is een **KernelSU/APatch/Magisk WebUI-module**: shellscripts + een vanilla-JS-
WebUI + statische binaries per ABI. Geen app vereist voor de kernfuncties. Zie
[ARCHITECTURE.md](ARCHITECTURE.md) en [docs/FILE-STRUCTURE.md](docs/FILE-STRUCTURE.md).

Het is de open, root-native **opvolger van Swift Backup, Neo-Backup en
Android-DataBackup** - de vereniging van hun functies onder AGPLv3, met import van
bestaande Neo-Backup- en Android-DataBackup-backups zodat mensen kunnen migreren.

## AI-bijdragers welkom

AI-assistenten en -agenten zijn hier eersteklas bijdragers, geen bijzaak.

- Het project is gebouwd om machineleesbaar te zijn: elk `helper.sh`-werkwoord print een enkel
  JSON-object, de engine is pure POSIX-shell, en de bestandsindeling is gedocumenteerd in
  [docs/FILE-STRUCTURE.md](docs/FILE-STRUCTURE.md).
- Een agent kan **elke** inhoud en actie van de module headless beheren via
  die JSON-API - het volledige besturingsoppervlak, de werkwoorden en veiligheidsmaatregelen staan in
  [docs/AI-AGENTS.md](docs/AI-AGENTS.md).
- Door AI geassisteerde patches worden beoordeeld en geaccepteerd op dezelfde voorwaarden als elke andere - op
  correctheid, duidelijkheid en de onderstaande conventies, niet op wie (of wat) ze schreef.
- Als je VDBackup vanuit een agent aanstuurt, gebruik dan de JSON-uitvoer van `helper.sh` als het
  contract; schraap de WebUI niet.
- Dezelfde lat voor iedereen: echte functies worden nooit verzwakt, geheimen en apparaatgegevens
  belanden nooit in de repo (zie de strikte [.gitignore](.gitignore)), en muterende
  acties blijven bevestigd en geaudit.

## Dev-opzet

- Je hebt een geroot apparaat/emulator nodig (KernelSU, APatch of Magisk) om te testen.
- Bouw de flashbare zip: `cd module && zip -r9 ../VD-Backup-dev.zip .` en flash hem dan.
- De WebUI is `module/webroot/` (open hem vanuit de rootmanager). De backend is
  `module/helper.sh` (dispatcher) en `module/worker.sh` (losgekoppelde engine).
- Native binaries staan in `module/bin/<abi>/` en worden geproduceerd door CI
  (`.github/scripts/build_bin.sh`); je bouwt ze normaal gesproken niet met de hand opnieuw.

## Conventies

- **Elk bronbestand** (`.sh`, `.js`, `.css`, `.html`, `.svg`, `.yml`) begint met de
  project-bannerheader (kopieer hem van een bestaand bestand). Geen uitzonderingen.
- **Code en commentaar in het Engels.** Houd commentaar minimaal en alleen waar nodig.
- **Geen em-dash of en-dash**; gebruik altijd een gewone koppelstreep `-`.
- WebUI is **vanilla JS** (één `scripts.js`); geen frameworks. Praat alleen met root via
  de `helper(verb, args)`-wrapper, en escape elke geïnterpoleerde waarde.
- **Verzwak nooit** een echte functie (bijv. behoud van SELinux/uid/gid/modes).
- Muterende acties (restore, delete) moeten om bevestiging vragen en een auditlog schrijven.

## Internationalisatie (i18n)

- UI-strings staan in `module/webroot/lang/`. Engels is de canonieke fallback
  (`en.js` + `en.json`); de andere 20 talen zijn `<code>.json`.
- Een string toevoegen of wijzigen: bewerk `en.js` **en** `en.json`, en werk dan elke
  `<code>.json` bij. Een zichtbaar label aanraken betekent **alle** taalbestanden en
  **alle** `README.<code>.md` bijwerken.
- Vertalingen zijn gewone JSON - een geweldige eerste bijdrage. Zie de talenlijst in
  `module/webroot/i18n.js`.

## Commits & PRs

- Houd PRs gericht. Beschrijf wat en waarom.
- Teken je commits af (DCO): `git commit -s` (voegt `Signed-off-by:` toe).
- CI moet groen blijven. Wees vriendelijk in reviews - zie [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Goede eerste issues

Zoek naar de labels `good first issue` en `help wanted`. Vertalingen, docs, nieuwe
`rclone`-bestemmingspresets en WebUI-afwerking zijn allemaal geweldige startpunten.
