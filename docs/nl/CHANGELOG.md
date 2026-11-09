> **Languages:** [English](../../CHANGELOG.md) · [العربية](../ar/CHANGELOG.md) · [Čeština](../cs/CHANGELOG.md) · [Deutsch](../de/CHANGELOG.md) · [Español](../es/CHANGELOG.md) · [فارسی](../fa/CHANGELOG.md) · [Français](../fr/CHANGELOG.md) · [हिन्दी](../hi/CHANGELOG.md) · [Bahasa Indonesia](../in/CHANGELOG.md) · [Italiano](../it/CHANGELOG.md) · [日本語](../ja/CHANGELOG.md) · [한국어](../ko/CHANGELOG.md) · Nederlands · [Polski](../pl/CHANGELOG.md) · [Português](../pt/CHANGELOG.md) · [Русский](../ru/CHANGELOG.md) · [Svenska](../sv/CHANGELOG.md) · [ไทย](../th/CHANGELOG.md) · [Türkçe](../tr/CHANGELOG.md) · [Tiếng Việt](../vi/CHANGELOG.md) · [中文](../zh/CHANGELOG.md)

---

# Changelog

Alle noemenswaardige wijzigingen aan VDBackup worden hier gedocumenteerd. Alleen in het Engels.

## v1.04

Oplossingen:

- Back-upmappen blijven nu automatisch te openen met een bestandsbeheerder: hun rechten worden opnieuw ingesteld bij installatie, bij elke boot en telkens als de WebUI opent, zodat een map die alleen voor de eigenaar toegankelijk bleef (bijvoorbeeld een back-up van vóór v1.03.2) zichzelf herstelt zonder handmatige stap.

Privacy:

- Wanneer je lokale back-ups hebt, herinnert het tabblad Back-ups je er nu aan om de back-upmap met SUSFS te verbergen, net als de begeleidende app: de aanwezigheid ervan kan anders root of een ontgrendelde bootloader verraden. SUSFS verbergt; de herinnering wijst je alleen de weg.

Back-ups:

- Je kunt nu instellen welke items elke app back-upt - bijvoorbeeld alleen APK, of APK + OBB - toegepast in bulk-, automatische en geplande back-ups. Bij een losse handmatige back-up kun je nog steeds kiezen, vooraf ingevuld vanuit de set van de app. Stel het in bij Instellingen, naast de lijst met uitgesloten apps.

- Back-upvoorinstellingen: bewaar benoemde sets van wat op te nemen en pas ze toe met één keuze in het back-updialoog.
- Multi-user: app-back-ups, speciale back-ups en herstel volgen nu allemaal de gekozen Android-gebruiker.
- Apps komen vollediger terug: hun ART-compilatieprofielen en hun rechten voor meldingsluisteraar, toegankelijkheid en Doze-batterijvrijstelling worden geback-upt en hersteld.
- Betrouwbaarder herstel: bestandseigendom en SELinux-context worden opnieuw afgeleid op het doelapparaat, zodat herstel correct werkt tussen apparaten en gebruikers.
- Veiliger herstel: Play Protect en de installatieverificatie worden alleen tijdens de installatie gedempt en exact hersteld; de root-manager wordt nooit geback-upt of hersteld; en de installatiebron wordt geverifieerd en gelogd.
- App-tags: geef apps vrije labels zoals games of work, filter de app-lijst op een tag en back-up een hele getagde groep in één keer.

## v1.03.2

Oplossingen:

- De cloud-aanmeldpagina op het apparaat toonde altijd "Sign-in failed", zelfs als het aanmelden
  was gelukt. Nu toont ze het echte resultaat.
- Opgeslagen back-ups kunnen nu met een bestandsbeheerder worden geopend: de back-upmappen
  per app waren alleen voor de eigenaar, dus zelfs een root-bestandsbeheerder kon er niet
  in; ze zijn nu toegankelijk zoals de rest van /sdcard/VDBackup.

Cloud-bestemmingen:

- De optionele Google Drive-companion-app wordt nu gebouwd en meegeleverd, dus Google Drive
  werkt via de companion op het apparaat (je apparaataccount, geen handmatige token plakken)
  naast rclone.

Interface:

- Het back-updialoogvenster heeft een bestemmingskiezer, zodat een back-up naar een gekozen
  cloud- of externe bestemming kan zonder eerst de standaardbestemming in Instellingen te wijzigen.
