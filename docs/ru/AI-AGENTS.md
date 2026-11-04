> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../in/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · Русский · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# Управление VDBackup из ИИ-агента

VDBackup построен так, чтобы ИИ-ассистент или агент мог администрировать **всё** содержимое и
действия модуля без графического интерфейса, точно так же, как это делает человек через WebUI.
WebUI - это лишь один клиент небольшого JSON API; ваш агент - другой. Используйте API,
не скрапьте WebUI.

## Контракт

Всё проходит через одну точку входа, запускаемую от имени root на устройстве:

```
sh /data/adb/modules/vdbackup/scripts/helper.sh <verb> <base64(JSON-args)>
```

- Аргументы - это единый JSON-объект, **в кодировке base64**, передаваемый как один токен argv.
- Команда выводит **один JSON-объект** в stdout: `{"ok":true,...}` или
  `{"ok":false,"code":"ERR_...","message":"..."}`. Разбирайте его; никогда не скрапьте текст.
- Длительные операции (`backup`, `restore`, `import`) возвращают `{"ok":true,"opid":"..."}`
  немедленно и выполняются **отсоединённо** (они переживают исчезновение вызывающей стороны/WebUI).
  Опрашивайте их прогресс; они не завершены, когда вызов возвращается.
- `progress` и `cancel` принимают **base64 сырой строки opid**, а не JSON-объект.

Маленькая вспомогательная функция для вашей оболочки:

```sh
b64() { printf '%s' "$1" | base64 -w0; }
H=/data/adb/modules/vdbackup/scripts/helper.sh
sh "$H" backup "$(b64 '{"package":"com.example.app","mode":"full"}')"
```

Чтобы управлять этим с рабочей станции, выполняйте это через ваш обычный root-канал к устройству
(adb shell от имени root или конфигурация SSH-к-root). Модуль поставляется с встроенными бинарными файлами, поэтому
после установки ему **не нужен интернет** для локального резервного копирования/восстановления; только облачные
назначения (`rclone`/`restic`/ssh) обращаются к сети.

## Глаголы

| Глагол | Args (JSON) | Возвращает |
|------|-------------|---------|
| `ping` | `{}` | `{ok,version,abi}` |
| `config-get` | `{}` | `{ok,config}` |
| `config-set` | объект конфигурации (или `{key,value}`) | `{ok}` |
| `keygen` | `{}` | генерирует пару ключей `age` для шифрования |
| `list-apps` | `{user?}` | `{ok,apps:[{package,label,system,versionCode}]}` (dex, резерв через shell) |
| `label` | `{package,user?}` | `{ok,label}` (настоящее локализованное имя приложения, вне контекста) |
| `icon` | `{package,user?,vc?}` | `{ok,package,icon}` (base64 PNG; кэшируется по пакету+`vc`) |
| `backup` | см. ниже | `{ok,opid}` (отсоединённо) |
| `restore` | см. ниже | `{ok,opid}` (отсоединённо) |
| `import` | `{from,ref,password,ssaid,user}` | `{ok,opid}` (отсоединённо) |
| `import-scan` | `{from,path}` | `{ok,backups:[...]}` |
| `progress` | base64(opid) | актуальный `progress-<opid>.json` |
| `cancel` | base64(opid) | `{ok,cancelled}` |
| `list-ops` | `{}` | `{ok,ops:[...]}` (повторное подключение после восстановления связи) |
| `list-apps`/`icons` | `{user?}` / `{user?,items:[{package,vc}]}` | список приложений / пакетные base64-иконки |
| `list-backups` | `{package?}` | `{ok,backups:[{ref,package,label,versionName,versionCode,created_at,mode,items}]}` |
| `backup-info` | `{ref}` | `{ok,...}` полные сведения об одной резервной копии (версия, источник установки, состояние, дата, режим, размер, элементы, счётчики разрешений, устройство) |
| `backup-icon` | `{ref}` | `{ok,icon}` base64 PNG из манифеста (работает, когда приложение удалено) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref должен находиться под каталогом резервных копий) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` хранит N самых свежих копий пакета |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` журнал аудита, от самых свежих |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` общесистемная резервная копия (отсоединённо) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (требуется перезагрузка; `confirm` защищает это) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | монтирует установленное приложение как системное (безсистемный подмодуль; вживую через NoMount, иначе при следующей загрузке) |
| `companion-status` / `companion-install` | `{}` | статус компаньона Google Drive / установка по требованию |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | управление назначениями |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | управление удалёнными хранилищами rclone (создаёт запись `rclone.conf`, на которую указывает назначение `type:"rclone"`) |
| `schedule-set` / `schedule-list` / `schedule-delete` | `{id,package,mode,dest,cron,at,keep,items}` | запланированные задания |
| `scheduler-tick` | `{}` | выполняет назначенные задания + применяет хранение + наблюдатель авторезервирования (это вызывает загрузочный heartbeat) |

### Аргументы `backup`

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
  "ssaid": false                  // OPT-IN, see below
}
```

