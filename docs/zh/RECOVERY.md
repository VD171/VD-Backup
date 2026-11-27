> **Languages:** [English](../../module/etc/RECOVERY.md) · [العربية](../ar/RECOVERY.md) · [Čeština](../cs/RECOVERY.md) · [Deutsch](../de/RECOVERY.md) · [Español](../es/RECOVERY.md) · [فارسی](../fa/RECOVERY.md) · [Français](../fr/RECOVERY.md) · [हिन्दी](../hi/RECOVERY.md) · [Bahasa Indonesia](../id/RECOVERY.md) · [Italiano](../it/RECOVERY.md) · [日本語](../ja/RECOVERY.md) · [한국어](../ko/RECOVERY.md) · [Nederlands](../nl/RECOVERY.md) · [Polski](../pl/RECOVERY.md) · [Português](../pt/RECOVERY.md) · [Русский](../ru/RECOVERY.md) · [Svenska](../sv/RECOVERY.md) · [ไทย](../th/RECOVERY.md) · [Türkçe](../tr/RECOVERY.md) · [Українська](../uk/RECOVERY.md) · [Tiếng Việt](../vi/RECOVERY.md) · 中文

---

# VDBackup, 在 PC 上恢复备份（Windows / macOS / Linux）

你的 VDBackup 备份使用**标准格式**，因此你可以在任何地方打开它们，
无需此模块。一个备份文件夹包含一个 `manifest.json`、APK
（`*.apk.zst`）和数据归档（`<item>.tar.zst`、`.tar.gz` 或 `.tar.lz4`），
可选地加密并带一个结尾的 `.age`。

**如果数据已加密**，元数据也会被加密，因此其中任何内容都不会泄露给只拥有这些文件的人。此时文件夹还包含
`manifest.full.age`（完整的 manifest）和两个小的 `stub.*.age` 文件。在这种情况下 `manifest.json`
只是一个微小的非敏感标记；真正的细节在 `manifest.full.age` 中。所有可移植的内容（数据归档和
`manifest.full.age`）仅凭你的**口令**即可解密 - 见步骤 1。`stub.dev.age` / `stub.pass.age` 文件只是
模块在设备上的列表缓存；在 PC 上你可以忽略它们。

## 你可能需要的工具

- **zstd**: https://github.com/facebook/zstd/releases  (macOS: `brew install zstd`, Linux: `apt install zstd`)
- **age** （仅用于 `.age` 文件）: https://github.com/FiloSottile/age/releases
- `tar` 内置于 macOS、Linux 和现代的 Windows 10/11。
- `gzip` 到处都内置；对于 `.tar.gz` 你不需要任何额外东西。

## 1. 解密（仅当文件以 `.age` 结尾时）

口令（可移植的方式 - 在任何 PC 上仅凭你的口令即可使用）：

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

对每个 `*.age` 文件（APK 和数据归档）执行相同操作。如果备份已加密，以相同方式解密
`manifest.full.age` 以读取完整的 manifest：

```
age -d -o manifest.json  manifest.full.age    # the full, readable manifest
```

## 2. 解压 + 提取

`.tar.zst`:

```
zstd -d data.tar.zst            # -> data.tar
tar  -xf data.tar               # extracts the files
```

`.tar.gz`:

```
tar -xzf data.tar.gz
```

`.tar.lz4` （zstd 可读取 lz4）：

```
zstd -d --format=lz4 data.tar.lz4 -o data.tar
tar  -xf data.tar
```

APK 只是 zstd 压缩的 APK（ZIP）文件：

```
zstd -d base.apk.zst            # -> base.apk  (a normal installable APK)
```

## 说明

- 提取的文件保持它们的相对路径；SELinux 上下文、uid/gid 和模式
  在 tar 内部（并且只有在你于 Android 上恢复时才会被正确重新应用）。
- `manifest.json` 精确描述每个文件是什么、应用版本以及
  原始归属者/上下文。它是事实来源。对于加密备份，完整的 manifest 是 `manifest.full.age`（按步骤 1
  解密它）；明文 `manifest.json` 只是一个小标记，不携带任何敏感数据。
- 这里没有任何东西与特定设备绑定：同样的口令在任何
  机器上都有效。

<!-- doc-footer -->

---

> _本文档由 Claude (Anthropic) 生成，并由 VD171 维护。欢迎修正和改进；请参阅 [CONTRIBUTING.md](CONTRIBUTING.md)。_
