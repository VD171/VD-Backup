> **Languages:** English · [العربية](docs/ar/SECURITY.md) · [Čeština](docs/cs/SECURITY.md) · [Deutsch](docs/de/SECURITY.md) · [Español](docs/es/SECURITY.md) · [فارسی](docs/fa/SECURITY.md) · [Français](docs/fr/SECURITY.md) · [हिन्दी](docs/hi/SECURITY.md) · [Bahasa Indonesia](docs/in/SECURITY.md) · [Italiano](docs/it/SECURITY.md) · [日本語](docs/ja/SECURITY.md) · [한국어](docs/ko/SECURITY.md) · [Nederlands](docs/nl/SECURITY.md) · [Polski](docs/pl/SECURITY.md) · [Português](docs/pt/SECURITY.md) · [Русский](docs/ru/SECURITY.md) · [Svenska](docs/sv/SECURITY.md) · [ไทย](docs/th/SECURITY.md) · [Türkçe](docs/tr/SECURITY.md) · [Українська](docs/uk/SECURITY.md) · [Tiếng Việt](docs/vi/SECURITY.md) · [中文](docs/zh/SECURITY.md)

---

# Security Policy

VDBackup runs as root and handles your data and (optionally) your credentials and
encryption passphrases. We take security seriously.

## Reporting a vulnerability

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

Include a clear description and, if possible, steps to reproduce. We will respond as
soon as we can and credit you if you wish.

## Scope notes

- Credentials and passphrases are stored encrypted at rest and are never written in
  clear text. Backups are never tied to device-bound hardware keys (so they stay
  portable), which also means the passphrase is what protects an encrypted backup -
  choose a strong one.
- Those credentials live on credential-encrypted storage (`/data/misc_ce`), locked until the first unlock after a reboot, so they are never readable before that unlock, unlike `/data/adb`. A module update moves any legacy copies there permanently (verifying each before removing the original), and they persist across reinstalls.
- A local backup destination must itself stay encrypted at rest: only internal and removable user storage is allowed, never `/data/adb`, `/data/system` or other paths readable before first unlock, and never a `..` traversal. Removable SD/USB is not encrypted at rest, so you are warned (not blocked) to turn on backup encryption for it.
- The optional Google Drive companion app should always be hidden with [HMA-OSS](https://github.com/frknkrc44/HMA-OSS) so it
  does not reveal root or an unlocked bootloader.
- Restore runs as root, so every archive is checked before anything is written: a
  backup whose contents point outside their target (an absolute path or a `..`
  component) is refused, and no file is extracted until the whole archive is cleared.
- Every prebuilt binary and library is traceable to a pinned public upstream with a
  recorded SHA-256, and the manifest ships on-device, so the bundled payload can be
  audited and reproduced. See [docs/BINARIES.md](docs/BINARIES.md).

*This documentation was generated with Claude (Anthropic) and is maintained by VD171. Corrections and improvements are welcome - see [CONTRIBUTING.md](CONTRIBUTING.md).*
