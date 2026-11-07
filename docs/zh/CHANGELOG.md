> **Languages:** [English](../../CHANGELOG.md) · [العربية](../ar/CHANGELOG.md) · [Čeština](../cs/CHANGELOG.md) · [Deutsch](../de/CHANGELOG.md) · [Español](../es/CHANGELOG.md) · [فارسی](../fa/CHANGELOG.md) · [Français](../fr/CHANGELOG.md) · [हिन्दी](../hi/CHANGELOG.md) · [Bahasa Indonesia](../in/CHANGELOG.md) · [Italiano](../it/CHANGELOG.md) · [日本語](../ja/CHANGELOG.md) · [한국어](../ko/CHANGELOG.md) · [Nederlands](../nl/CHANGELOG.md) · [Polski](../pl/CHANGELOG.md) · [Português](../pt/CHANGELOG.md) · [Русский](../ru/CHANGELOG.md) · [Svenska](../sv/CHANGELOG.md) · [ไทย](../th/CHANGELOG.md) · [Türkçe](../tr/CHANGELOG.md) · [Tiếng Việt](../vi/CHANGELOG.md) · 中文

---

# 更新日志

VDBackup 的所有重要变更都记录于此。仅提供英文。

## v1.03

新的备份范围：

- 新的特殊备份类别：日历（日历 provider，外加一份可移植的 `calendar.json` 导出）、壁纸（主屏和锁屏
  壁纸）、私有 DNS（模式与指定符），以及系统设置（system/global/secure 设置的完整转储）。系统设置为
  opt-in，并在恢复时覆盖设备全局设置，因此像 SSAID 一样受到把关，需要明确同意并记录完整的审计条目。
- 独立的文件夹与文件备份：将任意绝对路径（共享存储或应用数据）备份为经压缩、以 manifest 封存的归档，
  并恢复到同一路径。恢复需要明确确认。

更安全的恢复：

- 在写入任何内容之前都会检查每个归档：内容指向其目标之外（绝对路径或 `..` 组件）的备份会被拒绝，因此
  以 root 身份运行的恢复无法被诱骗写到目标之外。

进度与计划：

- 实时进度现在会在备份期间显示传输速度、ETA 和项目计数器，另外还有用于云上传的 checksum 校验步骤以及
  “空间不足”的预检。
- 计划任务可以附加条件：仅在 Wi-Fi 下、仅在充电时、仅在电量高于某一水平时，或仅在所选的星期几运行；
  当设备过热到临界程度时，计划任务也会被跳过。被跳过的任务会在下一个 tick 重试。

云端目标：

- 从界面连接任意 rclone 后端：云端远程下拉列表提供常用的提供商（Google Drive、Dropbox、OneDrive、Box、
  pCloud、Mega、Backblaze B2、S3、SFTP、WebDAV、FTP、SMB），外加一个"Custom (advanced)"选项，让你输入
  任意其他 rclone 后端名称及其 `key=value` 参数，因此 rclone 的所有后端都可访问。
- 设备端登录（无需 PC）：需要通过浏览器登录的提供商（Google Drive、Dropbox、OneDrive、Box、pCloud）带有
  一个"Authorize in browser"按钮，它会将手机自己的浏览器打开到提供商的同意页面；在你批准后，你返回应用，
  远程会自动保存，令牌在设备上被捕获。手动粘贴令牌仍可作为后备方案。

界面：

- 可调节的界面缩放（一个可拖动的滑块）会重新缩放整个界面，使其适配不同像素密度的屏幕；100% 为默认值且保持不变。
- 界面现在对阿拉伯语和波斯语采用从右到左的渲染。
- 一个主页概览，带有备份计数和存储条、状态徽章、将哈希和路径复制到剪贴板的功能、Android 风格的拨动开关，以及一个
  “Check for updates”操作。
- 活动日志是一个可立即打开的全屏页面，带有一个“Export logs”操作，可保存一个你可以附加到报告中的日志文件。

修复：

- 在其捆绑的 `tar` 不接受 `--no-absolute-names` 选项的设备上，恢复和导入不再失败；归档安全检查与该
  选项无关。