- De app controleert op een nieuwere versie bij het openen (hooguit eens per uur) en toont de
  updatebanner alleen als er een is; blijft stil als up-to-date of offline.

## v1.03.1

Nieuwe backup-reikwijdte:

- Nieuwe speciale-backupcategorieën: agenda (de agenda-provider plus een draagbare export
  `calendar.json`), achtergrond (start- en vergrendelscherm-achtergrond), privé-DNS (modus
  en specificeerder) en systeeminstellingen (de volledige dump van de system-, global- en
  secure-instellingen). Systeeminstellingen zijn opt-in en overschrijven bij herstel de
  apparaatbrede instellingen, dus ze zijn net als SSAID afgeschermd, met uitdrukkelijke
  toestemming en een volledige auditvermelding.
- Losstaande map- en bestandsback-up: back-up elk absoluut pad (gedeelde opslag of
  app-gegevens) als een gecomprimeerd, met manifest verzegeld archief, en herstel het naar
  hetzelfde pad. Herstel vereist een uitdrukkelijke bevestiging.

Veiliger herstel:

- Elk archief wordt gecontroleerd voordat er iets wordt geschreven: een backup waarvan de
  inhoud buiten het doel wijst (een absoluut pad of een `..`-component) wordt geweigerd,
  zodat een als root draaiend herstel niet verleid kan worden om buiten de bestemming te
  schrijven.

Voortgang en planning:

- Live voortgang toont nu overdrachtssnelheid, ETA en een itemteller tijdens backups, plus
  een met checksum geverifieerde stap voor cloud-uploads en een voorcontrole op "niet genoeg
  ruimte".
- Geplande taken kunnen voorwaardelijk worden gemaakt: alleen op Wi-Fi, alleen tijdens
  opladen, alleen boven een batterijniveau, of alleen op gekozen weekdagen; een geplande
  taak wordt ook overgeslagen terwijl het apparaat kritiek heet is. Een overgeslagen taak
  wordt bij de volgende tick opnieuw geprobeerd.

Cloud-bestemmingen:

- Verbind elke rclone-backend vanuit de UI: de cloud-remote-keuzelijst biedt de populaire
  providers (Google Drive, Dropbox, OneDrive, Box, pCloud, Mega, Backblaze B2, S3, SFTP,
  WebDAV, FTP, SMB) plus een optie "Aangepast (geavanceerd)" waar je elke andere
  rclone-backendnaam en de bijbehorende `key=value`-parameters typt, zodat alle
  rclone-backends bereikbaar zijn.
- Aanmelden op het apparaat (geen pc): providers die een browser-aanmelding nodig hebben
  (Google Drive, Dropbox, OneDrive, Box, pCloud) hebben een knop "Autoriseren in browser"
  die de eigen browser van de telefoon opent naar de toestemmingspagina van de provider;
  nadat je goedkeurt, keer je terug naar de app en wordt de remote automatisch opgeslagen,
  met de token vastgelegd op het apparaat. Een token handmatig plakken blijft beschikbaar
  als fallback.

Interface:

- Een aanpasbare interfaceschaal (een versleepbare schuifregelaar) herschaalt de hele interface,
  zodat die past op schermen met verschillende pixeldichtheden; 100% is de standaard en is ongewijzigd.
- De interface wordt nu rechts-naar-links weergegeven voor Arabisch en Perzisch.
- Een startoverzicht met backup-aantallen en een opslagbalk, statusbadges, kopiëren naar
  klembord van hashes en paden, schakelaars in Android-stijl, en een actie "Check for updates".
- Het activiteitenlogboek is een volledig scherm dat direct opent, met een actie "Export logs"
  die een logbestand opslaat dat je aan een rapport kunt toevoegen.

Fixes:

- Herstel en import mislukken niet langer op apparaten waarvan de meegeleverde `tar` de optie
  `--no-absolute-names` niet accepteert; de veiligheidscontrole van het archief staat los van
  die optie.
- "Check for updates" werkt zelfs waar geen HTTP-client is meegeleverd, door terug te vallen op
  de meegeleverde rclone; en het activiteitenlogboek duurt niet langer lang om te openen.

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
  begeleidende app (`ru.vd171.vdbackup`), die een verplichte [HMA-OSS](https://github.com/frknkrc44/HMA-OSS)-verbergmelding draagt.
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

*Deze documentatie is gegenereerd met Claude (Anthropic) en wordt onderhouden door VD171. Correcties en verbeteringen zijn welkom - zie [CONTRIBUTING.md](CONTRIBUTING.md).*
