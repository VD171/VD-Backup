> **Languages:** [English](../USER-GUIDE.md) · [العربية](../ar/USER-GUIDE.md) · [Čeština](../cs/USER-GUIDE.md) · [Deutsch](../de/USER-GUIDE.md) · [Español](../es/USER-GUIDE.md) · [فارسی](../fa/USER-GUIDE.md) · [Français](../fr/USER-GUIDE.md) · [हिन्दी](../hi/USER-GUIDE.md) · [Bahasa Indonesia](../in/USER-GUIDE.md) · [Italiano](../it/USER-GUIDE.md) · [日本語](../ja/USER-GUIDE.md) · [한국어](../ko/USER-GUIDE.md) · Nederlands · [Polski](../pl/USER-GUIDE.md) · [Português](../pt/USER-GUIDE.md) · [Русский](../ru/USER-GUIDE.md) · [Svenska](../sv/USER-GUIDE.md) · [ไทย](../th/USER-GUIDE.md) · [Türkçe](../tr/USER-GUIDE.md) · [Tiếng Việt](../vi/USER-GUIDE.md) · [中文](../zh/USER-GUIDE.md)

---

# VDBackup-gebruikershandleiding

Een complete, vriendelijke rondleiding door VDBackup, van het installeren van de module tot
het maken van je eerste backup, het herstellen ervan, het naar de cloud sturen, het inplannen
en het jaren later openen op een pc. Als je eerder Swift Backup, Neo-Backup of
Android-DataBackup hebt gebruikt, zal dit vertrouwd aanvoelen - alleen gebeurt alles op één
plek, met niets om te "toestaan".

## Inhoudsopgave

