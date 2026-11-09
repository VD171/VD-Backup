> **Languages:** [English](../BINARIES.md) · [العربية](../ar/BINARIES.md) · [Čeština](../cs/BINARIES.md) · [Deutsch](../de/BINARIES.md) · [Español](../es/BINARIES.md) · [فارسی](../fa/BINARIES.md) · [Français](../fr/BINARIES.md) · [हिन्दी](../hi/BINARIES.md) · [Bahasa Indonesia](../in/BINARIES.md) · [Italiano](../it/BINARIES.md) · [日本語](../ja/BINARIES.md) · [한국어](../ko/BINARIES.md) · [Nederlands](../nl/BINARIES.md) · [Polski](../pl/BINARIES.md) · [Português](../pt/BINARIES.md) · [Русский](../ru/BINARIES.md) · [Svenska](../sv/BINARIES.md) · [ไทย](../th/BINARIES.md) · [Türkçe](../tr/BINARIES.md) · [Tiếng Việt](../vi/BINARIES.md) · 中文

---

# 捆绑的二进制文件：来历与审计

在 VDBackup 中，隐私和安全并非可选项。备份工具以 root 身份处理你最私密的数据，因此你必须能够
确切地看到其中捆绑了什么。本页记录了模块携带的每个预构建二进制文件和库、各自的来源，以及如何
验证没有任何不透明的东西被偷偷塞进来。

## 原则

- **没有不透明的东西。** 每个随附的二进制文件和库都可追溯到一个指定的、公开的上游，固定在某个
   版本，并记录了 SHA-256。没有任何二进制块在没有可供你核查的条目的情况下被捆绑。
- **从上游获取，绝不从设备获取。** 原生工具来自官方 Termux 软件包仓库（`packages.termux.dev/apt`
  上经过签名的 `.deb` 文件），绝不从某部手机上安装的 Termux 复制而来。构建会明确地失败，绝不临时
  凑合。
- **可复现。** 重新运行构建会得到相同的文件；重新获取固定的源会使 SHA-256 值匹配。
- **审计记录随模块一同发布。** 它不仅存在于网站上，还随安装的模块一起，位于你的设备上，因此你
  可以离线审计。

## 捆绑了什么，来自何处

| 产物 | 来源 | 如何构建 |
|---|---|---|
| `bin/<abi>/` 原生工具（`tar`、`zstd`、`gzip`、`lz4`、`jq`、`rclone`、`restic`、`rsync`、`ssh`/`scp`/`sftp`、`age`、`age-keygen`、`script`、`sqlite3`）及其 `lib/` 依赖闭包 | 官方 **Termux** apt 仓库（`packages.termux.dev/apt`），官方 `.deb` 软件包 | `.github/scripts/build_bin.sh` 下载 `.deb` 文件及其传递依赖，解包，并只复制二进制文件以及每个文件所需的共享库 |
| `bin/<abi>/abx2xml`、`bin/<abi>/xml2abx`（ABX 转换器回退） | **rhythmcache/android-xml-converter** GitHub 发行版（`ABX_RELEASE`，静态 ELF） | 由 `build_bin.sh` 从固定的发行版下载 |
| `companion.apk`（可选的 Google Drive 伴生程序） | **本仓库**，`companion/`（Gradle/Kotlin） | 由 CI 从源代码构建并用项目密钥签名；不是预构建的二进制块 |
| `vdbackup_helper.dex`（框架辅助程序） | **本仓库**，`dex/src/`（Java） | 由 CI 使用 `javac` + `d8` 从源代码编译 |

只有前两行是预构建的第三方二进制文件；后两者是从本仓库内的源代码构建的，可供阅读和重新构建。

> **Full 版与 lite 版。** lite 版为保持小巧，仅省略 `rclone` 和 `restic`（两个最大的二进制文件），
> 并在你首次使用云端目标或快照模式时按需获取它们（通过 SHA-256 校验）；`rsync` 和 `ssh`/`scp`/`sftp`
> 仍然包含在内，上面列出的其他所有二进制文件也都存在。Full 版内置 `rclone`（云服务提供商）和 `restic`（快照），因此永不下载任何内容。

## 设备上的清单：`PROVENANCE.json`

`build_bin.sh` 为每个 ABI 写出一个 `bin/<abi>/PROVENANCE.json`。安装时模块只保留你设备的 ABI，
因此该文件会留在设备上的 `/data/adb/modules/vdbackup/bin/<abi>/PROVENANCE.json`。它记录：

- `sources`：每个上游 `.deb`（软件包、版本、完整 URL、`.deb` 的 SHA-256）以及 ABX 发行版
   （URL、归档的 SHA-256）。
- `files`：`bin/<abi>/` 下实际随附的每个文件（路径、大小、SHA-256）。

你可以在 WebUI（**About** 选项卡链接到它）中或通过代理 API 读取它：

```sh
sh /data/adb/modules/vdbackup/helper.sh provenance '' | jq .
```

## 如何验证（逐步）

1. **检查随附的文件。** 对设备上 `bin/<abi>/` 下的每个文件进行哈希，并与 `PROVENANCE.json` 中的
   `files[].sha256` 比较：
   ```sh
   cd /data/adb/modules/vdbackup/bin/<abi>
   sha256sum tar zstd jq rclone ... lib/*
   ```
2. **将文件与上游核对。** 对每个 `sources[]` 条目，从其 URL 下载固定的 `.deb`，确认其 SHA-256 与
   `deb_sha256` 匹配，解包，并确认其中包含的二进制文件/库哈希为与随附相同的值。Termux 仓库中的
   `.deb` 文件本身由 Termux 经过签名的 apt 仓库提供。
3. **从零重新构建。** 自己运行 `.github/scripts/build_bin.sh`（只需 `curl`、`ar`、`tar`、`xz`、
   `zstd`、`readelf`），并将输出与随附的内容比较。
4. **伴生程序与 dex。** 从源代码重新构建 `companion/` 和 `dex/`；伴生程序的签名是项目密钥
   （SHA-256
   `F3:F8:2B:B9:2F:2C:69:A1:75:90:1D:40:BD:65:DD:A6:8F:2B:B5:88:69:77:F5:EA:8B:BA:AA:51:40:E5:25:2B`）。

## 报告

如果任何随附的文件与其记录的来源不匹配，请将其视为安全问题并报告（见 [SECURITY.md](SECURITY.md)）。
这正是此清单存在的目的所要暴露的那类差异。

*本文档由 Claude (Anthropic) 生成，并由 VD171 维护。欢迎提出修正与改进 - 参见 [CONTRIBUTING.md](CONTRIBUTING.md)。*