`restore`/`import` принимают `{ref}` (каталог резервной копии / референс сканирования). `restore` также принимает:
`"items"` (подмножество типов элементов копии для восстановления; опустите для всех), `"test": true`
(извлечь во временный каталог и проверить, не затрагивая работающее приложение), `"mode"` для
snapshot/mirror, `"password"` для зашифрованной копии, `"ssaid"` (opt-in), и опции источника
установки `"spoof_installer"` (по умолчанию из config, задаёт установщиком Play Store во время
установки) и `"deep_spoof": true` (расширенный opt-in; также подделывает инициирующий пакет и
источник пакета, редактируя базу пакетов, применяется после перезагрузки). `import` принимает
`"from": "neo" | "databackup"` и, для зашифрованной резервной копии Neo, `"password"`.

### Аргументы `remote-add`

Облачное назначение - это назначение `type:"rclone"`, которое именует удалённое хранилище `rclone`; создайте
это удалённое хранилище сначала с помощью `remote-add`. Поля паролей хранятся скрытыми, никогда в
открытом виде. Поддерживаемые значения `backend` и их `params`:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

У Google Drive есть два пути: это удалённое хранилище `drive` (проект Google Cloud не нужен, использует
собственный OAuth rclone - выполните `rclone authorize "drive"` один раз на любом компьютере и передайте
token) или опциональное приложение-компаньон (ваш собственный OAuth client id). Оба в итоге становятся обычными
назначениями.

### Сетевая политика

Поле конфигурации `network_policy` управляет тем, какое соединение могут использовать облачные передачи:
`any` (по умолчанию), `wifi` или `mobile`. Задайте его через `config-set`. Когда оно равно `wifi` или
`mobile`, каждая облачная передача (загрузка Full `rclone`/Drive, синхронизация Mirror, удалённое
резервное копирование/восстановление снимка `restic`, восстановление Mirror) сначала проверяет активный транспорт и
прерывается с `ERR_NET_POLICY`, если он не совпадает - как для ручных, так и для запланированных заданий.
Локальные назначения никогда не ограничиваются.

## Предохранители, которые ваш агент должен соблюдать

- **`ssaid` строго opt-in (по умолчанию выключен).** Он создаёт резервную копию / восстанавливает
  ANDROID_ID устройства, переписывая системный файл; восстановление применяется только после перезагрузки, и
  предыдущий файл всегда сохраняется сначала для отката. Отправляйте `"ssaid": true`
  только по прямому, осознанному запросу пользователя - никогда по умолчанию.
- **Мутирующие действия (restore, delete, import) являются деструктивными** и записываются в
  локальный журнал аудита (`logs/audit.jsonl`). Восстановление точное (стереть-затем-извлечь), поэтому
  оно возвращает приложение в точное состояние резервной копии. Подтверждайте намерение, прежде чем вызывать их.
- **Никогда не ослабляйте** сохранение (SELinux/uid/gid/режимы/xattr) или правило APK (APK
  всегда сжимаются, никогда не шифруются, если не задан `encrypt_apk`).
- Считайте вывод JSON источником истины; проверяйте `ok`/`code`, опрашивайте `progress`,
  и выводите коды `ERR_*` вместо того, чтобы гадать.

См. [ARCHITECTURE.md](../ARCHITECTURE.md) и
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) для внутренних деталей.

---

*Эта документация была сгенерирована с помощью Claude (Anthropic) и сопровождается VD171. Исправления и улучшения приветствуются - см. [CONTRIBUTING.md](../CONTRIBUTING.md).*
