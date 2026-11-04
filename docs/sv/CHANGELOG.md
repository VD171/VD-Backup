> **Languages:** [English](../../CHANGELOG.md) · [العربية](../ar/CHANGELOG.md) · [Čeština](../cs/CHANGELOG.md) · [Deutsch](../de/CHANGELOG.md) · [Español](../es/CHANGELOG.md) · [فارسی](../fa/CHANGELOG.md) · [Français](../fr/CHANGELOG.md) · [हिन्दी](../hi/CHANGELOG.md) · [Bahasa Indonesia](../in/CHANGELOG.md) · [Italiano](../it/CHANGELOG.md) · [日本語](../ja/CHANGELOG.md) · [한국어](../ko/CHANGELOG.md) · [Nederlands](../nl/CHANGELOG.md) · [Polski](../pl/CHANGELOG.md) · [Português](../pt/CHANGELOG.md) · [Русский](../ru/CHANGELOG.md) · Svenska · [ไทย](../th/CHANGELOG.md) · [Türkçe](../tr/CHANGELOG.md) · [Tiếng Việt](../vi/CHANGELOG.md) · [中文](../zh/CHANGELOG.md)

---

# Ändringslogg

Alla noterbara ändringar i VDBackup dokumenteras här. Endast engelska.

## v1.01

Första offentliga versionen. En WebUI-modul för KernelSU/APatch/Magisk som säkerhetskopierar och
återställer appar och deras data helt och hållet som root, utan behörighetsförfrågan.

Motor och format:

- Motorn för säkerhetskopiering/återställning körs som en frikopplad root-process (`setsid`): den
  överlever att WebUI eller root-hanteraren stängs, och gränssnittet återansluter till liveförloppet
  via `opid`.
- Tre lägen för säkerhetskopiering: Full (tar.zst, lokalt eller fjärran), Snapshot (restic-arkiv,
  krypterat och deduplicerat) och Mirror (1:1-synk med rclone/rsync). APK:er komprimeras alltid, även
  i en spegling.
- Objekt per app: APK (bas + splittar), `data`, `data_de`, `obb`, externt och media. SELinux-kontext,
  uid/gid, lägen och xattr/caps bevaras; återställningen använder en `pm install`-session och mappar om
  ägarskap/kontext till det aktiva uid:t.
- Medveten om användare (fleranvändare) genomgående. Säkerhetskopior lagras under `/sdcard/VDBackup`
  (per användare), utanför `/data/adb`, så de är inte läsbara före första upplåsningen; varje
  destination namnrymdas under `<path>/vdbackup`.
- Komprimering: ingen, lz4, zstd (nivåer) eller gzip ("kompatibilitetsläge"). Ett JSON-manifest
  registrerar enheten, paketet (inklusive appens etikett), objekt och behörigheter.
- Portabel kryptering med `age` (nyckelgenerering), plus en guide för PC-ÅTERSTÄLLNING som levereras
  inuti varje krypterad säkerhetskopia så att den kan dekrypteras och extraheras var som helst, utan
  modulen.

Destinationer och moln:

- Destinationer: lägg till/lista/testa/ta bort (lokalt, rclone-fjärr, restic-arkiv och en valfri
  Google Drive-följeslagare); autentiseringsuppgifter lagras dolda, aldrig i klartext.
- Skapa rclone-fjärrar från gränssnittet/API:et (`remote-add`/`remote-list`/`remote-del`), så att vilken
  molnbackend som helst (SFTP, SMB, WebDAV, FTP, S3, Google Drive med flera) är nåbar utan att behöva
  redigera `rclone.conf` för hand.
- Google Drive på två sätt: via rclone (inget Google Cloud-konto) eller den valfria huvudlösa
  följeslagarappen (`ru.vd171.vdbackup`), som bär en obligatorisk HMA-OSS-döljanotis.
- Nätverkspolicy: välj om molnöverföringar får använda vilken anslutning som helst, endast Wi-Fi eller
  endast mobildata; tillämpas för manuella och schemalagda jobb. Lokala destinationer är undantagna.

Migrering in:

- Importera från Neo-Backup, inklusive lösenordskrypterade säkerhetskopior (AES-256-GCM dekrypterad av
  dex-hjälparen; WebUI frågar efter lösenordet).
- Importera från Android-DataBackup (installera APK:er, extrahera arkiven user/user_de/data, mappa om).
- Båda validerade mot riktiga säkerhetskopior över olika enheter.

Integritet och säkerhet:

- Trogen återställning med radera-sedan-extrahera; sha256-verifiering per arkiv (på som standard för
  Full, och en integritetskontroll av repot för Snapshot), torrkörning och återställningstest. Arkiv läses
  tillbaka för fullständighet; ett skadat arkiv eller ett ogiltigt paketnamn kan aldrig utlösa en destruktiv
  återställning, och misslyckade fjärröverföringar rapporteras, aldrig tysta.
- Selektiv återställning: återställ valfri delmängd av de objekt en säkerhetskopia innehåller (APK, data,
  skyddad data, OBB, external, media), alla valda som standard.
- Radera säkerhetskopior från gränssnittet/API:et (`delete-backup`) och behåll-senaste-N-kvarhållning för
  manuella säkerhetskopior (`prune`); varje radering, återställning, gallring och schemalagd körning skrivs
  till en lokal JSON-revisionslogg som du kan se i appen.
