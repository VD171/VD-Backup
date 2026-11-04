> **Languages:** [English](../BINARIES.md) · [العربية](../ar/BINARIES.md) · [Čeština](../cs/BINARIES.md) · [Deutsch](../de/BINARIES.md) · [Español](../es/BINARIES.md) · [فارسی](../fa/BINARIES.md) · [Français](../fr/BINARIES.md) · [हिन्दी](../hi/BINARIES.md) · [Bahasa Indonesia](../in/BINARIES.md) · [Italiano](../it/BINARIES.md) · [日本語](../ja/BINARIES.md) · [한국어](../ko/BINARIES.md) · [Nederlands](../nl/BINARIES.md) · Polski · [Português](../pt/BINARIES.md) · [Русский](../ru/BINARIES.md) · [Svenska](../sv/BINARIES.md) · [ไทย](../th/BINARIES.md) · [Türkçe](../tr/BINARIES.md) · [Tiếng Việt](../vi/BINARIES.md) · [中文](../zh/BINARIES.md)

---

# Dołączone pliki binarne: pochodzenie i audyt

Prywatność i bezpieczeństwo nie są w VDBackup opcjonalne. Narzędzie do kopii zapasowych działa jako root na
Twoich najbardziej osobistych danych, więc musisz móc zobaczyć dokładnie, co jest w nim zawarte. Ta
strona dokumentuje każdy prekompilowany plik binarny i bibliotekę, które niesie moduł, skąd każde z nich pochodzi,
oraz jak zweryfikować, że nie podrzucono niczego nieprzejrzystego.

## Zasady

- **Nic nieprzejrzystego.** Każdy dostarczany plik binarny i biblioteka jest możliwy do prześledzenia do nazwanego, publicznego
  upstreamu na przypiętej wersji, z zapisanym SHA-256. Żaden blob nie jest dołączany bez
  wpisu, który możesz sprawdzić.
- **Pobierane z upstreamu, nigdy z urządzenia.** Narzędzia natywne pochodzą z oficjalnego
  repozytorium pakietów Termux (podpisane pliki `.deb` pod `packages.termux.dev/apt`), nigdy
  nie są kopiowane z Termuksa zainstalowanego na jakimś telefonie. Build zawodzi głośno, nigdy
  nie improwizuje.
- **Odtwarzalne.** Uruchom build ponownie, a otrzymasz te same pliki; pobierz ponownie przypięte
  źródła, a wartości SHA-256 będą się zgadzać.
- **Ścieżka audytu podróżuje z modułem.** Nie jest tylko na stronie - podróżuje
  wewnątrz zainstalowanego modułu, na Twoim urządzeniu, więc możesz przeprowadzić audyt offline.

## Co jest dostarczane i skąd

| Artefakt | Źródło | Jak jest budowane |
|---|---|---|
| narzędzia natywne w `bin/<abi>/` (`tar`, `zstd`, `gzip`, `lz4`, `jq`, `rclone`, `restic`, `rsync`, `ssh`/`scp`/`sftp`, `age`, `age-keygen`, `script`, `sqlite3`) + ich domknięcie `lib/` | Oficjalne repozytorium apt **Termux** (`packages.termux.dev/apt`), oficjalne pakiety `.deb` | `.github/scripts/build_bin.sh` pobiera pliki `.deb` + ich zależności przechodnie, rozpakowuje je i kopiuje pliki binarne wraz z tylko tymi bibliotekami współdzielonymi, których każdy potrzebuje |
| `bin/<abi>/abx2xml`, `bin/<abi>/xml2abx` (zapasowy konwerter ABX) | Wydanie na GitHubie **rhythmcache/android-xml-converter** (`ABX_RELEASE`, statyczny ELF) | pobierane z przypiętego wydania przez `build_bin.sh` |
| `companion.apk` (opcjonalny companion Google Drive) | **To repozytorium**, `companion/` (Gradle/Kotlin) | budowane ze źródeł przez CI i podpisane kluczem projektu (`VD_Key`); nie jest prekompilowanym blobem |
| `vdbhelper.dex` (pomocnik framework) | **To repozytorium**, `dex/src/` (Java) | kompilowane ze źródeł przez CI za pomocą `javac` + `d8` |

Tylko dwa pierwsze wiersze to prekompilowane pliki binarne osób trzecich; dwa ostatnie są budowane ze
źródeł, które znajdują się w tym repozytorium i mogą być odczytane oraz ponownie zbudowane.

> **Edycje Full kontra lite.** Edycje lite pomijają tylko `rclone` i `restic` (dwa największe
> pliki binarne), aby pozostać małymi; `rsync` i `ssh`/`scp`/`sftp` są nadal obecne, a każdy
> inny plik binarny wymieniony powyżej również jest obecny. Edycje Full dodają `rclone`
> (dostawcy chmury) i `restic` (migawki).

## Manifest na urządzeniu: `PROVENANCE.json`

`build_bin.sh` zapisuje jeden `bin/<abi>/PROVENANCE.json` na ABI. Przy instalacji moduł
zachowuje tylko ABI Twojego urządzenia, więc ten plik pozostaje na urządzeniu w
`/data/adb/modules/vdbackup/bin/<abi>/PROVENANCE.json`. Zapisuje on:

- `sources`: każdy upstreamowy `.deb` (pakiet, wersja, pełny URL, SHA-256 pliku `.deb`) oraz
  wydanie ABX (URL, SHA-256 archiwum).
- `files`: każdy plik faktycznie dostarczony w `bin/<abi>/` (ścieżka, rozmiar, SHA-256).

Możesz go odczytać w WebUI (zakładka **O aplikacji** do niego linkuje) lub przez API agenta:

```sh
sh /data/adb/modules/vdbackup/helper.sh provenance '' | jq .
```

## Jak zweryfikować (krok po kroku)

1. **Sprawdź dostarczone pliki.** Policz hash każdego pliku w `bin/<abi>/` na Twoim
   urządzeniu i porównaj z `files[].sha256` w `PROVENANCE.json`:
   ```sh
   cd /data/adb/modules/vdbackup/bin/<abi>
   sha256sum tar zstd jq rclone ... lib/*
   ```
2. **Sprawdź pliki względem upstreamu.** Dla każdego wpisu `sources[]` pobierz przypięty
   `.deb` z jego URL, potwierdź, że jego SHA-256 zgadza się z `deb_sha256`, rozpakuj go i potwierdź,
   że pliki binarne/biblioteki, które zawiera, mają te same wartości hash co dostarczone. Pliki `.deb` w
   repozytorium Termux są same serwowane z podpisanego repozytorium apt Termuksa.
3. **Zbuduj od zera.** Uruchom samodzielnie `.github/scripts/build_bin.sh` (potrzebuje tylko
   `curl`, `ar`, `tar`, `xz`, `zstd`, `readelf`) i porównaj wynik z tym, co dostarczono.
4. **Companion i dex.** Zbuduj ponownie `companion/` i `dex/` ze źródeł; podpisem
   companion jest klucz projektu `VD_Key` (SHA-256
   `F3:F8:2B:B9:2F:2C:69:A1:75:90:1D:40:BD:65:DD:A6:8F:2B:B5:88:69:77:F5:EA:8B:BA:AA:51:40:E5:25:2B`).

## Zgłaszanie

Jeśli jakikolwiek dostarczony plik nie zgadza się ze swoim zapisanym źródłem, potraktuj to jako problem
bezpieczeństwa i zgłoś go (zobacz [SECURITY.md](SECURITY.md)). To jest dokładnie ten rodzaj rozbieżności, który ten
manifest istnieje, aby uczynić widocznym.
