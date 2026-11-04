> **Languages:** [English](../../CHANGELOG.md) · [العربية](../ar/CHANGELOG.md) · [Čeština](../cs/CHANGELOG.md) · [Deutsch](../de/CHANGELOG.md) · [Español](../es/CHANGELOG.md) · [فارسی](../fa/CHANGELOG.md) · [Français](../fr/CHANGELOG.md) · [हिन्दी](../hi/CHANGELOG.md) · [Bahasa Indonesia](../in/CHANGELOG.md) · [Italiano](../it/CHANGELOG.md) · [日本語](../ja/CHANGELOG.md) · [한국어](../ko/CHANGELOG.md) · Nederlands · [Polski](../pl/CHANGELOG.md) · [Português](../pt/CHANGELOG.md) · [Русский](../ru/CHANGELOG.md) · [Svenska](../sv/CHANGELOG.md) · [ไทย](../th/CHANGELOG.md) · [Türkçe](../tr/CHANGELOG.md) · [Tiếng Việt](../vi/CHANGELOG.md) · [中文](../zh/CHANGELOG.md)

---

# Changelog

Alle noemenswaardige wijzigingen aan VDBackup worden hier gedocumenteerd. Alleen in het Engels.

## v1.01

Eerste openbare uitgave. Een KernelSU/APatch/Magisk-WebUI-module die apps en hun gegevens volledig
als root back-upt en herstelt, zonder toestemmingsvraag.

Engine en formaten:

- Back-up-/herstel-engine draait als een losgekoppeld root-proces (`setsid`): het overleeft het sluiten
  van de WebUI of de root-manager, en de interface koppelt zich via `opid` opnieuw aan de live voortgang.
- Drie back-upmodi: Full (tar.zst, lokaal of op afstand), Snapshot (restic-repo, versleuteld en
  ontdubbeld) en Mirror (rclone/rsync 1:1-synchronisatie). APK's worden altijd gecomprimeerd, zelfs in
  een mirror.
- Items per app: APK (base + splits), `data`, `data_de`, `obb`, external en media. SELinux-context,
  uid/gid, modi en xattr/caps blijven behouden; herstel gebruikt een `pm install`-sessie en wijst
  eigendom/context opnieuw toe aan de live uid.
- Overal rekening houdend met gebruikers (multi-user-bewust). Back-ups worden opgeslagen onder
  `/sdcard/VDBackup` (per gebruiker), buiten `/data/adb`, zodat ze vóór de eerste ontgrendeling niet
  leesbaar zijn; elke bestemming krijgt een naamruimte onder `<path>/vdbackup`.
- Compressie: geen, lz4, zstd (niveaus) of gzip ("compatibiliteitsmodus"). Een JSON-manifest legt het
  apparaat, het pakket (inclusief het app-label), items en rechten vast.
- Draagbare versleuteling met `age` (sleutelgeneratie), plus een PC-RECOVERY-gids die in elke
  versleutelde back-up wordt meegeleverd, zodat deze overal, zonder de module, ontsleuteld en uitgepakt
  kan worden.

Bestemmingen en cloud:

- Bestemmingen: toevoegen/opsommen/testen/verwijderen (lokaal, rclone-remote, restic-repo en een
  optionele Google Drive-begeleider); inloggegevens worden versluierd opgeslagen, nooit in platte tekst.
- Maak rclone-remotes vanuit de UI/API (`remote-add`/`remote-list`/`remote-del`), zodat elke
  cloud-backend (SFTP, SMB, WebDAV, FTP, S3, Google Drive en meer) bereikbaar is zonder `rclone.conf`
  handmatig te bewerken.
- Google Drive op twee manieren: via rclone (geen Google Cloud-account) of de optionele headless
  begeleidende app (`ru.vd171.vdbackup`), die een verplichte HMA-OSS-verbergmelding draagt.
- Netwerkbeleid: kies of cloudoverdrachten elke verbinding, alleen wifi of alleen mobiele data mogen
  gebruiken; afgedwongen voor handmatige en geplande taken. Lokale bestemmingen zijn vrijgesteld.

Migratie naar binnen:

- Import vanuit Neo-Backup, inclusief met wachtwoord versleutelde back-ups (AES-256-GCM, ontsleuteld
  door de dex-helper; de WebUI vraagt om het wachtwoord).
- Import vanuit Android-DataBackup (APK's installeren, user/user_de/data-archieven uitpakken, opnieuw
  toewijzen).
- Beide gevalideerd tegen echte back-ups op meerdere apparaten.

Integriteit en veiligheid:

- Getrouw herstel volgens wissen-dan-uitpakken; sha256-verificatie per archief (standaard aan voor
  Full, en een repo-integriteitscontrole voor Snapshot), proefrun en hersteltest. Archieven worden
  teruggelezen op volledigheid; een beschadigd archief of een ongeldige pakketnaam kan nooit een
  destructief herstel veroorzaken, en fouten bij overdracht op afstand worden gemeld, nooit
  stilzwijgend.
- Selectief herstel: herstel een willekeurige deelverzameling van de items die een back-up bevat (APK,
  data, beschermde data, OBB, external, media), standaard allemaal geselecteerd.
- Verwijder back-ups vanuit de UI/API (`delete-backup`) en keep-last-N-retentie voor handmatige
  back-ups (`prune`); elke verwijdering, herstel, snoeiing en geplande run wordt geschreven naar een
  lokaal JSON-auditlogboek dat je in de app kunt bekijken.
