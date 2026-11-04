> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../in/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · 日本語 · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# AI エージェントから VDBackup を操作する

VDBackup は、AI アシスタントやエージェントが、人が WebUI を通じて行うのと同じように、モジュールの
**すべて** のコンテンツと操作を headless で管理できるように作られています。WebUI は小さな JSON API
のクライアントの 1 つにすぎず、あなたのエージェントはもう 1 つのクライアントです。API を使ってください。
WebUI をスクレイピングしないでください。

## 契約 (contract)

すべては 1 つのエントリポイントを通り、デバイス上で root として実行されます:

```
sh /data/adb/modules/vdbackup/scripts/helper.sh <verb> <base64(JSON-args)>
```

- 引数は 1 つの JSON オブジェクトで、**base64 エンコード** され、1 つの argv トークンとして渡されます。
- コマンドは stdout に **1 つの JSON オブジェクト** を出力します: `{"ok":true,...}` または
  `{"ok":false,"code":"ERR_...","message":"..."}` それを parse してください。決してテキストを
  スクレイピングしないでください。
- 長時間の操作 (`backup`, `restore`, `import`) はただちに `{"ok":true,"opid":"..."}` を返し、
  **detached (切り離し)** で実行されます (呼び出し元/WebUI が消えても生き残ります)。その進捗を
  poll してください。呼び出しが返った時点では完了していません。
- `progress` と `cancel` は JSON オブジェクトではなく、**生の opid 文字列の base64** を受け取ります。

シェル用の小さなヘルパー:

```sh
b64() { printf '%s' "$1" | base64 -w0; }
H=/data/adb/modules/vdbackup/scripts/helper.sh
sh "$H" backup "$(b64 '{"package":"com.example.app","mode":"full"}')"
```

ワークステーションから操作するには、そのコマンドを普段使っている root チャネル経由でデバイスに
対して実行してください (root としての adb shell、または SSH-to-root の構成)。モジュールには
バイナリが同梱されているため、いったんインストールすればローカルの backup/restore に
**インターネットは不要** です。ネットワークと通信するのはクラウドの宛先 (`rclone`/`restic`/ssh)
だけです。

## Verbs

