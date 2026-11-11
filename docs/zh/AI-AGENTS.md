> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../in/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · 中文

---

# 通过 AI 智能体驱动 VDBackup

VDBackup 的设计让 AI 助手或智能体能够以无界面的方式管理模块的**每一项**内容和操作，方式与人
通过 WebUI 操作完全一致。WebUI 只是一个小型 JSON API 的其中一个客户端；你的智能体是另一个
客户端。请使用该 API，不要抓取 WebUI。

## 约定

一切都通过单一入口完成，在设备上以 root 运行：

```
sh /data/adb/modules/vdbackup/scripts/helper.sh <verb> <base64(JSON-args)>
```

- 参数是单个 JSON 对象，**经 base64 编码**，作为一个 argv 令牌传入。
- 命令在 stdout 上输出**一个 JSON 对象**：`{"ok":true,...}` 或
  `{"ok":false,"code":"ERR_...","message":"..."}`。请解析它，切勿抓取文本。
- 长时间操作（`backup`、`restore`、`import`）会立即返回 `{"ok":true,"opid":"..."}`，并以
  **分离（detached）** 方式运行（即使调用方/WebUI 退出它们也会继续）。请轮询其进度；调用返回
  并不代表它们已完成。
- `progress` 和 `cancel` 接收的是**原始 opid 字符串的 base64**，而不是 JSON 对象。

供你在 shell 中使用的小助手：

```sh
b64() { printf '%s' "$1" | base64 -w0; }
H=/data/adb/modules/vdbackup/scripts/helper.sh
sh "$H" backup "$(b64 '{"package":"com.example.app","mode":"full"}')"
```

若要从工作站驱动它，请通过你惯用的设备 root 通道（以 root 运行的 adb shell，或某种
SSH-to-root 配置）来执行该命令。模块附带捆绑的二进制文件，因此一旦安装，本地备份/恢复**无需
联网**；只有云端目标（`rclone`/`restic`/ssh）才与网络通信。

## 动词（Verb）