- [1. Wat VDBackup is](#1-wat-vdbackup-is)
- [2. Vereisten](#2-vereisten)
- [3. Installeren en eerste keer draaien](#3-installeren-en-eerste-keer-draaien)
- [4. De WebUI-rondleiding](#4-de-webui-rondleiding)
- [5. Een backup maken](#5-een-backup-maken)
  - [5.1 Kiezen wat je back-upt](#51-kiezen-wat-je-back-upt)
  - [5.2 Backup-modi: Full, Snapshot, Mirror](#52-backup-modi-full-snapshot-mirror)
  - [5.3 Compressie](#53-compressie)
  - [5.4 Versleuteling](#54-versleuteling)
  - [5.5 Verify en dry-run](#55-verify-en-dry-run)
  - [5.6 Speciale back-ups (berichten, belgeschiedenis, Wi-Fi, Bluetooth)](#56-special-backups-messages-call-log-wi-fi-bluetooth)
- [6. Een backup herstellen](#6-een-backup-herstellen)
- [7. Bestemmingen: lokaal en op afstand](#7-bestemmingen-lokaal-en-op-afstand)
- [8. Inplannen en retentie](#8-inplannen-en-retentie)
- [9. Inmigreren: Neo-Backup en Android-DataBackup importeren](#9-inmigreren-neo-backup-en-android-databackup-importeren)
- [10. SSAID (apparaat-ANDROID_ID)](#10-ssaid-apparaat-android_id)
- [11. Overdraagbaarheid: backups openen op een pc](#11-overdraagbaarheid-backups-openen-op-een-pc)
- [12. VDBackup aansturen vanuit een AI-assistent](#12-vdbackup-aansturen-vanuit-een-ai-assistent)
- [13. Problemen oplossen en FAQ](#13-problemen-oplossen-en-faq)
- [14. Verwijderen](#14-verwijderen)

---

## 1. Wat VDBackup is

VDBackup is een root-module met een ingebouwde WebUI die je apps en hun gegevens back-upt en
herstelt. Het is ontworpen als de open, root-native opvolger van Swift Backup, Neo-Backup en
Android-DataBackup: het beoogt de vereniging te doen van wat die tools doen, op één enkele
plek, en het kan zelfs je bestaande Neo-Backup- en Android-DataBackup-backups importeren,
zodat je kunt overstappen zonder iets te verliezen.

Het belangrijkste verschil met een gewone backup-app: VDBackup draait **volledig vanuit de
WebUI van je root-beheerder**, en de module is al root. Er is geen begeleidingsapp te
installeren voor de kernfuncties, geen "su verlenen"-prompt om goed te keuren en niets om in
te schakelen. Je opent de WebUI, kiest wat je back-upt en voert het uit.

Alles wat VDBackup produceert gebruikt **standaardformaten** (tar, gzip, zstd, age, zip,
restic), zodat je backups nooit vastzitten aan de module en nooit gebonden zijn aan jouw
specifieke apparaat. Zie [sectie 11](#sectie-11).

## 2. Vereisten

- **Een geroot Android-apparaat** beheerd door **KernelSU**, **APatch** of **Magisk**.
  VDBackup wordt als module geïnstalleerd vanuit die beheerder.
- Voldoende vrije opslag voor je backups (lokale backups bevinden zich onder de
  statusmap van de module; zie [sectie 3](#sectie-3)).
- Niets anders. De module bundelt alle binaries die het nodig heeft (tar, zstd, lz4, rclone,
  rsync, ssh, restic), zodat **lokale backup en restore volledig offline werken**. Alleen
  cloudbestemmingen praten met het netwerk.

Enkele fijnmazige extra's (AppOps, SSAID, een paar bevoorrechte systeemonderdelen) steunen op
het Android-framework; de module behandelt deze intern, met een pure-shell-fallback, en ze
degraderen gracieus wanneer ze op jouw apparaat niet beschikbaar zijn.

## 3. Installeren en eerste keer draaien

1. Download de nieuwste `VD-Backup-vX.Y.zip`-release.
2. Flash in je KernelSU-/APatch-/Magisk-beheerder de module-zip zoals elke andere module.
3. Het is onmiddellijk bruikbaar - **geen herstart nodig**. (Een herstart is alleen ooit
   relevant bij het herstellen van SSAID; zie [sectie 10](#sectie-10).)
4. Open de **WebUI** van de module vanuit de beheerder. Dat is de volledige interface.

**Welke editie je downloadt.** Elke release wordt geleverd als meerdere flashbare zip-edities,
zodat je alleen downloadt wat je nodig hebt. Kies er een:

- **`VD-Backup-<ver>-universal-full.zip`** - elke CPU-architectuur en elke binary, inclusief
  `rclone` (cloudproviders: Google Drive, S3 en 70+ andere rclone-backends) en `restic`
  (gededupliceerde snapshots). Werkt op elk apparaat. Grootste download.
- **`VD-Backup-<ver>-universal-lite.zip`** - elke architectuur, maar **zonder** de twee
  grootste binaries (`rclone` en `restic`). Kleinste download; doet nog steeds lokale,
  SSH/SFTP- en rsync-backups, met overdraagbare `age`-versleuteling.
- **`VD-Backup-<ver>-<abi>-full.zip`** (een van `arm64-v8a`, `armeabi-v7a`, `x86`,
  `x86_64`) - één enkele architectuur met elke binary (dezelfde functies als `universal-full`
  maar alleen voor de architectuur van jouw apparaat, dus kleiner dan `universal-full`).

Als je de architectuur van je apparaat kent en alles wilt, kies dan de bijpassende
**`<abi>-full`** (de meeste telefoons zijn **`arm64-v8a`**). Als je de kleinste download wilt
of geen cloudproviders (`rclone`) of snapshots (`restic`) nodig hebt, kies dan
**`universal-lite`**. Als je alles wilt en niet zeker bent van de architectuur, kies dan
**`universal-full`**. Bij installatie houdt de module alleen
de architectuur van jouw apparaat over, ongeacht de editie die je flasht.

Bij de eerste keer draaien zet de module een standaardconfiguratie neer (alleen als er nog
geen bestaat), zodat je instellingen behouden blijven over module-updates heen.

**Waar de status leeft.** VDBackups werkgegevens - je configuratie, geplande taken, opgeslagen
bestemmingen, versleutelde inloggegevens, logboeken en auditspoor, en het staging-gebied -
bevinden zich onder:

```
/data/adb/vdbackup/
```

**Waar backups leven.** De backups zelf worden geschreven naar gebruikerszichtbare,
inloggegevens-versleutelde opslag (zodat ze pas leesbaar zijn nadat je het apparaat hebt
ontgrendeld, en ze het verwijderen van de module overleven), één map per Android-gebruiker:

```
/sdcard/VDBackup/            (= /data/media/<user>/VDBackup)
```

Houd dit om twee redenen in gedachten: backups nemen ruimte in onder `/sdcard/VDBackup`, en
`/data/adb/vdbackup/logs/` is waar je kijkt als er iets misgaat.

## 4. De WebUI-rondleiding

De WebUI is georganiseerd in enkele tabbladen:

- **Apps** - de lijst met geïnstalleerde apps (gebruiker en systeem), elk getoond met zijn
  echte naam, zijn pakketnaam en zijn pictogram (pictogrammen laden lui en worden gecachet,
  zodat de lijst responsief blijft). De knop op een rij back-upt de app; op de rij tikken opent
  de backup-geschiedenis van die app, waar je elke eerdere backup kunt herstellen.
- **Backups** - de backups die je al hebt, elk toont de app-naam op één regel en het pakket op
  de volgende. Tik op een backup om de volledige details te zien (versie, datum, grootte,
  opgenomen items, machtigingstellingen en het apparaat waar het vandaan kwam). Hier herstel je
  ook, voer je een restore-test uit, verwijder je een backup of importeer je backups uit
  Neo-Backup of Android-DataBackup.
- **Bestemmingen** - beheer waar backups naartoe gaan: lokale opslag plus eventuele
  remote-bestemmingen die je toevoegt (zie [sectie 7](#sectie-7)). Je
  kunt een bestemming hier testen voordat je erop vertrouwt.
- **Instellingen** - een licht/donker-themaschakelaar, een accentkleurkiezer (presets, een aangepaste
  kleur, of resetten) en een taalkiezer, standaardwaarden voor
  nieuwe taken (standaardcompressie, verify aan/uit, standaardversleuteling), het netwerkbeleid
  voor cloudoverdrachten (zie [sectie 7](#sectie-7)), automatische back-up en de lijst met uitgesloten
  apps, de installatiebron-optie, de
  versleutelingssleutel en het inplannen.
- **Over** - versie, links, de zusterprojecten (Zie ook) en het auditmanifest van de gebundelde binaries.

Bevestigingen en meldingen gebruiken in-app-dialogen (niet de oude systeem-pop-ups), en een
herstel of import vraagt je te erkennen dat het de huidige app-gegevens overschrijft voordat
het doorgaat.

Backups en herstelbewerkingen draaien **losgekoppeld** als een root-achtergrondproces. Je kunt
de WebUI sluiten, of zelfs de root-beheerder sluiten, en de operatie gaat door. Wanneer je
terugkomt, haakt de WebUI opnieuw aan en toont live voortgang met een gelokaliseerd faselabel.
Op ROM's die shell-meldingen doorgeven krijg je ook een Android-melding wanneer een taak start
en eindigt; hoe dan ook is de in-app-voortgangskaart de betrouwbare indicator.

## 5. Een backup maken

De basisstroom: open **Apps**, kies een app, selecteer wat je wilt opnemen, kies een modus,
stel compressie en (optioneel) versleuteling in, voer dan uit. De voortgang verschijnt live en
een melding vertelt je wanneer het klaar is.

### 5.1 Kiezen wat je back-upt

Voor elke app kun je elke combinatie van deze items opnemen:

| Item | Wat het is |
|------|-----------|
| **APK** | De geïnstalleerde app zelf (basis-APK + eventuele split-APK's). |
| **data** | De privégegevens van de app (`/data/data`). Dit zijn de gebruikelijke "app-gegevens". |
| **device-protected data** | Direct-boot-/apparaatbeschermde opslag (`/data/user_de`). Sommige apps bewaren hier instellingen. |
| **external** | De externe gegevens van de app onder `Android/data`. |
| **OBB** | De OBB-uitbreidingsbestanden van de app (`Android/obb`), gebruikt door sommige games. |
| **media** | De media van de app onder `Android/media`. |

Een goede standaard voor "back-up deze app volledig" is om ze allemaal op te nemen. Als je
alleen de gegevens wilt (bijvoorbeeld om een game-save te verplaatsen), kun je het APK en de
grote OBB-/media-items uitvinken.

VDBackup behoudt ook de dingen die een herstel getrouw maken: SELinux-contexten,
uid/gid-eigendom, bestandsmodi, uitgebreide attributen (xattr) en capabilities.

### 5.2 Backup-modi: Full, Snapshot, Mirror

VDBackup biedt drie modi. De WebUI selecteert **Full** vooraf, wat voor de meeste mensen de
juiste keuze is.

- **Full** - een complete, op zichzelf staande, overdraagbare backup geschreven als `tar.zst`
  (of je gekozen compressie). Elke keer dat je het draait levert een alleenstaande backup op
  die je overal naartoe kunt kopiëren en op een pc kunt openen. Het best voor: een schone,
  overdraagbare snapshot van een app die je kunt archiveren en verplaatsen. Dit is de standaard
  en de meest overdraagbare optie.
- **Snapshot** - incrementeel en geversioneerd, ondersteund door `restic`. Elke keer dat je het
  draait voegt een nieuwe moment-in-tijd-snapshot toe aan een repository, slaat alleen op wat
  veranderd is en dedupliceert over snapshots heen. Het best voor: een lopende geschiedenis van
  een app bijhouden zonder bij elke keer de volle grootte te betalen.
- **Mirror** - een 1:1-synchronisatie van de live-gegevens naar de bestemming, ondersteund door
  `rclone`/`rsync`. Het houdt de bestemming identiek aan wat er op dit moment op het apparaat
  staat (gewijzigde bestanden worden gekopieerd, verwijderde bestanden worden op de bestemming
  verwijderd). Het best voor: een snelle, altijd actuele kopie, bijvoorbeeld naar een
  cloud-remote. Merk op dat het APK ook in een mirror gecomprimeerd wordt opgeslagen, nooit ruw.

### 5.3 Compressie

Je kunt de compressie voor een Full-backup kiezen:

- **none** - geen compressie (snelst, grootst).
- **lz4** - zeer snel, lichte compressie.
- **zstd** - de standaard, een sterke balans tussen snelheid en verhouding. Je kunt ook een
  niveau kiezen (bijvoorbeeld een hoger niveau voor een kleiner bestand).
- **gzip** - de **"compatibiliteitsmodus"**. gzip opent met ingebouwde tools op praktisch elke
  computer en in de meeste bestandsbeheerders, zonder iets extra's te installeren. Kies dit
  wanneer je er het meest om geeft het archief overal te kunnen openen.

Als je niet kiest, gebruikt VDBackup zijn geconfigureerde standaard (zstd op een verstandig
niveau).

### 5.4 Versleuteling

Versleuteling is **optioneel** en overdraagbaar. VDBackup versleutelt met **age** met behulp
van een wachtwoordzin (scrypt), die specifiek is gekozen voor overdraagbaarheid: elk standaard
`age`-gereedschap op elk besturingssysteem kan je backup ontsleutelen met alleen de
wachtwoordzin. Versleuteling is **nooit** gebonden aan de hardwaresleutels van je apparaat,
zodat een versleutelde backup op een ander apparaat herstelt en op een pc opent. (Een
compatibele AES-256-zip-modus is ook beschikbaar voor versleutelde archieven die je met een
dubbelklik en een wachtwoord wilt openen.)

Om versleuteling te gebruiken, genereer je de versleutelingssleutel eenmaal (Instellingen),
schakel je vervolgens versleuteling in voor je taak en stel je een wachtwoordzin in. De
wachtwoordzin is wat de backup beschermt, kies er dus een sterke - er is geen hardwaresleutel
en geen herstelachterdeur.

**De APK-regel (belangrijk):**

- Het **APK wordt altijd gecomprimeerd opgeslagen**, nooit ruw, om ruimte te besparen.
- Het **APK wordt standaard niet versleuteld**, omdat het APK van een app openbare inhoud is.
- APK-versleuteling en gegevensversleuteling zijn **onafhankelijke schakelaars**. Het
  inschakelen van gegevensversleuteling versleutelt het APK **niet**. Als je specifiek wilt dat
  het APK ook versleuteld wordt, schakel dan de APK-versleutelingsschakelaar expliciet in.

### 5.5 Verify en dry-run

Twee veiligheidsopties helpen je een backup te vertrouwen voordat je erop vertrouwt:

- **Verify** - na het schrijven re-hasht VDBackup elk archief en controleert het tegen het
  manifest. Dit staat **standaard aan voor Full**-backups. Als een bestand niet overeenkomt,
  mislukt de taak met een duidelijke fout in plaats van je met een stilzwijgend beschadigde
  backup achter te laten.
- **Dry-run** - plant de taak en rapporteert de groottes die het zou produceren **zonder iets
  te schrijven**. Gebruik het om ruimte in te schatten of je itemselectie te controleren
  voordat je het echte ding draait.

### 5.6 Speciale back-ups (berichten, belgeschiedenis, Wi-Fi, Bluetooth)

Onder de app-lijsten op het **Backups**-tabblad dekken **Speciale back-ups** systeembrede
gegevens die niet aan één enkele app gebonden zijn: **berichten (SMS/MMS)**, **contacten en
belgeschiedenis**, **Wi-Fi-netwerken** en **Bluetooth**. Kies de categorieën en back-up ze; ze
worden ruw gearchiveerd, met hetzelfde behoud van SELinux/xattr en optionele versleuteling als
app-backups. Optioneel wordt ook een **draagbare kopie** geschreven (berichten, belgeschiedenis
en contacten als openbare JSON), zodat je een apparaatoverschrijdende kopie hebt die je zonder de
module op een pc kunt lezen. Het herstellen van een speciale back-up overschrijft live
systeemgegevens en vereist een herstart, dus het is afgeschermd achter een prominente erkenning
en is betrouwbaar op hetzelfde apparaat en dezelfde ROM.

## 6. Een backup herstellen

Open het **Backups**-tabblad, kies de backup die je wilt en start het herstel. Omdat herstel
een destructieve actie is, vraagt VDBackup je eerst om **bevestiging**, en het legt de actie
vast in een lokaal auditlogboek.

Een herstel is **getrouw**: VDBackup wist de huidige staat van de app en pakt de backup uit,
zodat de app wordt teruggezet naar de **exacte staat** die in die backup is vastgelegd
(inclusief eigendom, modi, SELinux-contexten en xattr). Het is geen samenvoeging - het is een
echt herstel naar het moment in de tijd van de backup.

Nuttige herstelopties:

- **Restore-test** - pakt de backup uit naar een tijdelijk staging-gebied en verifieert het
  **zonder de live-app aan te raken**. Dit is de veilige manier om te bevestigen dat een backup
  intact en herstelbaar is voordat je iets overschrijft. Als de test mislukt, krijg je een
  duidelijke fout en blijft je geïnstalleerde app onaangeraakt.
- **Gedeeltelijk herstel** - herstel alleen enkele van de items die geback-upt zijn.
  Bijvoorbeeld alleen de app-gegevens herstellen zonder het APK opnieuw te installeren, of de
  save-bestanden herstellen zonder de grote OBB/media. Kies de gewenste items op het
  herstelscherm.
- Voor **Snapshot**- en **Mirror**-backups haalt het herstel respectievelijk uit de
  geversioneerde repository of de gespiegelde kopie.
- **Installatiebron** - standaard meldt een herstelde app de **Play Store** als zijn
  installatiebron (in plaats van er sideloaded uit te zien), wat de meeste apps en app-controles
  verwachten. Je kunt dit globaal uitschakelen in Instellingen of per herstel, en wanneer het uit
  staat wordt de oorspronkelijke installatiebron behouden. Een geavanceerde, optionele
  **"vervals de initiërende bron"**-schakelaar gaat verder en laat ook het initiërende pakket en
  de pakketbron van de app Play-geïnstalleerd lijken; het bewerkt de systeempakketdatabase (eerst
  geback-upt) en wordt na een herstart van kracht.

**Een backup verwijderen.** Open de details van een backup (of de geschiedenis van een app) en
gebruik **Verwijderen**; je wordt om bevestiging gevraagd en de verwijdering wordt naar het
activiteitenlogboek geschreven. Je kunt ook begrenzen hoeveel backups per app bewaard blijven
(retentie), zodat oude automatisch worden gesnoeid.

**Een geïnstalleerde app als system-app aankoppelen.** Vanuit de backup-geschiedenis van een app
stageert **Als systeem aankoppelen** de APK('s) van de app in een VDBackup-overlay-submodule,
zodat de root-beheerder hem vanuit `/system/app` (of `/system/priv-app`) serveert - de echte
`/system`-partitie wordt nooit aangeraakt. Met **NoMount** op KernelSU wordt het live toegepast;
anders wordt het na een herstart toegepast. Dit hangt nooit af van of NoMount geïnstalleerd is.

## 7. Bestemmingen: lokaal en op afstand

Standaard worden backups geschreven naar **lokale** opslag onder de statusmap van de module.
Je kunt ook remote-bestemmingen toevoegen in het **Bestemmingen**-tabblad. Voor een lokale bestemming
opent **Bladeren** een mapkiezer zodat je een submap onder de gedeelde opslag (`/sdcard`) kunt kiezen in
plaats van het pad te typen.

Remote-transport wordt afgehandeld door de gebundelde tools:

- **rclone** - de hub voor een enorm scala aan remotes: **SFTP, SMB, WebDAV, FTP, S3, Google
  Drive** en 70+ meer diensten.
- **rsync** en de **ssh/scp/sftp**-suite - voor delta-sync en gewone SSH-doelen.
- **restic** - versleutelde, gededupliceerde **Snapshot**-repositories (lokaal of op afstand).

**Een cloud-remote aanmaken (geen SSH nodig).** Kies in het Bestemmingen-tabblad het
**rclone**-bestemmingstype en gebruik **Cloud-remote toevoegen**: kies het backend (SFTP, SMB,
WebDAV, FTP, S3 of Google Drive), vul de velden in (host/gebruiker/wachtwoord, of de
S3-sleutels, of een Drive-token) en sla op. De remote verschijnt dan in de remote-lijst van de
bestemming. Wachtwoorden worden versluierd opgeslagen, nooit in klare tekst. Je kunt je remotes
vanaf dezelfde plek opsommen en verwijderen.

Twee regels houden remote-gebruik veilig:

- **Inloggegevens worden versleuteld opgeslagen** in rust in de statusmap van de module, nooit
  in klare tekst.
- **Valideer voordat je het gebruikt.** Gebruik de bestemmingstest in het Bestemmingen-tabblad
  om te bevestigen dat een bestemming werkt voordat je er een echte backup op richt.

**Netwerkbeleid (wifi versus mobiele data).** In Instellingen laat "Cloudoverdrachten via" je
beperken welke verbinding cloudoverdrachten mogen gebruiken: **wifi en mobiele data** (de
standaard), **alleen wifi** of **alleen mobiele data**. Wanneer je het beperkt, controleert
elke cloudoverdracht - handmatig of gepland, upload of herstel - eerst de actieve verbinding en
weigert op de verkeerde te draaien, zodat een alleen-wifi-beleid nooit mobiele data verbruikt.
Lokale backups worden nooit beïnvloed.

**Google Drive.** Je hebt twee manieren om Google Drive te bereiken:

1. **Via rclone** - voeg Drive toe als een rclone-remote zoals elke andere bestemming, zonder
   extra app en **zonder Google Cloud-account**. Draai op een willekeurige computer eenmaal
   `rclone authorize "drive"`, log in op je Google-account in de browser en plak de token die
   het afdrukt in het tokenveld van de Drive-remote.
2. **Via de optionele begeleider** - een piepkleine, opt-in-begeleidingsapp die de
   Google-aanmelding en de Drive-upload afhandelt. Het wordt **alleen geïnstalleerd wanneer je
   expliciet de Google Drive-begeleidingsbestemming kiest**, nooit standaard, en het wordt
   verwijderd wanneer je het uitschakelt. Het eenmalige Google-toestemmingsscherm is de enige
   stap die buiten de WebUI gebeurt. Wanneer de begeleider is geïnstalleerd, herinnert VDBackup
   je eraan hem **altijd te verbergen met HMA-OSS** zodat zijn aanwezigheid geen root of een
   ontgrendelde bootloader verraadt, en het biedt aan hem voor je aan de HMA-OSS-lijst toe te voegen.

## 8. Inplannen en retentie

VDBackup kan backups automatisch volgens een schema uitvoeren. In de planner definieer je een
taak met:

- de app (of set apps) en de te gebruiken items/modus,
- een bestemming,
- een **cron-achtig schema** - elk uur, dagelijks of wekelijks, op een tijd die je kiest (HH:MM),
- een **retentie**-instelling: **bewaar N** meest recente backups voor die taak, oudere worden
  automatisch gesnoeid.

Geplande taken worden geactiveerd door een boot-tijd-heartbeat in de module: wanneer een taak
verschuldigd is draait het, legt zijn laatste-looptijd vast zodat het niet twee keer afgaat, en
past retentie toe om oude backups te snoeien. Omdat alles als root op de achtergrond draait,
hebben geplande backups niet nodig dat de WebUI open is.

**Automatische back-up bij installatie/update.** In Instellingen kun je **automatische back-up**
inschakelen: dezelfde achtergrond-heartbeat merkt apps op die nieuw geïnstalleerd of bijgewerkt
zijn en back-upt ze voor je (met keep-N-retentie). De eerste keer draaien registreert alleen wat
er geïnstalleerd is, zodat het inschakelen nooit je hele apparaat in één keer back-upt.

**Uitgesloten apps (blocklist).** Ook in Instellingen kun je apps uitsluiten waarvan je nooit
wilt dat ze automatisch of volgens een schema geback-upt worden; uitgesloten apps worden door
beide overgeslagen.

**Activiteitenlogboek.** Het Schema-tabblad heeft een knop **Activiteitenlogboek bekijken** die
het lokale auditspoor toont - backups, herstelbewerkingen, verwijderingen, geplande en
automatische runs, en snoeiingen - nieuwste eerst.

## 9. Inmigreren: Neo-Backup en Android-DataBackup importeren

Als je van Neo-Backup of Android-DataBackup komt, hoef je niet opnieuw te beginnen. Vanuit het
**Backups**-tabblad kun je je bestaande backups **importeren**:

1. Wijs VDBackup naar je bestaande Neo-Backup- of Android-DataBackup-backuplocatie (import-scan
   somt op wat het daar vindt).
2. Kies welke backups je wilt importeren.
3. Start de import. Zoals andere langdurige operaties draait het losgekoppeld met live voortgang.

**Wachtwoordversleutelde Neo-Backup-backups worden ondersteund.** De AES-256-versleutelde
backups van Neo-Backup kunnen worden geïmporteerd - je wordt **om het wachtwoord gevraagd**
wanneer het nodig is, en het wachtwoord wordt alleen gebruikt om te ontsleutelen, nooit
opgeslagen in de opdrachtregel.

## 10. SSAID (apparaat-ANDROID_ID)

SSAID is de per-app-`ANDROID_ID` - een identificatie op apparaatniveau die sommige apps lezen.
VDBackup kan er een back-up van maken en het herstellen, maar dit is het gevoeligste wat het
aanraakt, dus het wordt met extra zorg behandeld:

- **Het is OPTIONEEL en standaard UIT.** VDBackup zal **nooit** SSAID vastleggen of herstellen
  tenzij je het expliciet inschakelt voor die taak. De WebUI toont een duidelijk gemarkeerde,
  gemarkeerde "Optioneel"-kennisgeving overal waar SSAID verschijnt (backup, restore en import),
  en het blijft uit totdat je je ervoor aanmeldt.
- **Het wordt bij herstel pas na een herstart toegepast.** De Android-instellingenprovider
  cachet deze waarden, zodat een hersteld SSAID pas van kracht wordt nadat je het apparaat
  herstart.
- **De vorige waarde wordt altijd eerst geback-upt.** Voordat een SSAID wordt overschreven,
  kopieert VDBackup de live `settings_ssaid.xml` byte-voor-byte naar een backup met tijdstempel
  (die nooit automatisch wordt verwijderd). Als die veiligheidskopie niet kan worden gemaakt,
  gebeurt het overschrijven niet. Om terug te rollen, herstel je dat opgeslagen bestand en
  herstart je.

**Aanbeveling:** laat SSAID uit tenzij je specifiek weet dat je het nodig hebt (bijvoorbeeld
een bepaalde app die zich aan de apparaat-ID koppelt en die je bewust migreert). Voor gewone
app- en gegevensbackups heb je het niet nodig.

## 11. Overdraagbaarheid: backups openen op een pc

Je backups zitten **niet vast aan deze module** en zijn **nooit hardwaregebonden**. Alles
gebruikt standaardformaten, zodat je een backup op Windows, macOS of Linux kunt openen zonder
VDBackup geïnstalleerd.

Een Full-backupmap bevat een `manifest.json` (de bron van waarheid die elk bestand, de
app-versie en de oorspronkelijke eigenaar/context beschrijft), de APK's als `*.apk.zst` en de
gegevensarchieven als `<item>.tar.zst` (of `.tar.gz` / `.tar.lz4`), optioneel met een
achterliggende `.age` wanneer versleuteld.

Om er een op een pc te openen, kort gezegd:

- **Ontsleutelen** (alleen als het bestand eindigt op `.age`) met het standaard `age`-gereedschap
  en je wachtwoordzin of sleutelbestand.
- **Decomprimeren en uitpakken**: `.tar.zst` met `zstd` dan `tar`; `.tar.gz` met `tar` direct;
  `.tar.lz4` via `zstd --format=lz4`. Een APK is gewoon een zstd-gecomprimeerd APK, dus het
  decomprimeren van `base.apk.zst` geeft je een normaal installeerbaar `base.apk`.

Elke versleutelde backup wordt geleverd met een **RECOVERY**-notitie die de exacte
kopieer-plak-commando's voor Windows, macOS en Linux bevat. Zie
[`../module/etc/RECOVERY.md`](RECOVERY.md) voor de volledige, stap-voor-stap-kit.

Merk op dat SELinux-contexten, uid/gid en modi binnen de tar worden opgeslagen en alleen
correct opnieuw worden toegepast wanneer je op Android herstelt - op een pc krijg je nog steeds
al je bestanden, alleen zonder dat het Android-specifieke eigendom wordt afgedwongen.

## 12. VDBackup aansturen vanuit een AI-assistent

VDBackup is gebouwd om vriendelijk te zijn voor AI-assistenten en -agenten, niet alleen voor
mensen. De WebUI is slechts één client van een kleine JSON-API; een agent kan **elke** actie
van de module headless beheren via diezelfde API (elk commando geeft een enkel JSON-object
terug, langdurige operaties draaien losgekoppeld en je polt hun voortgang, en dezelfde
veiligheidsrails gelden - SSAID blijft opt-in, muterende acties blijven bevestigd en
geaudit).

Als je wilt dat een assistent je backups en herstelbewerkingen voor je uitvoert, wijs hem dan
naar [`AI-AGENTS.md`](AI-AGENTS.md), dat het volledige besturingsoppervlak documenteert: het
commandocontract, elk verb met zijn argumenten en retourwaarde, en de veiligheidsregels die
een agent moet respecteren.

## 13. Problemen oplossen en FAQ

**Waar zijn de logboeken?** Onder de module-statusmap, `/data/adb/vdbackup/logs/`. Live
voortgang voor een lopende operatie staat in `progress-<opid>.json`, en het **auditspoor** van
muterende acties (restore, delete, import, SSAID-wijzigingen) staat in `audit.jsonl`.

**Een backup/restore lijkt vast te zitten of ik heb de WebUI gesloten.** Operaties draaien
losgekoppeld, dus het sluiten van de WebUI stopt ze niet. Heropen de WebUI en het haakt
opnieuw aan bij elke lopende operatie en toont de huidige voortgang.

**Ik kreeg een `ERR_...`-bericht.** Fouten worden gemeld met een duidelijke code. Een paar
veelvoorkomende:
- `ERR_VERIFY` - een geschreven archief kwam niet overeen met zijn manifest-hash (de
  verificatie ving een slechte backup op). Draai de backup opnieuw.
- `ERR_RESTORE_TEST` - een restore-test is mislukt; de backup pakte niet schoon uit/verifieerde
  niet schoon en je live-app bleef onaangeraakt.

**Mijn remote-bestemming mislukt.** Gebruik de bestemmings-**test** in het Bestemmingen-tabblad
om inloggegevens en connectiviteit te valideren. Onthoud dat alleen cloudbestemmingen het
netwerk nodig hebben; lokale backup/restore is volledig offline.

**Belt iets hiervan naar huis of downloadt het tijdens runtime?** Nee. Alle binaries zijn tijdens
de build-tijd in de module gebundeld; niets wordt tijdens runtime naar het apparaat gehaald.
Alleen cloudbestemmingen (rclone/restic/ssh) praten met het netwerk, en alleen wanneer je ze
gebruikt.

**Herstelt mijn backup op een andere telefoon?** Ja - backups zijn overdraagbaar en niet
gebonden aan apparaathardware. (SSAID is de enige apparaatspecifieke uitzondering, en het is
opt-in en wordt bij herstart toegepast; zie [sectie 10](#sectie-10).)

**Mijn versleutelde backup wil niet openen - ik ben de wachtwoordzin kwijt.** Er is door het
ontwerp geen herstelachterdeur; de wachtwoordzin is wat de backup beschermt. Bewaar hem veilig.

## 14. Verwijderen

Verwijder VDBackup zoals elke andere module uit je KernelSU-/APatch-/Magisk-beheerder. Het
verwijderen **behoudt je gebruikersconfiguratie** en verwijdert alleen tijdelijke status, zodat
een latere herinstallatie je instellingen oppikt. Je werkelijke backups leven onder
`/data/adb/vdbackup/` - als je ze ook wilt verwijderen, verwijder die map dan handmatig na het
verwijderen; anders blijven ze beschikbaar (en, omdat het standaardformaten zijn, te openen op
een pc) ook zonder de module.

---

*Deze documentatie is gegenereerd met Claude (Anthropic) en wordt onderhouden door VD171. Correcties en verbeteringen zijn welkom - zie [CONTRIBUTING.md](CONTRIBUTING.md).*
