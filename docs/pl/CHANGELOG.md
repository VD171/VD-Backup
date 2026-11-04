> **Languages:** [English](../../CHANGELOG.md) · [العربية](../ar/CHANGELOG.md) · [Čeština](../cs/CHANGELOG.md) · [Deutsch](../de/CHANGELOG.md) · [Español](../es/CHANGELOG.md) · [فارسی](../fa/CHANGELOG.md) · [Français](../fr/CHANGELOG.md) · [हिन्दी](../hi/CHANGELOG.md) · [Bahasa Indonesia](../in/CHANGELOG.md) · [Italiano](../it/CHANGELOG.md) · [日本語](../ja/CHANGELOG.md) · [한국어](../ko/CHANGELOG.md) · [Nederlands](../nl/CHANGELOG.md) · Polski · [Português](../pt/CHANGELOG.md) · [Русский](../ru/CHANGELOG.md) · [Svenska](../sv/CHANGELOG.md) · [ไทย](../th/CHANGELOG.md) · [Türkçe](../tr/CHANGELOG.md) · [Tiếng Việt](../vi/CHANGELOG.md) · [中文](../zh/CHANGELOG.md)

---

# Changelog

Wszystkie istotne zmiany w VDBackup są udokumentowane tutaj. Tylko po angielsku.

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
  towarzyszącą (`ru.vd171.vdbackup`), która niesie obowiązkowe powiadomienie o ukryciu przez HMA-OSS.
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