- Körtidsbehörigheter och AppOps fångas i manifestet och tillämpas på nytt vid återställning.
  Installationskällan (installerPackageName) och aktiverat/inaktiverat-tillståndet fångas också och
  tillämpas på nytt vid återställning.
- Förfalskning av installationskälla: som standard anger en återställd app Play Store som sin
  installationskälla (satt vid installationstillfället via installationssessionen, eftersom en återställd app
  annars ser sidladdad ut); växlingsbart globalt och per återställning, och när det är av behålls den fångade
  källan. Ett avancerat "deep"-läge som är tillval förfalskar dessutom det initierande paketet och
  paketkällan genom att redigera systemets paketdatabas (byte-exakt säkerhetskopia först, tillämpas efter en
  omstart) så att appen ser fullständigt butiksinstallerad ut.
- SSAID (enhetens ANDROID_ID): strikt valfri och tydligt flaggad; ABX-medveten; den aktiva filen
  säkerhetskopieras alltid byte-exakt före all överskrivning för återrullning; träder i kraft efter en
  omstart.
- Återställning och import kräver en uttrycklig bekräftelse om att "detta skriver över den nuvarande
  appdatan" innan de fortsätter.

Schemaläggning och automatisering:

- Schemalagda säkerhetskopior med keep-N-kvarhållning, hanterade från en Schedule-flik (per app, dagligen/
  varje timme/veckovis med en valfri tid, läge och destination).
- Automatisk säkerhetskopiering vid installation eller uppdatering: en observatör som är tillval utnyttjar
  schemaläggarens hjärtslag, säkerhetskopierar nya eller uppdaterade appar i bakgrunden, och fyller bara på
  vid första körningen så att aktivering av den aldrig säkerhetskopierar allt på en gång. Respekterar
  inställningen för uteslutna appar (blocklist).

Särskilda (systemomfattande) säkerhetskopior:

- Säkerhetskopiera meddelanden (SMS/MMS), kontakter och samtalslogg, Wi-Fi och Bluetooth som råa, troget
  arkiverade systemdata (samma bevarande av SELinux/xattr och valfria age-kryptering som app-säkerhetskopior).
  Återställning är trogen för samma enhet/samma ROM, kräver omstart, och skyddas av en framträdande bekräftelse
  för överskriv-och-starta-om.
- Valfri portabel export vid sidan av det råa arkivet: meddelanden, samtalslogg och kontakter skrivs också som
  öppningsbar JSON (läst med den medföljande sqlite3 direkt från provider-databaserna, så att
  meddelandekroppar med kommatecken eller radbrytningar överlever intakta), vilket ger en kopia mellan enheter
  som inte kräver modulen. Den portabla kopian krypteras också när säkerhetskopian är krypterad, så att den
  aldrig läcker det som arkivet skyddar.

Systemintegration:

- Montera en installerad app som en systemapp utan att röra den riktiga /system-partitionen: VDBackup
  förbereder appens APK:er i sin egen overlay-undermodul, som root-hanteraren monterar. Med NoMount på
  KernelSU injiceras den live (ingen omstart); annars tillämpas den vid nästa uppstart, så den beror aldrig på
  att NoMount är installerat. Välj vanlig eller privilegierad placering.

WebUI:

- Applistan visar det riktiga lokaliserade appnamnet (löst från APK:n, så det överlever en
  avinstallation) bredvid paketet, med ikoner som laddas lazy och cachas, renderade som rundade,
  adaptivt medvetna brickor.
- Tryck på en app för att öppna dess säkerhetskopieringshistorik och återställa valfri tidigare
  säkerhetskopia; fliken Backups visar namn och paket på separata rader och öppnar ett detaljblad per
  säkerhetskopia (version, installationskälla, tillstånd, datum, storlek, objekt, antal behörigheter, enhet).
- Filtrera applistan efter användar/system/alla och sortera efter namn eller paket; välj flera appar och
  säkerhetskopiera dem i en batch; uteslut appar från automatiska och schemalagda säkerhetskopior.
- Välj vad som ska inkluderas och växla verify eller dry-run per säkerhetskopia; välj en återställning endast
  för test som extraherar till staging utan att röra den aktiva appen.
- Ljust/mörkt tema, en accentfärgsväljare, språkväljare, en Om-flik (med systerprojekten och
  granskningsmanifestet för de medföljande binärfilerna), en mappväljare för den lokala
  destinationen, lokaliserat operationsförlopp med omedelbar återkoppling,
  och moderna dialoger i appen (inga pop-upper för systemvarning/bekräftelse).
- Navigering med bakåtknappen återgår till föregående flik och stänger dialoger först; dialoger är flytande och
  appen överlever att öppnas på nytt genom att återansluta till aktiva operationer.

AI-vänligt och i18n:

- En dokumenterad JSON-styrningsyta så att agenter kan administrera varje åtgärd huvudlöst
  (`docs/AI-AGENTS.md`); WebUI är bara en klient av det API:et.
- README och all projektdokumentation är översatt till de 21 standardspråken (`docs/<lang>/`), med
  dokumentationen speglad till wikin.
- Rik applistning och Neo-dekryptering körs genom en dex-hjälpare driven som root (`IPackageManager` via
  ServiceManager), så att de fungerar där ActivityThread hänger sig.