| Verb | Args (JSON) | Returns |
|------|-------------|---------|
| `ping` | `{}` | `{ok,version,abi}` |
| `overview` | `{user?}` | `{ok:true,apps,instances,path_backups,jobs,backups_size,free,total}` 计数（大小以字节为单位）：有备份的应用、备份实例总数、独立的 path 备份、计划任务、备份总大小，以及备份文件系统的剩余/总量。非 detached，立即返回；由 WebUI 主页概览使用。 |
| `config-get` | `{}` | `{ok,config}` |
| `config-set` | config 对象（或 `{key,value}`） | `{ok}` |
| `keygen` | `{}` | 生成用于加密的 `age` 密钥对 |
| `list-apps` | `{user?}` | `{ok,apps:[{package,label,system,versionCode}]}`（dex，shell 回退） |
| `label` | `{package,user?}` | `{ok,label}`（真实的本地化应用名称，与上下文无关） |
| `icon` | `{package,user?,vc?}` | `{ok,package,icon}`（base64 PNG；按 package+`vc` 缓存） |
| `backup` | 见下文 | `{ok,opid}`（detached） |
| `restore` | 见下文 | `{ok,opid}`（detached） |
| `import` | `{from,ref,password,ssaid,user}` | `{ok,opid}`（detached） |
| `import-scan` | `{from,path}` | `{ok,backups:[...]}` |
| `progress` | base64(opid) | 实时的 `progress-<opid>.json` |
| `cancel` | base64(opid) | `{ok,cancelled}` |
| `list-ops` | `{}` | `{ok,ops:[...]}`（重新连接后再挂接） |
| `list-apps`/`icons` | `{user?}` / `{user?,items:[{package,vc}]}` | 应用列表 / 批量 base64 图标 |
| `list-backups` | `{package?}` | `{ok,backups:[{ref,package,label,versionName,versionCode,created_at,mode,items}]}` |
| `list-users` | `{}` | `{ok,users:[{id,name}]}` 设备的 Android 用户（多用户）. |
| `list-dirs` | `{path}` | `{ok,path,parent,dirs:[...]}` 某路径的子目录（文件夹选择器）. |
| `path-list` | `{user?}` | `{ok,backups:[...]}` 独立的文件夹/文件备份. |
| `provenance` | `{}` | 随附二进制文件的审计清单 (`PROVENANCE.json`). |
| `backup-info` | `{ref}` | `{ok,...}` 某个备份的完整详情（版本、安装来源、状态、日期、模式、大小、项目、权限计数、设备） |
| `backup-icon` | `{ref}` | `{ok,icon}` 来自清单的 base64 PNG（应用已卸载时仍可用） |
| `delete-backup` | `{ref}` | `{ok,deleted}`（ref 必须位于 backups 目录之下） |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` 保留某软件包最新的 N 个 |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` 审计日志，最新的在前 |
| `log-export` | `{user?}` | `{ok:true,path}`（写入备份目录下的 `.txt` 的绝对路径）或 `{ok:false,code:"ERR_LOG_EXPORT"}`。将活动日志（`audit.jsonl`）加上简短的构建/设备头写入单个用户可见的文本文件，以便附加到错误报告。非 detached，立即返回。 |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}`（messages/contacts/wifi/bluetooth/calendar/wallpaper/dns/system_settings） |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` 系统级备份（detached） |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}`（需要重启；由 `confirm` 把关） |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `path-backup` | `{path,compression?,password?}` | `{ok,opid}` 将任意绝对路径备份为 `tar.zst`+`manifest.json`，存于 `.paths/` 下（detached） |
| `path-restore` | `{ref,confirm:true,password?}` | `{ok,opid}` 将路径备份恢复到其原始位置（`confirm` 把关；detached） |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | 把已安装的应用挂载为系统应用（无系统修改的子模块；通过 NoMount 实时生效，否则下次开机生效） |
| `companion-status` / `companion-install` | `{}` | Google Drive 配套应用状态 / 按需安装 |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | 目标管理 |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | rclone 远端管理（创建 `type:"rclone"` 目标所指向的 `rclone.conf` 条目）；`backend` 可以是任意 rclone 后端，无白名单 |
| `remote-authorize` | `{backend}` | `{ok:true,url}`（引擎已通过 Android VIEW intent 将手机浏览器打开到该同意 URL）或 `{ok:false,code:"ERR_AUTHORIZE"}`。在本地回调服务器（`127.0.0.1:53682`）上运行 `rclone authorize <backend>` 以进行设备端 OAuth。 |
| `remote-authorize-poll` | `{}` | 等待时返回 `{ok:true,done:false,url}`，用户同意后返回 `{ok:true,done:true,token}`（传给 `remote-add` 的 `token`），或 `{ok:false,code:"ERR_AUTHORIZE"}`。 |
| `remote-authorize-cancel` | `{}` | `{ok:true,cancelled:true}`；停止一个待处理的授权。 |
| `cloud-status` | `{}` | `{ok,rclone,restic,fetchable,size}`（`rclone`/`restic` 二进制文件是否就位、此 `lite` 版本能否获取它们、下载大小（字节）） |
| `cloud-fetch` | `{}` | `{ok,opid}`（detached）在 `lite` 版本上下载+校验+安装 `rclone`/`restic` 附加包 |
| `schedule-set` / `schedule-list` / `schedule-delete` | 见下文 | 计划任务（备份或恢复；针对单个应用、一组应用，或所有应用） |
| `scheduler-tick` | `{}` | 运行到期任务 + 应用保留策略 + 自动备份观察器（开机心跳会调用它） |
| `update-check` | `{}` | `{ok,current_version,current_code,latest_version,latest_code,update_available,zipUrl,changelog,notes}`（非 detached；立即返回；失败时返回 `ERR_UPDATE_CHECK`, 见下文） |
| `backup-batch` | `{packages:[...], ...backup args}` | `{ok,opid}` (detached) 在单个分离的操作中备份多个应用；进度包含 `n`/`of`。单个应用失败不会中止批处理。 |
| `restore-batch` | `{refs:[...], ...restore args}` | `{ok,opid}` (detached) 在单个分离的操作中恢复多个备份；进度包含 `n`/`of`。单个应用失败不会中止批处理。 |
| `list-volumes` | `{}` | `{ok,volumes:[{path,removable,id?}]}` 文件夹选择器的存储卷：内部以及可移动的 SD 卡/USB。 |
| `config-export` | `{password}` | `{ok,opid}` (detached) 将配置、任务、目标位置、凭据和密钥导出到备份目录下的单个密码短语加密文件。 |
| `config-import` | `{ref,password}` | `{ok,opid}` (detached) 将导出的配置文件合并回本设备（绝不盲目覆盖）。 |
| `config-exports` | `{}` | `{ok,exports:[{ref,name,size}]}` 列出可供导入的加密配置文件。 |
| `wipe-credentials` | `{}` | `{ok,wiped}` 删除已保存的远程密码和设备加密密钥；目标位置、任务和备份保留。 |
| `log-prune` | `{}` | `{ok}` 修剪早已完成的操作日志，限制审计记录，并清除过时图标（由启动服务调用）。 |

### `progress` 字段

轮询 `progress` 会返回该操作实时的 `progress-<opid>.json`。以下字段**始终存在**：

| 字段 | 类型 | 含义 |
|-------|------|---------|
| `opid` | string | 操作 id |
| `percent` | int | 0-100 的完成度 |
| `phase` | string | 当前阶段标签 |
| `item` | string | 当前正在处理的 item 类型 |
| `done` | bool | 在终端写入（finish / dry-run / restore-test）时为 true |

运行中的操作还可能携带以下**可选（optional）**的实时字段。未知时它们缺失或为空，并且在**终端写入（finish / dry-run / restore-test）时被省略**：

| 字段 | 类型 | 含义 |
|-------|------|---------|
| `rate` | string | 传输速度，例如 `"4.2 MiB/s"`（空 = 未知） |
| `eta` | string | 预计剩余时间，例如 `"1m12s"`（空 = 未知） |
| `n` | int | 当前 item 索引（0 = 未知） |
| `of` | int | item 总数（0 = 未知） |
| `cur` | string | 当前 item 名称（空 = 无） |

云端传输会填充 `rate`/`eta`（percent 来自 rclone）；本地 Full 备份会填充 `n`/`of`/`cur`。阶段标签包括校验和封印阶段 **`verified`**，以及对于云端传输的 **`transfer`** 和 **`mirror <item>`**。

### `backup` 参数

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
  "ssaid": false,                 // OPT-IN, see below
  "manual": false                 // true = single interactive backup, keeps these exact items;
                                  // omit/false lets config.app_items (a per-app item map) override
                                  // the set on bulk, auto and scheduled runs
}
```

