> **Languages:** [English](../../module/etc/RECOVERY.md) · [العربية](../ar/RECOVERY.md) · [Čeština](../cs/RECOVERY.md) · [Deutsch](../de/RECOVERY.md) · [Español](../es/RECOVERY.md) · [فارسی](../fa/RECOVERY.md) · [Français](../fr/RECOVERY.md) · [हिन्दी](../hi/RECOVERY.md) · [Bahasa Indonesia](../id/RECOVERY.md) · [Italiano](../it/RECOVERY.md) · 日本語 · [한국어](../ko/RECOVERY.md) · [Nederlands](../nl/RECOVERY.md) · [Polski](../pl/RECOVERY.md) · [Português](../pt/RECOVERY.md) · [Русский](../ru/RECOVERY.md) · [Svenska](../sv/RECOVERY.md) · [ไทย](../th/RECOVERY.md) · [Türkçe](../tr/RECOVERY.md) · [Українська](../uk/RECOVERY.md) · [Tiếng Việt](../vi/RECOVERY.md) · [中文](../zh/RECOVERY.md)

---

# VDBackup, PC でバックアップを復元する（Windows / macOS / Linux）

VDBackup のバックアップは **標準フォーマット** を使うため、このモジュールなしで
どこでも開けます。バックアップのフォルダには、`manifest.json`、APK
（`*.apk.zst`）、データアーカイブ（`<item>.tar.zst`、`.tar.gz`、`.tar.lz4`）が含まれ、
末尾に `.age` が付いて暗号化されている場合があります。

**データが暗号化されている場合**、メタデータも暗号化されるため、ファイルだけを持つ人には何も漏れません。
そのときフォルダには `manifest.full.age`（完全なマニフェスト）と、2 つの小さな `stub.*.age` ファイルも
含まれます。その場合、`manifest.json` は機微でない小さなマーカーにすぎず、本当の詳細は
`manifest.full.age` にあります。ポータブルなもの（データアーカイブと `manifest.full.age`）はすべて、
あなたの **パスフレーズ** だけで復号できます - ステップ 1 を参照してください。`stub.dev.age` /
`stub.pass.age` ファイルは、モジュールのオンデバイスの一覧キャッシュにすぎません。PC では無視して
構いません。

## 必要になるかもしれないツール

- **zstd**: https://github.com/facebook/zstd/releases  (macOS: `brew install zstd`, Linux: `apt install zstd`)
- **age**（`.age` ファイルの場合のみ）: https://github.com/FiloSottile/age/releases
- `tar` は macOS、Linux、最新の Windows 10/11 に組み込まれています。
- `gzip` はどこにでも組み込まれています。`.tar.gz` には追加で何も要りません。

## 1. 復号（ファイルが `.age` で終わる場合のみ）

パスフレーズ（ポータブルな方法 - パスフレーズだけでどの PC でも動作します）：

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

各 `*.age` ファイル（APK とデータアーカイブ）について同じことを行います。バックアップが暗号化されて
いる場合、完全なマニフェストを読むには、同じ方法で `manifest.full.age` を復号します：

```
age -d -o manifest.json  manifest.full.age    # the full, readable manifest
```

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
  所有者/コンテキストを記述します。これが真実の源です。暗号化されたバックアップでは、完全な
  マニフェストは `manifest.full.age` です（ステップ 1 のように復号します）。平文の `manifest.json`
  は小さなマーカーにすぎず、機微なデータは含みません。
- ここにあるものはどれも特定のデバイスに結び付けられていません。同じパスフレーズがどのマシンでも
  機能します。

<!-- doc-footer -->

---

> _このドキュメントは Claude (Anthropic) で生成され、VD171 によって保守されています。修正や改善を歓迎します。[CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。_
