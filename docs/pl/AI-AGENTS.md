> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../in/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · Polski · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# Sterowanie VDBackup z agenta AI

VDBackup jest zbudowany tak, aby asystent lub agent AI mógł administrować **każdą** treścią i
akcją modułu bezgłowo, tak samo jak robi to człowiek przez WebUI. WebUI jest tylko jednym
klientem małego API JSON; twój agent jest kolejnym. Używaj API,
nie scrapuj WebUI.

## Kontrakt

Wszystko przechodzi przez jeden punkt wejścia, uruchamiany jako root na urządzeniu:

```
sh /data/adb/modules/vdbackup/scripts/helper.sh <verb> <base64(JSON-args)>
```

- Argumenty to pojedynczy obiekt JSON, **zakodowany w base64**, przekazany jako jeden token argv.
- Polecenie wypisuje **jeden obiekt JSON** na stdout: `{"ok":true,...}` lub
  `{"ok":false,"code":"ERR_...","message":"..."}`. Parsuj to; nigdy nie scrapuj tekstu.
- Długie operacje (`backup`, `restore`, `import`, `backup-batch`, `restore-batch`, `config-export`, `config-import`) zwracają `{"ok":true,"opid":"..."}`
  natychmiast i działają **odłączone** (przeżywają zamknięcie wywołującego/WebUI). Odpytuj
  ich postęp; nie są zakończone, gdy wywołanie powraca.
- `progress` i `cancel` biorą **base64 surowego łańcucha opid**, nie obiekt JSON.

Mały pomocnik dla twojego shella:

```sh
b64() { printf '%s' "$1" | base64 -w0; }
H=/data/adb/modules/vdbackup/scripts/helper.sh
sh "$H" backup "$(b64 '{"package":"com.example.app","mode":"full"}')"
```

Aby sterować tym z komputera roboczego, uruchom to przez swój zwykły kanał root do urządzenia
(adb shell jako root, lub konfiguracja SSH-to-root). Moduł dostarcza dołączone binaria, więc
po instalacji nie potrzebuje **żadnego internetu** dla lokalnej kopii/przywracania; tylko cele
chmurowe (`rclone`/`restic`/ssh) komunikują się z siecią.

## Czasowniki

