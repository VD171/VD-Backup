> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Українська](../uk/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · 中文

---

# 为 VDBackup 做贡献

感谢你的参与！VDBackup 的目标是让人容易参与贡献。本指南会告诉
你各部分的位置，以及我们遵循的少数几条约定。

## 项目一览

VDBackup 是一个 **KernelSU/APatch/Magisk WebUI 模块**：shell 脚本 + 纯 JS
WebUI + 按 ABI 分的静态二进制文件。核心功能不需要任何应用。参见
[ARCHITECTURE.md](ARCHITECTURE.md) 和 [docs/FILE-STRUCTURE.md](FILE-STRUCTURE.md)。

它是开放的、root 原生的 **Swift Backup、Neo-Backup 和
Android-DataBackup 的继任者**: 在 AGPLv3 下将它们的功能合并起来，并支持导入
现有的 Neo-Backup 和 Android-DataBackup 备份，让人们可以迁移。

## 欢迎 AI 贡献者

AI 助手和智能体在这里是一等的贡献者，而非事后补充。

- 本项目设计为机器可读：每个 `helper.sh` 动词都打印一个单独的
  JSON 对象，引擎是纯 POSIX shell，文件布局记录在
  [docs/FILE-STRUCTURE.md](FILE-STRUCTURE.md) 中。
- 智能体可以通过该 JSON API 无界面地管理模块的**每一项**内容和动作 -
  完整的控制面、动词和安全护栏都在
  [docs/AI-AGENTS.md](AI-AGENTS.md) 中。
- AI 辅助的补丁与其他补丁按同样的标准审查和接受, 依据
  正确性、清晰度和下面的约定，而不是由谁（或什么）编写。
- 如果你从智能体驱动 VDBackup，请使用 `helper.sh` 的 JSON 输出作为
  契约；不要抓取 WebUI。
- 对所有人一视同仁：真正的功能绝不被削弱，密钥和设备数据
  绝不进入仓库（见严格的 [.gitignore](.gitignore)），并且变更性
  动作始终需要确认并记录审计。

## 开发环境

- 你需要一台已 root 的设备/模拟器（KernelSU、APatch 或 Magisk）来测试。
- 构建可刷入的 zip：`cd module && zip -r9 ../VD-Backup-dev.zip .` 然后刷入它。
- WebUI 是 `module/webroot/`（从 root 管理器中打开）。后端是
  `module/helper.sh`（分发器）和 `module/worker.sh`（分离引擎）。
- 原生二进制文件位于 `module/bin/<abi>/`，由 CI 生成
  （`.github/scripts/build_bin.sh`）；你通常不需要手动重新构建它们。

## 约定

- **每个源文件**（`.sh`、`.js`、`.css`、`.html`、`.svg`、`.yml`）都以
  项目横幅头开头（从任意现有文件复制它）。没有例外。
- **代码和注释用英文。** 注释保持最少，只在需要的地方加。
- **不使用长破折号或短破折号**；始终使用普通连字符 `-`。
- WebUI 是 **vanilla JS**（一个 `scripts.js`）；不用框架。只通过
  `helper(verb, args)` 包装器与 root 对话，并对每个插值进行转义。
- **绝不削弱** 真正的功能（例如 SELinux/uid/gid/modes 的保留）。
- 变更性动作（恢复、删除）必须请求确认并写入审计日志。

## 国际化（i18n）

- UI 字符串位于 `module/webroot/lang/`。英文是规范的回退
  （`en.js` + `en.json`）；其他 20 种语言是 `<code>.json`。
- 要添加或修改字符串：编辑 `en.js` **以及** `en.json`，然后更新每个
  `<code>.json`。改动一个可见的标签意味着要更新**所有**语言文件和
  **所有** `README.<code>.md`。
- 翻译就是普通的 JSON, 很好的首次贡献。语言列表参见
  `module/webroot/i18n.js`。

## 提交与 PR

- 保持 PR 聚焦。说明做了什么以及为什么。
- 为你的提交签署（DCO）：`git commit -s`（添加 `Signed-off-by:`）。
- CI 必须保持通过。在审查中保持友善, 参见 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。

## 适合新手的 issue

寻找 `good first issue` 和 `help wanted` 标签。翻译、文档、新的
`rclone` 目标预设和 WebUI 润色都是很好的起点。

<!-- doc-footer -->

---

> _本文档由 Claude (Anthropic) 生成，并由 VD171 维护。欢迎修正和改进；请参阅 [CONTRIBUTING.md](CONTRIBUTING.md)。_