`restore`/`import` 接收 `{ref}`（备份目录 / 扫描 ref）。`restore` 还接受：`"items"`（要还原的
备份项目类型的子集；省略则全部还原）、`"test": true`（提取到临时目录并验证，而不触碰正在运行的
应用）、用于 snapshot/mirror 的 `"mode"`、用于加密备份的 `"password"`、`"ssaid"`（选用），以及
安装来源选项 `"spoof_installer"`（默认取自配置，在安装时把安装器设置为 Play Store）和
`"deep_spoof": true`（高级选用项；还会通过编辑软件包数据库来伪造发起方软件包和软件包来源，重启后
生效）。`import` 接收 `"from": "neo" | "databackup"`，对于加密的 Neo 备份还接收 `"password"`。

### `schedule-set` 参数

一个计划任务选择**一个**目标和一个**操作**：

```json
{
  "id": "nightly-games",
  "action": "backup",             // "backup"（默认） | "restore"
  "package": "com.example.app",   // 单个应用   - 或 -
  "packages": ["com.a","com.b"],  // 一组应用   - 或 -
  "all": true,                    // 所有应用，减去排除应用列表
  "cron": "daily",                // hourly | daily | weekly
  "at": "02:30",                  // HH:MM
  "mode": "full",
  "dest": "local",
  "keep": 5,
  "items": ["apk","data"],
  "require_wifi": false,          // 门控：仅在 Wi-Fi 下运行
  "require_charging": false,      // 门控：仅在充电时运行
  "min_battery": 0,               // 门控：仅在此电量 % 及以上时运行 (0-100)
  "days": [1,2,3,4,5]             // 门控：仅在这些星期几运行 (0=周日)
}
```