| Czasownik | Args (JSON) | Zwraca |
|------|-------------|---------|
| `ping` | `{}` | `{ok,version,abi}` |
| `overview` | `{user?}` | `{ok:true,apps,instances,path_backups,jobs,backups_size,free,total}` liczby (rozmiary w bajtach): aplikacje z kopiami, łączna liczba instancji kopii, samodzielne kopie ścieżek, zaplanowane zadania, łączny rozmiar kopii oraz wolne/całkowite systemu plików kopii. Nieodłączona, zwraca natychmiast; używana przez przegląd startowy WebUI. |
| `config-get` | `{}` | `{ok,config}` |
| `config-set` | obiekt konfiguracji (lub `{key,value}`) | `{ok}` |
| `keygen` | `{}` | generuje parę kluczy `age` do szyfrowania |
| `list-apps` | `{user?}` | `{ok,apps:[{package,label,system,versionCode}]}` (dex, shell fallback) |
| `label` | `{package,user?}` | `{ok,label}` (prawdziwa zlokalizowana nazwa aplikacji, bez kontekstu) |
| `icon` | `{package,user?,vc?}` | `{ok,package,icon}` (base64 PNG; cachowane per package+`vc`) |
| `backup` | zobacz poniżej | `{ok,opid}` (odłączone) |
| `restore` | zobacz niżej | `{ok,opid}` (odłączone) |
| `import` | `{from,ref,password,ssaid,user}` | `{ok,opid}` (odłączone) |
| `import-scan` | `{from,path}` | `{ok,backups:[...]}` |
| `progress` | base64(opid) | żywy `progress-<opid>.json` |
| `cancel` | base64(opid) | `{ok,cancelled}` |
| `list-ops` | `{}` | `{ok,ops:[...]}` (ponowne podłączenie po przywróceniu połączenia) |
| `list-apps`/`icons` | `{user?}` / `{user?,items:[{package,vc}]}` | lista aplikacji / wsadowe ikony base64 |
| `list-backups` | `{package?}` | `{ok,backups:[{ref,package,label,versionName,versionCode,created_at,mode,items}]}` |
| `list-users` | `{}` | `{ok,users:[{id,name}]}` użytkownicy Androida na urządzeniu (wielu użytkowników). |
| `list-dirs` | `{path}` | `{ok,path,parent,dirs:[...]}` podkatalogi ścieżki (wybór folderu). |
| `path-list` | `{user?}` | `{ok,backups:[...]}` samodzielne kopie folderu/pliku. |
| `provenance` | `{}` | manifest audytu dołączonych plików binarnych (`PROVENANCE.json`). |
| `backup-info` | `{ref}` | `{ok,...}` pełne szczegóły jednej kopii (wersja, źródło instalacji, stan, data, tryb, rozmiar, elementy, liczby uprawnień, urządzenie) |
| `backup-icon` | `{ref}` | `{ok,icon}` PNG base64 z manifestu (działa, gdy aplikacja jest odinstalowana) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref musi być pod katalogiem kopii) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` zachowuje N najnowszych kopii pakietu |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` dziennik audytu, od najnowszych |
| `log-export` | `{user?}` | `{ok:true,path}` (bezwzględna ścieżka zapisanego pliku `.txt` w katalogu kopii zapasowych) lub `{ok:false,code:"ERR_LOG_EXPORT"}`. Zapisuje dziennik aktywności (`audit.jsonl`) oraz krótki nagłówek kompilacji/urządzenia do pojedynczego widocznego dla użytkownika pliku tekstowego, aby można go było dołączyć do zgłoszenia błędu. Nieodłączona, zwraca natychmiast. |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth/calendar/wallpaper/dns/system_settings) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` kopia ogólnosystemowa (odłączone) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (wymaga restartu; `confirm` to zabezpiecza) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `path-backup` | `{path,compression?,password?}` | `{ok,opid}` tworzy kopię dowolnej ścieżki bezwzględnej jako `tar.zst`+`manifest.json` pod `.paths/` (odłączone) |
| `path-restore` | `{ref,confirm:true,password?}` | `{ok,opid}` przywraca kopię ścieżki do jej oryginalnej lokalizacji (`confirm` to zabezpiecza; odłączone) |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | montuje zainstalowaną aplikację jako systemową (bezsystemowy podmoduł; na żywo przez NoMount, inaczej przy następnym rozruchu) |
| `companion-status` / `companion-install` | `{}` | status komponentu Dysku Google / instalacja na żądanie |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | zarządzanie celami |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | zarządzanie zdalnymi rclone (tworzy wpis `rclone.conf`, na który wskazuje cel `type:"rclone"`); `backend` może być dowolnym backendem rclone, bez listy dozwolonych |
| `remote-authorize` | `{backend}` | `{ok:true,url}` (silnik już otworzył przeglądarkę telefonu na tym URL zgody przez intencję VIEW systemu Android) lub `{ok:false,code:"ERR_AUTHORIZE"}`. Uruchamia `rclone authorize <backend>` na lokalnym serwerze zwrotnym (`127.0.0.1:53682`) dla OAuth na urządzeniu. |
| `remote-authorize-poll` | `{}` | `{ok:true,done:false,url}` podczas oczekiwania, `{ok:true,done:true,token}` gdy użytkownik wyrazi zgodę (`token` do przekazania do `remote-add`), lub `{ok:false,code:"ERR_AUTHORIZE"}`. |
| `remote-authorize-cancel` | `{}` | `{ok:true,cancelled:true}`; zatrzymuje oczekującą autoryzację. |
| `cloud-status` | `{}` | `{ok,rclone,restic,fetchable,size}` (czy binaria `rclone`/`restic` są obecne, czy ta edycja `lite` może je pobrać, rozmiar pobierania w bajtach) |
| `cloud-fetch` | `{}` | `{ok,opid}` (odłączone) pobiera+weryfikuje+instaluje dodatek `rclone`/`restic` w edycji `lite` |
| `schedule-set` / `schedule-list` / `schedule-delete` | zobacz poniżej | zaplanowane zadania (kopia lub przywracanie; cel to jedna aplikacja, zestaw lub wszystkie aplikacje) |
| `scheduler-tick` | `{}` | uruchamia należne zadania + stosuje retencję + obserwator automatycznej kopii (wywołuje to heartbeat rozruchowy) |
| `update-check` | `{}` | `{ok,current_version,current_code,latest_version,latest_code,update_available,zipUrl,changelog,notes}` (nieodłączone; zwraca natychmiast; `ERR_UPDATE_CHECK` przy niepowodzeniu, patrz poniżej) |
| `backup-batch` | `{packages:[...], ...backup args}` | `{ok,opid}` (detached) tworzy kopię wielu aplikacji w jednej odłączonej operacji; postęp niesie `n`/`of`. Błąd jednej aplikacji nie zatrzymuje partii. |
| `restore-batch` | `{refs:[...], ...restore args}` | `{ok,opid}` (detached) przywraca wiele kopii w jednej odłączonej operacji; postęp niesie `n`/`of`. Błąd jednej aplikacji nie zatrzymuje partii. |
| `list-volumes` | `{}` | `{ok,volumes:[{path,removable,id?}]}` woluminy pamięci dla selektora folderów: wewnętrzna plus wymienna karta SD / USB. |
| `config-export` | `{password}` | `{ok,opid}` (detached) eksportuje konfigurację, zadania, miejsca docelowe, dane logowania i klucze do jednego pliku zaszyfrowanego hasłem, w folderze kopii. |
| `config-import` | `{ref,password}` | `{ok,opid}` (detached) scala wyeksportowany plik konfiguracji z powrotem na to urządzenie (nigdy nie nadpisuje na ślepo). |
| `config-exports` | `{}` | `{ok,exports:[{ref,name,size}]}` wypisuje zaszyfrowane pliki konfiguracji dostępne do importu. |
| `wipe-credentials` | `{}` | `{ok,wiped}` usuwa zapisane hasła zdalne i klucz szyfrowania urządzenia; miejsca docelowe, zadania i kopie pozostają. |
| `log-prune` | `{}` | `{ok}` przycina dawno zakończone logi operacji, ogranicza dziennik audytu i usuwa nieaktualne ikony (wywołuje to usługa rozruchu). |

### Pola `progress`

Odpytywanie `progress` zwraca na żywo `progress-<opid>.json` operacji. Te pola są **zawsze
obecne**:

| Pole | Typ | Znaczenie |
|------|-----|-----------|
| `opid` | string | identyfikator operacji |
| `percent` | int | ukończenie 0-100 |
| `phase` | string | etykieta bieżącej fazy |
| `item` | string | typ elementu aktualnie przetwarzanego |
| `done` | bool | true przy zapisie końcowym (finish / dry-run / restore-test) |

Trwająca operacja może też nieść te **opcjonalne** pola na żywo. Są nieobecne lub puste, gdy
nieznane, i są **pomijane przy zapisach końcowych** (finish / dry-run / restore-test):

| Pole | Typ | Znaczenie |
|------|-----|-----------|
| `rate` | string | prędkość transferu, np. `"4.2 MiB/s"` (puste = nieznane) |
| `eta` | string | szacowany pozostały czas, np. `"1m12s"` (puste = nieznane) |
| `n` | int | indeks bieżącego elementu (0 = nieznany) |
| `of` | int | łączna liczba elementów (0 = nieznana) |
| `cur` | string | nazwa bieżącego elementu (puste = brak) |

Transfery chmurowe wypełniają `rate`/`eta` (wartość percent pochodzi z rclone); lokalne kopie Full
wypełniają `n`/`of`/`cur`. Etykiety faz obejmują fazę pieczętowania sumą kontrolną **`verified`**
oraz, dla transferów chmurowych, **`transfer`** i **`mirror <item>`**.

### Argumenty `backup`

```json
{
  "package": "com.example.app",
  "user": 0,
  "mode": "full",                 // full | snapshot | mirror
  "compression": "zstd:10",       // none | lz4 | zstd[:N] | gzip
  "items": ["apk","data","data_de","obb","external","media"],
  "encrypt_data": false,
  "encrypt_apk": false,
  "dest": "local",                // local | <destination id>
  "verify": true,                 // re-hash each archive vs the manifest (default on for Full)
  "dry_run": false,               // true = report a size plan, write nothing
  "ssaid": false,                 // OPT-IN, see below
  "manual": false                 // true = single interactive backup, keeps these exact items;
                                  // omit/false lets config.app_items (a per-app item map) override
                                  // the set on bulk, auto and scheduled runs
}
```

`restore`/`import` biorą `{ref}` (katalog kopii / scan ref). `restore` przyjmuje również:
`"items"` (podzbiór typów elementów kopii do przywrócenia; pomiń, by przywrócić wszystkie), `"test": true`
(rozpakowuje do katalogu tymczasowego i weryfikuje, bez dotykania żywej aplikacji), `"mode"` dla
snapshot/mirror, `"password"` dla zaszyfrowanej kopii, `"ssaid"` (opt-in) oraz opcje źródła
instalacji `"spoof_installer"` (domyślnie z config, ustawia instalatora na Sklep Play w czasie
instalacji) i `"deep_spoof": true` (zaawansowany opt-in; fałszuje też pakiet inicjujący i źródło
pakietu, edytując bazę pakietów, stosuje się po restarcie). `import` bierze `"from": "neo" | "databackup"`
oraz, dla zaszyfrowanej kopii Neo, `"password"`.

### Argumenty `schedule-set`

Zadanie harmonogramu wybiera **jeden** cel i **akcję**:

```json
{
  "id": "nightly-games",
  "action": "backup",             // "backup" (domyślnie) | "restore"
  "package": "com.example.app",   // jedna aplikacja   - LUB -
  "packages": ["com.a","com.b"],  // zestaw aplikacji   - LUB -
  "all": true,                    // wszystkie aplikacje, minus lista wykluczonych aplikacji
  "cron": "daily",                // hourly | daily | weekly
  "at": "02:30",                  // HH:MM
  "mode": "full",
  "dest": "local",
  "keep": 5,
  "items": ["apk","data"],
  "require_wifi": false,          // gate: uruchamiaj tylko przez Wi-Fi
  "require_charging": false,      // gate: uruchamiaj tylko podczas ładowania
  "min_battery": 0,               // gate: uruchamiaj tylko przy/powyżej tego poziomu baterii % (0-100)
  "days": [1,2,3,4,5]             // gate: tylko w te dni tygodnia (0=niedziela)
}
```

Podaj dokładnie **jeden** z `package`, `packages` lub `all` jako cel. Zadanie `backup` zachowuje zwykłe
`mode`/`dest`/`keep`/`items`. Zadanie `restore` (`action: "restore"`) przywraca **najnowszą** kopię
każdej aplikacji docelowej (lub jawny `ref`) i **nadpisuje bieżące dane aplikacji przy każdym
uruchomieniu**: jest to zamierzone i opcjonalne (opt-in), więc ustawiaj je tylko na bezpośrednie
żądanie użytkownika.

### Bramkowanie harmonogramu

Zaplanowane zadanie może nieść **opcjonalne warunki bramkowe**. Gdy bramka należnego zadania nie
jest spełniona, zadanie jest **pomijane i ponawiane przy następnym ticku, bez przesuwania jego
harmonogramu** (jego `last_run` nie jest stemplowane, więc wyzwala się, gdy tylko warunek zostanie
spełniony):

| Pole | Typ | Bramka |
|------|-----|--------|
| `require_wifi` | bool | uruchamiaj tylko przez Wi-Fi |
| `require_charging` | bool | uruchamiaj tylko podczas ładowania |
| `min_battery` | int (0-100) | uruchamiaj tylko przy tym poziomie baterii lub wyższym |
| `days` | array of int (0-6, 0=niedziela) | tylko w te dni tygodnia |

Oprócz tego zawsze stosowane jest minimalne **zabezpieczenie termiczne**: zaplanowana operacja jest
pomijana, gdy urządzenie jest krytycznie gorące. Każde pominięcie bramkowe jest zapisywane w śladzie
audytu jako `op:"scheduler-gated"` z `reason` o wartości `wifi` / `charging` / `battery` / `days` /
`thermal`.

### Argumenty `remote-add`

Cel chmurowy to cel `type:"rclone"`, który nazywa zdalny `rclone`; utwórz
najpierw ten zdalny za pomocą `remote-add`. `backend` może być **dowolnym backendem rclone** -
nie ma listy dozwolonych. `remote-add` akceptuje dowolną nazwę backendu (`dropbox`, `onedrive`,
`box`, `pcloud`, `mega`, `b2`, `s3`, `sftp`, `smb`, `webdav`, `ftp`, `drive` i ~70 innych
obsługiwanych przez rclone), a `params` są przekazywane bezpośrednio do konfiguracji `rclone`
jako pary `key=value`. Pola haseł są przechowywane zaciemnione, nigdy w postaci jawnej.
Popularne backendy i ich `params`:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

**OAuth na urządzeniu (bez PC).** Backendy wymagające logowania w przeglądarce (Google Drive,
Dropbox, OneDrive, Box, pCloud) nie wymagają komputera ani ręcznie wklejanego tokena. Wywołaj
`remote-authorize` z `{backend}`: silnik uruchamia `rclone authorize <backend>` wobec lokalnego
serwera zwrotnego (`127.0.0.1:53682`) i otwiera własną przeglądarkę telefonu na stronie zgody
dostawcy przez intencję VIEW systemu Android, zwracając `{ok:true,url}` (lub
`{ok:false,code:"ERR_AUTHORIZE"}`). Odpytuj `remote-authorize-poll` (`{}`): zwraca
`{ok:true,done:false,url}` podczas oczekiwania i `{ok:true,done:true,token}` gdy użytkownik
zatwierdzi, przekaż ten `token` do `remote-add`. `remote-authorize-cancel` (`{}`) zatrzymuje
oczekującą autoryzację (`{ok:true,cancelled:true}`). Ręczne wklejenie wyniku
`rclone authorize "<backend>"` z dowolnego komputera jest nadal obsługiwane jako rozwiązanie
zapasowe.

Google Drive ma dwie ścieżki: ten zdalny `drive` (nie wymaga projektu Google Cloud, używa
własnego OAuth rclone, autoryzuj na urządzeniu za pomocą `remote-authorize`, lub uruchom
`rclone authorize "drive"` raz na dowolnym komputerze i przekaż token) lub opcjonalną aplikację
towarzyszącą (własne OAuth client id). Oba kończą jako zwykłe cele.

### Polityka sieciowa

Pole konfiguracji `network_policy` kontroluje, które połączenie mogą wykorzystać przesyły chmurowe:
`any` (domyślnie), `wifi`, lub `mobile`. Ustaw je za pomocą `config-set`. Gdy jest `wifi` lub
`mobile`, każdy przesył chmurowy (Full `rclone`/Drive upload, Mirror sync, zdalna
`restic` kopia/przywracanie snapshota, Mirror przywracanie) najpierw sprawdza aktywny transport i
przerywa z `ERR_NET_POLICY`, jeśli nie pasuje, zarówno dla zadań ręcznych, jak i zaplanowanych.
Cele lokalne nigdy nie są ograniczane.

### Integralność i limit miejsca w chmurze

- **Pieczęć sumy kontrolnej (chmura).** Po udanym skopiowaniu do chmury silnik uruchamia zdalną
  kontrolę sumy kontrolnej (`rclone check`); niezgodność kończy operację błędem `ERR_VERIFY`.
  Backendy, które nie dzielą wspólnego skrótu ze stroną lokalną, są pomijane (nie jest to błąd).
- **Kontrola limitu (chmura, tryb Full).** Przed wysyłką w trybie Full do zdalnego `rclone` silnik
  odpytuje wolne miejsce zdalnego celu (`rclone about --json`) i odmawia z `ERR_QUOTA`, jeśli kopia
  by się nie zmieściła. Zdalne cele, które nie zgłaszają informacji o limicie, są pomijane. Tryb
  Mirror jest synchronizacją delta i jest z tego wyłączony.

### Binaria chmurowe (edycja `lite`)

Edycja `full` dołącza wszystkie binaria i nigdy nie potrzebuje sieci. Edycja `lite` pomija dwa
największe, `rclone` i `restic`, i pobiera je na żądanie przy pierwszym uruchomieniu akcji
chmurowej lub snapshot. `cloud-status` zgłasza, czy są już obecne, czy ta edycja może je pobrać,
oraz rozmiar pobierania w bajtach. `cloud-fetch` działa **odłączone** (odpytuj `progress` z jego
`opid`): pobiera dodatek `rclone`+`restic` dla danej architektury, weryfikuje go względem SHA-256
wypalonego w module, i instaluje go w pamięci podręcznej środowiska uruchomieniowego. Jego fazy
postępu to `downloading`, `verifying` i `installing`; kod końcowy to `ERR_NONE` przy powodzeniu
lub `ERR_FETCH` (pobieranie nie powiodło się) / `ERR_FETCH_VERIFY` (niezgodność sumy kontrolnej,
odrzucono) przy niepowodzeniu. W edycji `full` jest zbędne. `backup`/`restore` do celu chmurowego
lub snapshot w edycji `lite`, zanim binaria będą obecne, kończy się błędem `ERR_CLOUD_FETCHABLE`;
klient powinien zaproponować uruchomienie `cloud-fetch`, a następnie ponowić próbę.

### Kategorie kopii specjalnej

`special-categories` zgłasza, które kategorie ogólnosystemowe ma urządzenie; `special-backup`
przechwytuje te, które przekażesz w `categories`, a `special-restore` je ponownie stosuje.
Kategorie to:

| Kategoria | Czym jest | Semantyka przywracania |
|-----------|-----------|------------------------|
| `messages` | SMS/MMS | zastąpienie w providerze (wyczyszczenie + rozpakowanie) |
| `contacts` | kontakty i rejestr połączeń | zastąpienie w providerze (wyczyszczenie + rozpakowanie) |
| `wifi` | zapisane sieci Wi-Fi | zastąpienie w providerze (wyczyszczenie + rozpakowanie) |
| `bluetooth` | sparowania Bluetooth | zastąpienie w providerze (wyczyszczenie + rozpakowanie) |
| `calendar` | provider kalendarza (`com.android.providers.calendar`, aplikacja + dane); eksportowany też przenośnie do `calendar.json` | zastąpienie w providerze (wyczyszczenie + rozpakowanie) |
| `wallpaper` | tapeta ekranu głównego i blokady oraz `wallpaper_info.xml`, przechowywana surowo (binarnie) | pliki zastąpione |
| `dns` | tryb i specyfikator prywatnego DNS, odczytane z settings | idempotentne `settings put` |
| `system_settings` | pełny zrzut ustawień system/global/secure | **opt-in**, idempotentne `settings put`, nadpisuje ustawienia urządzenia |

**`system_settings` jest ściśle opt-in i destrukcyjne przy przywracaniu.** Jak `ssaid`,
nadpisuje ono ustawienia całego urządzenia, gdy jest przywracane, więc jest zabezpieczone
jawną zgodą użytkownika i zapisywane w ścieżce audytu. Nigdy nie wybieraj go domyślnie; tylko
na bezpośrednie, zamierzone żądanie użytkownika.

### Samodzielna kopia ścieżki

`path-backup` / `path-restore` tworzą kopię i przywracają **dowolną ścieżkę bezwzględną** -
folder lub pojedynczy plik, w pamięci współdzielonej lub pod `/data`, poza modelem per-aplikacja.
Archiwum jest zapisywane jako `tar.zst` plus `manifest.json` we własnym formacie VDBackup
(zapieczętowane SHA-256, z zestawem RECOVERY przy szyfrowaniu) pod `.paths/` w katalogu kopii.

```json
// path-backup
{ "path": "/sdcard/DCIM/Camera", "compression": "zstd:10", "password": "..." }
// path-restore
{ "ref": "<.paths ref>", "confirm": true, "password": "..." }
```

- Ścieżka źródłowa musi być **bezwzględna** i znajdować się pod jedną z dozwolonych roots:
  `/storage/emulated`, `/data/media`, `/sdcard`, `/data`. Ścieżka, która nie istnieje, kończy
  się błędem `ERR_NO_PATH`; ścieżka poza dozwolonymi roots lub zawierająca `..` kończy się
  błędem `ERR_BAD_PATH`.
- `path-restore` zapisuje z powrotem do oryginalnej lokalizacji, więc jest destrukcyjne i
  wymaga `"confirm": true`, bramki o dużym tarciu, jak `special-restore`. `ref`, który nie jest
  prawidłową kopią ścieżki, kończy się błędem `ERR_BAD_REF`.
- Oba działają **odłączone**; odpytuj `progress` zwróconym `opid`.

### `update-check`

`update-check` zgłasza, czy opublikowano nowszą wersję modułu, aby agent (lub WebUI) mógł ją
pokazać. To **czasownik odczytu, który zwraca natychmiast**: **nie** jest odłączony, więc nie ma
`opid` do odpytywania. Uruchamiany wyłącznie przez wyraźne działanie użytkownika, pobiera
opublikowany manifest aktualizacji modułu (adres URL `updateJson` z `module.prop`) za pomocą
dołączonego `curl` przez żądanie HTTP po stronie roota, działa to poza WebView, więc nie podlega
CSP WebUI, i porównuje opublikowany `versionCode` z zainstalowanym. Nie przyjmuje **żadnych
argumentów**.

W razie powodzenia zwraca:

| Pole | Typ | Znaczenie |
|------|-----|-----------|
| `ok` | bool | `true` |
| `current_version` | string | zainstalowany versionName |
| `current_code` | int | zainstalowany versionCode |
| `latest_version` | string | opublikowany versionName |
| `latest_code` | int | opublikowany versionCode |
| `update_available` | bool | `true`, gdy `latest_code` jest większy niż `current_code` |
| `zipUrl` | string | adres URL opublikowanego zipa |
| `changelog` | string | adres URL opublikowanego changeloga |
| `notes` | string | informacje o wydaniu |

Jeśli nie ma adresu URL `updateJson`, żądanie sieciowe się nie powiedzie, lub manifestu nie da się
sparsować, zwraca `{"ok":false,"code":"ERR_UPDATE_CHECK"}`.

`update-check` tylko **zgłasza** dostępność i informacje o wydaniu; samą aktualizację wykonuje twój
menedżer roota (KernelSU / APatch / Magisk) poprzez `updateJson` modułu, nigdy ten czasownik.

## Bariery bezpieczeństwa, których twój agent musi przestrzegać

- **`ssaid` jest ściśle opt-in (domyślnie wyłączone).** Tworzy kopię / przywraca
  ANDROID_ID urządzenia przez przepisanie pliku systemowego; przywracanie stosuje się dopiero po restarcie, a
  poprzedni plik jest zawsze najpierw zapisywany dla rollbacku. Wysyłaj `"ssaid": true`
  tylko na bezpośrednie, zamierzone żądanie użytkownika, nigdy domyślnie.
- **Akcje modyfikujące (restore, delete, import) są destrukcyjne** i są logowane do
  lokalnej ścieżki audytu (`logs/audit.jsonl`). Przywracanie jest wierne (wipe-then-extract), więc
  przywraca aplikację do dokładnego stanu kopii. Potwierdź zamiar, zanim je wywołasz.
- **`system_settings` jest opt-in i destrukcyjne, dokładnie jak `ssaid`.** Jego przywrócenie
  nadpisuje ustawienia całego urządzenia, więc wysyłaj je tylko na bezpośrednie żądanie
  użytkownika; jest zabezpieczone jawną zgodą i zapisywane w ścieżce audytu.
- **Przywracanie jest idempotentne.** Surowe przywracania providera (messages/contacts/wifi/
  bluetooth/calendar) **zastępują** zamiast scalać, dane providera są czyszczone, a archiwum
  jest rozpakowywane na wierzch, więc ponowne przywrócenie tej samej kopii nie może zduplikować
  wierszy. `dns` i `system_settings` są ponownie stosowane idempotentnym `settings put`.
- **Rozpakowywanie archiwów jest zabezpieczone przed path traversal.** Przywracanie działa jako
  root, więc każde archiwum (restore, import, special-restore, path-restore) jest sprawdzane
  przed jakimkolwiek zapisem: takie, którego elementy używają ścieżek bezwzględnych lub zawierają
  `..`, jest z góry odrzucane z `ERR_UNSAFE_ARCHIVE`, zanim nastąpi choćby jeden destrukcyjny
  zapis (GNU tar działa też z `--no-absolute-names`). Zmanipulowane archiwum nigdy nie może
  wyjść poza swój katalog docelowy.
- **Nigdy nie osłabiaj** zachowania (SELinux/uid/gid/tryby/xattr) ani reguły APK (APK
  są zawsze skompresowane, nigdy zaszyfrowane, chyba że ustawiono `encrypt_apk`).
- Traktuj wyjście JSON jako źródło prawdy; sprawdzaj `ok`/`code`, odpytuj `progress`,
  i uwidaczniaj kody `ERR_*` zamiast zgadywać.

Zobacz [ARCHITECTURE.md](ARCHITECTURE.md) i
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) dla wewnętrznych szczegółów.

---

*Ta dokumentacja została wygenerowana za pomocą Claude (Anthropic) i jest utrzymywana przez VD171. Poprawki i ulepszenia są mile widziane, zobacz [CONTRIBUTING.md](CONTRIBUTING.md).*
