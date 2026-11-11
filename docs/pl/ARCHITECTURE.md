> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · Polski · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# Architektura

VDBackup to rootowy moduł WebUI. Ma trzy warstwy: **WebUI** (to, co widzisz),
**backend powłoki** (to, co wykonuje pracę, jako root) oraz **dołączone pliki binarne**
(archiwizatory i mechanizmy transportu). Wszystko działa już jako root, więc nie ma żadnego
monitu o uprawnienia ani aplikacji towarzyszącej dla funkcji podstawowych.

```
   ┌──────────────────────────────────────────────────────────┐
   │  WebUI  (module/webroot, vanilla JS)                      │
   │    index.html · scripts.js · i18n.js · styles.css         │
   │    lang/en.js + 21 languages · config.json (CSP, no net)  │
   └───────────────┬──────────────────────────────────────────┘
                   │  ksu.exec("sh scripts/helper.sh <verb> <b64json>")
                   ▼
   ┌──────────────────────────────────────────────────────────┐
   │  scripts/helper.sh  (dispatcher, returns JSON)            │
   │    list-apps · config · dests · backup/restore/import ... │
   │    long ops -> setsid nohup scripts/worker.sh  (detached) │
   └───────────────┬───────────────────────────────┬──────────┘
                   │                               │ progress-<opid>.json (poll)
                   ▼                               ▼
   ┌────────────────────────────────────┐   ┌──────────────────────────┐
   │  scripts/worker.sh (root, detached)│   │  framework helper (opt.) │
   │   force-stop · tar|zstd|age        │   │  app_process + dex       │
   │   pm install · chown/chcon         │   │  perms/appops/ssaid/...  │
   │   transfer · notify                │   │  (dex primary, shell fb) │
   └───────────────┬────────────────────┘   └──────────────────────────┘
                   ▼
   ┌──────────────────────────────────────────────────────────┐
   │  bin/<abi>/  tar · zstd · lz4 · rclone · rsync · ssh · restic │
   └──────────────────────────────────────────────────────────┘
                   ▼
   Destinations: local · SFTP/SCP · SMB · WebDAV · FTP · S3 · 70+ (rclone)
                 rsync · restic repos · Google Drive (opt-in companion)
```

## Kluczowe punkty

- **Już root.** Proces modułu działa jako root, więc silnik to zwykła powłoka. ~85%
  pracy to czysta powłoka (`tar`/`zstd`/`age`/`pm`/`am`/`chown`/`chcon`/`rclone`/...).
- **Odłączone wykonanie.** Kopia zapasowa/przywracanie działają przez `setsid nohup`, jako niezależny rootowy
  proces. Zamknięcie WebUI ich nie przerywa; interfejs ponownie się podłącza, odczytując
  `logs/progress-<opid>.json`.
- **Pomocnik frameworka (~15%).** Drobnoziarniste uprawnienia, AppOps, SSAID, StorageStats,
  ikony i uprzywilejowane Wi-Fi wymagają frameworka Androida. Małe uruchomienie `dex` przez
  `app_process` (bez zainstalowanej aplikacji) obsługuje je, z awaryjnym rozwiązaniem w powłoce.
- **Przenośność.** Tylko standardowe formaty; kopie zapasowe otwierają się na komputerze bez tego modułu.
- **Stan** znajduje się w `/data/adb/vdbackup/` (konfiguracja, zadania, cele, zaszyfrowane
  dane uwierzytelniające, logi, staging). **Kopie zapasowe** są zapisywane do widocznego dla użytkownika, szyfrowanego
  danymi uwierzytelniającymi magazynu w `/sdcard/VDBackup/` (`/data/media/<user>/VDBackup`, dla każdego użytkownika),
  a nie w `/data/adb` (które jest szyfrowane urządzeniem i czytelne przed pierwszym odblokowaniem).

## Gwarancja kompatybilności

Kopia zapasowa musi pozostać możliwa do przywrócenia na zawsze. To twarda zasada, a nie staranie na miarę możliwości.

**Zakres.** Gwarancja obejmuje kopie zapisane przez **v1.01 i nowsze** (pierwsze oficjalnie
opublikowane wydanie) i tylko przez oficjalnie opublikowane, wydane wersje. v1.00 była kompilacją
wyłącznie testową i jest wyraźnie poza zakresem; kompilacje przedpremierowe i deweloperskie nie są
objęte. Od pierwszego publicznego wydania obietnica poniżej jest absolutna:

- **Tylko standardowe formaty.** Każde archiwum to zwykły `tar` skompresowany za pomocą `zstd`,
  `gzip` lub `lz4`, opcjonalnie opakowany za pomocą `age`. Nie ma żadnego zastrzeżonego kontenera, więc
  kopię zapasową można otworzyć na dowolnym komputerze zwykłymi narzędziami nawet bez tego modułu (zobacz
  `etc/RECOVERY.md`). Format, którego nie możemy porzucić.
- **Metadane tylko do dopisywania.** `manifest.json` zawiera `format_version`. Schemat zawsze tylko
  rośnie: pola można *dodawać*, nigdy nie usuwać, zmieniać nazw ani przeznaczenia. Przywracanie czyta
  każde pole defensywnie (brakujące pola opcjonalne wracają do wartości domyślnej) oraz instaluje
  pliki APK i rozpakowuje archiwa według ich nazwy pliku i rozszerzenia, a nie przez założenie stałego
  kształtu manifestu.
- **Przywracanie zgodne w przód.** Przywracanie nigdy nie odrzuca kopii zapasowej z powodu jej wieku, a
  starszy VDBackup po cichu pomija typy elementów, których nie zna, zamiast zawodzić. Nowszy
  VDBackup przywraca zatem każdą starszą kopię zapasową, a archiwa w standardowym formacie i tak pozostają
  możliwe do przywrócenia ręcznie.

Krótko mówiąc: wszystko, co VDBackup kiedykolwiek zapisał, każdy przyszły VDBackup (oraz zwykły komputer)
może nadal przywrócić. Zmiana formatu w sposób, który psuje wcześniejszą kopię zapasową, nie jest
dozwolona; nowe możliwości są dodawane za `format_version` oraz nowymi, dopisywanymi polami.

Pełny projekt techniczny (format archiwum, schemat metadanych, potoki, kryptografia,
cele, importery) opiekunowie prowadzą w szczegółowych notatkach projektowych; ten plik to przegląd
skierowany do współtwórców.

*Ta dokumentacja została wygenerowana za pomocą Claude (Anthropic) i jest utrzymywana przez VD171. Poprawki i ulepszenia są mile widziane, zobacz [CONTRIBUTING.md](CONTRIBUTING.md).*
