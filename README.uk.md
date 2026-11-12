<!--
  VD BACKUP - full app & data backup and restore as root, from a WebUI.
  Copyright (C) 2026  VD171 - SPDX-License-Identifier: AGPL-3.0-or-later
-->

# VD Backup

<p align="center">
  <img src="module/webroot/assets/logo-wordmark.png" alt="VD Backup" width="320">
</p>

<p align="center">
  <a href="https://github.com/VD171/VD-Backup/releases/latest"><img src="https://img.shields.io/github/v/release/VD171/VD-Backup?label=release&color=0969da" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0--or--later-1a7f37" alt="License"></a>
  <a href="https://github.com/VD171/VD-Backup/releases"><img src="https://img.shields.io/github/downloads/VD171/VD-Backup/total?label=downloads&color=8250df" alt="Downloads"></a>
  <a href="https://github.com/VD171/VD-Backup/stargazers"><img src="https://img.shields.io/github/stars/VD171/VD-Backup?color=d29922" alt="Stars"></a>
</p>

<p align="center">
  <b>Повне резервне копіювання та відновлення застосунків і даних із правами root, кероване повністю через WebUI.</b><br>
  Модуль KernelSU / APatch / Magisk. Без запиту "надати su", без перемикання <code>sucompat</code>.
</p>

<p align="center">
  <a href="https://github.com/VD171/VD-Backup/releases">Releases</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/uk-Home">Wiki</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/uk-USER-GUIDE">Посібник користувача</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/uk-AI-AGENTS">Агенти ШІ</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/uk-ARCHITECTURE">Архітектура</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/uk-BINARIES">Вбудовані бінарники</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/uk-CHANGELOG">Changelog</a> ·
  <a href="https://xdaforums.com/t/VD-Backup.4807267/">XDA thread</a>
</p>