| Verb | Args (JSON) | Returns |
|------|-------------|---------|
| `ping` | `{}` | `{ok,version,abi}` |
| `config-get` | `{}` | `{ok,config}` |
| `config-set` | config オブジェクト (または `{key,value}`) | `{ok}` |
| `keygen` | `{}` | 暗号化用の `age` 鍵ペアを生成する |
| `list-apps` | `{user?}` | `{ok,apps:[{package,label,system,versionCode}]}` (dex, shell fallback) |
| `label` | `{package,user?}` | `{ok,label}` (実際にローカライズされたアプリ名、コンテキスト非依存) |
| `icon` | `{package,user?,vc?}` | `{ok,package,icon}` (base64 PNG; package+`vc` 単位でキャッシュ) |
| `backup` | 下記参照 | `{ok,opid}` (detached) |
| `restore` | 下記参照 | `{ok,opid}` (detached) |
| `import` | `{from,ref,password,ssaid,user}` | `{ok,opid}` (detached) |
| `import-scan` | `{from,path}` | `{ok,backups:[...]}` |
| `progress` | base64(opid) | ライブの `progress-<opid>.json` |
| `cancel` | base64(opid) | `{ok,cancelled}` |
| `list-ops` | `{}` | `{ok,ops:[...]}` (再接続後に再アタッチ) |
| `list-apps`/`icons` | `{user?}` / `{user?,items:[{package,vc}]}` | アプリ一覧 / バッチの base64 アイコン |
| `list-backups` | `{package?}` | `{ok,backups:[{ref,package,label,versionName,versionCode,created_at,mode,items}]}` |
| `backup-info` | `{ref}` | `{ok,...}` 1 つの backup の全詳細 (バージョン, インストール元, 状態, 日付, mode, サイズ, items, 権限数, デバイス) |
| `backup-icon` | `{ref}` | `{ok,icon}` manifest からの base64 PNG (アプリがアンインストールされていても動作) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref は backups ディレクトリ配下でなければならない) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` パッケージの最新 N 個を保持 |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` 監査ログ、新しい順 |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` システム全体の backup (detached) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (リブート必須; `confirm` がゲートする) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | インストール済みアプリをシステムアプリとしてマウント (systemless サブモジュール; NoMount でライブ、なければ次回ブート) |
| `companion-status` / `companion-install` | `{}` | Google Drive コンパニオンの状態 / オンデマンドのインストール |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | 宛先の管理 |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | rclone remote の管理 (`type:"rclone"` の宛先が指す `rclone.conf` エントリを作成する) |
| `schedule-set` / `schedule-list` / `schedule-delete` | `{id,package,mode,dest,cron,at,keep,items}` | スケジュールされたジョブ |
| `scheduler-tick` | `{}` | 期限が来たジョブを実行 + リテンションを適用 + 自動バックアップのオブザーバー (ブート時の heartbeat がこれを呼ぶ) |

### `backup` の引数

```json
{
  "package": "com.example.app",
  "user": 0,
  "mode": "full",                 // full | snapshot | mirror
  "compression": "zstd:10",       // none | lz4 | zstd[:N] | gzip
  "items": ["apk","data","data_de","obb","external","media"],
  "encrypt_data": false,
  "encrypt_apk": false,
  "dest": "local",                // local | <destination id>
  "verify": true,                 // re-hash each archive vs the manifest (default on for Full)
  "dry_run": false,               // true = report a size plan, write nothing
  "ssaid": false                  // OPT-IN, see below
}
```

`restore`/`import` は `{ref}` (backup ディレクトリ / scan ref) を受け取ります。`restore` は
さらに次を受け付けます: `"items"` (復元する backup の項目タイプの一部。省略するとすべて)、
`"test": true` (一時ディレクトリに展開して検証し、稼働中のアプリには触れません)、snapshot/mirror
用の `"mode"`、暗号化された backup 用の `"password"`、`"ssaid"` (opt-in)、そしてインストール元の
オプション `"spoof_installer"` (デフォルトは config から。インストール時に installer を Play ストア
に設定します) と `"deep_spoof": true` (高度なオプトイン。パッケージデータベースを編集して呼び出し元
パッケージとパッケージソースも偽装し、リブート後に適用されます)。`import` は
`"from": "neo" | "databackup"` を受け取り、暗号化された Neo backup の場合は `"password"` を
受け取ります。

### `remote-add` の引数

クラウドの宛先は `rclone` remote を指定する `type:"rclone"` の宛先です。まず `remote-add` で
その remote を作成してください。パスワードのフィールドは平文ではなく、常に obscured で保存されます。
サポートされる `backend` の値とその `params`:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

Google Drive には 2 つの経路があります: この `drive` remote (Google Cloud プロジェクトは不要で、
rclone 自身の OAuth を使う - どのコンピュータでも一度 `rclone authorize "drive"` を実行して token
を渡す) か、opt-in のコンパニオンアプリ (自分自身の OAuth client id) です。どちらも通常の宛先として
扱われます。

### ネットワークポリシー

config フィールドの `network_policy` は、クラウド転送が使える接続を制御します:
`any` (デフォルト), `wifi`, `mobile` のいずれか。`config-set` で設定します。`wifi` または
`mobile` のとき、すべてのクラウド転送 (Full の `rclone`/Drive アップロード、Mirror の sync、
リモートの `restic` スナップショットの backup/restore、Mirror の restore) は、まず有効な
トランスポートを確認し、一致しなければ `ERR_NET_POLICY` で中止します - 手動ジョブとスケジュール
ジョブの両方で。ローカルの宛先は決して制限されません。

## あなたのエージェントが守らなければならない安全柵

- **`ssaid` は厳密に opt-in です (デフォルトはオフ)** これはシステムファイルを書き換えることで
  デバイスの ANDROID_ID を backup/restore します。restore はリブート後にのみ適用され、
  以前のファイルはロールバックのために常に先に保存されます。`"ssaid": true` を送るのは、ユーザーの
  直接的で意図的な要求があるときだけにしてください - デフォルトでは決して送らないでください。
- **変更を伴う操作 (restore, delete, import) は破壊的** であり、ローカルの audit trail
  (`logs/audit.jsonl`) に記録されます。restore は忠実 (消去してから展開) なので、アプリを backup
  の正確な状態に戻します。呼び出す前に意図を確認してください。
- 保全 (SELinux/uid/gid/modes/xattr) や APK のルール (APK は常に圧縮され、`encrypt_apk` が設定
  されていない限り決して暗号化されない) を **決して弱めない** でください。
- JSON の出力を真実の源として扱ってください。`ok`/`code` を確認し、`progress` を poll し、
  推測するのではなく `ERR_*` コードを表に出してください。

内部については [ARCHITECTURE.md](../ARCHITECTURE.md) と
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) を参照してください。

---

*このドキュメントは Claude (Anthropic) で生成され、VD171 が保守しています。訂正や改善を歓迎します - [CONTRIBUTING.md](../CONTRIBUTING.md) を参照してください。*
