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
| `backup-info` | `{ref}` | `{ok,...}` 某个备份的完整详情（版本、安装来源、状态、日期、模式、大小、项目、权限计数、设备） |
| `backup-icon` | `{ref}` | `{ok,icon}` 来自清单的 base64 PNG（应用已卸载时仍可用） |
| `delete-backup` | `{ref}` | `{ok,deleted}`（ref 必须位于 backups 目录之下） |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` 保留某软件包最新的 N 个 |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` 审计日志，最新的在前 |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}`（messages/contacts/wifi/bluetooth） |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` 系统级备份（detached） |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}`（需要重启；由 `confirm` 把关） |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | 把已安装的应用挂载为系统应用（无系统修改的子模块；通过 NoMount 实时生效，否则下次开机生效） |
| `companion-status` / `companion-install` | `{}` | Google Drive 配套应用状态 / 按需安装 |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | 目标管理 |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | rclone 远端管理（创建 `type:"rclone"` 目标所指向的 `rclone.conf` 条目） |
| `schedule-set` / `schedule-list` / `schedule-delete` | `{id,package,mode,dest,cron,at,keep,items}` | 计划任务 |
| `scheduler-tick` | `{}` | 运行到期任务 + 应用保留策略 + 自动备份观察器（开机心跳会调用它） |

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
  "ssaid": false                  // OPT-IN, see below
}
```

`restore`/`import` 接收 `{ref}`（备份目录 / 扫描 ref）。`restore` 还接受：`"items"`（要还原的
备份项目类型的子集；省略则全部还原）、`"test": true`（提取到临时目录并验证，而不触碰正在运行的
应用）、用于 snapshot/mirror 的 `"mode"`、用于加密备份的 `"password"`、`"ssaid"`（选用），以及
安装来源选项 `"spoof_installer"`（默认取自配置，在安装时把安装器设置为 Play Store）和
`"deep_spoof": true`（高级选用项；还会通过编辑软件包数据库来伪造发起方软件包和软件包来源，重启后
生效）。`import` 接收 `"from": "neo" | "databackup"`，对于加密的 Neo 备份还接收 `"password"`。

### `remote-add` 参数

云端目标是一个指定某个 `rclone` 远端的 `type:"rclone"` 目标；请先用 `remote-add` 创建该远端。
密码字段以混淆形式存储，绝不以明文保存。受支持的 `backend` 值及其 `params`：

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

Google Drive 有两条路径：这个 `drive` 远端（无需 Google Cloud 项目，使用 rclone 自带的
OAuth - 在任意一台电脑上运行一次 `rclone authorize "drive"` 并传入 token），或者选用的配套
应用（使用你自己的 OAuth client id）。两者最终都成为普通的目标。

### 网络策略

config 字段 `network_policy` 控制云端传输可使用哪种连接：`any`（默认）、`wifi` 或 `mobile`。
用 `config-set` 设置。当其值为 `wifi` 或 `mobile` 时，每一次云端传输（Full 的 `rclone`/Drive
上传、Mirror 同步、远端 `restic` 快照备份/恢复、Mirror 恢复）都会先检查当前使用的传输方式，
若不匹配则以 `ERR_NET_POLICY` 中止 - 对手动和计划任务均适用。本地目标从不受此限制。

## 你的智能体必须遵守的安全护栏

- **`ssaid` 严格为选用（默认关闭）。** 它通过改写一个系统文件来备份/恢复设备
  ANDROID_ID；恢复仅在重启后生效，并且为便于回滚，总会先保存原文件。只有在用户直接、
  审慎地提出请求时才发送 `"ssaid": true` - 绝不要默认发送。
- **变更性操作（restore、delete、import）具有破坏性**，并会记录到本地审计轨迹
  （`logs/audit.jsonl`）。恢复是忠实的（wipe-then-extract），会把应用还原到备份所捕获的确切
  状态。调用它们之前请先确认意图。
- **绝不要削弱**保留项（SELinux/uid/gid/modes/xattr）或 APK 规则（APK 始终压缩，除非设置了
  `encrypt_apk`，否则绝不加密）。
- 把 JSON 输出当作真实来源；检查 `ok`/`code`，轮询 `progress`，并把 `ERR_*` 代码呈现出来，
  而不是靠猜测。

内部实现请参见 [ARCHITECTURE.md](../ARCHITECTURE.md) 和
[FILE-STRUCTURE.md](FILE-STRUCTURE.md)。

---

*本文档由 Claude (Anthropic) 生成，并由 VD171 维护。欢迎提出修正与改进 - 参见 [CONTRIBUTING.md](../CONTRIBUTING.md)。*
