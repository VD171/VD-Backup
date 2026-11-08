> **Languages:** [English](../BINARIES.md) · [العربية](../ar/BINARIES.md) · [Čeština](../cs/BINARIES.md) · [Deutsch](../de/BINARIES.md) · [Español](../es/BINARIES.md) · [فارسی](../fa/BINARIES.md) · [Français](../fr/BINARIES.md) · [हिन्दी](../hi/BINARIES.md) · [Bahasa Indonesia](../in/BINARIES.md) · [Italiano](../it/BINARIES.md) · 日本語 · [한국어](../ko/BINARIES.md) · [Nederlands](../nl/BINARIES.md) · [Polski](../pl/BINARIES.md) · [Português](../pt/BINARIES.md) · [Русский](../ru/BINARIES.md) · [Svenska](../sv/BINARIES.md) · [ไทย](../th/BINARIES.md) · [Türkçe](../tr/BINARIES.md) · [Tiếng Việt](../vi/BINARIES.md) · [中文](../zh/BINARIES.md)

---

# 同梱バイナリ: 来歴と監査

VDBackup において、プライバシーとセキュリティは任意ではありません。バックアップツールは
あなたの最も個人的なデータに対して root で動作するため、その内部に何が同梱されているかを
正確に確認できなければなりません。このページでは、モジュールが持つすべてのビルド済み
バイナリとライブラリ、それぞれの入手元、そして不透明なものが紛れ込んでいないことを
検証する方法を文書化します。

## 原則

- **不透明なものはない。** 同梱されるすべてのバイナリとライブラリは、固定されたバージョンの
  名前付きの公開アップストリームまで辿ることができ、SHA-256 が記録されています。確認できる
  エントリなしに同梱されるブロブはありません。
- **アップストリームから取得し、デバイスからは決して取得しない。** ネイティブツールは公式の
  Termux パッケージリポジトリ (`packages.termux.dev/apt` にある署名済みの `.deb` ファイル) から
  取得され、どこかのスマートフォンにインストールされた Termux からコピーされることはありません。
  ビルドは明確に失敗し、場当たり的な処理は決して行いません。
- **再現可能。** ビルドを再実行すれば同じファイルが得られ、固定されたソースを再取得すれば
  SHA-256 の値が一致します。
- **監査証跡はモジュールと共に同梱される。** これはウェブサイト上にあるだけではなく、
  インストールされたモジュールの内部、つまりあなたのデバイス上に存在するため、オフラインでも
  監査できます。

## 何が同梱され、どこから来るのか

| 成果物 | 入手元 | ビルド方法 |
|---|---|---|
| `bin/<abi>/` のネイティブツール (`tar`, `zstd`, `gzip`, `lz4`, `jq`, `rclone`, `restic`, `rsync`, `ssh`/`scp`/`sftp`, `age`, `age-keygen`, `script`, `sqlite3`) とその `lib/` 依存閉包 | 公式の **Termux** apt リポジトリ (`packages.termux.dev/apt`)、公式の `.deb` パッケージ | `.github/scripts/build_bin.sh` が `.deb` ファイルとその推移的依存関係をダウンロードして展開し、バイナリと各自が必要とする共有ライブラリのみをコピーします |
| `bin/<abi>/abx2xml`, `bin/<abi>/xml2abx` (ABX コンバーターのフォールバック) | **rhythmcache/android-xml-converter** の GitHub リリース (`ABX_RELEASE`、静的 ELF) | `build_bin.sh` が固定されたリリースからダウンロードします |
| `companion.apk` (任意の Google Drive コンパニオン) | **このリポジトリ**、`companion/` (Gradle/Kotlin) | CI によってソースからビルドされ、プロジェクトキー (`VD_Key`) で署名されます。ビルド済みブロブではありません |
| `vdbackup_helper.dex` (フレームワークヘルパー) | **このリポジトリ**、`dex/src/` (Java) | CI によって `javac` + `d8` でソースからコンパイルされます |

ビルド済みのサードパーティバイナリは最初の 2 行だけです。残りの 2 つはこのリポジトリ内にある
ソースからビルドされ、読むことも再ビルドすることもできます。

> **Full エディションと lite エディション。** lite エディションはサイズを小さく保つために `rclone` と `restic`（最大の2つのバイナリ）のみを省き、クラウドの保存先やスナップショットモードを初めて使うときにそれらをオンデマンドで（SHA-256 で検証して）取得します。`rsync` と `ssh`/`scp`/`sftp` は引き続き含まれ、上記に挙げたその他のバイナリもすべて含まれます。Full エディションは `rclone`（クラウドプロバイダー）と `restic`（スナップショット）を埋め込んで提供するため、何もダウンロードされません。

## デバイス上のマニフェスト: `PROVENANCE.json`

`build_bin.sh` は ABI ごとに 1 つの `bin/<abi>/PROVENANCE.json` を書き出します。インストール時に
モジュールはあなたのデバイスの ABI だけを残すため、そのファイルはデバイス上の
`/data/adb/modules/vdbackup/bin/<abi>/PROVENANCE.json` に残ります。これは以下を記録します:

- `sources`: すべてのアップストリームの `.deb` (パッケージ、バージョン、完全な URL、`.deb` の SHA-256) と
  ABX リリース (URL、アーカイブの SHA-256)。
- `files`: `bin/<abi>/` の下に実際に同梱されたすべてのファイル (パス、サイズ、SHA-256)。

これは WebUI (**About** タブからリンクされています) またはエージェント API 経由で読むことができます:

```sh
sh /data/adb/modules/vdbackup/helper.sh provenance '' | jq .
```

## 検証方法 (手順)

1. **同梱ファイルを確認する。** デバイス上の `bin/<abi>/` の下の各ファイルをハッシュし、
   `PROVENANCE.json` の `files[].sha256` と比較します:
   ```sh
   cd /data/adb/modules/vdbackup/bin/<abi>
   sha256sum tar zstd jq rclone ... lib/*
   ```
2. **ファイルをアップストリームと照合する。** 各 `sources[]` エントリについて、その URL から
   固定された `.deb` をダウンロードし、その SHA-256 が `deb_sha256` と一致することを確認し、展開して、
   含まれるバイナリ/ライブラリが同梱されたものと同じ値にハッシュされることを確認します。Termux
   リポジトリの `.deb` ファイル自体は、Termux の署名済み apt リポジトリから配信されます。
3. **ゼロから再ビルドする。** `.github/scripts/build_bin.sh` を自分で実行し (必要なのは
   `curl`, `ar`, `tar`, `xz`, `zstd`, `readelf` だけ)、出力を同梱されたものと比較します。
4. **コンパニオンと dex。** `companion/` と `dex/` をソースから再ビルドします。コンパニオンの
   署名はプロジェクトキー `VD_Key` (SHA-256
   `F3:F8:2B:B9:2F:2C:69:A1:75:90:1D:40:BD:65:DD:A6:8F:2B:B5:88:69:77:F5:EA:8B:BA:AA:51:40:E5:25:2B`) です。

## 報告

同梱されたファイルが記録された入手元と一致しない場合は、セキュリティ問題として扱い、
報告してください ([SECURITY.md](SECURITY.md) を参照)。これはまさに、このマニフェストが
可視化するために存在する種類の不一致です。

*このドキュメントは Claude (Anthropic) で生成され、VD171 が保守しています。訂正や改善を歓迎します - [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。*