为目标恰好提供 `package`、`packages` 或 `all` 三者**之一**。一个 `backup` 任务保留通常的 `mode`/`dest`/`keep`/`items`。一个 `restore` 任务（`action: "restore"`）会恢复每个目标应用的**最近**备份（或一个明确的 `ref`），并在**每次运行时覆盖应用的当前数据**: 这是有意为之且需主动选择的，所以只在用户直接请求时才进行设置。

### 调度器门控

一个计划任务可以携带**可选的门控条件（gate conditions）**。当一个到期任务的门控未被满足时，该任务会**被跳过，并在下一个 tick 重试，而不推进其调度**（其 `last_run` 不会被打上时间戳，因此一旦条件满足它就会立即触发）：

| 字段 | 类型 | 门控 |
|-------|------|------|
| `require_wifi` | bool | 仅在 Wi-Fi 下运行 |
| `require_charging` | bool | 仅在充电时运行 |
| `min_battery` | int (0-100) | 仅在此电量水平及以上时运行 |
| `days` | array of int (0-6, 0=周日) | 仅在这些星期几运行 |

在这些之上，还会始终应用一项最小的**热安全（thermal safety）**检查：当设备温度危险过高时，计划的操作会被跳过。每一次门控跳过都会以 `wifi` / `charging` / `battery` / `days` / `thermal` 之一的 `reason`，作为 `op:"scheduler-gated"` 写入 audit trail。

### `remote-add` 参数

云端目标是一个指定某个 `rclone` 远端的 `type:"rclone"` 目标；请先用 `remote-add` 创建该远端。
`backend` 可以是**任意 rclone 后端**: 没有白名单。`remote-add` 接受任意后端名称（`dropbox`、
`onedrive`、`box`、`pcloud`、`mega`、`b2`、`s3`、`sftp`、`smb`、`webdav`、`ftp`、`drive` 以及
rclone 支持的另外约 ~70 个），而 `params` 会作为 `key=value` 对直接传递给 `rclone` 配置。
密码字段以混淆形式存储，绝不以明文保存。常见后端及其 `params`：

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

**设备端 OAuth（无需 PC）。** 需要通过浏览器登录的后端（Google Drive、Dropbox、OneDrive、Box、
pCloud）无需桌面电脑，也无需手动粘贴 token。用 `{backend}` 调用 `remote-authorize`：引擎会针对
一个本地回调服务器（`127.0.0.1:53682`）运行 `rclone authorize <backend>`，并通过 Android VIEW
intent 将手机自己的浏览器打开到提供商的同意页面，返回 `{ok:true,url}`（或
`{ok:false,code:"ERR_AUTHORIZE"}`）。轮询 `remote-authorize-poll`（`{}`）：等待时返回
`{ok:true,done:false,url}`，用户批准后返回 `{ok:true,done:true,token}`, 将该 `token` 传给
`remote-add`。`remote-authorize-cancel`（`{}`）会停止一个待处理的授权（`{ok:true,cancelled:true}`）。
从任意电脑手动粘贴 `rclone authorize "<backend>"` 的输出仍作为后备方式受支持。

Google Drive 有两条路径：这个 `drive` 远端（无需 Google Cloud 项目，使用 rclone 自带的
OAuth, 用 `remote-authorize` 在设备端授权，或在任意一台电脑上运行一次 `rclone authorize "drive"`
并传入 token），或者选用的配套应用（使用你自己的 OAuth client id）。两者最终都成为普通的目标。

### 网络策略

config 字段 `network_policy` 控制云端传输可使用哪种连接：`any`（默认）、`wifi` 或 `mobile`。
用 `config-set` 设置。当其值为 `wifi` 或 `mobile` 时，每一次云端传输（Full 的 `rclone`/Drive
上传、Mirror 同步、远端 `restic` 快照备份/恢复、Mirror 恢复）都会先检查当前使用的传输方式，
若不匹配则以 `ERR_NET_POLICY` 中止, 对手动和计划任务均适用。本地目标从不受此限制。

### 云端完整性与配额

