> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · Svenska · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Українська](../uk/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# Bidra till VDBackup

Tack för att du hjälper till! VDBackup är tänkt att vara lätt att bidra till. Den här guiden berättar
var saker finns och de få konventioner vi följer.

## Projektet i korthet

VDBackup är en **KernelSU/APatch/Magisk-WebUI-modul**: shell-skript + ett vanilla-JS-
WebUI + statiska binärer per ABI. Ingen app krävs för kärnfunktionerna. Se
[ARCHITECTURE.md](ARCHITECTURE.md) och [docs/FILE-STRUCTURE.md](FILE-STRUCTURE.md).

Det är den öppna, root-native **efterföljaren till Swift Backup, Neo-Backup och
Android-DataBackup**: unionen av deras funktioner under AGPLv3, med import av
befintliga Neo-Backup- och Android-DataBackup-säkerhetskopior så att folk kan migrera.

## AI-bidragsgivare välkomna

AI-assistenter och agenter är förstklassiga bidragsgivare här, inte en eftertanke.

- Projektet är byggt för att vara maskinläsbart: varje `helper.sh`-verb skriver ut ett enda
  JSON-objekt, motorn är ren POSIX-shell, och fillayouten är dokumenterad i
  [docs/FILE-STRUCTURE.md](FILE-STRUCTURE.md).
- En agent kan administrera **varje** innehåll och åtgärd i modulen headless genom
  det där JSON-API:et, hela kontrollytan, verben och säkerhetsspärrarna finns i
  [docs/AI-AGENTS.md](AI-AGENTS.md).
- AI-assisterade patchar granskas och accepteras på samma villkor som alla andra, efter
  korrekthet, tydlighet och konventionerna nedan, inte efter vem (eller vad) som skrev dem.
- Om du styr VDBackup från en agent, använd JSON-utdatan från `helper.sh` som
  kontrakt; skrapa inte WebUI.
- Samma ribba för alla: riktiga funktioner försvagas aldrig, hemligheter och enhetsdata
  landar aldrig i repot (se den strikta [.gitignore](.gitignore)), och muterande
  åtgärder förblir bekräftade och granskade.

## Utvecklingsuppsättning

- Du behöver en rootad enhet/emulator (KernelSU, APatch eller Magisk) för att testa.
- Bygg den flashbara zip-filen: `cd module && zip -r9 ../VD-Backup-dev.zip .` och flasha den sedan.
- WebUI:n är `module/webroot/` (öppna den från root-hanteraren). Backenden är
  `module/helper.sh` (dispatcher) och `module/worker.sh` (frånkopplad motor).
- Native-binärer bor i `module/bin/<abi>/` och produceras av CI
  (`.github/scripts/build_bin.sh`); du bygger dem normalt inte om för hand.

## Konventioner

- **Varje källfil** (`.sh`, `.js`, `.css`, `.html`, `.svg`, `.yml`) börjar med
  projektbanner-headern (kopiera den från valfri befintlig fil). Inga undantag.
- **Kod och kommentarer på engelska.** Håll kommentarerna minimala och bara där de behövs.
- **Ingen em-dash eller en-dash**; använd alltid ett vanligt bindestreck `-`.
- WebUI är **vanilla JS** (en `scripts.js`); inga ramverk. Prata med root endast genom
  `helper(verb, args)`-omslaget, och escapea varje interpolerat värde.
- **Försvaga aldrig** en riktig funktion (t.ex. bevarande av SELinux/uid/gid/modes).
- Muterande åtgärder (restore, delete) måste be om bekräftelse och skriva en revisionslogg.

## Internationalisering (i18n)

- UI-strängar bor i `module/webroot/lang/`. Engelska är den kanoniska fallbacken
  (`en.js` + `en.json`); de andra 20 språken är `<code>.json`.
- För att lägga till eller ändra en sträng: redigera `en.js` **och** `en.json`, uppdatera sedan varje
  `<code>.json`. Att röra en synlig etikett innebär att uppdatera **alla** språkfiler och
  **alla** `README.<code>.md`.
- Översättningar är ren JSON, ett utmärkt första bidrag. Se språklistan i
  `module/webroot/i18n.js`.

## Commits och PR:er

- Håll PR:er fokuserade. Beskriv vad och varför.
- Signera av dina commits (DCO): `git commit -s` (lägger till `Signed-off-by:`).
- CI måste förbli grön. Var vänlig i granskningar, se [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Bra första-ärenden

Leta efter etiketterna `good first issue` och `help wanted`. Översättningar, dokumentation, nya
`rclone`-destinationsförinställningar och WebUI-putsning är alla utmärkta startpunkter.

<!-- doc-footer -->

---

> _Denna dokumentation genererades med Claude (Anthropic) och underhålls av VD171. Rättelser och förbättringar välkomnas; se [CONTRIBUTING.md](CONTRIBUTING.md)._
