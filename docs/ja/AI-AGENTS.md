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
| `overview` | `{user?}` | `{ok:true,apps,instances,path_backups,jobs,backups_size,free,total}` 件数 (サイズはバイト単位): backup を持つアプリ、backup インスタンスの総数、スタンドアロンの path backup、スケジュール済みジョブ、backup の総サイズ、および backup ファイルシステムの空き/合計。非 detached で、即座に返る; WebUI のホーム概要が使用する。 |
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
| `list-users` | `{}` | `{ok,users:[{id,name}]}` デバイスの Android ユーザー（マルチユーザー）. |
| `list-dirs` | `{path}` | `{ok,path,parent,dirs:[...]}` パスのサブディレクトリ（フォルダ選択）. |
| `path-list` | `{user?}` | `{ok,backups:[...]}` 単体のフォルダ/ファイルのバックアップ. |
| `provenance` | `{}` | 同梱バイナリの監査マニフェスト (`PROVENANCE.json`). |
| `backup-info` | `{ref}` | `{ok,...}` 1 つの backup の全詳細 (バージョン, インストール元, 状態, 日付, mode, サイズ, items, 権限数, デバイス) |
| `backup-icon` | `{ref}` | `{ok,icon}` manifest からの base64 PNG (アプリがアンインストールされていても動作) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref は backups ディレクトリ配下でなければならない) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` パッケージの最新 N 個を保持 |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` 監査ログ、新しい順 |
| `log-export` | `{user?}` | `{ok:true,path}` (backups ディレクトリ下に書き出した `.txt` の絶対パス) または `{ok:false,code:"ERR_LOG_EXPORT"}`。アクティビティログ (`audit.jsonl`) と短いビルド/デバイスヘッダーを、ユーザーが見える単一のテキストファイルに書き出し、バグレポートに添付できるようにする。非 detached で、即座に返る。 |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth/calendar/wallpaper/dns/system_settings) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` システム全体の backup (detached) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (リブート必須; `confirm` がゲートする) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `path-backup` | `{path,compression?,password?}` | `{ok,opid}` 任意の絶対パスを `tar.zst`+`manifest.json` として `.paths/` 配下に backup する (detached) |
| `path-restore` | `{ref,confirm:true,password?}` | `{ok,opid}` パス backup を元の場所に復元する (`confirm` がゲートする; detached) |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | インストール済みアプリをシステムアプリとしてマウント (systemless サブモジュール; NoMount でライブ、なければ次回ブート) |
| `companion-status` / `companion-install` | `{}` | Google Drive コンパニオンの状態 / オンデマンドのインストール |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | 宛先の管理 |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | rclone remote の管理 (`type:"rclone"` の宛先が指す `rclone.conf` エントリを作成する); `backend` は任意の rclone backend でよく、ホワイトリストはない |
| `remote-authorize` | `{backend}` | `{ok:true,url}` (エンジンは Android の VIEW intent 経由で、その同意 URL を電話のブラウザですでに開いている) または `{ok:false,code:"ERR_AUTHORIZE"}`。端末上の OAuth のため、ローカルのコールバックサーバー (`127.0.0.1:53682`) で `rclone authorize <backend>` を実行する。 |
| `remote-authorize-poll` | `{}` | 待機中は `{ok:true,done:false,url}`、ユーザーが同意したら `{ok:true,done:true,token}` (`remote-add` に渡す `token`)、または `{ok:false,code:"ERR_AUTHORIZE"}`。 |
| `remote-authorize-cancel` | `{}` | `{ok:true,cancelled:true}`; 保留中の認可を停止する。 |
| `cloud-status` | `{}` | `{ok,rclone,restic,fetchable,size}` (`rclone`/`restic` バイナリが存在するか、この `lite` エディションがそれらを取得できるか、ダウンロードサイズ(バイト)) |
| `cloud-fetch` | `{}` | `{ok,opid}` (detached) `lite` エディションで `rclone`/`restic` アドオンをダウンロード+検証+インストールする |
| `schedule-set` / `schedule-list` / `schedule-delete` | 下記参照 | スケジュールされたジョブ (backup または復元。単一のアプリ, 集合, またはすべてのアプリを対象) |
| `scheduler-tick` | `{}` | 期限が来たジョブを実行 + リテンションを適用 + 自動バックアップのオブザーバー (ブート時の heartbeat がこれを呼ぶ) |
| `update-check` | `{}` | `{ok,current_version,current_code,latest_version,latest_code,update_available,zipUrl,changelog,notes}` (detached ではない; すぐに返る; 失敗時は `ERR_UPDATE_CHECK` - 下記参照) |

### `progress` のフィールド

`progress` をポーリングすると、その操作のライブの `progress-<opid>.json` が返されます。次の
フィールドは **常に存在** します:

| フィールド | 型 | 意味 |
|-------|------|---------|
| `opid` | string | 操作 id |
| `percent` | int | 0-100 の進捗 |
| `phase` | string | 現在のフェーズラベル |
| `item` | string | 現在処理中の item タイプ |
| `done` | bool | 終端の書き込み (finish / dry-run / restore-test) で true |

実行中の操作は、さらに次の **任意 (optional)** のライブフィールドを持つことがあります。不明なときは
存在しないか空で、**終端の書き込み (finish / dry-run / restore-test) では省略** されます:

| フィールド | 型 | 意味 |
|-------|------|---------|
| `rate` | string | 転送速度、例: `"4.2 MiB/s"` (空 = 不明) |
| `eta` | string | 推定残り時間、例: `"1m12s"` (空 = 不明) |
| `n` | int | 現在の item インデックス (0 = 不明) |
| `of` | int | item の総数 (0 = 不明) |
| `cur` | string | 現在の item 名 (空 = なし) |

クラウド転送は `rate`/`eta` を埋めます (percent は rclone から)。ローカルの Full backup は
`n`/`of`/`cur` を埋めます。フェーズラベルには、チェックサム封印のフェーズ **`verified`** と、
クラウド転送では **`transfer`** および **`mirror <item>`** が含まれます。

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
  "ssaid": false,                 // OPT-IN, see below
  "manual": false                 // true = single interactive backup, keeps these exact items;
                                  // omit/false lets config.app_items (a per-app item map) override
                                  // the set on bulk, auto and scheduled runs
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

### `schedule-set` の引数

スケジュールされたジョブは **1 つ** の対象と **action** を選びます:

```json
{
  "id": "nightly-games",
  "action": "backup",             // "backup" (デフォルト) | "restore"
  "package": "com.example.app",   // 単一のアプリ   - または -
  "packages": ["com.a","com.b"],  // アプリの集合   - または -
  "all": true,                    // すべてのアプリ、除外アプリのリストを除く
  "cron": "daily",                // hourly | daily | weekly
  "at": "02:30",                  // HH:MM
  "mode": "full",
  "dest": "local",
  "keep": 5,
  "items": ["apk","data"],
  "require_wifi": false,          // ゲート: Wi-Fi のときだけ実行
  "require_charging": false,      // ゲート: 充電中のときだけ実行
  "min_battery": 0,               // ゲート: このバッテリー % 以上のときだけ実行 (0-100)
  "days": [1,2,3,4,5]             // ゲート: これらの曜日だけ実行 (0=日曜)
}
```

対象には `package`, `packages`, `all` のうち正確に **1 つ** を指定してください。`backup` ジョブは通常の
`mode`/`dest`/`keep`/`items` を保ちます。`restore` ジョブ (`action: "restore"`) は各対象アプリの **最新** の
backup (または明示的な `ref`) を復元し、**実行ごとにアプリの現在のデータを上書き** します - これは意図的で
オプトインなので、ユーザーの直接の要求があるときにだけ設定してください。

### スケジューラのゲーティング

スケジュールされたジョブは **任意のゲート条件 (gate conditions)** を持つことができます。期限が来た
ジョブのゲートが満たされないと、そのジョブは **スキップされ、スケジュールを進めないまま次の tick で
再試行** されます (その `last_run` はスタンプされないので、条件が満たされ次第すぐに発火します):

| フィールド | 型 | ゲート |
|-------|------|------|
| `require_wifi` | bool | Wi-Fi のときだけ実行 |
| `require_charging` | bool | 充電中のときだけ実行 |
| `min_battery` | int (0-100) | このバッテリー残量以上のときだけ実行 |
| `days` | array of int (0-6, 0=日曜) | これらの曜日だけ実行 |

これらに加えて、最小限の **サーマル安全 (thermal safety)** チェックが常に適用されます: デバイスが
危険なほど高温のあいだ、スケジュールされた操作はスキップされます。すべてのゲートによるスキップは、
`wifi` / `charging` / `battery` / `days` / `thermal` のいずれかの `reason` を付けて
`op:"scheduler-gated"` として audit trail に書き込まれます。

### `remote-add` の引数

クラウドの宛先は `rclone` remote を指定する `type:"rclone"` の宛先です。まず `remote-add` で
その remote を作成してください。`backend` は **任意の rclone backend** でよく、ホワイトリストは
ありません。`remote-add` は任意の backend 名 (`dropbox`、`onedrive`、`box`、`pcloud`、`mega`、
`b2`、`s3`、`sftp`、`smb`、`webdav`、`ftp`、`drive`、および rclone がサポートするその他約 70 種) を
受け付け、`params` は `key=value` のペアとして `rclone` の設定にそのまま渡されます。パスワードの
フィールドは平文ではなく、常に obscured で保存されます。一般的な backend とその `params`:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

**端末上の OAuth (PC 不要)。** ブラウザでのサインインが必要な backend (Google Drive、Dropbox、
OneDrive、Box、pCloud) は、デスクトップも手動で貼り付ける token も必要ありません。`remote-authorize`
を `{backend}` で呼び出すと、エンジンはローカルのコールバックサーバー (`127.0.0.1:53682`) に対して
`rclone authorize <backend>` を実行し、Android の VIEW intent 経由でプロバイダーの同意ページを電話
自身のブラウザで開き、`{ok:true,url}` (または `{ok:false,code:"ERR_AUTHORIZE"}`) を返します。
`remote-authorize-poll` (`{}`) をポーリングすると、待機中は `{ok:true,done:false,url}` を、ユーザーが
承認したら `{ok:true,done:true,token}` を返します - その `token` を `remote-add` に渡してください。
`remote-authorize-cancel` (`{}`) は保留中の認可を停止します (`{ok:true,cancelled:true}`)。どの
コンピュータからでも `rclone authorize "<backend>"` の出力を手動で貼り付ける方法も、フォールバックと
して引き続きサポートされています。

Google Drive には 2 つの経路があります: この `drive` remote (Google Cloud プロジェクトは不要で、
rclone 自身の OAuth を使う - `remote-authorize` で端末上で認可するか、どのコンピュータでも一度
`rclone authorize "drive"` を実行して token を渡す) か、opt-in のコンパニオンアプリ (自分自身の
OAuth client id) です。どちらも通常の宛先として扱われます。

### ネットワークポリシー

config フィールドの `network_policy` は、クラウド転送が使える接続を制御します:
`any` (デフォルト), `wifi`, `mobile` のいずれか。`config-set` で設定します。`wifi` または
`mobile` のとき、すべてのクラウド転送 (Full の `rclone`/Drive アップロード、Mirror の sync、
リモートの `restic` スナップショットの backup/restore、Mirror の restore) は、まず有効な
トランスポートを確認し、一致しなければ `ERR_NET_POLICY` で中止します - 手動ジョブとスケジュール
ジョブの両方で。ローカルの宛先は決して制限されません。

### クラウドの整合性とクォータ

- **チェックサム封印 (クラウド)** クラウドへのコピーが成功したあと、エンジンはリモートの
  チェックサムチェック (`rclone check`) を実行します。不一致はその操作を `ERR_VERIFY` で失敗
  させます。ローカル側と共通のハッシュを持たないバックエンドはスキップされます (失敗ではありません)。
- **クォータチェック (クラウド, Full モード)** `rclone` remote への Full モードのアップロードの前に、
  エンジンはリモートの空き容量を問い合わせ (`rclone about --json`)、backup が収まらない場合は
  `ERR_QUOTA` で拒否します。クォータ情報を報告しない remote はスキップされます。Mirror モードは
  差分同期なので対象外です。

### クラウドバイナリ (`lite` エディション)

`full` エディションはすべてのバイナリを同梱し、ネットワークを一切必要としません。`lite` エディ
ションは最大の 2 つ、`rclone` と `restic` を省き、クラウドまたは snapshot のアクションを初めて
実行したときにオンデマンドで取得します。`cloud-status` は、それらがすでに存在するか、このエディ
ションが取得できるか、そしてダウンロードサイズ(バイト)を報告します。`cloud-fetch` は **detached**
で実行されます(その `opid` で `progress` をポーリングしてください)。アーキテクチャ別の
`rclone`+`restic` アドオンをダウンロードし、モジュールに焼き込まれた SHA-256 と照合して検証し、
ランタイムキャッシュにインストールします。進行フェーズは `downloading`、`verifying`、
`installing` です。最終コードは成功時が `ERR_NONE`、失敗時は `ERR_FETCH`(ダウンロード失敗)/
`ERR_FETCH_VERIFY`(チェックサム不一致、破棄)です。`full` エディションでは不要です。`lite`
エディションでバイナリが存在する前にクラウドまたは snapshot の宛先へ `backup`/`restore` を行うと
`ERR_CLOUD_FETCHABLE` で失敗します。クライアントは `cloud-fetch` の実行を提案し、その後に再試行
すべきです。

### 特殊 backup のカテゴリ

`special-categories` はデバイスが持つシステム全体のカテゴリを報告します。`special-backup` は
`categories` で渡したものをキャプチャし、`special-restore` はそれらを再適用します。カテゴリは次の
とおりです:

| カテゴリ | それが何か | 復元のセマンティクス |
|----------|-----------|-------------------|
| `messages` | SMS/MMS | provider の置き換え (消去 + 展開) |
| `contacts` | 連絡先と通話履歴 | provider の置き換え (消去 + 展開) |
| `wifi` | 保存された Wi-Fi ネットワーク | provider の置き換え (消去 + 展開) |
| `bluetooth` | Bluetooth のペアリング | provider の置き換え (消去 + 展開) |
| `calendar` | カレンダー provider (`com.android.providers.calendar`, app + データ); `calendar.json` へポータブルにもエクスポート | provider の置き換え (消去 + 展開) |
| `wallpaper` | ホームとロックの壁紙と `wallpaper_info.xml`、raw (バイナリ) で保存 | ファイルを置き換え |
| `dns` | settings から読む private DNS モードと指定子 | idempotent な `settings put` |
| `system_settings` | system/global/secure settings の完全な dump | **opt-in**、idempotent な `settings put`、デバイスの settings を上書き |

**`system_settings` は厳密に opt-in で、復元時に破壊的です。** `ssaid` と同様、復元されるとデバイス
全体の settings を上書きするため、ユーザーの明示的な同意の背後にゲートされ、audit trail に書き込ま
れます。決してデフォルトで選ばないでください。ユーザーの直接的で意図的な要求があるときだけにして
ください。

### スタンドアロンのパス backup

`path-backup` / `path-restore` は、per-app モデルの外で、共有ストレージ上または `/data` 配下の
**任意の絶対パス** - フォルダまたは単一のファイル - を backup / 復元します。アーカイブは VDBackup
独自のフォーマットで `tar.zst` と `manifest.json` として (SHA-256 で封印され、暗号化時は RECOVERY
kit 付きで)、backups ディレクトリ内の `.paths/` 配下に書き込まれます。

```json
// path-backup
{ "path": "/sdcard/DCIM/Camera", "compression": "zstd:10", "password": "..." }
// path-restore
{ "ref": "<.paths ref>", "confirm": true, "password": "..." }
```

- ソースパスは **絶対** で、許可されたルートのいずれかの配下でなければなりません:
  `/storage/emulated`, `/data/media`, `/sdcard`, `/data`。存在しないパスは `ERR_NO_PATH` で失敗し、
  許可されたルートの外のパス、または `..` を含むパスは `ERR_BAD_PATH` で失敗します。
- `path-restore` は元の場所へ書き戻すため破壊的で、`"confirm": true` を必要とします -
  `special-restore` と同じく、高い摩擦のゲートです。有効なパス backup でない `ref` は `ERR_BAD_REF`
  で失敗します。
- どちらも **detached** で実行されます。返された `opid` で `progress` をポーリングしてください。

### `update-check`

`update-check` はモジュールのより新しいバージョンが公開されたかどうかを報告し、エージェント
(または WebUI) がそれを提示できるようにします。これは **すぐに返る読み取り verb** で、
**detached ではない** ため、ポーリングする `opid` はありません。ユーザーの明示的な操作でのみ
起動され、同梱の `curl` で root 側の HTTP リクエストを通じてモジュールの公開済み更新マニフェスト
(`module.prop` の `updateJson` URL) を取得し - これは WebView の外で走るため WebUI の CSP の
対象になりません - 公開された `versionCode` をインストール済みのものと比較します。**引数は取りません**。

成功時は次を返します:

| フィールド | 型 | 意味 |
|------------|----|------|
| `ok` | bool | `true` |
| `current_version` | string | インストール済みの versionName |
| `current_code` | int | インストール済みの versionCode |
| `latest_version` | string | 公開された versionName |
| `latest_code` | int | 公開された versionCode |
| `update_available` | bool | `latest_code` が `current_code` より大きいとき `true` |
| `zipUrl` | string | 公開された zip の URL |
| `changelog` | string | 公開された changelog の URL |
| `notes` | string | リリースノート |

`updateJson` URL がない、ネットワークリクエストが失敗する、またはマニフェストをパースできない場合は
`{"ok":false,"code":"ERR_UPDATE_CHECK"}` を返します。

`update-check` は可用性とリリースノートを **報告するだけ** です。更新そのものはあなたの root マネージャー
(KernelSU / APatch / Magisk) がモジュールの `updateJson` を通じて行い、この verb が行うことは決してありません。

## あなたのエージェントが守らなければならない安全柵

- **`ssaid` は厳密に opt-in です (デフォルトはオフ)** これはシステムファイルを書き換えることで
  デバイスの ANDROID_ID を backup/restore します。restore はリブート後にのみ適用され、
  以前のファイルはロールバックのために常に先に保存されます。`"ssaid": true` を送るのは、ユーザーの
  直接的で意図的な要求があるときだけにしてください - デフォルトでは決して送らないでください。
- **変更を伴う操作 (restore, delete, import) は破壊的** であり、ローカルの audit trail
  (`logs/audit.jsonl`) に記録されます。restore は忠実 (消去してから展開) なので、アプリを backup
  の正確な状態に戻します。呼び出す前に意図を確認してください。
- **`system_settings` は `ssaid` とまったく同じく opt-in で破壊的です。** これを復元するとデバイス
  全体の settings を上書きするので、ユーザーの直接の要求があるときだけ送ってください。明示的な同意に
  よってゲートされ、audit trail に記録されます。
- **復元は idempotent です。** 生の provider 復元 (messages/contacts/wifi/bluetooth/calendar) は
  マージではなく **置き換え** ます - provider データは消去され、その上にアーカイブが展開されます -
  ので、同じ backup を再度復元しても行が重複することはありません。`dns` と `system_settings` は
  idempotent な `settings put` で再適用されます。
- **アーカイブの展開はパストラバーサルから保護されています。** restore は root として実行されるため、
  すべてのアーカイブ (restore, import, special-restore, path-restore) は書き込みの前に検査されます:
  メンバーが絶対パスを使う、または `..` を含むアーカイブは、1 つの破壊的な書き込みが起こる前に
  `ERR_UNSAFE_ARCHIVE` で前もって拒否されます (GNU tar も `--no-absolute-names` で実行されます)。
  改ざんされたアーカイブが対象ディレクトリの外に出ることは決してありません。
- 保全 (SELinux/uid/gid/modes/xattr) や APK のルール (APK は常に圧縮され、`encrypt_apk` が設定
  されていない限り決して暗号化されない) を **決して弱めない** でください。
- JSON の出力を真実の源として扱ってください。`ok`/`code` を確認し、`progress` を poll し、
  推測するのではなく `ERR_*` コードを表に出してください。

内部については [ARCHITECTURE.md](ARCHITECTURE.md) と
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) を参照してください。

---

*このドキュメントは Claude (Anthropic) で生成され、VD171 が保守しています。訂正や改善を歓迎します - [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。*