- **校验和封印（云端）** 一次成功的云端复制之后，引擎会运行一次远端校验和检查（`rclone check`）；不匹配会使该操作以 `ERR_VERIFY` 失败。与本地侧没有共同哈希的后端会被跳过（不算失败）。
- **配额检查（云端，Full 模式）** 在向 `rclone` 远端进行 Full 模式上传之前，引擎会查询远端的可用空间（`rclone about --json`），若备份放不下则以 `ERR_QUOTA` 拒绝。不报告配额信息的远端会被跳过。Mirror 模式是增量同步，因此豁免。

### 云端二进制文件（`lite` 版本）

`full` 版本捆绑了全部二进制文件，从不需要联网。`lite` 版本省略了两个最大的 `rclone` 和 `restic`，
并在你第一次执行云端或快照操作时按需获取它们。`cloud-status` 报告它们是否已就位、此版本能否获取
它们，以及下载大小（字节）。`cloud-fetch` 以**分离（detached）**方式运行（用它的 `opid` 轮询
`progress`）：它下载按架构划分的 `rclone`+`restic` 附加包，对照烧录在模块中的 SHA-256 进行校验，
并将其安装到运行时缓存。其进度阶段为 `downloading`、`verifying` 和 `installing`；最终代码在成功
时为 `ERR_NONE`，失败时为 `ERR_FETCH`（下载失败）/ `ERR_FETCH_VERIFY`（校验和不匹配，已丢弃）。
在 `full` 版本上它是多余的。在 `lite` 版本上，当二进制文件尚未就位时，对云端或快照目标的
`backup`/`restore` 会以 `ERR_CLOUD_FETCHABLE` 失败；客户端应提示运行 `cloud-fetch`，然后重试。

### 特殊备份类别

`special-categories` 报告某设备拥有哪些系统级类别；`special-backup` 捕获你在 `categories` 中传入的
类别，`special-restore` 则重新应用它们。类别如下：

| 类别 | 它是什么 | 恢复语义 |
|------|----------|----------|
| `messages` | SMS/MMS | 通过 provider 替换（清除 + 提取） |
| `contacts` | 联系人和通话记录 | 通过 provider 替换（清除 + 提取） |
| `wifi` | 已保存的 Wi-Fi 网络 | 通过 provider 替换（清除 + 提取） |
| `bluetooth` | 蓝牙配对 | 通过 provider 替换（清除 + 提取） |
| `calendar` | 日历 provider（`com.android.providers.calendar`，应用 + 数据）；还会可移植地导出到 `calendar.json` | 通过 provider 替换（清除 + 提取） |
| `wallpaper` | 主屏和锁屏壁纸以及 `wallpaper_info.xml`，以原始（二进制）形式存储 | 文件被替换 |
| `dns` | 从设置读取的私有 DNS 模式和指定符 | 幂等的 `settings put` |
| `system_settings` | system/global/secure 设置的完整转储 | **选用**，幂等的 `settings put`，覆盖设备设置 |

**`system_settings` 严格为选用，且在恢复时具有破坏性。** 与 `ssaid` 一样，它在恢复时会覆盖设备全局
设置，因此被置于用户明确同意之后，并写入审计轨迹。绝不要默认选择它；仅在用户直接、审慎地提出请求时
才选择。

### 独立路径备份

`path-backup` / `path-restore` 在按应用模型之外，备份和恢复共享存储上或 `/data` 下的**任意绝对路径**
- 一个文件夹或单个文件。归档以 VDBackup 自有格式写为 `tar.zst` 加一个 `manifest.json`（经 SHA-256
密封，加密时附带 RECOVERY 套件），存于 backups 目录下的 `.paths/` 中。

```json
// path-backup
{ "path": "/sdcard/DCIM/Camera", "compression": "zstd:10", "password": "..." }
// path-restore
{ "ref": "<.paths ref>", "confirm": true, "password": "..." }
```

- 源路径必须是**绝对的**，且位于允许的根之一下：`/storage/emulated`、`/data/media`、`/sdcard`、
  `/data`。不存在的路径会以 `ERR_NO_PATH` 失败；位于允许的根之外、或包含 `..` 的路径会以
  `ERR_BAD_PATH` 失败。
