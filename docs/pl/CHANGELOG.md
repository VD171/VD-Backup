> **Languages:** [English](../../CHANGELOG.md) · [العربية](../ar/CHANGELOG.md) · [Čeština](../cs/CHANGELOG.md) · [Deutsch](../de/CHANGELOG.md) · [Español](../es/CHANGELOG.md) · [فارسی](../fa/CHANGELOG.md) · [Français](../fr/CHANGELOG.md) · [हिन्दी](../hi/CHANGELOG.md) · [Bahasa Indonesia](../in/CHANGELOG.md) · [Italiano](../it/CHANGELOG.md) · [日本語](../ja/CHANGELOG.md) · [한국어](../ko/CHANGELOG.md) · [Nederlands](../nl/CHANGELOG.md) · Polski · [Português](../pt/CHANGELOG.md) · [Русский](../ru/CHANGELOG.md) · [Svenska](../sv/CHANGELOG.md) · [ไทย](../th/CHANGELOG.md) · [Türkçe](../tr/CHANGELOG.md) · [Tiếng Việt](../vi/CHANGELOG.md) · [中文](../zh/CHANGELOG.md)

---

# Changelog

Wszystkie istotne zmiany w VDBackup są udokumentowane tutaj. Tylko po angielsku.

## v1.05

Niezawodność:

- Kopie wsadowe nie zatrzymują się już w połowie, gdy opuścisz aplikację. Cały wybór, grupa etykiet lub zaplanowane uruchomienie są teraz obsługiwane przez jeden odłączony proces root, który działa dalej po zamknięciu WebUI i jest chroniony przed zakończeniem przy niedoborze pamięci. Widok postępu łączy się ponownie po powrocie.

Ustawienia:

- Kopia ustawień: wyeksportuj miejsca docelowe, harmonogramy, ustawienia wstępne i zapisane dane logowania do jednego zaszyfrowanego pliku, a następnie zaimportuj go na innym urządzeniu lub po czystej instalacji. Plik zawsze prosi o hasło, ponieważ zawiera hasła zdalne, a import scala je z urządzeniem bez usuwania tego, co już istnieje.
- Zapisane zdalne dane logowania i klucz szyfrowania urządzenia można teraz usunąć w ustawieniach jednym krokiem, zachowując miejsca docelowe, harmonogramy i kopie zapasowe.

Bezpieczeństwo:

- Kopie można przechowywać tylko tam, gdzie pozostają zaszyfrowane w spoczynku. Miejsca docelowe w ścieżkach czytelnych przed pierwszym odblokowaniem, takich jak /data/adb lub /data/system, są odrzucane.
- Zapisane poświadczenia, rclone.conf i klucz age znajdują się teraz w pamięci szyfrowanej poświadczeniami, zablokowanej do pierwszego odblokowania, zamiast w miejscu wcześniej czytelnym; aktualizacja modułu przenosi je tam na stałe.
- Kopie sprawdzają teraz wolne miejsce przed rozpoczęciem i zatrzymują się z czytelnym komunikatem zamiast kończyć się niepowodzeniem w połowie.

Przywracanie:

- Przywracanie aplikacji, która nie jest już zainstalowana, najpierw ponownie instaluje jej APK, a okno przywracania oferuje opcję APK, gdy kopia ją zawiera. Przywracanie, które nie może zainstalować aplikacji, zgłasza niepowodzenie zamiast udawać sukces.
- Operacje na aplikacjach, uprawnieniach i ustawieniach działają teraz w czystym środowisku, naprawiając błędy "Failed transaction", które blokowały przywracanie, app-ops i ustawienia na niektórych ROM-ach.

Miejsca docelowe:

- Możesz tworzyć kopie na karcie SD lub dysku USB: selektor folderów pokazuje skrót do każdego woluminu pamięci i akceptuje ścieżki na nośnikach wymiennych.

## v1.04

Poprawki:

- Foldery kopii zapasowych pozostają teraz automatycznie otwieralne w menedżerze plików: ich uprawnienia są ponownie ustawiane przy instalacji, przy każdym starcie i za każdym razem, gdy otwiera się WebUI, więc folder pozostawiony tylko dla właściciela (na przykład kopia sprzed v1.03.2) naprawia się sam bez ręcznego kroku.

Prywatność:

- Gdy masz lokalne kopie, karta Kopie zapasowe przypomina teraz o ukryciu folderu kopii za pomocą SUSFS, tak jak aplikacji towarzyszącej: jego obecność może inaczej ujawnić root lub odblokowany bootloader. Ukrywa SUSFS; przypomnienie tylko kieruje Cię we właściwe miejsce.

