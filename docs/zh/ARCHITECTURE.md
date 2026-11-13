> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Українська](../uk/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · 中文

---

# 架构

VDBackup 是一个 root WebUI 模块。它分为三层：**WebUI**(你所看到的部分)、
**shell 后端**(以 root 身份完成实际工作的部分),以及**捆绑的二进制文件**
(归档工具和传输工具)。一切都已经以 root 身份运行,因此核心功能既没有
权限请求提示,也没有配套应用。

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

## 要点

- **已是 root。** 模块进程以 root 运行,因此引擎就是纯 shell。约 85% 的工作是
  纯 shell(`tar`/`zstd`/`age`/`pm`/`am`/`chown`/`chcon`/`rclone`/...)。
- **分离执行。** 备份/恢复通过 `setsid nohup` 作为独立的 root 进程运行。关闭
  WebUI 不会中断它们;UI 通过读取
  `logs/progress-<opid>.json` 重新连接。
- **框架辅助程序(~15%)。** 细粒度权限、AppOps、SSAID、StorageStats、
  图标和有特权的 Wi-Fi 需要 Android 框架。一个通过 `app_process` 运行的
  小型 `dex`(没有已安装的应用)处理这些,并带有 shell 回退方案。
- **可移植性。** 仅使用标准格式;备份无需此模块即可在 PC 上打开。
- **状态**存放在 `/data/adb/vdbackup/`(配置、任务、目标、加密的
  凭据、日志、暂存)。**备份**写入用户可见、凭据加密的存储
  `/sdcard/VDBackup/`(`/data/media/<user>/VDBackup`,按用户),
  而不是 `/data/adb`(它是设备加密的,且在首次解锁前可读)。

## 兼容性保证

备份必须永远保持可恢复。这是一条硬性规则,而非尽力而为。

**范围。** 该保证涵盖由 **v1.01 及以后**(首个正式发布的版本)写入的备份,且仅涵盖正式发布的
已发行版本。v1.00 是一个仅供测试的构建,明确不在范围内;预发布和开发构建不在覆盖之列。从首个
公开版本起,下面的承诺是绝对的:

- **仅标准格式。** 每个归档都是用 `zstd`、`gzip` 或 `lz4` 压缩的普通 `tar`,
  可选择用 `age` 包装。没有专有容器,因此即使没有此模块,也可以用普通工具在任何
  PC 上打开备份(参见 `etc/RECOVERY.md`)。这是一种我们不能放弃的格式。
- **仅追加的元数据。** `manifest.json` 携带 `format_version`。该架构只会
  增长:字段只能被*添加*,绝不会被移除、重命名或改作他用。恢复会防御性地
  读取每个字段(缺失的可选字段回退到默认值),并根据文件名和扩展名来安装
  APK 和提取归档,而不是假定固定的 manifest 结构。
- **向前兼容的恢复。** 恢复绝不会因为备份陈旧而拒绝它,较旧的 VDBackup 会悄悄
  跳过它不认识的条目类型,而不是失败。因此,较新的 VDBackup 能够恢复任何较旧的
  备份,而标准格式的归档无论如何都能手动恢复。

简而言之:VDBackup 曾经写入的任何内容,未来的每一个 VDBackup(以及一台普通
PC)都仍然能够恢复。以破坏先前备份的方式更改格式是不被允许的;新功能都添加在
`format_version` 和新的、追加式的字段之后。

关于完整的技术设计(归档格式、元数据架构、流水线、加密、目标、导入器),维护者
保留着详细的设计笔记;本文件是面向贡献者的概览。

<!-- doc-footer -->

---

> _本文档由 Claude (Anthropic) 生成，并由 VD171 维护。欢迎修正和改进；请参阅 [CONTRIBUTING.md](CONTRIBUTING.md)。_
