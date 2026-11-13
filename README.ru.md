<!--
  VD BACKUP: full app & data backup and restore as root, from a WebUI.
  Copyright (C) 2026  VD171. SPDX-License-Identifier: AGPL-3.0-or-later
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
  <b>Полное резервное копирование и восстановление приложений и данных с правами root, полностью управляется через WebUI.</b><br>
  Модуль KernelSU / APatch / Magisk. Без запроса "предоставить su", без переключения <code>sucompat</code>.
</p>

<p align="center">
  <a href="https://github.com/VD171/VD-Backup/releases">Releases</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/ru-Home">Wiki</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/ru-USER-GUIDE">Руководство пользователя</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/ru-AI-AGENTS">ИИ-агенты</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/ru-ARCHITECTURE">Архитектура</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/ru-BINARIES">Встроенные бинарные файлы</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/ru-CHANGELOG">История изменений</a> ·
  <a href="https://xdaforums.com/t/VD-Backup.4807267/">XDA thread</a>
</p>

> **Languages:** [English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

| Home | Apps | Schedule |
|:---:|:---:|:---:|
| ![Home](docs/screenshots/en/home-dark.png) | ![Apps](docs/screenshots/en/apps-dark.png) | ![Schedule](docs/screenshots/en/schedule-dark.png) |
| **Destinations** | **Settings** | **Activity log** |
| ![Destinations](docs/screenshots/en/destinations-dark.png) | ![Settings](docs/screenshots/en/settings-dark.png) | ![Activity log](docs/screenshots/en/activitylog-dark.png) |

---

## Что это

VDBackup, это root-**модуль WebUI**, который выполняет резервное копирование и
восстановление ваших приложений и их данных **без приложения-компаньона для основных
функций**: поскольку модуль уже работает с правами root, разрешать нечего. Он стремится
охватить всё, что делают популярные приложения для резервного копирования, в одном
месте и с удобным WebUI.

Он задуман как открытый, нативно-root **преемник Swift Backup, Neo-Backup и
Android-DataBackup**: объединение того, что они делают, под AGPLv3, и он даже может
импортировать существующие резервные копии Neo-Backup и Android-DataBackup, чтобы вы могли перейти.

## Возможности

- **Приложения:** APK (базовый + сплиты), данные приложений (`/data/data`), данные,
  защищённые устройством (`/data/user_de`), внешние данные (`Android/data`), OBB, медиа.
- **Системные/особые данные:** разрешения, AppOps и (по желанию) SSAID, там где это позволяет root.
- **Режимы резервного копирования:** **Full** (переносимый `tar.zst`), **Snapshot** (инкрементный +
  версионированный, через `restic`) и **Mirror** (синхронизация 1:1, через `rclone`/`rsync`).
- **Точное сохранение:** контексты SELinux, uid/gid, режимы, xattr и capabilities.
- **Сжатие:** нет / lz4 / zstd / gzip (gzip = "режим совместимости", открывается где угодно).
- **Шифрование:** необязательное и переносимое (`age` + пароль или AES-256 zip), никогда
  не привязано к оборудованию устройства, поэтому резервная копия восстанавливается на другом устройстве или открывается на ПК.
- **Назначения:** локально, SFTP, SCP, SMB, WebDAV, FTP, S3 и ещё 70+ (`rclone`),
  а также репозитории `rsync` и `restic`. Google Drive необязательно через крошечный опциональный компаньон.
- **Целостность:** каждый архив проверяется по манифесту; пробный прогон (dry-run) и
  тест восстановления позволяют проверить резервную копию, ничего не затрагивая.
- **Выборочное и пакетное восстановление:** восстанавливайте любое подмножество элементов резервной
  копии или выберите несколько резервных копий и восстановите их все сразу; удаляйте резервные копии
  и ведите журнал активности/аудита каждого разрушающего действия.
- **Особые резервные копии:** сообщения (SMS/MMS), контакты и журнал вызовов, Wi-Fi и Bluetooth,
  с необязательным переносимым экспортом в JSON, который можно открыть на ПК.
- **Расписание + автоматизация:** повторяющиеся задания **резервного копирования или восстановления**
  с целью на одно приложение, набор или все приложения, с очисткой по правилу keep-N, плюс
  опциональное авторезервирование при установке/обновлении и список исключённых приложений.
- **Источник установки:** восстановленные приложения по умолчанию сообщают, что источник их установки -
  Play Store (переключаемо); расширенная опция также подделывает инициирующий пакет и источник.
- **Монтирование как системное приложение:** смонтируйте установленное приложение как системное, не трогая
  реальный раздел `/system` (безсистемный overlay-подмодуль, с учётом NoMount).
- **Фоновый режим:** резервное копирование/восстановление выполняются отсоединённо и
  переживают закрытие WebUI, с уведомлениями о начале/завершении.
- **Миграция:** импортирует существующие резервные копии Neo-Backup и Android-DataBackup,
  в том числе зашифрованные паролем.

## Установка

1. Скачайте последний `VD-Backup-vX.Y.zip` из раздела [Релизы](https://github.com/VD171/VD-Backup/releases).
2. Прошейте его в менеджере KernelSU / APatch / Magisk, сразу готов к работе, перезагрузка не нужна.
3. Откройте **WebUI** модуля, чтобы настроить и запускать резервное копирование. Вот и всё.

**Редакции.** Шесть zip в каждом релизе. `universal-full`, все архитектуры и все
бинарники встроены (включая `rclone` для облачных провайдеров и `restic` для снапшотов),
полностью офлайн, ничего никогда не скачивается, любое устройство, самый большой.
`universal-lite`, все архитектуры без двух самых больших бинарников (`rclone`, `restic`),
самый маленький; всё ещё делает локальные бэкапы, SSH/SFTP и `rsync` без скачивания, а при
первом использовании облачного назначения (`rclone`) или режима снапшотов (`restic`)
предлагает один раз скачать небольшое дополнение под вашу архитектуру (проверенное по
SHA-256) и кэширует его, так что эти функции тоже работают. `<abi>-full` (`arm64-v8a`,
`armeabi-v7a`, `x86`, `x86_64`), одна архитектура со всеми встроенными бинарниками, меньше,
чем `universal-full`. Знаете свою архитектуру -> берите `<abi>-full`; нужен самый маленький и
не смущает однократная загрузка для облака или снапшотов -> `universal-lite`; хотите всё
встроенное без загрузок (офлайн / восстановление) -> редакция full. См.
[Релизы](https://github.com/VD171/VD-Backup/releases).

Впервые здесь? [Руководство пользователя](docs/USER-GUIDE.md) проведёт вас от установки до восстановления.

## Переносимость

Ваши резервные копии **не привязаны к этому модулю**. Всё использует стандартные форматы
(`tar`, `gzip`, `zstd`, `age`, `zip`, `restic`), которые открываются в Windows, macOS и
Linux обычными инструментами или файловыми менеджерами. Каждая зашифрованная резервная
копия поставляется с заметкой **RECOVERY**, содержащей точные команды для расшифровки и распаковки на ПК.

## Сборка

Модуль, это shell + WebUI плюс статические бинарники для каждой ABI (`tar`, `zstd`, `lz4`,
`rclone`, `rsync`, ssh, `restic`), собранные для `armeabi-v7a`, `arm64-v8a`, `x86`,
`x86_64`. См. [CONTRIBUTING.md](CONTRIBUTING.md) и рабочие процессы CI.

## Дружелюбие к ИИ

VDBackup создан, чтобы быть дружелюбным к ИИ-ассистентам и агентам, а не только к людям.
Движок говорит на JSON (каждый глагол `helper.sh` возвращает единый JSON-объект), код,
документация и структура файлов организованы для машинного чтения, а вклад с помощью ИИ
рассматривается и принимается наравне с любым другим. Агент может управлять **каждым**
действием модуля в headless-режиме через тот же API, что использует WebUI, полную
поверхность управления см. в **[docs/AI-AGENTS.md](docs/AI-AGENTS.md)**, а чтобы внести
вклад, в [CONTRIBUTING.md](CONTRIBUTING.md#ai-contributors-welcome).

## Документация

- **[Wiki](https://github.com/VD171/VD-Backup/wiki/ru-Home)**: документация для просмотра онлайн.
- **[Руководство пользователя](https://github.com/VD171/VD-Backup/wiki/ru-USER-GUIDE)**: от начала до конца, от установки до восстановления.
- **[ИИ-агенты](https://github.com/VD171/VD-Backup/wiki/ru-AI-AGENTS)**: управляйте каждым действием в headless-режиме через JSON API.
- **[Архитектура](https://github.com/VD171/VD-Backup/wiki/ru-ARCHITECTURE)** и **[Структура файлов](https://github.com/VD171/VD-Backup/wiki/ru-FILE-STRUCTURE)**: как это работает.
- **[Встроенные бинарные файлы](https://github.com/VD171/VD-Backup/wiki/ru-BINARIES)**: происхождение и SHA-256 каждого предкомпилированного бинарного файла, для полного аудита.
- **[Восстановление](https://github.com/VD171/VD-Backup/wiki/ru-RECOVERY)**: откройте и расшифруйте резервную копию на ПК, без модуля.
- **[Участие](https://github.com/VD171/VD-Backup/wiki/ru-CONTRIBUTING)** и **[Безопасность](https://github.com/VD171/VD-Backup/wiki/ru-SECURITY)**.
- **[История изменений](https://github.com/VD171/VD-Backup/wiki/ru-CHANGELOG)** и **[Кодекс поведения](https://github.com/VD171/VD-Backup/wiki/ru-CODE_OF_CONDUCT)**.

<!-- /vd-docs -->

## Смотрите также

Родственные проекты того же автора:

- **[VDInfos](https://github.com/VD171/VD-Infos)**: отладчик методов устройства: читает каждый элемент всеми методами, которые могут его прочитать, и сравнивает их бок о бок.
- **[VDGoogle](https://github.com/VD171/VD-Google)**: ваши сервисы Google (RCS, Wallet, аттестации Play Integrity), читаемые на вашем устройстве без интернета.
- **[COPG-VD](https://github.com/VD171/COPG-VD)**: спуфер устройства, который превращает свежий fingerprint в связный, согласованный профиль.
- **[VD-dropbear](https://github.com/VD171/VD-dropbear)**: автономный SSH-демон с root-правами (Dropbear).

## Контакты

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Channel:** @Priv8_VD https://t.me/Priv8_VD
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **XDA thread:** https://xdaforums.com/t/VD-Backup.4807267/
* **GitHub:** @VD171 https://github.com/VD171

## Лицензия

[GNU AGPL-3.0-or-later](LICENSE). Сетевой copyleft: если вы запускаете изменённую версию,
даже как сервис, вы обязаны предоставить её исходный код.

## Товарные знаки

VD Backup, это независимый, неофициальный проект. Он не связан с Google LLC или любым другим поставщиком, не одобрен и не спонсируется ими. "Google Drive", "Android" и связанные с ними названия и логотипы являются товарными знаками соответствующих владельцев. VD Backup работает на вашем устройстве и выгружает данные только в те назначения, которые вы настроите.

## Теги

`android` `backup` `restore` `app-data` `migration` `neo-backup` `databackup` `kernelsu` `apatch` `magisk` `webui` `root` `tar` `zstd` `restic` `rclone` `age` `encryption` `ssaid` `appops` `on-device` `agpl` `ai-friendly` `vdbackup`