- 即使在未捆绑 HTTP 客户端的环境中，“Check for updates”也能通过回退到捆绑的 rclone 来工作；并且活动日志打开不再耗时很久。

## v1.01

首个公开版本。这是一个 KernelSU/APatch/Magisk WebUI 模块，完全以 root 身份备份和恢复应用及其数据，无需授权提示。

引擎与格式：

- 备份/恢复引擎作为分离的 root 进程（`setsid`）运行：关闭 WebUI 或 root 管理器后它仍会继续运行，界面通过 `opid` 重新连接到实时进度。
- 三种备份模式：Full（tar.zst，本地或远程）、Snapshot（restic 仓库，加密并去重）和 Mirror（rclone/rsync 1:1 同步）。即使在镜像模式下，APK 也始终会被压缩。
- 每个应用的项目：APK（base + splits）、`data`、`data_de`、`obb`、外部存储和媒体。SELinux 上下文、uid/gid、权限模式以及 xattr/caps 都会被保留；恢复使用 `pm install` 会话，并将所有权/上下文重新映射到当前 uid。
- 全程支持按用户（多用户）识别。备份存储在 `/sdcard/VDBackup`（按用户）下，位于 `/data/adb` 之外，因此在首次解锁前无法读取；每个目标都在 `<path>/vdbackup` 下进行命名空间隔离。
- 压缩：none、lz4、zstd（分级）或 gzip（"兼容模式"）。一份 JSON 清单记录设备、软件包（包括应用标签）、项目和权限。
- 使用 `age`（keygen）进行可移植加密，并在每个加密备份中附带一份 PC RECOVERY 指南，以便在任何地方无需本模块即可解密和提取。

目标与云端：

- 目标：添加/列出/测试/删除（本地、rclone 远程、restic 仓库，以及可选启用的 Google Drive 伴生应用）；凭据以混淆方式存储，绝不以明文保存。
- 可从 UI/API（`remote-add`/`remote-list`/`remote-del`）创建 rclone 远程，因此无需手动编辑 `rclone.conf` 即可访问任何云端后端（SFTP、SMB、WebDAV、FTP、S3、Google Drive 等）。
- Google Drive 有两种方式：通过 rclone（无需 Google Cloud 账户）或可选启用的无界面伴生应用（`ru.vd171.vdbackup`），该应用会附带强制性的 HMA-OSS 隐藏提示。
- 网络策略：可选择云端传输使用任意连接、仅 Wi-Fi 或仅移动数据；对手动和计划任务均强制执行。本地目标不受此限制。

导入（迁移）：

- 从 Neo-Backup 导入，包括密码加密的备份（由 dex 辅助程序解密 AES-256-GCM；WebUI 会提示输入密码）。
- 从 Android-DataBackup 导入（安装 APK，提取 user/user_de/data 存档，重新映射）。
- 两者都已针对多台设备的真实备份进行验证。

完整性与安全：

- 忠实地先清空再提取的恢复方式；按存档进行 sha256 校验（Full 模式默认开启，Snapshot 则进行仓库完整性检查）、dry-run 和恢复测试。会回读存档以确保完整性；损坏的存档或无效的软件包名称绝不会触发破坏性恢复，远程传输失败会被报告，绝不静默忽略。
- 选择性还原：还原备份所含项目的任意子集（APK、data、受保护数据、OBB、外部存储、媒体），默认全部选中。
- 从 UI/API 删除备份（`delete-backup`），以及对手动备份的保留最近 N 个策略（`prune`）；每一次删除、还原、修剪和计划运行都会写入一份可在应用内查看的本地 JSON 审计日志。
- 运行时权限和 AppOps 会被记入清单，并在恢复时重新应用。安装来源（installerPackageName）以及启用/禁用状态也会被捕获，并在恢复时重新应用。
- 安装来源伪装：默认情况下，还原的应用会把 Play Store 报告为其安装来源（在安装时通过安装会话设置，否则还原的应用会看起来像旁加载）；可全局切换，也可按单次还原切换，关闭时会保留所捕获的来源。一个高级的、选择加入的"深度"模式会额外通过编辑系统软件包数据库来伪造发起方软件包和软件包来源（先进行逐字节精确备份，重启后生效），使应用看起来完全是由商店安装的。
- SSAID（设备 ANDROID_ID）：严格需要显式启用并醒目标注；支持 ABX；在任何覆盖之前，始终会对实时文件进行逐字节精确备份以便回滚；在重启后生效。
- 恢复和导入在继续之前需要明确确认"这将覆盖当前应用数据"。

