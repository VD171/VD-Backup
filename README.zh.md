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
  <b>以 root 身份完整备份和还原应用与数据, 完全通过 WebUI 操作。</b><br>
  KernelSU / APatch / Magisk 模块。无需「授予 su」提示，无需切换 <code>sucompat</code>。
</p>

<p align="center">
  <a href="https://github.com/VD171/VD-Backup/releases">Releases</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/zh-Home">Wiki</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/zh-USER-GUIDE">用户指南</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/zh-AI-AGENTS">AI 代理</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/zh-ARCHITECTURE">架构</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/zh-BINARIES">随附的二进制文件</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/zh-CHANGELOG">更新日志</a> ·
  <a href="https://xdaforums.com/t/VD-Backup.4807267/">XDA thread</a>
</p>

> **Languages:** [English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

| Home | Apps | Schedule |
|:---:|:---:|:---:|
| ![Home](docs/screenshots/en/home-dark.png) | ![Apps](docs/screenshots/en/apps-dark.png) | ![Schedule](docs/screenshots/en/schedule-dark.png) |
| **Destinations** | **Settings** | **Activity log** |
| ![Destinations](docs/screenshots/en/destinations-dark.png) | ![Settings](docs/screenshots/en/settings-dark.png) | ![Activity log](docs/screenshots/en/activitylog-dark.png) |

---

## 这是什么

VDBackup 是一个 root **WebUI 模块**，用于备份和还原你的应用及其数据，**核心功能无需配套应用** -
因为模块本身已是 root，没有什么需要「允许」的。它的目标是在一个地方、用简洁的 WebUI 完成热门
备份应用所做的一切。

它定位为开放、root 原生的 **Swift Backup、Neo-Backup 和 Android-DataBackup 的继任者**: 在 AGPLv3
之下提供它们功能的并集，甚至可以导入现有的 Neo-Backup 和 Android-DataBackup 备份，便于你迁移。

## 功能

- **应用:** APK (base + splits)、应用数据 (`/data/data`)、设备保护数据
  (`/data/user_de`)、外部数据 (`Android/data`)、OBB、媒体。
- **系统/特殊数据:** 权限、AppOps 以及 (选择加入的) SSAID，在 root 允许的范围内。
- **备份模式:** **Full** (可移植的 `tar.zst`)、**Snapshot** (通过 `restic` 实现增量 +
  版本化) 和 **Mirror** (通过 `rclone`/`rsync` 实现 1:1 同步)。
- **忠实保留:** SELinux 上下文、uid/gid、模式、xattr 和 capabilities。
- **压缩:** none / lz4 / zstd / gzip (gzip =「兼容模式」，随处可开)。
- **加密:** 可选、可移植 (`age` + 口令，或 AES-256 zip), 绝不绑定到设备硬件，因此备份可在
  另一台设备上还原或在 PC 上打开。
- **目标位置:** 本地、SFTP、SCP、SMB、WebDAV、FTP、S3 以及 70 多种 (`rclone`)，外加 `rsync`
  和 `restic` 仓库。还可通过一个小型的选择加入配套应用选用 Google Drive。
- **完整性:** 每个归档都会对照清单进行校验；试运行和还原测试让你无需改动任何东西即可检查备份。
- **选择性与批量还原:** 还原备份项目的任意子集，或多选多个备份并一次性全部还原；删除备份，并为每一次破坏性操作保留活动/审计日志。
- **特殊备份:** 短信 (SMS/MMS)、联系人和通话记录、Wi-Fi 和蓝牙，还可选地导出一份可在 PC 上打开的可移植 JSON。
- **调度 + 自动化:** 针对单个应用、一组应用或所有应用的周期性**备份或恢复**任务，以 keep-N 修剪，外加选择加入的安装/更新时自动备份和一份排除应用列表。
- **安装来源:** 还原的应用默认把 Play Store 报告为其安装来源 (可切换)；一个高级的选择加入项还会伪造发起方软件包和来源。
- **系统应用挂载:** 无需触碰真实的 `/system` 分区即可把已安装的应用挂载为系统应用 (无系统修改的叠加子模块，支持 NoMount)。
- **后台:** 备份/还原以分离方式运行，关闭 WebUI 后仍会继续，并在开始和完成时发送通知。
- **迁移导入:** 导入现有的 Neo-Backup 和 Android-DataBackup 备份，包括用密码加密的备份。

## 安装

1. 从 [发布](https://github.com/VD171/VD-Backup/releases) 下载最新的 `VD-Backup-vX.Y.zip`。
2. 在 KernelSU / APatch / Magisk 管理器中刷入, 立即可用，无需重启。
3. 打开模块的 **WebUI** 进行配置并运行备份。就这么简单。

**版本。** 每个发行版包含六个 zip。`universal-full`, 所有架构和全部二进制文件均已内置（含用于云服务商的 `rclone`、用于快照的 `restic`），完全离线，永不下载任何内容，任何设备可用，体积最大。`universal-lite`, 所有架构，但去掉两个最大的二进制文件（`rclone`、`restic`），体积最小；仍可进行本地、SSH/SFTP 和 `rsync` 备份而无需下载，首次使用云端目标（`rclone`）或快照模式（`restic`）时，它会提示下载对应架构的小型附加组件一次（通过 SHA-256 校验）并缓存，之后这些功能也可使用。`<abi>-full`（`arm64-v8a`、`armeabi-v7a`、`x86`、`x86_64`）, 单一架构含全部内置二进制文件，比 `universal-full` 小。知道自己的架构 -> 选 `<abi>-full`；想要最小且不介意为云端或快照进行一次性下载 -> `universal-lite`；想要全部内置且零下载（离线 / 恢复） -> full 版本。参见 [发布](https://github.com/VD171/VD-Backup/releases)。

初次使用？[用户指南](docs/USER-GUIDE.md) 将带你从安装一路走到还原。

## 可移植性

你的备份**不会被锁定在本模块中**。一切都使用标准格式
(`tar`、`gzip`、`zstd`、`age`、`zip`、`restic`)，可在 Windows、macOS 和 Linux 上用常见工具或
文件管理器打开。每个加密备份都附带一个 **RECOVERY** 说明，其中包含在 PC 上解密和解压的确切命令。

## 构建

模块由 shell + WebUI 以及为 `armeabi-v7a`、`arm64-v8a`、`x86`、`x86_64` 构建的各 ABI 静态二进制
(`tar`、`zstd`、`lz4`、`rclone`、`rsync`、ssh、`restic`) 组成。请参阅
[CONTRIBUTING.md](CONTRIBUTING.md) 和 CI 工作流。

## 对 AI 友好

VDBackup 的构建目标是不仅欢迎人，也欢迎 AI 助手和代理。引擎讲 JSON (`helper.sh` 的每个 verb
都返回单个 JSON 对象)，代码、文档和文件结构都为机器读取而布局，AI 辅助的贡献会像其他贡献一样
被审查和接受。代理可以通过 WebUI 所用的同一 API，以无头方式管理模块的**每一个**操作, 完整的
控制面请见 **[docs/AI-AGENTS.md](docs/AI-AGENTS.md)**，参与贡献请见
[CONTRIBUTING.md](CONTRIBUTING.md#ai-contributors-welcome)。

## 文档

- **[Wiki](https://github.com/VD171/VD-Backup/wiki/zh-Home)**: 可在线浏览的文档。
- **[用户指南](https://github.com/VD171/VD-Backup/wiki/zh-USER-GUIDE)**: 从安装到还原，端到端。
- **[AI 代理](https://github.com/VD171/VD-Backup/wiki/zh-AI-AGENTS)**: 通过 JSON API 以无头方式执行每一个操作。
- **[架构](https://github.com/VD171/VD-Backup/wiki/zh-ARCHITECTURE)** 和 **[文件结构](https://github.com/VD171/VD-Backup/wiki/zh-FILE-STRUCTURE)**: 工作原理。
- **[随附的二进制文件](https://github.com/VD171/VD-Backup/wiki/zh-BINARIES)**: 每个预编译二进制文件的来源与 SHA-256，便于完整审计。
- **[恢复](https://github.com/VD171/VD-Backup/wiki/zh-RECOVERY)**: 无需模块即可在 PC 上打开并解密备份。
- **[参与贡献](https://github.com/VD171/VD-Backup/wiki/zh-CONTRIBUTING)** 和 **[安全](https://github.com/VD171/VD-Backup/wiki/zh-SECURITY)**。
- **[更新日志](https://github.com/VD171/VD-Backup/wiki/zh-CHANGELOG)** 和 **[行为准则](https://github.com/VD171/VD-Backup/wiki/zh-CODE_OF_CONDUCT)**。

<!-- /vd-docs -->

## 另见

同一作者的姊妹项目:

- **[VDInfos](https://github.com/VD171/VD-Infos)**: 一个设备方法调试器: 通过每一种能读取某项的方法去读取它，并将结果并排比较。
- **[VDGoogle](https://github.com/VD171/VD-Google)**: 在你的设备上无需联网即可读取你的 Google 服务 (RCS、Wallet、Play Integrity 证明)。
- **[COPG-VD](https://github.com/VD171/COPG-VD)**: 一个设备伪装器，把全新的指纹变成连贯一致的配置。
- **[VD-dropbear](https://github.com/VD171/VD-dropbear)**: 一个独立的 root SSH 守护进程 (Dropbear)。

## Contacts

- https://vd171.ru
- https://vd.priv8.ru
- *Telegram:* @VD_Priv8 https://t.me/VD_Priv8
- *Channel:* @Priv8_VD https://t.me/Priv8_VD
- *Discord:* @VD.Priv8 https://discord.com/users/1296831918989639721
- *E-mail:* vd.priv8@pm.me
- *XDA-Developers:* @VD171 https://xdaforums.com/m/vd171.4699873/
- *XDA thread:* https://xdaforums.com/t/VD-Backup.4807267/
- *GitHub:* @VD171 https://github.com/VD171

## 许可证

[GNU AGPL-3.0-or-later](LICENSE)。网络 copyleft: 如果你运行修改后的版本，即使作为服务运行，
也必须提供其源代码。

## 商标

VD Backup 是一个独立的非官方项目。它与 Google LLC 或任何其他厂商没有关联，未获其认可或赞助。「Google Drive」、「Android」及相关名称和标志是其各自所有者的商标。VD Backup 在你的设备上运行，仅上传到你所配置的目标位置。

## Tags

`android` `backup` `restore` `app-data` `migration` `neo-backup` `databackup` `kernelsu` `apatch` `magisk` `webui` `root` `tar` `zstd` `restic` `rclone` `age` `encryption` `ssaid` `appops` `on-device` `agpl` `ai-friendly` `vdbackup`
