<!--
  VD BACKUP - full app & data backup and restore as root, from a WebUI.
  Copyright (C) 2026  VD171 - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<p align="center">
  <img src="module/webroot/assets/logo-wordmark.png" alt="VDBackup" width="320">
</p>

<p align="center">
  <b>Pełna kopia zapasowa i przywracanie aplikacji oraz danych jako root - w całości sterowane przez WebUI.</b><br>
  Moduł KernelSU / APatch / Magisk. Bez monitu "przyznaj su", bez przełączania <code>sucompat</code>.
</p>

<p align="center">
  <a href="https://github.com/VD171/VD-Backup/releases">Wydania</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki">Wiki</a> ·
  <a href="docs/USER-GUIDE.md">Przewodnik użytkownika</a> ·
  <a href="docs/AI-AGENTS.md">Agenci AI</a> ·
  <a href="CONTRIBUTING.md">Współtworzenie</a> ·
  <a href="https://xdaforums.com/t/VD-Backup.4807267/">Wątek na XDA</a>
</p>

> **Languages:** [English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

---

## Czym jest

VDBackup to root-**moduł WebUI**, który tworzy kopie zapasowe i przywraca Twoje
aplikacje oraz ich dane **bez aplikacji towarzyszącej dla podstawowych funkcji** -
ponieważ moduł już działa jako root, nie ma niczego, na co trzeba by "zezwalać". Ma na
celu objąć wszystko, co robią popularne aplikacje do kopii zapasowych, w jednym miejscu
i z przejrzystym WebUI.

Jest pomyślany jako otwarty, natywnie-rootowy **następca Swift Backup, Neo-Backup i
Android-DataBackup**: suma tego, co one robią, na licencji AGPLv3, a nawet potrafi
importować istniejące kopie zapasowe Neo-Backup i Android-DataBackup, abyś mógł się przenieść.

## Funkcje

- **Aplikacje:** APK (podstawa + splity), dane aplikacji (`/data/data`), dane chronione
  przez urządzenie (`/data/user_de`), dane zewnętrzne (`Android/data`), OBB, multimedia.
- **Dane systemowe/specjalne:** uprawnienia, AppOps oraz (opcjonalnie) SSAID, tam gdzie pozwala na to root.
- **Tryby kopii zapasowej:** **Full** (przenośny `tar.zst`), **Snapshot** (przyrostowy +
  wersjonowany, przez `restic`) i **Mirror** (synchronizacja 1:1, przez `rclone`/`rsync`).
- **Wierne zachowanie:** konteksty SELinux, uid/gid, tryby, xattr i capabilities.
- **Kompresja:** brak / lz4 / zstd / gzip (gzip = "tryb zgodności", otwiera się wszędzie).
- **Szyfrowanie:** opcjonalne i przenośne (`age` + hasło lub AES-256 zip) - nigdy nie
  powiązane ze sprzętem urządzenia, więc kopia przywraca się na innym urządzeniu lub otwiera na komputerze.
- **Miejsca docelowe:** lokalnie, SFTP, SCP, SMB, WebDAV, FTP, S3 i ponad 70 innych (`rclone`),
  a także repozytoria `rsync` i `restic`. Opcjonalnie Dysk Google przez malutki opcjonalny komponent towarzyszący.
- **Integralność:** każde archiwum jest weryfikowane względem manifestu; próbny przebieg
  (dry-run) i test przywracania pozwalają sprawdzić kopię, niczego nie naruszając.
- **Przywracanie selektywne:** przywróć dowolny podzbiór elementów kopii; usuwaj kopie i prowadź
  dziennik aktywności/audytu każdej destrukcyjnej akcji.
- **Kopie specjalne:** wiadomości (SMS/MMS), kontakty i rejestr połączeń, Wi-Fi i Bluetooth,
  z opcjonalnym przenośnym eksportem do JSON, który otworzysz na komputerze.
- **Harmonogram + automatyzacja:** cykliczne zadania z przycinaniem keep-N, a także opcjonalna
  automatyczna kopia przy instalacji/aktualizacji i lista wykluczonych aplikacji.
- **Źródło instalacji:** przywrócone aplikacje domyślnie zgłaszają Sklep Play jako swoje źródło
  instalacji (przełączalne); zaawansowana opcja fałszuje też pakiet inicjujący i źródło.
- **Montowanie jako aplikacja systemowa:** zamontuj zainstalowaną aplikację jako systemową bez naruszania
  rzeczywistej partycji `/system` (bezsystemowy podmoduł overlay, świadomy NoMount).
- **W tle:** kopia zapasowa/przywracanie działają odłączone i przetrwają zamknięcie WebUI,
  z powiadomieniami o rozpoczęciu/zakończeniu.
- **Migracja:** importuje istniejące kopie zapasowe Neo-Backup i Android-DataBackup,
  w tym zaszyfrowane hasłem.

## Instalacja

1. Pobierz najnowszy `VD-Backup-vX.Y.zip` z [Wydań](https://github.com/VD171/VD-Backup/releases).
2. Zainstaluj go w menedżerze KernelSU / APatch / Magisk - gotowy do użycia od razu, bez ponownego uruchamiania.
3. Otwórz **WebUI** modułu, aby skonfigurować i uruchamiać kopie zapasowe. To wszystko.

**Edycje.** Sześć plików zip na wydanie. `universal-full` - każda architektura i każdy plik
binarny (w tym `rclone` dla dostawców chmury i `restic` dla migawek), dowolne urządzenie,
największy. `universal-lite` - każda architektura bez dwóch największych plików binarnych
(`rclone`, `restic`), najmniejszy, nadal obsługuje kopie lokalne, SSH/SFTP i `rsync`.
`<abi>-full` (`arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`) - pojedyncza architektura z każdym
plikiem binarnym, mniejszy niż `universal-full`. Znasz swoją architekturę -> wybierz
`<abi>-full`; chcesz najmniejszy lub bez gigantów chmury -> `universal-lite`; wszystko na
dowolnym urządzeniu -> `universal-full`.
Zobacz [Wydania](https://github.com/VD171/VD-Backup/releases).

Jesteś tu nowy? [Przewodnik użytkownika](docs/USER-GUIDE.md) przeprowadzi Cię od instalacji do przywracania.

## Przenośność

Twoje kopie zapasowe **nie są uwięzione w tym module**. Wszystko korzysta ze standardowych
formatów (`tar`, `gzip`, `zstd`, `age`, `zip`, `restic`), które otwierają się w systemach
Windows, macOS i Linux za pomocą popularnych narzędzi lub menedżerów plików. Każda
zaszyfrowana kopia zawiera notatkę **RECOVERY** z dokładnymi poleceniami do odszyfrowania i rozpakowania na komputerze.

## Budowanie

Moduł to shell + WebUI oraz statyczne pliki binarne dla każdej ABI (`tar`, `zstd`, `lz4`,
`rclone`, `rsync`, ssh, `restic`) zbudowane dla `armeabi-v7a`, `arm64-v8a`, `x86`,
`x86_64`. Zobacz [CONTRIBUTING.md](CONTRIBUTING.md) oraz przepływy pracy CI.

## Dokumentacja

- **[Wiki](https://github.com/VD171/VD-Backup/wiki)** - dokumentacja do przeglądania online.
- **[Przewodnik użytkownika](docs/USER-GUIDE.md)** - od początku do końca, od instalacji do przywracania.
- **[Agenci AI](docs/AI-AGENTS.md)** - steruj każdym działaniem bezgłowo przez API JSON.
- **[Architektura](ARCHITECTURE.md)** i **[Struktura plików](docs/FILE-STRUCTURE.md)** - jak to działa.
- **[Dołączone pliki binarne](docs/BINARIES.md)** - pochodzenie i SHA-256 każdego prekompilowanego pliku binarnego, do pełnego audytu.
- **[Odzyskiwanie](module/RECOVERY.md)** - otwórz i odszyfruj kopię zapasową na komputerze, bez modułu.
- **[Współtworzenie](CONTRIBUTING.md)** i **[Bezpieczeństwo](SECURITY.md)**.
- **[Dziennik zmian](CHANGELOG.md)** i **[Kodeks postępowania](CODE_OF_CONDUCT.md)**.

## Przyjazny dla AI

VDBackup jest zbudowany tak, aby być przyjaznym dla asystentów i agentów AI, a nie tylko
dla ludzi. Silnik mówi w JSON (każdy czasownik `helper.sh` zwraca pojedynczy obiekt JSON),
kod, dokumentacja i struktura plików są ułożone pod kątem odczytu maszynowego, a wkład
wspomagany przez AI jest recenzowany i przyjmowany jak każdy inny. Agent może
administrować **każdym** działaniem modułu bezgłowo przez to samo API, którego używa
WebUI - pełną powierzchnię sterowania znajdziesz w **[docs/AI-AGENTS.md](docs/AI-AGENTS.md)**,
a aby współtworzyć - w [CONTRIBUTING.md](CONTRIBUTING.md#ai-contributors-welcome).

## Kontakty

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Channel:** @Priv8_VD https://t.me/Priv8_VD
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171

## Zobacz także

Projekty siostrzane tego samego autora:

- **[VDInfos](https://github.com/VD171/VD-Infos)** - debugger metod urządzenia: odczytuje każdy element wszystkimi metodami, które mogą go odczytać, i porównuje je obok siebie.
- **[VDGoogle](https://github.com/VD171/VD-Google)** - Twoje usługi Google (RCS, Wallet, atestacje Play Integrity) odczytywane na Twoim urządzeniu bez internetu.
- **[COPG-VD](https://github.com/VD171/COPG-VD)** - narzędzie do podszywania się urządzenia, które zamienia świeży fingerprint w spójny, konsekwentny profil.

## Licencja

[GNU AGPL-3.0-or-later](LICENSE). Copyleft sieciowy: jeśli uruchamiasz zmodyfikowaną wersję,
nawet jako usługę, musisz udostępnić jej kod źródłowy.

---

`android` `backup` `restore` `app-data` `migration` `neo-backup` `databackup` `kernelsu` `apatch` `magisk` `webui` `root` `tar` `zstd` `restic` `rclone` `age` `encryption` `ssaid` `appops` `on-device` `agpl` `ai-friendly` `vdbackup`