调度与自动化：

- 带 keep-N 保留策略的计划备份，从 Schedule 标签页管理（按应用，每天/每小时/每周，可选时间、模式和目标）。
- 安装或更新时自动备份：一个选择加入的观察器搭乘调度器心跳，在后台备份新安装或更新的应用，并且只在首次运行时进行播种，因此启用它绝不会一次性备份所有内容。遵循排除应用（黑名单）设置。

特殊（系统级）备份：

- 把短信（SMS/MMS）、联系人和通话记录、Wi-Fi 和蓝牙作为原始的、忠实归档的系统数据进行备份（与应用备份相同的 SELinux/xattr 保留和可选的 age 加密）。还原在同一设备/同一 ROM 上保持忠实，需要重启，并被置于一个醒目的覆盖并重启确认之后。
- 在原始存档之外的可选可移植导出：短信、通话记录和联系人还会被写成可打开的 JSON（用捆绑的 sqlite3 直接从 provider 数据库读取，因此含逗号或换行的短信正文也能完整保留），提供一份跨设备、无需模块的副本。当备份被加密时，这份可移植副本也会被加密，因此它绝不会泄露存档所保护的内容。

系统集成：

- 无需触碰真实的 /system 分区即可把已安装的应用挂载为系统应用：VDBackup 会把该应用的 APK 暂存到它自己的叠加子模块中，由 root 管理器挂载。在 KernelSU 上启用 NoMount 时它会被实时注入（无需重启）；否则在下次开机时生效，因此它绝不依赖于已安装 NoMount。可选择常规或特权放置位置。

WebUI：

- 应用列表在软件包旁显示真实的本地化应用名称（从 APK 解析得出，因此卸载后仍然存在），图标采用懒加载并缓存，渲染为圆角且支持自适应的方块。
- 点按某个应用即可打开其备份历史并恢复任意先前的备份；Backups 标签页将名称和软件包显示在不同行上，并为每个备份打开一个详情面板（版本、安装来源、状态、日期、大小、项目、权限数量、设备）。
- 按用户/系统/全部筛选应用列表并按名称或软件包排序；选择多个应用并在一个批次中备份它们；把应用从自动和计划备份中排除。
- 为每次备份选择要包含的内容并切换 verify 或 dry-run；选择仅测试的还原，它会提取到暂存区而不触碰正在运行的应用。
- 浅色/深色主题、强调色选择器、语言选择器、About 标签页（含姊妹项目和内置二进制文件审计清单）、本地目标的文件夹选择器、带即时反馈的本地化操作进度，以及现代化的应用内对话框（没有系统 alert/confirm 弹窗）。
- 返回按钮导航会回到上一个标签页并先关闭对话框；对话框是浮动的，应用在重新打开后会通过重新挂接到正在运行的操作而得以延续。

AI 友好与 i18n：

- 一套文档化的 JSON 控制接口，使代理能够以无界面方式管理每一项操作（`docs/AI-AGENTS.md`）；WebUI 只是该 API 的一个客户端。
- README 和所有项目文档都已翻译成 21 种标准语言（`docs/<lang>/`），并将文档镜像到 wiki。
- 丰富的应用列表和 Neo 解密通过以 root 身份驱动的 dex 辅助程序运行（经由 ServiceManager 的 `IPackageManager`），因此在 ActivityThread 挂起的环境下也能工作。

*本文档由 Claude (Anthropic) 生成，并由 VD171 维护。欢迎提出修正与改进 - 参见 [CONTRIBUTING.md](CONTRIBUTING.md)。*
