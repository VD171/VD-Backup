> **Languages:** [English](../../CHANGELOG.md) · [العربية](../ar/CHANGELOG.md) · Čeština · [Deutsch](../de/CHANGELOG.md) · [Español](../es/CHANGELOG.md) · [فارسی](../fa/CHANGELOG.md) · [Français](../fr/CHANGELOG.md) · [हिन्दी](../hi/CHANGELOG.md) · [Bahasa Indonesia](../in/CHANGELOG.md) · [Italiano](../it/CHANGELOG.md) · [日本語](../ja/CHANGELOG.md) · [한국어](../ko/CHANGELOG.md) · [Nederlands](../nl/CHANGELOG.md) · [Polski](../pl/CHANGELOG.md) · [Português](../pt/CHANGELOG.md) · [Русский](../ru/CHANGELOG.md) · [Svenska](../sv/CHANGELOG.md) · [ไทย](../th/CHANGELOG.md) · [Türkçe](../tr/CHANGELOG.md) · [Tiếng Việt](../vi/CHANGELOG.md) · [中文](../zh/CHANGELOG.md)

---

# Changelog

Všechny podstatné změny ve VDBackup jsou zdokumentovány zde. Pouze anglicky.

## v1.01

První veřejné vydání. Modul WebUI pro KernelSU/APatch/Magisk, který zálohuje a obnovuje aplikace a
jejich data zcela jako root, bez výzvy k udělení oprávnění.

Engine a formáty:

- Engine pro zálohování/obnovu běží jako odpojený rootovský proces (`setsid`): přežije zavření WebUI
  nebo správce rootu a rozhraní se znovu připojí k živému průběhu podle `opid`.
- Tři režimy zálohování: Full (tar.zst, místně nebo vzdáleně), Snapshot (restic repozitář, šifrovaný a
  deduplikovaný) a Mirror (synchronizace rclone/rsync 1:1). APK se komprimují vždy, i v režimu mirror.
- Položky na aplikaci: APK (base + splits), `data`, `data_de`, `obb`, external a media. Kontext SELinux,
  uid/gid, režimy a xattr/caps jsou zachovány; obnova používá relaci `pm install` a přemapuje
  vlastnictví/kontext na živé uid.
- Důsledně zohledňuje jednotlivé uživatele (podpora více uživatelů). Zálohy se ukládají do
  `/sdcard/VDBackup` (pro každého uživatele), mimo `/data/adb`, takže nejsou čitelné před prvním
  odemknutím; každý cíl je umístěn do jmenného prostoru pod `<path>/vdbackup`.
- Komprese: žádná, lz4, zstd (úrovně) nebo gzip ("režim kompatibility"). Manifest JSON zaznamenává
  zařízení, balíček (včetně názvu aplikace), položky a oprávnění.
- Přenosné šifrování pomocí `age` (generování klíčů), navíc průvodce PC RECOVERY dodávaný uvnitř každé
  šifrované zálohy, aby ji bylo možné dešifrovat a rozbalit kdekoli, bez modulu.

Cíle a cloud:

- Cíle: přidat/vypsat/otestovat/smazat (místní, rclone remote, restic repozitář a volitelný doprovod
  Google Drive); přihlašovací údaje se ukládají zamlženě, nikdy v čitelné podobě.
- Vytvářejte rclone remotes z UI/API (`remote-add`/`remote-list`/`remote-del`), takže jakýkoli cloudový
  backend (SFTP, SMB, WebDAV, FTP, S3, Google Drive a další) je dosažitelný bez ručních úprav
  `rclone.conf`.
- Google Drive dvěma způsoby: přes rclone (bez účtu Google Cloud) nebo volitelnou bezhlavou doprovodnou
  aplikaci (`ru.vd171.vdbackup`), která nese povinné upozornění na skrytí přes HMA-OSS.
- Síťová politika: zvolte, zda smí cloudové přenosy používat libovolné připojení, pouze Wi-Fi nebo pouze
  mobilní data; vynucováno pro ruční i naplánované úlohy. Místní cíle jsou vyňaty.

Migrace dovnitř:

- Import z Neo-Backup, včetně záloh šifrovaných heslem (AES-256-GCM dešifrováno pomocným nástrojem dex;
  WebUI si vyžádá heslo).
- Import z Android-DataBackup (instalace APK, rozbalení archivů user/user_de/data, přemapování).
- Obojí ověřeno proti skutečným zálohám na více zařízeních.

Integrita a bezpečnost:

- Věrná obnova způsobem smazat-pak-rozbalit; ověření sha256 na archiv (ve výchozím nastavení zapnuto u
  Full a kontrola integrity repozitáře u Snapshot), zkušební běh (dry-run) a test obnovy. Archivy se
  zpětně čtou kvůli úplnosti; poškozený archiv ani neplatný název balíčku nemohou nikdy spustit
  destruktivní obnovu a selhání vzdáleného přenosu se hlásí, nikdy nejsou tichá.
- Selektivní obnova: obnovte libovolnou podmnožinu položek, které záloha obsahuje (APK, data, chráněná
  data, OBB, external, media), vše ve výchozím nastavení vybráno.
- Mazání záloh z rozhraní/API (`delete-backup`) a retence posledních N pro ruční zálohy (`prune`); každé
  smazání, obnova, prořezání a naplánovaný běh se zapisuje do lokálního auditního logu JSON, který si
  můžete prohlédnout v aplikaci.
