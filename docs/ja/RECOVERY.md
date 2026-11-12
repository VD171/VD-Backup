> **Languages:** [English](../../module/etc/RECOVERY.md) · [العربية](../ar/RECOVERY.md) · [Čeština](../cs/RECOVERY.md) · [Deutsch](../de/RECOVERY.md) · [Español](../es/RECOVERY.md) · [فارسی](../fa/RECOVERY.md) · [Français](../fr/RECOVERY.md) · [हिन्दी](../hi/RECOVERY.md) · [Bahasa Indonesia](../in/RECOVERY.md) · [Italiano](../it/RECOVERY.md) · 日本語 · [한국어](../ko/RECOVERY.md) · [Nederlands](../nl/RECOVERY.md) · [Polski](../pl/RECOVERY.md) · [Português](../pt/RECOVERY.md) · [Русский](../ru/RECOVERY.md) · [Svenska](../sv/RECOVERY.md) · [ไทย](../th/RECOVERY.md) · [Türkçe](../tr/RECOVERY.md) · [Tiếng Việt](../vi/RECOVERY.md) · [中文](../zh/RECOVERY.md)

---

# VDBackup, PC でバックアップを復元する（Windows / macOS / Linux）

VDBackup のバックアップは **標準フォーマット** を使うため、このモジュールなしで
どこでも開けます。バックアップのフォルダには、`manifest.json`、APK
（`*.apk.zst`）、データアーカイブ（`<item>.tar.zst`、`.tar.gz`、`.tar.lz4`）が含まれ、
末尾に `.age` が付いて暗号化されている場合があります。

## 必要になるかもしれないツール

- **zstd**: https://github.com/facebook/zstd/releases  (macOS: `brew install zstd`; Linux: `apt install zstd`)
- **age**（`.age` ファイルの場合のみ）: https://github.com/FiloSottile/age/releases
- `tar` は macOS、Linux、最新の Windows 10/11 に組み込まれています。
- `gzip` はどこにでも組み込まれています。`.tar.gz` には追加で何も要りません。

## 1. 復号（ファイルが `.age` で終わる場合のみ）

キーファイル（推奨）：

```
age -d -i age.key -o data.tar.zst  data.tar.zst.age
```

パスフレーズ：

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

各 `*.age` ファイル（APK とデータアーカイブ）について同じことを行います。

## 2. 伸長 + 展開

`.tar.zst`:

```
zstd -d data.tar.zst            # -> data.tar
tar  -xf data.tar               # extracts the files
```

`.tar.gz`:

```
tar -xzf data.tar.gz
```

`.tar.lz4`（zstd が lz4 を読みます）：

```
zstd -d --format=lz4 data.tar.lz4 -o data.tar
tar  -xf data.tar
```

APK は単に zstd で圧縮された APK（ZIP）ファイルです：

```
zstd -d base.apk.zst            # -> base.apk  (a normal installable APK)
```

## 注記

- 展開されたファイルは相対パスを保ちます。SELinux コンテキスト、uid/gid、モードは
  tar の中にあります（そして、Android でリストアしたときにのみ適切に再適用されます）。
- `manifest.json` は、各ファイルが正確に何であるか、アプリのバージョン、元の
  所有者/コンテキストを記述します。これが真実の源です。
- ここにあるものはどれも特定のデバイスに結び付けられていません。同じ
  パスフレーズ/キーファイルがどのマシンでも機能します。

<!-- doc-footer -->

---

> _このドキュメントは Claude (Anthropic) で生成され、VD171 によって保守されています。修正や改善を歓迎します。[CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。_