Kopie zapasowe:

- Możesz teraz ustawić, które elementy każda aplikacja kopiuje, na przykład tylko APK lub APK + OBB, stosowane w kopiach zbiorczych, automatycznych i zaplanowanych. Pojedyncza ręczna kopia nadal pozwala wybrać na miejscu, z wartościami wstępnie wypełnionymi z zestawu aplikacji. Ustaw to w Ustawieniach, obok listy wykluczonych aplikacji.

- Ustawienia kopii: zapisz nazwane zestawy tego, co uwzględnić, i zastosuj je jednym wyborem w oknie kopii.
- Wielu użytkowników: kopie aplikacji, kopie specjalne i przywracanie podążają teraz za wybranym użytkownikiem Androida.
- Aplikacje wracają pełniejsze: ich profile kompilacji ART oraz uprawnienia nasłuchiwania powiadomień, dostępności i wyłączenia z Doze są kopiowane i przywracane.
- Bardziej niezawodne przywracanie: własność plików i kontekst SELinux są ponownie wyprowadzane na urządzeniu docelowym, więc przywracanie działa poprawnie między urządzeniami i użytkownikami.
- Bezpieczniejsze przywracanie: Play Protect i weryfikator instalacji są wyciszane tylko podczas instalacji i przywracane dokładnie; menedżer roota nigdy nie jest kopiowany ani przywracany; a źródło instalacji jest weryfikowane i zapisywane.
- Tagi aplikacji: nadaj aplikacjom swobodne etykiety jak games czy work, filtruj listę aplikacji według tagu i utwórz kopię całej otagowanej grupy naraz.

## v1.03.2

Poprawki:

- Strona logowania do chmury na urządzeniu zawsze pokazywała "Sign-in failed", nawet gdy logowanie
  się powiodło. Teraz pokazuje prawdziwy wynik.
- Zapisane kopie można teraz otworzyć menedżerem plików: foldery kopii na aplikację były
  dostępne tylko dla właściciela, więc nawet menedżer z rootem nie wchodził; teraz są
  dostępne jak reszta /sdcard/VDBackup.

Cele w chmurze:

- Opcjonalna aplikacja towarzysząca Google Drive jest teraz budowana i dołączana, więc
  Google Drive działa przez towarzysza na urządzeniu (konto urządzenia, bez ręcznego
  wklejania tokenu) oprócz rclone.

Interfejs:

- Okno kopii zapasowej ma wybór miejsca docelowego, więc kopia może trafić do wybranego miejsca
  w chmurze lub zdalnego bez wcześniejszej zmiany domyślnego miejsca w Ustawieniach.
- Aplikacja sprawdza nowszą wersję przy otwarciu (najwyżej raz na godzinę) i pokazuje baner
  aktualizacji tylko, gdy jest dostępna; milczy, gdy jest aktualna lub offline.

## v1.03.1

Nowy zakres kopii:

- Nowe kategorie kopii specjalnej: kalendarz (dostawca kalendarza plus przenośny eksport
  `calendar.json`), tapeta (tapeta ekranu głównego i blokady), prywatny DNS (tryb i
  specyfikator) oraz ustawienia systemu (pełny zrzut ustawień system/global/secure).
  Ustawienia systemu są opt-in i nadpisują przy przywracaniu ustawienia obejmujące całe
  urządzenie, więc są zabezpieczone jak SSAID, z wyraźną zgodą i pełnym wpisem audytu.
- Samodzielna kopia folderu i pliku: wykonaj kopię dowolnej ścieżki bezwzględnej (pamięć
  współdzielona lub dane aplikacji) jako skompresowane, zapieczętowane manifestem archiwum i
  przywróć ją do tej samej ścieżki. Przywracanie wymaga wyraźnego potwierdzenia.

Bezpieczniejsze przywracanie:

- Każde archiwum jest sprawdzane, zanim cokolwiek zostanie zapisane: kopia, której zawartość
  wskazuje poza swój cel (ścieżka bezwzględna lub komponent `..`), jest odrzucana, więc
  przywracanie działające jako root nie może zostać oszukane do zapisu poza miejscem
  docelowym.

Postęp i harmonogram:

- Postęp na żywo pokazuje teraz prędkość transferu, ETA i licznik elementów podczas kopii,
  plus krok weryfikowany sumą kontrolną dla przesyłów do chmury oraz wstępne sprawdzenie
  "za mało miejsca".