- `path-restore` 写回原始位置，因此具有破坏性并要求 `"confirm": true`, 一道高摩擦的关卡，就像
  `special-restore`。不是有效路径备份的 `ref` 会以 `ERR_BAD_REF` 失败。
- 两者都以 **detached** 方式运行；用返回的 `opid` 轮询 `progress`。

### `update-check`

`update-check` 报告是否已发布模块的更新版本，以便智能体（或 WebUI）可以展示它。它是一个
**立即返回的读取 verb**: 它**不是** detached 的，因此没有 `opid` 可供轮询。它仅由用户的显式操作
触发，使用内置的 `curl` 通过 root 侧的 HTTP 请求获取模块已发布的更新清单（`module.prop` 中的
`updateJson` URL）- 这在 WebView 之外运行，因此不受 WebUI 的 CSP 约束, 并将已发布的 `versionCode`
与已安装的进行比较。它**不接受任何参数**。

成功时返回：

| 字段 | 类型 | 含义 |
|------|------|------|
| `ok` | bool | `true` |
| `current_version` | string | 已安装的 versionName |
| `current_code` | int | 已安装的 versionCode |
| `latest_version` | string | 已发布的 versionName |
| `latest_code` | int | 已发布的 versionCode |
| `update_available` | bool | 当 `latest_code` 大于 `current_code` 时为 `true` |
| `zipUrl` | string | 已发布 zip 的 URL |
| `changelog` | string | 已发布 changelog 的 URL |
| `notes` | string | 发布说明 |

如果没有 `updateJson` URL、网络请求失败，或清单无法解析，它会返回
`{"ok":false,"code":"ERR_UPDATE_CHECK"}`。

`update-check` 只**报告**可用性和发布说明；更新本身由你的 root 管理器（KernelSU / APatch / Magisk）
通过模块的 `updateJson` 执行，绝不由此 verb 执行。

## 你的智能体必须遵守的安全护栏

- **`ssaid` 严格为选用（默认关闭）。** 它通过改写一个系统文件来备份/恢复设备
  ANDROID_ID；恢复仅在重启后生效，并且为便于回滚，总会先保存原文件。只有在用户直接、
  审慎地提出请求时才发送 `"ssaid": true`, 绝不要默认发送。
- **变更性操作（restore、delete、import）具有破坏性**，并会记录到本地审计轨迹
  （`logs/audit.jsonl`）。恢复是忠实的（wipe-then-extract），会把应用还原到备份所捕获的确切
  状态。调用它们之前请先确认意图。
- **`system_settings` 是选用的且具有破坏性，与 `ssaid` 完全一样。** 恢复它会覆盖设备全局设置，因此
  仅在用户直接请求时才发送它；它由明确同意把关，并记录到审计轨迹中。
- **恢复是幂等的。** 原始 provider 恢复（messages/contacts/wifi/bluetooth/calendar）是**替换**而非
  合并, provider 数据被清除，归档在其上提取, 因此重新恢复同一个备份不会产生重复行。`dns` 和
  `system_settings` 以幂等的 `settings put` 重新应用。
- **归档提取受到防路径遍历保护。** 恢复以 root 运行，因此在任何写入之前都会检查每个归档（restore、
  import、special-restore、path-restore）：其成员使用绝对路径或包含 `..` 的归档，会在发生任何一次
  破坏性写入之前，预先以 `ERR_UNSAFE_ARCHIVE` 被拒绝（GNU tar 还会以 `--no-absolute-names` 运行）。
  被篡改的归档永远无法逃出其目标目录。
- **绝不要削弱**保留项（SELinux/uid/gid/modes/xattr）或 APK 规则（APK 始终压缩，除非设置了
  `encrypt_apk`，否则绝不加密）。
- 把 JSON 输出当作真实来源；检查 `ok`/`code`，轮询 `progress`，并把 `ERR_*` 代码呈现出来，
  而不是靠猜测。

内部实现请参见 [ARCHITECTURE.md](ARCHITECTURE.md) 和
[FILE-STRUCTURE.md](FILE-STRUCTURE.md)。

---

*本文档由 Claude (Anthropic) 生成，并由 VD171 维护。欢迎提出修正与改进, 参见 [CONTRIBUTING.md](CONTRIBUTING.md)。*