- Runtime-rechten en AppOps worden in het manifest vastgelegd en bij herstel opnieuw toegepast. De
  installatiebron (installerPackageName) en de ingeschakeld/uitgeschakeld-staat worden ook vastgelegd
  en bij herstel opnieuw toegepast.
- Installatiebron-vervalsing: standaard meldt een herstelde app de Play Store als zijn installatiebron
  (ingesteld bij installatie via de install-sessie, aangezien een herstelde app er anders sideloaded
  uitziet); globaal en per herstel omschakelbaar, en wanneer uit wordt de vastgelegde bron behouden.
  Een geavanceerde, optionele "deep"-modus vervalst daarnaast het initiërende pakket en de pakketbron
  door de systeempakketdatabase te bewerken (eerst byte-exacte back-up, wordt na een herstart
  toegepast) zodat de app er volledig store-geïnstalleerd uitziet.
- SSAID (apparaat-ANDROID_ID): strikt opt-in en nadrukkelijk gemarkeerd; ABX-bewust; het live bestand
  wordt vóór elke overschrijving altijd byte-exact geback-upt voor een rollback; wordt van kracht na een
  herstart.
- Herstel en import vereisen een expliciete bevestiging "dit overschrijft de huidige app-gegevens"
  voordat wordt doorgegaan.

Planning en automatisering:

- Geplande back-ups met keep-N-retentie, beheerd vanuit een Schema-tabblad (per app, dagelijks/elk
  uur/wekelijks met een optionele tijd, modus en bestemming).
- Automatische back-up bij installatie of update: een optionele observer rijdt mee op de
  scheduler-heartbeat, back-upt nieuwe of bijgewerkte apps op de achtergrond en seedt alleen bij de
  eerste run, zodat het inschakelen nooit alles in één keer back-upt. Respecteert de instelling voor
  uitgesloten apps (blocklist).

Speciale (systeembrede) back-ups:

- Back-up van berichten (SMS/MMS), contacten en belgeschiedenis, Wi-Fi en Bluetooth als ruwe, getrouw
  gearchiveerde systeemgegevens (hetzelfde behoud van SELinux/xattr en optionele age-versleuteling als
  app-backups). Herstel is getrouw op hetzelfde apparaat/dezelfde ROM, vereist een herstart en is
  afgeschermd achter een prominente overschrijf-en-herstart-erkenning.
- Optionele draagbare export naast het ruwe archief: berichten, belgeschiedenis en contacten worden ook
  als openbare JSON geschreven (gelezen met de gebundelde sqlite3 rechtstreeks uit de
  provider-databases, zodat berichtteksten met komma's of nieuwe regels intact blijven), wat een
  apparaatoverschrijdende, geen-module-nodig-kopie oplevert. De draagbare kopie wordt ook versleuteld
  wanneer de back-up versleuteld is, zodat deze nooit lekt wat het archief beschermt.

Systeemintegratie:

- Koppel een geïnstalleerde app als system-app aan zonder de echte /system-partitie aan te raken:
  VDBackup stageert de APK('s) van de app in zijn eigen overlay-submodule, die de root-manager
  aankoppelt. Met NoMount op KernelSU wordt deze live geïnjecteerd (geen herstart); anders wordt deze
  bij de volgende boot toegepast, zodat deze nooit afhangt van of NoMount geïnstalleerd is. Kies
  reguliere of bevoorrechte plaatsing.

WebUI:

- De app-lijst toont de echte gelokaliseerde app-naam (opgehaald uit de APK, zodat hij een
  deïnstallatie overleeft) naast het pakket, met lui geladen, gecachete pictogrammen die als
  afgeronde, adaptief-bewuste tegels worden weergegeven.
- Tik op een app om de back-upgeschiedenis te openen en elke eerdere back-up te herstellen; het tabblad
  Back-ups toont naam en pakket op afzonderlijke regels en opent een detailvel per back-up (versie,
  installatiebron, staat, datum, grootte, items, aantal rechten, apparaat).
- Filter de app-lijst op gebruiker/systeem/alle en sorteer op naam of pakket; selecteer meerdere apps
  en back-up ze in één batch; sluit apps uit van automatische en geplande back-ups.
- Kies wat je wilt opnemen en schakel verify of proefrun per back-up in/uit; kies een alleen-test-
  herstel dat naar staging uitpakt zonder de live-app aan te raken.
- Licht/donker thema, een accentkleurkiezer, taalkiezer, een tabblad "Over" (met de zusterprojecten en
  het auditmanifest van de gebundelde binaries), een mapkiezer voor de lokale bestemming, gelokaliseerde
  voortgang van bewerkingen met directe terugkoppeling en moderne in-app-dialogen (geen
  systeem-alert-/bevestigings-pop-ups).
- Terug-knop-navigatie keert terug naar het vorige tabblad en sluit eerst dialogen; dialogen zweven en
  de app overleeft heropenen door opnieuw aan te haken bij live operaties.

AI-vriendelijk en i18n:

- Een gedocumenteerd JSON-besturingsoppervlak zodat agenten elke actie headless kunnen beheren
  (`docs/AI-AGENTS.md`); de WebUI is slechts één client van die API.
- De README en alle projectdocumentatie zijn vertaald in de 21 standaardtalen (`docs/<lang>/`), met de
  documentatie gespiegeld naar de wiki.
- De uitgebreide app-lijst en de Neo-ontsleuteling lopen via een als root aangestuurde dex-helper
  (`IPackageManager` via ServiceManager), zodat ze werken waar ActivityThread vastloopt.
