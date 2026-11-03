<!--
  VD BACKUP - full app & data backup and restore as root, from a WebUI.
  Copyright (C) 2026  VD171 - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<p align="center">
  <img src="module/webroot/assets/logo-wordmark.png" alt="VDBackup" width="320">
</p>

<p align="center">
  <b>Полное резервное копирование и восстановление приложений и данных с правами root - полностью управляется через WebUI.</b><br>
  Модуль KernelSU / APatch / Magisk. Без запроса "предоставить su", без переключения <code>sucompat</code>.
</p>

<p align="center">
  <a href="https://github.com/VD171/VD-Backup/releases">Релизы</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki">Вики</a> ·
  <a href="docs/USER-GUIDE.md">Руководство пользователя</a> ·
  <a href="docs/AI-AGENTS.md">ИИ-агенты</a> ·
  <a href="CONTRIBUTING.md">Участие</a> ·
  <a href="https://xdaforums.com/t/VD-Backup.4807267/">Тема на XDA</a>
</p>

> **Languages:** [English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

---

## Что это

VDBackup - это root-**модуль WebUI**, который выполняет резервное копирование и
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
- **Шифрование:** необязательное и переносимое (`age` + пароль или AES-256 zip) - никогда
  не привязано к оборудованию устройства, поэтому резервная копия восстанавливается на другом устройстве или открывается на ПК.
- **Назначения:** локально, SFTP, SCP, SMB, WebDAV, FTP, S3 и ещё 70+ (`rclone`),
  а также репозитории `rsync` и `restic`. Google Drive необязательно через крошечный опциональный компаньон.
- **Целостность:** каждый архив проверяется по манифесту; пробный прогон (dry-run) и
  тест восстановления позволяют проверить резервную копию, ничего не затрагивая.
- **Расписание + хранение:** повторяющиеся задания с очисткой по правилу keep-N.
- **Фоновый режим:** резервное копирование/восстановление выполняются отсоединённо и
  переживают закрытие WebUI, с уведомлениями о начале/завершении.
- **Миграция:** импортирует существующие резервные копии Neo-Backup и Android-DataBackup,
  в том числе зашифрованные паролем.

## Установка

1. Скачайте последний `VD-Backup-vX.Y.zip` из раздела [Релизы](https://github.com/VD171/VD-Backup/releases).
2. Прошейте его в менеджере KernelSU / APatch / Magisk - сразу готов к работе, перезагрузка не нужна.
3. Откройте **WebUI** модуля, чтобы настроить и запускать резервное копирование. Вот и всё.

Впервые здесь? [Руководство пользователя](docs/USER-GUIDE.md) проведёт вас от установки до восстановления.

## Переносимость

Ваши резервные копии **не привязаны к этому модулю**. Всё использует стандартные форматы
(`tar`, `gzip`, `zstd`, `age`, `zip`, `restic`), которые открываются в Windows, macOS и
Linux обычными инструментами или файловыми менеджерами. Каждая зашифрованная резервная
копия поставляется с заметкой **RECOVERY**, содержащей точные команды для расшифровки и распаковки на ПК.

## Сборка

Модуль - это shell + WebUI плюс статические бинарники для каждой ABI (`tar`, `zstd`, `lz4`,
`rclone`, `rsync`, ssh, `restic`), собранные для `armeabi-v7a`, `arm64-v8a`, `x86`,
`x86_64`. См. [CONTRIBUTING.md](CONTRIBUTING.md) и рабочие процессы CI.

## Документация

- **[Wiki](https://github.com/VD171/VD-Backup/wiki)** - документация для просмотра онлайн.
- **[Руководство пользователя](docs/USER-GUIDE.md)** - от начала до конца, от установки до восстановления.
- **[ИИ-агенты](docs/AI-AGENTS.md)** - управляйте каждым действием в headless-режиме через JSON API.
- **[Архитектура](ARCHITECTURE.md)** и **[Структура файлов](docs/FILE-STRUCTURE.md)** - как это работает.
- **[Участие](CONTRIBUTING.md)** и **[Безопасность](SECURITY.md)**.

## Дружелюбие к ИИ

VDBackup создан, чтобы быть дружелюбным к ИИ-ассистентам и агентам, а не только к людям.
Движок говорит на JSON (каждый глагол `helper.sh` возвращает единый JSON-объект), код,
документация и структура файлов организованы для машинного чтения, а вклад с помощью ИИ
рассматривается и принимается наравне с любым другим. Агент может управлять **каждым**
действием модуля в headless-режиме через тот же API, что использует WebUI - полную
поверхность управления см. в **[docs/AI-AGENTS.md](docs/AI-AGENTS.md)**, а чтобы внести
вклад - в [CONTRIBUTING.md](CONTRIBUTING.md#ai-contributors-welcome).

## Контакты

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Channel:** @Priv8_VD https://t.me/Priv8_VD
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171

## Смотрите также

Родственные проекты того же автора:

- **[VDInfos](https://github.com/VD171/VD-Infos)** - отладчик методов устройства: читает каждый элемент всеми методами, которые могут его прочитать, и сравнивает их бок о бок.
- **[VDGoogle](https://github.com/VD171/VD-Google)** - ваши сервисы Google (RCS, Wallet, аттестации Play Integrity), читаемые на вашем устройстве без интернета.
- **[COPG-VD](https://github.com/VD171/COPG-VD)** - спуфер устройства, который превращает свежий fingerprint в связный, согласованный профиль.

## Лицензия

[GNU AGPL-3.0-or-later](LICENSE). Сетевой copyleft: если вы запускаете изменённую версию,
даже как сервис, вы обязаны предоставить её исходный код.

---

`android` `backup` `restore` `app-data` `migration` `neo-backup` `databackup` `kernelsu` `apatch` `magisk` `webui` `root` `tar` `zstd` `restic` `rclone` `age` `encryption` `ssaid` `appops` `on-device` `agpl` `ai-friendly` `vdbackup`
