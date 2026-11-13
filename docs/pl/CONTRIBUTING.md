> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · Polski · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Українська](../uk/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# Współtworzenie VDBackup

Dziękujemy za pomoc! VDBackup ma być łatwy do współtworzenia. Ten przewodnik mówi,
gdzie znajdują się poszczególne rzeczy oraz jakich kilku konwencji się trzymamy.

## Projekt w skrócie

VDBackup to **moduł WebUI dla KernelSU/APatch/Magisk**: skrypty powłoki + WebUI w czystym JS
+ statyczne pliki binarne per ABI. Funkcje podstawowe nie wymagają żadnej aplikacji. Zobacz
[ARCHITECTURE.md](ARCHITECTURE.md) i [docs/FILE-STRUCTURE.md](FILE-STRUCTURE.md).

To otwarty, natywnie rootowy **następca Swift Backup, Neo-Backup i
Android-DataBackup**: unia ich funkcji na licencji AGPLv3, z importem istniejących
kopii zapasowych Neo-Backup i Android-DataBackup, aby ludzie mogli się przenieść.

## Współtwórcy AI mile widziani

Asystenci i agenci AI są tu pełnoprawnymi współtwórcami, a nie dodatkiem na później.

- Projekt jest zbudowany tak, by był czytelny dla maszyn: każdy czasownik `helper.sh` wypisuje pojedynczy
  obiekt JSON, silnik to zwykła powłoka POSIX, a układ plików jest udokumentowany w
  [docs/FILE-STRUCTURE.md](FILE-STRUCTURE.md).
- Agent może administrować **każdą** treścią i akcją modułu bezgłowo poprzez
  to API JSON, pełna powierzchnia kontroli, czasowniki i zabezpieczenia są w
  [docs/AI-AGENTS.md](AI-AGENTS.md).
- Łatki tworzone z pomocą AI są recenzowane i akceptowane na tych samych zasadach co każde inne, według
  poprawności, przejrzystości i konwencji poniżej, a nie według tego, kto (lub co) je napisał.
- Jeśli sterujesz VDBackup z poziomu agenta, używaj wyjścia JSON z `helper.sh` jako
  kontraktu; nie zdrapuj WebUI.
- Ta sama poprzeczka dla wszystkich: prawdziwe funkcje nigdy nie są osłabiane, sekrety i dane urządzenia
  nigdy nie trafiają do repozytorium (zobacz surowy [.gitignore](.gitignore)), a akcje
  mutujące pozostają potwierdzane i audytowane.

## Konfiguracja dla deweloperów

- Potrzebujesz zrootowanego urządzenia/emulatora (KernelSU, APatch lub Magisk) do testów.
- Zbuduj flashowalny zip: `cd module && zip -r9 ../VD-Backup-dev.zip .`, a potem go sflashuj.
- WebUI to `module/webroot/` (otwórz je z menedżera roota). Backend to
  `module/helper.sh` (dispatcher) i `module/worker.sh` (odłączony silnik).
- Natywne pliki binarne znajdują się w `module/bin/<abi>/` i są tworzone przez CI
  (`.github/scripts/build_bin.sh`); zwykle nie przebudowujesz ich ręcznie.

## Konwencje

- **Każdy plik źródłowy** (`.sh`, `.js`, `.css`, `.html`, `.svg`, `.yml`) zaczyna się od
  nagłówka banera projektu (skopiuj go z dowolnego istniejącego pliku). Bez wyjątków.
- **Kod i komentarze po angielsku.** Komentarze trzymaj minimalne i tylko tam, gdzie potrzeba.
- **Bez em-dash ani en-dash**; zawsze używaj zwykłego łącznika `-`.
- WebUI to **vanilla JS** (jeden `scripts.js`); bez frameworków. Rozmawiaj z rootem tylko przez
  opakowanie `helper(verb, args)` i escapuj każdą interpolowaną wartość.
- **Nigdy nie osłabiaj** prawdziwej funkcji (np. zachowania SELinux/uid/gid/trybów).
- Akcje mutujące (restore, delete) muszą prosić o potwierdzenie i zapisywać log audytu.

## Internacjonalizacja (i18n)

- Ciągi UI znajdują się w `module/webroot/lang/`. Angielski to kanoniczne rozwiązanie awaryjne
  (`en.js` + `en.json`); pozostałe 20 języków to `<code>.json`.
- Aby dodać lub zmienić ciąg: edytuj `en.js` **oraz** `en.json`, a następnie zaktualizuj każdy
  `<code>.json`. Dotknięcie widocznej etykiety oznacza aktualizację **wszystkich** plików językowych i
  **wszystkich** `README.<code>.md`.
- Tłumaczenia to zwykły JSON, świetny pierwszy wkład. Zobacz listę języków w
  `module/webroot/i18n.js`.

## Commity i PR-y

- Trzymaj PR-y skupione. Opisz co i dlaczego.
- Podpisz swoje commity (DCO): `git commit -s` (dodaje `Signed-off-by:`).
- CI musi pozostać zielone. Bądź życzliwy w recenzjach, zobacz [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Dobre pierwsze zadania

Szukaj etykiet `good first issue` i `help wanted`. Tłumaczenia, dokumentacja, nowe
gotowe ustawienia miejsc docelowych `rclone` i dopieszczanie WebUI to świetne punkty startowe.

<!-- doc-footer -->

---

> _Ta dokumentacja została wygenerowana za pomocą Claude (Anthropic) i jest utrzymywana przez VD171. Poprawki i ulepszenia są mile widziane; zobacz [CONTRIBUTING.md](CONTRIBUTING.md)._
