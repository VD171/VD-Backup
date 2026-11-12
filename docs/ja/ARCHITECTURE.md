> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · 日本語 · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# アーキテクチャ

VDBackup は root WebUI モジュールです。3 つの層で構成されています: **WebUI**(目に見える部分)、
**shell バックエンド**(root として実際の処理を行う部分)、そして **同梱バイナリ**
(アーカイバとトランスポート)。すべてが既に root として動作するため、
権限プロンプトはなく、コア機能にコンパニオンアプリも不要です。

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

- **既に root。** モジュールのプロセスは root なので、エンジンは素の shell です。処理の約 85% は
  純粋な shell です(`tar`/`zstd`/`age`/`pm`/`am`/`chown`/`chcon`/`rclone`/...)。
- **デタッチ実行。** バックアップ/リストアは `setsid nohup` 経由で、独立した root プロセスとして
  実行されます。WebUI を閉じてもそれらは中断されません。UI は
  `logs/progress-<opid>.json` を読むことで再アタッチします。
- **Framework helper(約 15%)。** きめ細かな権限、AppOps、SSAID、StorageStats、
  アイコン、特権 Wi-Fi には Android framework が必要です。`app_process` 経由で実行される
  小さな `dex`(インストール済みアプリなし)がこれらを処理し、shell フォールバックを備えています。
- **ポータビリティ。** 標準フォーマットのみ。バックアップはこのモジュールなしで PC 上でも開けます。
- **State** は `/data/adb/vdbackup/` に置かれます(config、jobs、destinations、暗号化された
  認証情報、logs、staging)。**バックアップ** はユーザーから見える、認証情報で暗号化された
  ストレージ `/sdcard/VDBackup/`(`/data/media/<user>/VDBackup`、ユーザーごと)に書き込まれ、
  `/data/adb`(デバイス暗号化で初回アンロック前に読み取り可能)には書き込まれません。

## 互換性の保証

バックアップは永久にリストア可能であり続けなければなりません。これはベストエフォートではなく、厳格なルールです。

**範囲。** この保証は **v1.01 以降** (最初に正式に公開されたリリース) に書き込まれたバックアップを、
かつ正式に公開・リリースされたバージョンによるもののみを対象とします。v1.00 はテスト専用のビルドで
あり、明示的に範囲外です。プレリリースおよび開発ビルドは対象外です。最初の公開リリース以降、
以下の約束は絶対です:

- **標準フォーマットのみ。** すべてのアーカイブは `zstd`、`gzip` または `lz4` で圧縮された素の
  `tar` であり、任意で `age` でラップされます。独自コンテナは存在しないため、
  バックアップはこのモジュールがなくても、一般的なツールでどの PC でも開けます(
  `etc/RECOVERY.md` を参照)。手放すことのできないフォーマットです。
- **追記のみのメタデータ。** `manifest.json` は `format_version` を保持します。スキーマは
  増える一方です: フィールドは *追加* されることはあっても、削除・改名・用途変更されることは決してありません。リストアは
  すべてのフィールドを防御的に読み取り(欠落した任意フィールドはデフォルトにフォールバック)、
  固定された manifest の形を仮定するのではなく、ファイル名と拡張子によって APK を
  インストールしアーカイブを展開します。
- **前方互換のリストア。** リストアは古いという理由でバックアップを拒否することは決してなく、
  古い VDBackup は知らないアイテムタイプを失敗させるのではなく黙ってスキップします。したがって新しい
  VDBackup はどの古いバックアップでもリストアでき、標準フォーマットのアーカイブはいずれにせよ
  手動でリストア可能なままです。

要するに: VDBackup がこれまでに書き込んだものは何であれ、将来のあらゆる VDBackup(そして素の PC)
が今なおリストアできます。以前のバックアップを壊すようなフォーマット変更は許可
されません。新機能は `format_version` と新しい追加フィールドの背後に加えられます。

完全な技術設計(アーカイブフォーマット、メタデータスキーマ、パイプライン、暗号、
destinations、importers)については、メンテナが詳細な設計ノートを保持しています。このファイルは
コントリビューター向けの概要です。

<!-- doc-footer -->

---

> _このドキュメントは Claude (Anthropic) で生成され、VD171 によって保守されています。修正や改善を歓迎します。[CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。_
