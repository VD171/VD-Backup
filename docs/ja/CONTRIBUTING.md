> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · 日本語 · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# VDBackup へのコントリビュート

ご協力ありがとうございます！ VDBackup は貢献しやすいことを目指しています。このガイドでは、
各要素がどこにあるか、そして私たちが従っている数少ない慣習を説明します。

## プロジェクトの概要

VDBackup は **KernelSU/APatch/Magisk WebUI モジュール** です。シェルスクリプト + バニラ JS の
WebUI + ABI ごとの静的バイナリで構成されます。コア機能にアプリは不要です。
[ARCHITECTURE.md](ARCHITECTURE.md) と [docs/FILE-STRUCTURE.md](FILE-STRUCTURE.md) を参照してください。

これは、オープンでルートネイティブな **Swift Backup、Neo-Backup、Android-DataBackup の後継** です。
それらの機能を AGPLv3 のもとに統合し、既存の Neo-Backup および Android-DataBackup バックアップの
インポートに対応することで、移行を可能にします。

## AI コントリビューター歓迎

AI アシスタントやエージェントは、ここでは後付けではなく一級のコントリビューターです。

- このプロジェクトは機械可読であるように作られています。すべての `helper.sh` の verb は単一の
  JSON オブジェクトを出力し、エンジンは素の POSIX シェルで、ファイル配置は
  [docs/FILE-STRUCTURE.md](FILE-STRUCTURE.md) に文書化されています。
- エージェントは、その JSON API を通じてモジュールの **すべて** のコンテンツとアクションを
  ヘッドレスで管理できます。完全な制御面、verb、安全ガードは
  [docs/AI-AGENTS.md](AI-AGENTS.md) にあります。
- AI 支援によるパッチは、他のあらゆるパッチと同じ基準でレビュー・受理されます。すなわち、
  誰が（あるいは何が）書いたかではなく、正確さ、明快さ、そして以下の慣習によって判断されます。
- エージェントから VDBackup を操作する場合は、`helper.sh` の JSON 出力を
  契約として使用してください。WebUI をスクレイピングしないでください。
- 全員に同じ基準です。実際の機能が弱められることは決してなく、シークレットやデバイスデータが
  リポジトリに入ることは決してなく（厳格な [.gitignore](.gitignore) を参照）、変更を伴う
  アクションは確認と監査を伴い続けます。

## 開発環境のセットアップ

- テストにはルート化されたデバイス/エミュレータ（KernelSU、APatch、Magisk）が必要です。
- フラッシュ可能な zip をビルド：`cd module && zip -r9 ../VD-Backup-dev.zip .` してからフラッシュします。
- WebUI は `module/webroot/`（ルートマネージャから開きます）です。バックエンドは
  `module/helper.sh`（ディスパッチャ）と `module/worker.sh`（デタッチエンジン）です。
- ネイティブバイナリは `module/bin/<abi>/` にあり、CI
  （`.github/scripts/build_bin.sh`）によって生成されます。通常は手動で再ビルドしません。

## 慣習

- **すべてのソースファイル**（`.sh`、`.js`、`.css`、`.html`、`.svg`、`.yml`）は、
  プロジェクトのバナーヘッダ（既存のファイルからコピー）で始まります。例外はありません。
- **コードとコメントは英語で。** コメントは最小限に、必要な箇所だけにします。
- **em-dash も en-dash も使わない**。常に素のハイフン `-` を使います。
- WebUI は **バニラ JS**（単一の `scripts.js`）です。フレームワークなし。ルートとの通信は
  `helper(verb, args)` ラッパーのみを通じて行い、補間するすべての値をエスケープします。
- 実際の機能（SELinux/uid/gid/モードの保持など）を **決して弱めない** でください。
- 変更を伴うアクション（リストア、削除）は確認を求め、監査ログを書き込む必要があります。

## 国際化（i18n）

- UI 文字列は `module/webroot/lang/` にあります。英語が正式なフォールバックです
  （`en.js` + `en.json`）。他の 20 言語は `<code>.json` です。
- 文字列を追加・変更するには：`en.js` **と** `en.json` を編集し、その後すべての
  `<code>.json` を更新します。表示ラベルに手を入れることは、**すべての** 言語ファイルと
  **すべての** `README.<code>.md` を更新することを意味します。
- 翻訳は素の JSON です。初めての貢献に最適です。言語一覧は
  `module/webroot/i18n.js` を参照してください。

## コミットと PR

- PR は焦点を絞ってください。何を、なぜ変更したかを記述します。
- コミットをサインオフ（DCO）：`git commit -s`（`Signed-off-by:` を追加します）。
- CI はグリーンを保つ必要があります。レビューでは親切に。[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) を参照してください。

## 初心者向けの課題（Good first issues）

`good first issue` と `help wanted` のラベルを探してください。翻訳、ドキュメント、新しい
`rclone` 宛先プリセット、WebUI の仕上げは、どれも素晴らしい出発点です。