- Oprávnění za běhu a AppOps se zaznamenávají do manifestu a znovu aplikují při obnově. Zdroj instalace
  (installerPackageName) a stav povoleno/zakázáno se také zaznamenávají a znovu aplikují při obnově.
- Falšování zdroje instalace: ve výchozím nastavení obnovená aplikace hlásí jako svůj zdroj instalace
  Play Store (nastaveno v době instalace přes instalační relaci, protože obnovená aplikace jinak vypadá
  jako sideloaded); přepínatelné globálně i pro jednotlivou obnovu, a když je vypnuto, zachová se
  zaznamenaný zdroj. Pokročilý, volitelný režim "deep" navíc zfalšuje iniciující balíček a zdroj balíčku
  úpravou systémové databáze balíčků (nejprve byte-přesná záloha, projeví se po restartu), takže aplikace
  vypadá plně nainstalovaná z obchodu.
- SSAID (ANDROID_ID zařízení): přísně opt-in a výrazně označené; s podporou ABX; živý soubor se před
  každým přepsáním vždy zálohuje byte po byte kvůli rollbacku; projeví se po restartu.
- Obnova a import vyžadují výslovné potvrzení "toto přepíše aktuální data aplikace", než se bude
  pokračovat.

Plánování a automatizace:

- Naplánované zálohy s retencí keep-N, spravované z karty Schedule (na aplikaci, denně/hodinově/týdně
  s volitelným časem, režimem a cílem).
- Automatická záloha při instalaci nebo aktualizaci: volitelný pozorovatel využívá heartbeat plánovače,
  zálohuje nové nebo aktualizované aplikace na pozadí a při prvním běhu pouze zaznamená stav, takže jeho
  zapnutí nikdy nezálohuje vše najednou. Respektuje nastavení vyloučených aplikací (blocklist).

Speciální (celosystémové) zálohy:

- Zálohování zpráv (SMS/MMS), kontaktů a seznamu hovorů, Wi-Fi a Bluetooth jako surových, věrně
  archivovaných systémových dat (stejné zachování SELinux/xattr a volitelné šifrování age jako u záloh
  aplikací). Obnova je věrná pro stejné zařízení/stejnou ROM, vyžaduje restart a je chráněna výrazným
  potvrzením přepsat-a-restartovat.
- Volitelný přenosný export vedle surového archivu: zprávy, seznam hovorů a kontakty se zapisují také jako
  otevíratelný JSON (čtený přibaleným sqlite3 přímo z databází provideru, takže těla zpráv s čárkami nebo
  novými řádky zůstávají neporušená), což dává kopii napříč zařízeními, která nepotřebuje modul. Přenosná
  kopie je také šifrována, když je záloha šifrována, takže nikdy neprozradí to, co archiv chrání.

Integrace se systémem:

- Připojení nainstalované aplikace jako systémové, aniž byste se dotkli skutečného oddílu /system:
  VDBackup připraví APK aplikace do vlastního overlay podmodulu, který správce root připojí. S NoMount
  na KernelSU se vloží živě (bez restartu); jinak se projeví při příštím bootu, takže nikdy nezávisí na
  tom, zda je NoMount nainstalován. Zvolte běžné nebo privilegované umístění.

WebUI:

- Seznam aplikací zobrazuje skutečný lokalizovaný název aplikace (zjištěný z APK, takže přežije
  odinstalaci) vedle balíčku, s líně načítanými, mezipaměťovanými ikonami vykreslenými jako zaoblené
  dlaždice s podporou adaptivních ikon.
- Klepnutím na aplikaci otevřete její historii záloh a obnovíte libovolnou předchozí zálohu; karta Zálohy
  zobrazuje název a balíček na samostatných řádcích a otevírá podrobný list pro každou zálohu (verze,
  zdroj instalace, stav, datum, velikost, položky, počty oprávnění, zařízení).
- Filtrování seznamu aplikací podle uživatelských/systémových/všech a řazení podle názvu nebo balíčku;
  výběr několika aplikací a jejich záloha v jedné dávce; vyloučení aplikací z automatických a
  naplánovaných záloh.
- Volba toho, co zahrnout, a přepínání verify nebo dry-run pro každou zálohu; volba obnovy pouze pro test,
  která rozbalí do staging, aniž by se dotkla živé aplikace.
- Světlý/tmavý motiv, selektor barvy zvýraznění, výběr jazyka, karta "O aplikaci" (s příbuznými
  projekty a auditním manifestem přibalených binárních souborů), výběr složky pro lokální cíl,
  lokalizovaný průběh operací s okamžitou odezvou
  a moderní dialogy v aplikaci (žádná systémová vyskakovací okna alert/confirm).
- Navigace tlačítkem Zpět se vrací na předchozí kartu a nejprve zavírá dialogy; dialogy jsou plovoucí a
  aplikace přežije opětovné otevření opětovným připojením k živým operacím.

Vstřícné k AI a i18n:

- Zdokumentovaný řídicí povrch JSON, aby agenti mohli spravovat každou akci bezhlavě
  (`docs/AI-AGENTS.md`); WebUI je jen jedním klientem tohoto API.
- README a veškerá projektová dokumentace jsou přeloženy do 21 standardních jazyků (`docs/<lang>/`),
  přičemž dokumentace je zrcadlena na wiki.
- Bohatý výpis aplikací a dešifrování Neo probíhají přes pomocný nástroj dex řízený jako root
  (`IPackageManager` přes ServiceManager), takže fungují i tam, kde ActivityThread zamrzá.
