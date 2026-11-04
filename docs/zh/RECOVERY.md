> **Languages:** [English](../../module/etc/RECOVERY.md) · [العربية](../ar/RECOVERY.md) · [Čeština](../cs/RECOVERY.md) · [Deutsch](../de/RECOVERY.md) · [Español](../es/RECOVERY.md) · [فارسی](../fa/RECOVERY.md) · [Français](../fr/RECOVERY.md) · [हिन्दी](../hi/RECOVERY.md) · [Bahasa Indonesia](../in/RECOVERY.md) · [Italiano](../it/RECOVERY.md) · [日本語](../ja/RECOVERY.md) · [한국어](../ko/RECOVERY.md) · [Nederlands](../nl/RECOVERY.md) · [Polski](../pl/RECOVERY.md) · [Português](../pt/RECOVERY.md) · [Русский](../ru/RECOVERY.md) · [Svenska](../sv/RECOVERY.md) · [ไทย](../th/RECOVERY.md) · [Türkçe](../tr/RECOVERY.md) · [Tiếng Việt](../vi/RECOVERY.md) · 中文

---

# VDBackup - 在 PC 上恢复备份（Windows / macOS / Linux）

你的 VDBackup 备份使用**标准格式**，因此你可以在任何地方打开它们，
无需此模块。一个备份文件夹包含一个 `manifest.json`、APK
（`*.apk.zst`）和数据归档（`<item>.tar.zst`、`.tar.gz` 或 `.tar.lz4`），
可选地加密并带一个结尾的 `.age`。

## 你可能需要的工具

- **zstd**: https://github.com/facebook/zstd/releases  (macOS: `brew install zstd`; Linux: `apt install zstd`)
- **age** （仅用于 `.age` 文件）: https://github.com/FiloSottile/age/releases
- `tar` 内置于 macOS、Linux 和现代的 Windows 10/11。
- `gzip` 到处都内置；对于 `.tar.gz` 你不需要任何额外东西。

## 1. 解密（仅当文件以 `.age` 结尾时）

密钥文件（推荐）：

```
age -d -i age.key -o data.tar.zst  data.tar.zst.age
```

口令：

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

对每个 `*.age` 文件（APK 和数据归档）执行相同操作。

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
  原始归属者/上下文。它是事实来源。
- 这里没有任何东西与特定设备绑定：同样的口令/密钥文件在任何
  机器上都有效。