- Zaplanowane zadania można warunkować: uruchamiać tylko na Wi-Fi, tylko podczas ładowania,
  tylko powyżej poziomu baterii lub tylko w wybranych dniach tygodnia; zaplanowane zadanie
  jest też pomijane, gdy urządzenie jest krytycznie gorące. Pominięte zadanie jest ponawiane
  przy następnym ticku.

Cele w chmurze:

- Podłącz dowolny backend rclone z interfejsu: rozwijana lista zdalnych celów chmurowych
  oferuje popularnych dostawców (Google Drive, Dropbox, OneDrive, Box, pCloud, Mega,
  Backblaze B2, S3, SFTP, WebDAV, FTP, SMB) oraz opcję "Custom (advanced)", w której
  wpisujesz nazwę dowolnego innego backendu rclone i jego parametry `key=value`, dzięki
  czemu dostępne są wszystkie backendy rclone.
- Logowanie na urządzeniu (bez PC): dostawcy, którzy wymagają logowania przez przeglądarkę
  (Google Drive, Dropbox, OneDrive, Box, pCloud), mają przycisk "Authorize in browser",
  który otwiera własną przeglądarkę telefonu na stronie zgody dostawcy; po zatwierdzeniu
  wracasz do aplikacji, a zdalny cel jest zapisywany automatycznie, z tokenem przechwyconym
  na urządzeniu. Ręczne wklejenie tokenu pozostaje dostępne jako rozwiązanie zapasowe.

Interfejs:

- Regulowana skala interfejsu (przeciągany suwak) przeskalowuje cały interfejs, aby pasował do
  ekranów o różnej gęstości pikseli; 100% to wartość domyślna i pozostaje niezmieniona.
- Interfejs jest teraz renderowany od prawej do lewej dla języka arabskiego i perskiego.
- Przegląd startowy z liczbami kopii i paskiem pamięci, znaczkami statusu, kopiowaniem hashów
  i ścieżek do schowka, przełącznikami w stylu Androida oraz akcją "Check for updates".
- Dziennik aktywności to pełny ekran, który otwiera się natychmiast, z akcją "Export logs",
  która zapisuje plik dziennika, który możesz dołączyć do zgłoszenia.

Poprawki:

- Przywracanie i import nie zawodzą już na urządzeniach, których dołączony `tar` nie
  akceptuje opcji `--no-absolute-names`; kontrola bezpieczeństwa archiwum jest niezależna od
  tej opcji.
- "Check for updates" działa nawet tam, gdzie nie dołączono żadnego klienta HTTP, przechodząc
  na dołączony rclone; a dziennik aktywności nie otwiera się już długo.

## v1.01

Pierwsze publiczne wydanie. Moduł WebUI dla KernelSU/APatch/Magisk, który tworzy kopie zapasowe i
przywraca aplikacje oraz ich dane w całości jako root, bez monitu o przyznanie uprawnień.

Silnik i formaty:

- Silnik kopii zapasowej/przywracania działa jako odłączony proces roota (`setsid`): przetrwa zamknięcie
  WebUI lub menedżera roota, a interfejs ponownie dołącza do bieżącego postępu poprzez `opid`.
- Trzy tryby kopii zapasowej: Full (tar.zst, lokalnie lub zdalnie), Snapshot (repozytorium restic,
  szyfrowane i zdeduplikowane) oraz Mirror (synchronizacja rclone/rsync 1:1). Pliki APK są zawsze
  kompresowane, nawet w trybie mirror.
- Elementy na aplikację: APK (base + splits), `data`, `data_de`, `obb`, external i media. Kontekst
  SELinux, uid/gid, tryby oraz xattr/caps są zachowywane; przywracanie korzysta z sesji `pm install` i
  przemapowuje właściciela/kontekst na bieżący uid.
- Uwzględnia poszczególnych użytkowników w całości (obsługa wielu użytkowników). Kopie zapasowe są
  przechowywane w `/sdcard/VDBackup` (dla każdego użytkownika), poza `/data/adb`, więc nie są czytelne
  przed pierwszym odblokowaniem; każdy cel jest umieszczany w przestrzeni nazw pod `<path>/vdbackup`.
- Kompresja: brak, lz4, zstd (poziomy) lub gzip ("tryb zgodności"). Manifest JSON rejestruje urządzenie,
  pakiet (w tym etykietę aplikacji), elementy i uprawnienia.
- Przenośne szyfrowanie za pomocą `age` (generowanie kluczy), a także przewodnik PC RECOVERY dołączany do
  każdej zaszyfrowanej kopii zapasowej, aby można ją było odszyfrować i rozpakować wszędzie, bez modułu.

Cele i chmura:

- Cele: dodaj/wypisz/przetestuj/usuń (lokalne, zdalne rclone, repozytorium restic oraz opcjonalny
  towarzysz Google Drive); dane uwierzytelniające są przechowywane w postaci zaciemnionej, nigdy
  jawnie.
- Twórz zdalne lokalizacje rclone z poziomu UI/API (`remote-add`/`remote-list`/`remote-del`), tak aby
  dowolny backend chmurowy (SFTP, SMB, WebDAV, FTP, S3, Google Drive i inne) był osiągalny bez ręcznej
  edycji `rclone.conf`.
- Google Drive na dwa sposoby: przez rclone (bez konta Google Cloud) lub opcjonalną bezgłową aplikację
  towarzyszącą (`ru.vd171.vdbackup`), która niesie obowiązkowe powiadomienie o ukryciu przez [HMA-OSS](https://github.com/frknkrc44/HMA-OSS).
- Polityka sieci: wybierz, czy transfery do chmury mogą używać dowolnego połączenia, tylko Wi-Fi lub
  tylko danych komórkowych; egzekwowane dla zadań ręcznych i zaplanowanych. Cele lokalne są wyłączone.

Migracja do wewnątrz:

- Import z Neo-Backup, w tym kopii zapasowych szyfrowanych hasłem (AES-256-GCM odszyfrowane przez pomocnika
  dex; WebUI pyta o hasło).
- Import z Android-DataBackup (instalacja plików APK, rozpakowanie archiwów user/user_de/data,
  przemapowanie).
- Oba zweryfikowane na prawdziwych kopiach zapasowych na wielu urządzeniach.

Integralność i bezpieczeństwo:

- Wierne przywracanie metodą wyczyść-potem-rozpakuj; weryfikacja sha256 na archiwum (domyślnie włączona
  dla Full oraz kontrola integralności repozytorium dla Snapshot), przebieg próbny (dry-run) i test
  przywracania. Archiwa są odczytywane ponownie w celu sprawdzenia kompletności; uszkodzone archiwum ani
  nieprawidłowa nazwa pakietu nie mogą nigdy wywołać destrukcyjnego przywracania, a błędy transferu
  zdalnego są zgłaszane, nigdy po cichu.
- Przywracanie selektywne: przywróć dowolny podzbiór elementów, które zawiera kopia (APK, data, dane
  chronione, OBB, external, media), wszystkie domyślnie zaznaczone.
- Usuwanie kopii z interfejsu/API (`delete-backup`) oraz retencja keep-last-N dla kopii ręcznych
  (`prune`); każde usunięcie, przywrócenie, przycięcie i uruchomienie zaplanowane jest zapisywane do
  lokalnego dziennika audytu w formacie JSON, który możesz przejrzeć w aplikacji.
- Uprawnienia czasu wykonania i AppOps są przechwytywane do manifestu i ponownie stosowane przy
  przywracaniu. Źródło instalacji (installerPackageName) oraz stan włączone/wyłączone są również
  przechwytywane i ponownie stosowane przy przywracaniu.
- Fałszowanie źródła instalacji: domyślnie przywrócona aplikacja zgłasza Sklep Play jako swoje źródło
  instalacji (ustawiane w czasie instalacji przez sesję instalacji, ponieważ przywrócona aplikacja inaczej
  wygląda na sideloaded); przełączalne globalnie i dla pojedynczego przywracania, a po wyłączeniu
  zachowywane jest przechwycone źródło. Zaawansowany, opcjonalny tryb "deep" dodatkowo fałszuje pakiet
  inicjujący i źródło pakietu, edytując systemową bazę pakietów (najpierw kopia bajt-dokładna, stosuje się
  po restarcie), tak że aplikacja wygląda na w pełni zainstalowaną ze sklepu.
- SSAID (ANDROID_ID urządzenia): ściśle opt-in i wyraźnie oznaczone; z obsługą ABX; żywy plik jest przed
  każdym nadpisaniem zawsze archiwizowany bajt w bajt na potrzeby wycofania; obowiązuje po ponownym
  uruchomieniu.
- Przywracanie i import wymagają wyraźnego potwierdzenia "to nadpisze bieżące dane aplikacji" przed
  kontynuacją.

Harmonogram i automatyzacja:

- Zaplanowane kopie z retencją keep-N, zarządzane z karty Schedule (na aplikację, codziennie/co
  godzinę/co tydzień z opcjonalną porą, trybem i celem).
- Automatyczna kopia przy instalacji lub aktualizacji: opcjonalny obserwator korzysta z heartbeatu
  harmonogramu, wykonuje w tle kopie nowych lub zaktualizowanych aplikacji i tylko zasiewa przy pierwszym
  uruchomieniu, więc jego włączenie nigdy nie tworzy kopii wszystkiego naraz. Respektuje ustawienie
  wykluczonych aplikacji (blocklist).

Kopie specjalne (ogólnosystemowe):

- Kopia wiadomości (SMS/MMS), kontaktów i rejestru połączeń, Wi-Fi i Bluetooth jako surowych, wiernie
  zarchiwizowanych danych systemowych (to samo zachowanie SELinux/xattr i opcjonalne szyfrowanie age co
  kopie aplikacji). Przywracanie jest wierne dla tego samego urządzenia/tej samej ROM, wymaga restartu i
  jest zabezpieczone wyraźnym potwierdzeniem nadpisania-i-restartu.
- Opcjonalny przenośny eksport obok surowego archiwum: wiadomości, rejestr połączeń i kontakty są
  zapisywane również jako otwieralny JSON (odczytywany wbudowanym sqlite3 wprost z baz danych provider, tak
  że treści wiadomości z przecinkami lub znakami nowej linii pozostają nienaruszone), dając kopię
  międzyurządzeniową, niewymagającą modułu. Przenośna kopia jest też szyfrowana, gdy kopia jest
  zaszyfrowana, więc nigdy nie ujawnia tego, co chroni archiwum.

Integracja z systemem:

- Montowanie zainstalowanej aplikacji jako systemowej bez naruszania rzeczywistej partycji /system:
  VDBackup przygotowuje APK aplikacji we własnym podmodule overlay, który montuje menedżer root. Z NoMount
  na KernelSU jest wstrzykiwana na żywo (bez restartu); w przeciwnym razie stosuje się przy następnym
  rozruchu, więc nigdy nie zależy od tego, czy NoMount jest zainstalowany. Wybierz umieszczenie zwykłe lub
  uprzywilejowane.

WebUI:

- Lista aplikacji pokazuje prawdziwą zlokalizowaną nazwę aplikacji (odczytaną z APK, więc przetrwa
  odinstalowanie) obok pakietu, z leniwie ładowanymi, buforowanymi ikonami renderowanymi jako
  zaokrąglone kafelki z obsługą ikon adaptacyjnych.
- Dotknij aplikacji, aby otworzyć jej historię kopii zapasowych i przywrócić dowolną wcześniejszą kopię;
  karta Kopie zapasowe pokazuje nazwę i pakiet w osobnych wierszach i otwiera arkusz szczegółów dla
  każdej kopii (wersja, źródło instalacji, stan, data, rozmiar, elementy, liczba uprawnień, urządzenie).
- Filtrowanie listy aplikacji według użytkownika/systemu/wszystkich oraz sortowanie według nazwy lub
  pakietu; wybór kilku aplikacji i wykonanie ich kopii w jednej partii; wykluczanie aplikacji z kopii
  automatycznych i zaplanowanych.
- Wybór tego, co uwzględnić, oraz przełączanie verify lub dry-run dla każdej kopii; wybór przywracania
  wyłącznie testowego, które rozpakowuje do staging bez dotykania żywej aplikacji.
- Jasny/ciemny motyw, selektor koloru akcentu, wybór języka, karta "Informacje" (z projektami
  siostrzanymi i manifestem audytu dołączonych plików binarnych), selektor folderów dla celu
  lokalnego, zlokalizowany postęp operacji z natychmiastową
  informacją zwrotną oraz nowoczesne okna dialogowe w aplikacji (brak systemowych wyskakujących okien
  alert/confirm).
- Nawigacja przyciskiem Wstecz wraca do poprzedniej karty i najpierw zamyka okna dialogowe; okna są
  pływające, a aplikacja przetrwa ponowne otwarcie, ponownie podłączając się do żywych operacji.

Przyjazny dla AI i i18n:

- Udokumentowana powierzchnia sterowania JSON, aby agenci mogli zarządzać każdą akcją bezgłowo
  (`docs/AI-AGENTS.md`); WebUI jest tylko jednym z klientów tego API.
- README i cała dokumentacja projektu są przetłumaczone na 21 standardowych języków (`docs/<lang>/`), a
  dokumentacja jest zwierciadlana do wiki.
- Bogaty wykaz aplikacji i odszyfrowywanie Neo działają przez pomocnika dex sterowanego jako root
  (`IPackageManager` przez ServiceManager), więc działają tam, gdzie ActivityThread się zawiesza.

*Ta dokumentacja została wygenerowana za pomocą Claude (Anthropic) i jest utrzymywana przez VD171. Poprawki i ulepszenia są mile widziane, zobacz [CONTRIBUTING.md](CONTRIBUTING.md).*
