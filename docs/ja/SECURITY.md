> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · 日本語 · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# セキュリティポリシー

VDBackup はルートとして動作し、あなたのデータ、そして（任意で）認証情報と
暗号化パスフレーズを扱います。私たちはセキュリティを真剣に受け止めています。

## 脆弱性の報告

- **Site:** https://vd171.ru
- **Site:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/VD-Backup/issues
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **XDA thread:** https://xdaforums.com/t/VD-Backup.4807267/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-mail:** vd.priv8@pm.me

明確な説明と、可能であれば再現手順を含めてください。できる限り速やかに対応し、
ご希望であればあなたのクレジットを記載します。

## スコープに関する注記

- 認証情報とパスフレーズは保存時に暗号化され、平文で書き込まれることは決してありません。
  バックアップはデバイス固有のハードウェアキーに結び付けられることはない（したがって可搬性を
  保ちます）ため、暗号化されたバックアップを保護するのはパスフレーズです。強いものを
  選んでください。
- これらの認証情報は資格情報暗号化ストレージ（`/data/misc_ce`）にあり、再起動後の最初のロック解除まで施錠されるため、`/data/adb` と違ってそれ以前は決して読めません。モジュールの更新は古いコピーを恒久的にそこへ移し（元を消す前に各ファイルを検証）、再インストールをまたいで残ります。
- ローカルのバックアップ先はそれ自体が保存時に暗号化されたままである必要があります。内部とリムーバブルのユーザーストレージのみが許可され、`/data/adb`・`/data/system` や最初のロック解除前に読めるパス、`..` のトラバーサルは不可です。リムーバブル SD/USB は保存時に暗号化されないため、バックアップの暗号化を有効にするよう警告されます（ブロックはしません）。
- 任意の Google Drive コンパニオンアプリは、ルートやアンロックされたブートローダーを
  露呈しないよう、常に [HMA-OSS](https://github.com/frknkrc44/HMA-OSS) で隠すべきです。
- 復元はルートとして実行されるため、何かが書き込まれる前にすべてのアーカイブが検査されます。
  内容が対象の外を指すバックアップ（絶対パスや `..` コンポーネント）は拒否され、アーカイブ
  全体が問題なしと確認されるまで、いかなるファイルも展開されません。
- ビルド済みのバイナリとライブラリはいずれも、記録された SHA-256 を伴う固定された公開アップストリームまで
  たどることができ、マニフェストは端末上に同梱されるため、同梱されたペイロードは監査および再現が可能です。
  [BINARIES.md](BINARIES.md) を参照してください。

*このドキュメントは Claude (Anthropic) で生成され、VD171 が保守しています。訂正や改善を歓迎します, [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。*