> **Languages:** [English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

| Home | Apps | Schedule |
|:---:|:---:|:---:|
| ![Home](docs/screenshots/en/home-dark.png) | ![Apps](docs/screenshots/en/apps-dark.png) | ![Schedule](docs/screenshots/en/schedule-dark.png) |
| **Destinations** | **Settings** | **Activity log** |
| ![Destinations](docs/screenshots/en/destinations-dark.png) | ![Settings](docs/screenshots/en/settings-dark.png) | ![Activity log](docs/screenshots/en/activitylog-dark.png) |

---

## Що це таке

VDBackup - це root **WebUI-модуль**, який робить резервні копії та відновлює ваші застосунки й
їхні дані **без застосунку-компаньйона для основних функцій**, бо модуль уже має root, і нема чого
"дозволяти". Він має на меті охопити все, що роблять популярні застосунки резервного копіювання,
в одному місці, з чистим WebUI.

Він задуманий як відкритий, root-native **наступник Swift Backup, Neo-Backup та
Android-DataBackup**: об'єднання того, що вони роблять, під ліцензією AGPLv3, і він навіть може
імпортувати наявні резервні копії Neo-Backup та Android-DataBackup, щоб ви могли перейти.

## Можливості

- **Застосунки:** APK (base + splits), дані застосунку (`/data/data`), дані під захистом пристрою
  (`/data/user_de`), зовнішні дані (`Android/data`), OBB, медіа.
- **Системні/спеціальні дані:** дозволи, AppOps та (за згодою) SSAID, де це дозволяє root.
- **Режими резервного копіювання:** **Full** (портативний `tar.zst`), **Snapshot** (інкрементний +
  версіонований, через `restic`) та **Mirror** (синхронізація 1:1, через `rclone`/`rsync`).
- **Точне збереження:** контексти SELinux, uid/gid, режими, xattr і capabilities.
- **Стиснення:** none / lz4 / zstd / gzip (gzip = "режим сумісності", відкривається будь-де).
- **Шифрування:** опційне й портативне (`age` + парольна фраза, або AES-256 zip), ніколи не
  прив'язане до апаратного забезпечення пристрою, тож резервна копія відновлюється на іншому пристрої або відкривається на ПК.
- **Призначення:** локальне, SFTP, SCP, SMB, WebDAV, FTP, S3 і понад 70 інших (`rclone`), а також
  репозиторії `rsync` і `restic`. Опційно Google Drive через крихітний компаньйон за згодою.
- **Цілісність:** кожен архів перевіряється за маніфестом; пробний запуск (dry-run) і тест
  відновлення дають змогу перевірити резервну копію, нічого не зачіпаючи.
- **Вибіркове та пакетне відновлення:** відновлюйте будь-яку підмножину елементів резервної копії,
  або оберіть кілька резервних копій і відновіть їх усі одразу; видаляйте резервні копії й ведіть
  журнал активності/аудиту кожної руйнівної дії.
- **Спеціальні резервні копії:** повідомлення (SMS/MMS), контакти й журнал дзвінків, Wi-Fi і Bluetooth,
  з опційним портативним експортом у JSON, який можна відкрити на ПК.
- **Планування + автоматизація:** повторювані завдання **резервного копіювання або відновлення**,
  націлені на один застосунок, набір чи всі застосунки, з обрізанням за правилом keep-N, а також
  авторезервування за згодою під час встановлення/оновлення та список виключених застосунків.
- **Джерело встановлення:** відновлені застосунки за замовчуванням повідомляють Play Store як своє
  джерело встановлення (можна перемкнути); просунута опція за згодою також підробляє пакет-ініціатор і джерело.
- **Монтування системного застосунку:** монтуйте встановлений застосунок як системний без зачіпання
  справжнього розділу `/system` (безсистемний overlay-підмодуль, обізнаний з NoMount).
- **Фоновий режим:** резервне копіювання/відновлення працюють відокремлено й переживають закриття
  WebUI, зі сповіщеннями про початок і завершення.
- **Міграція всередину:** імпортує наявні резервні копії Neo-Backup та Android-DataBackup,
  зокрема зашифровані паролем.

## Встановлення

1. Завантажте найновіший `VD-Backup-vX.Y.zip` із розділу [Releases](https://github.com/VD171/VD-Backup/releases).
2. Прошийте його в менеджері KernelSU / APatch / Magisk, придатний до використання одразу, без перезавантаження.
3. Відкрийте **WebUI** модуля, щоб налаштувати й запустити резервне копіювання. Ось і все.

**Видання.** Шість zip на реліз. `universal-full`: усі архітектури й кожен бінарник вбудовано
(зокрема `rclone` для хмарних провайдерів, `restic` для знімків), повністю офлайн, нічого ніколи
не завантажується, будь-який пристрій, найбільший. `universal-lite`: усі архітектури без двох
найбільших бінарників (`rclone`, `restic`), найменший; усе одно робить локальне, SSH/SFTP і
`rsync` без завантаження, і коли ви вперше використовуєте хмарне призначення (`rclone`) або режим
знімків (`restic`), він пропонує одноразово завантажити цей невеликий додаток під архітектуру
(перевірений за SHA-256) і кешує його, тож ці функції теж працюють. `<abi>-full`
(`arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`): одна архітектура з кожним вбудованим бінарником,
менший за `universal-full`. Знаєте свою архітектуру -> оберіть `<abi>-full`; хочете найменший і не
проти одноразового завантаження для хмари чи знімків -> `universal-lite`; хочете все вбудоване з
нульовим завантаженням (офлайн / відновлення) -> повне видання. Див. [Releases](https://github.com/VD171/VD-Backup/releases).

Уперше тут? [Посібник користувача](docs/USER-GUIDE.md) проведе вас від встановлення до відновлення.

## Портативність

Ваші резервні копії **не прив'язані до цього модуля**. Усе використовує стандартні формати
(`tar`, `gzip`, `zstd`, `age`, `zip`, `restic`), які відкриваються на Windows, macOS і Linux
звичайними інструментами чи файловими менеджерами. Кожна зашифрована резервна копія постачається з
нотаткою **RECOVERY**, що містить точні команди для розшифрування й розпакування на ПК.

## Збирання

Модуль - це shell + WebUI плюс статичні бінарники під кожну ABI (`tar`, `zstd`, `lz4`,
`rclone`, `rsync`, ssh, `restic`), зібрані для `armeabi-v7a`, `arm64-v8a`, `x86`,
`x86_64`. Див. [CONTRIBUTING.md](CONTRIBUTING.md) і робочі процеси CI.

## Дружній до AI

VDBackup створений так, щоб бути привітним до AI-асистентів та агентів, а не лише до людей.
Рушій говорить JSON (кожне дієслово `helper.sh` повертає єдиний об'єкт JSON), код, документація й
структура файлів викладені для машинного читання, а внески, зроблені за допомогою AI, розглядаються
й приймаються як будь-які інші. Агент може адмініструвати **кожну** дію модуля без інтерфейсу через
той самий API, який використовує WebUI, - див. **[docs/AI-AGENTS.md](docs/AI-AGENTS.md)** щодо повної
поверхні керування, і [CONTRIBUTING.md](CONTRIBUTING.md#ai-contributors-welcome), щоб зробити внесок.

## Документація

- **[Wiki](https://github.com/VD171/VD-Backup/wiki/uk-Home)**: документація для перегляду онлайн.
- **[Посібник користувача](https://github.com/VD171/VD-Backup/wiki/uk-USER-GUIDE)**: від початку до кінця, від встановлення до відновлення.
- **[Агенти ШІ](https://github.com/VD171/VD-Backup/wiki/uk-AI-AGENTS)**: керуйте кожною дією без інтерфейсу через JSON API.
- **[Архітектура](https://github.com/VD171/VD-Backup/wiki/uk-ARCHITECTURE)** та **[Структура файлів](https://github.com/VD171/VD-Backup/wiki/uk-FILE-STRUCTURE)**: як це працює.
- **[Вбудовані бінарники](https://github.com/VD171/VD-Backup/wiki/uk-BINARIES)**: походження та SHA-256 кожного попередньо зібраного бінарника, для повного аудиту.
- **[Відновлення](https://github.com/VD171/VD-Backup/wiki/uk-RECOVERY)**: відкрийте та розшифруйте резервну копію на ПК, без модуля.
- **[Внесок](https://github.com/VD171/VD-Backup/wiki/uk-CONTRIBUTING)** та **[Безпека](https://github.com/VD171/VD-Backup/wiki/uk-SECURITY)**.
- **[Changelog](https://github.com/VD171/VD-Backup/wiki/uk-CHANGELOG)** та **[Кодекс поведінки](https://github.com/VD171/VD-Backup/wiki/uk-CODE_OF_CONDUCT)**.

<!-- /vd-docs -->

## Дивіться також

Споріднені проєкти того самого автора:

- **[VDInfos](https://github.com/VD171/VD-Infos)**: налагоджувач методів пристрою, який читає кожен елемент через кожен метод, що може його прочитати, і порівнює їх пліч-о-пліч.
- **[VDGoogle](https://github.com/VD171/VD-Google)**: ваші сервіси Google (RCS, Wallet, атестації Play Integrity), прочитані на вашому пристрої без інтернету.
- **[COPG-VD](https://github.com/VD171/COPG-VD)**: підмінювач пристрою, який перетворює свіжий fingerprint на узгоджений, послідовний профіль.

## Contacts

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Channel:** @Priv8_VD https://t.me/Priv8_VD
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **XDA thread:** https://xdaforums.com/t/VD-Backup.4807267/
* **GitHub:** @VD171 https://github.com/VD171

## Ліцензія

[GNU AGPL-3.0-or-later](LICENSE). Мережевий copyleft: якщо ви запускаєте змінену версію, навіть як
сервіс, ви мусите надати її вихідний код.

## Торгові марки

VD Backup - незалежний, неофіційний проєкт. Він не пов'язаний із Google LLC чи будь-яким іншим виробником, не схвалений і не спонсорований ними. "Google Drive", "Android" та пов'язані назви й логотипи є торговими марками їхніх відповідних власників. VD Backup працює на вашому пристрої й вивантажує лише до призначень, які ви налаштуєте.

## Tags

`android` `backup` `restore` `app-data` `migration` `neo-backup` `databackup` `kernelsu` `apatch` `magisk` `webui` `root` `tar` `zstd` `restic` `rclone` `age` `encryption` `ssaid` `appops` `on-device` `agpl` `ai-friendly` `vdbackup`
